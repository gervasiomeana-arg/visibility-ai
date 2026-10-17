import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createGeminiGenerator, AiProviderError, sendAiFailure } from '../geminiService';
import { socialStorageFailure } from '../../shared/socialStorageFailure';
import { storageService, sortTasksByPriority } from '../../src/services/storageService';
import { opportunityEvidence } from '../../shared/opportunityEvidence';
import { reportEvidence } from '../../shared/reportEvidence';
import { dominantLcpPhase, lcpDiagnosticSolution } from '../../shared/lcpDiagnostics';
import { DashboardOverview } from '../../src/components/DashboardOverview';
import type { Business, SeoAuditItem, MonthlyEvolution } from '../../src/types';

// Reproduces env configuration being available only after importing the server module.
test('Gemini resolves a late secret at request time and refreshes a rotated client without changing the request', async () => {
  let key: string | undefined;
  const created: string[] = [], requests: any[] = [];
  const generate = createGeminiGenerator({ key: () => key, client: value => { created.push(value); return { models: { generateContent: async params => { requests.push(params); return { text: 'Borrador del proveedor' }; } } }; } });
  await assert.rejects(generate({ model: 'gemini-3.8-flash', contents: 'Scouting' }), error => error instanceof AiProviderError && error.kind === 'configuration');
  assert.equal(created.length, 0);
  key = 'late-fixture';
  for (let i = 0; i < 2; i++) assert.equal((await generate({ model: 'gemini-3.8-flash', contents: 'Scouting' })).text, 'Borrador del proveedor');
  key = 'rotated-fixture'; await generate({ model: 'gemini-3.8-flash', contents: 'Scouting' });
  assert.deepEqual(created, ['late-fixture', 'rotated-fixture']);
  assert.equal(requests[0].contents, 'Scouting'); assert.equal(requests[0].config.thinkingConfig.thinkingLevel, 'LOW');
  assert.equal(requests[0].config.httpOptions.retryOptions.attempts, 1);
});

test('one transient provider rejection can recover within the original timeout and with grounding unchanged', async () => {
  let calls = 0, clock = 100;
  const timeouts: number[] = [];
  const generate = createGeminiGenerator({ key: () => 'fixture', now: () => clock, wait: async ms => { assert.equal(ms, 750); clock += ms; }, client: () => ({ models: { generateContent: async params => {
    assert.deepEqual(params.config?.tools, [{ googleSearch: {} }]); timeouts.push(params.config!.httpOptions!.timeout!); calls++; clock += 1000;
    if (calls === 1) throw { status: 503, message: 'private details' }; return { text: 'Síntesis con fuentes' };
  } } }) });
  const result = await generate({ model: 'gemini-3.8-flash', contents: 'Consulta', config: { tools: [{ googleSearch: {} }], httpOptions: { timeout: 60000 } } });
  assert.equal(result.text, 'Síntesis con fuentes'); assert.equal(calls, 2); assert.deepEqual(timeouts, [60000, 58250]);
});

test('quota, credentials, invalid requests, timeouts and unknown network outcomes never trigger duplicate automatic calls', async () => {
  for (const [error, kind] of [[{ status: 429 }, 'quota'], [{ status: 403 }, 'credentials'], [{ status: 404 }, 'model'], [{ status: 400 }, 'request'], [{ name: 'TimeoutError' }, 'timeout'], [new TypeError('private network details'), 'unavailable']] as const) {
    let calls = 0;
    const generate = createGeminiGenerator({ key: () => 'fixture', wait: async () => assert.fail('Unexpected retry'), client: () => ({ models: { generateContent: async () => { calls++; throw error; } } }) });
    await assert.rejects(generate({ model: 'gemini-3.8-flash', contents: 'Consulta' }), failure => failure instanceof AiProviderError && failure.kind === kind);
    assert.equal(calls, 1);
  }
});

test('AI failure responses and correlated logs disclose only stable diagnostic categories, never raw provider requests', () => {
  const original = console.error, logs: string[] = [];
  console.error = value => logs.push(String(value));
  try {
    let body: any, status: number | undefined;
    const res = { locals: { requestId: 'review-reference' }, status(value: number) { status = value; return this; }, json(value: unknown) { body = value; return this; } };
    sendAiFailure(res as any, { status: 429, message: 'secret-key / private prompt' }, 'content');
    assert.equal(status, 503); assert.equal(body.code, 'ai_quota'); assert.match(body.error, /cuota/);
    assert.match(logs[0], /review-reference/); assert.doesNotMatch(JSON.stringify([body, logs]), /secret-key|private prompt/);
  } finally { console.error = original; }
});

test('Redes distinguishes missing schema, denied permissions, session and conflicts without leaking database messages', () => {
  for (const code of ['42P01', 'PGRST205', '42703', 'PGRST204']) assert.match(socialStorageFailure({ code }), /202610150001_business_social_accounts.sql/);
  assert.match(socialStorageFailure({ code: '42501' }), /propietario/);
  assert.match(socialStorageFailure({ code: 'PGRST301' }), /sesión/);
  assert.match(socialStorageFailure({ code: '23505' }), /última versión/);
  assert.match(socialStorageFailure({ code: '23503' }), /negocio y espacio/);
  assert.doesNotMatch(socialStorageFailure({ code: 'unexpected', message: 'secret row data' }), /secret row data|migración/);
});

test('audit tasks, opportunities and report priorities agree on severity and ties instead of inflating impact into urgency', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), scope = storageService.getScope();
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  try {
    storageService.setScope('qa-priority');
    const business = { id: 'own', name: 'Negocio', url: 'https://example.com' } as Business;
    const items = [
      { key: 'pagespeed-performance', title: 'Rendimiento móvil PageSpeed', status: 'warning', impact: 'Alto' },
      { key: 'lcp', title: 'Largest Contentful Paint (LCP)', status: 'warning', impact: 'Alto' },
      { key: 'fcp', title: 'First Contentful Paint (FCP)', status: 'error', impact: 'Medio' },
    ].map(item => ({ ...item, source: 'real', checkedAt: '2026-10-16T08:00:00Z', category: 'Velocidad y Móvil', simpleExplanation: 'Dato', solution: 'Revisar' })) as SeoAuditItem[];
    const tasks = sortTasksByPriority(storageService.buildActionTasksFromSeoAudit('own', items));
    const opportunities = opportunityEvidence(storageService.buildOpportunitiesFromSeoAudit(business, items), 'own').visible;
    const report = reportEvidence('own', { months: [], visibility: [], googlePositions: [], estimatedVisits: [], consultations: [], fixedProblems: [], monthComparison: { visibilityChangePercent: 0, improvedPositionsCount: 0, solvedProblemsCount: 0, newOpportunitiesCount: 0, consultationsTotal: 0 } }, storageService.buildIssuesFromSeoAudit('own', items));
    assert.deepEqual(opportunities.map(item => item.detectedProblem), tasks.map(item => item.title));
    assert.deepEqual(report.priorities.map(item => item.name), tasks.map(item => item.title));
    assert.deepEqual(opportunities.map(item => item.priority), ['URGENTE', 'IMPORTANTE', 'IMPORTANTE']);
    storageService.saveSeoAudit('own', items);
    storageService.replaceOpportunitiesBySource('own', 'seo-audit', opportunities.map(({ priority, ...legacy }) => legacy));
    assert.deepEqual(storageService.getOpportunities('own').map(item => item.priority), opportunities.map(item => item.priority));
  } finally { storageService.setScope(scope); if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete (globalThis as any).localStorage; }
});

test('LCP identifies dominant render delay rather than emphasizing a 1.53ms request/download difference', () => {
  const diagnostics = { timings: { timeToFirstByte: 2.2, resourceLoadDelay: 182.78, resourceLoadDuration: 181.25, elementRenderDelay: 1970.9 }, checks: { eagerlyLoaded: true, priorityHinted: false } };
  assert.equal(dominantLcpPhase(diagnostics)?.key, 'elementRenderDelay');
  assert.match(dominantLcpPhase(diagnostics)!.explanation, /mostrar el elemento/);
  const solution = lcpDiagnosticSolution(diagnostics)!;
  assert.match(solution.proposedChange!, /después de cargar/); assert.match(solution.proposedChange!, /fetchpriority/);
  assert.doesNotMatch(solution.proposedChange!, /retirar loading/);
  assert.equal(dominantLcpPhase({ timings: { resourceLoadDelay: 100, elementRenderDelay: 100 }, checks: {} }), undefined);
});


test('real business dashboard never presents an unmeasured AI channel as a 0/100 score', () => {
  const business = { id: 'own', name: 'Empresa', category: 'Servicios', city: '', country: 'Argentina', createdAt: '2026-10-16', totalOpportunities: 0, problemsCount: {high: 0, medium: 0, ok: 1}, url: 'https://example.com', scores: { overall: 85, google: 0, seo: 88, web: 82, aiVisibility: 0 }, scoreSources: { overall: 'partial', google: 'partial', seo: 'real', web: 'real', aiVisibility: 'demo' } } as Business;
  const issues = storageService.buildIssuesFromSeoAudit('own', [{ key: 'title', title: 'Título', source: 'real', status: 'ok', impact: 'Medio' } as SeoAuditItem]);
  const html = renderToStaticMarkup(React.createElement(DashboardOverview, { business, issues, setActiveTab: () => {}, onOpenAssistant: () => {}, onGenerateOpportunity: () => {} }));
  assert.match(html, /Índice técnico parcial/); assert.match(html, /Sin medir/);
  assert.match(html, /Todavía no se midió/); assert.doesNotMatch(html, /Optimizar con IA|Índice de visibilidad/);
});

test('the installed Gemini SDK accepts bounded LOW reasoning and preserves quota status without its own retry loop', async () => {
  const { GoogleGenAI } = await import('@google/genai');
  let calls = 0, reject = false;
  const generate = createGeminiGenerator({ key: () => 'private-fixture', client: key => new GoogleGenAI({ apiKey: key, httpOptions: { fetch: async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.generationConfig.thinkingConfig.thinkingLevel.toLowerCase(), 'low');
    if (reject) return new Response(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'private provider content' } }), { status: 429, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: 'Texto del proveedor' }] }, finishReason: 'STOP' }] }), { headers: { 'content-type': 'application/json' } });
  } } }) });
  assert.equal((await generate({ model: 'gemini-3.8-flash', contents: 'Consulta' })).text, 'Texto del proveedor');
  reject = true;
  await assert.rejects(generate({ model: 'gemini-3.8-flash', contents: 'Consulta' }), error => error instanceof AiProviderError && error.kind === 'quota');
  assert.equal(calls, 2);
});
