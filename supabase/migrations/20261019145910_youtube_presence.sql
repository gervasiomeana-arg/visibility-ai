begin;
-- Expand supported channels without rewriting or deleting existing client observations.
alter table public.business_social_accounts drop constraint if exists business_social_accounts_network_check;
alter table public.business_social_accounts add constraint business_social_accounts_network_check check (network in ('facebook','instagram','tiktok','youtube'));
create table if not exists public.business_presence_observations (
 id uuid primary key,
 workspace_id uuid not null,
 business_id uuid not null,
 observed_at timestamptz not null check (observed_at <= now()),
 payload jsonb not null check (jsonb_typeof(payload)='object'),
 foreign key(workspace_id,business_id) references public.businesses(workspace_id,id) on delete cascade
);
create index if not exists business_presence_scope_date on public.business_presence_observations(workspace_id,business_id,observed_at desc);
alter table public.business_presence_observations enable row level security;
revoke all on public.business_presence_observations from public,anon,authenticated;
-- Append-only evidence history; corrections are new observations, not silent rewrites.
grant select,insert on public.business_presence_observations to authenticated;
drop policy if exists "owners read presence observations" on public.business_presence_observations;
create policy "owners read presence observations" on public.business_presence_observations for select to authenticated
using(exists(select 1 from public.workspaces w where w.id=business_presence_observations.workspace_id and w.owner_user_id=(select auth.uid())));
drop policy if exists "owners add presence observations" on public.business_presence_observations;
create policy "owners add presence observations" on public.business_presence_observations for insert to authenticated
with check(exists(select 1 from public.workspaces w where w.id=business_presence_observations.workspace_id and w.owner_user_id=(select auth.uid())));
commit;
