import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, Calendar, Clock, Layers, Droplet, UserCheck } from "lucide-react";
import { toast } from "sonner";

const DailyOperationMonitoringForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [employeeInfo, setEmployeeInfo] = useState({
    name: user?.name || "",
    staffNo: user?.employeeId || "",
    department: user?.department || "",
    position: (user as any)?.position || "",
  });

  useEffect(() => {
    if (user) {
      setEmployeeInfo({
        name: user.name || "",
        staffNo: user.employeeId || "",
        department: user.department || "",
        position: (user as any)?.position || "",
      });
    }
  }, [user]);

  // --- FORM STATE ---
  const [metaInfo, setMetaInfo] = useState({
    date: "",
    time: "",
    shift: "", // Dropdown (Day / Night)
  });

  const [processInfo, setProcessInfo] = useState({
    mixingTankBatchNo: "",
    mixingTankVolume: "", // Dropdown (1500 / 2000)
    causticSodaLitres: "",
    causticSodaPH1: "",
    coagulationLitres: "",
    coagulationPH2: "",
    flocculationLitres: "",
    flocculationPH3: "",
  });

  const [finalDischarge, setFinalDischarge] = useState({
    ph4: "",
    cod: "",
    bod: "",
    tss: "",
    og: "",
    flowrate: "",
    mg: "",
    nickel: "",
    zink: "",
    iron: "",
    aluminum: "",
    fluoride: "",
    silver: "",
    sulphide: "",
    volumeDcm: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!metaInfo.shift || !processInfo.mixingTankVolume) {
      toast.error("Please fill in all mandatory dropdown fields (Shift and Mixing Tank Volume).");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const now = new Date();
    const finalMetaInfo = {
      ...metaInfo,
      date: now.toISOString().split("T")[0],
      time: now.toTimeString().slice(0, 5),
    };

    const success = await addSubmission({
      formType: "daily_operation_monitoring",
      status: "pending",
      submittedBy: user?.id || "",
      employeeName: user?.name || "Unknown User",
      department: user?.department || "Unknown Dept",
      data: { employeeInfo, metaInfo: finalMetaInfo, processInfo, finalDischarge },
    });

    if (success) {
      toast.success("Daily Operation Monitoring Report submitted successfully!");
      navigate("/home");
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate("/safety")} 
        className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Safety Forms
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground uppercase tracking-wide">
          Daily Operation Monitoring Report
        </h1>
        <p className="text-muted-foreground text-sm mt-1 uppercase tracking-wide">
          HICOM Diecastings Sdn Bhd
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* SECTION 0: Employee Details */}
        <div className="card-elevated p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm uppercase tracking-wide">
              Employee Details / <span className="font-normal text-muted-foreground">Maklumat Pekerja</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/10 p-4 rounded-xl border border-border/50">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Name / Nama</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.name || "—"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Position / Jawatan</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.position || "—"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Staff ID / No Pekerja</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.staffNo || "—"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Department / Jabatan</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.department || "—"}</div>
            </div>
          </div>
        </div>

        {/* SECTION 1: Meta Information */}
        <div className="card-elevated p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm uppercase tracking-wide">
              Log Identification / <span className="font-normal text-muted-foreground">Maklumat Log</span>
            </h2>
          </div>

          <div className="max-w-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Shift <span className="text-destructive">*</span></Label>
              <Select value={metaInfo.shift} onValueChange={(val) => setMetaInfo(p => ({ ...p, shift: val }))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select Shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Day">Day</SelectItem>
                  <SelectItem value="Night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Mixing & Treatment Stages */}
        <div className="card-elevated p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm uppercase tracking-wide">
              Mixing & Chemical Stages / <span className="font-normal text-muted-foreground">Tahap Campuran Kimia</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mixing Tank Unit */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Mixing Tank Details</div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Batch No.</Label>
                <Input
                  type="text"
                  placeholder="Enter Batch No."
                  value={processInfo.mixingTankBatchNo}
                  onChange={e => setProcessInfo(p => ({ ...p, mixingTankBatchNo: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Volume (liter) <span className="text-destructive">*</span></Label>
                <Select value={processInfo.mixingTankVolume} onValueChange={(val) => setProcessInfo(p => ({ ...p, mixingTankVolume: val }))}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select Volume" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1500">1500 liter</SelectItem>
                    <SelectItem value="2000">2000 liter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Caustic Soda Stage */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Caustic Soda</div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Volume (liter)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={processInfo.causticSodaLitres}
                  onChange={e => setProcessInfo(p => ({ ...p, causticSodaLitres: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">pH 1</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="pH Level"
                  value={processInfo.causticSodaPH1}
                  onChange={e => setProcessInfo(p => ({ ...p, causticSodaPH1: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>

            {/* Coagulation Stage */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Coagulation</div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Volume (liter)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={processInfo.coagulationLitres}
                  onChange={e => setProcessInfo(p => ({ ...p, coagulationLitres: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">pH 2</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="pH Level"
                  value={processInfo.coagulationPH2}
                  onChange={e => setProcessInfo(p => ({ ...p, coagulationPH2: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>

            {/* Flocculation Stage */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Flocculation</div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Volume (liter)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={processInfo.flocculationLitres}
                  onChange={e => setProcessInfo(p => ({ ...p, flocculationLitres: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">pH 3</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="pH Level"
                  value={processInfo.flocculationPH3}
                  onChange={e => setProcessInfo(p => ({ ...p, flocculationPH3: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Final Discharge Metrics (Spreadsheet Layout Matching) */}
        <div className="card-elevated p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b pb-4">
            <Droplet className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm uppercase tracking-wide">
              Final Discharge / <span className="font-normal text-muted-foreground">Pelepasan Akhir</span>
            </h2>
          </div>

          {/* Table-Like Row Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-4">Parameter</div>
            <div className="col-span-5 text-center">Value Input</div>
            <div className="col-span-3 text-right">Limit / Unit Hint</div>
          </div>

          {/* Parameters Stack */}
          <div className="space-y-3">
            {[
              { id: "ph4", label: "pH 4", hint: "6.0 ~ 8.0", step: "0.01" },
              { id: "cod", label: "COD", hint: "<200" },
              { id: "bod", label: "BOD", hint: "<50" },
              { id: "tss", label: "TSS", hint: "<100" },
              { id: "og", label: "O & G", hint: "<10" },
              { id: "flowrate", label: "Flowrate", hint: "metercube", step: "0.001" },
              { id: "mg", label: "Mg (Magnesium)", hint: "<1", step: "0.01" },
              { id: "nickel", label: "Nickel", hint: "<1", step: "0.01" },
              { id: "zink", label: "Zink", hint: "<2.0", step: "0.01" },
              { id: "iron", label: "Iron", hint: "<5.0", step: "0.01" },
              { id: "aluminum", label: "Aluminum", hint: "<15", step: "0.01" },
              { id: "fluoride", label: "Fluoride", hint: "<5.0", step: "0.01" },
              { id: "silver", label: "Silver", hint: "<1.0", step: "0.01" },
              { id: "sulphide", label: "Sulphide", hint: "<0.50", step: "0.01" },
              { id: "volumeDcm", label: "Volume DCM", hint: "—" },
            ].map((param) => (
              <div
                key={param.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center p-2 rounded-lg border border-border/40 hover:bg-muted/5 transition-colors"
              >
                {/* Left Parameter Name */}
                <Label htmlFor={param.id} className="col-span-1 sm:col-span-4 font-semibold text-sm text-foreground">
                  {param.label}
                </Label>

                {/* Center Input Field */}
                <div className="col-span-1 sm:col-span-5">
                  <Input
                    id={param.id}
                    type="number"
                    step={param.step || "1"}
                    placeholder={`Enter value for ${param.label}`}
                    value={(finalDischarge as any)[param.id]}
                    onChange={e => setFinalDischarge(p => ({ ...p, [param.id]: e.target.value }))}
                    className="h-10 text-center font-medium shadow-sm"
                  />
                </div>

                {/* Right Hint Label */}
                <div className="col-span-1 sm:col-span-3 text-left sm:text-right">
                  <span className={`inline-block text-xs font-mono font-bold px-2 py-1 rounded ${
                    param.hint.includes("<") || param.hint.includes("~")
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground italic"
                  }`}>
                    {param.hint}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Section */}
        <div className="flex justify-center pt-4 pb-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold px-12 py-4 rounded-full text-sm font-bold flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 shadow-md disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Submitting Records..." : "Submit Log / Hantar Rekod"}
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          This log entry updates environmental metrics immediately. No physical signature required.
        </p>
      </form>
    </div>
  );
};

export default DailyOperationMonitoringForm;