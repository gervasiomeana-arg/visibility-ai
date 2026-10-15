import type { SeoAuditResult } from '../src/types';
import { normalizeAuditUrl } from './auditUrl';

const categories = ['Contenido y On-Page', 'Técnico e Indexación', 'Velocidad y Móvil', 'Seguridad y Datos'];
const textFields = ['id', 'key', 'title', 'statusLabel', 'simpleExplanation', 'solution'];
const dated = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const failure = () => new Error('La respuesta de auditoría está incompleta o no corresponde a la URL solicitada. No se guardó este resultado; volvé a ejecutar la auditoría.');

/** Validate the entire new response before the UI can save scores, issues or tasks. */
export function validateSeoAuditResponse(value: unknown, requestedUrl: string): SeoAuditResult {
  const data = value as any;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw failure();
  try {
    if (normalizeAuditUrl(data.requestedUrl) !== normalizeAuditUrl(requestedUrl)) throw failure();
    normalizeAuditUrl(data.finalUrl);
  } catch { throw failure(); }
  if (!dated(data.fetchedAt) || !Number.isInteger(data.httpStatus) || data.httpStatus < 100 || data.httpStatus > 599 ||
    typeof data.responseTimeMs !== 'number' || !Number.isFinite(data.responseTimeMs) || data.responseTimeMs < 0 ||
    !Array.isArray(data.items) || !data.items.length) throw failure();
  const keys = new Set<string>();
  const ids = new Set<string>();
  for (const item of data.items) {
    if (!item || item.source !== 'real' || !dated(item.checkedAt) ||
      textFields.some(field => typeof item[field] !== 'string' || !item[field].trim()) ||
      ['metricValue', 'whyItMatters', 'detectedData', 'proposedChange', 'howToVerify'].some(field => item[field] != null && typeof item[field] !== 'string') ||
      !categories.includes(item.category) || !['ok', 'warning', 'error'].includes(item.status) ||
      !['Alto', 'Medio', 'Bajo'].includes(item.impact) || keys.has(item.key) || ids.has(item.id)) throw failure();
    keys.add(item.key); ids.add(item.id);
  }
  if (data.pageSpeedError != null && typeof data.pageSpeedError !== 'string') throw failure();
  if (data.pageSpeed != null) {
    if (data.pageSpeedError) throw failure();
    const speed = data.pageSpeed;
    if (!dated(speed.fetchedAt) || (speed.performanceScore !== null &&
      (typeof speed.performanceScore !== 'number' || !Number.isFinite(speed.performanceScore) || speed.performanceScore < 0 || speed.performanceScore > 100))) throw failure();
    for (const key of ['firstContentfulPaint', 'largestContentfulPaint', 'cumulativeLayoutShift', 'totalBlockingTime', 'speedIndex']) {
      const metric = speed[key];
      if (!metric || (metric.numericValue !== null && (typeof metric.numericValue !== 'number' || !Number.isFinite(metric.numericValue) || metric.numericValue < 0)) ||
        (metric.score !== null && (typeof metric.score !== 'number' || !Number.isFinite(metric.score) || metric.score < 0 || metric.score > 1)) ||
        (metric.displayValue !== null && typeof metric.displayValue !== 'string')) throw failure();
    }
  }
  return data as SeoAuditResult;
}
