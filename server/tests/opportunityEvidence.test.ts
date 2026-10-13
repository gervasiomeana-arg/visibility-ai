import test from 'node:test';
import assert from 'node:assert/strict';
import { opportunityKind, opportunityEvidence, safePublicUrl } from '../../shared/opportunityEvidence';
import { storageService } from '../../src/services/storageService';
import { validateContentInput } from '../../shared/contentContext';
import type { Business, KeywordItem, Opportunity, SeoAuditItem } from '../../src/types';
const business = { id: 'voley', name: 'Open Voley', url: 'https://openvoley.com', category: 'Software', city: '' } as Business;
const keyword = (changes: Partial<KeywordItem> = {}): KeywordItem => ({ id: 'query', businessId: 'voley', source: 'search-console', keyword: 'scouting', impressions: 100, clicks: 5, ctr: 0.05, position: 10, searchVolume: 0, difficulty: 'Media', evolution: 0, intent: 'Informativa', url: business.url, ...changes });
const audit = (key: string, source: 'real' | 'demo' = 'real'): SeoAuditItem => ({ id: key, key, source, title: key, category: 'Técnico e Indexación', status: 'warning', statusLabel: 'Advertencia', impact: 'Medio', simpleExplanation: 'Dato observado', solution: 'Revisar el hallazgo', checkedAt: '2026-10-11', metricValue: 'dato' });

test('technical SEO findings open audit review, while title/meta/H1 support content drafts', () => {
  const opportunities = storageService.buildOpportunitiesFromSeoAudit(business, [audit('https'), audit('robots'), audit('title'), audit('meta-description'), audit('h1'), audit('fake', 'demo')]);
  assert.equal(opportunities.length, 5);
  assert.deepEqual(opportunities.map(opportunityKind), ['technical', 'technical', 'content', 'content', 'content']);
  assert.equal(opportunityKind({ ...opportunities[0], kind: 'content' }), 'technical');
  assert.equal(opportunityKind({ ...opportunities[0], findingType: undefined, kind: undefined }), 'technical');
});

test('unknown CTR is never treated as a measured zero and foreign rows are excluded', () => {
  assert.equal(storageService.buildOpportunitiesFromSearchConsole(business, [keyword({ position: 5, ctr: undefined })]).length, 0);
  assert.equal(storageService.buildOpportunitiesFromSearchConsole(business, [keyword({ businessId: 'other' })]).length, 0);
  const opportunities = storageService.buildOpportunitiesFromSearchConsole(business, [keyword({ ctr: undefined })]);
  assert.equal(opportunities.length, 1);
  assert.match(opportunities[0].simpleExplanation, /no hay un CTR válido/);
  assert.doesNotMatch(opportunities[0].evidenceText!, /CTR 0/);
});

test('invalid numeric data never produces low-CTR opportunities', () => {
  for (const ctr of [-1, 2, Number.NaN, null as any]) {
    assert.equal(storageService.buildOpportunitiesFromSearchConsole(business, [keyword({ position: 5, ctr })]).length, 0);
  }
  for (const impressions of [0, Number.NaN, Infinity]) {
    assert.equal(storageService.buildOpportunitiesFromSearchConsole(business, [keyword({ impressions })]).length, 0);
  }
});

test('one proposal per query retains stable identity and actual period context', () => {
  const context = { siteUrl: 'sc-domain:openvoley.com', startDate: '2026-09-01', endDate: '2026-09-28', loadedAt: '2026-10-01' };
  const rows = [keyword({ ctr: 0.01 }), keyword({ keyword: ' SCOUTING ', ctr: 0.01 })];
  const result = storageService.buildOpportunitiesFromSearchConsole(business, rows, context);
  assert.equal(result.length, 1);
  assert.equal(result[0].periodStart, context.startDate);
  assert.match(result[0].evidenceText!, /criterio|Criterio/);
  assert.equal(result[0].id, storageService.buildOpportunitiesFromSearchConsole(business, [keyword({ keyword: 'different', impressions: 1000 }), ...rows], context)[1].id);
});

test('client opportunity lists separate backed proposals from examples and other businesses', () => {
  const real = storageService.buildOpportunitiesFromSeoAudit(business, [audit('title')])[0];
  const demo: Opportunity = { ...real, id: 'demo', source: 'demo' };
  const unknown: Opportunity = { ...real, id: 'unknown', evidenceText: '' };
  assert.deepEqual(opportunityEvidence([demo, unknown, { ...real, businessId: 'foreign' }, real], business.id).visible, [real]);
  assert.equal(opportunityEvidence([], business.id).mode, 'SIN DATOS');
  assert.equal(opportunityEvidence([demo], business.id).mode, 'DEMO');
  assert.equal(opportunityEvidence([unknown], business.id).mode, 'POR VALIDAR');
});

test('content drafts do not require inventing a keyword to review a title', () => {
  assert.equal(validateContentInput({ contentType: 'seo_meta', topic: 'Revisar el título principal', keyword: '', city: '', businessType: 'Software', goal: 'Describir funciones confirmadas', tone: 'Profesional', topicRelation: 'Revisar el título que describe la herramienta de scouting', businessContext: { name: 'Open Voley', description: 'Herramienta de scouting y estadísticas para entrenadores' } }), null);
});

test('competitor links allow only HTTP(S) URLs without embedded credentials', () => {
  assert.equal(safePublicUrl('https://example.org'), 'https://example.org/');
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/file', 'https://user:secret@example.org', 'invalid']) assert.equal(safePublicUrl(value), null);
});


test('saved opportunities and competitors remain isolated even with malformed foreign payloads', () => {
  const values = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  storageService.setScope('opportunity-test');
  const own = storageService.buildOpportunitiesFromSeoAudit(business, [audit('title')])[0];
  const foreign = { ...own, id: 'foreign', businessId: 'other' };
  try {
    storageService.saveOpportunities(business.id, [own, foreign]);
    assert.deepEqual(storageService.getOpportunities(business.id), [own]);
    const replaced = storageService.replaceOpportunitiesBySource(business.id, 'seo-audit', [own, foreign, { ...own, id: 'wrong-source', source: 'search-console' }]);
    assert.deepEqual(replaced, [own]);
    values.set('visibility_ai_competitors:opportunity-test', JSON.stringify({ voley: [{ id: 'own', businessId: 'voley' }, { id: 'foreign', businessId: 'other' }] }));
    assert.deepEqual(storageService.getCompetitors(business.id).map(item => item.id), ['own']);
    values.set('visibility_ai_competitors:opportunity-test', JSON.stringify({ voley: {} }));
    assert.deepEqual(storageService.getCompetitors(business.id), []);
  } finally {
    storageService.setScope();
    if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete (globalThis as any).localStorage;
  }
});


test('restoring accepted measurements removes resolved proposals while preserving the other source', () => {
  const values = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value),
  } });
  storageService.setScope('agency:workspace');
  try {
    const search = { keywords: [keyword()], siteUrl: 'sc-domain:openvoley.com', startDate: '2026-09-01', endDate: '2026-09-28', loadedAt: '2026-10-01' };
    storageService.restoreOpportunitiesFromMeasurements(business, { audit: [audit('title')], search });
    const before = storageService.getOpportunities(business.id);
    assert.equal(before.length, 2);
    const afterAudit = storageService.restoreOpportunitiesFromMeasurements(business, { audit: [{ ...audit('title'), status: 'ok' }] });
    assert.equal(afterAudit.length, 1);
    assert.equal(afterAudit[0].source, 'search-console');
    assert.equal(afterAudit[0].periodStart, search.startDate);
    const unchanged = storageService.restoreOpportunitiesFromMeasurements(business, {});
    assert.deepEqual(unchanged, afterAudit);
    assert.deepEqual(storageService.restoreOpportunitiesFromMeasurements(business, { search: { ...search, keywords: [] } }), []);
  } finally {
    storageService.setScope();
    if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete (globalThis as any).localStorage;
  }
});

test('rebuilding opportunity evidence does not transfer proposals across businesses or workspaces', () => {
  const values = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value),
  } });
  try {
    storageService.setScope('agency:first');
    storageService.restoreOpportunitiesFromMeasurements(business, { audit: [audit('title')] });
    const other = { ...business, id: 'other' };
    assert.deepEqual(storageService.restoreOpportunitiesFromMeasurements(other, { search: { keywords: [keyword()], siteUrl: 'sc-domain:other.example', startDate: '2026-09-01', endDate: '2026-09-28', loadedAt: '2026-10-01' } }), []);
    assert.equal(storageService.getOpportunities(business.id).length, 1);
    storageService.setScope('agency:second');
    assert.deepEqual(storageService.restoreOpportunitiesFromMeasurements(business, {}), []);
  } finally {
    storageService.setScope();
    if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete (globalThis as any).localStorage;
  }
});
