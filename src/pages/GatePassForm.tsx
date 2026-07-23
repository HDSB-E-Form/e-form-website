import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers, type AppUser } from "@/contexts/UsersContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserCheck, Info, ShieldCheck, Shield, Send, Car, LogIn, LogOut, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { useFormLanguage } from "@/contexts/FormLanguageContext";

const GatePassForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useFormLanguage();
  const isMalay = language === "ms";
  const text = (english: string, malay: string) => isMalay ? malay : english;
  const { addSubmission } = useSubmissions();
  const { getUsersByRole, isLoading: areUsersLoading } = useUsers();

  const hosUsers: AppUser[] = useMemo(() => [...(getUsersByRole("HOS") || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [getUsersByRole]);
  const hodUsers: AppUser[] = useMemo(() => [...(getUsersByRole("HOD") || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [getUsersByRole]);
  const mancoMembers: AppUser[] = useMemo(() => [...(getUsersByRole("manco_member") || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [getUsersByRole]);
  const securityGuards = getUsersByRole("security_guard") || [];

  const [employeeInfo, setEmployeeInfo] = useState({
    name: user?.name || "",
    staffNo: user?.employeeId || "",
    department: user?.department || "",
    position: (user as any)?.position || "",
    avatar: user?.avatar || "",
    phone: user?.phone || "",
  });

  useEffect(() => {
    if (user) {
      setEmployeeInfo(prev => ({
        ...prev,
        name: user.name || "",
        staffNo: user.employeeId || "",
        department: user.department || "",
        phone: user.phone || "",
        position: (user as any)?.position || "",
        avatar: user.avatar || "",
      }));
    }
  }, [user]);

  const [purposeType, setPurposeType] = useState<"company" | "personal">("company");
  const [companyDetails, setCompanyDetails] = useState({ location: "", purpose: "" });
  const [personalDetails, setPersonalDetails] = useState({ location: "", purpose: "" });

  const [hosName, setHosName] = useState("");
  const [hodName, setHodName] = useState("");
  const [mancoMemberId, setMancoMemberId] = useState("");

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState({ timeOut: "", timeIn: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hosName || !hodName || !mancoMemberId) {
      toast.error(text("Please select the Head of Section, Head of Department, and Manco Member.", "Sila pilih Ketua Seksyen, Ketua Jabatan dan Ahli Manco."));
      return;
    }
    
    if (!estimatedTime.timeOut || !estimatedTime.timeIn) {
      toast.error(text("Please provide both estimated Time Out and Time In.", "Sila masukkan anggaran Masa Keluar dan Masa Masuk."));
      return;
    }

    const initialStatus: "pending" | "approved_hos" | "approved_hod" = hosName === "N/A"
      ? (hodName === "N/A" ? "approved_hod" : "approved_hos")
      : "pending";
    if (isSubmitting) return;
    setIsSubmitting(true);

    const selectedMancoMember = mancoMembers.find(member => member.id === mancoMemberId);
    if (!selectedMancoMember) {
      toast.error(text("The selected Manco Member is no longer available. Please select again.", "Ahli Manco yang dipilih tidak lagi tersedia. Sila pilih semula."));
      setIsSubmitting(false);
      return;
    }

    const success = await addSubmission({
      formType: "leave",
      status: initialStatus,
      submittedBy: user?.id || "",
      employeeName: employeeInfo.name,
      department: employeeInfo.department,
      data: {
        employeeInfo,
        purposeType,
        companyDetails,
        personalDetails,
        hosName,
        hodName,
        mancoMemberName: selectedMancoMember.name,
        mancoMemberUserId: selectedMancoMember.id,
        estimatedTime,
      },
    });
    if (success) {
      // // --- 🔔 SEND EMAIL NOTIFICATION (DEACTIVATED) ---
      // try {
      //   const selectedHos = hosUsers.find(u => u.name === hosName);
      //   const selectedHod = hodUsers.find(u => u.name === hodName);
      //   
      //   // Gather all recipient emails
      //   const recipientEmails = [
      //     selectedHos?.email,
      //     selectedHod?.email,
      //     ...securityGuards.map(guard => guard.email)
      //   ].filter(Boolean); // Filter out empty/undefined values

      //   if (recipientEmails.length > 0) {
      //     const { error: invokeError } = await supabase.functions.invoke('send-notification', {
      //       body: {
      //         to: recipientEmails,
      //         subject: `New Gate Pass Submission from ${employeeInfo.name}`,
      //         employeeName: employeeInfo.name,
      //         formType: "Gate Pass",
      //         url: window.location.origin
      //       }
      //     });
      //     
      //     if (invokeError) {
      //       console.error("Edge Function Error:", invokeError);
      //     }
      //   }
      // } catch (err) {
      //   console.error("Failed to prepare email notification", err);
      // }

      toast.success(text("Gate Pass submitted successfully!", "Pas Keluar berjaya dihantar!"));
      navigate("/home");
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <button type="button" onClick={() => navigate("/hr")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> {text("Back to HR Forms", "Kembali ke Borang HR")}
      </button>

      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{text("Gate Pass", "Pas Keluar")}</h1>
          <p className="mt-1 text-base font-medium text-primary">{text("Human Resources Department", "Jabatan Sumber Manusia")}</p>
        </div>

        {/* Live Clock */}
        <div className="flex items-center gap-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-xl p-3 pr-5 rounded-2xl w-fit">
          <div className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/40 backdrop-blur-sm border border-white/50 dark:border-white/10 shadow-inner flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-mono font-bold text-foreground leading-none tracking-wider">
              {currentTime.toLocaleTimeString(isMalay ? "ms-MY" : "en-US", { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">
              {currentTime.toLocaleDateString(isMalay ? "ms-MY" : "en-GB", { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Details */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">01</span>
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">
              {text("Employee Details", "Butiran Pekerja")}
            </h2>
          </div>

          {/* Pre-filled Details (Do not require filling) */}
          <div className="bg-muted/10 p-4 rounded-xl border border-border/50">
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">{text("Name", "Nama")}</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{employeeInfo.name || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">{text("Position", "Jawatan")}</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{employeeInfo.position || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">{text("Staff ID", "No. Pekerja")}</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{employeeInfo.staffNo || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">{text("Department", "Jabatan")}</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{employeeInfo.department || "—"}</div>
            </div>
          </div>
        </div>

        {/* Purpose of Exit */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">02</span>
            <Info className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">
              {text("Purpose of Exit", "Tujuan Keluar")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="radiogroup" aria-label={text("Purpose of exit", "Tujuan keluar")}>
            {/* Company Business */}
            <div
              role="radio"
              aria-checked={purposeType === "company"}
              tabIndex={0}
              className={`rounded-xl border-2 p-4 sm:p-5 transition-all cursor-pointer ${
                purposeType === "company"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
              onClick={() => setPurposeType("company")}
              onKeyDown={e => {
                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setPurposeType("company");
                }
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  purposeType === "company" ? "border-primary" : "border-muted-foreground"
                }`}>
                  {purposeType === "company" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <span className="font-bold text-sm">(A) {text("Company Business", "Urusan Syarikat")}</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-primary">{text("Location", "Tempat")}</Label>
                  <Input
                    value={companyDetails.location}
                    onChange={e => setCompanyDetails(p => ({ ...p, location: e.target.value }))}
                    placeholder="Kuala Lumpur"
                    className="h-10"
                    disabled={purposeType !== "company"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-primary">{text("Purpose", "Tujuan")}</Label>
                  <Input
                    value={companyDetails.purpose}
                    onChange={e => setCompanyDetails(p => ({ ...p, purpose: e.target.value }))}
                    placeholder={text("Tooling Inspection", "Pemeriksaan Perkakas")}
                    className="h-10"
                    disabled={purposeType !== "company"}
                  />
                </div>
              </div>
            </div>

            {/* Personal Matter */}
            <div
              role="radio"
              aria-checked={purposeType === "personal"}
              tabIndex={0}
              className={`rounded-xl border-2 p-4 sm:p-5 transition-all cursor-pointer ${
                purposeType === "personal"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
              onClick={() => setPurposeType("personal")}
              onKeyDown={e => {
                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setPurposeType("personal");
                }
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  purposeType === "personal" ? "border-primary" : "border-muted-foreground"
                }`}>
                  {purposeType === "personal" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <span className="font-bold text-sm">(B) {text("Personal Matter", "Urusan Peribadi")}</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-primary">{text("Location", "Tempat")}</Label>
                  <Input
                    value={personalDetails.location}
                    onChange={e => setPersonalDetails(p => ({ ...p, location: e.target.value }))}
                    placeholder="Subang Jaya"
                    className="h-10"
                    disabled={purposeType !== "personal"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-primary">{text("Purpose", "Tujuan")}</Label>
                  <Input
                    value={personalDetails.purpose}
                    onChange={e => setPersonalDetails(p => ({ ...p, purpose: e.target.value }))}
                    placeholder={text("Tooling Inspection", "Pemeriksaan Perkakas")}
                    className="h-10"
                    disabled={purposeType !== "personal"}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Digital Approvals */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">03</span>
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">
              {text("Digital Approvals", "Kelulusan Digital")}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {text("Head of Section", "Ketua Seksyen")} <span className="text-destructive">*</span>
              </Label>
              <Select value={hosName} onValueChange={setHosName} disabled={areUsersLoading || hosUsers.length === 0}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={areUsersLoading ? text("Loading users...", "Memuatkan pengguna...") : text("Choose Head of Section", "Pilih Ketua Seksyen")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="N/A">{text("N/A", "Tidak Berkenaan")}</SelectItem>
                  {hosUsers.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            {!areUsersLoading && hosUsers.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">{text("Refresh if the HOS list is unavailable.", "Muat semula jika senarai Ketua Seksyen tidak tersedia.")}</p>
            )}
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {text("Head of Department", "Ketua Jabatan")} <span className="text-destructive">*</span>
              </Label>
              <Select value={hodName} onValueChange={setHodName} disabled={areUsersLoading}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={areUsersLoading ? text("Loading users...", "Memuatkan pengguna...") : text("Choose Head of Department", "Pilih Ketua Jabatan")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="N/A">{text("N/A", "Tidak Berkenaan")}</SelectItem>
                  {hodUsers.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            {!areUsersLoading && hodUsers.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">{text("No HOD users found. Select N/A if HOD approval is not required.", "Tiada pengguna Ketua Jabatan ditemui. Pilih N/A jika kelulusan Ketua Jabatan tidak diperlukan.")}</p>
            )}
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {text("Manco Member", "Ahli Manco")} <span className="text-destructive">*</span>
              </Label>
              <Select value={mancoMemberId} onValueChange={setMancoMemberId} disabled={areUsersLoading || mancoMembers.length === 0}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={areUsersLoading ? text("Loading users...", "Memuatkan pengguna...") : text("Choose Manco Member", "Pilih Ahli Manco")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {mancoMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!areUsersLoading && mancoMembers.length === 0 && (
                <p className="text-xs text-destructive mt-1.5">{text("No Manco Members are configured. Ask a Super Admin to assign the role.", "Tiada Ahli Manco dikonfigurasi. Minta Super Admin menetapkan peranan tersebut.")}</p>
              )}
            </div>
          </div>
        </div>

        {/* Security & HR Log */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">04</span>
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">
              {text("Security & HR Log", "Log Keselamatan & HR")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">{text("Time Out", "Masa Keluar")} <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground -mt-1 mb-1.5">{text("Select your estimated time out.", "Pilih anggaran masa keluar anda.")}</p>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors z-10">
                  <LogOut className="h-4 w-4" />
                </div>
                <Input
                  type="time"
                  value={estimatedTime.timeOut}
                  onChange={e => setEstimatedTime(p => ({ ...p, timeOut: e.target.value }))}
                  className="h-11 pl-10 w-full bg-muted/20 hover:bg-muted/50 focus:bg-background text-foreground font-medium shadow-sm transition-colors dark:[color-scheme:dark]"
                  placeholder="--:--"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">{text("Time In", "Masa Masuk")} <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground -mt-1 mb-1.5">{text("Select your estimated time in.", "Pilih anggaran masa masuk anda.")}</p>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors z-10">
                  <LogIn className="h-4 w-4" />
                </div>
                <Input
                  type="time"
                  value={estimatedTime.timeIn}
                  onChange={e => setEstimatedTime(p => ({ ...p, timeIn: e.target.value }))}
                  className="h-11 pl-10 w-full bg-muted/20 hover:bg-muted/50 focus:bg-background text-foreground font-medium shadow-sm transition-colors dark:[color-scheme:dark]"
                  placeholder="--:--"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row-reverse justify-center gap-3 sm:gap-4 pt-4 pb-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold w-full sm:w-auto sm:min-w-64 px-6 py-3.5 sm:py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? text("Submitting...", "Sedang dihantar...") : text("Submit Gate Pass", "Hantar Pas Keluar")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/hr")}
            className="w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-4 rounded-full border-2 border-border text-foreground font-bold text-sm hover:bg-muted transition-colors text-center"
          >
            {text("Cancel", "Batal")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GatePassForm;
