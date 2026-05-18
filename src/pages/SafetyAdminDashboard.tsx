import { useState, useMemo } from "react";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Droplet, BarChart3, SlidersHorizontal } from "lucide-react";

const parameterOptions = [
    { id: "ph4", label: "pH 4", unit: "" },
    { id: "cod", label: "COD", unit: "mg/L" },
    { id: "bod", label: "BOD", unit: "mg/L" },
    { id: "tss", label: "TSS", unit: "mg/L" },
    { id: "og", label: "O & G", unit: "mg/L" },
    { id: "flowrate", label: "Flowrate", unit: "m³" },
    { id: "mg", label: "Magnesium", unit: "mg/L" },
    { id: "nickel", label: "Nickel", unit: "mg/L" },
    { id: "zink", label: "Zink", unit: "mg/L" },
    { id: "iron", label: "Iron", unit: "mg/L" },
    { id: "aluminum", label: "Aluminum", unit: "mg/L" },
    { id: "fluoride", label: "Fluoride", unit: "mg/L" },
    { id: "silver", label: "Silver", unit: "mg/L" },
    { id: "sulphide", label: "Sulphide", unit: "mg/L" },
    { id: "volumeDcm", label: "Volume DCM", unit: "DCM" },
];

const SafetyAdminDashboard = () => {
    const { submissions } = useSubmissions();
    const [selectedParameter, setSelectedParameter] = useState("ph4");
    const [timeRange, setTimeRange] = useState("30");

    const monitoringSubmissions = useMemo(() => 
        submissions.filter(s => s.formType === "daily_operation_monitoring"), 
    [submissions]);

    const chartData = useMemo(() => {
        const data = monitoringSubmissions
            .map(s => ({
                date: new Date(s.data.metaInfo.date).toLocaleDateString('en-CA'),
                value: parseFloat(s.data.finalDischarge[selectedParameter]) || 0,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
        })).slice(-parseInt(timeRange));
    }, [monitoringSubmissions, selectedParameter, timeRange]);

    const selectedParamInfo = parameterOptions.find(p => p.id === selectedParameter);

    const averageComparisonData = useMemo(() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(timeRange));

        const relevantSubmissions = monitoringSubmissions.filter(s => {
            const subDate = new Date(s.data.metaInfo.date);
            return subDate >= startDate && subDate <= endDate;
        });

        if (relevantSubmissions.length === 0) return [];

        return parameterOptions.map(param => {
            const total = relevantSubmissions.reduce((sum, s) => {
                const value = parseFloat(s.data.finalDischarge[param.id]);
                return sum + (isNaN(value) ? 0 : value);
            }, 0);
            const average = total / relevantSubmissions.length;
            return { name: param.label, value: parseFloat(average.toFixed(2)) };
        }).filter(item => item.value > 0); // Filter out parameters with no data
    }, [monitoringSubmissions, timeRange]);

    const stats = useMemo(() => {
        const last30DaysSubmissions = monitoringSubmissions.filter(s => {
            const subDate = new Date(s.data.metaInfo.date);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return subDate >= thirtyDaysAgo;
        });
        const totalReports = last30DaysSubmissions.length;
        const avgPh = totalReports > 0 ? last30DaysSubmissions.reduce((sum, s) => sum + (parseFloat(s.data.finalDischarge.ph4) || 0), 0) / totalReports : 0;

        return {
            totalReports,
            avgPh: avgPh.toFixed(2),
        };
    }, [monitoringSubmissions]);

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground">Safety Department Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">Visualize and track environmental and safety data.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="card-elevated p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Droplet className="h-6 w-6 text-primary" /></div>
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monitoring Reports (30d)</p>
                        <p className="text-3xl font-bold text-foreground">{stats.totalReports}</p>
                    </div>
                </div>
                <div className="card-elevated p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center"><span className="text-xl font-bold text-emerald-600">pH</span></div>
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Average pH (30d)</p>
                        <p className="text-3xl font-bold text-foreground">{stats.avgPh}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Discharge Monitoring Chart */}
                <div className="lg:col-span-3 card-elevated p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="font-bold text-foreground text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Final Discharge Monitoring</h2>
                            <p className="text-xs text-muted-foreground mt-1">Daily average values for selected parameter.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="space-y-1.5 w-48">
                                <Label className="text-xs font-semibold">Parameter</Label>
                                <Select value={selectedParameter} onValueChange={setSelectedParameter}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {parameterOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 w-32">
                                <Label className="text-xs font-semibold">Time Range</Label>
                                <Select value={timeRange} onValueChange={setTimeRange}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">Last 7 Days</SelectItem>
                                        <SelectItem value="30">Last 30 Days</SelectItem>
                                        <SelectItem value="90">Last 90 Days</SelectItem>
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
                                <Line type="monotone" dataKey="value" name={`${selectedParamInfo?.label} (${selectedParamInfo?.unit})`} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Parameter Averages Chart */}
                <div className="lg:col-span-2 card-elevated p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="font-bold text-foreground text-lg flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" /> Parameter Averages</h2>
                            <p className="text-xs text-muted-foreground mt-1">Average values for the last {timeRange} days.</p>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={averageComparisonData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "var(--radius)",
                                    }}
                                />
                                <Bar dataKey="value" fill="hsl(var(--primary))" barSize={10} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SafetyAdminDashboard;