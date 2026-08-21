import { useState, useEffect, useMemo } from "react";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, LogOut, LogIn, Printer } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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

const getInitials = (name?: string) =>
  (name || " ").split(" ").map(n => n ? n[0] : "").join("").toUpperCase().slice(0, 2);

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
  const { submissions, updateSubmissionStatus, isLoading, refreshSubmissions } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"action_required" | "on_leave" | "in_progress" | "history">("action_required");
  const [historyFilter, setHistoryFilter] = useState<'approved' | 'rejected'>('approved');
  const [isViewAll, setIsViewAll] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [securityLog, setSecurityLog] = useState({
    actualTimeOut: "",
    actualTimeIn: "",
    vehicleNo: "",
    remarks: "",
  });
  const [trackingNow, setTrackingNow] = useState(Date.now());
  const [isProcessing, setIsProcessing] = useState(false);

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

  const refNoMap = useMemo(() => {
    const map = new Map<string, string>();
    const excludedForms = ["inventory_addition", "ppe_request", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"];
    submissions.filter(s => !excludedForms.includes(s.formType)).sort((a, b) => {
      const timeDiff = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      return timeDiff !== 0 ? timeDiff : a.id.localeCompare(b.id);
    }).forEach((submission, index) => map.set(submission.id, `HDSB-${String(index + 1).padStart(4, "0")}`));
    return map;
  }, [submissions]);

  const generateRefNo = (sub: Submission) => sub.data?.refNo || refNoMap.get(sub.id) || `GP-${sub.id.slice(-4)}`;

  // Security guard only sees leave forms
  const filtered = submissions
    .filter(s => s.formType === "leave")
    .filter(s => {
      if (!search) return true;
      const q = search.trim().toLowerCase();
      const dateStr1 = new Date(s.submittedAt).toLocaleDateString("en-CA");
      const dateStr2 = new Date(s.submittedAt).toLocaleDateString("en-GB");
      const typeStr = (formTypeLabels[s.formType] || s.formType).toLowerCase();
      return (s.employeeName || '').toLowerCase().includes(q) || 
             generateRefNo(s).toLowerCase().includes(q) ||
             (s.department || '').toLowerCase().includes(q) ||
             (typeStr || '').toLowerCase().includes(q) ||
             (dateStr1 || '').includes(q) ||
             (dateStr2 || '').includes(q);
    });

  const isRecent = (dateStr: string) => {
    const hours = (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
    return hours < 48; // Checks if submitted within the last 48 hours
  };

  const tabFiltered = filtered.filter(s => {
    if (activeTab === "action_required") return s.status === "approved_manco";
    if (activeTab === "on_leave") return s.status === "on_leave";
    if (activeTab === "in_progress") return s.status === "pending" || s.status === "approved_hos";
    if (activeTab === "history") {
      if (historyFilter === 'approved') return s.status === "approved";
      if (historyFilter === 'rejected') return s.status === "rejected";
      return false; // Should not happen
    }
    return true;
  });

  const stats = {
    total: filtered.length,
    actionRequired: filtered.filter(s => s.status === "approved_manco").length,
    onLeave: filtered.filter(s => s.status === "on_leave").length,
    inProgress: filtered.filter(s => s.status === "pending" || s.status === "approved_hos").length,
    overdue: filtered.filter(s => getPersonalGatePassElapsed(s, trackingNow)?.overdue).length,
  };
  const visibleSubmissions = isViewAll ? tabFiltered : tabFiltered.slice(0, 10);

  const handleAction = async (id: string, newStatus: SubmissionStatus, logData: any) => {
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

  const timestampForToday = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const timestamp = new Date();
    timestamp.setHours(hours, minutes, 0, 0);
    return timestamp;
  };

  const handleConfirmExit = () => {
    if (!selectedSubmission || !securityLog.actualTimeOut) return;
    const exitTime = timestampForToday(securityLog.actualTimeOut);
    const friendlyTime = exitTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    if (!window.confirm(`Confirm that ${selectedSubmission.employeeName} left at ${friendlyTime}?`)) return;
    void handleAction(selectedSubmission.id, "on_leave", { actualTimeOut: exitTime.toISOString(), vehicleNo: securityLog.vehicleNo, remarks: securityLog.remarks });
  };

  const handleConfirmEntry = () => {
    if (!selectedSubmission) return;
    const time = securityLog.actualTimeIn || new Date().toTimeString().slice(0, 5);
    const entryTime = timestampForToday(time);
    const exitTime = getGatePassTimeOut(selectedSubmission);
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start px-5 py-3">
            <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Ref No</span>
            <div className="sm:col-span-2 text-left">
              <p className="text-xs sm:text-sm font-bold text-foreground">{refNo}</p>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Submitted on: {new Date(sub.submittedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start px-5 py-3">
            <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Pass Type</span>
            <div className="text-xs sm:text-sm font-bold text-foreground sm:col-span-2 text-left">{passType}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start px-5 py-3">
            <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Reason</span>
            <div className="text-xs sm:text-sm font-bold text-foreground sm:col-span-2 text-left">{sub.data.companyDetails?.purpose || sub.data.personalDetails?.purpose || "No reason provided"}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start px-5 py-3">
            <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Expected Time Out</span>
            <div className="text-xs sm:text-sm font-bold text-foreground sm:col-span-2 text-left">{formatEstimatedTime(sub.submittedAt, sub.data.estimatedTime?.timeOut)}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start px-5 py-3">
            <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Expected Time In</span>
            <div className="text-xs sm:text-sm font-bold text-foreground sm:col-span-2 text-left">{formatEstimatedTime(sub.submittedAt, sub.data.estimatedTime?.timeIn)}</div>
          </div>
          {(sub.data.securityLog?.actualTimeOut || sub.data.securityLog?.actualTimeIn) && (
            <>
              {sub.data.securityLog.vehicleNo?.trim() && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start px-5 py-3">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Vehicle No.</span>
                  <div className="text-xs sm:text-sm font-bold text-foreground sm:col-span-2 text-left">{sub.data.securityLog.vehicleNo}</div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start px-5 py-3">
                <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Actual Time Out</span>
                <div className="text-xs sm:text-sm font-bold text-foreground sm:col-span-2 text-left">{getGatePassTimeOut(sub) !== null ? new Date(getGatePassTimeOut(sub)!).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "—"}</div>
              </div>
              {sub.data.securityLog.actualTimeIn && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start px-5 py-3">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Actual Time In</span>
                  <div className="text-xs sm:text-sm font-bold text-foreground sm:col-span-2 text-left">{new Date(sub.data.securityLog.actualTimeIn).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}</div>
                </div>
              )}
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
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Security Admin Action</p>
                <Input
                  placeholder="Enter remarks if rejecting..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="mb-3 h-11 bg-background"
                />
                <button disabled={isProcessing} onClick={() => handleReject(selectedSubmission)} className="w-full px-6 py-3 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors text-sm disabled:cursor-not-allowed disabled:opacity-60">{isProcessing ? "SAVING..." : "REJECT SUBMISSION"}</button>
              </div>
            </div>
          </div>
        )}

        {canApprove && (
          <div className="mt-4 rounded-xl border border-border/60 bg-background p-4 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-5">
            <h3 className="mb-3 text-base font-bold text-foreground sm:text-lg">Log Employee Exit</h3>
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
                <Input value={securityLog.remarks} onChange={e => setSecurityLog(p => ({...p, remarks: e.target.value}))} placeholder="Enter remarks if any..." className="h-11 mt-1" />
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-border pt-3 sm:flex-row">
                <button disabled={isProcessing} onClick={() => void handleAction(selectedSubmission.id, "rejected", { remarks: securityLog.remarks })} className="flex-1 rounded-xl bg-destructive px-6 py-3 text-center font-bold text-white transition-all hover:bg-destructive/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">REJECT</button>
                <button onClick={handleConfirmExit} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-center font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50" disabled={!securityLog.actualTimeOut || isProcessing}>
                  <LogOut className="h-4 w-4" /> {isProcessing ? "SAVING..." : "CONFIRM EXIT"}
                </button>
              </div>
            </div>
          </div>
        )}

        {isOnLeave && (
          <div className="mt-4 rounded-xl border border-border/60 bg-background p-4 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-5">
            <h3 className="mb-3 text-base font-bold text-foreground sm:text-lg">Log Employee Entry</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
              <div>
                <Label className="text-xs font-semibold text-primary">Actual Time In</Label>
                <Input type="time" value={securityLog.actualTimeIn || new Date().toTimeString().slice(0, 5)} onChange={e => setSecurityLog(p => ({...p, actualTimeIn: e.target.value}))} className="h-11 mt-1 dark:[color-scheme:dark]" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-primary">Remarks</Label>
                <Input value={securityLog.remarks} onChange={e => setSecurityLog(p => ({...p, remarks: e.target.value}))} placeholder="Enter remarks if any..." className="h-11 mt-1" />
              </div>
              </div>
              <div className="border-t border-border pt-3">
                <button 
                  onClick={handleConfirmEntry}
                  disabled={isProcessing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#57D51B] px-6 py-3 text-center font-bold text-white transition-all hover:bg-[#49BD16] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogIn className="h-4 w-4" /> {isProcessing ? "SAVING..." : "CONFIRM ENTRY & COMPLETE"}
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Security Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Review Gate Passes and record employee exits and returns.</p>
      </div>

      {/* Action Tabs */}
      <div className="card-elevated mb-4 border-border/60 bg-muted/40 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
        <p className="mb-3 text-sm font-bold text-foreground">Filter Gate Passes</p>
        <div className="flex w-full items-center gap-1.5 overflow-x-auto rounded-xl p-1.5 pb-2 sm:w-fit sm:pb-1.5">
          <button onClick={() => { setActiveTab("action_required"); setIsViewAll(false); }} className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-[15px] font-bold transition-all sm:flex-none ${activeTab === "action_required" ? "border-primary bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "border-border/60 bg-background text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground hover:shadow"}`}>
            Action Required
            {stats.actionRequired > 0 && (
              <Badge className="h-6 min-w-6 justify-center border-0 bg-red-500 px-1.5 text-xs text-white hover:bg-red-500">{stats.actionRequired}</Badge>
            )}
          </button>
          <button onClick={() => { setActiveTab("on_leave"); setIsViewAll(false); }} className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-[15px] font-bold transition-all sm:flex-none ${activeTab === "on_leave" ? "border-primary bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "border-border/60 bg-background text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground hover:shadow"}`}>
            Currently Out
            {stats.onLeave > 0 && (
              <Badge className="h-6 min-w-6 justify-center border-0 bg-indigo-500 px-1.5 text-xs text-white hover:bg-indigo-500">{stats.onLeave}</Badge>
            )}
          </button>
          <button onClick={() => { setActiveTab("in_progress"); setIsViewAll(false); }} className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-[15px] font-bold transition-all sm:flex-none ${activeTab === "in_progress" ? "border-primary bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "border-border/60 bg-background text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground hover:shadow"}`}>
            In Progress
            {stats.inProgress > 0 && (
              <Badge className="h-6 min-w-6 justify-center border-0 bg-muted-foreground/20 px-1.5 text-xs text-muted-foreground hover:bg-muted-foreground/20">{stats.inProgress}</Badge>
            )}
          </button>
          <button onClick={() => { setActiveTab("history"); setIsViewAll(false); }} className={`flex min-h-11 min-w-[7.5rem] flex-1 items-center justify-center whitespace-nowrap rounded-lg border px-5 py-2.5 text-[15px] font-bold transition-all sm:flex-none ${activeTab === "history" ? "border-primary bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "border-border/60 bg-background text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground hover:shadow"}`}>
            History
          </button>
        </div>
        <p className="mt-2 text-[11px] font-medium text-muted-foreground sm:hidden">Swipe sideways to see all filters →</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:shrink-0">
          <div className="min-w-24 rounded-lg border border-border/60 border-l-4 border-l-primary bg-background px-3 py-2 shadow-sm">
            <p className="text-[10px] font-semibold leading-tight text-muted-foreground">Action Required</p>
            <p className="mt-1 text-xl font-bold leading-none text-foreground">{stats.actionRequired}</p>
          </div>
          <div className="min-w-24 rounded-lg border border-border/60 border-l-4 border-l-primary bg-background px-3 py-2 shadow-sm">
            <p className="text-[10px] font-semibold leading-tight text-muted-foreground">Currently Out</p>
            <p className="mt-1 text-xl font-bold leading-none text-foreground">{stats.onLeave}</p>
          </div>
          <div className="min-w-24 rounded-lg border border-border/60 border-l-4 border-l-primary bg-background px-3 py-2 shadow-sm">
            <p className="text-[10px] font-semibold leading-tight text-muted-foreground">Over 2 Hours</p>
            <p className={`mt-1 text-xl font-bold leading-none ${stats.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>{stats.overdue}</p>
          </div>
          <div className="min-w-24 rounded-lg border border-border/60 border-l-4 border-l-primary bg-background px-3 py-2 shadow-sm">
            <p className="text-[10px] font-semibold leading-tight text-muted-foreground">Total</p>
            <p className="mt-1 text-xl font-bold leading-none text-foreground">{stats.total}</p>
          </div>
        </div>
        </div>
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
              const avatarUrl = (sub as any).avatar || sub.data?.employeeInfo?.avatar || sub.data?.avatar;
              return (
                <TableRow key={sub.id} className={`${getPersonalGatePassElapsed(sub, trackingNow)?.overdue ? "bg-red-500/10 hover:bg-red-500/15" : activeTab === "action_required" && isRecent(sub.submittedAt) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"}`}>
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
                          sub.status === "approved_manco" || sub.status === "on_leave" || activeTab === "in_progress" || activeTab === "history"
                            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                            : "text-foreground hover:bg-muted hover:text-primary"
                        }`}
                      >
                        {sub.status === "approved_manco" ? "Review Exit" : sub.status === "on_leave" ? "Review Entry" : "Details"}
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
                    getPersonalGatePassElapsed(sub, trackingNow)?.overdue ? "bg-red-500/10" : activeTab === "action_required" && isRecent(sub.submittedAt) ? "bg-primary/5" : ""
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
                      {sub.status === "approved_manco" ? "Review Exit" : sub.status === "on_leave" ? "Review Entry" : "Details"}
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
