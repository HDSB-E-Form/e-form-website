import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, SlidersHorizontal, ChevronLeft, ChevronRight, ArrowLeft, FileText, ExternalLink, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const formTypeLabels: Record<string, { en: string; ms: string }> = {
  car_rental: { en: "TRAVEL / VOYAGE", ms: "Perjalanan" },
  leave: { en: "LEAVE REQUEST / CONGÉ", ms: "Cuti" },
  claim: { en: "EXPENSE / FRAIS", ms: "Perbelanjaan" },
};

const priorityDot = (formType: string) => {
  const colors: Record<string, string> = {
    leave: "bg-red-500",
    car_rental: "bg-amber-500",
    claim: "bg-muted-foreground/40",
  };
  return <span className={`w-3 h-3 rounded-full inline-block ${colors[formType] || "bg-muted-foreground/40"}`} />;
};

const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const getInitialColor = (name: string) => {
  const colors = ["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700"];
  return colors[name.charCodeAt(0) % colors.length];
};

const ApproverDashboard = () => {
  const { user } = useAuth();
  const { submissions, updateSubmissionStatus } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");

  const isHOD = user?.role === "hod";
  const isHOS = user?.role === "hos";

  // HOD/HOS only sees forms where they were selected as approver
  // Also check car rental form's hos/hod fields
  const filtered = submissions
    .filter(s => {
      const hosValue = s.data.hosName || s.data.hos;
      const hodValue = s.data.hodName || s.data.hod;
      if (isHOS && hosValue === user?.name) return true;
      if (isHOD && hodValue === user?.name) return true;
      return false;
    })
    .filter(s => {
      // HOS sees pending submissions, HOD sees approved_hos submissions
      if (isHOS) return s.status === "pending" || s.status === "approved_hos" || s.status === "approved_hod" || s.status === "approved" || s.status === "rejected";
      if (isHOD) return s.status === "approved_hos" || s.status === "approved_hod" || s.status === "approved" || s.status === "rejected";
      return true;
    })
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      return s.employeeName.toLowerCase().includes(q) || s.id.includes(q);
    });

  const stats = {
    total: filtered.length,
    pending: filtered.filter(s => s.status === "pending" || s.status === "approved_hos" || s.status === "approved_hod").length,
    approved: filtered.filter(s => s.status === "approved").length,
    rejected: filtered.filter(s => s.status === "rejected").length,
  };

  const generateRefNo = (sub: Submission) => {
    const year = new Date(sub.submittedAt).getFullYear();
    const num = sub.id.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    return `REQ-${year}-${num}`;
  };

  const handleAction = (id: string, status: SubmissionStatus) => {
    updateSubmissionStatus(id, status);
    toast.success(`Submission ${status === "approved" || status === "approved_hos" || status === "approved_hod" ? "accepted" : "rejected"} successfully`);
    setSelectedSubmission(null);
    setRemarks("");
  };

  // Review detail view
  if (selectedSubmission) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="flex items-center text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
        </button>

        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">MAKLUMAT PEKERJA / EMPLOYEE SUMMARY</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-6">
          <p className="text-lg font-bold text-foreground">{selectedSubmission.employeeName}</p>
          <p className="text-sm text-muted-foreground mb-3">{selectedSubmission.data.employeeId || selectedSubmission.submittedBy}</p>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">{selectedSubmission.department}</Badge>
            <Badge variant="outline" className="text-xs">{selectedSubmission.data.designation || "Staff"}</Badge>
          </div>
        </div>

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
                {formTypeLabels[selectedSubmission.formType]?.en || selectedSubmission.formType.toUpperCase()}
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
            {selectedSubmission.data.amount && (
              <div>
                <p className="text-xs text-muted-foreground">Amount / Amaun</p>
                <p className="text-sm font-bold text-primary">RM {selectedSubmission.data.amount}</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Details / Butiran</p>
            <p className="text-sm text-foreground mt-1">
              {selectedSubmission.data.description || selectedSubmission.data.purpose || selectedSubmission.data.reason || "No details provided"}
            </p>
          </div>
        </div>

        <div className="border border-dashed border-border rounded-xl p-4 flex items-center justify-between mb-6 cursor-pointer hover:bg-muted/20">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-primary">Lihat Lampiran / View Attachment</span>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </div>

        {(selectedSubmission.status === "pending" || selectedSubmission.status === "approved_hos" || selectedSubmission.status === "approved_hod") && (
          <>
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">ULASAN / REMARKS (OPTIONAL)</p>
            <Textarea
              placeholder="Sila masukkan ulasan jika ada..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="mb-6 min-h-[100px]"
            />
            <div className="flex gap-4">
              <button
                onClick={() => handleAction(selectedSubmission.id, "rejected")}
                className="flex-1 px-6 py-4 rounded-xl border-2 border-destructive text-destructive font-bold text-center hover:bg-destructive/10 transition-colors"
              >
                <span className="block text-base">Tolak</span>
                <span className="block text-xs font-medium opacity-70">REJECT</span>
              </button>
              <button
                onClick={() => {
                  const nextStatus = isHOD ? "approved_hod" : "approved_hos";
                  handleAction(selectedSubmission.id, nextStatus);
                }}
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
        <h1 className="text-2xl font-bold text-foreground">Pending Approvals / Approbations en attente</h1>
      </div>

      {/* Stats Cards - 4 columns like image-11 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card-elevated p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <p className="text-xs font-bold text-primary uppercase tracking-wider">Total Received</p>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-1">Reçus au total</p>
        </div>
        <div className="card-elevated p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending</p>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.pending}</p>
          <p className="text-xs text-muted-foreground mt-1">En attente</p>
        </div>
        <div className="card-elevated p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Approved</p>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.approved}</p>
          <p className="text-xs text-muted-foreground mt-1">Approuvés</p>
        </div>
        <div className="card-elevated p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Rejected</p>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.rejected}</p>
          <p className="text-xs text-muted-foreground mt-1">Rejetés</p>
        </div>
      </div>

      {/* Table */}
      <div className="card-elevated overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Submissions / Soumissions</h2>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted/50">
              <SlidersHorizontal className="h-4 w-4" /> Filter
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted/50">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No submissions assigned to you</h3>
            <p className="text-sm text-muted-foreground mt-1">Forms will appear here when employees select you as their approver.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Employee / Employé</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Date / Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Type / Type</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Priority</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-12 rounded-full bg-primary" />
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${getInitialColor(sub.employeeName)}`}>
                          {getInitials(sub.employeeName)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{sub.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{sub.data.designation || sub.department}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(sub.submittedAt).toLocaleDateString("en-CA")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                        {formTypeLabels[sub.formType]?.en || sub.formType.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{priorityDot(sub.formType)}</TableCell>
                    <TableCell className="text-center">
                      <button onClick={() => setSelectedSubmission(sub)} className="text-sm font-bold text-foreground hover:text-primary">
                        View Details / Détails
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Showing 1 to {filtered.length} of {filtered.length} entries</p>
              <div className="flex gap-1">
                <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground"><ChevronLeft className="h-4 w-4" /></button>
                <button className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</button>
                <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ApproverDashboard;
