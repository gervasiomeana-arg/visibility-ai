import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCacheSignature, cloudAuditToApply } from '../../shared/auditCloudState';
const currentItems = [{ key: 'h1', metricValue: '1', source: 'real' }];
const currentMeta = { fetchedAt: '2026-10-01T10:00:00Z' };
const snapshot = { requested_url: 'https://hotel.example/', created_at: '2026-10-04T10:00:00Z', payload: { items: [{ key: 'h1', metricValue: '0', source: 'real' }], meta: { requestedUrl: 'https://hotel.example/', finalUrl: 'https://published.example/', fetchedAt: '2026-10-02T10:00:00Z' }, issues: [{ title: 'H1' }], scores: { seo: 75 } } };
const input = () => ({ businessUrl: 'https://hotel.example', currentItems: structuredClone(currentItems), currentMeta: { ...currentMeta }, initialSignature: auditCacheSignature(currentItems, currentMeta), snapshot: structuredClone(snapshot) });
test('newer cloud audit restores its measurements and metadata together, allowing verified redirects', () => {
  const result = cloudAuditToApply(input())!;
  assert.deepEqual(result.items, snapshot.payload.items);
  assert.deepEqual(result.scores, snapshot.payload.scores);
  assert.equal(result.meta.finalUrl, 'https://published.example/');
  assert.equal(result.meta.fetchedAt, '2026-10-02T10:00:00Z');
});
test('cloud insertion date does not make an older measured audit appear newer', () => {
  const request = input();
  request.snapshot.payload.meta = { ...request.snapshot.payload.meta, fetchedAt: '2026-09-01T10:00:00Z' };
  assert.equal(cloudAuditToApply(request), null);
  request.snapshot.payload.meta = { ...request.snapshot.payload.meta, fetchedAt: currentMeta.fetchedAt };
  assert.equal(cloudAuditToApply(request), null);
});
test('an audit completed while hydration was pending cannot be overwritten, even if metadata write failed', () => {
  const request = input();
  request.currentItems = [{ key: 'h1', metricValue: '2', source: 'real' }];
  assert.equal(cloudAuditToApply(request), null);
});
test('cloud audit cannot transfer another site or page into the selected business', () => {
  for (const url of ['https://other.example/', 'https://hotel.example/other', 'https://hotel.example/?campaign=another', 'javascript:alert(1)']) {
    const request = input();request.businessUrl = url;
    assert.equal(cloudAuditToApply(request), null);
  }
  const request = input();request.snapshot.requested_url = 'https://other.example/';
  assert.equal(cloudAuditToApply(request), null);
});
test('legacy snapshots restore an empty cache using their recorded date; undated data is rejected', () => {
  const request = { ...input(), currentItems: [], currentMeta: null, initialSignature: auditCacheSignature([], null), snapshot: { requested_url: 'https://hotel.example/', created_at: '2026-10-02T10:00:00Z', payload: { items: [] } } };
  assert.equal(cloudAuditToApply(request)?.meta.fetchedAt, request.snapshot.created_at);
  assert.deepEqual(cloudAuditToApply(request)?.items, []);
  request.snapshot.created_at = '';
  assert.equal(cloudAuditToApply(request), null);
});
