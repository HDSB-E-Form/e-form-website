import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";
import ApprovalDashboardSkeleton from "@/components/ApprovalDashboardSkeleton";
import ApprovalRemarksHistory from "@/components/ApprovalRemarksHistory";
import { Textarea } from "@/components/ui/textarea";
import { appendApprovalRemark } from "@/lib/approvalRemarks";
import EmployeeSummary from "@/components/EmployeeSummary";
import ApprovalOverview from "@/components/ApprovalOverview";
import { getGatePassTimeOut, getPersonalGatePassElapsed, PersonalGatePassBadge } from "@/components/PersonalGatePassTracker";
import VoidSubmissionControl from "@/components/VoidSubmissionControl";

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request",
};

// Milliseconds the submission has sat at its current approval stage — based on
// the last approval-remark timestamp, else the submission time.
const stageEnteredAt = (sub: Submission): number => {
  const history = Array.isArray(sub.data?.approvalRemarksHistory) ? sub.data.approvalRemarksHistory : [];
  const stamp = history.length ? history[history.length - 1]?.createdAt : null;
  const time = new Date(stamp || sub.submittedAt).getTime();
  return Number.isNaN(time) ? new Date(sub.submittedAt).getTime() : time;
};

const formatWaiting = (sub: Submission): { label: string; tone: string } => {
  const hours = (Date.now() - stageEnteredAt(sub)) / 3_600_000;
  if (hours < 1) return { label: "just now", tone: "text-muted-foreground" };
  if (hours < 24) return { label: `${Math.round(hours)}h`, tone: "text-muted-foreground" };
  const days = Math.floor(hours / 24);
  const tone = days >= 5 ? "text-rose-600 dark:text-rose-400" : days >= 3 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
  return { label: `${days}d`, tone };
};

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-[#57D51B] text-white hover:bg-[#57D51B] border-0 text-xs font-medium px-3 py-1">Fully Approved</Badge>;
    case "approved_hod":
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0 text-xs font-medium px-3 py-1">Pending HR</Badge>;
    case "approved_hos":
      return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-0 text-xs font-medium px-3 py-1">Pending HOD</Badge>;
    case "rejected":
      return <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive border-0 text-xs font-medium px-3 py-1">Rejected</Badge>;
    case "voided":
      return <Badge className="border-0 bg-slate-500/15 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">Voided</Badge>;
    case "completed":
      return <Badge className="border-0 bg-[#57D51B] px-3 py-1 text-xs font-medium text-white hover:bg-[#57D51B]">Completed</Badge>;
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

const renderValue = (val: any): React.ReactNode => {
  if (val === null || val === undefined || val === "") return "—";
  
  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    if (typeof val[0] === 'string' && val[0].startsWith('http')) {
      return (
        <div className="flex flex-col gap-2 mt-1">
          {val.map((url, idx) => (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary font-bold hover:underline inline-flex items-center gap-1.5 w-fit">
              <FileText className="h-4 w-4" /> View Attachment {idx + 1}
            </a>
          ))}
        </div>
      );
    }
    if (typeof val[0] === 'object' && val[0] !== null) {
      const validRows = val.filter(row => row && typeof row === 'object' && Object.values(row).some(v => v !== "" && v !== null));
      if (validRows.length === 0) return "—";

      let keys = Object.keys(validRows[0]).filter(k => k !== 'avatar');

      // Specifically for claim forms, enforce the column order.
      if (keys.includes('description') && keys.includes('receiptNo') && keys.includes('amount')) {
        keys = ['description', 'receiptNo', 'amount'];
      }

      return (
        <div className="mt-3 w-full border border-border rounded-lg overflow-x-auto">
          <Table className="w-full text-left border-collapse bg-background/50">
            <TableHeader className="bg-muted/50">
              <TableRow>
                {keys.map(k => (
                  <TableHead key={k} className="text-[10px] sm:text-xs uppercase font-bold p-2 sm:p-3 text-muted-foreground whitespace-nowrap">
                    {k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {validRows.map((row, i) => (
                <TableRow key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                  {keys.map((k, j) => (
                    <TableCell key={j} className="text-xs sm:text-sm p-2 sm:p-3 whitespace-nowrap">
                      {row[k] !== undefined && row[k] !== null && row[k] !== "" ? String(row[k]) : "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }
    return val.join(", ");
  }
  
  if (typeof val === 'object' && val !== null) {
    const entries = Object.entries(val).filter(([k, v]) => v !== "" && v !== null && k !== 'avatar');
    if (entries.length === 0) return "—";
    return (
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mt-2 sm:mt-3 bg-background/50 p-3 sm:p-4 rounded-lg border border-border">
        {entries.map(([k, v]) => (
          <div key={k} className="flex flex-col border-b border-border/50 pb-1.5 last:border-0 last:pb-0 sm:last:pb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5 sm:mb-1">
              {k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1")}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  
  if (typeof val === 'string' && val.startsWith('http')) {
    return (
      <a href={val} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary font-bold hover:underline inline-flex items-center gap-1.5 w-fit">
         <FileText className="h-4 w-4" /> View Attachment
      </a>
    );
  }

  return String(val);
};

// Print helper used in several admin screens
const handlePrint = (sub: Submission | null) => {
  if (!sub) return;
  const originalTitle = document.title;
  document.title = sub.data?.refNo || sub.id;
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) document.documentElement.classList.remove('dark');
  setTimeout(() => {
    window.print();
    setTimeout(() => { document.title = originalTitle; if (isDark) document.documentElement.classList.add('dark'); }, 1000);
  }, 50);
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { submissions, refNoMap, updateSubmissionStatus, isLoading, refreshSubmissions } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [activeTab, setActiveTab] = useState<"action_required" | "in_progress" | "history">("action_required");
  const [isViewAll, setIsViewAll] = useState(false);
  const [trackingNow, setTrackingNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setTrackingNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    refreshSubmissions();
  }, [refreshSubmissions]);

  const approvalSubmissions = submissions.filter(s => s.formType === "car_rental");

  const filtered = approvalSubmissions
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      const dateStr1 = new Date(s.submittedAt).toLocaleDateString("en-CA");
      const dateStr2 = new Date(s.submittedAt).toLocaleDateString("en-GB");
      const typeStr = (formTypeLabels[s.formType] || s.formType).toLowerCase();
      return s.employeeName.toLowerCase().includes(q) || 
             s.id.toLowerCase().includes(q) ||
             s.department.toLowerCase().includes(q) ||
             typeStr.includes(q) ||
             dateStr1.includes(q) ||
             dateStr2.includes(q);
    });

  const tabFiltered = filtered
    .filter(s => {
      if (activeTab === "action_required") return s.status === "approved_hod";
      if (activeTab === "in_progress") return s.status === "pending" || s.status === "approved_hos";
      if (activeTab === "history") return ["approved", "completed", "rejected", "voided"].includes(s.status);
      return true;
    })
    .sort((a, b) =>
      activeTab === "action_required"
        ? stageEnteredAt(a) - stageEnteredAt(b)                                   // longest-waiting first
        : new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()   // newest first
    );

  const decidedCount = filtered.filter(s => s.status === "approved" || s.status === "rejected").length;
  const stats = {
    total: filtered.length,
    actionRequired: filtered.filter(s => s.status === "approved_hod").length,
    inProgress: filtered.filter(s => s.status === "pending" || s.status === "approved_hos").length,
    approvalRate: decidedCount > 0 ? Math.round((filtered.filter(s => s.status === "approved").length / decidedCount) * 100) : 0,
  };
  const visibleSubmissions = isViewAll ? tabFiltered : tabFiltered.slice(0, 10);
  const activePersonalGatePasses = submissions.filter(submission => getPersonalGatePassElapsed(submission, trackingNow));

  const generateRefNo = (sub: Submission) => sub.data?.refNo || refNoMap.get(sub.id) || `HDSB-${sub.id.slice(-4)}`;

  const handleAction = (id: string, status: SubmissionStatus) => {
    const currentSubmission = submissions.find(submission => submission.id === id);

    if (status === "rejected" && !remarks.trim()) {
      toast.error("Please enter a reason before rejecting this request.");
      return;
    }

    const updateData: any = {
      remarks: remarks.trim(),
      rejectedStage: status === "rejected" ? "admin" : undefined,
      rejectedFromStatus: status === "rejected" ? currentSubmission?.status : undefined,
      approvalRemarksHistory: appendApprovalRemark(currentSubmission?.data.approvalRemarksHistory, {
        actorName: user?.name || "HR Admin",
        actorRole: "HR Admin",
        action: status === "rejected" ? "rejected" : "approved",
        remark: remarks.trim(),
      }),
      hrAdminReviewedByName: user?.name || "HR Admin",
      hrAdminReviewedById: user?.id || null,
      hrAdminReviewedAt: new Date().toISOString(),
    };
    
    updateSubmissionStatus(id, status, updateData);
    toast.success(`Submission ${status === "approved" ? "accepted" : "rejected"} successfully`);
    setSelectedSubmission(null);
    setRemarks("");
  };

  const renderFormDetails = (sub: Submission) => {
    const refNo = generateRefNo(sub);

    return (
      <>
        <div className="mb-5 flex items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="inline-flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <h2 className="text-xl font-bold text-foreground">Review Submission</h2>
          </div>
          <VoidSubmissionControl submission={sub} onVoided={() => setSelectedSubmission(null)} variant="icon" />
        </div>

        <EmployeeSummary
          name={sub.employeeName}
          staffId={sub.data.staffId || sub.data.employeeInfo?.staffNo || sub.data.employeeInfo?.employeeNumber || sub.submittedBy || "—"}
          department={sub.department || "—"}
          position={sub.data.position || sub.data.employeeInfo?.position || "—"}
          additionalDetails={[
            { label: "IC Number", value: sub.data.icNo },
            { label: "Mobile Number", value: sub.data.mobileNumber },
            { label: "Driving Licence Number", value: sub.data.drivingLicenseNo },
          ]}
          className="mb-5 [&>div]:bg-background"
        />

        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Submission Summary</p>
        <div className="mb-5 space-y-0 rounded-xl border border-border/60 bg-background p-4 shadow-sm [&>div>div]:font-bold [&>div>span]:font-medium sm:p-5">
          <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start first:pt-0">
            <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Ref No</span>
            <div className="text-xs sm:text-sm font-bold text-foreground sm:col-span-2 text-left">{refNo}</div>
          </div>

          {sub.formType === 'car_rental' ? (
            <>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Destination</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.destination || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Journey Type</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words uppercase">{sub.data.journeyType || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Purpose</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.purpose || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Journey Dates</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">
                  {sub.data.fromDate ? new Date(sub.data.fromDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} - {sub.data.toDate ? new Date(sub.data.toDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </div>
              </div>
              <div className="hidden py-2 sm:py-4 border-b border-border/50 grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Head of Section</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.hos || sub.data.hosName || "—"}</div>
              </div>
              <div className="hidden py-2 sm:py-4 border-b border-border/50 grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Head of Department</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.hod || sub.data.hodName || "—"}</div>
              </div>

              {sub.data.licenseAttachment && (
                <div className="grid grid-cols-1 items-start gap-1 border-b border-border/50 py-2 sm:grid-cols-3 sm:gap-4 sm:py-4">
                  <span className="mt-0.5 text-xs font-bold uppercase tracking-wider text-primary sm:text-sm">Driving Licence</span>
                  <a href={sub.data.licenseAttachment} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline sm:col-span-2 sm:text-sm dark:text-blue-400 dark:hover:text-blue-300">
                    <FileText className="h-4 w-4" /> View Licence
                  </a>
                </div>
              )}
              
              {sub.data.passengers && sub.data.passengers.some((p: any) => p.name) && (
                <div className="flex flex-col items-start gap-2 py-2 sm:py-4">
                  <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold">Passengers</span>
                  <div className="w-full text-xs sm:text-sm font-medium text-foreground">
                    {renderValue(sub.data.passengers.filter((p: any) => p.name))}
                  </div>
                </div>
              )}
            </>
          ) : (
            Object.entries(sub.data)
              .filter(([key]) => !['name', 'hos', 'hod', 'remarks', 'avatar', 'securityLog', 'position', 'staffId', 'employeeInfo', 'hosName', 'hodName'].includes(key) && !/^\d+$/.test(key))
              .map(([key, value]) => {
                let formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
                if (key === 'companyDetails') formattedKey = 'Company Details';
                if (key === 'personalDetails') formattedKey = 'Personal Details';
                if (key === 'purposeType') formattedKey = 'Purpose Type';
                if (key === 'licenseAttachment') formattedKey = 'Driving Licence Attachment';

                if (value === null || value === undefined || value === "") return null;
                if (Array.isArray(value) && value.length === 0) return null;
                if (Array.isArray(value) && typeof value[0] === 'object' && value.filter(row => row && typeof row === 'object' && Object.values(row).some(v => v !== "" && v !== null)).length === 0) return null;
                if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return null;

                return (
                  <div key={key} className={`py-2 sm:py-4 border-b border-border/50 last:border-0 ${typeof value === 'object' && value !== null && !Array.isArray(value) ? 'flex flex-col items-start gap-2' : Array.isArray(value) && typeof value[0] === 'object' ? 'flex flex-col items-start gap-2' : 'grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start'}`}>
                    <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">{formattedKey}</span>
                    <div className={`text-xs sm:text-sm font-medium text-foreground ${typeof value === 'object' && value !== null && !Array.isArray(value) ? 'w-full' : Array.isArray(value) && typeof value[0] === 'object' ? 'w-full' : 'sm:col-span-2 text-left break-words'}`}>
                      {renderValue(value)}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </>
    );
  };

  if (isLoading) {
    return (
      <ApprovalDashboardSkeleton
        title="Loading HR approvals…"
        description="Retrieving the latest vehicle booking requests."
        statsCount={3}
      />
    );
  }

  if (selectedSubmission) {
    const isApprovalForm = selectedSubmission.formType === "car_rental";
    const canApprove = selectedSubmission.status === "approved_hod";
    const isPending = selectedSubmission.status === "pending" || selectedSubmission.status === "approved_hos";

    return (
      <div className="min-h-full bg-muted/30">
      <div className="mx-auto max-w-5xl animate-in fade-in-5 slide-in-from-bottom-2 p-4 duration-300 sm:p-6 lg:p-7">
        <div className="rounded-2xl border border-border/60 bg-muted/40 p-3 shadow-sm sm:p-4 lg:p-5">
        {isApprovalForm && renderFormDetails(selectedSubmission)}

        <ApprovalRemarksHistory submission={selectedSubmission} />

        {isPending && !canApprove && isApprovalForm && (
          <div className="rounded-xl border border-border/60 bg-background p-4 text-center shadow-sm">
            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-sm text-muted-foreground font-medium">
                {selectedSubmission.status === "pending" ? "Waiting for Head of Section (HOS) approval." :
                 selectedSubmission.status === "approved_hos" ? "Pending HOD approval." :
                 "No action required at this time."}
              </p>
              <div className="w-full max-w-md">
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">HR override</p>
                <Textarea
                  placeholder="Reason for rejecting this request..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={3}
                  className="mb-3 min-h-20 resize-y bg-background"
                />
                <button onClick={() => handleAction(selectedSubmission.id, "rejected")} className="w-full px-6 py-3 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors text-sm">Reject request</button>
              </div>
            </div>
          </div>
        )}

        {canApprove && isApprovalForm && (
          <>
            <div className="rounded-xl border border-border/60 bg-background p-4 shadow-sm sm:p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Remarks</p>
            <Textarea
              placeholder="Enter remarks if any..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={3}
              className="mb-4 min-h-20 resize-y bg-muted/20 text-base sm:text-sm"
            />
            <div className="flex flex-row gap-3 sm:gap-4">
              <button
                onClick={() => handleAction(selectedSubmission.id, "rejected")}
                className="flex-1 px-2 sm:px-6 py-3 sm:py-4 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors text-sm sm:text-base"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction(selectedSubmission.id, "approved")}
                className="flex-1 px-2 sm:px-6 py-3 sm:py-4 rounded-xl bg-[#57D51B] text-white font-bold text-center hover:bg-[#49BD16] transition-colors text-sm sm:text-base"
              >
                Approve
              </button>
            </div>
            </div>
          </>
        )}

        {isApprovalForm && (
          <div className="flex justify-center mt-8">
            <button onClick={() => handlePrint(selectedSubmission)} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
              <Printer className="h-4 w-4" /> Print request
            </button>
          </div>
        )}

        {isApprovalForm && <ApprovalOverview submission={selectedSubmission} />}
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">HR Form Approvals</h1>
          <p className="text-muted-foreground text-sm mt-1">Final approval for vehicle booking requests, after HOS and HOD sign-off.</p>
        </div>
        <div className="flex items-center gap-5 sm:gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Approval rate</p>
            <p className="mt-0.5 text-lg font-bold leading-none text-foreground">{stats.approvalRate}%</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total requests</p>
            <p className="mt-0.5 text-lg font-bold leading-none text-foreground">{stats.total}</p>
          </div>
        </div>
      </div>

      <div className="animate-in slide-in-from-bottom-2 duration-700">
          <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1.5">
            {([
              ["action_required", "Action Required", stats.actionRequired, "bg-red-500 text-white"],
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

          {activePersonalGatePasses.length > 0 && (
            <div className="card-elevated mb-4 overflow-hidden border-border/60">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
                <div><h2 className="text-sm font-bold text-foreground">Personal Gate Pass Tracking</h2><p className="mt-0.5 text-xs text-muted-foreground">Live from the actual exit time recorded by Security.</p></div>
                <Badge className="shrink-0 border-0 bg-primary/10 text-primary">{activePersonalGatePasses.length} currently out</Badge>
              </div>
              <div className="divide-y divide-border/60">
                {activePersonalGatePasses.map(submission => {
                  const overdue = getPersonalGatePassElapsed(submission, trackingNow)?.overdue;
                  const timeOut = getGatePassTimeOut(submission);
                  return <div key={submission.id} className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${overdue ? "bg-red-500/10" : "bg-background"}`}><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{submission.employeeName}</p><p className="mt-0.5 text-xs text-muted-foreground">{submission.department} · Out {timeOut !== null ? new Date(timeOut).toLocaleString("en-GB") : "—"}</p></div><PersonalGatePassBadge submission={submission} now={trackingNow} /></div>;
                })}
              </div>
            </div>
          )}

          <div className="card-elevated overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {activeTab === "action_required" ? "Awaiting HR approval" : activeTab === "in_progress" ? "In progress" : "History"}
              </h2>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search employee or date..." 
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
                      <TableRow className="bg-muted/30 hover:bg-muted/40">
                        <TableHead className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Ref No.</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Employee</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Submission Date</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Booking Date</TableHead>
                        {activeTab === "action_required" && (
                          <TableHead className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Waiting</TableHead>
                        )}
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Status</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleSubmissions.map((sub) => {
                        const avatarUrl = sub.data?.employeeInfo?.avatar || sub.data?.avatar;
                        const waiting = activeTab === "action_required" ? formatWaiting(sub) : null;
                        return (
                          <TableRow key={sub.id} className="hover:bg-muted/20">
                            <TableCell className="text-sm font-semibold text-primary whitespace-nowrap">{generateRefNo(sub)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${!avatarUrl ? getInitialColor(sub.employeeName) : 'bg-transparent'}`}>
                                  {avatarUrl ? (
                                    <img src={avatarUrl} alt={sub.employeeName} className="w-full h-full object-cover" />
                                  ) : (
                                    getInitials(sub.employeeName)
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-foreground">{sub.employeeName}</p>
                                  <p className="text-xs text-muted-foreground">{sub.data.position || sub.department}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-start whitespace-nowrap">
                                <span className="text-sm font-medium text-muted-foreground">
                                  {new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                                <span className="mt-0.5 text-xs text-muted-foreground">
                                  {new Date(sub.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-start whitespace-nowrap">
                                <span className="text-sm font-semibold text-foreground">
                                  {sub.data?.fromDate
                                    ? new Date(sub.data.fromDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                    : "—"}
                                </span>
                                {sub.data?.fromDate && (
                                  <span className="mt-0.5 text-xs text-muted-foreground">
                                    {new Date(sub.data.fromDate).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            {waiting && (
                              <TableCell className={`whitespace-nowrap text-sm font-semibold ${waiting.tone}`}>{waiting.label}</TableCell>
                            )}
                            <TableCell className="text-center">{statusBadge(sub.status)}</TableCell>
                            <TableCell className="text-center">
                              <button onClick={() => setSelectedSubmission(sub)} className="min-h-11 min-w-[8rem] whitespace-nowrap rounded-lg bg-primary px-5 py-2.5 text-[15px] font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow active:scale-[0.98]">
                                {sub.status === "approved_hod" ? "Review" : "View"}
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="divide-y divide-border/60 sm:hidden">
                  {visibleSubmissions.map(sub => {
                    const waiting = activeTab === "action_required" ? formatWaiting(sub) : null;
                    return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubmission(sub)}
                      className="block w-full p-4 text-left transition-colors hover:bg-muted/30"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{sub.employeeName}</p>
                          <p className="mt-0.5 text-xs font-medium text-primary">{generateRefNo(sub)}</p>
                        </div>
                        {statusBadge(sub.status)}
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                          <p>Submitted: {new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                          <p className="mt-1">Booking: {sub.data?.fromDate ? new Date(sub.data.fromDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
                          {waiting && <p className={`mt-1 font-semibold ${waiting.tone}`}>Waiting {waiting.label}</p>}
                        </div>
                        <span className="flex min-h-11 min-w-[7rem] shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm">
                          {sub.status === "approved_hod" ? "Review" : "View"}
                        </span>
                      </div>
                    </button>
                    );
                  })}
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
    </div>
  );
};

export default AdminDashboard;
