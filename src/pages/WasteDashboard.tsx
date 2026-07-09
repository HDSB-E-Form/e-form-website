import { useState, useMemo } from "react";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, PieChart as PieChartIcon, Settings, Trash2, Pencil, Plus, Recycle, Download, Database } from "lucide-react";
import { DEFAULT_SELL_WASTE_TYPES, DEFAULT_PAY_WASTE_TYPES } from "@/pages/WasteInventoryForm";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";

const yAxisTicks = [0, 1000, 3000, 6000, 10000, 15000, 20000, 30000, 40000, 50000];
const formatYAxis = (tick: number) => {
    if (tick === 0) return '0';
    if (tick >= 1000) return `${tick / 1000}k`;
    return tick.toString();
};

const WasteDashboard = () => {
    const navigate = useNavigate();
    const { submissions } = useSubmissions();
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


    const [sellTypes] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem("hdsb_waste_types_sell") || "null") || DEFAULT_SELL_WASTE_TYPES; } catch { return DEFAULT_SELL_WASTE_TYPES; }
    });
    const [payTypes] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem("hdsb_waste_types_pay") || "null") || DEFAULT_PAY_WASTE_TYPES; } catch { return DEFAULT_PAY_WASTE_TYPES; }
    });

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
            { name: "Recycle (Sell)", value: parseFloat(totalSell.toFixed(2)), color: "#10b981" }, 
            { name: "Dispose (Pay)", value: parseFloat(totalPay.toFixed(2)), color: "#3b82f6" } 
        ].filter(d => d.value > 0);

        return { 
            pieData, sellData, payData,
            stats: { sell: totalSell, pay: totalPay, total: totalSell + totalPay, recordCount: filtered.length }
        };
    }, [wasteSubmissions, wasteStartDate, wasteEndDate, wastePlantFilter, wasteSwFilter]);

    const handleAddWasteType = () => {
        if (!newTypeName.trim()) return toast.error("Waste type name cannot be empty");
        if (newTypeCategory === "sell") {
            if (sellTypes.includes(newTypeName.trim())) return toast.error("This waste type already exists in Recycle (Sell).");
            // setSellTypes([...sellTypes, newTypeName.trim()]); // This would require sellTypes to be state
        } else {
            if (payTypes.includes(newTypeName.trim())) return toast.error("This waste type already exists in Dispose (Pay).");
            // setPayTypes([...payTypes, newTypeName.trim()]); // This would require payTypes to be state
        }
        setNewTypeName("");
        toast.info("This feature is in development. Please contact support to add new types permanently.");
    };

    const handleDeleteWasteType = (cat: "sell" | "pay", name: string) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
        toast.info("This feature is in development. Please contact support to delete types permanently.");
    };

    const handleRenameWasteType = (cat: "sell" | "pay", oldName: string) => {
        const newName = window.prompt("Enter new name for this waste type:", oldName);
        if (!newName || !newName.trim() || newName.trim() === oldName) return;
        toast.info("This feature is in development. Please contact support to rename types permanently.");
    };

    const handleExportCSV = () => {
        const start = exportStartDate || "0000-00-00";
        const end = exportEndDate || "9999-12-31";

        let dataToExport = wasteSubmissions.filter(s => {
            const subDate = s.data.recordDate || new Date(s.submittedAt).toISOString().split('T')[0];
            return subDate >= start && subDate <= end;
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
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-10 w-10 flex items-center justify-center bg-muted hover:bg-muted/80 border border-border text-foreground rounded-lg transition-colors text-sm font-bold shadow-sm">
                        <Settings className="h-5 w-5" />
                    </button>
                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute right-0 left-0 sm:left-auto top-full mt-2 w-full sm:w-56 bg-background border border-border rounded-xl shadow-xl z-50 flex flex-col p-1.5 animate-in fade-in slide-in-from-top-2">
                                <button onClick={() => { setIsExportOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-left text-foreground">
                                    <Download className="h-4 w-4 text-muted-foreground" /> Export to Spreadsheet
                        </button>
                                <button onClick={() => { setIsWasteTypesOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-left text-foreground">
                                    <Settings className="h-4 w-4 text-muted-foreground" /> Manage Waste Types
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="mb-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="card-elevated p-5 border-l-4 border-l-violet-500">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Records</p>
                        <p className="text-3xl font-bold text-foreground">{wasteChartData.stats.recordCount}</p>
                    </div>
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

                {/* Responsive Filter Bar Split Left/Right */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-muted/20 p-4 rounded-xl border border-border">
                    {/* Left Side Group: Date Filters */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-medium text-muted-foreground">From:</Label>
                            <Input type="date" value={wasteStartDate} onChange={e => setWasteStartDate(e.target.value)} className="h-9 w-36 text-xs dark:[color-scheme:dark]" />
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-medium text-muted-foreground">To:</Label>
                            <Input type="date" value={wasteEndDate} onChange={e => setWasteEndDate(e.target.value)} className="h-9 w-36 text-xs dark:[color-scheme:dark]" />
                        </div>
                    </div>

                    {/* Right Side Group: Waste Type & Plant Filters */}
                    <div className="flex flex-wrap items-center gap-3 ml-auto sm:ml-0">
                        <Select value={wasteSwFilter} onValueChange={setWasteSwFilter}>
                            <SelectTrigger className="h-9 w-[4cm] text-xs bg-background border-input shadow-sm rounded-lg truncate">
                                <SelectValue placeholder="All SW Codes" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[150px]">
                                <SelectItem value="All">All SW Codes</SelectItem>
                                {availableSwCodes.map(code => (
                                    <SelectItem key={code} value={code}>{code}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex bg-background p-0.5 rounded-lg border border-input w-fit shadow-sm">
                            {["All", "Plant 1", "Plant 2"].map(plant => (
                                <button
                                    key={plant}
                                    onClick={() => setWastePlantFilter(plant as any)}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${wastePlantFilter === plant ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                                >
                                    {plant === "All" ? "All Plants" : plant}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card-elevated p-6 md:col-span-1">
                        <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-6"><BarChart3 className="h-4 w-4 text-emerald-500" /> Recycle (Sell) by SW Code</h3>
                        <div className="h-64">
                            {wasteChartData.sellData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={wasteChartData.sellData} margin={{ top: 10, right: 20, left: -25, bottom: 30 }} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                        <XAxis dataKey="code" tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} tickLine={false} axisLine={false} interval={0} />
                                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 45000]} ticks={yAxisTicks} tickFormatter={formatYAxis} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }} itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }} formatter={(value: number, name: string, props: any) => [`${value} kg`, props.payload?.fullName || "Net Weight"]} />
                                        <Bar dataKey="value" fill="#10b981" maxBarSize={36} label={{ position: 'top', fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold' }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="card-elevated p-6 md:col-span-1">
                        <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-6"><BarChart3 className="h-4 w-4 text-blue-500" /> Dispose (Pay) by SW Code</h3>
                        <div className="h-64">
                            {wasteChartData.payData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={wasteChartData.payData} margin={{ top: 10, right: 20, left: -25, bottom: 30 }} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                        <XAxis dataKey="code" tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} tickLine={false} axisLine={false} interval={0} />
                                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 45000]} ticks={yAxisTicks} tickFormatter={formatYAxis} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }} itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }} formatter={(value: number, name: string, props: any) => [`${value} kg`, props.payload?.fullName || "Net Weight"]} />
                                        <Bar dataKey="value" fill="#3b82f6" maxBarSize={36} label={{ position: 'top', fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold' }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="card-elevated p-6 md:col-span-2">
                        <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-6"><PieChartIcon className="h-4 w-4 text-primary" /> Distribution</h3>
                        <div className="h-64">
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