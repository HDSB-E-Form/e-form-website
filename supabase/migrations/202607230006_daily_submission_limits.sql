-- Limit new Gate Pass and Vehicle Booking submissions to two per employee
-- per Malaysia calendar day. Existing submissions remain unchanged, and
-- updates to existing submissions do not pass through this INSERT trigger.
create or replace function public.enforce_daily_user_submission_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  malaysia_today date := (current_timestamp at time zone 'Asia/Kuala_Lumpur')::date;
  existing_count integer;
  lock_key text;
begin
  if new."formType" not in ('leave', 'car_rental') then
    return new;
  end if;

  -- Serialize inserts for the same employee, form, and Malaysia date so two
  -- simultaneous browser requests cannot both pass the count check.
  lock_key := new."submittedBy" || ':' || new."formType" || ':' || malaysia_today::text;
  perform pg_advisory_xact_lock(hashtextextended(lock_key, 0));

  select count(*)
    into existing_count
  from public.submissions
  where "submittedBy" = new."submittedBy"
    and "formType" = new."formType"
    and ("submittedAt" at time zone 'Asia/Kuala_Lumpur')::date = malaysia_today;

  if existing_count >= 2 then
    raise exception using
      errcode = 'P0001',
      message = 'DAILY_SUBMISSION_LIMIT: A maximum of 2 submissions per form is allowed per Malaysia calendar day.';
  end if;

  -- Limited submissions use the database clock so the daily boundary cannot
  -- be bypassed by changing the client device time or request payload.
  new."submittedAt" := current_timestamp;
  return new;
end;
$$;

revoke all on function public.enforce_daily_user_submission_limit() from public;

drop trigger if exists enforce_daily_user_submission_limit_before_insert
  on public.submissions;

create trigger enforce_daily_user_submission_limit_before_insert
before insert on public.submissions
for each row
execute function public.enforce_daily_user_submission_limit();
