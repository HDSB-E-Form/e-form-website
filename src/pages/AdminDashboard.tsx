import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request",
  claim: "Petty Cash Claim",
  leave: "Gate Pass",
  ppe_request: "PPE / Uniform / Office",
  ppe_purchase: "PPE | Uniform Purchase",
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
    case "approved_hos":
      return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-0 text-xs font-medium px-3 py-1">HOS Approved</Badge>;
    case "rejected":
      return <Badge className="bg-destructive/15 text-destructive dark:text-red-400 border-0 text-xs font-medium px-3 py-1">Rejected</Badge>;
    case "pending":
    default:
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
      const validRows = val.filter(row => row && typeof row === 'object' && Object.values(row).some(v => v !== "" && v !== null));
      if (validRows.length === 0) return "—";

      let keys = Object.keys(validRows[0]).filter(k => k !== 'avatar');

      // Specifically for claim forms, enforce the column order.
      if (keys.includes('description') && keys.includes('receiptNo') && keys.includes('amount')) {
        keys = ['description', 'receiptNo', 'amount'];
      }

      return (
        <div className="mt-3 w-full border border-border rounded-lg overflow-x-auto">
          <Table className="w-full text-left border-collapse bg-background/50">
            <TableHeader className="bg-muted/50">
              <TableRow>
                {keys.map(k => (
                  <TableHead key={k} className="text-[10px] sm:text-xs uppercase font-bold p-2 sm:p-3 text-muted-foreground whitespace-nowrap">
                    {k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {validRows.map((row, i) => (
                <TableRow key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                  {keys.map((k, j) => (
                    <TableCell key={j} className="text-xs sm:text-sm p-2 sm:p-3 whitespace-nowrap">
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
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mt-2 sm:mt-3 bg-background/50 p-3 sm:p-4 rounded-lg border border-border">
        {entries.map(([k, v]) => (
          <div key={k} className="flex flex-col border-b border-border/50 pb-1.5 last:border-0 last:pb-0 sm:last:pb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5 sm:mb-1">
              {k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1")}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  
  if (typeof val === 'string' && val.startsWith('http')) {
    return (
      <a href={val} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary font-bold hover:underline inline-flex items-center gap-1.5 w-fit">
         <FileText className="h-4 w-4" /> View Attachment
      </a>
    );
  }

  return String(val);
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { submissions, updateSubmissionStatus, addSubmission } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [activeTab, setActiveTab] = useState<"action_required" | "in_progress" | "history">("action_required");
  const [isViewAll, setIsViewAll] = useState(false);

  const approvalSubmissions = submissions.filter(s => s.formType === "car_rental" || s.formType === "leave");

  const filtered = approvalSubmissions
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
    if (activeTab === "action_required") return s.status === "approved_hod";
    if (activeTab === "in_progress") return s.status === "pending" || s.status === "approved_hos";
    if (activeTab === "history") return s.status === "approved" || s.status === "rejected";
    return true;
  });

  const stats = {
    total: filtered.length,
    actionRequired: filtered.filter(s => s.status === "approved_hod").length,
    inProgress: filtered.filter(s => s.status === "pending" || s.status === "approved_hos").length,
    approvalRate: filtered.length > 0 ? Math.round((filtered.filter(s => s.status === "approved").length / filtered.length) * 100) : 0,
  };

  const refNoMap = useMemo(() => {
    const map = new Map<string, string>();
    const excludedForms = ["inventory_addition", "ppe_request", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"];
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

  const handleAction = (id: string, status: SubmissionStatus) => {
    const updateData: any = { remarks, rejectedStage: status === "rejected" ? "admin" : undefined };
    
    updateSubmissionStatus(id, status, updateData);
    toast.success(`Submission ${status === "approved" ? "accepted" : "rejected"} successfully`);
    setSelectedSubmission(null);
    setRemarks("");
  };

  const renderFormDetails = (sub: Submission) => {
    const refNo = generateRefNo(sub);

    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="inline-flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <h2 className="text-xl font-bold text-foreground">Review Submission / Semakan Permohonan</h2>
        </div>

        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">EMPLOYEE SUMMARY / MAKLUMAT PEKERJA</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-8 border border-border/50">
          <p className="text-base sm:text-lg font-bold text-foreground">{sub.employeeName}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1 mt-3">
            Staff ID: {sub.data.staffId || sub.data.employeeInfo?.staffNo || sub.data.employeeInfo?.employeeNumber || sub.submittedBy || "—"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Department: {sub.department || "—"}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3">
            Position: {sub.data.position || sub.data.employeeInfo?.position || "—"}
          </p>
        </div>

        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">SUBMISSION SUMMARY / RINGKASAN PERMOHONAN</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-8 border border-border/50 space-y-0">
          <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start first:pt-0">
            <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Ref No</span>
            <div className="text-xs sm:text-sm font-bold text-foreground sm:col-span-2 text-left">{refNo}</div>
          </div>
          <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
            <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Form Type</span>
            <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
              <Badge className="bg-sky-100 text-sky-800 border-0 text-xs font-bold">{formTypeLabels[sub.formType] || sub.formType}</Badge>
            </div>
          </div>

          {sub.formType === 'car_rental' ? (
            <>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">IC No.</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.icNo || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Mobile Number</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.mobileNumber || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Driving License No.</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.drivingLicenseNo || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">License Expiry</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">
                  {sub.data.drivingLicenseExpiry ? new Date(sub.data.drivingLicenseExpiry).toLocaleDateString("en-GB") : "—"}
                </div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Destination</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.destination || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Journey Type</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words uppercase">{sub.data.journeyType || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Purpose</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.purpose || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Journey Dates</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">
                  {sub.data.fromDate ? new Date(sub.data.fromDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} - {sub.data.toDate ? new Date(sub.data.toDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Head of Section</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.hos || sub.data.hosName || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Head of Department</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.hod || sub.data.hodName || "—"}</div>
              </div>
              
              {sub.data.passengers && sub.data.passengers.some((p: any) => p.name) && (
                <div className="py-2 sm:py-4 border-b border-border/50 flex flex-col items-start gap-2">
                  <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold">Passengers</span>
                  <div className="w-full text-xs sm:text-sm font-medium text-foreground">
                    {renderValue(sub.data.passengers.filter((p: any) => p.name))}
                  </div>
                </div>
              )}

              {sub.data.licenseAttachment && (
                <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Driving License</span>
                  <a href={sub.data.licenseAttachment} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1.5 text-left sm:col-span-2">
                    <FileText className="h-4 w-4" /> View Document
                  </a>
                </div>
              )}
            </>
          ) : (
            Object.entries(sub.data)
              .filter(([key]) => !['name', 'hos', 'hod', 'remarks', 'avatar', 'securityLog', 'position', 'staffId', 'employeeInfo', 'hosName', 'hodName'].includes(key) && !/^\d+$/.test(key))
              .map(([key, value]) => {
                let formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
                if (key === 'companyDetails') formattedKey = 'Company Details';
                if (key === 'personalDetails') formattedKey = 'Personal Details';
                if (key === 'purposeType') formattedKey = 'Purpose Type';
                if (key === 'licenseAttachment') formattedKey = 'Driving License Attachment';

                if (value === null || value === undefined || value === "") return null;
                if (Array.isArray(value) && value.length === 0) return null;
                if (Array.isArray(value) && typeof value[0] === 'object' && value.filter(row => row && typeof row === 'object' && Object.values(row).some(v => v !== "" && v !== null)).length === 0) return null;
                if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return null;

                return (
                  <div key={key} className={`py-2 sm:py-4 border-b border-border/50 last:border-0 ${typeof value === 'object' && value !== null && !Array.isArray(value) ? 'flex flex-col items-start gap-2' : Array.isArray(value) && typeof value[0] === 'object' ? 'flex flex-col items-start gap-2' : 'grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start'}`}>
                    <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">{formattedKey}</span>
                    <div className={`text-xs sm:text-sm font-medium text-foreground ${typeof value === 'object' && value !== null && !Array.isArray(value) ? 'w-full' : Array.isArray(value) && typeof value[0] === 'object' ? 'w-full' : 'sm:col-span-2 text-left break-words'}`}>
                      {renderValue(value)}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </>
    );
  };

  if (selectedSubmission) {
    const isApprovalForm = selectedSubmission.formType === "car_rental" || selectedSubmission.formType === "leave";
    const canApprove = selectedSubmission.status === "approved_hod";
    const isPending = selectedSubmission.status === "pending" || selectedSubmission.status === "approved_hos";

    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {isApprovalForm && renderFormDetails(selectedSubmission)}

        {selectedSubmission.data.remarks && (
          <div className={`p-4 rounded-xl border mb-6 ${selectedSubmission.status === 'rejected' ? 'bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Previous Remarks / Ulasan Terdahulu</p>
            <p className="text-xs sm:text-sm font-medium">"{selectedSubmission.data.remarks}"</p>
          </div>
        )}

        {isPending && !canApprove && isApprovalForm && (
          <div className="p-4 bg-muted/30 rounded-xl text-center">
            <p className="text-sm text-muted-foreground font-medium">
              {selectedSubmission.status === "pending" ? "Waiting for Head of Section (HOS) approval." :
               selectedSubmission.status === "approved_hos" ? "Waiting for Head of Department (HOD) approval." :
               "No action required at this time."}
            </p>
          </div>
        )}

        {canApprove && isApprovalForm && viewMode === 'approvals' && (
          <>
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">REMARKS / ULASAN</p>
            <Input
              placeholder="Please enter remarks if any / Sila masukkan ulasan jika ada..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="mb-8 h-12 bg-muted/20 text-base sm:text-sm"
            />
            <div className="flex flex-row gap-3 sm:gap-4">
              <button
                onClick={() => handleAction(selectedSubmission.id, "rejected")}
                className="w-1/3 px-2 sm:px-6 py-3 sm:py-4 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors text-xs sm:text-base"
              >
                REJECT<br className="sm:hidden" /><span className="hidden sm:inline"> / </span>TOLAK
              </button>
              <button
                onClick={() => handleAction(selectedSubmission.id, "approved")}
                className="w-2/3 px-2 sm:px-6 py-3 sm:py-4 rounded-xl bg-emerald-500 text-white font-bold text-center hover:bg-emerald-600 transition-colors text-xs sm:text-base"
              >
                APPROVE<br className="sm:hidden" /><span className="hidden sm:inline"> / </span>LULUS
              </button>
            </div>
          </>
        )}

        {selectedSubmission.formType === 'ppe_purchase' && (
          <div className="flex justify-center mt-8">
            <button onClick={() => handlePrint(selectedSubmission)} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
              <Printer className="h-4 w-4" /> Print Record
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">HR Form Approvals</h1>
          <p className="text-muted-foreground text-sm mt-1">Review and approve incoming Car Rental and Gate Pass requests.</p>
        </div>
      </div>

      <div className="animate-in slide-in-from-bottom-2 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Submissions</p>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] font-semibold px-2">+12%</Badge>
              </div>
              <p className="text-4xl font-bold text-foreground">{stats.total > 0 ? `${stats.total}` : "0"}</p>
              <p className="text-xs text-muted-foreground mt-1">Current fiscal year / Tahun kewangan semasa</p>
            </div>
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Action Required</p>
                {stats.actionRequired > 0 ? (
                  <Badge className="bg-destructive/15 text-destructive dark:text-red-400 border-0 text-[10px] font-semibold px-2 animate-pulse">Needs Review</Badge>
                ) : (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] font-semibold px-2">All Cleared</Badge>
                )}
              </div>
              <p className="text-4xl font-bold text-foreground">{stats.actionRequired}</p>
              <p className="text-xs text-muted-foreground mt-1">Forms waiting for your final approval</p>
            </div>
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Approval Rate</p>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] font-semibold px-2">+2%</Badge>
              </div>
              <p className="text-4xl font-bold text-foreground">{stats.approvalRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Compliance target: 90% / Sasaran pematuhan: 90%</p>
            </div>
          </div>

          <div className="flex w-full overflow-x-auto no-scrollbar gap-2 mb-6">
            <button onClick={() => { setActiveTab("action_required"); setIsViewAll(false); }} className={`flex-1 sm:flex-none flex items-center justify-center whitespace-nowrap px-3 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-colors border ${activeTab === "action_required" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
              Action Required
              {stats.actionRequired > 0 && (
                <Badge className="ml-1.5 border-0 text-[10px] sm:text-xs px-1.5 sm:px-2 bg-red-500 text-white hover:bg-red-600">{stats.actionRequired}</Badge>
              )}
            </button>
            <button onClick={() => { setActiveTab("in_progress"); setIsViewAll(false); }} className={`flex-1 sm:flex-none flex items-center justify-center whitespace-nowrap px-3 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-colors border ${activeTab === "in_progress" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
              In Progress
              {stats.inProgress > 0 && (
                <Badge className="ml-1.5 border-0 text-[10px] sm:text-xs px-1.5 sm:px-2 bg-amber-500 text-white hover:bg-amber-600">{stats.inProgress}</Badge>
              )}
            </button>
            <button onClick={() => { setActiveTab("history"); setIsViewAll(false); }} className={`flex-1 sm:flex-none flex items-center justify-center whitespace-nowrap px-3 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-colors border ${activeTab === "history" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
              History
            </button>
          </div>

          <div className="card-elevated overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Recent Submissions / Penyerahan Terkini</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, date, or type..." 
                  value={search} 
                  onChange={e => { setSearch(e.target.value); setIsViewAll(false); }} 
                  className="pl-9 w-full sm:w-72 h-9 text-base sm:text-sm" 
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/40">
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Employee / Pekerja</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Type</TableHead>
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
                                {activeTab === "action_required" && <div className="w-1 h-10 rounded-full bg-primary" />}
                                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${!avatarUrl ? getInitialColor(sub.employeeName) : 'bg-transparent'}`}>
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
                                {activeTab === "action_required" && isRecent(sub.submittedAt) && (
                                  <Badge className="bg-blue-500 text-white border-0 text-[9px] px-1.5 py-0 uppercase tracking-wider font-bold">NEW</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">{formTypeLabels[sub.formType] || sub.formType}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{statusBadge(sub.status)}</TableCell>
                            <TableCell className="text-center">
                              <button onClick={() => setSelectedSubmission(sub)} className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors">
                                {sub.status === "pending" || sub.status === "approved_hos" || sub.status === "approved_hod" ? "Review" : "Details"}
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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
    </div>
  );
};

export default AdminDashboard;