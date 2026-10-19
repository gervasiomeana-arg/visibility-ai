import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MonthlyReportView } from '../../src/components/MonthlyReportView';
import { EvolutionView } from '../../src/components/EvolutionView';
import type { Business, MonthlyEvolution, ExecutiveIssue, ActionTask, Workspace } from '../../src/types';

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

test('direct client saving waits for scoped social sources and never opens for another role or workspace', () => {
  const ownBusiness = {...business,workspaceId:'workspace'};
  const workspace = {id:'workspace',role:'owner'} as Workspace;
  const clientReportStore = {list:async () => [],saveReport:async () => { throw Error('SSR must not write'); }};
  const pending = render({business:ownBusiness,workspace,clientReportStore});
  assert.match(pending,/Cargando mediciones guardadas de Redes/);
  assert.doesNotMatch(pending,/Guardar en Clientes/);
  assert.match(pending,/disabled/);
  assert.doesNotMatch(render({business:ownBusiness,workspace:{...workspace,role:'viewer'},clientReportStore}),/Guardar en Clientes/);
  assert.doesNotMatch(render({business:ownBusiness,workspace:{...workspace,id:'foreign'},clientReportStore}),/Guardar en Clientes/);
  assert.doesNotMatch(render({business:ownBusiness,workspace,clientReportStore,evolution:{...evolution,source:'demo',searchPeriods:[],searchClicks:[],searchImpressions:[]}}),/Guardar en Clientes/);
});

test('client report includes dated mobile FCP and LCP values and labels their laboratory scope', () => {
  const html = render({ auditMeta: {
    requestedUrl: business.url, finalUrl: 'https://published.example/', fetchedAt: '2026-10-14T22:00:00Z',
    pageSpeed: { performanceScore: 59, fetchedAt: '2026-10-14T21:00:00Z', firstContentfulPaint: { numericValue: 8532 }, largestContentfulPaint: { numericValue: 10300 } } as any,
  } });
  assert.match(html,/8,532 s/); assert.match(html,/10,3 s/); assert.match(html,/59\/100/);
  assert.match(html,/18:00/); assert.match(html,/America\/Argentina\/Buenos_Aires/);
  assert.match(html,/published.example/); assert.match(html,/Prueba de laboratorio/);
  const foreign = render({ auditMeta: { requestedUrl: 'https://private-client.example/', finalUrl: 'https://private-client.example/', pageSpeed: { performanceScore: 99, fetchedAt: '2026-10-14T21:00:00Z', firstContentfulPaint: { numericValue: 12345 } } as any } });
  assert.doesNotMatch(foreign,/99\/100|12,345 s|private-client.example/);
  assert.match(foreign,/URL verificable para este negocio/);
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

test('client report suppresses a foreign search property, its period and its metrics',()=>{
  const html=render({evolution:{...evolution,searchPeriods:[{siteUrl:'sc-domain:foreign.example',startDate:'2025-01-01',endDate:'2025-01-28',loadedAt:'2025-02-01'}],searchClicks:[123456],searchImpressions:[200000],searchCtr:[61.73]}});
  assert.ok(html.includes('no corresponden al sitio de este negocio'));
  for(const value of ['foreign.example','2025-01-01','123.456','200.000','61,73%'])assert.ok(!html.includes(value));
});

test('client report labels incomplete stored measurements instead of combining different rows',()=>{
  const html=render({evolution:{...evolution,searchPeriods:[evolution.searchPeriods![0],{siteUrl:'sc-domain:own.example',startDate:'2026-10-12',endDate:'2026-11-08',loadedAt:'2026-11-10'}],searchClicks:[7],searchImpressions:[100]}});
  assert.ok(html.includes('guardadas están incompletas'));
  assert.ok(!html.includes('2026-10-12'));
  assert.ok(!html.includes('7%'));
});

test('report and evolution explicitly show a measured increase in findings',()=>{
  const worse={...evolution,months:['Inicio','Actual'],visibility:[70,60],auditBases:['SEO','SEO'],fixedProblems:[0,-2]};
  const report=render({evolution:worse});
  assert.ok(report.includes('Variación neta de hallazgos'));
  assert.ok(report.includes('2 más'));
  const history=renderToStaticMarkup(React.createElement(EvolutionView,{business,evolution:worse,setActiveTab:()=>{}}));
  assert.ok(history.includes('2 más'));
  assert.ok(history.includes('hallazgos técnicos más respecto de la primera auditoría'));
});

test('rendered evolution excludes another property and explains why its history was omitted',()=>{
  const foreign={...evolution,searchPeriods:[{siteUrl:'sc-domain:foreign.example',startDate:'2025-01-01',endDate:'2025-01-28',loadedAt:'2025-02-01'}],searchMonths:['Private foreign period'],searchClicks:[1234567],searchImpressions:[2000000],searchPositions:[12]};
  const html=renderToStaticMarkup(React.createElement(EvolutionView,{business,evolution:foreign,setActiveTab:()=>{}}));
  assert.ok(html.includes('no corresponden al sitio de este negocio'));
  for(const value of ['Private foreign period','1.234.567','2.000.000','foreign.example'])assert.ok(!html.includes(value));
});
