import { CheckCircle, Clock3, XCircle } from "lucide-react";
import type { Submission } from "@/contexts/SubmissionsContext";
import type { ApprovalRemarkEntry } from "@/lib/approvalRemarks";

const ApprovalRemarksHistory = ({ submission }: { submission: Submission }) => {
  const rejectedStage = submission.data.rejectedStage;
  const inferredStage = rejectedStage || (() => {
    switch (submission.status) {
      case "approved_hos":
        return "hos";
      case "approved_hod":
        return "hod";
      case "pending_finance_review":
        return "hop";
      case "approved_hop":
        return "finance_review";
      case "approved_hof":
        return "hof";
      case "approved_manco":
        return "manco";
      case "paid":
      case "completed":
        return submission.formType === "claim" ? "admin" : null;
      case "approved":
        return submission.formType === "car_rental" ? "admin" : submission.formType === "leave" ? "security" : null;
      default:
        return null;
    }
  })();
  const legacyActor = (() => {
    switch (inferredStage) {
      case "hos":
        return { name: submission.data.hosName || submission.data.hos || "HOS", role: "HOS" };
      case "hod":
        return { name: submission.data.hodName || submission.data.hod || "HOD", role: "HOD" };
      case "hop":
        return { name: submission.data.hopName || "HOP", role: "HOP" };
      case "hof":
        return { name: submission.data.hofName || "HOF", role: "HOF" };
      case "manco":
        return { name: submission.data.mancoMemberName || "MANCO", role: "MANCO" };
      case "finance_review":
        return { name: submission.data.financeReviewedByName || "Finance Admin", role: "Finance Admin" };
      case "admin":
        return {
          name: submission.data.financePaidByName || submission.data.hrAdminReviewedByName || "Admin",
          role: submission.formType === "claim" ? "Finance Admin" : "HR Admin",
        };
      case "security":
        return { name: submission.data.securityReviewedByName || "Security Guard", role: "Security" };
      default:
        return { name: "Previous approver", role: "Approver" };
    }
  })();

  const storedHistory = Array.isArray(submission.data.approvalRemarksHistory)
    ? submission.data.approvalRemarksHistory as ApprovalRemarkEntry[]
    : [];

  const legacyHistory: ApprovalRemarkEntry[] = storedHistory.length === 0 && submission.data.remarks
    ? [{
        id: "legacy-remarks",
        actorName: legacyActor.name,
        actorRole: legacyActor.role,
        action: submission.status === "rejected" ? "rejected" : "approved",
        remark: String(submission.data.remarks),
        createdAt: "",
      }]
    : [];
  if (storedHistory.length === 0 && submission.data.finance_admin_remarks && submission.data.finance_admin_remarks !== submission.data.remarks) {
    legacyHistory.push({
      id: "legacy-finance-remarks",
      actorName: "Finance Admin",
      actorRole: "Finance Admin",
      action: submission.status === "rejected" ? "rejected" : "approved",
      remark: String(submission.data.finance_admin_remarks),
      createdAt: "",
    });
  }

  const history = [...storedHistory, ...legacyHistory];
  if (history.length === 0) return null;

  // Only worth showing when it carries information the Approval Overview badges
  // don't: a rejection, or an approver who actually left a written remark.
  // A clean chain of "Approved" with no notes just repeats the Overview.
  const hasContent = submission.status === "rejected"
    || history.some(entry => entry.action === "rejected" || (entry.remark && String(entry.remark).trim()));
  if (!hasContent) return null;

  return (
    <section className="mb-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Approval History</p>
      <div className="space-y-2">
        {history.map(entry => {
          const rejected = entry.action === "rejected";
          const payment = entry.action === "payment_processed";
          const Icon = rejected ? XCircle : payment ? Clock3 : CheckCircle;
          return (
            <div key={entry.id} className={`rounded-lg border p-3 ${rejected ? "border-destructive/20 bg-destructive/10" : "border-border/70 bg-muted/20"}`}>
              <div className="flex items-start gap-2.5">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${rejected ? "text-destructive" : "text-emerald-600"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-foreground">
                        {entry.actorName} <span className="font-normal text-muted-foreground">· {entry.actorRole}</span>
                      </p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${rejected ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>
                        {payment ? "Payment processed" : rejected ? "Rejected" : "Approved"}
                      </span>
                    </div>
                    {entry.createdAt && (
                      <time className="text-[10px] text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </time>
                    )}
                  </div>
                  {entry.remark && <p className="mt-1 text-sm leading-5 text-foreground/85">{entry.remark}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ApprovalRemarksHistory;
