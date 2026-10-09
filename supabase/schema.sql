-- Visibility AI · Phase 3 multi-tenant foundation
-- Run in Supabase SQL Editor once per project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null default 'growth'
    check (plan_id in ('diagnostic','monitor','growth','pro','agency')),
  country_code text not null default 'AR',
  currency text not null default 'USD',
  locale text not null default 'es-AR',
  timezone text not null default 'America/Argentina/Buenos_Aires',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member'
    check (role in ('admin','member','viewer')),
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  url text not null,
  category text not null default 'Pendiente de definir',
  city text not null default '',
  country text not null default '',
  country_code text not null default 'AR',
  currency text not null default 'USD',
  locale text not null default 'es-AR',
  timezone text not null default 'America/Argentina/Buenos_Aires',
  subscription_plan text not null default 'growth',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, url)
);

create table if not exists public.seo_audits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  requested_url text not null,
  final_url text,
  http_status integer,
  response_time_ms integer,
  seo_score integer,
  web_score integer,
  overall_score integer,
  unresolved_issues integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.search_console_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracked_keywords (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  keyword text not null,
  source text not null default 'manual'
    check (source in ('manual')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, keyword)
);

create table if not exists public.search_console_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  site_url text not null,
  period_start date not null,
  period_end date not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric not null default 0,
  position numeric not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_key text not null,
  source text not null default 'seo-audit',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, source_key)
);

create table if not exists public.action_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_key text not null,
  title text not null,
  priority text not null,
  status text not null default 'pendiente'
    check (status in ('pendiente','en_progreso','completada')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, source_key)
);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, full_name)
select
  id,
  email,
  nullif(raw_user_meta_data->>'full_name', '')
from auth.users
on conflict (id) do update
set
  email = excluded.email,
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  updated_at = now();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.businesses enable row level security;
alter table public.seo_audits enable row level security;
alter table public.search_console_snapshots enable row level security;
alter table public.tracked_keywords enable row level security;
alter table public.search_console_connections enable row level security;
alter table public.action_tasks enable row level security;
alter table public.opportunities enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row"
on public.profiles
for all
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "workspace members read workspaces" on public.workspaces;
create policy "workspace members read workspaces"
on public.workspaces
for select
using (public.is_workspace_member(id) or owner_user_id = auth.uid());

drop policy if exists "users create own workspaces" on public.workspaces;
create policy "users create own workspaces"
on public.workspaces
for insert
with check (owner_user_id = auth.uid());

drop policy if exists "owners update workspaces" on public.workspaces;
create policy "owners update workspaces"
on public.workspaces
for update
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "members read memberships" on public.workspace_members;
create policy "members read memberships"
on public.workspace_members
for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

drop policy if exists "workspace owners manage memberships" on public.workspace_members;
create policy "workspace owners manage memberships"
on public.workspace_members
for all
using (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_user_id = auth.uid()
  )
);

drop policy if exists "members access businesses" on public.businesses;
create policy "members read businesses"
on public.businesses
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "editors write businesses" on public.businesses;
create policy "editors write businesses"
on public.businesses
for all
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = businesses.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = businesses.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','member')
  )
);

drop policy if exists "members access seo audits" on public.seo_audits;
drop policy if exists "members read seo audits" on public.seo_audits;
create policy "members read seo audits"
on public.seo_audits
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "editors write seo audits" on public.seo_audits;
create policy "editors write seo audits"
on public.seo_audits
for all
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = seo_audits.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = seo_audits.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','member')
  )
);

drop policy if exists "members access search console snapshots" on public.search_console_snapshots;
drop policy if exists "members read search console snapshots" on public.search_console_snapshots;
create policy "members read search console snapshots"
on public.search_console_snapshots
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "editors write search console snapshots" on public.search_console_snapshots;
create policy "editors write search console snapshots"
on public.search_console_snapshots
for all
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = search_console_snapshots.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = search_console_snapshots.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','member')
  )
);

drop policy if exists "members access action tasks" on public.action_tasks;
create policy "members read action tasks"
on public.action_tasks
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "editors write action tasks" on public.action_tasks;
create policy "editors write action tasks"
on public.action_tasks
for all
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = action_tasks.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = action_tasks.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','member')
  )
);

create or replace function public.create_workspace_with_owner(
  workspace_name text,
  workspace_slug text,
  country_code text default 'AR',
  currency text default 'USD',
  locale text default 'es-AR',
  timezone text default 'America/Argentina/Buenos_Aires',
  plan_id text default 'growth'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.workspaces (
    name, slug, owner_user_id, country_code, currency, locale, timezone, plan_id
  )
  values (
    workspace_name, workspace_slug, auth.uid(), country_code, currency, locale, timezone, plan_id
  )
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, auth.uid(), 'owner');

  return new_workspace_id;
end;
$$;


drop policy if exists "members access opportunities" on public.opportunities;
create policy "members read opportunities"
on public.opportunities
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "editors write opportunities" on public.opportunities;
create policy "editors write opportunities"
on public.opportunities
for all
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = opportunities.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = opportunities.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','member')
  )
);


drop policy if exists "workspace owners manage invites" on public.workspace_invites;
create policy "workspace owners manage invites"
on public.workspace_invites
for all
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  )
);

create or replace function public.accept_workspace_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.workspace_invites%rowtype;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select lower(coalesce(auth.jwt()->>'email', '')) into user_email;

  select *
  into invite_row
  from public.workspace_invites
  where token = invite_token
    and accepted_at is null
    and expires_at > now();

  if invite_row.id is null then
    raise exception 'Invite not found or expired';
  end if;

  if lower(invite_row.email) <> user_email then
    raise exception 'Invite email does not match authenticated user';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (invite_row.workspace_id, auth.uid(), invite_row.role)
  on conflict (workspace_id, user_id)
  do update set role = excluded.role;

  update public.workspace_invites
  set accepted_at = now()
  where id = invite_row.id;

  return invite_row.workspace_id;
end;
$$;


drop policy if exists "users manage own search console connection" on public.search_console_connections;
create policy "users manage own search console connection"
on public.search_console_connections
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());


create or replace function public.protect_workspace_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_owner uuid;
begin
  if tg_op = 'DELETE' then
    select owner_user_id
    into workspace_owner
    from public.workspaces
    where id = old.workspace_id;

    if old.user_id = workspace_owner then
      raise exception 'Workspace owner membership cannot be removed';
    end if;

    return old;
  end if;

  select owner_user_id
  into workspace_owner
  from public.workspaces
  where id = new.workspace_id;

  if new.role = 'owner' and new.user_id <> workspace_owner then
    raise exception 'Only the workspace owner can have owner role';
  end if;

  if new.user_id = workspace_owner and new.role <> 'owner' then
    raise exception 'Workspace owner role cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_workspace_owner_membership_trigger on public.workspace_members;
create trigger protect_workspace_owner_membership_trigger
before insert or update or delete on public.workspace_members
for each row execute procedure public.protect_workspace_owner_membership();


create or replace function public.list_workspace_members(target_workspace uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  role text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    wm.user_id,
    p.email,
    p.full_name,
    wm.role
  from public.workspace_members wm
  left join public.profiles p on p.id = wm.user_id
  where wm.workspace_id = target_workspace
    and public.is_workspace_member(target_workspace)
  order by
    case wm.role
      when 'owner' then 1
      when 'admin' then 2
      when 'member' then 3
      else 4
    end,
    coalesce(p.email, wm.user_id::text);
$$;

revoke all on function public.list_workspace_members(uuid) from public;
grant execute on function public.list_workspace_members(uuid) to authenticated;


drop policy if exists "members read tracked keywords" on public.tracked_keywords;
create policy "members read tracked keywords"
on public.tracked_keywords
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "editors write tracked keywords" on public.tracked_keywords;
create policy "editors write tracked keywords"
on public.tracked_keywords
for all
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = tracked_keywords.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = tracked_keywords.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','member')
  )
);


-- Usage telemetry foundation
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  event_type text not null
    check (event_type in ('seo_audit','ai_assistant','ai_content','search_console_query')),
  units integer not null default 1 check (units >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_workspace_created_idx
on public.usage_events (workspace_id, created_at desc);

create index if not exists usage_events_workspace_type_idx
on public.usage_events (workspace_id, event_type, created_at desc);

alter table public.usage_events enable row level security;

drop policy if exists "members read usage events" on public.usage_events;
create policy "members read usage events"
on public.usage_events
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "users insert own usage events" on public.usage_events;
create policy "users insert own usage events"
on public.usage_events
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = usage_events.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','member')
  )
  and (
    business_id is null
    or exists (
      select 1
      from public.businesses b
      where b.id = usage_events.business_id
        and b.workspace_id = usage_events.workspace_id
    )
  )
);

create or replace function public.get_workspace_usage_summary(
  target_workspace uuid,
  period_days integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  safe_days integer := greatest(1, least(coalesce(period_days, 30), 365));
  result jsonb;
begin
  if not public.is_workspace_member(target_workspace) then
    raise exception 'Workspace access denied';
  end if;

  select jsonb_build_object(
    'periodDays', safe_days,
    'seoAudits', count(*) filter (where event_type = 'seo_audit'),
    'aiAssistantCalls', count(*) filter (where event_type = 'ai_assistant'),
    'aiContentGenerations', count(*) filter (where event_type = 'ai_content'),
    'aiCalls', count(*) filter (where event_type in ('ai_assistant','ai_content')),
    'aiTokens', coalesce(sum(units) filter (where event_type in ('ai_assistant','ai_content')), 0),
    'searchConsoleQueries', count(*) filter (where event_type = 'search_console_query')
  )
  into result
  from public.usage_events
  where workspace_id = target_workspace
    and created_at >= now() - make_interval(days => safe_days);

  return result;
end;
$$;

revoke all on function public.get_workspace_usage_summary(uuid, integer) from public;
grant execute on function public.get_workspace_usage_summary(uuid, integer) to authenticated;

-- Plan entitlements · business limits
create or replace function public.plan_max_businesses(plan_value text)
returns integer
language sql
immutable
as $
  select case plan_value
    when 'diagnostic' then 1
    when 'monitor' then 1
    when 'growth' then 1
    when 'pro' then 3
    when 'agency' then 30
    else 1
  end;
$;

create or replace function public.enforce_workspace_business_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $
declare
  current_plan text;
  max_businesses integer;
  current_count integer;
begin
  select plan_id
  into current_plan
  from public.workspaces
  where id = new.workspace_id;

  if current_plan is null then
    raise exception 'Workspace not found';
  end if;

  max_businesses := public.plan_max_businesses(current_plan);

  select count(*)
  into current_count
  from public.businesses
  where workspace_id = new.workspace_id
    and id <> coalesce(new.id, gen_random_uuid());

  if tg_op = 'INSERT' and current_count >= max_businesses then
    raise exception 'Business limit reached for plan % (% allowed)', current_plan, max_businesses
      using errcode = 'P0001';
  end if;

  return new;
end;
$;

drop trigger if exists enforce_workspace_business_limit_trigger on public.businesses;
create trigger enforce_workspace_business_limit_trigger
before insert on public.businesses
for each row execute procedure public.enforce_workspace_business_limit();

create or replace function public.get_workspace_entitlements(target_workspace uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $
declare
  current_plan text;
  max_businesses integer;
  used_businesses integer;
begin
  if not public.is_workspace_member(target_workspace) then
    raise exception 'Workspace access denied';
  end if;

  select plan_id
  into current_plan
  from public.workspaces
  where id = target_workspace;

  if current_plan is null then
    raise exception 'Workspace not found';
  end if;

  max_businesses := public.plan_max_businesses(current_plan);

  select count(*)
  into used_businesses
  from public.businesses
  where workspace_id = target_workspace;

  return jsonb_build_object(
    'planId', current_plan,
    'maxBusinesses', max_businesses,
    'usedBusinesses', used_businesses,
    'remainingBusinesses', greatest(max_businesses - used_businesses, 0),
    'canAddBusiness', used_businesses < max_businesses
  );
end;
$;

revoke all on function public.get_workspace_entitlements(uuid) from public;
grant execute on function public.get_workspace_entitlements(uuid) to authenticated;

-- Production schema version / readiness
create table if not exists public.visibility_schema_meta (
  singleton boolean primary key default true check (singleton = true),
  schema_version integer not null,
  schema_label text not null,
  updated_at timestamptz not null default now()
);

insert into public.visibility_schema_meta (
  singleton,
  schema_version,
  schema_label,
  updated_at
)
values (
  true,
  8,
  'phase-13-plan-entitlements',
  now()
)
on conflict (singleton) do update
set
  schema_version = excluded.schema_version,
  schema_label = excluded.schema_label,
  updated_at = excluded.updated_at;

alter table public.visibility_schema_meta enable row level security;

drop policy if exists "authenticated read schema meta" on public.visibility_schema_meta;
create policy "authenticated read schema meta"
on public.visibility_schema_meta
for select
to authenticated
using (true);

create or replace function public.get_visibility_schema_readiness()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'schemaVersion', meta.schema_version,
    'schemaLabel', meta.schema_label,
    'checks', jsonb_build_object(
      'profiles', to_regclass('public.profiles') is not null,
      'workspaces', to_regclass('public.workspaces') is not null,
      'workspaceMembers', to_regclass('public.workspace_members') is not null,
      'workspaceInvites', to_regclass('public.workspace_invites') is not null,
      'businesses', to_regclass('public.businesses') is not null,
      'seoAudits', to_regclass('public.seo_audits') is not null,
      'searchConsoleSnapshots', to_regclass('public.search_console_snapshots') is not null,
      'searchConsoleConnections', to_regclass('public.search_console_connections') is not null,
      'opportunities', to_regclass('public.opportunities') is not null,
      'actionTasks', to_regclass('public.action_tasks') is not null,
      'usageEvents', to_regclass('public.usage_events') is not null,
      'usageSummaryRpc', to_regprocedure(
        'public.get_workspace_usage_summary(uuid,integer)'
      ) is not null,
      'planLimitFunction', to_regprocedure(
        'public.plan_max_businesses(text)'
      ) is not null,
      'workspaceEntitlementsRpc', to_regprocedure(
        'public.get_workspace_entitlements(uuid)'
      ) is not null,
      'createWorkspaceRpc', to_regprocedure(
        'public.create_workspace_with_owner(text,text,text,text,text,text,text)'
      ) is not null,
      'listMembersRpc', to_regprocedure(
        'public.list_workspace_members(uuid)'
      ) is not null,
      'acceptInviteRpc', to_regprocedure(
        'public.accept_workspace_invite(uuid)'
      ) is not null
    )
  )
  from public.visibility_schema_meta meta
  where meta.singleton = true;
$$;

revoke all on function public.get_visibility_schema_readiness() from public;
grant execute on function public.get_visibility_schema_readiness() to authenticated;
