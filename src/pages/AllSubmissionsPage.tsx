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
};

const statusBadge = (status: string, formType?: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">APPROVED</Badge>;
    case "rejected":
      return <Badge className="bg-destructive/15 text-destructive dark:text-red-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">REJECTED</Badge>;
    case "paid":
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">PAID</Badge>;
    case "completed":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">COMPLETED</Badge>;
    case "pending_finance_review":
      return <Badge className="bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">FINANCE REVIEW</Badge>;
    case "approved_hof":
      return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">HOF APPROVED</Badge>;
    case "approved_hop":
      return <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">HOP APPROVED</Badge>;
    case "approved_hod":
      if (formType === 'claim') {
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">PENDING HOP</Badge>;
      }
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">HOD APPROVED</Badge>;
    case "approved_hos":
      if (formType === 'leave' || formType === 'claim' || formType === 'car_rental') {
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">PENDING HOD</Badge>;
      }
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">HOS APPROVED</Badge>;
    case "pending":
    default:
      if (formType === 'leave' || formType === 'claim' || formType === 'car_rental') {
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">PENDING HOS</Badge>;
      }
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">PENDING</Badge>;
  }
};

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

    const isApprovedHOS = ["approved_hos", "approved_hod", "approved"].includes(selectedSubmission.status) || rejectedStage === "hod" || rejectedStage === "admin";
    const isApprovedHOD = ["approved_hod", "approved"].includes(selectedSubmission.status) || rejectedStage === "admin";
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
            <div className="py-2 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
              <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Employee Name</span>
              <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                {selectedSubmission.employeeName}
              </div>
            </div>
            
            {selectedSubmission.formType === 'car_rental' ? (
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
                <div className="py-2 border-b border-border print:border-gray-300 flex flex-col items-start gap-2">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold">Claim Details</span>
                  <div className="w-full text-xs sm:text-sm font-medium text-foreground print:text-black">
                    {renderValue(selectedSubmission.data.claimRows)}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 w-full text-right">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Total Amount</p>
                    <p className="text-xl font-bold text-primary">RM {selectedSubmission.data.totalAmount?.toFixed(2) || "0.00"}</p>
                  </div>
                </div>
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

          {selectedSubmission.data.remarks && (
            <div className={`p-3 sm:p-4 rounded-xl border mb-8 print:border-gray-300 ${selectedSubmission.status === 'rejected' ? 'bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'}`}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80 print:text-gray-500">Remarks / Ulasan</p>
              <p className="text-xs sm:text-sm font-medium print:text-black">"{selectedSubmission.data.remarks}"</p>
            </div>
          )}

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
              <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1.5 sm:mb-2 leading-tight">Admin</p>
              <div className="print:hidden w-full flex justify-center">
                {selectedSubmission.status === "approved" ? statusBadge("approved") : (isRejected && rejectedStage === "admin") ? statusBadge("rejected") : isRejected ? <Badge className="bg-muted text-muted-foreground border-0 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 tracking-wider">N/A</Badge> : statusBadge("pending")}
              </div>
              <div className="hidden print:block font-bold text-[10px] sm:text-sm">
                {selectedSubmission.status === "approved" ? "APPROVED" : (isRejected && rejectedStage === "admin") ? "REJECTED" : isRejected ? "N/A" : "PENDING"}
              </div>
            </div>
          </div>

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
            <div className="flex w-fit max-w-full overflow-x-auto no-scrollbar rounded-xl border border-black/25 bg-white/70 p-1.5 mt-3 shadow-sm backdrop-blur-xl dark:border-white/25 dark:bg-white/10">
              {(['all', 'car_rental', 'claim', 'leave'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setIsViewAll(false); }}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === tab
                      ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30"
                      : "text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10"
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
