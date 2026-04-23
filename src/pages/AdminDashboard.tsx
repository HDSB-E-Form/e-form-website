import { useState } from "react";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request",
  claim: "Expense",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs font-medium px-3 py-1">Fully Approved</Badge>;
    case "approved_hod":
      return <Badge className="bg-blue-50 text-blue-700 border-0 text-xs font-medium px-3 py-1">HOD Approved</Badge>;
    case "approved_hos":
      return <Badge className="bg-sky-50 text-sky-700 border-0 text-xs font-medium px-3 py-1">HOS Approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-50 text-red-600 border-0 text-xs font-medium px-3 py-1">Rejected</Badge>;
    case "pending":
    default:
      return <Badge className="bg-amber-50 text-amber-700 border-0 text-xs font-medium px-3 py-1">Pending HOS</Badge>;
  }
};

const getInitials = (name?: string) =>
  (name || " ").split(" ").map(n => n ? n[0] : "").join("").toUpperCase().slice(0, 2);

const getInitialColor = (name: string) => {
  const colors = ["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700"];
  let hash = 0;
  const safeName = name || " ";
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// HR Admin Dashboard - sees leave and car_rental forms only
const AdminDashboard = () => {
  const { submissions, updateSubmissionStatus } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [activeTab, setActiveTab] = useState<"action_required" | "in_progress" | "history">("action_required");
  const [isViewAll, setIsViewAll] = useState(false);

  // HR admin only sees leave and car_rental forms
  const filtered = submissions
    .filter(s => s.formType === "car_rental")
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
    return hours < 48; // Checks if submitted within the last 48 hours
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

  const generateRefNo = (sub: Submission) => {
    const num = sub.id.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    return `HDSB-${num}`;
  };

  const handleAction = (id: string, status: SubmissionStatus) => {
    updateSubmissionStatus(id, status, remarks);
    toast.success(`Submission ${status === "approved" ? "accepted" : "rejected"} successfully`);
    setSelectedSubmission(null);
    setRemarks("");
  };

  const renderCarRentalDetail = (sub: Submission) => {
    const refNo = generateRefNo(sub);
    const startDate = sub.data.fromDate ? new Date(sub.data.fromDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
    const endDate = sub.data.toDate ? new Date(sub.data.toDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="inline-flex items-center justify-center w-12 h-12 text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group print:hidden">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <h2 className="text-xl font-bold text-foreground">Semakan Permohonan / Review Submission</h2>
        </div>

        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">MAKLUMAT PEKERJA / EMPLOYEE SUMMARY</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-8">
          <p className="text-lg font-bold text-foreground">{sub.employeeName}</p>
          <p className="text-sm text-muted-foreground mb-3">Staff ID: {sub.data.staffId || sub.submittedBy}</p>
          <p className="text-sm font-medium text-primary">{sub.department}</p>
        </div>

        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">RINGKASAN PERMOHONAN / SUBMISSION SUMMARY</p>
        <div className="bg-muted/30 rounded-xl divide-y divide-border mb-8">
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-primary">Ref No</span>
            <span className="text-sm font-bold text-foreground">{refNo}</span>
          </div>
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-primary">Form Type</span>
            <Badge className="bg-sky-100 text-sky-800 border-0 text-xs font-bold">RENT CAR FORM</Badge>
          </div>
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-primary">Journey Dates</span>
            <span className="text-sm font-bold text-foreground">{startDate} - {endDate}</span>
          </div>
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-primary">Destination</span>
            <span className="text-sm font-bold text-foreground">{sub.data.destination || "—"}</span>
          </div>
          <div className="flex justify-between items-start px-5 py-3">
            <span className="text-sm text-primary shrink-0 mr-4">Purpose</span>
            <span className="text-sm font-bold text-foreground text-right">{sub.data.purpose || "No purpose provided"}</span>
          </div>
          {sub.data.licenseAttachment && (
            <div className="flex justify-between items-center px-5 py-3">
              <span className="text-sm text-primary shrink-0 mr-4">Attachment</span>
              <a href={sub.data.licenseAttachment} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5 text-right">
                <FileText className="h-4 w-4" /> View Driving License
              </a>
            </div>
          )}
          {sub.data.passengers && sub.data.passengers.some((p: any) => p.name) && (
            <div className="px-5 py-4 border-t border-border/50 bg-background/30">
              <span className="text-sm text-primary font-bold block mb-3">Passengers / Penumpang</span>
              <div className="space-y-2">
                {sub.data.passengers.filter((p: any) => p.name).map((p: any, i: number) => (
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
        </div>
      </>
    );
  };

  // Review detail view
  if (selectedSubmission) {
    const isCarRental = selectedSubmission.formType === "car_rental";
    // Enforce strict 3-step approval: HOS -> HOD -> HR
    const canApprove = selectedSubmission.status === "approved_hod";
    const isPending = selectedSubmission.status === "pending" || selectedSubmission.status === "approved_hos" || selectedSubmission.status === "approved_hod";

    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        {isCarRental && renderCarRentalDetail(selectedSubmission)}

        {selectedSubmission.data.remarks && (
          <div className={`p-4 rounded-xl border mb-6 ${selectedSubmission.status === 'rejected' ? 'bg-red-50 border-red-100 text-red-900' : 'bg-blue-50 border-blue-100 text-blue-900'}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Approver Remarks</p>
            <p className="text-sm font-medium">"{selectedSubmission.data.remarks}"</p>
          </div>
        )}

        {isPending && !canApprove && (
          <div className="p-4 bg-muted/30 rounded-xl text-center">
            <p className="text-sm text-muted-foreground font-medium">
              {selectedSubmission.status === "pending" ? "Waiting for Head of Section (HOS) approval." :
               selectedSubmission.status === "approved_hos" ? "Waiting for Head of Department (HOD) approval." :
               "No action required at this time."}
            </p>
          </div>
        )}

        {canApprove && (
          <>
            <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">ULASAN / REMARKS (OPTIONAL)</p>
            <Input
              placeholder={isCarRental ? "Enter any additional comments or reasons here..." : "Sila masukkan ulasan jika ada / Please enter remarks if any..."}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="mb-8 h-12 bg-muted/20"
            />
            <div className="flex gap-4">
              <button
                onClick={() => handleAction(selectedSubmission.id, "rejected")}
                className="flex-1 px-6 py-4 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors"
              >
                TOLAK / REJECT
              </button>
              <button
                onClick={() => handleAction(selectedSubmission.id, "approved")}
                className="flex-1 px-6 py-4 rounded-xl bg-emerald-500 text-white font-bold text-center hover:bg-emerald-600 transition-colors"
              >
                TERIMA / ACCEPT
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">HR Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve all incoming Vehicle Requests.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Submissions</p>
            <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] font-semibold px-2">+12%</Badge>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.total > 0 ? `${stats.total}` : "0"}</p>
          <p className="text-xs text-muted-foreground mt-1">Current fiscal year / Tahun kewangan semasa</p>
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Action Required</p>
            {stats.actionRequired > 0 ? (
              <Badge className="bg-red-50 text-red-700 border-0 text-[10px] font-semibold px-2 animate-pulse">Needs Review</Badge>
            ) : (
              <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] font-semibold px-2">All Cleared</Badge>
            )}
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.actionRequired}</p>
          <p className="text-xs text-muted-foreground mt-1">Forms waiting for your final approval</p>
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Approval Rate</p>
            <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] font-semibold px-2">+2%</Badge>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.approvalRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">Compliance target: 90% / Sasaran pematuhan: 90%</p>
        </div>
      </div>

      {/* Action Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => { setActiveTab("action_required"); setIsViewAll(false); }} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors border ${activeTab === "action_required" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
          Action Required (Inbox)
          {stats.actionRequired > 0 && (
            <Badge className="ml-2 border-0 text-xs px-2 bg-red-500 text-white hover:bg-red-600">{stats.actionRequired}</Badge>
          )}
        </button>
        <button onClick={() => { setActiveTab("in_progress"); setIsViewAll(false); }} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors border ${activeTab === "in_progress" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
          In Progress (Waiting)
          {stats.inProgress > 0 && (
            <Badge className="ml-2 border-0 text-xs px-2 bg-amber-500 text-white hover:bg-amber-600">{stats.inProgress}</Badge>
          )}
        </button>
        <button onClick={() => { setActiveTab("history"); setIsViewAll(false); }} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors border ${activeTab === "history" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
          History
        </button>
      </div>

      {/* Submissions Table */}
      <div className="card-elevated overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Recent Submissions / Penyerahan Terkini</h2>
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
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-bold uppercase tracking-wider">ID</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Employee / Pekerja</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Status / Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
            {(isViewAll ? tabFiltered : tabFiltered.slice(0, 10)).map((sub) => {
              const avatarUrl = (sub as any).avatar || sub.data?.employeeInfo?.avatar || sub.data?.avatar;
              return (
                <TableRow key={sub.id} className={`${activeTab === "action_required" && isRecent(sub.submittedAt) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"}`}>
                    <TableCell className="text-sm font-medium text-muted-foreground">{generateRefNo(sub)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${!avatarUrl ? getInitialColor(sub.employeeName) : 'bg-transparent'}`}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={sub.employeeName} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(sub.employeeName)
                      )}
                        </div>
                        <span className="text-sm font-medium text-foreground">{sub.employeeName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{formTypeLabels[sub.formType] || sub.formType}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-sm text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString("en-CA")}</span>
                        {activeTab === "action_required" && isRecent(sub.submittedAt) && (
                          <Badge className="bg-blue-500 text-white border-0 text-[9px] px-1.5 py-0 uppercase tracking-wider font-bold">NEW</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(sub.status)}</TableCell>
                    <TableCell className="text-center">
                      <button onClick={() => setSelectedSubmission(sub)} className="text-sm font-bold text-foreground hover:text-primary">
                        {sub.status === "pending" || sub.status === "approved_hos" || sub.status === "approved_hod" ? "Review" : "Details"}
                      </button>
                    </TableCell>
                  </TableRow>
              );
            })}
              </TableBody>
            </Table>
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

export default AdminDashboard;
