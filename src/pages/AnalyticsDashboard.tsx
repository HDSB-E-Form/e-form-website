import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { supabase } from "@/supabase";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Users, UserCheck, UserX, ShieldCheck, FileText, DoorOpen, Wallet, Car, Layers, PieChart as PieChartIcon, BarChart3, TrendingDown, TrendingUp, Minus, type LucideIcon } from "lucide-react";
import DashboardStatCard from "@/components/DashboardStatCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const excludedForms = ["inventory_addition", "ppe_request", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"];
const adminRoles = ["super_admin", "safety_admin", "finance_admin", "it_admin", "hr_admin", "security_guard"];

interface UserRow {
  id: string;
  status: string | null;
  role: string | null;
  secondary_roles: string[] | null;
}

const fetchUserRows = async (): Promise<UserRow[]> => {
  const { data, error } = await supabase.from("users").select("id, status, role, secondary_roles");
  if (error) throw error;
  return data || [];
};

// Tracks the "dark" class on <html> so chart marks can use the dark-surface-safe
// step of each hue instead of the light-mode step (which fails contrast/lightness on dark).
const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
};

const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) => (
  <div className="mb-4 flex items-center gap-3">
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-4.5 w-4.5" />
    </div>
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  </div>
);

const AnalyticsDashboard = () => {
  const { submissions, isLoading: isSubmissionsLoading, refreshSubmissions } = useSubmissions();
  const { data: userRows = [], isLoading: isUsersLoading } = useQuery({ queryKey: ["analytics-user-rows"], queryFn: fetchUserRows });
  const isDark = useIsDarkMode();
  const [trendMonths, setTrendMonths] = useState("6");
  const [trendFormType, setTrendFormType] = useState("all");

  useEffect(() => {
    refreshSubmissions();
  }, [refreshSubmissions]);

  const userStats = useMemo(() => {
    const total = userRows.length;
    const activeRows = userRows.filter(u => (u.status || "active") === "active");
    const active = activeRows.length;
    const rolesOf = (u: UserRow) => [u.role, ...(u.secondary_roles || [])].filter(Boolean) as string[];
    return {
      total,
      active,
      inactive: total - active,
      activeHOS: activeRows.filter(u => rolesOf(u).includes("hos")).length,
      activeHOD: activeRows.filter(u => rolesOf(u).includes("hod")).length,
      activeAdmins: activeRows.filter(u => rolesOf(u).some(role => adminRoles.includes(role))).length,
    };
  }, [userRows]);

  const submissionStats = useMemo(() => {
    const counted = submissions.filter(s => !excludedForms.includes(s.formType));
    const gatePass = counted.filter(s => s.formType === "leave").length;
    const pettyCash = counted.filter(s => s.formType === "claim").length;
    const carBooking = counted.filter(s => s.formType === "car_rental").length;
    const itHelpDesk = counted.filter(s => s.formType === "it_help_desk").length;
    const itFacilities = counted.filter(s => s.formType === "it_facilities_requisition").length;
    const itAdmin = counted.filter(s => s.formType === "it_admin_request").length;
    const itApplication = counted.filter(s => s.formType === "it_application_request").length;
    const cctvAccess = counted.filter(s => s.formType === "cctv_access_request").length;
    const itForms = itHelpDesk + itFacilities + itAdmin + itApplication + cctvAccess;
    const total = counted.length;
    return {
      total, gatePass, pettyCash, carBooking, itHelpDesk, itFacilities, itAdmin, itApplication, cctvAccess, itForms,
      other: total - gatePass - pettyCash - carBooking - itForms,
    };
  }, [submissions]);

  const submissionTrend = useMemo(() => {
    const now = new Date();
    const range = Number(trendMonths);
    const months = Array.from({ length: range }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (range - 1 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        month: date.toLocaleDateString("en-US", { month: "short" }),
        fullMonth: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        submissions: 0,
      };
    });
    const monthMap = new Map(months.map(month => [month.key, month]));

    submissions
      .filter(submission => !excludedForms.includes(submission.formType))
      .filter(submission => trendFormType === "all" || submission.formType === trendFormType)
      .forEach(submission => {
        const submittedAt = new Date(submission.submittedAt);
        if (Number.isNaN(submittedAt.getTime())) return;
        const month = monthMap.get(`${submittedAt.getFullYear()}-${submittedAt.getMonth()}`);
        if (month) month.submissions += 1;
      });

    const current = months.at(-1)?.submissions || 0;
    const previous = months.at(-2)?.submissions || 0;
    const difference = current - previous;
    const percentage = previous > 0 ? (difference / previous) * 100 : current > 0 ? 100 : 0;
    return { months, current, difference, percentage };
  }, [submissions, trendFormType, trendMonths]);

  const trendFormOptions = [
    { value: "all", label: "All form types" },
    { value: "leave", label: "Gate Pass" },
    { value: "claim", label: "Petty Cash" },
    { value: "car_rental", label: "Car Booking" },
    { value: "it_help_desk", label: "IT Help Desk" },
    { value: "it_facilities_requisition", label: "IT Facilities" },
    { value: "it_admin_request", label: "IT Admin" },
    { value: "it_application_request", label: "IT Application" },
    { value: "cctv_access_request", label: "CCTV Access" },
  ];

  // Validated per references/palette.md: light steps clear the categorical checks
  // against the app's light card surface (#fff), dark steps against the dark card
  // surface (#11142c) — see conversation for the validate_palette.js runs. "Other" is
  // deliberately a muted neutral (not part of the 8-slot identity set): a catch-all
  // fold bucket doesn't need to carry hue identity.
  const userChartColors = isDark ? { active: "#059669", inactive: "#3b82f6" } : { active: "#10b981", inactive: "#3b82f6" };
  const submissionBarColors = isDark
    ? { gatePass: "#3b82f6", pettyCash: "#d97706", carBooking: "#6366f1", itHelpDesk: "#0d9488", itFacilities: "#f43f5e", itAdmin: "#8b5cf6", itApplication: "#0891b2", cctvAccess: "#65a30d", other: "#64748b" }
    : { gatePass: "#3b82f6", pettyCash: "#f59e0b", carBooking: "#6366f1", itHelpDesk: "#14b8a6", itFacilities: "#f43f5e", itAdmin: "#8b5cf6", itApplication: "#06b6d4", cctvAccess: "#84cc16", other: "#94a3b8" };

  const userPieData = [
    { name: "Active", value: userStats.active, color: userChartColors.active },
    { name: "Inactive", value: userStats.inactive, color: userChartColors.inactive },
  ].filter(d => d.value > 0);

  const submissionBarData = [
    { name: "Gate Pass", value: submissionStats.gatePass, color: submissionBarColors.gatePass },
    { name: "Petty Cash", value: submissionStats.pettyCash, color: submissionBarColors.pettyCash },
    { name: "Car Booking", value: submissionStats.carBooking, color: submissionBarColors.carBooking },
    { name: "IT Help Desk", value: submissionStats.itHelpDesk, color: submissionBarColors.itHelpDesk },
    { name: "IT Facilities", value: submissionStats.itFacilities, color: submissionBarColors.itFacilities },
    { name: "IT Admin", value: submissionStats.itAdmin, color: submissionBarColors.itAdmin },
    { name: "IT Application", value: submissionStats.itApplication, color: submissionBarColors.itApplication },
    { name: "CCTV Access", value: submissionStats.cctvAccess, color: submissionBarColors.cctvAccess },
    { name: "Other", value: submissionStats.other, color: submissionBarColors.other },
  ];

  const isLoadingAny = isSubmissionsLoading || isUsersLoading;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 duration-300">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of user activity and form submissions across the organization.</p>
      </div>

      {isLoadingAny ? (
        <div className="card-elevated p-12 text-center text-sm text-muted-foreground">Loading analytics…</div>
      ) : (
        <>
          {/* User Directory */}
          <section className="mb-10">
            <SectionHeader icon={Users} title="User Directory" subtitle="Account status and role coverage." />
            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <DashboardStatCard label="Total Accounts" value={userStats.total} icon={Users} tone="blue" />
              <DashboardStatCard label="Active Users" value={userStats.active} icon={UserCheck} tone="emerald" />
              <DashboardStatCard label="Inactive Users" value={userStats.inactive} icon={UserX} tone="rose" />
              <DashboardStatCard label="Active HOS" value={userStats.activeHOS} icon={ShieldCheck} tone="indigo" />
              <DashboardStatCard label="Active HOD" value={userStats.activeHOD} icon={ShieldCheck} tone="indigo" />
              <DashboardStatCard label="Administrators" value={userStats.activeAdmins} icon={ShieldCheck} tone="amber" />
            </div>

            <div className="mb-4 card-elevated p-4 sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><TrendingUp className="h-4 w-4 text-primary" /> Submission Trend</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Monthly form submissions over the last six months.</p>
                </div>
                <div className={`flex w-fit items-center gap-2 rounded-xl border px-3 py-2 ${submissionTrend.difference > 0 ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : submissionTrend.difference < 0 ? "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400" : "border-border bg-muted/30 text-muted-foreground"}`}>
                  {submissionTrend.difference > 0 ? <TrendingUp className="h-4 w-4" /> : submissionTrend.difference < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  <div>
                    <p className="text-sm font-bold">{submissionTrend.difference > 0 ? "+" : ""}{submissionTrend.percentage.toFixed(1)}%</p>
                    <p className="text-[10px] font-medium opacity-80">vs previous month</p>
                  </div>
                </div>
              </div>
              <div className="mb-5 flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/10 p-3 sm:flex-row sm:items-center">
                <span className="mr-1 text-xs font-semibold text-muted-foreground">Filter trend:</span>
                <Select value={trendFormType} onValueChange={setTrendFormType}>
                  <SelectTrigger className="h-9 w-full bg-background text-xs sm:w-[190px]" aria-label="Filter submission trend by form type"><SelectValue /></SelectTrigger>
                  <SelectContent>{trendFormOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={trendMonths} onValueChange={setTrendMonths}>
                  <SelectTrigger className="h-9 w-full bg-background text-xs sm:w-[150px]" aria-label="Select submission trend time range"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="3">Last 3 months</SelectItem><SelectItem value="6">Last 6 months</SelectItem><SelectItem value="12">Last 12 months</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={submissionTrend.months} margin={{ top: 16, right: 18, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} dy={8} />
                    <YAxis width={36} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }} itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullMonth || ""} formatter={(value: number) => [value.toLocaleString("en-US"), "Submissions"]} />
                    <Line type="monotone" dataKey="submissions" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))", strokeWidth: 2 }} activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
                <span className="text-muted-foreground">Current month</span>
                <span className="font-bold text-foreground">{submissionTrend.current.toLocaleString("en-US")} submissions <span className="ml-1 font-medium text-muted-foreground">({submissionTrend.difference >= 0 ? "+" : ""}{submissionTrend.difference})</span></span>
              </div>
            </div>

            <div className="card-elevated p-4 sm:p-6">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground"><PieChartIcon className="h-4 w-4 text-primary" /> User Status</h3>
              <div className="min-h-72">
                {userPieData.length === 0 ? (
                  <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">No user data available.</div>
                ) : (
                  <div className="flex min-h-72 flex-col items-center justify-center gap-4 md:flex-row md:gap-10">
                    <div className="h-64 w-full max-w-sm sm:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={userPieData} cx="50%" cy="50%" innerRadius={64} outerRadius={94} paddingAngle={5} dataKey="value" stroke="hsl(var(--border))" strokeWidth={1}>
                            {userPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="600">TOTAL USERS</text>
                          <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--foreground))" fontSize="16" fontWeight="700">
                            {userStats.total.toLocaleString("en-US")}
                          </text>
                          <Tooltip formatter={(value: number) => [value.toLocaleString("en-US"), "Users"]} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }} itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid w-full max-w-sm gap-3 pb-2 md:pb-0">
                      {userPieData.map(item => {
                        const percentage = userStats.total > 0 ? (item.value / userStats.total) * 100 : 0;
                        return (
                          <div key={item.name} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/10 p-3.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="truncate text-sm font-semibold text-foreground">{item.name}</span>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-foreground">{item.value.toLocaleString("en-US")}</p>
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
          </section>

          {/* Submissions */}
          <section>
            <SectionHeader icon={FileText} title="Submissions" subtitle="Form activity across HR, Finance, and Vehicle requests." />
            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              <DashboardStatCard label="Total Submissions" value={submissionStats.total} icon={FileText} tone="indigo" />
              <DashboardStatCard label="Gate Pass" value={submissionStats.gatePass} icon={DoorOpen} tone="blue" />
              <DashboardStatCard label="Petty Cash" value={submissionStats.pettyCash} icon={Wallet} tone="amber" />
              <DashboardStatCard label="Car Booking" value={submissionStats.carBooking} icon={Car} tone="indigo" />
              <DashboardStatCard label="IT Forms" value={submissionStats.itForms} icon={Layers} tone="rose" />
            </div>

            <div className="card-elevated p-4 sm:p-6">
              <h3 className="mb-6 flex items-center gap-2 text-sm font-bold text-foreground"><BarChart3 className="h-4 w-4 text-primary" /> Submissions by Form Type</h3>
              <div className="h-[380px] md:h-[420px]">
                {submissionStats.total === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No submissions recorded yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={submissionBarData} margin={{ top: 20, right: 12, left: 8, bottom: 8 }} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, angle: -40, textAnchor: "end" } as any} tickLine={false} axisLine={false} interval={0} height={64} />
                      <YAxis width={36} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: "bold" }} itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }} formatter={(value: number) => [value.toLocaleString("en-US"), "Submissions"]} />
                      <Bar dataKey="value" maxBarSize={56} radius={[4, 4, 0, 0]} label={{ position: "top", fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: "bold" }}>
                        {submissionBarData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
