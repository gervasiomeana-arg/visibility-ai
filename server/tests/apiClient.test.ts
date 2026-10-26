import assert from 'node:assert/strict';
import test from 'node:test';
import {ApiError, apiFetchJson} from '../../src/services/apiClient';

test('provider quota remains actionable while local rate limits retain retry timing', async t => {
  const providerMessage = 'Google rechazó la consulta por cuota. Revisá la cuota del proyecto.';
  let response = Response.json({error: providerMessage, code: 'quota'}, {status: 429});
  t.mock.method(globalThis, 'fetch', async () => response);

  await assert.rejects(apiFetchJson('/api/google-business/accounts'), error => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.message, providerMessage);
    assert.equal(error.status, 429);
    assert.deepEqual(error.details, {error: providerMessage, code: 'quota'});
    assert.equal(error.retryAfterSeconds, undefined);
    return true;
  });

  response = Response.json({error: 'Too many requests', retryAfterSeconds: 42}, {
    status: 429, headers: {'retry-after': '42'},
  });
  await assert.rejects(apiFetchJson('/api/google-business/accounts'), error => {
    assert.ok(error instanceof ApiError);
    assert.match(error.message, /42 segundos/);
    assert.equal(error.retryAfterSeconds, 42);
    return true;
  });

  // Unknown/plain-text 429 bodies must not be presented as provider diagnostics.
  response = new Response('upstream opaque rejection', {status: 429});
  await assert.rejects(apiFetchJson('/api/google-business/accounts'), /límite temporal/);
  response = Response.json({error: {unexpected: true}, code: 'quota'}, {status: 429});
  await assert.rejects(apiFetchJson('/api/google-business/accounts'), /límite temporal/);
});
