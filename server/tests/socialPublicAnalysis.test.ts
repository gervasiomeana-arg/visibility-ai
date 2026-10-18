import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePublicProfile } from '../../shared/socialPublicAnalysis';
import { type PublicSnapshot, type PublicSocialProfile } from '../../shared/socialMetrics';
const url='https://www.instagram.com/fixture/';
const snapshot=(patch:Partial<PublicSnapshot>={}):PublicSnapshot=>({id:'fixture-real-shape',profileUrl:url,capturedAt:'2026-01-31T12:00:00Z',source:'public-web',evidence:'Fixture only, never client data',followers:100,totalPosts:1000,periodStart:'2026-01-01',periodEnd:'2026-01-31',posts:[{url:'https://www.instagram.com/p/a/',publishedAt:'2026-01-10',likes:10,comments:2},{url:'https://www.instagram.com/p/b/',publishedAt:'2026-01-11',likes:0,comments:0},{url:'https://www.instagram.com/p/c/',publishedAt:'2026-01-12',comments:3}],...patch});
const profile=(snapshots:PublicSnapshot[]):PublicSocialProfile=>({name:'Fixture',role:'own',profileUrl:url,confirmed:true,snapshots});
const analyze=(p:PublicSocialProfile)=>analyzePublicProfile('instagram',p,'2026-01-01','2026-01-31');
test('partial samples have explicit denominators; missing likes are never zero; no inferred monthly views',()=>{
 const a=analyze(profile([snapshot()]));assert.equal(a.sampledPosts,3);assert.equal(a.measuredPosts,2);assert.equal(a.averageInteractions,6);assert.equal(a.engagementRate,6);assert.equal(a.observedPostsPerWeek,3/31*7);assert.equal(a.growth,null);assert.deepEqual(a.topPosts.map(p=>p.url),['https://www.instagram.com/p/a/','https://www.instagram.com/p/b/']);
 assert.match(a.recommendations.join(' '),/2 de 3/);assert.equal('reach' in a,false);assert.equal('views' in a,false);
});
test('latest observation replaces repeated posts instead of doubling them',()=>{
 const a=analyze(profile([snapshot({capturedAt:'2026-01-20T12:00:00Z',followers:80}),snapshot()]));assert.equal(a.sampledPosts,3);assert.equal(a.growth,20);assert.equal(a.growthStart,'2026-01-20T12:00:00Z');
 const sameDay=analyze(profile([snapshot({capturedAt:'2026-01-31T10:00:00Z',followers:80}),snapshot()]));assert.equal(sameDay.growth,null);
});
test('unknown and zero followers do not divide by zero or copy another observation',()=>{
 for(const followers of [0,undefined]){const a=analyze(profile([snapshot({followers})]));assert.equal(a.engagementRate,null);assert.equal(a.averageInteractions,6);}
 const a=analyze(profile([snapshot({posts:[]})]));assert.equal(a.observedPostsPerWeek,null);assert.match(a.recommendations.join(' '),/No permite concluir/);
});
test('wrong identity, seeded records, unconfirmed, out-of-window, invalid and duplicate posts are excluded',()=>{
 for(const s of [snapshot({profileUrl:'https://www.instagram.com/other/'}),snapshot({id:'snap-nh-ig-seed'}),snapshot({capturedAt:'2026-02-01T12:00:00Z'}),snapshot({posts:[snapshot().posts[0],snapshot().posts[0]]})])assert.equal(analyze(profile([s])).latest,undefined);
 assert.equal(analyze({...profile([snapshot()]),confirmed:false}).latest,undefined);
});
test('publication window is independent of account stock and observation time',()=>{
 const a=analyzePublicProfile('instagram',profile([snapshot()]),'2026-01-11','2026-01-31');assert.equal(a.sampledPosts,2);assert.equal(a.measuredPosts,1);assert.equal(a.averageInteractions,0);assert.equal(a.engagementRate,0);
});
