import type { ActionTask, SeoAuditItem } from '../src/types';
function page(value?: string): string | null {
  if (!value) return null;
  try { const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`); if (url.protocol !== 'https:' || url.username || url.password) return null; url.hash = ''; return url.href; } catch { return null; }
}
/** Only a dated factor for the same requested page may verify or reopen an audit task. */
export function reconcileTaskAuditEvidence(businessId: string, tasks: ActionTask[], items: SeoAuditItem[], meta: { requestedUrl?: string; fetchedAt?: string } | null): ActionTask[] {
  const url = page(meta?.requestedUrl);
  const fetchedAt = Date.parse(meta?.fetchedAt || '');
  if (!url || !Number.isFinite(fetchedAt)) return tasks;
  return tasks.map(task => {
    if (task.businessId !== businessId || task.source !== 'seo-audit' || page(task.url) !== url) return task;
    const matches = items.filter(item => item.key === task.findingType);
    if (matches.length !== 1) return task;
    const item = matches[0], checkedAt = Date.parse(item.checkedAt || '');
    const previous = Date.parse(task.measuredAt || ''), manual = Date.parse(task.manualUpdatedAt || '');
    if (item.source !== 'real' || !['ok', 'warning', 'error'].includes(item.status) || !Number.isFinite(checkedAt) ||
      (item.metricValue !== undefined && typeof item.metricValue !== 'string') ||
      checkedAt > fetchedAt || (Number.isFinite(previous) && checkedAt < previous) || (Number.isFinite(manual) && checkedAt <= manual)) return task;
    const next = { ...task, auditEvidence: { url, checkedAt: item.checkedAt!, status: item.status, metricValue: item.metricValue } };
    if (item.status === 'ok') return { ...next, status: 'verificada_auditoria', completionType: 'auditoria', completedAt: item.checkedAt! };
    if (task.status === 'verificada_auditoria' || (task.status === 'completada' && task.completionType === 'auditoria')) {
      return { ...next, status: 'pendiente', completionType: null, completedAt: null };
    }
    return next;
  });
}
