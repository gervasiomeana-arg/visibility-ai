import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dns from 'dns/promises';
import net from 'net';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '100kb' }));

const MAX_PROMPT_LENGTH = 4000;
const MAX_FIELD_LENGTH = 2000;

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10000;

function isPrivateIp(address: string): boolean {
  if (net.isIPv4(address)) {
    const parts = address.split('.').map(Number);
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 0
    );
  }

  if (net.isIPv6(address)) {
    const value = address.toLowerCase();
    return (
      value === '::1' ||
      value === '::' ||
      value.startsWith('fc') ||
      value.startsWith('fd') ||
      value.startsWith('fe8') ||
      value.startsWith('fe9') ||
      value.startsWith('fea') ||
      value.startsWith('feb')
    );
  }

  return true;
}

async function assertPublicHttpsUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Private hosts are not allowed');
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('Private IP addresses are not allowed');
    return url;
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error('Host does not resolve to a public address');
  }

  return url;
}

async function safeFetch(rawUrl: string, maxRedirects = 4): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = (await assertPublicHttpsUrl(rawUrl)).toString();

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': 'VisibilityAI/0.2 (+SEO audit)',
          accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect without Location header');
      currentUrl = (await assertPublicHttpsUrl(new URL(location, currentUrl).toString())).toString();
      continue;
    }

    return { response, finalUrl: currentUrl };
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

async function buildRealSeoAudit(requestedUrl: string) {
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
      ? auditItem('title', 'Título SEO', 'Contenido y On-Page', 'error', 'Falta', 'La página no tiene una etiqueta <title> detectable.', 'Agregar un título único y descriptivo para esta página.', 'Alto', 'Ausente')
      : title.length < 30 || title.length > 60
      ? auditItem('title', 'Título SEO', 'Contenido y On-Page', 'warning', 'Mejorable', 'El título existe, pero su longitud se aleja del rango práctico recomendado para resultados de búsqueda.', 'Ajustar el título para que describa claramente la página sin ser demasiado corto ni largo.', 'Medio', `${title.length} caracteres`)
      : auditItem('title', 'Título SEO', 'Contenido y On-Page', 'ok', 'Correcto', 'La página tiene un título descriptivo con una longitud razonable.', 'Mantener un título único para cada página importante.', 'Medio', `${title.length} caracteres`)
  );

  const description = findMetaContent(html, 'name', 'description') || '';
  items.push(
    !description
      ? auditItem('meta-description', 'Meta description', 'Contenido y On-Page', 'error', 'Falta', 'No encontramos una meta description.', 'Agregar una descripción clara que resuma la página y motive el clic.', 'Alto', 'Ausente')
      : description.length < 70 || description.length > 165
      ? auditItem('meta-description', 'Meta description', 'Contenido y On-Page', 'warning', 'Mejorable', 'La meta description existe, pero su longitud puede mejorarse.', 'Reescribirla con una propuesta clara y específica de la página.', 'Medio', `${description.length} caracteres`)
      : auditItem('meta-description', 'Meta description', 'Contenido y On-Page', 'ok', 'Correcta', 'La página tiene una meta description con longitud razonable.', 'Mantener descripciones únicas por página.', 'Medio', `${description.length} caracteres`)
  );

  const h1s = getPairedTagText(html, 'h1');
  items.push(
    h1s.length === 1
      ? auditItem('h1', 'Encabezado H1', 'Contenido y On-Page', 'ok', 'Correcto', 'Encontramos un único H1 principal.', 'Mantener un H1 claro y alineado con la intención de la página.', 'Medio', '1 H1')
      : h1s.length === 0
      ? auditItem('h1', 'Encabezado H1', 'Contenido y On-Page', 'error', 'Falta', 'No encontramos un H1 principal.', 'Agregar un H1 visible que explique el tema principal de la página.', 'Alto', '0 H1')
      : auditItem('h1', 'Encabezado H1', 'Contenido y On-Page', 'warning', 'Revisar', 'Encontramos más de un H1.', 'Revisar la jerarquía de encabezados y dejar un H1 principal claramente definido.', 'Medio', `${h1s.length} H1`)
  );

  const h2Count = getPairedTagText(html, 'h2').length;
  items.push(
    h2Count > 0
      ? auditItem('h2', 'Subtítulos H2', 'Contenido y On-Page', 'ok', 'Correcto', 'La página utiliza subtítulos H2 para organizar el contenido.', 'Mantener una jerarquía clara de secciones.', 'Bajo', `${h2Count} H2`)
      : auditItem('h2', 'Subtítulos H2', 'Contenido y On-Page', 'warning', 'Mejorable', 'No encontramos subtítulos H2.', 'Dividir el contenido en secciones descriptivas con H2 cuando corresponda.', 'Bajo', '0 H2')
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
      ? auditItem('canonical', 'URL canónica', 'Técnico e Indexación', 'ok', 'Detectada', 'Encontramos una referencia canonical en la página.', 'Verificar que apunte a la versión preferida de esta URL.', 'Medio', canonicalResolved)
      : auditItem('canonical', 'URL canónica', 'Técnico e Indexación', 'warning', 'No detectada', 'No encontramos una etiqueta canonical.', 'Agregar canonical para reducir ambigüedad entre URLs equivalentes cuando sea necesario.', 'Medio', 'Ausente')
  );

  const robotsMeta = (findMetaContent(html, 'name', 'robots') || '').toLowerCase();
  const noIndex = robotsMeta.includes('noindex');
  items.push(
    noIndex
      ? auditItem('robots-meta', 'Directiva de indexación', 'Técnico e Indexación', 'error', 'NOINDEX', 'La página indica a los buscadores que no la indexen.', 'Confirmar si noindex es intencional; si la página debe aparecer en Google, retirarlo.', 'Alto', robotsMeta)
      : auditItem('robots-meta', 'Directiva de indexación', 'Técnico e Indexación', 'ok', 'Indexable', 'No detectamos una directiva noindex en la página.', 'Mantener la indexación habilitada si esta página debe aparecer en buscadores.', 'Alto', robotsMeta || 'Sin noindex')
  );

  const imageTags = getTagMatches(html, 'img');
  const imagesMissingAlt = imageTags.filter((tag) => {
    const alt = getAttribute(tag, 'alt');
    return alt === null || alt.trim() === '';
  }).length;
  if (imageTags.length === 0) {
    items.push(auditItem('image-alt', 'Textos ALT de imágenes', 'Contenido y On-Page', 'ok', 'Sin imágenes', 'No detectamos imágenes <img> en el HTML inicial.', 'Si se agregan imágenes relevantes, describirlas con ALT útil.', 'Bajo', '0 imágenes'));
  } else if (imagesMissingAlt === 0) {
    items.push(auditItem('image-alt', 'Textos ALT de imágenes', 'Contenido y On-Page', 'ok', 'Correcto', 'Todas las imágenes detectadas tienen atributo ALT no vacío.', 'Mantener descripciones ALT útiles y específicas.', 'Medio', `${imageTags.length}/${imageTags.length} con ALT`));
  } else {
    items.push(auditItem('image-alt', 'Textos ALT de imágenes', 'Contenido y On-Page', imagesMissingAlt === imageTags.length ? 'error' : 'warning', 'Mejorable', 'Hay imágenes sin texto alternativo útil.', 'Agregar ALT descriptivo a imágenes que aportan información o contexto.', 'Medio', `${imageTags.length - imagesMissingAlt}/${imageTags.length} con ALT`));
  }

  const viewport = findMetaContent(html, 'name', 'viewport');
  items.push(
    viewport
      ? auditItem('viewport', 'Configuración móvil', 'Velocidad y Móvil', 'ok', 'Detectada', 'La página declara viewport para dispositivos móviles.', 'Validar luego la experiencia real con PageSpeed y Core Web Vitals.', 'Alto', viewport)
      : auditItem('viewport', 'Configuración móvil', 'Velocidad y Móvil', 'error', 'Falta', 'No encontramos meta viewport.', 'Agregar una configuración viewport responsive.', 'Alto', 'Ausente')
  );

  items.push(
    final.protocol === 'https:'
      ? auditItem('https', 'HTTPS', 'Seguridad y Datos', 'ok', 'Seguro', 'La URL final utiliza HTTPS.', 'Mantener certificado TLS válido y renovado.', 'Alto', final.protocol)
      : auditItem('https', 'HTTPS', 'Seguridad y Datos', 'error', 'Inseguro', 'La URL final no utiliza HTTPS.', 'Migrar todo el sitio a HTTPS.', 'Alto', final.protocol)
  );

  const htmlTag = (html.match(/<html\b[^>]*>/i) || [])[0] || '';
  const lang = getAttribute(htmlTag, 'lang');
  items.push(
    lang
      ? auditItem('lang', 'Idioma de la página', 'Contenido y On-Page', 'ok', 'Detectado', 'La página declara su idioma principal.', 'Mantener el atributo lang correcto en cada versión idiomática.', 'Bajo', lang)
      : auditItem('lang', 'Idioma de la página', 'Contenido y On-Page', 'warning', 'No detectado', 'No encontramos el atributo lang en <html>.', 'Declarar el idioma principal para accesibilidad y comprensión semántica.', 'Bajo', 'Ausente')
  );

  const ldJsonCount = (html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/gi) || []).length;
  items.push(
    ldJsonCount > 0
      ? auditItem('structured-data', 'Datos estructurados', 'Seguridad y Datos', 'ok', 'Detectados', 'Encontramos bloques JSON-LD de datos estructurados.', 'Validar su contenido y tipos con herramientas de resultados enriquecidos.', 'Medio', `${ldJsonCount} bloque(s)`)
      : auditItem('structured-data', 'Datos estructurados', 'Seguridad y Datos', 'warning', 'No detectados', 'No encontramos JSON-LD en el HTML inicial.', 'Evaluar schema.org apropiado para el tipo de negocio y contenido.', 'Medio', '0 bloques')
  );

  const ogTitle = findMetaContent(html, 'property', 'og:title');
  items.push(
    ogTitle
      ? auditItem('open-graph', 'Open Graph', 'Contenido y On-Page', 'ok', 'Detectado', 'Encontramos metadatos Open Graph para compartir la página.', 'Mantener título, descripción e imagen coherentes con la página.', 'Bajo', ogTitle)
      : auditItem('open-graph', 'Open Graph', 'Contenido y On-Page', 'warning', 'Incompleto', 'No encontramos og:title.', 'Agregar metadatos Open Graph para mejorar cómo se comparte la página.', 'Bajo', 'og:title ausente')
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
      ? auditItem('robots-txt', 'robots.txt', 'Técnico e Indexación', 'ok', 'Disponible', 'El archivo robots.txt responde correctamente.', 'Revisar que no bloquee por error secciones importantes.', 'Medio', `HTTP ${robotsStatus}`)
      : auditItem('robots-txt', 'robots.txt', 'Técnico e Indexación', 'warning', 'No disponible', 'No pudimos confirmar un robots.txt accesible.', 'Publicar un robots.txt válido si el sitio necesita directivas de rastreo.', 'Medio', robotsStatus ? `HTTP ${robotsStatus}` : 'Sin respuesta')
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
      ? auditItem('sitemap', 'Sitemap XML', 'Técnico e Indexación', 'ok', 'Disponible', 'Encontramos un sitemap XML accesible.', 'Mantenerlo actualizado con las URLs indexables importantes.', 'Medio', sitemapUrl)
      : auditItem('sitemap', 'Sitemap XML', 'Técnico e Indexación', 'warning', 'No confirmado', 'No pudimos confirmar un sitemap XML válido.', 'Generar y publicar un sitemap XML; luego declararlo en robots.txt y Search Console.', 'Medio', sitemapStatus ? `HTTP ${sitemapStatus}` : 'Sin respuesta')
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
      ? auditItem('http-status', 'Respuesta HTTP', 'Seguridad y Datos', 'ok', 'Correcta', 'La página principal respondió correctamente al rastreador.', 'Mantener respuestas 2xx para páginas indexables.', 'Alto', `HTTP ${response.status} · ${responseTimeMs} ms`)
      : auditItem('http-status', 'Respuesta HTTP', 'Seguridad y Datos', 'error', 'Error HTTP', 'La página respondió con un estado HTTP problemático.', 'Corregir el estado HTTP de la URL principal.', 'Alto', `HTTP ${response.status}`)
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


// Initialize GoogleGenAI client (will use process.env.GEMINI_API_KEY if present)
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  aiClient = new GoogleGenAI({ apiKey });
}

// API Routes

// Real technical SEO audit (Phase 2)
app.post('/api/seo/audit', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }
    if (url.length > 2048) {
      return res.status(413).json({ error: 'URL is too long' });
    }

    const result = await buildRealSeoAudit(url);
    return res.json(result);
  } catch (error: any) {
    console.error('Error in /api/seo/audit:', error);
    const message = error?.name === 'AbortError'
      ? 'The website took too long to respond'
      : error?.message || 'SEO audit failed';
    return res.status(422).json({ error: message });
  }
});

app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { prompt, businessContext } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return res.status(413).json({ error: 'Prompt is too long' });
    }

    if (!aiClient) {
      return res.json({
        reply: null,
        note: 'No GEMINI_API_KEY configured, client fallback will be used.',
      });
    }

    const systemInstruction = `Eres "Visibility AI Assistant", el asesor de visibilidad digital y marketing local más claro, empático y práctico para dueños de empresas, hoteles, restaurantes, inmobiliarias y comercios.
Reglas clave:
- NO hables con jerga técnica incomprensible (evita tecnicismos como TTFB, canonicals, robots meta tags sin explicarlos en lenguaje llano).
- Habla en español rioplatense o neutro, con tono profesional, cercano y orientado a ventas y consultas.
- Responde siempre a la pregunta del usuario: "¿Mi negocio aparece donde buscan mis clientes?"
- Da consejos concretos que el dueño pueda implementar o pedirle a su diseñador en 15-30 minutos.
- Si se proporciona contexto del negocio (${JSON.stringify(businessContext || {})}), personaliza la respuesta con el nombre del negocio, su ciudad y tipo de actividad.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({ reply: response.text });
  } catch (error: any) {
    console.error('Error in /api/assistant/chat:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/api/content/generate', async (req, res) => {
  try {
    const { contentType, topic, keyword, city, businessType, goal, tone } = req.body;
    if (!topic && !keyword) {
      return res.status(400).json({ error: 'Topic or keyword is required' });
    }

    const fields = [contentType, topic, keyword, city, businessType, goal, tone];
    if (fields.some((value) => typeof value === 'string' && value.length > MAX_FIELD_LENGTH)) {
      return res.status(413).json({ error: 'One or more fields are too long' });
    }

    if (!aiClient) {
      return res.json({
        content: null,
        note: 'No GEMINI_API_KEY configured, client fallback will be used.',
      });
    }

    const typeNames: Record<string, string> = {
      web_page: 'Página web completa de servicio o destino',
      blog_article: 'Artículo de blog informativo de alto valor',
      service_description: 'Descripción atractiva de servicio',
      faq: 'Sección de Preguntas Frecuentes (FAQ) para clientes e Inteligencia Artificial',
      seo_meta: 'Título optimizado (Title tag), Meta Description y encabezados H1/H2',
      google_post: 'Publicación promocional atractiva para ficha de Google Business Profile (Google Maps)',
    };

    const promptText = `Genera contenido para un negocio de tipo "${businessType || 'comercio'}" en la ciudad de "${city || 'localidad'}".
Tipo de contenido requerido: ${typeNames[contentType] || contentType}.
Tema principal: ${topic}
Palabra clave principal a posicionar en Google: ${keyword}
Objetivo comercial del texto: ${goal || 'Conseguir más consultas de clientes'}
Tono deseado: ${tone || 'Profesional, cálido, confiable y persuasivo'}

Instrucciones:
1. El texto debe estar en español excelente, listo para ser copiado y pegado en la web o red social.
2. Debe convencer al cliente de elegir este negocio por encima de la competencia.
3. Incluir llamadas a la acción claras (WhatsApp, reserva o visita).
4. No incluir explicaciones meta, entrega directamente el contenido formateado en Markdown limpio.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        temperature: 0.7,
      },
    });

    return res.json({ content: response.text });
  } catch (error: any) {
    console.error('Error in /api/content/generate:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Setup Vite middleware in dev or serve dist in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Visibility AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
