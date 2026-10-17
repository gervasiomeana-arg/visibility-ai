import type { PriorityLevel, SeoAuditItem } from '../src/types';
export const priorityRank: Record<PriorityLevel, number> = { URGENTE: 1, IMPORTANTE: 2, RECOMENDADO: 3 };
export function auditPriority(item: Pick<SeoAuditItem, 'key' | 'status' | 'impact'>): PriorityLevel {
  if (item.key === 'h1') return 'IMPORTANTE';
  return item.status === 'error' ? 'URGENTE' : item.impact === 'Alto' ? 'IMPORTANTE' : 'RECOMENDADO';
}
export function compareAuditFactors(a: SeoAuditItem, b: SeoAuditItem) {
  return priorityRank[auditPriority(a)] - priorityRank[auditPriority(b)] || a.title.localeCompare(b.title);
}
