import { googleSearchQueryRows, type SearchQueryInput } from '../shared/searchAnalytics';

export async function querySearchAnalytics(accessToken: string, input: SearchQueryInput, fetcher: typeof fetch = fetch) {
  const response = await fetcher(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(input.siteUrl)}/searchAnalytics/query`, {
    method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ startDate: input.startDate, endDate: input.endDate, dimensions: ['query'], rowLimit: input.rowLimit, dataState: 'final' }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error('No se pudo consultar Google Search Console. Revisá la conexión y los permisos de la propiedad y reintentá.');
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new Error('La respuesta de Search Console no tiene un formato válido. No se importó este resultado.'); }
  const rows = googleSearchQueryRows(payload);
  if (rows.length > input.rowLimit) throw new Error('La respuesta de Search Console excede el límite solicitado. No se importó este resultado.');
  return { rows, startDate: input.startDate, endDate: input.endDate, siteUrl: input.siteUrl, source: 'google-search-console' as const };
}
