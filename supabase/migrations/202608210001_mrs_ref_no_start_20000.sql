-- The MRS counter was launched starting at MRS2000; the business wants the
-- series to start at MRS20000 instead. No MRS submissions have been issued
-- yet, so it's safe to rebase the counter before any real number is handed out.
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
  values ('MRS', 0, 20000)
  on conflict (prefix, reference_year) do update
  set last_value = public.submission_reference_counters.last_value + 1
  returning last_value into allocated_value;

  return 'MRS' || allocated_value::text;
end;
$$;

update public.submission_reference_counters
set last_value = 19999
where prefix = 'MRS' and reference_year = 0 and last_value < 19999;
