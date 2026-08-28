import { createClient } from "@supabase/supabase-js";

// Scheduled scan (see supabase/migrations/202608270001_gate_pass_overdue_cron.sql).
// For every PERSONAL gate pass where security has logged the exit (status
// "on_leave") but the employee is now more than 2 hours past that recorded
// exit time and has not been logged back in, send a one-time overdue alert to:
//   - the employee who submitted it
//   - the HOD selected on the form
//   - HR (HR_NOTIFICATION_EMAIL)
// A `personalOverdueNotifiedAt` flag on the submission keeps it to one alert.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

// 2 hours past the guard-recorded actual time out.
const OVERDUE_AFTER_MS = 2 * 60 * 60 * 1000;

type AppUser = { id: string; name: string | null; email: string | null };

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatDateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", {
  day: "numeric", month: "short", year: "numeric",
  hour: "numeric", minute: "2-digit", hour12: true,
  timeZone: "Asia/Kuala_Lumpur",
});

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

type OverdueEmail = {
  employeeName: string;
  department: string;
  reference: string;
  leftAt: string;
  overdueBy: string;
  appUrl: string;
};

const overdueRows = (o: OverdueEmail): Array<[string, string]> => [
  ["Employee", o.employeeName],
  ["Department", o.department],
  ["Reference number", o.reference],
  ["Left at", o.leftAt],
  ["Overdue by", o.overdueBy],
];

function emailHtml(o: OverdueEmail) {
  // Security dashboard, where the guard logs the return.
  const ctaUrl = `${o.appUrl.replace(/\/$/, "")}/admin/security`;
  const preheader = `${o.employeeName} left on a personal gate pass ${o.overdueBy} ago and has not returned.`;
  const rowsHtml = overdueRows(o).map(([k, v]) =>
    `<tr><td style="padding:10px 0;color:#667085;border-bottom:1px solid #eee">${escapeHtml(k)}</td><td style="padding:10px 0;text-align:right;font-weight:600;border-bottom:1px solid #eee">${escapeHtml(v)}</td></tr>`
  ).join("");
  return `<!doctype html>
  <html lang="en"><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#172033">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all">${escapeHtml(preheader)}</span>
    <div style="max-width:600px;margin:0 auto;padding:32px 16px">
      <div style="background:#fff;border:1px solid #e4e8ee;border-radius:14px;overflow:hidden">
        <div style="background:#b42318;padding:22px 28px;color:#fff"><strong style="font-size:18px">HDSB E-Form System</strong></div>
        <div style="padding:28px">
          <h1 style="font-size:22px;margin:0 0 12px;color:#b42318">Personal gate pass overdue</h1>
          <p style="margin:0 0 22px;font-size:14px;line-height:1.5;color:#475467">This employee left on a personal gate pass and has not been logged back in by security. They are now more than 2 hours past their recorded exit time. Please check on them and, once they return, have security log the entry.</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px">
            ${rowsHtml}
          </table>
          <div style="margin-top:28px;text-align:center"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#003366;color:#fff;text-decoration:none;padding:13px 24px;border-radius:8px;font-weight:700">Open the Security dashboard</a></div>
          <p style="margin:22px 0 0;font-size:12px;color:#98a2b3">If the button does not work, copy this link into your browser:<br>${escapeHtml(ctaUrl)}</p>
        </div>
      </div>
      <p style="text-align:center;color:#98a2b3;font-size:12px;margin:16px 0">This is an automated notification from the HDSB E-Form System. Please do not reply to this email.</p>
    </div>
  </body></html>`;
}

function emailText(o: OverdueEmail) {
  const ctaUrl = `${o.appUrl.replace(/\/$/, "")}/admin/security`;
  return [
    "Personal gate pass overdue",
    "",
    "This employee left on a personal gate pass and has not been logged back in by security. They are now more than 2 hours past their recorded exit time.",
    "",
    ...overdueRows(o).map(([k, v]) => `${k}: ${v}`),
    "",
    `Open the Security dashboard: ${ctaUrl}`,
    "",
    "This is an automated notification from the HDSB E-Form System. Please do not reply to this email.",
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const appUrl = Deno.env.get("APP_URL");
    const hrEmail = Deno.env.get("HR_NOTIFICATION_EMAIL");
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!supabaseUrl || !serviceKey || !resendKey || !fromEmail || !appUrl || !hrEmail) {
      throw new Error("Missing required Edge Function secrets");
    }

    // Optional shared-secret gate. Enforced only when CRON_SECRET is configured.
    if (cronSecret) {
      const provided = req.headers.get("x-cron-secret")
        ?? (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (provided !== cronSecret) return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: rows, error } = await admin
      .from("submissions")
      .select("id, employeeName, department, submittedBy, data")
      .eq("formType", "leave")
      .eq("status", "on_leave");
    if (error) throw error;

    const now = Date.now();
    const candidates = (rows ?? []).filter((s: Record<string, any>) => {
      const d = s.data ?? {};
      if (d.purposeType !== "personal") return false;
      if (d.personalOverdueNotifiedAt) return false;
      const outIso = d.securityLog?.actualTimeOut;
      if (typeof outIso !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(outIso)) return false;
      const outMs = new Date(outIso).getTime();
      if (!Number.isFinite(outMs)) return false;
      return now - outMs >= OVERDUE_AFTER_MS;
    });

    let notified = 0;
    const errors: string[] = [];

    for (const sub of candidates) {
      const d = sub.data ?? {};
      const outIso = d.securityLog.actualTimeOut as string;
      const minutesOut = Math.floor((now - new Date(outIso).getTime()) / 60000);

      // Resolve the employee and HOD emails.
      const lookupIds: string[] = [];
      if (typeof sub.submittedBy === "string" && sub.submittedBy) lookupIds.push(sub.submittedBy);
      if (typeof d.hodUserId === "string" && d.hodUserId) lookupIds.push(d.hodUserId);

      let employeeEmail: string | null = null;
      const otherEmails = new Set<string>();

      if (lookupIds.length) {
        const { data: users } = await admin.from("users").select("id, name, email").in("id", lookupIds).eq("status", "active");
        for (const u of (users ?? []) as AppUser[]) {
          if (!u.email) continue;
          if (u.id === sub.submittedBy) employeeEmail = u.email;
          else otherEmails.add(u.email);
        }
      }
      // HOD stored by name only (older Gate Pass submissions).
      if (!d.hodUserId && typeof d.hodName === "string" && d.hodName.trim() && d.hodName.trim().toUpperCase() !== "N/A") {
        const { data: byName } = await admin.from("users").select("id, name, email").ilike("name", d.hodName.trim()).eq("status", "active");
        for (const u of (byName ?? []) as AppUser[]) if (u.email) otherEmails.add(u.email);
      }

      otherEmails.add(hrEmail);

      const to = employeeEmail ? [employeeEmail] : [hrEmail];
      const cc = [...otherEmails].filter(email => !to.includes(email));

      const emailData = {
        employeeName: sub.employeeName || d.employeeInfo?.name || "Unknown",
        department: sub.department || d.employeeInfo?.department || "—",
        reference: String(d.refNo ?? sub.id),
        leftAt: formatDateTime(outIso),
        overdueBy: formatDuration(minutesOut),
        appUrl,
      };

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: fromEmail,
          to,
          cc: cc.length ? cc : undefined,
          subject: `Overdue: ${sub.employeeName || "An employee"} has not returned from a personal gate pass`,
          html: emailHtml(emailData),
          text: emailText(emailData),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        // Leave the flag unset so the next run retries.
        errors.push(`${sub.id}: ${result?.message ?? "Resend rejected the message"}`);
        continue;
      }

      const nowIso = new Date().toISOString();
      const { error: updateError } = await admin
        .from("submissions")
        .update({ data: { ...d, personalOverdueNotifiedAt: nowIso, lastUpdatedAt: nowIso } })
        .eq("id", sub.id);
      if (updateError) errors.push(`${sub.id}: alert sent but flag update failed - ${updateError.message}`);
      notified += 1;
    }

    return json({ scanned: (rows ?? []).length, candidates: candidates.length, notified, failed: errors.length, errors });
  } catch (error) {
    console.error("check-overdue-gate-passes failed", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
