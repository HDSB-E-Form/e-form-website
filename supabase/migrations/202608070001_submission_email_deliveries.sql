-- Idempotent audit log for workflow email notifications. This table is only
-- accessed by the send-notification Edge Function through the service role.
create table if not exists public.submission_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null,
  event_key text not null,
  event_type text not null,
  recipient_user_id uuid not null,
  recipient_email text not null,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (submission_id, event_key, recipient_user_id)
);

create index if not exists submission_email_deliveries_submission_idx
  on public.submission_email_deliveries (submission_id, created_at desc);

alter table public.submission_email_deliveries enable row level security;

revoke all on table public.submission_email_deliveries from anon, authenticated;
