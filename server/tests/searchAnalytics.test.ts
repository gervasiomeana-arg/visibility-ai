import test from 'node:test';
import assert from 'node:assert/strict';
import { googleSearchQueryRows, validateSearchQueryInput, validateSearchQueryResult, validateSearchQueryRows } from '../../shared/searchAnalytics';
import { querySearchAnalytics } from '../searchAnalyticsService';
import { measuredKeywords } from '../../shared/keywordWorkflow';

const input = { siteUrl: 'sc-domain:example.com', startDate: '2026-09-15', endDate: '2026-10-12', rowLimit: 100 };
const row = { query: 'consulta de prueba', clicks: 4, impressions: 100, ctr: .04, position: 8.25 };
const googleRow = { keys: [row.query], clicks: 4, impressions: 100, ctr: .04, position: 8.25 };

test('search query input requires calendar dates in order and an integer bounded row limit', () => {
  assert.deepEqual(validateSearchQueryInput(input),input);
  assert.equal(validateSearchQueryInput({ ...input, startDate: '2024-02-29', rowLimit: undefined }).rowLimit,100);
  for (const patch of [{siteUrl:''},{startDate:'2026-02-30'},{startDate:'2026-10-13'},{endDate:'invalid'},{rowLimit:NaN},{rowLimit:1.5},{rowLimit:501},{rowLimit:'100'}]) assert.throws(()=>validateSearchQueryInput({...input,...patch}));
});

test('valid Google empty results stay empty but null or malformed bodies cannot become zero-result imports', () => {
  for (const payload of [{}, { responseAggregationType: 'byProperty' }, { rows: [] }]) assert.deepEqual(googleSearchQueryRows(payload),[]);
  for (const payload of [null, [], 'html', {rows:null}, {rows:{}}, {error:'failed'}, {unexpected:'body'}, {metadata:null}]) assert.throws(()=>googleSearchQueryRows(payload),/formato válido/);
});

test('query rows preserve measured zeros and derive CTR without coercing missing or invalid numbers', () => {
  assert.deepEqual(googleSearchQueryRows({ rows: [googleRow] }),[row]);
  assert.equal(validateSearchQueryRows([{...row,ctr:.25}])[0].ctr,.04);
  const zero = googleSearchQueryRows({ rows: [{...googleRow,clicks:0,impressions:0,ctr:0,position:0}] })[0];
  assert.equal(zero.clicks,0);assert.equal(zero.impressions,0);assert.equal(zero.ctr,0);assert.equal(zero.position,0);
  for (const patch of [{clicks:undefined},{clicks:null},{clicks:'4'},{impressions:-1},{clicks:101},{clicks:1.5},{ctr:NaN},{ctr:2},{position:0},{position:Infinity},{query:''}]) {
    assert.throws(()=>validateSearchQueryRows([{...row,...patch}]),/No se importó/);
  }
  assert.throws(()=>googleSearchQueryRows({rows:[{...googleRow,keys:[]}]}));
  assert.throws(()=>googleSearchQueryRows({rows:[{...googleRow,keys:['a','b']}]}));
  assert.throws(()=>validateSearchQueryRows([row,row]),/No se importó/);
});

test('a response must identify the exact requested property and period before it becomes measured keywords', () => {
  const valid = { ...input, source:'google-search-console', rows:[row] };
  assert.equal(validateSearchQueryResult(valid,input).rows.length,1);
  for (const patch of [{siteUrl:'sc-domain:other.com'},{startDate:'2026-09-14'},{endDate:'2026-10-11'},{source:'demo'},{siteUrl:undefined},{rows:[{...row,clicks:null}]}]) {
    assert.throws(()=>validateSearchQueryResult({...valid,...patch},input),/No se importó/);
  }
  assert.throws(()=>measuredKeywords({id:'business',url:'https://example.com'} as any,[{...row,impressions:undefined}] as any),/No se importó/);
});

test('Google query service sends only finalized query scope, bounds waiting and returns confirmed identity', async () => {
  const result=await querySearchAnalytics('test-token',input,async(url,init)=>{
    assert.match(String(url),/sc-domain%3Aexample.com/);
    assert.equal(new Headers(init?.headers).get('authorization'),'Bearer test-token');
    assert.ok(init?.signal instanceof AbortSignal);
    assert.deepEqual(JSON.parse(String(init?.body)),{startDate:input.startDate,endDate:input.endDate,dimensions:['query'],rowLimit:100,dataState:'final'});
    return new Response(JSON.stringify({ rows:[googleRow] }));
  });
  assert.equal(result.source,'google-search-console');assert.equal(result.siteUrl,input.siteUrl);assert.deepEqual(result.rows,[row]);
});

test('provider failures and invalid successful responses cannot become stored empty results or expose response details', async () => {
  await assert.rejects(querySearchAnalytics('test-token',input,async()=>new Response('private diagnostics',{status:403})), error=>error instanceof Error && !error.message.includes('private') && /permisos/.test(error.message));
  for (const payload of ['<html>Error</html>','null','{"rows":[{}]}']) await assert.rejects(querySearchAnalytics('test-token',input,async()=>new Response(payload)),/No se importó/);
  await assert.rejects(querySearchAnalytics('test-token',{...input,rowLimit:1},async()=>new Response(JSON.stringify({rows:[googleRow,{...googleRow,keys:['otra consulta']}]}))),/excede el límite/);
});

test('query endpoint keeps authentication and rejects an impossible period before any Google request', async () => {
  const { default: express } = await import('express');
  const { default: router } = await import('../searchConsoleRouter');
  const names = ['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','VITE_SUPABASE_ANON_KEY'];
  const previous = names.map(name=>process.env[name]); const originalFetch=globalThis.fetch;
  process.env.VITE_SUPABASE_URL='https://auth.example';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='test-key';delete process.env.VITE_SUPABASE_ANON_KEY;
  let googleRequests=0;
  globalThis.fetch=((...args:Parameters<typeof fetch>)=>{
    if(args[0]==='https://auth.example/auth/v1/user') return Promise.resolve(new Response(JSON.stringify({id:'test-user'})));
    if(String(args[0]).includes('googleapis.com')) {googleRequests++;throw Error('Unexpected Google request');}
    return originalFetch(...args);
  }) as typeof fetch;
  const app=express();app.use(express.json());app.use('/api/search-console',router);
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.on('listening',resolve));
  const endpoint=`http://127.0.0.1:${(server.address() as any).port}/api/search-console/query`;
  try {
    assert.equal((await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})).status,401);
    const invalid=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test-token'},body:JSON.stringify({...input,startDate:'2026-02-30'})});
    assert.equal(invalid.status,400);assert.equal(googleRequests,0);
  }finally{
    globalThis.fetch=originalFetch;names.forEach((name,index)=>{if(previous[index]===undefined)delete process.env[name];else process.env[name]=previous[index];});
    await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  }
});
