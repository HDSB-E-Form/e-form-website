import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { useUsers, type AppUser } from "@/contexts/UsersContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, FileText, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { renderValue } from "@/components/DataRenderer";
import ITApplicationRequestDetails from "@/components/ITApplicationRequestDetails";
import ITAdminRequestDetails from "@/components/ITAdminRequestDetails";
import ApprovalDashboardSkeleton from "@/components/ApprovalDashboardSkeleton";
import DashboardStatCard from "@/components/DashboardStatCard";
import ApprovalOverview from "@/components/ApprovalOverview";
import ApprovalRemarksHistory from "@/components/ApprovalRemarksHistory";
import { Textarea } from "@/components/ui/textarea";
import { appendApprovalRemark } from "@/lib/approvalRemarks";
import EmployeeSummary from "@/components/EmployeeSummary";

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request",
  leave: "Gate Pass",
  claim: "Petty Cash Claim",
  ppe_request: "PPE | Uniform | Office Supplies",
  cctv_access_request: "CCTV Access Request",
  it_admin_request: "IT Request Form (Admin)",
  it_application_request: "IT Request Form (Application)",
  it_facilities_requisition: "IT Facilities Requisition Form",
};

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

  useEffect(() => {
    refreshSubmissions();
  }, [refreshSubmissions]);
  const [isViewAll, setIsViewAll] = useState(false);

  const isHOD = user?.role === "hod" || user?.secondary_roles?.includes("hod");
  const isHOS = user?.role === "hos" || user?.secondary_roles?.includes("hos");
  const isHOP = user?.role === "head_of_purchasing" || user?.secondary_roles?.includes('head_of_purchasing');
  const isHOF = user?.role === "head_of_finance" || user?.secondary_roles?.includes('head_of_finance');
  const isMancoMember = user?.role === "manco_member" || user?.secondary_roles?.includes('manco_member');

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

  const isRecent = (dateStr: string) => {
    const hours = (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
    return hours < 48;
  };

  const tabFiltered = filtered.filter(s => {
    if (activeTab === "action_required") return isActionRequiredForUser(s);
    if (activeTab === "in_progress") return isInProgressForUser(s);
    if (activeTab === "history") return ["approved", "rejected", "paid", "completed", "voided"].includes(s.status);
    return true;
  });

  const stats = {
    total: filtered.length,
    actionRequired: filtered.filter(isActionRequiredForUser).length,
    inProgress: filtered.filter(isInProgressForUser).length,
    resolved: filtered.filter(s => ["approved", "rejected", "voided"].includes(s.status)).length,
  };
  const visibleSubmissions = isViewAll ? tabFiltered : tabFiltered.slice(0, 10);

  const generateRefNo = (sub: Submission) => {
    if (sub.data?.refNo) return sub.data.refNo;
    return refNoMap.get(sub.id) || `${sub.formType === "leave" ? "GP" : "HDSB"}-${sub.id.slice(-4)}`;
  };

  const renderLeaveDetailsForApprover = (sub: Submission) => {
    const passType = sub.data.purposeType === 'company' ? 'Company Business' : 'Personal Matter';
    const location = sub.data.purposeType === 'company' ? sub.data.companyDetails?.location : sub.data.personalDetails?.location;
    const purpose = sub.data.purposeType === 'company' ? sub.data.companyDetails?.purpose : sub.data.personalDetails?.purpose;

    return (
      <>
        <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Pass Type</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{passType}</div>
        </div>
        <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Location</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{location || "—"}</div>
        </div>
        <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Purpose</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{purpose || "—"}</div>
        </div>
        <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Selected Time Out</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{sub.data.estimatedTime?.timeOut || "—"}</div>
        </div>
        <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Selected Time In</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{sub.data.estimatedTime?.timeIn || "—"}</div>
        </div>
        <div className="hidden py-2 sm:py-2.5 border-b border-border/50 grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Head of Section</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
            {sub.data.hosName || sub.data.hos || "—"}
          </div>
        </div>
        <div className="hidden py-2 sm:py-2.5 border-b border-border/50 grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Head of Department</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
            {sub.data.hodName || sub.data.hod || "—"}
          </div>
        </div>
        <div className="hidden py-2 sm:py-2.5 border-b-0 grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Manco Member</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
            {sub.data.mancoMemberName || "—"}
          </div>
        </div>
        {(sub.data.securityLog?.actualTimeOut || sub.data.securityLog?.actualTimeIn) && (
          <>
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
              <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Actual Time Out</span>
              <div className="text-xs sm:text-sm font-bold text-foreground sm:col-span-2 text-left">{sub.data.securityLog.actualTimeOut || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
              <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Actual Time In</span>
              <div className="text-xs sm:text-sm font-bold text-foreground sm:col-span-2 text-left">{sub.data.securityLog.actualTimeIn || "—"}</div>
            </div>
          </>
        )}
      </>
    );
  };

  const renderCarRentalDetailsForApprover = (sub: Submission) => {
    return (
      <>
        <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Destination</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{sub.data.destination || "—"}</div>
        </div>
        <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Purpose</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{sub.data.purpose || "—"}</div>
        </div>
        <div className="py-2 sm:py-2.5 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Journey Dates</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
            {sub.data.fromDate ? new Date(sub.data.fromDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} - {sub.data.toDate ? new Date(sub.data.toDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
          </div>
        </div>
        {sub.data.licenseAttachment && (
          <div className="py-2 sm:py-2.5 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 items-start">
            <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">License</span>
            <a href={sub.data.licenseAttachment} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1.5 text-left sm:col-span-2">
              <FileText className="h-4 w-4" /> View Document
            </a>
          </div>
        )}
      </>
    );
  };

  const handleAction = async (id: string, status: SubmissionStatus) => {
    if (isProcessingAction) return;
    if (status === "rejected" && !remarks.trim()) {
      toast.error("Please enter a reason before rejecting this claim.");
      return;
    }
    setIsProcessingAction(true);
    const currentStatus = selectedSubmission?.status;
    const rejectedStage = currentStatus === "pending" ? "hos" : currentStatus === "approved_hos" ? "hod" : currentStatus === "approved_hod" && selectedSubmission?.formType === "leave" ? "manco" : currentStatus === "approved_hod" ? "hop" : "hof";
    const approvalRemarksHistory = appendApprovalRemark(selectedSubmission?.data.approvalRemarksHistory, {
      actorName: user?.name || "Approver",
      actorRole: rejectedStage === "manco" ? "MANCO" : rejectedStage.toUpperCase(),
      action: status === "rejected" ? "rejected" : "approved",
      remark: remarks.trim(),
    });
    const success = await updateSubmissionStatus(id, status, {
      remarks: remarks.trim() || selectedSubmission?.data.remarks,
      approvalRemarksHistory,
      rejectedStage: status === "rejected" ? rejectedStage : undefined,
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

        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">SUBMISSION SUMMARY</p>
        <div className="mb-4 rounded-xl border border-border/60 bg-white p-4 shadow-sm sm:p-5 dark:bg-card">
          <div className="mb-3 flex items-start justify-between gap-4 border-b border-border/50 pb-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold uppercase leading-tight text-foreground sm:text-xl">
                {formTypeLabels[selectedSubmission.formType] || selectedSubmission.formType.replace(/_/g, " ")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Ref: <span className="font-semibold text-foreground">{generateRefNo(selectedSubmission)}</span>
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
                <p className="text-xl font-bold text-primary">RM {selectedSubmission.data.totalAmount || "0.00"}</p>
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
          <div className="mb-4 rounded-xl border border-border/60 bg-white p-4 shadow-sm sm:p-5 dark:bg-card">
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
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block border border-dashed border-border rounded-xl bg-white p-4 shadow-sm dark:bg-card flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-primary">View Attachment {idx + 1}</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        ) : selectedSubmission.data.attachment && (
          <a href={selectedSubmission.data.attachment} target="_blank" rel="noopener noreferrer" className="mb-4 flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-border bg-white p-4 shadow-sm transition-colors hover:bg-muted/20 dark:bg-card">
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
            <>
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">REMARKS</p>
              <Textarea
                placeholder="Please enter remarks if any..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
                className="mb-4 min-h-20 resize-y bg-muted/20"
              />
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
                <button
                  onClick={() => handleAction(selectedSubmission.id, "rejected")}
                  disabled={isProcessingAction}
                  className="w-full rounded-xl bg-destructive px-6 py-3.5 text-center font-bold text-white transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-1/3 sm:py-4"
                >
                  {isProcessingAction ? "SAVING..." : "REJECT"}
                </button>
                <button
                  onClick={() => {
                    let nextStatus: SubmissionStatus = "approved";
                    if (canApproveAsHOS) {
                      nextStatus = selectedSubmission.data.hodName === "N/A" ? "approved_hod" : "approved_hos";
                    } else if (canApproveAsHOD) {
                      nextStatus = "approved_hod";
                    } else if (canApproveAsManco) {
                      nextStatus = "approved_manco";
                    } else if (canApproveAsHOP) {
                      nextStatus = "pending_finance_review";
                    } else if (canApproveAsHOF) {
                      nextStatus = "approved_hof";
                    }
                    handleAction(selectedSubmission.id, nextStatus);
                  }}
                  disabled={isProcessingAction}
                  className="w-full rounded-xl bg-[#57D51B] px-6 py-3.5 text-center font-bold text-white transition-colors hover:bg-[#49BD16] disabled:cursor-not-allowed disabled:opacity-60 sm:w-2/3 sm:py-4"
                >
                  {isProcessingAction ? "SAVING..." : "APPROVE"}
                </button>
              </div>
            </>
          );
        })()}

        <ApprovalOverview submission={selectedSubmission} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 slide-in-from-bottom-2 duration-500">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Approvals Dashboard</h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <DashboardStatCard label="Action Required" value={stats.actionRequired} icon={AlertCircle} tone="amber" />
        <DashboardStatCard label="In Progress" value={stats.inProgress} icon={Clock} tone="indigo" />
        <DashboardStatCard label="Resolved" value={stats.resolved} icon={CheckCircle} tone="emerald" />
        <DashboardStatCard label="Total Assigned" value={stats.total} icon={FileText} tone="blue" />
      </div>

      <div className="card-elevated p-4 sm:p-5 mb-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Filter Approvals</p>
        <div className="flex w-full sm:w-fit max-w-full items-center overflow-x-auto no-scrollbar rounded-xl border border-black/25 bg-white/70 p-1.5 shadow-sm backdrop-blur-xl dark:border-white/25 dark:bg-white/10">
          <button onClick={() => { setActiveTab("action_required"); setIsViewAll(false); }} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "action_required" ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10"}`}>
            Action Required
            {stats.actionRequired > 0 && (
              <Badge className="h-5 min-w-5 justify-center border-0 bg-red-500 px-1.5 text-[10px] text-white hover:bg-red-500">{stats.actionRequired}</Badge>
            )}
          </button>
          <span className="mx-2.5 h-6 w-px flex-shrink-0 bg-blue-900/55 dark:bg-blue-300/45" aria-hidden="true" />
          <button onClick={() => { setActiveTab("in_progress"); setIsViewAll(false); }} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "in_progress" ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10"}`}>
            In Progress
            {stats.inProgress > 0 && (
              <Badge className="h-5 min-w-5 justify-center border-0 bg-amber-500 px-1.5 text-[10px] text-white hover:bg-amber-500">{stats.inProgress}</Badge>
            )}
          </button>
          <span className="mx-2.5 h-6 w-px flex-shrink-0 bg-blue-900/55 dark:bg-blue-300/45" aria-hidden="true" />
          <button onClick={() => { setActiveTab("history"); setIsViewAll(false); }} className={`flex-1 sm:flex-none flex items-center justify-center whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "history" ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10"}`}>
            History
          </button>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Submissions</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, date, or type..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setIsViewAll(false); }} 
              className="pl-9 w-full sm:w-72 h-9 text-sm" 
            />
          </div>
        </div>

        {tabFiltered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No submissions found in this tab</h3>
            <p className="text-sm text-muted-foreground mt-1">Forms assigned to you will appear here.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Employee</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
            {visibleSubmissions.map((sub) => {
              const avatarUrl = sub.data?.employeeInfo?.avatar || sub.data?.avatar;
              return (
                <TableRow key={sub.id} className={`${activeTab === "action_required" && isRecent(sub.submittedAt) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-12 rounded-full bg-primary" />
                    <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${!avatarUrl ? getInitialColor(sub.employeeName) : 'bg-transparent'}`}>
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
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-sm text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString("en-CA")}</span>
                        <span className="text-[11px] text-muted-foreground/80">
                          {new Date(sub.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {formTypeLabels[sub.formType] || sub.formType.toUpperCase().replace(/_/g, ' ')}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">{statusBadge(sub.status)}</TableCell>
                    <TableCell className="text-center">
                      <button onClick={() => setSelectedSubmission(sub)} className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors whitespace-nowrap">
                        View Details
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
                  className={`block w-full p-4 text-left transition-colors hover:bg-muted/30 ${activeTab === "action_required" && isRecent(sub.submittedAt) ? "bg-primary/5" : ""}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{sub.employeeName}</p>
                      <p className="truncate text-xs text-muted-foreground">{sub.data.position || sub.department}</p>
                    </div>
                    {statusBadge(sub.status)}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {formTypeLabels[sub.formType] || sub.formType.toUpperCase().replace(/_/g, " ")}
                    </p>
                    <span className="flex shrink-0 flex-col items-end text-xs text-muted-foreground">
                      <span>{new Date(sub.submittedAt).toLocaleDateString("en-CA")}</span>
                      <span className="text-[10px] text-muted-foreground/80">
                        {new Date(sub.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </span>
                  </div>
                  <span className="mt-3 flex w-full items-center justify-center rounded-lg bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary">
                    {isActionRequiredForUser(sub) ? "Review" : "View Details"}
                  </span>
                </button>
              ))}
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
  );
};

export default ApproverDashboard;
