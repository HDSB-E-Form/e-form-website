import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const PENDING_APPROVAL_STATUSES = [
  "pending",
  "approved_hos",
  "approved_hod",
  "approved_manco",
  "pending_finance_review",
  "approved_hop",
  "approved_hof",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("Missing required Edge Function secrets");

    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Unauthorized" }, 401);
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: callerProfile, error: callerError } = await admin
      .from("users").select("id, role, status").eq("id", authData.user.id).single();
    if (callerError || !callerProfile) return json({ error: "Caller profile not found" }, 403);
    if (callerProfile.role !== "super_admin") return json({ error: "Only Super Admins can delete users" }, 403);
    if (callerProfile.status === "inactive") return json({ error: "Your account is inactive" }, 403);

    const body = await req.json();
    const targetUserId = typeof body?.userId === "string" ? body.userId : "";
    if (!targetUserId) return json({ error: "userId is required" }, 400);
    if (targetUserId === authData.user.id) return json({ error: "You cannot delete your own account" }, 400);

    const { data: targetProfile, error: targetLookupError } = await admin
      .from("users").select("id, name, email, role, status, department, secondary_roles")
      .eq("id", targetUserId).maybeSingle();
    if (targetLookupError) throw targetLookupError;
    if (!targetProfile) return json({ error: "User not found" }, 404);
    if (targetProfile.status !== "inactive") {
      return json({ error: "Only inactive accounts can be permanently deleted. Deactivate this user first." }, 409);
    }

    // A submission assigned by ID to this user for a stage they haven't acted on
    // yet becomes permanently unclaimable once the user is gone (no reassignment
    // feature exists), so block deletion rather than create a dead-end request.
    const approverColumns = ["hosUserId", "hodUserId", "mancoMemberUserId", "hopUserId", "hofUserId"];
    const { count: pendingApprovalCount, error: pendingCheckError } = await admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .in("status", PENDING_APPROVAL_STATUSES)
      .or(approverColumns.map(col => `data->>${col}.eq.${targetUserId}`).join(","));
    if (pendingCheckError) throw pendingCheckError;
    if (pendingApprovalCount && pendingApprovalCount > 0) {
      return json({
        error: `This user is the assigned approver on ${pendingApprovalCount} submission(s) still awaiting their action. Reassign or resolve those first, or deactivate the account instead of deleting it.`,
        blocked: true,
        pendingApprovalCount,
      }, 409);
    }

    // Revoke login first so a failure partway through can never leave a still
    // logged-in-capable account behind; an orphaned profile row afterward is
    // harmless dead data, an orphaned login is not.
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(targetUserId);
    if (authDeleteError && authDeleteError.code !== "user_not_found") throw authDeleteError;

    const { error: profileDeleteError } = await admin.from("users").delete().eq("id", targetUserId);
    if (profileDeleteError) {
      console.error("Auth account deleted but profile row removal failed", profileDeleteError);
      return json({
        error: `The login was removed, but the profile record could not be deleted (${profileDeleteError.message}). It is now an orphaned, inaccessible row — clean it up manually from the Table Editor.`,
      }, 500);
    }

    return json({
      success: true,
      deletedUser: { id: targetProfile.id, name: targetProfile.name, email: targetProfile.email, role: targetProfile.role, status: targetProfile.status, department: targetProfile.department, secondary_roles: targetProfile.secondary_roles || [] },
    });
  } catch (error) {
    console.error("delete-user failed", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
