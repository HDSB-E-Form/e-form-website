import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, CheckCircle, XCircle, Clock, Eye, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request / Permintaan Kenderaan",
  leave: "Exit Pass / Pas Keluar",
  claim: "Misc. Advance / Pendahuluan Pelbagai",
};

type FilterType = "all" | "pending" | "approved" | "rejected";

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">✓ Approved</Badge>;
    case "approved_hos":
      return <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">✓ Approved</Badge>;
    case "approved_hod":
      return <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">✓ Approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-50 text-red-600 border-0 text-xs">✗ Rejected</Badge>;
    case "pending":
    default:
      return <Badge className="bg-amber-50 text-amber-700 border-0 text-xs">⊙ Pending</Badge>;
  }
};

const naStatus = () => (
  <Badge className="bg-muted text-muted-foreground border-0 text-xs">⊘ N/A</Badge>
);

const getOverallStatus = (sub: Submission) => {
  if (sub.status === "rejected") return { label: "Rejected", color: "bg-destructive", progress: 100 };
  if (sub.status === "approved") return { label: "Fully Approved", color: "bg-emerald-500", progress: 100 };
  if (sub.status === "approved_hod") return { label: "Under Review", color: "bg-primary", progress: 75 };
  if (sub.status === "approved_hos") return { label: "Under Review", color: "bg-primary", progress: 50 };
  return { label: "Pending", color: "bg-muted-foreground/50", progress: 25 };
};

const MySubmissions = () => {
  const { user } = useAuth();
  const { submissions } = useSubmissions();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

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
    const year = new Date(sub.submittedAt).getFullYear();
    const num = sub.id.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    return `DH-${year}-${num}`;
  };

  if (selectedSubmission) {
    const overall = getOverallStatus(selectedSubmission);
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <button onClick={() => setSelectedSubmission(null)} className="flex items-center text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
        </button>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {formTypeLabels[selectedSubmission.formType] || selectedSubmission.formType}
              </h2>
              <p className="text-sm text-muted-foreground">Ref: {generateRefNo(selectedSubmission)} · {selectedSubmission.department}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-16 h-2 rounded-full ${overall.color}`} />
              <span className="text-xs font-medium text-foreground">{overall.label}</span>
            </div>
          </div>
          <div className="space-y-3 mb-6">
            {Object.entries(selectedSubmission.data).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                <span className="text-sm font-medium text-foreground">{String(value)}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Section Head</p>
              {selectedSubmission.status !== "pending" ? statusBadge("approved") : statusBadge("pending")}
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Dept Head</p>
              {["approved_hod", "approved"].includes(selectedSubmission.status) ? statusBadge("approved") : selectedSubmission.status === "rejected" ? naStatus() : statusBadge("pending")}
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Admin</p>
              {selectedSubmission.status === "approved" ? statusBadge("approved") : selectedSubmission.status === "rejected" ? naStatus() : statusBadge("pending")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Permohonan Saya</span> / <span className="font-semibold text-foreground">My Submissions</span>
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
          { value: "all", label: "All / Semua" },
          { value: "pending", label: "Pending / Menunggu" },
          { value: "approved", label: "Accepted / Diterima" },
          { value: "rejected", label: "Rejected / Ditolak" },
        ] as { value: FilterType; label: string }[]).map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
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
                <TableHead className="text-xs font-bold uppercase tracking-wider">Ref No. / No. Ruj</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Department / Jabatan</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Form Type / Jenis Borang</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Section Head</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Dept Head</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Admin</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Overall Status</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => {
                const overall = getOverallStatus(sub);
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
                      <button onClick={() => setSelectedSubmission(sub)} className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 mx-auto">
                        View <Eye className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {/* Pagination */}
          <div className="flex justify-end items-center gap-1 p-4 border-t border-border">
            <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySubmissions;
