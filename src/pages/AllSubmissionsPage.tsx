import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, ArrowLeft, Printer, FileText } from "lucide-react";
import { useSubmissions, type Submission } from "@/contexts/SubmissionsContext";
import logo from "@/assets/logo.png";

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request / Permintaan Kenderaan",
  leave: "Gate Pass",
  claim: "Misc. Advance / Pendahuluan Pelbagai",
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

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
    case "approved_hos":
    case "approved_hod":
      return <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] font-bold">APPROVED</Badge>;
    case "rejected":
      return <Badge className="bg-red-50 text-red-600 border-0 text-[10px] font-bold">REJECTED</Badge>;
    case "pending":
    default:
      return <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px] font-bold">PENDING</Badge>;
  }
};

const AllSubmissionsPage = () => {
  const { submissions } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isViewAll, setIsViewAll] = useState(false);

  const generateRefNo = (sub: Submission) => {
    const num = sub.id.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    return `HDSB-${num}`;
  };

  if (selectedSubmission) {
    const isApprovedHOS = ["approved_hos", "approved_hod", "approved"].includes(selectedSubmission.status);
    const isApprovedHOD = ["approved_hod", "approved"].includes(selectedSubmission.status);
    const isRejected = selectedSubmission.status === "rejected";

    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto print:absolute print:inset-0 print:max-w-none print:w-full print:bg-white print:text-black print:z-50 print:p-8 print:m-0">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button onClick={() => setSelectedSubmission(null)} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to All Submissions
          </button>
          <button onClick={() => {
            const originalTitle = document.title;
            document.title = generateRefNo(selectedSubmission);
            
            window.onafterprint = () => {
              document.title = originalTitle;
              window.onafterprint = null;
            };
            
            window.print();
            
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
                {formTypeLabels[selectedSubmission.formType] || selectedSubmission.formType.replace("_", " ").toUpperCase()}
              </h2>
              <p className="text-sm text-muted-foreground print:text-gray-600 mt-1">Ref: {generateRefNo(selectedSubmission)} · {selectedSubmission.department}</p>
            </div>
            <div className="print:hidden">
              {statusBadge(selectedSubmission.status)}
            </div>
          </div>

          <div className="space-y-4 mb-8">
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
                if (key === 'licenseAttachment') formattedKey = 'Driving License Attachment';

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
              <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80 print:text-gray-500">Approver Remarks</p>
              <p className="text-sm font-medium print:text-black">"{selectedSubmission.data.remarks}"</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 print:bg-transparent print:border print:border-gray-300 rounded-lg mt-8">
            <div className="text-center border-r border-border print:border-gray-300 last:border-0">
              <p className="text-xs text-muted-foreground print:text-gray-500 uppercase tracking-wider font-bold mb-2">Section Head</p>
              <div className="hidden print:block font-bold text-sm">
                {selectedSubmission.status !== "pending" ? "APPROVED" : "PENDING"}
              </div>
            </div>
            <div className="text-center border-r border-border print:border-gray-300 last:border-0">
              <p className="text-xs text-muted-foreground print:text-gray-500 uppercase tracking-wider font-bold mb-2">Dept Head</p>
              <div className="hidden print:block font-bold text-sm">
                {isApprovedHOD ? "APPROVED" : (isRejected && isApprovedHOS) ? "REJECTED" : "PENDING"}
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground print:text-gray-500 uppercase tracking-wider font-bold mb-2">Admin</p>
              <div className="hidden print:block font-bold text-sm">
                {selectedSubmission.status === "approved" ? "APPROVED" : isRejected ? "REJECTED" : "PENDING"}
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

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">All System Submissions</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor all form submissions across the entire organization.</p>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-bold text-foreground">All System Submissions</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
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
                <TableCell className="font-medium text-foreground">{sub.employeeName}</TableCell>
                <TableCell className="uppercase text-xs font-bold text-foreground">{formTypeLabels[sub.formType] || sub.formType.replace("_", " ")}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString()}</TableCell>
                <TableCell>{statusBadge(sub.status)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setSelectedSubmission(sub)} className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                      View Details
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedSubmission(sub);
                        setTimeout(() => {
                          const originalTitle = document.title;
                          document.title = generateRefNo(sub);
                          window.onafterprint = () => {
                            document.title = originalTitle;
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
        {submissions.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
            No submissions found in the system.
          </div>
        )}
        {submissions.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
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