-- Visibility AI · schema v8
-- Plan entitlements and business-count enforcement.
-- Apply after 202610090002_usage_telemetry_v7.sql.

create or replace function public.plan_max_businesses(plan_value text)
returns integer
language sql
immutable
as $$
  select case plan_value
    when 'diagnostic' then 1
    when 'monitor' then 1
    when 'growth' then 1
    when 'pro' then 3
    when 'agency' then 30
    else 1
  end;
$$;

create or replace function public.enforce_workspace_business_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
  where workspace_id = new.workspace_id;

  if current_count >= max_businesses then
    raise exception 'Business limit reached for plan % (% allowed)', current_plan, max_businesses
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

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
as $$
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
$$;

revoke all on function public.get_workspace_entitlements(uuid) from public;
grant execute on function public.get_workspace_entitlements(uuid) to authenticated;

update public.visibility_schema_meta
set
  schema_version = 8,
  schema_label = 'phase-13-plan-entitlements',
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
