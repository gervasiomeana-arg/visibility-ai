import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRealSeoAudit, indexingDirectives } from '../seoAuditService';

test('indexing detects all robots/googlebot metas, none and applicable HTTP directives', () => {
  assert.equal(indexingDirectives('<meta name="robots" content="index"><meta name="robots" content="NOINDEX">', null).noIndex, true);
  assert.equal(indexingDirectives('<meta name="googlebot" content="none">', null).noIndex, true);
  assert.equal(indexingDirectives('', 'noindex, nofollow').noIndex, true);
  assert.equal(indexingDirectives('', 'Googlebot: noindex').noIndex, true);
  assert.equal(indexingDirectives('', 'otherbot: noindex, nofollow').noIndex, false);
  assert.equal(indexingDirectives('', 'max-image-preview: none, noimageindex').noIndex, false);
  assert.equal(indexingDirectives('<!--<meta name="robots" content="noindex">-->', null).noIndex, false);
});

test('PageSpeed overlaps secondary checks and its latency is excluded from HTML response time', async () => {
  const original = Date.now;
  let clock = 100;
  Date.now = () => clock;
  let pageSpeedStarted = false;
  let finish: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  try {
    const result = await buildRealSeoAudit('https://example.com', {
      fetchPage: async url => {
        if (url.endsWith('/robots.txt') || url.endsWith('/sitemap.xml')) {
          assert.equal(pageSpeedStarted, true);
          clock += 500;
          if (url.endsWith('/sitemap.xml')) finish!();
          return { finalUrl: url, response: new Response('', { status: 404 }) };
        }
        clock += 25;
        return { finalUrl: url, response: new Response('<html><h1>Example</h1></html>', { headers: { 'content-type': 'text/html', 'x-robots-tag': 'noindex' } }) };
      },
      fetchPageSpeed: async () => { pageSpeedStarted = true; await gate; throw new Error('PageSpeed unavailable'); },
    });
    assert.equal(result.responseTimeMs, 25);
    assert.match(result.pageSpeedError!, /unavailable/);
    const indexing = result.items.find(item => item.key === 'robots-meta')!;
    assert.equal(indexing.status, 'error');
    assert.match(indexing.detectedData!, /X-Robots-Tag: noindex/);
    assert.match(result.items.find(item => item.key === 'http-status')!.detectedData!, /no equivale a TTFB/);
  } finally { Date.now = original; }
});

test('absence of restrictive directives does not claim actual Google indexing', async () => {
  const result = await buildRealSeoAudit('https://example.com', {
    fetchPage: async url => ({ finalUrl: url, response: new Response('<html><h1>Example</h1></html>', { headers: { 'content-type': 'text/html' } }) }),
    fetchPageSpeed: async () => { throw new Error('Unavailable'); },
  });
  const item = result.items.find(item => item.key === 'robots-meta')!;
  assert.equal(item.statusLabel, 'Sin noindex detectado');
  assert.match(item.simpleExplanation, /no confirma que Google haya indexado/);
});
