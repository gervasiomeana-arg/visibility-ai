import dns from 'dns/promises';
import https from 'https';
import net from 'net';

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10000;

export function isDisallowedIp(address: string): boolean {
  if (net.isIPv4(address)) {
    const parts = address.split('.').map(Number);
    const [a, b, c] = parts;

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }

  if (net.isIPv6(address)) {
    const value = address.toLowerCase();

    return (
      value === '::1' ||
      value === '::' ||
      value.startsWith('::ffff:') ||
      value.startsWith('fc') ||
      value.startsWith('fd') ||
      value.startsWith('fe8') ||
      value.startsWith('fe9') ||
      value.startsWith('fea') ||
      value.startsWith('feb') ||
      value.startsWith('ff') ||
      value.startsWith('2001:db8:')
    );
  }

  return true;
}

type ResolvedHttpsTarget = {
  url: URL;
  addresses: Array<{
    address: string;
    family: 4 | 6;
  }>;
};

export async function resolvePublicHttpsTarget(
  rawUrl: string
): Promise<ResolvedHttpsTarget> {
  const url = new URL(rawUrl);

  if (url.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }

  if (url.username || url.password) {
    throw new Error('URLs with embedded credentials are not allowed');
  }

  const hostname = url.hostname
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '');

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Private hosts are not allowed');
  }

  if (net.isIP(hostname)) {
    if (isDisallowedIp(hostname)) {
      throw new Error('Private or non-public IP addresses are not allowed');
    }

    return {
      url,
      addresses: [
        {
          address: hostname,
          family: net.isIPv4(hostname) ? 4 : 6,
        },
      ],
    };
  }

  const resolved = await dns.lookup(hostname, {
    all: true,
    verbatim: true,
  });

  if (!resolved.length) {
    throw new Error('Host does not resolve to an address');
  }

  const addresses = resolved.map(({ address, family }) => ({
    address,
    family: family as 4 | 6,
  }));

  if (addresses.some(({ address }) => isDisallowedIp(address))) {
    throw new Error('Host resolves to a private or non-public address');
  }

  return { url, addresses };
}

function responseHeadersFromNode(
  headers: Record<string, string | string[] | undefined>
): Headers {
  const result = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => result.append(key, item));
    } else if (value !== undefined) {
      result.set(key, String(value));
    }
  }

  return result;
}

function isRedirectStatus(status: number): boolean {
  return [300, 301, 302, 303, 307, 308].includes(status);
}

function timeoutError(): Error {
  const error = new Error('The website took too long to respond');
  error.name = 'AbortError';
  return error;
}

async function requestPinnedAddress(
  target: ResolvedHttpsTarget,
  pinned: { address: string; family: 4 | 6 }
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    let settled = false;
    let request: ReturnType<typeof https.request>;

    const absoluteTimeout = setTimeout(() => {
      if (!settled && request) {
        request.destroy(timeoutError());
      }
    }, FETCH_TIMEOUT_MS);

    const finishResolve = (response: Response) => {
      if (settled) return;
      settled = true;
      clearTimeout(absoluteTimeout);
      resolve(response);
    };

    const finishReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(absoluteTimeout);
      reject(
        error instanceof Error
          ? error
          : new Error('HTTPS request failed')
      );
    };

    request = https.request(
      target.url,
      {
        method: 'GET',
        headers: {
          'user-agent': 'VisibilityAI/0.3 (+SEO audit)',
          accept:
            'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
          'accept-encoding': 'identity',
        },
        lookup: ((
          _hostname: string,
          optionsOrCallback: any,
          maybeCallback?: any
        ) => {
          const callback =
            typeof optionsOrCallback === 'function'
              ? optionsOrCallback
              : maybeCallback;
          const options =
            typeof optionsOrCallback === 'object' && optionsOrCallback !== null
              ? optionsOrCallback
              : null;

          if (typeof callback !== 'function') {
            return;
          }

          if (options?.all) {
            callback(null, [
              { address: pinned.address, family: pinned.family },
            ]);
          } else {
            callback(null, pinned.address, pinned.family);
          }
        }) as any,
      },
      (incoming) => {
        const status = incoming.statusCode || 502;
        const headers = responseHeadersFromNode(
          incoming.headers as Record<
            string,
            string | string[] | undefined
          >
        );

        if (isRedirectStatus(status)) {
          incoming.resume();
          finishResolve(
            new Response(null, {
              status,
              statusText: incoming.statusMessage,
              headers,
            })
          );
          return;
        }

        const declaredLength = Number(
          incoming.headers['content-length'] || '0'
        );

        if (
          Number.isFinite(declaredLength) &&
          declaredLength > MAX_HTML_BYTES
        ) {
          incoming.destroy();
          finishReject(new Error('Response is too large to audit'));
          return;
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;

        incoming.on('data', (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk);

          totalBytes += buffer.byteLength;

          if (totalBytes > MAX_HTML_BYTES) {
            incoming.destroy(
              new Error('Response is too large to audit')
            );
            return;
          }

          chunks.push(buffer);
        });

        incoming.on('end', () => {
          const body =
            status === 204 || status === 205
              ? null
              : Buffer.concat(chunks);

          finishResolve(
            new Response(body, {
              status,
              statusText: incoming.statusMessage,
              headers,
            })
          );
        });

        incoming.on('error', (error) => {
          finishReject(error);
        });
      }
    );

    request.on('error', (error) => {
      finishReject(error);
    });

    request.end();
  });
}

async function pinnedFetch(
  target: ResolvedHttpsTarget
): Promise<Response> {
  let lastError: unknown = null;

  for (const pinned of target.addresses) {
    try {
      return await requestPinnedAddress(target, pinned);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not connect to the validated public address');
}

async function safeFetch(
  rawUrl: string,
  maxRedirects = 4
): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = rawUrl;

  for (
    let redirectCount = 0;
    redirectCount <= maxRedirects;
    redirectCount += 1
  ) {
    const target = await resolvePublicHttpsTarget(currentUrl);
    const response = await pinnedFetch(target);

    if (isRedirectStatus(response.status)) {
      const location = response.headers.get('location');

      if (!location) {
        throw new Error('Redirect without Location header');
      }

      currentUrl = new URL(location, target.url).toString();
      continue;
    }

    return {
      response,
      finalUrl: target.url.toString(),
    };
  }

  throw new Error('Too many redirects');
}

async function readTextLimited(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length') || '0');
  if (declaredLength > MAX_HTML_BYTES) throw new Error('Response is too large to audit');

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_HTML_BYTES) throw new Error('Response is too large to audit');
  return new TextDecoder('utf-8').decode(buffer);
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function stripTags(value: string): string {
  return decodeBasicEntities(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '));
}

function getTagMatches(html: string, tagName: string): string[] {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) || [];
}

function getPairedTagText(html: string, tagName: string): string[] {
  const matches = html.match(new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'gi')) || [];
  return matches.map(stripTags).filter(Boolean);
}

function getAttribute(tag: string, attribute: string): string | null {
  const quoted = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']*)["']`, 'i'));
  if (quoted) return decodeBasicEntities(quoted[1]);

  const unquoted = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*([^\\s>]+)`, 'i'));
  return unquoted ? decodeBasicEntities(unquoted[1]) : null;
}

function findMetaContent(html: string, key: string, value: string): string | null {
  const tags = getTagMatches(html, 'meta');
  for (const tag of tags) {
    if ((getAttribute(tag, key) || '').toLowerCase() === value.toLowerCase()) {
      return getAttribute(tag, 'content');
    }
  }
  return null;
}

function findLinkHref(html: string, relValue: string): string | null {
  const tags = getTagMatches(html, 'link');
  for (const tag of tags) {
    const rel = (getAttribute(tag, 'rel') || '').toLowerCase().split(/\s+/);
    if (rel.includes(relValue.toLowerCase())) return getAttribute(tag, 'href');
  }
  return null;
}

type AuditStatus = 'ok' | 'warning' | 'error';
type AuditImpact = 'Alto' | 'Medio' | 'Bajo';
type AuditCategory = 'Contenido y On-Page' | 'Técnico e Indexación' | 'Velocidad y Móvil' | 'Seguridad y Datos';

function auditItem(
  key: string,
  title: string,
  category: AuditCategory,
  status: AuditStatus,
  statusLabel: string,
  simpleExplanation: string,
  solution: string,
  impact: AuditImpact,
  metricValue?: string,
  details?: {
    whyItMatters?: string;
    detectedData?: string;
    proposedChange?: string;
    howToVerify?: string;
  }
) {
  return {
    id: `real-${key}`,
    key,
    title,
    category,
    status,
    statusLabel,
    simpleExplanation,
    solution,
    impact,
    metricValue,
    source: 'real' as const,
    checkedAt: new Date().toISOString(),
    whyItMatters: details?.whyItMatters,
    detectedData: details?.detectedData,
    proposedChange: details?.proposedChange,
    howToVerify: details?.howToVerify,
  };
}


async function fetchPageSpeedMetrics(pageUrl: string) {
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', pageUrl);
  endpoint.searchParams.set('strategy', 'mobile');
  endpoint.searchParams.append('category', 'performance');

  const pageSpeedApiKey = process.env.PAGESPEED_API_KEY;
  if (pageSpeedApiKey && pageSpeedApiKey !== 'MY_PAGESPEED_API_KEY') {
    endpoint.searchParams.set('key', pageSpeedApiKey);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(endpoint.toString(), {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`PageSpeed API returned HTTP ${response.status}`);
    }

    const data: any = await response.json();
    const lighthouse = data?.lighthouseResult;
    const audits = lighthouse?.audits || {};
    const performanceScore =
      typeof lighthouse?.categories?.performance?.score === 'number'
        ? Math.round(lighthouse.categories.performance.score * 100)
        : null;

    const metric = (key: string) => ({
      displayValue: audits?.[key]?.displayValue || null,
      numericValue: typeof audits?.[key]?.numericValue === 'number' ? audits[key].numericValue : null,
      score: typeof audits?.[key]?.score === 'number' ? audits[key].score : null,
    });

    return {
      performanceScore,
      firstContentfulPaint: metric('first-contentful-paint'),
      largestContentfulPaint: metric('largest-contentful-paint'),
      cumulativeLayoutShift: metric('cumulative-layout-shift'),
      totalBlockingTime: metric('total-blocking-time'),
      speedIndex: metric('speed-index'),
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function pageSpeedItems(metrics: any) {
  const items: any[] = [];

  if (metrics.performanceScore !== null) {
    const score = metrics.performanceScore;
    items.push(
      score >= 90
        ? auditItem('pagespeed-performance', 'Rendimiento móvil PageSpeed', 'Velocidad y Móvil', 'ok', 'Bueno', 'Google PageSpeed reporta un rendimiento móvil sólido.', 'Mantener optimizaciones y controlar cambios futuros.', 'Alto', `${score}/100`)
        : score >= 50
        ? auditItem('pagespeed-performance', 'Rendimiento móvil PageSpeed', 'Velocidad y Móvil', 'warning', 'Mejorable', 'Google PageSpeed detecta margen de mejora en rendimiento móvil.', 'Revisar imágenes, JavaScript, CSS y recursos que bloquean la carga.', 'Alto', `${score}/100`)
        : auditItem('pagespeed-performance', 'Rendimiento móvil PageSpeed', 'Velocidad y Móvil', 'error', 'Crítico', 'Google PageSpeed reporta un rendimiento móvil bajo.', 'Priorizar optimización de recursos pesados y tiempos de carga.', 'Alto', `${score}/100`)
    );
  }

  if (metrics.firstContentfulPaint?.displayValue) {
    const ms = metrics.firstContentfulPaint.numericValue;
    items.push(
      ms !== null && ms <= 1800
        ? auditItem('fcp', 'First Contentful Paint (FCP)', 'Velocidad y Móvil', 'ok', 'Bueno', 'El primer contenido visible aparece rápidamente en la prueba móvil.', 'Mantener tiempos de respuesta y recursos iniciales optimizados.', 'Medio', metrics.firstContentfulPaint.displayValue)
        : ms !== null && ms <= 3000
        ? auditItem('fcp', 'First Contentful Paint (FCP)', 'Velocidad y Móvil', 'warning', 'Mejorable', 'El primer contenido visible tarda más de lo ideal.', 'Reducir recursos que bloquean el render inicial.', 'Medio', metrics.firstContentfulPaint.displayValue)
        : auditItem('fcp', 'First Contentful Paint (FCP)', 'Velocidad y Móvil', 'error', 'Lento', 'El primer contenido visible tarda demasiado en la prueba móvil.', 'Optimizar servidor, CSS crítico y recursos iniciales.', 'Medio', metrics.firstContentfulPaint.displayValue)
    );
  }

  if (metrics.largestContentfulPaint?.displayValue) {
    const ms = metrics.largestContentfulPaint.numericValue;
    items.push(
      ms !== null && ms <= 2500
        ? auditItem('lcp', 'Largest Contentful Paint (LCP)', 'Velocidad y Móvil', 'ok', 'Bueno', 'El contenido principal carga dentro de un tiempo saludable.', 'Mantener optimizada la imagen o bloque principal.', 'Alto', metrics.largestContentfulPaint.displayValue)
        : ms !== null && ms <= 4000
        ? auditItem('lcp', 'Largest Contentful Paint (LCP)', 'Velocidad y Móvil', 'warning', 'Mejorable', 'El contenido principal tarda más de lo recomendado.', 'Optimizar el elemento LCP, imágenes y carga del servidor.', 'Alto', metrics.largestContentfulPaint.displayValue)
        : auditItem('lcp', 'Largest Contentful Paint (LCP)', 'Velocidad y Móvil', 'error', 'Lento', 'El contenido principal tarda demasiado en aparecer.', 'Priorizar el elemento LCP y reducir recursos que retrasan su carga.', 'Alto', metrics.largestContentfulPaint.displayValue)
    );
  }

  if (metrics.cumulativeLayoutShift?.displayValue) {
    const value = metrics.cumulativeLayoutShift.numericValue;
    items.push(
      value !== null && value <= 0.1
        ? auditItem('cls', 'Cumulative Layout Shift (CLS)', 'Velocidad y Móvil', 'ok', 'Estable', 'La página se mantiene visualmente estable durante la carga.', 'Mantener dimensiones reservadas para imágenes, banners y módulos dinámicos.', 'Medio', metrics.cumulativeLayoutShift.displayValue)
        : value !== null && value <= 0.25
        ? auditItem('cls', 'Cumulative Layout Shift (CLS)', 'Velocidad y Móvil', 'warning', 'Mejorable', 'Detectamos movimientos visibles de elementos durante la carga.', 'Reservar espacio para medios y contenido dinámico.', 'Medio', metrics.cumulativeLayoutShift.displayValue)
        : auditItem('cls', 'Cumulative Layout Shift (CLS)', 'Velocidad y Móvil', 'error', 'Inestable', 'La página presenta movimientos visuales importantes durante la carga.', 'Corregir elementos sin dimensiones y contenido que aparece tarde.', 'Medio', metrics.cumulativeLayoutShift.displayValue)
    );
  }

  if (metrics.totalBlockingTime?.displayValue) {
    const ms = metrics.totalBlockingTime.numericValue;
    items.push(
      ms !== null && ms <= 200
        ? auditItem('tbt', 'Total Blocking Time (TBT)', 'Velocidad y Móvil', 'ok', 'Bueno', 'La página bloquea poco tiempo el hilo principal durante la prueba.', 'Mantener JavaScript liviano y dividido por demanda.', 'Medio', metrics.totalBlockingTime.displayValue)
        : ms !== null && ms <= 600
        ? auditItem('tbt', 'Total Blocking Time (TBT)', 'Velocidad y Móvil', 'warning', 'Mejorable', 'Hay tareas de JavaScript que retrasan la interacción.', 'Reducir JavaScript pesado y dividir tareas largas.', 'Medio', metrics.totalBlockingTime.displayValue)
        : auditItem('tbt', 'Total Blocking Time (TBT)', 'Velocidad y Móvil', 'error', 'Alto', 'El navegador queda bloqueado demasiado tiempo por tareas largas.', 'Reducir scripts y trabajo de JavaScript en el hilo principal.', 'Medio', metrics.totalBlockingTime.displayValue)
    );
  }

  return items;
}

export async function buildRealSeoAudit(requestedUrl: string) {
  const startedAt = Date.now();
  const { response, finalUrl } = await safeFetch(requestedUrl);
  const contentType = (response.headers.get('content-type') || '').toLowerCase();

  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new Error('The URL did not return an HTML page');
  }

  const html = await readTextLimited(response);
  const final = new URL(finalUrl);
  const items: any[] = [];

  const title = getPairedTagText(html, 'title')[0] || '';
  items.push(
    !title
      ? auditItem(
          'title',
          'Título SEO',
          'Contenido y On-Page',
          'error',
          'Falta',
          'La página no tiene una etiqueta <title> detectable en el HTML inicial.',
          'Agregar un título único y descriptivo para esta página.',
          'Alto',
          'Ausente',
          {
            whyItMatters: 'El título es la principal referencia del documento en navegadores y resultados de búsqueda.',
            detectedData: 'Ausencia de etiqueta <title> en el <head> del HTML.',
            proposedChange: 'Definir una etiqueta <title> descriptiva de 30 a 60 caracteres.',
            howToVerify: 'Inspeccionar el elemento <title> en el <head> del código fuente.',
          }
        )
      : title.length < 30 || title.length > 60
      ? auditItem(
          'title',
          'Título SEO',
          'Contenido y On-Page',
          'warning',
          'Mejorable',
          'El título existe, pero su longitud se aleja del rango práctico recomendado (30 a 60 caracteres).',
          'Ajustar el título para que describa claramente la página sin ser demasiado corto ni largo.',
          'Medio',
          `${title.length} caracteres`,
          {
            whyItMatters: 'Títulos fuera del rango pueden truncarse en pantallas o resultar poco informativos.',
            detectedData: `Longitud medida: ${title.length} caracteres ("${title.slice(0, 45)}${title.length > 45 ? '...' : ''}").`,
            proposedChange: 'Ajustar la redacción del <title> para mantenerse entre 30 y 60 caracteres.',
            howToVerify: 'Contar caracteres del <title> en el HTML inicial y verificar su visualización.',
          }
        )
      : auditItem(
          'title',
          'Título SEO',
          'Contenido y On-Page',
          'ok',
          'Correcto',
          'La página tiene un título descriptivo con una longitud en rango recomendado.',
          'Mantener un título único para cada página importante.',
          'Medio',
          `${title.length} caracteres`,
          {
            whyItMatters: 'Ayuda a identificar con claridad el contenido de la página.',
            detectedData: `Longitud medida: ${title.length} caracteres.`,
            proposedChange: 'Mantener la coherencia del título con el propósito de la página.',
            howToVerify: 'Verificar la etiqueta <title> en el código fuente.',
          }
        )
  );

  const description = findMetaContent(html, 'name', 'description') || '';
  items.push(
    !description
      ? auditItem(
          'meta-description',
          'Meta description',
          'Contenido y On-Page',
          'error',
          'Falta',
          'No encontramos una meta description en el HTML inicial.',
          'Agregar una descripción clara que resuma la página y aporte contexto.',
          'Alto',
          'Ausente',
          {
            whyItMatters: 'Proporciona el texto de resumen sugerido para los fragmentos de búsqueda.',
            detectedData: 'No se encontró etiqueta <meta name="description"> en el HTML analizado.',
            proposedChange: 'Redactar una meta description de entre 70 y 160 caracteres.',
            howToVerify: 'Revisar la etiqueta <meta name="description" content="..."> en el código fuente.',
          }
        )
      : description.length < 70 || description.length > 165
      ? auditItem(
          'meta-description',
          'Meta description',
          'Contenido y On-Page',
          'warning',
          'Mejorable',
          'La meta description existe, pero su longitud se aleja del rango recomendado (70 a 165 caracteres).',
          'Reescribirla con una propuesta clara y específica de la página.',
          'Medio',
          `${description.length} caracteres`,
          {
            whyItMatters: 'Descripciones muy breves o excesivamente extensas suelen ser reemplazadas por fragmentos automáticos.',
            detectedData: `Longitud medida: ${description.length} caracteres.`,
            proposedChange: 'Ajustar la longitud a un rango óptimo de 70 a 165 caracteres.',
            howToVerify: 'Contar caracteres del atributo content en la meta description.',
          }
        )
      : auditItem(
          'meta-description',
          'Meta description',
          'Contenido y On-Page',
          'ok',
          'Correcta',
          'La página tiene una meta description con longitud en rango razonable.',
          'Mantener descripciones únicas por página.',
          'Medio',
          `${description.length} caracteres`,
          {
            whyItMatters: 'Aporta síntesis contextual sobre el contenido de la página.',
            detectedData: `Longitud medida: ${description.length} caracteres.`,
            proposedChange: 'Mantener la redacción actualizada ante cambios en el servicio.',
            howToVerify: 'Inspeccionar la meta description en el HTML.',
          }
        )
  );

  const h1s = getPairedTagText(html, 'h1');
  items.push(
    h1s.length === 1
      ? auditItem(
          'h1',
          'Encabezado H1',
          'Contenido y On-Page',
          'ok',
          'Correcto',
          'Encontramos un único H1 en el HTML inicial.',
          'Mantener un H1 claro y alineado con la intención de la página.',
          'Medio',
          '1 H1',
          {
            whyItMatters: 'Estructura semánticamente el tema central del documento.',
            detectedData: '1 etiqueta <h1> detectada en el HTML inicial recibido.',
            proposedChange: 'Conservar la concordancia entre el H1 y el contenido de la página.',
            howToVerify: 'Verificar la etiqueta <h1> en el marcado HTML.',
          }
        )
      : h1s.length === 0
      ? auditItem(
          'h1',
          'Encabezado H1',
          'Contenido y On-Page',
          'warning',
          'Pendiente en página renderizada',
          'H1 no detectado en HTML inicial; pendiente de comprobar en la página renderizada. El auditor inspecciona únicamente el HTML inicial recibido desde el servidor sin ejecutar JavaScript; no se presenta como una ausencia confirmada ni como un error crítico únicamente por ese resultado, dado que podría existir contenido generado en el cliente.',
          'Por qué importa: El H1 estructura el tema principal de la página. Qué se detectó: 0 etiquetas <h1> en el HTML inicial recibido. Qué cambio se propone: Definir un <h1> visible en la plantilla o servidor (por ejemplo, para Open Voley: "Open Voley: scouting y estadísticas para entrenadores"). Cómo comprobarlo: Inspeccionar el código fuente inicial (Ctrl+U) antes de ejecutar scripts y revisar el DOM renderizado en el navegador.',
          'Medio',
          '0 H1 en HTML inicial',
          {
            whyItMatters: 'El H1 establece semánticamente el tema principal de la página ante lectores de pantalla y rastreadores.',
            detectedData: '0 etiquetas <h1> detectadas en el HTML inicial recibido desde el servidor.',
            proposedChange: 'Agregar un único encabezado <h1> descriptivo en la plantilla o HTML inicial. Para Open Voley se sugiere como borrador: "Open Voley: scouting y estadísticas para entrenadores".',
            howToVerify: 'Inspeccionar "Ver código fuente" (Ctrl+U) o usar cURL sin ejecutar JavaScript y comprobar el DOM en el navegador si hay JavaScript del lado del cliente.',
          }
        )
      : auditItem(
          'h1',
          'Encabezado H1',
          'Contenido y On-Page',
          'warning',
          'Múltiples H1',
          `Se detectaron ${h1s.length} etiquetas H1 en el HTML inicial. Conviene mantener una jerarquía con un único H1 principal por página.`,
          'Por qué importa: Evita ambigüedad semántica. Qué se detectó: Múltiples H1. Qué cambio se propone: Conservar un solo H1 principal y transformar secundarios en H2. Cómo comprobarlo: Revisar la jerarquía de encabezados.',
          'Medio',
          `${h1s.length} H1`,
          {
            whyItMatters: 'Varios H1 pueden diluir la jerarquía temática del documento.',
            detectedData: `${h1s.length} etiquetas <h1> detectadas en el HTML inicial.`,
            proposedChange: 'Mantener un solo <h1> principal y usar <h2> o <h3> para subtítulos.',
            howToVerify: 'Revisar la jerarquía de encabezados en el DOM inicial.',
          }
        )
  );

  const h2Count = getPairedTagText(html, 'h2').length;
  items.push(
    h2Count > 0
      ? auditItem(
          'h2',
          'Subtítulos H2',
          'Contenido y On-Page',
          'ok',
          'Correcto',
          'La página utiliza subtítulos H2 para organizar el contenido en secciones.',
          'Mantener una jerarquía clara de secciones.',
          'Bajo',
          `${h2Count} H2`,
          {
            whyItMatters: 'Los H2 dividen el contenido en bloques temáticos digeribles.',
            detectedData: `${h2Count} etiquetas <h2> encontradas en el HTML inicial.`,
            proposedChange: 'Conservar subtítulos descriptivos en cada sección clave.',
            howToVerify: 'Inspeccionar etiquetas <h2> en el marcado.',
          }
        )
      : auditItem(
          'h2',
          'Subtítulos H2',
          'Contenido y On-Page',
          'warning',
          'Mejorable',
          'No se detectaron subtítulos H2 en el HTML inicial.',
          'Dividir el contenido en secciones descriptivas con H2 cuando corresponda.',
          'Bajo',
          '0 H2',
          {
            whyItMatters: 'Facilitan la lectura rápida del usuario y la organización semántica.',
            detectedData: '0 etiquetas <h2> detectadas en el HTML analizado.',
            proposedChange: 'Incorporar subtítulos <h2> descriptivos en los bloques principales de información.',
            howToVerify: 'Comprobar la presencia de <h2> en el HTML inicial.',
          }
        )
  );

  const canonicalHref = findLinkHref(html, 'canonical');
  let canonicalResolved = '';
  if (canonicalHref) {
    try {
      canonicalResolved = new URL(canonicalHref, finalUrl).toString();
    } catch {
      canonicalResolved = canonicalHref;
    }
  }
  items.push(
    canonicalHref
      ? auditItem(
          'canonical',
          'URL canónica',
          'Técnico e Indexación',
          'ok',
          'Detectada',
          'Encontramos una referencia canonical en el HTML analizado.',
          'Verificar que apunte a la versión canónica preferida en HTTPS.',
          'Medio',
          canonicalResolved,
          {
            whyItMatters: 'Define la URL canónica preferida cuando existen variantes o parámetros.',
            detectedData: `Canonical declarada: ${canonicalResolved}`,
            proposedChange: 'Asegurar que la URL canónica responda con código 200 y sea accesible.',
            howToVerify: 'Revisar <link rel="canonical" href="..."> en el <head>.',
          }
        )
      : auditItem(
          'canonical',
          'URL canónica',
          'Técnico e Indexación',
          'warning',
          'No detectada',
          'No se detectó una etiqueta canonical en el HTML analizado.',
          'Agregar canonical para reducir ambigüedad entre URLs equivalentes.',
          'Medio',
          'Ausente',
          {
            whyItMatters: 'Previene ambigüedades entre versiones con o sin trailing slash, www o parámetros.',
            detectedData: 'Ausencia de <link rel="canonical"> en el HTML inicial.',
            proposedChange: 'Agregar en el <head> la etiqueta <link rel="canonical" href="[URL_OFICIAL]">.',
            howToVerify: 'Verificar la etiqueta en el <head> del código fuente.',
          }
        )
  );

  const robotsMeta = (findMetaContent(html, 'name', 'robots') || '').toLowerCase();
  const noIndex = robotsMeta.includes('noindex');
  items.push(
    noIndex
      ? auditItem(
          'robots-meta',
          'Directiva de indexación',
          'Técnico e Indexación',
          'error',
          'NOINDEX',
          'La página indica a los buscadores que no la indexen.',
          'Confirmar si noindex es intencional; si la página debe aparecer en Google, retirarlo.',
          'Alto',
          robotsMeta,
          {
            whyItMatters: 'La directiva noindex instruye a los buscadores a no incluir esta URL en su índice.',
            detectedData: `Directiva robots encontrada: "${robotsMeta}".`,
            proposedChange: 'Retirar noindex si la página debe ser descubrible e indexada.',
            howToVerify: 'Comprobar la etiqueta <meta name="robots"> o la cabecera HTTP X-Robots-Tag.',
          }
        )
      : auditItem(
          'robots-meta',
          'Directiva de indexación',
          'Técnico e Indexación',
          'ok',
          'Indexable',
          'No detectamos una directiva noindex en la página.',
          'Mantener la indexación habilitada si esta página debe aparecer en buscadores.',
          'Alto',
          robotsMeta || 'Sin noindex',
          {
            whyItMatters: 'Permite que los motores de búsqueda evalúen e indexen la URL.',
            detectedData: robotsMeta ? `Directiva robots: "${robotsMeta}" (sin noindex).` : 'Sin etiqueta noindex restrictiva.',
            proposedChange: 'Conservar la indexación activa para páginas principales.',
            howToVerify: 'Comprobar que no existan etiquetas noindex en el código fuente.',
          }
        )
  );

  const imageTags = getTagMatches(html, 'img');
  const imagesMissingAlt = imageTags.filter((tag) => {
    const alt = getAttribute(tag, 'alt');
    return alt === null || alt.trim() === '';
  }).length;
  if (imageTags.length === 0) {
    items.push(
      auditItem(
        'image-alt',
        'Textos ALT de imágenes',
        'Contenido y On-Page',
        'ok',
        'Sin imágenes',
        'No detectamos imágenes <img> en el HTML inicial.',
        'Si se agregan imágenes relevantes, describirlas con ALT útil.',
        'Bajo',
        '0 imágenes',
        {
          whyItMatters: 'El texto alternativo es esencial para accesibilidad y descripción semántica.',
          detectedData: '0 etiquetas <img> en el HTML inicial recibido.',
          proposedChange: 'Si se añaden imágenes, incluir siempre el atributo alt="..." descriptivo.',
          howToVerify: 'Inspeccionar las etiquetas de imagen en el marcado.',
        }
      )
    );
  } else if (imagesMissingAlt === 0) {
    items.push(
      auditItem(
        'image-alt',
        'Textos ALT de imágenes',
        'Contenido y On-Page',
        'ok',
        'Correcto',
        'Todas las imágenes detectadas tienen atributo ALT no vacío.',
        'Mantener descripciones ALT útiles y específicas.',
        'Medio',
        `${imageTags.length}/${imageTags.length} con ALT`,
        {
          whyItMatters: 'Garantiza accesibilidad visual y contexto de contenido.',
          detectedData: `${imageTags.length} de ${imageTags.length} imágenes cuentan con atributo alt.`,
          proposedChange: 'Mantener textos ALT representativos en nuevas imágenes.',
          howToVerify: 'Verificar atributos alt en el código fuente.',
        }
      )
    );
  } else {
    items.push(
      auditItem(
        'image-alt',
        'Textos ALT de imágenes',
        'Contenido y On-Page',
        imagesMissingAlt === imageTags.length ? 'error' : 'warning',
        'Mejorable',
        'Hay imágenes sin texto alternativo útil.',
        'Agregar ALT descriptivo a imágenes que aportan información o contexto.',
        'Medio',
        `${imageTags.length - imagesMissingAlt}/${imageTags.length} con ALT`,
        {
          whyItMatters: 'Los usuarios con lectores de pantalla y rastreadores no pueden interpretar imágenes sin texto alternativo.',
          detectedData: `${imagesMissingAlt} de ${imageTags.length} imágenes carecen de atributo alt.`,
          proposedChange: 'Añadir atributo alt="..." con descripción concisa a cada imagen informativa.',
          howToVerify: 'Inspeccionar el atributo alt en las etiquetas <img> del HTML.',
        }
      )
    );
  }

  const viewport = findMetaContent(html, 'name', 'viewport');
  items.push(
    viewport
      ? auditItem(
          'viewport',
          'Configuración móvil',
          'Velocidad y Móvil',
          'ok',
          'Detectada',
          'La página declara viewport para dispositivos móviles.',
          'Validar luego la experiencia real con PageSpeed y Core Web Vitals.',
          'Alto',
          viewport,
          {
            whyItMatters: 'Permite el reescalado adecuado en pantallas de teléfonos móviles y tablets.',
            detectedData: `Meta viewport detectado: "${viewport}".`,
            proposedChange: 'Mantener configuración viewport responsive estándar.',
            howToVerify: 'Comprobar etiqueta <meta name="viewport"> en el <head>.',
          }
        )
      : auditItem(
          'viewport',
          'Configuración móvil',
          'Velocidad y Móvil',
          'error',
          'Falta',
          'No encontramos meta viewport en el HTML inicial.',
          'Agregar una configuración viewport responsive.',
          'Alto',
          'Ausente',
          {
            whyItMatters: 'Sin meta viewport, los dispositivos móviles asumen un ancho de escritorio fijo.',
            detectedData: 'Ausencia de <meta name="viewport"> en el HTML analizado.',
            proposedChange: 'Agregar <meta name="viewport" content="width=device-width, initial-scale=1.0"> en el <head>.',
            howToVerify: 'Verificar la etiqueta en el código fuente.',
          }
        )
  );

  items.push(
    final.protocol === 'https:'
      ? auditItem(
          'https',
          'HTTPS',
          'Seguridad y Datos',
          'ok',
          'Seguro',
          'La URL final utiliza HTTPS.',
          'Mantener certificado TLS válido y renovado.',
          'Alto',
          final.protocol,
          {
            whyItMatters: 'Garantiza la privacidad y seguridad de la conexión del usuario.',
            detectedData: `Protocolo utilizado: ${final.protocol}`,
            proposedChange: 'Conservar la renovación automática del certificado TLS.',
            howToVerify: 'Verificar el protocolo https:// en la barra de direcciones.',
          }
        )
      : auditItem(
          'https',
          'HTTPS',
          'Seguridad y Datos',
          'error',
          'Inseguro',
          'La URL final no utiliza HTTPS.',
          'Migrar todo el sitio a HTTPS.',
          'Alto',
          final.protocol,
          {
            whyItMatters: 'Las conexiones HTTP sin cifrar exponen datos y muestran advertencias de seguridad.',
            detectedData: `Protocolo no seguro detectado: ${final.protocol}`,
            proposedChange: 'Instalar certificado TLS y redirigir todo el tráfico a HTTPS.',
            howToVerify: 'Comprobar que todas las peticiones redirijan a https://.',
          }
        )
  );

  const htmlTag = (html.match(/<html\b[^>]*>/i) || [])[0] || '';
  const lang = getAttribute(htmlTag, 'lang');
  items.push(
    lang
      ? auditItem(
          'lang',
          'Idioma de la página',
          'Contenido y On-Page',
          'ok',
          'Detectado',
          'La página declara su idioma principal.',
          'Mantener el atributo lang correcto en cada versión idiomática.',
          'Bajo',
          lang,
          {
            whyItMatters: 'Ayuda a sintetizadores de voz y traductores automáticos a procesar el texto.',
            detectedData: `Atributo lang="${lang}" detectado en <html>.`,
            proposedChange: 'Mantener el código de idioma correspondiente al contenido.',
            howToVerify: 'Inspeccionar la etiqueta <html> de apertura.',
          }
        )
      : auditItem(
          'lang',
          'Idioma de la página',
          'Contenido y On-Page',
          'warning',
          'No detectado',
          'No encontramos el atributo lang en <html>.',
          'Declarar el idioma principal para accesibilidad y comprensión semántica.',
          'Bajo',
          'Ausente',
          {
            whyItMatters: 'Facilita la accesibilidad auditiva y el reconocimiento lingüístico.',
            detectedData: 'Etiqueta <html> sin atributo lang definido.',
            proposedChange: 'Agregar lang="es" (o el idioma principal) en la etiqueta <html lang="...">.',
            howToVerify: 'Comprobar el atributo lang en la etiqueta <html>.',
          }
        )
  );

  const ldJsonCount = (html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/gi) || []).length;
  items.push(
    ldJsonCount > 0
      ? auditItem(
          'structured-data',
          'Datos estructurados',
          'Seguridad y Datos',
          'ok',
          'Detectados',
          'Encontramos bloques JSON-LD de datos estructurados.',
          'Validar su contenido y tipos con herramientas de resultados enriquecidos.',
          'Medio',
          `${ldJsonCount} bloque(s)`,
          {
            whyItMatters: 'Proporciona información estructurada para enriquecer la comprensión del negocio o software.',
            detectedData: `${ldJsonCount} bloque(s) <script type="application/ld+json"> en el HTML.`,
            proposedChange: 'Mantener actualizados los campos del esquema Schema.org.',
            howToVerify: 'Validar con Schema.org Validator o Rich Results Test de Google.',
          }
        )
      : auditItem(
          'structured-data',
          'Datos estructurados',
          'Seguridad y Datos',
          'warning',
          'No detectados',
          'No encontramos JSON-LD en el HTML inicial.',
          'Evaluar schema.org apropiado para el tipo de negocio y contenido.',
          'Medio',
          '0 bloques',
          {
            whyItMatters: 'Ayuda a los motores a identificar entidades, software u organizaciones de forma explícita.',
            detectedData: '0 bloques JSON-LD en el HTML analizado.',
            proposedChange: 'Implementar Schema.org (como SoftwareApplication u Organization) según corresponda.',
            howToVerify: 'Inspeccionar la presencia de bloques <script type="application/ld+json"> en el HTML.',
          }
        )
  );

  const ogTitle = findMetaContent(html, 'property', 'og:title');
  items.push(
    ogTitle
      ? auditItem(
          'open-graph',
          'Open Graph',
          'Contenido y On-Page',
          'ok',
          'Detectado',
          'Encontramos metadatos Open Graph para compartir la página.',
          'Mantener título, descripción e imagen coherentes con la página.',
          'Bajo',
          ogTitle,
          {
            whyItMatters: 'Controla el formato de visualización al compartir el enlace en redes y aplicaciones de mensajería.',
            detectedData: `Etiqueta og:title detectada: "${ogTitle}".`,
            proposedChange: 'Conservar título, descripción e imagen representativos.',
            howToVerify: 'Revisar etiquetas meta property="og:..." en el <head>.',
          }
        )
      : auditItem(
          'open-graph',
          'Open Graph',
          'Contenido y On-Page',
          'warning',
          'Incompleto',
          'No encontramos og:title.',
          'Agregar metadatos Open Graph para mejorar cómo se comparte la página.',
          'Bajo',
          'og:title ausente',
          {
            whyItMatters: 'Evita tarjetas genéricas o vacías al compartir el enlace en plataformas sociales.',
            detectedData: 'Ausencia de <meta property="og:title"> en el HTML analizado.',
            proposedChange: 'Añadir <meta property="og:title" content="..."> y etiquetas Open Graph relacionadas.',
            howToVerify: 'Verificar las etiquetas en el <head> del documento.',
          }
        )
  );

  const baseUrl = `${final.origin}`;
  let robotsStatus = 0;
  let robotsText = '';
  try {
    const robotsResult = await safeFetch(`${baseUrl}/robots.txt`, 2);
    robotsStatus = robotsResult.response.status;
    robotsText = await readTextLimited(robotsResult.response);
  } catch {
    robotsStatus = 0;
  }
  items.push(
    robotsStatus >= 200 && robotsStatus < 300
      ? auditItem(
          'robots-txt',
          'robots.txt',
          'Técnico e Indexación',
          'ok',
          'Disponible',
          'El archivo robots.txt responde correctamente.',
          'Revisar que no bloquee por error secciones importantes.',
          'Medio',
          `HTTP ${robotsStatus}`,
          {
            whyItMatters: 'Indica a los rastreadores qué rutas tienen permitido consultar.',
            detectedData: `Respuesta HTTP ${robotsStatus} en /robots.txt.`,
            proposedChange: 'Revisar periódicamente las directivas de User-agent y Disallow.',
            howToVerify: 'Abrir /robots.txt en el navegador y validar la sintaxis.',
          }
        )
      : auditItem(
          'robots-txt',
          'robots.txt',
          'Técnico e Indexación',
          'warning',
          'No disponible',
          'No pudimos confirmar un robots.txt accesible.',
          'Publicar un robots.txt válido si el sitio necesita directivas de rastreo.',
          'Medio',
          robotsStatus ? `HTTP ${robotsStatus}` : 'Sin respuesta',
          {
            whyItMatters: 'Permite regular el rastreo de secciones internas y referenciar el sitemap.',
            detectedData: robotsStatus ? `HTTP ${robotsStatus} recibido en /robots.txt.` : 'Sin respuesta del servidor en /robots.txt.',
            proposedChange: 'Publicar un archivo robots.txt en la raíz del dominio.',
            howToVerify: 'Acceder a /robots.txt y comprobar respuesta HTTP 200.',
          }
        )
  );

  let sitemapUrl = `${baseUrl}/sitemap.xml`;
  const declaredSitemap = robotsText.match(/^\s*Sitemap:\s*(https:\/\/\S+)/im)?.[1];
  if (declaredSitemap) {
    try {
      const declared = new URL(declaredSitemap);
      if (declared.origin === final.origin) sitemapUrl = declared.toString();
    } catch {
      // Ignore malformed sitemap declaration.
    }
  }

  let sitemapStatus = 0;
  let sitemapLooksValid = false;
  try {
    const sitemapResult = await safeFetch(sitemapUrl, 2);
    sitemapStatus = sitemapResult.response.status;
    const sitemapText = await readTextLimited(sitemapResult.response);
    sitemapLooksValid = /<(urlset|sitemapindex)\b/i.test(sitemapText);
  } catch {
    sitemapStatus = 0;
  }
  items.push(
    sitemapStatus >= 200 && sitemapStatus < 300 && sitemapLooksValid
      ? auditItem(
          'sitemap',
          'Sitemap XML',
          'Técnico e Indexación',
          'ok',
          'Disponible',
          'Encontramos un sitemap XML accesible.',
          'Mantenerlo actualizado con las URLs indexables importantes.',
          'Medio',
          sitemapUrl,
          {
            whyItMatters: 'Permite a los motores descubrir rutas importantes sin depender únicamente de enlaces.',
            detectedData: `Sitemap accesible en: ${sitemapUrl}.`,
            proposedChange: 'Mantenerlo sincronizado con las URLs vigentes del sitio.',
            howToVerify: 'Acceder a la URL del sitemap y verificar la estructura XML.',
          }
        )
      : auditItem(
          'sitemap',
          'Sitemap XML',
          'Técnico e Indexación',
          'warning',
          'No confirmado',
          'No pudimos confirmar un sitemap XML válido.',
          'Generar y publicar un sitemap XML; luego declararlo en robots.txt y Search Console.',
          'Medio',
          sitemapStatus ? `HTTP ${sitemapStatus}` : 'Sin respuesta',
          {
            whyItMatters: 'Facilita la indexación completa de páginas cuando el sitio crece.',
            detectedData: sitemapStatus ? `HTTP ${sitemapStatus} en ${sitemapUrl} (o formato no XML).` : 'Sin respuesta en la URL habitual del sitemap.',
            proposedChange: 'Generar un sitemap XML válido y enlazarlo en robots.txt.',
            howToVerify: 'Verificar la URL del sitemap en el navegador o Search Console.',
          }
        )
  );

  let pageSpeed: any = null;
  let pageSpeedError: string | null = null;
  try {
    pageSpeed = await fetchPageSpeedMetrics(finalUrl);
    items.push(...pageSpeedItems(pageSpeed));
  } catch (error: any) {
    pageSpeedError = error?.name === 'AbortError'
      ? 'PageSpeed tardó demasiado en responder'
      : error?.message || 'No se pudo obtener PageSpeed';
  }

  const responseTimeMs = Date.now() - startedAt;
  items.push(
    response.ok
      ? auditItem(
          'http-status',
          'Respuesta HTTP',
          'Seguridad y Datos',
          'ok',
          'Correcta',
          'La página principal respondió correctamente al rastreador.',
          'Mantener respuestas 2xx para páginas indexables.',
          'Alto',
          `HTTP ${response.status} · ${responseTimeMs} ms`,
          {
            whyItMatters: 'Un estado 200 confirma que el servidor entregó el documento sin errores.',
            detectedData: `Código de respuesta: HTTP ${response.status} en ${responseTimeMs} ms.`,
            proposedChange: 'Mantener la disponibilidad y estabilidad del servidor.',
            howToVerify: 'Comprobar el código de estado en la pestaña Red de las herramientas de desarrollo.',
          }
        )
      : auditItem(
          'http-status',
          'Respuesta HTTP',
          'Seguridad y Datos',
          'error',
          'Error HTTP',
          'La página respondió con un estado HTTP problemático.',
          'Corregir el estado HTTP de la URL principal.',
          'Alto',
          `HTTP ${response.status}`,
          {
            whyItMatters: 'Códigos de error 4xx o 5xx impiden que usuarios y rastreadores vean el contenido.',
            detectedData: `Código de respuesta: HTTP ${response.status}.`,
            proposedChange: 'Investigar la causa del error en el servidor o enrutador.',
            howToVerify: 'Inspeccionar la respuesta HTTP con cURL o herramientas de red.',
          }
        )
  );

  return {
    requestedUrl,
    finalUrl,
    fetchedAt: new Date().toISOString(),
    httpStatus: response.status,
    responseTimeMs,
    items,
    pageSpeed,
    pageSpeedError,
  };
}
