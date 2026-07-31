-- Link every active vehicle checkout to the exact approved booking that
-- authorised it. Completed trips retain the same identifiers in cars.history.
alter table public.cars
  add column if not exists "activeSubmissionId" text,
  add column if not exists "activeSubmissionRefNo" text;

create unique index if not exists cars_one_active_checkout_per_submission_idx
  on public.cars ("activeSubmissionId")
  where status = 'checked_out' and "activeSubmissionId" is not null;
