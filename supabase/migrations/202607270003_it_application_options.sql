-- Super Admin-managed module options for IT Request Form (Application).
create table if not exists public.it_application_options (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint it_application_options_name_not_blank check (length(trim(name)) > 0)
);

create unique index if not exists it_application_options_name_ci_idx
on public.it_application_options (lower(trim(name)));

alter table public.it_application_options enable row level security;

drop policy if exists "Authenticated users can view IT application options" on public.it_application_options;
create policy "Authenticated users can view IT application options"
on public.it_application_options for select to authenticated using (true);

drop policy if exists "Active super admins can add IT application options" on public.it_application_options;
create policy "Active super admins can add IT application options"
on public.it_application_options for insert to authenticated
with check (exists (
  select 1 from public.users
  where users.id::text = auth.uid()::text and users.role = 'super_admin' and users.status = 'active'
));

drop policy if exists "Active super admins can update IT application options" on public.it_application_options;
create policy "Active super admins can update IT application options"
on public.it_application_options for update to authenticated
using (exists (
  select 1 from public.users
  where users.id::text = auth.uid()::text and users.role = 'super_admin' and users.status = 'active'
))
with check (exists (
  select 1 from public.users
  where users.id::text = auth.uid()::text and users.role = 'super_admin' and users.status = 'active'
));

drop policy if exists "Active super admins can delete IT application options" on public.it_application_options;
create policy "Active super admins can delete IT application options"
on public.it_application_options for delete to authenticated
using (exists (
  select 1 from public.users
  where users.id::text = auth.uid()::text and users.role = 'super_admin' and users.status = 'active'
));

insert into public.it_application_options (name, sort_order)
values
  ('Accounting', 10),
  ('Customer Order Transfer', 20),
  ('Field Permissions', 30),
  ('General Functions', 40),
  ('General Registers', 50),
  ('Manufacturing', 60),
  ('Mobile Client', 70),
  ('Part Synchronization', 80),
  ('Purchase', 90),
  ('Sales', 100),
  ('Stock', 110),
  ('Time Recording', 120)
on conflict do nothing;

