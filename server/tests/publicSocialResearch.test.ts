import test from 'node:test';
import assert from 'node:assert/strict';
import { collectPublicProfile, discoverPublicProfiles, discoverSocialLinks, parsePublicSocialHtml, publicResearchInput } from '../publicSocialResearch';
import { publicProfileUrl, validatePublicProfiles, validatePublicSnapshot, validateSocialAccount, type PublicSnapshot, type PublicSocialProfile } from '../../shared/socialMetrics';
import { latestPublicSnapshot, monthlyPublicFollowers, publicRecommendations, publicValue } from '../../shared/publicSocialAnalysis';
const profile = 'https://www.tiktok.com/@business/';
const snapshot: PublicSnapshot = { id: 's1', profileUrl: profile, source: 'manual-public', capturedAt: '2026-10-17', evidence: 'Perfil público verificado, últimas publicaciones visibles', followers: 0, posts: [], periodStart: '2026-10-01', periodEnd: '2026-10-16' };
const own: PublicSocialProfile = { role: 'own', name: 'Negocio de prueba', profileUrl: profile, confirmed: true, snapshots: [snapshot] };
const json = (value: unknown) => `<script type="application/json">${JSON.stringify(value)}</script>`;
test('public discovery only proposes supported profile links, deduplicates and never guesses from business names', () => {
  const found = discoverSocialLinks(`<a href="https://instagram.com/Business/?utm_source=website">Instagram</a><a href="https://www.instagram.com/business/">Same</a><a href="https://facebook.com/sharer/sharer.php?u=example">Share</a><a href="https://www.tiktok.com/@business">TikTok</a><a href="https://instagram.com.evil.test/other/">Fake</a><a href="https://instagram.com/p/abcd/">Post</a><a href="javascript:alert(1)">bad</a><a href="https://instagram.com:444/other">port</a>`, 'https://business.test/');
  assert.equal(found.length, 2); assert.equal(found[0].profileUrl, 'https://www.instagram.com/business/');
  assert.equal(discoverSocialLinks('<h1>Business</h1>', 'https://business.test/').length, 0);
  assert.throws(() => publicProfileUrl('tiktok', 'https://tiktok.com/not-a-handle'));
  assert.throws(() => publicProfileUrl('instagram', 'https://instagram.com/accounts/login/'));
});
test('TikTok public extraction scopes exact counters to the requested user and dated posts, preserving zero and unknown fields', () => {
  const html = json({ userInfo: { user: { uniqueId: 'business' }, stats: { followerCount: 0, videoCount: 10 } }, unrelated: { user: { uniqueId: 'other' }, stats: { followerCount: 9999 } }, items: [ { id: '123', author: { uniqueId: 'business' }, createTime: Date.parse('2026-10-10') / 1000, stats: { diggCount: 0, commentCount: 2, playCount: 30 } }, { id: '124', author: { uniqueId: 'other' }, createTime: Date.parse('2026-10-10') / 1000, stats: { diggCount: 1000 } }, { id: '125', author: { uniqueId: 'business' }, createTime: Date.parse('2026-09-10') / 1000, stats: { diggCount: 1000 } } ] });
  const result = parsePublicSocialHtml('tiktok', profile, html, snapshot.periodStart, snapshot.periodEnd)!;
  assert.equal(result.followers, 0); assert.equal(result.totalPosts, 10); assert.equal(result.posts.length, 1);
  assert.equal(result.posts[0].likes, 0); assert.equal(result.posts[0].comments, 2);
  assert.equal(result.source, 'public-web'); assert.match(result.evidence, /muestra/);
  assert.equal(parsePublicSocialHtml('tiktok', profile, json({ userInfo: { user: { uniqueId: 'other' }, stats: { followerCount: 9999 } } }), snapshot.periodStart, snapshot.periodEnd), null);
  assert.equal(parsePublicSocialHtml('tiktok', profile, json({ userInfo: { user: { uniqueId: 'business' }, stats: { followerCount: '1.2K', videoCount: null } } }), snapshot.periodStart, snapshot.periodEnd), null);
});
test('Instagram and JSON-LD extraction only accept identified owner data, not unrelated metrics', () => {
  const ig = parsePublicSocialHtml('instagram', 'https://instagram.com/business', json({ username: 'business', edge_followed_by: { count: 42 }, edge_owner_to_timeline_media: { count: 1, edges: [{ node: { shortcode: 'abcd', taken_at_timestamp: Date.parse('2026-10-10') / 1000, edge_media_preview_like: { count: 5 } } }] } }), snapshot.periodStart, snapshot.periodEnd)!;
  assert.equal(ig.followers, 42); assert.equal(ig.posts.length, 1); assert.equal(ig.posts[0].comments, undefined);
  assert.equal(publicValue(ig, 'averageInteractions'), null);
  const fb = parsePublicSocialHtml('facebook', 'https://facebook.com/business', `<script type="application/ld+json">${JSON.stringify({ '@type': 'Organization', url: 'https://facebook.com/business', interactionStatistic: [{ interactionType: 'https://schema.org/FollowAction', userInteractionCount: 70 }] })}</script>`, snapshot.periodStart, snapshot.periodEnd)!;
  assert.equal(fb.followers, 70);
});
test('blocked pages, login redirects and mismatched accounts return unavailable without phantom observations', async () => {
  const input = publicResearchInput({ network: 'tiktok', profileUrl: profile, start: snapshot.periodStart, end: snapshot.periodEnd });
  for (const reader of [async () => { throw new Error('403 / private details'); }, async () => ({ html: '<h1>Log in</h1>', requestedUrl: profile, finalUrl: 'https://www.tiktok.com/login', fetchedAt: snapshot.capturedAt }), async () => ({ html: '<h1>No counters</h1>', requestedUrl: profile, finalUrl: profile, fetchedAt: snapshot.capturedAt })]) {
    const result = await collectPublicProfile(input, reader); assert.equal(result.status, 'unavailable'); assert.equal('snapshot' in result, false); assert.doesNotMatch(result.message, /private details/);
  }
  const found = await discoverPublicProfiles('https://business.test/', async () => ({ html: '<a href="https://facebook.com/business">FB</a>', requestedUrl: 'https://business.test/', finalUrl: 'https://business.test/new/', fetchedAt: snapshot.capturedAt }));
  assert.equal(found.candidates[0].foundOn, 'https://business.test/new/');
  for (const patch of [{ network: 'google' }, { end: '2099-01-01' }, { start: '2026-02-30' }, { profileUrl: 'https://localhost/private' }]) assert.throws(() => publicResearchInput({ ...input, ...patch }));
});
test('public observations validate evidence, dates, counts, unique profiles and samples before persistence', () => {
  assert.equal(validatePublicSnapshot('tiktok', snapshot).followers, 0);
  for (const patch of [{ followers: null }, { followers: -1 }, { followers: 1.2 }, { followers: '1K' }, { followers: undefined }, { evidence: '' }, { capturedAt: '2026-02-30' }, { posts: [{ url: 'https://evil.test/a', publishedAt: '2026-10-10' }] }]) assert.throws(() => validatePublicSnapshot('tiktok', { ...snapshot, ...patch } as any));
  assert.throws(() => validatePublicProfiles('tiktok', [own, { ...own, role: 'competitor-1' }]));
  assert.throws(() => validatePublicProfiles('tiktok', [own, { ...own, profileUrl: 'https://tiktok.com/@other' }]));
  const account = { workspaceId: 'w', businessId: 'b', network: 'tiktok' as const, profileUrl: profile, accountId: '', measurements: [], publicProfiles: [own] };
  const roundtrip = validateSocialAccount(JSON.parse(JSON.stringify(account))); assert.equal(roundtrip.publicProfiles?.[0].snapshots[0].followers, 0);
  assert.throws(() => validateSocialAccount({ ...account, publicProfiles: [{ ...own, snapshots: [{ ...snapshot, followers: -1 }] }] }));
});
test('comparison uses exact periods and complete interaction pairs; evolution excludes previous identities and invents no months', () => {
  assert.equal(publicValue(snapshot, 'followers'), 0); assert.equal(publicValue(snapshot, 'samplePosts'), null); assert.equal(publicValue(undefined, 'followers'), null);
  const withPosts: PublicSnapshot = { ...snapshot, posts: [{ url: 'https://www.tiktok.com/@business/video/1', publishedAt: '2026-10-10', likes: 10, comments: 2 }, { url: 'https://www.tiktok.com/@business/video/2', publishedAt: '2026-10-11', likes: 1000 }] };
  assert.equal(publicValue(withPosts, 'averageInteractions'), 12);
  const previous = { ...snapshot, id: 'old', capturedAt: '2026-09-17', followers: 100 };
  const p = { ...own, snapshots: [previous, withPosts, { ...previous, id: 'foreign', capturedAt: '2026-08-10', profileUrl: 'https://www.tiktok.com/@other/', followers: 999 }] };
  assert.equal(latestPublicSnapshot('tiktok', p, '2026-09-01', '2026-09-30', 'averageInteractions'), undefined);
  assert.deepEqual(monthlyPublicFollowers('tiktok', p).map(m => [m.month, m.value]), [['2026-09', 100], ['2026-10', 0]]);
  assert.match(publicRecommendations('tiktok', [p], snapshot.periodStart, snapshot.periodEnd).join(' '), /diferencia -100/);
  assert.match(publicRecommendations('tiktok', [own], snapshot.periodStart, snapshot.periodEnd).join(' '), /una sola medición no demuestra crecimiento/);
});
test('public routes require authentication and reject unsafe profiles before any public request', async () => {
  const { default: express } = await import('express');
  const { default: router } = await import('../socialMetricsRouter');
  const names = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY'];
  const previous = names.map(name => process.env[name]);
  const original = globalThis.fetch;
  process.env.VITE_SUPABASE_URL = 'https://auth.example'; process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'fixture'; delete process.env.VITE_SUPABASE_ANON_KEY;
  globalThis.fetch = async (url, init) => String(url) === 'https://auth.example/auth/v1/user' ? new Response(JSON.stringify({ id: 'fixture-user' })) : original(url, init);
  const app = express(); app.use(express.json()); app.use('/social', router);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.on('listening', resolve));
  const origin = `http://127.0.0.1:${(server.address() as any).port}/social/public/`;
  const request = (path: string, body: unknown, authorized: boolean) => original(origin + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(authorized ? { authorization: 'Bearer fixture' } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await request('discover', { domain: 'https://business.test' }, false)).status, 401);
    assert.equal((await request('collect', {}, false)).status, 401);
    assert.equal((await request('discover', { domain: 'file:///etc/passwd' }, true)).status, 400);
    assert.equal((await request('collect', { network: 'instagram', profileUrl: 'https://127.0.0.1/private', start: '2026-10-01', end: '2026-10-15' }, true)).status, 400);
    assert.equal((await request('collect', { network: 'tiktok', profileUrl: profile, start: '2026-10-01', end: '2099-01-01' }, true)).status, 400);
  } finally {
    globalThis.fetch = original; server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    names.forEach((name, index) => { if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index]; });
  }
});

test('rendered public module shows both competitors, real zeros, missing values, sample sizes and no invented history', async () => {
  const { build } = await import('esbuild');
  const { createRequire } = await import('node:module');
  const result = await build({ stdin: { contents: `export { PublicSocialResearch } from './src/components/PublicSocialResearch';`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, define: { 'import.meta.env': '{}' } });
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(new URL('../../package.json', import.meta.url)), module, module.exports);
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const account = { workspaceId: 'w', businessId: 'b', network: 'facebook', profileUrl: 'https://www.facebook.com/business/', accountId: '', measurements: [], publicProfiles: [
    { ...own, profileUrl: 'https://www.facebook.com/business/', snapshots: [{ ...snapshot, profileUrl: 'https://www.facebook.com/business/' }] },
    { role: 'competitor-1', name: 'Competidor medido', profileUrl: 'https://www.facebook.com/competitor/', confirmed: true, snapshots: [] },
    { role: 'competitor-2', name: 'Segundo competidor', profileUrl: 'https://www.facebook.com/competitor2/', confirmed: true, snapshots: [] },
  ] };
  const html = renderToStaticMarkup(React.createElement(module.exports.PublicSocialResearch, { business: { id: 'b', name: 'Negocio de prueba', url: 'https://business.test/', locale: 'es-AR', timezone: 'America/Argentina/Buenos_Aires' }, workspaceId: 'w', accounts: [account], disabled: false, start: snapshot.periodStart, end: snapshot.periodEnd, onSave: async () => {} }));
  for (const text of ['Buscar perfiles desde el dominio', 'Competidor 1', 'Competidor 2', 'Competidor medido', 'Segundo competidor', 'No disponible', 'width:0%', 'Se necesitan dos meses', 'Guardar perfiles confirmados', '17 de oct de 2026']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /NaN|Infinity|type="password"/);
});
