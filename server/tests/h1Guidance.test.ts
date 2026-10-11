import test from 'node:test';
import assert from 'node:assert/strict';
import { h1Guidance, normalizeH1Item } from '../../shared/h1Guidance';
import { storageService, deduplicateAndReconcileTasks } from '../../src/services/storageService';
import type { SeoAuditItem, ActionTask, Business } from '../../src/types';
const stale: SeoAuditItem = { id: 'h1', key: 'h1', title: 'Encabezado H1', category: 'Contenido y On-Page', status: 'warning', statusLabel: 'Pendiente', simpleExplanation: '0 H1', solution: 'Agregar H1 para Open Voley: scouting y estadísticas', proposedChange: 'Open Voley: scouting y estadísticas para entrenadores', impact: 'Medio', source: 'real', metricValue: '0 H1 en HTML inicial' };

test('H1 recommendations never carry a fixed business brand into another audit', () => {
  const normalized = normalizeH1Item(stale);
  assert.doesNotMatch(JSON.stringify(normalized), /Open Voley|scouting/);
  assert.match(normalized.proposedChange!, /Comprobar primero/);
  assert.match(normalized.proposedChange!, /no agregar otro/);
  assert.match(normalized.proposedChange!, /actividad confirmada de este negocio/);
});

test('multiple and missing measurements never become a fabricated zero-H1 finding', () => {
  assert.equal(h1Guidance('2 H1').count, 2);
  assert.match(h1Guidance('2 H1').detectedData, /^2 etiquetas/);
  assert.doesNotMatch(h1Guidance('2 H1').simpleExplanation, /no detectado/);
  assert.equal(h1Guidance().count, null);
  assert.doesNotMatch(h1Guidance().detectedData, /0 etiquetas/);
  assert.match(h1Guidance('1 H1').proposedChange, /H1 existente/);
});

test('saved H1 task wording is refreshed without changing progress or manual evidence', () => {
  const task = { id: 'task-hotel-h1', businessId: 'hotel', findingType: 'h1', title: 'Encabezado H1', metricValue: '2 H1', source: 'seo-audit', priority: 'IMPORTANTE', status: 'completada_manual', completionType: 'manual', userEvidence: 'Revisé la página publicada.', simpleExplanation: 'Old text', proposedChange: 'Open Voley', stepByStepSolution: ['Open Voley'], estimatedImpact: 'Medio', difficulty: 'Fácil', estimatedTimeToFix: '15m' } as ActionTask;
  const result = deduplicateAndReconcileTasks('hotel', [task], { id: 'hotel', name: 'Hotel de prueba', url: 'https://hotel.example' } as Business)[0];
  assert.equal(result.status, task.status);
  assert.equal(result.userEvidence, task.userEvidence);
  assert.doesNotMatch(JSON.stringify(result), /Open Voley/);
  assert.match(result.detectedData!, /^2 etiquetas/);
});

test('legacy audit, executive summary and opportunity wording is corrected on read', () => {
  const values = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  storageService.setScope('h1-test');
  try {
    values.set('visibility_ai_seo_audits:h1-test', JSON.stringify({ hotel: [stale] }));
    values.set('visibility_ai_issues:h1-test', JSON.stringify({ hotel: [{ id: 'issue-hotel-h1', businessId: 'hotel', possibleSolution: stale.solution }] }));
    values.set('visibility_ai_opportunities:h1-test', JSON.stringify({ hotel: [{ id: 'seo-hotel-h1', businessId: 'hotel', source: 'seo-audit', commercialAction: stale.solution }] }));
    const data = [storageService.getSeoAudit('hotel'), storageService.getIssues('hotel'), storageService.getOpportunities('hotel')];
    assert.doesNotMatch(JSON.stringify(data), /Open Voley|scouting/);
  } finally {
    storageService.setScope();
    if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete (globalThis as any).localStorage;
  }
});
