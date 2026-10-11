import type { MonthlyEvolution } from '../src/types';

export function measuredScore(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

export function webMeasurement(
  meta: any,
  cachedScore: number,
  source: string,
  history: { auditedAt: string; webScore: number | null }[] = [],
) {
  const historical = [...history].reverse().find(point => measuredScore(point.webScore) !== null && Number.isFinite(Date.parse(point.auditedAt)));
  if (meta) {
    const value = meta.pageSpeedError ? null : measuredScore(meta.pageSpeed?.performanceScore);
    const measuredAt = meta.pageSpeed?.fetchedAt || meta.fetchedAt;
    return value !== null
      ? { value, state: 'real', measuredAt, historical: undefined }
      : { value: null, state: 'unavailable', measuredAt: undefined, historical };
  }
  if (source === 'demo') return { value: measuredScore(cachedScore), state: 'demo', measuredAt: undefined, historical: undefined };
  return { value: null, state: 'unavailable', measuredAt: undefined, historical };
}

export function technicalScoreChange(evolution: MonthlyEvolution): number | null {
  if (evolution.source !== 'real' || evolution.visibility.length < 2 || evolution.months.length !== evolution.visibility.length) return null;
  const bases = evolution.auditBases || [];
  const values = evolution.visibility;
  if (bases.length !== values.length || !bases[0] || bases.some(basis => basis !== bases[0])) return null;
  const first = measuredScore(values[0]); const last = measuredScore(values.at(-1));
  return first !== null && last !== null ? Number((last - first).toFixed(1)) : null;
}
