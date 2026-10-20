import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const read=(name:string)=>readFileSync(new URL(`../../supabase/migrations/${name}.sql`,import.meta.url),'utf8');
const baseline=read('202610090001_visibility_ai_baseline_v6').replace('create extension if not exists pgcrypto;','');
const fix=read('20261020204231_restrict_private_database_api');
const owner='11111111-1111-4111-8111-111111111111', outsider='22222222-2222-4222-8222-222222222222';

test('private API hardening removes anonymous grants without breaking owner RLS, RPCs, triggers or existing records',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;create schema storage;
   create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
   alter table storage.objects enable row level security;
   grant usage on schema public,auth to anon,authenticated,service_role;
   alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
   alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for(const sql of [baseline,read('202610090002_usage_telemetry_v7'),read('202610140001_client_accounts'),read('202610140002_launch_plan_and_business_scope'),read('202610150001_business_social_accounts'),read('20261019145910_youtube_presence'),read('20261019191113_client_audit_runs'),read('20261019211527_service_deliveries_channels')])await db.exec(sql);
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[owner,'owner@example.test',outsider,'outsider@example.test']);
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${owner}'`);
  const workspace=(await db.query<{id:string}>("select public.create_workspace_with_owner('QA preserve','qa-preserve') as id")).rows[0].id;
  await db.query("insert into client_accounts(id,workspace_id,payload) values(gen_random_uuid(),$1,$2)",[workspace,{payments:[{id:'preserve-payment',amount:123}],reports:[{id:'preserve-report',sentAt:'2026-10-19T12:00:00Z'}]}]);
  await db.exec('reset role');
  const before=(await db.query('select id,workspace_id,payload,updated_at from client_accounts')).rows;
  await db.exec(fix);await db.exec(fix);
  assert.deepEqual((await db.query('select id,workspace_id,payload,updated_at from client_accounts')).rows,before);
  const acl=await db.query<{name:string,anonymous:boolean,signed_in:boolean}>(`select p.proname name,has_function_privilege('anon',p.oid,'EXECUTE') anonymous,has_function_privilege('authenticated',p.oid,'EXECUTE') signed_in from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.prosecdef or p.proname='get_visibility_schema_readiness')`);
  assert.ok(acl.rows.length>=8);assert.ok(acl.rows.every(row=>!row.anonymous));
  assert.equal(acl.rows.find(row=>row.name==='handle_new_user')?.signed_in,false);
  await db.exec('set role anon');
  await assert.rejects(db.exec('select * from public.client_accounts'),/permission denied/);
  await assert.rejects(db.exec('select public.get_visibility_schema_readiness()'),/permission denied/);
  await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${owner}'`);
  assert.equal((await db.query('select id from public.client_accounts')).rows.length,1);
  assert.equal((await db.query<{ok:boolean}>('select public.is_workspace_member($1) ok',[workspace])).rows[0].ok,true);
  assert.equal((await db.query('select * from public.list_workspace_members($1)',[workspace])).rows.length,1);
  assert.equal((await db.query<{data:{schemaVersion:number}}>('select public.get_visibility_schema_readiness() data')).rows[0].data.schemaVersion,7);
  assert.equal((await db.query<{data:{seoAudits:number}}>('select public.get_workspace_usage_summary($1,30) data',[workspace])).rows[0].data.seoAudits,0);
  await assert.rejects(db.query("update public.workspace_members set role='viewer' where workspace_id=$1",[workspace]),/owner role cannot be changed/);
  await db.exec(`set request.jwt.claim.sub='${outsider}'`);
  assert.equal((await db.query('select * from public.client_accounts')).rows.length,0);
  assert.equal((await db.query('select * from public.list_workspace_members($1)',[workspace])).rows.length,0);
  await assert.rejects(db.query('select public.get_workspace_usage_summary($1,30)',[workspace]),/access denied/);
  await db.exec('reset role');
  // Revoking direct invocation does not disable the new-user trigger.
  await db.query('insert into auth.users(id,email) values($1,$2)',['33333333-3333-4333-8333-333333333333','trigger@example.test']);
  assert.equal((await db.query('select id from profiles')).rows.length,3);
  assert.deepEqual((await db.query('select id,workspace_id,payload,updated_at from client_accounts')).rows,before);
 }finally{await db.close();}
});
