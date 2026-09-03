import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { useUsers } from "@/contexts/UsersContext";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, FileText, ExternalLink, CheckCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { renderValue } from "@/components/DataRenderer";
import ITApplicationRequestDetails from "@/components/ITApplicationRequestDetails";
import ITAdminRequestDetails from "@/components/ITAdminRequestDetails";
import ApprovalDashboardSkeleton from "@/components/ApprovalDashboardSkeleton";
import ApprovalOverview from "@/components/ApprovalOverview";
import ApprovalRemarksHistory from "@/components/ApprovalRemarksHistory";
import { Textarea } from "@/components/ui/textarea";
import { appendApprovalRemark } from "@/lib/approvalRemarks";
import EmployeeSummary from "@/components/EmployeeSummary";
import { getGatePassTimeOut } from "@/components/PersonalGatePassTracker";

const formatEstimatedTime = (submittedAt: string, time?: string) => {
  if (!time) return "—";
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "—";
  const d = new Date(submittedAt);
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
};

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request",
  leave: "Gate Pass",
  claim: "Petty Cash Claim",
  ppe_request: "PPE | Uniform | Office Supplies",
  cctv_access_request: "CCTV Access Request",
  it_admin_request: "IT Request Form (Admin)",
  it_application_request: "IT Request Form (Application)",
  it_facilities_requisition: "IT Facilities Requisition Form",
  material_requisition_slip: "Material Requisition Slip (MRS)",
};

// When the submission entered the stage that is currently waiting on an approver —
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

// The approval stage the current user is acting as, from the submission's status.
const actorStageFor = (sub: Submission): string => {
  if (sub.status === "pending") return "hos";
  if (sub.status === "approved_hos") return "hod";
  if (sub.status === "approved_hod") return sub.formType === "leave" ? "manco" : "hop";
  return "hof";
};
const stageRoleLabel = (stage: string) => (stage === "manco" ? "MANCO" : stage.toUpperCase());

// The status a submission moves to when the current approver approves it.
const nextApprovedStatus = (sub: Submission): SubmissionStatus => {
  if (sub.status === "pending") return sub.data.hodName === "N/A" ? "approved_hod" : "approved_hos";
  if (sub.status === "approved_hos") return "approved_hod";
  if (sub.status === "approved_hod") return sub.formType === "leave" ? "approved_manco" : "pending_finance_review";
  if (sub.status === "approved_hop") return "approved_hof";
  return "approved";
};

const claimTotal = (sub: Submission) => {
  const value = Number(sub.data?.totalAmount);
  return Number.isFinite(value) ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
};

const DetailRow = ({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) => (
  <div className={`grid grid-cols-1 items-start gap-1 py-2 sm:grid-cols-3 sm:gap-3 sm:py-2.5 ${last ? "" : "border-b border-border/50"}`}>
    <span className="mt-0.5 text-xs font-bold uppercase tracking-wider text-primary sm:text-sm">{label}</span>
    <div className="text-left text-xs font-medium text-foreground sm:col-span-2 sm:text-sm">{value || "—"}</div>
  </div>
);

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-[#57D51B] text-white hover:bg-[#57D51B] border-0 text-xs font-medium px-3 py-1">Fully Approved</Badge>;
    case "approved_hof":
      return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-0 text-xs font-medium px-3 py-1">HOF Approved</Badge>;
    case "approved_hop":
      return <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400 border-0 text-xs font-medium px-3 py-1">HOP Approved</Badge>;
    case "approved_hod":
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0 text-xs font-medium px-3 py-1">HOD Approved</Badge>;
    case "approved_manco":
      return <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-0 text-xs font-medium px-3 py-1">Manco Approved</Badge>;
    case "approved_hos":
      return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-0 text-xs font-medium px-3 py-1">HOS Approved</Badge>;
    case "rejected":
      return <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive border-0 text-xs font-medium px-3 py-1">Rejected</Badge>;
    case "voided":
      return <Badge className="border-0 bg-slate-500/15 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">Voided</Badge>;
    case "pending":
    default:
      // For the forms this dashboard handles, 'pending' always means waiting for HOS.
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

const ApproverDashboard = () => {
  const { user } = useAuth();
  const { users } = useUsers();
  const { submissions, updateSubmissionStatus, refNoMap, isLoading, refreshSubmissions } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [activeTab, setActiveTab] = useState<"action_required" | "in_progress" | "history">("action_required");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    refreshSubmissions();
  }, [refreshSubmissions]);
  const [isViewAll, setIsViewAll] = useState(false);

  useEffect(() => { setSelectedIds(new Set()); }, [activeTab, search]);

  const isHOD = user?.role === "hod" || user?.secondary_roles?.includes("hod");
  const isHOS = user?.role === "hos" || user?.secondary_roles?.includes("hos");
  const isHOP = user?.role === "head_of_purchasing" || user?.secondary_roles?.includes('head_of_purchasing');
  const isHOF = user?.role === "head_of_finance" || user?.secondary_roles?.includes('head_of_finance');
  const isMancoMember = user?.role === "manco_member" || user?.secondary_roles?.includes('manco_member');

  const roleLabel = isHOD ? "Head of Department"
    : isHOS ? "Head of Section"
    : isMancoMember ? "MANCO member"
    : isHOP ? "Head of Purchasing"
    : isHOF ? "Head of Finance"
    : "an approver";

  const isAssignedHOS = (s: Submission) => isHOS &&
    (s.data.hosUserId ? s.data.hosUserId === user?.id : (s.data.hosName || s.data.hos) === user?.name);
  const isAssignedHOD = (s: Submission) => isHOD &&
    (s.data.hodUserId ? s.data.hodUserId === user?.id : (s.data.hodName || s.data.hod) === user?.name);
  const isAssignedHOP = (s: Submission) => isHOP && s.formType === "claim" &&
    (s.data.hopUserId ? s.data.hopUserId === user?.id : s.data.hopName === user?.name);
  const isAssignedHOF = (s: Submission) => isHOF && s.formType === "claim" &&
    (s.data.hofUserId ? s.data.hofUserId === user?.id : s.data.hofName === user?.name);
  const isAssignedManco = (s: Submission) => isMancoMember && s.formType === "leave" &&
    (s.data.mancoMemberUserId ? s.data.mancoMemberUserId === user?.id : s.data.mancoMemberName === user?.name);

  const isActionRequiredForUser = (s: Submission) =>
    (isAssignedHOS(s) && s.status === "pending") ||
    (isAssignedHOD(s) && s.status === "approved_hos") ||
    (isAssignedHOP(s) && s.status === "approved_hod") ||
    (isAssignedHOF(s) && s.status === "approved_hop") ||
    (isAssignedManco(s) && s.status === "approved_hod");

  const isInProgressForUser = (s: Submission) => {
    if (isActionRequiredForUser(s)) return false;
    return (
      (isAssignedHOS(s) && ["approved_hos", "approved_hod", "approved_manco", "pending_finance_review", "approved_hop", "approved_hof", "paid"].includes(s.status)) ||
      (isAssignedHOD(s) && s.status === "pending") ||
      (isAssignedHOP(s) && ["pending", "approved_hos", "pending_finance_review"].includes(s.status)) ||
      (isAssignedHOF(s) && ["pending", "approved_hos", "approved_hod", "pending_finance_review"].includes(s.status)) ||
      (isAssignedManco(s) && ["pending", "approved_hos", "approved_manco", "on_leave"].includes(s.status))
    );
  };

  const filtered = submissions
    .filter(s => isAssignedHOS(s) || isAssignedHOD(s) || isAssignedHOP(s) || isAssignedHOF(s) || isAssignedManco(s))
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
      if (activeTab === "action_required") return isActionRequiredForUser(s);
      if (activeTab === "in_progress") return isInProgressForUser(s);
      if (activeTab === "history") return ["approved", "rejected", "paid", "completed", "voided"].includes(s.status);
      return true;
    })
    .sort((a, b) => activeTab === "action_required"
      ? stageEnteredAt(a) - stageEnteredAt(b)          // longest-waiting first
      : new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const stats = {
    actionRequired: filtered.filter(isActionRequiredForUser).length,
    inProgress: filtered.filter(isInProgressForUser).length,
  };
  const visibleSubmissions = isViewAll ? tabFiltered : tabFiltered.slice(0, 10);

  const selectableInView = activeTab === "action_required" ? visibleSubmissions.filter(isActionRequiredForUser) : [];
  const allSelectableChecked = selectableInView.length > 0 && selectableInView.every(s => selectedIds.has(s.id));
  const toggleSelected = (id: string) => setSelectedIds(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSelectAll = () => setSelectedIds(current => {
    if (selectableInView.every(s => current.has(s.id))) return new Set();
    return new Set(selectableInView.map(s => s.id));
  });

  const handleBulkApprove = async () => {
    const targets = tabFiltered.filter(s => selectedIds.has(s.id) && isActionRequiredForUser(s));
    if (targets.length === 0) return;
    setIsBulkProcessing(true);
    let approved = 0;
    for (const sub of targets) {
      const history = appendApprovalRemark(sub.data.approvalRemarksHistory, {
        actorName: user?.name || "Approver",
        actorRole: stageRoleLabel(actorStageFor(sub)),
        action: "approved",
        remark: "",
      });
      const success = await updateSubmissionStatus(sub.id, nextApprovedStatus(sub), { approvalRemarksHistory: history });
      if (success) approved += 1;
    }
    setIsBulkProcessing(false);
    setSelectedIds(new Set());
    if (approved > 0) toast.success(`${approved} submission${approved === 1 ? "" : "s"} approved.`);
  };

  const generateRefNo = (sub: Submission) => {
    if (sub.data?.refNo) return sub.data.refNo;
    return refNoMap.get(sub.id) || `${sub.formType === "leave" ? "GP" : "HDSB"}-${sub.id.slice(-4)}`;
  };

  const renderLeaveDetailsForApprover = (sub: Submission) => {
    const passType = sub.data.purposeType === 'company' ? 'Company Business' : 'Personal Matter';
    const location = sub.data.purposeType === 'company' ? sub.data.companyDetails?.location : sub.data.personalDetails?.location;
    const purpose = sub.data.purposeType === 'company' ? sub.data.companyDetails?.purpose : sub.data.personalDetails?.purpose;
    const hasActual = sub.data.securityLog?.actualTimeOut || sub.data.securityLog?.actualTimeIn;

    return (
      <>
        <DetailRow label="Pass Type" value={passType} />
        <DetailRow label="Location" value={location} />
        <DetailRow label="Purpose" value={purpose} />
        <DetailRow label="Selected Time Out" value={formatEstimatedTime(sub.submittedAt, sub.data.estimatedTime?.timeOut)} />
        <DetailRow label="Selected Time In" value={formatEstimatedTime(sub.submittedAt, sub.data.estimatedTime?.timeIn)} last={!hasActual} />
        {hasActual && (
          <>
            <DetailRow label="Actual Time Out" value={getGatePassTimeOut(sub) !== null ? new Date(getGatePassTimeOut(sub)!).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "—"} />
            <DetailRow label="Actual Time In" value={sub.data.securityLog.actualTimeIn ? new Date(sub.data.securityLog.actualTimeIn).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "—"} last />
          </>
        )}
      </>
    );
  };

  const renderCarRentalDetailsForApprover = (sub: Submission) => (
    <>
      <DetailRow label="Destination" value={sub.data.destination} />
      <DetailRow label="Purpose" value={sub.data.purpose} />
      <DetailRow
        label="Journey Dates"
        value={`${sub.data.fromDate ? new Date(sub.data.fromDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} — ${sub.data.toDate ? new Date(sub.data.toDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}`}
        last={!sub.data.licenseAttachment}
      />
      {sub.data.licenseAttachment && (
        <DetailRow
          label="License"
          last
          value={
            <a href={sub.data.licenseAttachment} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline">
              <FileText className="h-4 w-4" /> View Document
            </a>
          }
        />
      )}
    </>
  );

  const handleAction = async (id: string, status: SubmissionStatus) => {
    if (isProcessingAction) return;
    if (status === "rejected" && !remarks.trim()) {
      toast.error("Please enter a reason before rejecting this submission.");
      return;
    }
    setIsProcessingAction(true);
    const stage = selectedSubmission ? actorStageFor(selectedSubmission) : "hos";
    const approvalRemarksHistory = appendApprovalRemark(selectedSubmission?.data.approvalRemarksHistory, {
      actorName: user?.name || "Approver",
      actorRole: stageRoleLabel(stage),
      action: status === "rejected" ? "rejected" : "approved",
      remark: remarks.trim(),
    });
    const success = await updateSubmissionStatus(id, status, {
      remarks: remarks.trim() || selectedSubmission?.data.remarks,
      approvalRemarksHistory,
      rejectedStage: status === "rejected" ? stage : undefined,
    });
    setIsProcessingAction(false);
    if (!success) return;
    toast.success(`Submission ${status === "rejected" ? "rejected" : "approved"} successfully`);
    setSelectedSubmission(null);
    setRemarks("");
  };

  if (isLoading) {
    return (
      <ApprovalDashboardSkeleton
        title="Loading approvals…"
        description="Retrieving the latest submissions assigned to you."
      />
    );
  }

  if (selectedSubmission) {
    const submittingUser = users.find(candidate => candidate.id === selectedSubmission.submittedBy);
    const employeeStaffId = selectedSubmission.data.staffId || selectedSubmission.data.employeeInfo?.staffNo || selectedSubmission.data.employeeInfo?.employeeNumber || submittingUser?.staffId || "—";
    const employeePosition = selectedSubmission.data.position || selectedSubmission.data.employeeInfo?.position || submittingUser?.position || "—";
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 print:absolute print:inset-0 print:m-0 print:w-full print:max-w-none print:bg-white print:p-8 print:text-black print:z-50 animate-in fade-in-5">
        <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="mb-4 inline-flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/10 hover:shadow-sm group print:hidden">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to list
        </button>

        <EmployeeSummary
          name={selectedSubmission.employeeName}
          staffId={employeeStaffId}
          department={selectedSubmission.department}
          position={employeePosition}
          className="mb-4"
        />

        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Submission Summary</p>
        <div className="mb-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-4 border-b border-border/50 pb-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight text-foreground sm:text-xl">
                {formTypeLabels[selectedSubmission.formType] || selectedSubmission.formType.replace(/_/g, " ")}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>Ref: <span className="font-semibold text-foreground">{generateRefNo(selectedSubmission)}</span></span>
                <span>Submitted {new Date(selectedSubmission.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                {isActionRequiredForUser(selectedSubmission) && (
                  <span className={formatWaiting(selectedSubmission).tone}>Waiting {formatWaiting(selectedSubmission).label}</span>
                )}
              </p>
            </div>
            <div className="shrink-0">
              {statusBadge(selectedSubmission.status)}
            </div>
          </div>

          {selectedSubmission.formType === 'car_rental' ? (
            renderCarRentalDetailsForApprover(selectedSubmission)
          ) : selectedSubmission.formType === 'leave' ? (
            renderLeaveDetailsForApprover(selectedSubmission)
          ) : null}

          {selectedSubmission.formType === 'claim' && (
            <>
              <div className="mt-3 border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground">Claim Details</p>
                <div className="text-sm font-bold text-foreground mt-1">
                  {renderValue(selectedSubmission.data.claimRows)}
                </div>
              </div>
              <div className="mt-3 border-t border-border/50 pt-3 text-right">
                <p className="text-xs text-muted-foreground uppercase font-bold">Total Amount</p>
                <p className="text-xl font-bold text-primary">RM {claimTotal(selectedSubmission)}</p>
              </div>
            </>
          )}
          {selectedSubmission.formType === 'cctv_access_request' && (
            <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
              <div><p className="text-xs text-muted-foreground">Type of Request</p><div className="mt-1 text-sm font-bold text-foreground">{renderValue(selectedSubmission.data.requestTypes)}</div></div>
              <div><p className="text-xs text-muted-foreground">Camera Location</p><p className="mt-1 text-sm font-bold text-foreground">{selectedSubmission.data.cameraLocation || "—"}</p></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">From</p><p className="mt-1 text-sm font-bold text-foreground">{selectedSubmission.data.fromDateTime ? new Date(selectedSubmission.data.fromDateTime).toLocaleString() : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">To</p><p className="mt-1 text-sm font-bold text-foreground">{selectedSubmission.data.toDateTime ? new Date(selectedSubmission.data.toDateTime).toLocaleString() : "—"}</p></div>
              </div>
              <div><p className="text-xs text-muted-foreground">Purpose of Access</p><p className="mt-1 text-sm font-bold text-foreground">{selectedSubmission.data.purpose || "—"}</p></div>
            </div>
          )}
          {selectedSubmission.formType === 'it_application_request' && <ITApplicationRequestDetails submission={selectedSubmission} showEmployeeDetails={false} />}
          {['it_admin_request', 'it_facilities_requisition'].includes(selectedSubmission.formType) && <ITAdminRequestDetails submission={selectedSubmission} showEmployeeDetails={false} />}
        </div>

        {selectedSubmission.data.passengers && selectedSubmission.data.passengers.some((p) => p.name) && (
          <div className="mb-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">PASSENGERS</p>
            <div className="space-y-2">
              {selectedSubmission.data.passengers.filter((p) => p.name).map((p, i: number) => (
                <div key={i} className="flex justify-between items-center bg-background/50 p-2.5 rounded-lg border border-border/50">
                  <div>
                    <p className="text-sm font-bold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.department} {p.position ? `• ${p.position}` : ''}</p>
                  </div>
                  <span className="text-xs font-bold text-foreground bg-muted px-2 py-1 rounded">{p.staffId}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedSubmission.data.attachments && selectedSubmission.data.attachments.length > 0 ? (
          <div className="mb-4 space-y-2">
            {selectedSubmission.data.attachments.map((url: string, idx: number) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/20">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-primary">View Attachment {idx + 1}</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        ) : selectedSubmission.data.attachment && (
          <a href={selectedSubmission.data.attachment} target="_blank" rel="noopener noreferrer" className="mb-4 flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/20">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-primary">View Attachment</span>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        )}

        <ApprovalRemarksHistory submission={selectedSubmission} />

        {(() => {
          const canApproveAsHOS = isAssignedHOS(selectedSubmission) && selectedSubmission.status === "pending";
          const canApproveAsHOD = isAssignedHOD(selectedSubmission) && selectedSubmission.status === "approved_hos";
          const canApproveAsManco = isAssignedManco(selectedSubmission) && selectedSubmission.status === "approved_hod";
          const canApproveAsHOP = isAssignedHOP(selectedSubmission) && selectedSubmission.status === "approved_hod";
          const canApproveAsHOF = isAssignedHOF(selectedSubmission) && selectedSubmission.status === "approved_hop";
          const canApprove = canApproveAsHOS || canApproveAsHOD || canApproveAsManco || canApproveAsHOP || canApproveAsHOF;
          if (!canApprove) {
            const alreadyApproved = (isHOS && ["approved_hos", "approved_hod", "approved_manco", "pending_finance_review", "approved_hop", "approved_hof", "approved", "on_leave"].includes(selectedSubmission.status)) ||
                                   (isHOD && ["approved_hod", "approved_manco", "pending_finance_review", "approved_hop", "approved_hof", "approved", "on_leave"].includes(selectedSubmission.status)) ||
                                   (isMancoMember && selectedSubmission.formType === 'leave' && ["approved_manco", "on_leave", "approved"].includes(selectedSubmission.status)) ||
                                   (isHOP && ["pending_finance_review", "approved_hop", "approved_hof", "approved"].includes(selectedSubmission.status)) ||
                                    (isHOF && ["approved_hof", "approved"].includes(selectedSubmission.status));

            if (selectedSubmission.status === "rejected") return null;

            if (alreadyApproved) {
              return (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                    You have already approved this submission.
                  </p>
                </div>
              );
            }

            if ((isHOD || isMancoMember || isHOP || isHOF) && selectedSubmission.status === "pending") {
              return (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                    Waiting for Head of Section (HOS) approval first.
                  </p>
                </div>
              );
            }

            if ((isMancoMember || isHOP || isHOF) && selectedSubmission.status === "approved_hos") {
              return (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                    Waiting for Head of Department (HOD) approval first.
                  </p>
                </div>
              );
            }

            if (isHOF && selectedSubmission.status === "approved_hod") {
              return (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                    Waiting for Head of Purchasing (HOP) approval first.
                  </p>
                </div>
              );
            }

            return (
              <div className="p-4 bg-muted/30 rounded-xl text-center">
                <p className="text-sm text-muted-foreground font-medium">No action required at this time.</p>
              </div>
            );
          }
          return (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
              <label htmlFor="approver-remarks" className="text-xs font-bold uppercase tracking-wider text-primary">
                Remarks <span className="font-medium normal-case text-muted-foreground">(required to reject)</span>
              </label>
              <Textarea
                id="approver-remarks"
                placeholder="Add a note, or a reason if you are rejecting…"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
                className="mb-4 mt-2 min-h-20 resize-y bg-background"
              />
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-3">
                <button
                  onClick={() => handleAction(selectedSubmission.id, "rejected")}
                  disabled={isProcessingAction}
                  className="w-full rounded-xl bg-destructive px-6 py-3.5 text-center text-sm font-bold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
                >
                  {isProcessingAction ? "Saving…" : "Reject"}
                </button>
                <button
                  onClick={() => handleAction(selectedSubmission.id, nextApprovedStatus(selectedSubmission))}
                  disabled={isProcessingAction}
                  className="w-full rounded-xl bg-[#57D51B] px-6 py-3.5 text-center text-sm font-bold text-white transition-colors hover:bg-[#49BD16] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
                >
                  <CheckCircle className="mr-2 inline h-4 w-4" />{isProcessingAction ? "Saving…" : "Approve"}
                </button>
              </div>
            </div>
          );
        })()}

        <ApprovalOverview submission={selectedSubmission} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">Submissions awaiting your decision as {roleLabel}.</p>
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

      {selectedIds.size > 0 && activeTab === "action_required" && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-foreground">{selectedIds.size} selected</p>
          <div className="flex gap-2">
            <button onClick={() => setSelectedIds(new Set())} disabled={isBulkProcessing} className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50">Clear</button>
            <button onClick={handleBulkApprove} disabled={isBulkProcessing} className="inline-flex items-center gap-1.5 rounded-lg bg-[#57D51B] px-4 py-2 text-xs font-bold text-white hover:bg-[#49BD16] disabled:opacity-50">
              <CheckCircle className="h-3.5 w-3.5" /> {isBulkProcessing ? "Approving…" : `Approve ${selectedIds.size}`}
            </button>
          </div>
        </div>
      )}

      <div className="card-elevated overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">
            {activeTab === "action_required" ? "Waiting for you" : activeTab === "in_progress" ? "In progress elsewhere" : "History"}
          </h2>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, department, or type…"
              value={search}
              onChange={e => { setSearch(e.target.value); setIsViewAll(false); }}
              className="h-11 w-full pl-9 text-sm sm:w-80"
            />
          </div>
        </div>

        {tabFiltered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Nothing here</h3>
            <p className="text-sm text-muted-foreground mt-1">{activeTab === "action_required" ? "You're all caught up — no submissions need your decision." : "Submissions will appear here."}</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/40">
                  {activeTab === "action_required" && (
                    <TableHead className="w-10">
                      {selectableInView.length > 0 && (
                        <Checkbox checked={allSelectableChecked} onCheckedChange={toggleSelectAll} aria-label="Select all" className="rounded-none border-2" />
                      )}
                    </TableHead>
                  )}
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Employee</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Reference</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Type</TableHead>
                  {activeTab === "action_required" && <TableHead className="text-xs font-bold uppercase tracking-wider">Waiting</TableHead>}
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
            {visibleSubmissions.map((sub) => {
              const avatarUrl = sub.data?.employeeInfo?.avatar || sub.data?.avatar;
              const actionable = isActionRequiredForUser(sub);
              const waiting = activeTab === "action_required" ? formatWaiting(sub) : null;
              return (
                <TableRow key={sub.id} className={selectedIds.has(sub.id) ? "bg-primary/5" : "hover:bg-muted/20"}>
                    {activeTab === "action_required" && (
                      <TableCell>
                        {actionable && (
                          <Checkbox checked={selectedIds.has(sub.id)} onCheckedChange={() => toggleSelected(sub.id)} aria-label={`Select ${sub.employeeName}'s submission`} className="rounded-none border-2" />
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold ${!avatarUrl ? getInitialColor(sub.employeeName) : "bg-transparent"}`}>
                          {avatarUrl ? <img src={avatarUrl} alt={sub.employeeName} className="h-full w-full object-cover" /> : getInitials(sub.employeeName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{sub.employeeName}</p>
                          <p className="truncate text-xs text-muted-foreground">{sub.data.position || sub.department}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="whitespace-nowrap text-sm font-semibold text-primary">{generateRefNo(sub)}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-semibold text-foreground">{formTypeLabels[sub.formType] || sub.formType.replace(/_/g, " ")}</p>
                      {sub.formType === "claim" && <p className="text-[11px] text-muted-foreground">RM {claimTotal(sub)}</p>}
                    </TableCell>
                    {waiting && (
                      <TableCell>
                        <span className={`text-sm font-semibold ${waiting.tone}`}>{waiting.label}</span>
                      </TableCell>
                    )}
                    <TableCell className="text-center">{statusBadge(sub.status)}</TableCell>
                    <TableCell className="text-center">
                      <button onClick={() => setSelectedSubmission(sub)} className={`inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 text-sm font-bold shadow-sm transition-all active:scale-[0.98] ${actionable ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border bg-background text-foreground hover:bg-muted"}`}>
                        {actionable ? "Review" : "View"}<ChevronRight className="h-4 w-4" />
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
                const actionable = isActionRequiredForUser(sub);
                const waiting = activeTab === "action_required" ? formatWaiting(sub) : null;
                return (
                  <div key={sub.id} className={`flex items-start gap-3 p-4 ${selectedIds.has(sub.id) ? "bg-primary/5" : ""}`}>
                    {activeTab === "action_required" && actionable && (
                      <Checkbox checked={selectedIds.has(sub.id)} onCheckedChange={() => toggleSelected(sub.id)} className="mt-1 rounded-none border-2" aria-label={`Select ${sub.employeeName}'s submission`} />
                    )}
                    <button type="button" onClick={() => setSelectedSubmission(sub)} className="min-w-0 flex-1 text-left">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{sub.employeeName}</p>
                          <p className="truncate text-xs text-muted-foreground">{sub.data.position || sub.department}</p>
                        </div>
                        {statusBadge(sub.status)}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate font-semibold text-foreground">
                          {formTypeLabels[sub.formType] || sub.formType.replace(/_/g, " ")}
                          {sub.formType === "claim" && <span className="ml-1.5 font-normal text-muted-foreground">RM {claimTotal(sub)}</span>}
                        </span>
                        <span className="shrink-0 text-muted-foreground">{generateRefNo(sub)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        {waiting
                          ? <span className={`text-xs font-semibold ${waiting.tone}`}>Waiting {waiting.label}</span>
                          : <span className="text-xs text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">{actionable ? "Review" : "View"} <ChevronRight className="h-3.5 w-3.5" /></span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground sm:text-sm">Showing {visibleSubmissions.length} of {tabFiltered.length} entries</p>
              {tabFiltered.length > 10 && (
                <button 
                  onClick={() => setIsViewAll(!isViewAll)}
                  className="w-full rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:w-auto"
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

export default ApproverDashboard;
