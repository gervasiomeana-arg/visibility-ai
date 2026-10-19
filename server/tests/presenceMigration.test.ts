import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const initial=readFileSync(new URL('../../supabase/migrations/202610150001_business_social_accounts.sql',import.meta.url),'utf8');
const migration=readFileSync(new URL('../../supabase/migrations/20261019145910_youtube_presence.sql',import.meta.url),'utf8');
const w1='11111111-1111-4111-8111-111111111111',w2='22222222-2222-4222-8222-222222222222',b1='33333333-3333-4333-8333-333333333333',b2='44444444-4444-4444-8444-444444444444',u1='55555555-5555-4555-8555-555555555555',u2='66666666-6666-4666-8666-666666666666',id='77777777-7777-4777-8777-777777777777';
test('Presence migration preserves social history, permits YouTube, restricts anonymous/other owners and is append-only',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.workspaces(id uuid primary key,owner_user_id uuid not null);create table public.businesses(id uuid primary key,workspace_id uuid references public.workspaces(id));insert into public.workspaces values('${w1}','${u1}'),('${w2}','${u2}');insert into public.businesses values('${b1}','${w1}'),('${b2}','${w2}');grant usage on schema public,auth to authenticated,anon;grant select on public.workspaces,public.businesses to authenticated;`);
 await db.exec(initial);await db.exec(`insert into business_social_accounts values('${w1}','${b1}','instagram','{}',default)`);await db.exec(migration);await db.exec(migration);
 assert.equal((await db.query('select * from business_social_accounts')).rows.length,1);
 await db.exec(`set role anon`);await assert.rejects(db.exec('select * from business_presence_observations'),/permission denied/);await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${u1}'`);
 await db.exec(`insert into business_social_accounts values('${w1}','${b1}','youtube','{}',default)`);
 await db.exec(`insert into business_presence_observations values('${id}','${w1}','${b1}','2026-01-01','{}')`);
 await assert.rejects(db.exec(`insert into business_presence_observations values('88888888-8888-4888-8888-888888888888','${w1}','${b2}','2026-01-01','{}')`),/foreign key/);
 await assert.rejects(db.exec('update business_presence_observations set payload=\'{}\''),/permission denied/);
 await assert.rejects(db.exec('delete from business_presence_observations'),/permission denied/);
 await db.exec(`set request.jwt.claim.sub='${u2}'`);assert.equal((await db.query('select * from business_presence_observations')).rows.length,0);
 await assert.rejects(db.exec(`insert into business_presence_observations values('99999999-9999-4999-8999-999999999999','${w1}','${b1}','2026-01-01','{}')`),/row-level security/);
 }finally{await db.close();}
});
