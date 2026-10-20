begin;

-- Private operator data has no anonymous use case. RLS remains enabled and
-- authenticated/service_role grants and every existing row are preserved.
revoke all privileges on table
  public.profiles, public.workspaces, public.workspace_members,
  public.workspace_invites, public.businesses, public.seo_audits,
  public.search_console_snapshots, public.search_console_connections,
  public.opportunities, public.action_tasks, public.tracked_keywords,
  public.usage_events, public.visibility_schema_meta, public.client_accounts,
  public.launch_checklists, public.business_social_accounts,
  public.business_presence_observations, public.client_audit_runs
from anon, public;

-- The readiness query reads metadata already available through authenticated
-- RLS. It does not need the database owner's privileges.
alter function public.get_visibility_schema_readiness() security invoker;
grant select on public.visibility_schema_meta to authenticated;

do $$
declare signature text; routine regprocedure;
begin
  foreach signature in array array[
    'public.accept_workspace_invite(uuid)',
    'public.create_workspace_with_owner(text,text,text,text,text,text,text)',
    'public.get_visibility_schema_readiness()',
    'public.get_workspace_usage_summary(uuid,integer)',
    'public.is_workspace_member(uuid)',
    'public.list_workspace_members(uuid)'
  ] loop
    routine := to_regprocedure(signature);
    if routine is null then raise exception 'Missing required function: %', signature; end if;
    execute format('revoke execute on function %s from public, anon', routine);
    -- These RPCs are used by authenticated workflows/RLS, and have explicit
    -- identity/scope checks. Changing them to invoker causes policy recursion.
    execute format('grant execute on function %s to authenticated', routine);
  end loop;

  foreach signature in array array[
    'public.handle_new_user()',
    'public.protect_workspace_owner_membership()',
    'public.rls_auto_enable()'
  ] loop
    routine := to_regprocedure(signature);
    if routine is not null then
      -- Triggers keep executing normally; they are not client RPCs.
      execute format('revoke execute on function %s from public, anon, authenticated', routine);
    end if;
  end loop;
end;
$$;

commit;
