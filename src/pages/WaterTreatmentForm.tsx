import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, Calendar, Clock, Layers, Droplet, UserCheck, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const DailyOperationMonitoringForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addSubmission, submissions } = useSubmissions();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const activeFormType = location.pathname.includes("discharge") ? "discharge" : "mixing";

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

  useEffect(() => {
    if (activeFormType === "mixing") {
      const mixingCount = submissions.filter(s => s.formType === "mixing_chemical_stages").length;
      const autoBatchNo = `BCH-${String(mixingCount + 1).padStart(4, '0')}`;
      setProcessInfo(p => ({ ...p, mixingTankBatchNo: autoBatchNo }));
    }
  }, [submissions, activeFormType]);

  // --- FORM STATE ---
  const [metaInfo, setMetaInfo] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
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
    rawEq: "",
  });

  const dischargeParams = [
    { id: 'ph4', label: 'pH Value' },
    { id: 'cod', label: 'Chemical Oxygen Demand (COD)' },
    { id: 'bod', label: 'Biochemical Oxygen Demand (BOD)' },
    { id: 'tss', label: 'Total Suspended Solid (TSS)' },
    { id: 'og', label: 'Oil & Grease (O&G)' },
    { id: 'flowrate', label: 'Flowrate' },
    { id: 'mg', label: 'Magnesium (Mg)' },
    { id: 'nickel', label: 'Nickel (Ni)' },
    { id: 'zink', label: 'Zinc (Zn)' },
    { id: 'iron', label: 'Iron (Fe)' },
    { id: 'aluminum', label: 'Aluminum (Al)' },
    { id: 'fluoride', label: 'Fluoride' },
    { id: 'silver', label: 'Silver (Ag)' },
    { id: 'sulphide', label: 'Sulphide (S²⁻)' },
    { id: 'rawEq', label: 'Raw EQ' },
  ];

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!metaInfo.shift) {
      toast.error("Please fill in the Shift field.");
      return;
    }
    if (activeFormType === "mixing" && !processInfo.mixingTankVolume) {
      toast.error("Please fill in Mixing Tank Volume.");
      return;
    }

    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    if (isSubmitting) return;
    setShowConfirm(false);
    setIsSubmitting(true);

    const finalMetaInfo = { ...metaInfo };

    const success = await addSubmission({
      formType: activeFormType === "mixing" ? "mixing_chemical_stages" : "final_discharge",
      status: "approved",
      submittedBy: user?.id || "",
      employeeName: user?.name || "Unknown User",
      department: user?.department || "Unknown Dept",
      data: activeFormType === "mixing" ? { employeeInfo, metaInfo: finalMetaInfo, processInfo, remarks } : { employeeInfo, metaInfo: finalMetaInfo, finalDischarge, remarks },
    });

    if (success) {
      toast.success(`${activeFormType === "mixing" ? "Mixing & Chemical Stages" : "Final Discharge"} submitted successfully!`);
      navigate("/home");
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate("/safety")} 
        className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Safety Forms
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground uppercase tracking-wide">
          {activeFormType === "mixing" ? "Mixing & Chemical Stages" : "Final Discharge"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1 uppercase tracking-wide">
          HICOM Diecastings Sdn Bhd
        </p>
      </div>

      <form onSubmit={handleOpenConfirm} className="space-y-6">

        {/* SECTION 0: Employee Details */}
        <div className="card-elevated p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm uppercase tracking-wide">
              Employee Details / <span className="font-normal text-muted-foreground">Maklumat Pekerja</span>
            </h2>
          </div>

          {activeFormType === "mixing" && processInfo.mixingTankBatchNo && (
            <div className="mb-3 pl-1">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider mr-2">Batch Number:</span>
              <span className="text-sm font-bold text-foreground tracking-widest">{processInfo.mixingTankBatchNo}</span>
            </div>
          )}

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

        {/* SECTION 1: Meta Information (Unified for both forms) */}
        <div className="card-elevated p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm uppercase tracking-wide">
              Record Details / <span className="font-normal text-muted-foreground">Butiran Rekod</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Record Date <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input type="date" value={metaInfo.date} onChange={e => setMetaInfo(p => ({ ...p, date: e.target.value }))} className="h-11 w-full dark:[color-scheme:dark]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Record Time <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input type="time" value={metaInfo.time} onChange={e => setMetaInfo(p => ({ ...p, time: e.target.value }))} className="h-11 w-full dark:[color-scheme:dark]" />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">You can backdate these fields if you are entering historical or missed records.</p>
        </div>

      {activeFormType === "mixing" && (
        <>
          {/* SECTION 2: Mixing & Treatment Stages */}
          <div className="card-elevated p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm uppercase tracking-wide">
              Mixing & Chemical Stages / <span className="font-normal text-muted-foreground">Tahap Campuran Kimia</span>
            </h2>
          </div>

          {/* Mixing Tank Unit */}
          <div className="mb-6 p-4 rounded-xl border border-border/60 bg-muted/5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Mixing Tank Details</div>
            <div className="max-w-sm space-y-1.5">
              <Label className="text-xs font-semibold">Volume (liter) <span className="text-destructive">*</span></Label>
              <Select value={processInfo.mixingTankVolume} onValueChange={(val) => setProcessInfo(p => ({ ...p, mixingTankVolume: val }))}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Select Volume" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1500">1500 liter</SelectItem>
                  <SelectItem value="2000">2000 liter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Caustic Soda Stage */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Neutralization (Caustic Soda)</div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Volume (liter)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={processInfo.causticSodaLitres}
                  onChange={e => setProcessInfo(p => ({ ...p, causticSodaLitres: e.target.value }))}
                  className="h-10 no-spinner"
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">pH Result</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="pH Level"
                  value={processInfo.causticSodaPH1}
                  onChange={e => setProcessInfo(p => ({ ...p, causticSodaPH1: e.target.value }))}
                  className="h-10 no-spinner"
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                />
              </div>
            </div>

            {/* Coagulation Stage */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Coagulation (Gullifloc)</div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Volume (liter)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={processInfo.coagulationLitres}
                  onChange={e => setProcessInfo(p => ({ ...p, coagulationLitres: e.target.value }))}
                  className="h-10 no-spinner"
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">pH Result</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="pH Level"
                  value={processInfo.coagulationPH2}
                  onChange={e => setProcessInfo(p => ({ ...p, coagulationPH2: e.target.value }))}
                  className="h-10 no-spinner"
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                />
              </div>
            </div>

            {/* Flocculation Stage */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Flocculation (Polymer)</div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Volume (liter)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={processInfo.flocculationLitres}
                  onChange={e => setProcessInfo(p => ({ ...p, flocculationLitres: e.target.value }))}
                  className="h-10 no-spinner"
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">pH Result</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="pH Level"
                  value={processInfo.flocculationPH3}
                  onChange={e => setProcessInfo(p => ({ ...p, flocculationPH3: e.target.value }))}
                  className="h-10 no-spinner"
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                />
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {activeFormType === "discharge" && (
        <>
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
              { id: "ph4", label: "pH Value", hint: "5.5 ~ 9.0", step: "0.01" },
              { id: "cod", label: "Chemical Oxygen Demand (COD)", hint: "<200" },
              { id: "bod", label: "Biochemical Oxygen Demand (BOD)", hint: "<50" },
              { id: "tss", label: "Total Suspended Solid (TSS)", hint: "<100" },
              { id: "og", label: "Oil & Grease (O&G)", hint: "<10" },
              { id: "flowrate", label: "Flowrate (ACF)", hint: "metercube", step: "0.001" },
              { id: "mg", label: "Magnesium (mg)", hint: "<1", step: "0.01" },
              { id: "nickel", label: "Nickel (Ni)", hint: "<1", step: "0.01" },
              { id: "zink", label: "Zinc (Zn)", hint: "<2.0", step: "0.01" },
              { id: "iron", label: "Iron (Fe)", hint: "<5.0", step: "0.01" },
              { id: "aluminum", label: "Aluminum (Al)", hint: "<15", step: "0.01" },
              { id: "fluoride", label: "Fluoride", hint: "<5.0", step: "0.01" },
              { id: "silver", label: "Silver (Ag)", hint: "<1.0", step: "0.01" },
              { id: "sulphide", label: "Sulphide (S²⁻)", hint: "<0.50", step: "0.01" },
              { id: "rawEq", label: "Raw EQ", hint: "<2000", step: "0.01" },
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
                    className="h-10 text-center font-medium shadow-sm no-spinner"
                    onWheel={(e) => (e.target as HTMLElement).blur()}
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
        </>
      )}

        {/* SECTION: Optional Remarks */}
        <div className="card-elevated p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm uppercase tracking-wide">
              Remarks / <span className="font-normal text-muted-foreground">Ulasan</span>
            </h2>
          </div>
          <Input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Please enter remarks if any / Sila masukkan ulasan jika ada..."
            className="h-11 bg-muted/20 hover:bg-muted/50 focus:bg-background transition-colors"
          />
        </div>

        {/* Submit Section */}
        <div className="flex justify-center pt-4 pb-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
          >
            <Send className="h-4 w-4" />
          {isSubmitting ? "Submitting Records..." : activeFormType === "mixing" ? "Submit Mixing Log" : "Submit Discharge Log"}
          </button>
        </div>
      </form>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-card max-w-2xl w-full rounded-lg p-4 sm:p-6 shadow-lg max-h-[80vh] overflow-auto text-sm">
            <h3 className="text-base font-semibold">Confirm Submission</h3>
            <p className="mt-2 text-sm text-muted-foreground">Please review the summary below, then confirm to submit.</p>

            <div className="mt-4 grid grid-cols-1 gap-3">
              {activeFormType === "mixing" ? (
                <div className="p-3 rounded-md border bg-muted/5">
                  <div className="text-sm font-semibold mb-2">Mixing & Chemical Stages — Summary</div>
                  <div className="text-sm text-foreground">
                    <div>Mixing Tank Volume: <span className="font-medium">{processInfo.mixingTankVolume || '—'}</span></div>
                    <div>Shift: <span className="font-medium">{metaInfo.shift || '—'}</span></div>
                    <div className="mt-2 text-sm text-muted-foreground">Stages (values shown when present):</div>
                    <div className="text-sm divide-y divide-border/30">
                      <div className="py-2">Caustic Soda: {processInfo.causticSodaLitres || '—'} L (pH: {processInfo.causticSodaPH1 || '—'})</div>
                      <div className="py-2">Coagulation: {processInfo.coagulationLitres || '—'} L (pH: {processInfo.coagulationPH2 || '—'})</div>
                      <div className="py-2">Flocculation: {processInfo.flocculationLitres || '—'} L (pH: {processInfo.flocculationPH3 || '—'})</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-md border bg-muted/5">
                  <div className="text-sm font-semibold mb-2">Final Discharge — Summary</div>
                  <div className="text-sm text-foreground">
                    <div>Shift: <span className="font-medium">{metaInfo.shift || '—'}</span></div>
                    <div className="mt-2 text-sm text-muted-foreground">Parameters submitted:</div>
                    <div className="text-sm divide-y divide-border/30">
                      {dischargeParams.map(p => (
                        <div key={p.id} className="grid items-center py-2" style={{ gridTemplateColumns: '220px 1fr' }}>
                          <div className="text-muted-foreground pr-2">{p.label}:</div>
                          <div className="font-medium">{(finalDischarge as any)[p.id] || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg bg-muted/20 font-semibold">Cancel</button>
              <button onClick={confirmSubmit} disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-primary text-white font-semibold">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyOperationMonitoringForm;