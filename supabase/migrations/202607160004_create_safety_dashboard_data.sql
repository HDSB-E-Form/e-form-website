create table if not exists public.safety_dashboard_remarks (
  id uuid primary key default gen_random_uuid(),
  dashboard text not null check (dashboard in ('final_discharge', 'mixing')),
  remark text not null check (length(trim(remark)) > 0),
  created_by text not null,
  created_by_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.safety_dashboard_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.safety_dashboard_remarks enable row level security;
alter table public.safety_dashboard_settings enable row level security;

drop policy if exists "Authenticated users can read safety dashboard remarks" on public.safety_dashboard_remarks;
create policy "Authenticated users can read safety dashboard remarks"
on public.safety_dashboard_remarks for select to authenticated using (true);

drop policy if exists "Safety admins can create dashboard remarks" on public.safety_dashboard_remarks;
create policy "Safety admins can create dashboard remarks"
on public.safety_dashboard_remarks for insert to authenticated
with check (
  created_by = auth.uid()::text and exists (
    select 1 from public.users
    where users.id = auth.uid()::text
      and users.status = 'active'
      and (users.role in ('safety_admin', 'super_admin') or 'safety_admin' = any(coalesce(users.secondary_roles, '{}'::text[])))
  )
);

drop policy if exists "Authenticated users can read safety dashboard settings" on public.safety_dashboard_settings;
create policy "Authenticated users can read safety dashboard settings"
on public.safety_dashboard_settings for select to authenticated using (true);

drop policy if exists "Safety admins can create dashboard settings" on public.safety_dashboard_settings;
create policy "Safety admins can create dashboard settings"
on public.safety_dashboard_settings for insert to authenticated
with check (
  updated_by = auth.uid()::text and exists (
    select 1 from public.users
    where users.id = auth.uid()::text
      and users.status = 'active'
      and (users.role in ('safety_admin', 'super_admin') or 'safety_admin' = any(coalesce(users.secondary_roles, '{}'::text[])))
  )
);

drop policy if exists "Safety admins can update dashboard settings" on public.safety_dashboard_settings;
create policy "Safety admins can update dashboard settings"
on public.safety_dashboard_settings for update to authenticated
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()::text
      and users.status = 'active'
      and (users.role in ('safety_admin', 'super_admin') or 'safety_admin' = any(coalesce(users.secondary_roles, '{}'::text[])))
  )
)
with check (updated_by = auth.uid()::text);
