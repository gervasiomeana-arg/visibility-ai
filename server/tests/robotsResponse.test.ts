import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRealSeoAudit } from '../seoAuditService';

async function checkRobots(body: string, contentType: string) {
  const result = await buildRealSeoAudit('https://example.com', {
    fetchPage: async url => ({ finalUrl: url, response: new Response(
      url.endsWith('/robots.txt') ? body : '<html><h1>Example</h1></html>',
      { headers: { 'content-type': url.endsWith('/robots.txt') ? contentType : 'text/html' } },
    ) }),
    fetchPageSpeed: async () => { throw new Error('No measurement'); },
  });
  return result.items.find(item => item.key === 'robots-txt')!;
}

test('HTTP 200 with HTML is not a confirmed robots.txt even with a text content type', async () => {
  for (const mime of ['text/html', 'text/plain']) {
    const item = await checkRobots('<!doctype html><html><body>Homepage</body></html>', mime);
    assert.equal(item.status, 'warning');
    assert.match(item.detectedData!, /HTTP 200.*HTML/);
    assert.match(item.howToVerify!, /no la página de inicio/);
  }
});

test('accessible text robots response is separate from validated crawl permissions', async () => {
  for (const body of ['', 'User-agent: *\nDisallow: /private/\n']) {
    const item = await checkRobots(body, 'text/plain');
    assert.equal(item.status, 'ok');
    assert.match(item.detectedData!, /No se validaron todas las directivas/);
  }
});
