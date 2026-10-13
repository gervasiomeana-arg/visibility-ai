import test from 'node:test';
import assert from 'node:assert/strict';
import { storageService } from '../../src/services/storageService';
import { auditHistoryDate } from '../../shared/auditHistoryDate';
const newer = { auditedAt: '2026-10-13T18:00:00Z', overallScore: 80, seoScore: 80, webScore: null, unresolvedIssues: 2 };
function stored(run: () => void) {
  const before = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const scope = storageService.getScope();const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  storageService.setScope('history-test:agency');
  try { run(); } finally { storageService.setScope(scope);if (before) Object.defineProperty(globalThis, 'localStorage', before);else delete (globalThis as any).localStorage; }
}
test('old cloud points do not roll back the daily audit history or manufacture evolution', () => stored(() => {
  storageService.saveAuditHistoryPoint('hotel', newer);
  storageService.saveAuditHistoryPoint('hotel', { ...newer, auditedAt: '2026-10-13T09:00:00Z', overallScore: 20, seoScore: 20, unresolvedIssues: 10 });
  assert.deepEqual(storageService.getAuditHistory('hotel'), [newer]);
  assert.deepEqual(storageService.getEvolution('hotel').visibility, [80]);
  storageService.saveAuditHistoryPoint('hotel', { ...newer, overallScore: 0 });
  assert.deepEqual(storageService.getAuditHistory('hotel'), [newer]);
}));
test('newer same-day audits replace that day while earlier days remain separate', () => stored(() => {
  storageService.saveAuditHistoryPoint('hotel', { ...newer, auditedAt: '2026-10-12T18:00:00Z' });
  storageService.saveAuditHistoryPoint('hotel', { ...newer, auditedAt: '2026-10-13T09:00:00Z', overallScore: 20 });
  storageService.saveAuditHistoryPoint('hotel', newer);
  assert.equal(storageService.getAuditHistory('hotel').length, 2);
  assert.deepEqual(storageService.getAuditHistory('hotel').at(-1), newer);
}));
test('a stale Search Console period cannot replace newer zero results and other properties remain separate', () => stored(() => {
  const period = { loadedAt: '2026-10-13T18:00:00Z', siteUrl: 'sc-domain:hotel.example', startDate: '2026-09-01', endDate: '2026-09-28', clicks: 0, impressions: 0, ctr: 0, position: 0 };
  assert.equal(storageService.saveSearchConsoleHistoryPoint('hotel', period), true);
  storageService.saveSearchConsoleHistoryPoint('hotel', { ...period, loadedAt: '2026-10-13T09:00:00Z', clicks: 50, impressions: 1000 });
  assert.deepEqual(storageService.getSearchConsoleHistory('hotel'), [period]);
  storageService.saveSearchConsoleHistoryPoint('hotel', { ...period, siteUrl: 'sc-domain:other.example' });
  assert.equal(storageService.getSearchConsoleHistory('hotel').length, 2);
  assert.deepEqual(storageService.getSearchConsoleHistory('other'), []);
}));
test('audit history uses measurement time rather than a later cloud insertion time', () => {
  const row = { created_at: '2026-10-14T10:00:00Z', payload: { meta: { fetchedAt: newer.auditedAt } } };
  assert.equal(auditHistoryDate(row), newer.auditedAt);
  assert.equal(auditHistoryDate({ created_at: row.created_at }), row.created_at);
  assert.equal(auditHistoryDate({ created_at: row.created_at, payload: { meta: { fetchedAt: 'invalid' } } }), row.created_at);
});
