import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { reconcileTaskAuditEvidence } from '../../shared/taskAuditEvidence';
import { storageService } from '../../src/services/storageService';
import { MonthlyReportView } from '../../src/components/MonthlyReportView';
import type { ActionTask, SeoAuditItem, Business, MonthlyEvolution } from '../../src/types';
const url = 'https://business.example/';
const task = { id: 'task-own-h1', businessId: 'own', source: 'seo-audit', url, findingType: 'h1', title: 'Encabezado H1', status: 'pendiente', completionType: null, measuredAt: '2026-10-14T12:00:00Z', userEvidence: 'Nota manual del operador', priority: 'IMPORTANTE', estimatedImpact: 'Medio', difficulty: 'Fácil', simpleExplanation: 'Hallazgo anterior', stepByStepSolution: [], estimatedTimeToFix: 'Revisar' } as ActionTask;
const item = { id: 'real-h1', key: 'h1', source: 'real', status: 'ok', checkedAt: '2026-10-15T12:00:00Z', metricValue: '1 H1' } as SeoAuditItem;
const meta = { requestedUrl: url, fetchedAt: '2026-10-15T12:00:01Z' };

test('a new correct factor verifies its matching audit task and retains manual notes with dated evidence', () => {
  const [result] = reconcileTaskAuditEvidence('own', [task], [item], meta);
  assert.equal(result.status, 'verificada_auditoria'); assert.equal(result.completionType, 'auditoria');
  assert.equal(result.completedAt, item.checkedAt); assert.equal(result.userEvidence, task.userEvidence);
  assert.deepEqual(result.auditEvidence, { url, checkedAt: item.checkedAt, status: 'ok', metricValue: '1 H1' });
  assert.equal(task.status, 'pendiente', 'Do not mutate the input');
});

test('foreign tasks, different pages, query strings, manual sources and missing PageSpeed factors never become verified', () => {
  for (const patch of [{ businessId: 'other' }, { url: 'https://other.example/' }, { url: `${url}other` }, { url: `${url}?campaign=other` }, { url: undefined }, { source: 'demo' }, { source: 'manual' }, { findingType: 'lcp' }]) {
    const input = { ...task, ...patch } as ActionTask;
    assert.equal(reconcileTaskAuditEvidence('own', [input], [item], meta)[0], input);
  }
  for (const patch of [{ requestedUrl: 'https://other.example/' }, { fetchedAt: undefined }]) assert.equal(reconcileTaskAuditEvidence('own', [task], [item], { ...meta, ...patch })[0], task);
});

test('ambiguous, undated, demo or older audit evidence cannot override a later measurement or manual edit', () => {
  for (const change of [{ source: 'demo' }, { checkedAt: undefined }, { checkedAt: '2026-10-13T12:00:00Z' }, { checkedAt: '2026-10-16T12:00:00Z' }]) assert.equal(reconcileTaskAuditEvidence('own', [task], [{ ...item, ...change } as SeoAuditItem], meta)[0], task);
  assert.equal(reconcileTaskAuditEvidence('own', [task], [item, item], meta)[0], task);
  const reopened = { ...task, manualUpdatedAt: '2026-10-15T13:00:00Z' };
  assert.equal(reconcileTaskAuditEvidence('own', [reopened], [item], meta)[0], reopened);
});

test('a new adverse factor reopens a prior audit verification but does not erase a manual completion', () => {
  const verified = reconcileTaskAuditEvidence('own', [task], [item], meta)[0];
  const failed = { ...item, status: 'warning', metricValue: '0 H1', checkedAt: '2026-10-16T12:00:00Z' } as SeoAuditItem;
  const nextMeta = { ...meta, fetchedAt: '2026-10-16T12:00:01Z' };
  const [reopened] = reconcileTaskAuditEvidence('own', [verified], [failed], nextMeta);
  assert.equal(reopened.status, 'pendiente'); assert.equal(reopened.completedAt, null);
  assert.equal(reopened.userEvidence, task.userEvidence);
  const [manual] = reconcileTaskAuditEvidence('own', [{ ...task, status: 'completada_manual', completionType: 'manual' }], [failed], nextMeta);
  assert.equal(manual.status, 'completada_manual'); assert.equal(manual.auditEvidence?.status, 'warning');
});

test('verified evidence survives scoped reloads, ignores stale cloud status and is included in the client report', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), scope = storageService.getScope();
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  try {
    storageService.setScope('verification-test');
    storageService.saveActionTasks('own', [task]);
    storageService.saveSeoAudit('own', [item], meta);
    const [saved] = storageService.getActionTasks('own');
    assert.equal(saved.status, 'verificada_auditoria');
    assert.deepEqual(storageService.getActionTasks('own')[0].auditEvidence, saved.auditEvidence);
    storageService.saveActionTasks('own', [{ ...task, status: 'en_progreso' }]);
    assert.equal(storageService.getActionTasks('own')[0].status, 'verificada_auditoria');
    const evolution = { source: 'real', months: ['Auditoría'], visibility: [100], fixedProblems: [0], googlePositions: [], estimatedVisits: [], consultations: [], monthComparison: { visibilityChangePercent: 0, improvedPositionsCount: 0, solvedProblemsCount: 0, newOpportunitiesCount: 0, consultationsTotal: 0 } } as MonthlyEvolution;
    const html = renderToStaticMarkup(React.createElement(MonthlyReportView, { business: { id: 'own', name: 'Negocio probado', url } as Business, evolution, issues: [], tasks: [saved] }));
    assert.match(html, /Factor verificado por auditoría/); assert.match(html, /1 H1/); assert.match(html, /URL comprobada/);
    assert.match(html, /Actualizada: Sin fecha registrada/);
    storageService.updateTaskStatus('own', saved.id, 'pendiente', null, 'Reabierta por el operador');
    assert.equal(storageService.getActionTasks('own')[0].status, 'pendiente');
    storageService.setScope('other-workspace');
    assert.equal(storageService.getActionTasks('own').length, 0);
    storageService.setScope('verification-test');
    assert.equal(storageService.getActionTasks('other').length, 0);
  } finally { storageService.setScope(scope); if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete (globalThis as any).localStorage; }
});
