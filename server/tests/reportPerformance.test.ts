import test from 'node:test';
import assert from 'node:assert/strict';
import { reportPerformance } from '../../shared/reportPerformance';

const meta = {
  requestedUrl: 'https://example.com/', finalUrl: 'https://published.example/', fetchedAt: '2026-10-14T22:00:00Z',
  pageSpeed: { fetchedAt: '2026-10-14T21:00:00Z', performanceScore: 59,
    firstContentfulPaint: { numericValue: 8532, displayValue: 'wrong cached label' },
    largestContentfulPaint: { numericValue: 10300 } },
};

test('report performance uses the numeric times, actual measurement date and verified redirect target from one record', () => {
  const result = reportPerformance(meta, 'https://example.com/');
  assert.equal(result.score,59); assert.equal(result.fcp,'8,532 s'); assert.equal(result.lcp,'10,3 s');
  assert.equal(result.measuredAt,meta.pageSpeed.fetchedAt); assert.equal(result.sourceUrl,meta.finalUrl);
  assert.equal(result.warning,'');
});

test('report performance hides foreign pages, missing source URLs, failed queries and undated values', () => {
  for (const patch of [
    { requestedUrl: 'https://other.example/' }, { requestedUrl: 'https://example.com/another-page' },
    { finalUrl: 'javascript:alert(1)' }, { finalUrl: 'https://user:secret@example.com/' },
    { pageSpeedError: 'timeout' }, { pageSpeed: { ...meta.pageSpeed, fetchedAt: 'invalid' } },
    { pageSpeed: { ...meta.pageSpeed, fetchedAt: undefined } },
  ]) {
    const result = reportPerformance({ ...meta, ...patch }, meta.requestedUrl);
    assert.equal(result.score,null); assert.equal(result.fcp,null); assert.equal(result.lcp,null); assert.equal(result.measuredAt,'');
  }
});

test('measured zero is preserved while missing, negative, infinite and string timing values stay unmeasured', () => {
  assert.equal(reportPerformance({ ...meta, pageSpeed: { ...meta.pageSpeed, firstContentfulPaint: { numericValue: 0 } } }, meta.requestedUrl).fcp, '0 s');
  for (const value of [null, undefined, -1, NaN, Infinity, '8532']) {
    const result = reportPerformance({ ...meta, pageSpeed: { ...meta.pageSpeed, firstContentfulPaint: { numericValue: value, displayValue: '8 s' } } }, meta.requestedUrl);
    assert.equal(result.fcp,null); assert.equal(result.lcp,'10,3 s');
  }
  assert.equal(reportPerformance({ ...meta, pageSpeed: { ...meta.pageSpeed, firstContentfulPaint: { numericValue: 0.5 } } }, meta.requestedUrl).fcp,'<0,001 s');
});
