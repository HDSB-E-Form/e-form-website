import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Clock, Cctv, Printer, Search, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ApprovalDashboardSkeleton from "@/components/ApprovalDashboardSkeleton";
import { useSubmissions, type Submission } from "@/contexts/SubmissionsContext";
import { useUsers } from "@/contexts/UsersContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

type Tab = "action_required" | "history";

const ITAdminDashboard = () => {
  const { submissions, updateSubmissionStatus, refreshSubmissions, isLoading } = useSubmissions();
  const { users } = useUsers();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("action_required");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { refreshSubmissions(); }, [refreshSubmissions]);

  const cctvRequests = useMemo(() => submissions.filter(item => item.formType === "cctv_access_request"), [submissions]);
  const tabRequests = cctvRequests.filter(item => activeTab === "action_required" ? item.status === "approved_hod" : ["approved", "rejected"].includes(item.status));
  const visibleRequests = tabRequests.filter(item => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return item.employeeName.toLowerCase().includes(query) || item.department.toLowerCase().includes(query) || item.data.cameraLocation?.toLowerCase().includes(query) || item.data.refNo?.toLowerCase().includes(query);
  });

  const handleAction = async (status: "approved" | "rejected") => {
    if (!selectedSubmission) return;
    if (selectedSubmission.submittedBy === user?.id) return toast.error("You cannot review your own CCTV access request.");
    if (status === "rejected" && !remarks.trim()) return toast.error("Enter a reason before rejecting this request.");
    setIsSubmitting(true);
    const success = await updateSubmissionStatus(selectedSubmission.id, status, {
      remarks: remarks.trim(),
      itAdminRemarks: remarks.trim(),
      itAdminReviewedAt: new Date().toISOString(),
      itAdminReviewedBy: user?.name || "IT Admin",
      itAdminReviewedById: user?.id || "",
      reviewedAs: "it_admin",
      rejectedStage: status === "rejected" ? "it_admin" : undefined,
    });
    setIsSubmitting(false);
    if (success) {
      toast.success(status === "approved" ? "CCTV access request approved." : "CCTV access request rejected.");
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
        title="Loading CCTV requests…"
        description="Retrieving the latest CCTV access requests assigned to IT."
        statsCount={3}
      />
    );
  }

  if (selectedSubmission) {
    const submittingUser = users.find(candidate => candidate.id === selectedSubmission.submittedBy);
    const employeeStaffId = selectedSubmission.data.staffId || selectedSubmission.data.employeeInfo?.staffNo || selectedSubmission.data.employeeInfo?.employeeNumber || submittingUser?.staffId || "—";
    const employeePosition = selectedSubmission.data.position || selectedSubmission.data.employeeInfo?.position || submittingUser?.position || "—";
    const isOwnRequest = selectedSubmission.submittedBy === user?.id;
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
            <div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15"><Cctv className="h-6 w-6 text-violet-600 dark:text-violet-400" /></div><div><h1 className="text-xl font-bold text-foreground">CCTV Access Request</h1><p className="text-sm text-muted-foreground">{selectedSubmission.data.refNo || `HDSB-${selectedSubmission.id.slice(-4)}`}</p></div></div>
            <Badge className={`w-fit border-0 ${selectedSubmission.status === "approved" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : selectedSubmission.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-blue-500/15 text-blue-700 dark:text-blue-400"}`}>{selectedSubmission.status === "approved" ? "APPROVED" : selectedSubmission.status === "rejected" ? "REJECTED" : "HOD APPROVED"}</Badge>
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
            <div>
            <Detail label="Camera Location" value={selectedSubmission.data.cameraLocation} />
            <Detail label="Purpose of Access" value={selectedSubmission.data.purpose} />
            <Detail label="From Date & Time" value={selectedSubmission.data.fromDateTime ? new Date(selectedSubmission.data.fromDateTime).toLocaleString() : "—"} />
            <Detail label="To Date & Time" value={selectedSubmission.data.toDateTime ? new Date(selectedSubmission.data.toDateTime).toLocaleString() : "—"} />
            <Detail label="Head of Section" value={selectedSubmission.data.hosName} />
            <Detail label="Head of Department" value={selectedSubmission.data.hodName} />
            </div>
          </div>

          <div className="border-t border-border pt-5"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Type of Request</p><div className="flex flex-wrap gap-2">{(selectedSubmission.data.requestTypes || []).map((type: string) => <Badge key={type} className="border-0 bg-violet-500/15 text-violet-700 dark:text-violet-400">{type}</Badge>)}</div></div>
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><ShieldCheck className="h-4 w-4" /> Confidentiality declaration acknowledged</div></div>

          {selectedSubmission.status === "approved_hod" && <div className="mt-6 border-t border-border pt-5">{isOwnRequest && <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-800 dark:text-amber-300">This request was submitted by you. Another IT Admin must complete the final review.</div>}<label htmlFor="it-remarks" className="text-sm font-medium text-foreground">IT Admin Remarks <span className="font-normal text-muted-foreground">(required when rejecting)</span></label><textarea id="it-remarks" value={remarks} onChange={event => setRemarks(event.target.value)} rows={3} disabled={isOwnRequest} placeholder="Enter review notes or rejection reason..." className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60" /><div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={isSubmitting || isOwnRequest} onClick={() => handleAction("rejected")} className="w-full rounded-xl border border-destructive px-6 py-3 text-sm font-bold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><XCircle className="mr-2 inline h-4 w-4" />Reject</button><button type="button" disabled={isSubmitting || isOwnRequest} onClick={() => handleAction("approved")} className="btn-gold w-full rounded-xl px-8 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><CheckCircle className="mr-2 inline h-4 w-4" />{isSubmitting ? "Processing..." : "Approve Request"}</button></div></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5">
      <div className="mb-6"><h1 className="text-2xl font-bold text-foreground">IT Department Dashboard</h1><p className="mt-1 text-sm text-muted-foreground">Review CCTV access requests after HOS and HOD approval.</p></div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3"><Stat icon={Cctv} label="Total Requests" value={cctvRequests.length} /><Stat icon={Clock} label="Action Required" value={cctvRequests.filter(item => item.status === "approved_hod").length} /><Stat icon={CheckCircle} label="Resolved" value={cctvRequests.filter(item => ["approved", "rejected"].includes(item.status)).length} /></div>
      <div className="card-elevated overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex rounded-lg border border-border bg-muted/40 p-1"><button onClick={() => setActiveTab("action_required")} className={`rounded-md px-4 py-2 text-xs font-bold ${activeTab === "action_required" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>Action Required</button><button onClick={() => setActiveTab("history")} className={`rounded-md px-4 py-2 text-xs font-bold ${activeTab === "history" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>History</button></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search requests..." className="pl-9" /></div></div>
        {isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Loading CCTV requests...</p> : visibleRequests.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No CCTV requests found.</p> : <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Reference</TableHead><TableHead>Employee</TableHead><TableHead>Camera Location</TableHead><TableHead>Date Submitted</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Action</TableHead></TableRow></TableHeader><TableBody>{visibleRequests.map(item => <TableRow key={item.id}><TableCell className="font-semibold text-primary whitespace-nowrap">{item.data.refNo || `HDSB-${item.id.slice(-4)}`}</TableCell><TableCell><p className="font-medium text-foreground">{item.employeeName}</p><p className="text-xs text-muted-foreground">{item.department}</p></TableCell><TableCell>{item.data.cameraLocation || "—"}</TableCell><TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Date(item.submittedAt).toLocaleDateString()}</TableCell><TableCell>{item.status === "approved_hod" ? <Badge className="border-0 bg-amber-500/15 text-amber-700">PENDING IT</Badge> : item.status === "approved" ? <Badge className="border-0 bg-emerald-500/15 text-emerald-700">APPROVED</Badge> : <Badge className="border-0 bg-destructive/15 text-destructive">REJECTED</Badge>}</TableCell><TableCell className="text-center"><button onClick={() => setSelectedSubmission(item)} className="rounded-lg bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20">Review</button></TableCell></TableRow>)}</TableBody></Table>}
      </div>
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value?: string }) => <div className="grid grid-cols-1 items-start gap-1 border-b border-border/60 py-3 last:border-0 sm:grid-cols-3 sm:gap-4"><p className="text-xs font-bold uppercase tracking-wider text-primary sm:mt-0.5">{label}</p><p className="text-sm font-medium text-foreground sm:col-span-2">{value || "—"}</p></div>;
const Stat = ({ icon: Icon, label, value }: { icon: typeof Cctv; label: string; value: number }) => <div className="card-elevated flex items-center gap-4 p-5"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15"><Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" /></div><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p><p className="text-2xl font-bold text-foreground">{value}</p></div></div>;

export default ITAdminDashboard;
