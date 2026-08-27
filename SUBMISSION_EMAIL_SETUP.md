# Submission email notification setup

Submission notifications use the `send-notification` Edge Function and Resend.
The Gmail SMTP settings under Supabase Auth are separate and continue to handle
registration, OTP, and password-recovery emails.

## Notification workflow

Approver stages resolve to the selected person by stored user id, falling back to
the stored name when only the name was persisted (Gate Pass, Car Booking, CCTV,
IT request forms). A stage set to `N/A` sends no email for that stage.

- New submission: selected HOS (or the next applicable stage when HOS is N/A)
- HOS approval: selected HOD
- Gate Pass HOD approval: selected MANCO member (Gate Pass ends here — HOS → HOD →
  MANCO only; Security Guards are not emailed)
- Petty Cash HOD approval: selected Head of Purchasing
- Petty Cash purchasing review: active Finance Admins
- Petty Cash finance review: selected Head of Finance
- Petty Cash finance approval: active Finance Admins for payment
- Vehicle HOD approval: active HR Admins
- IT Help Desk submission: active IT Admins (no HOS/HOD stage on that form)
- Other IT forms (CCTV, IT Admin/Application/Facilities): HOS → HOD → active IT Admins
- MRS / store requisition: selected Store PIC only
- Rejection or final approval: submitter
- Claim payment: submitter for acknowledgement
- IT resolution: submitter for confirmation
- IT request returned by employee: active IT Admins

No email is sent for Safety department records (mixing & chemical stages, final
discharge, waste inventory), inventory/monitoring logs, or the auto-approved
PPE / Uniform / Office Supplies requests.

Emails contain only the submitter name, form type, reference number, and a link
to the system. Delivery failures are logged separately and never roll back the
submission or approval update.

## Required Resend configuration

1. Add and verify the sending domain in Resend.
2. Configure the SPF and DKIM DNS records shown by Resend (see below).
3. Create a Resend API key with sending permission.
4. Use a sender on the verified domain, for example:
   `HDSB E-Form <notifications@yourdomain.com>`.

Resend's `onboarding@resend.dev` address is only suitable for restricted testing
and should not be used for production recipients.

### DNS setup on eNom for hidsb.com

Resend needs three records to trust `hidsb.com` as a sender. They all live on
dedicated subdomains, so they never touch the root domain's existing mail
records (the ones eNom's "Email Settings" manages for company mailboxes).

| Type | Host (as shown by Resend) | Purpose |
| --- | --- | --- |
| MX  | `send.hidsb.com` | Return-Path for outbound mail (priority 10) |
| TXT | `send.hidsb.com` | SPF: `v=spf1 include:amazonses.com ~all` |
| TXT | `resend._domainkey.hidsb.com` | DKIM public key |
| TXT | `_dmarc.hidsb.com` (optional) | `v=DMARC1; p=none;` |

Always copy the exact values from **Resend → Domains → hidsb.com → Records** —
they're unique per account. Don't paste the actual key values into chat.

**Adding them in eNom** (access.enom.com):

1. Log in → **Domains → My domains** → select `hidsb.com` → **Manage domain →
   Host records**. (Not "Email Settings" — that only controls the existing
   company mailbox MX records; leave it alone.)
2. For each row in the table above, click **Add** and fill in:
   - **Host Name**: only the prefix — eNom auto-appends `.hidsb.com`.
     e.g. enter `send`, `resend._domainkey`, or `_dmarc`.
   - **Record Type**: `MX` or `TXT` to match the row.
   - **Address/Value**: paste Resend's value exactly, character-for-character.
   - **MX Preference/Priority** (MX row only): the priority Resend shows
     (usually `10`).
   - Leave TTL at eNom's default (3600s).
3. Confirm `hidsb.com` is actually using eNom's own nameservers — host records
   only take effect if the domain isn't delegated elsewhere.
4. Back in Resend, click **Verify DNS Records**. Propagation is usually fast
   but can take up to 8-24 hours.

Once verified, the Edge Function secrets below are ready to use as-is — no
code changes needed, since the Edge Function already calls `api.resend.com`
with `RESEND_API_KEY`.

> **Watch out:** if `hidsb.com`'s root domain already has its own SPF TXT
> record for the real mail server, leave it alone — Resend's SPF lives on the
> separate `send` subdomain. Only touch an existing SPF record if Resend's
> Records tab specifically asks for a TXT record on the bare `@`/root host
> (uncommon) — a hostname can only have one SPF TXT record, so two would
> break both.

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
