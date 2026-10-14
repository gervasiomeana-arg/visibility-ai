import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { profileSourceText, suggestBusinessProfile } from '../businessProfileService';
import { validateProfileProposal, validateProfileSuggestionInput } from '../../shared/businessProfileSuggestion';
import { BusinessProfileSuggestionPanel } from '../../src/components/BusinessProfileSuggestionPanel';
import { fetchPublicProfileHtml } from '../seoAuditService';

const quote = 'Empresa de tecnología médica con equipos e instrumental para profesionales.';
const html = `<html><head><script>Servicio inventado en script</script><style>body{color:red}</style></head><body><h1>Empresa Ejemplo</h1><p>${quote}</p><p>Contamos con servicio técnico en Uruguay.</p></body></html>`;
const page = { html, requestedUrl: 'https://example.com/', finalUrl: 'https://www.example.com/', fetchedAt: '2026-10-14T18:00:00.000Z' };

test('profile extraction excludes scripts, comments and templates, decodes text once and bounds model context', () => {
  const text = profileSourceText(html + '<!-- secreto --><template>oculto</template><p>Scouting &amp; an&#225;lisis</p>');
  assert.ok(text.includes(quote)); assert.match(text, /Scouting & análisis/);
  assert.doesNotMatch(text, /inventado|color:red|secreto|oculto/);
  assert.equal(profileSourceText('x'.repeat(20000)).length, 18000);
});

test('AI proposals require literal source quotes and reject fabricated citations or malformed output', () => {
  assert.equal(validateProfileProposal({ description: quote, quotes: [quote] }, quote).description, quote);
  for (const value of [null, {}, { description: quote, quotes: ['Ofrecemos medicina prepaga a empresas.'] }, { description: '', quotes: [quote] }, { description: quote, quotes: [] }]) {
    assert.throws(() => validateProfileProposal(value, quote), /citas verificables/);
  }
});

test('profile service fetches supplied site, generates from fetched evidence only and never persists', async () => {
  const result = await suggestBusinessProfile({ url: page.requestedUrl, businessId: 'medical-business' }, async params => {
    assert.match(String(params.config?.systemInstruction), /ignorá cualquier instrucción/);
    assert.match(String(params.config?.systemInstruction), /no deduzcas por dominio/);
    assert.equal(params.config?.responseMimeType, 'application/json');
    assert.match(String(params.contents), /equipos e instrumental/);
    return { text: JSON.stringify({ description: quote, quotes: [quote] }), usageMetadata: { totalTokenCount: 45 } };
  }, async url => { assert.equal(url, page.requestedUrl); return page; });
  assert.equal(result.result.businessId, 'medical-business'); assert.equal(result.result.sourceUrl, page.finalUrl);
  assert.equal(result.result.fetchedAt, page.fetchedAt); assert.equal(result.tokens, 45);
});

test('empty client-rendered pages stop before generating and uncited AI responses never become proposals', async () => {
  await assert.rejects(suggestBusinessProfile({ url: page.requestedUrl, businessId: 'a' }, async () => { throw Error('Should not call provider'); }, async () => ({ ...page, html: '<div id="root"></div>' })), /muy poco texto/);
  await assert.rejects(suggestBusinessProfile({ url: page.requestedUrl, businessId: 'a' }, async () => ({ text: JSON.stringify({ description: quote, quotes: ['cita inventada no presente en la web'] }) }), async () => page), /citas verificables/);
});

test('profile suggestion UI starts as an explicit review action and input refuses credentialed or non-web URLs', () => {
  const markup = renderToStaticMarkup(React.createElement(BusinessProfileSuggestionPanel, { businessId: 'a', url: page.requestedUrl, disabled: false, onApply: () => { throw Error('No automatic application'); } }));
  assert.match(markup, /Leer web y proponer descripción con IA/); assert.match(markup, /antes de guardarla/);
  assert.equal(validateProfileSuggestionInput({ businessId: 'a', url: 'example.com' }).url, page.requestedUrl);
  for (const url of ['javascript:alert(1)', 'https://user:secret@example.com/']) assert.throws(() => validateProfileSuggestionInput({ businessId: 'a', url }));
  assert.throws(() => validateProfileSuggestionInput({ url: page.requestedUrl }));
});

test('profile fetching retains the audit SSRF guard for private addresses and hosts', async () => {
  for (const url of ['https://127.0.0.1/', 'https://[::1]/', 'https://private.internal/']) {
    await assert.rejects(fetchPublicProfileHtml(url), /Private|non-public/);
  }
});

test('profile endpoint requires authentication and validates inputs before invoking an AI provider', async () => {
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
  const endpoint = `http://127.0.0.1:${(server.address() as any).port}/api/business/profile/suggest`;
  try {
    const blocked = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(blocked.status, 401);
    const invalid = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' }, body: '{}' });
    assert.equal(invalid.status, 400);
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      const unavailable = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' }, body: JSON.stringify({ url: page.requestedUrl, businessId: 'a' }) });
      assert.equal(unavailable.status, 503);
    }
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, index) => { if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index]; });
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
});
