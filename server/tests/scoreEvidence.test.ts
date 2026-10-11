import test from 'node:test';
import assert from 'node:assert/strict';
import { measuredScore, technicalScoreChange, webMeasurement } from '../../shared/scoreEvidence';
import type { MonthlyEvolution } from '../../src/types';
const history = [{ auditedAt: '2026-10-01', webScore: 70 }, { auditedAt: '2026-10-11', webScore: null }];

test('a failed PageSpeed request never reuses the previous score as a current or demo result', () => {
  const result = webMeasurement({ fetchedAt: '2026-10-11', pageSpeed: null, pageSpeedError: 'Timeout' }, 70, 'demo', history);
  assert.equal(result.value, null);
  assert.equal(result.state, 'unavailable');
  assert.deepEqual(result.historical, history[0]);
});

test('a genuine zero remains a dated real measurement', () => {
  const result = webMeasurement({ fetchedAt: '2026-10-11', pageSpeed: { performanceScore: 0, fetchedAt: '2026-10-11T10:00:00Z' } }, 70, 'demo', history);
  assert.equal(result.value, 0);
  assert.equal(result.state, 'real');
  assert.equal(result.measuredAt, '2026-10-11T10:00:00Z');
});

test('unknown or invalid scores cannot become current measurements', () => {
  assert.equal(webMeasurement(null, 70, 'real', history).value, null);
  assert.equal(webMeasurement(null, 70, 'demo').state, 'demo');
  for (const value of [undefined, null, NaN, Infinity, -1, 101, '70']) assert.equal(measuredScore(value), null);
});

test('technical index changes require a consistent measurement basis', () => {
  const evolution: MonthlyEvolution = { source: 'real', months: ['a', 'b'], visibility: [70, 80], auditBases: ['SEO+PAGESPEED', 'SEO+PAGESPEED'], googlePositions: [], consultations: [], estimatedVisits: [], fixedProblems: [], monthComparison: { visibilityChangePercent: 0, improvedPositionsCount: 0, solvedProblemsCount: 0, newOpportunitiesCount: 0, consultationsTotal: 0 } };
  assert.equal(technicalScoreChange(evolution), 10);
  assert.equal(technicalScoreChange({ ...evolution, auditBases: ['SEO+PAGESPEED', 'SEO'] }), null);
  assert.equal(technicalScoreChange({ ...evolution, auditBases: undefined }), null);
});
