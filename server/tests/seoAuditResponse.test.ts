import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { validateSeoAuditResponse } from '../../shared/seoAuditResponse';
import { buildRealSeoAudit } from '../seoAuditService';
import { storageService } from '../../src/services/storageService';
import { MonthlyReportView } from '../../src/components/MonthlyReportView';
import type { Business, SeoAuditItem, MonthlyEvolution } from '../../src/types';

const item: SeoAuditItem = { id: 'real-title', key: 'title', title: 'Título SEO', category: 'Contenido y On-Page', status: 'warning', statusLabel: 'Mejorable', simpleExplanation: 'Título breve en HTML inicial', solution: 'Revisar el texto', impact: 'Medio', source: 'real', checkedAt: '2026-10-15T12:00:00Z' };
const valid = { requestedUrl: 'https://business.example/', finalUrl: 'https://published.example/', fetchedAt: '2026-10-15T12:00:01Z', httpStatus: 200, responseTimeMs: 0, items: [item], pageSpeed: null, pageSpeedError: 'Servicio temporalmente no disponible' };

test('new audit responses require the requested page, dates, HTTP status and finite measurements', () => {
  assert.equal(validateSeoAuditResponse(valid, 'business.example'), valid);
  for (const patch of [{ requestedUrl: 'https://foreign.example/' }, { finalUrl: 'javascript:alert(1)' }, { fetchedAt: 'invalid' }, { httpStatus: null }, { responseTimeMs: -1 }, { responseTimeMs: Infinity }, { items: [] }, { items: null }]) {
    assert.throws(() => validateSeoAuditResponse({ ...valid, ...patch }, valid.requestedUrl), /No se guardó/);
  }
  for (const payload of [null, [], 'html']) assert.throws(() => validateSeoAuditResponse(payload, valid.requestedUrl));
});

test('an incomplete, demo, undated or duplicated factor rejects the entire new audit', () => {
  for (const patch of [{ source: 'demo' }, { source: undefined }, { checkedAt: null }, { key: '' }, { title: null }, { metricValue: {} }, { category: 'Fake' }, { status: 'unknown' }, { impact: null }]) {
    assert.throws(() => validateSeoAuditResponse({ ...valid, items: [item, { ...item, id: 'other', key: 'other', ...patch }] }, valid.requestedUrl));
  }
  assert.throws(() => validateSeoAuditResponse({ ...valid, items: [item, item] }, valid.requestedUrl));
});

test('valid PageSpeed zeros stay measured while malformed scores or metrics reject a new response', () => {
  const metric = { numericValue: 0, displayValue: null, score: 0 };
  const speed = { fetchedAt: valid.fetchedAt, performanceScore: 0, firstContentfulPaint: metric, largestContentfulPaint: metric, cumulativeLayoutShift: metric, totalBlockingTime: metric, speedIndex: metric };
  const result = validateSeoAuditResponse({ ...valid, pageSpeed: speed, pageSpeedError: null }, valid.requestedUrl);
  assert.equal(result.pageSpeed?.performanceScore, 0);
  assert.equal(result.pageSpeed?.largestContentfulPaint.numericValue, 0);
  for (const patch of [{ performanceScore: '0' }, { performanceScore: 101 }, { fetchedAt: '' }, { largestContentfulPaint: { ...metric, numericValue: -1 } }, { largestContentfulPaint: { ...metric, score: 2 } }, { firstContentfulPaint: null }]) {
    assert.throws(() => validateSeoAuditResponse({ ...valid, pageSpeed: { ...speed, ...patch }, pageSpeedError: null }, valid.requestedUrl));
  }
  assert.throws(() => validateSeoAuditResponse({ ...valid, pageSpeed: speed }, valid.requestedUrl), /No se guardó/);
});

test('demo and unlabelled factors never become real issues, tasks or priorities in the client report', () => {
  const demo = { ...item, id: 'demo', key: 'demo', source: 'demo' as const, title: 'Hallazgo ficticio privado' };
  const unknown = { ...item, id: 'unknown', key: 'unknown', source: undefined, title: 'Factor sin fuente' };
  const input = [demo, unknown, item];
  const before = JSON.stringify(input);
  const issues = storageService.buildIssuesFromSeoAudit('own', input);
  const tasks = storageService.buildActionTasksFromSeoAudit('own', input);
  assert.equal(issues.length, 1); assert.equal(tasks.length, 1);
  assert.equal(issues[0].name, item.title); assert.equal(tasks[0].findingType, item.key);
  assert.equal(storageService.buildIssuesFromSeoAudit('own', [demo, unknown]).length, 0);
  assert.equal(storageService.buildActionTasksFromSeoAudit('own', [demo, unknown]).length, 0);
  assert.equal(storageService.calculateSeoScore([demo, unknown]), null);
  assert.equal(JSON.stringify(input), before);
  const evolution = { source: 'real', months: [], visibility: [], fixedProblems: [], googlePositions: [], estimatedVisits: [], consultations: [], monthComparison: { visibilityChangePercent: 0, improvedPositionsCount: 0, solvedProblemsCount: 0, newOpportunitiesCount: 0, consultationsTotal: 0 } } as MonthlyEvolution;
  const html = renderToStaticMarkup(React.createElement(MonthlyReportView, { business: { id: 'own', name: 'Cliente de prueba', url: valid.requestedUrl } as Business, evolution, issues, tasks }));
  assert.match(html, /Título SEO/);
  assert.doesNotMatch(html, /Hallazgo ficticio privado|Factor sin fuente/);
});

test('the real audit generator satisfies the response contract when optional PageSpeed fails', async () => {
  const result = await buildRealSeoAudit(valid.requestedUrl, {
    fetchPage: async url => ({ finalUrl: url, response: new Response('<html lang="es"><head><title>Servicio confirmado para clientes</title></head><body><h1>Servicio</h1></body></html>', { headers: { 'content-type': 'text/html' } }) }),
    fetchPageSpeed: async () => { throw new Error('Unavailable'); },
  });
  assert.equal(validateSeoAuditResponse(result, valid.requestedUrl), result);
  assert.ok(result.items.length > 10);
  assert.ok(result.pageSpeedError);
});
