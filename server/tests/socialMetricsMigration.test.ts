import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const migration = readFileSync(new URL('../../supabase/migrations/202610150001_business_social_accounts.sql', import.meta.url), 'utf8');
const w1='11111111-1111-4111-8111-111111111111',w2='22222222-2222-4222-8222-222222222222';
const b1='33333333-3333-4333-8333-333333333333',b2='44444444-4444-4444-8444-444444444444';
const u1='55555555-5555-4555-8555-555555555555',u2='66666666-6666-4666-8666-666666666666';
test('social migration is repeatable, preserves rows, isolates owners/businesses and rejects stale writes', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role authenticated;create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.workspaces(id uuid primary key,owner_user_id uuid not null);
      create table public.businesses(id uuid primary key,workspace_id uuid references public.workspaces(id));
      insert into public.workspaces values('${w1}','${u1}'),('${w2}','${u2}');
      insert into public.businesses values('${b1}','${w1}'),('${b2}','${w2}');
      grant usage on schema public,auth to authenticated;grant select on public.workspaces,public.businesses to authenticated;`);
    await db.exec(migration);
    await db.exec(`set role authenticated;set request.jwt.claim.sub='${u1}'`);
    await db.exec(`insert into public.business_social_accounts values('${w1}','${b1}','instagram','{"profileUrl":"https://instagram.com/business"}',default)`);
    await assert.rejects(db.exec(`insert into public.business_social_accounts values('${w1}','${b2}','tiktok','{}',default)`), /foreign key/);
    await assert.rejects(db.exec(`insert into public.business_social_accounts values('${w2}','${b2}','tiktok','{}',default)`), /row-level security/);
    const first = (await db.query<{updated_at:string}>(`select updated_at::text from public.business_social_accounts`)).rows[0].updated_at;
    await db.exec(`update public.business_social_accounts set payload='{"profileUrl":"https://instagram.com/business","measurements":[]}'`);
    const stale = await db.query(`update public.business_social_accounts set payload='{}' where updated_at=$1 returning business_id`, [first]);
    assert.equal(stale.rows.length, 0);
    await assert.rejects(db.exec(`update public.business_social_accounts set network='facebook'`), /cannot change/);
    await db.exec(`set request.jwt.claim.sub='${u2}'`);
    assert.equal((await db.query('select * from public.business_social_accounts')).rows.length, 0);
    assert.equal((await db.query(`update public.business_social_accounts set payload='{}' returning business_id`)).rows.length, 0);
    await db.exec('reset role'); await db.exec(migration);
    assert.equal((await db.query('select * from public.business_social_accounts')).rows.length, 1);
  } finally { await db.close(); }
});
