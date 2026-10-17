import test from 'node:test';
import assert from 'node:assert/strict';
import { getMonthPeriod, listRecentMonths, searchSocialMetrics, type SearchableMetric } from '../../shared/socialSearch';
import type { SocialAccount, SocialMeasurement } from '../../shared/socialMetrics';

const mockMeasurements: SocialMeasurement[] = [
  {
    id: 'm-ig-sep',
    network: 'instagram',
    profileUrl: 'https://www.instagram.com/hotelbristol/',
    capturedAt: '2026-09-30',
    source: 'manual',
    evidence: 'Meta Business Suite Septiembre 2026',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-30',
    metrics: { views: 14850, reach: 9200, followers: 5420, interactions: 1680, posts: 18 },
  },
  {
    id: 'm-fb-sep',
    network: 'facebook',
    profileUrl: 'https://www.facebook.com/hotelbristol/',
    capturedAt: '2026-09-30',
    source: 'manual',
    evidence: 'Meta Business Suite Facebook Septiembre 2026',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-30',
    metrics: { views: 8920, reach: 11400, followers: 8350, interactions: 740 },
  },
  {
    id: 'm-tt-sep',
    network: 'tiktok',
    profileUrl: 'https://www.tiktok.com/@hotelbristol/',
    capturedAt: '2026-09-30',
    source: 'official-api',
    accountId: 'acc-tt-1',
    evidence: 'TikTok Analytics Septiembre 2026',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-30',
    metrics: { views: 26400, followers: 3850, interactions: 2150, posts: 12 },
  },
];

const mockAccounts: SocialAccount[] = [
  {
    workspaceId: 'w-1',
    businessId: 'biz-1',
    network: 'instagram',
    profileUrl: 'https://www.instagram.com/hotelbristol/',
    accountId: '',
    measurements: [mockMeasurements[0]],
    publicProfiles: [
      {
        role: 'own',
        name: 'Gran Hotel Bristol',
        profileUrl: 'https://www.instagram.com/hotelbristol/',
        confirmed: true,
        snapshots: [],
      },
      {
        role: 'competitor-1',
        name: 'Hotel Costa Galana',
        profileUrl: 'https://www.instagram.com/hotelcostagalana/',
        confirmed: true,
        snapshots: [
          {
            id: 'snap-c1',
            profileUrl: 'https://www.instagram.com/hotelcostagalana/',
            capturedAt: '2026-09-28',
            source: 'manual-public',
            evidence: 'Captura pública septiembre',
            followers: 18500,
            posts: [
              { url: 'https://www.instagram.com/p/post1/', publishedAt: '2026-09-15', views: 9800, likes: 450, comments: 32 },
              { url: 'https://www.instagram.com/p/post2/', publishedAt: '2026-09-20', views: 8400, likes: 380, comments: 24 },
            ],
            periodStart: '2026-09-01',
            periodEnd: '2026-09-30',
          },
        ],
      },
    ],
  },
  {
    workspaceId: 'w-1',
    businessId: 'biz-1',
    network: 'facebook',
    profileUrl: 'https://www.facebook.com/hotelbristol/',
    accountId: '',
    measurements: [mockMeasurements[1]],
  },
  {
    workspaceId: 'w-1',
    businessId: 'biz-1',
    network: 'tiktok',
    profileUrl: 'https://www.tiktok.com/@hotelbristol/',
    accountId: 'acc-tt-1',
    measurements: [mockMeasurements[2]],
  },
];

test('getMonthPeriod parses AAAA-MM and generates correct calendar days and labels', () => {
  const sep = getMonthPeriod('2026-09');
  assert.equal(sep.year, 2026);
  assert.equal(sep.monthNumber, 9);
  assert.equal(sep.startDate, '2026-09-01');
  assert.equal(sep.endDate, '2026-09-30');
  assert.equal(sep.label, 'Septiembre 2026');
  assert.equal(sep.shortLabel, 'Sep 2026');

  const febLeap = getMonthPeriod('2024-02');
  assert.equal(febLeap.endDate, '2024-02-29');

  const febNonLeap = getMonthPeriod('2026-02');
  assert.equal(febNonLeap.endDate, '2026-02-28');

  assert.throws(() => getMonthPeriod('invalid'));
  assert.throws(() => getMonthPeriod('2026-13'));
  assert.throws(() => getMonthPeriod('2026-00'));
});

test('listRecentMonths returns contiguous reverse-chronological month periods', () => {
  const months = listRecentMonths(6, new Date('2026-10-15T00:00:00Z'));
  assert.equal(months.length, 6);
  assert.equal(months[0].key, '2026-10');
  assert.equal(months[1].key, '2026-09');
  assert.equal(months[2].key, '2026-08');
  assert.equal(months[5].key, '2026-05');
});

test('searchSocialMetrics searches client views in September and produces bar chart data and summary text', () => {
  const result = searchSocialMetrics(
    'biz-1',
    'Gran Hotel Bristol',
    mockAccounts,
    '2026-09',
    'views'
  );

  assert.equal(result.period.label, 'Septiembre 2026');
  assert.equal(result.businessName, 'Gran Hotel Bristol');

  const ig = result.networks.find(n => n.network === 'instagram');
  const fb = result.networks.find(n => n.network === 'facebook');
  const tt = result.networks.find(n => n.network === 'tiktok');

  assert.ok(ig);
  assert.ok(fb);
  assert.ok(tt);

  assert.equal(ig?.value, 14850);
  assert.equal(fb?.value, 8920);
  assert.equal(tt?.value, 26400);

  // TikTok is the leader
  assert.equal(tt?.isLeader, true);
  assert.equal(tt?.percentageOfMax, 100);
  assert.equal(ig?.percentageOfMax, Math.round((14850 / 26400) * 100)); // 56%

  // Summary sentence matches user request format: "en instagram te vieron tantos en facebook tantos"
  assert.match(result.summaryText, /en Instagram te vieron 14\.850/);
  assert.match(result.summaryText, /en Facebook te vieron 8\.920/);
  assert.match(result.summaryText, /en TikTok te vieron 26\.400/);

  // Total
  assert.equal(result.totalValue, 14850 + 8920 + 26400);

  // Competitor extraction
  assert.equal(result.competitorsData.length, 1);
  assert.equal(result.competitorsData[0].name, 'Hotel Costa Galana');
  const compIg = result.competitorsData[0].networks.find(n => n.network === 'instagram');
  assert.equal(compIg?.value, 9800 + 8400); // 18200 views
});

test('searchSocialMetrics returns null and "Sin medición" for months without data without inventing numbers', () => {
  const result = searchSocialMetrics(
    'biz-1',
    'Gran Hotel Bristol',
    mockAccounts,
    '2026-05',
    'views'
  );

  assert.equal(result.totalValue, 0);
  for (const n of result.networks) {
    assert.equal(n.value, null);
    assert.equal(n.formattedValue, 'Sin medición');
    assert.equal(n.percentageOfMax, 0);
  }
  assert.match(result.summaryText, /sin medición registrada/);
});

test('searchSocialMetrics supports followers and interactions metrics', () => {
  const followersResult = searchSocialMetrics(
    'biz-1',
    'Gran Hotel Bristol',
    mockAccounts,
    '2026-09',
    'followers'
  );

  const ig = followersResult.networks.find(n => n.network === 'instagram');
  assert.equal(ig?.value, 5420);

  const fb = followersResult.networks.find(n => n.network === 'facebook');
  assert.equal(fb?.value, 8350);

  const tt = followersResult.networks.find(n => n.network === 'tiktok');
  assert.equal(tt?.value, 3850);
});
