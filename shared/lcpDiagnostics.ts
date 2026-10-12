// Lighthouse insight details are optional and differ between versions.
// Only retain documented numeric subparts and explicit boolean checks.
export interface LcpDiagnostics {
  timings: Partial<Record<'timeToFirstByte' | 'resourceLoadDelay' | 'resourceLoadDuration' | 'elementRenderDelay', number>>;
  checks: Partial<Record<'priorityHinted' | 'requestDiscoverable' | 'eagerlyLoaded', boolean>>;
  element?: string;
}

export function extractLcpDiagnostics(audits: Record<string, any>): LcpDiagnostics | undefined {
  const result: LcpDiagnostics = { timings: {}, checks: {} };
  const breakdown = audits['lcp-breakdown-insight'];
  const discovery = audits['lcp-discovery-insight'];
  for (const audit of [breakdown, discovery]) {
    if (!audit || ['notApplicable', 'error'].includes(audit.scoreDisplayMode)) continue;
    const sections = audit.details?.type === 'list' ? audit.details.items : [audit.details];
    if (!Array.isArray(sections)) continue;
    for (const section of sections) {
      if (section?.type === 'table' && Array.isArray(section.items) && audit === breakdown) {
        for (const row of section.items) {
          if (['timeToFirstByte', 'resourceLoadDelay', 'resourceLoadDuration', 'elementRenderDelay'].includes(row?.subpart)
            && typeof row.duration === 'number' && Number.isFinite(row.duration) && row.duration >= 0) {
            result.timings[row.subpart as keyof LcpDiagnostics['timings']] = row.duration;
          }
        }
      }
      if (section?.type === 'checklist' && audit === discovery) {
        for (const key of ['priorityHinted', 'requestDiscoverable', 'eagerlyLoaded'] as const) {
          const value = section.items?.[key]?.value;
          if (typeof value === 'boolean') result.checks[key] = value;
        }
      }
      if (section?.type === 'node') {
        const label = section.selector || section.snippet;
        if (typeof label === 'string' && label.trim()) result.element = label.slice(0, 500);
      }
    }
  }
  return Object.keys(result.timings).length || Object.keys(result.checks).length || result.element ? result : undefined;
}

export function lcpDiagnosticSolution(diagnostics?: LcpDiagnostics) {
  if (!diagnostics) return undefined;
  const data: string[] = [];
  const proposals: string[] = [];
  const labels = { timeToFirstByte: 'Respuesta inicial del servidor', resourceLoadDelay: 'Espera antes de descargar el recurso LCP', resourceLoadDuration: 'Descarga del recurso LCP', elementRenderDelay: 'Espera para mostrar el elemento' };
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    const value = diagnostics.timings?.[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) data.push(`${labels[key]}: ${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })} ms`);
  }
  if (data.length) data.push('Desglose observado de Lighthouse; no sumar estas fases para reconstruir el LCP simulado');
  if (diagnostics.element) data.push(`Elemento identificado por Lighthouse: ${diagnostics.element}`);
  const checks = diagnostics.checks || {};
  if (checks.requestDiscoverable === false) {
    data.push('PageSpeed indica que la imagen LCP no se descubre en el documento inicial');
    proposals.push('Revisar cómo entregar la imagen LCP con src/srcset en el HTML inicial o precargar el recurso correcto si la plataforma lo requiere. El informe no identifica por sí solo qué código retrasa su descubrimiento.');
  } else if (checks.requestDiscoverable === true) data.push('Descubrimiento en el documento inicial: comprobación aprobada');
  if (checks.priorityHinted === false) {
    data.push('PageSpeed recomienda aplicar fetchpriority="high"');
    proposals.push('Revisar y aplicar fetchpriority="high" a la imagen LCP identificada; evitar dar prioridad alta a todas las imágenes.');
  } else if (checks.priorityHinted === true) data.push('Prioridad de la imagen: comprobación aprobada');
  if (checks.eagerlyLoaded === false) {
    data.push('Carga sin lazy loading: comprobación no aprobada');
    proposals.push('Revisar y retirar loading="lazy" de la imagen LCP identificada.');
  } else if (checks.eagerlyLoaded === true) data.push('Carga sin lazy loading: comprobación aprobada; no se señala como problema');
  return { detectedData: data.join('. ') + '.', proposedChange: proposals.length ? proposals.join(' ') : undefined };
}
