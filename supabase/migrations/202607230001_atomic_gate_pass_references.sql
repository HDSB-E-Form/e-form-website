-- Allocate Gate Pass reference numbers in PostgreSQL so concurrent submissions
-- cannot receive the same GP number.
create sequence if not exists public.gate_pass_ref_no_seq minvalue 1 start 1;

do $$
declare
  highest_existing bigint;
begin
  select coalesce(max(((regexp_match(data ->> 'refNo', '^GP-([0-9]+)$'))[1])::bigint), 0)
    into highest_existing
  from public.submissions
  where "formType" = 'leave'
    and data ->> 'refNo' ~ '^GP-[0-9]+$';

  perform setval(
    'public.gate_pass_ref_no_seq',
    greatest(highest_existing, 1),
    highest_existing > 0
  );
end
$$;

create or replace function public.next_gate_pass_ref_no()
returns text
language sql
security definer
set search_path = public
as $$
  select 'GP-' || lpad(nextval('public.gate_pass_ref_no_seq')::text, 4, '0');
$$;

revoke all on function public.next_gate_pass_ref_no() from public;
grant execute on function public.next_gate_pass_ref_no() to authenticated;

create unique index if not exists submissions_gate_pass_ref_no_unique
  on public.submissions ((data ->> 'refNo'))
  where "formType" = 'leave' and data ->> 'refNo' is not null;
