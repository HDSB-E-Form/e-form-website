import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Clock, Cctv, Headphones, Printer, Search, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ApprovalDashboardSkeleton from "@/components/ApprovalDashboardSkeleton";
import { useSubmissions, type Submission } from "@/contexts/SubmissionsContext";
import { useUsers } from "@/contexts/UsersContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

type Tab = "action_required" | "in_progress" | "history";

const requestStatus = (status: string, formType?: string) => {
  if (status === "pending" && formType === "it_help_desk") return { label: "ACTION REQUIRED", className: "bg-violet-500/15 text-violet-700 dark:text-violet-400" };
  if (status === "reopened") return { label: "REOPENED", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  if (status === "awaiting_confirmation") return { label: "AWAITING EMPLOYEE", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" };
  if (status === "pending") return { label: "PENDING HOS", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  if (status === "approved_hos") return { label: "PENDING HOD", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" };
  if (status === "approved_hod") return { label: "PENDING IT ADMIN", className: "bg-violet-500/15 text-violet-700 dark:text-violet-400" };
  if (["approved", "completed"].includes(status)) return { label: formType === "it_help_desk" ? "RESOLVED" : "APPROVED", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
  return { label: "REJECTED", className: "bg-destructive/15 text-destructive dark:text-red-400" };
};

type ITDashboardMode = "cctv" | "helpdesk";

const ITAdminDashboard = ({ mode = "cctv" }: { mode?: ITDashboardMode }) => {
  const { submissions, updateSubmissionStatus, refreshSubmissions, isLoading } = useSubmissions();
  const { users } = useUsers();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("action_required");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { refreshSubmissions(); }, [refreshSubmissions]);

  const targetFormType = mode === "helpdesk" ? "it_help_desk" : "cctv_access_request";
  const itRequests = useMemo(() => submissions.filter(item => item.formType === targetFormType), [submissions, targetFormType]);
  const isActionRequired = (item: Submission) =>
    (item.formType === "cctv_access_request" && item.status === "approved_hod") ||
    (item.formType === "it_help_desk" && ["pending", "reopened"].includes(item.status));
  const tabRequests = itRequests.filter(item => {
    if (activeTab === "action_required") return isActionRequired(item);
    if (activeTab === "in_progress") return (item.formType === "cctv_access_request" && ["pending", "approved_hos"].includes(item.status)) || (item.formType === "it_help_desk" && item.status === "awaiting_confirmation");
    return ["approved", "rejected", "completed"].includes(item.status);
  });
  const visibleRequests = tabRequests.filter(item => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return item.employeeName.toLowerCase().includes(query) || item.department.toLowerCase().includes(query) || item.data.cameraLocation?.toLowerCase().includes(query) || item.data.issueType?.toLowerCase().includes(query) || item.data.refNo?.toLowerCase().includes(query);
  });

  const handleAction = async (status: "approved" | "rejected" | "awaiting_confirmation") => {
    if (!selectedSubmission) return;
    const isHelpDeskTicket = selectedSubmission.formType === "it_help_desk";
    if (!isHelpDeskTicket && selectedSubmission.submittedBy === user?.id) return toast.error("You cannot review your own CCTV access request.");
    if (status === "rejected" && !remarks.trim()) return toast.error("Enter a reason before rejecting this request.");
    if (status === "awaiting_confirmation" && !remarks.trim()) return toast.error("Enter a resolution summary before resolving this ticket.");
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
      toast.success(status === "awaiting_confirmation" ? "Resolution sent to the employee for confirmation." : status === "approved" ? "CCTV access request approved." : "Request rejected.");
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
        title={mode === "helpdesk" ? "Loading Help Desk tickets…" : "Loading CCTV requests…"}
        description={mode === "helpdesk" ? "Retrieving the latest Help Desk tickets assigned to IT." : "Retrieving the latest CCTV access requests assigned to IT."}
        statsCount={4}
      />
    );
  }

  if (selectedSubmission) {
    const isHelpDeskTicket = selectedSubmission.formType === "it_help_desk";
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
            <div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15">{isHelpDeskTicket ? <Headphones className="h-6 w-6 text-violet-600 dark:text-violet-400" /> : <Cctv className="h-6 w-6 text-violet-600 dark:text-violet-400" />}</div><div><h1 className="text-xl font-bold text-foreground">{isHelpDeskTicket ? "IT Help Desk Ticket" : "CCTV Access Request"}</h1><p className="text-sm text-muted-foreground">{selectedSubmission.data.refNo || `HDSB-${selectedSubmission.id.slice(-4)}`}</p></div></div>
            <Badge className={`w-fit border-0 ${requestStatus(selectedSubmission.status, selectedSubmission.formType).className}`}>{requestStatus(selectedSubmission.status, selectedSubmission.formType).label}</Badge>
          </div>

          <div className="py-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Employee Summary</p>
            <div className="rounded-xl border border-border/50 bg-muted/30 p-5">
              <p className="text-lg font-bold text-foreground">{selectedSubmission.employeeName}</p>
              <p className="mt-1 text-sm text-muted-foreground">Staff ID: {employeeStaffId}</p>
              <p className="mt-1 text-sm text-muted-foreground">Department: {selectedSubmission.department || "—"}</p>
              <p className="mt-1 text-sm text-muted-foreground">Position: {employeePosition}</p>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">Request Details</p>
            {isHelpDeskTicket ? <div>
            <Detail label="Urgency" value={selectedSubmission.data.urgency} />
            <Detail label="Report For" value={selectedSubmission.data.reportFor} />
            <Detail label="Type of Issue / Request" value={selectedSubmission.data.issueType} />
            <Detail label="Issue Explained / Request" value={selectedSubmission.data.issueExplanation} />
            <Detail label="Contact Email" value={selectedSubmission.data.contactEmail} />
            <Detail label="Superior Email" value={selectedSubmission.data.superiorEmail} />
            </div> : <div>
            <Detail label="Camera Location" value={selectedSubmission.data.cameraLocation} />
            <Detail label="Purpose of Access" value={selectedSubmission.data.purpose} />
            <Detail label="From Date & Time" value={selectedSubmission.data.fromDateTime ? new Date(selectedSubmission.data.fromDateTime).toLocaleString() : "—"} />
            <Detail label="To Date & Time" value={selectedSubmission.data.toDateTime ? new Date(selectedSubmission.data.toDateTime).toLocaleString() : "—"} />
            <Detail label="Head of Section" value={selectedSubmission.data.hosName} />
            <Detail label="Head of Department" value={selectedSubmission.data.hodName} />
            </div>}
          </div>

          {!isHelpDeskTicket && <><div className="border-t border-border pt-5"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Type of Request</p><div className="flex flex-wrap gap-2">{(selectedSubmission.data.requestTypes || []).map((type: string) => <Badge key={type} className="border-0 bg-violet-500/15 text-violet-700 dark:text-violet-400">{type}</Badge>)}</div></div><div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><ShieldCheck className="h-4 w-4" /> Confidentiality declaration acknowledged</div></div></>}

          {isActionRequired(selectedSubmission) && <div className="mt-6 border-t border-border pt-5">{isOwnRequest && <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-800 dark:text-amber-300">This request was submitted by you. Another IT Admin must complete the final review.</div>}<label htmlFor="it-remarks" className="text-sm font-medium text-foreground">{isHelpDeskTicket ? "Resolution Summary" : "IT Admin Remarks"} <span className="font-normal text-muted-foreground">({isHelpDeskTicket ? "required" : "required when rejecting"})</span></label><textarea id="it-remarks" value={remarks} onChange={event => setRemarks(event.target.value)} rows={3} disabled={isOwnRequest} placeholder={isHelpDeskTicket ? "Explain the solution and action taken..." : "Enter review notes or rejection reason..."} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60" /><div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={isSubmitting || isOwnRequest} onClick={() => handleAction("rejected")} className="w-full rounded-xl border border-destructive px-6 py-3 text-sm font-bold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><XCircle className="mr-2 inline h-4 w-4" />Reject</button><button type="button" disabled={isSubmitting || isOwnRequest} onClick={() => handleAction(isHelpDeskTicket ? "awaiting_confirmation" : "approved")} className="btn-gold w-full rounded-xl px-8 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><CheckCircle className="mr-2 inline h-4 w-4" />{isSubmitting ? "Processing..." : isHelpDeskTicket ? "Send Resolution" : "Approve Request"}</button></div></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5">
      <div className="mb-6"><h1 className="text-2xl font-bold text-foreground">{mode === "helpdesk" ? "IT Help Desk Dashboard" : "CCTV Requests Dashboard"}</h1><p className="mt-1 text-sm text-muted-foreground">{mode === "helpdesk" ? "Receive, resolve, and track employee IT support tickets." : "Review CCTV access requests after HOS and HOD approval."}</p></div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={mode === "helpdesk" ? Headphones : Cctv} label={mode === "helpdesk" ? "Total Tickets" : "Total Requests"} value={itRequests.length} /><Stat icon={Clock} label="Action Required" value={itRequests.filter(isActionRequired).length} /><Stat icon={Clock} label="In Progress" value={itRequests.filter(item => (item.formType === "cctv_access_request" && ["pending", "approved_hos"].includes(item.status)) || item.status === "awaiting_confirmation").length} /><Stat icon={CheckCircle} label="Resolved" value={itRequests.filter(item => ["approved", "rejected", "completed"].includes(item.status)).length} /></div>
      <div className="card-elevated overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex max-w-full overflow-x-auto rounded-lg border border-border bg-muted/40 p-1"><button onClick={() => setActiveTab("action_required")} className={`whitespace-nowrap rounded-md px-4 py-2 text-xs font-bold ${activeTab === "action_required" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>Action Required</button><button onClick={() => setActiveTab("in_progress")} className={`whitespace-nowrap rounded-md px-4 py-2 text-xs font-bold ${activeTab === "in_progress" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>In Progress</button><button onClick={() => setActiveTab("history")} className={`whitespace-nowrap rounded-md px-4 py-2 text-xs font-bold ${activeTab === "history" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>History</button></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search requests..." className="pl-9" /></div></div>
        {isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Loading IT requests...</p> : visibleRequests.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No IT requests found.</p> : <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Reference</TableHead><TableHead>Employee</TableHead><TableHead>Request Type</TableHead><TableHead>Date Submitted</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Action</TableHead></TableRow></TableHeader><TableBody>{visibleRequests.map(item => { const status = requestStatus(item.status, item.formType); return <TableRow key={item.id}><TableCell className="font-semibold text-primary whitespace-nowrap">{item.data.refNo || `HDSB-${item.id.slice(-4)}`}</TableCell><TableCell><p className="font-medium text-foreground">{item.employeeName}</p><p className="text-xs text-muted-foreground">{item.department}</p></TableCell><TableCell>{item.formType === "it_help_desk" ? item.data.issueType || "IT Help Desk" : item.data.cameraLocation || "CCTV Access"}</TableCell><TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Date(item.submittedAt).toLocaleDateString()}</TableCell><TableCell><Badge className={`whitespace-nowrap border-0 ${status.className}`}>{status.label}</Badge></TableCell><TableCell className="text-center"><button onClick={() => setSelectedSubmission(item)} className="rounded-lg bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20">{isActionRequired(item) ? "Review" : "View"}</button></TableCell></TableRow>; })}</TableBody></Table>}
      </div>
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value?: string }) => <div className="grid grid-cols-1 items-start gap-1 border-b border-border/60 py-3 last:border-0 sm:grid-cols-3 sm:gap-4"><p className="text-xs font-bold uppercase tracking-wider text-primary sm:mt-0.5">{label}</p><p className="text-sm font-medium text-foreground sm:col-span-2">{value || "—"}</p></div>;
const Stat = ({ icon: Icon, label, value }: { icon: typeof Cctv; label: string; value: number }) => <div className="card-elevated flex items-center gap-4 p-5"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15"><Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" /></div><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p><p className="text-2xl font-bold text-foreground">{value}</p></div></div>;

export default ITAdminDashboard;
