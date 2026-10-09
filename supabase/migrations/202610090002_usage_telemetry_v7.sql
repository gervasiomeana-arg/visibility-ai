-- Visibility AI · schema v7
-- Usage telemetry foundation.
-- Apply after 202610090001_visibility_ai_baseline_v6.sql.

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

update public.visibility_schema_meta
set
  schema_version = 7,
  schema_label = 'phase-12-usage-telemetry',
  updated_at = now()
where singleton = true;

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
