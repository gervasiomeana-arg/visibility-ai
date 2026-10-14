import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const migration=readFileSync(new URL('../../supabase/migrations/202610140002_launch_plan_and_business_scope.sql',import.meta.url),'utf8');
const tables=['seo_audits','tracked_keywords','search_console_snapshots','opportunities','action_tasks'];
const w1='11111111-1111-4111-8111-111111111111',w2='22222222-2222-4222-8222-222222222222';
const b1='33333333-3333-4333-8333-333333333333',b2='44444444-4444-4444-8444-444444444444';
const u1='55555555-5555-4555-8555-555555555555',u2='66666666-6666-4666-8666-666666666666';

test('migration preserves existing rows, enforces new business/workspace pairs and protects the launch plan by owner',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role authenticated;create schema auth;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.workspaces(id uuid primary key,owner_user_id uuid not null);
      create table public.businesses(id uuid primary key,workspace_id uuid references public.workspaces(id));
      insert into public.workspaces values('${w1}','${u1}'),('${w2}','${u2}');
      insert into public.businesses values('${b1}','${w1}'),('${b2}','${w2}');
      grant usage on schema public,auth to authenticated;grant select on public.workspaces,public.businesses to authenticated;`);
    for(const table of tables)await db.exec(`create table public.${table}(id uuid primary key default gen_random_uuid(),workspace_id uuid references public.workspaces(id),business_id uuid references public.businesses(id));
      alter table public.${table} enable row level security;
      create policy owner_rows on public.${table} for all to authenticated using(exists(select 1 from public.workspaces w where w.id=workspace_id and w.owner_user_id=auth.uid())) with check(exists(select 1 from public.workspaces w where w.id=workspace_id and w.owner_user_id=auth.uid()));
      grant select,insert,update,delete on public.${table} to authenticated;`);
    // An existing mismatch is a local fixture, not a finding in deployed Supabase.
    await db.exec(`insert into public.seo_audits(workspace_id,business_id)values('${w1}','${b2}')`);
    await db.exec(migration);await db.exec(migration);
    assert.equal((await db.query('select * from public.seo_audits')).rows.length,1);
    await db.exec(`set role authenticated;set request.jwt.claim.sub='${u1}'`);
    for(const table of tables){
      await db.exec(`insert into public.${table}(workspace_id,business_id)values('${w1}','${b1}')`);
      await assert.rejects(db.exec(`insert into public.${table}(workspace_id,business_id)values('${w1}','${b2}')`),/foreign key constraint/);
      await assert.rejects(db.exec(`update public.${table} set workspace_id='${w2}' where business_id='${b1}'`));
    }
    const checks=await db.query<{relation_name:string;protected_writes:boolean;inconsistent_rows:number}>(`select * from public.check_business_workspace_integrity('${w1}')`);
    assert.equal(checks.rows.length,5);assert.ok(checks.rows.every(row=>row.protected_writes));
    assert.equal(Number(checks.rows.find(row=>row.relation_name==='seo_audits')!.inconsistent_rows),1);
    await db.exec(`insert into public.launch_checklists(workspace_id,payload)values('${w1}','{"checks":{}}')`);
    await assert.rejects(db.exec(`insert into public.launch_checklists(workspace_id)values('${w2}')`));
    const first=(await db.query<{updated_at:string}>(`select updated_at::text as updated_at from public.launch_checklists where workspace_id='${w1}'`)).rows[0].updated_at;
    await db.exec(`update public.launch_checklists set payload='{"checks":{"pdf":{"done":false}}}' where workspace_id='${w1}'`);
    const second=(await db.query<{updated_at:string}>(`select updated_at::text as updated_at from public.launch_checklists where workspace_id='${w1}'`)).rows[0].updated_at;
    assert.notEqual(String(first),String(second));
    const stale=await db.query('update public.launch_checklists set payload=$1 where workspace_id=$2 and updated_at=$3 returning workspace_id',[JSON.stringify({checks:{}}),w1,first]);
    assert.equal(stale.rows.length,0);
    await db.exec(`set request.jwt.claim.sub='${u2}'`);
    assert.equal((await db.query(`select * from public.launch_checklists where workspace_id='${w1}'`)).rows.length,0);
    assert.equal((await db.query(`select * from public.seo_audits where workspace_id='${w1}'`)).rows.length,0);
    await assert.rejects(db.exec(`select * from public.check_business_workspace_integrity('${w1}')`),/Only the workspace owner/);
    await db.exec('reset role');
    assert.equal((await db.query('select * from public.launch_checklists')).rows.length,1);
  }finally{await db.close();}
});
