begin;
create unique index if not exists client_accounts_workspace_pair on public.client_accounts(workspace_id,id);
create table if not exists public.client_audit_runs(
 id uuid primary key,
 workspace_id uuid not null,
 business_id uuid not null,
 client_id uuid not null,
 channel text not null check(channel in ('web','networks','search','ai','combined')),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=600000 and payload ? 'channel' and payload ? 'data' and payload->>'channel'=channel),
 created_at timestamptz not null default clock_timestamp(),
 foreign key(workspace_id,business_id) references public.businesses(workspace_id,id),
 foreign key(workspace_id,client_id) references public.client_accounts(workspace_id,id)
);
create index if not exists client_audit_runs_scope_date on public.client_audit_runs(workspace_id,client_id,business_id,created_at desc);
alter table public.client_audit_runs enable row level security;
revoke all on public.client_audit_runs from public,anon,authenticated;
grant select,insert on public.client_audit_runs to authenticated;
drop policy if exists "owners read client audit runs" on public.client_audit_runs;
create policy "owners read client audit runs" on public.client_audit_runs for select to authenticated
using(exists(select 1 from public.workspaces w where w.id=client_audit_runs.workspace_id and w.owner_user_id=(select auth.uid())));
drop policy if exists "owners add client audit runs" on public.client_audit_runs;
create policy "owners add client audit runs" on public.client_audit_runs for insert to authenticated
with check(exists(select 1 from public.workspaces w where w.id=client_audit_runs.workspace_id and w.owner_user_id=(select auth.uid())) and exists(select 1 from public.client_accounts c where c.id=client_audit_runs.client_id and c.workspace_id=client_audit_runs.workspace_id and (c.payload->'businessIds') ? client_audit_runs.business_id::text));
commit;
