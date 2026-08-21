import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import ApprovalDashboardSkeleton from "@/components/ApprovalDashboardSkeleton";
import ApprovalRemarksHistory from "@/components/ApprovalRemarksHistory";
import EmployeeSummary from "@/components/EmployeeSummary";
import VoidSubmissionControl from "@/components/VoidSubmissionControl";
import { appendApprovalRemark } from "@/lib/approvalRemarks";

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-[#57D51B] text-white hover:bg-[#57D51B] border-0 text-xs font-medium px-3 py-1">Approved</Badge>;
    case "rejected":
      return <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive border-0 text-xs font-medium px-3 py-1">Rejected</Badge>;
    case "voided":
      return <Badge className="border-0 bg-slate-500/15 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">Voided</Badge>;
    case "pending":
    default:
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-xs font-medium px-3 py-1">Pending</Badge>;
  }
};

const getInitials = (name?: string) =>
  (name || " ").split(" ").map(n => n ? n[0] : "").join("").toUpperCase().slice(0, 2);

const StoreApproverDashboard = () => {
  const { user } = useAuth();
  const { submissions, updateSubmissionStatus, isLoading } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  const seesAllSubmissions = user?.role === "super_admin" || user?.role === "store_admin";
  const myPicSubmissions = useMemo(() => {
    return submissions.filter(s => {
      if (s.formType !== "material_requisition_slip") return false;
      if (seesAllSubmissions) return true;
      const picName = (s.data?.storePicName || "").trim().toLowerCase();
      return picName && picName === (user?.name || "").trim().toLowerCase();
    });
  }, [submissions, seesAllSubmissions, user?.name]);

  const filtered = myPicSubmissions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.employeeName.toLowerCase().includes(q) ||
      (s.data?.itemDescription || "").toLowerCase().includes(q) ||
      (s.data?.lotNo || "").toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q);
  });

  const tabFiltered = filtered.filter(s => activeTab === "pending" ? s.status === "pending" : ["approved", "rejected", "voided"].includes(s.status));

  const stats = {
    pending: filtered.filter(s => s.status === "pending").length,
    approved: filtered.filter(s => s.status === "approved").length,
    rejected: filtered.filter(s => s.status === "rejected").length,
  };

  const generateRefNo = (sub: Submission) => sub.data?.refNo || `HDSB-${sub.id.slice(-4)}`;

  const handleExportCSV = () => {
    const start = exportStartDate || "0000-00-00";
    const end = exportEndDate ? `${exportEndDate}T23:59:59` : "9999-12-31T23:59:59";
    const dataToExport = myPicSubmissions.filter(s => {
      const submittedAt = new Date(s.submittedAt).toISOString();
      return submittedAt >= start && submittedAt <= end;
    });

    if (dataToExport.length === 0) {
      toast.error("No requisition slips found in the selected date range.");
      return;
    }

    dataToExport.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

    const formatDate = (iso: string) => {
      const d = new Date(iso);
      return ` ${d.toLocaleDateString("en-GB")}`;
    };

    const rows: string[][] = [
      ["Serial No", "Date Submitted", "Employee", "Department", "Item Description", "Quantity", "Lot No", "Superior", "HOD", "Store PIC", "Status"],
    ];

    dataToExport.forEach(sub => {
      rows.push([
        generateRefNo(sub),
        formatDate(sub.submittedAt),
        sub.employeeName,
        sub.department,
        `"${(sub.data?.itemDescription || "").replace(/"/g, '""')}"`,
        sub.data?.quantity || "",
        sub.data?.lotNo || "",
        sub.data?.superiorName || "",
        sub.data?.hodName || "",
        sub.data?.storePicName || "",
        sub.status,
      ]);
    });

    const csvContent = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MRS_Records_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Material Requisition Slip records exported successfully!");
  };

  const handleAction = async (id: string, status: SubmissionStatus) => {
    if (isProcessingAction) return;
    if (status === "rejected" && !remarks.trim()) {
      toast.error("Please enter a reason before rejecting this request.");
      return;
    }
    setIsProcessingAction(true);
    const approvalRemarksHistory = appendApprovalRemark(selectedSubmission?.data.approvalRemarksHistory, {
      actorName: user?.name || "Store PIC",
      actorRole: "Store PIC",
      action: status === "rejected" ? "rejected" : "approved",
      remark: remarks.trim(),
    });
    const success = await updateSubmissionStatus(id, status, {
      remarks: remarks.trim() || selectedSubmission?.data.remarks,
      approvalRemarksHistory,
      rejectedStage: status === "rejected" ? "store_pic" : undefined,
    });
    setIsProcessingAction(false);
    if (!success) return;
    toast.success(`Request ${status === "rejected" ? "rejected" : "approved"} successfully`);
    setSelectedSubmission(null);
    setRemarks("");
  };

  if (isLoading) {
    return (
      <ApprovalDashboardSkeleton
        title="Loading Store approvals…"
        description="Retrieving Material Requisition Slips assigned to you."
        statsCount={3}
      />
    );
  }

  if (selectedSubmission) {
    const sub = selectedSubmission;
    const isPending = sub.status === "pending";
    return (
      <div className="min-h-full bg-muted/30">
        <div className="mx-auto max-w-5xl animate-in fade-in-5 slide-in-from-bottom-2 p-4 duration-300 sm:p-6 lg:p-7">
          <div className="rounded-2xl border border-border/60 bg-muted/40 p-3 shadow-sm sm:p-4 lg:p-5">
            <div className="mb-5 flex items-center justify-between gap-6">
              <div className="flex min-w-0 items-center gap-3">
                <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="inline-flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group">
                  <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                <h2 className="text-xl font-bold text-foreground">Review Requisition Slip</h2>
              </div>
              {seesAllSubmissions && <VoidSubmissionControl submission={sub} onVoided={() => setSelectedSubmission(null)} variant="icon" />}
            </div>

            <EmployeeSummary
              name={sub.employeeName}
              staffId={sub.data.employeeInfo?.staffNo || "—"}
              department={sub.department}
              position={sub.data.employeeInfo?.position || "—"}
              className="mb-5 [&>div]:bg-background"
            />

            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Requisition Summary</p>
            <div className="mb-5 space-y-0 rounded-xl border border-border/60 bg-background p-4 shadow-sm sm:p-5">
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Serial Number</span>
                <div className="text-xs sm:text-sm font-bold text-foreground sm:col-span-2 text-left">{generateRefNo(sub)}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Submitted</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
                  {new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, {new Date(sub.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}
                </div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Superior (Notified)</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.superiorName || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">HOD (Notified)</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.hodName || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Item Description</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.itemDescription || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Order Quantity</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.quantity || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Lot No.</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.lotNo || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Store PIC</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.storePicName || "—"}</div>
              </div>
            </div>

            <ApprovalRemarksHistory submission={sub} />

            {isPending && (
              <div className="rounded-xl border border-border/60 bg-background p-4 shadow-sm sm:p-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Remarks</p>
                <Textarea
                  placeholder="Enter a reason if rejecting..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={3}
                  className="mb-4 min-h-20 resize-y bg-muted/20 text-base sm:text-sm"
                />
                <div className="flex flex-row gap-3 sm:gap-4">
                  <button
                    onClick={() => handleAction(sub.id, "rejected")}
                    disabled={isProcessingAction}
                    className="w-1/3 px-2 sm:px-6 py-3 sm:py-4 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors text-xs sm:text-base disabled:opacity-60"
                  >
                    REJECT
                  </button>
                  <button
                    onClick={() => handleAction(sub.id, "approved")}
                    disabled={isProcessingAction}
                    className="w-2/3 px-2 sm:px-6 py-3 sm:py-4 rounded-xl bg-[#57D51B] text-white font-bold text-center hover:bg-[#49BD16] transition-colors text-xs sm:text-base disabled:opacity-60"
                  >
                    APPROVE
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Store Approvals</h1>
          <p className="text-muted-foreground text-sm mt-1">Review and action incoming Material Requisition Slips.</p>
        </div>
        {seesAllSubmissions && (
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-bold text-foreground transition-colors hover:bg-muted/50 sm:w-auto"
          >
            <Download className="h-[18px] w-[18px]" />
            Export to Spreadsheet
          </button>
        )}
      </div>

      <div className="animate-in slide-in-from-bottom-2 duration-700">
        <div className="card-elevated mb-4 border-border/60 bg-muted/40 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="mb-3 text-sm font-bold text-foreground">Filter Requests</p>
              <div className="flex w-full items-center gap-1.5 overflow-x-auto rounded-xl p-1.5 pb-2 sm:w-fit sm:pb-1.5">
                <button onClick={() => setActiveTab("pending")} className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-[15px] font-bold transition-all sm:flex-none ${activeTab === "pending" ? "border-primary bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "border-border/60 bg-background text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground hover:shadow"}`}>
                  Pending
                  {stats.pending > 0 && (
                    <Badge className="h-6 min-w-6 justify-center border-0 bg-red-500 px-1.5 text-xs text-white hover:bg-red-500">{stats.pending}</Badge>
                  )}
                </button>
                <button onClick={() => setActiveTab("history")} className={`flex min-h-11 min-w-[7.5rem] flex-1 items-center justify-center whitespace-nowrap rounded-lg border px-5 py-2.5 text-[15px] font-bold transition-all sm:flex-none ${activeTab === "history" ? "border-primary bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "border-border/60 bg-background text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground hover:shadow"}`}>
                  History
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 xl:shrink-0">
              <div className="min-w-24 rounded-lg border border-border/60 border-l-4 border-l-primary bg-background px-3 py-2 shadow-sm">
                <p className="text-[10px] font-semibold leading-tight text-muted-foreground">Pending</p>
                <p className="mt-1 text-xl font-bold leading-none text-foreground">{stats.pending}</p>
              </div>
              <div className="min-w-24 rounded-lg border border-border/60 border-l-4 border-l-primary bg-background px-3 py-2 shadow-sm">
                <p className="text-[10px] font-semibold leading-tight text-muted-foreground">Approved</p>
                <p className="mt-1 text-xl font-bold leading-none text-foreground">{stats.approved}</p>
              </div>
              <div className="min-w-24 rounded-lg border border-border/60 border-l-4 border-l-primary bg-background px-3 py-2 shadow-sm">
                <p className="text-[10px] font-semibold leading-tight text-muted-foreground">Rejected</p>
                <p className="mt-1 text-xl font-bold leading-none text-foreground">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card-elevated overflow-hidden">
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Material Requisition Slips</h2>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee, item, or lot no..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-11 w-full pl-9 text-sm sm:w-80"
              />
            </div>
          </div>

          {tabFiltered.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No requests found in this tab</h3>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/40">
                      <TableHead className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Serial No.</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Employee</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Item</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Submitted</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Status</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tabFiltered.map(sub => (
                      <TableRow key={sub.id} className="hover:bg-muted/20">
                        <TableCell className="text-sm font-semibold text-primary whitespace-nowrap">{generateRefNo(sub)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold bg-primary/10 text-primary">
                              {getInitials(sub.employeeName)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{sub.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{sub.department}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-foreground max-w-xs truncate">{sub.data?.itemDescription || "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                              {new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            <span className="text-[11px] text-muted-foreground/80 whitespace-nowrap">
                              {new Date(sub.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{statusBadge(sub.status)}</TableCell>
                        <TableCell className="text-center">
                          <button onClick={() => setSelectedSubmission(sub)} className="min-h-11 min-w-[8rem] whitespace-nowrap rounded-lg bg-primary px-5 py-2.5 text-[15px] font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow active:scale-[0.98]">
                            {sub.status === "pending" ? "Review" : "Details"}
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="divide-y divide-border/60 sm:hidden">
                {tabFiltered.map(sub => (
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
                    <p className="truncate text-xs text-muted-foreground">{sub.data?.itemDescription || "—"}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {seesAllSubmissions && (
        <Sheet open={isExportOpen} onOpenChange={setIsExportOpen}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader className="mb-6 border-b border-border pb-4">
              <SheetTitle className="text-xl font-bold">Export to Spreadsheet</SheetTitle>
              <SheetDescription>Download Material Requisition Slip records as a CSV file.</SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              <div className="space-y-3 rounded-xl border border-border bg-background p-4 shadow-sm">
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground">Date Range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">From Date</Label>
                    <Input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="h-9 text-xs dark:[color-scheme:dark]" />
                  </div>
                  <div>
                    <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">To Date</Label>
                    <Input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="h-9 text-xs dark:[color-scheme:dark]" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => {
                    const today = new Date().toISOString().split("T")[0];
                    setExportStartDate(today);
                    setExportEndDate(today);
                  }} className="rounded-md bg-muted px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted/80">Today</button>
                  <button type="button" onClick={() => {
                    const today = new Date();
                    const start = new Date(today);
                    start.setDate(today.getDate() - 7);
                    setExportStartDate(start.toISOString().split("T")[0]);
                    setExportEndDate(today.toISOString().split("T")[0]);
                  }} className="rounded-md bg-muted px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted/80">Last 7 Days</button>
                  <button type="button" onClick={() => {
                    const today = new Date();
                    const start = new Date(today);
                    start.setMonth(today.getMonth() - 1);
                    setExportStartDate(start.toISOString().split("T")[0]);
                    setExportEndDate(today.toISOString().split("T")[0]);
                  }} className="rounded-md bg-muted px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted/80">Last Month</button>
                  <button type="button" onClick={() => {
                    const today = new Date();
                    const start = new Date(today);
                    start.setFullYear(today.getFullYear() - 1);
                    setExportStartDate(start.toISOString().split("T")[0]);
                    setExportEndDate(today.toISOString().split("T")[0]);
                  }} className="rounded-md bg-muted px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted/80">Last 12 Months</button>
                  <button type="button" onClick={() => {
                    setExportStartDate("");
                    setExportEndDate("");
                  }} className="rounded-md bg-muted px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted/80">All Dates</button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <h3 className="text-sm font-bold text-foreground">Material Requisition Slip Records</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Includes serial number, date submitted, employee, department, item description, quantity, lot no, superior, HOD, Store PIC, and status.
                </p>
                <button type="button" onClick={() => { handleExportCSV(); setIsExportOpen(false); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-600">
                  <Download className="h-3.5 w-3.5" /> Download Spreadsheet
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default StoreApproverDashboard;
