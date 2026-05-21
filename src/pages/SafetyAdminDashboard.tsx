import { useState, useEffect, useMemo } from "react";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplet, BarChart3, PieChart as PieChartIcon, CalendarDays, MessageSquare, Settings, Trash2, Pencil, Plus, Download, Image as ImageIcon, Upload } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { DEFAULT_SELL_WASTE_TYPES, DEFAULT_PAY_WASTE_TYPES } from "@/pages/WasteInventoryForm";
import { supabase } from "@/supabase";

const parameterOptions = [
    { id: "ph4", label: "pH", unit: "" },
    { id: "cod", label: "COD", unit: "mg/L" },
    { id: "flowrate", label: "Flowrate", unit: "m³" },
];

const SafetyAdminDashboard = () => {
    const { submissions } = useSubmissions();
    const [selectedParameter, setSelectedParameter] = useState("ph4");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isRemarksOpen, setIsRemarksOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [wastePlantFilter, setWastePlantFilter] = useState<"All" | "Plant 1" | "Plant 2">("All");
    
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

    const monitoringSubmissions = useMemo(() => 
        submissions.filter(s => ["final_discharge", "mixing_chemical_stages", "daily_operation_monitoring"].includes(s.formType)), 
    [submissions]);

    const wasteSubmissions = useMemo(() => 
        submissions.filter(s => s.formType === "waste_inventory"), 
    [submissions]);

    const remarksList = useMemo(() => {
        return submissions
            .filter(s => s.formType === "final_discharge")
            .filter(s => s.data.remarks && s.data.remarks.trim() !== "")
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }, [submissions]);

    const chartData = useMemo(() => {
        const start = startDate || "0000-00-00";
        const end = endDate || "9999-12-31";

        const data = monitoringSubmissions
            .filter(s => s.data.metaInfo && s.data.metaInfo.date >= start && s.data.metaInfo.date <= end)
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
    }, [monitoringSubmissions, selectedParameter, startDate, endDate]);

    const selectedParamInfo = parameterOptions.find(p => p.id === selectedParameter);

    const stats = useMemo(() => {
        const start = startDate || "0000-00-00";
        const end = endDate || "9999-12-31";

        const filteredSubmissions = monitoringSubmissions.filter(s => {
            return s.data.metaInfo && s.data.metaInfo.date >= start && s.data.metaInfo.date <= end;
        });
        
        let totalValue = 0;
        let validCount = 0;

        filteredSubmissions.forEach(s => {
            const val = parseFloat(s.data.finalDischarge?.[selectedParameter]);
            if (!isNaN(val) && val > 0) {
                totalValue += val;
                validCount++;
            }
        });

        return {
            totalReports: filteredSubmissions.length,
            avgValue: validCount > 0 ? (totalValue / validCount).toFixed(2) : "0.00",
        };
    }, [monitoringSubmissions, startDate, endDate, selectedParameter]);

    const wasteChartData = useMemo(() => {
        const start = startDate || "0000-00-00";
        const end = endDate || "9999-12-31";

        const dateFiltered = wasteSubmissions.filter(s => {
            const subDate = new Date(s.submittedAt).toISOString().split('T')[0];
            return subDate >= start && subDate <= end;
        });

        // Overall Stats (Unaffected by Plant Filter)
        let totalSell = 0, totalPay = 0;
        dateFiltered.forEach(s => {
            const cat = s.data.category;
            const net = parseFloat(s.data.totals?.net) || 0;
            if (cat === "sell") totalSell += net;
            else if (cat === "pay") totalPay += net;
        });

        // Bar Stats (Affected by Plant Filter)
        let barSell = 0, barPay = 0;
        const wasteStats: Record<string, any> = {};

        dateFiltered.forEach(s => {
            if (wastePlantFilter !== "All" && s.data.plant !== wastePlantFilter) return;

            const cat = s.data.category;
            const net = parseFloat(s.data.totals?.net) || 0;

            if (cat === "sell") barSell += net;
            else if (cat === "pay") barPay += net;

            const wasteType = s.data.wasteType || "Unknown";
            const code = wasteType.split(' ')[0].substring(0, 7);
            const color = cat === "sell" ? "#10b981" : "#3b82f6";

            if (!wasteStats[code]) wasteStats[code] = { code, value: 0, fullName: wasteType, color };
            wasteStats[code].value += net;
        });

        const barData = Object.values(wasteStats).sort((a,b) => b.value - a.value).map(d => ({ ...d, value: parseFloat(d.value.toFixed(2)) }));

        const pieData = [
            { name: "Recycle (Sell)", value: parseFloat(totalSell.toFixed(2)), color: "#10b981" }, 
            { name: "Dispose (Pay)", value: parseFloat(totalPay.toFixed(2)), color: "#3b82f6" } 
        ].filter(d => d.value > 0);

        return { 
            pieData, barData,
            barStats: { sell: barSell, pay: barPay, total: barSell + barPay }
        };
    }, [wasteSubmissions, startDate, endDate, wastePlantFilter]);

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

        const start = startDate || "0000-00-00";
        const end = endDate || "9999-12-31";
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
            rows.push(["Batch Number", "Date", "Time", "Employee", "Shift", "Tank Volume", "Caustic Soda (L)", "pH 1", "Coagulation (L)", "pH 2", "Flocculation (L)", "pH 3", "Remarks"]);
            
            dataToExport.forEach(sub => {
                const rawDate = sub.data.metaInfo?.date || new Date(sub.submittedAt).toISOString().split('T')[0];
                const date = formatDate(rawDate);
                const time = sub.data.metaInfo?.time || "";
                const shift = sub.data.metaInfo?.shift || "";
                const info = sub.data.processInfo || {};
                
                const rawRemarks = sub.data.remarks || "";
                const remarks = `"${rawRemarks.replace(/"/g, '""')}"`;

                rows.push([
                    info.mixingTankBatchNo || "", date, time, sub.employeeName, shift,
                    info.mixingTankVolume || "",
                    info.causticSodaLitres || "", info.causticSodaPH1 || "",
                    info.coagulationLitres || "", info.coagulationPH2 || "",
                    info.flocculationLitres || "", info.flocculationPH3 || "",
                    remarks
                ]);
            });
        } else {
            rows.push(["Date", "Time", "Employee", "Shift", "pH", "COD", "BOD", "TSS", "O&G", "Flowrate", "Mg", "Nickel", "Zink", "Iron", "Aluminum", "Fluoride", "Silver", "Sulphide", "Volume DCM", "Remarks"]);
            
            dataToExport.forEach(sub => {
                const rawDate = sub.data.metaInfo?.date || new Date(sub.submittedAt).toISOString().split('T')[0];
                const date = formatDate(rawDate);
                const time = sub.data.metaInfo?.time || "";
                const shift = sub.data.metaInfo?.shift || "";
                const fd = sub.data.finalDischarge || {};
                    
                const rawRemarks = sub.data.remarks || "";
                const remarks = `"${rawRemarks.replace(/"/g, '""')}"`;

                rows.push([
                    date, time, sub.employeeName, shift,
                    fd.ph4 || "", fd.cod || "", fd.bod || "", fd.tss || "", fd.og || "", fd.flowrate || "",
                    fd.mg || "", fd.nickel || "", fd.zink || "", fd.iron || "", fd.aluminum || "",
                    fd.fluoride || "", fd.silver || "", fd.sulphide || "", fd.volumeDcm || "",
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="card-elevated p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Droplet className="h-6 w-6 text-primary" /></div>
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monitoring Reports (Selected)</p>
                        <p className="text-3xl font-bold text-foreground">{stats.totalReports}</p>
                    </div>
                </div>
                <div className="card-elevated p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center"><span className="text-sm font-bold text-emerald-600 text-center leading-tight">{selectedParamInfo?.label.includes("pH") ? "pH" : selectedParamInfo?.label}</span></div>
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Average {selectedParamInfo?.label}</p>
                        <p className="text-3xl font-bold text-foreground">{stats.avgValue}</p>
                    </div>
                </div>
            </div>

            {/* Global Date Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 mb-6 bg-muted/20 p-4 rounded-2xl border border-border/50">
                <div>
                    <h2 className="font-bold text-foreground text-sm">Dashboard Filters</h2>
                    <p className="text-xs text-muted-foreground">Selected dates apply to all charts below.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group w-full sm:w-40">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors z-10">
                            <CalendarDays className="h-4 w-4" />
                        </div>
                        <Input 
                            type="date"
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            className={`h-10 pl-10 w-full rounded-xl border border-border/50 bg-background/80 hover:bg-background focus:bg-background text-foreground font-medium shadow-sm transition-all [color-scheme:light_dark] cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 ${!startDate ? 'text-transparent' : ''}`} 
                        />
                        {!startDate && (
                            <div className="absolute inset-y-0 left-0 pl-10 flex items-center pointer-events-none text-muted-foreground text-sm font-medium">
                                From Date
                            </div>
                        )}
                    </div>
                    <div className="relative group w-full sm:w-40">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors z-10">
                            <CalendarDays className="h-4 w-4" />
                        </div>
                        <Input 
                            type="date"
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                            className={`h-10 pl-10 w-full rounded-xl border border-border/50 bg-background/80 hover:bg-background focus:bg-background text-foreground font-medium shadow-sm transition-all [color-scheme:light_dark] cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 ${!endDate ? 'text-transparent' : ''}`} 
                        />
                        {!endDate && (
                            <div className="absolute inset-y-0 left-0 pl-10 flex items-center pointer-events-none text-muted-foreground text-sm font-medium">
                                To Date
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Discharge Monitoring Chart */}
            <div className="card-elevated p-6 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="font-bold text-foreground text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Water Treatment Monitoring</h2>
                            <p className="text-xs text-muted-foreground mt-1">Daily average values across the selected period.</p>
                        </div>
                        <div className="w-full sm:w-48">
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
                                        <ReferenceLine y={6} stroke="#ef4444" strokeDasharray="3 3" />
                                    </>
                                )}
                                <Line type="monotone" dataKey="value" name={`${selectedParamInfo?.label} (${selectedParamInfo?.unit})`} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            {/* Waste Inventory Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 mt-8">
                {/* Unified Bar Chart */}
                <div className="card-elevated p-6 lg:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="font-bold text-foreground text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Waste by SW Code</h2>
                                {wasteChartData.barStats.total > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-emerald-500 bg-emerald-500/10 text-[10px] px-1.5 py-0.5 font-bold rounded uppercase">{Math.round((wasteChartData.barStats.sell / wasteChartData.barStats.total) * 100)}% Sell</span>
                                        <span className="text-blue-500 bg-blue-500/10 text-[10px] px-1.5 py-0.5 font-bold rounded uppercase">{Math.round((wasteChartData.barStats.pay / wasteChartData.barStats.total) * 100)}% Pay</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{wastePlantFilter === "All" ? "Combined data from both plants." : `Showing data specifically for ${wastePlantFilter}.`}</p>
                        </div>
                        <div className="w-full sm:w-48">
                            <Select value={wastePlantFilter} onValueChange={(val: any) => setWastePlantFilter(val)}>
                                <SelectTrigger className="h-10 rounded-xl border border-border/50 bg-background/40 backdrop-blur-md hover:bg-background/60 transition-all shadow-sm text-sm font-medium">
                                    <SelectValue placeholder="All Plants" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">Combined (All Plants)</SelectItem>
                                    <SelectItem value="Plant 1">Plant 1 Only</SelectItem>
                                    <SelectItem value="Plant 2">Plant 2 Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={wasteChartData.barData} margin={{ top: 20, right: 0, left: -25, bottom: 0 }} barCategoryGap="15%">
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis dataKey="code" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
                                    labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }}
                                    itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }}
                                    formatter={(value: number, name: string, props: any) => [`${value} kg`, props.payload?.fullName || "Net Weight"]}
                                />
                                <Bar dataKey="value" maxBarSize={36} label={{ position: 'top', fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold' }}>
                                    {wasteChartData.barData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart: Overall Sell vs Pay */}
                <div className="card-elevated p-6">
                    <div className="mb-6">
                        <h2 className="font-bold text-foreground text-lg flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-primary" /> Overall Distribution</h2>
                        <p className="text-xs text-muted-foreground mt-1">Total combined waste percentage.</p>
                    </div>
                    <div className="h-56">
                        {wasteChartData.pieData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={wasteChartData.pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {wasteChartData.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value: number) => [`${value} kg`, 'Net Weight']} 
                                        contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} 
                                        labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }}
                                        itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

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
                                            <p className="font-bold text-sm text-foreground">{sub.employeeName}</p>
                                            <p className="text-[10px] uppercase text-muted-foreground">{sub.formType.replace(/_/g, ' ')}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                                    </div>
                                    <p className="text-sm text-foreground">{sub.data.remarks}</p>
                                </div>
                            ))
                        )}
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
                            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">1. Select Date Range</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">From Date</Label>
                                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-xs" />
                                </div>
                                <div>
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">To Date</Label>
                                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-xs" />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <button onClick={() => {
                                    const today = new Date().toISOString().split('T')[0];
                                    setStartDate(today);
                                    setEndDate(today);
                                }} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors">Today</button>
                                <button onClick={() => {
                                    const today = new Date();
                                    const lastWeek = new Date(today);
                                    lastWeek.setDate(today.getDate() - 7);
                                    setStartDate(lastWeek.toISOString().split('T')[0]);
                                    setEndDate(today.toISOString().split('T')[0]);
                                }} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors">Last 7 Days</button>
                                <button onClick={() => {
                                    const today = new Date();
                                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                                    setStartDate(firstDay.toISOString().split('T')[0]);
                                    setEndDate(today.toISOString().split('T')[0]);
                                }} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors">This Month</button>
                                <button onClick={() => {
                                    setStartDate("");
                                    setEndDate("");
                                }} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors">Clear</button>
                            </div>
                        </div>

                        {/* Mixing Records */}
                        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">2. Mixing & Chemical Stages</h3>
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
                                <h3 className="text-sm font-bold text-foreground">3. Final Discharge</h3>
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