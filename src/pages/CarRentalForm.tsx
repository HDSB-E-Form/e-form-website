import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers } from "@/contexts/UsersContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEPARTMENTS = ["Engineering", "Finance", "HR", "Marketing", "Operations", "IT", "Legal"];

const CarRentalForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const { getUsersByRole } = useUsers();
  const hosUsers = getUsersByRole("HOS");
  const hodUsers = getUsersByRole("HOD");
  const [step, setStep] = useState(1);
  const [policyAgreed, setPolicyAgreed] = useState(false);

  const [form, setForm] = useState({
    journeyType: "business",
    fromDate: "",
    toDate: "",
    destination: "",
    purpose: "",
    // Step 2
    name: user?.name || "",
    staffId: "",
    icNo: "",
    department: user?.department || "",
    designation: "",
    mobileNumber: "",
    drivingLicenseNo: "",
    drivingLicenseExpiry: "",
    hos: "",
    hod: "",
  });

  const [passengers, setPassengers] = useState(
    Array.from({ length: 6 }, () => ({ name: "", staffId: "", designation: "", department: "" }))
  );

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePassengerChange = (index: number, field: string, value: string) => {
    setPassengers(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleSubmit = () => {
    if (!policyAgreed) {
      toast.error("Please agree to the Company Vehicle Policy before submitting.");
      return;
    }
    addSubmission({
      formType: "car_rental",
      status: "pending",
      submittedBy: user?.id || "",
      employeeName: user?.name || "",
      department: user?.department || "",
      data: { ...form, passengers, hosName: form.hos, hodName: form.hod },
    });
    toast.success("Company car request submitted successfully!");
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="bg-background border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => navigate("/hr")} className="flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Car Forms / <span className="font-medium text-foreground ml-1">borang kereta</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 lg:p-8">
        {/* Breadcrumb */}
        <div className="text-xs text-muted-foreground mb-6">
          <span>FORMS</span>
          <span className="mx-2">›</span>
          <span className="font-bold text-foreground">COMPANY CAR REQUEST</span>
        </div>

        {/* Step 1: Journey Details */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Request for Use of Company Car</h1>
              <p className="text-primary font-semibold text-lg">Permohonan Menggunakan Kereta Syarikat</p>
            </div>

            {/* Journey Type */}
            <div className="space-y-2">
              <Label className="font-semibold">Journey Type / Jenis Perjalanan *</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => handleChange("journeyType", "business")}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    form.journeyType === "business"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <span className="font-semibold text-sm text-foreground">Business / Perniagaan</span>
                  <p className="text-xs text-muted-foreground mt-1">Official company travel</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("journeyType", "other")}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    form.journeyType === "other"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <span className="font-semibold text-sm text-foreground">Other / Lain-lain</span>
                  <p className="text-xs text-muted-foreground mt-1">Non-business journey</p>
                </button>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">From Date & Time / Dari Tarikh & Masa *</Label>
                <Input type="datetime-local" value={form.fromDate} onChange={e => handleChange("fromDate", e.target.value)} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">To Date & Time / Kepada Tarikh & Masa *</Label>
                <Input type="datetime-local" value={form.toDate} onChange={e => handleChange("toDate", e.target.value)} className="h-11" />
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <Label className="font-semibold">Destination / Destinasi *</Label>
              <Input value={form.destination} onChange={e => handleChange("destination", e.target.value)} placeholder="Enter city or full address" className="h-11" />
              {/* Map placeholder */}
              <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm border border-border">
                🗺️ Map preview area
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label className="font-semibold">Purpose of Journey / Tujuan perjalanan *</Label>
              <Textarea
                value={form.purpose}
                onChange={e => handleChange("purpose", e.target.value)}
                placeholder="State the reason for your request..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Be as detailed as possible, include meeting details, client names etc.</p>
            </div>

            <div className="flex justify-start pt-4">
              <button type="button" onClick={() => setStep(2)} className="btn-gold text-sm flex items-center gap-2">
                Next Step / seterusnya <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">In case of emergency travel, please call the Fleet Manager directly at +139 175 47 1946</p>
          </div>
        )}

        {/* Step 2: Requester / Driver Details */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Section Header */}
            <div className="bg-primary text-primary-foreground rounded-lg p-4">
              <h2 className="font-semibold">Section B: Requester Details — Driver Details / Seksyen B: Butiran Pemohon — Butiran Pemandu</h2>
            </div>

            {/* Form Fields */}
            <div className="bg-background rounded-lg border border-border p-6 space-y-5">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Name / Nama</Label>
                  <Input value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder="Full name as per I/C" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Staff ID / ID Kakitangan</Label>
                  <Input value={form.staffId} onChange={e => handleChange("staffId", e.target.value)} placeholder="STF-0000" className="h-11" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">I/C No. / No. K/P</Label>
                  <Input value={form.icNo} onChange={e => handleChange("icNo", e.target.value)} placeholder="e.g. 900101-01-1111" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Department / Jabatan</Label>
                  <Select value={form.department} onValueChange={v => handleChange("department", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Designation / Jawatan</Label>
                  <Input value={form.designation} onChange={e => handleChange("designation", e.target.value)} placeholder="Your current role" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Mobile Number / No. Telefon Bimbit</Label>
                  <Input value={form.mobileNumber} onChange={e => handleChange("mobileNumber", e.target.value)} placeholder="+60 1x-xxx xxxx" className="h-11" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Driving License Number / No. Lesen Memandu</Label>
                  <Input value={form.drivingLicenseNo} onChange={e => handleChange("drivingLicenseNo", e.target.value)} placeholder="License No." className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Driving License Expiry / Tarikh Tamat Lesen</Label>
                  <Input type="date" value={form.drivingLicenseExpiry} onChange={e => handleChange("drivingLicenseExpiry", e.target.value)} className="h-11" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Head of Section/ ketua bahagian <span className="text-destructive">*</span></Label>
                  <Select value={form.hos} onValueChange={v => handleChange("hos", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Choose Head of Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {hosUsers.map(h => <SelectItem key={h.id} value={h.name}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Head of Department / Ketua Jabatan <span className="text-destructive">*</span></Label>
                  <Select value={form.hod} onValueChange={v => handleChange("hod", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Choose Head of Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {hodUsers.map(h => <SelectItem key={h.id} value={h.name}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Passenger Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Passenger Details / Butiran Penumpang
              </h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-xs font-semibold text-muted-foreground uppercase px-4 py-3 text-left w-12">No.</th>
                      <th className="text-xs font-semibold text-muted-foreground uppercase px-4 py-3 text-left">Name / Nama</th>
                      <th className="text-xs font-semibold text-muted-foreground uppercase px-4 py-3 text-left">Staff ID</th>
                      <th className="text-xs font-semibold text-muted-foreground uppercase px-4 py-3 text-left">Designation / Jawatan</th>
                      <th className="text-xs font-semibold text-muted-foreground uppercase px-4 py-3 text-left">Department / Jabatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passengers.map((p, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">{i + 1}</td>
                        <td className="px-2 py-2">
                          <Input value={p.name} onChange={e => handlePassengerChange(i, "name", e.target.value)} placeholder="Enter name" className="h-9 border-0 bg-transparent shadow-none text-sm" />
                        </td>
                        <td className="px-2 py-2">
                          <Input value={p.staffId} onChange={e => handlePassengerChange(i, "staffId", e.target.value)} placeholder="ID" className="h-9 border-0 bg-transparent shadow-none text-sm" />
                        </td>
                        <td className="px-2 py-2">
                          <Input value={p.designation} onChange={e => handlePassengerChange(i, "designation", e.target.value)} placeholder="Title" className="h-9 border-0 bg-transparent shadow-none text-sm" />
                        </td>
                        <td className="px-2 py-2">
                          <Input value={p.department} onChange={e => handlePassengerChange(i, "department", e.target.value)} placeholder="Dept" className="h-9 border-0 bg-transparent shadow-none text-sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <button type="button" onClick={() => setStep(1)} className="px-6 py-3 text-sm border border-border rounded-lg hover:bg-muted flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Previous
              </button>
              <button type="button" onClick={() => setStep(3)} className="btn-gold text-sm flex items-center gap-2">
                Save & Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">© 2024 HR Department Corporate Services. All rights reserved.</p>
          </div>
        )}

        {/* Step 3: Policy Acknowledgement */}
        {step === 3 && (
          <div className="space-y-8 pt-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Company Vehicle Policy — Acknowledgement</h1>
              <p className="text-muted-foreground mt-1">Polisi Kenderaan Syarikat — Perakuan</p>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 space-y-4 border border-border max-h-64 overflow-y-auto">
              <div>
                <h3 className="font-bold text-primary underline text-sm">1. General Policy Statement</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  I hereby acknowledge that I have read, understand and agree to the terms of the Company Vehicle
                  Policy including safety regulations, maintenance responsibilities, and reporting procedures for any
                  incidents or damages.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-primary underline text-sm">2. Safety and Usage</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Vehicles are to be used strictly for company business. Personal use is prohibited unless specifically
                  authorized in writing. Drivers must ensure the vehicle is in roadworthy condition at all times, adhere to all traffic
                  laws, and report any mechanical issues immediately. Seatbelts must be worn at all times by all occupants.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-primary underline text-sm">3. Fuel and Maintenance</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  All fuel expenses must be documented with receipts. Regular maintenance schedules must be followed.
                  Any damage or wear beyond normal use must be reported within 24 hours.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-primary underline text-sm">4. Liability</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  The driver is responsible for any fines, penalties, or damages resulting from negligence or violation
                  of traffic laws during the use of the company vehicle.
                </p>
              </div>
            </div>

            {/* Agreement Checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="policy-agree"
                checked={policyAgreed}
                onCheckedChange={(checked) => setPolicyAgreed(checked === true)}
                className="mt-0.5"
              />
              <div>
                <label htmlFor="policy-agree" className="text-sm font-semibold text-foreground cursor-pointer">
                  I have read and agree to the above / Saya telah membaca dan bersetuju
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Compliance with these terms is mandatory for all employees requesting vehicle use.
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setStep(2)} className="px-8 py-3 text-sm border border-border rounded-lg hover:bg-muted font-semibold">
                BACK / KEMBALI
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!policyAgreed}
                className={`px-8 py-3 text-sm rounded-lg font-semibold flex items-center gap-2 transition-all ${
                  policyAgreed
                    ? "btn-gold"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                SUBMIT FORM / HANTAR BORANG ▷
              </button>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground pt-8">
              <span>© 2023 HR Management System</span>
              <div className="flex gap-4">
                <span>Privacy Policy</span>
                <span>Support</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CarRentalForm;
