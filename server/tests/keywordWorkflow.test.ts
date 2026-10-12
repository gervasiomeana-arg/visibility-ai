import test from 'node:test';
import assert from 'node:assert/strict';
import { keywordContentParams, keywordRequestScope, measuredKeywords, mergeMeasuredKeywords } from '../../shared/keywordWorkflow';
import { storageService } from '../../src/services/storageService';
import type { Business, KeywordItem } from '../../src/types';
const business = { id: 'voley', workspaceId: 'club', url: 'https://openvoley.com', city: '', category: 'Scouting de voleibol' } as Business;
const row = { query: 'estadísticas de recepción', clicks: 4, impressions: 100, ctr: .04, position: 8.25 };

test('measured queries preserve metrics without fabricating intent or SEO difficulty', () => {
  const [item] = measuredKeywords(business, [row]);
  assert.equal(item.intent, 'Sin clasificar');
  assert.equal(item.difficulty, 'Sin medición');
  assert.equal(item.clicks, 4);assert.equal(item.impressions, 100);assert.equal(item.ctr, .04);
  assert.equal(item.businessId, business.id);
});

test('manual additions persisted during an outstanding query survive importing its response', async () => {
  const store = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) } });
  try {
    storageService.setScope('user:club');
    const manual = { ...measuredKeywords(business, [row])[0], id: 'manual', source: 'manual', keyword: 'análisis de saque' } as KeywordItem;
    let complete!: (value: typeof row[]) => void;
    const request = new Promise<typeof row[]>(resolve => { complete = resolve; });
    const importResponse = request.then(rows => {
      const merged = mergeMeasuredKeywords(business.id, storageService.getKeywords(business.id), measuredKeywords(business, rows));
      storageService.saveKeywords(business.id, merged);
    });
    storageService.saveKeywords(business.id, [manual]);
    complete([row]);await importResponse;
    assert.deepEqual(storageService.getKeywords(business.id).map(k => k.keyword), ['análisis de saque', row.query]);
    assert.deepEqual(mergeMeasuredKeywords('other', storageService.getKeywords(business.id), measuredKeywords(business, [row])), []);
  } finally { storageService.setScope();if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);else delete (globalThis as any).localStorage; }
});

test('request scope changes when the same business changes URL or workspace or user', () => {
  const current = keywordRequestScope(business, 'user:club');
  assert.notEqual(current, keywordRequestScope({ ...business, url: 'https://another.example' }, 'user:club'));
  assert.notEqual(current, keywordRequestScope({ ...business, workspaceId: 'other' }, 'user:club'));
  assert.notEqual(current, keywordRequestScope(business, 'another:club'));
});

test('content handoff carries the selected query and cannot transfer another business query', () => {
  const item = measuredKeywords(business, [row])[0];
  const params = keywordContentParams(business, item)!;
  assert.equal(params.keyword, row.query);assert.equal(params.topic, row.query);
  assert.equal(params.city, '');assert.match(params.goal!, /servicio confirmado/);
  assert.equal(keywordContentParams(business, { ...item, businessId: 'other' }), undefined);
  assert.equal(keywordContentParams(business, { ...item, keyword: ' ' }), undefined);
});
