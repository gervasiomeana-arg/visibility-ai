-- Internal client ledger. Access belongs only to the workspace owner.
create table if not exists public.client_accounts (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists client_accounts_workspace_idx on public.client_accounts(workspace_id);
alter table public.client_accounts enable row level security;
drop policy if exists "owners manage client accounts" on public.client_accounts;
create policy "owners manage client accounts" on public.client_accounts for all to authenticated
using (exists (select 1 from public.workspaces w where w.id = client_accounts.workspace_id and w.owner_user_id = auth.uid()))
with check (exists (select 1 from public.workspaces w where w.id = client_accounts.workspace_id and w.owner_user_id = auth.uid()));
grant select, insert, update, delete on public.client_accounts to authenticated;
create or replace function public.touch_client_account() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.workspace_id <> old.workspace_id or new.id <> old.id) then
    raise exception 'Client identity cannot change';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
drop trigger if exists touch_client_account on public.client_accounts;
create trigger touch_client_account before insert or update on public.client_accounts for each row execute function public.touch_client_account();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('visibility-client-reports','visibility-client-reports',false,20971520,array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "owners manage visibility client reports" on storage.objects;
create policy "owners manage visibility client reports" on storage.objects for all to authenticated
using (bucket_id = 'visibility-client-reports' and exists (
  select 1 from public.client_accounts c join public.workspaces w on w.id = c.workspace_id
  where c.workspace_id::text = split_part(name,'/',1) and c.id::text = split_part(name,'/',2) and w.owner_user_id = auth.uid()
))
with check (bucket_id = 'visibility-client-reports' and exists (
  select 1 from public.client_accounts c join public.workspaces w on w.id = c.workspace_id
  where c.workspace_id::text = split_part(name,'/',1) and c.id::text = split_part(name,'/',2) and w.owner_user_id = auth.uid()
));
