import test from 'node:test';
import assert from 'node:assert/strict';
import {geminiQuotaDiagnostic,geminiQuotaMessage} from '../../shared/geminiQuota';
import {classifyAiFailure,createGeminiGenerator,sendAiFailure} from '../geminiService';
import {youtubeConfigured} from '../youtubePublic';
import {samePresenceContext,type PresenceObservation} from '../../shared/presenceAnalysis';
const quota=(metric:string,id:string)=>({'@type':'type.googleapis.com/google.rpc.QuotaFailure',violations:[{quotaMetric:metric,quotaId:id,quotaDimensions:{project:'PRIVATE_PROJECT'},description:'PRIVATE_PROVIDER_TEXT'}]});
const retry=(retryDelay:string)=>({'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay});
test('Gemini structured quota identifies minute/day/search and retains a bounded provider retry delay without private data',()=>{
 const diagnostic=geminiQuotaDiagnostic({status:429,message:JSON.stringify({error:{message:'PRIVATE_KEY',details:[quota('generativelanguage.googleapis.com/generate_content_free_tier_requests','GenerateRequestsPerMinutePerProjectPerModel'),retry('2.3s')]}})});
 assert.deepEqual(diagnostic,{window:'minute',service:'generation',retryAfterSeconds:3});
 assert.doesNotMatch(JSON.stringify(diagnostic),/PRIVATE/);
 assert.match(geminiQuotaMessage(diagnostic),/por minuto/);assert.match(geminiQuotaMessage(diagnostic),/al menos 3 segundos/);
 const daily=geminiQuotaDiagnostic({error:{details:[quota('generativelanguage.googleapis.com/google_search_requests_per_day','GroundingRequestsPerDayPerProject')]}});
 assert.equal(daily.window,'day');assert.equal(daily.service,'search');assert.match(geminiQuotaMessage(daily),/límite diario de búsqueda/);
});
test('unstructured quota messages never fabricate a reset time, credits balance, project identifier or quota type',()=>{
 for(const error of [{message:'per day PRIVATE_KEY retry in 20s'},{details:[quota('private.example/generate_content_per_day','PerDay'),retry('-1s'),retry('9999999999s')]},{details:[{violations:[{quotaMetric:'generativelanguage.googleapis.com/generate_content_per_day'}]}]},null]) {
  const d=geminiQuotaDiagnostic(error);assert.deepEqual(d,{window:'unknown',service:'unknown'});assert.match(geminiQuotaMessage(d),/no fue especificada/);
 }
});
test('Gemini failure preserves diagnostics through generator, returns retry hint, logs no raw provider body and does not retry quota',async()=>{
 let calls=0;
 const generate=createGeminiGenerator({key:()=> 'PRIVATE_KEY',client:()=>({models:{generateContent:async()=>{calls++;throw {status:429,error:{details:[quota('generativelanguage.googleapis.com/generate_content_requests','RequestsPerDay'),retry('40s')],message:'PRIVATE_KEY'}};}}})});
 let failure:any;try{await generate({model:'gemini-3.8-flash',contents:'PRIVATE_PROMPT'});}catch(e){failure=e;}
 assert.equal(calls,1);assert.equal(classifyAiFailure(failure).quota?.window,'day');
 const original=console.error,logs:string[]=[],headers:Record<string,string>={};let body:any,status:number|undefined;
 console.error=(v:any)=>logs.push(String(v));
 try{sendAiFailure({locals:{requestId:'fixture'},setHeader(k:string,v:string){headers[k]=v;},status(v:number){status=v;return this;},json(v:any){body=v;return this;}} as any,failure,'presence_research');}
 finally{console.error=original;}
 assert.equal(status,503);assert.equal(headers['Retry-After'],'40');assert.equal(body.retryAfterSeconds,40);assert.equal(body.quota.window,'day');assert.doesNotMatch(JSON.stringify({body,logs,headers}),/PRIVATE/);
});
test('YouTube empty and placeholder credentials are not reported as configured; actual values are never returned',()=>{
 for(const key of ['', ' ', 'MY_YOUTUBE_API_KEY', ' MY_YOUTUBE_API_KEY '])assert.equal(youtubeConfigured(key),false);
 assert.equal(youtubeConfigured('private-test-fixture'),true);
});
test('pending research cannot be reassigned after changing client, query, country, language or device',()=>{
 const context={workspaceId:'w',businessId:'b',query:'query',market:'Argentina',language:'Español',device:'desktop',platform:'gemini' as const};
 const draft={...context} as PresenceObservation;
 assert.equal(samePresenceContext(draft,context),true);
 for(const key of Object.keys(context))assert.equal(samePresenceContext(draft,{...context,[key]:'different'}),false,key);
});
test('installed Gemini SDK retains structured quota details while generation makes only one call',async()=>{
 const {GoogleGenAI}=await import('@google/genai');let calls=0;
 const generate=createGeminiGenerator({key:()=> 'PRIVATE_KEY',client:key=>new GoogleGenAI({apiKey:key,httpOptions:{fetch:async()=>{calls++;return Response.json({error:{code:429,status:'RESOURCE_EXHAUSTED',message:'PRIVATE_PROVIDER_TEXT',details:[quota('generativelanguage.googleapis.com/generate_content_requests','RequestsPerMinute'),retry('12s')]}},{status:429});}}})});
 await assert.rejects(generate({model:'gemini-3.8-flash',contents:'PRIVATE_PROMPT'}),(e:any)=>e.kind==='quota'&&e.quota.window==='minute'&&e.quota.retryAfterSeconds===12);
 assert.equal(calls,1);
});
test('integration status requires authentication and reveals only configuration presence and safe model metadata',async()=>{
 const express=(await import('express')).default,router=(await import('../aiRouter')).default;
 const names=['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','VITE_SUPABASE_ANON_KEY','GEMINI_API_KEY','GEMINI_MODEL','YOUTUBE_API_KEY'];
 const before=names.map(n=>process.env[n]),original=globalThis.fetch;
 process.env.VITE_SUPABASE_URL='https://auth.example';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='PRIVATE_PUBLISHABLE_FIXTURE';delete process.env.VITE_SUPABASE_ANON_KEY;
 process.env.GEMINI_API_KEY='PRIVATE_GEMINI_FIXTURE';process.env.GEMINI_MODEL='gemini-3.8-flash';process.env.YOUTUBE_API_KEY='PRIVATE_YOUTUBE_FIXTURE';
 globalThis.fetch=async (url,init)=>String(url)==='https://auth.example/auth/v1/user'?Response.json({id:'fixture-user'}):original(url,init);
 const app=express();app.use(router);const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));
 const url=`http://127.0.0.1:${(server.address() as any).port}/integrations/status`;
 try{
  assert.equal((await original(url)).status,401);
  const response=await original(url,{headers:{authorization:'Bearer PRIVATE_BEARER_FIXTURE'}});assert.equal(response.status,200);const body=await response.json();
  assert.deepEqual(body,{gemini:{configured:true,model:'gemini-3.8-flash',quota:'not-checked'},youtube:{configured:true,missing:[]}});assert.doesNotMatch(JSON.stringify(body),/PRIVATE/);
  process.env.YOUTUBE_API_KEY='MY_YOUTUBE_API_KEY';const missing=await(await original(url,{headers:{authorization:'Bearer PRIVATE_BEARER_FIXTURE'}})).json();assert.deepEqual(missing.youtube,{configured:false,missing:['YOUTUBE_API_KEY']});
 }finally{globalThis.fetch=original;server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));names.forEach((n,i)=>{if(before[i]===undefined)delete process.env[n];else process.env[n]=before[i];});}
});
