-- Atomic, continuously-incrementing serial number for Material Requisition
-- Slips. Unlike the HDSB/Gate Pass counters, this does not reset yearly and
-- starts at MRS2000 (no dash, no zero-padding).
create or replace function public.next_mrs_ref_no()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  allocated_value integer;
begin
  insert into public.submission_reference_counters (prefix, reference_year, last_value)
  values ('MRS', 0, 2000)
  on conflict (prefix, reference_year) do update
  set last_value = public.submission_reference_counters.last_value + 1
  returning last_value into allocated_value;

  return 'MRS' || allocated_value::text;
end;
$$;

revoke all on function public.next_mrs_ref_no() from public;
grant execute on function public.next_mrs_ref_no() to authenticated;
