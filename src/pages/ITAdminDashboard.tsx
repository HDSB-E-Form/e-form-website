import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Clock, Cctv, Headphones, MonitorCog, Printer, Search, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ApprovalDashboardSkeleton from "@/components/ApprovalDashboardSkeleton";
import ApprovalOverview from "@/components/ApprovalOverview";
import EmployeeSummary from "@/components/EmployeeSummary";
import VoidSubmissionControl from "@/components/VoidSubmissionControl";
import ITAdminRequestDetails from "@/components/ITAdminRequestDetails";
import { useSubmissions, type Submission } from "@/contexts/SubmissionsContext";
import { useUsers } from "@/contexts/UsersContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

type Tab = "action_required" | "in_progress" | "history";
const facilitiesFormTypes = ["it_admin_request", "it_application_request", "it_facilities_requisition"];

const requestStatus = (status: string, formType?: string) => {
  if (status === "pending" && formType === "it_help_desk") return { label: "ACTION REQUIRED", className: "bg-violet-500/15 text-violet-700 dark:text-violet-400" };
  if (status === "reopened") return { label: "REOPENED", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  if (status === "awaiting_confirmation") return { label: "AWAITING EMPLOYEE", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" };
  if (status === "pending") return { label: "PENDING HOS", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  if (status === "approved_hos") return { label: "PENDING HOD", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" };
  if (status === "approved_hod") return { label: "PENDING IT ADMIN", className: "bg-violet-500/15 text-violet-700 dark:text-violet-400" };
  if (status === "voided") return { label: "VOIDED", className: "bg-slate-500/15 text-slate-700 dark:text-slate-300" };
  if (["approved", "completed"].includes(status)) return { label: formType === "it_help_desk" ? "RESOLVED" : "APPROVED", className: "bg-[#57D51B] text-white hover:bg-[#57D51B]" };
  return { label: "REJECTED", className: "bg-destructive text-destructive-foreground hover:bg-destructive" };
};

type ITDashboardMode = "cctv" | "helpdesk" | "facilities";

const ITAdminDashboard = ({ mode = "cctv" }: { mode?: ITDashboardMode }) => {
  const { submissions, updateSubmissionStatus, refreshSubmissions, isLoading } = useSubmissions();
  const { users } = useUsers();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("action_required");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [isViewAll, setIsViewAll] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { refreshSubmissions(); }, [refreshSubmissions]);
  useEffect(() => {
    setSelectedSubmission(null);
    setRemarks("");
    setIsSubmitting(false);
  }, [mode]);

  const targetFormType = mode === "helpdesk" ? "it_help_desk" : "cctv_access_request";
  const itRequests = useMemo(() => submissions.filter(item => mode === "facilities" ? facilitiesFormTypes.includes(item.formType) : item.formType === targetFormType), [submissions, targetFormType, mode]);
  const isActionRequired = (item: Submission) =>
    (item.formType === "cctv_access_request" && item.status === "approved_hod") ||
    (facilitiesFormTypes.includes(item.formType) && ["approved_hod", "reopened"].includes(item.status)) ||
    (item.formType === "it_help_desk" && ["pending", "reopened"].includes(item.status));
  const tabRequests = itRequests.filter(item => {
    if (activeTab === "action_required") return isActionRequired(item);
    if (activeTab === "in_progress") return ((item.formType === "cctv_access_request" || facilitiesFormTypes.includes(item.formType)) && ["pending", "approved_hos"].includes(item.status)) || ((item.formType === "it_help_desk" || facilitiesFormTypes.includes(item.formType)) && item.status === "awaiting_confirmation");
    return ["approved", "rejected", "completed", "voided"].includes(item.status);
  });
  const visibleRequests = tabRequests.filter(item => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return item.employeeName.toLowerCase().includes(query) || item.department.toLowerCase().includes(query) || item.data.cameraLocation?.toLowerCase().includes(query) || item.data.issueType?.toLowerCase().includes(query) || item.data.facilities?.some((facility: string) => facility.toLowerCase().includes(query)) || item.data.refNo?.toLowerCase().includes(query);
  });
  const displayedRequests = isViewAll ? visibleRequests : visibleRequests.slice(0, 10);
  const stats = {
    actionRequired: itRequests.filter(isActionRequired).length,
    inProgress: itRequests.filter(item => ((item.formType === "cctv_access_request" || facilitiesFormTypes.includes(item.formType)) && ["pending", "approved_hos"].includes(item.status)) || item.status === "awaiting_confirmation").length,
    resolved: itRequests.filter(item => ["approved", "rejected", "completed", "voided"].includes(item.status)).length,
    total: itRequests.length,
  };

  const handleAction = async (status: "approved" | "rejected" | "awaiting_confirmation") => {
    if (!selectedSubmission) return;
    const isHelpDeskTicket = selectedSubmission.formType === "it_help_desk";
    const requiresEmployeeConfirmation = selectedSubmission.formType === "it_help_desk" || facilitiesFormTypes.includes(selectedSubmission.formType);
    if (!isHelpDeskTicket && selectedSubmission.submittedBy === user?.id) return toast.error("You cannot review your own IT request.");
    if (status === "rejected" && !remarks.trim()) return toast.error("Enter a reason before rejecting this request.");
    if (status === "awaiting_confirmation" && !remarks.trim()) return toast.error("Enter a response or completion remark before sending this request to the employee.");
    setIsSubmitting(true);
    const success = await updateSubmissionStatus(selectedSubmission.id, status, {
      remarks: remarks.trim(),
      itAdminRemarks: remarks.trim(),
      itAdminReviewedAt: new Date().toISOString(),
      itAdminReviewedBy: user?.name || "IT Admin",
      itAdminReviewedById: user?.id || "",
      reviewedAs: "it_admin",
      rejectedStage: status === "rejected" ? "it_admin" : undefined,
      resolutionSummary: status === "awaiting_confirmation" ? remarks.trim() : undefined,
      resolvedAt: status === "awaiting_confirmation" ? new Date().toISOString() : undefined,
      resolvedBy: status === "awaiting_confirmation" ? user?.name || "IT Admin" : undefined,
      resolvedById: status === "awaiting_confirmation" ? user?.id || "" : undefined,
    });
    setIsSubmitting(false);
    if (success) {
      toast.success(status === "awaiting_confirmation" ? "IT response sent to the employee for confirmation." : status === "approved" ? "IT request approved." : "Request rejected.");
      setSelectedSubmission(null);
      setRemarks("");
    }
  };

  const handlePrint = (submission: Submission) => {
    const originalTitle = document.title;
    const wasDark = document.documentElement.classList.contains("dark");
    document.title = submission.data.refNo || `HDSB-${submission.id.slice(-4)}`;
    if (wasDark) document.documentElement.classList.remove("dark");

    setTimeout(() => {
      window.onafterprint = () => {
        document.title = originalTitle;
        if (wasDark) document.documentElement.classList.add("dark");
        window.onafterprint = null;
      };
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
        if (wasDark) document.documentElement.classList.add("dark");
      }, 2000);
    }, 50);
  };

  if (isLoading) {
    return (
      <ApprovalDashboardSkeleton
        title={mode === "helpdesk" ? "Loading Help Desk tickets…" : mode === "facilities" ? "Loading facilities requests…" : "Loading CCTV requests…"}
        description={mode === "helpdesk" ? "Retrieving the latest Help Desk tickets assigned to IT." : mode === "facilities" ? "Retrieving the latest IT facilities requisitions assigned to IT." : "Retrieving the latest CCTV access requests assigned to IT."}
        statsCount={4}
      />
    );
  }

  if (selectedSubmission) {
    const isHelpDeskTicket = selectedSubmission.formType === "it_help_desk";
    const isFacilitiesRequest = facilitiesFormTypes.includes(selectedSubmission.formType);
    const requiresEmployeeConfirmation = isHelpDeskTicket || isFacilitiesRequest;
    const submittingUser = users.find(candidate => candidate.id === selectedSubmission.submittedBy);
    const employeeStaffId = selectedSubmission.data.staffId || selectedSubmission.data.employeeInfo?.staffNo || selectedSubmission.data.employeeInfo?.employeeNumber || submittingUser?.staffId || "—";
    const employeePosition = selectedSubmission.data.position || selectedSubmission.data.employeeInfo?.position || submittingUser?.position || "—";
    const isOwnRequest = !isHelpDeskTicket && selectedSubmission.submittedBy === user?.id;
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-in fade-in-5 print:absolute print:inset-0 print:z-50 print:m-0 print:w-full print:max-w-none print:bg-white print:p-8 print:text-black">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-lg group sm:justify-start"><ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Requests</button>
          {selectedSubmission.status !== "approved_hod" && <button type="button" onClick={() => handlePrint(selectedSubmission)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-muted px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"><Printer className="h-4 w-4" /> Print Request</button>}
        </div>
        <div className="hidden print:flex items-start justify-between mb-8 border-b-2 border-black pb-6">
          <div className="flex items-center">
            <img src={logo} alt="HICOM Diecasting" className="h-14 w-auto object-contain mr-6" />
            <div className="text-left">
              <h1 className="text-2xl font-bold uppercase tracking-widest text-black">HICOM Diecastings Sdn Bhd</h1>
              <p className="text-sm text-gray-600 mt-1 uppercase tracking-wide">Official Form Submission Document</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Printed On:</p>
            <p className="text-xs font-semibold text-black">{new Date().toLocaleString('en-GB')}</p>
          </div>
        </div>

        <div className="card-elevated p-5 sm:p-6 print:border-none print:shadow-none print:p-0">
          <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15">{isHelpDeskTicket ? <Headphones className="h-6 w-6 text-violet-600 dark:text-violet-400" /> : isFacilitiesRequest ? <MonitorCog className="h-6 w-6 text-violet-600 dark:text-violet-400" /> : <Cctv className="h-6 w-6 text-violet-600 dark:text-violet-400" />}</div><div><h1 className="text-xl font-bold text-foreground">{isHelpDeskTicket ? "IT Help Desk Ticket" : selectedSubmission.formType === "it_admin_request" ? "IT Request Form (Admin)" : selectedSubmission.formType === "it_application_request" ? "IT Request Form (Application)" : isFacilitiesRequest ? "IT Facilities Requisition Form" : "CCTV Access Request"}</h1><p className="text-sm text-muted-foreground">{selectedSubmission.data.refNo || `HDSB-${selectedSubmission.id.slice(-4)}`}</p></div></div>
            <Badge className={`w-fit border-0 ${requestStatus(selectedSubmission.status, selectedSubmission.formType).className}`}>{requestStatus(selectedSubmission.status, selectedSubmission.formType).label}</Badge>
          </div>

          <EmployeeSummary
            name={selectedSubmission.employeeName}
            staffId={employeeStaffId}
            department={selectedSubmission.department || "—"}
            position={employeePosition}
            className="py-6"
          />

          <div className="border-t border-border pt-5">
            {selectedSubmission.formType === "it_admin_request" ? (
              <ITAdminRequestDetails submission={selectedSubmission} showEmployeeDetails={false} />
            ) : <>
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">Request Details</p>
            {isHelpDeskTicket ? <div>
            <Detail label="Urgency" value={selectedSubmission.data.urgency} />
            <Detail label="Report For" value={selectedSubmission.data.reportFor} />
            <Detail label="Type of Issue / Request" value={selectedSubmission.data.issueType} />
            <Detail label="Issue Explained / Request" value={selectedSubmission.data.issueExplanation} />
            <Detail label="Contact Email" value={selectedSubmission.data.contactEmail} />
            <Detail label="Superior Email" value={selectedSubmission.data.superiorEmail} />
            </div> : isFacilitiesRequest ? <div>
            <Detail label="Facilities Required" value={(selectedSubmission.data.facilities || []).join(", ")} />
            <Detail label="SharePoint Folder" value={selectedSubmission.data.sharePointFolder} />
            <Detail label="Others" value={selectedSubmission.data.others} />
            <Detail label="Head of Section" value={selectedSubmission.data.hosName} />
            <Detail label="Head of Department" value={selectedSubmission.data.hodName} />
            {(selectedSubmission.data.erpAuthorizationRights || []).length > 0 && <AuthorizationReview rights={selectedSubmission.data.erpAuthorizationRights} />}
            </div> : <div>
            <Detail label="Camera Location" value={selectedSubmission.data.cameraLocation} />
            <Detail label="Purpose of Access" value={selectedSubmission.data.purpose} />
            <Detail label="From Date & Time" value={selectedSubmission.data.fromDateTime ? new Date(selectedSubmission.data.fromDateTime).toLocaleString() : "—"} />
            <Detail label="To Date & Time" value={selectedSubmission.data.toDateTime ? new Date(selectedSubmission.data.toDateTime).toLocaleString() : "—"} />
            <Detail label="Head of Section" value={selectedSubmission.data.hosName} />
            <Detail label="Head of Department" value={selectedSubmission.data.hodName} />
            </div>}
            </>}
          </div>

          {!isHelpDeskTicket && !isFacilitiesRequest && <><div className="border-t border-border pt-5"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Type of Request</p><div className="flex flex-wrap gap-2">{(selectedSubmission.data.requestTypes || []).map((type: string) => <Badge key={type} className="border-0 bg-violet-500/15 text-violet-700 dark:text-violet-400">{type}</Badge>)}</div></div><div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><ShieldCheck className="h-4 w-4" /> Confidentiality declaration acknowledged</div></div></>}

          {isHelpDeskTicket && selectedSubmission.data.resolvedAt && <div className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Resolution Details</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Resolved Date & Time</p><p className="mt-1 text-sm font-bold text-foreground">{new Date(selectedSubmission.data.resolvedAt).toLocaleString("en-GB")}</p></div><div><p className="text-xs text-muted-foreground">Resolved By</p><p className="mt-1 text-sm font-bold text-foreground">{selectedSubmission.data.resolvedBy || "IT Admin"}</p></div></div>{selectedSubmission.data.resolutionSummary && <div className="mt-4 border-t border-emerald-500/20 pt-4"><p className="text-xs text-muted-foreground">Resolution / Remarks</p><p className="mt-1 whitespace-pre-wrap text-sm font-medium text-foreground">{selectedSubmission.data.resolutionSummary}</p></div>}</div>}

          {isActionRequired(selectedSubmission) && <div className="mt-6 border-t border-border pt-5">{isOwnRequest && <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-800 dark:text-amber-300">This request was submitted by you. Another IT Admin must complete the final review.</div>}<label htmlFor="it-remarks" className="text-sm font-medium text-foreground">{requiresEmployeeConfirmation ? "IT Response / Remarks" : "IT Admin Remarks"} <span className="font-normal text-muted-foreground">({requiresEmployeeConfirmation ? "required" : "required when rejecting"})</span></label><textarea id="it-remarks" value={remarks} onChange={event => setRemarks(event.target.value)} rows={3} disabled={isOwnRequest} placeholder={requiresEmployeeConfirmation ? "Describe the action taken, update, or facilities provided..." : "Enter review notes or rejection reason..."} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60" /><div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={isSubmitting || isOwnRequest} onClick={() => handleAction("rejected")} className="w-full rounded-xl bg-destructive px-6 py-3 text-sm font-bold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><XCircle className="mr-2 inline h-4 w-4" />Reject</button><button type="button" disabled={isSubmitting || isOwnRequest} onClick={() => handleAction(requiresEmployeeConfirmation ? "awaiting_confirmation" : "approved")} className="w-full rounded-xl bg-[#57D51B] px-8 py-3 text-sm font-bold text-white hover:bg-[#49BD16] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><CheckCircle className="mr-2 inline h-4 w-4" />{isSubmitting ? "Processing..." : requiresEmployeeConfirmation ? "Send to Employee" : "Approve Request"}</button></div></div>}
          <VoidSubmissionControl submission={selectedSubmission} onVoided={() => setSelectedSubmission(null)} />
          {!isHelpDeskTicket && <ApprovalOverview submission={selectedSubmission} />}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl font-bold text-foreground">{mode === "helpdesk" ? "IT Help Desk Ticket Dashboard" : mode === "facilities" ? "IT Requests Dashboard" : "CCTV Requests Dashboard"}</h1><p className="mt-1 text-sm text-muted-foreground">{mode === "helpdesk" ? "Receive, resolve, and track employee IT support tickets." : mode === "facilities" ? "Review Admin and Application requests after HOS and HOD approval." : "Review CCTV access requests after HOS and HOD approval."}</p></div>
      <div className="animate-in slide-in-from-bottom-2 duration-700">
      <div className="card-elevated mb-4 border-border/60 bg-muted/40 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
        <p className="mb-3 text-sm font-bold text-foreground">Filter IT Requests</p>
        <div className="flex w-full items-center gap-1.5 overflow-x-auto rounded-xl p-1.5 pb-2 sm:w-fit sm:pb-1.5">
          {(["action_required", "in_progress", "history"] as Tab[]).map(tab => <button key={tab} onClick={() => { setActiveTab(tab); setIsViewAll(false); }} className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-[15px] font-bold transition-all sm:flex-none ${activeTab === tab ? "border-primary bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "border-border/60 bg-background text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground hover:shadow"}`}>{tab === "action_required" ? "Action Required" : tab === "in_progress" ? "In Progress" : "History"}{tab === "action_required" && stats.actionRequired > 0 && <Badge className="h-6 min-w-6 justify-center border-0 bg-red-500 px-1.5 text-xs text-white hover:bg-red-500">{stats.actionRequired}</Badge>}{tab === "in_progress" && stats.inProgress > 0 && <Badge className="h-6 min-w-6 justify-center border-0 bg-muted-foreground/20 px-1.5 text-xs text-muted-foreground hover:bg-muted-foreground/20">{stats.inProgress}</Badge>}</button>)}
        </div>
        <p className="mt-2 text-[11px] font-medium text-muted-foreground sm:hidden">Swipe sideways to see all filters →</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:shrink-0">{[["Action Required", stats.actionRequired], ["In Progress", stats.inProgress], ["Resolved", stats.resolved], [mode === "helpdesk" ? "Total Tickets" : "Total Requests", stats.total]].map(([label, value]) => <div key={String(label)} className="min-w-24 rounded-lg border border-border/60 border-l-4 border-l-primary bg-background px-3 py-2 shadow-sm"><p className="text-[10px] font-semibold leading-tight text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold leading-none text-foreground">{value}</p></div>)}</div>
        </div>
      </div>
      <div className="card-elevated overflow-hidden [&_th]:whitespace-nowrap [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wider [&_tbody_button]:min-h-11 [&_tbody_button]:min-w-[8rem] [&_tbody_button]:bg-primary [&_tbody_button]:px-5 [&_tbody_button]:py-2.5 [&_tbody_button]:text-[15px] [&_tbody_button]:text-primary-foreground [&_tbody_button]:shadow-sm [&_tbody_button:hover]:bg-primary/90">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-bold text-foreground">Recent Submissions</h2><div className="relative w-full sm:w-auto"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => { setSearch(event.target.value); setIsViewAll(false); }} placeholder="Search requests..." className="h-11 w-full pl-9 text-sm sm:w-80" /></div></div>
        {visibleRequests.length === 0 ? <div className="p-12 text-center"><Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" /><h3 className="text-lg font-semibold text-foreground">No requests found in this tab</h3><p className="mt-1 text-sm text-muted-foreground">IT requests assigned to this dashboard will appear here.</p></div> : <>
          <div className="hidden overflow-x-auto sm:block"><Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Reference</TableHead><TableHead>Employee</TableHead><TableHead>Request Type</TableHead><TableHead>Date Submitted</TableHead>{mode === "helpdesk" && <TableHead>Date Resolved</TableHead>}<TableHead>Status</TableHead><TableHead className="text-center">Action</TableHead></TableRow></TableHeader><TableBody>{displayedRequests.map(item => { const status = requestStatus(item.status, item.formType); const requestType = facilitiesFormTypes.includes(item.formType) ? (item.data.facilities || []).join(", ") || "IT Request" : item.formType === "it_help_desk" ? item.data.issueType || "IT Help Desk" : item.data.cameraLocation || "CCTV Access"; return <TableRow key={item.id} className="hover:bg-muted/20"><TableCell className="font-semibold text-primary whitespace-nowrap">{item.data.refNo || `HDSB-${item.id.slice(-4)}`}</TableCell><TableCell><p className="font-medium text-foreground">{item.employeeName}</p><p className="text-xs text-muted-foreground">{item.department}</p></TableCell><TableCell>{requestType}</TableCell><TableCell><CompactDateTime value={item.submittedAt} /></TableCell>{mode === "helpdesk" && <TableCell><CompactDateTime value={item.data.resolvedAt} /></TableCell>}<TableCell><Badge className={`whitespace-nowrap border-0 ${status.className}`}>{status.label}</Badge></TableCell><TableCell className="text-center"><button onClick={() => setSelectedSubmission(item)} className="rounded-lg bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20">{isActionRequired(item) ? "Review" : "View Details"}</button></TableCell></TableRow>; })}</TableBody></Table></div>
          <div className="divide-y divide-border/60 sm:hidden">{displayedRequests.map(item => { const status = requestStatus(item.status, item.formType); const requestType = facilitiesFormTypes.includes(item.formType) ? (item.data.facilities || []).join(", ") || "IT Request" : item.formType === "it_help_desk" ? item.data.issueType || "IT Help Desk" : item.data.cameraLocation || "CCTV Access"; return <button key={item.id} type="button" onClick={() => setSelectedSubmission(item)} className="block w-full p-4 text-left transition-colors hover:bg-muted/30"><div className="mb-2 flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{item.employeeName}</p><p className="truncate text-xs text-muted-foreground">{item.department}</p></div><Badge className={`shrink-0 whitespace-nowrap border-0 ${status.className}`}>{status.label}</Badge></div><p className="truncate text-xs font-medium text-foreground">{requestType}</p><div className="mt-3 flex items-end justify-between gap-3"><span className="text-xs text-muted-foreground">{item.data.refNo || `HDSB-${item.id.slice(-4)}`}</span><div className="flex gap-4 text-right"><div><p className="text-[10px] font-bold uppercase text-muted-foreground">Submitted</p><CompactDateTime value={item.submittedAt} /></div>{mode === "helpdesk" && <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Resolved</p><CompactDateTime value={item.data.resolvedAt} /></div>}</div></div><span className="mt-3 flex w-full items-center justify-center rounded-lg bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary">{isActionRequired(item) ? "Review" : "View Details"}</span></button>; })}</div>
          <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground sm:text-sm">Showing {displayedRequests.length} of {visibleRequests.length} entries</p>{visibleRequests.length > 10 && <button onClick={() => setIsViewAll(!isViewAll)} className="w-full rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:w-auto">{isViewAll ? "View Less" : "View More"}</button>}</div>
        </>}
      </div>
      </div>
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value?: string }) => <div className="grid grid-cols-1 items-start gap-1 border-b border-border/60 py-3 last:border-0 sm:grid-cols-3 sm:gap-4"><p className="text-xs font-bold uppercase tracking-wider text-primary sm:mt-0.5">{label}</p><p className="text-sm font-medium text-foreground sm:col-span-2">{value || "—"}</p></div>;
const CompactDateTime = ({ value }: { value?: string }) => value ? <div className="whitespace-nowrap text-sm text-muted-foreground"><p>{new Date(value).toLocaleDateString()}</p><p className="text-[11px] text-muted-foreground/80">{new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div> : <span className="text-sm text-muted-foreground">—</span>;
const AuthorizationReview = ({ rights }: { rights: Array<{ id: number; module: string; right: string }> }) => {
  const grouped = rights.reduce<Record<string, Array<{ id: number; right: string }>>>((modules, right) => { (modules[right.module] ||= []).push(right); return modules; }, {});
  return <div className="mt-5 border-t border-border pt-5"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-primary">ERP User Access Authorization</p><Badge className="border-0 bg-primary/10 text-primary">{rights.length} selected</Badge></div><div className="space-y-2">{Object.entries(grouped).map(([module, moduleRights]) => <details key={module} className="rounded-lg border border-border/70 bg-muted/10"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-foreground"><span>{module}</span><span className="text-xs text-primary">{moduleRights.length} rights</span></summary><div className="space-y-2 border-t border-border/60 p-4">{moduleRights.map(right => <p key={right.id} className="text-sm text-foreground"><span className="mr-2 text-xs font-semibold text-muted-foreground">#{right.id}</span>{right.right}</p>)}</div></details>)}</div></div>;
};
export default ITAdminDashboard;
