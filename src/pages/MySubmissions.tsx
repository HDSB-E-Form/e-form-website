import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission, type CarInfo, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { useHiddenSubmissions } from "./useHiddenSubmissions";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, ArrowLeft, Printer, Car, Wallet, HandCoins, EyeOff, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import logo from "@/assets/logo.png";
import { toast } from "sonner";
import { renderValue } from "@/components/DataRenderer";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardStatCard from "@/components/DashboardStatCard";

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request",
  leave: "Gate Pass",
  claim: "Petty Cash Claim",
  ppe_request: "PPE | Uniform | Office Supplies",
  cctv_access_request: "CCTV Access Request",
  it_help_desk: "IT Help Desk",
};

const hiddenUserDetailFields = new Set([
  "viewedat",
  "lastopenedat",
  "itadminreviewedat",
  "itadminreviewedbyid",
  "resolvedbyid",
]);

const isHiddenUserDetailField = (key: string) =>
  hiddenUserDetailFields.has(key.replace(/[^a-z0-9]/gi, "").toLowerCase());

type FilterType = "all" | "pending" | "approved" | "rejected" | "action_required";

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">APPROVED</Badge>;
    case "rejected":
      return <Badge className="bg-destructive/15 text-destructive dark:text-red-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">REJECTED</Badge>;
    case "paid":
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">PAID</Badge>;
    case "completed":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">COMPLETED</Badge>;
    case "awaiting_confirmation":
      return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">AWAITING CONFIRMATION</Badge>;
    case "reopened":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">REOPENED</Badge>;
    case "pending":
    default:
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">PENDING</Badge>;
  }
};

const naStatus = () => (
  <Badge className="bg-muted text-muted-foreground border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">N/A</Badge>
);

const getOverallStatus = (sub: Submission) => {
  const status = sub.status as string;
  if (status === "rejected") return { label: "Rejected", color: "bg-destructive", progress: 100 };
  if (status === "completed") return { label: "Completed", color: "bg-emerald-500", progress: 100 };
  if (status === "approved" || status === "paid") return { label: "Fully Approved", color: "bg-emerald-500", progress: 100 };
  
  if (sub.formType === 'claim') {
    if (status === "approved_hof") return { label: "Pending Finance Payment", color: "bg-teal-500", progress: 95 };
    if (status === "approved_hop") return { label: "Pending HOF", color: "bg-sky-500", progress: 85 };
    if (status === "pending_finance_review") return { label: "Pending Finance Review", color: "bg-fuchsia-500", progress: 75 };
    if (status === "approved_hod") return { label: "Pending HOP", color: "bg-blue-500", progress: 60 };
    if (status === "approved_hos") return { label: "Pending HOD", color: "bg-sky-500", progress: 40 };
    return { label: "Pending HOS", color: "bg-amber-500", progress: 20 }; // Default for claim
  } 
  
  if (sub.formType === 'leave') {
    if (status === "approved") return { label: "Completed", color: "bg-emerald-500", progress: 100 };
    if (status === "on_leave") return { label: "On Leave", color: "bg-indigo-500", progress: 90 };
    if (status === "approved_hod") return { label: "Pending Security", color: "bg-blue-500", progress: 75 };
    if (status === "approved_hos") return { label: "Pending HOD", color: "bg-amber-500", progress: 50 };
  } else if (sub.formType === 'cctv_access_request') {
    if (status === "approved_hod") return { label: "Pending IT Admin", color: "bg-violet-500", progress: 75 };
    if (status === "approved_hos") return { label: "Pending HOD", color: "bg-amber-500", progress: 50 };
  } else if (sub.formType === 'it_help_desk') {
    if (status === "approved" || status === "completed") return { label: "Resolved", color: "bg-emerald-500", progress: 100 };
    if (status === "awaiting_confirmation") return { label: "Confirm IT Resolution", color: "bg-sky-500", progress: 85 };
    if (status === "reopened") return { label: "Reopened with IT", color: "bg-amber-500", progress: 45 };
    return { label: "Submitted to IT", color: "bg-violet-500", progress: 35 };
  } else {
    // Standard HOD approval for other forms
    if (status === "approved_hod") return { label: "Pending Admin", color: "bg-blue-500", progress: 75 };
    if (status === "approved_hos") return { label: "Pending HOD", color: "bg-amber-500", progress: 50 };
  }

  return { label: "Pending HOS", color: "bg-amber-500", progress: 25 };
};

const MySubmissions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submissions, cars, updateSubmissionStatus, refNoMap, isLoading, refreshSubmissions } = useSubmissions();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [assignedCarDetails, setAssignedCarDetails] = useState<CarInfo | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isViewAll, setIsViewAll] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [resolutionResponse, setResolutionResponse] = useState("");
  const [isRespondingToResolution, setIsRespondingToResolution] = useState(false);
  const { hiddenIds, hideSubmissions } = useHiddenSubmissions();

  const assignedCar = cars.find(c => c.status === 'checked_out' && c.lastCheckedOutBy === user?.name);

  const excludedForms = ["inventory_addition", "ppe_request", "ppe_purchase", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"];

  useEffect(() => {
    refreshSubmissions();
  }, [refreshSubmissions]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 duration-300" aria-busy="true" aria-live="polite">
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-primary/60" />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Loading submissions…</p>
            <p className="text-sm text-muted-foreground">Retrieving your latest records.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[0, 1, 2].map((card) => (
            <div key={card} className="card-elevated p-5 flex items-center gap-4">
              <Skeleton className="h-12 w-12 flex-shrink-0 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-12" />
              </div>
            </div>
          ))}
        </div>

        <div className="card-elevated p-4 sm:p-5 mb-4">
          <Skeleton className="mb-3 h-3 w-32" />
          <div className="flex gap-2 overflow-hidden">
            {[72, 128, 88, 92, 88].map((width, index) => (
              <Skeleton key={index} className="h-9 flex-shrink-0 rounded-md" style={{ width }} />
            ))}
          </div>
        </div>

        <div className="card-elevated overflow-hidden">
          <div className="border-b border-border p-5">
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="p-5 space-y-5">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="hidden sm:block h-4 w-28" />
                <Skeleton className="hidden sm:block h-5 w-16 rounded-full" />
                <Skeleton className="hidden lg:block h-2 w-28 rounded-full" />
                <Skeleton className="hidden lg:block h-4 w-12 justify-self-end" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const mySubmissions = submissions
    .filter(s => s.submittedBy === user?.id && !excludedForms.includes(s.formType) && !hiddenIds.has(s.id));

  const stats = {
    total: mySubmissions.length,
    accepted: mySubmissions.filter(s => ["approved", "completed", "paid"].includes(s.status)).length,
    rejected: mySubmissions.filter(s => s.status === "rejected").length,
    actionRequired: mySubmissions.filter(s => s.status === "paid" || (s.formType === "it_help_desk" && s.status === "awaiting_confirmation")).length,
  };

  const filtered = mySubmissions.filter(s => {
    if (filter === "all") return true;
    if (filter === "action_required") return s.status === "paid" || (s.formType === "it_help_desk" && s.status === "awaiting_confirmation");
    if (filter === "pending") return ["pending", "approved_hos", "approved_hod", "pending_finance_review", "approved_hop", "approved_hof", "reopened"].includes(s.status);
    if (filter === "approved") return ["approved", "completed"].includes(s.status);
    if (filter === "rejected") return s.status === "rejected";
    return true;
  });

  const generateRefNo = (sub: Submission) => {
    if (sub.data?.refNo) return sub.data.refNo;
    return refNoMap.get(sub.id) || `HDSB-${sub.id.slice(-4)}`;
  };

  const handleAcknowledgeReceipt = async (sub: Submission) => {
    if (acknowledgingId) return;
    if (window.confirm(`Please confirm that you have received RM ${sub.data.amountPaid || sub.data.totalAmount.toFixed(2)} in cash.`)) {
      setAcknowledgingId(sub.id);
      const success = await updateSubmissionStatus(sub.id, "completed", { acknowledgedAt: new Date().toISOString() });
      setAcknowledgingId(null);
      if (!success) return;
      toast.success("Receipt acknowledged. Thank you!");
    }
  };

  const handleToggleSelection = (id: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleRemoveFromView = () => {
    hideSubmissions(selectedIds);
    toast.success(`${selectedIds.size} submission(s) removed from your view. Admin records are unchanged.`);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleResolutionResponse = async (confirmed: boolean) => {
    if (!selectedSubmission || isRespondingToResolution) return;
    if (!confirmed && !resolutionResponse.trim()) {
      toast.error("Explain why the issue is not resolved before reopening the ticket.");
      return;
    }

    setIsRespondingToResolution(true);
    const respondedAt = new Date().toISOString();
    const success = await updateSubmissionStatus(
      selectedSubmission.id,
      confirmed ? "completed" : "reopened",
      confirmed
        ? {
            employeeConfirmedAt: respondedAt,
            employeeConfirmedBy: user?.name || selectedSubmission.employeeName,
            resolutionAcknowledgement: "I confirm that the reported issue has been resolved satisfactorily.",
          }
        : {
            reopenedAt: respondedAt,
            reopenedBy: user?.name || selectedSubmission.employeeName,
            reopenReason: resolutionResponse.trim(),
          },
    );
    setIsRespondingToResolution(false);
    if (!success) return;

    toast.success(confirmed ? "Resolution confirmed. The ticket is now closed." : "Ticket reopened and returned to IT.");
    setResolutionResponse("");
    setSelectedSubmission(null);
  };

  const handleEditSubmission = (path: string) => {
    const confirmed = window.confirm(
      "Editing this submission will restart its approval process. Previous approvals will need to be completed again. Do you want to continue?"
    );
    if (confirmed) navigate(path);
  };

  if (selectedSubmission) {
    const overall = getOverallStatus(selectedSubmission);
    
    const rejectedStage = selectedSubmission.data.rejectedStage;
    const rejectedFromStatus = selectedSubmission.data.rejectedFromStatus;
    const financeRejectionReached = (statuses: string[]) => rejectedStage === "finance_review" &&
      (rejectedFromStatus ? statuses.includes(rejectedFromStatus) : true);
    const wasApprovedByHosBeforeAdminRejection = rejectedStage === "admin" && rejectedFromStatus
      ? ["approved_hos", "approved_hod"].includes(rejectedFromStatus)
      : rejectedStage === "admin";
    const wasApprovedByHodBeforeAdminRejection = rejectedStage === "admin" && rejectedFromStatus
      ? rejectedFromStatus === "approved_hod"
      : rejectedStage === "admin";
    const isBeforeHodApproval = ["pending", "approved_hos"].includes(selectedSubmission.status);
    const isEditableClaim = selectedSubmission.formType === 'claim' && isBeforeHodApproval;
    const isEditableCar = selectedSubmission.formType === 'car_rental' && isBeforeHodApproval;

    const isApprovedHOS = selectedSubmission.data.hosName === 'N/A' || ["approved_hos", "approved_hod", "pending_finance_review", "approved_hop", "approved_hof", "approved", "paid", "completed", "on_leave"].includes(selectedSubmission.status) || ["hod", "hop", "hof"].includes(rejectedStage) || financeRejectionReached(["approved_hos", "approved_hod", "pending_finance_review", "approved_hop", "approved_hof"]) || wasApprovedByHosBeforeAdminRejection;
    const isApprovedHOD = selectedSubmission.data.hodName === 'N/A' || ["approved_hod", "pending_finance_review", "approved_hop", "approved_hof", "approved", "paid", "completed", "on_leave"].includes(selectedSubmission.status) ||
                          ["hop", "hof"].includes(rejectedStage) || financeRejectionReached(["approved_hod", "pending_finance_review", "approved_hop", "approved_hof"]) || wasApprovedByHodBeforeAdminRejection;
    const isApprovedHOP = selectedSubmission.data.hopName === 'N/A' || ["pending_finance_review", "approved_hop", "approved_hof", "approved", "paid", "completed"].includes(selectedSubmission.status) || 
                          ["hof", "admin"].includes(rejectedStage) || financeRejectionReached(["pending_finance_review", "approved_hop", "approved_hof"]);
    const isApprovedFinanceReview = ["approved_hop", "approved_hof", "approved", "paid", "completed", "on_leave"].includes(selectedSubmission.status) ||
                                    ["hof", "admin"].includes(rejectedStage) || financeRejectionReached(["approved_hop", "approved_hof"]);
    const isApprovedHOF = selectedSubmission.data.hofName === 'N/A' || ["approved_hof", "approved", "paid", "completed"].includes(selectedSubmission.status) ||
                          ["admin"].includes(rejectedStage);
    const isRejected = selectedSubmission.status === "rejected";

    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto print:absolute print:inset-0 print:max-w-none print:w-full print:bg-white print:text-black print:z-50 print:p-8 print:m-0 animate-in fade-in-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
          <button onClick={() => setSelectedSubmission(null)} className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to list
          </button>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isEditableClaim && (
              <button
                onClick={() => handleEditSubmission(`/finance/claim?editId=${selectedSubmission.id}`)}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all"
              >
                <Pencil className="h-4 w-4" /> Edit Claim
              </button>
            )}
            {isEditableCar && (
              <button
                onClick={() => handleEditSubmission(`/hr/car-rental?editId=${selectedSubmission.id}`)}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all"
              >
                <Pencil className="h-4 w-4" /> Edit Booking
              </button>
            )}
            <button
              onClick={() => {
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
              }}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-foreground bg-muted hover:bg-muted/80 border border-border rounded-lg transition-all shadow-sm"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:flex items-center mb-8 border-b-2 border-black pb-6">
          <img src={logo} alt="HICOM Diecasting" className="h-14 w-auto object-contain mr-6" />
          <div className="text-left">
            <h1 className="text-2xl font-bold uppercase tracking-widest text-black">HICOM Diecastings Sdn Bhd</h1>
            <p className="text-sm text-gray-600 mt-1 uppercase tracking-wide">Official Form Submission Document</p>
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-6 print:border-none print:shadow-none print:p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground print:text-black">
                {formTypeLabels[selectedSubmission.formType] || selectedSubmission.formType}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground print:text-gray-600 mt-1">Ref: {generateRefNo(selectedSubmission)}</p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <div className={`w-16 h-2 rounded-full ${overall.color}`} />
              <span className="text-xs font-medium text-foreground">{overall.label}</span>
            </div>
          </div>

          <div className="mb-6 sm:mb-8">
            {selectedSubmission.formType === 'cctv_access_request' && (
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Employee Information</p>
            )}
            {/* Explicitly place Employee Name at the top */}
            <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
              <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Employee Name</span>
              <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                {selectedSubmission.employeeName}
              </div>
            </div>
            
            {selectedSubmission.formType === 'cctv_access_request' ? (
              <>
                {[
                  ['Staff ID', selectedSubmission.data.staffId || selectedSubmission.data.employeeInfo?.employeeNumber || 'â€”'],
                  ['Department', selectedSubmission.department || 'â€”'],
                  ['Position', selectedSubmission.data.position || selectedSubmission.data.employeeInfo?.position || 'â€”'],
                ].map(([label, value]) => (
                  <div key={String(label)} className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                    <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">{label}</span>
                    <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{value}</div>
                  </div>
                ))}

                <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground print:mt-4">Request Details</p>
                {[
                  ['Type of Request', renderValue(selectedSubmission.data.requestTypes)],
                  ['Camera Location', selectedSubmission.data.cameraLocation || 'â€”'],
                  ['Purpose of Access', selectedSubmission.data.purpose || 'â€”'],
                  ['From Date & Time', selectedSubmission.data.fromDateTime ? new Date(selectedSubmission.data.fromDateTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'â€”'],
                  ['To Date & Time', selectedSubmission.data.toDateTime ? new Date(selectedSubmission.data.toDateTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'â€”'],
                  ['Head of Section', selectedSubmission.data.hosName || selectedSubmission.data.hos || 'â€”'],
                  ['Head of Department', selectedSubmission.data.hodName || selectedSubmission.data.hod || 'â€”'],
                ].map(([label, value]) => (
                  <div key={String(label)} className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start last:border-b-0">
                    <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">{label}</span>
                    <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{value}</div>
                  </div>
                ))}
              </>
            ) : selectedSubmission.formType === 'car_rental' ? (
              <>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Staff ID</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.staffId || selectedSubmission.data.employeeInfo?.staffNo || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Department</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.department || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Position</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.position || selectedSubmission.data.employeeInfo?.position || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">IC No.</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.icNo || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Mobile Number</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.mobileNumber || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Driving License No.</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.drivingLicenseNo || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Destination</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.destination || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Journey Type</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2 uppercase">{selectedSubmission.data.journeyType || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Purpose</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.purpose || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Journey Dates</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                    {selectedSubmission.data.fromDate ? new Date(selectedSubmission.data.fromDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} - {selectedSubmission.data.toDate ? new Date(selectedSubmission.data.toDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Head of Section</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.hos || selectedSubmission.data.hosName || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Head of Department</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.hod || selectedSubmission.data.hodName || "—"}</div>
                </div>
                
                {selectedSubmission.data.passengers && selectedSubmission.data.passengers.some((p: any) => p.name) && (
                  <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 flex flex-col items-start gap-2">
                    <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold">Passengers</span>
                    <div className="w-full text-xs sm:text-sm font-medium text-foreground print:text-black">
                      {renderValue(selectedSubmission.data.passengers.filter((p: any) => p.name))}
                    </div>
                  </div>
                )}
              </>
            ) : selectedSubmission.formType === 'leave' ? (
              <>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-3 gap-4 items-start">
                  <span className="text-xs text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Staff ID</span>
                  <div className="text-sm font-medium text-foreground print:text-black text-left break-words col-span-2">{selectedSubmission.data.employeeInfo?.staffNo || selectedSubmission.submittedBy || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-3 gap-4 items-start">
                  <span className="text-xs text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Department</span>
                  <div className="text-sm font-medium text-foreground print:text-black text-left break-words col-span-2">{selectedSubmission.department || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-3 gap-4 items-start">
                  <span className="text-xs text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Position</span>
                  <div className="text-sm font-medium text-foreground print:text-black text-left break-words col-span-2">{selectedSubmission.data.employeeInfo?.position || selectedSubmission.data.position || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-3 gap-4 items-start">
                  <span className="text-xs text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Pass Type</span>
                  <div className="text-sm font-medium text-foreground print:text-black text-left break-words col-span-2">
                    {selectedSubmission.data.purposeType === 'company' ? 'Company Business' : selectedSubmission.data.purposeType === 'personal' ? 'Personal Matter' : '—'}
                  </div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-3 gap-4 items-start">
                  <span className="text-xs text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Location</span>
                  <div className="text-sm font-medium text-foreground print:text-black text-left break-words col-span-2">
                    {selectedSubmission.data.purposeType === 'company' ? (selectedSubmission.data.companyDetails?.location || "—") : (selectedSubmission.data.personalDetails?.location || "—")}
                  </div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-3 gap-4 items-start">
                  <span className="text-xs text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Purpose</span>
                  <div className="text-sm font-medium text-foreground print:text-black text-left break-words col-span-2">
                    {selectedSubmission.data.purposeType === 'company' ? (selectedSubmission.data.companyDetails?.purpose || "—") : (selectedSubmission.data.personalDetails?.purpose || "—")}
                  </div>
                </div>
                {selectedSubmission.data.estimatedTime && (
                  <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-3 gap-4 items-start">
                    <span className="text-xs text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Estimated Time</span>
                    <div className="text-sm font-medium text-foreground print:text-black text-left break-words col-span-2">
                      Out: {selectedSubmission.data.estimatedTime.timeOut || "—"} &nbsp;|&nbsp; In: {selectedSubmission.data.estimatedTime.timeIn || "—"}
                    </div>
                  </div>
                )}
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-3 gap-4 items-start">
                  <span className="text-xs text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Head of Section</span>
                  <div className="text-sm font-medium text-foreground print:text-black text-left break-words col-span-2">{selectedSubmission.data.hosName || selectedSubmission.data.hos || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-3 gap-4 items-start">
                  <span className="text-xs text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Head of Department</span>
                  <div className="text-sm font-medium text-foreground print:text-black text-left break-words col-span-2">{selectedSubmission.data.hodName || selectedSubmission.data.hod || "—"}</div>
                </div>
              </>
            ) : selectedSubmission.formType === 'claim' ? (
              <>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Staff ID</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.employeeInfo?.employeeNumber || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Department</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.department || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Department Code</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.employeeInfo?.departmentCode || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Approvers</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                    HOS: {selectedSubmission.data.hosName || "—"}<br/>
                    HOD: {selectedSubmission.data.hodName || "—"}<br/>
                    HOP: {selectedSubmission.data.hopName || "—"}<br/>
                    HOF: {selectedSubmission.data.hofName || "—"}
                  </div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 flex flex-col items-start gap-2">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold">Claim Details</span>
                  <div className="w-full text-xs sm:text-sm font-medium text-foreground print:text-black">
                    {renderValue(selectedSubmission.data.claimRows)}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 w-full text-right">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Total Amount</p>
                    <p className="text-xl font-bold text-primary">RM {selectedSubmission.data.totalAmount?.toFixed(2) || "0.00"}</p>
                  </div>
                </div>
                {selectedSubmission.data.acknowledgedAt && (
                  <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                    <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Acknowledged On</span>
                    <div className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                      {new Date(selectedSubmission.data.acknowledgedAt).toLocaleString("en-GB")}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start last:border-b-0">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Position</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                    {selectedSubmission.data.position || selectedSubmission.data.employeeInfo?.position || "—"}
                  </div>
                </div>
                
                {Object.entries(selectedSubmission.data)
                  .filter(([key]) => !['name', 'hos', 'hod', 'remarks', 'avatar', 'licenseAttachment', 'securityLog', 'position', 'employeeInfo', 'claimRows', 'totalAmount', 'hosName', 'hodName', 'hopName', 'hofName', 'financeCode', 'amountReceived'].includes(key) && !isHiddenUserDetailField(key) && !/^\d+$/.test(key))
                  .map(([key, value]) => {
                    let formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
                    if (key === 'hosName') formattedKey = 'Head of Section';
                    if (key === 'hodName') formattedKey = 'Head of Department';
                    if (key === 'staffId') formattedKey = 'Staff ID';
                    if (key === 'icNo') formattedKey = 'IC No.';
                    if (key === 'employeeInfo') formattedKey = 'Employee Info';
                    if (key === 'companyDetails') formattedKey = 'Company Details';
                    if (key === 'personalDetails') formattedKey = 'Personal Details';
                    if (key === 'securityLog') formattedKey = 'Security Log';
                    if (key === 'claimRows') formattedKey = 'Claim Details';
                    if (key === 'purposeType') formattedKey = 'Purpose Type';
                    if (key === 'fromDateTime') formattedKey = 'From Date & Time';
                    if (key === 'toDateTime') formattedKey = 'To Date & Time';

                    const displayedValue = ['fromDateTime', 'toDateTime'].includes(key) && typeof value === 'string'
                      ? new Date(value).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : renderValue(value);

                    return (
                      <div key={key} className={`py-2 sm:py-4 border-b border-border print:border-gray-300 last:border-0 ${typeof value === 'object' && value !== null ? 'flex flex-col items-start gap-2' : 'grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start'}`}>
                        <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">{formattedKey}</span>
                        <div className={`text-xs sm:text-sm font-medium text-foreground print:text-black ${typeof value === 'object' && value !== null ? 'w-full' : 'text-left break-words sm:col-span-2 print:col-span-2'}`}>
                          {displayedValue}
                        </div>
                      </div>
                    );
                  })}
              </>
            )}

        {selectedSubmission.data.securityLog && (
          <div className="py-2 sm:py-4 border-b border-border print:border-gray-300">
            <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold">Gate Log</span>
            <div className="w-full flex mt-2 sm:mt-3 bg-muted/5 print:bg-transparent p-3 sm:p-4 rounded-lg border border-border print:border-gray-400">
              <div className="flex-1 border-r border-border/50 print:border-gray-300 pr-3 sm:pr-4">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 font-bold mb-0.5 sm:mb-1 block">Time Out</span>
                <span className="text-xs sm:text-sm font-semibold text-foreground print:text-black block">{selectedSubmission.data.securityLog.actualTimeOut || '—'}</span>
              </div>
              <div className="flex-1 pl-3 sm:pl-4">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 font-bold mb-0.5 sm:mb-1 block">Time In</span>
                <span className="text-xs sm:text-sm font-semibold text-foreground print:text-black block">{selectedSubmission.data.securityLog.actualTimeIn || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {selectedSubmission.data.licenseAttachment && (
          <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start print:hidden">
            <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Driving License</span>
            <a href={selectedSubmission.data.licenseAttachment} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1.5 text-left sm:col-span-2 print:col-span-2 print:text-black">
              <FileText className="h-4 w-4" /> View Document
            </a>
          </div>
        )}

        {/* Attachments Section */}
        {selectedSubmission.data.attachments && selectedSubmission.data.attachments.length > 0 && (
          <div className="mb-6 print:hidden">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Attachments</p>
            <div className="flex flex-wrap gap-3">
            {selectedSubmission.data.attachments.map((url: string, idx: number) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-full text-xs font-bold text-primary bg-muted/20 hover:bg-muted/30 transition-colors">
                  <FileText className="h-3.5 w-3.5" /> Attachment {idx + 1}
                </a>
            ))}
            </div>
          </div>
        )}




          </div>

          {selectedSubmission.data.remarks && (
            <div className={`p-3 sm:p-4 rounded-xl border mb-8 print:border-gray-300 ${selectedSubmission.status === 'rejected' ? 'bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'}`}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80 print:text-gray-500">Remarks / Ulasan</p>
              <p className="text-xs sm:text-sm font-medium print:text-black">"{selectedSubmission.data.remarks}"</p>
            </div>
          )}

          {selectedSubmission.formType === "it_help_desk" && selectedSubmission.status === "awaiting_confirmation" && (
            <div className="mb-8 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 sm:p-5 print:hidden">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-foreground">IT has provided a resolution</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Please verify that the solution works before this ticket is closed.</p>
                  <div className="mt-4 rounded-lg border border-border/60 bg-background/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resolution summary</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-foreground">{selectedSubmission.data.resolutionSummary || "No resolution summary provided."}</p>
                    <p className="mt-3 text-xs text-muted-foreground">Resolved by {selectedSubmission.data.resolvedBy || "IT Admin"}{selectedSubmission.data.resolvedAt ? ` on ${new Date(selectedSubmission.data.resolvedAt).toLocaleString("en-GB")}` : ""}</p>
                  </div>
                  <label htmlFor="resolution-response" className="mt-4 block text-sm font-semibold text-foreground">If the issue remains, explain what is still not working</label>
                  <textarea id="resolution-response" value={resolutionResponse} onChange={event => setResolutionResponse(event.target.value)} rows={3} placeholder="Required only when reopening the ticket..." className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button type="button" disabled={isRespondingToResolution} onClick={() => void handleResolutionResponse(false)} className="rounded-lg border border-amber-500 px-5 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-500/10 disabled:opacity-50">Issue Not Resolved</button>
                    <button type="button" disabled={isRespondingToResolution} onClick={() => void handleResolutionResponse(true)} className="btn-gold rounded-lg px-5 py-2.5 text-sm font-bold disabled:opacity-50">{isRespondingToResolution ? "Submitting..." : "Confirm Resolution"}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedSubmission.formType === 'it_help_desk' ? (
            <div className="rounded-lg bg-muted/30 p-4 text-center print:hidden">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Help Desk Status</p>
              <div className="mt-2">{statusBadge(selectedSubmission.status)}</div>
            </div>
          ) : selectedSubmission.formType === 'claim' ? (
            <div className="grid grid-cols-6 gap-1 sm:gap-2 p-2.5 sm:p-4 bg-muted/30 print:hidden rounded-lg mt-6 sm:mt-8 text-center">
              {[
                { name: "HOS", isApproved: isApprovedHOS, isRejected: isRejected && rejectedStage === "hos" },
                { name: "HOD", isApproved: isApprovedHOD, isRejected: isRejected && rejectedStage === "hod" },
                { name: "HOP", isApproved: isApprovedHOP, isRejected: isRejected && rejectedStage === "hop" },
                { name: "Finance Review", isApproved: isApprovedFinanceReview, isRejected: isRejected && rejectedStage === "finance_review" },
                { name: "HOF", isApproved: isApprovedHOF, isRejected: isRejected && rejectedStage === "hof" }, // HOF is after finance review
                { name: "Finance", isApproved: ["paid", "completed"].includes(selectedSubmission.status), isRejected: isRejected && rejectedStage === "admin" },
              ].map((stage, index) => (
                <div key={index} className="text-center border-r border-border last:border-0 flex flex-col items-center justify-between">
                  <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1.5 sm:mb-2 leading-tight">{stage.name}</p>
                  <div className="print:hidden w-full flex justify-center">{stage.isApproved ? statusBadge("approved") : stage.isRejected ? statusBadge("rejected") : isRejected ? naStatus() : statusBadge("pending")}</div>
                  <div className="hidden print:block font-bold text-[10px] sm:text-sm">
                    {stage.isApproved ? "APPROVED" : stage.isRejected ? "REJECTED" : isRejected ? "N/A" : "PENDING"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 sm:gap-4 p-2.5 sm:p-4 bg-muted/30 print:hidden rounded-lg mt-6 sm:mt-8">
              <div className="text-center border-r border-border last:border-0 flex flex-col items-center justify-between">
                <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1.5 sm:mb-2 leading-tight">Section Head</p>
                <div className="print:hidden w-full flex justify-center">
                  {isApprovedHOS ? statusBadge("approved") : (isRejected && rejectedStage === "hos") ? statusBadge("rejected") : (isRejected && rejectedStage === "admin") ? naStatus() : statusBadge("pending")}
                </div>
                <div className="hidden print:block font-bold text-[10px] sm:text-sm text-center">
                  {isApprovedHOS ? "APPROVED" : (isRejected && rejectedStage === "hos") ? "REJECTED" : (isRejected && rejectedStage === "admin") ? "N/A" : "PENDING"}
                </div>
              </div>
              <div className="text-center border-r border-border last:border-0 flex flex-col items-center justify-between">
                <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1.5 sm:mb-2 leading-tight">Dept Head</p>
                <div className="print:hidden w-full flex justify-center">                  {isApprovedHOD ? statusBadge("approved") : (isRejected && rejectedStage === "hod") ? statusBadge("rejected") : (isRejected && ["hos", "admin"].includes(rejectedStage)) ? naStatus() : statusBadge("pending")}
                </div>
                <div className="hidden print:block font-bold text-[10px] sm:text-sm">
                  {isApprovedHOD ? "APPROVED" : (isRejected && rejectedStage === "hod") ? "REJECTED" : (isRejected && ["hos", "finance_review", "admin"].includes(rejectedStage as string)) ? "N/A" : "PENDING"}
                </div>
              </div>
              <div className="text-center flex flex-col items-center justify-between">
                <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1.5 sm:mb-2 leading-tight">Admin</p>
                <div className="print:hidden w-full flex justify-center">                  {selectedSubmission.status === "approved" ? statusBadge("approved") : (isRejected && rejectedStage === "admin") ? statusBadge("rejected") : isRejected ? naStatus() : statusBadge("pending")}
                </div>
                <div className="hidden print:block font-bold text-[10px] sm:text-sm text-center">
                  {["approved", "paid", "completed", "on_leave"].includes(selectedSubmission.status) ? "APPROVED" : (isRejected && rejectedStage === "admin") ? "REJECTED" : isRejected ? "N/A" : "PENDING"}
                </div>
              </div>
            </div>
          )}

          {/* Print Footer */}
          <div className="hidden print:block mt-12 text-center text-xs text-gray-400">
            <p>This is computer generated and no signature is required.</p>
          </div>
        </div> {/* This was the closing div for the main modal content */}
      </div>
    );
  }

  if (assignedCarDetails) {
    return (
      <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAssignedCarDetails(null)}>
        <div className="card-elevated p-6 w-full max-w-lg relative animate-in fade-in-90 slide-in-from-bottom-10" onClick={e => e.stopPropagation()}> {/* This was the closing div for the main modal content */}
          <button onClick={() => setAssignedCarDetails(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted">
            <XCircle className="h-5 w-5" />
          </button>
          <div className="border-b border-border pb-4 mb-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {assignedCarDetails.imageUrl ? (
                  <img src={assignedCarDetails.imageUrl} alt={assignedCarDetails.model} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { e.stopPropagation(); setFullscreenImage(assignedCarDetails.imageUrl!); }} title="Click to enlarge" />
              ) : (
                <Car className="h-8 w-8 text-muted-foreground/50" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">Assigned Vehicle Details</h3>
              <p className="text-sm text-muted-foreground">Maklumat Kenderaan yang Ditetapkan</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            <div>
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Car Name</p>
              <p className="font-semibold text-foreground">{assignedCarDetails.model} ({assignedCarDetails.plateNumber})</p>
            </div>
            <div>
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Employee</p>
              <p className="font-semibold text-foreground">{assignedCarDetails.lastCheckedOutBy || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Date Out</p>
              <p className="font-semibold text-foreground">{assignedCarDetails.lastCheckedOutAt ? new Date(assignedCarDetails.lastCheckedOutAt).toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Mileage Out</p>
              <p className="font-semibold text-foreground">{assignedCarDetails.mileageOut ? `${assignedCarDetails.mileageOut} km` : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Fuel Level Out</p>
              <p className="font-semibold text-foreground">{assignedCarDetails.fuelLevelOut || "—"}</p>
            </div>
            {assignedCarDetails.remarksOut && (
              <div className="col-span-2 mt-1">
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Condition Remarks</p>
                <p className="font-semibold text-foreground">{assignedCarDetails.remarksOut}</p>
              </div>
            )}
          </div>
          <button onClick={() => setAssignedCarDetails(null)} className="mt-6 w-full py-2.5 rounded-lg bg-muted text-foreground font-medium text-sm hover:bg-muted/70 transition-colors">
            Close
          </button>
        </div>
      </div>
        
        {/* Fullscreen Image Preview Modal */}
        {fullscreenImage && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setFullscreenImage(null)}>
            <button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-black/50 transition-colors">
              <XCircle className="h-8 w-8" />
            </button>
            <img src={fullscreenImage} alt="Car fullscreen preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 slide-in-from-bottom-2 duration-500">
      <div className="mb-6">
        <div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">My Submissions</span> / <span className="font-semibold text-foreground">Permohonan Saya</span>
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <DashboardStatCard label="Total Submissions" value={stats.total} icon={FileText} tone="blue" />
        <DashboardStatCard label="Accepted / Diterima" value={stats.accepted} icon={CheckCircle} tone="emerald" />
        <DashboardStatCard label="Rejected / Ditolak" value={stats.rejected} icon={XCircle} tone="rose" />
      </div>

      {/* Filter Tabs */}
      <div className="card-elevated p-4 sm:p-5 mb-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Filter Submissions</p>
        <div className="flex w-full sm:w-fit max-w-full overflow-x-auto no-scrollbar rounded-xl border border-border bg-muted/50 p-1.5">
          {([
            { value: "all", label: "All" },
            { value: "action_required", label: "Action Required" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Accepted" },
            { value: "rejected", label: "Rejected" },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setIsViewAll(false); }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                filter === f.value
                  ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
              }`}
            >
              {f.label}
              {f.value === 'action_required' && stats.actionRequired > 0 && <Badge className="h-5 px-2 text-xs rounded-full bg-red-500 text-white">{stats.actionRequired}</Badge>}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No submissions found</h3>
          <p className="text-muted-foreground text-sm">There are no submissions matching the current filter.</p>
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Your Submissions</h2>
            {isSelectionMode ? (
              <div className="flex items-center gap-2">
                <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="px-4 py-2 text-sm font-bold text-foreground bg-muted rounded-lg hover:bg-muted/80">
                  Cancel
                </button>
                <button onClick={handleRemoveFromView} disabled={selectedIds.size === 0} className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  <EyeOff className="h-4 w-4" /> Remove from My View ({selectedIds.size})
                </button>
              </div>
            ) : (
              <button onClick={() => setIsSelectionMode(true)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors" title="Select submissions to remove from your view" aria-label="Select submissions to remove from your view">
                <EyeOff className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  {isSelectionMode && (
                    <TableHead className="w-12 px-4"></TableHead>
                  )}
                  <TableHead className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Ref No.</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider hidden sm:table-cell">Department</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Form Type</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center hidden md:table-cell">Section Head</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center hidden md:table-cell">Dept Head</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center hidden md:table-cell">Admin</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider min-w-[180px]">Overall Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isViewAll ? filtered : filtered.slice(0, 10)).map((sub) => {
                  const overall = getOverallStatus(sub);
                  const isApprovedCarRental = sub.formType === 'car_rental' && sub.status === 'approved';
                  const isPaidClaim = sub.formType === 'claim' && sub.status === 'paid' && sub.submittedBy === user?.id;
                  const rejectedStage = sub.data.rejectedStage || (sub.status === "rejected" ? "hos" : null);
                  const rejectedFromStatus = sub.data.rejectedFromStatus;
                  const wasApprovedByHosBeforeAdminRejection = rejectedStage === "admin" && rejectedFromStatus ? ["approved_hos", "approved_hod"].includes(rejectedFromStatus) : rejectedStage === "admin";
                  const wasApprovedByHodBeforeAdminRejection = rejectedStage === "admin" && rejectedFromStatus ? rejectedFromStatus === "approved_hod" : rejectedStage === "admin";
                  const isApprovedHOS = sub.data.hosName === 'N/A' || ["approved_hos", "approved_hod", "pending_finance_review", "approved_hop", "approved_hof", "approved", "paid", "completed"].includes(sub.status) || ["hod", "hop", "finance_review", "hof"].includes(rejectedStage as string) || wasApprovedByHosBeforeAdminRejection;
                  const isApprovedHOD = sub.data.hodName === 'N/A' || ["approved_hod", "pending_finance_review", "approved_hop", "approved_hof", "approved", "paid", "completed"].includes(sub.status) || ["hop", "finance_review", "hof"].includes(rejectedStage) || wasApprovedByHodBeforeAdminRejection;
                  const isRejected = sub.status === "rejected";

                  return (
                    <TableRow key={sub.id} className="hover:bg-muted/20">
                      {isSelectionMode && (
                        <TableCell className="px-4">
                          <Checkbox
                            checked={selectedIds.has(sub.id)}
                            onCheckedChange={() => handleToggleSelection(sub.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium text-primary text-sm whitespace-nowrap">{generateRefNo(sub)}</TableCell>
                      <TableCell className="text-sm text-foreground hidden sm:table-cell">{sub.department}</TableCell>
                      <TableCell className="text-sm text-foreground">{formTypeLabels[sub.formType] || sub.formType}</TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {isApprovedHOS ? statusBadge("approved") : (isRejected && rejectedStage === "hos") ? statusBadge("rejected") : (isRejected && rejectedStage === "admin") ? naStatus() : statusBadge("pending")}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {isApprovedHOD ? statusBadge("approved") : (isRejected && rejectedStage === "hod") ? statusBadge("rejected") : (isRejected && ["hos", "finance_review", "admin"].includes(rejectedStage as string)) ? naStatus() : statusBadge("pending")}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {sub.formType === 'claim' ?
                          (["paid", "completed"].includes(sub.status) ? statusBadge("approved") : (isRejected && rejectedStage === "admin") ? statusBadge("rejected") : isRejected ? naStatus() : statusBadge("pending")) :
                          (["approved", "completed"].includes(sub.status) ? statusBadge("approved") : (isRejected && rejectedStage === "admin") ? statusBadge("rejected") : isRejected ? naStatus() : statusBadge("pending"))
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${overall.color}`} style={{ width: `${overall.progress}%` }} />
                          </div>
                          <span className="text-xs font-medium text-foreground whitespace-nowrap">{overall.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setSelectedSubmission(sub)} className="text-xs sm:text-sm font-bold text-primary hover:underline">
                            View
                          </button>
                          {isApprovedCarRental && assignedCar && (
                            <button onClick={() => setAssignedCarDetails(assignedCar)} className="text-emerald-600 hover:text-emerald-700 p-1.5 rounded-md hover:bg-emerald-50 transition-colors" title="View Assigned Car">
                              <Car className="h-4 w-4" />
                            </button>
                          )}
                          {isPaidClaim && (
                            <button
                              onClick={() => handleAcknowledgeReceipt(sub)}
                              disabled={acknowledgingId === sub.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                              title="Acknowledge Receipt"
                            >
                              <HandCoins className="h-3.5 w-3.5" /> {acknowledgingId === sub.id ? "Saving..." : "Acknowledge"}
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Showing {Math.min(filtered.length, isViewAll ? filtered.length : 10)} of {filtered.length} entries</p>
            {filtered.length > 10 && (
              <button 
                onClick={() => setIsViewAll(!isViewAll)}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
              >
                {isViewAll ? "View Less" : "View More"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MySubmissions;
