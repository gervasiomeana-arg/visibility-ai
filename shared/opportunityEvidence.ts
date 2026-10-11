import type { Opportunity } from '../src/types';

export function opportunityKind(opportunity: Opportunity): 'content' | 'technical' {
  if (opportunity.source === 'seo-audit') {
    const finding = opportunity.findingType || opportunity.id.match(/-(meta-description|title|h1)$/)?.[1];
    return ['title', 'meta-description', 'h1'].includes(finding || '') ? 'content' : 'technical';
  }
  return opportunity.kind === 'technical' ? 'technical' : 'content';
}

export function opportunityEvidence(opportunities: Opportunity[], businessId: string) {
  const own = opportunities.filter(item => item.businessId === businessId);
  const backed = own.filter(item => (item.source === 'seo-audit' || item.source === 'search-console') && !!item.evidenceText?.trim());
  // Once a measured source exists, examples do not belong in the client's action list.
  const visible = backed.length ? backed : own;
  const mode = backed.length ? 'PROPUESTAS CON EVIDENCIA'
    : !own.length ? 'SIN DATOS' : own.every(item => item.source === 'demo') ? 'DEMO' : 'POR VALIDAR';
  return { visible, mode };
}

export function safePublicUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
