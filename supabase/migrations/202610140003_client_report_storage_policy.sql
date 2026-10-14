-- Qualify the outer storage object's name. An unqualified name in the
-- subquery binds to workspaces.name instead of storage.objects.name.
-- Replaces only this policy; does not delete files, rows or disable RLS.
begin;
drop policy if exists "owners manage visibility client reports" on storage.objects;
create policy "owners manage visibility client reports" on storage.objects
for all to authenticated
using (
  storage.objects.bucket_id = 'visibility-client-reports'
  and exists (
    select 1 from public.client_accounts c
    join public.workspaces w on w.id = c.workspace_id
    where c.workspace_id::text = split_part(storage.objects.name, '/', 1)
      and c.id::text = split_part(storage.objects.name, '/', 2)
      and w.owner_user_id = auth.uid()
  )
)
with check (
  storage.objects.bucket_id = 'visibility-client-reports'
  and exists (
    select 1 from public.client_accounts c
    join public.workspaces w on w.id = c.workspace_id
    where c.workspace_id::text = split_part(storage.objects.name, '/', 1)
      and c.id::text = split_part(storage.objects.name, '/', 2)
      and w.owner_user_id = auth.uid()
  )
);
commit;
