import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import {googleBusinessScope,validateGoogleBusinessSnapshot} from '../../shared/googleBusiness';
import {listBusinessAccounts,listBusinessLocations,GoogleBusinessError} from '../googleBusinessService';
import router,{openBusiness,sealBusiness} from '../googleBusinessRouter';
import {requireVisibilityOperator} from '../operatorAccess';
import {visibilityOperatorId} from '../../shared/operatorAccess';
import {auditRunBlocks,validateAuditRun,type AuditRun} from '../../shared/auditRun';
// Isolated fixtures. Never write these names or measurements to production.
test('official business accounts follow pagination without treating provider failures as empty lists',async()=>{
 let calls=0;const accounts=await listBusinessAccounts('fixture',async(u,init)=>{calls++;assert.equal(new URL(String(u)).hostname,'mybusinessaccountmanagement.googleapis.com');assert.equal(init?.redirect,'error');assert.equal(new Headers(init?.headers).get('authorization'),'Bearer fixture');return new Response(JSON.stringify(calls===1?{accounts:[{name:'accounts/1',accountName:'Fixture'}],nextPageToken:'page2'}:{accounts:[{name:'accounts/2',accountName:'Fixture2'}]}));});assert.equal(accounts.length,2);assert.equal(calls,2);
 await assert.rejects(listBusinessAccounts('fixture',async()=>new Response(JSON.stringify({unexpected:'bad'}))),/inválida/);
 await assert.rejects(listBusinessAccounts('fixture',async()=>new Response(JSON.stringify({error:{details:[{reason:'SERVICE_DISABLED',secret:'not public'}]}}),{status:403})),e=>e instanceof GoogleBusinessError&&e.code==='api_disabled'&&!e.message.includes('not public'));
 await assert.rejects(listBusinessAccounts('fixture',async()=>new Response('{}',{status:429})),e=>e instanceof GoogleBusinessError&&e.code==='quota');
});
test('location reads stay on fixed official API and preserve unknown fields instead of zero metrics',async()=>{
 const locations=await listBusinessLocations('fixture','accounts/1',async(u)=>{const url=new URL(String(u));assert.equal(url.pathname,'/v1/accounts/1/locations');assert.match(url.searchParams.get('readMask')!,/regularHours/);return new Response(JSON.stringify({locations:[{name:'locations/2',title:'Fixture',websiteUri:'https://example.com',storefrontAddress:{addressLines:['Example 1'],locality:'Test'},categories:{primaryCategory:{displayName:'Fixture category'}}}]}));});assert.equal(locations[0].phone,undefined);assert.equal(locations[0].address,'Example 1, Test');
 await assert.rejects(listBusinessLocations('fixture','https://evil.example/',async()=>{throw Error('must not fetch');}),/identificador/);
 await assert.rejects(listBusinessLocations('fixture','accounts/1',async()=>new Response('{"locations":[{}]}')),/identificador/);
});
test('business profile evidence retains its observation date and has no invented historical metrics',()=>{
 const observedAt='2026-10-24T00:00:00Z',snapshot=validateGoogleBusinessSnapshot({source:'google-business-profile',observedAt,account:'accounts/1',location:{name:'locations/2',title:'Fixture'}});
 const run:AuditRun={id:'r',workspaceId:'w',businessId:'b',clientId:'c',businessName:'Fixture',channel:'search',observedAt,periodStart:'2026-10-24',periodEnd:'2026-10-24',data:{kind:'google-business',snapshot}};
 const text=auditRunBlocks(run).map(b=>b.text).join('\n');assert.match(text,/Google Business Information API/);assert.match(text,/Teléfono: Sin dato verificado/);assert.match(text,/No acredita verificación de propiedad/);assert.doesNotMatch(text,/Alcance: 0/);assert.throws(()=>validateAuditRun({...run,periodStart:'2026-01-01'}));
});
test('OAuth isolates Business Profile from Search Console, binds state to owner and nonce, encrypts HttpOnly session, and rejects foreign users',async()=>{
 const names=['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','APP_URL','SEARCH_CONSOLE_TOKEN_KEY','VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'];const before=names.map(n=>process.env[n]);const original=globalThis.fetch;
 Object.assign(process.env,{GOOGLE_CLIENT_ID:'fixture-client',GOOGLE_CLIENT_SECRET:'fixture-secret',APP_URL:'https://app.example',SEARCH_CONSOLE_TOKEN_KEY:Buffer.alloc(32,1).toString('base64'),VITE_SUPABASE_URL:'https://auth.example',VITE_SUPABASE_PUBLISHABLE_KEY:'fixture-key'});
 let tokenCalls=0;globalThis.fetch=(async(u,init)=>{if(String(u)==='https://auth.example/auth/v1/user'){const h=new Headers(init?.headers).get('authorization');return new Response(JSON.stringify({id:h==='Bearer owner'?visibilityOperatorId:'outsider'}));}if(String(u)==='https://oauth2.googleapis.com/token'){tokenCalls++;return new Response(JSON.stringify({access_token:'fixture-google-token',refresh_token:'fixture-refresh',expires_in:3600,scope:googleBusinessScope}));}return original(u,init);}) as typeof fetch;
 const app=express();app.use(express.json());app.use('/api',requireVisibilityOperator);app.use('/api/google-business',router);const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as any).port}/api/google-business`;
 try{
 assert.equal((await original(base+'/status')).status,401);assert.equal((await original(base+'/status',{headers:{authorization:'Bearer outsider'}})).status,403);
 const start=await original(base+'/auth/start',{method:'POST',headers:{authorization:'Bearer owner'}});assert.equal(start.status,200);const {authUrl}=await start.json() as any;const url=new URL(authUrl);assert.equal(url.searchParams.get('scope'),googleBusinessScope);assert.equal(url.searchParams.get('redirect_uri'),'https://app.example/api/google-business/oauth/callback');const state=url.searchParams.get('state')!;assert.ok(!state.includes('owner'));const nonceCookie=start.headers.get('set-cookie')!.split(';')[0];
 assert.equal((await original(base+'/oauth/callback?code=fixture&state='+encodeURIComponent(state),{redirect:'manual'})).status,400);assert.equal(tokenCalls,0);
 const success=await original(base+'/oauth/callback?code=fixture&state='+encodeURIComponent(state),{headers:{cookie:nonceCookie},redirect:'manual'});assert.equal(success.status,302);const cookies=success.headers.getSetCookie();const sessionCookie=cookies.find(c=>c.startsWith('visibility_gbp='))!;assert.match(sessionCookie,/HttpOnly/);assert.match(sessionCookie,/Secure/);assert.match(sessionCookie,/SameSite=Lax/);assert.ok(!cookies.join(';').includes('visibility_gsc'));assert.ok(!sessionCookie.includes('fixture-google-token'));assert.equal(openBusiness(sessionCookie.split(';')[0].split('=')[1]).userId,visibilityOperatorId);
 const status=await original(base+'/status',{headers:{authorization:'Bearer owner',cookie:sessionCookie.split(';')[0]}});const body:any=await status.json();assert.equal(body.connected,true);assert.equal(body.externalCheckPerformed,false);assert.ok(!JSON.stringify(body).includes('fixture-google-token'));
 const expired=sealBusiness({purpose:'oauth',createdAt:Date.now()-700000,nonce:nonceCookie.split('=')[1],userId:visibilityOperatorId,authToken:'owner'});assert.equal((await original(base+'/oauth/callback?code=fixture&state='+encodeURIComponent(expired),{headers:{cookie:nonceCookie},redirect:'manual'})).status,400);assert.equal(tokenCalls,1);
 }finally{globalThis.fetch=original;names.forEach((n,i)=>{if(before[i]===undefined)delete process.env[n];else process.env[n]=before[i];});server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
