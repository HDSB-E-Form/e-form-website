import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { useUsers, type AppUser } from "@/contexts/UsersContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, FileText, ExternalLink, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { renderValue } from "@/components/DataRenderer";
import ITApplicationRequestDetails from "@/components/ITApplicationRequestDetails";
import ITAdminRequestDetails from "@/components/ITAdminRequestDetails";
import ApprovalDashboardSkeleton from "@/components/ApprovalDashboardSkeleton";
import DashboardStatCard from "@/components/DashboardStatCard";

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
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-xs font-medium px-3 py-1">Fully Approved</Badge>;
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
      return <Badge className="bg-destructive/15 text-destructive dark:text-red-400 border-0 text-xs font-medium px-3 py-1">Rejected</Badge>;
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

  const filtered = submissions
    .filter(s => {
      const hosValue = s.data.hosName || s.data.hos;
      const hodValue = s.data.hodName || s.data.hod;
      const hopValue = s.data.hopName;
      const hofValue = s.data.hofName;
      const mancoValue = s.data.mancoMemberName;
      const isUserHOS = isHOS && (s.data.hosUserId ? s.data.hosUserId === user?.id : hosValue === user?.name);
      const isUserHOD = isHOD && (s.data.hodUserId ? s.data.hodUserId === user?.id : hodValue === user?.name);
      const isUserHOP = isHOP && (s.data.hopUserId ? s.data.hopUserId === user?.id : hopValue === user?.name) && s.formType === 'claim';
      const isUserHOF = isHOF && (s.data.hofUserId ? s.data.hofUserId === user?.id : hofValue === user?.name) && s.formType === 'claim';
      const isUserManco = isMancoMember && (s.data.mancoMemberUserId ? s.data.mancoMemberUserId === user?.id : mancoValue === user?.name) && s.formType === 'leave';
      return isUserHOS || isUserHOD || isUserHOP || isUserHOF || isUserManco;
    })
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
    if (activeTab === "action_required") {
      const conditions = [];
      if (isHOS) conditions.push(s.status === "pending");
      if (isHOD) conditions.push(s.status === "approved_hos");
      if (isHOP) conditions.push(s.formType === 'claim' && s.status === "approved_hod");
      if (isHOF) conditions.push(s.formType === 'claim' && s.status === "approved_hop");
      if (isMancoMember) conditions.push(s.formType === 'leave' && s.status === "approved_hod");
      return conditions.some(Boolean);
    }
    if (activeTab === "in_progress") {
      if (isHOS) return ["approved_hos", "approved_hod", "approved_manco", "pending_finance_review", "approved_hop", "approved_hof", "paid"].includes(s.status);
      if (isHOD) return s.status === "pending";
      if (isHOP && s.formType === 'claim') return ["pending", "approved_hos", "pending_finance_review"].includes(s.status);
      if (isHOF) return ["pending", "approved_hos", "approved_hod", "pending_finance_review"].includes(s.status);
      if (isMancoMember && s.formType === 'leave') return ["pending", "approved_hos", "approved_manco", "on_leave"].includes(s.status);
      return false;
    }
    if (activeTab === "history") return ["approved", "rejected", "paid", "completed"].includes(s.status);
    return true;
  });

  const stats = {
    total: filtered.length,
    actionRequired: filtered.filter(s => (isHOS && s.status === "pending") || (isHOD && s.status === "approved_hos") || (isMancoMember && s.formType === 'leave' && s.status === "approved_hod") || (isHOP && s.formType === 'claim' && s.status === "approved_hod") || (isHOF && s.formType === 'claim' && s.status === "approved_hop")).length,
    inProgress: filtered.filter(s =>
      (isHOS && ["approved_hod", "approved_hop", "approved_hof"].includes(s.status)) ||
      (isHOD && s.status === "pending") ||
      (isHOP && s.formType === 'claim' && ["pending", "approved_hos"].includes(s.status)) ||
      (isHOF && ["pending", "approved_hos", "approved_hod", "approved_hop"].includes(s.status)) ||
      (isMancoMember && s.formType === 'leave' && ["pending", "approved_hos", "approved_manco", "on_leave"].includes(s.status))).length,
    resolved: filtered.filter(s => s.status === "approved" || s.status === "rejected").length,
  };

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
        <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Pass Type</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{passType}</div>
        </div>
        <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Location</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{location || "—"}</div>
        </div>
        <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Purpose</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{purpose || "—"}</div>
        </div>
        {sub.data.estimatedTime && (
          <div className="py-2 sm:py-4 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
            <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Estimated Time</span>
            <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
              Out: {sub.data.estimatedTime.timeOut || "—"} &nbsp;|&nbsp; In: {sub.data.estimatedTime.timeIn || "—"}
            </div>
          </div>
        )}
        <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Head of Section</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
            {sub.data.hosName || sub.data.hos || "—"}
          </div>
        </div>
        <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Head of Department</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
            {sub.data.hodName || sub.data.hod || "—"}
          </div>
        </div>
        <div className="py-2 sm:py-4 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Manco Member</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
            {sub.data.mancoMemberName || "—"}
          </div>
        </div>
      </>
    );
  };

  const renderCarRentalDetailsForApprover = (sub: Submission) => {
    return (
      <>
        <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Destination</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{sub.data.destination || "—"}</div>
        </div>
        <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Purpose</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{sub.data.purpose || "—"}</div>
        </div>
        <div className="py-2 sm:py-4 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Journey Dates</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
            {sub.data.fromDate ? new Date(sub.data.fromDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} - {sub.data.toDate ? new Date(sub.data.toDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
          </div>
        </div>
        {sub.data.licenseAttachment && (
          <div className="py-2 sm:py-4 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
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
    const success = await updateSubmissionStatus(id, status, { remarks: remarks.trim(), rejectedStage: status === "rejected" ? rejectedStage : undefined });
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
      <div className="p-6 lg:p-8 max-w-5xl mx-auto print:absolute print:inset-0 print:max-w-none print:w-full print:bg-white print:text-black print:z-50 print:p-8 print:m-0 animate-in fade-in-5">
        <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group print:hidden">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to list
        </button>

        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">EMPLOYEE SUMMARY / MAKLUMAT PEKERJA</p>
        <div className="mb-6 rounded-xl border border-border/60 bg-white p-5 shadow-sm dark:bg-card">
          <p className="text-lg font-bold text-foreground">{selectedSubmission.employeeName}</p>
          <p className="text-sm text-muted-foreground mb-1">
            Staff ID: {employeeStaffId}
          </p>
          <p className="text-sm text-muted-foreground mb-1">Department: {selectedSubmission.department}</p>
          <p className="text-sm text-muted-foreground mb-3">
            Position: {employeePosition}
          </p>
        </div>

        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">SUBMISSION SUMMARY / RINGKASAN PERMOHONAN</p>
        <div className="mb-6 rounded-xl border border-border/60 bg-white p-5 shadow-sm dark:bg-card">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Ref No / No. Rujukan</p>
              <p className="text-sm font-bold text-foreground">{generateRefNo(selectedSubmission)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Form Type / Jenis Borang</p>
              <Badge className="bg-amber-100 text-amber-800 border-0 text-xs font-bold mt-1 uppercase">
                {formTypeLabels[selectedSubmission.formType] || selectedSubmission.formType.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          {selectedSubmission.formType === 'car_rental' ? (
            renderCarRentalDetailsForApprover(selectedSubmission)
          ) : selectedSubmission.formType === 'leave' ? (
            renderLeaveDetailsForApprover(selectedSubmission)
          ) : null}

          {selectedSubmission.formType === 'claim' && (
            <>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">Claim Details / Butiran Tuntutan</p>
                <div className="text-sm font-bold text-foreground mt-1">
                  {renderValue(selectedSubmission.data.claimRows)}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 text-right">
                <p className="text-xs text-muted-foreground uppercase font-bold">Total Amount</p>
                <p className="text-xl font-bold text-primary">RM {selectedSubmission.data.totalAmount || "0.00"}</p>
              </div>
            </>
          )}
          {selectedSubmission.formType === 'cctv_access_request' && (
            <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
              <div><p className="text-xs text-muted-foreground">Type of Request</p><div className="mt-1 text-sm font-bold text-foreground">{renderValue(selectedSubmission.data.requestTypes)}</div></div>
              <div><p className="text-xs text-muted-foreground">Camera Location</p><p className="mt-1 text-sm font-bold text-foreground">{selectedSubmission.data.cameraLocation || "—"}</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">From</p><p className="mt-1 text-sm font-bold text-foreground">{selectedSubmission.data.fromDateTime ? new Date(selectedSubmission.data.fromDateTime).toLocaleString() : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">To</p><p className="mt-1 text-sm font-bold text-foreground">{selectedSubmission.data.toDateTime ? new Date(selectedSubmission.data.toDateTime).toLocaleString() : "—"}</p></div>
              </div>
              <div><p className="text-xs text-muted-foreground">Purpose of Access</p><p className="mt-1 text-sm font-bold text-foreground">{selectedSubmission.data.purpose || "—"}</p></div>
            </div>
          )}
          {selectedSubmission.formType === 'it_application_request' && <ITApplicationRequestDetails submission={selectedSubmission} showEmployeeDetails={false} />}
          {['it_admin_request', 'it_facilities_requisition'].includes(selectedSubmission.formType) && <ITAdminRequestDetails submission={selectedSubmission} showEmployeeDetails={false} />}
        </div>

        {selectedSubmission.data.passengers && selectedSubmission.data.passengers.some((p: any) => p.name) && (
          <div className="mb-6 rounded-xl border border-border/60 bg-white p-5 shadow-sm dark:bg-card">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">PASSENGERS / PENUMPANG</p>
            <div className="space-y-2">
              {selectedSubmission.data.passengers.filter((p: any) => p.name).map((p: any, i: number) => (
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
          <div className="space-y-3 mb-6">
            {selectedSubmission.data.attachments.map((url: string, idx: number) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block border border-dashed border-border rounded-xl bg-white p-4 shadow-sm dark:bg-card flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-primary">View Attachment {idx + 1} / Lihat Lampiran {idx + 1}</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        ) : selectedSubmission.data.attachment && (
          <a href={selectedSubmission.data.attachment} target="_blank" rel="noopener noreferrer" className="block border border-dashed border-border rounded-xl bg-white p-4 shadow-sm dark:bg-card flex items-center justify-between mb-6 cursor-pointer hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-primary">View Attachment / Lihat Lampiran</span>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        )}

        {selectedSubmission.data.remarks && (
          <div className={`p-4 rounded-xl border mb-6 ${selectedSubmission.status === 'rejected' ? 'bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Previous Remarks / Ulasan Terdahulu</p>
            <p className="text-sm font-medium">"{selectedSubmission.data.remarks}"</p>
          </div>
        )}

        {(() => {
          const canApprove = (isHOS && selectedSubmission.status === "pending") || 
                             (isHOD && selectedSubmission.status === "approved_hos") ||
                             (isMancoMember && selectedSubmission.formType === 'leave' && selectedSubmission.status === "approved_hod") ||
                             (isHOP && selectedSubmission.formType === 'claim' && selectedSubmission.status === "approved_hod") ||
                             (isHOF && selectedSubmission.status === "approved_hop");
          if (!canApprove) {
            const alreadyApproved = (isHOS && ["approved_hos", "approved_hod", "approved_manco", "pending_finance_review", "approved_hop", "approved_hof", "approved", "on_leave"].includes(selectedSubmission.status)) ||
                                   (isHOD && ["approved_hod", "approved_manco", "pending_finance_review", "approved_hop", "approved_hof", "approved", "on_leave"].includes(selectedSubmission.status)) ||
                                   (isMancoMember && selectedSubmission.formType === 'leave' && ["approved_manco", "on_leave", "approved"].includes(selectedSubmission.status)) ||
                                   (isHOP && ["pending_finance_review", "approved_hop", "approved_hof", "approved"].includes(selectedSubmission.status)) ||
                                    (isHOF && ["approved_hof", "approved"].includes(selectedSubmission.status));

            if (selectedSubmission.status === "rejected") {
              return (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-center flex items-center justify-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm text-destructive dark:text-red-400 font-medium">
                    This submission was rejected by {
                      selectedSubmission.data.rejectedStage === 'finance_review' ? 'the Finance Admin' : `the ${selectedSubmission.data.rejectedStage?.toUpperCase()}`
                    }.
                  </p>
                </div>
              );
            }

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
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">REMARKS / ULASAN</p>
              <Input
                placeholder="Please enter remarks if any / Sila masukkan ulasan jika ada..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="mb-6 h-12 bg-muted/20"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => handleAction(selectedSubmission.id, "rejected")}
                  disabled={isProcessingAction}
                  className="w-1/3 px-6 py-4 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isProcessingAction ? "SAVING..." : "REJECT / TOLAK"}
                </button>
                <button
                  onClick={() => {
                    let nextStatus: SubmissionStatus = "approved";
                    if (isHOS && selectedSubmission.status === "pending") {
                      nextStatus = selectedSubmission.data.hodName === "N/A" ? "approved_hod" : "approved_hos";
                    } else if (isHOD && selectedSubmission.status === "approved_hos") {
                      nextStatus = "approved_hod";
                    } else if (isMancoMember && selectedSubmission.formType === 'leave' && selectedSubmission.status === "approved_hod") {
                      nextStatus = "approved_manco";
                    } else if (isHOP && selectedSubmission.status === "approved_hod") {
                      nextStatus = "pending_finance_review";
                    } else if (isHOF && selectedSubmission.status === "approved_hop") {
                      nextStatus = "approved_hof";
                    }
                    handleAction(selectedSubmission.id, nextStatus);
                  }}
                  disabled={isProcessingAction}
                  className="w-2/3 px-6 py-4 rounded-xl bg-emerald-500 text-white font-bold text-center hover:bg-emerald-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isProcessingAction ? "SAVING..." : "APPROVE / LULUS"}
                </button>
              </div>
            </>
          );
        })()}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 slide-in-from-bottom-2 duration-500">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Pending Approvals / Kelulusan Tertangguh</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <DashboardStatCard label="Total Assigned" value={stats.total} icon={FileText} tone="blue" />
        <DashboardStatCard label="Action Required" value={stats.actionRequired} icon={AlertCircle} tone="amber" />
        <DashboardStatCard label="In Progress" value={stats.inProgress} icon={Clock} tone="indigo" />
        <DashboardStatCard label="Resolved" value={stats.resolved} icon={CheckCircle} tone="emerald" />
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
          <h2 className="text-lg font-bold text-foreground">Submissions / Penyerahan</h2>
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
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Employee / Pekerja</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Date / Tarikh</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Type / Jenis</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
            {(isViewAll ? tabFiltered : tabFiltered.slice(0, 10)).map((sub) => {
              const avatarUrl = (sub as any).avatar || sub.data?.employeeInfo?.avatar || sub.data?.avatar;
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
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-sm text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString("en-CA")}</span>
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
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Showing {Math.min(tabFiltered.length, isViewAll ? tabFiltered.length : 10)} of {tabFiltered.length} entries</p>
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

export default ApproverDashboard;
