import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAuditUrl } from '../../shared/auditUrl';
import { buildRealSeoAudit, resolvePublicHttpsTarget } from '../seoAuditService';

test('the reported hotel domain becomes a valid HTTPS request', () => {
  assert.equal(normalizeAuditUrl('www.nuevohorizontehotel.com.ar'), 'https://www.nuevohorizontehotel.com.ar/');
  assert.equal(normalizeAuditUrl('  example.com/path?test=1  '), 'https://example.com/path?test=1');
  assert.equal(normalizeAuditUrl('HTTPS://EXAMPLE.COM'), 'https://example.com/');
  assert.equal(normalizeAuditUrl('example.com:8443/page'), 'https://example.com:8443/page');
});

test('invalid protocols, credentials and malformed input fail with readable errors', () => {
  for (const value of ['', 'http://example.com', 'ftp://example.com', 'javascript:alert(1)', 'https:example.com', 'https://user:pass@example.com', 'example .com', 'https://example.com\\private', 'example', 'a'.repeat(2049)]) {
    assert.throws(() => normalizeAuditUrl(value), /Ingresá|HTTPS|dirección|dominio/);
  }
});

test('normalization does not bypass server private-host or private-IP protection', async () => {
  for (const value of ['127.0.0.1', '192.168.1.2', '169.254.169.254', 'https://[::1]', 'private.internal']) {
    await assert.rejects(resolvePublicHttpsTarget(normalizeAuditUrl(value)), /Private/);
  }
});

test('the audit engine normalizes bare domains before any fetch, independently of the UI', async () => {
  const fetched: string[] = [];
  const audit = await buildRealSeoAudit('www.nuevohorizontehotel.com.ar', {
    fetchPage: async (url: string) => {
      fetched.push(url);
      return { response: new Response('<html><head><title>Prueba</title></head><body><h1>Prueba</h1></body></html>', { headers: { 'content-type': 'text/html' } }), finalUrl: url };
    },
    fetchPageSpeed: async () => { throw new Error('PageSpeed is outside this fixture'); },
  });
  assert.equal(fetched[0], 'https://www.nuevohorizontehotel.com.ar/');
  assert.equal(audit.requestedUrl, fetched[0]);
  assert.ok(audit.items.length > 0);
});
