-- Synchronize notification read/cleared state across a user's devices.

create table if not exists public.notification_user_states (
  user_id text not null,
  notification_id text not null,
  read_at timestamptz,
  hidden_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table public.notification_user_states enable row level security;

drop policy if exists "Users can view their notification states" on public.notification_user_states;
create policy "Users can view their notification states"
on public.notification_user_states for select
using (user_id = auth.uid()::text);

drop policy if exists "Users can create their notification states" on public.notification_user_states;
create policy "Users can create their notification states"
on public.notification_user_states for insert
with check (user_id = auth.uid()::text);

drop policy if exists "Users can update their notification states" on public.notification_user_states;
create policy "Users can update their notification states"
on public.notification_user_states for update
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

alter table public.notification_user_states replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notification_user_states'
  ) then
    alter publication supabase_realtime add table public.notification_user_states;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'submissions'
  ) then
    alter publication supabase_realtime add table public.submissions;
  end if;
end $$;
