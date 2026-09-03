import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AppUser = { id: string; name: string | null; email: string | null };
type Submission = {
  id: string;
  formType: string;
  status: string;
  submittedAt: string;
  submittedBy: string;
  employeeName: string;
  department: string | null;
  data: Record<string, unknown> | null;
};

type NotificationTarget = {
  eventType: string;
  audience: "approver" | "submitter";
  userIds?: string[];
  name?: string;
  role?: string;
  subject: string;
  heading: string;
  // Dashboard route the CTA button deep-links to (opened after login).
  path: string;
  // Human label for the recipient's part in this request, e.g. "Head of Section".
  roleLabel?: string;
  // true when a specific person was picked for this stage, false for a whole team/role.
  namedApprover?: boolean;
  // Overrides the default body text (used for submitter-facing outcomes).
  message?: string;
};

const APPROVALS_PATH = "/admin/approvals";
const SUBMITTER_PATH = "/submissions";

const itAdminPath = (formType: string) =>
  formType === "it_help_desk" ? "/admin/it/help-desk"
    : formType === "cctv_access_request" ? "/admin/it"
      : "/admin/it/facilities";

const formLabels: Record<string, string> = {
  car_rental: "Company Vehicle Request",
  leave: "Gate Pass",
  claim: "Petty Cash Claim",
  cctv_access_request: "CCTV Access Request",
  it_help_desk: "IT Help Desk Request",
  it_admin_request: "IT Administration Request",
  it_application_request: "IT Application Request",
  it_facilities_requisition: "IT Facilities Requisition",
  ppe_request: "PPE / Uniform / Office Supplies Request",
  ppe_purchase: "PPE / Uniform Purchase",
  material_requisition_slip: "Material Requisition Slip (MRS)",
  permit_to_work: "Permit to Work",
};

const IT_FORMS = new Set([
  "cctv_access_request",
  "it_help_desk",
  "it_admin_request",
  "it_application_request",
  "it_facilities_requisition",
]);

// Record-only forms (Safety department dashboards, inventory/monitoring logs, and
// the auto-approved PPE / Uniform / Office Supplies requests). These are stored
// straight as "approved" with no approver workflow, so they never generate any
// email — not even a submitter confirmation.
const NO_NOTIFICATION_FORMS = new Set([
  "mixing_chemical_stages",
  "final_discharge",
  "waste_inventory",
  "daily_operation_monitoring",
  "inventory_addition",
  "ppe_request",
  "ppe_purchase",
]);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const selectedUserId = (data: Record<string, unknown>, key: string) => {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value : null;
};

function getTarget(submission: Submission): NotificationTarget | null {
  const data = submission.data ?? {};
  const label = formLabels[submission.formType] ?? submission.formType.replaceAll("_", " ");
  // Resolve a selected approver for a stage. Prefer the stored user id; fall back
  // to matching by the stored name (several forms only persist `*Name`). A stage
  // explicitly set to "N/A" never sends an email.
  const selected = (
    idKey: string,
    nameKeys: string[],
    stage: string,
    roleLabel: string,
    path = APPROVALS_PATH,
  ): NotificationTarget | null => {
    const base = {
      eventType: `approval_required_${stage}`,
      audience: "approver" as const,
      subject: `Action required: ${label}`,
      heading: "A submission needs your approval",
      path,
      roleLabel,
      namedApprover: true,
    };
    const id = selectedUserId(data, idKey);
    if (id) return { ...base, userIds: [id] };
    for (const nameKey of nameKeys) {
      const raw = data[nameKey];
      const nameValue = typeof raw === "string" ? raw.trim() : "";
      if (nameValue && nameValue.toUpperCase() !== "N/A") return { ...base, name: nameValue };
    }
    return null;
  };
  const role = (roleName: string, stage: string, path: string, roleLabel: string): NotificationTarget => ({
    eventType: `action_required_${stage}`,
    audience: "approver",
    role: roleName,
    subject: `Action required: ${label}`,
    heading: "A submission needs your team's attention",
    path,
    roleLabel,
    namedApprover: false,
  });
  const submitter = (eventType: string, subject: string, heading: string, message: string): NotificationTarget => ({
    eventType,
    audience: "submitter",
    userIds: [submission.submittedBy],
    subject,
    heading,
    path: SUBMITTER_PATH,
    message,
  });
  switch (submission.status) {
    case "pending":
      // IT Help Desk has no HOS/HOD stage — it routes straight to IT Admin.
      if (submission.formType === "it_help_desk") return role("it_admin", "it", itAdminPath(submission.formType), "IT Admin");
      // Permit to Work routes straight to the Safety Department team for approval.
      if (submission.formType === "permit_to_work") return role("safety_admin", "safety", "/admin/safety/permit-to-work", "Safety Department");
      return selected("hosUserId", ["hosName", "hos"], "hos", "Head of Section");
    case "pending_closure":
      return submission.formType === "permit_to_work"
        ? role("safety_admin", "safety_closure", "/admin/safety/permit-to-work", "Safety Department")
        : null;
    case "approved_hos":
      return selected("hodUserId", ["hodName", "hod"], "hod", "Head of Department");
    case "approved_hod":
      if (submission.formType === "leave") return selected("mancoMemberUserId", ["mancoMemberName"], "manco", "MANCO member");
      if (submission.formType === "claim") return selected("hopUserId", ["hopName"], "purchasing", "Head of Purchasing");
      if (submission.formType === "car_rental") return role("hr_admin", "hr", "/admin/hr", "HR Admin");
      if (IT_FORMS.has(submission.formType)) return role("it_admin", "it", itAdminPath(submission.formType), "IT Admin");
      return null;
    case "pending_finance_review":
      return submission.formType === "claim" ? role("finance_admin", "finance_review", "/admin/finance", "Finance Admin") : null;
    case "approved_hop":
      return submission.formType === "claim" ? selected("hofUserId", ["hofName"], "finance_approval", "Head of Finance") : null;
    case "approved_hof":
      return submission.formType === "claim" ? role("finance_admin", "payment", "/admin/finance", "Finance Admin") : null;
    case "reopened":
      return IT_FORMS.has(submission.formType) ? role("it_admin", "it_reopened", itAdminPath(submission.formType), "IT Admin") : null;
    case "awaiting_confirmation":
      return submitter("employee_confirmation_required", `Please review: ${label}`, "Your confirmation is required",
        "Open this request in the system and confirm the details so it can move forward.");
    case "paid":
      return submission.formType === "claim"
        ? submitter("payment_acknowledgement_required", `Payment processed: ${label}`, "Your payment acknowledgement is required",
          "Your claim has been paid. Please open the system and acknowledge that you received the payment.")
        : null;
    case "approved":
      if (submission.formType === "permit_to_work") {
        return submitter("permit_authorised", `Approved: ${label}`, "Your Permit to Work has been approved",
          "The Safety Department has approved this permit. Work may proceed within the approved dates. Confirm completion in the system when the work is done.");
      }
      return submitter("submission_approved", `Approved: ${label}`, "Your submission has been approved",
        "Your submission has been approved. No further action is needed from you.");
    case "completed":
      return submission.formType === "permit_to_work"
        ? submitter("permit_closed", `Closed: ${label}`, "Your Permit to Work has been closed",
          "The Safety Department has verified the work and closed this permit. No further action is needed.")
        : null;
    case "rejected":
      return submitter("submission_rejected", `Rejected: ${label}`, "Your submission has been rejected",
        "Your submission was rejected. Open it in the system to see the reason and resubmit if needed.");
    default:
      return null;
  }
}

// MRS (store requisition): only the selected Store PIC is notified.
function getTargets(submission: Submission): NotificationTarget[] {
  if (NO_NOTIFICATION_FORMS.has(submission.formType)) return [];

  if (submission.status === "pending" && submission.formType === "material_requisition_slip") {
    const data = submission.data ?? {};
    const label = formLabels[submission.formType] ?? submission.formType.replaceAll("_", " ");
    const base = {
      eventType: "action_required_store_pic",
      audience: "approver" as const,
      subject: `Action required: ${label}`,
      heading: "A submission needs your approval",
      path: "/admin/store",
      roleLabel: "Store PIC",
      namedApprover: true,
    };

    const picId = selectedUserId(data, "storePicUserId");
    const picName = typeof data.storePicName === "string" ? data.storePicName.trim() : "";
    if (picId) return [{ ...base, userIds: [picId] }];
    if (picName) return [{ ...base, name: picName }];
    return [];
  }

  const target = getTarget(submission);
  return target ? [target] : [];
}

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "Asia/Kuala_Lumpur",
  });
};

// Shared pieces so the HTML and plain-text bodies never drift apart.
function emailParts(submission: Submission, target: NotificationTarget, appUrl: string) {
  const formLabel = formLabels[submission.formType] ?? submission.formType.replaceAll("_", " ");
  const reference = String(submission.data?.refNo ?? submission.id);
  const department = submission.department
    ?? (submission.data as Record<string, any> | null)?.employeeInfo?.department
    ?? "—";
  const ctaUrl = `${appUrl.replace(/\/$/, "")}${target.path}`;

  const intro = target.message
    ?? (target.roleLabel
      ? (target.namedApprover
        ? `You are named as the ${target.roleLabel} for this request. Please review it in the system and record your approval or rejection.`
        : `This request has reached the ${target.roleLabel} team and needs to be actioned in the system.`)
      : "This request needs your attention in the system.");

  const ctaLabel = target.audience === "approver" ? "Review in HDSB E-Form" : "Open in HDSB E-Form";

  const preheader = target.audience === "approver"
    ? `${submission.employeeName} submitted a ${formLabel} (${reference}) — your action is needed.`
    : target.heading;

  const rows: Array<[string, string]> = [
    ["Submitter", submission.employeeName],
    ["Department", String(department)],
    ["Form type", formLabel],
    ["Reference number", reference],
    ["Submitted", formatWhen(submission.submittedAt)],
  ];

  return { formLabel, reference, intro, ctaLabel, ctaUrl, preheader, rows };
}

function emailHtml(submission: Submission, target: NotificationTarget, appUrl: string) {
  const { intro, ctaLabel, ctaUrl, preheader, rows } = emailParts(submission, target, appUrl);
  const rowsHtml = rows.map(([k, v]) =>
    `<tr><td style="padding:10px 0;color:#667085;border-bottom:1px solid #eee">${escapeHtml(k)}</td><td style="padding:10px 0;text-align:right;font-weight:600;border-bottom:1px solid #eee">${escapeHtml(v)}</td></tr>`
  ).join("");
  return `<!doctype html>
  <html lang="en"><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#172033">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all">${escapeHtml(preheader)}</span>
    <div style="max-width:600px;margin:0 auto;padding:32px 16px">
      <div style="background:#fff;border:1px solid #e4e8ee;border-radius:14px;overflow:hidden">
        <div style="background:#003366;padding:22px 28px;color:#fff"><strong style="font-size:18px">HDSB E-Form System</strong></div>
        <div style="padding:28px">
          <h1 style="font-size:22px;margin:0 0 12px;color:#003366">${escapeHtml(target.heading)}</h1>
          <p style="margin:0 0 22px;font-size:14px;line-height:1.5;color:#475467">${escapeHtml(intro)}</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px">
            ${rowsHtml}
          </table>
          <div style="margin-top:28px;text-align:center"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#003366;color:#fff;text-decoration:none;padding:13px 24px;border-radius:8px;font-weight:700">${escapeHtml(ctaLabel)}</a></div>
          <p style="margin:22px 0 0;font-size:12px;color:#98a2b3">If the button does not work, copy this link into your browser:<br>${escapeHtml(ctaUrl)}</p>
        </div>
      </div>
      <p style="text-align:center;color:#98a2b3;font-size:12px;margin:16px 0">This is an automated notification from the HDSB E-Form System. Please do not reply to this email.</p>
    </div>
  </body></html>`;
}

function emailText(submission: Submission, target: NotificationTarget, appUrl: string) {
  const { intro, ctaLabel, ctaUrl, rows } = emailParts(submission, target, appUrl);
  return [
    target.heading,
    "",
    intro,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `${ctaLabel}: ${ctaUrl}`,
    "",
    "This is an automated notification from the HDSB E-Form System. Please do not reply to this email.",
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const appUrl = Deno.env.get("APP_URL");
    if (!supabaseUrl || !anonKey || !serviceKey || !resendKey || !fromEmail || !appUrl) {
      throw new Error("Missing required Edge Function secrets");
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Unauthorized" }, 401);
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const submissionId = typeof body?.submissionId === "string" ? body.submissionId : "";
    if (!submissionId) return json({ error: "submissionId is required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: rawSubmission, error: submissionError } = await admin
      .from("submissions").select("id, formType, status, submittedAt, submittedBy, employeeName, department, data")
      .eq("id", submissionId).single();
    if (submissionError || !rawSubmission) return json({ error: "Submission not found" }, 404);
    const submission = rawSubmission as Submission;
    const targets = getTargets(submission);
    if (!targets.length) return json({ sent: 0, skipped: "No email is required for this workflow state" });

    const stateChangedAt = String(submission.data?.lastUpdatedAt ?? submission.submittedAt);
    let sent = 0;
    const errors: string[] = [];

    for (const target of targets) {
      let recipients: AppUser[] = [];
      if (target.userIds?.length) {
        const { data } = await admin.from("users").select("id, name, email").in("id", target.userIds).eq("status", "active");
        recipients.push(...((data ?? []) as AppUser[]));
      }
      if (target.name) {
        const { data } = await admin.from("users").select("id, name, email").ilike("name", target.name).eq("status", "active");
        recipients.push(...((data ?? []) as AppUser[]));
      }
      if (target.role) {
        const { data } = await admin.from("users").select("id, name, email").eq("status", "active")
          .or(`role.eq.${target.role},secondary_roles.cs.{${target.role}}`);
        recipients.push(...((data ?? []) as AppUser[]));
      }
      recipients = recipients.filter((user) => Boolean(user.email));
      if (!recipients.length) continue;

      const eventKey = `${target.eventType}:${stateChangedAt}`;

      for (const recipient of recipients) {
        const { data: existing } = await admin.from("submission_email_deliveries")
          .select("id, status").eq("submission_id", submission.id).eq("event_key", eventKey)
          .eq("recipient_user_id", recipient.id).maybeSingle();
        if (existing?.status === "sent") continue;

        const delivery = existing ?? (await admin.from("submission_email_deliveries").insert({
          submission_id: submission.id,
          event_key: eventKey,
          event_type: target.eventType,
          recipient_user_id: recipient.id,
          recipient_email: recipient.email,
          status: "processing",
        }).select("id, status").single()).data;
        if (!delivery) continue;

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: fromEmail,
            to: [recipient.email],
            subject: target.subject,
            html: emailHtml(submission, target, appUrl),
            text: emailText(submission, target, appUrl),
          }),
        });
        const result = await response.json();
        if (response.ok) {
          await admin.from("submission_email_deliveries").update({ status: "sent", provider_message_id: result.id, sent_at: new Date().toISOString(), error_message: null }).eq("id", delivery.id);
          sent += 1;
        } else {
          const message = String(result?.message ?? "Email provider rejected the message");
          await admin.from("submission_email_deliveries").update({ status: "failed", error_message: message }).eq("id", delivery.id);
          errors.push(`${recipient.id}: ${message}`);
        }
      }
    }

    if (sent === 0 && errors.length === 0) return json({ sent: 0, skipped: "No active recipient with an email address was found" });
    return json({ sent, failed: errors.length, errors });
  } catch (error) {
    console.error("send-notification failed", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
