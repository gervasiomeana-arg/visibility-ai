import test from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateAndReconcileTasks, storageService } from '../../src/services/storageService';
import type { ActionTask, Business } from '../../src/types';

const business = { id: 'test-biz', name: 'Hotel', url: 'https://example.com' } as Business;
const base: ActionTask = {
  id: 'task-test-biz-lcp', businessId: business.id, source: 'seo-audit', findingType: 'lcp',
  title: 'LCP', metricValue: '4.3 s', priority: 'URGENTE', status: 'pendiente', completionType: null,
  estimatedImpact: 'Alto', difficulty: 'Media', estimatedTimeToFix: 'Revisar',
  simpleExplanation: 'Medición lenta', stepByStepSolution: [],
};

test('latest explicit edit survives stale cloud tasks and new audits, including clearing and reopening', () => {
  const stale = { ...base, status: 'completada_manual', completionType: 'manual', userEvidence: 'Nota anterior', manualUpdatedAt: '2026-10-11T20:00:00Z' } as ActionTask;
  const edit = { ...base, userEvidence: 'Pendiente de revisión', manualUpdatedAt: '2026-10-11T21:00:00Z' };
  const [saved] = deduplicateAndReconcileTasks(business.id, [edit, stale, { ...base, metricValue: '3.2 s' }], business);
  assert.equal(saved.status, 'pendiente');
  assert.equal(saved.completionType, null);
  assert.equal(saved.userEvidence, edit.userEvidence);
  assert.equal(saved.metricValue, '3.2 s');
  const cleared = { ...edit, userEvidence: null, manualUpdatedAt: '2026-10-11T22:00:00Z' };
  assert.equal(deduplicateAndReconcileTasks(business.id, [cleared, stale], business)[0].userEvidence, null);
});

test('task updates preserve notes and remain newer even within the same millisecond', () => {
  withStorage(({ values }) => {
    storageService.saveActionTasks(business.id, [base]);
    const [first] = storageService.updateTaskStatus(business.id, base.id, 'pendiente', null, 'Nota uno');
    const [second] = storageService.updateTaskStatus(business.id, base.id, 'pendiente', null, 'Nota dos');
    assert.ok(Date.parse(second.manualUpdatedAt!) > Date.parse(first.manualUpdatedAt!));
    storageService.saveActionTasks(business.id, [first]);
    assert.equal(storageService.getActionTasks(business.id)[0].userEvidence, 'Nota dos');
    assert.equal(storageService.getActionTasks(business.id)[0].status, 'pendiente');
    assert.ok(values.size > 0);
  });
});

test('blocked storage and unknown task cannot be reported as saved', () => {
  withStorage(state => {
    storageService.saveActionTasks(business.id, [base]);
    assert.throws(() => storageService.updateTaskStatus(business.id, 'missing-task', 'pendiente', null, 'Nota'), /ya no está disponible/);
    state.blocked = true;
    assert.throws(() => storageService.updateTaskStatus(business.id, base.id, 'pendiente', null, 'Nota'), /no se confirmó como guardada/);
  });
});

function withStorage(run: (state: { values: Map<string, string>; blocked: boolean }) => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const scope = storageService.getScope();
  const state = { values: new Map<string, string>(), blocked: false };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => state.values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (state.blocked) throw new Error('Storage blocked'); state.values.set(key, value); },
  } });
  try {
    storageService.setScope('save-feedback-test');
    state.values.set('visibility_ai_businesses:save-feedback-test', JSON.stringify([business]));
    run(state);
  } finally {
    storageService.setScope(scope);
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}
