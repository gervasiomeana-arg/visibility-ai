import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const original = readFileSync(new URL('../../supabase/migrations/202610140001_client_accounts.sql', import.meta.url), 'utf8');
const fix = readFileSync(new URL('../../supabase/migrations/202610140003_client_report_storage_policy.sql', import.meta.url), 'utf8');
const w1='11111111-1111-4111-8111-111111111111', w2='22222222-2222-4222-8222-222222222222';
const c1='33333333-3333-4333-8333-333333333333', c2='44444444-4444-4444-8444-444444444444';
const u1='55555555-5555-4555-8555-555555555555', u2='66666666-6666-4666-8666-666666666666';
const path1=`${w1}/${c1}/77777777-7777-4777-8777-777777777777.pdf`;

test('storage policy reproduces the owner upload rejection and fixes name binding while preserving isolation', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role authenticated; create role anon; create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.workspaces(id uuid primary key,name text not null,owner_user_id uuid not null);
      insert into public.workspaces values('${w1}','Agencia Meana','${u1}'),('${w2}','Otra agencia','${u2}');
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null);
      alter table storage.objects enable row level security;
      grant usage on schema public,auth,storage to authenticated,anon;
      grant select on public.workspaces to authenticated;
      grant select,insert,update,delete on storage.objects to authenticated,anon;`);
    await db.exec(original);
    await db.exec(`insert into public.client_accounts(id,workspace_id,payload) values('${c1}','${w1}','{}'),('${c2}','${w2}','{}');
      insert into storage.objects(bucket_id,name) values('visibility-client-reports','${w2}/${c2}/existing.pdf');
      set role authenticated;set request.jwt.claim.sub='${u1}'`);
    await assert.rejects(db.exec(`insert into storage.objects(bucket_id,name) values('visibility-client-reports','${path1}')`), /row-level security/);
    await db.exec('reset role');
    await db.exec(fix); await db.exec(fix);
    assert.equal((await db.query('select * from storage.objects')).rows.length,1);
    assert.equal((await db.query<{public:boolean}>(`select public from storage.buckets where id='visibility-client-reports'`)).rows[0].public,false);
    await db.exec(`set role authenticated;set request.jwt.claim.sub='${u1}'`);
    await db.exec(`insert into storage.objects(bucket_id,name) values('visibility-client-reports','${path1}')`);
    assert.equal((await db.query('select * from storage.objects')).rows.length,1);
    for (const path of [`${w2}/${c2}/foreign.pdf`,`${w1}/${c2}/mixed.pdf`,`${w1}/missing-client/report.pdf`]) {
      await assert.rejects(db.exec(`insert into storage.objects(bucket_id,name) values('visibility-client-reports','${path}')`), /row-level security/);
    }
    await assert.rejects(db.exec(`update storage.objects set name='${w2}/${c2}/moved.pdf' where name='${path1}'`), /row-level security/);
    await db.exec(`set request.jwt.claim.sub='${u2}'`);
    assert.equal((await db.query(`select * from storage.objects where name='${path1}'`)).rows.length,0);
    assert.equal((await db.query(`delete from storage.objects where name='${path1}' returning id`)).rows.length,0);
    await assert.rejects(db.exec(`insert into storage.objects(bucket_id,name) values('visibility-client-reports','${w1}/${c1}/not-owner.pdf')`), /row-level security/);
    await db.exec(`set role anon;set request.jwt.claim.sub=''`);
    assert.equal((await db.query('select * from storage.objects')).rows.length,0);
    await assert.rejects(db.exec(`insert into storage.objects(bucket_id,name) values('visibility-client-reports','${w1}/${c1}/anonymous.pdf')`), /row-level security/);
    await db.exec('reset role');
    assert.equal((await db.query('select * from storage.objects')).rows.length,2);
  } finally { await db.close(); }
});
