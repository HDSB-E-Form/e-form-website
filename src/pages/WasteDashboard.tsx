import { useState, useMemo, useEffect } from "react";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, PieChart as PieChartIcon, Settings, Trash2, Pencil, Plus, Recycle, Download, Database, RotateCcw, MessageSquare, Save, X } from "lucide-react";
import { DEFAULT_SELL_WASTE_TYPES, DEFAULT_PAY_WASTE_TYPES } from "@/pages/WasteInventoryForm";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/contexts/AuthContext";
import SafetyDashboardSkeleton from "@/components/SafetyDashboardSkeleton";
import { useSafetyDashboardRefresh } from "@/hooks/useSafetyDashboardRefresh";

const formatYAxis = (tick: number) => {
    if (tick === 0) return '0';
    if (tick >= 1000) return `${tick / 1000}k`;
    return tick.toString();
};

const WasteDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { submissions, isLoading, refreshSubmissions } = useSubmissions();
    const isDashboardRefreshing = useSafetyDashboardRefresh(refreshSubmissions, isLoading);
    const [wasteStartDate, setWasteStartDate] = useState("");
    const [wasteEndDate, setWasteEndDate] = useState("");
    const [wastePlantFilter, setWastePlantFilter] = useState<"All" | "Plant 1" | "Plant 2">("All");
    const [wasteSwFilter, setWasteSwFilter] = useState<string>("All");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [exportStartDate, setExportStartDate] = useState("");
    const [exportEndDate, setExportEndDate] = useState("");
    const [isWasteTypesOpen, setIsWasteTypesOpen] = useState(false);
    const [newTypeCategory, setNewTypeCategory] = useState<"sell" | "pay">("sell");
    const [newTypeName, setNewTypeName] = useState("");
    const hasInvalidDateRange = Boolean(wasteStartDate && wasteEndDate && wasteStartDate > wasteEndDate);
    const hasActiveFilters = Boolean(wasteStartDate || wasteEndDate || wastePlantFilter !== "All" || wasteSwFilter !== "All");
    const activeFilterCount = [wasteStartDate, wasteEndDate, wastePlantFilter !== "All", wasteSwFilter !== "All"].filter(Boolean).length;
    const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);
    const [newRemark, setNewRemark] = useState("");
    const [isSavingRemark, setIsSavingRemark] = useState(false);
    const [isRemarksOpen, setIsRemarksOpen] = useState(false);
    const [dashboardRemarks, setDashboardRemarks] = useState<Array<{ id: string; remark: string; created_by_name: string; created_at: string }>>([]);


    const [sellTypes, setSellTypes] = useState<string[]>(DEFAULT_SELL_WASTE_TYPES);
    const [payTypes, setPayTypes] = useState<string[]>(DEFAULT_PAY_WASTE_TYPES);

    useEffect(() => {
        supabase.from("safety_dashboard_settings").select("value").eq("key", "waste_types").maybeSingle()
            .then(({ data }) => {
                const value = data?.value as { sell?: string[]; pay?: string[] } | undefined;
                if (value?.sell) setSellTypes(value.sell);
                if (value?.pay) setPayTypes(value.pay);
            });
        supabase.from("safety_dashboard_remarks").select("id, remark, created_by_name, created_at").eq("dashboard", "waste_inventory").order("created_at", { ascending: false })
            .then(({ data }) => {
                if (data) setDashboardRemarks(data);
            });
    }, []);

    const handleAddRemark = async () => {
        if (!newRemark.trim()) {
            toast.error("Remark cannot be empty.");
            return;
        }
        setIsSavingRemark(true);
        const { data, error } = await supabase.from("safety_dashboard_remarks").insert({
            dashboard: "waste_inventory", remark: newRemark.trim(), created_by: user?.id || "", created_by_name: user?.name || "System",
        }).select("id, remark, created_by_name, created_at").single();
        if (!error && data) {
            setDashboardRemarks(current => [data, ...current]);
            toast.success("Remark added successfully.");
            setIsAddRemarkOpen(false);
            setNewRemark("");
        } else toast.error(`Failed to save remark: ${error?.message || "Unknown error"}`);
        setIsSavingRemark(false);
    };

    const saveWasteTypes = async (nextSell: string[], nextPay: string[]) => {
        const { error } = await supabase.from("safety_dashboard_settings").upsert({
            key: "waste_types", value: { sell: nextSell, pay: nextPay }, updated_by: user?.id || "", updated_at: new Date().toISOString(),
        });
        if (error) {
            toast.error(`Failed to save waste types: ${error.message}`);
            return false;
        }
        setSellTypes(nextSell);
        setPayTypes(nextPay);
        return true;
    };

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
            let code = wasteType.split(' ')[0].substring(0, 7);

            // Specific handling for SW104 Dross and Sludge
            if (wasteType.toUpperCase().includes("SW104")) {
                if (wasteType.toUpperCase().includes("DROSS")) code = "SW104_D";
                else if (wasteType.toUpperCase().includes("SLUDGE")) code = "SW104_S";
            }
            // Specific handling for SW422 Oily Scrap and Chip Coolant
            if (wasteType.toUpperCase().includes("SW422")) {
                if (wasteType.toUpperCase().includes("OILY SCRAP")) code = "SW422_O";
                else if (wasteType.toUpperCase().includes("ALUMINIUM CHIP COOLANT")) code = "SW422_C";
            }

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

        const customSortOrder = ["SW104_S", "SW104_D", "SW422_O", "SW422_C", "SW409", "SW305", "SW306"];

        const customSort = (a: { code: string }, b: { code: string }) => {
            const indexA = customSortOrder.indexOf(a.code);
            const indexB = customSortOrder.indexOf(b.code);

            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB; // Both are in the custom order list
            }
            if (indexA !== -1) {
                return -1; // A is in the list, B is not, so A comes first
            }
            if (indexB !== -1) {
                return 1; // B is in the list, A is not, so B comes first
            }
            return a.code.localeCompare(b.code); // Fallback to alphabetical sort
        };

        const sellData = Object.values(sellStats).sort(customSort).map(d => ({ ...d, value: parseFloat(d.value.toFixed(2)) }));
        const payData = Object.values(payStats).sort(customSort).map(d => ({ ...d, value: parseFloat(d.value.toFixed(2)) }));

        const pieData = [
            { name: "Recycle (Sell)", value: parseFloat(totalSell.toFixed(2)), color: "#10b981" }, // Cool Green
            { name: "Dispose (Pay)", value: parseFloat(totalPay.toFixed(2)), color: "#3b82f6" }
        ].filter(d => d.value > 0);

        return { 
            pieData, sellData, payData,
            stats: { sell: totalSell, pay: totalPay, total: totalSell + totalPay, recordCount: filtered.length }
        };
    }, [wasteSubmissions, wasteStartDate, wasteEndDate, wastePlantFilter, wasteSwFilter]);

    const sharedBarScale = useMemo(() => {
        const values = [...wasteChartData.sellData, ...wasteChartData.payData].map(item => item.value);
        const largestValue = Math.max(0, ...values);
        if (largestValue === 0) return { maximum: 100, ticks: [0, 20, 40, 60, 80, 100] };

        const roughStep = largestValue / 5;
        const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
        const step = Math.ceil(roughStep / magnitude) * magnitude;
        return { maximum: step * 5, ticks: Array.from({ length: 6 }, (_, index) => index * step) };
    }, [wasteChartData.sellData, wasteChartData.payData]);

    const handleAddWasteType = async () => {
        if (!newTypeName.trim()) return toast.error("Waste type name cannot be empty");
        if (newTypeCategory === "sell") {
            if (sellTypes.includes(newTypeName.trim())) return toast.error("This waste type already exists in Recycle (Sell).");
            if (!await saveWasteTypes([...sellTypes, newTypeName.trim()], payTypes)) return;
        } else {
            if (payTypes.includes(newTypeName.trim())) return toast.error("This waste type already exists in Dispose (Pay).");
            if (!await saveWasteTypes(sellTypes, [...payTypes, newTypeName.trim()])) return;
        }
        setNewTypeName("");
        toast.success("Waste type added for all Safety Admins.");
    };

    const handleDeleteWasteType = async (cat: "sell" | "pay", name: string) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
        const saved = cat === "sell"
            ? await saveWasteTypes(sellTypes.filter(item => item !== name), payTypes)
            : await saveWasteTypes(sellTypes, payTypes.filter(item => item !== name));
        if (saved) toast.success("Waste type removed.");
    };

    const handleRenameWasteType = async (cat: "sell" | "pay", oldName: string) => {
        const newName = window.prompt("Enter new name for this waste type:", oldName);
        if (!newName || !newName.trim() || newName.trim() === oldName) return;
        const cleanedName = newName.trim();
        const saved = cat === "sell"
            ? await saveWasteTypes(sellTypes.map(item => item === oldName ? cleanedName : item), payTypes)
            : await saveWasteTypes(sellTypes, payTypes.map(item => item === oldName ? cleanedName : item));
        if (saved) toast.success("Waste type renamed.");
    };

    const handleExportCSV = () => {
        const start = exportStartDate || "0000-00-00";
        const end = exportEndDate || "9999-12-31";

        let dataToExport = wasteSubmissions.filter(s => {
            const subDate = s.data.recordDate || new Date(s.submittedAt).toISOString().split('T')[0];
            const dateMatch = subDate >= start && subDate <= end;
            const plantMatch = wastePlantFilter === "All" || s.data.plant === wastePlantFilter;
            const swCodeMatch = wasteSwFilter === "All" || (s.data.wasteType || "").startsWith(wasteSwFilter);
            return dateMatch && plantMatch && swCodeMatch;
        });

        if (dataToExport.length === 0) {
            toast.error("No waste inventory records found in the selected date range.");
            return;
        }

        dataToExport.sort((a, b) => {
            const dateA = a.data.recordDate || new Date(a.submittedAt).toISOString().split('T')[0];
            const timeA = a.data.recordTime || "00:00";
            const dateB = b.data.recordDate || new Date(b.submittedAt).toISOString().split('T')[0];
            const timeB = b.data.recordTime || "00:00";
            return `${dateA}T${timeA}`.localeCompare(`${dateB}T${timeB}`);
        });

        const formatDate = (d: string) => {
            const parts = d.split('-');
            return parts.length === 3 ? ` ${parts[2]}/${parts[1]}/${parts[0]}` : ` ${d}`;
        };

        let rows: string[][] = [
            ["Date", "Time", "Plant", "Category", "Waste Type", "Gross Weight (kg)", "Container Weight (kg)", "Net Weight (kg)"]
        ];

        dataToExport.forEach(sub => {
            const date = formatDate(sub.data.recordDate || new Date(sub.submittedAt).toISOString().split('T')[0]);
            const time = sub.data.recordTime || "";
            (sub.data.rows || []).forEach((row: any) => {
                rows.push([date, time, sub.data.plant, sub.data.category, sub.data.wasteType, row.gross || "0", row.container || "0", (parseFloat(row.gross || "0") - parseFloat(row.container || "0")).toFixed(2)]);
            });
        });

        const csvContent = rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Scheduled_Waste_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Scheduled Waste Inventory spreadsheet exported successfully!");
    };

    if (isDashboardRefreshing) return <SafetyDashboardSkeleton />;

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Print Header */}
            <div className="hidden print:block mb-4">
                <h2 className="text-lg font-bold">Scheduled Waste Inventory Report</h2>
                {(wasteStartDate || wasteEndDate) && (
                    <p className="text-sm text-gray-600">
                        Date Range: <strong>{wasteStartDate}</strong> to <strong>{wasteEndDate}</strong>
                    </p>
                )}
            </div>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Scheduled Waste Inventory</h1>
                    <p className="text-muted-foreground text-sm mt-1">Track waste generation, recycling, and disposal with the Smart Calculator.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsAddRemarkOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/20">
                        <Plus className="h-4 w-4" /> Add Remark
                    </button>
                    <div className="relative">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Dashboard settings" className="h-10 w-10 flex items-center justify-center bg-muted hover:bg-muted/80 border border-border text-foreground rounded-lg transition-colors text-sm font-bold shadow-sm">
                            <Settings className="h-5 w-5" />
                        </button>
                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-xl shadow-xl z-50 flex flex-col p-1.5 animate-in fade-in slide-in-from-top-2">
                                <button onClick={() => { setExportStartDate(wasteStartDate); setExportEndDate(wasteEndDate); setIsExportOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-left text-foreground">
                                    <Download className="h-4 w-4 text-muted-foreground" /> Export to Spreadsheet
                        </button>
                                <button onClick={() => { setIsWasteTypesOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-left text-foreground">
                                    <Settings className="h-4 w-4 text-muted-foreground" /> Manage Waste Types
                                </button>
                                <button onClick={() => { setIsRemarksOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-left text-foreground">
                                    <MessageSquare className="h-4 w-4 text-muted-foreground" /> View Remarks
                                </button>
                            </div>
                        </>
                    )}
                    </div>
                </div>
            </div>

            <div className="mb-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="card-elevated p-5 border-l-4 border-l-violet-500">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Records</p>
                        <p className="text-3xl font-bold text-foreground">{wasteChartData.stats.recordCount.toLocaleString('en-US')}</p>
                    </div>
                    <div className="card-elevated p-5 border-l-4 border-l-primary/50">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Waste Generated</p>
                        <p className="text-3xl font-bold text-foreground">{wasteChartData.stats.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-medium text-muted-foreground">kg</span></p>
                    </div>
                    <div className="card-elevated p-5 border-l-4 border-l-emerald-500">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Recycle (Sell)</p>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{wasteChartData.stats.sell.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-medium text-emerald-600/50">kg</span></p>
                    </div>
                    <div className="card-elevated p-5 border-l-4 border-l-blue-500">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Dispose (Pay)</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{wasteChartData.stats.pay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-medium text-blue-600/50">kg</span></p>
                    </div>
                </div>

                {/* Compact responsive filter bar */}
                <div className="mb-6 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
                    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(260px,1.5fr)_auto]">
                        <div>
                            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Start Date</Label>
                            <Input type="date" value={wasteStartDate} max={wasteEndDate || undefined} onChange={e => setWasteStartDate(e.target.value)} className="h-9 w-full text-xs dark:[color-scheme:dark]" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">End Date</Label>
                            <Input type="date" value={wasteEndDate} min={wasteStartDate || undefined} onChange={e => setWasteEndDate(e.target.value)} className="h-9 w-full text-xs dark:[color-scheme:dark]" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">SW Code</Label>
                        <Select value={wasteSwFilter} onValueChange={setWasteSwFilter}>
                            <SelectTrigger className="h-9 w-full text-xs bg-background border-input shadow-sm rounded-lg truncate">
                                <SelectValue placeholder="All SW Codes" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[150px]">
                                <SelectItem value="All">All SW Codes</SelectItem>
                                {availableSwCodes.map(code => (
                                    <SelectItem key={code} value={code}>{code}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        </div>
                        <div className="sm:col-span-2 xl:col-span-1">
                        <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Plant</Label>
                        <div className="grid h-9 w-full grid-cols-3 bg-background p-0.5 rounded-lg border border-input shadow-sm">
                            {["All", "Plant 1", "Plant 2"].map(plant => (
                                <button
                                    key={plant}
                                    onClick={() => setWastePlantFilter(plant as any)}
                                    className={`px-2 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${wastePlantFilter === plant ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                                >
                                    {plant === "All" ? "All Plants" : plant}
                                </button>
                            ))}
                        </div>
                        </div>
                        <button
                            onClick={() => { setWasteStartDate(""); setWasteEndDate(""); setWastePlantFilter("All"); setWasteSwFilter("All"); }}
                            disabled={!hasActiveFilters}
                            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
                        </button>
                    </div>
                    {hasInvalidDateRange && <p className="mt-2 text-xs font-semibold text-destructive">The Start Date must be earlier than or equal to the End Date.</p>}
                    <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                            Showing <span className="font-bold text-foreground">{wasteChartData.stats.recordCount.toLocaleString('en-US')}</span> {wasteChartData.stats.recordCount === 1 ? 'record' : 'records'}
                            {hasActiveFilters && <span> · {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}</span>}
                        </p>
                        {hasActiveFilters && (
                            <div className="flex flex-wrap gap-1.5">
                                {wasteStartDate && <button onClick={() => setWasteStartDate("")} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted">From: {wasteStartDate}<X className="h-3 w-3" /></button>}
                                {wasteEndDate && <button onClick={() => setWasteEndDate("")} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted">To: {wasteEndDate}<X className="h-3 w-3" /></button>}
                                {wasteSwFilter !== "All" && <button onClick={() => setWasteSwFilter("All")} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted">SW Code: {wasteSwFilter}<X className="h-3 w-3" /></button>}
                                {wastePlantFilter !== "All" && <button onClick={() => setWastePlantFilter("All")} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted">{wastePlantFilter}<X className="h-3 w-3" /></button>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col">
                <div className="order-2 mt-6 grid grid-cols-1 gap-6">
                    <div className="card-elevated p-4 sm:p-6">
                        <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="font-bold text-foreground text-sm flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-primary" /> Distribution</h3>
                        </div>
                        <div className="min-h-72">
                            {wasteChartData.pieData.length === 0 ? (
                                <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">No data available.</div>
                            ) : (
                                <div className="flex min-h-72 flex-col items-center justify-center gap-4 md:flex-row md:gap-10">
                                    <div className="h-64 w-full max-w-sm sm:h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={wasteChartData.pieData} cx="50%" cy="50%" innerRadius={64} outerRadius={94} paddingAngle={5} dataKey="value" stroke="hsl(var(--border))" strokeWidth={1}>
                                                    {wasteChartData.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                </Pie>
                                                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="600">TOTAL NET</text>
                                                <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--foreground))" fontSize="16" fontWeight="700">
                                                    {`${wasteChartData.stats.total.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`}
                                                </text>
                                                <Tooltip formatter={(value: number) => [`${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`, 'Net Weight']} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }} itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid w-full max-w-sm gap-3 pb-2 md:pb-0">
                                        {wasteChartData.pieData.map(item => {
                                            const percentage = wasteChartData.stats.total > 0 ? (item.value / wasteChartData.stats.total) * 100 : 0;
                                            return (
                                                <div key={item.name} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/10 p-3.5">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                                                        <span className="truncate text-sm font-semibold text-foreground">{item.name}</span>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <p className="text-sm font-bold text-foreground">{item.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</p>
                                                        <p className="text-xs font-medium text-muted-foreground">{percentage.toFixed(1)}%</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="order-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card-elevated p-4 sm:p-6 md:col-span-1">
                        <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-6"><BarChart3 className="h-4 w-4 text-emerald-500" /> Recycle (Sell) by SW Code</h3>
                        <div className="h-[340px] md:h-[400px]">
                            {wasteChartData.sellData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={wasteChartData.sellData} margin={{ top: 20, right: 12, left: 8, bottom: 0 }} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                        <XAxis dataKey="code" tick={{ fontSize: 10, angle: wasteChartData.sellData.length > 6 ? -45 : 0, textAnchor: wasteChartData.sellData.length > 6 ? 'end' : 'middle' } as any} tickLine={false} axisLine={false} interval={0} height={wasteChartData.sellData.length > 6 ? 50 : 30} />
                                        <YAxis width={44} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, sharedBarScale.maximum]} ticks={sharedBarScale.ticks} tickFormatter={formatYAxis} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }} itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }} formatter={(value: number, name: string, props: any) => [`${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`, props.payload?.fullName || "Net Weight"]} />
                                        <Bar dataKey="value" fill="#10b981" maxBarSize={36} label={{ position: 'top', fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold', formatter: (value: number) => value > 0 ? value.toLocaleString('en-US') : '' }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="card-elevated p-4 sm:p-6 md:col-span-1">
                        <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-6"><BarChart3 className="h-4 w-4 text-blue-500" /> Dispose (Pay) by SW Code</h3>
                        <div className="h-[340px] md:h-[400px]">
                            {wasteChartData.payData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={wasteChartData.payData} margin={{ top: 20, right: 12, left: 8, bottom: 0 }} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                        <XAxis dataKey="code" tick={{ fontSize: 10, angle: wasteChartData.payData.length > 6 ? -45 : 0, textAnchor: wasteChartData.payData.length > 6 ? 'end' : 'middle' } as any} tickLine={false} axisLine={false} interval={0} height={wasteChartData.payData.length > 6 ? 50 : 30} />
                                        <YAxis width={44} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, sharedBarScale.maximum]} ticks={sharedBarScale.ticks} tickFormatter={formatYAxis} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }} itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }} formatter={(value: number, name: string, props: any) => [`${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`, props.payload?.fullName || "Net Weight"]} />
                                        <Bar dataKey="value" fill="#3b82f6" maxBarSize={36} label={{ position: 'top', fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold', formatter: (value: number) => value > 0 ? value.toLocaleString('en-US') : '' }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>
                </div>
            </div>

            {/* Add Remark Sheet */}
            <Sheet open={isAddRemarkOpen} onOpenChange={setIsAddRemarkOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="border-b border-border pb-4 mb-6">
                        <SheetTitle className="text-xl font-bold">Add New Remark</SheetTitle>
                        <p className="text-sm text-muted-foreground">Log an issue, false data, or any other note for Scheduled Waste Inventory records.</p>
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

            {/* Remarks Sheet */}
            <Sheet open={isRemarksOpen} onOpenChange={setIsRemarksOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="border-b border-border pb-4 mb-6">
                        <SheetTitle className="text-xl font-bold">Log Remarks</SheetTitle>
                        <p className="text-sm text-muted-foreground">Notes and remarks from Scheduled Waste Inventory operations.</p>
                    </SheetHeader>
                    <div className="space-y-4">
                        {dashboardRemarks.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No remarks found.</p>
                        ) : (
                            dashboardRemarks.map(remark => (
                                <div key={remark.id} className="p-4 rounded-xl border border-border bg-muted/10">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm text-foreground">{remark.created_by_name}</p>
                                            <Badge variant="outline" className="text-[9px] border-blue-500/50 text-blue-600">Waste Inventory</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(remark.created_at).toLocaleDateString('en-GB')}
                                        </p>
                                    </div>
                                    <p className="text-sm text-foreground">{remark.remark}</p>
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
                                <button onClick={() => { const today = new Date().toISOString().split('T')[0]; setExportStartDate(today); setExportEndDate(today); }} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors">Today</button>
                                <button onClick={() => { const today = new Date(); const lastWeek = new Date(today); lastWeek.setDate(today.getDate() - 7); setExportStartDate(lastWeek.toISOString().split('T')[0]); setExportEndDate(today.toISOString().split('T')[0]); }} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors">Last 7 Days</button>
                                <button onClick={() => { const today = new Date(); const firstDay = new Date(today.getFullYear(), today.getMonth(), 1); setExportStartDate(firstDay.toISOString().split('T')[0]); setExportEndDate(today.toISOString().split('T')[0]); }} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors">This Month</button>
                                <button onClick={() => { setExportStartDate(""); setExportEndDate(""); }} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors">Clear</button>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Scheduled Waste Inventory</h3>
                                <p className="text-xs text-muted-foreground mt-1">Export all waste calculator records.</p>
                                <div className="mt-3">
                                    <button onClick={() => { handleExportCSV(); setIsExportOpen(false); }} className="w-full py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
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
        </div>
    );
};

export default WasteDashboard;
