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

test('measurement freshness is independent of remote arrival order and manual edit dates', () => {
  const recent = { ...base, measuredAt: '2026-10-12T10:00:00Z', metricValue: '3.2 s' };
  const oldEdited = { ...base, measuredAt: '2026-10-10T10:00:00Z', metricValue: '8.5 s', status: 'en_progreso', userEvidence: 'Revisar imagen principal', manualUpdatedAt: '2026-10-12T11:00:00Z' } as ActionTask;
  for (const tasks of [[recent, oldEdited], [oldEdited, recent]]) {
    const [saved] = deduplicateAndReconcileTasks(business.id, tasks, business);
    assert.equal(saved.metricValue, '3.2 s');assert.equal(saved.measuredAt, recent.measuredAt);
    assert.equal(saved.userEvidence, oldEdited.userEvidence);assert.equal(saved.status, 'en_progreso');
    assert.match(saved.detectedData!, /3.2/);assert.doesNotMatch(saved.detectedData!, /8.5/);
  }
});

test('undated legacy cloud tasks cannot replace dated measurements but retain their notes', () => {
  const recent = { ...base, measuredAt: '2026-10-12T10:00:00Z', metricValue: '3.2 s' };
  const legacy = { ...base, metricValue: '9.0 s', userEvidence: 'Nota anterior guardada' };
  const [saved] = deduplicateAndReconcileTasks(business.id, [recent, legacy], business);
  assert.equal(saved.metricValue, recent.metricValue);assert.equal(saved.userEvidence, legacy.userEvidence);
});

test('fresh audit tasks carry the measured date and refresh a stored legacy task without losing progress', () => {
  withStorage(() => {
    storageService.saveActionTasks(business.id, [{ ...base, userEvidence: 'Nota del entrenador', status: 'en_progreso', manualUpdatedAt: '2026-10-12T11:00:00Z' }]);
    const tasks = storageService.buildActionTasksFromSeoAudit(business.id, [{ id: 'lcp', key: 'lcp', source: 'real', title: 'LCP', category: 'Velocidad y Móvil', status: 'warning', statusLabel: 'Mejorable', impact: 'Alto', simpleExplanation: 'Medición actual', solution: 'Revisar imagen', metricValue: '3.2 s', checkedAt: '2026-10-12T10:00:00Z' }]);
    storageService.saveActionTasks(business.id, tasks);
    const [saved] = storageService.getActionTasks(business.id);
    assert.equal(saved.measuredAt, '2026-10-12T10:00:00Z');assert.equal(saved.metricValue, '3.2 s');
    assert.equal(saved.status, 'en_progreso');assert.equal(saved.userEvidence, 'Nota del entrenador');
  });
});

test('a demonstration completion cannot verify or close a new audit task, while its manual note is retained', () => {
  const demonstration = { ...base, id: 'demo-lcp', source: 'demo', status: 'verificada_auditoria', completionType: 'auditoria', completedAt: '2026-10-01T12:00:00Z', manualUpdatedAt: '2026-10-15T12:00:00Z', userEvidence: 'Nota escrita mientras se revisaba el ejemplo' } as ActionTask;
  const fresh = { ...base, measuredAt: '2026-10-15T13:00:00Z' };
  const [merged] = deduplicateAndReconcileTasks(business.id, [demonstration, fresh], business);
  assert.equal(merged.source, 'seo-audit');
  assert.equal(merged.status, 'pendiente');
  assert.equal(merged.completionType, null);
  assert.equal(merged.completedAt, undefined);
  assert.equal(merged.userEvidence, demonstration.userEvidence);
  const [manual] = deduplicateAndReconcileTasks(business.id, [{ ...demonstration, id: base.id }, { ...fresh, id: 'manual-lcp', source: 'manual' }], business);
  assert.equal(manual.source, 'manual');
  assert.equal(manual.status, 'pendiente');
  const [onlyDemo] = deduplicateAndReconcileTasks(business.id, [demonstration], business);
  assert.equal(onlyDemo.status, 'verificada_auditoria');
});
