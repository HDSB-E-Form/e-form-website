import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2, PlusCircle, Scale, FileText, Send, FileDown, RotateCcw, Calendar, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import logo from "@/assets/logo.png";

// Define your two categories of waste types here!
export const DEFAULT_SELL_WASTE_TYPES = [
  "SW104 ALUMINIUM DROSS",
  "SW104 ALUMINIUM SLUDGE",
  "SW422 OILY SCRAP",
  "SW422 ALUMINIUM CHIP COOLANT",
  "SW409 DISPOSAL CHEMICAL CONTAINER",
  "SW305 SPENT LUBRICANTING OIL",
  "SW306 SPENT HYDRAULIC OIL"
];

export const DEFAULT_PAY_WASTE_TYPES = [
  "SW410 CONTAMINATED COTTON RAG/GLOVE",
  "SW204 SLUDGE CAKE",
  "SW307 SPENT MINERAL OIL WITH WATER EMULSION",
  "SW327 WASTE OF WATER GLYCOL"
];

const WasteInventoryForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [plant, setPlant] = useState<"Plant 1" | "Plant 2">("Plant 1");
  const [category, setCategory] = useState<"sell" | "pay">("sell");
  
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split("T")[0]);
  const [recordTime, setRecordTime] = useState(new Date().toTimeString().slice(0, 5));
  
  const [sellWasteTypes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("hdsb_waste_types_sell") || "null") || DEFAULT_SELL_WASTE_TYPES; } 
    catch { return DEFAULT_SELL_WASTE_TYPES; }
  });
  const [payWasteTypes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("hdsb_waste_types_pay") || "null") || DEFAULT_PAY_WASTE_TYPES; } 
    catch { return DEFAULT_PAY_WASTE_TYPES; }
  });

  const [wasteType, setWasteType] = useState(sellWasteTypes[0]);
  const [rows, setRows] = useState<{
    id: number;
    gross: string;
    container: string;
    imageUrl?: string;
    imageName?: string;
  }[]>([
    { id: 1, gross: "", container: "" },
    { id: 2, gross: "", container: "" },
    { id: 3, gross: "", container: "" },
  ]);
  const [uploadingRows, setUploadingRows] = useState<Record<number, boolean>>({});

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatically update the waste type list when switching categories
  const handleCategoryChange = (newCategory: "sell" | "pay") => {
    setCategory(newCategory);
    setWasteType(newCategory === "sell" ? sellWasteTypes[0] : payWasteTypes[0]);
  };

  // Handle Input Changes
  const handleInputChange = (id: number, field: string, value: string) => {
    setRows(prev => prev.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    const newId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;
    setRows([...rows, { id: newId, gross: "", container: "" }]);
  };

  const deleteRow = (id: number) => {
    if (rows.length === 1) return toast.error("At least one row is required.");
    setRows(rows.filter(row => row.id !== id));
  };

  const handleRowImageUpload = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRows(prev => ({ ...prev, [id]: true }));

    const safeFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filePath = `waste-inventory/${user?.id || "unknown"}/${id}/${Date.now()}_${safeFileName}`;

    const { data, error } = await supabase.storage.from("form-attachments").upload(filePath, file);
    if (error || !data) {
      toast.error(`Upload failed: ${error?.message || "Unknown error"}`);
      setUploadingRows(prev => ({ ...prev, [id]: false }));
      return;
    }

    const { data: urlData, error: urlError } = supabase.storage.from("form-attachments").getPublicUrl(data.path);
    if (urlError || !urlData) {
      toast.error(`Failed to get uploaded image URL: ${urlError?.message || "Unknown error"}`);
      setUploadingRows(prev => ({ ...prev, [id]: false }));
      return;
    }

    setRows(prev => prev.map(row => row.id === id ? { ...row, imageUrl: urlData.publicUrl, imageName: file.name } : row));
    setUploadingRows(prev => ({ ...prev, [id]: false }));
    toast.success("Scale image uploaded successfully.");
  };

  const resetForm = () => {
    setRows([{ id: 1, gross: "", container: "" }]);
    setUploadingRows({});
    toast.info("Form data reset");
  };

  // Logic Calculations
  const calculateNet = (gross: string, container: string) => {
    const val = parseFloat(gross || "0") - parseFloat(container || "0");
    return val > 0 ? val.toFixed(2) : "0.00";
  };

  const totals = rows.reduce(
    (acc, row) => {
      acc.gross += parseFloat(row.gross || "0");
      acc.container += parseFloat(row.container || "0");
      acc.net += parseFloat(calculateNet(row.gross, row.container));
      return acc;
    },
    { gross: 0, container: 0, net: 0 }
  );

  const handleOpenConfirm = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    if (isSubmitting) return;
    setShowConfirm(false);
    setIsSubmitting(true);

    const submissionData = {
      plant,
      category,
      wasteType,
      rows,
      totals,
      recordDate,
      recordTime,
    };

    const success = await addSubmission({
      formType: "waste_inventory",
      status: "approved",
      submittedBy: user?.id || "",
      employeeName: user?.name || "Unknown User",
      department: user?.department || "Unknown Dept",
      data: submissionData,
    });

    if (success) {
      toast.success("Waste inventory record submitted successfully!");
      navigate("/safety");
    } else {
      toast.error("Failed to submit record.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto waste-inventory-print print:absolute print:inset-0 print:max-w-none print:w-full print:bg-white print:text-black print:z-50 print:p-8 print:m-0">
      {/* Navigation Header */}
      <button onClick={() => navigate("/safety")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group print:hidden">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Safety Forms
      </button>

      {/* Print Header */}
      <div className="hidden print:flex items-center mb-8 border-b-2 border-black pb-6">
        <img src={logo} alt="HICOM Diecasting" className="h-14 w-auto object-contain mr-6" />
        <div className="text-left">
          <h1 className="text-2xl font-bold uppercase tracking-widest text-black">HICOM Diecastings Sdn Bhd</h1>
          <p className="text-sm text-gray-600 mt-1 uppercase tracking-wide">Waste Inventory Record</p>
        </div>
      </div>

      <div className="mb-8 print:hidden">
        <h1 className="text-2xl lg:text-2xl font-bold text-foreground uppercase tracking-wide">
          Waste Inventory Smart Calculator / <span className="font-normal text-muted-foreground">Kira Inventori Sisa</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1 uppercase tracking-wide">HICOM Diecastings Sdn Bhd</p>
      </div>

      <div className="space-y-6">
        {/* Print Reference Date */}
        <div className="hidden print:block text-sm font-bold text-black mb-4">Date & Time Printed: {currentTime.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>

        {/* Section 1: Waste Configuration */}
        <div className="card-elevated p-6 print:border-none print:shadow-none print:p-0">
          <div className="flex items-center gap-2 mb-5">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm uppercase">
              Configuration / <span className="font-normal">Konfigurasi</span>
            </h2>
          </div>

          <div className="max-w-md space-y-6">
            {/* Plant Toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Plant / Kilang <span className="text-destructive">*</span></Label>
              <div className="flex gap-3 sm:gap-4 mt-1.5 print:hidden">
                <div
                  className={`flex-1 rounded-xl border-2 p-3 transition-all cursor-pointer flex items-center gap-2 ${
                    plant === "Plant 1"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                  }`}
                  onClick={() => setPlant("Plant 1")}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${plant === "Plant 1" ? "border-primary" : "border-muted-foreground"}`}>
                    {plant === "Plant 1" && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-bold text-sm uppercase tracking-wider">Plant 1</span>
                </div>
                <div
                  className={`flex-1 rounded-xl border-2 p-3 transition-all cursor-pointer flex items-center gap-2 ${
                    plant === "Plant 2"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                  }`}
                  onClick={() => setPlant("Plant 2")}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${plant === "Plant 2" ? "border-primary" : "border-muted-foreground"}`}>
                    {plant === "Plant 2" && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-bold text-sm uppercase tracking-wider">Plant 2</span>
                </div>
              </div>
              <div className="hidden print:block font-bold text-xl text-black border-b border-gray-300 pb-2 uppercase tracking-widest">
                Plant: {plant}
              </div>
            </div>

            {/* Category Toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Inventory Category / Kategori Inventori <span className="text-destructive">*</span></Label>
              <div className="flex gap-3 sm:gap-4 mt-1.5 print:hidden">
                <div
                  className={`flex-1 rounded-xl border-2 p-3 transition-all cursor-pointer flex items-center gap-2 ${
                    category === "sell"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                  }`}
                  onClick={() => handleCategoryChange("sell")}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${category === "sell" ? "border-primary" : "border-muted-foreground"}`}>
                    {category === "sell" && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-bold text-sm uppercase tracking-wider">Recycle (Sell)</span>
                </div>
                <div
                  className={`flex-1 rounded-xl border-2 p-3 transition-all cursor-pointer flex items-center gap-2 ${
                    category === "pay"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                  }`}
                  onClick={() => handleCategoryChange("pay")}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${category === "pay" ? "border-primary" : "border-muted-foreground"}`}>
                    {category === "pay" && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-bold text-sm uppercase tracking-wider">Dispose (Pay)</span>
                </div>
              </div>
              <div className="hidden print:block font-bold text-xl text-black border-b border-gray-300 pb-2 uppercase tracking-widest">
                Category: {category === "sell" ? "Recycle (Sell)" : "Dispose (Pay)"}
              </div>
            </div>
            
            {/* Record Date & Time (Backdating support) */}
            <div className="grid grid-cols-2 gap-4 print:hidden">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">Record Date</Label>
                <Input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)} className="h-11 dark:[color-scheme:dark]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">Record Time</Label>
                <Input type="time" value={recordTime} onChange={e => setRecordTime(e.target.value)} className="h-11 dark:[color-scheme:dark]" />
              </div>
            </div>

            {/* Waste Type Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Waste Type / Jenis Sisa <span className="text-destructive">*</span></Label>
              <div className="print:hidden">
                <Select value={wasteType} onValueChange={setWasteType}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Waste Type" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" avoidCollisions={false} className="max-h-[200px] overflow-y-auto">
                    {(category === "sell" ? sellWasteTypes : payWasteTypes).map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden print:block font-bold text-xl text-black border-b border-gray-300 pb-2">
                {wasteType}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Weight Entry Table */}
        <div className="card-elevated p-6 print:border-none print:shadow-none print:p-0">
          <div className="flex items-center justify-between mb-5 print:hidden">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-foreground text-sm uppercase">
                Weight Entry / <span className="font-normal">Kemasukan Berat</span>
              </h2>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-x-auto print:border-gray-400 print:overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border print:bg-gray-100 print:border-gray-400">
                  <th className="text-[10px] uppercase font-bold text-muted-foreground print:text-black px-4 py-3 text-left w-12 whitespace-nowrap">#</th>
                  <th className="text-[10px] uppercase font-bold text-muted-foreground print:text-black px-4 py-3 text-left whitespace-nowrap">Gross Weight (kg)</th>
                  <th className="text-[10px] uppercase font-bold text-muted-foreground print:text-black px-4 py-3 text-left whitespace-nowrap">Container (kg)</th>
                  <th className="text-[10px] uppercase font-bold text-muted-foreground print:text-black px-4 py-3 text-left whitespace-nowrap">Net (kg)</th>
                  <th className="text-[10px] uppercase font-bold text-muted-foreground print:text-black px-4 py-3 text-center w-28 print:hidden whitespace-nowrap">Upload Image</th>
                  <th className="text-[10px] uppercase font-bold text-muted-foreground print:text-black px-4 py-3 text-center w-16 print:hidden whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, i) => (
                  <tr key={row.id} className="hover:bg-muted/5 transition-colors print:border-b print:border-gray-300">
                    <td className="px-4 py-2 text-sm font-bold text-muted-foreground print:text-black">{i + 1}</td>
                    <td className="px-2 py-2">
                      <Input 
                        type="number" 
                        value={row.gross} 
                        onChange={(e) => handleInputChange(row.id, "gross", e.target.value)}
                        placeholder="0.00"
                        className="h-10 min-w-[100px] border-0 bg-muted/20 focus:bg-background print:bg-transparent print:p-0 print:text-black print:h-auto no-spinner"
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input 
                        type="number" 
                        value={row.container} 
                        onChange={(e) => handleInputChange(row.id, "container", e.target.value)}
                        placeholder="0.00"
                        className="h-10 min-w-[100px] border-0 bg-muted/20 focus:bg-background print:bg-transparent print:p-0 print:text-black print:h-auto no-spinner"
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                      />
                    </td>
                    <td className="px-4 py-2 text-sm font-bold text-foreground print:text-black whitespace-nowrap">
                      {calculateNet(row.gross, row.container)}
                    </td>
                    <td className="px-2 py-2 text-center print:hidden">
                      <label htmlFor={`upload-${row.id}`} className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-border bg-muted/10 text-muted-foreground hover:bg-muted/20 transition-colors cursor-pointer">
                        <Upload className="h-4 w-4" />
                        {uploadingRows[row.id] ? "Uploading..." : row.imageName ? "Change" : "Upload"}
                      </label>
                      <input
                        id={`upload-${row.id}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleRowImageUpload(row.id, e)}
                        disabled={uploadingRows[row.id]}
                      />
                      {row.imageName && (
                        <div className="text-[10px] text-muted-foreground mt-1 truncate">{row.imageName}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center print:hidden">
                      <button onClick={() => deleteRow(row.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-3 mt-5 print:hidden">
            <button onClick={addRow} className="flex items-center gap-2 px-4 py-2 text-primary font-bold text-xs bg-primary/10 rounded-lg hover:bg-primary/20 transition-all uppercase tracking-wider">
              <PlusCircle className="h-4 w-4" /> Add Row
            </button>
            <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 text-muted-foreground font-bold text-xs bg-muted/50 rounded-lg hover:bg-muted transition-all uppercase tracking-wider">
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>

        {/* Section 3: Summary & Total */}
        <div className="card-elevated p-6 bg-primary/5 border-primary/20 print:border-gray-400 print:bg-transparent print:border-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-primary font-bold print:text-gray-600">Total Gross Weight</Label>
              <div className="text-2xl font-bold text-foreground print:text-black">{totals.gross.toFixed(2)} <span className="text-sm font-medium text-muted-foreground print:text-gray-600">kg</span></div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-primary font-bold print:text-gray-600">Total Container Weight</Label>
              <div className="text-2xl font-bold text-foreground print:text-black">{totals.container.toFixed(2)} <span className="text-sm font-medium text-muted-foreground print:text-gray-600">kg</span></div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-primary font-bold print:text-gray-600">Total Net Weight</Label>
              <div className="text-2xl font-bold text-primary print:text-black">{totals.net.toFixed(2)} <span className="text-sm font-medium text-muted-foreground print:text-gray-600">kg</span></div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 pb-8 print:hidden">
          <button 
            onClick={(e) => {
              e.preventDefault();
              const originalTitle = document.title;
              document.title = `Waste_Inventory_Record_${new Date().toISOString().split('T')[0]}`;
              
              const isDark = document.documentElement.classList.contains('dark');
              if (isDark) document.documentElement.classList.remove('dark');
              
              setTimeout(() => {
                window.onafterprint = () => {
                  document.title = originalTitle;
                  if (isDark) document.documentElement.classList.add('dark');
                  window.onafterprint = null;
                };
                window.print();
                setTimeout(() => { document.title = originalTitle; }, 2000);
              }, 50);
            }}
          className="btn-gold w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-3 rounded-full text-sm sm:text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
          >
            <FileDown className="h-4 w-4" /> Export as PDF
          </button>
          <button
            onClick={handleOpenConfirm}
            disabled={isSubmitting}
          className="btn-gold w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-3 rounded-full text-sm sm:text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
          >
            <Send className="h-4 w-4" /> Submit Records
          </button>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-card max-w-md w-full rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-bold">Confirm Submission</h3>
              <p className="mt-2 text-sm text-muted-foreground">Please review the record summary below, then confirm to submit.</p>

              <div className="mt-4 p-3 rounded-md border bg-muted/5">
                <div className="text-sm font-semibold mb-2">Waste Inventory — Summary</div>
                <div className="text-sm">
                  <div>Plant: <span className="font-medium">{plant}</span></div>
                  <div>Category: <span className="font-medium">{category === 'sell' ? 'Recycle (Sell)' : 'Dispose (Pay)'}</span></div>
                  <div>Waste Type: <span className="font-medium">{wasteType}</span></div>
                  <div className="mt-2">Rows: <span className="font-medium">{rows.length}</span></div>
                  <div>Total Gross: <span className="font-medium">{totals.gross.toFixed(2)} kg</span></div>
                  <div>Total Container: <span className="font-medium">{totals.container.toFixed(2)} kg</span></div>
                  <div>Total Net: <span className="font-medium">{totals.net.toFixed(2)} kg</span></div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg bg-muted/20 font-semibold">Cancel</button>
                <button onClick={confirmSubmit} disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-primary text-white font-semibold">Confirm</button>
              </div>
            </div>
          </div>
        )}

        <p className="hidden print:block text-center text-xs text-muted-foreground pb-4 print:text-gray-400 print:mt-12">
          This is computer generated and no signature is required.
        </p>
      </div>
    </div>
  );
};

export default WasteInventoryForm;