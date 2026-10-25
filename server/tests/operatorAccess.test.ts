import test from'node:test';import assert from'node:assert/strict';import{once}from'node:events';import type{AddressInfo}from'node:net';import express from'express';import{requireVisibilityOperator}from'../operatorAccess';import{visibilityOperatorId,isVisibilityOperator}from'../../shared/operatorAccess';
test('operator identity ignores email, roles and editable claims',()=>{
 assert.ok(isVisibilityOperator({id:visibilityOperatorId}));assert.equal(isVisibilityOperator({id:visibilityOperatorId,is_anonymous:true}),false);assert.equal(isVisibilityOperator({id:'outsider'}),false);assert.equal(isVisibilityOperator(null),false);
});
test('the API entry gate blocks other verified accounts before paid providers and verifies the owner only once',async()=>{
 const previous={url:process.env.VITE_SUPABASE_URL,key:process.env.VITE_SUPABASE_PUBLISHABLE_KEY};process.env.VITE_SUPABASE_URL='https://auth.example';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='fixture';const original=globalThis.fetch;let authCalls=0,handlerCalls=0;
 globalThis.fetch=(async(input,init)=>{if(String(input).startsWith('https://auth.example')){authCalls++;const token=new Headers(init?.headers).get('authorization');return Response.json({id:token==='Bearer operator'?visibilityOperatorId:'outsider',email:'gervasiomeana@gmail.com',user_metadata:{role:'owner',id:visibilityOperatorId}});}return original(input,init);})as typeof fetch;
 const app=express();app.use(requireVisibilityOperator);app.all('*',(_req,res)=>{handlerCalls++;res.json({ok:true});});const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+(server.address()as AddressInfo).port;
 try{
  for(const path of ['/social/public/collect','/presence/research','/search-console/sites','/search-console/auth/start','/integrations/status']){const r=await original(base+path,{headers:{authorization:'Bearer outsider'}});assert.equal(r.status,403);}
  assert.equal(handlerCalls,0);assert.equal((await original(base+'/presence/research')).status,401);
  const before=authCalls;assert.equal((await original(base+'/social/public/collect',{headers:{authorization:'Bearer operator'}})).status,200);assert.equal(authCalls-before,1);
  assert.equal((await original(base+'/search-console/status')).status,200);assert.equal((await original(base+'/search-console/oauth/callback')).status,200);
 }finally{globalThis.fetch=original;for(const [name,value]of [['VITE_SUPABASE_URL',previous.url],['VITE_SUPABASE_PUBLISHABLE_KEY',previous.key]]){if(value===undefined)delete process.env[name!];else process.env[name!]=value;}server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
