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
};

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
  const selected = (idKey: string, nameKeys: string[], stage: string): NotificationTarget | null => {
    const base = {
      eventType: `approval_required_${stage}`,
      audience: "approver" as const,
      subject: `Action required: ${label}`,
      heading: "A submission requires your approval",
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
  const role = (roleName: string, stage: string): NotificationTarget => ({
    eventType: `action_required_${stage}`,
    audience: "approver",
    role: roleName,
    subject: `Action required: ${label}`,
    heading: "A submission requires your attention",
  });
  const submitter = (eventType: string, subject: string, heading: string): NotificationTarget => ({
    eventType,
    audience: "submitter",
    userIds: [submission.submittedBy],
    subject,
    heading,
  });
  switch (submission.status) {
    case "pending":
      // IT Help Desk has no HOS/HOD stage — it routes straight to IT Admin.
      if (submission.formType === "it_help_desk") return role("it_admin", "it");
      return selected("hosUserId", ["hosName", "hos"], "hos");
    case "approved_hos":
      return selected("hodUserId", ["hodName", "hod"], "hod");
    case "approved_hod":
      if (submission.formType === "leave") return selected("mancoMemberUserId", ["mancoMemberName"], "manco");
      if (submission.formType === "claim") return selected("hopUserId", ["hopName"], "purchasing");
      if (submission.formType === "car_rental") return role("hr_admin", "hr");
      if (IT_FORMS.has(submission.formType)) return role("it_admin", "it");
      return null;
    case "pending_finance_review":
      return submission.formType === "claim" ? role("finance_admin", "finance_review") : null;
    case "approved_hop":
      return submission.formType === "claim" ? selected("hofUserId", ["hofName"], "finance_approval") : null;
    case "approved_hof":
      return submission.formType === "claim" ? role("finance_admin", "payment") : null;
    case "reopened":
      return IT_FORMS.has(submission.formType) ? role("it_admin", "it_reopened") : null;
    case "awaiting_confirmation":
      return submitter("employee_confirmation_required", `Please review: ${label}`, "Your confirmation is required");
    case "paid":
      return submission.formType === "claim"
        ? submitter("payment_acknowledgement_required", `Payment processed: ${label}`, "Your payment acknowledgement is required")
        : null;
    case "approved":
      return submitter("submission_approved", `Approved: ${label}`, "Your submission has been approved");
    case "rejected":
      return submitter("submission_rejected", `Rejected: ${label}`, "Your submission has been rejected");
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
    const targets: NotificationTarget[] = [];

    const picId = selectedUserId(data, "storePicUserId");
    const picName = typeof data.storePicName === "string" ? data.storePicName.trim() : "";
    if (picId) {
      targets.push({
        eventType: "action_required_store_pic",
        audience: "approver",
        userIds: [picId],
        subject: `Action required: ${label}`,
        heading: "A submission requires your approval",
      });
    } else if (picName) {
      targets.push({
        eventType: "action_required_store_pic",
        audience: "approver",
        name: picName,
        subject: `Action required: ${label}`,
        heading: "A submission requires your approval",
      });
    }

    return targets;
  }

  const target = getTarget(submission);
  return target ? [target] : [];
}

function emailHtml(submission: Submission, target: NotificationTarget, appUrl: string) {
  const formLabel = formLabels[submission.formType] ?? submission.formType.replaceAll("_", " ");
  const reference = submission.data?.refNo ?? submission.id;
  const systemUrl = `${appUrl.replace(/\/$/, "")}/login`;
  return `<!doctype html>
  <html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#172033">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px">
      <div style="background:#fff;border:1px solid #e4e8ee;border-radius:14px;overflow:hidden">
        <div style="background:#003366;padding:22px 28px;color:#fff"><strong style="font-size:18px">HDSB E-Form System</strong></div>
        <div style="padding:28px">
          <h1 style="font-size:22px;margin:0 0 22px;color:#003366">${escapeHtml(target.heading)}</h1>
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px">
            <tr><td style="padding:10px 0;color:#667085;border-bottom:1px solid #eee">Submitter</td><td style="padding:10px 0;text-align:right;font-weight:600;border-bottom:1px solid #eee">${escapeHtml(submission.employeeName)}</td></tr>
            <tr><td style="padding:10px 0;color:#667085;border-bottom:1px solid #eee">Form type</td><td style="padding:10px 0;text-align:right;font-weight:600;border-bottom:1px solid #eee">${escapeHtml(formLabel)}</td></tr>
            <tr><td style="padding:10px 0;color:#667085;border-bottom:1px solid #eee">Reference number</td><td style="padding:10px 0;text-align:right;font-weight:600;border-bottom:1px solid #eee">${escapeHtml(reference)}</td></tr>
          </table>
          <div style="margin-top:28px;text-align:center"><a href="${escapeHtml(systemUrl)}" style="display:inline-block;background:#003366;color:#fff;text-decoration:none;padding:13px 24px;border-radius:8px;font-weight:700">Open HDSB E-Form System</a></div>
        </div>
      </div>
      <p style="text-align:center;color:#98a2b3;font-size:12px;margin:16px 0">This is an automated system notification.</p>
    </div>
  </body></html>`;
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
      .from("submissions").select("id, formType, status, submittedAt, submittedBy, employeeName, data")
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
