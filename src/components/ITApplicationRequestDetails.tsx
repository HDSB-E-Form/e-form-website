import { Badge } from "@/components/ui/badge";
import type { Submission } from "@/contexts/SubmissionsContext";
import { ChevronDown } from "lucide-react";

type AuthorizationRight = { id: number; module: string; right: string };

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="grid grid-cols-1 items-start gap-1 border-b border-border/60 py-3 last:border-0 sm:grid-cols-3 sm:gap-4"><span className="text-xs font-bold uppercase tracking-wider text-primary sm:mt-0.5">{label}</span><div className="text-sm font-medium text-foreground sm:col-span-2">{children || "—"}</div></div>;

const ITApplicationRequestDetails = ({ submission, showEmployeeDetails = true }: { submission: Submission; showEmployeeDetails?: boolean }) => {
  const rights = (submission.data.erpAuthorizationRights || []) as AuthorizationRight[];
  const grouped = rights.reduce<Record<string, AuthorizationRight[]>>((modules, right) => { (modules[right.module] ||= []).push(right); return modules; }, {});
  const facilities = (submission.data.facilities || []) as string[];

  return <div className="text-left">
    {showEmployeeDetails && <>
      <p className="mb-1 mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Employee Details</p>
      <Row label="Employee Name">{submission.employeeName || "—"}</Row>
      <Row label="Staff ID">{submission.data.staffId || submission.data.employeeInfo?.employeeNumber || "—"}</Row>
      <Row label="Department">{submission.department || "—"}</Row>
      <Row label="Position">{submission.data.position || submission.data.employeeInfo?.position || "—"}</Row>
    </>}

    <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Request Details</p>
    <Row label="ERP Modules"><div className="flex flex-wrap gap-2">{facilities.map(module => <Badge key={module} className="border-0 bg-primary/10 text-primary">{module.replace("ERP - ", "")}</Badge>)}</div></Row>
    <Row label="Access Rights"><span className="font-bold text-primary">{rights.length} permissions selected</span></Row>

    {rights.length > 0 && <div className="mt-4 space-y-2">
      {Object.entries(grouped).map(([module, moduleRights]) => <details key={module} className="group rounded-xl border border-border/70 bg-muted/10"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-foreground"><span>{module}</span><span className="flex shrink-0 items-center gap-2"><Badge className="border-0 bg-primary/10 text-primary">{moduleRights.length} rights</Badge><ChevronDown className="h-4 w-4 text-primary transition-transform group-open:rotate-180" /></span></summary><div className="space-y-2 border-t border-border/60 p-4">{moduleRights.map(right => <p key={right.id} className="text-sm text-foreground"><span className="mr-2 text-xs font-semibold text-muted-foreground">#{right.id}</span>{right.right}</p>)}</div></details>)}
    </div>}

    {false && <>
    <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Approval Routing</p>
    <Row label="Head of Section">{submission.data.hosName || "—"}</Row>
    <Row label="Head of Department">{submission.data.hodName || "—"}</Row>
    </>}
  </div>;
};

export default ITApplicationRequestDetails;
