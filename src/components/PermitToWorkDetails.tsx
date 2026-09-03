import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";
import type { Submission } from "@/contexts/SubmissionsContext";
import { HAZARD_CATEGORIES, PPE_ITEMS } from "@/lib/permitToWork";

const fmtDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtDateTime = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-1 items-start gap-1 border-b border-border/60 py-2.5 last:border-0 sm:grid-cols-3 sm:gap-4 print:border-gray-300">
    <p className="text-xs font-bold uppercase tracking-wider text-primary sm:mt-0.5 print:text-gray-600">{label}</p>
    <div className="text-sm font-medium text-foreground sm:col-span-2 print:text-black">{value || "—"}</div>
  </div>
);

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-t border-border pt-5 print:border-gray-400">
    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary print:text-gray-600">{title}</p>
    {children}
  </div>
);

const PermitToWorkDetails = ({ submission }: { submission: Submission }) => {
  const data = submission.data || {};
  const contractor = data.contractor || {};
  const jsa = data.jsa || {};
  const hazards: Record<string, { hazard: string; controls: string[]; controlText?: Record<string, string>; ppe?: string[] }[]> = data.hazards || {};
  const hotWork = data.hotWork;
  const inspections = Array.isArray(data.siteInspections) ? data.siteInspections : [];

  return (
    <div className="space-y-5">
      <Group title="Application Details">
        <Row label="Applicant Telephone" value={data.applicantPhone} />
        <Row label="Application Date & Time" value={fmtDateTime(data.applicationDate)} />
        <Row
          label="Working Period"
          value={data.workingFrom
            ? `${fmtDateTime(data.workingFrom)} → ${fmtDateTime(data.workingTo)}`
            : `${fmtDate(data.workingDateFrom)} → ${fmtDate(data.workingDateTo)}`}
        />
        <Row label="Job Location" value={data.jobLocation} />
        <Row
          label="Task Description"
          value={
            <div className="flex flex-wrap gap-1.5">
              {(data.taskTypes || []).map((task: string) => (
                <Badge key={task} className="border-0 bg-primary/10 text-primary">{task === "Others" && data.taskTypeOther ? `Others: ${data.taskTypeOther}` : task}</Badge>
              ))}
            </div>
          }
        />
      </Group>

      <Group title="Contractor">
        <Row label="Company" value={contractor.company} />
        <Row label="Supervisor in Charge" value={contractor.supervisorName} />
        <Row label="Supervisor IC / Passport" value={contractor.supervisorIc} />
        <Row label="Contractor Telephone" value={contractor.phone} />
      </Group>

      {(data.workers || []).length > 0 && (
        <Group title={`Contractor Employees (${data.workers.length})`}>
          <div className="overflow-x-auto rounded-lg border border-border print:border-gray-400">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Badge ID / IC / Passport</TableHead>
                  <TableHead className="text-xs">Gender</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.workers || []).map((worker: { name?: string; badgeId?: string; gender?: string }, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="text-sm">{index + 1}</TableCell>
                    <TableCell className="text-sm font-medium">{worker.name || "—"}</TableCell>
                    <TableCell className="text-sm">{worker.badgeId || "—"}</TableCell>
                    <TableCell className="text-sm">{worker.gender || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Group>
      )}

      <Group title="Hazard Identification">
        {Object.keys(hazards).length === 0 ? (
          <p className="text-sm text-muted-foreground">No hazards recorded.</p>
        ) : (
          <div className="space-y-3">
            {HAZARD_CATEGORIES.filter(category => hazards[category.key]?.length).map(category => (
              <div key={category.key} className="rounded-lg border border-border/60 bg-muted/10 p-3 print:border-gray-300">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">{category.label}</p>
                <ul className="space-y-2">
                  {hazards[category.key].map(row => {
                    const controlText: Record<string, string> = row.controlText || {};
                    return (
                      <li key={row.hazard} className="text-sm text-foreground">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{row.hazard}</span>
                          <span className="flex gap-1">
                            {(row.controls || []).map(code => (
                              <span key={code} className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{code}</span>
                            ))}
                          </span>
                        </div>
                        {Object.entries(controlText).filter(([, value]) => value).map(([code, value]) => (
                          <p key={code} className="mt-0.5 pl-1 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{code}:</span> {value}</p>
                        ))}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        {data.hazardOther && <Row label="Other Hazards" value={data.hazardOther} />}
      </Group>

      <Group title="PPE Required">
        {(data.ppe || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">None selected.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(data.ppe || []).map((code: string) => {
              const item = PPE_ITEMS.find(p => p.code === code);
              return <Badge key={code} className="border-0 bg-primary/10 text-primary">{item ? `${item.code} · ${item.label}` : code}</Badge>;
            })}
          </div>
        )}
      </Group>

      {hotWork?.applicable && (
        <Group title="Hot Work Counter Measures">
          <div className="overflow-x-auto rounded-lg border border-border print:border-gray-400">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs">Measure</TableHead>
                  <TableHead className="text-xs text-center">Before</TableHead>
                  <TableHead className="text-xs text-center">During</TableHead>
                  <TableHead className="text-xs text-center">After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(hotWork.measures || []).map((row: { measure?: string; before?: boolean; during?: boolean; after?: boolean }, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="text-sm">{row.measure}</TableCell>
                    <TableCell className="text-center text-sm">{row.before ? "✓" : "—"}</TableCell>
                    <TableCell className="text-center text-sm">{row.during ? "✓" : "—"}</TableCell>
                    <TableCell className="text-center text-sm">{row.after ? "✓" : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {hotWork.otherActions && <Row label="Other Actions" value={hotWork.otherActions} />}
          <p className="mt-2 text-xs text-muted-foreground">
            "Before" is confirmed by the applicant.{" "}
            {hotWork.monitoredByName
              ? `"During" / "After" last recorded by ${hotWork.monitoredByName}${hotWork.monitoredAt ? ` on ${fmtDateTime(hotWork.monitoredAt)}` : ""}.`
              : `"During" / "After" are recorded by the Safety Department.`}
          </p>
        </Group>
      )}

      <Group title="Job Safety Analysis (Appendix A)">
        <Row label="Scope of Work" value={jsa.scopeOfWork} />
        <Row label="Date Issuance" value={fmtDate(jsa.dateIssuance)} />
        <Row label="Valid Until" value={fmtDate(jsa.validUntil)} />
        {Array.isArray(jsa.assessment) && jsa.assessment.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Risk Assessment</p>
            <ul className="space-y-1">
              {jsa.assessment.map((item: { question?: string; answer?: string }, index: number) => (
                <li key={index} className="flex items-start justify-between gap-3 text-sm text-foreground">
                  <span>{index + 1}. {item.question}</span>
                  <span className={`shrink-0 font-bold uppercase ${item.answer === "yes" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>{item.answer || "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(jsa.rows) && jsa.rows.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-lg border border-border print:border-gray-400">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs">Work Activity</TableHead>
                  <TableHead className="text-xs">Hazard</TableHead>
                  <TableHead className="text-xs">Action to be Taken</TableHead>
                  <TableHead className="text-xs">PIC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jsa.rows.map((row: { workActivity?: string; hazard?: string; actionToBeTaken?: string; picName?: string }, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="text-sm">{row.workActivity}</TableCell>
                    <TableCell className="text-sm">{row.hazard}</TableCell>
                    <TableCell className="text-sm">{row.actionToBeTaken}</TableCell>
                    <TableCell className="text-sm font-medium">{row.picName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Row label="Prepared By" value={jsa.preparedByName} />
      </Group>

      {(data.attachments || []).length > 0 && (
        <Group title="Supporting Documents">
          <div className="flex flex-wrap gap-3 print:hidden">
            {(data.attachments || []).map((url: string, index: number) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/20 px-3 py-1.5 text-xs font-bold text-primary hover:bg-muted/30">
                <FileText className="h-3.5 w-3.5" /> Document {index + 1}
              </a>
            ))}
          </div>
        </Group>
      )}

      <Group title="Applicant Acknowledgement (PIC)">
        <Row
          label="Declaration"
          value={data.picDeclarationAgreed
            ? `Acknowledged by ${data.picName || submission.employeeName} on ${fmtDateTime(data.picAcknowledgedAt)}`
            : "Not acknowledged"}
        />
      </Group>

      {data.safetyApproval && (
        <Group title="Safety Department Approval (Section F)">
          <Row label="Approved By" value={data.safetyApproval.name} />
          <Row label="Approved On" value={fmtDateTime(data.safetyApproval.approvedAt)} />
        </Group>
      )}

      {inspections.length > 0 && (
        <Group title="Site Inspections (Section G)">
          <div className="space-y-3">
            {inspections.map((inspection, index) => (
              <div key={index} className="rounded-lg border border-border/60 bg-muted/10 p-3 print:border-gray-300">
                <div className="grid gap-1 sm:grid-cols-2">
                  <p className="text-sm"><span className="font-semibold text-foreground">Date:</span> {fmtDate(inspection.date)}</p>
                  <p className="text-sm"><span className="font-semibold text-foreground">Inspector:</span> {inspection.name || "—"}</p>
                  <p className="text-sm"><span className="font-semibold text-foreground">Designation:</span> {inspection.designation || "—"}</p>
                  <p className="text-sm"><span className="font-semibold text-foreground">Department:</span> {inspection.department || "—"}</p>
                </div>
                {inspection.comment && <p className="mt-2 text-sm text-foreground"><span className="font-semibold">Comment:</span> {inspection.comment}</p>}
                {inspection.preventiveAction && <p className="mt-1 text-sm text-foreground"><span className="font-semibold">Preventive Action:</span> {inspection.preventiveAction}</p>}
                <p className="mt-2 text-xs text-muted-foreground">Recorded by {inspection.recordedByName || "Safety"} on {fmtDateTime(inspection.recordedAt)}</p>
              </div>
            ))}
          </div>
        </Group>
      )}

      {data.originatorCompletion && (
        <Group title="Completion of Work (Section H)">
          <Row label="Work Complete — Confirmed By" value={`${data.originatorCompletion.name || submission.employeeName} on ${fmtDateTime(data.originatorCompletion.confirmedAt)}`} />
          <Row label="Work Area Restored" value={data.originatorCompletion.restoredConfirmed ? "Confirmed — restored to original condition, no new hazards" : "—"} />
          {data.closure && <Row label="Verified & Closed By" value={`${data.closure.name} on ${fmtDateTime(data.closure.verifiedAt)}`} />}
        </Group>
      )}
    </div>
  );
};

export default PermitToWorkDetails;
