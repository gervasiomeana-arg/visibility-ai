begin;

create table if not exists public.launch_checklists (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  payload jsonb not null default '{"checks":{}}'::jsonb check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.launch_checklists enable row level security;
grant select,insert,update,delete on public.launch_checklists to authenticated;
drop policy if exists "owners manage launch checklist" on public.launch_checklists;
create policy "owners manage launch checklist" on public.launch_checklists for all to authenticated
using (exists(select 1 from public.workspaces w where w.id=launch_checklists.workspace_id and w.owner_user_id=auth.uid()))
with check (exists(select 1 from public.workspaces w where w.id=launch_checklists.workspace_id and w.owner_user_id=auth.uid()));
create or replace function public.touch_launch_checklist() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.workspace_id<>old.workspace_id then raise exception 'The checklist cannot move to another workspace'; end if;
  new.updated_at:=clock_timestamp();
  return new;
end;
$$;
drop trigger if exists launch_checklist_updated_at on public.launch_checklists;
create trigger launch_checklist_updated_at before update on public.launch_checklists
for each row execute function public.touch_launch_checklist();

create unique index if not exists businesses_workspace_id_pair on public.businesses(workspace_id,id);
do $$
declare relation_name text; constraint_name text;
begin
  foreach relation_name in array array['seo_audits','tracked_keywords','search_console_snapshots','opportunities','action_tasks'] loop
    constraint_name:=relation_name||'_workspace_business_fk';
    if to_regclass('public.'||relation_name) is not null and not exists(
      select 1 from pg_constraint c where c.conrelid=to_regclass('public.'||relation_name) and c.conname=constraint_name
    ) then
      -- NOT VALID preserves existing rows, while enforcing new inserts/key changes.
      -- Existing mismatches are reported separately; no business data is changed.
      execute format('alter table public.%I add constraint %I foreign key (workspace_id,business_id) references public.businesses(workspace_id,id) on delete cascade not valid',relation_name,constraint_name);
    end if;
  end loop;
end;
$$;

create or replace function public.check_business_workspace_integrity(target_workspace uuid)
returns table(relation_name text,table_exists boolean,protected_writes boolean,inconsistent_rows bigint)
language plpgsql security invoker set search_path='' as $$
declare target_table text; mismatch_count bigint; guarded boolean;
begin
  if not exists(select 1 from public.workspaces w where w.id=target_workspace and w.owner_user_id=auth.uid()) then
    raise exception 'Only the workspace owner can check this scope' using errcode='42501';
  end if;
  foreach target_table in array array['seo_audits','tracked_keywords','search_console_snapshots','opportunities','action_tasks'] loop
    if to_regclass('public.'||target_table) is null then
      return query select target_table,false,false,null::bigint;
    else
      select exists(select 1 from pg_constraint c
        where c.conrelid=to_regclass('public.'||target_table)
          and c.conname=target_table||'_workspace_business_fk' and c.contype='f'
          and c.confrelid='public.businesses'::regclass) into guarded;
      execute format('select count(*) from public.%I r left join public.businesses b on b.id=r.business_id where r.workspace_id=$1 and (b.id is null or b.workspace_id<>r.workspace_id)',target_table) into mismatch_count using target_workspace;
      return query select target_table,true,guarded,mismatch_count;
    end if;
  end loop;
end;
$$;
revoke all on function public.check_business_workspace_integrity(uuid) from public;
grant execute on function public.check_business_workspace_integrity(uuid) to authenticated;

commit;
