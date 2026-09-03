import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building2, HardHat, ShieldAlert, Flame, FileSignature,
  ClipboardList, Paperclip, Send, Plus, Trash2, Users, Loader2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { supabase } from "@/supabase";
import { toast } from "sonner";
import {
  TASK_TYPES, CONTROL_CODES, HAZARD_CATEGORIES, PPE_ITEMS, HOT_WORK_MEASURES,
  JSA_ASSESSMENT_QUESTIONS, GENDERS,
} from "@/lib/permitToWork";

const today = () => new Date().toISOString().split("T")[0];

interface WorkerRow { name: string; badgeId: string; gender: string }
interface JsaRow { workActivity: string; hazard: string; actionToBeTaken: string; picName: string }
interface HazardEntry { present: boolean; controls: string[]; controlText: Record<string, string>; ppe: string[] }
type HazardState = Record<string, Record<number, HazardEntry>>;

const emptyHazard = (): HazardEntry => ({ present: false, controls: [], controlText: {}, ppe: [] });
const TEXT_CONTROL_CODES = ["EC", "AC", "EE"];

const SectionCard = ({ index, icon: Icon, title, subtitle, children }: {
  index: string; icon: typeof Building2; title: string; subtitle?: string; children: React.ReactNode;
}) => (
  <section className="card-elevated p-5 sm:p-6">
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{index}</span>
      <Icon className="h-5 w-5 text-primary" />
      <div>
        <h2 className="font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
);

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold text-foreground">{label} {required && <span className="text-destructive">*</span>}</Label>
    {children}
  </div>
);

const PermitToWorkForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();

  // Section A — the application date/time is stamped automatically on submit.
  const [applicantPhone, setApplicantPhone] = useState(user?.phone || "");
  const [workingFrom, setWorkingFrom] = useState("");
  const [workingTo, setWorkingTo] = useState("");
  const [contractorCompany, setContractorCompany] = useState("");
  const [contractorSupervisor, setContractorSupervisor] = useState("");
  const [contractorSupervisorIc, setContractorSupervisorIc] = useState("");
  const [contractorPhone, setContractorPhone] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [taskTypeOther, setTaskTypeOther] = useState("");

  // Section B
  const [workers, setWorkers] = useState<WorkerRow[]>([{ name: "", badgeId: "", gender: "" }]);

  // Section C (control measures + PPE are recorded per hazard)
  const [hazardCategories, setHazardCategories] = useState<string[]>([]);
  const [hazardState, setHazardState] = useState<HazardState>({});
  const [hazardOther, setHazardOther] = useState("");

  // Section D — the submitter confirms "Before"; the Safety Department records "During" and "After".
  const [hotWorkBefore, setHotWorkBefore] = useState<Record<number, boolean>>({});
  const [hotWorkOther, setHotWorkOther] = useState("");

  // Section E
  const [picAgreed, setPicAgreed] = useState(false);

  // Appendix A — JSA
  const [jsaScope, setJsaScope] = useState("");
  const [jsaDateIssuance, setJsaDateIssuance] = useState(today());
  const [jsaValidUntil, setJsaValidUntil] = useState("");
  const [jsaAssessment, setJsaAssessment] = useState<Record<number, "yes" | "no">>({});
  const [jsaRows, setJsaRows] = useState<JsaRow[]>([{ workActivity: "", hazard: "", actionToBeTaken: "", picName: "" }]);

  // Attachments
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live clock so the auto-stamped application date/time shown to the user stays current.
  const [applicationStamp, setApplicationStamp] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setApplicationStamp(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const hotWorkApplies = hazardCategories.includes("hotWork");
  const workerCountLive = workers.filter(row => row.name.trim() && row.badgeId.trim()).length;

  const toggle = (list: string[], value: string, checked: boolean) =>
    checked ? [...list, value] : list.filter(item => item !== value);

  const toggleCategory = (key: string, checked: boolean) => {
    setHazardCategories(current => toggle(current, key, checked));
  };

  const setHazard = (catKey: string, index: number, patch: Partial<HazardEntry>) => {
    setHazardState(current => {
      const category = { ...(current[catKey] || {}) };
      category[index] = { ...emptyHazard(), ...(category[index] || {}), ...patch };
      return { ...current, [catKey]: category };
    });
  };

  const updateWorker = (index: number, patch: Partial<WorkerRow>) =>
    setWorkers(rows => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const updateJsaRow = (index: number, patch: Partial<JsaRow>) =>
    setJsaRows(rows => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    setIsUploading(true);
    try {
      for (const file of files) {
        if (!allowed.includes(file.type)) { toast.error(`${file.name}: upload a PDF, JPG, or PNG.`); continue; }
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: file must be 10 MB or smaller.`); continue; }
        const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
        const path = `permit-to-work/${user?.id || "unknown"}/${Date.now()}_${safeName}`;
        const { data, error } = await supabase.storage.from("form-attachments").upload(path, file);
        if (error || !data) { toast.error(`${file.name}: upload failed.`); continue; }
        const { data: urlData } = supabase.storage.from("form-attachments").getPublicUrl(data.path);
        if (urlData?.publicUrl) setAttachments(current => [...current, urlData.publicUrl]);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const buildHazards = () => {
    const result: Record<string, { hazard: string; controls: string[]; controlText: Record<string, string>; ppe: string[] }[]> = {};
    for (const category of HAZARD_CATEGORIES) {
      if (!hazardCategories.includes(category.key)) continue;
      const rows = category.hazards
        .map((hazard, index) => ({ hazard, entry: hazardState[category.key]?.[index] }))
        .filter(row => row.entry?.present)
        .map(({ hazard, entry }) => {
          const controlText: Record<string, string> = {};
          for (const code of TEXT_CONTROL_CODES) {
            const value = (entry?.controlText?.[code] || "").trim();
            if (entry?.controls.includes(code) && value) controlText[code] = value;
          }
          return {
            hazard,
            controls: entry?.controls || [],
            controlText,
            ppe: entry?.controls.includes("PPE") ? (entry?.ppe || []) : [],
          };
        });
      if (rows.length > 0) result[category.key] = rows;
    }
    return result;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!workingFrom || !workingTo) return toast.error("Enter the working period (from and to).");
    if (new Date(workingTo) <= new Date(workingFrom)) return toast.error("The working 'to' date and time must be after the 'from'.");
    if (!contractorCompany.trim()) return toast.error("Enter the contractor company name.");
    if (!contractorSupervisor.trim()) return toast.error("Enter the contractor supervisor in charge of crews.");
    if (!contractorSupervisorIc.trim()) return toast.error("Enter the contractor supervisor's IC / passport number.");
    if (!contractorPhone.trim()) return toast.error("Enter the contractor's telephone number.");
    if (!jobLocation.trim()) return toast.error("Enter the job location.");
    if (taskTypes.length === 0) return toast.error("Select at least one task description.");
    if (taskTypes.includes("Others") && !taskTypeOther.trim()) return toast.error("Describe the other task type.");

    const validWorkers = workers.filter(row => row.name.trim() && row.badgeId.trim());
    if (validWorkers.length === 0) return toast.error("Add at least one contractor worker with a name and badge / IC number.");

    if (hazardCategories.length === 0) return toast.error("Select at least one hazard category that applies to this work.");
    const hazards = buildHazards();
    if (Object.keys(hazards).length === 0) return toast.error("Tick the specific hazards that apply within the selected categories.");
    for (const [key, rows] of Object.entries(hazards)) {
      const label = HAZARD_CATEGORIES.find(c => c.key === key)?.label || key;
      if (rows.some(row => row.controls.length === 0)) {
        return toast.error(`Select a control measure for every ticked hazard in "${label}".`);
      }
      if (rows.some(row => row.controls.includes("PPE") && row.ppe.length === 0)) {
        return toast.error(`Select the PPE items for every hazard marked "PPE" in "${label}".`);
      }
    }
    const allPpe = [...new Set(Object.values(hazards).flat().flatMap(row => row.ppe))];

    let hotWork: Record<string, unknown> | undefined;
    if (hotWorkApplies) {
      const measures = HOT_WORK_MEASURES.map((measure, index) => ({
        measure,
        before: !!hotWorkBefore[index],
        during: false,
        after: false,
      }));
      if (!measures.some(m => m.before)) {
        return toast.error("Confirm the 'Before' hot-work counter measures.");
      }
      hotWork = { applicable: true, measures, otherActions: hotWorkOther.trim() };
    }

    if (!jsaScope.trim()) return toast.error("Enter the JSA scope of work.");
    if (!jsaValidUntil) return toast.error("Enter the JSA 'valid until' date.");
    if (Object.keys(jsaAssessment).length < JSA_ASSESSMENT_QUESTIONS.length) {
      return toast.error("Answer every JSA risk-assessment question.");
    }
    const validJsaRows = jsaRows.filter(row => row.workActivity.trim() && row.hazard.trim() && row.actionToBeTaken.trim());
    if (validJsaRows.length === 0) return toast.error("Add at least one JSA work activity with its hazard and action.");
    if (validJsaRows.some(row => !row.picName.trim())) return toast.error("Enter the PIC name for every JSA activity.");

    if (!picAgreed) return toast.error("Acknowledge the PIC declaration before submitting.");

    setIsSubmitting(true);
    const now = new Date().toISOString();
    const success = await addSubmission({
      formType: "permit_to_work",
      status: "pending",
      submittedBy: user?.id || "",
      employeeName: user?.name || "",
      department: user?.department || "",
      data: {
        staffId: user?.employeeId || "",
        position: user?.position || "",
        applicantPhone: applicantPhone.trim(),
        applicationDate: now,
        workingFrom: new Date(workingFrom).toISOString(),
        workingTo: new Date(workingTo).toISOString(),
        contractor: {
          company: contractorCompany.trim(),
          supervisorName: contractorSupervisor.trim(),
          supervisorIc: contractorSupervisorIc.trim(),
          phone: contractorPhone.trim(),
        },
        workerCount: String(validWorkers.length),
        jobLocation: jobLocation.trim(),
        taskTypes,
        taskTypeOther: taskTypeOther.trim(),
        workers: validWorkers.map(row => ({ name: row.name.trim(), badgeId: row.badgeId.trim(), gender: row.gender })),
        hazardCategories,
        hazards,
        hazardOther: hazardOther.trim(),
        ppe: allPpe,
        hotWork,
        picDeclarationAgreed: true,
        picAcknowledgedAt: now,
        picName: user?.name || "",
        jsa: {
          scopeOfWork: jsaScope.trim(),
          dateIssuance: jsaDateIssuance,
          validUntil: jsaValidUntil,
          assessment: JSA_ASSESSMENT_QUESTIONS.map((question, index) => ({ question, answer: jsaAssessment[index] })),
          rows: validJsaRows.map(row => ({
            workActivity: row.workActivity.trim(),
            hazard: row.hazard.trim(),
            actionToBeTaken: row.actionToBeTaken.trim(),
            picName: row.picName.trim(),
          })),
          preparedByName: user?.name || "",
          preparedAt: now,
        },
        attachments,
      },
    });

    if (success) {
      toast.success("Permit to Work submitted for Safety Department approval.");
      navigate("/submissions");
    } else {
      setIsSubmitting(false);
    }
  };

  const activeCategories = useMemo(
    () => HAZARD_CATEGORIES.filter(category => hazardCategories.includes(category.key)),
    [hazardCategories],
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-in slide-in-from-bottom-2 duration-500">
      <button type="button" onClick={() => navigate("/safety")} className="mb-6 inline-flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/10 hover:shadow-sm group">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Safety Forms
      </button>

      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600"><HardHat className="h-7 w-7 text-white" /></div>
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Permit to Work</h1>
          <p className="mt-1 text-muted-foreground">Safety Department · valid for one approved task only</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* SECTION A */}
        <SectionCard index="A" icon={Building2} title="Application Details" subtitle="Originator and contractor information.">
          <div className="mb-4 grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-3">
            <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Applicant (Originator)</p><p className="text-sm font-semibold text-foreground">{user?.name || "—"}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Department / Section</p><p className="text-sm font-semibold text-foreground">{user?.department || "—"}</p></div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Application Date &amp; Time</p>
              <p className="text-sm font-semibold text-foreground">{applicationStamp.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</p>
              <p className="text-[10px] text-muted-foreground">Recorded automatically on submit</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Applicant Telephone" required>
              <Input value={applicantPhone} onChange={e => setApplicantPhone(e.target.value)} placeholder="e.g. 012-3456789" className="h-11" />
            </Field>
            <Field label="Job Location" required>
              <Input value={jobLocation} onChange={e => setJobLocation(e.target.value)} placeholder="e.g. Die casting machine, Plant 1" className="h-11" />
            </Field>
            <Field label="Working Period — From" required>
              <Input type="datetime-local" value={workingFrom} onChange={e => setWorkingFrom(e.target.value)} className="h-11 dark:[color-scheme:dark]" />
            </Field>
            <Field label="Working Period — To" required>
              <Input type="datetime-local" min={workingFrom || undefined} value={workingTo} onChange={e => setWorkingTo(e.target.value)} className="h-11 dark:[color-scheme:dark]" />
            </Field>
          </div>

          <div className="mt-5 border-t border-border/60 pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Contractor</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company Name" required>
                <Input value={contractorCompany} onChange={e => setContractorCompany(e.target.value)} placeholder="e.g. GTG Engineering Works Sdn Bhd" className="h-11" />
              </Field>
              <Field label="Supervisor in Charge of Crews" required>
                <Input value={contractorSupervisor} onChange={e => setContractorSupervisor(e.target.value)} className="h-11" />
              </Field>
              <Field label="Supervisor IC / Passport No." required>
                <Input value={contractorSupervisorIc} onChange={e => setContractorSupervisorIc(e.target.value)} className="h-11" />
              </Field>
              <Field label="Contractor Telephone" required>
                <Input value={contractorPhone} onChange={e => setContractorPhone(e.target.value)} className="h-11" />
              </Field>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Number of workers is counted automatically from the Contractor Employees list below.</p>
          </div>

          <div className="mt-5 border-t border-border/60 pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Task Description <span className="text-destructive">*</span></p>
            <div className="grid gap-3 sm:grid-cols-2">
              {TASK_TYPES.map(option => {
                const selected = taskTypes.includes(option);
                return (
                  <label key={option} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}>
                    <Checkbox checked={selected} onCheckedChange={checked => setTaskTypes(current => toggle(current, option, checked === true))} className="h-5 w-5 rounded-none border-2" />
                    <span className="text-sm font-medium text-foreground">{option}</span>
                  </label>
                );
              })}
            </div>
            {taskTypes.includes("Others") && (
              <div className="mt-3">
                <Input value={taskTypeOther} onChange={e => setTaskTypeOther(e.target.value)} placeholder="Describe the other task type" className="h-11" autoFocus />
              </div>
            )}
          </div>
        </SectionCard>

        {/* SECTION B */}
        <SectionCard index="B" icon={Users} title="Contractor Employees" subtitle="List the workers involved in this task.">
          <div className="space-y-3">
            {workers.map((row, index) => (
              <div key={index} className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-3 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end">
                <Field label={index === 0 ? "Name" : ""}>
                  <Input value={row.name} onChange={e => updateWorker(index, { name: e.target.value })} placeholder="Full name" className="h-10" />
                </Field>
                <Field label={index === 0 ? "Badge ID / IC / Passport" : ""}>
                  <Input value={row.badgeId} onChange={e => updateWorker(index, { badgeId: e.target.value })} className="h-10" />
                </Field>
                <Field label={index === 0 ? "Gender" : ""}>
                  <Select value={row.gender} onValueChange={value => updateWorker(index, { gender: value })}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <button type="button" onClick={() => setWorkers(rows => rows.length > 1 ? rows.filter((_, i) => i !== index) : rows)} className="mb-0.5 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-40" disabled={workers.length === 1} aria-label="Remove worker">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setWorkers(rows => [...rows, { name: "", badgeId: "", gender: "" }])} className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
              <Plus className="h-4 w-4" /> Add Worker
            </button>
            <span className="rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5 text-xs font-semibold text-foreground">
              {workerCountLive} worker{workerCountLive === 1 ? "" : "s"} counted
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">The number of workers is taken from this list. Full attendance can be uploaded in Supporting Documents.</p>
        </SectionCard>

        {/* SECTION C */}
        <SectionCard index="C" icon={ShieldAlert} title="Hazard Identification" subtitle="Tick the categories that apply, then the specific hazards and their control measures.">
          <div className="grid gap-2.5 sm:grid-cols-3">
            {HAZARD_CATEGORIES.map(category => {
              const selected = hazardCategories.includes(category.key);
              return (
                <label key={category.key} className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition-colors ${selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}>
                  <Checkbox checked={selected} onCheckedChange={checked => toggleCategory(category.key, checked === true)} className="h-4 w-4 rounded-none border-2" />
                  <span className="text-[13px] font-medium text-foreground">{category.label}</span>
                </label>
              );
            })}
          </div>

          {activeCategories.length > 0 && (
            <div className="mt-5 space-y-5">
              {activeCategories.map(category => (
                <div key={category.key} className="rounded-xl border border-border/60 bg-muted/10 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">{category.label}</p>
                  <div className="space-y-2">
                    {category.hazards.map((hazard, index) => {
                      const row = hazardState[category.key]?.[index];
                      const present = !!row?.present;
                      return (
                        <div key={hazard} className={`rounded-lg border p-2.5 transition-colors ${present ? "border-primary/40 bg-background" : "border-transparent"}`}>
                          <label className="flex cursor-pointer items-center gap-2.5">
                            <Checkbox checked={present} onCheckedChange={checked => setHazard(category.key, index, { present: checked === true })} className="h-4 w-4 rounded-none border-2" />
                            <span className="text-sm text-foreground">{hazard}</span>
                          </label>
                          {present && (
                            <div className="mt-2.5 space-y-2.5 pl-7">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Control:</span>
                                {CONTROL_CODES.map(control => {
                                  const active = (row?.controls || []).includes(control.code);
                                  return (
                                    <button
                                      key={control.code}
                                      type="button"
                                      title={control.label}
                                      onClick={() => setHazard(category.key, index, { controls: toggle(row?.controls || [], control.code, !active) })}
                                      className={`min-w-[3.25rem] rounded-lg border px-3.5 py-2 text-xs font-bold transition-colors ${active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
                                    >
                                      {control.code}
                                    </button>
                                  );
                                })}
                              </div>
                              {TEXT_CONTROL_CODES.filter(code => (row?.controls || []).includes(code)).map(code => (
                                <Input
                                  key={code}
                                  value={row?.controlText?.[code] || ""}
                                  onChange={e => setHazard(category.key, index, { controlText: { ...(row?.controlText || {}), [code]: e.target.value } })}
                                  placeholder={`${CONTROL_CODES.find(c => c.code === code)?.label} — describe the control`}
                                  className="h-9 text-sm"
                                />
                              ))}
                              {(row?.controls || []).includes("PPE") && (
                                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">PPE required <span className="text-destructive">*</span></p>
                                  <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 sm:auto-cols-fr sm:grid-flow-col sm:grid-rows-6">
                                    {PPE_ITEMS.map((item, ppeIndex) => {
                                      const checked = (row?.ppe || []).includes(item.code);
                                      return (
                                        <label key={item.code} className={`flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}>
                                          <Checkbox checked={checked} onCheckedChange={c => setHazard(category.key, index, { ppe: toggle(row?.ppe || [], item.code, c === true) })} className="h-4 w-4 rounded-none border-2" />
                                          <span className="text-foreground"><span className="text-muted-foreground">{ppeIndex + 1}.</span> {item.label}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">EC — Engineering Control · AC — Administrative Control · PPE — Personal Protective Equipment · EE — Emergency Equipment. Choosing <span className="font-semibold">PPE</span> opens the PPE checklist; EC / AC / EE open a text box for the detail.</p>
            </div>
          )}

          <div className="mt-4">
            <Field label="Other hazards (please state)">
              <Input value={hazardOther} onChange={e => setHazardOther(e.target.value)} className="h-11" />
            </Field>
          </div>
        </SectionCard>

        {/* SECTION D — Hot Work */}
        {hotWorkApplies && (
          <SectionCard index="D" icon={Flame} title="Hot Work Counter Measures" subtitle="Confirm the 'Before' checks. 'During' and 'After' are recorded by the Safety Department.">
            <div className="space-y-2.5">
              {HOT_WORK_MEASURES.map((measure, index) => (
                <label key={measure} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${hotWorkBefore[index] ? "border-primary bg-primary/10" : "border-border/60 bg-muted/10 hover:bg-muted/30"}`}>
                  <Checkbox checked={!!hotWorkBefore[index]} onCheckedChange={checked => setHotWorkBefore(current => ({ ...current, [index]: checked === true }))} className="mt-0.5 h-4 w-4 rounded-none border-2" />
                  <span className="text-sm text-foreground">{index + 1}. {measure}</span>
                </label>
              ))}
            </div>
            <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              The Safety Department will tick <span className="font-semibold">During</span> and <span className="font-semibold">After</span> while monitoring and closing the permit.
            </p>
            <div className="mt-4">
              <Field label="Other actions (please specify)">
                <Input value={hotWorkOther} onChange={e => setHotWorkOther(e.target.value)} className="h-11" />
              </Field>
            </div>
          </SectionCard>
        )}

        {/* APPENDIX A — JSA */}
        <SectionCard index="JSA" icon={ClipboardList} title="Job Safety Analysis (Appendix A)" subtitle="Scope, risk assessment, and activity breakdown.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Scope of Work" required>
                <Input value={jsaScope} onChange={e => setJsaScope(e.target.value)} placeholder="e.g. To install integrated molten aluminium low level" className="h-11" />
              </Field>
            </div>
            <Field label="Date Issuance" required>
              <Input type="date" value={jsaDateIssuance} onChange={e => setJsaDateIssuance(e.target.value)} className="h-11 dark:[color-scheme:dark]" />
            </Field>
            <Field label="Valid Until" required>
              <Input type="date" min={jsaDateIssuance || undefined} value={jsaValidUntil} onChange={e => setJsaValidUntil(e.target.value)} className="h-11 dark:[color-scheme:dark]" />
            </Field>
          </div>

          <div className="mt-5 border-t border-border/60 pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Risk Assessment <span className="text-destructive">*</span></p>
            <div className="space-y-2">
              {JSA_ASSESSMENT_QUESTIONS.map((question, index) => (
                <div key={question} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-foreground">{index + 1}. {question}</span>
                  <div className="flex shrink-0 gap-2">
                    {(["yes", "no"] as const).map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setJsaAssessment(current => ({ ...current, [index]: option }))}
                        className={`rounded-md border px-3 py-1 text-xs font-bold uppercase transition-colors ${jsaAssessment[index] === option ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 border-t border-border/60 pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Work Activities</p>
            <div className="space-y-3">
              {jsaRows.map((row, index) => {
                const cell = (labelText: string, field: keyof JsaRow, placeholder?: string) => (
                  <div className="min-w-0 space-y-1">
                    {index === 0 && <Label className="block truncate text-[11px] font-semibold text-foreground">{labelText}</Label>}
                    <Input value={row[field]} onChange={e => updateJsaRow(index, { [field]: e.target.value })} placeholder={placeholder} className="h-10" />
                  </div>
                );
                return (
                  <div key={index} className="grid grid-cols-1 gap-2 rounded-xl border border-border/60 bg-muted/10 p-3 lg:grid-cols-[1.4fr_1.4fr_1.4fr_0.9fr_auto] lg:items-end">
                    {cell("Work Activity", "workActivity")}
                    {cell("Hazard", "hazard")}
                    {cell("Action to be Taken", "actionToBeTaken")}
                    {cell("PIC", "picName", "Name")}
                    <button
                      type="button"
                      onClick={() => setJsaRows(rows => rows.length > 1 ? rows.filter((_, i) => i !== index) : rows)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center justify-self-end rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
                      disabled={jsaRows.length === 1}
                      aria-label="Remove activity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={() => setJsaRows(rows => [...rows, { workActivity: "", hazard: "", actionToBeTaken: "", picName: "" }])} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
              <Plus className="h-4 w-4" /> Add Activity
            </button>
            <p className="mt-3 text-xs text-muted-foreground">Prepared by <span className="font-semibold text-foreground">{user?.name || "—"}</span> (Originator / Contractor).</p>
          </div>
        </SectionCard>

        {/* SUPPORTING DOCUMENTS */}
        <SectionCard index="DOC" icon={Paperclip} title="Supporting Documents" subtitle="Optional — signed hard copy, worker attendance, competency certificates, insurance.">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/30">
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Paperclip className="h-5 w-5 text-muted-foreground" />}
            <span className="text-sm font-medium text-foreground">{isUploading ? "Uploading…" : "Click to upload PDF, JPG, or PNG (max 10 MB each)"}</span>
            <input type="file" accept="application/pdf,image/jpeg,image/png" multiple className="hidden" onChange={handleUpload} disabled={isUploading} />
          </label>
          {attachments.length > 0 && (
            <ul className="mt-3 space-y-2">
              {attachments.map((url, index) => (
                <li key={url} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/10 p-2.5 text-sm">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="truncate font-semibold text-primary hover:underline">Document {index + 1}</a>
                  <button type="button" onClick={() => setAttachments(current => current.filter(item => item !== url))} className="text-muted-foreground hover:text-destructive" aria-label="Remove document"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* SECTION E — PIC declaration */}
        <SectionCard index="E" icon={FileSignature} title="Applicant Acknowledgement (PIC)" subtitle="Employer verification.">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 hover:bg-muted/30">
            <Checkbox checked={picAgreed} onCheckedChange={checked => setPicAgreed(checked === true)} className="mt-0.5 rounded-none" />
            <span className="text-sm font-semibold text-foreground">
              To the best of my knowledge and ability, all tasks and PPE have been identified and foreseeable precautions have been taken. <span className="text-destructive">*</span>
            </span>
          </label>
          <p className="mt-3 text-xs text-muted-foreground">Acknowledged by <span className="font-semibold text-foreground">{user?.name || "—"}</span> on submission.</p>
        </SectionCard>

        <div className="flex flex-col justify-center gap-3 pt-4 pb-8 sm:flex-row-reverse sm:gap-4">
          <button type="submit" disabled={isSubmitting || isUploading} className="btn-gold flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:min-w-64 sm:py-4">
            <Send className="h-4 w-4" />{isSubmitting ? "Submitting…" : "Submit Permit to Work"}
          </button>
          <button type="button" disabled={isSubmitting} onClick={() => navigate("/safety")} className="w-full rounded-full border-2 border-border px-6 py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-muted sm:w-auto sm:px-12 sm:py-4">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default PermitToWorkForm;
