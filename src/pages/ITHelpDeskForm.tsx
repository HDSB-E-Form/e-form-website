import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Headphones, Send, ShieldAlert, UserCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useFormLanguage } from "@/contexts/FormLanguageContext";
import { toast } from "sonner";

const urgencyOptions = ["Low", "Medium", "High"];
const issueTypeOptions = [
  "Administration (e.g. Hardware, Laptop, PC, Printing)",
  "ERP LN (BAAN)",
  "ERP Monitor",
  "Internet Downtime",
  "Email Downtime",
  "Cyber Attacks / Spam / Phishing",
  "Data Recovery",
];
const urgencyLabels: Record<string, string> = { Low: "Rendah", Medium: "Sederhana", High: "Tinggi" };
const issueTypeLabels: Record<string, string> = {
  "Administration (e.g. Hardware, Laptop, PC, Printing)": "Pentadbiran (cth. Perkakasan, Komputer Riba, PC, Percetakan)",
  "ERP LN (BAAN)": "ERP LN (BAAN)", "ERP Monitor": "Pemantau ERP",
  "Internet Downtime": "Gangguan Internet", "Email Downtime": "Gangguan E-mel",
  "Cyber Attacks / Spam / Phishing": "Serangan Siber / Spam / Pancingan Data",
  "Data Recovery": "Pemulihan Data",
};
const superiorEmailOptions = [
  "azmi@hidsb.com",
  "Hairulnizam@hidsb.com",
  "Zaini@hidsb.com",
  "Ismail.ibrahim@hidsb.com",
  "Huzaimi@hidsb.com",
  "Norhafiza@hidsb.com",
  "Norhaza@hidsb.com",
  "Fairuz.hasnan@hidsb.com",
  "Fikri@hidsb.com",
  "Akmal.hisham@hidsb.com",
  "Ashraf.mustaffa@hidsb.com",
  "Zulhafez@hidsb.com",
  "Adib@hidsb.com",
  "Shahrilfarizal@hidsb.com",
  "Mohdrosli@hidsb.com",
  "Zaidei.sanusi@hidsb.com",
  "Lokman.salehuddin@hidsb.com",
  "Salleh.hamid@hidsb.com",
  "Abdkarnain@hidsb.com",
  "Suparman.subhan@hidsb.com",
  "Saiful.hazrin@hidsb.com",
  "Zaharahomar@hidsb.com",
  "Nantha@hidsb.com",
  "Akif@hidsb.com",
  "Khairuddin@hidsb.com",
  "Norazlee@hidsb.com",
  "Zulkernine@hidsb.com",
  "Zairi.amirodin@hidsb.com",
  "Jasni@hidsb.com",
].sort((a, b) => a.localeCompare(b));

const ITHelpDeskForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const { language } = useFormLanguage();
  const isMalay = language === "ms";
  const text = (english: string, malay: string) => isMalay ? malay : english;
  const [superiorEmail, setSuperiorEmail] = useState("");
  const [urgency, setUrgency] = useState("");
  const [issueType, setIssueType] = useState("");
  const [issueExplanation, setIssueExplanation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.name || !user?.email) return toast.error(text("Your profile name and email are required before submitting.", "Nama dan e-mel profil anda diperlukan sebelum menghantar."));
    if (!user?.department) return toast.error(text("Your department is required before submitting. Please update your profile.", "Jabatan anda diperlukan sebelum menghantar. Sila kemas kini profil anda."));
    if (!superiorEmail.trim()) return toast.error(text("Enter the superior email.", "Masukkan e-mel pegawai atasan."));
    if (!urgency) return toast.error(text("Select the urgency level.", "Pilih tahap keutamaan."));
    if (!issueType) return toast.error(text("Select the type of issue or request.", "Pilih jenis masalah atau permohonan."));
    if (!issueExplanation.trim()) return toast.error(text("Explain the issue or request.", "Terangkan masalah atau permohonan."));

    setIsSubmitting(true);
    const success = await addSubmission({
      formType: "it_help_desk",
      status: "pending",
      submittedBy: user?.id || "",
      employeeName: user.name,
      department: user.department,
      data: {
        staffId: user?.employeeId || "",
        position: user.position || "",
        employeeInfo: {
          employeeNumber: user?.employeeId || "",
          position: user.position || "",
        },
        requesterName: user.name,
        divisionDepartment: user.department,
        contactEmail: user.email,
        superiorEmail: superiorEmail.trim(),
        urgency,
        reportFor: "IT Issues / Troubleshooting / Request",
        issueType,
        issueExplanation: issueExplanation.trim(),
      },
    });

    if (success) {
      toast.success(text("IT Help Desk ticket submitted successfully.", "Tiket Meja Bantuan IT berjaya dihantar."));
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
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600">
          <Headphones className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{text("IT Help Desk Ticket", "Tiket Meja Bantuan IT")}</h1>
          <p className="mt-1 text-muted-foreground">{text("IT Department", "Jabatan IT")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="card-elevated p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">01</span>
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">{text("Employee Details", "Butiran Pekerja")}</h2>
          </div>
          <div className="bg-muted/10 p-4 rounded-xl border border-border/50">
            <EmployeeDetail label={text("Name", "Nama")} value={user?.name} />
            <EmployeeDetail label={text("Position", "Jawatan")} value={user?.position} />
            <EmployeeDetail label={text("Staff ID", "No. Pekerja")} value={user?.employeeId} />
            <EmployeeDetail label={text("Department", "Jabatan")} value={user?.department} last />
          </div>
        </section>

        <section className="card-elevated p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">02</span>
            <ShieldAlert className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground">{text("Ticket Classification", "Klasifikasi Tiket")}</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={text("Urgency", "Keutamaan")} id="ticket-urgency" required>
              <Select value={urgency} onValueChange={setUrgency}><SelectTrigger id="ticket-urgency" className="h-11"><SelectValue placeholder={text("Select urgency", "Pilih tahap keutamaan")} /></SelectTrigger><SelectContent>{urgencyOptions.map(option => <SelectItem key={option} value={option}>{isMalay ? urgencyLabels[option] : option}</SelectItem>)}</SelectContent></Select>
            </Field>
            <Field label={text("Superior Email", "E-mel Pegawai Atasan")} id="superior-email" required>
              <Select value={superiorEmail} onValueChange={setSuperiorEmail}>
                <SelectTrigger id="superior-email" className="h-11"><SelectValue placeholder={text("Select superior email", "Pilih e-mel pegawai atasan")} /></SelectTrigger>
                <SelectContent className="max-h-72">{superiorEmailOptions.map(email => <SelectItem key={email} value={email}>{email}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-5 space-y-5">
            <Field label={text("Type of Issue / Request", "Jenis Masalah / Permohonan")} id="issue-type" required>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger id="issue-type" className="h-11"><SelectValue placeholder={text("Select type of issue or request", "Pilih jenis masalah atau permohonan")} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {issueTypeOptions.map(option => <SelectItem key={option} value={option}>{isMalay ? issueTypeLabels[option] : option}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label={text("Issue Explanation or Request", "Nyatakan Masalah atau Permohonan")} id="issue-explanation" required>
              <Textarea
                id="issue-explanation"
                value={issueExplanation}
                onChange={event => setIssueExplanation(event.target.value)}
                placeholder={text("Describe the issue, troubleshooting details, or request...", "Terangkan masalah, langkah penyelesaian atau permohonan...")}
                className="min-h-32 resize-y"
                required
              />
            </Field>
          </div>
        </section>

        <div className="flex flex-col justify-center gap-3 pb-8 pt-4 sm:flex-row-reverse sm:gap-4">
          <button type="submit" disabled={isSubmitting} className="btn-gold flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:min-w-64 sm:py-4"><Send className="h-4 w-4" />{isSubmitting ? text("Submitting...", "Sedang dihantar...") : text("Submit Ticket", "Hantar Tiket")}</button>
          <button type="button" disabled={isSubmitting} onClick={() => navigate("/it")} className="w-full rounded-full border-2 border-border px-6 py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-muted sm:w-auto sm:px-12 sm:py-4">{text("Cancel", "Batal")}</button>
        </div>
      </form>
    </div>
  );
};

const Field = ({ label, id, required, children }: { label: string; id: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label} {required && <span className="text-destructive">*</span>}</Label>
    {children}
  </div>
);

const EmployeeDetail = ({ label, value, last = false }: { label: string; value?: string; last?: boolean }) => (
  <div className={`py-2 sm:py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center ${last ? "" : "border-b border-border/50"}`}>
    <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">{label}</span>
    <div className="text-sm font-bold text-foreground sm:col-span-2">{value || "—"}</div>
  </div>
);

export default ITHelpDeskForm;
