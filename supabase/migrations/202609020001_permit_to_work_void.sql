-- Allow Safety Admins to void a Permit to Work in their area (Super Admins already
-- may void anything). Mirrors the per-department branches already in this function.
create or replace function public.void_submission(p_submission_id text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.users%rowtype;
  target public.submissions%rowtype;
  allowed boolean := false;
begin
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'A void reason of at least 5 characters is required.';
  end if;

  select * into actor from public.users
  where id::text = auth.uid()::text and status = 'active';
  if not found then raise exception 'Active user not found.'; end if;

  select * into target from public.submissions where id::text = p_submission_id for update;
  if not found then raise exception 'Submission not found.'; end if;
  if target.status = 'voided' then raise exception 'Submission is already voided.'; end if;
  if target.status in ('completed', 'rejected') then
    raise exception 'Completed or rejected submissions are already terminal and cannot be voided.';
  end if;

  allowed := actor.role = 'super_admin'
    or (
      (actor.role = 'hr_admin' or 'hr_admin' = any(coalesce(actor.secondary_roles, array[]::text[])))
      and target."formType" in ('car_rental', 'leave')
    )
    or (
      (actor.role = 'finance_admin' or 'finance_admin' = any(coalesce(actor.secondary_roles, array[]::text[])))
      and target."formType" = 'claim'
    )
    or (
      (actor.role = 'it_admin' or 'it_admin' = any(coalesce(actor.secondary_roles, array[]::text[])))
      and target."formType" in ('cctv_access_request', 'it_help_desk', 'it_admin_request', 'it_application_request', 'it_facilities_requisition')
    )
    or (
      (actor.role = 'safety_admin' or 'safety_admin' = any(coalesce(actor.secondary_roles, array[]::text[])))
      and target."formType" = 'permit_to_work'
    );

  if not allowed then raise exception 'You are not authorized to void this submission.'; end if;

  update public.submissions
  set status = 'voided',
      data = coalesce(data, '{}'::jsonb) || jsonb_build_object(
        'voidReason', trim(p_reason),
        'voidedById', actor.id,
        'voidedByName', actor.name,
        'voidedByRole', actor.role,
        'voidedAt', now(),
        'statusBeforeVoid', target.status,
        'lastUpdatedAt', now()
      )
  where id::text = p_submission_id;
end;
$$;
