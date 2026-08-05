import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarClock, CheckSquare, Cctv, FileText, MapPin, Send, ShieldCheck, UserCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers, type AppUser } from "@/contexts/UsersContext";
import { useFormLanguage } from "@/contexts/FormLanguageContext";
import { toast } from "sonner";

const requestOptions = [
  "View CCTV Recording",
  "Export CCTV Footage",
  "Live CCTV Monitoring",
  "Screenshot Capture",
];

const purposeOptions = [
  "Security Investigation",
  "Safety Investigation",
  "HR Investigation",
  "Property Damage",
  "Theft Investigation",
  "Accident Investigation",
  "Customer Investigation",
  "Legal Requirement",
  "Audit",
  "Other",
];

const declarationItems = [
  "CCTV recordings are confidential company information.",
  "Access is strictly limited to the purpose stated in this request.",
  "I shall not copy, distribute, or disclose the footage without written approval.",
  "Any misuse of CCTV footage may result in disciplinary action and/or legal action.",
  "All accessed information will be handled in accordance with the Company's Information Security Policy and applicable personal data protection requirements.",
];

const requestOptionLabels: Record<string, string> = {
  "View CCTV Recording": "Lihat Rakaman CCTV", "Export CCTV Footage": "Eksport Rakaman CCTV",
  "Live CCTV Monitoring": "Pemantauan CCTV Secara Langsung", "Screenshot Capture": "Tangkapan Skrin",
};
const purposeOptionLabels: Record<string, string> = {
  "Security Investigation": "Siasatan Keselamatan", "Safety Investigation": "Siasatan Keselamatan dan Kesihatan",
  "HR Investigation": "Siasatan Sumber Manusia", "Property Damage": "Kerosakan Harta Benda",
  "Theft Investigation": "Siasatan Kecurian", "Accident Investigation": "Siasatan Kemalangan",
  "Customer Investigation": "Siasatan Pelanggan", "Legal Requirement": "Keperluan Undang-undang",
  Audit: "Audit", Other: "Lain-lain",
};
const declarationItemsMalay = [
  "Rakaman CCTV ialah maklumat sulit syarikat.",
  "Akses dihadkan sepenuhnya kepada tujuan yang dinyatakan dalam permohonan ini.",
  "Saya tidak akan menyalin, mengedarkan atau mendedahkan rakaman tanpa kelulusan bertulis.",
  "Sebarang penyalahgunaan rakaman CCTV boleh menyebabkan tindakan tatatertib dan/atau undang-undang.",
  "Semua maklumat yang diakses akan dikendalikan mengikut Polisi Keselamatan Maklumat Syarikat dan keperluan perlindungan data peribadi yang berkenaan.",
];

const CCTVAccessRequestForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const { language } = useFormLanguage();
  const isMalay = language === "ms";
  const text = (english: string, malay: string) => isMalay ? malay : english;
  const { getUsersByRole, isLoading: areUsersLoading } = useUsers();
  const hosUsers: AppUser[] = useMemo(() => [...(getUsersByRole("HOS") || [])].sort((a, b) => a.name.localeCompare(b.name)), [getUsersByRole]);
  const hodUsers: AppUser[] = useMemo(() => [...(getUsersByRole("HOD") || [])].sort((a, b) => a.name.localeCompare(b.name)), [getUsersByRole]);

  const [requestTypes, setRequestTypes] = useState<string[]>([]);
  const [cameraLocation, setCameraLocation] = useState("");
  const [fromDateTime, setFromDateTime] = useState("");
  const [toDateTime, setToDateTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [otherPurpose, setOtherPurpose] = useState("");
  const [hos, setHos] = useState("");
  const [hod, setHod] = useState("");
  const [declarationAgreed, setDeclarationAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleRequestType = (value: string, checked: boolean) => {
    setRequestTypes(current => checked ? [...current, value] : current.filter(item => item !== value));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (requestTypes.length === 0) return toast.error(text("Select at least one type of request.", "Pilih sekurang-kurangnya satu jenis permohonan."));
    if (!cameraLocation.trim()) return toast.error(text("Enter the camera location.", "Masukkan lokasi kamera."));
    if (!fromDateTime || !toDateTime) return toast.error(text("Select the incident start and end date and time.", "Pilih tarikh dan masa mula serta tamat kejadian."));
    if (new Date(toDateTime) <= new Date(fromDateTime)) return toast.error(text("The end date and time must be after the start date and time.", "Tarikh dan masa tamat mestilah selepas tarikh dan masa mula."));
    if (!purpose) return toast.error(text("Select the purpose of access.", "Pilih tujuan akses."));
    if (purpose === "Other" && !otherPurpose.trim()) return toast.error(text("Enter the other purpose of access.", "Masukkan tujuan akses yang lain."));
    if (!hos || !hod) return toast.error(text("Select both the Head of Section and Head of Department.", "Pilih Ketua Seksyen dan Ketua Jabatan."));
    if (!declarationAgreed) return toast.error(text("Acknowledge the confidentiality declaration before submitting.", "Sahkan akuan kerahsiaan sebelum menghantar."));

    setIsSubmitting(true);
    const initialStatus = hos === "N/A" ? "approved_hos" : "pending";
    const success = await addSubmission({
      formType: "cctv_access_request",
      status: initialStatus,
      submittedBy: user?.id || "",
      employeeName: user?.name || "",
      department: user?.department || "",
      data: {
        staffId: user?.employeeId || "",
        position: user?.position || "",
        employeeInfo: {
          employeeNumber: user?.employeeId || "",
          position: user?.position || "",
        },
        requestTypes,
        cameraLocation: cameraLocation.trim(),
        fromDateTime: new Date(fromDateTime).toISOString(),
        toDateTime: new Date(toDateTime).toISOString(),
        purpose: purpose === "Other" ? otherPurpose.trim() : purpose,
        purposeCategory: purpose,
        hosName: hos,
        hodName: hod,
        confidentialityAcknowledged: true,
        declarationItems,
      },
    });

    if (success) {
      toast.success(text("CCTV access request submitted successfully.", "Permohonan akses CCTV berjaya dihantar."));
      navigate("/submissions");
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-in slide-in-from-bottom-2 duration-500">
      <button type="button" onClick={() => navigate("/it")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> {text("Back to IT Forms", "Kembali ke Borang IT")}
      </button>

      <div className="mb-8 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shrink-0"><Cctv className="h-7 w-7 text-white" /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{text("CCTV Access Request", "Permohonan Akses CCTV")}</h1>
          <p className="text-muted-foreground mt-1">{text("IT Department", "Jabatan IT")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">01</span><CheckSquare className="h-5 w-5 text-primary" /><h2 className="font-bold text-foreground">{text("Type of Request", "Jenis Permohonan")}</h2></div>
          <p className="text-sm text-muted-foreground mb-4">{text("Select one or more access types.", "Pilih satu atau lebih jenis akses.")} <span className="text-destructive">*</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requestOptions.map(option => {
              const selected = requestTypes.includes(option);
              return <label key={option} htmlFor={`request-${option}`} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}><Checkbox id={`request-${option}`} checked={selected} onCheckedChange={checked => toggleRequestType(option, checked === true)} className="h-5 w-5 rounded-none border-2" /><span className="text-sm font-medium text-foreground">{isMalay ? requestOptionLabels[option] : option}</span></label>;
            })}
          </div>
        </section>

        <section className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">02</span><MapPin className="h-5 w-5 text-primary" /><h2 className="font-bold text-foreground">{text("Camera and Incident Details", "Butiran Kamera dan Kejadian")}</h2></div>
          <div className="space-y-5">
            <div className="space-y-1.5"><Label htmlFor="camera-location">{text("Camera Location", "Lokasi Kamera")} <span className="text-destructive">*</span></Label><Input id="camera-location" value={cameraLocation} onChange={e => setCameraLocation(e.target.value)} placeholder={text("e.g. Plant 1, Camera 03", "cth. Loji 1, Kamera 03")} className="h-11" /></div>
            <div>
              <div className="flex items-center gap-2 mb-2"><CalendarClock className="h-4 w-4 text-primary" /><Label>{text("Incident Date and Time", "Tarikh dan Masa Kejadian")} <span className="text-destructive">*</span></Label></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label htmlFor="incident-from" className="text-xs text-muted-foreground">{text("From Date & Time", "Dari Tarikh & Masa")}</Label><Input id="incident-from" type="datetime-local" value={fromDateTime} onChange={e => setFromDateTime(e.target.value)} className="h-11 dark:[color-scheme:dark]" /></div>
                <div className="space-y-1.5"><Label htmlFor="incident-to" className="text-xs text-muted-foreground">{text("To Date & Time", "Hingga Tarikh & Masa")}</Label><Input id="incident-to" type="datetime-local" min={fromDateTime || undefined} value={toDateTime} onChange={e => setToDateTime(e.target.value)} className="h-11 dark:[color-scheme:dark]" /></div>
              </div>
            </div>
          </div>
        </section>

        <section className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">03</span><FileText className="h-5 w-5 text-primary" /><h2 className="font-bold text-foreground">{text("Purpose of Access", "Tujuan Akses")}</h2></div>
          <div className="space-y-4">
            <Select value={purpose} onValueChange={value => { setPurpose(value); if (value !== "Other") setOtherPurpose(""); }}><SelectTrigger className="h-11"><SelectValue placeholder={text("Select the purpose of access", "Pilih tujuan akses")} /></SelectTrigger><SelectContent>{purposeOptions.map(option => <SelectItem key={option} value={option}>{isMalay ? purposeOptionLabels[option] : option}</SelectItem>)}</SelectContent></Select>
            {purpose === "Other" && <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1"><Label htmlFor="other-purpose">{text("Other Purpose", "Tujuan Lain")} <span className="text-destructive">*</span></Label><Input id="other-purpose" value={otherPurpose} onChange={e => setOtherPurpose(e.target.value)} placeholder={text("Enter the purpose of access", "Masukkan tujuan akses")} className="h-11" autoFocus /></div>}
          </div>
        </section>

        <section className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">04</span><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="font-bold text-foreground">{text("Confidentiality Declaration", "Akuan Kerahsiaan")}</h2></div>
          <div className="rounded-xl border border-border bg-muted/40 p-4 sm:p-5"><p className="text-sm font-semibold text-foreground mb-3">{text("I acknowledge that:", "Saya mengakui bahawa:")}</p><ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">{(isMalay ? declarationItemsMalay : declarationItems).map(item => <li key={item}>{item}</li>)}</ul></div>
          <label htmlFor="confidentiality-agree" className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 hover:bg-muted/30"><Checkbox id="confidentiality-agree" checked={declarationAgreed} onCheckedChange={checked => setDeclarationAgreed(checked === true)} className="mt-0.5 rounded-none" /><span className="text-sm font-semibold text-foreground">{text("I have read, understood, and agree to the confidentiality declaration.", "Saya telah membaca, memahami dan bersetuju dengan akuan kerahsiaan.")} <span className="text-destructive">*</span></span></label>
        </section>

        <section className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">05</span><UserCheck className="h-5 w-5 text-primary" /><h2 className="font-bold text-foreground">{text("Approval", "Kelulusan")}</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-primary">{text("Head of Section", "Ketua Seksyen")} <span className="text-destructive">*</span></Label><Select value={hos} onValueChange={setHos} disabled={areUsersLoading || hosUsers.length === 0}><SelectTrigger className="h-11"><SelectValue placeholder={areUsersLoading ? text("Loading users...", "Memuatkan pengguna...") : text("Choose Head of Section", "Pilih Ketua Seksyen")} /></SelectTrigger><SelectContent className="max-h-64"><SelectItem value="N/A">{text("N/A", "Tidak Berkenaan")}</SelectItem>{hosUsers.map(person => <SelectItem key={person.id} value={person.name}>{person.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-primary">{text("Head of Department", "Ketua Jabatan")} <span className="text-destructive">*</span></Label><Select value={hod} onValueChange={setHod} disabled={areUsersLoading || hodUsers.length === 0}><SelectTrigger className="h-11"><SelectValue placeholder={areUsersLoading ? text("Loading users...", "Memuatkan pengguna...") : text("Choose Head of Department", "Pilih Ketua Jabatan")} /></SelectTrigger><SelectContent className="max-h-64">{hodUsers.map(person => <SelectItem key={person.id} value={person.name}>{person.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row-reverse justify-center gap-3 sm:gap-4 pt-4 pb-8">
          <button type="submit" disabled={isSubmitting} className="btn-gold w-full sm:w-auto sm:min-w-64 px-6 py-3.5 sm:py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"><Send className="h-4 w-4" />{isSubmitting ? text("Submitting...", "Sedang dihantar...") : text("Submit Request", "Hantar Permohonan")}</button>
          <button type="button" disabled={isSubmitting} onClick={() => navigate("/it")} className="w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-4 rounded-full border-2 border-border text-foreground font-bold text-sm hover:bg-muted transition-colors">{text("Cancel", "Batal")}</button>
        </div>
      </form>
    </div>
  );
};

export default CCTVAccessRequestForm;
