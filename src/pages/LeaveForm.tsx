import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers } from "@/contexts/UsersContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserCheck, Info, ShieldCheck, Shield, Send, Car, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";

const LeaveForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const { getUsersByRole } = useUsers();

  const hosUsers = getUsersByRole("HOS");
  const hodUsers = getUsersByRole("HOD");
  const securityGuards = getUsersByRole("security_guard");

  const [employeeInfo, setEmployeeInfo] = useState({
    name: user?.name || "",
    staffNo: user?.employeeId || "",
    department: user?.department || "",
    designation: (user as any)?.position || "",
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
        designation: (user as any)?.position || "",
        avatar: user.avatar || "",
      }));
    }
  }, [user]);

  const [purposeType, setPurposeType] = useState<"company" | "personal">("company");
  const [companyDetails, setCompanyDetails] = useState({ location: "", purpose: "" });
  const [personalDetails, setPersonalDetails] = useState({ location: "", purpose: "" });

  const [hosName, setHosName] = useState("");
  const [hodName, setHodName] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState({ timeOut: "", timeIn: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hosName || !hodName) {
      toast.error("Please select both Head of Section and Head of Department.");
      return;
    }
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    const success = await addSubmission({
      formType: "leave",
      status: "pending",
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
        estimatedTime,
      },
    });
    if (success) {
      // --- 🔔 SEND EMAIL NOTIFICATION ---
      try {
        const selectedHos = hosUsers.find(u => u.name === hosName);
        const selectedHod = hodUsers.find(u => u.name === hodName);
        
        // Gather all recipient emails
        const recipientEmails = [
          selectedHos?.email,
          selectedHod?.email,
          ...securityGuards.map(guard => guard.email)
        ].filter(Boolean); // Filter out empty/undefined values

        if (recipientEmails.length > 0) {
          const { error: invokeError } = await supabase.functions.invoke('send-notification', {
            body: {
              to: recipientEmails,
              subject: `New Gate Pass Submission from ${employeeInfo.name}`,
              employeeName: employeeInfo.name,
              formType: "Gate Pass",
              url: window.location.origin
            }
          });
          
          if (invokeError) {
            console.error("Edge Function Error:", invokeError);
            toast.error("Form saved, but failed to send email notification. Check browser console.");
          }
        }
      } catch (err) {
        console.error("Failed to prepare email notification", err);
      }

      toast.success("Gate Pass submitted successfully!");
      navigate("/home");
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate("/hr")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to HR Forms
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground uppercase tracking-wide">
          Gate Pass / Pas Keluar
        </h1>
        <p className="text-muted-foreground text-sm mt-1 uppercase tracking-wide">HICOM Diecastings Sdn Bhd</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Details */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              Employee Details / <span className="font-normal">Butiran Pekerja</span>
            </h2>
          </div>

          {/* Pre-filled Details (Do not require filling) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2 bg-muted/10 p-4 rounded-xl border border-border/50">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Name / Nama</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.name || "—"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Designation / Jawatan</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.designation || "—"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Staff ID / No Pekerja</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.staffNo || "—"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Department / Jabatan</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.department || "—"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Mobile Number / No. HP</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.phone || "—"}</div>
            </div>
          </div>
        </div>

        {/* Purpose of Exit */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-5">
            <Info className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              Purpose of Exit / <span className="font-normal">Tujuan Keluar</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Business */}
            <div
              className={`rounded-xl border-2 p-4 sm:p-5 transition-all cursor-pointer ${
                purposeType === "company"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
              onClick={() => setPurposeType("company")}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  purposeType === "company" ? "border-primary" : "border-muted-foreground"
                }`}>
                  {purposeType === "company" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <span className="font-bold text-sm">(A) Company Business / Urusan Syarikat</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-primary">Location / Tempat</Label>
                  <Input
                    value={companyDetails.location}
                    onChange={e => setCompanyDetails(p => ({ ...p, location: e.target.value }))}
                    placeholder="Kuala Lumpur"
                    className="h-10"
                    disabled={purposeType !== "company"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-primary">Purpose / Tujuan</Label>
                  <Input
                    value={companyDetails.purpose}
                    onChange={e => setCompanyDetails(p => ({ ...p, purpose: e.target.value }))}
                    placeholder="Tooling Inspection"
                    className="h-10"
                    disabled={purposeType !== "company"}
                  />
                </div>
              </div>
            </div>

            {/* Personal Matter */}
            <div
              className={`rounded-xl border-2 p-4 sm:p-5 transition-all cursor-pointer ${
                purposeType === "personal"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
              onClick={() => setPurposeType("personal")}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  purposeType === "personal" ? "border-primary" : "border-muted-foreground"
                }`}>
                  {purposeType === "personal" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <span className="font-bold text-sm">(B) Personal Matter / Urusan Peribadi</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-primary">Location / Tempat</Label>
                  <Input
                    value={personalDetails.location}
                    onChange={e => setPersonalDetails(p => ({ ...p, location: e.target.value }))}
                    placeholder="Subang Jaya"
                    className="h-10"
                    disabled={purposeType !== "personal"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-primary">Purpose / Tujuan</Label>
                  <Input
                    value={personalDetails.purpose}
                    onChange={e => setPersonalDetails(p => ({ ...p, purpose: e.target.value }))}
                    placeholder="Tooling Inspection"
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
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              Digital Approvals / <span className="font-normal">Kelulusan Digital</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                Head of Section / Ketua Bahagian <span className="text-destructive">*</span>
              </Label>
              <Select value={hosName} onValueChange={setHosName}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose Head of Section" />
                </SelectTrigger>
                <SelectContent>
                  {hosUsers.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                Head of Department / Ketua Jabatan <span className="text-destructive">*</span>
              </Label>
              <Select value={hodName} onValueChange={setHodName}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose Head of Department" />
                </SelectTrigger>
                <SelectContent>
                  {hodUsers.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Security & HR Log */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              Security & HR Log / <span className="font-normal">Log Keselamatan</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Time Out / Masa Keluar</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors z-10">
                  <LogOut className="h-4 w-4" />
                </div>
                <Input
                  type="time"
                  value={estimatedTime.timeOut}
                  onChange={e => setEstimatedTime(p => ({ ...p, timeOut: e.target.value }))}
                  onClick={e => { try { e.currentTarget.showPicker(); } catch(err) {} }}
                  className="h-11 pl-10 bg-muted/20 hover:bg-muted/50 focus:bg-background text-foreground font-medium shadow-sm transition-all [color-scheme:light_dark] cursor-pointer"
                  placeholder="--:--"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Time In / Masa Masuk</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors z-10">
                  <LogIn className="h-4 w-4" />
                </div>
                <Input
                  type="time"
                  value={estimatedTime.timeIn}
                  onChange={e => setEstimatedTime(p => ({ ...p, timeIn: e.target.value }))}
                  onClick={e => { try { e.currentTarget.showPicker(); } catch(err) {} }}
                  className="h-11 pl-10 bg-muted/20 hover:bg-muted/50 focus:bg-background text-foreground font-medium shadow-sm transition-all [color-scheme:light_dark] cursor-pointer"
                  placeholder="--:--"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-center pt-4 pb-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold px-12 py-4 rounded-full text-sm font-bold flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit Gate Pass / Hantar Pas Keluar"}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          HICOM DIECASTINGS GATE SYSTEM V2.4 &nbsp;•&nbsp; ISO 9001:2015 CERTIFIED
        </p>
      </form>
    </div>
  );
};

export default LeaveForm;
