import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPageSpeedMetrics } from '../seoAuditService';

test('PageSpeed can finish after the former 20-second deadline', async t => {
  const original = globalThis.fetch;
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let resolve!: (response: Response) => void;
  let signal: AbortSignal;
  globalThis.fetch = async (_url, init) => {
    signal = init!.signal!;
    return new Promise<Response>((done, reject) => {
      resolve = done;
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
  };
  try {
    const pending = fetchPageSpeedMetrics('https://example.com');
    t.mock.timers.tick(25000);
    assert.equal(signal!.aborted, false);
    resolve(new Response(JSON.stringify({ lighthouseResult: { categories: { performance: { score: 0.62 } }, audits: {} } })));
    assert.equal((await pending).performanceScore, 62);
    t.mock.timers.tick(60000);
    assert.equal(signal!.aborted, false, 'deadline is cleared on completion');
  } finally { globalThis.fetch = original; t.mock.timers.reset(); }
});

test('PageSpeed remains bounded to 60 seconds and propagates provider errors', async t => {
  const original = globalThis.fetch;
  t.mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.fetch = async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init!.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  });
  try {
    const pending = fetchPageSpeedMetrics('https://example.com');
    const rejection = assert.rejects(pending, { name: 'AbortError' });
    t.mock.timers.tick(60000);
    await rejection;
    globalThis.fetch = async () => new Response(JSON.stringify({ lighthouseResult: { runtimeError: { message: 'Navigation failed' } } }));
    await assert.rejects(fetchPageSpeedMetrics('https://example.com'), /Navigation failed/);
    globalThis.fetch = async () => new Response('{}');
    await assert.rejects(fetchPageSpeedMetrics('https://example.com'), /no devolvió una medición/);
  } finally { globalThis.fetch = original; t.mock.timers.reset(); }
});
