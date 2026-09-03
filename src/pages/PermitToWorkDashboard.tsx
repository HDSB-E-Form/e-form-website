import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Clock, HardHat, Printer, Search, XCircle, ClipboardCheck, ShieldCheck, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ApprovalDashboardSkeleton from "@/components/ApprovalDashboardSkeleton";
import ApprovalOverview from "@/components/ApprovalOverview";
import EmployeeSummary from "@/components/EmployeeSummary";
import VoidSubmissionControl from "@/components/VoidSubmissionControl";
import PermitToWorkDetails from "@/components/PermitToWorkDetails";
import { useSubmissions, type Submission } from "@/contexts/SubmissionsContext";
import { useAuth } from "@/contexts/AuthContext";
import { appendApprovalRemark } from "@/lib/approvalRemarks";
import { PTW_STATUS_LABELS } from "@/lib/permitToWork";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

type Tab = "awaiting" | "active" | "closure" | "history";

const statusStyle: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  pending_closure: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  completed: "bg-[#57D51B] text-white hover:bg-[#57D51B]",
  rejected: "bg-destructive text-destructive-foreground hover:bg-destructive",
  voided: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};
const badge = (status: string) => ({ label: PTW_STATUS_LABELS[status] || status.toUpperCase(), className: statusStyle[status] || "bg-muted text-muted-foreground" });

const todayStr = () => new Date().toISOString().split("T")[0];

const shortDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const workingRange = (data: Record<string, unknown>) =>
  `${shortDate((data.workingFrom as string) || (data.workingDateFrom as string))} → ${shortDate((data.workingTo as string) || (data.workingDateTo as string))}`;

const PermitToWorkDashboard = () => {
  const { submissions, updateSubmission, updateSubmissionStatus, refreshSubmissions, isLoading } = useSubmissions();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("awaiting");
  const [selected, setSelected] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [isViewAll, setIsViewAll] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Section G — inspection form
  const [showInspection, setShowInspection] = useState(false);
  const [inspection, setInspection] = useState({ date: todayStr(), name: "", designation: "", department: "", comment: "", preventiveAction: "" });

  // Section D — the Safety Department records the "During" and "After" hot-work checks
  const [hotWorkChecks, setHotWorkChecks] = useState<{ during: Record<number, boolean>; after: Record<number, boolean> }>({ during: {}, after: {} });

  useEffect(() => { refreshSubmissions(); }, [refreshSubmissions]);
  useEffect(() => {
    setRemarks("");
    setShowInspection(false);
    setInspection({ date: todayStr(), name: user?.name || "", designation: user?.position || "", department: user?.department || "", comment: "", preventiveAction: "" });
    const measures = Array.isArray(selected?.data.hotWork?.measures) ? selected.data.hotWork.measures : [];
    const during: Record<number, boolean> = {};
    const after: Record<number, boolean> = {};
    measures.forEach((measure: { during?: boolean; after?: boolean }, i: number) => { during[i] = !!measure.during; after[i] = !!measure.after; });
    setHotWorkChecks({ during, after });
  }, [selected, user]);

  const permits = useMemo(() => submissions.filter(item => item.formType === "permit_to_work"), [submissions]);

  const tabPermits = permits.filter(item => {
    if (activeTab === "awaiting") return item.status === "pending";
    if (activeTab === "active") return item.status === "approved";
    if (activeTab === "closure") return item.status === "pending_closure";
    return ["completed", "rejected", "voided"].includes(item.status);
  });

  const visible = tabPermits.filter(item => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return item.employeeName.toLowerCase().includes(query)
      || (item.department || "").toLowerCase().includes(query)
      || (item.data.jobLocation || "").toLowerCase().includes(query)
      || (item.data.contractor?.company || "").toLowerCase().includes(query)
      || (item.data.refNo || "").toLowerCase().includes(query);
  });
  const displayed = isViewAll ? visible : visible.slice(0, 10);

  const stats = {
    awaiting: permits.filter(item => item.status === "pending").length,
    active: permits.filter(item => item.status === "approved").length,
    closure: permits.filter(item => item.status === "pending_closure").length,
    total: permits.length,
  };

  const refNo = (item: Submission) => item.data.refNo || `PTW-${item.id.slice(-5)}`;

  const withRemark = (item: Submission, action: "approved" | "rejected", remark: string) =>
    appendApprovalRemark(item.data.approvalRemarksHistory, {
      actorName: user?.name || "Safety Department",
      actorRole: "Safety Department",
      action,
      remark,
    });

  const handleApprove = async () => {
    if (!selected) return;
    if (selected.submittedBy === user?.id) return toast.error("You cannot approve a permit you submitted.");
    setIsSubmitting(true);
    const success = await updateSubmissionStatus(selected.id, "approved", {
      safetyApproval: { name: user?.name || "Safety Department", approvedAt: new Date().toISOString() },
      approvalRemarksHistory: withRemark(selected, "approved", remarks.trim()),
    });
    setIsSubmitting(false);
    if (success) { toast.success("Permit to Work approved. Work is authorised."); setSelected(null); }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!remarks.trim()) return toast.error("Enter a reason before rejecting this permit.");
    setIsSubmitting(true);
    const success = await updateSubmissionStatus(selected.id, "rejected", {
      rejectedStage: "safety",
      approvalRemarksHistory: withRemark(selected, "rejected", remarks.trim()),
    });
    setIsSubmitting(false);
    if (success) { toast.success("Permit to Work rejected."); setSelected(null); }
  };

  const handleAddInspection = async () => {
    if (!selected) return;
    if (!inspection.name.trim() || !inspection.comment.trim()) return toast.error("Enter the inspector name and a comment.");
    setIsSubmitting(true);
    const entry = { ...inspection, recordedByName: user?.name || "Safety", recordedAt: new Date().toISOString() };
    const success = await updateSubmission(selected.id, {
      siteInspections: [...(Array.isArray(selected.data.siteInspections) ? selected.data.siteInspections : []), entry],
    });
    setIsSubmitting(false);
    if (success) {
      toast.success("Site inspection recorded.");
      setSelected(current => current ? { ...current, data: { ...current.data, siteInspections: [...(Array.isArray(current.data.siteInspections) ? current.data.siteInspections : []), entry] } } : current);
      setShowInspection(false);
    }
  };

  const handleSaveHotWork = async () => {
    const measures = Array.isArray(selected?.data.hotWork?.measures) ? selected.data.hotWork.measures : [];
    if (!selected || measures.length === 0) return;
    setIsSubmitting(true);
    const updatedMeasures = measures.map((measure: Record<string, unknown>, i: number) => ({
      ...measure,
      during: !!hotWorkChecks.during[i],
      after: !!hotWorkChecks.after[i],
    }));
    const updatedHotWork = {
      ...selected.data.hotWork,
      measures: updatedMeasures,
      monitoredByName: user?.name || "Safety Department",
      monitoredAt: new Date().toISOString(),
    };
    const success = await updateSubmission(selected.id, { hotWork: updatedHotWork });
    setIsSubmitting(false);
    if (success) {
      toast.success("Hot-work checks saved.");
      setSelected(current => current ? { ...current, data: { ...current.data, hotWork: updatedHotWork } } : current);
    }
  };

  const handleClose = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    const success = await updateSubmissionStatus(selected.id, "completed", {
      closure: { name: user?.name || "Safety Department", verifiedAt: new Date().toISOString() },
    });
    setIsSubmitting(false);
    if (success) { toast.success("Permit to Work verified and closed."); setSelected(null); }
  };

  const handleReturn = async () => {
    if (!selected) return;
    if (!remarks.trim()) return toast.error("Enter what the contractor needs to address.");
    setIsSubmitting(true);
    const success = await updateSubmissionStatus(selected.id, "approved", {
      approvalRemarksHistory: withRemark(selected, "rejected", `Returned to contractor: ${remarks.trim()}`),
    });
    setIsSubmitting(false);
    if (success) { toast.success("Permit returned to the contractor."); setSelected(null); }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const wasDark = document.documentElement.classList.contains("dark");
    if (selected) document.title = refNo(selected);
    if (wasDark) document.documentElement.classList.remove("dark");
    setTimeout(() => {
      window.onafterprint = () => { document.title = originalTitle; if (wasDark) document.documentElement.classList.add("dark"); window.onafterprint = null; };
      window.print();
      setTimeout(() => { document.title = originalTitle; if (wasDark) document.documentElement.classList.add("dark"); }, 2000);
    }, 50);
  };

  if (isLoading) {
    return <ApprovalDashboardSkeleton title="Loading Permits to Work…" description="Retrieving the latest Permit to Work applications for the Safety Department." statsCount={4} />;
  }

  if (selected) {
    const status = badge(selected.status);
    const isOwn = selected.submittedBy === user?.id;
    return (
      <div className="mx-auto max-w-5xl p-6 lg:p-8 animate-in fade-in-5 print:absolute print:inset-0 print:z-50 print:m-0 print:w-full print:max-w-none print:bg-white print:p-8 print:text-black">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <button onClick={() => setSelected(null)} className="group inline-flex items-center justify-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/10 sm:justify-start">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Permits
          </button>
          <button type="button" onClick={handlePrint} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-muted px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted/70">
            <Printer className="h-4 w-4" /> Print Permit
          </button>
        </div>

        <div className="mb-8 hidden items-start justify-between border-b-2 border-black pb-6 print:flex">
          <div className="flex items-center">
            <img src={logo} alt="HICOM Diecasting" className="mr-6 h-14 w-auto object-contain" />
            <div><h1 className="text-2xl font-bold uppercase tracking-widest text-black">HICOM Diecastings Sdn Bhd</h1><p className="mt-1 text-sm uppercase tracking-wide text-gray-600">Permit To Work</p></div>
          </div>
          <div className="text-right"><p className="text-xs text-gray-500">Printed On:</p><p className="text-xs font-semibold text-black">{new Date().toLocaleString("en-GB")}</p></div>
        </div>

        <div className="card-elevated p-5 sm:p-6 print:border-none print:p-0 print:shadow-none">
          <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15"><HardHat className="h-6 w-6 text-red-600 dark:text-red-400" /></div>
              <div><h1 className="text-xl font-bold text-foreground">Permit to Work</h1><p className="text-sm text-muted-foreground">{refNo(selected)}</p></div>
            </div>
            <Badge className={`w-fit border-0 ${status.className}`}>{status.label}</Badge>
          </div>

          <EmployeeSummary name={selected.employeeName} staffId={selected.data.staffId || "—"} department={selected.department || "—"} position={selected.data.position || "—"} className="py-6" />

          <div className="border-t border-border pt-5">
            <PermitToWorkDetails submission={selected} />
          </div>

          {/* Section D — Safety records During / After hot-work checks while the permit is active */}
          {selected.data.hotWork?.applicable && ["approved", "pending_closure"].includes(selected.status) && (
            <div className="mt-6 border-t border-border pt-5 print:hidden">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400"><Flame className="h-4 w-4" /> Hot-Work Checks — During &amp; After</p>
                <p className="mt-1 text-xs text-muted-foreground">The submitter confirmed the "Before" checks. Record "During" while work is in progress and "After" before closing the permit.</p>
                <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Measure</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Before</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">During</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selected.data.hotWork.measures || []).map((measure: { measure?: string; before?: boolean }, i: number) => (
                        <tr key={i} className="border-t border-border/60">
                          <td className="px-3 py-2 text-foreground">{measure.measure}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">{measure.before ? "✓" : "—"}</td>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={!!hotWorkChecks.during[i]} onChange={e => setHotWorkChecks(s => ({ ...s, during: { ...s.during, [i]: e.target.checked } }))} className="h-4 w-4 accent-primary" aria-label={`During: ${measure.measure}`} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={!!hotWorkChecks.after[i]} onChange={e => setHotWorkChecks(s => ({ ...s, after: { ...s.after, [i]: e.target.checked } }))} className="h-4 w-4 accent-primary" aria-label={`After: ${measure.measure}`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selected.data.hotWork.monitoredByName && (
                  <p className="mt-2 text-xs text-muted-foreground">Last updated by {selected.data.hotWork.monitoredByName}{selected.data.hotWork.monitoredAt ? ` · ${new Date(selected.data.hotWork.monitoredAt).toLocaleString("en-GB")}` : ""}</p>
                )}
                <div className="mt-3 flex justify-end">
                  <button type="button" disabled={isSubmitting} onClick={handleSaveHotWork} className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50">
                    {isSubmitting ? "Saving…" : "Save Hot-Work Checks"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Approve / Reject */}
          {selected.status === "pending" && (
            <div className="mt-6 border-t border-border pt-5 print:hidden">
              {isOwn && <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-800 dark:text-amber-300">You submitted this permit. Another Safety Admin must record the approval.</div>}
              <label htmlFor="ptw-remarks" className="text-sm font-medium text-foreground">Safety Department Remarks <span className="font-normal text-muted-foreground">(required when rejecting)</span></label>
              <textarea id="ptw-remarks" value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} disabled={isOwn} placeholder="Approval notes or rejection reason…" className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" />
              <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" disabled={isSubmitting || isOwn} onClick={handleReject} className="w-full rounded-xl bg-destructive px-6 py-3 text-sm font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 sm:w-auto"><XCircle className="mr-2 inline h-4 w-4" />Reject</button>
                <button type="button" disabled={isSubmitting || isOwn} onClick={handleApprove} className="w-full rounded-xl bg-[#57D51B] px-8 py-3 text-sm font-bold text-white hover:bg-[#49BD16] disabled:opacity-50 sm:w-auto"><CheckCircle className="mr-2 inline h-4 w-4" />{isSubmitting ? "Processing…" : "Approve Permit"}</button>
              </div>
            </div>
          )}

          {/* Section G — inspection */}
          {selected.status === "approved" && (
            <div className="mt-6 border-t border-border pt-5 print:hidden">
              {!showInspection ? (
                <button type="button" onClick={() => setShowInspection(true)} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm font-bold text-primary hover:bg-primary/10">
                  <ClipboardCheck className="h-4 w-4" /> Add Site Inspection (Section G)
                </button>
              ) : (
                <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Inspection / Evaluation of Work Performance</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" value={inspection.date} onChange={e => setInspection(s => ({ ...s, date: e.target.value }))} className="h-10 dark:[color-scheme:dark]" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={inspection.name} onChange={e => setInspection(s => ({ ...s, name: e.target.value }))} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Designation</Label><Input value={inspection.designation} onChange={e => setInspection(s => ({ ...s, designation: e.target.value }))} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Department</Label><Input value={inspection.department} onChange={e => setInspection(s => ({ ...s, department: e.target.value }))} className="h-10" /></div>
                    <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Comment</Label><textarea value={inspection.comment} onChange={e => setInspection(s => ({ ...s, comment: e.target.value }))} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                    <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Preventive Action</Label><textarea value={inspection.preventiveAction} onChange={e => setInspection(s => ({ ...s, preventiveAction: e.target.value }))} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                  </div>
                  <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => setShowInspection(false)} className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted">Cancel</button>
                    <button type="button" disabled={isSubmitting} onClick={handleAddInspection} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{isSubmitting ? "Saving…" : "Save Inspection"}</button>
                  </div>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">The originator confirms completion from their My Submissions page; this permit will then move to Pending Closure.</p>
            </div>
          )}

          {/* Section H.8 — verify & close */}
          {selected.status === "pending_closure" && (
            <div className="mt-6 border-t border-border pt-5 print:hidden">
              <div className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><ShieldCheck className="h-4 w-4" /> The originator has confirmed the work is complete and the area restored.</div>
              </div>
              <label htmlFor="ptw-close-remarks" className="text-sm font-medium text-foreground">Remarks <span className="font-normal text-muted-foreground">(required to return to contractor)</span></label>
              <textarea id="ptw-close-remarks" value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} placeholder="Outstanding items, or leave blank to close…" className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" disabled={isSubmitting} onClick={handleReturn} className="w-full rounded-xl border border-amber-500 px-6 py-3 text-sm font-bold text-amber-700 hover:bg-amber-500/10 disabled:opacity-50 dark:text-amber-400 sm:w-auto">Return to Contractor</button>
                <button type="button" disabled={isSubmitting} onClick={handleClose} className="w-full rounded-xl bg-[#57D51B] px-8 py-3 text-sm font-bold text-white hover:bg-[#49BD16] disabled:opacity-50 sm:w-auto"><CheckCircle className="mr-2 inline h-4 w-4" />{isSubmitting ? "Processing…" : "Verify & Close"}</button>
              </div>
            </div>
          )}

          <VoidSubmissionControl submission={selected} onVoided={() => setSelected(null)} />
          <ApprovalOverview submission={selected} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Permit to Work Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Approve, inspect, and close contractor Permits to Work.</p>
      </div>

      <div className="card-elevated mb-4 border-border/60 bg-muted/40 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="mb-3 text-sm font-bold text-foreground">Filter Permits</p>
            <div className="flex w-full items-center gap-1.5 overflow-x-auto rounded-xl p-1.5 pb-2 sm:w-fit">
              {([["awaiting", "Awaiting Approval"], ["active", "Active Permits"], ["closure", "Pending Closure"], ["history", "History"]] as [Tab, string][]).map(([tab, label]) => (
                <button key={tab} onClick={() => { setActiveTab(tab); setIsViewAll(false); }} className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-[15px] font-bold transition-all sm:flex-none ${activeTab === tab ? "border-primary bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "border-border/60 bg-background text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground"}`}>
                  {label}
                  {tab === "awaiting" && stats.awaiting > 0 && <Badge className="h-6 min-w-6 justify-center border-0 bg-red-500 px-1.5 text-xs text-white hover:bg-red-500">{stats.awaiting}</Badge>}
                  {tab === "closure" && stats.closure > 0 && <Badge className="h-6 min-w-6 justify-center border-0 bg-sky-500 px-1.5 text-xs text-white hover:bg-sky-500">{stats.closure}</Badge>}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:shrink-0">
            {[["Awaiting", stats.awaiting], ["Active", stats.active], ["Pending Closure", stats.closure], ["Total", stats.total]].map(([label, value]) => (
              <div key={String(label)} className="min-w-24 rounded-lg border border-border/60 border-l-4 border-l-primary bg-background px-3 py-2 shadow-sm">
                <p className="text-[10px] font-semibold leading-tight text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-bold leading-none text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-foreground">Permits</h2>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setIsViewAll(false); }} placeholder="Search permits…" className="h-11 w-full pl-9 text-sm sm:w-80" />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">No permits in this tab</h3>
            <p className="mt-1 text-sm text-muted-foreground">Permits to Work will appear here as they are submitted.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Reference</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Applicant</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Contractor</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Working Dates</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map(item => {
                    const s = badge(item.status);
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/20">
                        <TableCell className="whitespace-nowrap font-semibold text-primary">{refNo(item)}</TableCell>
                        <TableCell><p className="font-medium text-foreground">{item.employeeName}</p><p className="text-xs text-muted-foreground">{item.department}</p></TableCell>
                        <TableCell className="text-sm">{item.data.contractor?.company || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{workingRange(item.data)}</TableCell>
                        <TableCell><Badge className={`whitespace-nowrap border-0 ${s.className}`}>{s.label}</Badge></TableCell>
                        <TableCell className="text-center">
                          <button onClick={() => setSelected(item)} className="rounded-lg bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20">
                            {["pending", "pending_closure"].includes(item.status) ? "Review" : "View Details"}
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="divide-y divide-border/60 sm:hidden">
              {displayed.map(item => {
                const s = badge(item.status);
                return (
                  <button key={item.id} type="button" onClick={() => setSelected(item)} className="block w-full p-4 text-left transition-colors hover:bg-muted/30">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{item.employeeName}</p><p className="truncate text-xs text-muted-foreground">{item.data.contractor?.company || item.department}</p></div>
                      <Badge className={`shrink-0 whitespace-nowrap border-0 ${s.className}`}>{s.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{refNo(item)}</span>
                      <span>{workingRange(item.data)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground sm:text-sm">Showing {displayed.length} of {visible.length} entries</p>
              {visible.length > 10 && <button onClick={() => setIsViewAll(!isViewAll)} className="w-full rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto">{isViewAll ? "View Less" : "View More"}</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PermitToWorkDashboard;
