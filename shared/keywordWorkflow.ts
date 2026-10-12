import type { Business, ContentGenerationRequest, KeywordItem } from '../src/types';
import type { SearchConsoleQueryRow } from '../src/services/searchConsoleService';

export function keywordRequestScope(business: Pick<Business, 'id' | 'url' | 'workspaceId'>, storageScope: string): string {
  return JSON.stringify([storageScope, business.workspaceId || 'local', business.id, business.url]);
}

export function measuredKeywords(business: Business, rows: SearchConsoleQueryRow[]): KeywordItem[] {
  return rows.map((row, index) => ({
    id: `gsc-${business.id}-${index}`, businessId: business.id, keyword: row.query,
    position: row.position > 0 ? Math.round(row.position * 10) / 10 : 0,
    searchVolume: 0, difficulty: 'Sin medición', evolution: 0, intent: 'Sin clasificar',
    url: business.url, source: 'search-console', clicks: row.clicks, impressions: row.impressions, ctr: row.ctr,
  }));
}

export function mergeMeasuredKeywords(businessId: string, current: KeywordItem[], measured: KeywordItem[]): KeywordItem[] {
  return [...current.filter(item => item.businessId === businessId && item.source === 'manual'),
    ...measured.filter(item => item.businessId === businessId && item.source === 'search-console')];
}

export function keywordContentParams(business: Business, item: KeywordItem): Partial<ContentGenerationRequest> | undefined {
  const query = item.keyword?.trim();
  if (item.businessId !== business.id || !query) return undefined;
  return { contentType: 'web_page', topic: query, keyword: query, city: business.city || '',
    businessType: business.category || '', goal: 'Explicar un servicio confirmado del negocio pertinente para esta consulta; revisar su relación antes de generar contenido' };
}
