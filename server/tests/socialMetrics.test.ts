import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { latestSocialMetric, socialProfileUrl, validateSocialAccount, validateSocialMeasurement, type SocialAccount, type SocialMeasurement } from '../../shared/socialMetrics';
import { measureSocialAccount, validateSocialApiInput } from '../socialMetricsService';
import { SocialMetricBars } from '../../src/components/SocialMetricBars';
const row: SocialMeasurement = { id: 'one', network: 'instagram', profileUrl: 'https://www.instagram.com/business/', capturedAt: '2026-10-15', source: 'manual', evidence: 'Informe exportado por el cliente', metrics: { followers: 0 } };
const account: SocialAccount = { workspaceId: 'workspace-a', businessId: 'business-a', network: 'instagram', profileUrl: row.profileUrl, accountId: '', measurements: [row] };

test('profile registration rejects foreign domains, credentials, script URLs and missing profile paths', () => {
  assert.equal(socialProfileUrl('instagram', row.profileUrl), row.profileUrl);
  for (const url of ['http://instagram.com/business', 'https://instagram.com.evil.example/business', 'https://user:secret@instagram.com/business', 'javascript:alert(1)', 'https://www.instagram.com/']) assert.throws(() => socialProfileUrl('instagram', url));
  assert.throws(() => socialProfileUrl('facebook', row.profileUrl));
});
test('measurements preserve measured zero, reject missing/negative values and require the right network, source and period', () => {
  assert.equal(validateSocialMeasurement(row).metrics.followers, 0);
  for (const patch of [{ metrics: {} }, { metrics: { followers: null } }, { metrics: { followers: '0' } }, { metrics: { followers: -1 } }, { metrics: { followers: 1.5 } }, { capturedAt: '2026-02-30' }, { evidence: '' }, { source: 'google-search-console' }, { metrics: { clicks: 4 } }, { metrics: { views: 10 } }]) assert.throws(() => validateSocialMeasurement({ ...row, ...patch } as any));
  assert.equal(validateSocialMeasurement({ ...row, metrics: { views: 4 }, periodStart: '2026-09-01', periodEnd: '2026-09-28' }).metrics.views, 4);
  assert.throws(() => validateSocialMeasurement({ ...row, metrics: { views: 4 }, periodStart: '2026-02-30', periodEnd: '2026-03-02' }));
  assert.throws(() => validateSocialAccount({ ...account, measurements: [{ ...row, network: 'facebook' }] }));
});
test('bars only use the current profile, account and matching period without turning absent data into zero', () => {
  assert.equal(latestSocialMetric(account, 'followers', '', '')?.value, 0);
  assert.equal(latestSocialMetric(account, 'posts', '', ''), null);
  assert.equal(latestSocialMetric({ ...account, profileUrl: 'https://www.instagram.com/another/' }, 'followers', '', ''), null);
  assert.equal(latestSocialMetric({ ...account, accountId: 'new-account' }, 'followers', '', ''), null);
  const period = { ...row, metrics: { views: 40 }, periodStart: '2026-09-01', periodEnd: '2026-09-28' };
  assert.equal(latestSocialMetric({ ...account, measurements: [period] }, 'views', '2026-09-01', '2026-09-28')?.value, 40);
  assert.equal(latestSocialMetric({ ...account, measurements: [period] }, 'views', '2026-10-01', '2026-10-28'), null);
  const html = renderToStaticMarkup(React.createElement(SocialMetricBars, { name: 'Negocio de prueba', accounts: [account], metric: 'followers', start: '', end: '' }));
  assert.match(html, /Negocio de prueba/); assert.match(html, /Sin medición/); assert.match(html, /No aplica a esta métrica/);
  assert.match(html, /Carga manual con evidencia/); assert.match(html, /width:0%/); assert.doesNotMatch(html, /NaN|Infinity/);
});
test('official adapters use fixed endpoints, bearer headers, timeout and an exact confirmed account, never a stored token', async () => {
  const original = process.env.META_GRAPH_API_VERSION;
  process.env.META_GRAPH_API_VERSION = 'v25.0';
  try {
    for (const network of ['facebook', 'instagram', 'tiktok']) {
      const id = network === 'tiktok' ? 'open-id' : '12345';
      const profile = network === 'facebook' ? 'https://www.facebook.com/business/' : network === 'instagram' ? row.profileUrl : 'https://www.tiktok.com/@business';
      const input = validateSocialApiInput({ network, accountId: id, profileUrl: profile, accessToken: 'secret-fixture' });
      const result = await measureSocialAccount(input, async (url, init) => {
        assert.ok(init?.signal instanceof AbortSignal); assert.equal(init?.redirect, 'error');
        assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer secret-fixture');
        assert.doesNotMatch(String(url), /secret-fixture/);
        const payload = network === 'tiktok' ? { error: { code: 'ok' }, data: { user: { open_id: id, follower_count: 0, likes_count: 30, video_count: 2 } } } : { id, followers_count: 0, media_count: 2 };
        return new Response(JSON.stringify(payload));
      });
      assert.equal(result.network, network); assert.equal(result.accountId, id); assert.equal(result.metrics.followers, 0);
      assert.equal(result.source, 'official-api'); assert.doesNotMatch(JSON.stringify(result), /secret-fixture/);
      await assert.rejects(measureSocialAccount(input, async () => new Response(JSON.stringify({ id: 'foreign', followers_count: 999 }))));
      await assert.rejects(measureSocialAccount(input, async () => new Response('private provider details', { status: 403 })), error => error instanceof Error && !error.message.includes('private provider'));
    }
    delete process.env.META_GRAPH_API_VERSION;
    await assert.rejects(measureSocialAccount(validateSocialApiInput({ network: 'facebook', accountId: '123', profileUrl: 'https://facebook.com/business', accessToken: 'fixture' })), /META_GRAPH_API_VERSION/);
  } finally { if (original === undefined) delete process.env.META_GRAPH_API_VERSION; else process.env.META_GRAPH_API_VERSION = original; }
});
test('malformed provider counts cannot become a zero observation', async () => {
  const input = validateSocialApiInput({ network: 'tiktok', accountId: 'open-id', profileUrl: 'https://tiktok.com/@business', accessToken: 'fixture' });
  for (const patch of [{ follower_count: undefined }, { follower_count: null }, { follower_count: '2' }, { likes_count: -1 }]) await assert.rejects(measureSocialAccount(input, async () => new Response(JSON.stringify({ error: { code: 'ok' }, data: { user: { open_id: 'open-id', follower_count: 2, likes_count: 3, video_count: 1, ...patch } } }))));
  for (const patch of [{ network: 'google' }, { accountId: 'https://evil.example' }, { accessToken: 'bad\r\nheader' }]) assert.throws(() => validateSocialApiInput({ ...input, ...patch }));
});

test('Google bars use imported search counts and do not turn them into social followers', () => {
  const google: SocialAccount = { workspaceId: 'workspace-a', businessId: 'business-a', network: 'google', profileUrl: 'https://business.example/', accountId: 'sc-domain:business.example', measurements: [{ id: 'google', accountId: 'sc-domain:business.example', network: 'google', profileUrl: 'https://business.example/', capturedAt: '2026-10-15T12:00:00Z', source: 'google-search-console', evidence: 'Search Console importada', periodStart: '2026-09-01', periodEnd: '2026-09-28', metrics: { clicks: 7, impressions: 100 } }] };
  assert.equal(latestSocialMetric(google, 'clicks', '2026-09-01', '2026-09-28')?.value, 7);
  assert.equal(latestSocialMetric(google, 'followers', '', ''), null);
  assert.equal(latestSocialMetric(google, 'clicks', '2026-10-01', '2026-10-28'), null);
});

test('social API endpoint requires authentication, rejects invalid inputs and hides private provider errors', async () => {
  const { default: express } = await import('express');
  const { default: router } = await import('../socialMetricsRouter');
  const names = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY', 'META_GRAPH_API_VERSION'];
  const previous = names.map(name => process.env[name]);
  const original = globalThis.fetch;
  process.env.VITE_SUPABASE_URL = 'https://auth.example'; process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'fixture'; delete process.env.VITE_SUPABASE_ANON_KEY; process.env.META_GRAPH_API_VERSION = 'v25.0';
  let providerCalls = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url) === 'https://auth.example/auth/v1/user') return new Response(JSON.stringify({ id: 'fixture-user' }));
    if (String(url).startsWith('https://graph.facebook.com/')) { providerCalls++; return new Response('private provider details / secret-token', { status: 403 }); }
    return original(url, init);
  };
  const app = express(); app.use(express.json()); app.use('/social', router);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.on('listening', resolve));
  const endpoint = `http://127.0.0.1:${(server.address() as any).port}/social/measure`;
  const body = { network: 'facebook', accountId: '123', profileUrl: 'https://facebook.com/business/', accessToken: 'secret-token' };
  const request = (payload: unknown, authorized: boolean) => original(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', ...(authorized ? { authorization: 'Bearer fixture' } : {}) }, body: JSON.stringify(payload) });
  try {
    assert.equal((await request(body, false)).status, 401);
    assert.equal((await request({ ...body, network: 'google' }, true)).status, 400);
    assert.equal(providerCalls, 0);
    const result = await request(body, true);
    assert.equal(result.status, 502); assert.equal(providerCalls, 1);
    assert.doesNotMatch(await result.text(), /private provider|secret-token/);
  } finally {
    globalThis.fetch = original; server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    names.forEach((name, index) => { if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index]; });
  }
});
