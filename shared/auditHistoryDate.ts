export function auditHistoryDate(row: { created_at?: string; payload?: { meta?: { fetchedAt?: unknown } } }): string | undefined {
  const measured = row.payload?.meta?.fetchedAt;
  // Use insertion time only for legacy records with no recorded measurement date.
  return typeof measured === 'string' && Number.isFinite(Date.parse(measured)) ? measured : row.created_at;
}
