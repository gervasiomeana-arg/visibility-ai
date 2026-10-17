import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverInstagramBusiness, getInstagramDiscoveryConfig, instagramDiscoveryStatus, InstagramDiscoveryError } from '../instagramBusinessDiscovery';
import { monthlySeries } from '../../shared/socialMonthly';
const operator='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const env={META_GRAPH_API_VERSION:'v25.0',META_DISCOVERY_IG_USER_ID:'123456789',META_DISCOVERY_ACCESS_TOKEN:'fixture-private-token',META_DISCOVERY_OPERATOR_USER_ID:operator};
const url='https://www.instagram.com/fixture_business/';
const payload=()=>({id:'123456789',business_discovery:{id:'987654321',username:'fixture_business',followers_count:0,media_count:4}});
const request=(fetcher:typeof fetch,overrides:Partial<NodeJS.ProcessEnv>={})=>discoverInstagramBusiness(url,'2026-01-01','2026-10-17',operator,fetcher,{...env,...overrides});
test('configuration status reports missing names without exposing own identifiers or tokens',()=>{
 assert.deepEqual(getInstagramDiscoveryConfig({}).missing,['META_GRAPH_API_VERSION','META_DISCOVERY_IG_USER_ID','META_DISCOVERY_ACCESS_TOKEN','META_DISCOVERY_OPERATOR_USER_ID']);
 const status=instagramDiscoveryStatus(operator,env);assert.equal(status.operatorAllowed,true);assert.equal(status.requiresClientPassword,false);
 assert.doesNotMatch(JSON.stringify(status),/fixture-private-token|123456789|11111111/);
 assert.equal(instagramDiscoveryStatus(other,env).operatorAllowed,false);
 for(const patch of [{META_GRAPH_API_VERSION:'https://evil.test'},{META_DISCOVERY_IG_USER_ID:'../other'},{META_DISCOVERY_ACCESS_TOKEN:'bad\r\nheader'},{META_DISCOVERY_OPERATOR_USER_ID:'anyone'}])assert.equal(getInstagramDiscoveryConfig({...env,...patch}).configured,false);
});
test('public discovery queries via own account for a different target; no target password, cookies or token in URL',async()=>{
 let calls=0;
 const snapshot=await request(async(target,init)=>{
  calls++;const endpoint=new URL(String(target));assert.equal(endpoint.origin,'https://graph.facebook.com');assert.equal(endpoint.pathname,'/v25.0/123456789');
  assert.equal(endpoint.searchParams.get('fields'),'business_discovery.username(fixture_business){id,username,followers_count,media_count}');
  assert.equal(endpoint.searchParams.has('access_token'),false);assert.equal(new Headers(init?.headers).get('authorization'),'Bearer fixture-private-token');assert.equal(new Headers(init?.headers).has('cookie'),false);
  assert.equal(init?.redirect,'error');assert.ok(init?.signal instanceof AbortSignal);
  return new Response(JSON.stringify(payload()));
 });
 assert.equal(calls,1);assert.equal(snapshot.followers,0);assert.equal(snapshot.totalPosts,4);assert.equal(snapshot.source,'official-public-api');assert.equal(snapshot.profileUrl,url);
 assert.deepEqual(snapshot.posts,[]);assert.doesNotMatch(JSON.stringify(snapshot),/fixture-private-token|access_token/);assert.match(snapshot.evidence,/Business Discovery/);
});
test('missing configuration and another operator stop before any provider request',async()=>{
 let calls=0;const fetcher:typeof fetch=async()=>{calls++;return new Response('{}');};
 await assert.rejects(request(fetcher,{META_DISCOVERY_ACCESS_TOKEN:''}),e=>e instanceof InstagramDiscoveryError&&e.code==='not-configured');
 await assert.rejects(discoverInstagramBusiness(url,'2026-01-01','2026-10-17',other,fetcher,env),e=>e instanceof InstagramDiscoveryError&&e.code==='operator-not-authorized');assert.equal(calls,0);
});
test('response must identify both own querying account and requested target',async()=>{
 for(const data of [{...payload(),id:'wrong-own'},{...payload(),business_discovery:{...payload().business_discovery,username:'someone_else'}},{...payload(),business_discovery:{...payload().business_discovery,id:undefined}}])await assert.rejects(request(async()=>new Response(JSON.stringify(data))),e=>e instanceof InstagramDiscoveryError&&e.code==='identity-mismatch');
});
test('missing, approximate or negative provider counters do not become observations',async()=>{
 for(const patch of [{followers_count:undefined},{followers_count:'1.2K'},{followers_count:-1},{media_count:null},{media_count:9007199254740992}])await assert.rejects(request(async()=>new Response(JSON.stringify({...payload(),business_discovery:{...payload().business_discovery,...patch}}))),e=>e instanceof InstagramDiscoveryError&&e.code==='invalid-response');
});
test('provider errors have safe diagnostic classes and no retries, HTML fallbacks or secret leakage',async()=>{
 for(const [status,code,expected] of [[429,4,'rate-limited'],[400,190,'token-expired'],[403,200,'permissions'],[400,100,'profile-unavailable'],[500,999,'provider-error']] as const){
  let calls=0;await assert.rejects(request(async()=>{calls++;return new Response(JSON.stringify({error:{code,message:'fixture-private-token detailed private provider response'}}),{status});}),e=>e instanceof InstagramDiscoveryError&&e.code===expected&&!e.message.includes('fixture-private-token'));assert.equal(calls,1);
 }
 await assert.rejects(request(async()=>{throw new Error('fixture-private-token');}),e=>e instanceof InstagramDiscoveryError&&e.code==='network'&&!e.message.includes('fixture-private-token'));
});
test('official public observation never invents historical followers, reach or period views',async()=>{
 const s=await request(async()=>new Response(JSON.stringify(payload())));
 const day=s.capturedAt.slice(0,10),start=day.slice(0,4)+'-01-01';
 const account={workspaceId:'fixture-workspace',businessId:'fixture-client',network:'instagram' as const,profileUrl:url,accountId:'',measurements:[],publicProfiles:[{role:'own' as const,name:'Fixture',profileUrl:url,confirmed:true,snapshots:[s]}]};
 const values=monthlySeries(account,'instagram','followers',start,day);
 assert.equal(values.filter(p=>p.value!==null).length,1);assert.equal(values.at(-1)?.source,'Meta · Business Discovery');
 for(const metric of ['views','reach'] as const)assert.ok(monthlySeries(account,'instagram',metric,start,day).every(p=>p.value===null));
});
test('authenticated HTTP route exposes safe status and uses discovery only for the authorized operator',async()=>{
 const express=(await import('express')).default,router=(await import('../socialMetricsRouter')).default;
 const names=['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY',...Object.keys(env)];const previous=names.map(k=>process.env[k]);const original=globalThis.fetch;
 Object.assign(process.env,env,{VITE_SUPABASE_URL:'https://fixture-auth.test',VITE_SUPABASE_PUBLISHABLE_KEY:'fixture-key'});
 let providerCalls=0;
 globalThis.fetch=async(target,init)=>{
  if(String(target)==='https://fixture-auth.test/auth/v1/user')return new Response(JSON.stringify({id:new Headers(init?.headers).get('authorization')==='Bearer fixture-other'?other:operator}));
  if(String(target).startsWith('https://graph.facebook.com/')){providerCalls++;return new Response(JSON.stringify(payload()));}
  throw new Error('Unexpected request in fixture');
 };
 const app=express();app.use(express.json());app.use('/social',router);const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.on('listening',resolve));
 const origin=`http://127.0.0.1:${(server.address() as any).port}/social`;
 try{
  const status=await original(origin+'/instagram/discovery/status',{headers:{authorization:'Bearer fixture-own'}});assert.equal(status.status,200);assert.doesNotMatch(await status.text(),/fixture-private-token|123456789/);
  const body={network:'instagram',profileUrl:url,start:'2026-01-01',end:'2026-10-17'};
  assert.equal((await original(origin+'/public/collect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})).status,401);
  assert.equal((await original(origin+'/public/collect',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer fixture-other'},body:JSON.stringify(body)})).status,403);assert.equal(providerCalls,0);
  const result=await original(origin+'/public/collect',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer fixture-own'},body:JSON.stringify(body)});
  assert.equal(result.status,200);const data:any=await result.json();assert.equal(data.snapshot.source,'official-public-api');assert.equal(data.snapshot.totalPosts,4);assert.equal(providerCalls,1);
 }finally{globalThis.fetch=original;server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));names.forEach((k,i)=>{if(previous[i]===undefined)delete process.env[k];else process.env[k]=previous[i];});}
});
