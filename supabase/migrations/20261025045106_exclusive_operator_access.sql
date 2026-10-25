begin;
-- This deployment is the existing private Visibility project. Never seed a new
-- owner or modify client rows. Abort rather than lock out a different project.
do $$ begin
 if not exists(select 1 from auth.users where id='b4a19328-4566-4e76-96c3-bcc793346f88') then
  raise exception 'Expected Visibility operator does not exist';
 end if;
 if exists(select 1 from public.workspaces where owner_user_id<>'b4a19328-4566-4e76-96c3-bcc793346f88') then
  raise exception 'Unexpected workspace owner; review before restricting access';
 end if;
end $$;

create or replace function public.is_visibility_operator() returns boolean
 language sql stable security invoker set search_path=pg_catalog as $$
 select coalesce(auth.uid()='b4a19328-4566-4e76-96c3-bcc793346f88'::uuid,false)
  and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false);
$$;
revoke execute on function public.is_visibility_operator() from public,anon;
grant execute on function public.is_visibility_operator() to authenticated,service_role;

-- RESTRICTIVE combines with the existing scope policies using AND, never OR.
do $$ declare table_name text; begin
 foreach table_name in array array['profiles','workspaces','workspace_members','workspace_invites','businesses','seo_audits','search_console_snapshots','search_console_connections','opportunities','action_tasks','tracked_keywords','usage_events','visibility_schema_meta','client_accounts','launch_checklists','business_social_accounts','business_presence_observations','client_audit_runs'] loop
  execute format('drop policy if exists visibility_operator_only on public.%I',table_name);
  execute format('create policy visibility_operator_only on public.%I as restrictive for all to authenticated using ((select public.is_visibility_operator())) with check ((select public.is_visibility_operator()))',table_name);
 end loop;
end $$;

-- Preserve the established non-recursive membership helper and add the same
-- operator check, so dependent SECURITY DEFINER reports cannot bypass it.
create or replace function public.is_workspace_member(target_workspace uuid)
 returns boolean language sql stable security definer set search_path=public as $$
 select public.is_visibility_operator() and exists(
  select 1 from public.workspace_members wm where wm.workspace_id=target_workspace and wm.user_id=auth.uid()
 );
$$;
-- Preserve existing RPC bodies; replace only their authenticated-user gate.
do $$ declare routine regprocedure; definition text; signature text; begin
 foreach signature in array array['public.accept_workspace_invite(uuid)','public.create_workspace_with_owner(text,text,text,text,text,text,text)'] loop
  routine:=to_regprocedure(signature);definition:=pg_get_functiondef(routine);
  if position('if not public.is_visibility_operator() then' in definition)>0 then continue; end if;
  if position('if auth.uid() is null then' in definition)=0 then raise exception 'Unrecognized access gate: %',signature; end if;
  execute replace(definition,'if auth.uid() is null then','if not public.is_visibility_operator() then');
 end loop;
end $$;

-- Block direct Auth registration too, not just the application's signup button.
-- Existing sign-in, token refresh and password recovery update the existing row
-- and are unaffected by this INSERT-only trigger.
create or replace function public.visibility_block_new_accounts() returns trigger
 language plpgsql security invoker set search_path=pg_catalog as $$
begin
 if new.id<>'b4a19328-4566-4e76-96c3-bcc793346f88'::uuid then
  raise exception using errcode='42501',message='Visibility is private; new account registration is disabled';
 end if;
 return new;
end $$;
revoke execute on function public.visibility_block_new_accounts() from public,anon,authenticated;
drop trigger if exists visibility_private_registration on auth.users;
create trigger visibility_private_registration before insert on auth.users
 for each row execute function public.visibility_block_new_accounts();

-- Other buckets, if later added, keep their own policy. This PDF bucket is private.
drop policy if exists visibility_reports_operator_only on storage.objects;
create policy visibility_reports_operator_only on storage.objects as restrictive for all to authenticated
 using (bucket_id<>'visibility-client-reports' or (select public.is_visibility_operator()))
 with check (bucket_id<>'visibility-client-reports' or (select public.is_visibility_operator()));
commit;
