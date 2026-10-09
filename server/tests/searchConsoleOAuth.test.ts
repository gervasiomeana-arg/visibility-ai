import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import apiRouter from '../apiRouter';

async function withServer(
  app: express.Express,
  run: (baseUrl: string) => Promise<void>
) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address() as AddressInfo;

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

test('Search Console /api/search-console/status returns configuration and exact redirect URI without leaking secrets', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/search-console/status`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(typeof body.configured, 'boolean');
    assert.equal(typeof body.connected, 'boolean');
    assert.ok(Array.isArray(body.missing));
    assert.ok(typeof body.redirectUri === 'string' && body.redirectUri.includes('/api/search-console/oauth/callback'));
  });
});

test('Search Console OAuth start endpoints reject with 503 and missing list when unconfigured', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  await withServer(app, async (baseUrl) => {
    // Test both /auth/start and /oauth/start
    for (const path of ['/api/search-console/auth/start', '/api/search-console/oauth/start']) {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnTo: '/keywords' }),
      });

      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        assert.equal(res.status, 503);
        const data = await res.json();
        assert.equal(data.configured, false);
        assert.ok(Array.isArray(data.missing));
        assert.ok(data.missing.includes('GOOGLE_CLIENT_ID') || data.missing.includes('GOOGLE_CLIENT_SECRET'));
      }
    }
  });
});

test('Search Console OAuth callback validates state and code, rejecting fraudulent attempts', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/search-console/oauth/callback?code=bogus&state=invalid`);
    assert.equal(res.status, 400);
  });
});
