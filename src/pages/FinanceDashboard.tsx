import { useState } from "react";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, SlidersHorizontal, ChevronLeft, ChevronRight, ArrowLeft, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const formTypeLabels: Record<string, string> = {
  claim: "TRAVEL CLAIM",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs font-medium px-3 py-1">Approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-50 text-red-600 border-0 text-xs font-medium px-3 py-1">Rejected</Badge>;
    case "pending":
    default:
      return <Badge className="bg-amber-50 text-amber-700 border-0 text-xs font-medium px-3 py-1">Pending</Badge>;
  }
};

const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const getInitialColor = (name: string) => {
  const colors = ["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700"];
  return colors[name.charCodeAt(0) % colors.length];
};

const FinanceDashboard = () => {
  const { submissions, updateSubmissionStatus } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");

  // Finance admin only sees claim forms
  const filtered = submissions
    .filter(s => s.formType === "claim")
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      return s.employeeName.toLowerCase().includes(q) || s.id.includes(q);
    });

  const stats = {
    total: filtered.length,
    pending: filtered.filter(s => s.status === "pending").length,
    approved: filtered.filter(s => s.status === "approved").length,
    rejected: filtered.filter(s => s.status === "rejected").length,
    approvalRate: filtered.length > 0 ? Math.round((filtered.filter(s => s.status === "approved").length / filtered.length) * 100) : 0,
  };

  const generateRefNo = (sub: Submission) => {
    const year = new Date(sub.submittedAt).getFullYear();
    const num = sub.id.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    return `REQ-${year}-${num}`;
  };

  const handleAction = (id: string, status: SubmissionStatus) => {
    updateSubmissionStatus(id, status);
    toast.success(`Submission ${status === "approved" ? "accepted" : "rejected"} successfully`);
    setSelectedSubmission(null);
    setRemarks("");
  };

  // Review detail view matching the template (image-9)
  if (selectedSubmission) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="flex items-center text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
        </button>

        {/* Employee Summary */}
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">MAKLUMAT PEKERJA / EMPLOYEE SUMMARY</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-6">
          <p className="text-lg font-bold text-foreground">{selectedSubmission.employeeName}</p>
          <p className="text-sm text-muted-foreground mb-3">{selectedSubmission.data.employeeId || selectedSubmission.submittedBy}</p>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">{selectedSubmission.department}</Badge>
            <Badge variant="outline" className="text-xs">{selectedSubmission.data.designation || "Staff"}</Badge>
          </div>
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
              <p className="text-xs text-muted-foreground">Date / Tarikh</p>
              <p className="text-sm font-bold text-foreground">
                {new Date(selectedSubmission.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount / Amaun</p>
              <p className="text-sm font-bold text-primary">
                RM {selectedSubmission.data.amount || selectedSubmission.data.totalAmount || "0.00"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Details / Butiran</p>
            <p className="text-sm text-foreground mt-1">
              {selectedSubmission.data.description || selectedSubmission.data.purpose || "No details provided"}
            </p>
          </div>
        </div>

        {/* Attachment */}
        <div className="border border-dashed border-border rounded-xl p-4 flex items-center justify-between mb-6 cursor-pointer hover:bg-muted/20">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-primary">Lihat Lampiran / View Attachment</span>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Remarks */}
        {(selectedSubmission.status === "pending") && (
          <>
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">ULASAN / REMARKS (OPTIONAL)</p>
            <Textarea
              placeholder="Sila masukkan ulasan jika ada..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="mb-6 min-h-[100px]"
            />

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => handleAction(selectedSubmission.id, "rejected")}
                className="flex-1 px-6 py-4 rounded-xl border-2 border-destructive text-destructive font-bold text-center hover:bg-destructive/10 transition-colors"
              >
                <span className="block text-base">Tolak</span>
                <span className="block text-xs font-medium opacity-70">REJECT</span>
              </button>
              <button
                onClick={() => handleAction(selectedSubmission.id, "approved")}
                className="flex-1 px-6 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-center hover:bg-primary/90 transition-colors"
              >
                <span className="block text-base">Terima</span>
                <span className="block text-xs font-medium opacity-80">ACCEPT</span>
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
        <h1 className="text-2xl font-bold text-foreground">Department Overview / Aperçu du département</h1>
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
          <p className="text-xs text-muted-foreground mt-1">Current fiscal year / Année en cours</p>
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Review</p>
            <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px] font-semibold px-2">Action Required</Badge>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.pending}</p>
          <p className="text-xs text-muted-foreground mt-1">Average turnaround: 2 days / Délai moyen: 2 jours</p>
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Approval Rate</p>
            <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] font-semibold px-2">+2%</Badge>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.approvalRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">Compliance target: 90% / Cible de conformité</p>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="card-elevated overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Recent Submissions / Soumissions récentes</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search / Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56 h-9 text-sm" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted/50">
              <SlidersHorizontal className="h-4 w-4" /> Filter
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No claim submissions found</h3>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-bold uppercase tracking-wider">ID</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Employee / Employé</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Status / Statut</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sub) => {
                  const num = sub.id.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
                  return (
                    <TableRow key={sub.id} className="hover:bg-muted/20">
                      <TableCell className="text-sm font-medium text-muted-foreground">#{num}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getInitialColor(sub.employeeName)}`}>
                            {getInitials(sub.employeeName)}
                          </div>
                          <span className="text-sm font-medium text-foreground">{sub.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">Expense</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(sub.submittedAt).toLocaleDateString("en-CA")}
                      </TableCell>
                      <TableCell>{statusBadge(sub.status)}</TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => setSelectedSubmission(sub)} className="text-sm font-bold text-foreground hover:text-primary">
                          {sub.status === "pending" ? "Review" : "Details"}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Showing 1-{filtered.length} of {filtered.length} results</p>
              <div className="flex gap-1">
                <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
                <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FinanceDashboard;
