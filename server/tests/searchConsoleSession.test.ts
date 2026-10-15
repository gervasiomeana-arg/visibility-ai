import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import router from '../searchConsoleRouter';

const key = Buffer.alloc(32, 7);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
function encrypted(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(part => part.toString('base64url')).join('.');
}

async function fixture(durable: boolean, run: (request: (path: string, token?: string, init?: RequestInit) => Promise<Response>, mock: { database: (url: URL, init: RequestInit) => Response; google: (url: URL, init: RequestInit) => Response; googleCalls: number }) => Promise<void>) {
  const env = { VITE_SUPABASE_URL: 'https://auth.example', VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture-key', VITE_SUPABASE_ANON_KEY: undefined, GOOGLE_CLIENT_ID: 'fixture-client', GOOGLE_CLIENT_SECRET: 'fixture-secret', APP_URL: 'https://visibility.example', SEARCH_CONSOLE_TOKEN_KEY: durable ? key.toString('base64') : undefined };
  const previous = Object.fromEntries(Object.keys(env).map(name => [name, process.env[name]]));
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
  const originalFetch = globalThis.fetch;
  const mock = {
    database: (_url: URL, _init: RequestInit) => json([]),
    google: (_url: URL, _init: RequestInit) => json({}),
    googleCalls: 0,
  };
  const app = express();
  app.use(express.json());
  app.use('/api/search-console', router);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/search-console`;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.hostname === '127.0.0.1') return originalFetch(input, init);
    assert.ok(init.signal instanceof AbortSignal, `Timeout required for ${url.hostname}${url.pathname}`);
    if (url.hostname === 'auth.example') {
      if (url.pathname === '/auth/v1/user') {
        const token = new Headers(init.headers).get('authorization');
        if (token === 'Bearer account-a') return json({ id: 'owner-a' });
        if (token === 'Bearer account-b') return json({ id: 'owner-b' });
        return json({ error: 'invalid' }, 401);
      }
      return mock.database(url, init);
    }
    assert.ok(['oauth2.googleapis.com', 'www.googleapis.com'].includes(url.hostname));
    mock.googleCalls++;
    return mock.google(url, init);
  };
  try {
    await run((path, token, init = {}) => originalFetch(`${base}${path}`, { ...init, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers } }), mock);
  } finally {
    globalThis.fetch = originalFetch;
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
}

test('temporary Google connection stays with its owner after refresh, account switch and foreign disconnect', async () => {
  await fixture(false, async (request, mock) => {
    for (const path of ['/auth/start', '/oauth/start']) {
      assert.equal((await request(path, undefined, { method: 'POST' })).status, 401);
      assert.equal((await request(path, undefined, { redirect: 'manual' })).status, 401);
    }
    assert.equal((await request('/auth/start', 'invalid', { method: 'POST' })).status, 401);
    let refreshes = 0;
    let refreshUnavailable = true;
    mock.google = (url, init) => {
      if (url.hostname === 'oauth2.googleapis.com') {
        const params = new URLSearchParams(String(init.body));
        if (params.get('grant_type') === 'refresh_token') {
          if (refreshUnavailable) return json({ error: 'temporarily_unavailable' }, 503);
          refreshes++;
          return json({ access_token: 'google-refreshed-a', expires_in: 3600 });
        }
        return json({ access_token: 'google-a', refresh_token: 'refresh-a', expires_in: 1 });
      }
      assert.equal(new Headers(init.headers).get('authorization'), 'Bearer google-refreshed-a');
      return json({ siteEntry: [{ siteUrl: 'https://a.example/', permissionLevel: 'siteOwner' }] });
    };
    const start = await request('/auth/start', 'account-a', { method: 'POST' });
    assert.equal(start.status, 200);
    const state = new URL((await start.json()).authUrl).searchParams.get('state');
    const callback = await request(`/oauth/callback?code=fixture&state=${encodeURIComponent(state!)}`, undefined, { redirect: 'manual' });
    assert.equal(callback.status, 302);
    const cookie = callback.headers.get('set-cookie')!.split(';')[0];
    const options = { headers: { cookie } };
    assert.equal((await request('/status', undefined, options).then(r => r.json())).connected, false);
    assert.equal((await request('/status', 'account-a', options)).status, 503);
    refreshUnavailable = false;
    assert.equal((await request('/sites', 'account-a', options)).status, 200);
    assert.equal(refreshes, 1);
    assert.equal((await request('/sites', 'account-a', options)).status, 200);
    const calls = mock.googleCalls;
    assert.equal((await request('/status', 'account-b', options).then(r => r.json())).connected, false);
    assert.equal((await request('/sites', 'account-b', options)).status, 401);
    assert.equal((await request('/disconnect', 'account-b', { ...options, method: 'POST' })).status, 200);
    assert.equal(mock.googleCalls, calls, 'Other owner must not reach Google using this cookie');
    assert.equal((await request('/sites', 'account-a', options)).status, 200);
    assert.equal((await request('/disconnect', 'account-a', { ...options, method: 'POST' })).status, 200);
    assert.equal((await request('/sites', 'account-a', options)).status, 401);
  });
});

test('stored Google connections are selected with the authenticated owner and bearer token', async () => {
  await fixture(true, async (request, mock) => {
    mock.database = (url, init) => {
      const authorization = new Headers(init.headers).get('authorization');
      const owner = authorization === 'Bearer account-a' ? 'a' : 'b';
      assert.equal(url.searchParams.get('user_id'), `eq.owner-${owner}`);
      return json([{ access_token_ciphertext: encrypted(`google-${owner}`), refresh_token_ciphertext: null, expires_at: new Date(Date.now() + 3600000).toISOString() }]);
    };
    mock.google = (_url, init) => {
      const owner = new Headers(init.headers).get('authorization') === 'Bearer google-a' ? 'a' : 'b';
      return json({ siteEntry: [{ siteUrl: `https://${owner}.example/`, permissionLevel: 'siteOwner' }] });
    };
    for (const owner of ['a', 'b']) {
      const result = await request('/sites', `account-${owner}`);
      assert.equal(result.status, 200);
      assert.equal((await result.json()).sites[0].siteUrl, `https://${owner}.example/`);
    }
  });
});

test('database outage is a retriable failure, never a false disconnected result or destructive write', async () => {
  await fixture(true, async (request, mock) => {
    mock.database = (_url, init) => {
      assert.equal(init.method, undefined, 'No write or deletion during failed reads');
      return json({ error: 'provider-internal-details' }, 503);
    };
    for (const path of ['/status', '/sites', '/query']) {
      const result = await request(path, 'account-a', path === '/query' ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ siteUrl: 'https://a.example/', startDate: '2026-10-01', endDate: '2026-10-10' }) } : {});
      assert.equal(result.status, 503);
      const body = await result.json();
      assert.equal(Object.hasOwn(body, 'connected'), false);
      assert.equal(JSON.stringify(body).includes('provider-internal-details'), false);
    }
    assert.equal(mock.googleCalls, 0);
    for (const payload of [null, {}, { error: 'failed' }, [null], [{ expires_at: 'invalid' }]]) {
      mock.database = () => json(payload);
      assert.equal((await request('/status', 'account-a')).status, 503, 'Invalid saved responses cannot look like an absent connection');
    }
    mock.database = () => json([]);
    const recovered = await request('/status', 'account-a');
    assert.equal(recovered.status, 200);
    assert.equal((await recovered.json()).connected, false, 'A successful empty read really is disconnected');
  });
});

test('a valid empty Google properties response stays empty while malformed responses remain errors', async () => {
  await fixture(true, async (request, mock) => {
    mock.database = () => json([{ access_token_ciphertext: encrypted('google-a'), refresh_token_ciphertext: null, expires_at: new Date(Date.now() + 3600000).toISOString() }]);
    for (const payload of [null, [], { error: 'failed' }, { siteEntry: null }, { siteEntry: [{}] }]) {
      mock.google = () => json(payload);
      assert.equal((await request('/sites', 'account-a')).status, 502);
    }
    for (const payload of [{}, { siteEntry: [] }]) {
      mock.google = () => json(payload);
      const result = await request('/sites', 'account-a');
      assert.equal(result.status, 200);
      assert.deepEqual(await result.json(), { sites: [] });
    }
  });
});

test('refresh failure preserves the saved connection and distinguishes revoked consent from temporary failure', async () => {
  await fixture(true, async (request, mock) => {
    let writes = 0;
    mock.database = (_url, init) => {
      if (init.method) { writes++; return new Response(null, { status: 204 }); }
      return json([{ access_token_ciphertext: encrypted('expired'), refresh_token_ciphertext: encrypted('refresh-a'), expires_at: new Date(0).toISOString() }]);
    };
    mock.google = () => json({ error: 'temporarily_unavailable' }, 503);
    const unavailable = await request('/status', 'account-a');
    assert.equal(unavailable.status, 503);
    assert.equal(Object.hasOwn(await unavailable.json(), 'connected'), false);
    mock.google = () => json({ access_token: 'new' });
    assert.equal((await request('/status', 'account-a')).status, 503);
    mock.google = () => json({ error: 'invalid_grant' }, 400);
    const expired = await request('/status', 'account-a');
    assert.equal(expired.status, 200);
    assert.equal((await expired.json()).connected, false);
    assert.equal(writes, 0);
    mock.google = () => json({ access_token: 'new', expires_in: 3600 });
    const restored = await request('/status', 'account-a');
    assert.equal(restored.status, 200);
    assert.equal((await restored.json()).connected, true);
    assert.equal(writes, 1, 'Refresh is persisted only after a valid successful response');
  });
});
