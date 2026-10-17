import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicPageError, publicReadFailure } from '../publicReadFailure';
import { collectPublicProfile, publicResearchInput } from '../publicSocialResearch';

test('public diagnostics distinguish HTTP restrictions, connection problems and unreadable responses without provider secrets', () => {
  for (const [status, expected] of [[401, 'login-required'], [403, 'access-denied'], [404, 'not-found'], [429, 'rate-limited'], [503, 'http-error']] as const) {
    const result = publicReadFailure(new PublicPageError('http', status));
    assert.equal(result.code, expected); assert.equal(result.httpStatus, status); assert.match(result.message, new RegExp(String(status)));
  }
  assert.equal(publicReadFailure(new PublicPageError('content-type')).code, 'unsupported-content');
  assert.equal(publicReadFailure({ cause: { code: 'EAI_AGAIN', message: 'secret-cookie' } }).code, 'dns');
  assert.equal(publicReadFailure({ cause: { code: 'ENOTFOUND' } }).code, 'dns');
  assert.equal(publicReadFailure({ name: 'AbortError' }).code, 'timeout');
  assert.equal(publicReadFailure({ code: 'ETIMEDOUT' }).code, 'timeout');
  assert.equal(publicReadFailure({ code: 'CERT_HAS_EXPIRED' }).code, 'tls');
  assert.equal(publicReadFailure(new Error('Response is too large to audit')).code, 'response-too-large');
  assert.equal(publicReadFailure(new Error('private upstream response secret-cookie 429')).code, 'network');
  for (const error of [new Error('secret-token 429 https://user:password@site.test'), { message: 'secret-cookie', cause: { code: 'EAI_AGAIN' } }, 'secret-cookie']) assert.doesNotMatch(JSON.stringify(publicReadFailure(error)), /secret|password|site\.test/);
  assert.equal(publicReadFailure(new PublicPageError('http', NaN)).httpStatus, undefined);
});

test('collector returns a precise safe reason without statistics or automatic retries', async () => {
  const input = publicResearchInput({ network: 'instagram', profileUrl: 'https://www.instagram.com/nuevohorizontehotel/', start: '2026-10-01', end: '2026-10-15' });
  for (const error of [new PublicPageError('http', 429), new PublicPageError('http', 403), { code: 'EAI_AGAIN' }, { name: 'AbortError' }]) {
    let requests = 0;
    const result = await collectPublicProfile(input, async () => { requests++; throw error; });
    assert.equal(requests, 1); assert.equal(result.status, 'unavailable'); assert.equal('snapshot' in result, false);
    assert.equal('diagnostic' in result && result.diagnostic?.code, publicReadFailure(error).code);
  }
  const login = await collectPublicProfile(input, async () => ({ requestedUrl: input.profileUrl, finalUrl: 'https://www.instagram.com/accounts/login/?next=%2Fnuevohorizontehotel', html: '<h1>Log in</h1>', fetchedAt: new Date().toISOString() }));
  assert.equal('diagnostic' in login && login.diagnostic?.code, 'login-required');
  const noCounts = await collectPublicProfile(input, async () => ({ requestedUrl: input.profileUrl, finalUrl: input.profileUrl, html: '<h1>Hotel</h1>', fetchedAt: new Date().toISOString() }));
  assert.equal('diagnostic' in noCounts && noCounts.diagnostic?.code, 'no-public-counters');
});
