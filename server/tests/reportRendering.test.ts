import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MonthlyReportView } from '../../src/components/MonthlyReportView';
import type { Business, MonthlyEvolution, ExecutiveIssue, ActionTask } from '../../src/types';

const business = { id: 'own', name: 'Cliente seleccionado', url: 'https://own.example', description: 'Descripción confirmada', scores: { web: 0 }, scoreSources: { web: 'unavailable' } } as Business;
const evolution: MonthlyEvolution = { source: 'real', months: [], visibility: [], fixedProblems: [], googlePositions: [], estimatedVisits: [], consultations: [], monthComparison: { visibilityChangePercent: 0, improvedPositionsCount: 0, solvedProblemsCount: 0, newOpportunitiesCount: 0, consultationsTotal: 0 }, searchMonths: ['2026-09-14 a 2026-10-11'], searchClicks: [0], searchImpressions: [0], searchCtr: [0], searchPeriods: [{ siteUrl: 'sc-domain:own.example', startDate: '2026-09-14', endDate: '2026-10-11', loadedAt: '2026-10-13T20:00:00Z' }] };
const render = (changes: Partial<React.ComponentProps<typeof MonthlyReportView>> = {}) => renderToStaticMarkup(React.createElement(MonthlyReportView, { business, evolution, issues: [], ...changes }));

test('client report preserves empty measured search scope without inventing CTR, visits or performance', () => {
  const html = render();
  assert.ok(html.includes('Sin consultas de búsqueda recuperadas para este período'));
  assert.ok(html.includes('no demuestra que el sitio no haya recibido visitas'));
  assert.ok(html.includes('sc-domain:own.example'));
  assert.ok(html.includes('2026-09-14 a 2026-10-11'));
  assert.ok(html.includes('SIN MEDICIÓN'));
  assert.ok(html.includes('Sin medición actual de rendimiento disponible'));
  assert.ok(!html.includes('NaN'));
});

test('rendered client report excludes foreign priorities and task evidence', () => {
  const issue = { id: 'foreign', businessId: 'other', source: 'real', severity: 'high', name: 'Hallazgo privado de otro cliente', checkedAt: '2026-10-13' } as ExecutiveIssue;
  const task = { id: 'foreign', businessId: 'other', source: 'manual', status: 'pendiente', title: 'Tarea privada de otro cliente', userEvidence: 'Evidencia ajena confidencial' } as ActionTask;
  const html = render({ issues: [issue], tasks: [task] });
  assert.ok(html.includes('Cliente seleccionado'));
  for (const forbidden of [issue.name, task.title, task.userEvidence!]) assert.ok(!html.includes(forbidden));
});

test('rendered positive search fixture shows supplied metrics without treating clicks as sales', () => {
  // Local fixture only: this is not a live Google import or a customer measurement.
  const html = render({ evolution: { ...evolution, searchClicks: [7], searchImpressions: [100], searchCtr: [7] } });
  assert.ok(!html.includes('Sin consultas de búsqueda recuperadas para este período'));
  assert.ok(html.includes('7%'));
  assert.ok(html.includes('No se deducen de los clics ni del índice técnico'));
  assert.ok(!html.includes('NaN'));
});
