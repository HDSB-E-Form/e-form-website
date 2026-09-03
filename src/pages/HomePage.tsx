import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers } from "@/contexts/UsersContext";
import { useHiddenSubmissions } from "./useHiddenSubmissions";
import { Users, DollarSign, FileText, FileCheck2, XCircle, FileX2, ShieldCheck, IdCard, Briefcase, Megaphone, X, MonitorCog, Warehouse } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/supabase";
import { useStoreDepartmentAccess } from "@/hooks/useStoreDepartmentAccess";

interface HomePosterConfig {
  enabled: boolean;
  url: string | null;
  version?: string;
}

const HomePageSkeleton = () => (
  <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 duration-300" aria-busy="true" aria-live="polite">
    <Skeleton className="mb-8 h-56 w-full rounded-2xl" />
    <Skeleton className="mb-2 h-7 w-48" />
    <Skeleton className="mb-5 h-4 w-72 max-w-full" />
    <div className="grid gap-6 md:grid-cols-2">
      {[0, 1, 2, 3].map(item => <Skeleton key={item} className="h-56 w-full rounded-2xl" />)}
    </div>
  </div>
);

const roleLabels: Record<string, string> = {
  employee: "Employee", hos: "HOS", hod: "HOD", hr_admin: "HR Admin",
  finance_admin: "Finance Admin", it_admin: "IT Admin", safety_admin: "Safety Admin",
  security_guard: "Security Guard", head_of_purchasing: "Head of Purchasing",
  head_of_finance: "Head of Finance", super_admin: "Super Admin",
  manco_member: "Manco Member",
};

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { submissions, announcements, refreshSubmissions, isLoading: areSubmissionsLoading } = useSubmissions();
  const { refreshUsers, isLoading: areUsersLoading } = useUsers();
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [isPreparingForms, setIsPreparingForms] = useState(false);
  const [homePoster, setHomePoster] = useState<HomePosterConfig>({ enabled: false, url: null });
  const [showHomePoster, setShowHomePoster] = useState(false);
  const { hiddenIds } = useHiddenSubmissions();
  const { hasAccess: hasStoreAccess } = useStoreDepartmentAccess();
  const displayedRole = user
    ? Array.from(new Set([user.role, ...(user.secondary_roles || [])])).map(role => roleLabels[role] || role.replace(/_/g, " ")).join(" + ")
    : "Staff";

  const activeAnnouncement = useMemo(() => {
    return (announcements || []).find(a => a.is_active);
  }, [announcements]);

  useEffect(() => {
    let isMounted = true;
    void supabase
      .from("safety_dashboard_settings")
      .select("value")
      .eq("key", "home_poster")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error("Could not load the Home poster:", error);
          return;
        }

        const config = (data?.value || { enabled: false, url: null }) as HomePosterConfig;
        setHomePoster(config);
        if (!config.enabled || !config.url) return;

        const posterIdentity = config.version || config.url;
        const seenKey = `hdsb_home_poster_seen_${posterIdentity}`;
        if (sessionStorage.getItem(seenKey) !== "true") {
          setShowHomePoster(true);
          sessionStorage.setItem(seenKey, "true");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);
  
  const getInitials = (name?: string) =>
    (name || " ").split(" ").map(n => n ? n[0] : "").join("").toUpperCase().slice(0, 2);

  const excludedForms = ["inventory_addition", "ppe_request", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"];

  const mySubmissions = submissions.filter(s => s.submittedBy === user?.id && !excludedForms.includes(s.formType) && !hiddenIds.has(s.id));
  const stats = {
    total: mySubmissions.length,
    accepted: mySubmissions.filter(s => ["approved", "completed", "paid"].includes(s.status)).length,
    rejected: mySubmissions.filter(s => s.status === "rejected").length,
  };

  const allDepartments = [
    {
      id: "hr",
      title: "Human Resource Department",
      description: "Car Booking requests, Gate Pass, PPE Items and more.",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      iconColor: "text-white",
      path: "/hr",
    },
    {
      id: "finance",
      title: "Finance Department",
      description: "Submit Petty Cash claims and reimbursements.",
      icon: DollarSign,
      color: "from-accent to-accent/80",
      iconColor: "text-accent-foreground",
      path: "/finance",
    },
    {
      id: "safety",
      title: "Safety Department",
      description: "Raise a Permit to Work for contractor jobs, plus Safety monitoring records.",
      icon: ShieldCheck,
      color: "from-red-500 to-red-600",
      iconColor: "text-white",
      path: "/safety",
    },
    {
      id: "it",
      title: "IT Department",
      description: "Submit CCTV access requests and other IT service forms.",
      icon: MonitorCog,
      color: "from-violet-500 to-violet-600",
      iconColor: "text-white",
      path: "/it",
    },
    {
      id: "store",
      title: "Store Department",
      description: "Submit Material Requisition Slip and other store requests.",
      icon: Warehouse,
      color: "from-amber-500 to-amber-600",
      iconColor: "text-white",
      path: "/store",
    },
  ];

  const departments = useMemo(() => {
    let depts = [...allDepartments];
    const effectiveRoles = [user?.role, ...(user?.secondary_roles || [])];
    const hasSafetyAccess = effectiveRoles.includes("safety_admin") || effectiveRoles.includes("super_admin");

    // Prioritize Safety for both primary and additional Safety Admin roles.
    if (hasSafetyAccess) {
      const safetyIndex = depts.findIndex(d => d.id === 'safety');
      if (safetyIndex > 0) {
        const [safetyDept] = depts.splice(safetyIndex, 1);
        depts.unshift(safetyDept);
      }
    }

    // Filter out departments the user shouldn't see. The Safety Department card is
    // visible to everyone now — the Permit to Work form is open to all staff, while
    // the record forms behind it stay gated inside the page itself.
    return depts.filter(dept => {
      if (dept.id === 'store') return hasStoreAccess;
      return true;
    });
  }, [user?.role, user?.secondary_roles, hasStoreAccess]);

  const handleDepartmentOpen = async (path: string) => {
    if (isPreparingForms) return;
    setIsPreparingForms(true);
    await Promise.all([refreshUsers(), refreshSubmissions()]);
    if (path === "/safety") {
      sessionStorage.removeItem("hdsb_safety_poster_seen");
    }
    navigate(path);
  };

  if (areUsersLoading || areSubmissionsLoading || isPreparingForms) return <HomePageSkeleton />;

  return (
    <>
      {showHomePoster && homePoster.url && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-300 sm:p-6"
          onClick={() => setShowHomePoster(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Company information poster"
        >
          <div className="relative flex max-h-[90vh] w-full max-w-3xl items-center justify-center animate-in zoom-in-95 duration-300" onClick={event => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowHomePoster(false)}
              className="absolute -right-2 -top-2 z-10 rounded-full border border-white/20 bg-black/65 p-1.5 text-white/80 shadow-lg transition-colors hover:bg-black/85 hover:text-white sm:-right-4 sm:-top-4"
              aria-label="Close poster"
              title="Close poster"
            >
              <XCircle className="h-8 w-8" />
            </button>
            <img src={homePoster.url} alt="Company information poster" className="max-h-[88vh] w-auto max-w-full rounded-2xl border border-white/15 object-contain shadow-2xl" />
          </div>
        </div>
      )}

      <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 slide-in-from-bottom-2 duration-500">
      {/* Global Announcement Banner */}
      {activeAnnouncement && isAnnouncementVisible && (
        <div className="relative mb-6 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 pr-12 shadow-sm dark:bg-blue-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Megaphone className="h-4 w-4" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">Announcement</p>
              <p className="text-sm font-medium leading-relaxed text-foreground">{activeAnnouncement.content}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAnnouncementVisible(false)}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-blue-500/15 hover:text-foreground"
            title="Dismiss announcement"
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* User Profile Card */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-lg shadow-primary/5">
        {/* Digital network background */}
        <svg
          aria-hidden="true"
          viewBox="0 0 620 330"
          preserveAspectRatio="none"
          className="pointer-events-none absolute left-0 top-0 hidden h-full w-[62%] sm:block"
          style={{ maskImage: "linear-gradient(to right, black 0%, black 72%, transparent 100%)", WebkitMaskImage: "linear-gradient(to right, black 0%, black 72%, transparent 100%)" }}
          fill="none"
        >
          <defs>
            <linearGradient id="profile-network-line" x1="0" y1="0" x2="1200" y2="250" gradientUnits="userSpaceOnUse">
              <stop stopColor="hsl(var(--primary))" stopOpacity="0.24" />
              <stop offset="0.38" stopColor="hsl(var(--primary))" stopOpacity="0.11" />
              <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.045" />
            </linearGradient>
            <filter id="profile-network-node-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g stroke="url(#profile-network-line)" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            <path d="M0 82L36 44L82 67L51 118L94 151L56 192L113 218L157 176L188 222" />
            <path d="M36 44L51 118M82 67L51 118L94 151M56 192L94 151L113 218M113 218L157 176" />
            <path d="M82 67L132 31L171 73L142 126L201 145L229 96L278 124L322 75L367 112" />
            <path d="M132 31L142 126M171 73L142 126L201 145M201 145L229 96L278 124M229 96L322 75M278 124L322 75L367 112" />
            <path d="M157 176L217 204L278 172L337 211L403 177L464 219L530 184L596 226" />
            <path d="M188 222L217 204M278 124L278 172M337 211L367 112M403 177L367 112M464 219L495 145M530 184L495 145" />
            <path d="M367 112L432 82L495 145L403 177L367 112M432 82L403 177M495 145L536 112L575 91L612 138L530 184L495 145M536 112L612 138M575 91L660 46L704 112L612 138M612 138L628 166L684 220L704 112M660 46L704 112L735 88" />
            <path d="M735 88L782 135L756 174L704 112M782 135L815 57L862 98L826 205L782 135M756 174L826 205M862 98L892 110L948 122L914 154L862 98M914 154L826 205M892 110L977 72L1032 88L948 122M948 122L1004 198L914 154M1032 88L1058 134L1092 151L1004 198M1032 88L1128 126L1058 134M1128 126L1198 88L1198 188L1092 151L1128 126" />
            <path d="M157 176L214 226L278 172L337 211L403 177M214 226L288 270L361 232L403 177M278 172L361 232M361 232L438 275L514 236L530 184M438 275L548 292L606 286L628 166M514 236L606 286L684 220M684 220L733 304L781 268L756 174M781 268L834 264L826 205M834 264L934 276L914 154M934 276L1004 198L1042 270L1092 151M1042 270L1134 299L1198 188" opacity="0.48" />
          </g>
          <g className="fill-cyan-600 dark:fill-cyan-300">
            <circle cx="36" cy="44" r="1.7" opacity="0.45" />
            <circle cx="82" cy="67" r="2.2" opacity="0.7" filter="url(#profile-network-node-glow)" />
            <circle cx="51" cy="118" r="1.8" opacity="0.55" />
            <circle cx="94" cy="151" r="2.4" opacity="0.75" filter="url(#profile-network-node-glow)" />
            <circle cx="56" cy="192" r="1.5" opacity="0.4" />
            <circle cx="113" cy="218" r="1.8" opacity="0.5" />
            <circle cx="132" cy="31" r="1.5" opacity="0.4" />
            <circle cx="171" cy="73" r="2" opacity="0.6" />
            <circle cx="142" cy="126" r="2.2" opacity="0.65" />
            <circle cx="201" cy="145" r="1.8" opacity="0.5" />
            <circle cx="229" cy="96" r="1.6" opacity="0.42" />
            <circle cx="278" cy="124" r="1.8" opacity="0.45" />
            <circle cx="322" cy="75" r="1.5" opacity="0.35" />
            <circle cx="367" cy="112" r="1.8" opacity="0.4" />
            <circle cx="403" cy="177" r="1.4" opacity="0.3" />
            <circle cx="432" cy="82" r="1.5" opacity="0.3" />
            <circle cx="495" cy="145" r="1.7" opacity="0.35" />
            <circle cx="536" cy="112" r="1.3" opacity="0.24" />
            <circle cx="575" cy="91" r="1.4" opacity="0.25" />
            <circle cx="612" cy="138" r="1.7" opacity="0.32" />
            <circle cx="660" cy="46" r="1.5" opacity="0.27" />
            <circle cx="684" cy="220" r="1.7" opacity="0.3" />
            <circle cx="704" cy="112" r="1.4" opacity="0.25" />
            <circle cx="735" cy="88" r="1.3" opacity="0.22" />
            <circle cx="756" cy="174" r="1.4" opacity="0.22" />
            <circle cx="782" cy="135" r="1.6" opacity="0.27" />
            <circle cx="815" cy="57" r="1.6" opacity="0.26" />
            <circle cx="826" cy="205" r="1.4" opacity="0.22" />
            <circle cx="862" cy="98" r="1.7" opacity="0.28" />
            <circle cx="914" cy="154" r="1.4" opacity="0.2" />
            <circle cx="948" cy="122" r="1.5" opacity="0.23" />
            <circle cx="1004" cy="198" r="1.6" opacity="0.23" />
            <circle cx="1032" cy="88" r="1.4" opacity="0.2" />
            <circle cx="1058" cy="134" r="1.4" opacity="0.2" />
            <circle cx="1092" cy="151" r="1.5" opacity="0.2" />
            <circle cx="1128" cy="126" r="1.3" opacity="0.18" />
            <circle cx="1109" cy="253" r="1.5" opacity="0.21" />
            <circle cx="143" cy="259" r="1.3" opacity="0.2" />
            <circle cx="288" cy="270" r="1.4" opacity="0.22" />
            <circle cx="438" cy="275" r="1.3" opacity="0.19" />
            <circle cx="592" cy="281" r="1.4" opacity="0.21" />
            <circle cx="751" cy="286" r="1.3" opacity="0.18" />
            <circle cx="913" cy="289" r="1.4" opacity="0.2" />
            <circle cx="1083" cy="294" r="1.3" opacity="0.17" />
          </g>
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 360 360"
          preserveAspectRatio="none"
          className="pointer-events-none absolute left-0 top-0 h-[58%] w-full sm:hidden"
          style={{ maskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)" }}
          fill="none"
        >
          <g stroke="hsl(var(--primary))" strokeOpacity="0.13" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            <path d="M0 74L38 35L81 61L52 113L97 146L61 190L112 219L154 181L198 224L246 188L302 229L359 197" />
            <path d="M38 35L52 113M81 61L52 113L97 146M61 190L97 146L112 219M112 219L154 181M154 181L198 224M198 224L246 188M246 188L302 229" />
            <path d="M0 362L54 322L108 369L166 331L222 383L283 342L360 391" opacity="0.55" />
            <path d="M0 438L51 407L105 449L161 414L218 458L278 421L360 466" opacity="0.42" />
            <path d="M18 515L78 474L142 526L207 482L271 538L344 493" opacity="0.35" />
          </g>
          <g className="fill-cyan-600 dark:fill-cyan-300">
            <circle cx="38" cy="35" r="1.6" opacity="0.35" />
            <circle cx="81" cy="61" r="2" opacity="0.55" />
            <circle cx="52" cy="113" r="1.8" opacity="0.45" />
            <circle cx="97" cy="146" r="2.2" opacity="0.6" />
            <circle cx="61" cy="190" r="1.5" opacity="0.32" />
            <circle cx="112" cy="219" r="1.7" opacity="0.38" />
            <circle cx="198" cy="224" r="1.5" opacity="0.28" />
            <circle cx="54" cy="322" r="1.4" opacity="0.22" />
            <circle cx="166" cy="331" r="1.5" opacity="0.24" />
            <circle cx="283" cy="342" r="1.4" opacity="0.2" />
            <circle cx="105" cy="449" r="1.3" opacity="0.2" />
            <circle cx="218" cy="458" r="1.4" opacity="0.22" />
            <circle cx="278" cy="421" r="1.3" opacity="0.18" />
            <circle cx="142" cy="526" r="1.4" opacity="0.18" />
            <circle cx="271" cy="538" r="1.3" opacity="0.16" />
          </g>
        </svg>

        {/* Main content, positioned above the decorative elements */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0 pb-3">
            <div className="relative z-10 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-gradient-to-br from-primary via-blue-500 to-cyan-400 p-0.5 shadow-lg shadow-primary/15">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[1.5px] border-white bg-muted/70 text-3xl font-bold text-primary dark:border-background">
                {user?.avatar ? (
                  <img src={user.avatar} alt={`${user?.name || "User"} profile`} className="h-full w-full object-cover" />
                ) : (
                  getInitials(user?.name)
                )}
              </div>
            </div>
            <div className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary shadow-md">
              <ShieldCheck className="h-3 w-3" />
              <span>{displayedRole}</span>
            </div>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-semibold text-muted-foreground">Welcome back,</h2>
            <h1 className="text-3xl font-bold text-foreground -mt-1">{user?.name || "User"}</h1>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <IdCard className="h-4 w-4 text-primary/80" />
                <span>Staff ID: {user?.employeeId || "N/A"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-primary/80" />
                <span>{user?.department || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions Overview Dashboard */}
        <div className="relative z-10 mt-5 flex justify-center sm:justify-end">
          <div className="grid grid-cols-3 items-center divide-x divide-border/60">
            <button type="button" onClick={() => navigate("/submissions")} aria-label="View total submissions" className="flex items-center gap-2 rounded-md border-l border-border/60 px-2 text-left transition-all duration-200 hover:-translate-y-px hover:bg-background/55 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transform-none motion-reduce:transition-none min-[360px]:px-3">
              <FileText className="h-3.5 w-3.5 text-primary/75 max-[359px]:hidden" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="text-lg font-bold leading-none tabular-nums text-foreground">{stats.total}</p>
              </div>
            </button>
            <button type="button" onClick={() => navigate("/submissions")} aria-label="View accepted submissions" className="flex items-center gap-2 rounded-md px-2 text-left transition-all duration-200 hover:-translate-y-px hover:bg-background/55 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 motion-reduce:transform-none motion-reduce:transition-none min-[360px]:px-3">
              <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 max-[359px]:hidden dark:text-emerald-400" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Accepted</p>
                <p className="text-lg font-bold leading-none tabular-nums text-foreground">{stats.accepted}</p>
              </div>
            </button>
            <button type="button" onClick={() => navigate("/submissions")} aria-label="View rejected submissions" className="flex items-center gap-2 rounded-md px-2 text-left transition-all duration-200 hover:-translate-y-px hover:bg-background/55 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 motion-reduce:transform-none motion-reduce:transition-none min-[360px]:px-3">
              <FileX2 className="h-3.5 w-3.5 text-destructive max-[359px]:hidden dark:text-red-400" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Rejected</p>
                <p className="text-lg font-bold leading-none tabular-nums text-foreground">{stats.rejected}</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground">Submit a New Form</h2>
        <p className="text-muted-foreground text-sm mt-1">Select a department to view available forms.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {departments.map((dept) => (
          <div
            key={dept.id}
            onClick={() => void handleDepartmentOpen(dept.path)}
            className="dept-card group"
            role="button"
            tabIndex={0}
            onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void handleDepartmentOpen(dept.path); } }}
          >
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${dept.color} flex items-center justify-center mb-5`}>
              <dept.icon 
                className={`h-7 w-7 ${dept.iconColor}`} 
                strokeWidth={dept.id === "finance" ? 4 : 2} 
                strokeLinecap={dept.id === "finance" ? "square" : "round"}
                strokeLinejoin={dept.id === "finance" ? "miter" : "round"}
              />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{dept.title}</h2>
            <p className="text-muted-foreground text-sm">{dept.description}</p>
            <div className="mt-5 text-accent font-medium text-sm group-hover:translate-x-1 transition-transform">
              View Forms →
            </div>
          </div>
        ))}
      </div>
      </div>
    </>
  );
};

export default HomePage;
