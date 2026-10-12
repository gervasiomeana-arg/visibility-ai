import test from 'node:test';
import assert from 'node:assert/strict';
import { storageService } from '../../src/services/storageService';
import { searchSaveFeedback } from '../../shared/searchSaveFeedback';
const meta = { siteUrl: 'https://hotel.example', startDate: '2026-09-01', endDate: '2026-09-28', clicks: 0, impressions: 0, ctr: 0, position: 0, loadedAt: '2026-10-01T10:00:00Z' };
function withStorage(blocked: boolean, run: () => void) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { if (blocked) throw new Error('QuotaExceededError'); data.set(key, value); } } });
  storageService.setScope('test-save:workspace');
  try { run(); } finally { storageService.setScope(); if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete (globalThis as any).localStorage; }
}
test('Search Console writes confirm persisted empty results and zero metrics', () => {
  withStorage(false, () => {
    assert.equal(storageService.saveKeywords('hotel', []), true);
    assert.equal(storageService.saveSearchConsoleMeta('hotel', meta), true);
    assert.equal(storageService.saveSearchConsoleHistoryPoint('hotel', meta), true);
    assert.deepEqual(storageService.getKeywords('hotel'), []);
    assert.deepEqual(storageService.getSearchConsoleMeta('hotel'), meta);
    assert.equal(storageService.getSearchConsoleHistory('hotel')[0].clicks, 0);
  });
});
test('blocked browser storage cannot claim keywords, metadata or history were saved', () => {
  withStorage(true, () => {
    assert.equal(storageService.saveKeywords('hotel', []), false);
    assert.equal(storageService.saveSearchConsoleMeta('hotel', meta), false);
    assert.equal(storageService.saveSearchConsoleHistoryPoint('hotel', meta), false);
    assert.equal(storageService.getSearchConsoleMeta('hotel'), null);
    assert.deepEqual(storageService.getSearchConsoleHistory('hotel'), []);
  });
});
test('save feedback separates receipt, local persistence and confirmed cloud persistence', () => {
  const failedCloud = searchSaveFeedback({ local: true, cloud: 'failed' });
  assert.equal(failedCloud.warning, true);
  assert.match(failedCloud.message, /solo en este navegador/);
  assert.match(failedCloud.message, /reintentar/);
  const failedBoth = searchSaveFeedback({ local: false, cloud: 'failed' });
  assert.equal(failedBoth.warning, true);
  assert.match(failedBoth.message, /Podrían perderse/);
  const pending = searchSaveFeedback({ local: true, cloud: 'pending' });
  assert.match(pending.message, /Guardando/);
  const saved = searchSaveFeedback({ local: true, cloud: 'saved' });
  assert.equal(saved.warning, false);
  assert.match(saved.message, /y en tu espacio de trabajo/);
  const cloudOnly = searchSaveFeedback({ local: false, cloud: 'saved' });
  assert.equal(cloudOnly.warning, true);
  assert.match(cloudOnly.message, /guardados en tu espacio/);
  const localOnly = searchSaveFeedback({ local: true, cloud: 'unavailable' });
  assert.match(localOnly.message, /no está disponible/);
});
