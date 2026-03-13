import { useState } from "react";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Car, CalendarDays, Receipt, Clock, CheckCircle, XCircle, Eye, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const formTypeLabels: Record<string, { label: string; icon: typeof Car }> = {
  car_rental: { label: "Car Rental", icon: Car },
  leave: { label: "Leave", icon: CalendarDays },
  claim: { label: "Claim", icon: Receipt },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "status-pending" },
  approved_hos: { label: "Approved (HOS)", className: "bg-accent/10 text-accent-foreground" },
  approved_hod: { label: "Approved (HOD)", className: "bg-accent/10 text-accent-foreground" },
  approved: { label: "Approved", className: "status-approved" },
  rejected: { label: "Rejected", className: "status-rejected" },
};

const AdminDashboard = ({ title, filterByDepartment }: { title: string; filterByDepartment?: string }) => {
  const { submissions, updateSubmissionStatus } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered = submissions
    .filter(s => filterByDepartment ? s.department === filterByDepartment : true)
    .filter(s => filter === "all" || s.formType === filter);

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
                {formTypeLabels[selectedSubmission.formType]?.label} Request
              </h2>
              <p className="text-sm text-muted-foreground">by {selectedSubmission.employeeName} · {selectedSubmission.department}</p>
            </div>
            <Badge variant="outline" className={`${statusConfig[selectedSubmission.status]?.className} border-0`}>
              {statusConfig[selectedSubmission.status]?.label}
            </Badge>
          </div>

          <div className="space-y-3 mb-6">
            {Object.entries(selectedSubmission.data).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                <span className="text-sm font-medium text-foreground">{String(value)}</span>
              </div>
            ))}
          </div>

          {selectedSubmission.status === "pending" && (
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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and manage submissions</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[{ value: "all", label: "All" }, { value: "car_rental", label: "Car Rental" }, { value: "leave", label: "Leave" }, { value: "claim", label: "Claims" }].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No submissions found</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const { label, icon: Icon } = formTypeLabels[sub.formType] || { label: sub.formType, icon: Clock };
            const status = statusConfig[sub.status] || statusConfig.pending;
            return (
              <div key={sub.id} className="card-elevated p-5 flex items-center gap-4 cursor-pointer hover:border-accent/50 transition-colors" onClick={() => setSelectedSubmission(sub)}>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-foreground text-sm">{label}</span>
                    <Badge variant="outline" className={`text-xs px-2 py-0.5 ${status.className} border-0`}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{sub.employeeName} · {sub.department}</p>
                </div>
                <div className="text-xs text-muted-foreground mr-2">
                  {new Date(sub.submittedAt).toLocaleDateString("en-MY", { month: "short", day: "numeric" })}
                </div>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
