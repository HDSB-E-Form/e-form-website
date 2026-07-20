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

const CCTVAccessRequestForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
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

    if (requestTypes.length === 0) return toast.error("Select at least one type of request.");
    if (!cameraLocation.trim()) return toast.error("Enter the camera location.");
    if (!fromDateTime || !toDateTime) return toast.error("Select the incident start and end date and time.");
    if (new Date(toDateTime) <= new Date(fromDateTime)) return toast.error("The end date and time must be after the start date and time.");
    if (!purpose) return toast.error("Select the purpose of access.");
    if (purpose === "Other" && !otherPurpose.trim()) return toast.error("Enter the other purpose of access.");
    if (!hos || !hod) return toast.error("Select both the Head of Section and Head of Department.");
    if (!declarationAgreed) return toast.error("Acknowledge the confidentiality declaration before submitting.");

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
        position: (user as any)?.position || "",
        employeeInfo: {
          employeeNumber: user?.employeeId || "",
          position: (user as any)?.position || "",
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
      toast.success("CCTV access request submitted successfully.");
      navigate("/submissions");
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-in slide-in-from-bottom-2 duration-500">
      <button type="button" onClick={() => navigate("/it")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to IT Forms
      </button>

      <div className="mb-8 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shrink-0"><Cctv className="h-7 w-7 text-white" /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">CCTV Access Request</h1>
          <p className="text-muted-foreground mt-1">IT Department</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">01</span><CheckSquare className="h-5 w-5 text-primary" /><h2 className="font-bold text-foreground">Type of Request</h2></div>
          <p className="text-sm text-muted-foreground mb-4">Select one or more access types. <span className="text-destructive">*</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requestOptions.map(option => {
              const selected = requestTypes.includes(option);
              return <label key={option} htmlFor={`request-${option}`} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}><Checkbox id={`request-${option}`} checked={selected} onCheckedChange={checked => toggleRequestType(option, checked === true)} className="h-5 w-5 rounded-none border-2" /><span className="text-sm font-medium text-foreground">{option}</span></label>;
            })}
          </div>
        </section>

        <section className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">02</span><MapPin className="h-5 w-5 text-primary" /><h2 className="font-bold text-foreground">Camera and Incident Details</h2></div>
          <div className="space-y-5">
            <div className="space-y-1.5"><Label htmlFor="camera-location">Camera Location <span className="text-destructive">*</span></Label><Input id="camera-location" value={cameraLocation} onChange={e => setCameraLocation(e.target.value)} placeholder="e.g. Plant 1, Camera 03" className="h-11" /></div>
            <div>
              <div className="flex items-center gap-2 mb-2"><CalendarClock className="h-4 w-4 text-primary" /><Label>Incident Date and Time <span className="text-destructive">*</span></Label></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label htmlFor="incident-from" className="text-xs text-muted-foreground">From Date & Time</Label><Input id="incident-from" type="datetime-local" value={fromDateTime} onChange={e => setFromDateTime(e.target.value)} className="h-11 dark:[color-scheme:dark]" /></div>
                <div className="space-y-1.5"><Label htmlFor="incident-to" className="text-xs text-muted-foreground">To Date & Time</Label><Input id="incident-to" type="datetime-local" min={fromDateTime || undefined} value={toDateTime} onChange={e => setToDateTime(e.target.value)} className="h-11 dark:[color-scheme:dark]" /></div>
              </div>
            </div>
          </div>
        </section>

        <section className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">03</span><FileText className="h-5 w-5 text-primary" /><h2 className="font-bold text-foreground">Purpose of Access</h2></div>
          <div className="space-y-4">
            <Select value={purpose} onValueChange={value => { setPurpose(value); if (value !== "Other") setOtherPurpose(""); }}><SelectTrigger className="h-11"><SelectValue placeholder="Select the purpose of access" /></SelectTrigger><SelectContent>{purposeOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>
            {purpose === "Other" && <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1"><Label htmlFor="other-purpose">Other Purpose <span className="text-destructive">*</span></Label><Input id="other-purpose" value={otherPurpose} onChange={e => setOtherPurpose(e.target.value)} placeholder="Enter the purpose of access" className="h-11" autoFocus /></div>}
          </div>
        </section>

        <section className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">04</span><UserCheck className="h-5 w-5 text-primary" /><h2 className="font-bold text-foreground">Approval</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-primary">Head of Section <span className="text-destructive">*</span></Label><Select value={hos} onValueChange={setHos} disabled={areUsersLoading || hosUsers.length === 0}><SelectTrigger className="h-11"><SelectValue placeholder={areUsersLoading ? "Loading users..." : "Choose Head of Section"} /></SelectTrigger><SelectContent className="max-h-64"><SelectItem value="N/A">N/A</SelectItem>{hosUsers.map(person => <SelectItem key={person.id} value={person.name}>{person.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-primary">Head of Department <span className="text-destructive">*</span></Label><Select value={hod} onValueChange={setHod} disabled={areUsersLoading || hodUsers.length === 0}><SelectTrigger className="h-11"><SelectValue placeholder={areUsersLoading ? "Loading users..." : "Choose Head of Department"} /></SelectTrigger><SelectContent className="max-h-64">{hodUsers.map(person => <SelectItem key={person.id} value={person.name}>{person.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </section>

        <section className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">05</span><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="font-bold text-foreground">Confidentiality Declaration</h2></div>
          <div className="rounded-xl border border-border bg-muted/40 p-4 sm:p-5"><p className="text-sm font-semibold text-foreground mb-3">I acknowledge that:</p><ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">{declarationItems.map(item => <li key={item}>{item}</li>)}</ul></div>
          <label htmlFor="confidentiality-agree" className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 hover:bg-muted/30"><Checkbox id="confidentiality-agree" checked={declarationAgreed} onCheckedChange={checked => setDeclarationAgreed(checked === true)} className="mt-0.5 rounded-none" /><span className="text-sm font-semibold text-foreground">I have read, understood, and agree to the confidentiality declaration. <span className="text-destructive">*</span></span></label>
        </section>

        <div className="flex flex-col sm:flex-row-reverse justify-center gap-3 sm:gap-4 pt-4 pb-8">
          <button type="submit" disabled={isSubmitting} className="btn-gold w-full sm:w-auto sm:min-w-64 px-6 py-3.5 sm:py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"><Send className="h-4 w-4" />{isSubmitting ? "Submitting..." : "Submit Request"}</button>
          <button type="button" disabled={isSubmitting} onClick={() => navigate("/it")} className="w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-4 rounded-full border-2 border-border text-foreground font-bold text-sm hover:bg-muted transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default CCTVAccessRequestForm;
