import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceSolution, legacyPerformanceMetric } from '../../shared/performanceSolution';
import { deduplicateAndReconcileTasks } from '../../src/services/storageService';
import { ActionTask, Business } from '../../src/types';
import { buildRealSeoAudit } from '../seoAuditService';

test('stored FCP solutions recover the measurement and preserve progress and evidence', () => {
  const business = { id: 'performance-biz', name: 'Example', url: 'https://example.com' } as Business;
  const task: ActionTask = {
    id: 'stored-fcp', businessId: business.id, findingType: 'fcp', source: 'seo-audit',
    title: 'First Contentful Paint (FCP)', priority: 'URGENTE', status: 'en_progreso',
    userEvidence: 'Revisando el informe', completionType: null,
    estimatedImpact: 'Medio', difficulty: 'Media', estimatedTimeToFix: '30 min',
    simpleExplanation: 'El primer contenido visible tarda demasiado.', stepByStepSolution: [],
    detectedData: 'El primer contenido visible tarda demasiado.', howToVerify: 'Ctrl+U o cURL',
    quickActionPrompt: 'Ayudame a resolver FCP. Dato detectado: 8.5 s.',
  };
  const [result] = deduplicateAndReconcileTasks(business.id, [task], business);
  assert.equal(result.id, task.id);
  assert.equal(result.status, 'en_progreso');
  assert.equal(result.userEvidence, task.userEvidence);
  assert.equal(result.completionType, null);
  assert.equal(result.metricValue, '8.5 s');
  assert.match(result.detectedData!, /FCP: 8\.5 s/);
  assert.match(result.detectedData!, /laboratorio.*móvil/);
  assert.match(result.howToVerify!, /pagespeed\.web\.dev/);
  assert.doesNotMatch(result.howToVerify!, /Ctrl\+U|cURL/);
  assert.deepEqual(deduplicateAndReconcileTasks(business.id, [result], business), [result]);
});

test('performance solutions distinguish LCP and never invent missing measurements', () => {
  const lcp = performanceSolution('lcp', '10.3 s')!;
  assert.match(lcp.detectedData, /LCP: 10\.3 s/);
  assert.match(lcp.proposedChange, /Identificar el elemento LCP/);
  assert.match(performanceSolution('fcp')!.detectedData, /no está disponible/);
  assert.equal(legacyPerformanceMetric('Dato medido: 0 ms.'), '0 ms');
  assert.equal(legacyPerformanceMetric('Dato medido: 57/100.'), '57/100');
  assert.equal(legacyPerformanceMetric('Dato medido: 8,5 s.'), '8,5 s');
  assert.equal(legacyPerformanceMetric('El dato no está disponible'), undefined);
  assert.equal(legacyPerformanceMetric('Dato medido: FCP pendiente'), undefined);
  assert.equal(performanceSolution('h1'), undefined);
});

test('auditor supplies measured mobile performance solutions for the audit view', async () => {
  const result = await buildRealSeoAudit('https://example.com', {
    fetchPage: async (url) => ({ finalUrl: url, response: new Response('<html><body><h1>Example</h1></body></html>', { headers: { 'content-type': 'text/html' } }) }),
    fetchPageSpeed: async () => ({
      performanceScore: 57,
      firstContentfulPaint: { displayValue: '8.5 s', numericValue: 8500, score: 0 },
      largestContentfulPaint: { displayValue: '10.3 s', numericValue: 10300, score: 0 },
      cumulativeLayoutShift: { displayValue: '0', numericValue: 0, score: 1 },
      totalBlockingTime: { displayValue: '0 ms', numericValue: 0, score: 1 },
      speedIndex: { displayValue: '9 s', numericValue: 9000, score: 0 },
      fetchedAt: '2026-10-09T00:00:00Z',
    }),
  });
  for (const key of ['fcp', 'lcp', 'cls', 'tbt', 'pagespeed-performance']) {
    const item = result.items.find((item) => item.key === key)!;
    assert.ok(item);
    assert.ok(item.detectedData?.includes(item.metricValue!));
    assert.match(item.howToVerify!, /Lighthouse/);
    assert.doesNotMatch(item.howToVerify!, /Ctrl\+U|cURL/);
  }
});
