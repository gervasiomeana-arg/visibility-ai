import test from 'node:test';
import assert from 'node:assert/strict';
import { socialReportRows } from '../../shared/socialReport';
import type { SocialAccount, PublicSnapshot } from '../../shared/socialMetrics';
const url = 'https://www.instagram.com/fixture/';
const snap = (patch: Partial<PublicSnapshot> = {}): PublicSnapshot => ({ id:'observed', profileUrl:url, capturedAt:'2026-01-31T12:00:00Z', source:'public-web', evidence:'Fixture for tests only', followers:100, periodStart:'2026-01-01', periodEnd:'2026-01-31', posts:[], ...patch });
const account = (snapshots: PublicSnapshot[]): SocialAccount => ({workspaceId:'w',businessId:'b',network:'instagram',profileUrl:url,accountId:'',measurements:[],publicProfiles:[{role:'own',name:'Fixture',profileUrl:url,confirmed:true,snapshots}]});
const rows = (a: SocialAccount[]) => socialReportRows(a,'w','b','2026-02-01');
test('report retains latest known follower stock with source and date, without inventing reach or views',()=>{
 const r=rows([account([snap(),snap({id:'later',capturedAt:'2026-02-01T10:00:00Z',followers:120})])]);
 assert.equal(r.length,3);assert.equal(r[0].followers,120);assert.equal(r[0].capturedAt,'2026-02-01T10:00:00Z');assert.equal(r[0].source,'Lectura pública');assert.equal(r[1].followers,null);assert.equal('reach' in r[0],false);assert.equal('views' in r[0],false);
});
test('report excludes another business, workspace, competitor, seed, wrong profile, future and unconfirmed records',()=>{
 const a=account([snap()]);
 for(const other of [{...a,businessId:'other'},{...a,workspaceId:'other'},{...a,publicProfiles:[{...a.publicProfiles![0],role:'competitor-1' as const}]},{...a,publicProfiles:[{...a.publicProfiles![0],confirmed:false}]},account([snap({id:'snap-nh-ig-seed'})]),account([snap({profileUrl:'https://www.instagram.com/other/'})]),account([snap({capturedAt:'2026-02-02T10:00:00Z'})])])assert.equal(rows([other])[0].followers,null);
});
test('zero remains zero, latest unknown does not erase an older measured stock, not-used suppresses stored observations',()=>{
 assert.equal(rows([account([snap({followers:0})])])[0].followers,0);
 assert.equal(rows([account([snap(),snap({id:'unknown',capturedAt:'2026-02-01T10:00:00Z',followers:undefined,totalPosts:2})])])[0].followers,100);
 const a=account([snap()]);a.presence={status:'not-used',confirmedAt:'2026-02-01',evidence:'Confirmed by operator'};assert.equal(rows([a])[0].followers,null);
});
