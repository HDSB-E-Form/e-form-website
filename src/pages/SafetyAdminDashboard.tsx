import { useState, useEffect, useMemo } from "react";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplet, BarChart3, PieChart as PieChartIcon, CalendarDays, MessageSquare, Settings, Trash2, Pencil, Plus, Download, Image as ImageIcon, Upload, Recycle, Layers, Save } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { DEFAULT_SELL_WASTE_TYPES, DEFAULT_PAY_WASTE_TYPES } from "@/pages/WasteInventoryForm";
import { supabase } from "@/supabase";
import { Badge } from "@/components/ui/badge";

const parameterOptions = [
    { id: "ph4", label: "pH Value", unit: "" },
    { id: "cod", label: "Chemical Oxygen Demand (COD)", unit: "mg/L" },
    { id: "flowrate", label: "Flowrate (ACF)", unit: "m³" },
];

const SafetyAdminDashboard = () => {
    const { submissions, addSubmission } = useSubmissions();
    const [selectedParameter, setSelectedParameter] = useState("ph4");
    const [dischargeStartDate, setDischargeStartDate] = useState("");
    const [dischargeEndDate, setDischargeEndDate] = useState("");
    const [mixingStartDate, setMixingStartDate] = useState("");
    const [mixingEndDate, setMixingEndDate] = useState("");
    const [wasteStartDate, setWasteStartDate] = useState("");
    const [wasteEndDate, setWasteEndDate] = useState("");
    const [exportStartDate, setExportStartDate] = useState("");
    const [exportEndDate, setExportEndDate] = useState("");
    const [isRemarksOpen, setIsRemarksOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);
    const [remarkType, setRemarkType] = useState<"discharge" | "mixing">("discharge");
    const [newRemark, setNewRemark] = useState("");
    const [isSavingRemark, setIsSavingRemark] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [wastePlantFilter, setWastePlantFilter] = useState<"All" | "Plant 1" | "Plant 2">("All");
    const [wasteSwFilter, setWasteSwFilter] = useState<string>("All");
    const [dashboardView, setDashboardView] = useState<"discharge" | "mixing" | "waste">("discharge");
    
    // Mixing Parameter State
    const mixingParameterOptions = [
        { id: "causticSodaLitres", label: "Neutralization (Caustic Soda) (ltr)", unit: "" },
        { id: "coagulationLitres", label: "Coagulation (Gullifloc) (ltr)", unit: "" },
        { id: "flocculationLitres", label: "Flocculation (Polymer) (ltr)", unit: "" },
    ];
    const [selectedMixingParameter, setSelectedMixingParameter] = useState("causticSodaLitres");
    const selectedMixingParamInfo = mixingParameterOptions.find(p => p.id === selectedMixingParameter);

    // Poster Management State
    const [isPosterSettingsOpen, setIsPosterSettingsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [posterConfig, setPosterConfig] = useState(() => {
        try { return JSON.parse(localStorage.getItem("hdsb_safety_poster_config") || "null") || { enabled: true, url: null }; } 
        catch { return { enabled: true, url: null }; }
    });
    
    // Waste Types Management State
    const [isWasteTypesOpen, setIsWasteTypesOpen] = useState(false);
    const [sellTypes, setSellTypes] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem("hdsb_waste_types_sell") || "null") || DEFAULT_SELL_WASTE_TYPES; } catch { return DEFAULT_SELL_WASTE_TYPES; }
    });
    const [payTypes, setPayTypes] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem("hdsb_waste_types_pay") || "null") || DEFAULT_PAY_WASTE_TYPES; } catch { return DEFAULT_PAY_WASTE_TYPES; }
    });
    const [newTypeCategory, setNewTypeCategory] = useState<"sell" | "pay">("sell");
    const [newTypeName, setNewTypeName] = useState("");

    useEffect(() => { localStorage.setItem("hdsb_waste_types_sell", JSON.stringify(sellTypes)); }, [sellTypes]);
    useEffect(() => { localStorage.setItem("hdsb_waste_types_pay", JSON.stringify(payTypes)); }, [payTypes]);
    useEffect(() => { localStorage.setItem("hdsb_safety_poster_config", JSON.stringify(posterConfig)); }, [posterConfig]);

    const safetyRefNoMap = useMemo(() => {
        const map = new Map<string, string>();
        const safetyForms = submissions
            .filter(s => ["waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"].includes(s.formType))
            .sort((a, b) => {
                const timeDiff = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
                return timeDiff !== 0 ? timeDiff : a.id.localeCompare(b.id);
            });
            
        safetyForms.forEach((s, idx) => {
            map.set(s.id, `SFTY-${String(idx + 1).padStart(4, "0")}`);
        });
        return map;
    }, [submissions]);

    const generateRefNo = (subId: string) => {
        return safetyRefNoMap.get(subId) || `SFTY-${subId.replace(/\D/g, "").slice(0, 4).padStart(4, "0")}`;
    };

    const monitoringSubmissions = useMemo(() => 
        submissions.filter(s => ["final_discharge", "mixing_chemical_stages", "daily_operation_monitoring"].includes(s.formType)), 
    [submissions]);

    const wasteSubmissions = useMemo(() => 
        submissions.filter(s => s.formType === "waste_inventory"), 
    [submissions]);

    const availableSwCodes = useMemo(() => {
        const codes = new Set<string>();
        [...sellTypes, ...payTypes].forEach(t => {
            const code = t.split(' ')[0];
            if (code.startsWith('SW')) codes.add(code);
        });
        wasteSubmissions.forEach(s => {
            if (s.data.wasteType) {
                const code = s.data.wasteType.split(' ')[0];
                if (code.startsWith('SW')) codes.add(code);
            }
        });
        return Array.from(codes).sort();
    }, [sellTypes, payTypes, wasteSubmissions]);

    const remarksList = useMemo(() => {
        return submissions
            .filter(s => s.formType === "final_discharge" || s.formType === "mixing_chemical_stages")
            .filter(s => s.data.remarks && s.data.remarks.trim() !== "")
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }, [submissions]);

    const chartData = useMemo(() => {
        const start = dischargeStartDate || "0000-00-00";
        const end = dischargeEndDate || "9999-12-31";

        const data = monitoringSubmissions
            .filter(s => s.formType === "final_discharge" && s.data.metaInfo && s.data.metaInfo.date >= start && s.data.metaInfo.date <= end)
            .map(s => ({
                date: s.data.metaInfo.date,
                value: parseFloat(s.data.finalDischarge?.[selectedParameter]) || 0,
            }))
            .filter(d => d.value > 0)
            .sort((a, b) => a.date.localeCompare(b.date));

        const groupedData = data.reduce((acc, curr) => {
            if (!acc[curr.date]) {
                acc[curr.date] = { date: curr.date, totalValue: 0, count: 0 };
            }
            acc[curr.date].totalValue += curr.value;
            acc[curr.date].count++;
            return acc;
        }, {} as Record<string, { date: string, totalValue: number, count: number }>);

        return Object.values(groupedData).map(d => ({
            date: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            value: parseFloat((d.totalValue / d.count).toFixed(2)),
        }));
    }, [monitoringSubmissions, selectedParameter, dischargeStartDate, dischargeEndDate]);

    const mixingChartData = useMemo(() => {
        const start = mixingStartDate || "0000-00-00";
        const end = mixingEndDate || "9999-12-31";

        const data = monitoringSubmissions
            .filter(s => (s.formType === "mixing_chemical_stages" || s.formType === "daily_operation_monitoring") && s.data.metaInfo && s.data.metaInfo.date >= start && s.data.metaInfo.date <= end)
            .map(s => ({
                date: s.data.metaInfo.date,
                value: parseFloat(s.data.processInfo?.[selectedMixingParameter]) || 0,
            }))
            .filter(d => d.value > 0)
            .sort((a, b) => a.date.localeCompare(b.date));

        const groupedData = data.reduce((acc, curr) => {
            if (!acc[curr.date]) {
                acc[curr.date] = { date: curr.date, totalValue: 0, count: 0 };
            }
            acc[curr.date].totalValue += curr.value;
            acc[curr.date].count++;
            return acc;
        }, {} as Record<string, { date: string, totalValue: number, count: number }>);

        return Object.values(groupedData).map(d => ({
            date: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            value: parseFloat((d.totalValue / d.count).toFixed(2)),
        }));
    }, [monitoringSubmissions, selectedMixingParameter, mixingStartDate, mixingEndDate]);

    const selectedParamInfo = parameterOptions.find(p => p.id === selectedParameter);

    const dischargeStats = useMemo(() => {
        const start = dischargeStartDate || "0000-00-00";
        const end = dischargeEndDate || "9999-12-31";

        const filteredSubmissions = monitoringSubmissions.filter(s => {
            return s.formType === "final_discharge" && s.data.metaInfo && s.data.metaInfo.date >= start && s.data.metaInfo.date <= end;
        });
        
        let phTotal = 0, phCount = 0;
        let codTotal = 0, codCount = 0;
        let flowTotal = 0, flowCount = 0;

        filteredSubmissions.forEach(s => {
            const ph = parseFloat(s.data.finalDischarge?.ph4);
            const cod = parseFloat(s.data.finalDischarge?.cod);
            const flow = parseFloat(s.data.finalDischarge?.flowrate);

            if (!isNaN(ph) && ph > 0) { phTotal += ph; phCount++; }
            if (!isNaN(cod) && cod >= 0) { codTotal += cod; codCount++; }
            if (!isNaN(flow) && flow > 0) { flowTotal += flow; flowCount++; }
        });

        return {
            totalReports: filteredSubmissions.length,
            avgPh: phCount > 0 ? (phTotal / phCount).toFixed(2) : "0.00",
            avgCod: codCount > 0 ? (codTotal / codCount).toFixed(2) : "0.00",
            avgFlow: flowCount > 0 ? (flowTotal / flowCount).toFixed(2) : "0.00",
        };
    }, [monitoringSubmissions, dischargeStartDate, dischargeEndDate]);

    const mixingStats = useMemo(() => {
        const start = mixingStartDate || "0000-00-00";
        const end = mixingEndDate || "9999-12-31";

        const filteredSubmissions = monitoringSubmissions.filter(s => {
            return (s.formType === "mixing_chemical_stages" || s.formType === "daily_operation_monitoring") && s.data.metaInfo && s.data.metaInfo.date >= start && s.data.metaInfo.date <= end;
        });

        let totalCaustic = 0;
        let totalCoagulation = 0;
        let totalFlocculation = 0;

        filteredSubmissions.forEach(s => {
            const caustic = parseFloat(s.data.processInfo?.causticSodaLitres);
            const coag = parseFloat(s.data.processInfo?.coagulationLitres);
            const floc = parseFloat(s.data.processInfo?.flocculationLitres);

            if (!isNaN(caustic) && caustic > 0) totalCaustic += caustic;
            if (!isNaN(coag) && coag > 0) totalCoagulation += coag;
            if (!isNaN(floc) && floc > 0) totalFlocculation += floc;
        });

        return {
            totalReports: filteredSubmissions.length,
            totalCaustic: totalCaustic.toFixed(2),
            totalCoagulation: totalCoagulation.toFixed(2),
            totalFlocculation: totalFlocculation.toFixed(2),
        };
    }, [monitoringSubmissions, mixingStartDate, mixingEndDate]);

    const wasteChartData = useMemo(() => {
        const start = wasteStartDate || "0000-00-00";
        const end = wasteEndDate || "9999-12-31";

        const filtered = wasteSubmissions.filter(s => {
            const subDate = s.data.recordDate || new Date(s.submittedAt).toISOString().split('T')[0];
            const dateMatch = subDate >= start && subDate <= end;
            const plantMatch = wastePlantFilter === "All" || s.data.plant === wastePlantFilter;
            const swCodeMatch = wasteSwFilter === "All" || (s.data.wasteType || "").startsWith(wasteSwFilter);
            return dateMatch && plantMatch && swCodeMatch;
        });

        let totalSell = 0, totalPay = 0;
        const sellStats: Record<string, any> = {};
        const payStats: Record<string, any> = {};

        filtered.forEach(s => {
            const cat = s.data.category;
            const net = parseFloat(s.data.totals?.net) || 0;
            const wasteType = s.data.wasteType || "Unknown";
            const code = wasteType.split(' ')[0].substring(0, 7);

            if (cat === "sell") {
                totalSell += net;
                if (!sellStats[code]) sellStats[code] = { code, value: 0, fullName: wasteType, color: "#10b981" };
                sellStats[code].value += net;
            } else if (cat === "pay") {
                totalPay += net;
                if (!payStats[code]) payStats[code] = { code, value: 0, fullName: wasteType, color: "#3b82f6" };
                payStats[code].value += net;
            }
        });

        const sellData = Object.values(sellStats).sort((a,b) => b.value - a.value).map(d => ({ ...d, value: parseFloat(d.value.toFixed(2)) }));
        const payData = Object.values(payStats).sort((a,b) => b.value - a.value).map(d => ({ ...d, value: parseFloat(d.value.toFixed(2)) }));

        const pieData = [
            { name: "Recycle (Sell)", value: parseFloat(totalSell.toFixed(2)), color: "#10b981" }, 
            { name: "Dispose (Pay)", value: parseFloat(totalPay.toFixed(2)), color: "#3b82f6" } 
        ].filter(d => d.value > 0);

        return { 
            pieData, sellData, payData,
            stats: { sell: totalSell, pay: totalPay, total: totalSell + totalPay }
        };
    }, [wasteSubmissions, wasteStartDate, wasteEndDate, wastePlantFilter, wasteSwFilter]);

    const handleAddWasteType = () => {
        if (!newTypeName.trim()) return toast.error("Waste type name cannot be empty");
        if (newTypeCategory === "sell") {
            if (sellTypes.includes(newTypeName.trim())) return toast.error("This waste type already exists in Recycle (Sell).");
            setSellTypes([...sellTypes, newTypeName.trim()]);
        } else {
            if (payTypes.includes(newTypeName.trim())) return toast.error("This waste type already exists in Dispose (Pay).");
            setPayTypes([...payTypes, newTypeName.trim()]);
        }
        setNewTypeName("");
        toast.success("Waste type added successfully!");
    };

    const handleDeleteWasteType = (cat: "sell" | "pay", name: string) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
        if (cat === "sell") setSellTypes(sellTypes.filter(t => t !== name));
        else setPayTypes(payTypes.filter(t => t !== name));
        toast.success("Waste type deleted successfully!");
    };

    const handleRenameWasteType = (cat: "sell" | "pay", oldName: string) => {
        const newName = window.prompt("Enter new name for this waste type:", oldName);
        if (!newName || !newName.trim() || newName.trim() === oldName) return;
        
        if (cat === "sell") {
            if (sellTypes.includes(newName.trim())) return toast.error("Name already exists!");
            setSellTypes(sellTypes.map(t => t === oldName ? newName.trim() : t));
        } else {
            if (payTypes.includes(newName.trim())) return toast.error("Name already exists!");
            setPayTypes(payTypes.map(t => t === oldName ? newName.trim() : t));
        }
        toast.success("Waste type renamed successfully!");
    };

    const handleAddRemark = async () => {
        if (!newRemark.trim()) {
            toast.error("Remark cannot be empty.");
            return;
        }
        const formTypeForRemark = remarkType === "mixing" ? "mixing_chemical_stages" : "final_discharge";
        setIsSavingRemark(true);
        const success = await addSubmission({
            formType: formTypeForRemark,
            status: "approved",
            data: {
                remarks: newRemark,
                // Add minimal meta info to make it a valid-looking submission
                metaInfo: { date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5), shift: "N/A" }
            }
        });
        if (success) {
            toast.success("Remark added successfully.");
            setIsAddRemarkOpen(false);
            setNewRemark("");
        }
        setIsSavingRemark(false);
    };

    const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 12 * 1024 * 1024) {
                toast.error("File size must be less than 12MB.");
                return;
            }
            setIsUploading(true);
            try {
                // Using the existing form-attachments bucket
                const filePath = `public/poster_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                const { data, error } = await supabase.storage.from('form-attachments').upload(filePath, file);
                if (error) throw error;
                
                if (data) {
                    const { data: urlData } = supabase.storage.from('form-attachments').getPublicUrl(data.path);
                    setPosterConfig(prev => ({ ...prev, url: urlData.publicUrl }));
                    toast.success("New poster uploaded successfully!");
                }
            } catch (error: any) {
                toast.error(`Failed to upload poster: ${error.message}`);
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleExportCSV = (targetForm: "mixing" | "discharge") => {
        const formTypeFilter = targetForm === "mixing" ? "mixing_chemical_stages" : "final_discharge";
        
        // Fallback for older submissions that might be saved under "daily_operation_monitoring"
        let dataToExport = submissions.filter(s => s.formType === formTypeFilter || (targetForm === "mixing" && s.formType === "daily_operation_monitoring"));

        const start = exportStartDate || "0000-00-00";
        const end = exportEndDate || "9999-12-31";
        dataToExport = dataToExport.filter(s => {
            const subDate = s.data.metaInfo?.date || new Date(s.submittedAt).toISOString().split('T')[0];
            return subDate >= start && subDate <= end;
        });

        if (dataToExport.length === 0) {
            toast.error(`No records found for ${targetForm === "mixing" ? "Mixing" : "Final Discharge"} in the selected date range.`);
            return;
        }

        // Sort records by Date & Time (earliest first)
        dataToExport.sort((a, b) => {
            const dateA = a.data.metaInfo?.date || new Date(a.submittedAt).toISOString().split('T')[0];
            const timeA = a.data.metaInfo?.time || "00:00";
            const dateB = b.data.metaInfo?.date || new Date(b.submittedAt).toISOString().split('T')[0];
            const timeB = b.data.metaInfo?.time || "00:00";
            
            return `${dateA}T${timeA}`.localeCompare(`${dateB}T${timeB}`);
        });

        // Format date to DD/MM/YYYY
        // Added a space prefix to force Excel to read it as text and prevent #####
        const formatDate = (d: string) => {
            const parts = d.split('-');
            return parts.length === 3 ? ` ${parts[2]}/${parts[1]}/${parts[0]}` : ` ${d}`;
        };

        let rows: string[][] = [];

        if (targetForm === "mixing") {
            rows.push(["Ref No", "Batch Number", "Date", "Time", "Employee", "Shift", "Tank Volume", "Neutralization (Caustic Soda) (L)", "Neutralization (pH Result)", "Coagulation (Gullifloc) (L)", "Coagulation (pH Result)", "Flocculation (Polymer) (L)", "Flocculation (pH Result)", "Remarks"]);
            
            dataToExport.forEach(sub => {
                const rawDate = sub.data.metaInfo?.date || new Date(sub.submittedAt).toISOString().split('T')[0];
                const date = formatDate(rawDate);
                const time = sub.data.metaInfo?.time || "";
                const shift = sub.data.metaInfo?.shift || "";
                const info = sub.data.processInfo || {};
                
                const rawRemarks = sub.data.remarks || "";
                const remarks = `"${rawRemarks.replace(/"/g, '""')}"`;

                rows.push([
                    generateRefNo(sub.id), info.mixingTankBatchNo || "", date, time, sub.employeeName, shift,
                    info.mixingTankVolume || "",
                    info.causticSodaLitres || "", info.causticSodaPH1 || "",
                    info.coagulationLitres || "", info.coagulationPH2 || "",
                    info.flocculationLitres || "", info.flocculationPH3 || "",
                    remarks
                ]);
            });
        } else {
            rows.push(["Ref No", "Date", "Time", "Employee", "Shift", "pH", "COD", "BOD", "TSS", "O&G", "Flowrate", "Mg", "Nickel", "Zink", "Iron", "Aluminum", "Fluoride", "Silver", "Sulphide", "Raw EQ", "Remarks"]);
            
            dataToExport.forEach(sub => {
                const rawDate = sub.data.metaInfo?.date || new Date(sub.submittedAt).toISOString().split('T')[0];
                const date = formatDate(rawDate);
                const time = sub.data.metaInfo?.time || "";
                const shift = sub.data.metaInfo?.shift || "";
                const fd = sub.data.finalDischarge || {};
                    
                const rawRemarks = sub.data.remarks || "";
                const remarks = `"${rawRemarks.replace(/"/g, '""')}"`;

                rows.push([
                    generateRefNo(sub.id), date, time, sub.employeeName, shift,
                    fd.ph4 || "", fd.cod || "", fd.bod || "", fd.tss || fd.ss || "", fd.og || "", fd.flowrate || "",
                    fd.mg || "", fd.nickel || "", fd.zink || "", fd.iron || "", fd.aluminum || "",
                    fd.fluoride || "", fd.silver || "", fd.sulphide || "", fd.rawEq || fd.formaldehyde || "",
                    remarks
                ]);
            });
        }

        // Convert to CSV and trigger download
        const csvContent = rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const fileName = targetForm === "mixing" ? "Mixing_Chemical_Records" : "Final_Discharge_Records";
        link.setAttribute("download", `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`${targetForm === "mixing" ? "Mixing" : "Final Discharge"} spreadsheet exported successfully!`);
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Safety Department Dashboard</h1>
                    <p className="text-muted-foreground text-sm mt-1">Visualize and track environmental and safety data.</p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 text-xs font-bold px-2.5 py-1 rounded-md">
                            <Droplet className="w-3.5 h-3.5 mr-1.5"/> Discharge: {monitoringSubmissions.filter(s => s.formType === "final_discharge").length}
                        </Badge>
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-0 text-xs font-bold px-2.5 py-1 rounded-md">
                            <Layers className="w-3.5 h-3.5 mr-1.5"/> Mixing: {monitoringSubmissions.filter(s => s.formType === "mixing_chemical_stages" || s.formType === "daily_operation_monitoring").length}
                        </Badge>
                        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25 border-0 text-xs font-bold px-2.5 py-1 rounded-md">
                            <Recycle className="w-3.5 h-3.5 mr-1.5"/> Scheduled Waste: {wasteSubmissions.length}
                        </Badge>
                    </div>
                </div>
                <div className="relative w-full sm:w-56">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-lg font-bold text-sm transition-colors shadow-sm">
                        <Settings className="h-4 w-4" /> Dashboard Options
                    </button>
                    
                    {isMenuOpen && (
                        <>
                            {/* Invisible overlay to catch clicks outside the menu and close it */}
                            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute right-0 left-0 sm:left-auto top-full mt-2 sm:w-56 bg-background border border-border rounded-xl shadow-xl z-50 flex flex-col p-1.5 animate-in fade-in slide-in-from-top-2">
                                <button onClick={() => { setIsExportOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-left text-foreground">
                                    <Download className="h-4 w-4 text-muted-foreground" /> Export to Spreadsheet
                                </button>
                                <button onClick={() => { setIsWasteTypesOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-left text-foreground">
                                    <Settings className="h-4 w-4 text-muted-foreground" /> Manage Waste Types
                                </button>
                                <button onClick={() => { setIsPosterSettingsOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-left text-foreground">
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" /> Manage Poster
                                </button>
                                <button onClick={() => { setIsRemarksOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-left text-foreground">
                                    <MessageSquare className="h-4 w-4 text-muted-foreground" /> View Remarks
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Dashboard Tabs */}
            <div className="flex w-full overflow-x-auto no-scrollbar gap-2 mt-6 mb-8 border-b border-border pb-1">
                {[
                    { id: "discharge", label: "Final Discharge", icon: Droplet },
                    { id: "mixing", label: "Mixing & Chemical", icon: Layers },
                    { id: "waste", label: "Scheduled Waste Inventory", icon: Recycle },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setDashboardView(tab.id as any)}
                        className={`flex items-center gap-2 whitespace-nowrap px-5 py-3 rounded-t-lg text-sm font-bold transition-colors border-b-2 ${
                            dashboardView === tab.id
                                ? "border-primary text-primary bg-primary/5"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                        <tab.icon className="h-4 w-4" /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Stats Cards - Discharge */}
            {dashboardView === "discharge" && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="card-elevated p-5 border-l-4 border-l-primary/50">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Monitoring Reports</p>
                        <p className="text-3xl font-bold text-foreground">{dischargeStats.totalReports}</p>
                    </div>
                    <div className="card-elevated p-5 border-l-4 border-l-emerald-500">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Average pH</p>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{dischargeStats.avgPh}</p>
                    </div>
                    <div className="card-elevated p-5 border-l-4 border-l-blue-500">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Average COD</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{dischargeStats.avgCod} <span className="text-sm font-medium text-blue-600/50">mg/L</span></p>
                    </div>
                    <div className="card-elevated p-5 border-l-4 border-l-amber-500">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Average Flowrate</p>
                        <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{dischargeStats.avgFlow} <span className="text-sm font-medium text-amber-600/50">m³</span></p>
                    </div>
                </div>
            )}

            {/* Stats Cards - Mixing */}
            {dashboardView === "mixing" && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="card-elevated p-5 border-l-4 border-l-primary/50">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Mixing Reports</p>
                        <p className="text-3xl font-bold text-foreground">{mixingStats.totalReports}</p>
                    </div>
                    <div className="card-elevated p-5 border-l-4 border-l-emerald-500">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Neutralization</p>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{mixingStats.totalCaustic} <span className="text-sm font-medium text-emerald-600/50">L</span></p>
                    </div>
                    <div className="card-elevated p-5 border-l-4 border-l-blue-500">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Coagulation</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{mixingStats.totalCoagulation} <span className="text-sm font-medium text-blue-600/50">L</span></p>
                    </div>
                    <div className="card-elevated p-5 border-l-4 border-l-amber-500">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Flocculation</p>
                        <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{mixingStats.totalFlocculation} <span className="text-sm font-medium text-amber-600/50">L</span></p>
                    </div>
                </div>
            )}

            {/* Date Filters - Discharge & Mixing */}
            {(dashboardView === "discharge" || dashboardView === "mixing") && (
                <div className="flex items-center justify-end gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium text-muted-foreground">From:</Label>
                        <Input 
                            type="date"
                            value={dashboardView === "discharge" ? dischargeStartDate : mixingStartDate} 
                            onChange={e => dashboardView === "discharge" ? setDischargeStartDate(e.target.value) : setMixingStartDate(e.target.value)} 
                            className="h-9 w-36 text-xs dark:[color-scheme:dark]" 
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium text-muted-foreground">To:</Label>
                        <Input 
                            type="date"
                            value={dashboardView === "discharge" ? dischargeEndDate : mixingEndDate} 
                            onChange={e => dashboardView === "discharge" ? setDischargeEndDate(e.target.value) : setMixingEndDate(e.target.value)} 
                            className="h-9 w-36 text-xs dark:[color-scheme:dark]" 
                        />
                    </div>
                </div>
            )}

            {/* Discharge Monitoring Chart */}
            {dashboardView === "discharge" && (
                <div className="card-elevated p-6 mb-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="font-bold text-foreground text-lg flex items-center gap-2"><Droplet className="h-5 w-5 text-primary" /> Final Discharge Graph</h2>
                            <p className="text-xs text-muted-foreground mt-1">Daily average values across the selected period.</p>
                        </div>
                        <div className="w-full sm:w-48">
                            <button onClick={() => {
                                setRemarkType("discharge");
                                setIsAddRemarkOpen(true);
                            }} className="w-full h-10 mb-2 flex items-center justify-center gap-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors">
                                <Plus className="h-4 w-4" /> Add Remark
                            </button>
                            <Select value={selectedParameter} onValueChange={setSelectedParameter}>
                                <SelectTrigger className="h-10 rounded-xl border border-border/50 bg-background/40 backdrop-blur-md hover:bg-background/60 transition-all shadow-sm text-sm font-medium">
                                    <SelectValue placeholder="Select Parameter" />
                                </SelectTrigger>
                                <SelectContent>
                                    {parameterOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis 
                                    tick={{ fontSize: 12 }} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    domain={selectedParameter.toLowerCase().includes("ph") 
                                        ? [(dataMin: number) => Math.min(dataMin - 0.5, 5.5), (dataMax: number) => Math.max(dataMax + 0.5, 9.5)]
                                        : ['dataMin - 1', 'dataMax + 1']
                                    } 
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "var(--radius)"
                                    }}
                                    labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }}
                                    itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }}
                                />
                                <Legend />
                                {selectedParameter.toLowerCase().includes("ph") && (
                                    <>
                                        <ReferenceLine y={9} stroke="#ef4444" strokeDasharray="3 3" />
                                        <ReferenceLine y={5.5} stroke="#ef4444" strokeDasharray="3 3" />
                                    </>
                                )}
                                <Line type="monotone" dataKey="value" name={`${selectedParamInfo?.label} (${selectedParamInfo?.unit})`} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Mixing Monitoring Chart */}
            {dashboardView === "mixing" && (
                <div className="card-elevated p-6 mb-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="font-bold text-foreground text-lg flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Mixing Graph</h2>
                            <p className="text-xs text-muted-foreground mt-1">Daily average values across the selected period.</p>
                        </div>
                        <div className="w-full sm:w-56">
                            <button onClick={() => {
                                setRemarkType("mixing");
                                setIsAddRemarkOpen(true);
                            }} className="w-full h-10 mb-2 flex items-center justify-center gap-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors">
                                <Plus className="h-4 w-4" /> Add Remark
                            </button>
                            <Select value={selectedMixingParameter} onValueChange={setSelectedMixingParameter}>
                                <SelectTrigger className="h-10 rounded-xl border border-border/50 bg-background/40 backdrop-blur-md hover:bg-background/60 transition-all shadow-sm text-sm font-medium">
                                    <SelectValue placeholder="Select Parameter" />
                                </SelectTrigger>
                                <SelectContent>
                                    {mixingParameterOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mixingChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis 
                                    tick={{ fontSize: 12 }} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    domain={['dataMin - 1', 'dataMax + 1']} 
                                />
                                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }} itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }} />
                                <Legend />
                                <Line type="monotone" dataKey="value" name={`${selectedMixingParamInfo?.label} ${selectedMixingParamInfo?.unit ? `(${selectedMixingParamInfo.unit})` : ''}`} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Waste Inventory Section */}
            {dashboardView === "waste" && (
                <div className="mb-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                    <div>
                        <h2 className="font-bold text-foreground text-xl flex items-center gap-2">
                            <Recycle className="h-6 w-6 text-primary" /> Scheduled Waste Disposal Overview
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">Track scheduled waste generation, recycling, and disposal.</p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        {/* Date Filters - Waste */}
                        <div className="flex items-center justify-end gap-4">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium text-muted-foreground">From:</Label>
                                <Input 
                                    type="date"
                                    value={wasteStartDate} 
                                    onChange={e => setWasteStartDate(e.target.value)} 
                                    className="h-9 w-36 text-xs dark:[color-scheme:dark]" 
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium text-muted-foreground">To:</Label>
                                <Input 
                                    type="date"
                                    value={wasteEndDate} 
                                    onChange={e => setWasteEndDate(e.target.value)} 
                                    className="h-9 w-36 text-xs dark:[color-scheme:dark]" 
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Select value={wasteSwFilter} onValueChange={setWasteSwFilter}>
                                <SelectTrigger className="h-10 w-36 text-sm bg-background border border-border/50 shadow-sm rounded-xl">
                                    <SelectValue placeholder="All SW Codes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All SW Codes</SelectItem>
                                    {availableSwCodes.map(code => (
                                        <SelectItem key={code} value={code}>{code}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50 w-fit">
                                {["All", "Plant 1", "Plant 2"].map(plant => (
                                    <button 
                                        key={plant} 
                                        onClick={() => setWastePlantFilter(plant as any)} 
                                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${wastePlantFilter === plant ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        {plant === "All" ? "All Plants" : plant}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="card-elevated p-5 border-l-4 border-l-primary/50">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Waste Generated</p>
                        <p className="text-3xl font-bold text-foreground">{wasteChartData.stats.total.toFixed(2)} <span className="text-sm font-medium text-muted-foreground">kg</span></p>
                    </div>
                    <div className="card-elevated p-5 border-l-4 border-l-emerald-500">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Recycle (Sell)</p>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{wasteChartData.stats.sell.toFixed(2)} <span className="text-sm font-medium text-emerald-600/50">kg</span></p>
                    </div>
                    <div className="card-elevated p-5 border-l-4 border-l-blue-500">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Dispose (Pay)</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{wasteChartData.stats.pay.toFixed(2)} <span className="text-sm font-medium text-blue-600/50">kg</span></p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sell Chart */}
                    <div className="card-elevated p-6">
                        <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-6"><BarChart3 className="h-4 w-4 text-emerald-500" /> Recycle (Sell) by SW Code</h3>
                        <div className="h-56">
                            {wasteChartData.sellData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={wasteChartData.sellData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }} barCategoryGap="15%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                        <XAxis dataKey="code" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }} itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }} formatter={(value: number, name: string, props: any) => [`${value} kg`, props.payload?.fullName || "Net Weight"]} />
                                        <Bar dataKey="value" fill="#10b981" maxBarSize={36} label={{ position: 'top', fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold' }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Pay Chart */}
                    <div className="card-elevated p-6">
                        <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-6"><BarChart3 className="h-4 w-4 text-blue-500" /> Dispose (Pay) by SW Code</h3>
                        <div className="h-56">
                            {wasteChartData.payData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={wasteChartData.payData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }} barCategoryGap="15%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                        <XAxis dataKey="code" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }} itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }} formatter={(value: number, name: string, props: any) => [`${value} kg`, props.payload?.fullName || "Net Weight"]} />
                                        <Bar dataKey="value" fill="#3b82f6" maxBarSize={36} label={{ position: 'top', fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold' }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="card-elevated p-6">
                        <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-6"><PieChartIcon className="h-4 w-4 text-primary" /> Distribution</h3>
                        <div className="h-56">
                            {wasteChartData.pieData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={wasteChartData.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                            {wasteChartData.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => [`${value} kg`, 'Net Weight']} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }} itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Remarks Sheet */}
            <Sheet open={isRemarksOpen} onOpenChange={setIsRemarksOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="border-b border-border pb-4 mb-6">
                        <SheetTitle className="text-xl font-bold">Log Remarks</SheetTitle>
                        <p className="text-sm text-muted-foreground">Notes and remarks from Final Discharge operations.</p>
                    </SheetHeader>
                    <div className="space-y-4">
                        {remarksList.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No remarks found.</p>
                        ) : (
                            remarksList.map(sub => (
                                <div key={sub.id} className="p-4 rounded-xl border border-border bg-muted/10">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-sm text-foreground">{sub.employeeName || "System Log"}</p>
                                                {sub.formType === 'final_discharge' && (
                                                    <Badge variant="outline" className="text-[9px] border-blue-500/50 text-blue-600">Final Discharge</Badge>
                                                )}
                                                {sub.formType === 'mixing_chemical_stages' && (
                                                    <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-600">Mixing</Badge>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-primary mb-0.5">{generateRefNo(sub.id)}</p>
                                            <p className="text-[10px] uppercase text-muted-foreground">{sub.formType.replace(/_/g, ' ')}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {sub.data.metaInfo?.date ? new Date(sub.data.metaInfo.date).toLocaleDateString('en-GB') : new Date(sub.submittedAt).toLocaleDateString('en-GB')}
                                        </p>
                                    </div>
                                    <p className="text-sm text-foreground">{sub.data.remarks}</p>
                                </div>
                            ))
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Add Remark Sheet */}
            <Sheet open={isAddRemarkOpen} onOpenChange={setIsAddRemarkOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="border-b border-border pb-4 mb-6">
                        <SheetTitle className="text-xl font-bold">Add New Remark</SheetTitle>
                        <p className="text-sm text-muted-foreground">Log a new observation for {remarkType === 'discharge' ? 'Final Discharge' : 'Mixing'} operations.</p>
                    </SheetHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-xs font-bold text-primary uppercase tracking-wider">Remark / Ulasan</Label>
                            <textarea
                                value={newRemark}
                                onChange={(e) => setNewRemark(e.target.value)}
                                placeholder="Enter your observation or note here..."
                                className="w-full mt-2 rounded-lg border border-border bg-background px-3 py-2 text-base sm:text-sm min-h-[120px] resize-y"
                            />
                        </div>
                        <button onClick={handleAddRemark} disabled={isSavingRemark} className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70">
                            {isSavingRemark ? <><Save className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Remark</>}
                        </button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Export Options Sheet */}
            <Sheet open={isExportOpen} onOpenChange={setIsExportOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="border-b border-border pb-4 mb-6">
                        <SheetTitle className="text-xl font-bold">Export to Spreadsheet</SheetTitle>
                        <p className="text-sm text-muted-foreground">Download your records as a CSV file.</p>
                    </SheetHeader>
                    
                    <div className="space-y-6">
                        {/* Date Range Selector */}
                        <div className="p-4 rounded-xl border border-border bg-background shadow-sm space-y-3">
                            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">Select Date Range</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">From Date</Label>
                                    <Input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="h-9 text-xs dark:[color-scheme:dark]" />
                                </div>
                                <div>
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">To Date</Label>
                                    <Input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="h-9 text-xs dark:[color-scheme:dark]" />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <button onClick={() => {
                                    const today = new Date().toISOString().split('T')[0];
                                    setExportStartDate(today);
                                    setExportEndDate(today);
                                }} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors">Today</button>
                                <button onClick={() => {
                                    const today = new Date();
                                    const lastWeek = new Date(today);
                                    lastWeek.setDate(today.getDate() - 7);
                                    setExportStartDate(lastWeek.toISOString().split('T')[0]);
                                    setExportEndDate(today.toISOString().split('T')[0]);
                                }} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors">Last 7 Days</button>
                                <button onClick={() => {
                                    const today = new Date();
                                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                                    setExportStartDate(firstDay.toISOString().split('T')[0]);
                                    setExportEndDate(today.toISOString().split('T')[0]);
                                }} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors">This Month</button>
                                <button onClick={() => {
                                    setExportStartDate("");
                                    setExportEndDate("");
                                }} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors">Clear</button>
                            </div>
                        </div>

                        {/* Mixing Records */}
                        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">1. Mixing & Chemical Stages</h3>
                                <p className="text-xs text-muted-foreground mt-1">Export records containing pH 1, 2, 3 and chemical usage.</p>
                                <div className="mt-3">
                                    <button onClick={() => { handleExportCSV("mixing"); setIsExportOpen(false); }} className="w-full py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                                        <Download className="h-3.5 w-3.5" /> Download Spreadsheet
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Final Discharge Records */}
                        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">2. Final Discharge</h3>
                                <p className="text-xs text-muted-foreground mt-1">Export records containing COD, BOD, TSS, Metals, etc.</p>
                                <div className="mt-3">
                                    <button onClick={() => { handleExportCSV("discharge"); setIsExportOpen(false); }} className="w-full py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                                        <Download className="h-3.5 w-3.5" /> Download Spreadsheet
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Manage Waste Types Sheet */}
            <Sheet open={isWasteTypesOpen} onOpenChange={setIsWasteTypesOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="border-b border-border pb-4 mb-6">
                        <SheetTitle className="text-xl font-bold">Manage Waste Types</SheetTitle>
                        <p className="text-sm text-muted-foreground">Add, rename, or remove items from the Smart Calculator.</p>
                    </SheetHeader>
                    
                    <div className="space-y-6">
                        {/* Add New Section */}
                        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
                            <Label className="text-xs font-bold text-primary uppercase tracking-wider">Add New Waste Type</Label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Select value={newTypeCategory} onValueChange={(val: any) => setNewTypeCategory(val)}>
                                    <SelectTrigger className="w-full sm:w-[160px] bg-background"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sell">Recycle (Sell)</SelectItem>
                                        <SelectItem value="pay">Dispose (Pay)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input 
                                    value={newTypeName} 
                                    onChange={e => setNewTypeName(e.target.value)} 
                                    placeholder="Enter waste name..." 
                                    className="bg-background flex-1"
                                />
                            </div>
                            <button onClick={handleAddWasteType} className="w-full py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                                <Plus className="h-4 w-4" /> Add to {newTypeCategory === 'sell' ? 'Recycle (Sell)' : 'Dispose (Pay)'}
                            </button>
                        </div>

                        {/* Existing Lists */}
                        <div className="space-y-4">
                            {[{ id: "sell", label: "Recycle (Sell) Types", items: sellTypes }, { id: "pay", label: "Dispose (Pay) Types", items: payTypes }].map(category => (
                                <div key={category.id}>
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{category.label}</Label>
                                    <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                                        {category.items.length === 0 ? (
                                            <p className="p-3 text-xs text-muted-foreground text-center bg-muted/5">No items found.</p>
                                        ) : category.items.map(item => (
                                            <div key={item} className="p-3 flex items-center justify-between hover:bg-muted/10 transition-colors group bg-background">
                                                <span className="text-sm font-medium text-foreground truncate pr-4">{item}</span>
                                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleRenameWasteType(category.id as any, item)} className="p-2 sm:p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Rename">
                                                        <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                                    </button>
                                                    <button onClick={() => handleDeleteWasteType(category.id as any, item)} className="p-2 sm:p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Delete">
                                                        <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Manage Poster Sheet */}
            <Sheet open={isPosterSettingsOpen} onOpenChange={setIsPosterSettingsOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="border-b border-border pb-4 mb-6">
                        <SheetTitle className="text-xl font-bold">Safety Poster Settings</SheetTitle>
                        <p className="text-sm text-muted-foreground">Manage the awareness poster shown to users.</p>
                    </SheetHeader>
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/10">
                            <div>
                                <p className="font-bold text-sm text-foreground">Enable Popup Poster</p>
                                <p className="text-xs text-muted-foreground">Show poster when users open Safety Forms.</p>
                            </div>
                            <button 
                                onClick={() => setPosterConfig(p => ({ ...p, enabled: !p.enabled }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${posterConfig.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${posterConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Poster</Label>
                            <div className="border border-border rounded-xl p-2 bg-muted/5 relative overflow-hidden flex flex-col items-center justify-center min-h-[200px]">
                                {posterConfig.url ? (
                                    <img src={posterConfig.url} alt="Safety Poster" className="max-h-64 object-contain rounded-lg" />
                                ) : (
                                    <div className="text-center p-6">
                                        <ImageIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-muted-foreground">Default Poster Active</p>
                                        <p className="text-xs text-muted-foreground mt-1">Upload a custom image to replace it.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-lg transition-colors cursor-pointer ${isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary/90'}`}>
                                    <Upload className="h-4 w-4" /> {isUploading ? "Uploading..." : "Upload New Poster"}
                                    <input type="file" accept="image/*" className="hidden" onChange={handlePosterUpload} disabled={isUploading} />
                                </label>
                                {posterConfig.url && (
                                    <button onClick={() => {
                                        if(window.confirm("Remove custom poster and use the default?")) {
                                            setPosterConfig(p => ({ ...p, url: null }));
                                        }
                                    }} className="px-4 py-2.5 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold text-sm rounded-lg transition-colors">
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default SafetyAdminDashboard;