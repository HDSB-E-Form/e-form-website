import { Badge } from "@/components/ui/badge";
import type { Submission } from "@/contexts/SubmissionsContext";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-1 items-start gap-1 border-b border-border/60 py-3 last:border-0 sm:grid-cols-3 sm:gap-4">
    <span className="text-xs font-bold uppercase tracking-wider text-primary sm:mt-0.5">{label}</span>
    <div className="break-words text-sm font-medium text-foreground sm:col-span-2">{children || "—"}</div>
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground first:mt-0">{children}</p>
);

const ITAdminRequestDetails = ({ submission, showEmployeeDetails = true }: { submission: Submission; showEmployeeDetails?: boolean }) => {
  const facilities = (submission.data.facilities || []) as string[];
  const hasSharePoint = facilities.includes("SharePoint");

  return (
    <div className="text-left">
      {showEmployeeDetails && (
        <>
          <SectionLabel>Employee Details</SectionLabel>
          <Row label="Employee Name">{submission.employeeName || "—"}</Row>
          <Row label="Staff ID">{submission.data.staffId || submission.data.employeeInfo?.employeeNumber || "—"}</Row>
          <Row label="Department">{submission.department || "—"}</Row>
          <Row label="Position">{submission.data.position || submission.data.employeeInfo?.position || "—"}</Row>
        </>
      )}

      <SectionLabel>Requested IT Services</SectionLabel>
      <Row label="Services">
        {facilities.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {facilities.map(facility => (
              <Badge key={facility} className="border-0 bg-primary/10 px-3 py-1 text-primary">{facility}</Badge>
            ))}
          </div>
        ) : "—"}
      </Row>
      {hasSharePoint && <Row label="SharePoint Folder">{submission.data.sharePointFolder || "—"}</Row>}
      {submission.data.others && <Row label="Other Requirements"><span className="whitespace-pre-wrap">{submission.data.others}</span></Row>}

      {false && <>
      <SectionLabel>Approval Routing</SectionLabel>
      <Row label="Head of Section">{submission.data.hosName || submission.data.hos || "—"}</Row>
      <Row label="Head of Department">{submission.data.hodName || submission.data.hod || "—"}</Row>
      </>}
    </div>
  );
};

export default ITAdminRequestDetails;
