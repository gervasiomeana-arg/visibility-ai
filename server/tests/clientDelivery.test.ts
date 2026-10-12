import test from 'node:test';
import assert from 'node:assert/strict';
import { summaryEvidence, taskPlanEvidence, technicalFindingReduction } from '../../shared/reportEvidence';
import type { ActionTask, ExecutiveIssue, MonthlyEvolution } from '../../src/types';

test('summary excludes another business and demo examples when real findings exist', () => {
  const issue = { businessId: 'hotel', source: 'real', severity: 'high' } as ExecutiveIssue;
  assert.deepEqual(summaryEvidence('hotel', [issue, { ...issue, source: 'demo' }, { ...issue, businessId: 'other' }]).issues, [issue]);
  assert.equal(summaryEvidence('hotel', [{ ...issue, businessId: 'other' }]).mode, 'empty');
  assert.equal(summaryEvidence('hotel', [{ ...issue, source: 'demo' }]).mode, 'demo');
});

test('plan distinguishes manual completion, verified legacy completion and scoped notes', () => {
  const base = { id: 'lcp', businessId: 'hotel', source: 'seo-audit', status: 'completada_manual', completionType: 'manual', userEvidence: 'Nota del hotel' } as ActionTask;
  const result = taskPlanEvidence('hotel', [base, { ...base, id: 'verified', status: 'completada', completionType: 'auditoria', userEvidence: null },
    { ...base, id: 'pending', status: 'pendiente', userEvidence: null }, { ...base, businessId: 'other', userEvidence: 'Private' }, { ...base, source: 'demo' }]);
  assert.equal(result.tasks.length, 3);
  assert.equal(result.manualCompleted, 1);
  assert.equal(result.verified, 1);
  assert.equal(result.pending, 1);
  assert.deepEqual(result.notes.map(task => task.userEvidence), ['Nota del hotel']);
});

test('finding reduction cannot compare changed or unknown measurement sources', () => {
  const evolution = { source: 'real', months: ['a', 'b'], visibility: [60, 70], auditBases: ['SEO', 'SEO'], fixedProblems: [0, 2] } as MonthlyEvolution;
  assert.equal(technicalFindingReduction(evolution), 2);
  assert.equal(technicalFindingReduction({ ...evolution, auditBases: ['SEO', 'SEO+PAGESPEED'] }), null);
  assert.equal(technicalFindingReduction({ ...evolution, auditBases: [] }), null);
  assert.equal(technicalFindingReduction({ ...evolution, fixedProblems: [0, NaN] }), null);
});
