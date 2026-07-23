-- Move new Gate Pass references to GP-YYNNNN without changing any existing
-- submission. Legacy GP-0001-style references remain stored as they are.
with settings as (
  select
    extract(year from current_timestamp at time zone 'Asia/Kuala_Lumpur')::integer as full_year,
    to_char(current_timestamp at time zone 'Asia/Kuala_Lumpur', 'YY') as short_year
), existing as (
  select coalesce(max(right(s.data ->> 'refNo', 4)::integer), -1) as highest_value
  from public.submissions s
  cross join settings cfg
  where s."formType" = 'leave'
    and s.data ->> 'refNo' ~ ('^GP-' || cfg.short_year || '[0-9]{4}$')
)
insert into public.submission_reference_counters (prefix, reference_year, last_value)
select 'GP', settings.full_year, existing.highest_value
from settings
cross join existing
on conflict (prefix, reference_year) do update
set last_value = greatest(
  public.submission_reference_counters.last_value,
  excluded.last_value
);

create or replace function public.next_gate_pass_ref_no()
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
  values ('GP', full_year, 0)
  on conflict (prefix, reference_year) do update
  set last_value = public.submission_reference_counters.last_value + 1
  returning last_value into allocated_value;

  return 'GP-' || short_year || lpad(allocated_value::text, 4, '0');
end;
$$;

revoke all on function public.next_gate_pass_ref_no() from public;
grant execute on function public.next_gate_pass_ref_no() to authenticated;
