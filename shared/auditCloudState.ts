function pageIdentity(value: string): string | null {
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

export function auditCacheSignature(items: unknown[], meta: unknown): string {
  return JSON.stringify([items, meta]);
}

export function cloudAuditToApply(input: {
  businessUrl: string; initialSignature: string; currentItems: unknown[];
  currentMeta: { fetchedAt?: string } | null;
  snapshot: { requested_url?: string; created_at?: string; payload?: {
    items?: unknown[]; meta?: { requestedUrl?: string; fetchedAt?: string; [key: string]: unknown };
    [key: string]: unknown;
  } } | null;
}): { items: unknown[]; meta: Record<string, unknown>; [key: string]: unknown } | null {
  const { snapshot, currentMeta } = input;
  const payload = snapshot?.payload;
  if (!payload || !Array.isArray(payload.items)) return null;
  const businessPage = pageIdentity(input.businessUrl);
  const requestedUrl = payload.meta?.requestedUrl || snapshot?.requested_url;
  if (!businessPage || !requestedUrl || pageIdentity(requestedUrl) !== businessPage) return null;
  if (snapshot?.requested_url && pageIdentity(snapshot.requested_url) !== businessPage) return null;
  const fetchedAt = payload.meta?.fetchedAt || snapshot?.created_at;
  const remoteTime = Date.parse(fetchedAt || '');
  const localTime = Date.parse(currentMeta?.fetchedAt || '');
  if (!Number.isFinite(remoteTime) || (Number.isFinite(localTime) && remoteTime <= localTime)) return null;
  if (auditCacheSignature(input.currentItems, currentMeta) !== input.initialSignature) return null;
  return { ...payload, items: payload.items, meta: { ...payload.meta, requestedUrl, fetchedAt } };
}
