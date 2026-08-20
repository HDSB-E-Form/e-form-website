-- A system profile is only valid after the Supabase Auth email OTP has been
-- verified. This protects against legacy signup triggers or direct inserts
-- creating an active public.users row too early.

create or replace function public.require_confirmed_email_for_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1
    from auth.users
    where id::text = new.id::text
      and email_confirmed_at is not null
  ) then
    raise exception 'A user profile cannot be created or activated before its email OTP is verified.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists require_confirmed_email_for_user_profile on public.users;
create trigger require_confirmed_email_for_user_profile
before insert or update of status on public.users
for each row
when (new.status = 'active')
execute function public.require_confirmed_email_for_user_profile();

-- Hide any legacy profiles that were created before their email was verified.
-- If the user subsequently verifies their OTP, the confirmation trigger below
-- promotes the same profile to active.
update public.users as profile
set status = 'inactive'
from auth.users as auth_user
where auth_user.id::text = profile.id::text
  and auth_user.email_confirmed_at is null
  and profile.status = 'active';

-- Create (or activate a legacy premature profile) only when Auth records the
-- email confirmation. This also handles environments where a confirmed user
-- is inserted directly into auth.users.
create or replace function public.create_profile_after_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is null
     or (tg_op = 'UPDATE' and old.email_confirmed_at is not null) then
    return new;
  end if;

  if nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), '') is null
     or nullif(trim(coalesce(new.raw_user_meta_data ->> 'employeeId', '')), '') is null
     or nullif(trim(coalesce(new.raw_user_meta_data ->> 'department', '')), '') is null then
    raise exception 'Required HDSB profile metadata is missing for confirmed user %', new.id;
  end if;

  insert into public.users (
    id, email, name, "employeeId", department, phone, position, role, status, "createdAt"
  ) values (
    new.id::text,
    coalesce(new.email, ''),
    trim(new.raw_user_meta_data ->> 'name'),
    trim(new.raw_user_meta_data ->> 'employeeId'),
    trim(new.raw_user_meta_data ->> 'department'),
    trim(coalesce(new.raw_user_meta_data ->> 'phone', '')),
    trim(coalesce(new.raw_user_meta_data ->> 'position', '')),
    'employee',
    'active',
    now()
  )
  on conflict (id) do update
    set status = excluded.status;

  return new;
end;
$$;

drop trigger if exists create_profile_after_email_confirmation on auth.users;
create trigger create_profile_after_email_confirmation
after insert or update of email_confirmed_at on auth.users
for each row
execute function public.create_profile_after_email_confirmation();

revoke all on function public.require_confirmed_email_for_user_profile() from public;
revoke all on function public.create_profile_after_email_confirmation() from public;
