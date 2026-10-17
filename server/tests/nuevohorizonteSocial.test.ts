import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getInitialSocialAccounts, isNuevoHorizonte } from '../../src/data/initialSocialAccounts';
import { searchSocialMetrics } from '../../shared/socialSearch';
import { latestSocialMetric } from '../../shared/socialMetrics';
import { SocialMetricBars } from '../../src/components/SocialMetricBars';
import { SocialMetricsFinder } from '../../src/components/SocialMetricsFinder';
import { INITIAL_BUSINESSES } from '../../src/data/mockData';

test('isNuevoHorizonte identifies hotel id and variations', () => {
  assert.equal(isNuevoHorizonte('biz-hotel-nuevohorizonte'), true);
  assert.equal(isNuevoHorizonte('nuevohorizontehotel'), true);
  assert.equal(isNuevoHorizonte('hotel-nuevo-horizonte'), true);
  assert.equal(isNuevoHorizonte('biz-hotel-mdp'), false);
});

test('nuevohorizontehotel has verified Instagram measurements, followers and snapshots', () => {
  const accounts = getInitialSocialAccounts('workspace-nh', 'biz-hotel-nuevohorizonte');
  assert.equal(accounts.length, 3);

  const ig = accounts.find((a) => a.network === 'instagram')!;
  assert.ok(ig);
  assert.equal(ig.profileUrl, 'https://www.instagram.com/nuevohorizontehotel/');
  assert.ok(ig.measurements.length >= 3);

  // September 2026 measurement
  const sep = ig.measurements.find((m) => m.periodStart === '2026-09-01' && m.periodEnd === '2026-09-30')!;
  assert.ok(sep);
  assert.equal(sep.metrics.followers, 125);
  assert.equal(sep.metrics.views, 5400);
  assert.equal(sep.metrics.posts, 4);

  // Facebook and TikTok marked as not-used per client confirmation
  const fb = accounts.find((a) => a.network === 'facebook')!;
  assert.equal(fb.presence?.status, 'not-used');
  const tt = accounts.find((a) => a.network === 'tiktok')!;
  assert.equal(tt.presence?.status, 'not-used');
});

test('searchSocialMetrics displays bar results and leader for nuevohorizontehotel in September 2026', () => {
  const accounts = getInitialSocialAccounts('workspace-nh', 'biz-hotel-nuevohorizonte');

  // Search views in September
  const viewsResult = searchSocialMetrics(
    'biz-hotel-nuevohorizonte',
    'Hotel Nuevo Horizonte Centro',
    accounts,
    '2026-09',
    'views'
  );
  assert.equal(viewsResult.period.label, 'Septiembre 2026');
  const igView = viewsResult.networks.find((n) => n.network === 'instagram')!;
  assert.equal(igView.value, 5400);
  assert.match(igView.formattedValue, /5\.400|5,400/);
  assert.match(viewsResult.summaryText, /Instagram te vieron/i);

  // Search followers in September
  const followersResult = searchSocialMetrics(
    'biz-hotel-nuevohorizonte',
    'Hotel Nuevo Horizonte Centro',
    accounts,
    '2026-09',
    'followers'
  );
  const igFollowers = followersResult.networks.find((n) => n.network === 'instagram')!;
  assert.equal(igFollowers.value, 125);
  assert.equal(igFollowers.formattedValue, '125');
});

test('latestSocialMetric and SocialMetricBars render Instagram bar for nuevohorizontehotel', () => {
  const accounts = getInitialSocialAccounts('workspace-nh', 'biz-hotel-nuevohorizonte');
  const ig = accounts.find((a) => a.network === 'instagram')!;

  const metric = latestSocialMetric(ig, 'followers', '2026-09-01', '2026-09-30');
  assert.ok(metric);
  assert.equal(metric.value, 125);

  const html = renderToStaticMarkup(
    React.createElement(SocialMetricBars, {
      name: 'Hotel Nuevo Horizonte Centro',
      accounts,
      metric: 'followers',
      start: '2026-09-01',
      end: '2026-09-30',
    })
  );
  assert.match(html, /Hotel Nuevo Horizonte Centro/);
  assert.match(html, /Instagram/);
  assert.match(html, /125/);
  assert.match(html, /Sin cuenta · confirmado por el usuario/); // Facebook/TikTok
});

test('SocialMetricsFinder renders Instagram bar and competitor comparison for nuevohorizontehotel', () => {
  const nhBusiness = INITIAL_BUSINESSES.find((b) => b.id === 'biz-hotel-nuevohorizonte')!;
  assert.ok(nhBusiness);
  const accounts = getInitialSocialAccounts('workspace-nh', nhBusiness.id);

  const html = renderToStaticMarkup(
    React.createElement(SocialMetricsFinder, {
      business: nhBusiness,
      allBusinesses: INITIAL_BUSINESSES,
      accounts,
      workspaceId: 'workspace-nh',
      canEdit: true,
      onSaveAccount: async () => {},
    })
  );

  assert.match(html, /Hotel Nuevo Horizonte/);
  assert.match(html, /Instagram/);
  assert.match(html, /nuevohorizontehotel/);
  assert.match(html, /Mayor volumen/);
});
