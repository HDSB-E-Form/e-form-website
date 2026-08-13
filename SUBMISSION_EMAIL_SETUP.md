# Submission email notification setup

Submission notifications use the `send-notification` Edge Function and Resend.
The Gmail SMTP settings under Supabase Auth are separate and continue to handle
registration, OTP, and password-recovery emails.

## Notification workflow

- New submission: selected HOS (or the next applicable stage when HOS is N/A)
- HOS approval: selected HOD
- Gate Pass HOD approval: selected MANCO member
- Gate Pass MANCO approval: active Security Guards
- Petty Cash HOD approval: selected Head of Purchasing
- Petty Cash purchasing review: active Finance Admins
- Petty Cash finance review: selected Head of Finance
- Petty Cash finance approval: active Finance Admins for payment
- Vehicle HOD approval: active HR Admins
- IT workflow action: active IT Admins
- Rejection or final approval: submitter
- Claim payment: submitter for acknowledgement
- IT resolution: submitter for confirmation
- IT request returned by employee: active IT Admins

Emails contain only the submitter name, form type, reference number, and a link
to the system. Delivery failures are logged separately and never roll back the
submission or approval update.

## Required Resend configuration

1. Add and verify the sending domain in Resend.
2. Configure the SPF and DKIM DNS records shown by Resend.
3. Create a Resend API key with sending permission.
4. Use a sender on the verified domain, for example:
   `HDSB E-Form <notifications@yourdomain.com>`.

Resend's `onboarding@resend.dev` address is only suitable for restricted testing
and should not be used for production recipients.

## Required Edge Function secrets

Set these in Supabase Dashboard under **Edge Functions > Secrets**:

```text
RESEND_API_KEY=https://rfaikvgsulpbpsyfccku.supabase.co/functions/v1/resend-email
RESEND_FROM_EMAIL=HDSB Management System <digitalization@hidsb.com>
APP_URL=https://hdsb-e-form.netlify.app
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are supplied
to hosted Supabase Edge Functions automatically and must never be put in the
browser environment.

## Deployment order

1. Apply `supabase/migrations/202608070001_submission_email_deliveries.sql`.
2. Add the three Edge Function secrets above.
3. Deploy the `send-notification` Edge Function with JWT verification enabled.
4. Deploy the web application.
5. Submit one test form and inspect:
   - Supabase **Edge Function Logs**
   - Resend **Emails** delivery log
   - `submission_email_deliveries` using the Supabase service/admin interface

## Operational checks

- Every selected approver must have an active row in `public.users` with a valid
  email address.
- Role-based recipients must be active and have the correct primary or secondary
  role.
- A successful delivery is idempotent for a workflow transition, preventing the
  same recipient from receiving duplicate messages if the function is invoked
  again.
- Failed attempts are recorded as `failed`; re-invoking the function for the same
  submission retries failed recipients without resending successful deliveries.
