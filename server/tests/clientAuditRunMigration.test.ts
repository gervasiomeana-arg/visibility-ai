import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
const migration=readFileSync(new URL('../../supabase/migrations/20261019191113_client_audit_runs.sql',import.meta.url),'utf8');
const w1='11111111-1111-4111-8111-111111111111',w2='22222222-2222-4222-8222-222222222222',b1='33333333-3333-4333-8333-333333333333',b2='44444444-4444-4444-8444-444444444444',u1='55555555-5555-4555-8555-555555555555',u2='66666666-6666-4666-8666-666666666666',c1='77777777-7777-4777-8777-777777777777',c2='88888888-8888-4888-8888-888888888888';
test('new history is append-only and isolates owners, clients, workspaces and business associations without rewriting old records',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.workspaces(id uuid primary key,owner_user_id uuid not null);create table public.businesses(id uuid,workspace_id uuid,unique(workspace_id,id));create table public.client_accounts(id uuid,workspace_id uuid,payload jsonb);insert into public.workspaces values('${w1}','${u1}'),('${w2}','${u2}');insert into public.businesses values('${b1}','${w1}'),('${b2}','${w1}');insert into public.client_accounts values('${c1}','${w1}','{"businessIds":["${b1}"],"payments":[{"id":"preserve"}]}'),('${c2}','${w1}','{"businessIds":["${b2}"]}');grant usage on schema public,auth to authenticated,anon;grant select on public.workspaces,public.client_accounts to authenticated;`);
 await db.exec(migration);await db.exec(migration);
 await db.exec(`set role anon`);await assert.rejects(db.exec('select * from client_audit_runs'),/permission denied/);
 await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${u1}'`);
 const insert=(id:string,workspace:string,business:string,client:string)=>db.exec(`insert into client_audit_runs(id,workspace_id,business_id,client_id,channel,payload) values('${id}','${workspace}','${business}','${client}','web','{"channel":"web","data":{}}')`);
 await insert('99999999-9999-4999-8999-999999999999',w1,b1,c1);
 await assert.rejects(insert('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',w1,b2,c1),/row-level security/);
 await assert.rejects(insert('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',w1,b1,c2),/row-level security/);
 await assert.rejects(insert('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w2,b1,c1),/row-level security/);
 await assert.rejects(db.exec("update client_audit_runs set payload='{}'"),/permission denied/);await assert.rejects(db.exec('delete from client_audit_runs'),/permission denied/);
 await db.exec(`set request.jwt.claim.sub='${u2}'`);assert.equal((await db.query('select * from client_audit_runs')).rows.length,0);
 await db.exec('reset role');assert.match(JSON.stringify((await db.query('select payload from client_accounts where id=$1',[c1])).rows),/preserve/);
 }finally{await db.close();}
});
