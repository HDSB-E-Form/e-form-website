-- Create the application profile only after Supabase Auth confirms the signup
-- email. This makes OTP verification and profile registration one reliable
-- database-side operation instead of trusting browser session storage.

create or replace function public.create_profile_after_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is null
     or old.email_confirmed_at is not null then
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
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_profile_after_email_confirmation on auth.users;
create trigger create_profile_after_email_confirmation
after update of email_confirmed_at on auth.users
for each row
execute function public.create_profile_after_email_confirmation();

revoke all on function public.create_profile_after_email_confirmation() from public;
