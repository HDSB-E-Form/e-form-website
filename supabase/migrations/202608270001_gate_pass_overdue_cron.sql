-- Schedules the personal gate pass overdue check. Every 10 minutes pg_cron calls
-- the `check-overdue-gate-passes` Edge Function, which emails the employee, the
-- selected HOD, and HR once when a personal gate pass passes 2 hours out.
--
-- Requires the pg_cron and pg_net extensions (available on all Supabase projects).

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'gate-pass-overdue-check') then
    perform cron.unschedule('gate-pass-overdue-check');
  end if;
end $$;

select cron.schedule(
  'gate-pass-overdue-check',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://rfaikvgsulpbpsyfccku.supabase.co/functions/v1/check-overdue-gate-passes',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    -- If CRON_SECRET is set on the Edge Function, add it here as well:
    --   'x-cron-secret', '<the same value>'
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
