import { useState } from "react";
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
  claim: "Misc. Advance / Pendahuluan Pelbagai",
};

type FilterType = "all" | "pending" | "approved" | "rejected";

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
    case "approved_hos":
    case "approved_hod":
      return <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] font-bold tracking-wider">APPROVED</Badge>;
    case "rejected":
      return <Badge className="bg-red-50 text-red-600 border-0 text-[10px] font-bold tracking-wider">REJECTED</Badge>;
    case "pending":
    default:
      return <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px] font-bold tracking-wider">PENDING</Badge>;
  }
};

const naStatus = () => (
  <Badge className="bg-muted text-muted-foreground border-0 text-[10px] font-bold tracking-wider">N/A</Badge>
);

const getOverallStatus = (sub: Submission) => {
  if (sub.status === "rejected") return { label: "Rejected", color: "bg-destructive", progress: 100 };
  if (sub.status === "approved") return { label: "Fully Approved", color: "bg-emerald-500", progress: 100 };
  if (sub.status === "approved_hod") return { label: "Under Review", color: "bg-emerald-500", progress: 75 };
  if (sub.status === "approved_hos") return { label: "Under Review", color: "bg-emerald-500", progress: 50 };
  return { label: "Pending", color: "bg-muted-foreground/50", progress: 25 };
};

const renderValue = (val: any): React.ReactNode => {
  if (val === null || val === undefined || val === "") return "—";
  
  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    if (typeof val[0] === 'object' && val[0] !== null) {
      // Filter out rows that are entirely empty (e.g. empty passenger slots)
      const validRows = val.filter(row => Object.values(row).some(v => v !== "" && v !== null));
      if (validRows.length === 0) return "—";

      const keys = Object.keys(validRows[0]).filter(k => k !== 'avatar');
      return (
        <div className="mt-3 w-full border border-border rounded-lg overflow-x-auto print:border-gray-400">
          <Table className="w-full text-left border-collapse">
            <TableHeader className="bg-muted/50 print:bg-gray-100">
              <TableRow>
                {keys.map(k => (
                  <TableHead key={k} className="text-xs uppercase font-bold p-3 text-muted-foreground print:text-gray-600 whitespace-nowrap">
                    {k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {validRows.map((row, i) => (
                <TableRow key={i} className="border-b border-border print:border-gray-300 last:border-0 hover:bg-muted/20">
                  {keys.map((k, j) => (
                    <TableCell key={j} className="text-sm p-3 whitespace-nowrap print:text-black">
                      {String(row[k] || "—")}
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
  
  if (typeof val === 'object') {
    const entries = Object.entries(val).filter(([k, v]) => v !== "" && v !== null && k !== 'avatar');
    if (entries.length === 0) return "—";
    return (
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 bg-muted/5 print:bg-transparent p-4 rounded-lg border border-border print:border-gray-400">
        {entries.map(([k, v]) => (
          <div key={k} className="flex flex-col border-b border-border/50 print:border-gray-300 pb-2 last:border-0 last:pb-0 sm:last:pb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 font-bold mb-1">
              {k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1")}
            </span>
            <span className="text-sm font-semibold text-foreground print:text-black">
              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  
  // Format URL strings beautifully as clickable links
  if (typeof val === 'string' && val.startsWith('http')) {
    return (
      <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline inline-flex items-center gap-1.5">
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

  const mySubmissions = submissions.filter(s => s.submittedBy === user?.id);

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

  const generateRefNo = (sub: Submission) => {
    const num = sub.id.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    return `HDSB-${num}`;
  };

  if (selectedSubmission) {
    const overall = getOverallStatus(selectedSubmission);
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto print:absolute print:inset-0 print:max-w-none print:w-full print:bg-white print:text-black print:z-50 print:p-8 print:m-0">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button onClick={() => setSelectedSubmission(null)} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to list
          </button>
          <button onClick={() => {
            const originalTitle = document.title;
            document.title = generateRefNo(selectedSubmission);
            
            window.onafterprint = () => {
              document.title = originalTitle;
              window.onafterprint = null;
            };
            
            window.print();
            
            // Fallback for browsers that don't support afterprint
            setTimeout(() => { document.title = originalTitle; }, 2000);
          }} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-foreground bg-muted hover:bg-muted/80 border border-border rounded-lg transition-all shadow-sm">
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

        <div className="card-elevated p-6 print:border-none print:shadow-none print:p-0">
          <div className="flex items-center justify-between mb-6 print:mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground print:text-black">
                {formTypeLabels[selectedSubmission.formType] || selectedSubmission.formType}
              </h2>
              <p className="text-sm text-muted-foreground print:text-gray-600 mt-1">Ref: {generateRefNo(selectedSubmission)} · {selectedSubmission.department}</p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <div className={`w-16 h-2 rounded-full ${overall.color}`} />
              <span className="text-xs font-medium text-foreground">{overall.label}</span>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {/* Explicitly place Employee Name at the top */}
            <div className="py-4 border-b border-border print:border-gray-300 flex justify-between items-center">
              <span className="text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold">Employee Name</span>
              <div className="text-sm font-medium text-foreground print:text-black text-right">
                {selectedSubmission.employeeName}
              </div>
            </div>
            
            {/* Map the rest of the data, excluding duplicates and the name we just added */}
            {Object.entries(selectedSubmission.data)
              .filter(([key]) => !['name', 'hos', 'hod', 'remarks', 'avatar', 'licenseAttachment', 'securityLog'].includes(key))
              .map(([key, value]) => {
                let formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
                if (key === 'hosName') formattedKey = 'Head of Section';
                if (key === 'hodName') formattedKey = 'Head of Department';
                if (key === 'staffId') formattedKey = 'Staff ID';
                if (key === 'icNo') formattedKey = 'I/C No.';
                if (key === 'employeeInfo') formattedKey = 'Employee Info';
                if (key === 'companyDetails') formattedKey = 'Company Details';
                if (key === 'personalDetails') formattedKey = 'Personal Details';
                if (key === 'securityLog') formattedKey = 'Security Log';
                if (key === 'claimRows') formattedKey = 'Claim Details';
                if (key === 'purposeType') formattedKey = 'Purpose Type';

                return (
                  <div key={key} className={`py-4 border-b border-border print:border-gray-300 last:border-0 ${typeof value === 'object' && value !== null ? 'flex flex-col items-start gap-2' : 'flex justify-between items-center'}`}>
                    <span className="text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold">{formattedKey}</span>
                    <div className={`text-sm font-medium text-foreground print:text-black ${typeof value === 'object' && value !== null ? 'w-full' : 'text-right'}`}>
                      {renderValue(value)}
                    </div>
                  </div>
                );
              })}

        {selectedSubmission.data.securityLog && (
          <div className="py-4 border-b border-border print:border-gray-300">
            <span className="text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold">Gate Log</span>
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 bg-muted/5 print:bg-transparent p-4 rounded-lg border border-border print:border-gray-400">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 font-bold mb-1">Time Out</span>
                <span className="text-sm font-semibold text-foreground print:text-black block">{selectedSubmission.data.securityLog.actualTimeOut || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 font-bold mb-1">Time In</span>
                <span className="text-sm font-semibold text-foreground print:text-black block">{selectedSubmission.data.securityLog.actualTimeIn || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {selectedSubmission.data.licenseAttachment && (
          <div className="py-4 border-b border-border print:border-gray-300 flex justify-between items-center">
            <span className="text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold">Driving License</span>
            <a href={selectedSubmission.data.licenseAttachment} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5 text-right print:text-black">
              <FileText className="h-4 w-4" /> View Document
            </a>
          </div>
        )}
          </div>

          {selectedSubmission.data.remarks && (
            <div className={`p-4 rounded-xl border mb-8 print:border-gray-300 ${selectedSubmission.status === 'rejected' ? 'bg-red-50 border-red-100 text-red-900' : 'bg-blue-50 border-blue-100 text-blue-900'}`}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80 print:text-gray-500">Approver Remarks / Ulasan</p>
              <p className="text-sm font-medium print:text-black">"{selectedSubmission.data.remarks}"</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 print:bg-transparent print:border print:border-gray-300 rounded-lg mt-8">
            <div className="text-center border-r border-border print:border-gray-300 last:border-0">
              <p className="text-xs text-muted-foreground print:text-gray-500 uppercase tracking-wider font-bold mb-2">Section Head</p>
              <div className="print:hidden">
                {selectedSubmission.status !== "pending" ? statusBadge("approved") : statusBadge("pending")}
              </div>
              <div className="hidden print:block font-bold text-sm">
                {selectedSubmission.status !== "pending" ? "APPROVED" : "PENDING"}
              </div>
            </div>
            <div className="text-center border-r border-border print:border-gray-300 last:border-0">
              <p className="text-xs text-muted-foreground print:text-gray-500 uppercase tracking-wider font-bold mb-2">Dept Head</p>
              <div className="print:hidden">
                {["approved_hod", "approved"].includes(selectedSubmission.status) ? statusBadge("approved") : selectedSubmission.status === "rejected" ? naStatus() : statusBadge("pending")}
              </div>
              <div className="hidden print:block font-bold text-sm">
                {["approved_hod", "approved"].includes(selectedSubmission.status) ? "APPROVED" : selectedSubmission.status === "rejected" ? "N/A" : "PENDING"}
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground print:text-gray-500 uppercase tracking-wider font-bold mb-2">Admin</p>
              <div className="print:hidden">
                {selectedSubmission.status === "approved" ? statusBadge("approved") : selectedSubmission.status === "rejected" ? naStatus() : statusBadge("pending")}
              </div>
              <div className="hidden print:block font-bold text-sm">
                {selectedSubmission.status === "approved" ? "APPROVED" : selectedSubmission.status === "rejected" ? "N/A" : "PENDING"}
              </div>
            </div>
          </div>

          {/* Print Footer */}
          <div className="hidden print:block mt-12 text-center text-xs text-gray-400">
            <p>Generated by HICOM Diecastings E-Form System on {new Date().toLocaleString()}</p>
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
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">My Submissions</span> / <span className="font-semibold text-foreground">Permohonan Saya</span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-elevated p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Submissions</p>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          </div>
        </div>
        <div className="card-elevated p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Accepted / Diterima</p>
            <p className="text-3xl font-bold text-foreground">{stats.accepted}</p>
          </div>
        </div>
        <div className="card-elevated p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rejected / Ditolak</p>
            <p className="text-3xl font-bold text-foreground">{stats.rejected}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Accepted" },
          { value: "rejected", label: "Rejected" },
        ] as { value: FilterType; label: string }[]).map(f => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setIsViewAll(false); }}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
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
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs font-bold uppercase tracking-wider">Ref No.</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Department</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Form Type</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Section Head</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Department Head</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Admin</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Overall Status</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isViewAll ? filtered : filtered.slice(0, 10)).map((sub) => {
                const overall = getOverallStatus(sub);
                const isApprovedCarRental = sub.formType === 'car_rental' && sub.status === 'approved';
                return (
                  <TableRow key={sub.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium text-primary text-sm">{generateRefNo(sub)}</TableCell>
                    <TableCell className="text-sm text-foreground">{sub.department}</TableCell>
                    <TableCell className="text-sm text-foreground">{formTypeLabels[sub.formType] || sub.formType}</TableCell>
                    <TableCell className="text-center">
                      {sub.status !== "pending" ? statusBadge("approved") : statusBadge("pending")}
                    </TableCell>
                    <TableCell className="text-center">
                      {["approved_hod", "approved"].includes(sub.status) ? statusBadge("approved") : sub.status === "rejected" ? naStatus() : statusBadge("pending")}
                    </TableCell>
                    <TableCell className="text-center">
                      {sub.status === "approved" ? statusBadge("approved") : sub.status === "rejected" ? naStatus() : statusBadge("pending")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${sub.status === "rejected" ? "bg-destructive" : overall.progress === 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${overall.progress}%` }} />
                        </div>
                        <span className="text-xs font-medium text-foreground whitespace-nowrap">{overall.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-4">
                        <button onClick={() => setSelectedSubmission(sub)} className="text-sm font-medium text-primary hover:underline">
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
          
          <div className="flex items-center justify-between p-4 border-t border-border">
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
