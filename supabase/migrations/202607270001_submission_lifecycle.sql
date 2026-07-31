-- Controlled submission lifecycle:
-- admins may void submissions in their area; active Super Admins may permanently
-- delete only terminal records while preserving an immutable audit snapshot.

create table if not exists public.submission_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null,
  reference_number text,
  form_type text not null,
  final_status text not null,
  employee_name text,
  deletion_reason text not null,
  deleted_by text not null,
  deleted_by_name text not null,
  deleted_at timestamptz not null default now(),
  submission_snapshot jsonb not null
);

alter table public.submission_deletion_audit enable row level security;

drop policy if exists "Super admins can view submission deletion audit" on public.submission_deletion_audit;
create policy "Super admins can view submission deletion audit"
on public.submission_deletion_audit for select
using (
  exists (
    select 1 from public.users
    where users.id::text = auth.uid()::text
      and users.role = 'super_admin'
      and users.status = 'active'
  )
);

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

create or replace function public.permanently_delete_submission(p_submission_id text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.users%rowtype;
  target public.submissions%rowtype;
begin
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'A deletion reason of at least 5 characters is required.';
  end if;

  select * into actor from public.users
  where id::text = auth.uid()::text
    and role = 'super_admin'
    and status = 'active';
  if not found then raise exception 'Only an active Super Admin may permanently delete submissions.'; end if;

  select * into target from public.submissions where id::text = p_submission_id for update;
  if not found then raise exception 'Submission not found.'; end if;
  if target.status not in ('completed', 'rejected', 'voided') then
    raise exception 'Only completed, rejected, or voided submissions may be permanently deleted.';
  end if;

  insert into public.submission_deletion_audit (
    submission_id, reference_number, form_type, final_status, employee_name,
    deletion_reason, deleted_by, deleted_by_name, submission_snapshot
  ) values (
    target.id::text, target.data ->> 'refNo', target."formType", target.status,
    target."employeeName", trim(p_reason), actor.id, actor.name, to_jsonb(target)
  );

  delete from public.notification_user_states
  where notification_id like target.id::text || '-%';

  delete from public.submissions where id = target.id;
  return coalesce(target.data, '{}'::jsonb);
end;
$$;

revoke all on function public.void_submission(text, text) from public;
revoke all on function public.permanently_delete_submission(text, text) from public;
grant execute on function public.void_submission(text, text) to authenticated;
grant execute on function public.permanently_delete_submission(text, text) to authenticated;
