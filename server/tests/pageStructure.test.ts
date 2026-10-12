import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRealSeoAudit, canonicalEvidence, viewportEvidence } from '../seoAuditService';

test('fixed or incomplete mobile viewport cannot pass on mere tag presence', () => {
  assert.ok(viewportEvidence('width=1024').issues.length);
  assert.ok(viewportEvidence('initial-scale=1').issues.length);
  assert.ok(viewportEvidence('width=device-width,initial-scale=0.5').issues.length);
  assert.ok(viewportEvidence('width=device-width,initial-scale=bad').issues.length);
  assert.deepEqual(viewportEvidence(' WIDTH = DEVICE-WIDTH ; INITIAL-SCALE=1 ').issues, []);
});

test('canonical evidence rejects invalid references, fragments and conflicting destinations', () => {
  for (const value of ['', 'javascript:alert(1)', 'ftp://example.com', 'https://user:pass@example.com', 'https://[broken']) {
    assert.ok(canonicalEvidence([value], 'https://example.com').issues.length);
  }
  assert.ok(canonicalEvidence(['/page#section'], 'https://example.com').issues.length);
  assert.ok(canonicalEvidence(['/one', '/two'], 'https://example.com').issues.length);
  assert.deepEqual(canonicalEvidence(['/one', 'https://example.com/one'], 'https://example.com').issues, []);
  assert.deepEqual(canonicalEvidence(['https://other-domain.com/preferred'], 'https://example.com').issues, []);
});

async function audit(markup: string) {
  return buildRealSeoAudit('https://example.com', {
    fetchPage: async url => ({ finalUrl: url, response: new Response(`<html><head>${markup}</head><body><h1>Example</h1></body></html>`, { headers: { 'content-type': 'text/html' } }) }),
    fetchPageSpeed: async () => { throw new Error('No measurement in fixture'); },
  });
}

test('auditor supplies specific mobile and canonical evidence without asserting visual or Google verification', async () => {
  const result = await audit('<meta name="viewport" content="width=1024"><link rel="canonical" href="javascript:alert(1)">');
  const mobile = result.items.find(item => item.key === 'viewport')!;
  const canonical = result.items.find(item => item.key === 'canonical')!;
  assert.equal(mobile.status, 'warning');
  assert.match(mobile.detectedData!, /1024/);
  assert.match(mobile.proposedChange!, /no garantiza que el contenido se adapte/);
  assert.equal(canonical.status, 'warning');
  assert.match(canonical.detectedData!, /No se verificaron disponibilidad/);
  const normal = await audit('<base href="https://example.com/sub/"><link rel="canonical" href="preferred"><meta name="viewport" content="width=device-width, initial-scale=1">');
  const normalCanonical = normal.items.find(item => item.key === 'canonical')!;
  assert.equal(normalCanonical.metricValue, 'https://example.com/sub/preferred');
  assert.equal(normalCanonical.status, 'ok');
  assert.match(normalCanonical.simpleExplanation, /No se consultó su destino/);
});

test('commented and scripted declarations are excluded; an empty viewport is detected as incomplete', async () => {
  const result = await audit('<!--<link rel="canonical" href="https://example.com">--><script>const x = \'<meta name="viewport" content="width=device-width">\';</script>');
  assert.equal(result.items.find(item => item.key === 'viewport')!.status, 'error');
  assert.equal(result.items.find(item => item.key === 'canonical')!.statusLabel, 'No detectada');
  const empty = await audit('<meta name="viewport" content="">');
  assert.equal(empty.items.find(item => item.key === 'viewport')!.status, 'warning');
});
