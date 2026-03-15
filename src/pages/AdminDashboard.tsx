import { useState } from "react";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, CheckCircle, XCircle, Eye, ArrowLeft, Search, SlidersHorizontal, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const formTypeLabels: Record<string, string> = {
  car_rental: "Travel",
  leave: "Leave",
  claim: "Expense",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs font-medium px-3 py-1">Approved</Badge>;
    case "approved_hos":
    case "approved_hod":
      return <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs font-medium px-3 py-1">Approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-50 text-red-600 border-0 text-xs font-medium px-3 py-1">Rejected</Badge>;
    case "pending":
    default:
      return <Badge className="bg-amber-50 text-amber-700 border-0 text-xs font-medium px-3 py-1">Pending</Badge>;
  }
};

const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

const getInitialColor = (name: string) => {
  const colors = ["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700"];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
};

const AdminDashboard = ({ title, filterByDepartment }: { title: string; filterByDepartment?: string }) => {
  const { submissions, updateSubmissionStatus } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");

  const filtered = submissions
    .filter(s => filterByDepartment ? s.department === filterByDepartment : true)
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      return s.employeeName.toLowerCase().includes(q) || s.id.includes(q) || s.formType.includes(q);
    });

  const stats = {
    total: filtered.length,
    pending: filtered.filter(s => s.status === "pending" || s.status === "approved_hos" || s.status === "approved_hod").length,
    approvalRate: filtered.length > 0 ? Math.round((filtered.filter(s => s.status === "approved").length / filtered.length) * 100) : 0,
  };

  const generateId = (sub: Submission) => {
    const num = sub.id.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    return `#${num}`;
  };

  const handleAction = (id: string, status: SubmissionStatus) => {
    updateSubmissionStatus(id, status);
    toast.success(`Submission ${status === "approved" ? "approved" : "rejected"} successfully`);
    setSelectedSubmission(null);
  };

  if (selectedSubmission) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <button onClick={() => setSelectedSubmission(null)} className="flex items-center text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
        </button>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {formTypeLabels[selectedSubmission.formType] || selectedSubmission.formType} Request
              </h2>
              <p className="text-sm text-muted-foreground">by {selectedSubmission.employeeName} · {selectedSubmission.department}</p>
            </div>
            {statusBadge(selectedSubmission.status)}
          </div>

          <div className="space-y-3 mb-6">
            {Object.entries(selectedSubmission.data).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                <span className="text-sm font-medium text-foreground">{String(value)}</span>
              </div>
            ))}
          </div>

          {(selectedSubmission.status === "pending" || selectedSubmission.status === "approved_hos" || selectedSubmission.status === "approved_hod") && (
            <div className="flex gap-3">
              <button onClick={() => handleAction(selectedSubmission.id, "approved")} className="btn-gold flex-1 flex items-center justify-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4" /> Approve
              </button>
              <button onClick={() => handleAction(selectedSubmission.id, "rejected")} className="flex-1 px-6 py-3 rounded-lg border border-destructive text-destructive font-semibold text-sm hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2">
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Department Overview / Aperçu du département</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage and review all incoming department requests.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Submissions</p>
            <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] font-semibold px-2">+12%</Badge>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.total > 0 ? "1,284" : "0"}</p>
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
              <Input
                placeholder="Search / Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 w-56 h-9 text-sm"
              />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted/50">
              <SlidersHorizontal className="h-4 w-4" /> Filter
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No submissions found</h3>
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
                {filtered.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm font-medium text-muted-foreground">{generateId(sub)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getInitialColor(sub.employeeName)}`}>
                          {getInitials(sub.employeeName)}
                        </div>
                        <span className="text-sm font-medium text-foreground">{sub.employeeName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{formTypeLabels[sub.formType] || sub.formType}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(sub.submittedAt).toLocaleDateString("en-CA")}
                    </TableCell>
                    <TableCell>{statusBadge(sub.status)}</TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => setSelectedSubmission(sub)}
                        className="text-sm font-bold text-foreground hover:text-primary"
                      >
                        {sub.status === "pending" || sub.status === "approved_hos" || sub.status === "approved_hod" ? "Review" : "Details"}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Showing 1-{filtered.length} of {filtered.length} results</p>
              <div className="flex gap-1">
                <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
