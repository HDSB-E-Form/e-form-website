import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission, type SubmissionStatus, type AppUser } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, FileText, ExternalLink, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { renderValue } from "@/components/DataRenderer";

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request",
  leave: "Gate Pass",
  claim: "Petty Cash Claim",
  ppe_request: "PPE | Uniform | Office Supplies",
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

const ApproverDashboard = () => {
  const { user } = useAuth();
  const { submissions, updateSubmissionStatus } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [activeTab, setActiveTab] = useState<"action_required" | "in_progress" | "history">("action_required");
  const [isViewAll, setIsViewAll] = useState(false);

  const isHOD = user?.role === "hod";
  const isHOS = user?.role === "hos";
  const isHOP = user?.role === "head_of_purchasing" || user?.secondary_roles?.includes('head_of_purchasing');
  const isHOF = user?.role === "head_of_finance" || user?.secondary_roles?.includes('head_of_finance');

  const filtered = submissions
    .filter(s => {
      const hosValue = s.data.hosName || s.data.hos;
      const hodValue = s.data.hodName || s.data.hod;
      const hopValue = s.data.hopName;
      const hofValue = s.data.hofName;
      const isUserHOS = isHOS && hosValue === user?.name;
      const isUserHOD = isHOD && hodValue === user?.name;
      const isUserHOP = isHOP && hopValue === user?.name && s.formType === 'claim';
      const isUserHOF = isHOF && hofValue === user?.name && s.formType === 'claim';
      return isUserHOS || isUserHOD || isUserHOP || isUserHOF;
    })
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
    if (activeTab === "action_required") {
      const conditions = [];
      if (isHOS) conditions.push(s.status === "pending");
      if (isHOD) conditions.push(s.status === "approved_hos");
      if (isHOP) conditions.push(s.formType === 'claim' && s.status === "approved_hod");
      if (isHOF) conditions.push(s.formType === 'claim' && s.status === "approved_hop");
      return conditions.some(Boolean);
    }
    if (activeTab === "in_progress") {
      if (isHOS) return ["approved_hod", "approved_hop", "approved_hof"].includes(s.status);
      if (isHOD) return s.status === "pending";
      if (isHOP && s.formType === 'claim') return ["pending", "approved_hos"].includes(s.status);
      if (isHOF) return ["pending", "approved_hos", "approved_hod", "approved_hop"].includes(s.status);
      return false;
    }
    if (activeTab === "history") return s.status === "approved" || s.status === "rejected";
    return true;
  });

  const stats = {
    total: filtered.length,
    actionRequired: filtered.filter(s => (isHOS && s.status === "pending") || (isHOD && s.status === "approved_hos") || (isHOP && s.formType === 'claim' && s.status === "approved_hod") || (isHOF && s.formType === 'claim' && s.status === "approved_hop")).length,
    inProgress: filtered.filter(s =>
      (isHOS && ["approved_hod", "approved_hop", "approved_hof"].includes(s.status)) ||
      (isHOD && s.status === "pending") ||
      (isHOP && s.formType === 'claim' && ["pending", "approved_hos"].includes(s.status)) ||
      (isHOF && ["pending", "approved_hos", "approved_hod", "approved_hop"].includes(s.status))).length,
    resolved: filtered.filter(s => s.status === "approved" || s.status === "rejected").length,
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

  const renderLeaveDetailsForApprover = (sub: Submission) => {
    const passType = sub.data.purposeType === 'company' ? 'Company Business' : 'Personal Matter';
    const location = sub.data.purposeType === 'company' ? sub.data.companyDetails?.location : sub.data.personalDetails?.location;
    const purpose = sub.data.purposeType === 'company' ? sub.data.companyDetails?.purpose : sub.data.personalDetails?.purpose;

    return (
      <>
        <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Pass Type</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{passType}</div>
        </div>
        <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Location</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{location || "—"}</div>
        </div>
        <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Purpose</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{purpose || "—"}</div>
        </div>
        {sub.data.estimatedTime && (
          <div className="py-2 sm:py-4 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
            <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Estimated Time</span>
            <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
              Out: {sub.data.estimatedTime.timeOut || "—"} &nbsp;|&nbsp; In: {sub.data.estimatedTime.timeIn || "—"}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderCarRentalDetailsForApprover = (sub: Submission) => {
    return (
      <>
        <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Destination</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{sub.data.destination || "—"}</div>
        </div>
        <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Purpose</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">{sub.data.purpose || "—"}</div>
        </div>
        <div className="py-2 sm:py-4 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
          <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Journey Dates</span>
          <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
            {sub.data.fromDate ? new Date(sub.data.fromDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} - {sub.data.toDate ? new Date(sub.data.toDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
          </div>
        </div>
        {sub.data.licenseAttachment && (
          <div className="py-2 sm:py-4 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
            <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">License</span>
            <a href={sub.data.licenseAttachment} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1.5 text-left sm:col-span-2">
              <FileText className="h-4 w-4" /> View Document
            </a>
          </div>
        )}
      </>
    );
  };

  const handleAction = (id: string, status: SubmissionStatus) => {
    updateSubmissionStatus(id, status, { remarks, rejectedStage: status === "rejected" ? (isHOS ? "hos" : isHOD ? "hod" : isHOP ? "hop" : "hof") : undefined });
    toast.success(`Submission ${status === "approved" || status === "approved_hos" || status === "approved_hod" ? "accepted" : "rejected"} successfully`);
    setSelectedSubmission(null);
    setRemarks("");
  };

  if (selectedSubmission) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto print:absolute print:inset-0 print:max-w-none print:w-full print:bg-white print:text-black print:z-50 print:p-8 print:m-0 animate-in fade-in-5">
        <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group print:hidden">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to list
        </button>

        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">EMPLOYEE SUMMARY / MAKLUMAT PEKERJA</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-6">
          <p className="text-lg font-bold text-foreground">{selectedSubmission.employeeName}</p>
          <p className="text-sm text-muted-foreground mb-1">
            Staff ID: {selectedSubmission.data.staffId || selectedSubmission.data.employeeInfo?.staffNo || selectedSubmission.data.employeeInfo?.employeeNumber || selectedSubmission.submittedBy}
          </p>
          <p className="text-sm text-muted-foreground mb-1">Department: {selectedSubmission.department}</p>
          <p className="text-sm text-muted-foreground mb-3">
            Position: {selectedSubmission.data.position || selectedSubmission.data.employeeInfo?.position || "—"}
          </p>
        </div>

        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">SUBMISSION SUMMARY / RINGKASAN PERMOHONAN</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Ref No / No. Rujukan</p>
              <p className="text-sm font-bold text-foreground">{generateRefNo(selectedSubmission)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Form Type / Jenis Borang</p>
              <Badge className="bg-amber-100 text-amber-800 border-0 text-xs font-bold mt-1 uppercase">
                {formTypeLabels[selectedSubmission.formType] || selectedSubmission.formType.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
          <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
            <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Approvers</span>
            <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
              HOS: {selectedSubmission.data.hosName || selectedSubmission.data.hos || "—"}<br/>
              HOD: {selectedSubmission.data.hodName || selectedSubmission.data.hod || "—"}
            </div>
          </div>

          {selectedSubmission.formType === 'car_rental' ? (
            renderCarRentalDetailsForApprover(selectedSubmission)
          ) : selectedSubmission.formType === 'leave' ? (
            renderLeaveDetailsForApprover(selectedSubmission)
          ) : null}

          {selectedSubmission.formType === 'claim' && (
            <>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">Claim Details / Butiran Tuntutan</p>
                <div className="text-sm font-bold text-foreground mt-1">
                  {renderValue(selectedSubmission.data.claimRows)}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 text-right">
                <p className="text-xs text-muted-foreground uppercase font-bold">Total Amount</p>
                <p className="text-xl font-bold text-primary">RM {selectedSubmission.data.totalAmount || "0.00"}</p>
              </div>
            </>
          )}
        </div>

        {selectedSubmission.data.passengers && selectedSubmission.data.passengers.some((p: any) => p.name) && (
          <div className="bg-muted/30 rounded-xl p-5 mb-6 border border-border/50">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">PASSENGERS / PENUMPANG</p>
            <div className="space-y-2">
              {selectedSubmission.data.passengers.filter((p: any) => p.name).map((p: any, i: number) => (
                <div key={i} className="flex justify-between items-center bg-background/50 p-2.5 rounded-lg border border-border/50">
                  <div>
                    <p className="text-sm font-bold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.department} {p.position ? `• ${p.position}` : ''}</p>
                  </div>
                  <span className="text-xs font-bold text-foreground bg-muted px-2 py-1 rounded">{p.staffId}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedSubmission.data.attachments && selectedSubmission.data.attachments.length > 0 ? (
          <div className="space-y-3 mb-6">
            {selectedSubmission.data.attachments.map((url: string, idx: number) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block border border-dashed border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-primary">View Attachment {idx + 1} / Lihat Lampiran {idx + 1}</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        ) : selectedSubmission.data.attachment && (
          <a href={selectedSubmission.data.attachment} target="_blank" rel="noopener noreferrer" className="block border border-dashed border-border rounded-xl p-4 flex items-center justify-between mb-6 cursor-pointer hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-primary">View Attachment / Lihat Lampiran</span>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        )}

        {selectedSubmission.data.remarks && (
          <div className={`p-4 rounded-xl border mb-6 ${selectedSubmission.status === 'rejected' ? 'bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Previous Remarks / Ulasan Terdahulu</p>
            <p className="text-sm font-medium">"{selectedSubmission.data.remarks}"</p>
          </div>
        )}

        {(() => {
          const canApprove = (isHOS && selectedSubmission.status === "pending") || 
                             (isHOD && selectedSubmission.status === "approved_hos") ||
                             (isHOP && selectedSubmission.formType === 'claim' && selectedSubmission.status === "approved_hod") ||
                             (isHOF && selectedSubmission.status === "approved_hop");
          if (!canApprove) {
            const alreadyApproved = (isHOS && ["approved_hos", "approved_hod", "approved_hop", "approved_hof", "approved"].includes(selectedSubmission.status)) ||
                                    (isHOD && ["approved_hod", "approved_hop", "approved_hof", "approved"].includes(selectedSubmission.status)) ||
                                    (isHOP && ["approved_hop", "approved_hof", "approved"].includes(selectedSubmission.status)) ||
                                    (isHOF && ["approved_hof", "approved"].includes(selectedSubmission.status));

            if (selectedSubmission.status === "rejected") {
              return (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-center flex items-center justify-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm text-destructive dark:text-red-400 font-medium">
                    This submission has been rejected.
                  </p>
                </div>
              );
            }

            if (alreadyApproved) {
              return (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                    You have already approved this submission.
                  </p>
                </div>
              );
            }

            if ((isHOD || isHOP || isHOF) && selectedSubmission.status === "pending") {
              return (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                    Waiting for Head of Section (HOS) approval first.
                  </p>
                </div>
              );
            }

            if ((isHOP || isHOF) && selectedSubmission.status === "approved_hos") {
              return (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                    Waiting for Head of Department (HOD) approval first.
                  </p>
                </div>
              );
            }

            if (isHOF && selectedSubmission.status === "approved_hod") {
              return (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                    Waiting for Head of Purchasing (HOP) approval first.
                  </p>
                </div>
              );
            }

            return (
              <div className="p-4 bg-muted/30 rounded-xl text-center">
                <p className="text-sm text-muted-foreground font-medium">No action required at this time.</p>
              </div>
            );
          }
          return (
            <>
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">REMARKS / ULASAN</p>
              <Input
                placeholder="Please enter remarks if any / Sila masukkan ulasan jika ada..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="mb-6 h-12 bg-muted/20"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => handleAction(selectedSubmission.id, "rejected")}
                  className="w-1/3 px-6 py-4 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors"
                >
                  REJECT / TOLAK
                </button>
                <button
                  onClick={() => {
                    let nextStatus: SubmissionStatus = "approved";
                    if (isHOS && selectedSubmission.status === "pending") {
                      nextStatus = "approved_hos";
                    } else if (isHOD && selectedSubmission.status === "approved_hos") {
                      nextStatus = "approved_hod";
                    } else if (isHOP && selectedSubmission.status === "approved_hod") {
                      nextStatus = "pending_finance_review";
                    } else if (isHOF && selectedSubmission.status === "approved_hop") {
                      nextStatus = "approved_hof";
                    }
                    handleAction(selectedSubmission.id, nextStatus);
                  }}
                  className="w-2/3 px-6 py-4 rounded-xl bg-emerald-500 text-white font-bold text-center hover:bg-emerald-600 transition-colors"
                >
                  APPROVE / LULUS
                </button>
              </div>
            </>
          );
        })()}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 slide-in-from-bottom-2 duration-500">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Pending Approvals / Kelulusan Tertangguh</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card-elevated p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <p className="text-xs font-bold text-primary uppercase tracking-wider">Total Assigned</p>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-1">All Forms</p>
        </div>
        <div className="card-elevated p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Action Required</p>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.actionRequired}</p>
          <p className="text-xs text-muted-foreground mt-1">Needs Your Review</p>
        </div>
        <div className="card-elevated p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">In Progress</p>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.inProgress}</p>
          <p className="text-xs text-muted-foreground mt-1">Waiting on Others</p>
        </div>
        <div className="card-elevated p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Resolved</p>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.resolved}</p>
          <p className="text-xs text-muted-foreground mt-1">Completed History</p>
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
          <h2 className="text-lg font-bold text-foreground">Submissions / Penyerahan</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, date, or type..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setIsViewAll(false); }} 
              className="pl-9 w-full sm:w-72 h-9 text-sm" 
            />
          </div>
        </div>

        {tabFiltered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No submissions found in this tab</h3>
            <p className="text-sm text-muted-foreground mt-1">Forms assigned to you will appear here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Employee / Pekerja</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Date / Tarikh</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Type / Jenis</TableHead>
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
                        <div className="w-1 h-12 rounded-full bg-primary" />
                    <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${!avatarUrl ? getInitialColor(sub.employeeName) : 'bg-transparent'}`}>
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
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {formTypeLabels[sub.formType] || sub.formType.toUpperCase().replace(/_/g, ' ')}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">{statusBadge(sub.status)}</TableCell>
                    <TableCell className="text-center">
                      <button onClick={() => setSelectedSubmission(sub)} className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors whitespace-nowrap">
                        View Details
                      </button>
                    </TableCell>
                  </TableRow>
              );
            })}
              </TableBody>
            </Table>
            </div>
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Showing {Math.min(tabFiltered.length, isViewAll ? tabFiltered.length : 10)} of {tabFiltered.length} entries</p>
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

export default ApproverDashboard;