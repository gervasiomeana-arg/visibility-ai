import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLcpDiagnostics } from '../../shared/lcpDiagnostics';
import { performanceSolution } from '../../shared/performanceSolution';
import { buildRealSeoAudit, fetchPageSpeedMetrics } from '../seoAuditService';
import { deduplicateAndReconcileTasks } from '../../src/services/storageService';
import type { ActionTask, Business } from '../../src/types';

// Shape documented in GoogleChrome/lighthouse core/test/results/sample_v2.json.
function fixture(checks = { priorityHinted: false, requestDiscoverable: false, eagerlyLoaded: true }) {
  return {
    'lcp-discovery-insight': { details: { type: 'list', items: [
      { type: 'checklist', items: Object.fromEntries(Object.entries(checks).map(([key, value]) => [key, { value }])) },
      { type: 'node', selector: 'main > img.hero' },
    ] } },
    'lcp-breakdown-insight': { details: { type: 'list', items: [
      { type: 'table', items: [
        { subpart: 'timeToFirstByte', duration: 0 },
        { subpart: 'resourceLoadDelay', duration: 6710 },
        { subpart: 'resourceLoadDuration', duration: 190 },
        { subpart: 'elementRenderDelay', duration: 30 },
      ] },
    ] } },
  };
}

test('LCP insight retains failed discovery and priority without inventing a lazy loading fault', () => {
  const diagnostics = extractLcpDiagnostics(fixture())!;
  assert.equal(diagnostics.timings.timeToFirstByte, 0);
  assert.equal(diagnostics.timings.resourceLoadDelay, 6710);
  const solution = performanceSolution('lcp', '6.2 s', diagnostics)!;
  assert.match(solution.detectedData, /6\.2 s/);
  assert.match(solution.detectedData, /6[.,]710 ms/);
  assert.match(solution.detectedData, /no sumar.*LCP simulado/);
  assert.match(solution.detectedData, /comprobación aprobada; no se señala como problema/);
  assert.match(solution.proposedChange, /fetchpriority="high"/);
  assert.match(solution.proposedChange, /HTML inicial/);
  assert.doesNotMatch(solution.proposedChange, /retirar loading|H1|React|6710/);
});

test('PageSpeed response extraction keeps structured LCP insights', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ lighthouseResult: {
    audits: fixture(), categories: { performance: { score: 0.6 } },
  } }), { headers: { 'content-type': 'application/json' } });
  try {
    const result = await fetchPageSpeedMetrics('https://example.com');
    assert.equal(result.performanceScore, 60);
    assert.deepEqual(result.lcpDiagnostics, extractLcpDiagnostics(fixture()));
  } finally { globalThis.fetch = original; }
});

test('passed or missing LCP checks do not become faults, malformed timings are ignored', () => {
  const passed = extractLcpDiagnostics(fixture({ priorityHinted: true, requestDiscoverable: true, eagerlyLoaded: true }));
  assert.match(performanceSolution('lcp', '2 s', passed)!.proposedChange, /Identificar el elemento/);
  assert.equal(extractLcpDiagnostics({}), undefined);
  const invalid = fixture() as any;
  invalid['lcp-discovery-insight'].scoreDisplayMode = 'notApplicable';
  invalid['lcp-breakdown-insight'].details.items[0].items = [
    { subpart: 'resourceLoadDelay', duration: '6710' },
    { subpart: 'resourceLoadDuration', duration: -1 },
    { subpart: 'elementRenderDelay', duration: NaN },
  ];
  assert.equal(extractLcpDiagnostics(invalid), undefined);
  const lazy = extractLcpDiagnostics(fixture({ priorityHinted: true, requestDiscoverable: true, eagerlyLoaded: false }));
  assert.match(performanceSolution('lcp', '5 s', lazy)!.proposedChange, /retirar loading="lazy"/);
});

test('LCP diagnosis survives task reload and reconciliation while preserving manual evidence', () => {
  const diagnostics = extractLcpDiagnostics(fixture());
  const business = { id: 'hotel', url: 'https://example.com', name: 'Hotel' } as Business;
  const task = {
    id: 'task-hotel-lcp', businessId: 'hotel', findingType: 'lcp', source: 'seo-audit',
    metricValue: '6.2 s', lcpDiagnostics: diagnostics, status: 'en_progreso',
    userEvidence: 'Enviado al desarrollador', completionType: null,
    stepByStepSolution: [], title: 'LCP', priority: 'URGENTE', estimatedImpact: 'Alto',
    difficulty: 'Media', estimatedTimeToFix: 'Revisar', simpleExplanation: 'LCP lento',
  } as ActionTask;
  const [result] = deduplicateAndReconcileTasks('hotel', [JSON.parse(JSON.stringify(task))], business);
  assert.equal(result.status, 'en_progreso');
  assert.equal(result.userEvidence, task.userEvidence);
  assert.deepEqual(result.lcpDiagnostics, diagnostics);
  assert.match(result.proposedChange!, /fetchpriority/);
  assert.deepEqual(deduplicateAndReconcileTasks('hotel', [result], business), [result]);
  const [newAudit] = deduplicateAndReconcileTasks('hotel', [result, { ...task, lcpDiagnostics: undefined }], business);
  assert.equal(newAudit.lcpDiagnostics, undefined);
  assert.doesNotMatch(newAudit.proposedChange!, /fetchpriority/);
});

test('auditor uses LCP evidence and does not classify unavailable numeric metrics as slow', async () => {
  const metric = { displayValue: 'N/A', numericValue: null, score: null };
  const metrics = {
    performanceScore: null, firstContentfulPaint: metric, largestContentfulPaint: metric,
    cumulativeLayoutShift: metric, totalBlockingTime: metric, speedIndex: metric,
    lcpDiagnostics: extractLcpDiagnostics(fixture()), fetchedAt: '2026-10-12T00:00:00Z',
  };
  const fetchPage = async (url: string) => ({ finalUrl: url, response: new Response('<html><h1>Hotel</h1></html>', { headers: { 'content-type': 'text/html' } }) });
  const missing = await buildRealSeoAudit('https://example.com', { fetchPage, fetchPageSpeed: async () => metrics });
  assert.ok(!missing.items.some(item => ['fcp', 'lcp', 'cls', 'tbt'].includes(item.key)));
  const measured = await buildRealSeoAudit('https://example.com', { fetchPage, fetchPageSpeed: async () => ({ ...metrics, largestContentfulPaint: { displayValue: '6.2 s', numericValue: 6200, score: 0 } }) });
  const item = measured.items.find(item => item.key === 'lcp')!;
  assert.match(item.simpleExplanation, /espera antes de solicitar/);
  assert.match(item.proposedChange!, /fetchpriority/);
  assert.deepEqual(item.lcpDiagnostics, metrics.lcpDiagnostics);
});
