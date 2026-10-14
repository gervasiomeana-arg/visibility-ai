import { measuredScore } from './scoreEvidence';

function pageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

function seconds(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  if (value > 0 && value < 1) return '<0,001 s';
  return `${(value / 1000).toLocaleString('es-AR', { maximumFractionDigits: 3 })} s`;
}

/** Report only values from one dated mobile PageSpeed record for this requested page. */
export function reportPerformance(meta: any, businessUrl: string) {
  const missing = { score: null as number | null, fcp: null as string | null, lcp: null as string | null, measuredAt: '', sourceUrl: '', warning: '' };
  if (!meta?.pageSpeed || meta.pageSpeedError) return missing;
  const requested = pageUrl(meta.requestedUrl), business = pageUrl(businessUrl), sourceUrl = pageUrl(meta.finalUrl);
  if (!requested || !business || requested !== business || !sourceUrl) {
    return { ...missing, warning: 'La medición de rendimiento no tiene una URL verificable para este negocio. Volvé a ejecutar la auditoría.' };
  }
  const measuredAt = meta.pageSpeed.fetchedAt;
  if (typeof measuredAt !== 'string' || !Number.isFinite(Date.parse(measuredAt))) {
    return { ...missing, warning: 'La medición de rendimiento no tiene fecha válida. Volvé a ejecutar la auditoría.' };
  }
  return {
    score: measuredScore(meta.pageSpeed.performanceScore),
    fcp: seconds(meta.pageSpeed.firstContentfulPaint?.numericValue),
    lcp: seconds(meta.pageSpeed.largestContentfulPaint?.numericValue),
    measuredAt, sourceUrl, warning: '',
  };
}
