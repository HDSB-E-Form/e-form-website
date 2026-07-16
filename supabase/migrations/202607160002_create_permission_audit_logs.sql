create table if not exists public.permission_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_name text not null,
  target_user_id uuid not null,
  target_user_name text not null,
  action text not null check (action in ('permissions_updated', 'user_deactivated')),
  previous_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.permission_audit_logs enable row level security;

drop policy if exists "Super admins can read permission audit logs" on public.permission_audit_logs;
create policy "Super admins can read permission audit logs"
on public.permission_audit_logs
for select
to authenticated
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);

drop policy if exists "Super admins can create permission audit logs" on public.permission_audit_logs;
create policy "Super admins can create permission audit logs"
on public.permission_audit_logs
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);

create index if not exists permission_audit_logs_target_user_idx
  on public.permission_audit_logs (target_user_id, created_at desc);
