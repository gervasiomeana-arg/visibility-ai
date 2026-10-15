begin;
create unique index if not exists businesses_workspace_id_pair on public.businesses(workspace_id,id);
create table if not exists public.business_social_accounts (
  workspace_id uuid not null,
  business_id uuid not null,
  network text not null check (network in ('facebook','instagram','tiktok')),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (workspace_id,business_id,network),
  foreign key (workspace_id,business_id) references public.businesses(workspace_id,id) on delete cascade
);
alter table public.business_social_accounts enable row level security;
grant select,insert,update,delete on public.business_social_accounts to authenticated;
drop policy if exists "owners manage business social accounts" on public.business_social_accounts;
create policy "owners manage business social accounts" on public.business_social_accounts for all to authenticated
using (exists(select 1 from public.workspaces w where w.id=business_social_accounts.workspace_id and w.owner_user_id=auth.uid()))
with check (exists(select 1 from public.workspaces w where w.id=business_social_accounts.workspace_id and w.owner_user_id=auth.uid()));
create or replace function public.touch_business_social_account() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.workspace_id<>old.workspace_id or new.business_id<>old.business_id or new.network<>old.network then
    raise exception 'The social account cannot change its workspace, business or network';
  end if;
  new.updated_at:=clock_timestamp();
  return new;
end;
$$;
drop trigger if exists business_social_account_updated_at on public.business_social_accounts;
create trigger business_social_account_updated_at before update on public.business_social_accounts
for each row execute function public.touch_business_social_account();
commit;
