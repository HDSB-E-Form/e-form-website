import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, ArrowLeft, Printer, FileText, Search, Calendar, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubmissions, type Submission } from "@/contexts/SubmissionsContext";
import logo from "@/assets/logo.png";
import { renderValue } from "@/components/DataRenderer";

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request",
  leave: "Gate Pass",
  claim: "Petty Cash Claim",
  ppe_request: "PPE | Uniform | Office Supplies",
  cctv_access_request: "CCTV Access Request",
  it_help_desk: "IT Help Desk",
};

const statusBadgeBase = "border-0 whitespace-nowrap text-[10px] sm:text-[11px] font-bold tracking-wider px-2 sm:px-3 py-0.5 sm:py-1";
const makeStatusBadge = (label: string, colors: string) => (
  <Badge className={`${colors} ${statusBadgeBase}`}>{label}</Badge>
);

const statusBadge = (status: string, formType?: string) => {
  switch (status) {
    case "approved":
      return makeStatusBadge("APPROVED", "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400");
    case "rejected":
      return makeStatusBadge("REJECTED", "bg-destructive/15 text-destructive dark:text-red-400");
    case "paid":
      return makeStatusBadge("PAID", "bg-blue-500/15 text-blue-700 dark:text-blue-400");
    case "completed":
      return makeStatusBadge("COMPLETED", "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400");
    case "awaiting_confirmation":
      return makeStatusBadge("AWAITING EMPLOYEE CONFIRMATION", "bg-sky-500/15 text-sky-700 dark:text-sky-400");
    case "reopened":
      return makeStatusBadge("REOPENED", "bg-amber-500/15 text-amber-700 dark:text-amber-400");
    case "pending_finance_review":
      return makeStatusBadge("PENDING FINANCE REVIEW", "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400");
    case "approved_hof":
      return makeStatusBadge("PENDING PAYMENT", "bg-green-500/15 text-green-700 dark:text-green-400");
    case "approved_hop":
      return makeStatusBadge("PENDING HOF", "bg-teal-500/15 text-teal-700 dark:text-teal-400");
    case "approved_hod":
      if (formType === 'claim') {
        return makeStatusBadge("PENDING HOP", "bg-amber-500/15 text-amber-700 dark:text-amber-400");
      }
      if (formType === 'cctv_access_request') {
        return makeStatusBadge("PENDING IT ADMIN", "bg-violet-500/15 text-violet-700 dark:text-violet-400");
      }
      if (formType === 'car_rental') {
        return makeStatusBadge("PENDING HR ADMIN", "bg-blue-500/15 text-blue-700 dark:text-blue-400");
      }
      if (formType === 'leave') {
        return makeStatusBadge("PENDING SECURITY", "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400");
      }
      return makeStatusBadge("HOD APPROVED", "bg-blue-500/15 text-blue-700 dark:text-blue-400");
    case "approved_hos":
      if (formType === 'leave' || formType === 'claim' || formType === 'car_rental' || formType === 'cctv_access_request') {
        return makeStatusBadge("PENDING HOD", "bg-amber-500/15 text-amber-700 dark:text-amber-400");
      }
      return makeStatusBadge("HOS APPROVED", "bg-amber-500/15 text-amber-700 dark:text-amber-400");
    case "pending":
    default:
      if (formType === 'it_help_desk') {
        return makeStatusBadge("ACTION REQUIRED", "bg-violet-500/15 text-violet-700 dark:text-violet-400");
      }
      if (formType === 'leave' || formType === 'claim' || formType === 'car_rental' || formType === 'cctv_access_request') {
        return makeStatusBadge("PENDING HOS", "bg-amber-500/15 text-amber-700 dark:text-amber-400");
      }
      return makeStatusBadge("PENDING", "bg-amber-500/15 text-amber-700 dark:text-amber-400");
  }
};

const naStatus = () => (
  makeStatusBadge("N/A", "bg-muted text-muted-foreground")
);

const AllSubmissionsPage = () => {
  const { submissions: allSubmissions, refNoMap, isLoading, refreshSubmissions } = useSubmissions();
  const excludedForms = ["inventory_addition", "ppe_request", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"];
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isViewAll, setIsViewAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'car_rental' | 'claim' | 'leave'>('all');

  useEffect(() => {
    refreshSubmissions();
  }, [refreshSubmissions]);

  const isDateFiltered = startDate !== "" || endDate !== "";

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
            <p className="font-semibold text-foreground">Loading all submissions…</p>
            <p className="text-sm text-muted-foreground">Retrieving the latest organization records.</p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-9 w-full sm:w-60" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        <div className="card-elevated overflow-hidden">
          <div className="border-b border-border p-5">
            <Skeleton className="h-6 w-32" />
            <div className="mt-3 flex gap-2 overflow-hidden">
              {[88, 120, 126, 96].map((width, index) => (
                <Skeleton key={index} className="h-8 flex-shrink-0 rounded-md" style={{ width }} />
              ))}
            </div>
          </div>
          <div className="p-5 space-y-5">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="hidden sm:block h-4 w-24" />
                <Skeleton className="hidden lg:block h-4 w-28" />
                <Skeleton className="hidden lg:block h-5 w-20 rounded-full" />
                <Skeleton className="hidden lg:block h-4 w-20 justify-self-end" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const submissions = allSubmissions
    .filter(s => !excludedForms.includes(s.formType))
    .filter(s => activeTab === 'all' ? true : s.formType === activeTab)
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      const dateStr = new Date(s.submittedAt).toLocaleDateString("en-CA");
      const typeStr = (formTypeLabels[s.formType] || s.formType).toLowerCase();
      return s.employeeName.toLowerCase().includes(q) ||
             s.id.toLowerCase().includes(q) ||
             typeStr.includes(q) ||
             dateStr.includes(q);
    })
    .filter(s => {
      if (!startDate && !endDate) return true;
      const subDate = new Date(s.submittedAt).toISOString().split('T')[0];
      const start = startDate || "0000-00-00";
      const end = endDate || "9999-12-31";
      return subDate >= start && subDate <= end;
    });

  const generateRefNo = (sub: Submission) => {
    if (sub.data?.refNo) return sub.data.refNo;
    return refNoMap.get(sub.id) || `HDSB-${sub.id.slice(-4)}`;
  };

  if (selectedSubmission) {
    const rejectedStage = selectedSubmission.data.rejectedStage || (selectedSubmission.status === "rejected" ? "hos" : null);
    const rejectedFromStatus = selectedSubmission.data.rejectedFromStatus;
    const financeRejectionReached = (statuses: string[]) => rejectedStage === "finance_review" &&
      (rejectedFromStatus ? statuses.includes(rejectedFromStatus) : true);

    const isApprovedHOS = selectedSubmission.data.hosName === 'N/A' || ["approved_hos", "approved_hod", "pending_finance_review", "approved_hop", "approved_hof", "approved", "paid", "completed", "on_leave"].includes(selectedSubmission.status) || ["hod", "hop", "hof"].includes(rejectedStage) || financeRejectionReached(["approved_hos", "approved_hod", "pending_finance_review", "approved_hop", "approved_hof"]);
    const isApprovedHOD = selectedSubmission.data.hodName === 'N/A' || ["approved_hod", "pending_finance_review", "approved_hop", "approved_hof", "approved", "paid", "completed", "on_leave"].includes(selectedSubmission.status) || ["hop", "hof"].includes(rejectedStage) || financeRejectionReached(["approved_hod", "pending_finance_review", "approved_hop", "approved_hof"]);
    const isApprovedHOP = selectedSubmission.data.hopName === 'N/A' || ["pending_finance_review", "approved_hop", "approved_hof", "approved", "paid", "completed"].includes(selectedSubmission.status) || ["hof", "admin"].includes(rejectedStage) || financeRejectionReached(["pending_finance_review", "approved_hop", "approved_hof"]);
    const isApprovedFinanceReview = ["approved_hop", "approved_hof", "approved", "paid", "completed"].includes(selectedSubmission.status) || ["hof", "admin"].includes(rejectedStage) || financeRejectionReached(["approved_hop", "approved_hof"]);
    const isApprovedHOF = selectedSubmission.data.hofName === 'N/A' || ["approved_hof", "approved", "paid", "completed"].includes(selectedSubmission.status) || rejectedStage === "admin";
    const isRejected = selectedSubmission.status === "rejected";

    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto print:absolute print:inset-0 print:max-w-none print:w-full print:bg-white print:text-black print:z-50 print:p-8 print:m-0">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
          <button onClick={() => setSelectedSubmission(null)} className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to All Submissions
          </button>
          <button onClick={() => {
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
          }} className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-foreground bg-muted hover:bg-muted/80 border border-border rounded-lg transition-all shadow-sm">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>

        {/* Print Header */}
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

        <div className="card-elevated p-4 sm:p-6 print:border-none print:shadow-none print:p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground print:text-black">
                {formTypeLabels[selectedSubmission.formType] || selectedSubmission.formType.replace("_", " ").toUpperCase()}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground print:text-gray-600 mt-1">Ref: {generateRefNo(selectedSubmission)}</p>
            </div>
            <div className="print:hidden">
              {statusBadge(selectedSubmission.status, selectedSubmission.formType)}
            </div>
          </div>

          <div className="mb-8">
            {['cctv_access_request', 'it_help_desk', 'car_rental', 'claim', 'leave'].includes(selectedSubmission.formType) && (
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Employee Information</p>
            )}
            <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
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
                  <div key={String(label)} className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
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
                  <div key={String(label)} className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start last:border-b-0">
                    <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">{label}</span>
                    <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{value}</div>
                  </div>
                ))}
              </>
            ) : selectedSubmission.formType === 'it_help_desk' ? (
              <>
                {[
                  ['Staff ID', selectedSubmission.data.staffId || selectedSubmission.data.employeeInfo?.employeeNumber || '—'],
                  ['Department', selectedSubmission.department || '—'],
                  ['Position', selectedSubmission.data.position || selectedSubmission.data.employeeInfo?.position || '—'],
                  ['Contact Email', selectedSubmission.data.contactEmail || '—'],
                  ['Superior Email', selectedSubmission.data.superiorEmail || '—'],
                ].map(([label, value]) => (
                  <div key={String(label)} className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                    <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">{label}</span>
                    <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{value}</div>
                  </div>
                ))}

                <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground print:mt-4">Ticket Details</p>
                {[
                  ['Urgency', selectedSubmission.data.urgency || '—'],
                  ['Report For', selectedSubmission.data.reportFor || '—'],
                  ['Type of Issue / Request', selectedSubmission.data.issueType || '—'],
                  ['Issue Explained / Request', selectedSubmission.data.issueExplanation || '—'],
                ].map(([label, value]) => (
                  <div key={String(label)} className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                    <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">{label}</span>
                    <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left whitespace-pre-wrap break-words sm:col-span-2 print:col-span-2">{value}</div>
                  </div>
                ))}

                {(selectedSubmission.data.resolutionSummary || selectedSubmission.data.reopenReason) && (
                  <>
                    <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground print:mt-4">Resolution Record</p>
                    {[
                      ['Resolution Summary', selectedSubmission.data.resolutionSummary || '—'],
                      ['Resolved By', selectedSubmission.data.resolvedBy || '—'],
                      ['Resolved At', selectedSubmission.data.resolvedAt ? new Date(selectedSubmission.data.resolvedAt).toLocaleString('en-GB') : '—'],
                      ['Reopen Reason', selectedSubmission.data.reopenReason],
                      ['Employee Confirmation', selectedSubmission.data.resolutionAcknowledgement],
                      ['Confirmed By', selectedSubmission.data.employeeConfirmedBy],
                      ['Confirmed At', selectedSubmission.data.employeeConfirmedAt ? new Date(selectedSubmission.data.employeeConfirmedAt).toLocaleString('en-GB') : undefined],
                    ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
                      <div key={String(label)} className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start last:border-b-0">
                        <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">{label}</span>
                        <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left whitespace-pre-wrap break-words sm:col-span-2 print:col-span-2">{value}</div>
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : selectedSubmission.formType === 'car_rental' ? (
              <>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Staff ID</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.staffId || selectedSubmission.data.employeeInfo?.staffNo || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Department</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.department || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Position</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.position || selectedSubmission.data.employeeInfo?.position || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">IC No.</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.icNo || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Mobile Number</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.mobileNumber || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Driving License No.</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.drivingLicenseNo || "—"}</div>
                </div>
                <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground print:mt-4">Booking Details</p>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Destination</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.destination || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Journey Type</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2 uppercase">{selectedSubmission.data.journeyType || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Purpose</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.purpose || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Journey Dates</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                    {selectedSubmission.data.fromDate ? new Date(selectedSubmission.data.fromDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} - {selectedSubmission.data.toDate ? new Date(selectedSubmission.data.toDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                </div>
                <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground print:mt-4">Approval Routing</p>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Head of Section</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.hos || selectedSubmission.data.hosName || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Head of Department</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.hod || selectedSubmission.data.hodName || "—"}</div>
                </div>
                
                {selectedSubmission.data.passengers && selectedSubmission.data.passengers.some((p: any) => p.name) && (
                  <div className="py-2 border-b border-border print:border-gray-300 flex flex-col items-start gap-2">
                    <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold">Passengers</span>
                    <div className="w-full text-xs sm:text-sm font-medium text-foreground print:text-black">
                      {renderValue(selectedSubmission.data.passengers.filter((p: any) => p.name))}
                    </div>
                  </div>
                )}
              </>
            ) : selectedSubmission.formType === 'leave' ? (
              <>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Staff ID</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.employeeInfo?.staffNo || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Department</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.department || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Position</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.employeeInfo?.position || "—"}</div>
                </div>
                <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground print:mt-4">Pass Details</p>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Pass Type</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                    {selectedSubmission.data.purposeType === 'company' ? 'Company Business' : selectedSubmission.data.purposeType === 'personal' ? 'Personal Matter' : '—'}
                  </div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Location</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                    {selectedSubmission.data.purposeType === 'company' ? (selectedSubmission.data.companyDetails?.location || "—") : (selectedSubmission.data.personalDetails?.location || "—")}
                  </div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Purpose</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                    {selectedSubmission.data.purposeType === 'company' ? (selectedSubmission.data.companyDetails?.purpose || "—") : (selectedSubmission.data.personalDetails?.purpose || "—")}
                  </div>
                </div>
                {selectedSubmission.data.estimatedTime && (
                  <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                    <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Estimated Time</span>
                    <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                      Out: {selectedSubmission.data.estimatedTime.timeOut || "—"} &nbsp;|&nbsp; In: {selectedSubmission.data.estimatedTime.timeIn || "—"}
                    </div>
                  </div>
                )}
                <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground print:mt-4">Approval Routing</p>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Head of Section</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.hosName || selectedSubmission.data.hos || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Head of Department</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.hodName || selectedSubmission.data.hod || "—"}</div>
                </div>
              </>
            ) : selectedSubmission.formType === 'claim' ? (
              <>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Staff ID</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.employeeInfo?.employeeNumber || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Department</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.department || "—"}</div>
                </div>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Department Code</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.employeeInfo?.departmentCode || "—"}</div>
                </div>
                <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground print:mt-4">Claim Details</p>
                <div className="py-2 border-b border-border print:border-gray-300 flex flex-col items-start gap-2">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold">Expense Items</span>
                  <div className="w-full text-xs sm:text-sm font-medium text-foreground print:text-black">
                    {renderValue(selectedSubmission.data.claimRows)}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 w-full text-right">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Total Amount</p>
                    <p className="text-xl font-bold text-primary">RM {selectedSubmission.data.totalAmount?.toFixed(2) || "0.00"}</p>
                  </div>
                </div>
                <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground print:mt-4">Approval Routing</p>
                <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Approvers</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                    HOS: {selectedSubmission.data.hosName || "—"}<br/>
                    HOD: {selectedSubmission.data.hodName || "—"}<br/>
                    HOP: {selectedSubmission.data.hopName || "—"}<br/>
                    HOF: {selectedSubmission.data.hofName || "—"}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-muted/30 rounded-xl p-4 my-4 border border-border/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Department</p>
                      <p className="font-semibold text-sm text-foreground">{selectedSubmission.department || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Position</p>
                      <p className="font-semibold text-sm text-foreground">{selectedSubmission.data.position || selectedSubmission.data.employeeInfo?.position || "—"}</p>
                    </div>
                  </div>
                </div>
                {Object.entries(selectedSubmission.data)
                  .filter(([key]) => !['name', 'hos', 'hod', 'remarks', 'avatar', 'licenseAttachment', 'securityLog', 'position', 'attachments', 'attachment', 'totalAmount'].includes(key) && !/^\d+$/.test(key))
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
                    if (key === 'licenseAttachment') formattedKey = 'Driving License Attachment';

                    return (
                      <div key={key} className={`py-2 border-b border-border print:border-gray-300 last:border-0 ${typeof value === 'object' && value !== null ? 'flex flex-col items-start gap-2' : 'grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start'}`}>
                        <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">{formattedKey}</span>
                        <div className={`text-xs sm:text-sm font-medium text-foreground print:text-black ${typeof value === 'object' && value !== null ? 'w-full' : 'text-left break-words sm:col-span-2 print:col-span-2'}`}>
                          {renderValue(value)}
                        </div>
                      </div>
                    );
                  })}
              </>
            )}

        {selectedSubmission.data.securityLog && (
          <div className="py-2 border-b border-border print:border-gray-300">
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

        {(selectedSubmission.data.attachments?.length > 0 || selectedSubmission.data.attachment || selectedSubmission.data.licenseAttachment) && (
          <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start print:hidden">
            <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Attachments</span>
            <div className="sm:col-span-2 print:col-span-2 flex flex-col gap-2">
              {(selectedSubmission.data.attachments || [selectedSubmission.data.attachment, selectedSubmission.data.licenseAttachment].filter(Boolean)).map((url: string, idx: number) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1.5 text-left print:text-black">
                  <FileText className="h-4 w-4" />
                  View Attachment {idx + 1}
                </a>
              ))}
            </div>
          </div>
        )}

          </div>

          {selectedSubmission.data.remarks && selectedSubmission.formType !== 'it_help_desk' && (
            <div className={`p-3 sm:p-4 rounded-xl border mb-8 print:border-gray-300 ${selectedSubmission.status === 'rejected' ? 'bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'}`}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80 print:text-gray-500">Remarks / Ulasan</p>
              <p className="text-xs sm:text-sm font-medium print:text-black">"{selectedSubmission.data.remarks}"</p>
            </div>
          )}

          {selectedSubmission.formType === 'it_help_desk' ? (
            <div className="grid grid-cols-1 gap-2 rounded-lg bg-muted/30 p-3 sm:grid-cols-3 sm:p-4 print:hidden">
              {[
                { name: "Submitted to IT", done: true, label: "RECEIVED" },
                { name: "IT Resolution", done: ["awaiting_confirmation", "completed"].includes(selectedSubmission.status), label: selectedSubmission.status === "reopened" ? "REOPENED" : "RESOLVED" },
                { name: "Employee Confirmation", done: selectedSubmission.status === "completed", label: "CONFIRMED" },
              ].map(stage => (
                <div key={stage.name} className="flex min-h-20 flex-col items-center justify-between rounded-lg border border-border/70 bg-background/60 p-3 text-center">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stage.name}</p>
                  <Badge className={`border-0 text-[10px] font-bold ${stage.done ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : selectedSubmission.status === "reopened" && stage.name === "IT Resolution" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>{stage.done ? stage.label : selectedSubmission.status === "reopened" && stage.name === "IT Resolution" ? "REOPENED" : "PENDING"}</Badge>
                </div>
              ))}
            </div>
          ) : selectedSubmission.formType === 'claim' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-2.5 sm:p-4 bg-muted/30 print:hidden rounded-lg mt-6 sm:mt-8">
              {[
                { name: "HOS", isApproved: isApprovedHOS, isRejected: isRejected && rejectedStage === "hos" },
                { name: "HOD", isApproved: isApprovedHOD, isRejected: isRejected && rejectedStage === "hod" },
                { name: "HOP", isApproved: isApprovedHOP, isRejected: isRejected && rejectedStage === "hop" },
                { name: "Finance Review", isApproved: isApprovedFinanceReview, isRejected: isRejected && rejectedStage === "finance_review" },
                { name: "HOF", isApproved: isApprovedHOF, isRejected: isRejected && rejectedStage === "hof" },
                { name: "Payment", isApproved: ["paid", "completed"].includes(selectedSubmission.status), isRejected: isRejected && rejectedStage === "admin" },
              ].map(stage => (
                <div key={stage.name} className="flex min-h-20 flex-col items-center justify-between rounded-lg border border-border/70 bg-background/60 p-2 text-center">
                  <p className="mb-2 text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider font-bold leading-tight">{stage.name}</p>
                  <div className="flex w-full justify-center">
                    {stage.isApproved ? statusBadge("approved") : stage.isRejected ? statusBadge("rejected") : isRejected ? naStatus() : statusBadge("pending")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-3 gap-1 sm:gap-4 p-2.5 sm:p-4 bg-muted/30 print:hidden rounded-lg mt-6 sm:mt-8">
            <div className="text-center border-r border-border last:border-0 flex flex-col items-center justify-between">
              <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1.5 sm:mb-2 leading-tight">Section Head</p>
              <div className="print:hidden w-full flex justify-center">
                {isApprovedHOS ? statusBadge("approved") : (isRejected && rejectedStage === "hos") ? statusBadge("rejected") : statusBadge("pending")}
              </div>
              <div className="hidden print:block font-bold text-[10px] sm:text-sm">
                {isApprovedHOS ? "APPROVED" : (isRejected && rejectedStage === "hos") ? "REJECTED" : "PENDING"}
              </div>
            </div>
            <div className="text-center border-r border-border last:border-0 flex flex-col items-center justify-between">
              <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1.5 sm:mb-2 leading-tight">Dept Head</p>
              <div className="print:hidden w-full flex justify-center">
                {isApprovedHOD ? statusBadge("approved") : (isRejected && rejectedStage === "hod") ? statusBadge("rejected") : (isRejected && rejectedStage === "hos") ? <Badge className="bg-muted text-muted-foreground border-0 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 tracking-wider">N/A</Badge> : statusBadge("pending")}
              </div>
              <div className="hidden print:block font-bold text-[10px] sm:text-sm">
                {isApprovedHOD ? "APPROVED" : (isRejected && rejectedStage === "hod") ? "REJECTED" : (isRejected && rejectedStage === "hos") ? "N/A" : "PENDING"}
              </div>
            </div>
            <div className="text-center flex flex-col items-center justify-between">
              <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1.5 sm:mb-2 leading-tight">
                {selectedSubmission.formType === 'car_rental' ? 'HR Admin' : selectedSubmission.formType === 'cctv_access_request' ? 'IT Admin' : selectedSubmission.formType === 'leave' ? 'Security' : 'Admin'}
              </p>
              <div className="print:hidden w-full flex justify-center">
                {selectedSubmission.status === "approved" ? statusBadge("approved") : (isRejected && rejectedStage === "admin") ? statusBadge("rejected") : isRejected ? <Badge className="bg-muted text-muted-foreground border-0 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 tracking-wider">N/A</Badge> : statusBadge("pending")}
              </div>
              <div className="hidden print:block font-bold text-[10px] sm:text-sm">
                {selectedSubmission.status === "approved" ? "APPROVED" : (isRejected && rejectedStage === "admin") ? "REJECTED" : isRejected ? "N/A" : "PENDING"}
              </div>
            </div>
          </div>
          )}

          {/* Print Footer */}
          <div className="hidden print:block mt-12 text-center text-xs text-gray-400">
            <p>This is computer generated and no signature is required.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">All System Submissions</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor all form submissions across the entire organization.</p>
      </div>

      <div className="mb-6 bg-muted/20 p-4 rounded-xl border border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row lg:flex-wrap lg:items-center gap-4">
          <div className="relative lg:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, date, or type..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setIsViewAll(false); }} 
              className="pl-9 pr-9 w-full lg:w-52 xl:w-60 h-9 text-sm" />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full transition-colors"
                title="Clear search"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-muted-foreground">From:</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-full text-xs dark:[color-scheme:dark]" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-muted-foreground">To:</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-full text-xs dark:[color-scheme:dark]" />
          </div>
          <div className="flex items-center gap-2 pt-2 sm:col-span-2 lg:col-auto lg:pt-0 lg:border-l lg:border-border lg:pl-3">
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => { const today = new Date().toISOString().split('T')[0]; setStartDate(today); setEndDate(today); }}>Today</Button>
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => {
                const today = new Date();
                const last7 = new Date(today);
                last7.setDate(today.getDate() - 7);
                setStartDate(last7.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
            }}>Last 7 Days</Button>
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => {
                const today = new Date();
                const last30 = new Date(today);
                last30.setDate(today.getDate() - 30);
                setStartDate(last30.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
            }}>Last 30 Days</Button>
            {isDateFiltered && (
              <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={() => { setStartDate(""); setEndDate(""); }}>
                <XCircle className="h-4 w-4 mr-1.5" /> Clear Dates
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Submissions</h2>
            <div className="flex w-fit max-w-full overflow-x-auto no-scrollbar rounded-xl border border-border bg-muted/50 p-1.5 mt-3">
              {(['all', 'car_rental', 'claim', 'leave'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setIsViewAll(false); }}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === tab
                      ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                  }`}
                >
                  {tab === 'all' ? 'All Forms' : formTypeLabels[tab] || tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs font-bold uppercase tracking-wider">Ref No.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Employee</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Type</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isViewAll ? submissions : submissions.slice(0, 10)).map((sub) => (
              <TableRow key={sub.id} className="hover:bg-muted/20">
                <TableCell className="font-medium text-primary text-sm whitespace-nowrap">{generateRefNo(sub)}</TableCell>
                <TableCell className="font-medium text-foreground">{sub.employeeName}</TableCell>
                <TableCell className="uppercase text-xs font-bold text-foreground">{formTypeLabels[sub.formType] || sub.formType.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(sub.submittedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</TableCell>
                <TableCell>{statusBadge(sub.status, sub.formType)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setSelectedSubmission(sub)} className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors">
                      View Details
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedSubmission(sub);
                        
                        const isDark = document.documentElement.classList.contains('dark');
                        if (isDark) document.documentElement.classList.remove('dark');

                        setTimeout(() => {
                          const originalTitle = document.title;
                          document.title = generateRefNo(sub);
                          window.onafterprint = () => {
                            document.title = originalTitle;
                            if (isDark) document.documentElement.classList.add('dark');
                            window.onafterprint = null;
                          };
                          window.print();
                          setTimeout(() => { document.title = originalTitle; }, 2000);
                        }, 100);
                      }} 
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Print"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        {submissions.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
            No submissions found in the system.
          </div>
        )}
        {submissions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Showing {Math.min(submissions.length, isViewAll ? submissions.length : 10)} of {submissions.length} entries</p>
            {submissions.length > 10 && (
              <button 
                onClick={() => setIsViewAll(!isViewAll)}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
              >
                {isViewAll ? "View Less" : "View More"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllSubmissionsPage;
