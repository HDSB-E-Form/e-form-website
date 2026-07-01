import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission, type CarInfo } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, ArrowLeft, Printer, Car } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import logo from "@/assets/logo.png";

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request / Permintaan Kenderaan",
  leave: "Gate Pass",
  claim: "Petty Cash Claim / Tuntutan Panjar Wang Runcit",
  ppe_request: "PPE / Uniform / Office Supplies",
};

type FilterType = "all" | "pending" | "approved" | "rejected";

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">APPROVED</Badge>;
    case "rejected":
      return <Badge className="bg-destructive/15 text-destructive dark:text-red-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">REJECTED</Badge>;
    case "pending":
    default:
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">PENDING</Badge>;
  }
};

const naStatus = () => (
  <Badge className="bg-muted text-muted-foreground border-0 text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1">N/A</Badge>
);

const getOverallStatus = (sub: Submission) => {
  if (sub.status === "rejected") return { label: "Rejected", color: "bg-destructive", progress: 100 };
  if (sub.status === "approved") return { label: "Fully Approved", color: "bg-emerald-500", progress: 100 };
  if (sub.formType === 'claim') {
    if (sub.status === "approved_hof") return { label: "Pending Finance Admin", color: "bg-teal-500", progress: 95 };
    if (sub.status === "approved_hop") return { label: "Pending HOF", color: "bg-sky-500", progress: 85 };
    if (sub.status === "approved_hod") return { label: "Pending HOP", color: "bg-blue-500", progress: 75 };
  } else {
    // Standard HOD approval for other forms
    if (sub.status === "approved_hod") return { label: "Pending Admin", color: "bg-blue-500", progress: 75 };
  }
  if (sub.status === "approved_hos") return { label: "Pending HOD", color: "bg-sky-500", progress: 50 };
  return { label: "Pending HOS", color: "bg-muted-foreground/50", progress: 25 };
};

const renderValue = (val: any): React.ReactNode => {
  if (val === null || val === undefined || val === "") return "—";
  
  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    if (typeof val[0] === 'string' && val[0].startsWith('http')) {
      return (
        <div className="flex flex-col gap-2 mt-1">
          {val.map((url, idx) => (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary font-bold hover:underline inline-flex items-center gap-1.5 w-fit">
              <FileText className="h-4 w-4" /> View Attachment {idx + 1}
            </a>
          ))}
        </div>
      );
    }
    if (typeof val[0] === 'object' && val[0] !== null) {
      // Filter out rows that are entirely empty (e.g. empty passenger slots)
      const validRows = val.filter(row => row && typeof row === 'object' && Object.values(row).some(v => v !== "" && v !== null));
      if (validRows.length === 0) return "—";

      let keys = Object.keys(validRows[0]).filter(k => k !== 'avatar');

      // Specifically for claim forms, enforce the column order.
      if (keys.includes('description') && keys.includes('receiptNo') && keys.includes('amount')) {
        keys = ['description', 'receiptNo', 'amount'];
      }

      return (
        <div className="mt-3 w-full border border-border rounded-lg overflow-x-auto print:border-gray-400">
          <Table className="w-full text-left border-collapse">
            <TableHeader className="bg-muted/50 print:bg-gray-100">
              <TableRow>
                {keys.map(k => (
                  <TableHead key={k} className="text-[10px] sm:text-xs uppercase font-bold p-2 sm:p-3 text-muted-foreground print:text-gray-600 whitespace-nowrap">
                    {k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {validRows.map((row, i) => (
                <TableRow key={i} className="border-b border-border print:border-gray-300 last:border-0 hover:bg-muted/20">
                  {keys.map((k, j) => (
                    <TableCell key={j} className="text-xs sm:text-sm p-2 sm:p-3 whitespace-nowrap print:text-black">
                      {row[k] !== undefined && row[k] !== null && row[k] !== "" ? String(row[k]) : "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }
    return val.join(", ");
  }
  
  if (typeof val === 'object' && val !== null) {
    const entries = Object.entries(val).filter(([k, v]) => v !== "" && v !== null && k !== 'avatar');
    if (entries.length === 0) return "—";
    return (
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mt-2 sm:mt-3 bg-muted/5 print:bg-transparent p-3 sm:p-4 rounded-lg border border-border print:border-gray-400">
        {entries.map(([k, v]) => (
          <div key={k} className="flex flex-col border-b border-border/50 print:border-gray-300 pb-1.5 last:border-0 last:pb-0 sm:last:pb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 font-bold mb-0.5 sm:mb-1">
              {k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1")}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-foreground print:text-black">
              {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  
  // Format URL strings beautifully as clickable links
  if (typeof val === 'string' && val.startsWith('http')) {
    return (
      <a href={val} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary font-bold hover:underline inline-flex items-center gap-1.5">
         <FileText className="h-4 w-4" /> View Attachment
      </a>
    );
  }

  return String(val);
};

const MySubmissions = () => {
  const { user } = useAuth();
  const { submissions, cars } = useSubmissions();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [assignedCarDetails, setAssignedCarDetails] = useState<CarInfo | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isViewAll, setIsViewAll] = useState(false);

  const assignedCar = cars.find(c => c.status === 'checked_out' && c.lastCheckedOutBy === user?.name);

  const excludedForms = ["inventory_addition", "ppe_request", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"];
  const mySubmissions = submissions.filter(s => s.submittedBy === user?.id && !excludedForms.includes(s.formType));

  const stats = {
    total: mySubmissions.length,
    accepted: mySubmissions.filter(s => s.status === "approved").length,
    rejected: mySubmissions.filter(s => s.status === "rejected").length,
  };

  const filtered = mySubmissions.filter(s => {
    if (filter === "all") return true;
    if (filter === "pending") return s.status === "pending" || s.status === "approved_hos" || s.status === "approved_hod";
    if (filter === "approved") return s.status === "approved";
    if (filter === "rejected") return s.status === "rejected";
    return true;
  });

  const refNoMap = useMemo(() => {
    const map = new Map<string, string>();
    const standardForms = submissions
      .filter(s => !excludedForms.includes(s.formType))
      .sort((a, b) => {
        const timeDiff = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        return timeDiff !== 0 ? timeDiff : a.id.localeCompare(b.id);
      });
    standardForms.forEach((s, idx) => {
      map.set(s.id, `HDSB-${String(idx + 1).padStart(4, "0")}`);
    });
    return map;
  }, [submissions]);

  const generateRefNo = (sub: Submission) => {
    return refNoMap.get(sub.id) || `HDSB-${sub.id.replace(/\D/g, "").slice(0, 4).padStart(4, "0")}`;
  };

  if (selectedSubmission) {
    const overall = getOverallStatus(selectedSubmission);
    
    const rejectedStage = selectedSubmission.data.rejectedStage;

    const isApprovedHOS = ["approved_hos", "approved_hod", "approved_hop", "approved_hof", "approved"].includes(selectedSubmission.status) || 
                          ["hod", "hop", "hof", "admin"].includes(rejectedStage);
    const isApprovedHOD = ["approved_hod", "approved_hop", "approved_hof", "approved"].includes(selectedSubmission.status) || 
                          ["hop", "hof", "admin"].includes(rejectedStage);
    const isApprovedHOP = ["approved_hop", "approved_hof", "approved"].includes(selectedSubmission.status) || 
                          ["hof", "admin"].includes(rejectedStage);
    const isApprovedHOF = ["approved_hof", "approved"].includes(selectedSubmission.status) || 
                          ["admin"].includes(rejectedStage);
    const isRejected = selectedSubmission.status === "rejected";

    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto print:absolute print:inset-0 print:max-w-none print:w-full print:bg-white print:text-black print:z-50 print:p-8 print:m-0">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
          <button onClick={() => setSelectedSubmission(null)} className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to list
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
            {/* Explicitly place Employee Name at the top */}
            <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
              <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Employee Name</span>
              <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                {selectedSubmission.employeeName}
              </div>
            </div>
            
            {selectedSubmission.formType === 'car_rental' ? (
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
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">License Expiry</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                    {selectedSubmission.data.drivingLicenseExpiry ? new Date(selectedSubmission.data.drivingLicenseExpiry).toLocaleDateString("en-GB") : "—"}
                  </div>
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
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Staff ID</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.employeeInfo?.staffNo || selectedSubmission.submittedBy || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Department</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.department || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Position</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.employeeInfo?.position || selectedSubmission.data.position || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Pass Type</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                    {selectedSubmission.data.purposeType === 'company' ? 'Company Business' : selectedSubmission.data.purposeType === 'personal' ? 'Personal Matter' : '—'}
                  </div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Location</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                    {selectedSubmission.data.purposeType === 'company' ? (selectedSubmission.data.companyDetails?.location || "—") : (selectedSubmission.data.personalDetails?.location || "—")}
                  </div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Purpose</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                    {selectedSubmission.data.purposeType === 'company' ? (selectedSubmission.data.companyDetails?.purpose || "—") : (selectedSubmission.data.personalDetails?.purpose || "—")}
                  </div>
                </div>
                {selectedSubmission.data.estimatedTime && (
                  <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                    <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Estimated Time</span>
                    <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                      Out: {selectedSubmission.data.estimatedTime.timeOut || "—"} &nbsp;|&nbsp; In: {selectedSubmission.data.estimatedTime.timeIn || "—"}
                    </div>
                  </div>
                )}
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Head of Section</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.hosName || selectedSubmission.data.hos || "—"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Head of Department</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.hodName || selectedSubmission.data.hod || "—"}</div>
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
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Total Amount</span>
                  <div className="text-xs sm:text-sm font-bold text-primary print:text-black text-left break-words sm:col-span-2 print:col-span-2">RM {selectedSubmission.data.totalAmount || "0.00"}</div>
                </div>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 flex flex-col items-start gap-2">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold">Claim Details</span>
                  <div className="w-full text-xs sm:text-sm font-medium text-foreground print:text-black">
                    {renderValue(selectedSubmission.data.claimRows)}
                  </div>
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
              </>
            ) : (
              <>
                <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Position</span>
                  <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                    {selectedSubmission.data.position || selectedSubmission.data.employeeInfo?.position || "—"}
                  </div>
                </div>
                
                {Object.entries(selectedSubmission.data)
                  .filter(([key]) => !['name', 'hos', 'hod', 'remarks', 'avatar', 'licenseAttachment', 'securityLog', 'position', 'employeeInfo', 'claimRows', 'totalAmount', 'hosName', 'hodName', 'hopName', 'hofName'].includes(key) && !/^\d+$/.test(key))
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

                    return (
                      <div key={key} className={`py-2 sm:py-4 border-b border-border print:border-gray-300 last:border-0 ${typeof value === 'object' && value !== null ? 'flex flex-col items-start gap-2' : 'grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start'}`}>
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
          </div>

          {selectedSubmission.data.remarks && (
            <div className={`p-3 sm:p-4 rounded-xl border mb-8 print:border-gray-300 ${selectedSubmission.status === 'rejected' ? 'bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'}`}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80 print:text-gray-500">Remarks / Ulasan</p>
              <p className="text-xs sm:text-sm font-medium print:text-black">"{selectedSubmission.data.remarks}"</p>
            </div>
          )}

          {selectedSubmission.formType === 'claim' ? (
            <div className="grid grid-cols-5 gap-1 sm:gap-2 p-2.5 sm:p-4 bg-muted/30 print:hidden rounded-lg mt-6 sm:mt-8">
              {[
                { name: "Section Head", isApproved: isApprovedHOS, isRejected: isRejected && rejectedStage === "hos" },
                { name: "Dept Head", isApproved: isApprovedHOD, isRejected: isRejected && rejectedStage === "hod" },
                { name: "Purchasing", isApproved: isApprovedHOP, isRejected: isRejected && rejectedStage === "hop" },
                { name: "Finance Head", isApproved: isApprovedHOF, isRejected: isRejected && rejectedStage === "hof" },
                { name: "Finance Admin", isApproved: selectedSubmission.status === "approved", isRejected: isRejected && rejectedStage === "admin" },
              ].map((stage, index) => (
                <div key={index} className="text-center border-r border-border last:border-0 flex flex-col items-center justify-between">
                  <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1.5 sm:mb-2 leading-tight">{stage.name}</p>
                  <div className="print:hidden w-full flex justify-center">
                    {stage.isApproved ? statusBadge("approved") : stage.isRejected ? statusBadge("rejected") : isRejected ? naStatus() : statusBadge("pending")}
                  </div>
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
                  {isApprovedHOS ? statusBadge("approved") : (isRejected && rejectedStage === "hos") ? statusBadge("rejected") : statusBadge("pending")}
                </div>
                <div className="hidden print:block font-bold text-[10px] sm:text-sm">
                  {isApprovedHOS ? "APPROVED" : (isRejected && rejectedStage === "hos") ? "REJECTED" : "PENDING"}
                </div>
              </div>
              <div className="text-center border-r border-border last:border-0 flex flex-col items-center justify-between">
                <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1.5 sm:mb-2 leading-tight">Dept Head</p>
                <div className="print:hidden w-full flex justify-center">                  {isApprovedHOD ? statusBadge("approved") : (isRejected && rejectedStage === "hod") ? statusBadge("rejected") : (isRejected && rejectedStage === "hos") ? naStatus() : statusBadge("pending")}
                </div>
                <div className="hidden print:block font-bold text-[10px] sm:text-sm">
                  {isApprovedHOD ? "APPROVED" : (isRejected && rejectedStage === "hod") ? "REJECTED" : (isRejected && rejectedStage === "hos") ? "N/A" : "PENDING"}
                </div>
              </div>
              <div className="text-center flex flex-col items-center justify-between">
                <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1.5 sm:mb-2 leading-tight">Admin</p>
                <div className="print:hidden w-full flex justify-center">                  {selectedSubmission.status === "approved" ? statusBadge("approved") : (isRejected && rejectedStage === "admin") ? statusBadge("rejected") : isRejected ? naStatus() : statusBadge("pending")}
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

  if (assignedCarDetails) {
    return (
      <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAssignedCarDetails(null)}>
        <div className="card-elevated p-6 w-full max-w-lg relative animate-in fade-in-90 slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
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
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">My Submissions</span> / <span className="font-semibold text-foreground">Permohonan Saya</span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-elevated p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Submissions</p>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          </div>
        </div>
        <div className="card-elevated p-5 flex items-center gap-4 hover:bg-emerald-500/5 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Accepted / Diterima</p>
            <p className="text-3xl font-bold text-foreground">{stats.accepted}</p>
          </div>
        </div>
        <div className="card-elevated p-5 flex items-center gap-4 hover:bg-destructive/5 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-destructive/15 flex items-center justify-center flex-shrink-0">
            <XCircle className="h-6 w-6 text-destructive dark:text-red-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rejected / Ditolak</p>
            <p className="text-3xl font-bold text-foreground">{stats.rejected}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex w-full overflow-x-auto no-scrollbar gap-2 mb-6 pb-1">
        {([
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Accepted" },
          { value: "rejected", label: "Rejected" },
        ] as { value: FilterType; label: string }[]).map(f => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setIsViewAll(false); }}
            className={`flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-colors border ${
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No submissions yet</h3>
          <p className="text-muted-foreground text-sm">Submit a form from the home page to see it here</p>
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
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
                const rejectedStage = sub.data.rejectedStage || (sub.status === "rejected" ? "hos" : null);
                const isApprovedHOS = ["approved_hos", "approved_hod", "approved_hop", "approved_hof", "approved"].includes(sub.status) || ["hod", "hop", "hof", "admin"].includes(rejectedStage);
                const isApprovedHOD = ["approved_hod", "approved_hop", "approved_hof", "approved"].includes(sub.status) || ["hop", "hof", "admin"].includes(rejectedStage);
                const isRejected = sub.status === "rejected";

                return (
                  <TableRow key={sub.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium text-primary text-sm whitespace-nowrap">{generateRefNo(sub)}</TableCell>
                    <TableCell className="text-sm text-foreground hidden sm:table-cell">{sub.department}</TableCell>
                    <TableCell className="text-sm text-foreground">{formTypeLabels[sub.formType] || sub.formType}</TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      {isApprovedHOS ? statusBadge("approved") : (isRejected && rejectedStage === "hos") ? statusBadge("rejected") : statusBadge("pending")}
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      {isApprovedHOD ? statusBadge("approved") : (isRejected && rejectedStage === "hod") ? statusBadge("rejected") : (isRejected && rejectedStage === "hos") ? naStatus() : statusBadge("pending")}
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      {sub.status === "approved" ? statusBadge("approved") : (isRejected && rejectedStage === "admin") ? statusBadge("rejected") : isRejected ? naStatus() : statusBadge("pending")}
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
                      <div className="flex items-center justify-center gap-4">
                        <button onClick={() => setSelectedSubmission(sub)} className="text-xs sm:text-sm font-bold text-primary hover:underline">
                          View
                        </button>
                        {isApprovedCarRental && assignedCar && (
                          <button onClick={() => setAssignedCarDetails(assignedCar)} className="text-emerald-600 hover:text-emerald-700 p-1.5 rounded-md hover:bg-emerald-50 transition-colors" title="View Assigned Car">
                            <Car className="h-4 w-4" />
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
