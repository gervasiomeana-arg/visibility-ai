import type { KeywordItem } from '../src/types';
import { propertyMatchesBusiness } from './searchConsoleDiagnostics';

export function searchCacheSignature(keywords: KeywordItem[], meta: unknown): string {
  return JSON.stringify([keywords.filter(item => item.source === 'search-console'), meta]);
}

export function reconcileCloudKeywords(input: {
  businessId: string; businessUrl: string; current: KeywordItem[]; cloud: KeywordItem[];
  initialSignature: string; currentMeta: { loadedAt?: string } | null;
  snapshot: { site_url?: string; created_at?: string; payload?: { keywords?: unknown } } | null;
}): { keywords: KeywordItem[]; applySnapshot: boolean } {
  const { businessId, businessUrl, current, cloud, snapshot, currentMeta } = input;
  const local = current.filter(item => item.businessId === businessId);
  const remote = cloud.filter(item => item.businessId === businessId);
  // Local manual additions win; remote-only manual entries remain available.
  const manual = local.filter(item => item.source === 'manual');
  const seen = new Set(manual.map(item => item.keyword.trim().toLocaleLowerCase()));
  for (const item of remote.filter(item => item.source === 'manual')) {
    const key = item.keyword.trim().toLocaleLowerCase();
    if (!seen.has(key)) { manual.push(item); seen.add(key); }
  }
  const remoteTime = Date.parse(snapshot?.created_at || '');
  const localTime = Date.parse(currentMeta?.loadedAt || '');
  const unchanged = searchCacheSignature(current, currentMeta) === input.initialSignature;
  const applySnapshot = !!snapshot && Array.isArray(snapshot.payload?.keywords)
    && propertyMatchesBusiness(snapshot.site_url || '', businessUrl)
    && Number.isFinite(remoteTime) && unchanged
    && (!Number.isFinite(localTime) || remoteTime > localTime);
  const measured = (applySnapshot ? remote : local).filter(item => item.source === 'search-console');
  return { keywords: [...manual, ...measured], applySnapshot };
}
