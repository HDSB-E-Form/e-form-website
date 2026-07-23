-- Shared, annual reference counter for Petty Cash, Car Booking, and the four
-- current IT forms. This migration does not update or delete submissions.
create table if not exists public.submission_reference_counters (
  prefix text not null,
  reference_year integer not null,
  last_value integer not null default -1,
  primary key (prefix, reference_year),
  constraint submission_reference_counters_last_value_check check (last_value >= -1)
);

alter table public.submission_reference_counters enable row level security;
revoke all on table public.submission_reference_counters from anon, authenticated;

-- Continue after the highest existing HDSB-YYNNNN reference for the current
-- Malaysia calendar year. Older reference formats remain untouched.
with settings as (
  select
    extract(year from current_timestamp at time zone 'Asia/Kuala_Lumpur')::integer as full_year,
    to_char(current_timestamp at time zone 'Asia/Kuala_Lumpur', 'YY') as short_year
), existing as (
  select coalesce(max(right(s.data ->> 'refNo', 4)::integer), -1) as highest_value
  from public.submissions s
  cross join settings cfg
  where s."formType" in (
    'claim',
    'car_rental',
    'cctv_access_request',
    'it_help_desk',
    'it_admin_request',
    'it_application_request'
  )
    and s.data ->> 'refNo' ~ ('^HDSB-' || cfg.short_year || '[0-9]{4}$')
)
insert into public.submission_reference_counters (prefix, reference_year, last_value)
select 'HDSB', settings.full_year, existing.highest_value
from settings
cross join existing
on conflict (prefix, reference_year) do update
set last_value = greatest(
  public.submission_reference_counters.last_value,
  excluded.last_value
);

create or replace function public.next_hdsb_ref_no()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  full_year integer := extract(year from current_timestamp at time zone 'Asia/Kuala_Lumpur')::integer;
  short_year text := to_char(current_timestamp at time zone 'Asia/Kuala_Lumpur', 'YY');
  allocated_value integer;
begin
  insert into public.submission_reference_counters (prefix, reference_year, last_value)
  values ('HDSB', full_year, 0)
  on conflict (prefix, reference_year) do update
  set last_value = public.submission_reference_counters.last_value + 1
  returning last_value into allocated_value;

  return 'HDSB-' || short_year || lpad(allocated_value::text, 4, '0');
end;
$$;

revoke all on function public.next_hdsb_ref_no() from public;
grant execute on function public.next_hdsb_ref_no() to authenticated;
