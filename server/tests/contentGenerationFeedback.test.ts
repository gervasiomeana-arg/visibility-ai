import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContentGenerationFeedback } from '../../src/components/ContentGenerationFeedback';
import { requestContentDraft } from '../../src/services/contentClient';
import { ApiError } from '../../src/services/apiClient';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('generator waits with a bounded authenticated request and accepts only a usable nonempty draft', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, '/api/content/generate');
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fixture');
      assert.ok(init?.signal instanceof AbortSignal);
      assert.deepEqual(JSON.parse(String(init?.body)), { topic: 'Scouting' });
      return response({ content: '  Scouting y estadísticas para entrenadores.  ' });
    };
    assert.equal(await requestContentDraft({ topic: 'Scouting' }, { authorization: 'Bearer fixture' }), 'Scouting y estadísticas para entrenadores.');
    for (const body of [null, {}, { content: null }, { content: 4 }, { content: ' ' }, { content: '[dato por confirmar]' }, { content: '[ACLARACIÓN NECESARIA] ¿Qué servicio?' }]) {
      globalThis.fetch = async () => response(body);
      await assert.rejects(requestContentDraft({}, {}));
    }
  } finally { globalThis.fetch = original; }
});

test('provider failures, validation errors and timeouts never turn into successful content', async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [400, 401, 422, 429, 502, 503]) {
      globalThis.fetch = async () => response({ error: 'Completá los datos o reintentá.' }, status);
      await assert.rejects(requestContentDraft({}, {}), error => error instanceof ApiError && error.status === status);
    }
    for (const name of ['TimeoutError', 'AbortError']) {
      globalThis.fetch = async () => { throw new DOMException('timeout', name); };
      await assert.rejects(requestContentDraft({}, {}), /tiempo de espera.*No se recibió un nuevo borrador/);
    }
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(requestContentDraft({}, {}), /Failed to fetch/);
  } finally { globalThis.fetch = original; }
});

test('result panel distinguishes progress from failure and explains preservation of a previous draft', () => {
  const render = (generating: boolean, error: string, hasDraft: boolean) => renderToStaticMarkup(React.createElement(ContentGenerationFeedback, { generating, error, hasDraft }));
  const progress = render(true, '', false);
  assert.match(progress, /role="status"/);
  assert.match(progress, /Generando tu borrador/);
  assert.match(progress, /resultado aparecerá aquí/);
  const failed = render(false, 'Antes de redactar: ¿qué servicio ofrece?', true);
  assert.match(failed, /role="alert"/);
  assert.match(failed, /qué servicio ofrece/);
  assert.match(failed, /texto anterior se conserva/);
  assert.doesNotMatch(failed, /Todavía no generaste/);
  assert.equal(render(false, '', false), '');
  assert.doesNotMatch(render(false, '<script>test</script>', false), /<script>/);
});
