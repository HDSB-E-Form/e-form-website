import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Car, CalendarDays, Receipt, Clock } from "lucide-react";

const formTypeLabels: Record<string, { label: string; icon: typeof Car }> = {
  car_rental: { label: "Car Rental", icon: Car },
  leave: { label: "Leave", icon: CalendarDays },
  claim: { label: "Claim", icon: Receipt },
};

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "status-pending" },
  approved_hos: { label: "Approved (HOS)", className: "bg-accent/10 text-accent-foreground" },
  approved_hod: { label: "Approved (HOD)", className: "bg-accent/10 text-accent-foreground" },
  approved: { label: "Approved", className: "status-approved" },
  rejected: { label: "Rejected", className: "status-rejected" },
};

const MySubmissions = () => {
  const { user } = useAuth();
  const { submissions } = useSubmissions();

  const mySubmissions = submissions.filter(s => s.submittedBy === user?.id);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Submissions</h1>
        <p className="text-muted-foreground text-sm mt-1">Track all your submitted forms</p>
      </div>

      {mySubmissions.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No submissions yet</h3>
          <p className="text-muted-foreground text-sm">Submit a form from the home page to see it here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mySubmissions.map((sub) => (
            <SubmissionCard key={sub.id} submission={sub} />
          ))}
        </div>
      )}
    </div>
  );
};

function SubmissionCard({ submission }: { submission: Submission }) {
  const { label, icon: Icon } = formTypeLabels[submission.formType] || { label: submission.formType, icon: Clock };
  const status = statusLabels[submission.status] || statusLabels.pending;

  return (
    <div className="card-elevated p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-foreground text-sm">{label}</span>
          <Badge variant="outline" className={`text-xs px-2 py-0.5 ${status.className} border-0`}>
            {status.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Submitted on {new Date(submission.submittedAt).toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" })}
        </p>
      </div>
      <div className="text-xs text-muted-foreground">
        {submission.data.destination || submission.data.leaveType || `RM ${submission.data.amount}`}
      </div>
    </div>
  );
}

export default MySubmissions;
