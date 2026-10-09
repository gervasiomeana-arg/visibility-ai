import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import {
  isDisallowedIp,
  resolvePublicHttpsTarget,
} from '../seoAuditService';
import {
  createRateLimiter,
} from '../rateLimit';
import healthRouter from '../healthRouter';

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

test('SSRF guard rejects private, reserved and mapped addresses', () => {
  const blocked = [
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.0.0.10',
    '192.0.2.1',
    '192.168.1.1',
    '198.18.0.1',
    '198.51.100.2',
    '203.0.113.9',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fd00::1',
    'fe80::1',
    'ff02::1',
    '2001:db8::1',
  ];

  for (const address of blocked) {
    assert.equal(
      isDisallowedIp(address),
      true,
      `${address} should be blocked`
    );
  }

  const allowed = [
    '1.1.1.1',
    '8.8.8.8',
    '2606:4700:4700::1111',
  ];

  for (const address of allowed) {
    assert.equal(
      isDisallowedIp(address),
      false,
      `${address} should be allowed`
    );
  }
});

test('SSRF URL validator rejects unsafe URL forms before network access', async () => {
  await assert.rejects(
    resolvePublicHttpsTarget('http://example.com'),
    /Only HTTPS URLs are allowed/
  );

  await assert.rejects(
    resolvePublicHttpsTarget('https://user:pass@example.com'),
    /embedded credentials/
  );

  await assert.rejects(
    resolvePublicHttpsTarget('https://localhost'),
    /Private hosts are not allowed/
  );

  await assert.rejects(
    resolvePublicHttpsTarget('https://127.0.0.1'),
    /Private or non-public IP addresses are not allowed/
  );
});

test('rate limiter returns 429 and Retry-After after the configured limit', async () => {
  const app = express();
  const limiter = createRateLimiter({
    name: 'test',
    maxRequests: 2,
    windowMs: 60_000,
  });

  app.get('/limited', limiter, (_req, res) => {
    res.json({ ok: true });
  });

  await withServer(app, async (baseUrl) => {
    const first = await fetch(`${baseUrl}/limited`);
    const second = await fetch(`${baseUrl}/limited`);
    const third = await fetch(`${baseUrl}/limited`);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(third.status, 429);

    assert.equal(first.headers.get('x-ratelimit-limit'), '2');
    assert.equal(second.headers.get('x-ratelimit-remaining'), '0');

    const retryAfter = Number(third.headers.get('retry-after'));
    assert.equal(Number.isFinite(retryAfter), true);
    assert.equal(retryAfter > 0, true);

    const body = await third.json();
    assert.equal(body.error, 'Too many requests');
  });
});

test('health endpoint exposes readiness flags but never secret values', async () => {
  const previous = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    APP_URL: process.env.APP_URL,
    SEARCH_CONSOLE_TOKEN_KEY: process.env.SEARCH_CONSOLE_TOKEN_KEY,
    PAGESPEED_API_KEY: process.env.PAGESPEED_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  };

  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-super-secret';
  process.env.GOOGLE_CLIENT_ID = 'google-client';
  process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
  process.env.APP_URL = 'https://visibility.example.com';
  process.env.SEARCH_CONSOLE_TOKEN_KEY =
    Buffer.alloc(32, 7).toString('base64');
  process.env.PAGESPEED_API_KEY = 'pagespeed-secret';
  process.env.GEMINI_API_KEY = 'gemini-secret';

  const app = express();
  app.use('/api/health', healthRouter);

  try {
    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/health`);
      const raw = await response.text();
      const body = JSON.parse(raw);

      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.integrations.supabase, true);
      assert.equal(body.integrations.searchConsoleOAuth, true);
      assert.equal(body.integrations.searchConsoleDurableTokens, true);
      assert.equal(body.integrations.pageSpeedKey, true);
      assert.equal(body.integrations.gemini, true);

      for (const secret of [
        'anon-super-secret',
        'google-secret',
        'pagespeed-secret',
        'gemini-secret',
      ]) {
        assert.equal(raw.includes(secret), false);
      }
    });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
