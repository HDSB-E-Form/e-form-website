alter table public.users
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivated_by text,
  add column if not exists deactivated_by_name text,
  add column if not exists reactivated_at timestamptz,
  add column if not exists reactivated_by text,
  add column if not exists reactivated_by_name text;

update public.users set status = 'active' where status is null;
alter table public.users alter column status set default 'active';

create table if not exists public.permission_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id text,
  actor_name text not null,
  target_user_id text not null,
  target_user_name text not null,
  action text not null,
  previous_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.permission_audit_logs
  drop constraint if exists permission_audit_logs_action_check;

alter table public.permission_audit_logs
  add constraint permission_audit_logs_action_check
  check (action in ('permissions_updated', 'user_deactivated', 'user_reactivated'));

alter table public.permission_audit_logs enable row level security;

drop policy if exists "Super admins can read permission audit logs"
  on public.permission_audit_logs;
create policy "Super admins can read permission audit logs"
on public.permission_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id::text = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);

drop policy if exists "Super admins can create permission audit logs"
  on public.permission_audit_logs;
create policy "Super admins can create permission audit logs"
on public.permission_audit_logs
for insert
to authenticated
with check (
  actor_user_id::text = auth.uid()::text
  and exists (
    select 1
    from public.users
    where users.id::text = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);

create index if not exists users_status_idx on public.users (status);
create index if not exists users_deactivated_at_idx on public.users (deactivated_at desc);
create index if not exists permission_audit_logs_target_user_idx
  on public.permission_audit_logs (target_user_id, created_at desc);

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'users'
  ) then
    alter publication supabase_realtime add table public.users;
  end if;
end
$$;
