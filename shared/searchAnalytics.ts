export interface SearchQueryRow { query: string; clicks: number; impressions: number; ctr: number; position: number }
export interface SearchQueryInput { siteUrl: string; startDate: string; endDate: string; rowLimit: number }
export type SearchMetricTotals = Omit<SearchQueryRow,'query'>;

export function validateSearchTotals(value: unknown): SearchMetricTotals | null {
  if (value === null) return null;
  const row = validateSearchQueryRows([{ ...(value as object), query: 'aggregate' }])[0];
  const {query: _query, ...totals} = row;
  return totals;
}

export function googleSearchTotals(payload: any): SearchMetricTotals | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.error || ('rows' in payload && !Array.isArray(payload.rows))) throw new Error('La respuesta de Search Console no tiene un formato válido. No se importó este resultado.');
  if (!('rows' in payload)) { googleSearchQueryRows(payload); return null; }
  if (payload.rows.length === 0) return null;
  if (payload.rows.length !== 1 || (payload.rows[0].keys !== undefined && (!Array.isArray(payload.rows[0].keys) || payload.rows[0].keys.length))) throw new Error('La respuesta de Search Console contiene totales inválidos. No se importó este resultado.');
  return validateSearchTotals(payload.rows[0]);
}

function calendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}

export function validateSearchQueryInput(body: any): SearchQueryInput {
  if (typeof body?.siteUrl !== 'string' || !body.siteUrl.trim() || body.siteUrl.length > 2048) throw new Error('Elegí una propiedad de Search Console válida.');
  if (!calendarDate(body.startDate) || !calendarDate(body.endDate) || body.startDate > body.endDate) throw new Error('Elegí fechas reales y un período con inicio anterior o igual al final.');
  const rowLimit = body.rowLimit === undefined ? 100 : body.rowLimit;
  if (!Number.isInteger(rowLimit) || rowLimit < 1 || rowLimit > 500) throw new Error('El límite de esta consulta debe ser un entero entre 1 y 500.');
  return { siteUrl: body.siteUrl, startDate: body.startDate, endDate: body.endDate, rowLimit };
}

export function validateSearchQueryRows(value: unknown): SearchQueryRow[] {
  const invalid = () => new Error('La respuesta de Search Console contiene consultas o métricas incompletas. No se importó este resultado.');
  if (!Array.isArray(value)) throw invalid();
  const seen = new Set<string>();
  return value.map(row => {
    if (!row || typeof row.query !== 'string' || !row.query.trim() || seen.has(row.query) ||
      !Number.isSafeInteger(row.clicks) || row.clicks < 0 || !Number.isSafeInteger(row.impressions) || row.impressions < 0 || row.clicks > row.impressions ||
      typeof row.ctr !== 'number' || !Number.isFinite(row.ctr) || row.ctr < 0 || row.ctr > 1 ||
      typeof row.position !== 'number' || !Number.isFinite(row.position) || row.position < 0 || (row.impressions > 0 && row.position <= 0)) throw invalid();
    seen.add(row.query);
    return { query: row.query, clicks: row.clicks, impressions: row.impressions,
      ctr: row.impressions > 0 ? row.clicks / row.impressions : 0,
      position: row.impressions > 0 ? row.position : 0 };
  });
}

export function googleSearchQueryRows(payload: any): SearchQueryRow[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.error ||
    ('rows' in payload && !Array.isArray(payload.rows))) throw new Error('La respuesta de Search Console no tiene un formato válido. No se importó este resultado.');
  // Google may omit repeated rows when the query has no results. A valid object
  // without rows is distinct from null, an array or an explicit malformed rows field.
  if (!('rows' in payload)) {
    if (Object.keys(payload).some(key => !['responseAggregationType','metadata'].includes(key)) ||
      ('responseAggregationType' in payload && typeof payload.responseAggregationType !== 'string') ||
      ('metadata' in payload && (!payload.metadata || typeof payload.metadata !== 'object' || Array.isArray(payload.metadata)))) {
      throw new Error('La respuesta de Search Console no tiene un formato válido. No se importó este resultado.');
    }
    return [];
  }
  return validateSearchQueryRows(payload.rows.map((row: any) => ({
    query: Array.isArray(row?.keys) && row.keys.length === 1 ? row.keys[0] : undefined,
    clicks: row?.clicks, impressions: row?.impressions, ctr: row?.ctr, position: row?.position,
  })));
}

export function validateSearchQueryResult(data: any, expected: Pick<SearchQueryInput,'siteUrl'|'startDate'|'endDate'>) {
  if (data?.source !== 'google-search-console' || data.siteUrl !== expected.siteUrl || data.startDate !== expected.startDate || data.endDate !== expected.endDate) {
    throw new Error('La respuesta no corresponde a la propiedad y período solicitados. No se importó este resultado.');
  }
  return { rows: validateSearchQueryRows(data.rows), startDate: data.startDate as string, endDate: data.endDate as string, ...(Object.hasOwn(data,'totals') ? {totals:validateSearchTotals(data.totals)} : {}) };
}
