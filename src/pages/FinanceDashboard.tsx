import { useState } from "react";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const formTypeLabels: Record<string, string> = {
  claim: "TRAVEL CLAIM",
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

const FinanceDashboard = () => {
  const { submissions, updateSubmissionStatus } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [activeTab, setActiveTab] = useState<"action_required" | "in_progress" | "history">("action_required");
  const [isViewAll, setIsViewAll] = useState(false);

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

  // Review detail view matching the template (image-9)
  if (selectedSubmission) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to list
        </button>

        {/* Employee Summary */}
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">MAKLUMAT PEKERJA / EMPLOYEE SUMMARY</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-6">
          <p className="text-lg font-bold text-foreground">{selectedSubmission.employeeName}</p>
          <p className="text-sm text-muted-foreground mb-3">{selectedSubmission.data.employeeInfo?.employeeNumber || selectedSubmission.submittedBy}</p>
          <p className="text-sm font-medium text-primary">{selectedSubmission.department}</p>
        </div>

        {/* Submission Summary */}
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">RINGKASAN PERMOHONAN / SUBMISSION SUMMARY</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Ref No / No. Rujukan</p>
              <p className="text-sm font-bold text-foreground">{generateRefNo(selectedSubmission)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Form Type / Jenis Borang</p>
              <Badge className="bg-amber-100 text-amber-800 border-0 text-xs font-bold mt-1">
                {formTypeLabels[selectedSubmission.formType] || selectedSubmission.formType.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-bold text-foreground">
                {new Date(selectedSubmission.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-sm font-bold text-primary">
                RM {selectedSubmission.data.amount || selectedSubmission.data.totalAmount || "0.00"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Details</p>
            <p className="text-sm text-foreground mt-1">
              {selectedSubmission.data.description || selectedSubmission.data.purpose || "No details provided"}
            </p>
          </div>
        </div>

        {/* Attachment */}
        {selectedSubmission.data.attachment && (
          <a href={selectedSubmission.data.attachment} target="_blank" rel="noopener noreferrer" className="block border border-dashed border-border rounded-xl p-4 flex items-center justify-between mb-6 cursor-pointer hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-primary">View Attachment / Lihat Lampiran</span>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        )}

        {selectedSubmission.data.remarks && (
          <div className={`p-4 rounded-xl border mb-6 ${selectedSubmission.status === 'rejected' ? 'bg-red-50 border-red-100 text-red-900' : 'bg-blue-50 border-blue-100 text-blue-900'}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Previous Remarks</p>
            <p className="text-sm font-medium">"{selectedSubmission.data.remarks}"</p>
          </div>
        )}

        {/* Remarks & Actions - only when HOD has approved */}
        {selectedSubmission.status === "approved_hod" && (
          <>
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">ULASAN / REMARKS (OPTIONAL)</p>
            <Input
              placeholder="Sila masukkan ulasan jika ada..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="mb-6 h-12 bg-muted/20"
            />

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => handleAction(selectedSubmission.id, "rejected")}
                className="flex-1 px-6 py-4 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors"
              >
                <span className="block text-base">Tolak</span>
                <span className="block text-xs font-medium opacity-70">REJECT</span>
              </button>
              <button
                onClick={() => handleAction(selectedSubmission.id, "approved")}
                className="flex-1 px-6 py-4 rounded-xl bg-emerald-500 text-white font-bold text-center hover:bg-emerald-600 transition-colors"
              >
                <span className="block text-base">Terima</span>
                <span className="block text-xs font-medium opacity-80">ACCEPT</span>
              </button>
            </div>
          </>
        )}

        {(selectedSubmission.status === "pending" || selectedSubmission.status === "approved_hos") && (
          <div className="p-4 bg-muted/30 rounded-xl text-center">
            <p className="text-sm text-muted-foreground font-medium">
              {selectedSubmission.status === "pending" ? "Waiting for Head of Section (HOS) approval." :
               "Waiting for Head of Department (HOD) approval."}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Department Overview / Gambaran Keseluruhan Jabatan</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage and review all incoming finance requests.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
                    <TableRow key={sub.id} className={`${activeTab === "action_required" && isRecent(sub.submittedAt) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"} print-hide-finance-claim-row`}>
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
                      <TableCell className="text-sm text-foreground">Expense</TableCell>
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
                          {sub.status === "approved_hod" ? "Review" : "Details"}
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

export default FinanceDashboard;
