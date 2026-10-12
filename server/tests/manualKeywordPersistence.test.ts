import test from 'node:test';
import assert from 'node:assert/strict';
import { persistManualKeyword } from '../../shared/manualKeywordPersistence';
import type { KeywordItem } from '../../src/types';
const item = { id: 'manual-1', businessId: 'hotel', keyword: ' alojamiento ', source: 'manual', position: 0, difficulty: 'Sin medición' } as KeywordItem;
test('manual keyword save writes one scoped row without replacing the other cloud entries', async () => {
  const rows = new Map<string, unknown>([['otra consulta', { keyword: 'otra consulta' }]]);
  await persistManualKeyword('agency', 'hotel', item, async (row, options) => {
    assert.equal(row.workspace_id, 'agency');assert.equal(row.business_id, 'hotel');
    assert.equal(options.onConflict, 'business_id,keyword');assert.equal(row.source, 'manual');
    assert.equal((row.payload as KeywordItem).difficulty, 'Sin medición');
    rows.set(row.keyword as string, row);return { error: null };
  });
  assert.deepEqual([...rows.keys()], ['otra consulta', 'alojamiento']);
});
test('retry upserts the same keyword rather than creating duplicates', async () => {
  const rows = new Map<string, unknown>();
  const write = async (row: Record<string, unknown>) => { rows.set(row.keyword as string, row);return { error: null }; };
  await persistManualKeyword('agency', 'hotel', item, write);
  await persistManualKeyword('agency', 'hotel', item, write);
  assert.equal(rows.size, 1);
});
test('wrong business, measured queries and missing workspace never reach remote storage', async () => {
  let calls = 0;
  const write = async () => { calls++;return { error: null }; };
  for (const [workspace, next] of [['agency', { ...item, businessId: 'other' }], ['agency', { ...item, source: 'search-console' }], ['', item], ['agency', { ...item, keyword: ' ' }]] as [string, KeywordItem][]) {
    await assert.rejects(persistManualKeyword(workspace, 'hotel', next, write));
  }
  assert.equal(calls, 0);
});
test('remote errors are surfaced and a later retry can succeed', async () => {
  const error = new Error('RLS denied');
  await assert.rejects(persistManualKeyword('agency', 'hotel', item, async () => ({ error })), /RLS denied/);
  await persistManualKeyword('agency', 'hotel', item, async () => ({ error: null }));
});
