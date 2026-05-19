import { useState, useEffect, useMemo } from "react";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplet, BarChart3, CalendarDays, MessageSquare, Settings, Trash2, Pencil, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { DEFAULT_SELL_WASTE_TYPES, DEFAULT_PAY_WASTE_TYPES } from "@/pages/WasteInventoryForm";

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

    const monitoringSubmissions = useMemo(() => 
        submissions.filter(s => s.formType === "daily_operation_monitoring"), 
    [submissions]);

    const remarksList = useMemo(() => {
        return submissions
            .filter(s => ["daily_operation_monitoring", "mixing_chemical_stages", "final_discharge"].includes(s.formType))
            .filter(s => s.data.remarks && s.data.remarks.trim() !== "")
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }, [submissions]);

    const chartData = useMemo(() => {
        const start = startDate || "0000-00-00";
        const end = endDate || "9999-12-31";

        const data = monitoringSubmissions
            .filter(s => s.data.metaInfo.date >= start && s.data.metaInfo.date <= end)
            .map(s => ({
                date: s.data.metaInfo.date,
                value: parseFloat(s.data.finalDischarge[selectedParameter]) || 0,
            }))
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
            return s.data.metaInfo.date >= start && s.data.metaInfo.date <= end;
        });
        const totalReports = filteredSubmissions.length;
        const avgPh = totalReports > 0 ? filteredSubmissions.reduce((sum, s) => sum + (parseFloat(s.data.finalDischarge.ph4) || 0), 0) / totalReports : 0;

        return {
            totalReports,
            avgPh: avgPh.toFixed(2),
        };
    }, [monitoringSubmissions, startDate, endDate]);

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

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Safety Department Dashboard</h1>
                    <p className="text-muted-foreground text-sm mt-1">Visualize and track environmental and safety data.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setIsWasteTypesOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-lg font-bold text-sm transition-colors">
                        <Settings className="h-4 w-4" /> Manage Waste Types
                    </button>
                    <button onClick={() => setIsRemarksOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-bold text-sm transition-colors">
                        <MessageSquare className="h-4 w-4" /> View Remarks
                    </button>
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
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center"><span className="text-xl font-bold text-emerald-600">pH</span></div>
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Average pH (Selected)</p>
                        <p className="text-3xl font-bold text-foreground">{stats.avgPh}</p>
                    </div>
                </div>
            </div>

            {/* Discharge Monitoring Chart */}
            <div className="card-elevated p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="font-bold text-foreground text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Final Discharge Monitoring</h2>
                            <p className="text-xs text-muted-foreground mt-1">Daily average values across the selected period.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                            <div className="relative group w-full sm:w-40">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors z-10">
                                    <CalendarDays className="h-4 w-4" />
                                </div>
                                <Input 
                                    type="date"
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)} 
                                    className={`h-10 pl-10 w-full rounded-xl border border-border/50 bg-background/40 backdrop-blur-md hover:bg-background/60 focus:bg-background/80 text-foreground font-medium shadow-sm transition-all [color-scheme:light_dark] cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 ${!startDate ? 'text-transparent' : ''}`} 
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
                                    className={`h-10 pl-10 w-full rounded-xl border border-border/50 bg-background/40 backdrop-blur-md hover:bg-background/60 focus:bg-background/80 text-foreground font-medium shadow-sm transition-all [color-scheme:light_dark] cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 ${!endDate ? 'text-transparent' : ''}`} 
                                />
                                {!endDate && (
                                    <div className="absolute inset-y-0 left-0 pl-10 flex items-center pointer-events-none text-muted-foreground text-sm font-medium">
                                        To Date
                                    </div>
                                )}
                            </div>
                            <div className="w-full sm:w-48">
                                <Select value={selectedParameter} onValueChange={setSelectedParameter}>
                                    <SelectTrigger className="h-10 rounded-xl border border-border/50 bg-background/40 backdrop-blur-md hover:bg-background/60 transition-all shadow-sm">
                                        <SelectValue placeholder="Select Parameter" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {parameterOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "var(--radius)",
                                    }}
                                />
                                <Legend />
                                {selectedParameter === "ph4" && (
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

            {/* Remarks Sheet */}
            <Sheet open={isRemarksOpen} onOpenChange={setIsRemarksOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="border-b border-border pb-4 mb-6">
                        <SheetTitle className="text-xl font-bold">Log Remarks</SheetTitle>
                        <p className="text-sm text-muted-foreground">Notes and remarks from Daily Operations.</p>
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
                            <div className="flex gap-2">
                                <Select value={newTypeCategory} onValueChange={(val: any) => setNewTypeCategory(val)}>
                                    <SelectTrigger className="w-[160px] bg-background"><SelectValue /></SelectTrigger>
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
                            <button onClick={handleAddWasteType} className="w-full py-2 bg-primary text-primary-foreground font-bold text-sm rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
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
                                                    <button onClick={() => handleRenameWasteType(category.id as any, item)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Rename">
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button onClick={() => handleDeleteWasteType(category.id as any, item)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Delete">
                                                        <Trash2 className="h-3.5 w-3.5" />
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

export default SafetyAdminDashboard;