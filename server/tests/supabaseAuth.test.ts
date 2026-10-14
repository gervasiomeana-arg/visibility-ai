import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { requireSupabaseAuth } from '../supabaseAuth';

async function withAuthEnvironment(configured: boolean, response: () => Promise<Response | globalThis.Response>, run: () => Promise<void>) {
  const names=['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','VITE_SUPABASE_ANON_KEY'];
  const previous=names.map(name=>process.env[name]);
  const originalFetch=globalThis.fetch;
  process.env.VITE_SUPABASE_URL=configured?'https://auth.example':'MY_SUPABASE_URL';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY=configured?'test-key':'MY_SUPABASE_PUBLISHABLE_KEY';
  delete process.env.VITE_SUPABASE_ANON_KEY;
  globalThis.fetch=(async(...args:Parameters<typeof fetch>)=>{
    assert.ok(args[1]?.signal instanceof AbortSignal);
    return await response() as globalThis.Response;
  }) as typeof fetch;
  try {await run();} finally {
    globalThis.fetch=originalFetch;
    names.forEach((name,index)=>{if(previous[index]===undefined)delete process.env[name];else process.env[name]=previous[index];});
  }
}

async function request(token?:string) {
  let status=200,body:unknown,nextCalls=0;
  const res={locals:{} as Record<string,unknown>,status(code:number){status=code;return this;},json(value:unknown){body=value;return this;}};
  await requireSupabaseAuth({headers:token?{authorization:`Bearer ${token}`}:{}} as Request,res as unknown as Response,()=>{nextCalls++;});
  return {status,body,nextCalls,user:res.locals.authUser};
}

test('missing Supabase configuration blocks protected requests instead of bypassing authentication',async()=>{
  let calls=0;
  await withAuthEnvironment(false,async()=>{calls++;return new globalThis.Response();},async()=>{
    const result=await request('token');
    assert.equal(result.status,503);assert.equal(result.nextCalls,0);assert.equal(calls,0);
    assert.ok(JSON.stringify(result.body).includes('no está configurada'));
  });
});

test('missing and rejected tokens stay unauthorized and never reach the protected handler',async()=>{
  for(const code of [401,403])await withAuthEnvironment(true,async()=>new globalThis.Response('{}',{status:code}),async()=>{
    assert.equal((await request()).status,401);
    const result=await request('expired');assert.equal(result.status,401);assert.equal(result.nextCalls,0);
  });
});

test('validated user reaches the handler with confirmed identity and no token in the response',async()=>{
  await withAuthEnvironment(true,async()=>new globalThis.Response(JSON.stringify({id:'confirmed-user',email:'owner@example.com'})),async()=>{
    const result=await request('private-token');assert.equal(result.status,200);assert.equal(result.nextCalls,1);
    assert.deepEqual(result.user,{id:'confirmed-user',email:'owner@example.com'});
    assert.equal(result.body,undefined);
  });
});

test('service failures, network errors and malformed identity responses are unavailable, not expired sessions',async()=>{
  for(const response of [
    async()=>new globalThis.Response('private diagnostic details',{status:503}),
    async()=>{throw Error('private-token network details');},
    async()=>new globalThis.Response(JSON.stringify({id:123})),
    async()=>new globalThis.Response('not JSON'),
  ])await withAuthEnvironment(true,response,async()=>{
    const result=await request('private-token');assert.equal(result.status,503);assert.equal(result.nextCalls,0);
    assert.ok(JSON.stringify(result.body).includes('no confirma que tu sesión haya vencido'));
    assert.ok(!JSON.stringify(result.body).includes('private'));
  });
});
