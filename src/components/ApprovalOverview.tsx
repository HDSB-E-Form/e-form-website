import { Badge } from "@/components/ui/badge";
import type { Submission } from "@/contexts/SubmissionsContext";
import { getPermitStages } from "@/lib/permitToWork";

type ApprovalStageState = "approved" | "rejected" | "pending" | "skipped" | "not_applicable" | "out" | "completed";

interface ApprovalStage {
  role: string;
  approver: string;
  state: ApprovalStageState;
}

const stageBadge = (state: ApprovalStageState) => {
  const base = "border-0 px-2.5 py-1 text-[10px] font-bold";
  switch (state) {
    case "approved":
      return <Badge className={`${base} bg-[#57D51B] text-white hover:bg-[#57D51B]`}>APPROVED</Badge>;
    case "rejected":
      return <Badge className={`${base} bg-destructive text-destructive-foreground hover:bg-destructive`}>REJECTED</Badge>;
    case "skipped":
      return <Badge className={`${base} whitespace-nowrap bg-[#57D51B] text-white hover:bg-[#57D51B]`}>AUTO-APPROVED</Badge>;
    case "not_applicable":
      return <Badge className={`${base} bg-muted text-muted-foreground`}>N/A</Badge>;
    case "out":
      return <Badge className={`${base} bg-indigo-500 text-white hover:bg-indigo-500`}>OUT</Badge>;
    case "completed":
      return <Badge className={`${base} bg-[#57D51B] text-white hover:bg-[#57D51B]`}>COMPLETED</Badge>;
    default:
      return <Badge className={`${base} bg-amber-500/15 text-amber-700 dark:text-amber-400`}>PENDING</Badge>;
  }
};

const getApprovalStages = (submission: Submission): ApprovalStage[] => {
  const { data, formType } = submission;
  const status = submission.status === "voided" && data.statusBeforeVoid
    ? data.statusBeforeVoid
    : submission.status;
  const rejectedStage = data.rejectedStage || (status === "rejected" ? "hos" : null);
  const isRejected = status === "rejected";
  const hosName = data.hosName || data.hos || "Not selected";
  const hodName = data.hodName || data.hod || "Not selected";
  const remarksHistory = Array.isArray(data.approvalRemarksHistory) ? data.approvalRemarksHistory : [];
  const latestActor = (role: string, action?: string) => [...remarksHistory]
    .reverse()
    .find(entry => entry?.actorRole === role && (!action || entry?.action === action))
    ?.actorName;

  const state = (
    done: boolean,
    rejected: boolean,
    skipped = false,
    completed = false,
  ): ApprovalStageState => {
    if (rejected) return "rejected";
    if (isRejected && !done) return "not_applicable";
    if (skipped) return "skipped";
    if (completed) return "completed";
    if (done) return "approved";
    return "pending";
  };

  if (formType === "permit_to_work") {
    return getPermitStages(submission) as ApprovalStage[];
  }

  if (formType === "claim") {
    const afterHOS = ["approved_hos", "approved_hod", "pending_finance_review", "approved_hop", "approved_hof", "approved", "paid", "completed"].includes(status) || ["hod", "hop", "finance_review", "hof", "admin"].includes(rejectedStage);
    const afterHOD = ["approved_hod", "pending_finance_review", "approved_hop", "approved_hof", "approved", "paid", "completed"].includes(status) || ["hop", "finance_review", "hof", "admin"].includes(rejectedStage);
    const afterHOP = ["pending_finance_review", "approved_hop", "approved_hof", "approved", "paid", "completed"].includes(status) || ["finance_review", "hof", "admin"].includes(rejectedStage);
    const afterFinanceReview = ["approved_hop", "approved_hof", "approved", "paid", "completed"].includes(status) || ["hof", "admin"].includes(rejectedStage);
    const afterHOF = ["approved_hof", "approved", "paid", "completed"].includes(status) || rejectedStage === "admin";
    const paymentCompleted = ["paid", "completed"].includes(status);

    return [
      { role: "HOS", approver: hosName, state: state(afterHOS, rejectedStage === "hos", hosName === "N/A") },
      { role: "HOD", approver: hodName, state: state(afterHOD, rejectedStage === "hod", hodName === "N/A") },
      { role: "HOP", approver: data.hopName || "Not selected", state: state(afterHOP, rejectedStage === "hop") },
      { role: "Finance Review", approver: data.financeReviewedByName || latestActor("Finance Admin", "approved") || "Finance Admin", state: state(afterFinanceReview, rejectedStage === "finance_review") },
      { role: "HOF", approver: data.hofName || "Not selected", state: state(afterHOF, rejectedStage === "hof") },
      { role: "Payment", approver: data.financePaidByName || latestActor("Finance Admin", "payment_processed") || "Finance Admin", state: state(paymentCompleted, rejectedStage === "admin", false, paymentCompleted) },
    ];
  }

  if (formType === "leave") {
    const afterHOS = ["approved_hos", "approved_hod", "approved_manco", "on_leave", "approved"].includes(status) || ["hod", "manco", "admin"].includes(rejectedStage);
    const afterHOD = ["approved_hod", "approved_manco", "on_leave", "approved"].includes(status) || ["manco", "admin"].includes(rejectedStage);
    const afterManco = ["approved_manco", "on_leave", "approved"].includes(status) || rejectedStage === "admin";
    const exited = ["on_leave", "approved"].includes(status);
    const returned = status === "approved";

    return [
      { role: "HOS", approver: hosName, state: state(afterHOS, rejectedStage === "hos", hosName === "N/A") },
      { role: "HOD", approver: hodName, state: state(afterHOD, rejectedStage === "hod", hodName === "N/A") },
      { role: "MANCO", approver: data.mancoMemberName || "Not selected", state: state(afterManco, rejectedStage === "manco") },
      {
        role: "Security Exit",
        approver: data.securityExitReviewedByName || data.securityReviewedByName || "Security Guard",
        state: state(exited, rejectedStage === "admin"),
      },
      {
        role: "Security Entry",
        approver: data.securityEntryReviewedByName || (returned ? data.securityReviewedByName : null) || "Security Guard",
        state: returned ? "completed" : status === "on_leave" ? "out" : isRejected ? "not_applicable" : "pending",
      },
    ];
  }

  const afterHOS = ["approved_hos", "approved_hod", "approved", "awaiting_confirmation", "completed"].includes(status) || ["hod", "admin"].includes(rejectedStage);
  const afterHOD = ["approved_hod", "approved", "awaiting_confirmation", "completed"].includes(status) || rejectedStage === "admin";
  const finalCompleted = ["approved", "awaiting_confirmation", "completed"].includes(status);
  const finalRole = formType === "car_rental" ? "HR Admin" : "IT Admin";
  const finalApprover = formType === "car_rental"
    ? data.hrAdminReviewedByName || latestActor("HR Admin") || "HR Admin"
    : data.itAdminReviewedBy || latestActor("IT Admin") || "IT Admin";

  return [
    { role: "HOS", approver: hosName, state: state(afterHOS, rejectedStage === "hos", hosName === "N/A") },
    { role: "HOD", approver: hodName, state: state(afterHOD, rejectedStage === "hod", hodName === "N/A") },
    { role: finalRole, approver: finalApprover, state: state(finalCompleted, rejectedStage === "admin", false, status === "completed") },
  ];
};

const ApprovalOverview = ({ submission }: { submission: Submission }) => {
  const stages = getApprovalStages(submission);
  const gridColumns = stages.length === 6
    ? "sm:grid-cols-3 lg:grid-cols-6"
    : stages.length === 5
      ? "sm:grid-cols-3 lg:grid-cols-5"
      : "sm:grid-cols-3";

  return (
    <section className="mt-5 print:hidden">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
        Approval Overview
      </p>
      <div className={`grid grid-cols-2 gap-2 rounded-xl border border-border/50 bg-muted/20 p-2 sm:p-3 ${gridColumns}`}>
        {stages.map(stage => (
          <div key={stage.role} className="flex min-h-[4.75rem] min-w-0 flex-col items-center justify-center rounded-lg border border-border/60 bg-background/80 p-2.5 text-center transition-colors hover:border-primary/25 hover:bg-background">
            <div className="min-w-0">
              <p className="text-[10px] font-bold leading-tight text-muted-foreground sm:text-[11px]">{stage.role}</p>
              <p className="mt-1 break-words text-[10px] leading-tight text-foreground/75 sm:text-[11px]" title={stage.approver}>
                {stage.approver}
              </p>
            </div>
            <div className="mt-1.5 flex w-full justify-center">{stageBadge(stage.state)}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ApprovalOverview;
