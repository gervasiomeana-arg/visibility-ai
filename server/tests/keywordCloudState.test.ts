import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileCloudKeywords, searchCacheSignature } from '../../shared/keywordCloudState';
import type { KeywordItem } from '../../src/types';
const kw = (keyword: string, source = 'search-console', businessId = 'hotel') => ({ id: keyword, keyword, source, businessId } as KeywordItem);
const oldMeta = { loadedAt: '2026-10-01T10:00:00Z' };
const snapshot = { site_url: 'sc-domain:hotel.example', created_at: '2026-10-02T10:00:00Z', payload: { keywords: [kw('nueva')] } };
function input(current = [kw('anterior')]) {
  return { businessId: 'hotel', businessUrl: 'https://hotel.example', current, cloud: [kw('nueva')], initialSignature: searchCacheSignature(current, oldMeta), currentMeta: oldMeta, snapshot };
}
test('fresh cloud queries preserve manual additions made while hydration is pending', () => {
  const request = input();
  request.current = [...request.current, kw('consulta manual', 'manual')];
  request.cloud.push(kw('consulta remota', 'manual'), kw('CONSULTA MANUAL', 'manual'), kw('otro negocio', 'manual', 'other'));
  const result = reconcileCloudKeywords(request);
  assert.equal(result.applySnapshot, true);
  assert.deepEqual(result.keywords.map(k => k.keyword), ['consulta manual', 'consulta remota', 'nueva']);
});
test('a completed local import cannot be replaced by a cloud request started earlier', () => {
  const request = input();
  request.current = [kw('recién importada')];
  // Even without a metadata update, changed query results invalidate the pending snapshot.
  const result = reconcileCloudKeywords(request);
  assert.equal(result.applySnapshot, false);
  assert.deepEqual(result.keywords.map(k => k.keyword), ['recién importada']);
});
test('older, equal or undated cloud snapshots do not replace local measurements', () => {
  for (const created_at of ['2026-09-01T10:00:00Z', oldMeta.loadedAt, '']) {
    const request = input();request.snapshot = { ...snapshot, created_at };
    assert.equal(reconcileCloudKeywords(request).applySnapshot, false);
  }
});
test('an actual empty newer snapshot clears old measured queries but retains manual entries', () => {
  const request = input([kw('anterior'), kw('manual', 'manual')]);
  request.snapshot = { ...snapshot, payload: { keywords: [] } };
  request.cloud = [];
  const result = reconcileCloudKeywords(request);
  assert.equal(result.applySnapshot, true);
  assert.deepEqual(result.keywords.map(k => k.keyword), ['manual']);
});
test('missing snapshots and another website never reclassify or clear current results', () => {
  for (const next of [null, { ...snapshot, site_url: 'sc-domain:another.example' }, { ...snapshot, payload: {} }]) {
    const request = { ...input(), snapshot: next };
    const result = reconcileCloudKeywords(request);
    assert.equal(result.applySnapshot, false);
    assert.deepEqual(result.keywords.map(k => k.keyword), ['anterior']);
  }
});
test('fresh valid cloud data restores an empty local cache and excludes another business', () => {
  const request = { ...input([]), currentMeta: null, initialSignature: searchCacheSignature([], null), cloud: [kw('nueva'), kw('ajena', 'search-console', 'other')] };
  assert.deepEqual(reconcileCloudKeywords(request).keywords.map(k => k.keyword), ['nueva']);
});
