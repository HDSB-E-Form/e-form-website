-- Super Admin-managed requisition options for IT Request Form (Admin).
create table if not exists public.it_admin_facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  requires_details boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint it_admin_facilities_name_not_blank check (length(trim(name)) > 0)
);

create unique index if not exists it_admin_facilities_name_ci_idx
on public.it_admin_facilities (lower(trim(name)));

alter table public.it_admin_facilities enable row level security;

drop policy if exists "Authenticated users can view IT admin facilities" on public.it_admin_facilities;
create policy "Authenticated users can view IT admin facilities"
on public.it_admin_facilities for select
to authenticated
using (true);

drop policy if exists "Active super admins can add IT admin facilities" on public.it_admin_facilities;
create policy "Active super admins can add IT admin facilities"
on public.it_admin_facilities for insert
to authenticated
with check (
  exists (
    select 1 from public.users
    where users.id::text = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);

drop policy if exists "Active super admins can update IT admin facilities" on public.it_admin_facilities;
create policy "Active super admins can update IT admin facilities"
on public.it_admin_facilities for update
to authenticated
using (
  exists (
    select 1 from public.users
    where users.id::text = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.users
    where users.id::text = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);

drop policy if exists "Active super admins can delete IT admin facilities" on public.it_admin_facilities;
create policy "Active super admins can delete IT admin facilities"
on public.it_admin_facilities for delete
to authenticated
using (
  exists (
    select 1 from public.users
    where users.id::text = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);

insert into public.it_admin_facilities (name, requires_details, sort_order)
values
  ('Laptop / Desktop', false, 10),
  ('Email', false, 20),
  ('Internet Access', false, 30),
  ('Printer', false, 40),
  ('SharePoint', true, 50)
on conflict do nothing;

