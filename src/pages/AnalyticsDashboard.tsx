import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSubmissions, type Submission } from "@/contexts/SubmissionsContext";
import { supabase } from "@/supabase";
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import {
  Users, UserCheck, ShieldCheck, FileText, Building2, Workflow, Hourglass, Timer,
  TrendingUp, TrendingDown, Minus, Wallet, Gauge, CalendarClock, Download, Printer,
  RefreshCw, Activity, CheckCircle2, type LucideIcon,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ------------------------------------------------------------------ constants */

const EXCLUDED = new Set([
  "inventory_addition", "ppe_request", "ppe_purchase", "waste_inventory",
  "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring",
]);
const TERMINAL = new Set(["approved", "paid", "completed", "rejected", "voided"]);
const APPROVER_WAITING = new Set([
  "pending", "reopened", "approved_hos", "approved_hod", "approved_manco",
  "approved_hop", "approved_hof", "pending_finance_review", "pending_closure",
]);

const FORM_LABELS: Record<string, string> = {
  leave: "Gate Pass",
  claim: "Petty Cash",
  car_rental: "Car Booking",
  it_help_desk: "IT Help Desk",
  it_admin_request: "IT Admin Request",
  it_application_request: "IT Application Request",
  it_facilities_requisition: "IT Facilities (legacy)",
  cctv_access_request: "CCTV Access",
  material_requisition_slip: "Material Requisition",
  permit_to_work: "Permit to Work",
};
const formLabel = (type: string) =>
  FORM_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", reopened: "Reopened", approved_hos: "HOS approved",
  approved_hod: "HOD approved", approved_manco: "MANCO approved",
  approved_hop: "HOP approved", approved_hof: "HOF approved",
  pending_finance_review: "Finance review", pending_closure: "Pending closure",
  on_leave: "Employee out", awaiting_confirmation: "Awaiting confirmation",
  approved: "Approved", paid: "Paid", completed: "Completed",
  rejected: "Rejected", voided: "Voided",
};
const statusLabel = (s: string) => STATUS_LABELS[s] || s;

const RANGES = [
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
  { value: "6m", label: "6 months", days: 182 },
  { value: "12m", label: "12 months", days: 365 },
  { value: "all", label: "All time", days: null as number | null },
];

const DAY_MS = 86_400_000;

/* ------------------------------------------------------------------ pure helpers */

interface UserRow { id: string; status: string | null; role: string | null; secondary_roles: string[] | null }

const fetchUserRows = async (): Promise<UserRow[]> => {
  const { data, error } = await supabase.from("users").select("id, status, role, secondary_roles");
  if (error) throw error;
  return data || [];
};

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// When a submission reached a terminal state — last approval-remark timestamp,
// else the last-updated stamp, else the submission time as a floor.
const decidedAt = (submission: Submission): number | null => {
  if (!TERMINAL.has(submission.status)) return null;
  const history = Array.isArray(submission.data?.approvalRemarksHistory) ? submission.data.approvalRemarksHistory : [];
  const stamp = history.length ? history[history.length - 1]?.createdAt : null;
  const time = new Date(stamp || submission.data?.lastUpdatedAt || submission.submittedAt).getTime();
  return Number.isNaN(time) ? null : time;
};

const turnaroundDays = (submission: Submission): number | null => {
  const decided = decidedAt(submission);
  if (decided == null) return null;
  const days = (decided - new Date(submission.submittedAt).getTime()) / DAY_MS;
  return days >= 0 ? days : null;
};

// The person or team a still-open submission is currently waiting on.
const pendingOwner = (s: Submission): string | null => {
  const d = s.data || {};
  const named = (value: unknown) => (typeof value === "string" && value.trim() && value.toUpperCase() !== "N/A" ? value.trim() : null);
  switch (s.status) {
    case "pending":
      if (s.formType === "it_help_desk") return "IT Admin · team";
      if (s.formType === "permit_to_work") return "Safety Admin · team";
      if (s.formType === "material_requisition_slip") return named(d.storePicName) || "Store PIC · team";
      return named(d.hosName) || named(d.hos);
    case "reopened": return "IT Admin · team";
    case "approved_hos": return named(d.hodName) || named(d.hod);
    case "approved_hod":
      if (s.formType === "leave") return named(d.mancoMemberName) || "MANCO";
      if (s.formType === "claim") return named(d.hopName) || "Head of Purchasing";
      if (s.formType === "car_rental") return "HR Admin · team";
      return "IT Admin · team";
    case "pending_finance_review": return "Finance Admin · team";
    case "approved_hop": return named(d.hofName) || "Head of Finance";
    case "approved_hof": return "Finance Admin · team";
    case "approved_manco": return "Security · team";
    case "pending_closure": return "Safety Admin · team";
    case "on_leave": return "Security · team";
    case "awaiting_confirmation": return `${s.employeeName} (submitter)`;
    default: return null;
  }
};

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee", hos: "HOS", hod: "HOD", manco_member: "MANCO",
  hr_admin: "HR Admin", finance_admin: "Finance Admin", it_admin: "IT Admin",
  safety_admin: "Safety Admin", security_guard: "Security", store_pic: "Store PIC",
  head_of_purchasing: "Head of Purchasing", head_of_finance: "Head of Finance",
  super_admin: "Super Admin",
};

/* ------------------------------------------------------------------ chrome */

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
  <div className="mb-4 mt-2 flex items-center gap-3">
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-[18px] w-[18px]" />
    </div>
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  </div>
);

const Delta = ({ current, previous, invert = false, hide = false }: {
  current: number; previous: number; invert?: boolean; hide?: boolean;
}) => {
  if (hide) return <span className="text-[11px] font-medium text-muted-foreground">no prior period</span>;
  const diff = current - previous;
  const pct = previous !== 0 ? (diff / Math.abs(previous)) * 100 : current !== 0 ? 100 : 0;
  const flat = Math.abs(pct) < 0.05;
  const good = invert ? diff < 0 : diff > 0;
  const Icon = flat ? Minus : diff > 0 ? TrendingUp : TrendingDown;
  const tone = flat ? "text-muted-foreground" : good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${tone}`}>
      <Icon className="h-3 w-3" />
      {flat ? "0%" : `${diff > 0 ? "+" : ""}${pct.toFixed(1)}%`}
      <span className="font-medium text-muted-foreground">vs prev period</span>
    </span>
  );
};

const KPI_TONES = {
  blue: { border: "border-l-blue-500", text: "text-blue-700 dark:text-blue-400", iconBg: "bg-blue-500/15" },
  emerald: { border: "border-l-emerald-500", text: "text-emerald-700 dark:text-emerald-400", iconBg: "bg-emerald-500/15" },
  amber: { border: "border-l-amber-500", text: "text-amber-700 dark:text-amber-400", iconBg: "bg-amber-500/15" },
  indigo: { border: "border-l-indigo-500", text: "text-indigo-700 dark:text-indigo-400", iconBg: "bg-indigo-500/15" },
  rose: { border: "border-l-rose-500", text: "text-rose-700 dark:text-rose-400", iconBg: "bg-rose-500/15" },
  violet: { border: "border-l-violet-500", text: "text-violet-700 dark:text-violet-400", iconBg: "bg-violet-500/15" },
} as const;

const Kpi = ({ icon: Icon, label, value, children, tone }: {
  icon: LucideIcon; label: string; value: string; children?: React.ReactNode;
  tone: keyof typeof KPI_TONES;
}) => {
  const t = KPI_TONES[tone];
  return (
    <div className={`card-elevated border-l-4 p-4 ${t.border}`}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className={`text-[11px] font-bold uppercase tracking-wider ${t.text}`}>{label}</p>
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${t.iconBg} ${t.text}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground sm:text-[26px]">{value}</p>
      <div className="mt-1 min-h-[16px]">{children}</div>
    </div>
  );
};

const ChartCard = ({ icon: Icon, title, subtitle, action, children, className = "" }: {
  icon: LucideIcon; title: string; subtitle?: string; action?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) => (
  <figure className={`card-elevated m-0 p-4 sm:p-6 ${className}`}>
    <figcaption className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><Icon className="h-4 w-4 text-primary" /> {title}</h3>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </figcaption>
    {children}
  </figure>
);

const DataDisclosure = ({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) => (
  <details className="mt-3">
    <summary className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">View data table</summary>
    <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-border/60">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted/60 backdrop-blur">
          <tr>{columns.map(column => <th key={column} className="px-3 py-2 text-left font-semibold text-muted-foreground">{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={columns.length} className="px-3 py-3 text-center text-muted-foreground">No data</td></tr>
            : rows.map((row, i) => (
              <tr key={i} className="border-t border-border/60">
                {row.map((cell, j) => <td key={j} className="px-3 py-1.5 text-foreground">{typeof cell === "number" ? cell.toLocaleString("en-US") : cell}</td>)}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  </details>
);

const EmptyChart = ({ message }: { message: string }) => (
  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{message}</div>
);

/* ------------------------------------------------------------------ page */

const AnalyticsDashboard = () => {
  const { submissions, isLoading: isSubmissionsLoading, refreshSubmissions } = useSubmissions();
  const { data: userRows = [], isLoading: isUsersLoading, refetch: refetchUsers } =
    useQuery({ queryKey: ["analytics-user-rows"], queryFn: fetchUserRows });
  const isDark = useIsDarkMode();

  const [range, setRange] = useState("90d");
  const [trendForm, setTrendForm] = useState("all");
  const [lastSync, setLastSync] = useState(() => Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => { refreshSubmissions(); }, [refreshSubmissions]);

  useEffect(() => {
    const channel = supabase
      .channel("analytics-user-rows")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => { void refetchUsers(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refetchUsers]);

  const rangeMeta = RANGES.find(option => option.value === range) || RANGES[1];
  const isAllTime = rangeMeta.days == null;

  const rangeStart = useMemo(() => {
    if (rangeMeta.days == null) return 0;
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - rangeMeta.days);
    return date.getTime();
  }, [rangeMeta.days]);
  const prevRangeStart = rangeMeta.days == null ? 0 : rangeStart - rangeMeta.days * DAY_MS;

  const palette = useMemo(() => (isDark
    ? { green: "#059669", blue: "#3b82f6", indigo: "#6366f1", amber: "#d97706", orange: "#ea580c", rose: "#f43f5e", teal: "#0d9488", violet: "#8b5cf6", slate: "#64748b" }
    : { green: "#10b981", blue: "#3b82f6", indigo: "#6366f1", amber: "#f59e0b", orange: "#f97316", rose: "#f43f5e", teal: "#14b8a6", violet: "#8b5cf6", slate: "#94a3b8" }
  ), [isDark]);

  const tooltip = useMemo(() => ({
    contentStyle: { background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: "12px" },
    labelStyle: { color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: 700 },
    itemStyle: { color: "hsl(var(--foreground))", fontSize: "12px" },
    cursor: { fill: "hsl(var(--muted))", opacity: 0.4 },
  }), []);

  const counted = useMemo(() => submissions.filter(s => !EXCLUDED.has(s.formType)), [submissions]);
  const inRange = useMemo(
    () => counted.filter(s => new Date(s.submittedAt).getTime() >= rangeStart),
    [counted, rangeStart],
  );
  const inPrev = useMemo(() => {
    if (isAllTime) return [] as Submission[];
    return counted.filter(s => {
      const time = new Date(s.submittedAt).getTime();
      return time >= prevRangeStart && time < rangeStart;
    });
  }, [counted, isAllTime, prevRangeStart, rangeStart]);

  /* -------- KPIs -------- */
  const kpis = useMemo(() => {
    const approvedCount = (list: Submission[]) => list.filter(s => ["approved", "paid", "completed"].includes(s.status)).length;
    const decidedCount = (list: Submission[]) => list.filter(s => ["approved", "paid", "completed", "rejected"].includes(s.status)).length;
    const approvalRate = (list: Submission[]) => { const d = decidedCount(list); return d ? (approvedCount(list) / d) * 100 : 0; };
    const medianTat = (list: Submission[]) => median(list.map(turnaroundDays).filter((n): n is number => n != null));
    const approvedRinggit = (list: Submission[]) => list
      .filter(s => s.formType === "claim" && ["approved", "paid", "completed"].includes(s.status))
      .reduce((sum, s) => sum + (Number(s.data?.totalAmount) || 0), 0);

    const openNow = counted.filter(s => !TERMINAL.has(s.status));
    const overdue = openNow.filter(s => (Date.now() - new Date(s.submittedAt).getTime()) / DAY_MS >= 7).length;
    const activeUsers = userRows.filter(u => (u.status || "active") === "active").length;

    return {
      total: inRange.length, totalPrev: inPrev.length,
      rate: approvalRate(inRange), ratePrev: approvalRate(inPrev),
      tat: medianTat(inRange), tatPrev: medianTat(inPrev),
      openNow: openNow.length, overdue,
      ringgit: approvedRinggit(inRange), ringgitPrev: approvedRinggit(inPrev),
      activeUsers, totalUsers: userRows.length,
    };
  }, [counted, inRange, inPrev, userRows]);

  /* -------- trend -------- */
  const trendFormOptions = useMemo(() => {
    const present = new Set(counted.map(s => s.formType));
    return [{ value: "all", label: "All form types" },
      ...[...present].map(type => ({ value: type, label: formLabel(type) })).sort((a, b) => a.label.localeCompare(b.label))];
  }, [counted]);

  const trend = useMemo(() => {
    const now = new Date();
    const granularity = range === "30d" ? "day" : range === "90d" ? "week" : "month";
    const matches = (s: Submission) => trendForm === "all" || s.formType === trendForm;
    const list = counted.filter(matches);

    interface Bucket { label: string; current: number; start: number; end: number }
    let buckets: Bucket[] = [];

    if (granularity === "month") {
      let monthCount = range === "6m" ? 6 : range === "12m" ? 12 : 12;
      if (isAllTime && list.length) {
        const earliest = new Date(Math.min(...list.map(s => new Date(s.submittedAt).getTime())));
        monthCount = Math.min(36, (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1);
      }
      buckets = Array.from({ length: Math.max(monthCount, 1) }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - i), 1);
        return {
          label: d.toLocaleDateString("en-US", { month: "short", ...(monthCount > 12 ? { year: "2-digit" } : {}) }),
          current: 0,
          start: d.getTime(), end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
        };
      });
    } else {
      const span = granularity === "day" ? 1 : 7;
      const count = granularity === "day" ? 30 : 13;
      const todayMidnight = new Date(now); todayMidnight.setHours(0, 0, 0, 0);
      const lastEnd = todayMidnight.getTime() + DAY_MS;
      buckets = Array.from({ length: count }, (_, i) => {
        const end = lastEnd - (count - 1 - i) * span * DAY_MS;
        const start = end - span * DAY_MS;
        return {
          label: new Date(start).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
          current: 0,
          start, end,
        };
      });
    }

    for (const s of list) {
      const time = new Date(s.submittedAt).getTime();
      if (Number.isNaN(time)) continue;
      const bucket = buckets.find(b => time >= b.start && time < b.end);
      if (bucket) bucket.current += 1;
    }
    return buckets.map(({ label, current }) => ({ label, current }));
  }, [counted, range, trendForm, isAllTime]);

  /* -------- breakdowns -------- */
  const byFormType = useMemo(() => {
    const tally = new Map<string, number>();
    inRange.forEach(s => tally.set(s.formType, (tally.get(s.formType) || 0) + 1));
    return [...tally].map(([type, value]) => ({ name: formLabel(type), value })).sort((a, b) => b.value - a.value);
  }, [inRange]);

  const byDepartment = useMemo(() => {
    const tally = new Map<string, number>();
    inRange.forEach(s => {
      const dept = (s.department || "").trim() || "Unspecified";
      tally.set(dept, (tally.get(dept) || 0) + 1);
    });
    const sorted = [...tally].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (sorted.length <= 12) return sorted;
    const rest = sorted.slice(12).reduce((sum, d) => sum + d.value, 0);
    return [...sorted.slice(0, 12), { name: "Other", value: rest }];
  }, [inRange]);

  const topRequesters = useMemo(() => {
    const tally = new Map<string, number>();
    inRange.forEach(s => { const name = s.employeeName || "Unknown"; tally.set(name, (tally.get(name) || 0) + 1); });
    return [...tally].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [inRange]);

  /* -------- workflow health (live snapshot, not range-bound) -------- */
  const pipeline = useMemo(() => {
    const open = counted.filter(s => !TERMINAL.has(s.status));
    const bucket = (statuses: string[]) => open.filter(s => statuses.includes(s.status)).length;
    return [
      { name: "Awaiting 1st approval", value: bucket(["pending", "reopened"]), color: palette.amber },
      { name: "With HOD", value: bucket(["approved_hos"]), color: palette.blue },
      { name: "With MANCO / HOP", value: bucket(["approved_hod"]), color: palette.indigo },
      { name: "Finance / Purchasing", value: bucket(["approved_manco", "approved_hop", "approved_hof", "pending_finance_review"]), color: palette.teal },
      { name: "Final step / confirm", value: bucket(["on_leave", "awaiting_confirmation", "pending_closure"]), color: palette.green },
    ];
  }, [counted, palette]);

  const aging = useMemo(() => {
    const open = counted.filter(s => APPROVER_WAITING.has(s.status));
    const buckets = [
      { name: "0–1 days", min: 0, max: 1, value: 0, color: palette.green },
      { name: "1–3 days", min: 1, max: 3, value: 0, color: palette.amber },
      { name: "3–7 days", min: 3, max: 7, value: 0, color: palette.orange },
      { name: "7+ days", min: 7, max: Infinity, value: 0, color: palette.rose },
    ];
    open.forEach(s => {
      const age = (Date.now() - new Date(s.submittedAt).getTime()) / DAY_MS;
      if (Number.isNaN(age)) return;
      const bucket = buckets.find(b => age >= b.min && age < b.max);
      if (bucket) bucket.value += 1;
    });
    return { buckets, total: buckets.reduce((sum, b) => sum + b.value, 0) };
  }, [counted, palette]);

  const turnaroundByType = useMemo(() => {
    const groups = new Map<string, number[]>();
    inRange.forEach(s => {
      const days = turnaroundDays(s);
      if (days == null) return;
      if (!groups.has(s.formType)) groups.set(s.formType, []);
      groups.get(s.formType)!.push(days);
    });
    return [...groups]
      .map(([type, values]) => ({ name: formLabel(type), value: Number(median(values).toFixed(1)), count: values.length }))
      .sort((a, b) => b.value - a.value);
  }, [inRange]);

  const outcomes = useMemo(() => {
    const groups = new Map<string, { approved: number; inProgress: number; rejected: number; voided: number }>();
    inRange.forEach(s => {
      if (!groups.has(s.formType)) groups.set(s.formType, { approved: 0, inProgress: 0, rejected: 0, voided: 0 });
      const g = groups.get(s.formType)!;
      if (["approved", "paid", "completed"].includes(s.status)) g.approved += 1;
      else if (s.status === "rejected") g.rejected += 1;
      else if (s.status === "voided") g.voided += 1;
      else g.inProgress += 1;
    });
    return [...groups]
      .map(([type, g]) => ({ name: formLabel(type), ...g, total: g.approved + g.inProgress + g.rejected + g.voided }))
      .sort((a, b) => b.total - a.total);
  }, [inRange]);

  const approverWorkload = useMemo(() => {
    const tally = new Map<string, number>();
    counted.filter(s => !TERMINAL.has(s.status)).forEach(s => {
      const owner = pendingOwner(s);
      if (owner) tally.set(owner, (tally.get(owner) || 0) + 1);
    });
    return [...tally].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 12);
  }, [counted]);

  const roleCoverage = useMemo(() => {
    const tally = new Map<string, number>();
    userRows.filter(u => (u.status || "active") === "active").forEach(u => {
      const roles = new Set([u.role, ...(u.secondary_roles || [])].filter(Boolean) as string[]);
      roles.forEach(role => tally.set(role, (tally.get(role) || 0) + 1));
    });
    return [...tally]
      .map(([role, value]) => ({ name: ROLE_LABELS[role] || role, value }))
      .sort((a, b) => b.value - a.value);
  }, [userRows]);

  /* -------- activity heatmap -------- */
  const heatmap = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0) as number[]);
    inRange.forEach(s => {
      const date = new Date(s.submittedAt);
      if (Number.isNaN(date.getTime())) return;
      grid[(date.getDay() + 6) % 7][date.getHours()] += 1; // Monday = 0
    });
    const max = Math.max(1, ...grid.flat());
    return { grid, max, total: grid.flat().reduce((a, b) => a + b, 0) };
  }, [inRange]);

  /* -------- actions -------- */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshSubmissions(), refetchUsers()]);
    setLastSync(Date.now());
    setIsRefreshing(false);
  };

  const handleExport = () => {
    const header = ["Reference", "Form", "Employee", "Department", "Status", "Submitted", "Decided", "Turnaround (days)"];
    const body = [...inRange]
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
      .map(s => {
        const decided = decidedAt(s);
        return [
          s.data?.refNo || s.id,
          formLabel(s.formType),
          s.employeeName,
          s.department || "",
          statusLabel(s.status),
          new Date(s.submittedAt).toLocaleString("en-GB"),
          decided ? new Date(decided).toLocaleString("en-GB") : "",
          turnaroundDays(s)?.toFixed(1) ?? "",
        ];
      });
    const csv = [header, ...body]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics_${range}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isLoadingAny = isSubmissionsLoading || isUsersLoading;
  const heatHue = isDark ? "96, 165, 250" : "37, 99, 235";
  const hourTicks = [0, 3, 6, 9, 12, 15, 18, 21];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (isLoadingAny) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse p-6 lg:p-8">
        <div className="mb-6 h-8 w-40 rounded bg-muted" />
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[340px] rounded-xl bg-muted" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl overflow-x-clip p-6 pt-4 lg:p-8 lg:pt-4">
      {/* Sticky control bar */}
      <div className="sticky top-16 z-30 -mx-6 mb-6 border-b border-border bg-background/85 px-6 py-3 backdrop-blur lg:-mx-8 lg:px-8 print:static print:border-0 print:bg-transparent print:px-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">Analytics</h1>
            <p className="text-xs text-muted-foreground">
              {inRange.length.toLocaleString("en-US")} submissions in view · updated {new Date(lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
              {RANGES.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${range === option.value ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={handleRefresh} disabled={isRefreshing} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60" aria-label="Refresh data">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button type="button" onClick={handleExport} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted" aria-label="Export CSV">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted" aria-label="Print">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={FileText} label="Submissions" tone="indigo" value={kpis.total.toLocaleString("en-US")}>
          <Delta current={kpis.total} previous={kpis.totalPrev} hide={isAllTime} />
        </Kpi>
        <Kpi icon={Gauge} label="Approval rate" tone="emerald" value={`${kpis.rate.toFixed(0)}%`}>
          <Delta current={kpis.rate} previous={kpis.ratePrev} hide={isAllTime || !kpis.ratePrev} />
        </Kpi>
        <Kpi icon={Timer} label="Median turnaround" tone="blue" value={kpis.tat ? `${kpis.tat.toFixed(1)}d` : "—"}>
          <Delta current={kpis.tat} previous={kpis.tatPrev} invert hide={isAllTime || !kpis.tat || !kpis.tatPrev} />
        </Kpi>
        <Kpi icon={Hourglass} label="Open now" tone="amber" value={kpis.openNow.toLocaleString("en-US")}>
          <span className={`text-[11px] font-bold ${kpis.overdue ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>{kpis.overdue} over 7 days</span>
        </Kpi>
        <Kpi icon={Wallet} label="Petty cash approved" tone="violet" value={`RM ${kpis.ringgit.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}>
          <Delta current={kpis.ringgit} previous={kpis.ringgitPrev} hide={isAllTime || !kpis.ringgitPrev} />
        </Kpi>
        <Kpi icon={UserCheck} label="Active users" tone="rose" value={kpis.activeUsers.toLocaleString("en-US")}>
          <span className="text-[11px] font-medium text-muted-foreground">of {kpis.totalUsers} total</span>
        </Kpi>
      </div>

      {/* ---- Submissions ---- */}
      <SectionHeader icon={Activity} title="Submission Activity" subtitle={`Volume and mix over the selected ${isAllTime ? "history" : "period"}.`} />

      <ChartCard
        icon={TrendingUp}
        title="Submission Volume"
        subtitle={range === "30d" ? "Submissions per day." : range === "90d" ? "Submissions per week." : "Submissions per month."}
        className="mb-4"
        action={
          <Select value={trendForm} onValueChange={setTrendForm}>
            <SelectTrigger className="h-9 w-[170px] bg-background text-xs" aria-label="Filter trend by form type"><SelectValue /></SelectTrigger>
            <SelectContent>{trendFormOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        }
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} dy={8} interval="preserveStartEnd" />
              <YAxis width={36} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltip} formatter={(value: number) => [value.toLocaleString("en-US"), "Submissions"]} />
              <Area type="monotone" dataKey="current" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#trendFill)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <DataDisclosure columns={["Period", "Submissions"]} rows={trend.map(b => [b.label, b.current])} />
      </ChartCard>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard icon={FileText} title="By Form Type" subtitle="Submissions in the selected period.">
          <div className="h-[320px]">
            {byFormType.length === 0 ? <EmptyChart message="No submissions in this period." /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byFormType} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                  <Tooltip {...tooltip} formatter={(value: number) => [value.toLocaleString("en-US"), "Submissions"]} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" maxBarSize={22} radius={[0, 4, 4, 0]} label={{ position: "right", fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 700 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <DataDisclosure columns={["Form type", "Submissions"]} rows={byFormType.map(d => [d.name, d.value])} />
        </ChartCard>

        <ChartCard icon={Building2} title="By Department" subtitle="Which teams generate the most form activity.">
          <div className="h-[320px]">
            {byDepartment.length === 0 ? <EmptyChart message="No submissions in this period." /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDepartment} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                  <Tooltip {...tooltip} formatter={(value: number) => [value.toLocaleString("en-US"), "Submissions"]} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" maxBarSize={22} radius={[0, 4, 4, 0]} label={{ position: "right", fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 700 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <DataDisclosure columns={["Department", "Submissions"]} rows={byDepartment.map(d => [d.name, d.value])} />
        </ChartCard>
      </div>

      <ChartCard icon={CalendarClock} title="Activity Heatmap" subtitle="When submissions are created — local time, by weekday and hour." className="mb-4">
        {heatmap.total === 0 ? <div className="h-24"><EmptyChart message="No submissions in this period." /></div> : (
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid" style={{ gridTemplateColumns: "34px repeat(24, 1fr)" }}>
                <div />
                {Array.from({ length: 24 }).map((_, hour) => (
                  <div key={hour} className="pb-1 text-center text-[9px] text-muted-foreground">{hourTicks.includes(hour) ? `${hour}` : ""}</div>
                ))}
                {heatmap.grid.map((row, dayIndex) => (
                  <div key={dayIndex} className="contents">
                    <div className="pr-2 text-right text-[10px] font-medium leading-6 text-muted-foreground">{dayNames[dayIndex]}</div>
                    {row.map((count, hour) => (
                      <div
                        key={hour}
                        title={`${dayNames[dayIndex]} ${String(hour).padStart(2, "0")}:00 — ${count} submission${count === 1 ? "" : "s"}`}
                        className="m-[1px] h-5 rounded-[3px] border border-border/40"
                        style={{ background: count === 0 ? "transparent" : `rgba(${heatHue}, ${0.12 + 0.88 * (count / heatmap.max)})` }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
                Less
                {[0, 0.25, 0.5, 0.75, 1].map(step => (
                  <span key={step} className="h-3 w-3 rounded-[3px] border border-border/40" style={{ background: step === 0 ? "transparent" : `rgba(${heatHue}, ${0.12 + 0.88 * step})` }} />
                ))}
                More
              </div>
            </div>
          </div>
        )}
      </ChartCard>

      {/* ---- Workflow health ---- */}
      <SectionHeader icon={Workflow} title="Workflow Health" subtitle="Live snapshot of the approval pipeline — not limited to the selected period." />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard icon={Workflow} title="Approval Pipeline" subtitle="Where every open submission currently sits.">
          <div className="h-[280px]">
            {pipeline.every(stage => stage.value === 0) ? <EmptyChart message="Nothing is in progress." /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipeline} layout="vertical" margin={{ top: 4, right: 44, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={128} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                  <Tooltip {...tooltip} formatter={(value: number) => [value.toLocaleString("en-US"), "Open"]} />
                  <Bar dataKey="value" maxBarSize={24} radius={[0, 4, 4, 0]} label={{ position: "right", fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 700 }}>
                    {pipeline.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <DataDisclosure columns={["Stage", "Open"]} rows={pipeline.map(s => [s.name, s.value])} />
        </ChartCard>

        <ChartCard
          icon={Hourglass}
          title="Pending Request Age"
          subtitle="How long requests waiting on an approver have been open."
          action={<div className="shrink-0 rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5 text-right"><p className="text-sm font-bold text-foreground">{aging.total}</p><p className="text-[10px] text-muted-foreground">waiting</p></div>}
        >
          <div className="h-[280px]">
            {aging.total === 0 ? <EmptyChart message="Nothing is waiting for approval." /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aging.buckets} margin={{ top: 20, right: 12, left: 8, bottom: 4 }} barCategoryGap="24%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} dy={6} />
                  <YAxis width={36} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...tooltip} formatter={(value: number) => [value.toLocaleString("en-US"), "Requests"]} />
                  <Bar dataKey="value" maxBarSize={64} radius={[4, 4, 0, 0]} label={{ position: "top", fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 700 }}>
                    {aging.buckets.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard icon={Timer} title="Median Turnaround by Form Type" subtitle="Submit → final decision, for items decided in the period.">
          <div className="h-[300px]">
            {turnaroundByType.length === 0 ? <EmptyChart message="Nothing was decided in this period." /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={turnaroundByType} layout="vertical" margin={{ top: 4, right: 52, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="d" />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                  <Tooltip {...tooltip} formatter={(value: number, _n, item) => [`${value} days (n=${item?.payload?.count ?? 0})`, "Median"]} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" maxBarSize={22} radius={[0, 4, 4, 0]} label={{ position: "right", fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 700, formatter: (v: number) => `${v}d` }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <DataDisclosure columns={["Form type", "Median days", "Decided"]} rows={turnaroundByType.map(d => [d.name, d.value, d.count])} />
        </ChartCard>

        <ChartCard icon={CheckCircle2} title="Outcomes by Form Type" subtitle="Approved / in progress / rejected / voided, in the period.">
          <div className="h-[300px]">
            {outcomes.length === 0 ? <EmptyChart message="No submissions in this period." /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outcomes} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                  <Tooltip {...tooltip} />
                  <Legend verticalAlign="top" height={28} iconType="circle" formatter={label => <span className="text-xs text-muted-foreground">{label}</span>} />
                  <Bar dataKey="approved" stackId="o" name="Approved" fill={palette.green} maxBarSize={22} />
                  <Bar dataKey="inProgress" stackId="o" name="In progress" fill={palette.blue} maxBarSize={22} />
                  <Bar dataKey="rejected" stackId="o" name="Rejected" fill={palette.rose} maxBarSize={22} />
                  <Bar dataKey="voided" stackId="o" name="Voided" fill={palette.slate} maxBarSize={22} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <DataDisclosure columns={["Form type", "Approved", "In progress", "Rejected", "Voided"]} rows={outcomes.map(d => [d.name, d.approved, d.inProgress, d.rejected, d.voided])} />
        </ChartCard>
      </div>

      <ChartCard icon={UserCheck} title="Approver Workload" subtitle="Open submissions currently sitting with each approver or team." className="mb-4">
        <div style={{ height: Math.max(160, approverWorkload.length * 34 + 16) }}>
          {approverWorkload.length === 0 ? <div className="h-24"><EmptyChart message="No open submissions." /></div> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={approverWorkload} layout="vertical" margin={{ top: 4, right: 44, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                <Tooltip {...tooltip} formatter={(value: number) => [value.toLocaleString("en-US"), "Open items"]} />
                <Bar dataKey="value" fill="hsl(var(--primary))" maxBarSize={20} radius={[0, 4, 4, 0]} label={{ position: "right", fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 700 }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <DataDisclosure columns={["Approver / team", "Open items"]} rows={approverWorkload.map(d => [d.name, d.value])} />
      </ChartCard>

      {/* ---- People ---- */}
      <SectionHeader icon={Users} title="People" subtitle="Directory coverage and who is driving form volume." />

      <div className="mb-2 grid gap-4 lg:grid-cols-2">
        <ChartCard icon={ShieldCheck} title="Role Coverage" subtitle="Active accounts holding each role (primary or secondary).">
          <div style={{ height: Math.max(180, roleCoverage.length * 32 + 16) }}>
            {roleCoverage.length === 0 ? <div className="h-24"><EmptyChart message="No user data." /></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleCoverage} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                  <Tooltip {...tooltip} formatter={(value: number) => [value.toLocaleString("en-US"), "Active users"]} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" maxBarSize={20} radius={[0, 4, 4, 0]} label={{ position: "right", fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 700 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <DataDisclosure columns={["Role", "Active users"]} rows={roleCoverage.map(d => [d.name, d.value])} />
        </ChartCard>

        <ChartCard icon={FileText} title="Top Requesters" subtitle="Most submissions in the selected period.">
          <div style={{ height: Math.max(180, topRequesters.length * 32 + 16) }}>
            {topRequesters.length === 0 ? <div className="h-24"><EmptyChart message="No submissions in this period." /></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRequesters} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                  <Tooltip {...tooltip} formatter={(value: number) => [value.toLocaleString("en-US"), "Submissions"]} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" maxBarSize={20} radius={[0, 4, 4, 0]} label={{ position: "right", fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 700 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <DataDisclosure columns={["Employee", "Submissions"]} rows={topRequesters.map(d => [d.name, d.value])} />
        </ChartCard>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
