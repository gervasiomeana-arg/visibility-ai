import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { monthWindows, monthlySeries, hasUnverifiedSeeds } from '../../shared/socialMonthly';
import { MonthlyChart } from '../../src/components/SocialMonthlyChart';
import type { SocialAccount, SocialMeasurement, PublicSnapshot } from '../../shared/socialMetrics';

const profileUrl = 'https://www.instagram.com/fixture_business/';
const base: SocialAccount = { workspaceId: 'workspace-test', businessId: 'business-test', network: 'instagram', profileUrl, accountId: '', measurements: [] };
const measurement = (patch: Partial<SocialMeasurement> = {}): SocialMeasurement => ({ id: 'fixture-only', network: 'instagram', profileUrl, capturedAt: '2026-02-28', source: 'manual', evidence: 'Fixture de informe: exclusivamente prueba, no datos del hotel', periodStart: '2026-02-01', periodEnd: '2026-02-28', metrics: { followers: 12, views: 35, reach: 23 }, ...patch });
const snapshot = (patch: Partial<PublicSnapshot> = {}): PublicSnapshot => ({ id: 'fixture-snapshot', profileUrl, capturedAt: '2026-02-28', source: 'public-web', evidence: 'Fixture HTML público, exclusivamente prueba', followers: 8, posts: [{ url: 'https://www.instagram.com/p/FIXTURE/', publishedAt: '2026-02-10', views: 800 }], periodStart: '2026-01-01', periodEnd: '2026-03-31', ...patch });
const series = (account: SocialAccount | undefined, metric: 'followers'|'views'|'reach') => monthlySeries(account, 'instagram', metric, '2026-01-01', '2026-03-31', '2026-10-17').map(p => p.value);

test('January through today has chronological month windows and a partial current month', () => {
  const months = monthWindows('2026-01-01','2026-10-17','2026-10-17');
  assert.equal(months.length,10); assert.deepEqual(months.at(-1), {month:'2026-10',start:'2026-10-01',end:'2026-10-17'});
  assert.equal(months[1].end,'2026-02-28');
  assert.throws(() => monthWindows('2026-02-30','2026-03-31','2026-10-17'));
  assert.throws(() => monthWindows('2026-03-01','2026-02-01','2026-10-17'));
  assert.throws(() => monthWindows('2026-01-01','2026-10-18','2026-10-17'));
  assert.throws(() => monthWindows('2020-01-01','2026-10-17','2026-10-17'));
});
test('no account or measurements means unknown in each month, never zero or a seeded hotel', () => {
  assert.deepEqual(series(undefined,'followers'),[null,null,null]);
  assert.deepEqual(series(base,'reach'),[null,null,null]);
});
test('dated followers never fill other months; latest observation in each month wins', () => {
  const account = {...base,measurements:[measurement(),measurement({id:'other-fixture',capturedAt:'2026-02-12',metrics:{followers:4}})]};
  assert.deepEqual(series(account,'followers'),[null,12,null]);
  assert.deepEqual(series({...base, measurements:[measurement({capturedAt:'2026-10-17'})]},'followers'),[null,null,null]);
});
test('genuine zero is retained; sources and evidence remain attached', () => {
  const result=monthlySeries({...base,measurements:[measurement({metrics:{followers:0}})]},'instagram','followers','2026-02-01','2026-02-28','2026-10-17');
  assert.equal(result[0].value,0); assert.match(result[0].evidence!,/Fixture/); assert.equal(result[0].capturedAt,'2026-02-28');
});
test('views and reach require exact coverage; samples and partial periods do not become monthly totals', () => {
  assert.deepEqual(series({...base,measurements:[measurement()]},'views'),[null,35,null]);
  assert.deepEqual(series({...base,measurements:[measurement()]},'reach'),[null,23,null]);
  assert.deepEqual(series({...base,measurements:[measurement({periodEnd:'2026-02-15'})]},'views'),[null,null,null]);
  const account={...base,publicProfiles:[{role:'own' as const,name:'Fixture',profileUrl,confirmed:true,snapshots:[snapshot()]}]};
  assert.deepEqual(series(account,'followers'),[null,8,null]);
  assert.deepEqual(series(account,'views'),[null,null,null]);
  assert.deepEqual(series(account,'reach'),[null,null,null]);
});
test('profile, account and network mismatches never mix clients; unconfirmed public profiles are ignored', () => {
  assert.deepEqual(series({...base,measurements:[measurement({profileUrl:'https://www.instagram.com/someone_else/'})]},'followers'),[null,null,null]);
  assert.deepEqual(series({...base,accountId:'expected',measurements:[measurement({accountId:'other'})]},'followers'),[null,null,null]);
  assert.deepEqual(series({...base,network:'facebook',measurements:[]},'followers'),[null,null,null]);
  const publicProfile={role:'own' as const,name:'Fixture',profileUrl,confirmed:false,snapshots:[snapshot()]};
  assert.deepEqual(series({...base,publicProfiles:[publicProfile]},'followers'),[null,null,null]);
  assert.deepEqual(series({...base,publicProfiles:[{...publicProfile,confirmed:true,snapshots:[snapshot({profileUrl:'https://www.instagram.com/other/'})]}]},'followers'),[null,null,null]);
});
test('known fabricated AI Studio records are quarantined without mutating stored originals', () => {
  const original={...base,measurements:[measurement({id:'m-ig-sep-business-test'})],publicProfiles:[{role:'own' as const,name:'Fixture',profileUrl,confirmed:true,snapshots:[snapshot({id:'snap-nh-ig-ago-business-test'})]}]};
  const before=JSON.stringify(original);
  assert.equal(hasUnverifiedSeeds(original),true);
  assert.deepEqual(series(original,'followers'),[null,null,null]);
  assert.deepEqual(series(original,'views'),[null,null,null]);
  assert.equal(JSON.stringify(original),before);
});
test('not-used, malformed, future observations and missing reach are never filled', () => {
  assert.deepEqual(series({...base,presence:{status:'not-used',confirmedAt:'2026-10-17',evidence:'Fixture confirmation'},measurements:[measurement()]},'followers'),[null,null,null]);
  assert.deepEqual(series({...base,measurements:[measurement({metrics:{followers:-1}})]},'followers'),[null,null,null]);
  assert.deepEqual(series({...base,measurements:[measurement({capturedAt:'2027-02-01'})]},'views'),[null,null,null]);
  assert.deepEqual(series({...base,measurements:[measurement({metrics:{followers:12}})]},'reach'),[null,null,null]);
});
test('monthly chart distinguishes unknown from zero and exposes sources accessibly', () => {
  const points=monthlySeries({...base,measurements:[measurement({metrics:{followers:0}})]},'instagram','followers','2026-01-01','2026-03-31','2026-10-17');
  const html=renderToStaticMarkup(React.createElement(MonthlyChart,{title:'Seguidores',points}));
  assert.match(html,/Sin datos verificados/); assert.match(html,/>0</); assert.match(html,/2026-02-28/); assert.match(html,/Fixture de informe/);
  assert.doesNotMatch(html,/NaN|Infinity|undefined/);
});
