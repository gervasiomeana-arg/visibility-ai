import test from 'node:test';
import assert from 'node:assert/strict';
import { requestAssistantReply, assistantFailureMessage } from '../../src/services/assistantClient';
import { ApiError } from '../../src/services/apiClient';

test('assistant passes only a nonempty successful reply and never replaces HTTP failures with local templates', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (url, init) => {
      assert.equal(url, '/api/assistant/chat');
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer example');
      assert.ok(init?.signal instanceof AbortSignal);
      return new Response(JSON.stringify({ reply: '  Respuesta del proveedor  ' }), { headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    assert.equal(await requestAssistantReply({ prompt: 'H1' }, { Authorization: 'Bearer example' }), 'Respuesta del proveedor');
    for (const status of [401, 403, 429, 500, 503]) {
      globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'Provider unavailable' }), { status, headers: { 'Content-Type': 'application/json', 'Retry-After': '30' } })) as typeof fetch;
      await assert.rejects(requestAssistantReply({ prompt: 'Qué mejorar primero' }, {}), (error: unknown) => error instanceof ApiError && error.status === status);
    }
    globalThis.fetch = (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch;
    await assert.rejects(requestAssistantReply({ prompt: 'H1' }, {}), /Failed to fetch/);
  } finally { globalThis.fetch = originalFetch; }
});

test('empty, malformed and legacy fallback responses cannot become assistant answers', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const payload of [{ reply: null, note: 'use local fallback' }, {}, { reply: ' ' }, { reply: 123 }]) {
      globalThis.fetch = (async () => new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
      await assert.rejects(requestAssistantReply({}, {}), /no devolvió una respuesta/);
    }
    globalThis.fetch = (async () => new Response('<html>Login</html>', { headers: { 'Content-Type': 'text/html' } })) as typeof fetch;
    await assert.rejects(requestAssistantReply({}, {}), /no devolvió una respuesta/);
  } finally { globalThis.fetch = originalFetch; }
});

test('assistant feedback distinguishes session, rate limit and service failures without disclosing provider details', () => {
  assert.match(assistantFailureMessage(new ApiError('private provider details', { status: 401 })), /sesión/);
  assert.match(assistantFailureMessage(new ApiError('Esperá 30 segundos.', { status: 429 })), /30 segundos/);
  assert.doesNotMatch(assistantFailureMessage(new ApiError('private provider details', { status: 502 })), /private/);
  assert.match(assistantFailureMessage(new TypeError('private URL')), /conexión/);
});

test('assistant endpoint requires a session and reports missing configuration as unavailable', async () => {
  const { default: express } = await import('express');
  const { default: router } = await import('../aiRouter');
  const names = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY'];
  const previous = names.map(name => process.env[name]);
  const originalFetch = globalThis.fetch;
  process.env.VITE_SUPABASE_URL = 'https://auth.example'; process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'test-key'; delete process.env.VITE_SUPABASE_ANON_KEY;
  globalThis.fetch = ((...args: Parameters<typeof fetch>) => args[0] === 'https://auth.example/auth/v1/user'
    ? Promise.resolve(new Response(JSON.stringify({ id: 'test-user' }))) : originalFetch(...args)) as typeof fetch;
  const app = express(); app.use(express.json()); app.use('/api', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve));
  const endpoint = `http://127.0.0.1:${(server.address() as any).port}/api/assistant/chat`;
  try {
    const blocked = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'H1' }) });
    assert.equal(blocked.status, 401);
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      const unavailable = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' }, body: JSON.stringify({ prompt: 'H1' }) });
      assert.equal(unavailable.status, 503);
      const body = await unavailable.json() as any;
      assert.equal(body.reply, undefined); assert.match(body.error, /no está configurado/);
    }
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, index) => { if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index]; });
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
});
