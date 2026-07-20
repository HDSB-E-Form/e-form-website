-- Keep announcement management restricted to active Super Admin users and
-- guarantee that no more than one announcement is active at a time.

alter table public.announcements enable row level security;

drop policy if exists "Authenticated users can read announcements" on public.announcements;
create policy "Authenticated users can read announcements"
on public.announcements
for select
to authenticated
using (true);

drop policy if exists "Active super admins can insert announcements" on public.announcements;
create policy "Active super admins can insert announcements"
on public.announcements
for insert
to authenticated
with check (
  exists (
    select 1 from public.users
    where users.id = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);

drop policy if exists "Active super admins can update announcements" on public.announcements;
create policy "Active super admins can update announcements"
on public.announcements
for update
to authenticated
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.users
    where users.id = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);

drop policy if exists "Active super admins can delete announcements" on public.announcements;
create policy "Active super admins can delete announcements"
on public.announcements
for delete
to authenticated
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);

create or replace function public.deactivate_other_announcements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active then
    update public.announcements
    set is_active = false
    where id <> new.id
      and is_active = true;
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_single_active_announcement on public.announcements;
create trigger ensure_single_active_announcement
before insert or update of is_active on public.announcements
for each row
when (new.is_active = true)
execute function public.deactivate_other_announcements();

-- Normalize any existing duplicates before enforcing the invariant.
with ranked as (
  select id, row_number() over (order by created_at desc, id desc) as position
  from public.announcements
  where is_active = true
)
update public.announcements a
set is_active = false
from ranked r
where a.id = r.id
  and r.position > 1;

create unique index if not exists announcements_one_active_idx
on public.announcements ((is_active))
where is_active = true;

-- Required for Supabase Realtime UPDATE/DELETE payloads to identify rows.
alter table public.announcements replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'announcements'
  ) then
    alter publication supabase_realtime add table public.announcements;
  end if;
end;
$$;
