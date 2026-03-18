import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers } from "@/contexts/UsersContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserCheck, Info, ShieldCheck, Shield, Send, Car, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

const LeaveForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const { getUsersByRole } = useUsers();

  const hosUsers = getUsersByRole("HOS");
  const hodUsers = getUsersByRole("HOD");

  const [employeeInfo, setEmployeeInfo] = useState({
    name: user?.name || "",
    staffNo: user?.employeeId || "",
    department: user?.department || "",
    phone: "",
  });

  const [purposeType, setPurposeType] = useState<"company" | "personal">("company");
  const [companyDetails, setCompanyDetails] = useState({ location: "", purpose: "" });
  const [personalDetails, setPersonalDetails] = useState({ location: "", purpose: "" });

  const [hosName, setHosName] = useState("");
  const [hodName, setHodName] = useState("");

  const [securityLog, setSecurityLog] = useState({
    timeOut: "",
    timeIn: "",
    vehicleNo: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSubmission({
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
        securityLog,
      },
    });
    toast.success("Exit pass submitted successfully!");
    navigate("/home");
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate("/hr")} className="flex items-center text-muted-foreground hover:text-foreground mb-6 text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to HR Forms
      </button>

      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground uppercase tracking-wide">
          Exit Pass / Pas Keluar
        </h1>
        <p className="text-muted-foreground text-sm mt-1 uppercase tracking-wide">HICOM Diecastings Sdn Bhd</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Details */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserCheck className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-foreground uppercase text-sm tracking-wide">
              Employee Details / <span className="font-normal">Butiran Pekerja</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Name / Nama Penuh</Label>
              <Input
                value={employeeInfo.name}
                onChange={e => setEmployeeInfo(p => ({ ...p, name: e.target.value }))}
                placeholder="Enter full name"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Staff No / No Pekerja</Label>
              <Input
                value={employeeInfo.staffNo}
                onChange={e => setEmployeeInfo(p => ({ ...p, staffNo: e.target.value }))}
                placeholder="Enter staff number / Masukkan no. pekerja"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Dept / Jabatan</Label>
              <Input
                value={employeeInfo.department}
                onChange={e => setEmployeeInfo(p => ({ ...p, department: e.target.value }))}
                placeholder="Enter department / Masukkan jabatan"
                className="h-11"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="space-y-1.5 max-w-md">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Phone No / No HP</Label>
              <Input
                value={employeeInfo.phone}
                onChange={e => setEmployeeInfo(p => ({ ...p, phone: e.target.value }))}
                placeholder="Enter phone number / Masukkan no. telefon"
                className="h-11"
              />
            </div>
          </div>
        </div>

        {/* Purpose of Exit */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-5">
            <Info className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-foreground uppercase text-sm tracking-wide">
              Purpose of Exit / <span className="font-normal">Tujuan Keluar</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Business */}
            <div
              className={`rounded-xl border-2 p-5 transition-all cursor-pointer ${
                purposeType === "company"
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
              onClick={() => setPurposeType("company")}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  purposeType === "company" ? "border-accent" : "border-muted-foreground"
                }`}>
                  {purposeType === "company" && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
                </div>
                <span className="font-bold text-sm">(A) Company Business / Urusan Syarikat</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Location / Tempat</Label>
                  <Input
                    value={companyDetails.location}
                    onChange={e => setCompanyDetails(p => ({ ...p, location: e.target.value }))}
                    placeholder="Kuala Lumpur"
                    className="h-10"
                    disabled={purposeType !== "company"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Purpose / Tujuan</Label>
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
              className={`rounded-xl border-2 p-5 transition-all cursor-pointer ${
                purposeType === "personal"
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
              onClick={() => setPurposeType("personal")}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  purposeType === "personal" ? "border-accent" : "border-muted-foreground"
                }`}>
                  {purposeType === "personal" && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
                </div>
                <span className="font-bold text-sm">(B) Personal Matter / Urusan Peribadi</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Location / Tempat</Label>
                  <Input
                    value={personalDetails.location}
                    onChange={e => setPersonalDetails(p => ({ ...p, location: e.target.value }))}
                    placeholder="Subang Jaya"
                    className="h-10"
                    disabled={purposeType !== "personal"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Purpose / Tujuan</Label>
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
            <ShieldCheck className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-foreground uppercase text-sm tracking-wide">
              Digital Approvals / <span className="font-normal">Kelulusan Digital</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                Head of Section/ ketua bahagian <span className="text-destructive">*</span>
              </Label>
              <select
                value={hosName}
                onChange={e => setHosName(e.target.value)}
                className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Choose Head of Section</option>
                <option>Encik Azman</option>
                <option>Puan Siti</option>
                <option>Encik Hafiz</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                Head of Department / Ketua Jabatan <span className="text-destructive">*</span>
              </Label>
              <select
                value={hodName}
                onChange={e => setHodName(e.target.value)}
                className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Choose Head of Department</option>
                <option>Dato' Ibrahim</option>
                <option>Encik Rashid</option>
                <option>Puan Nora</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security & HR Log */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-foreground uppercase text-sm tracking-wide">
              Security & HR Log / <span className="font-normal">Log Keselamatan</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Time Out / Masa Keluar</Label>
              <div className="relative">
                <LogOut className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={securityLog.timeOut}
                  onChange={e => setSecurityLog(p => ({ ...p, timeOut: e.target.value }))}
                  className="h-11 pl-10"
                  placeholder="--:--"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Time In / Masa Masuk</Label>
              <div className="relative">
                <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={securityLog.timeIn}
                  onChange={e => setSecurityLog(p => ({ ...p, timeIn: e.target.value }))}
                  className="h-11 pl-10"
                  placeholder="--:--"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Vehicle No / No Kenderaan</Label>
              <div className="relative">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={securityLog.vehicleNo}
                  onChange={e => setSecurityLog(p => ({ ...p, vehicleNo: e.target.value }))}
                  placeholder="WXY 1234"
                  className="h-11 pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-center pt-4 pb-8">
          <button
            type="submit"
            className="btn-gold px-12 py-4 rounded-full text-sm uppercase tracking-wider font-bold flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Submit Exit Pass / Hantar Pas
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
