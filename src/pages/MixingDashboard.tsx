import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers, Plus, Save, Settings, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/supabase";

const MixingDashboard = () => {
    const { user } = useAuth();
    const { submissions } = useSubmissions();

    const formatLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const getToday = () => formatLocalDate(new Date());
    const getOneMonthAgo = () => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return formatLocalDate(date);
    };

    const [mixingStartDate, setMixingStartDate] = useState(getOneMonthAgo());
    const [mixingEndDate, setMixingEndDate] = useState(getToday());
    const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);
    const [newRemark, setNewRemark] = useState("");
    const [isSavingRemark, setIsSavingRemark] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [exportStartDate, setExportStartDate] = useState("");
    const [exportEndDate, setExportEndDate] = useState("");
    const hasInvalidDateRange = mixingStartDate > mixingEndDate;

    
    const mixingParameterOptions = [
        { id: "causticSodaLitres", label: "Neutralization (Caustic Soda) (ltr)", unit: "" },
        { id: "coagulationLitres", label: "Coagulation (Gullifloc) (ltr)", unit: "" },
        { id: "flocculationLitres", label: "Flocculation (Polymer) (ltr)", unit: "" },
    ];
    const [selectedMixingParameter, setSelectedMixingParameter] = useState("causticSodaLitres");
    const selectedMixingParamInfo = mixingParameterOptions.find(p => p.id === selectedMixingParameter);

    const monitoringSubmissions = useMemo(() => 
        submissions.filter(s => ["final_discharge", "mixing_chemical_stages", "daily_operation_monitoring"].includes(s.formType)), 
    [submissions]);

    const mixingChartData = useMemo(() => {
        const start = mixingStartDate || "0000-00-00";
        const end = mixingEndDate || "9999-12-31";

        const data = monitoringSubmissions
            .filter(s => (s.formType === "mixing_chemical_stages" || s.formType === "daily_operation_monitoring") && s.data.processInfo && s.data.metaInfo && s.data.metaInfo.date >= start && s.data.metaInfo.date <= end)
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

    const mixingStats = useMemo(() => {
        const start = mixingStartDate || "0000-00-00";
        const end = mixingEndDate || "9999-12-31";

        const filteredSubmissions = monitoringSubmissions.filter(s => {
            return (s.formType === "mixing_chemical_stages" || s.formType === "daily_operation_monitoring") && s.data.processInfo && s.data.metaInfo && s.data.metaInfo.date >= start && s.data.metaInfo.date <= end;
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

    const handleAddRemark = async () => {
        if (!newRemark.trim()) {
            toast.error("Remark cannot be empty.");
            return;
        }
        setIsSavingRemark(true);
        const { error } = await supabase.from("safety_dashboard_remarks").insert({
            dashboard: "mixing", remark: newRemark.trim(), created_by: user?.id || "", created_by_name: user?.name || "System",
        });
        if (!error) {
            toast.success("Remark added successfully.");
            setIsAddRemarkOpen(false);
            setNewRemark("");
        } else toast.error(`Failed to save remark: ${error.message}`);
        setIsSavingRemark(false);
    };

    const handleExportCSV = () => {
        if (exportStartDate && exportEndDate && exportStartDate > exportEndDate) {
            toast.error("The export From date must be earlier than or equal to the To date.");
            return;
        }
        let dataToExport = monitoringSubmissions.filter(s => (s.formType === "mixing_chemical_stages" || s.formType === "daily_operation_monitoring") && s.data.processInfo);

        const start = exportStartDate || "0000-00-00";
        const end = exportEndDate || "9999-12-31";
        dataToExport = dataToExport.filter(s => {
            const subDate = s.data.metaInfo?.date || new Date(s.submittedAt).toISOString().split('T')[0];
            return subDate >= start && subDate <= end;
        });

        if (dataToExport.length === 0) {
            toast.error(`No records found for Mixing in the selected date range.`);
            return;
        }

        dataToExport.sort((a, b) => {
            const dateA = a.data.metaInfo?.date || new Date(a.submittedAt).toISOString().split('T')[0];
            const timeA = a.data.metaInfo?.time || "00:00";
            const dateB = b.data.metaInfo?.date || new Date(b.submittedAt).toISOString().split('T')[0];
            const timeB = b.data.metaInfo?.time || "00:00";
            return `${dateA}T${timeA}`.localeCompare(`${dateB}T${timeB}`);
        });

        const formatDate = (d: string) => {
            const parts = d.split('-');
            return parts.length === 3 ? ` ${parts[2]}/${parts[1]}/${parts[0]}` : ` ${d}`;
        };

        let rows: string[][] = [
            ["Ref No", "Batch Number", "Date", "Time", "Employee", "Shift", "Tank Volume", "Neutralization (Caustic Soda) (L)", "Neutralization (pH Result)", "Coagulation (Gullifloc) (L)", "Coagulation (pH Result)", "Flocculation (Polymer) (L)", "Flocculation (pH Result)", "Remarks"]
        ];
        
        dataToExport.forEach(sub => {
            const rawDate = sub.data.metaInfo?.date || new Date(sub.submittedAt).toISOString().split('T')[0];
            const date = formatDate(rawDate);
            const time = sub.data.metaInfo?.time || "";
            const shift = sub.data.metaInfo?.shift || "";
            const info = sub.data.processInfo || {};
            const rawRemarks = sub.data.remarks || "";
            const remarks = `"${rawRemarks.replace(/"/g, '""')}"`;

            rows.push([
                `MX-${sub.id.slice(-4)}`, info.mixingTankBatchNo || "", date, time, sub.employeeName, shift,
                info.mixingTankVolume || "",
                info.causticSodaLitres || "", info.causticSodaPH1 || "",
                info.coagulationLitres || "", info.coagulationPH2 || "",
                info.flocculationLitres || "", info.flocculationPH3 || "",
                remarks
            ]);
        });

        const csvContent = rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Mixing_Chemical_Records_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Mixing & Chemical spreadsheet exported successfully!");
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Print Header */}
            <div className="hidden print:block mb-4">
                <h2 className="text-lg font-bold">Mixing & Chemical Stages Report</h2>
                {(mixingStartDate || mixingEndDate) && (
                    <p className="text-sm text-gray-600">
                        Date Range: <strong>{mixingStartDate}</strong> to <strong>{mixingEndDate}</strong>
                    </p>
                )}
            </div>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Mixing & Chemical Stages</h1>
                    <p className="text-muted-foreground text-sm mt-1">Visualize and track chemical usage data from the mixing process.</p>
                </div>
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-10 w-10 flex items-center justify-center bg-muted hover:bg-muted/80 border border-border text-foreground rounded-lg transition-colors text-sm font-bold shadow-sm">
                        <Settings className="h-5 w-5" />
                    </button>
                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-xl shadow-xl z-50 flex flex-col p-1.5 animate-in fade-in slide-in-from-top-2">
                                <button onClick={() => { setExportStartDate(mixingStartDate); setExportEndDate(mixingEndDate); setIsExportOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-left text-foreground">
                                    <Download className="h-4 w-4 text-muted-foreground" /> Export to Spreadsheet
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card-elevated p-5 border-l-4 border-l-primary/50">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Mixing Reports</p>
                    <p className="text-3xl font-bold text-foreground">{mixingStats.totalReports.toLocaleString('en-US')}</p>
                </div>
                <div className="card-elevated p-5 border-l-4 border-l-emerald-500">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Neutralization</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{parseFloat(mixingStats.totalCaustic).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-medium text-emerald-600/50">L</span></p>
                </div>
                <div className="card-elevated p-5 border-l-4 border-l-blue-500">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Coagulation</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{parseFloat(mixingStats.totalCoagulation).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-medium text-blue-600/50">L</span></p>
                </div>
                <div className="card-elevated p-5 border-l-4 border-l-amber-500">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Flocculation</p>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{parseFloat(mixingStats.totalFlocculation).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-medium text-amber-600/50">L</span></p>
                </div>
            </div>

            <div className="mb-6 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[140px_140px_auto] sm:justify-end">
                    <div><Label className="mb-1.5 block text-xs font-medium text-muted-foreground">From</Label><Input type="date" value={mixingStartDate} max={mixingEndDate || undefined} onChange={e => setMixingStartDate(e.target.value)} className="h-9 w-full text-xs dark:[color-scheme:dark]" /></div>
                    <div><Label className="mb-1.5 block text-xs font-medium text-muted-foreground">To</Label><Input type="date" value={mixingEndDate} min={mixingStartDate || undefined} onChange={e => setMixingEndDate(e.target.value)} className="h-9 w-full text-xs dark:[color-scheme:dark]" /></div>
                    <button onClick={() => { setMixingStartDate(getOneMonthAgo()); setMixingEndDate(getToday()); }} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-bold text-foreground transition-colors hover:bg-muted sm:w-auto"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
                </div>
                {hasInvalidDateRange && <p className="mt-2 text-right text-xs font-semibold text-destructive">The From date must be earlier than or equal to the To date.</p>}
            </div>

            <div className="card-elevated p-6 mb-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="font-bold text-foreground text-lg flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Mixing Graph</h2>
                        <p className="text-xs text-muted-foreground mt-1">Daily average values across the selected period.</p>
                    </div>
                    <div className="w-full sm:w-56">
                        <button onClick={() => setIsAddRemarkOpen(true)} className="w-full h-10 mb-2 flex items-center justify-center gap-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors">
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
                            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                            <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }} itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }} />
                            <Legend />
                            <Line type="monotone" dataKey="value" name={`${selectedMixingParamInfo?.label} ${selectedMixingParamInfo?.unit ? `(${selectedMixingParamInfo.unit})` : ''}`} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

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
                        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Mixing & Chemical Stages</h3>
                                <p className="text-xs text-muted-foreground mt-1">Export records containing pH 1, 2, 3 and chemical usage.</p>
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

            {/* Add Remark Sheet */}
            <Sheet open={isAddRemarkOpen} onOpenChange={setIsAddRemarkOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="border-b border-border pb-4 mb-6">
                        <SheetTitle className="text-xl font-bold">Add New Remark</SheetTitle>
                        <p className="text-sm text-muted-foreground">Log a new observation for Mixing operations.</p>
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
        </div>
    );
};

export default MixingDashboard;
