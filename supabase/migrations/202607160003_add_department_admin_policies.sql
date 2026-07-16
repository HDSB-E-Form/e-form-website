-- Department names are managed only by active Super Admin users.
-- Existing SELECT policies are intentionally left unchanged because departments
-- are read throughout the application by ordinary authenticated users.

drop policy if exists "Active super admins can insert departments" on public.departments;
create policy "Active super admins can insert departments"
on public.departments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users
    where users.id = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);

drop policy if exists "Active super admins can update departments" on public.departments;
create policy "Active super admins can update departments"
on public.departments
for update
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.users
    where users.id = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);

drop policy if exists "Active super admins can delete departments" on public.departments;
create policy "Active super admins can delete departments"
on public.departments
for delete
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);
