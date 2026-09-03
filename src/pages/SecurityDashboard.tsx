import { useState, useEffect } from "react";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, LogOut, LogIn, Printer, TimerReset, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import ApprovalDashboardSkeleton from "@/components/ApprovalDashboardSkeleton";
import { getGatePassTimeOut, getPersonalGatePassElapsed, PersonalGatePassBadge } from "@/components/PersonalGatePassTracker";
import EmployeeSummary from "@/components/EmployeeSummary";
import ApprovalOverview from "@/components/ApprovalOverview";
import { useAuth } from "@/contexts/AuthContext";

const formTypeLabels: Record<string, string> = {
  leave: "Gate Pass",
};

// Company closing time — used to auto-complete "not returning today" gate passes.
const CLOSING_TIME = "17:30";

const formatEstimatedTime = (submittedAt: string, time?: string) => {
  if (!time) return "—";
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "—";
  const d = new Date(submittedAt);
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
};

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-[#57D51B] text-white hover:bg-[#57D51B] border-0 text-xs font-medium px-3 py-1">Approved</Badge>;
    case "on_leave":
      return <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-0 text-xs font-medium px-3 py-1">Currently Out</Badge>;
    case "approved_manco":
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0 text-xs font-medium px-3 py-1">Ready for Exit</Badge>;
    case "approved_hos":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-xs font-medium px-3 py-1">Pending HOD</Badge>;
    case "rejected":
      return <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive border-0 text-xs font-medium px-3 py-1">Rejected</Badge>;
    case "pending":
    default:
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-xs font-medium px-3 py-1">Pending HOS</Badge>;
  }
};

// Build a Date from a "HH:MM" time, anchored to the calendar day closest to a reference
// instant. Keeps entry/exit timestamps correct across midnight and for overnight passes.
const timestampNear = (time: string, referenceMs: number) => {
  const [hours, minutes] = time.split(":").map(Number);
  const base = new Date(referenceMs);
  const candidate = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes, 0, 0);
  const dayMs = 86_400_000;
  const alternatives = [candidate.getTime() - dayMs, candidate.getTime(), candidate.getTime() + dayMs];
  const best = alternatives.reduce((a, b) => (Math.abs(b - referenceMs) < Math.abs(a - referenceMs) ? b : a));
  return new Date(best);
};

const getInitials = (name?: string) =>
  (name || " ").split(" ").map(n => n ? n[0] : "").join("").toUpperCase().slice(0, 2);

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-1 items-start gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-4">
    <span className="mt-0.5 text-xs font-bold uppercase tracking-wider text-primary print:text-gray-500 sm:text-sm">{label}</span>
    <div className="text-left text-xs font-bold text-foreground sm:col-span-2 sm:text-sm">{value ?? "—"}</div>
  </div>
);

const getInitialColor = (name: string) => {
  const colors = ["bg-violet-500/15 text-violet-700 dark:text-violet-400", "bg-sky-500/15 text-sky-700 dark:text-sky-400", "bg-amber-500/15 text-amber-700 dark:text-amber-400", "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", "bg-rose-500/15 text-rose-700 dark:text-rose-400"];
  let hash = 0;
  const safeName = name || " ";
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const SecurityDashboard = () => {
  const { user } = useAuth();
  const { submissions, refNoMap, updateSubmissionStatus, isLoading, refreshSubmissions } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"action_required" | "on_leave" | "in_progress" | "history">("action_required");
  const [historyFilter, setHistoryFilter] = useState<'approved' | 'rejected'>('approved');
  const [isViewAll, setIsViewAll] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [securityLog, setSecurityLog] = useState({
    actualTimeOut: "",
    actualTimeIn: "",
    vehicleNo: "",
    remarks: "",
  });
  const [trackingNow, setTrackingNow] = useState(Date.now());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSubmissions();
    } finally {
      setTrackingNow(Date.now());
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => setTrackingNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedSubmission) {
      setRemarks(""); // Reset remarks when a new submission is selected
      setSecurityLog({
        actualTimeOut: selectedSubmission.data.securityLog?.actualTimeOut || new Date().toTimeString().slice(0, 5),
        actualTimeIn: selectedSubmission.data.securityLog?.actualTimeIn || '',
        vehicleNo: selectedSubmission.data.securityLog?.vehicleNo || '',
        // Only load remarks if the form is for logging EXIT.
        // For logging ENTRY, the remarks field should start fresh. Do not carry over HOD remarks.
        remarks: '',
      });
    }
  }, [selectedSubmission]);

  useEffect(() => {
    refreshSubmissions();
  }, [refreshSubmissions]);

  const generateRefNo = (sub: Submission) => sub.data?.refNo || refNoMap.get(sub.id) || `GP-${sub.id.slice(-4)}`;

  // Security guard only sees leave forms
  const filtered = submissions
    .filter(s => s.formType === "leave")
    .filter(s => {
      if (!search) return true;
      const q = search.trim().toLowerCase();
      const dateStr1 = new Date(s.submittedAt).toLocaleDateString("en-CA");
      const dateStr2 = new Date(s.submittedAt).toLocaleDateString("en-GB");
      return (s.employeeName || "").toLowerCase().includes(q)
        || generateRefNo(s).toLowerCase().includes(q)
        || (s.department || "").toLowerCase().includes(q)
        || (s.data?.securityLog?.vehicleNo || "").toLowerCase().includes(q)
        || dateStr1.includes(q)
        || dateStr2.includes(q);
    });

  const tabFiltered = filtered
    .filter(s => {
      if (activeTab === "action_required") return s.status === "approved_manco";
      if (activeTab === "on_leave") return s.status === "on_leave";
      if (activeTab === "in_progress") return s.status === "pending" || s.status === "approved_hos";
      if (activeTab === "history") return historyFilter === "approved" ? s.status === "approved" : s.status === "rejected";
      return true;
    })
    .sort((a, b) => {
      if (activeTab === "on_leave") {
        // Overdue first, then longest-out first.
        const overdueA = getPersonalGatePassElapsed(a, trackingNow)?.overdue ? 1 : 0;
        const overdueB = getPersonalGatePassElapsed(b, trackingNow)?.overdue ? 1 : 0;
        if (overdueA !== overdueB) return overdueB - overdueA;
        return (getGatePassTimeOut(a) ?? 0) - (getGatePassTimeOut(b) ?? 0);
      }
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

  const stats = {
    actionRequired: filtered.filter(s => s.status === "approved_manco").length,
    onLeave: filtered.filter(s => s.status === "on_leave").length,
    inProgress: filtered.filter(s => s.status === "pending" || s.status === "approved_hos").length,
    overdue: filtered.filter(s => getPersonalGatePassElapsed(s, trackingNow)?.overdue).length,
  };
  const visibleSubmissions = isViewAll ? tabFiltered : tabFiltered.slice(0, 10);

  const handleAction = async (id: string, newStatus: SubmissionStatus, logData: Record<string, unknown>) => {
    if (isProcessing) return;
    setIsProcessing(true);
    const currentData = selectedSubmission?.data || {};
    const updatedSecurityLog = { ...(currentData.securityLog || {}), ...logData };
    const reviewerData = newStatus === "on_leave"
      ? {
          securityExitReviewedByName: user?.name || "Security Guard",
          securityExitReviewedById: user?.id || null,
          securityExitReviewedAt: new Date().toISOString(),
        }
      : newStatus === "approved"
        ? {
            securityEntryReviewedByName: user?.name || "Security Guard",
            securityEntryReviewedById: user?.id || null,
            securityEntryReviewedAt: new Date().toISOString(),
            ...(logData?.completedWithoutReturn ? {
              securityExitReviewedByName: user?.name || "Security Guard",
              securityExitReviewedById: user?.id || null,
              securityExitReviewedAt: new Date().toISOString(),
            } : {}),
          }
        : {
            securityReviewedByName: user?.name || "Security Guard",
            securityReviewedById: user?.id || null,
            securityReviewedAt: new Date().toISOString(),
          };
    
    try {
      const success = await updateSubmissionStatus(id, newStatus, {
        securityLog: updatedSecurityLog,
        remarks: logData?.remarks || securityLog.remarks,
        rejectedStage: newStatus === "rejected" ? "admin" : undefined,
        ...reviewerData,
      });
      if (success) {
        toast.success(newStatus === "on_leave" ? "Employee exit recorded successfully." : newStatus === "approved" ? "Employee return recorded successfully." : "Gate Pass updated successfully.");
        setSelectedSubmission(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (sub: Submission) => {
    if (!remarks.trim()) {
      toast.error("Please provide a reason for rejection in the remarks field.");
      return;
    }
    if (isProcessing) return;
    setIsProcessing(true);
    const success = await updateSubmissionStatus(sub.id, "rejected", {
      remarks: remarks.trim(),
        rejectedStage: "admin", // Using 'admin' to signify rejection by a guard/admin role
        securityReviewedByName: user?.name || "Security Guard",
        securityReviewedById: user?.id || null,
        securityReviewedAt: new Date().toISOString(),
      });
    setIsProcessing(false);
    if (success) {
      toast.success("Gate Pass has been rejected.");
      setSelectedSubmission(null);
    }
  };

  const handleConfirmExit = () => {
    if (!selectedSubmission || !securityLog.actualTimeOut) return;
    const exitTime = timestampNear(securityLog.actualTimeOut, Date.now());
    const friendlyTime = exitTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    // "Not returning today": no entry step — close the pass now with time in at closing time.
    if (selectedSubmission.data.notReturningToday === true) {
      const closingTime = timestampNear(CLOSING_TIME, exitTime.getTime());
      const friendlyClosing = closingTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      if (!window.confirm(`Confirm that ${selectedSubmission.employeeName} left at ${friendlyTime}? They are not returning today, so the pass will be completed with a Time In of ${friendlyClosing}.`)) return;
      void handleAction(selectedSubmission.id, "approved", {
        actualTimeOut: exitTime.toISOString(),
        actualTimeIn: closingTime.toISOString(),
        vehicleNo: securityLog.vehicleNo,
        remarks: securityLog.remarks,
        completedWithoutReturn: true,
      });
      return;
    }

    if (!window.confirm(`Confirm that ${selectedSubmission.employeeName} left at ${friendlyTime}?`)) return;
    void handleAction(selectedSubmission.id, "on_leave", { actualTimeOut: exitTime.toISOString(), vehicleNo: securityLog.vehicleNo, remarks: securityLog.remarks });
  };

  const handleConfirmEntry = () => {
    if (!selectedSubmission) return;
    const time = securityLog.actualTimeIn || new Date().toTimeString().slice(0, 5);
    const exitTime = getGatePassTimeOut(selectedSubmission);
    // Anchor the entry to the day nearest the exit, so an overnight return lands on the right date.
    const entryTime = timestampNear(time, exitTime ?? Date.now());
    if (exitTime !== null && entryTime.getTime() < exitTime) {
      toast.error("Return time cannot be earlier than the recorded exit time.");
      return;
    }
    const friendlyTime = entryTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    if (!window.confirm(`Confirm that ${selectedSubmission.employeeName} returned at ${friendlyTime}?`)) return;
    void handleAction(selectedSubmission.id, "approved", { actualTimeIn: entryTime.toISOString(), remarks: securityLog.remarks });
  };
  const renderLeaveDetail = (sub: Submission) => {
    const refNo = generateRefNo(sub);
    const passType = sub.data.purposeType === 'company' ? 'Company Business' : 'Personal Matter';

    return (
      <>
        <EmployeeSummary
          name={sub.employeeName}
          staffId={sub.data.staffId || sub.data.employeeInfo?.staffNo || sub.data.employeeInfo?.employeeNumber || "—"}
          department={sub.department}
          position={sub.data.employeeInfo?.position || sub.data.position || "—"}
          className="mb-5 [&>div]:bg-background print:mb-6"
        />

        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary print:text-black">Submission Summary</p>
        <div className="mb-5 divide-y divide-border/50 rounded-xl border border-border/60 bg-background shadow-sm print:rounded-none print:border-gray-300 print:bg-transparent print:shadow-none">
          <DetailRow
            label="Ref No"
            value={
              <>
                <p className="font-bold text-foreground">{refNo}</p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Submitted {new Date(sub.submittedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</p>
              </>
            }
          />
          <DetailRow label="Pass Type" value={passType} />
          <DetailRow label="Reason" value={sub.data.companyDetails?.purpose || sub.data.personalDetails?.purpose || "No reason provided"} />
          <DetailRow label="Expected Time Out" value={formatEstimatedTime(sub.submittedAt, sub.data.estimatedTime?.timeOut)} />
          <DetailRow
            label="Expected Time In"
            value={
              <>
                {formatEstimatedTime(sub.submittedAt, sub.data.estimatedTime?.timeIn)}
                {sub.data.notReturningToday === true && (
                  <span className="ml-2 inline-flex rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 print:border print:border-gray-400 print:text-black">Not returning today</span>
                )}
              </>
            }
          />
          {(sub.data.securityLog?.actualTimeOut || sub.data.securityLog?.actualTimeIn) && (
            <>
              {sub.data.securityLog.vehicleNo?.trim() && <DetailRow label="Vehicle No." value={sub.data.securityLog.vehicleNo} />}
              <DetailRow label="Actual Time Out" value={getGatePassTimeOut(sub) !== null ? new Date(getGatePassTimeOut(sub)!).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "—"} />
              {sub.data.securityLog.actualTimeIn && <DetailRow label="Actual Time In" value={new Date(sub.data.securityLog.actualTimeIn).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })} />}
            </>
          )}
        </div>
      </>
    );
  };

  // Review detail view
  if (isLoading) {
    return (
      <ApprovalDashboardSkeleton
        title="Loading security approvals…"
        description="Retrieving the latest gate pass and movement records."
      />
    );
  }

  if (selectedSubmission) {
    const canApprove = selectedSubmission.status === "approved_manco";
    const isOnLeave = selectedSubmission.status === "on_leave";

    return (
      <div className="min-h-full bg-muted/30 print:bg-white">
      <div className="mx-auto max-w-5xl animate-in fade-in-5 slide-in-from-bottom-2 p-4 duration-300 sm:p-6 lg:p-7 print:max-w-none print:w-full print:bg-white print:p-8 print:text-black">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button onClick={() => setSelectedSubmission(null)} className="group inline-flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary/10 hover:shadow-sm">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to list
          </button>
          {activeTab === 'history' && (
            <button onClick={() => {
              const originalTitle = document.title;
              document.title = generateRefNo(selectedSubmission);
              
              const isDark = document.documentElement.classList.contains('dark');
              if (isDark) document.documentElement.classList.remove('dark');

              setTimeout(() => {
                window.onafterprint = () => {
                  document.title = originalTitle;
                  if (isDark) document.documentElement.classList.add('dark');
                  window.onafterprint = null;
                };
                window.print();
                setTimeout(() => { document.title = originalTitle; }, 2000);
              }, 50);
            }} className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-foreground bg-muted hover:bg-muted/80 border border-border rounded-lg transition-all shadow-sm">
              <Printer className="h-4 w-4" /> Print
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/40 p-3 shadow-sm sm:p-4 lg:p-5 print:rounded-none print:border-none print:bg-white print:p-0 print:text-black print:shadow-none">
        {/* Print Header */}
        <div className="hidden print:flex items-start justify-between mb-8 border-b-2 border-black pb-6">
          <div className="flex items-center">
            <img src={logo} alt="HICOM Diecasting" className="h-14 w-auto object-contain mr-6" />
            <div className="text-left">
              <h1 className="text-2xl font-bold uppercase tracking-widest text-black">HICOM Diecastings Sdn Bhd</h1>
              <p className="text-sm text-gray-600 mt-1 uppercase tracking-wide">Official Gate Pass Document</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Printed On:</p>
            <p className="text-sm font-semibold text-black">{new Date().toLocaleString('en-GB')}</p>
          </div>
        </div>

        {renderLeaveDetail(selectedSubmission)}

        {isOnLeave && selectedSubmission.data.purposeType === "personal" && (
          <div className={`mb-4 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${getPersonalGatePassElapsed(selectedSubmission, trackingNow)?.overdue ? "border-red-500/30 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
            <div><p className="text-xs font-bold uppercase tracking-wider text-foreground">Personal Matter Movement</p><p className="mt-1 text-sm text-muted-foreground">Timer started when Security recorded the employee's actual exit.</p></div>
            <PersonalGatePassBadge submission={selectedSubmission} now={trackingNow} />
          </div>
        )}

        {selectedSubmission.data.remarks && (
          <div className={`mb-4 rounded-xl border p-3.5 print:rounded-none print:border-gray-300 print:bg-transparent ${
            selectedSubmission.status === 'rejected' ? 'bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'
          }`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80 print:text-gray-500">Approver Remarks</p>
            <p className="text-sm font-medium">"{selectedSubmission.data.remarks}"</p>
          </div>
        )}

        {!(canApprove || isOnLeave) && !["pending", "approved_hos"].includes(selectedSubmission.status) && (
          <div className="rounded-xl border border-border/60 bg-background p-3.5 text-center shadow-sm print:hidden">
            <p className="text-sm text-muted-foreground font-medium">
              {selectedSubmission.status === "approved" ? "This Gate Pass has been completed." :
               selectedSubmission.status === "rejected" ? "This Gate Pass was rejected." :
               "No further action is required at this time."}
            </p>
          </div>
        )}

        {["pending", "approved_hos"].includes(selectedSubmission.status) && (
          <div className="rounded-xl border border-border/60 bg-background p-4 text-center shadow-sm print:hidden">
            <div className="flex flex-col items-center justify-center gap-3">
              <p className="text-sm text-muted-foreground font-medium">
                {selectedSubmission.status === "pending" ? "Waiting for Head of Section (HOS) approval." :
                 "Pending HOD approval."}
              </p>
              <div className="w-full max-w-md">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Security override</p>
                <Textarea
                  placeholder="Reason for rejecting this gate pass…"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={2}
                  className="mb-3 resize-y bg-background"
                />
                <button disabled={isProcessing} onClick={() => handleReject(selectedSubmission)} className="w-full rounded-xl bg-destructive px-6 py-3 text-center text-sm font-bold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60">{isProcessing ? "Saving…" : "Reject Gate Pass"}</button>
              </div>
            </div>
          </div>
        )}

        {canApprove && (
          <div className="mt-4 rounded-xl border border-border/60 bg-background p-4 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-5">
            <h3 className="mb-3 text-base font-bold text-foreground sm:text-lg">Log Employee Exit</h3>
            {selectedSubmission.data.notReturningToday === true && (
              <div className="mb-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                Employee is not returning today. Confirming exit will complete this pass with a Time In of 5:30 PM — there is no separate entry step.
              </div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold text-primary">Actual Time Out</Label>
                  <Input type="time" value={securityLog.actualTimeOut} onChange={e => setSecurityLog(p => ({...p, actualTimeOut: e.target.value}))} className="h-11 mt-1 dark:[color-scheme:dark]" required />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-primary">Vehicle No.</Label>
                  <Input value={securityLog.vehicleNo} onChange={e => setSecurityLog(p => ({...p, vehicleNo: e.target.value}))} placeholder="e.g. WXY 1234" className="h-11 mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-primary">Remarks</Label>
                <Textarea value={securityLog.remarks} onChange={e => setSecurityLog(p => ({...p, remarks: e.target.value}))} placeholder="Note any incident, ID check, or condition…" rows={2} className="mt-1 resize-y" />
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-border pt-3 sm:flex-row">
                <button disabled={isProcessing} onClick={() => void handleAction(selectedSubmission.id, "rejected", { remarks: securityLog.remarks })} className="rounded-xl border border-destructive px-6 py-3 text-center text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1">Reject</button>
                <button onClick={handleConfirmExit} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-center text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1" disabled={!securityLog.actualTimeOut || isProcessing}>
                  <LogOut className="h-4 w-4" /> {isProcessing ? "Saving…" : (selectedSubmission.data.notReturningToday === true ? "Log Exit & Complete" : "Log Exit")}
                </button>
              </div>
            </div>
          </div>
        )}

        {isOnLeave && (
          <div className="mt-4 rounded-xl border border-border/60 bg-background p-4 shadow-sm sm:p-5">
            <h3 className="mb-3 text-base font-bold text-foreground sm:text-lg">Log Employee Entry</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <div>
                  <Label className="text-xs font-semibold text-primary">Actual Time In</Label>
                  <Input type="time" value={securityLog.actualTimeIn || new Date().toTimeString().slice(0, 5)} onChange={e => setSecurityLog(p => ({...p, actualTimeIn: e.target.value}))} className="mt-1 h-11 dark:[color-scheme:dark]" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-primary">Remarks</Label>
                  <Textarea value={securityLog.remarks} onChange={e => setSecurityLog(p => ({...p, remarks: e.target.value}))} placeholder="Note any incident or condition on return…" rows={2} className="mt-1 resize-y" />
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <button
                  onClick={handleConfirmEntry}
                  disabled={isProcessing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-center text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogIn className="h-4 w-4" /> {isProcessing ? "Saving…" : "Log Entry & Complete"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ApprovalOverview submission={selectedSubmission} />

        {/* Print Footer */}
        <div className="hidden print:block mt-12 text-center text-xs text-gray-400">
          <p>This is computer generated and no signature is required.</p>
        </div>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 slide-in-from-bottom-2 duration-500">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security Gate</h1>
          <p className="mt-1 text-sm text-muted-foreground">Log employee exits and returns for approved Gate Passes.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-semibold tabular-nums text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            {new Date(trackingNow).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {stats.overdue > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm">
          <TimerReset className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <p className="font-semibold text-red-700 dark:text-red-400">
            {stats.overdue} employee{stats.overdue === 1 ? " has" : "s have"} been out over 2 hours on a personal pass.
            {activeTab !== "on_leave" && (
              <button onClick={() => setActiveTab("on_leave")} className="ml-2 underline underline-offset-2">View</button>
            )}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1.5">
        {([
          ["action_required", "Ready to Exit", stats.actionRequired, "bg-red-500 text-white"],
          ["on_leave", "Currently Out", stats.onLeave, "bg-indigo-500 text-white"],
          ["in_progress", "In Progress", stats.inProgress, "bg-muted-foreground/20 text-muted-foreground"],
          ["history", "History", 0, ""],
        ] as const).map(([tab, label, count, badgeClass]) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setIsViewAll(false); }}
            className={`flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-bold transition-colors sm:flex-none ${activeTab === tab ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
            {count > 0 && <Badge className={`h-5 min-w-5 justify-center border-0 px-1.5 text-[11px] ${badgeClass}`}>{count}</Badge>}
          </button>
        ))}
      </div>

      {/* Submissions Table */}
      <div className="card-elevated overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
          {activeTab === 'history' ? (
            <div>
              <h2 className="text-lg font-bold text-foreground">Submission History</h2>
              <div className="mt-2 flex w-fit rounded-lg bg-muted p-1">
                {(['approved', 'rejected'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setHistoryFilter(tab); setIsViewAll(false); }}
                    className={`min-h-10 rounded-md px-4 py-2 text-sm font-bold transition-all ${
                      historyFilter === tab
                        ? "bg-background shadow-sm text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === 'approved' ? 'Approved' : 'Rejected'}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <h2 className="text-lg font-bold text-foreground">Recent Submissions</h2>
          )}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search reference number or employee..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setIsViewAll(false); }} 
              className="h-11 w-full pl-9 text-sm sm:w-80" 
            />
          </div>
        </div>

        {tabFiltered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No submissions found in this tab</h3>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Reference Number</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Employee</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                  {activeTab === "on_leave" && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Exit Time / Duration</TableHead>
                  )}
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
            {visibleSubmissions.map((sub) => {
              const avatarUrl = sub.data?.employeeInfo?.avatar || sub.data?.avatar;
              return (
                <TableRow key={sub.id} className={getPersonalGatePassElapsed(sub, trackingNow)?.overdue ? "bg-red-500/10 hover:bg-red-500/15" : "hover:bg-muted/20"}>
                    <TableCell className="text-sm font-medium text-muted-foreground">{generateRefNo(sub)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${!avatarUrl ? getInitialColor(sub.employeeName) : 'bg-transparent'}`}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={sub.employeeName} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(sub.employeeName)
                      )}
                        </div>
                        <span className="text-sm font-medium text-foreground">{sub.employeeName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-sm text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString("en-CA")}</span>
                        <span className="text-xs text-muted-foreground/80">{new Date(sub.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                    </TableCell>
                    {activeTab === "on_leave" && (
                      <TableCell className="whitespace-nowrap text-sm font-semibold text-foreground">
                        <p>{getGatePassTimeOut(sub) !== null ? new Date(getGatePassTimeOut(sub)!).toLocaleString("en-GB") : "—"}</p>
                        <div className="mt-1.5"><PersonalGatePassBadge submission={sub} now={trackingNow} /></div>
                      </TableCell>
                    )}
                    <TableCell>{statusBadge(sub.status)}</TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => setSelectedSubmission(sub)}
                        className={`min-h-11 min-w-[8rem] rounded-lg px-5 py-2.5 text-[15px] font-bold transition-all hover:shadow-sm active:scale-[0.98] print:hidden ${
                          sub.status === "approved_manco" || sub.status === "on_leave"
                            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                            : "text-foreground hover:bg-muted hover:text-primary"
                        }`}
                      >
                        {sub.status === "approved_manco" ? "Log Exit" : sub.status === "on_leave" ? "Log Entry" : "View"}
                      </button>
                    </TableCell>
                  </TableRow>
              );
            })}
              </TableBody>
            </Table>
            </div>
            <div className="divide-y divide-border/60 sm:hidden">
              {visibleSubmissions.map(sub => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubmission(sub)}
                  className={`block w-full p-4 text-left transition-colors hover:bg-muted/30 ${
                    getPersonalGatePassElapsed(sub, trackingNow)?.overdue ? "bg-red-500/10" : ""
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{sub.employeeName}</p>
                      <p className="mt-0.5 text-xs font-medium text-primary">{generateRefNo(sub)}</p>
                    </div>
                    {statusBadge(sub.status)}
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0 text-xs text-muted-foreground">
                      <p>{new Date(sub.submittedAt).toLocaleDateString("en-CA")}</p>
                      <p className="text-[11px] text-muted-foreground/80">
                        {new Date(sub.submittedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </p>
                      {activeTab === "on_leave" && (
                        <div className="mt-2"><PersonalGatePassBadge submission={sub} now={trackingNow} /></div>
                      )}
                    </div>
                    <span className={`flex min-h-11 shrink-0 items-center rounded-lg px-4 py-2.5 text-sm font-bold shadow-sm ${
                      ["approved_manco", "on_leave"].includes(sub.status)
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {sub.status === "approved_manco" ? "Log Exit" : sub.status === "on_leave" ? "Log Entry" : "View"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Showing {Math.min(tabFiltered.length, isViewAll ? tabFiltered.length : 10)} of {tabFiltered.length} results</p>
              {tabFiltered.length > 10 && (
                <button 
                  onClick={() => setIsViewAll(!isViewAll)}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {isViewAll ? "View Less" : "View More"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SecurityDashboard;
