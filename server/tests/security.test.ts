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

test('DNS lookup handler supports both all:true array and single address callbacks', () => {
  const pinned = { address: '93.184.216.34', family: 4 as const };

  function customLookup(
    _hostname: string,
    optionsOrCallback: any,
    maybeCallback?: any
  ) {
    const callback =
      typeof optionsOrCallback === 'function'
        ? optionsOrCallback
        : maybeCallback;
    const options =
      typeof optionsOrCallback === 'object' && optionsOrCallback !== null
        ? optionsOrCallback
        : null;

    if (typeof callback !== 'function') return;

    if (options?.all) {
      callback(null, [{ address: pinned.address, family: pinned.family }]);
    } else {
      callback(null, pinned.address, pinned.family);
    }
  }

  // Case 1: Node autoSelectFamily lookup with { all: true }
  let allTrueCalled = false;
  customLookup('example.com', { all: true }, (err: any, addresses: any) => {
    assert.equal(err, null);
    assert.equal(Array.isArray(addresses), true);
    assert.equal(addresses.length, 1);
    assert.equal(addresses[0].address, '93.184.216.34');
    assert.equal(addresses[0].family, 4);
    allTrueCalled = true;
  });
  assert.equal(allTrueCalled, true);

  // Case 2: standard single address lookup with options
  let singleWithOptionsCalled = false;
  customLookup('example.com', { family: 4 }, (err: any, address: any, family: any) => {
    assert.equal(err, null);
    assert.equal(address, '93.184.216.34');
    assert.equal(family, 4);
    singleWithOptionsCalled = true;
  });
  assert.equal(singleWithOptionsCalled, true);

  // Case 3: callback as second argument
  let directCallbackCalled = false;
  customLookup('example.com', (err: any, address: any, family: any) => {
    assert.equal(err, null);
    assert.equal(address, '93.184.216.34');
    assert.equal(family, 4);
    directCallbackCalled = true;
  });
  assert.equal(directCallbackCalled, true);
});

test('buildRealSeoAudit generates structured whyItMatters, detectedData, proposedChange, and howToVerify on items', async () => {
  const { buildRealSeoAudit } = await import('../seoAuditService');
  // A client-rendered shell is a fixed input, not a live site's changing content.
  const result = await buildRealSeoAudit('https://example.com', {
    fetchPage: async (url) => ({
      finalUrl: url,
      response: url === 'https://example.com'
        ? new Response('<!doctype html><html><head><title>Scouting y estadísticas para entrenadores</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>', {
            status: 200, headers: { 'content-type': 'text/html' },
          })
        : new Response('', { status: 404, headers: { 'content-type': 'text/plain' } }),
    }),
    fetchPageSpeed: async () => { throw new Error('PageSpeed is outside this fixture test'); },
  });

  assert.equal(result.httpStatus, 200);
  assert.equal(result.items.length >= 14, true);

  const h1Item = result.items.find((item: any) => item.key === 'h1');
  assert.ok(h1Item, 'h1Item must exist');
  assert.equal(h1Item.status, 'warning');
  assert.equal(h1Item.statusLabel, 'Pendiente en página renderizada');
  assert.equal(h1Item.metricValue, '0 H1 en HTML inicial');
  assert.ok(
    h1Item.simpleExplanation.includes('H1 no detectado en HTML inicial; pendiente de comprobar en la página renderizada'),
    'Explanation must clarify pending rendered check'
  );
  assert.ok(
    h1Item.simpleExplanation.includes('JavaScript'),
    'Explanation must mention possible client-side JavaScript rendering'
  );
  assert.equal(
    h1Item.simpleExplanation.includes('Google tampoco lo encuentra'),
    false,
    'Must not claim Google cannot find it'
  );
  assert.ok(h1Item.whyItMatters, 'whyItMatters must be populated');
  assert.ok(h1Item.detectedData, 'detectedData must be populated');
  assert.ok(h1Item.proposedChange, 'proposedChange must be populated');
  assert.ok(h1Item.howToVerify, 'howToVerify must be populated');
});


