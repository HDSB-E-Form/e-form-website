import { useState, useMemo, useEffect } from "react";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, FileText, Printer, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import { renderValue } from "@/components/DataRenderer";
import ApprovalDashboardSkeleton from "@/components/ApprovalDashboardSkeleton";
import ApprovalOverview from "@/components/ApprovalOverview";
import { useAuth } from "@/contexts/AuthContext";
import ApprovalRemarksHistory from "@/components/ApprovalRemarksHistory";
import { Textarea } from "@/components/ui/textarea";
import { appendApprovalRemark } from "@/lib/approvalRemarks";
import EmployeeSummary from "@/components/EmployeeSummary";
import VoidSubmissionControl from "@/components/VoidSubmissionControl";

const formTypeLabels: Record<string, string> = {
  claim: "PETTY CASH CLAIM",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "pending_finance_review":
      return <Badge className="bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400 border-0 text-xs font-medium px-3 py-1">Pending Review</Badge>;
    case "approved_hof":
      return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-0 text-xs font-medium px-3 py-1">Pending Admin</Badge>;
    case "paid":
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0 text-xs font-medium px-3 py-1">Paid</Badge>;
    case "completed":
      return <Badge className="bg-[#57D51B] text-white hover:bg-[#57D51B] border-0 text-xs font-medium px-3 py-1">Completed</Badge>;
    case "approved_hop":
      return <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400 border-0 text-xs font-medium px-3 py-1">Pending HOF</Badge>;
    case "approved":
      return <Badge className="bg-[#57D51B] text-white hover:bg-[#57D51B] border-0 text-xs font-medium px-3 py-1">Fully Approved</Badge>;
    case "approved_hod":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-xs font-medium px-3 py-1">Pending HOP</Badge>;
    case "approved_hos":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-xs font-medium px-3 py-1">Pending HOD</Badge>;
    case "rejected":
      return <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive border-0 text-xs font-medium px-3 py-1">Rejected</Badge>;
    case "voided":
      return <Badge className="border-0 bg-slate-500/15 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">Voided</Badge>;
    case "pending":
    default:
      // For claim forms, 'pending' always means waiting for HOS.
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

const FinanceDashboard = () => {
  const { user } = useAuth();
  const { submissions, updateSubmissionStatus, refNoMap, isLoading, refreshSubmissions } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [activeTab, setActiveTab] = useState<"review_required" | "payment_required" | "in_progress" | "history">("review_required");
  const [isViewAll, setIsViewAll] = useState(false);
  const [financeCode, setFinanceCode] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    refreshSubmissions();
  }, [refreshSubmissions]);

  // Finance admin only sees claim forms
  const filtered = submissions
    .filter(s => s.formType === "claim")
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
    if (activeTab === "review_required") return s.status === "pending_finance_review"; // This remains the same, but the trigger is different
    if (activeTab === "payment_required") return s.status === "approved_hof";
    if (activeTab === "in_progress") return ["pending", "approved_hos", "approved_hod", "approved_hop"].includes(s.status);
    if (activeTab === "history") return ["approved", "rejected", "paid", "completed", "voided"].includes(s.status);
    return true;
  });

  const stats = {
    total: filtered.length,
    reviewRequired: filtered.filter(s => s.status === "pending_finance_review").length,
    paymentRequired: filtered.filter(s => s.status === "approved_hof").length,
    inProgress: filtered.filter(s => ["pending", "approved_hos", "approved_hod", "approved_hop"].includes(s.status)).length,
    approvalRate: filtered.length > 0 ? Math.round((filtered.filter(s => ["approved", "paid", "completed"].includes(s.status)).length / filtered.length) * 100) : 0,
  };

  const generateRefNo = (sub: Submission) => {
    return refNoMap.get(sub.id) || `HDSB-${sub.id.slice(-4)}`;
  };

  const handleAction = async (id: string, status: SubmissionStatus) => {
    if (isProcessingAction) return;
    const nextStatus = status;

    if (nextStatus === "rejected" && !remarks.trim()) {
      toast.error("Please enter a reason before rejecting this claim.");
      return;
    }
    if (nextStatus === "paid" && (!financeCode.trim() || !Number.isFinite(Number(amountPaid)) || Number(amountPaid) <= 0)) {
      toast.error("Enter a valid GL code and payment amount before processing payment.");
      return;
    }
    
    const updateData: any = {
      // Save finance admin remarks in a separate field
      finance_admin_remarks: remarks.trim(), 
      // Keep original remarks if any, or set to current remarks if it's a rejection with new comments
      remarks: nextStatus === "rejected" && remarks ? remarks : selectedSubmission?.data.remarks,
      rejectedStage: nextStatus === "rejected"
        ? selectedSubmission?.status === "approved_hof" ? "admin" : "finance_review"
        : undefined,
      rejectedFromStatus: nextStatus === "rejected" ? selectedSubmission?.status : undefined };

    updateData.approvalRemarksHistory = appendApprovalRemark(selectedSubmission?.data.approvalRemarksHistory, {
      actorName: user?.name || "Finance Admin",
      actorRole: "Finance Admin",
      action: nextStatus === "rejected" ? "rejected" : nextStatus === "paid" ? "payment_processed" : "approved",
      remark: remarks.trim(),
    });

    if (selectedSubmission?.status === "pending_finance_review") {
      updateData.financeReviewedByName = user?.name || "Finance Admin";
      updateData.financeReviewedById = user?.id || null;
      updateData.financeReviewedAt = new Date().toISOString();
    }

    if (selectedSubmission?.status === "approved_hof") {
      updateData.financePaidByName = user?.name || "Finance Admin";
      updateData.financePaidById = user?.id || null;
      updateData.financePaidAt = new Date().toISOString();
    }

    if (selectedSubmission?.formType === 'claim' && nextStatus === 'paid') {
      updateData.financeCode = financeCode.trim();
      updateData.amountPaid = Number(amountPaid).toFixed(2);
    }

    setIsProcessingAction(true);
    const success = await updateSubmissionStatus(id, nextStatus, updateData);
    setIsProcessingAction(false);
    if (!success) return;
    if (nextStatus === 'paid') {
      toast.success(`Payment processed for ${selectedSubmission?.employeeName}. Waiting for acknowledgement.`);
    } else {
      toast.success(`Submission action completed successfully.`);
    }
    setSelectedSubmission(null);
    setRemarks("");
    setFinanceCode("");
    setAmountPaid("");
  };

  // Review detail view matching the template (image-9)
  if (isLoading) {
    return (
      <ApprovalDashboardSkeleton
        title="Loading finance approvals…"
        description="Retrieving the latest petty cash claims and payment records."
        statsCount={3}
      />
    );
  }

  if (selectedSubmission) {
    return (
      <div className="min-h-full bg-muted/30">
      <div className="mx-auto max-w-5xl animate-in fade-in-5 p-4 duration-300 sm:p-6 lg:p-7 print:absolute print:inset-0 print:max-w-none print:w-full print:bg-white print:text-black print:z-50 print:p-8 print:m-0">
        <div className="rounded-2xl border border-border/60 bg-muted/40 p-3 shadow-sm sm:p-4 lg:p-5 print:border-0 print:bg-white print:p-0 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to list
          </button>
          <button onClick={() => {
            const originalTitle = document.title;
            document.title = generateRefNo(selectedSubmission);

            const isDark = document.documentElement.classList.contains("dark");
            if (isDark) document.documentElement.classList.remove("dark");

            setTimeout(() => {
              window.onafterprint = () => {
                document.title = originalTitle;
                if (isDark) document.documentElement.classList.add("dark");
                window.onafterprint = null;
              };
              window.print();
              setTimeout(() => { document.title = originalTitle; }, 2000);
            }, 50);
          }} className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-foreground bg-muted hover:bg-muted/80 border border-border rounded-lg transition-all shadow-sm">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>

        {/* Print Header */}
        <div className="hidden print:flex items-center mb-8 border-b-2 border-black pb-6">
          <img src={logo} alt="HICOM Diecasting" className="h-14 w-auto object-contain mr-6" />
          <div className="text-left">
            <h1 className="text-2xl font-bold uppercase tracking-widest text-black">HICOM Diecastings Sdn Bhd</h1>
            <p className="text-sm text-gray-600 mt-1 uppercase tracking-wide">Official Form Submission Document</p>
          </div>
        </div>

        <EmployeeSummary
          name={selectedSubmission.employeeName}
          staffId={selectedSubmission.data.staffId || selectedSubmission.data.employeeInfo?.staffNo || selectedSubmission.data.employeeInfo?.employeeNumber || selectedSubmission.submittedBy || "—"}
          department={selectedSubmission.department || "—"}
          position={selectedSubmission.data.position || selectedSubmission.data.employeeInfo?.position || "—"}
          additionalDetails={[
            {
              label: "Phone Number",
              value: selectedSubmission.data.employeeInfo?.phone || selectedSubmission.data.phone || selectedSubmission.data.mobileNumber || "—",
            },
          ]}
          className="mb-5 [&>div]:bg-background sm:[&>div>div]:grid-cols-4 print:mb-6"
        />

        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary print:text-black">Submission Summary</p>
        <div className="mb-5 divide-y divide-border/50 rounded-xl border border-border/60 bg-background px-4 shadow-sm sm:px-5 print:rounded-none print:border-gray-300 print:bg-transparent print:px-0 print:shadow-none">
            <div className="grid grid-cols-1 items-start gap-1 py-3 sm:grid-cols-3 sm:gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary print:text-gray-500 sm:text-sm">Reference Number</span>
              <div className="flex items-start justify-between gap-3 sm:col-span-2">
                <div>
                  <p className="text-xs font-bold text-foreground sm:text-sm">{generateRefNo(selectedSubmission)}</p>
                </div>
                <div className="shrink-0 print:hidden">{statusBadge(selectedSubmission.status)}</div>
              </div>
            </div>
            <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-3 gap-4 items-start">
              <span className="text-xs text-primary print:text-gray-500 uppercase tracking-wider font-bold col-span-1">Department Code</span>
              <div className="text-sm font-medium text-foreground print:text-xs print:text-black col-span-2">{selectedSubmission.data.employeeInfo?.departmentCode || selectedSubmission.data.departmentCode || "—"}</div>
            </div>
            <div className="hidden py-2 border-b border-border print:border-gray-300 grid-cols-3 gap-4 items-start">
              <span className="text-xs text-primary print:text-gray-500 uppercase tracking-wider font-bold col-span-1">Approvers</span>
              <div className="flex flex-col gap-0.5 text-sm font-medium text-foreground print:text-xs print:text-black sm:col-span-2">
                <p>HOS: {selectedSubmission.data.hosName || "—"}</p>
                <p>HOD: {selectedSubmission.data.hodName || "—"}</p>
                <p>HOP: {selectedSubmission.data.hopName || "—"}</p>
                <p>HOF: {selectedSubmission.data.hofName || "—"}</p>
              </div>
            </div>
            {(selectedSubmission.data.financeCode || selectedSubmission.data.amountPaid) && (
              <>
                <div className="grid grid-cols-3 items-start gap-4 border-b border-border py-2 print:border-gray-300">
                  <span className="col-span-1 text-xs font-bold uppercase tracking-wider text-primary print:text-gray-500">GL Code</span>
                  <span className="col-span-2 text-sm font-bold text-foreground print:text-xs print:text-black">{selectedSubmission.data.financeCode || "—"}</span>
                </div>
                <div className="grid grid-cols-3 items-start gap-4 border-b border-border py-2 print:border-gray-300">
                  <span className="col-span-1 text-xs font-bold uppercase tracking-wider text-primary print:text-gray-500">Amount Paid</span>
                  <span className="col-span-2 text-sm font-bold text-foreground print:text-xs print:text-black">RM {selectedSubmission.data.amountPaid || "0.00"}</span>
                </div>
              </>
            )}
            {(selectedSubmission.data.attachments?.length > 0 || selectedSubmission.data.attachment) && (
              <div className="grid grid-cols-1 items-start gap-2 border-b border-border py-3 sm:grid-cols-3 sm:gap-4 print:border-gray-300">
                <span className="text-xs font-bold uppercase tracking-wider text-primary print:text-gray-500">Attachments</span>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  {selectedSubmission.data.attachments?.length > 0 ? (
                    selectedSubmission.data.attachments.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
                        <FileText className="h-3.5 w-3.5" /> Attachment {idx + 1}
                      </a>
                    ))
                  ) : (
                    <a href={selectedSubmission.data.attachment} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
                      <FileText className="h-3.5 w-3.5" /> View Attachment
                    </a>
                  )}
                </div>
              </div>
            )}
            <div className="py-2 border-b border-border print:border-gray-300 flex flex-col items-start gap-2">
              <span className="text-xs text-primary print:text-gray-500 uppercase tracking-wider font-bold">Claim Details / Description</span>
              <div className="w-full text-sm font-medium text-foreground print:text-xs print:text-black">
                {renderValue(selectedSubmission.data.claimRows)}
              </div>
            </div>
            <div className="py-2 text-right">
              <span className="text-xs text-primary print:text-gray-500 uppercase tracking-wider font-bold">Total Amount</span>
              <div className="text-2xl font-bold text-primary print:text-lg print:text-black">
                <span className="text-lg print:text-sm">RM</span>
                {selectedSubmission.data.totalAmount?.toFixed(2) || "0.00"}
              </div>
            </div>
        </div>


        <ApprovalRemarksHistory submission={selectedSubmission} />

        {/* Remarks & Actions - only when HOD has approved */}
        {(selectedSubmission.status === "approved_hof" || selectedSubmission.status === "pending_finance_review") && (
          <div className="mt-4 rounded-xl border border-border/60 bg-background p-4 shadow-sm sm:p-5">
            {selectedSubmission.status === "approved_hof" && (
              <div className="my-6">
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">FINANCE USE</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">GL Code <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="Enter GL Code"
                      value={financeCode}
                      onChange={e => setFinanceCode(e.target.value)}
                      className="h-11 bg-muted/20 text-base sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Amount Paid <span className="text-destructive">*</span></Label>
                    <Input placeholder="Enter amount" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className="h-11 bg-muted/20 text-base sm:text-sm" />
                  </div>
                </div>
              </div>
            )}
            <>
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3 mt-6">FINANCE REMARKS</p>
              <Textarea
                placeholder="Please enter remarks if any..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
                className="mb-6 min-h-20 resize-y bg-muted/20"
              />

              {selectedSubmission.status === "pending_finance_review" ? (
                <div className="flex gap-4">
                  <button
                    onClick={() => handleAction(selectedSubmission.id, "rejected")}
                    disabled={isProcessingAction}
                    className="w-1/3 px-2 sm:px-6 py-3 sm:py-4 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors text-xs sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    REJECT
                  </button>
                  <button
                onClick={() => handleAction(selectedSubmission.id, "approved_hop")}
                    disabled={isProcessingAction}
                    className="w-2/3 px-2 sm:px-6 py-3 sm:py-4 rounded-xl bg-[#57D51B] text-white font-bold text-center hover:bg-[#49BD16] transition-colors flex items-center justify-center gap-2 text-xs sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isProcessingAction ? "SAVING..." : "APPROVE & PROCEED TO HOF"}
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={() => handleAction(selectedSubmission.id, "rejected")}
                    disabled={isProcessingAction}
                    className="w-1/3 px-2 sm:px-6 py-3 sm:py-4 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors text-xs sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    REJECT
                  </button>
                <button
                  onClick={() => handleAction(selectedSubmission.id, "paid")}
                  disabled={isProcessingAction}
                  className="w-2/3 px-2 sm:px-6 py-3 sm:py-4 rounded-xl bg-blue-500 text-white font-bold text-center hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 text-xs sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Wallet className="h-4 w-4" /> {isProcessingAction ? "SAVING..." : "PROCESS PAYMENT"}
                </button>
              </div>
              )}
            </>
          </div>
        )}

        {["pending", "approved_hos", "approved_hod", "approved_hop"].includes(selectedSubmission.status) && (
          <div className="rounded-xl border border-border/60 bg-background p-4 text-center shadow-sm">
            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-sm text-muted-foreground font-medium">
                {selectedSubmission.status === "pending" ? "Waiting for Head of Section (HOS) approval." :
                 selectedSubmission.status === "approved_hos" ? "Pending HOD approval." :
                 selectedSubmission.status === "approved_hod" ? "Waiting for Head of Purchasing (HOP) approval." :
                 "Waiting for Head of Finance (HOF) approval."}
              </p>
              <div className="w-full max-w-md">
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Finance Admin Action</p>
                <Textarea
                  placeholder="Enter remarks if rejecting..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={3}
                  className="mb-3 min-h-20 resize-y bg-background"
                />
                <button onClick={() => handleAction(selectedSubmission.id, "rejected")} disabled={isProcessingAction} className="w-full px-6 py-3 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed">{isProcessingAction ? "SAVING..." : "REJECT SUBMISSION"}</button>
              </div>
            </div>
          </div>
        )}

        <ApprovalOverview submission={selectedSubmission} />
        <VoidSubmissionControl submission={selectedSubmission} onVoided={() => setSelectedSubmission(null)} />
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in-5 slide-in-from-bottom-2 p-4 duration-500 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Finance Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage and review all incoming finance requests.</p>
      </div>

      {/* Action Tabs */}
      <div className="card-elevated mb-4 border-border/60 bg-muted/40 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
        <p className="mb-3 text-sm font-bold text-foreground">Filter Finance Requests</p>
        <div className="flex w-full items-center gap-1.5 overflow-x-auto rounded-xl p-1.5 pb-2 sm:w-fit sm:pb-1.5">
        <button onClick={() => { setActiveTab("review_required"); setIsViewAll(false); }} className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-[15px] font-bold transition-all sm:flex-none ${activeTab === "review_required" ? "border-primary bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "border-border/60 bg-background text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground hover:shadow"}`}>
          Review Required
          {stats.reviewRequired > 0 && (
            <Badge className="h-5 min-w-5 justify-center border-0 bg-red-500 px-1.5 text-[10px] text-white hover:bg-red-500">{stats.reviewRequired}</Badge>
          )}
        </button>
        <button onClick={() => { setActiveTab("payment_required"); setIsViewAll(false); }} className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-[15px] font-bold transition-all sm:flex-none ${activeTab === "payment_required" ? "border-primary bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "border-border/60 bg-background text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground hover:shadow"}`}>
          Payment Required
          {stats.paymentRequired > 0 && (
            <Badge className="h-5 min-w-5 justify-center border-0 bg-red-500 px-1.5 text-[10px] text-white hover:bg-red-500">{stats.paymentRequired}</Badge>
          )}
        </button>
        <button onClick={() => { setActiveTab("in_progress"); setIsViewAll(false); }} className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-[15px] font-bold transition-all sm:flex-none ${activeTab === "in_progress" ? "border-primary bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "border-border/60 bg-background text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground hover:shadow"}`}>
          In Progress
          {stats.inProgress > 0 && (
            <Badge className="h-5 min-w-5 justify-center border-0 bg-amber-500 px-1.5 text-[10px] text-white hover:bg-amber-500">{stats.inProgress}</Badge>
          )}
        </button>
        <button onClick={() => { setActiveTab("history"); setIsViewAll(false); }} className={`flex min-h-11 min-w-[7.5rem] flex-1 items-center justify-center whitespace-nowrap rounded-lg border px-5 py-2.5 text-[15px] font-bold transition-all sm:flex-none ${activeTab === "history" ? "border-primary bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30" : "border-border/60 bg-background text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground hover:shadow"}`}>
          History
        </button>
        </div>
        <p className="mt-2 text-[11px] font-medium text-muted-foreground sm:hidden">Swipe sideways to see all filters →</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:shrink-0">
          {[
            ["Action Required", stats.reviewRequired + stats.paymentRequired, "text-foreground"],
            ["Approval Rate", `${stats.approvalRate}%`, "text-foreground"],
            ["In Progress", stats.inProgress, "text-muted-foreground"],
            ["Total Submissions", stats.total, "text-foreground"],
          ].map(([label, value, color]) => (
            <div key={String(label)} className="min-w-24 rounded-lg border border-border/60 border-l-4 border-l-primary bg-background px-3 py-2 shadow-sm">
              <p className="text-[10px] font-semibold leading-tight text-muted-foreground">{label}</p>
              <p className={`mt-1 text-xl font-bold leading-none ${color}`}>{value}</p>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="card-elevated overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Recent Submissions</h2>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by employee name or date..." 
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
                  <TableHead className="w-40 pr-1 text-xs font-bold uppercase tracking-wider">RefNo.</TableHead>
                  <TableHead className="pl-1 text-xs font-bold uppercase tracking-wider">Employee</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isViewAll ? tabFiltered : tabFiltered.slice(0, 10)).map((sub) => {
              const avatarUrl = (sub as any).avatar || sub.data?.employeeInfo?.avatar || sub.data?.avatar;
                  return (
                    <TableRow key={sub.id} className={`${(activeTab === "review_required" || activeTab === "payment_required") && isRecent(sub.submittedAt) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"} print-hide-finance-claim-row`}>
                      <TableCell className="py-4 pl-4 pr-1 text-sm font-medium text-muted-foreground">{generateRefNo(sub)}</TableCell>
                      <TableCell className="py-4 pl-1 pr-4">
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
                          <span className="text-[11px] text-muted-foreground/80">
                            {new Date(sub.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(sub.status)}</TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => setSelectedSubmission(sub)} className="min-h-11 min-w-[8rem] whitespace-nowrap rounded-lg bg-primary px-5 py-2.5 text-[15px] font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow active:scale-[0.98]">
                          {sub.status === "approved_hof" || sub.status === "pending_finance_review" ? "Review" : "Details"}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
            <div className="divide-y divide-border/60 sm:hidden">
              {(isViewAll ? tabFiltered : tabFiltered.slice(0, 10)).map(sub => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubmission(sub)}
                  className={`block w-full p-4 text-left transition-colors hover:bg-muted/30 ${
                    (activeTab === "review_required" || activeTab === "payment_required") && isRecent(sub.submittedAt) ? "bg-primary/5" : ""
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
                    <div className="text-xs text-muted-foreground">
                      <p>{new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                      <p className="mt-1">{new Date(sub.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                    </div>
                    <span className="flex min-h-11 min-w-[7rem] shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm">
                      {sub.status === "approved_hof" || sub.status === "pending_finance_review" ? "Review" : "Details"}
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

export default FinanceDashboard;
