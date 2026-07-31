import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckSquare, ListChecks, MonitorCog, Search, Send, UserCheck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers, type AppUser } from "@/contexts/UsersContext";
import { toast } from "sonner";
import authorizationRightsData from "@/data/erpAuthorizationRights.json";
import { useFormLanguage } from "@/contexts/FormLanguageContext";
import { useITAdminFacilities } from "@/hooks/useITAdminFacilities";
import { useITApplicationOptions } from "@/hooks/useITApplicationOptions";

type AuthorizationRight = { id: number; module: string; right: string };
const authorizationRights = authorizationRightsData as AuthorizationRight[];

type RequestVariant = "admin" | "application";
const adminFacilityLabels: Record<string, string> = {
  "Laptop / Desktop": "Komputer Riba / Desktop",
  Email: "E-mel",
  "Internet Access": "Akses Internet",
  Printer: "Pencetak",
  SharePoint: "SharePoint",
};

const adminFormCopy = {
  en: {
    back: "Back to IT Forms", title: "IT Request Form (Admin)", department: "IT Department",
    employeeDetails: "Employee Details", name: "Name", position: "Position", staffId: "Staff ID", employeeDepartment: "Department",
    requisition: "Requisition", selectFacilities: "Select all IT facilities required.", sharePointFolder: "SharePoint Folder",
    sharePointPlaceholder: "Enter the folder name or path", others: "Others", othersPlaceholder: "Enter any other IT facility required...",
    approvals: "Approvals", hos: "Head of Section", hod: "Head of Department", loadingUsers: "Loading users...",
    chooseHos: "Choose Head of Section", chooseHod: "Choose Head of Department",
    bypass: "HOS approval will be bypassed. This request will be sent directly to the selected HOD.",
    submitting: "Submitting...", submit: "Submit Requisition", cancel: "Cancel",
    facilityError: "Select at least one IT facility.", sharePointError: "Enter the SharePoint folder required.",
    approverError: "Select both the Head of Section and Head of Department.", success: "IT Request Form (Admin) submitted successfully.",
  },
  ms: {
    back: "Kembali ke Borang IT", title: "Borang Permohonan IT (Pentadbiran)", department: "Jabatan IT",
    employeeDetails: "Butiran Pekerja", name: "Nama", position: "Jawatan", staffId: "No. Pekerja", employeeDepartment: "Jabatan",
    requisition: "Permohonan", selectFacilities: "Pilih semua kemudahan IT yang diperlukan.", sharePointFolder: "Folder SharePoint",
    sharePointPlaceholder: "Masukkan nama atau laluan folder", others: "Lain-lain", othersPlaceholder: "Masukkan kemudahan IT lain yang diperlukan...",
    approvals: "Kelulusan", hos: "Ketua Seksyen", hod: "Ketua Jabatan", loadingUsers: "Memuatkan pengguna...",
    chooseHos: "Pilih Ketua Seksyen", chooseHod: "Pilih Ketua Jabatan",
    bypass: "Kelulusan Ketua Seksyen akan dilangkau. Permohonan ini akan dihantar terus kepada Ketua Jabatan yang dipilih.",
    submitting: "Sedang dihantar...", submit: "Hantar Permohonan", cancel: "Batal",
    facilityError: "Pilih sekurang-kurangnya satu kemudahan IT.", sharePointError: "Masukkan folder SharePoint yang diperlukan.",
    approverError: "Pilih Ketua Seksyen dan Ketua Jabatan.", success: "Borang Permohonan IT (Pentadbiran) berjaya dihantar.",
  },
} as const;

const ITFacilitiesRequisitionForm = ({ variant }: { variant: RequestVariant }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const { language } = useFormLanguage();
  const { getUsersByRole, isLoading: areUsersLoading } = useUsers();
  const hosUsers: AppUser[] = useMemo(() => [...(getUsersByRole("HOS") || [])].sort((a, b) => a.name.localeCompare(b.name)), [getUsersByRole]);
  const hodUsers: AppUser[] = useMemo(() => [...(getUsersByRole("HOD") || [])].sort((a, b) => a.name.localeCompare(b.name)), [getUsersByRole]);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [others, setOthers] = useState("");
  const [facilityDetails, setFacilityDetails] = useState<Record<string, string>>({});
  const [selectedRightIds, setSelectedRightIds] = useState<number[]>([]);
  const [hos, setHos] = useState("");
  const [hod, setHod] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMalay = language === "ms";
  const { facilities: managedAdminFacilities, isLoading: areFacilitiesLoading } = useITAdminFacilities();
  const { options: managedApplicationOptions, isLoading: areApplicationOptionsLoading } = useITApplicationOptions();
  const copy = adminFormCopy[isMalay ? "ms" : "en"];
  const text = (english: string, malay: string) => isMalay ? malay : english;
  const facilityOptions = variant === "admin"
    ? managedAdminFacilities.map(item => item.name)
    : managedApplicationOptions.map(item => `ERP - ${item.name}`);
  const facilitiesRequiringDetails = new Set(managedAdminFacilities.filter(item => item.requires_details).map(item => item.name));
  const formTitle = variant === "admin" ? copy.title : text("IT Request Form (Application)", "Borang Permohonan IT (Aplikasi)");
  const formType = variant === "admin" ? "it_admin_request" : "it_application_request";
  const selectedErpModules = facilities.filter(item => item.startsWith("ERP - ")).map(item => item.replace("ERP - ", ""));

  const toggleFacility = (facility: string, checked: boolean) => {
    setFacilities(current => checked ? [...current, facility] : current.filter(item => item !== facility));
    if (!checked) setFacilityDetails(current => {
      const next = { ...current };
      delete next[facility];
      return next;
    });
    if (facility.startsWith("ERP - ") && !checked) {
      const module = facility.replace("ERP - ", "").toLowerCase();
      setSelectedRightIds(current => current.filter(id => authorizationRights.find(right => right.id === id)?.module.toLowerCase() !== module));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (facilities.length === 0) return toast.error(copy.facilityError);
    const missingDetails = facilities.find(facility => facilitiesRequiringDetails.has(facility) && !facilityDetails[facility]?.trim());
    if (missingDetails) return toast.error(`Enter the additional details required for ${missingDetails}.`);
    if (variant === "application") {
      const moduleWithoutRights = selectedErpModules.find(module => {
        const availableRights = authorizationRights.filter(right => right.module.toLowerCase() === module.toLowerCase());
        return availableRights.length > 0 && !availableRights.some(right => selectedRightIds.includes(right.id));
      });
      if (moduleWithoutRights) return toast.error(text(`Select at least one access right for ${moduleWithoutRights}.`, `Pilih sekurang-kurangnya satu hak akses untuk ${moduleWithoutRights}.`));
    }
    if (!hos || !hod) return toast.error(copy.approverError);

    setIsSubmitting(true);
    const success = await addSubmission({
      formType,
      status: hos === "N/A" ? "approved_hos" : "pending",
      submittedBy: user?.id || "",
      employeeName: user?.name || "",
      department: user?.department || "",
      data: {
        staffId: user?.employeeId || "",
        position: user?.position || "",
        employeeInfo: { employeeNumber: user?.employeeId || "", position: user?.position || "" },
        facilities,
        facilityDetails: Object.fromEntries(Object.entries(facilityDetails).map(([key, value]) => [key, value.trim()])),
        sharePointFolder: facilityDetails.SharePoint?.trim() || "",
        erpAuthorizationRightIds: selectedRightIds,
        erpAuthorizationRights: authorizationRights.filter(right => selectedRightIds.includes(right.id)),
        requestSummary: `${facilities.length} facilities requested`,
        cameraLocation: `${facilities.length} facilities requested`,
        others: others.trim(),
        hosName: hos,
        hodName: hod,
      },
    });

    if (success) {
      toast.success(variant === "admin" ? copy.success : text("IT Request Form (Application) submitted successfully.", "Borang Permohonan IT (Aplikasi) berjaya dihantar."));
      navigate("/submissions");
    } else setIsSubmitting(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-in slide-in-from-bottom-2 duration-500">
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={() => navigate("/it")} className="group inline-flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/10"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> {copy.back}</button>
      </div>
      <div className="mb-8 flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600"><MonitorCog className="h-7 w-7 text-white" /></div><div><h1 className="text-2xl font-bold text-foreground sm:text-3xl">{formTitle}</h1><p className="mt-1 text-muted-foreground">{copy.department}</p></div></div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="card-elevated p-5 sm:p-6">
          <SectionTitle number="01" icon={UserCheck} title={copy.employeeDetails} />
          <div className="rounded-xl border border-border/50 bg-muted/10 p-4"><EmployeeDetail label={copy.name} value={user?.name} /><EmployeeDetail label={copy.position} value={user?.position} /><EmployeeDetail label={copy.staffId} value={user?.employeeId} /><EmployeeDetail label={copy.employeeDepartment} value={user?.department} last /></div>
        </section>

        <section className="card-elevated p-5 sm:p-6">
          <SectionTitle number="02" icon={CheckSquare} title={copy.requisition} />
          <p className="mb-4 text-sm text-muted-foreground">{copy.selectFacilities} <span className="text-destructive">*</span></p>
          {variant === "application" && (
            <h3 className="mb-3 text-sm font-bold text-foreground">
              {text("ERP Access", "Akses ERP")}
            </h3>
          )}
          {((variant === "admin" && areFacilitiesLoading) || (variant === "application" && areApplicationOptionsLoading)) && <p className="mb-3 text-sm text-muted-foreground">Loading options...</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {facilityOptions.map(option => {
              const selected = facilities.includes(option);
              const optionLabel = variant === "application"
                ? option.replace(/^ERP - /, "")
                : isMalay ? adminFacilityLabels[option] || option : option;
              return <label key={option} htmlFor={`facility-${option}`} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}><Checkbox id={`facility-${option}`} checked={selected} onCheckedChange={checked => toggleFacility(option, checked === true)} className="h-5 w-5 rounded-none border-2" /><span className="text-sm font-medium text-foreground">{optionLabel}</span></label>;
            })}
          </div>
          {variant === "admin" && facilities.filter(facility => facilitiesRequiringDetails.has(facility)).map(facility => (
            <div key={facility} className="mt-5 animate-in fade-in slide-in-from-top-1">
              <Label htmlFor={`facility-details-${facility}`}>{facility === "SharePoint" ? copy.sharePointFolder : `${facility} details`} <span className="text-destructive">*</span></Label>
              <Input id={`facility-details-${facility}`} value={facilityDetails[facility] || ""} onChange={event => setFacilityDetails(current => ({ ...current, [facility]: event.target.value }))} placeholder={facility === "SharePoint" ? copy.sharePointPlaceholder : `Enter details for ${facility}`} className="mt-1.5 h-11" />
            </div>
          ))}
          {variant === "admin" && <div className="mt-5 space-y-1.5"><Label htmlFor="facilities-others">{copy.others}</Label><Textarea id="facilities-others" value={others} onChange={event => setOthers(event.target.value)} placeholder={copy.othersPlaceholder} className="min-h-24 resize-y" /></div>}
          {variant === "application" && selectedErpModules.length > 0 && <AuthorizationSelector selectedModules={selectedErpModules} selectedIds={selectedRightIds} onChange={setSelectedRightIds} language={language} />}
        </section>

        <section className="card-elevated p-5 sm:p-6">
          <SectionTitle number="03" icon={UserCheck} title={copy.approvals} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-primary">{copy.hos} <span className="text-destructive">*</span></Label><Select value={hos} onValueChange={setHos} disabled={areUsersLoading || hosUsers.length === 0}><SelectTrigger className="h-11"><SelectValue placeholder={areUsersLoading ? copy.loadingUsers : copy.chooseHos} /></SelectTrigger><SelectContent className="max-h-64"><SelectItem value="N/A">{text("N/A", "Tidak Berkenaan")}</SelectItem>{hosUsers.map(person => <SelectItem key={person.id} value={person.name}>{person.name}</SelectItem>)}</SelectContent></Select>{hos === "N/A" && <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{copy.bypass}</p>}</div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-primary">{copy.hod} <span className="text-destructive">*</span></Label><Select value={hod} onValueChange={setHod} disabled={areUsersLoading || hodUsers.length === 0}><SelectTrigger className="h-11"><SelectValue placeholder={areUsersLoading ? copy.loadingUsers : copy.chooseHod} /></SelectTrigger><SelectContent className="max-h-64">{hodUsers.map(person => <SelectItem key={person.id} value={person.name}>{person.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </section>

        <div className="flex flex-col justify-center gap-3 pb-8 pt-4 sm:flex-row-reverse sm:gap-4"><button type="submit" disabled={isSubmitting} className="btn-gold flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold disabled:opacity-70 sm:w-auto sm:min-w-64 sm:py-4"><Send className="h-4 w-4" />{isSubmitting ? copy.submitting : copy.submit}</button><button type="button" disabled={isSubmitting} onClick={() => navigate("/it")} className="w-full rounded-full border-2 border-border px-6 py-3.5 text-sm font-bold text-foreground hover:bg-muted sm:w-auto sm:px-12 sm:py-4">{copy.cancel}</button></div>
      </form>
    </div>
  );
};

const AuthorizationSelector = ({ selectedModules, selectedIds, onChange, language }: { selectedModules: string[]; selectedIds: number[]; onChange: (ids: number[]) => void; language: "en" | "ms" }) => {
  const [search, setSearch] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const query = search.trim().toLowerCase();
  const text = (english: string, malay: string) => language === "ms" ? malay : english;

  const toggleRight = (id: number, checked: boolean) => {
    onChange(checked ? [...selectedIds, id] : selectedIds.filter(current => current !== id));
  };

  const moduleRights = (module: string) => authorizationRights.filter(right => {
    if (right.module.toLowerCase() !== module.toLowerCase()) return false;
    if (showSelectedOnly && !selectedIds.includes(right.id)) return false;
    return !query || right.right.toLowerCase().includes(query) || right.module.toLowerCase().includes(query);
  });

  const groupRights = (rights: AuthorizationRight[]) => rights.reduce<Record<string, AuthorizationRight[]>>((groups, right) => {
    const separator = right.right.indexOf(" - ");
    const feature = separator >= 0 ? right.right.slice(0, separator) : "Other permissions";
    (groups[feature] ||= []).push(right);
    return groups;
  }, {});

  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /><h3 className="font-bold text-foreground">{text("ERP User Access Authorization", "Kebenaran Akses Pengguna ERP")}</h3></div><p className="mt-1 text-sm text-muted-foreground">{text("Select the exact user rights required for each chosen ERP module.", "Pilih hak pengguna yang diperlukan bagi setiap modul ERP yang dipilih.")}</p></div>
        <Badge className="w-fit border-0 bg-primary/10 px-3 py-1 text-primary">{selectedIds.length} {text("selected", "dipilih")}</Badge>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder={text("Search all access rights...", "Cari semua hak akses...")} className="h-11 pl-9" /></div>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted/40"><Checkbox checked={showSelectedOnly} onCheckedChange={checked => setShowSelectedOnly(checked === true)} />{text("Show selected only", "Tunjukkan yang dipilih sahaja")}</label>
      </div>

      <Accordion type="multiple" defaultValue={selectedModules} className="rounded-xl border border-border px-4">
        {selectedModules.map(module => {
          const allForModule = authorizationRights.filter(right => right.module.toLowerCase() === module.toLowerCase());
          const visibleRights = moduleRights(module);
          const selectedCount = allForModule.filter(right => selectedIds.includes(right.id)).length;
          const groups = groupRights(visibleRights);
          return <AccordionItem key={module} value={module} className="last:border-b-0"><AccordionTrigger className="gap-3 text-left hover:no-underline"><span className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><span className="font-bold text-foreground">{module}</span><span className="text-xs font-semibold text-primary">{selectedCount} {text("of", "daripada")} {allForModule.length} {text("selected", "dipilih")}</span></span></AccordionTrigger><AccordionContent>
            {visibleRights.length === 0 ? <p className="rounded-lg bg-muted/30 p-4 text-center text-sm text-muted-foreground">{text("No matching access rights.", "Tiada hak akses yang sepadan.")}</p> : <div className="space-y-2">{Object.entries(groups).map(([feature, rights]) => {
              const featureSelected = rights.filter(right => selectedIds.includes(right.id)).length;
              return <details key={feature} open={query ? true : undefined} className="group rounded-lg border border-border/70 bg-muted/10"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-foreground"><span>{feature}</span><span className="shrink-0 text-xs font-semibold text-muted-foreground">{featureSelected} / {rights.length}</span></summary><div className="space-y-1 border-t border-border/60 p-2 sm:p-3">{rights.map(right => {
                const action = right.right.startsWith(`${feature} - `) ? right.right.slice(feature.length + 3) : right.right;
                const checked = selectedIds.includes(right.id);
                return <label key={right.id} htmlFor={`erp-right-${right.id}`} className={`flex cursor-pointer items-start gap-3 rounded-lg p-2.5 transition-colors ${checked ? "bg-primary/10" : "hover:bg-muted/50"}`}><Checkbox id={`erp-right-${right.id}`} checked={checked} onCheckedChange={value => toggleRight(right.id, value === true)} className="mt-0.5 shrink-0" /><span className="min-w-0 text-sm text-foreground"><span className="mr-2 text-xs font-semibold text-muted-foreground">#{right.id}</span>{action}</span></label>;
              })}</div></details>;
            })}</div>}
          </AccordionContent></AccordionItem>;
        })}
      </Accordion>

      {selectedIds.length > 0 && <details className="mt-4 rounded-xl border border-primary/20 bg-primary/5"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-primary">{text("Review selected access rights", "Semak hak akses yang dipilih")} ({selectedIds.length})</summary><div className="max-h-72 space-y-2 overflow-y-auto border-t border-primary/10 p-4">{authorizationRights.filter(right => selectedIds.includes(right.id)).map(right => <div key={right.id} className="flex items-start justify-between gap-3 text-sm"><span><strong>{right.module}:</strong> {right.right}</span><button type="button" onClick={() => toggleRight(right.id, false)} className="shrink-0 text-xs font-bold text-destructive hover:underline">{text("Remove", "Buang")}</button></div>)}</div></details>}
    </div>
  );
};

const SectionTitle = ({ number, icon: Icon, title }: { number: string; icon: typeof UserCheck; title: string }) => <div className="mb-5 flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{number}</span><Icon className="h-5 w-5 text-primary" /><h2 className="font-bold text-foreground">{title}</h2></div>;
const EmployeeDetail = ({ label, value, last = false }: { label: string; value?: string; last?: boolean }) => <div className={`grid grid-cols-1 items-center gap-1 py-2 sm:grid-cols-3 sm:gap-4 sm:py-2.5 ${last ? "" : "border-b border-border/50"}`}><span className="text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</span><div className="text-sm font-bold text-foreground sm:col-span-2">{value || "—"}</div></div>;

export default ITFacilitiesRequisitionForm;
