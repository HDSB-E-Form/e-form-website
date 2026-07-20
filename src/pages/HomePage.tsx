import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers } from "@/contexts/UsersContext";
import { useHiddenSubmissions } from "./useHiddenSubmissions";
import { Users, DollarSign, FileText, CheckCircle, XCircle, ShieldCheck, IdCard, Briefcase, Megaphone, X, MonitorCog } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { submissions, announcements, refreshSubmissions, isLoading: areSubmissionsLoading } = useSubmissions();
  const { refreshUsers, isLoading: areUsersLoading } = useUsers();
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [isPreparingForms, setIsPreparingForms] = useState(false);
  const { hiddenIds } = useHiddenSubmissions();

  const activeAnnouncement = useMemo(() => {
    return (announcements || []).find(a => a.is_active);
  }, [announcements]);
  
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
      description: "Submit water treatment logs, Final Discharge, and waste inventory records.",
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

    // Filter out departments the user shouldn't see.
    return depts.filter(dept => {
      if (dept.id === 'safety') return hasSafetyAccess;
      return true;
    });
  }, [user?.role, user?.secondary_roles]);

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
        {/* Decorative background elements */}
        <div className="absolute -top-16 -right-16 w-48 h-48 border-2 border-primary/10 rounded-full opacity-50" />
        <div className="absolute -top-10 -right-10 w-32 h-32 border border-primary/10 rounded-full opacity-75" />

        {/* Main content, positioned above the decorative elements */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0 pb-3">
            <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-gradient-to-br from-primary via-blue-500 to-amber-400 p-1 shadow-xl shadow-primary/20">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-background text-3xl font-bold text-primary dark:border-background">
                {user?.avatar ? (
                  <img src={user.avatar} alt={`${user?.name || "User"} profile`} className="h-full w-full object-cover" />
                ) : (
                  getInitials(user?.name)
                )}
              </div>
            </div>
            <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary shadow-md">
              <ShieldCheck className="h-3 w-3" />
              <span>{user?.role ? user.role.replace(/_/g, " ") : "Staff"}</span>
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
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t border-border/50">
          <div onClick={() => navigate("/submissions")} className="p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold text-foreground -mt-1">{stats.total}</p>
            </div>
          </div>
          <div onClick={() => navigate("/submissions")} className="p-4 flex items-center gap-3 cursor-pointer hover:bg-emerald-500/10 transition-colors rounded-lg">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Accepted</p>
              <p className="text-2xl font-bold text-foreground -mt-1">{stats.accepted}</p>
            </div>
          </div>
          <div onClick={() => navigate("/submissions")} className="p-4 flex items-center gap-3 cursor-pointer hover:bg-destructive/10 transition-colors rounded-lg">
            <XCircle className="h-5 w-5 text-destructive dark:text-red-400" />
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Rejected</p>
              <p className="text-2xl font-bold text-foreground -mt-1">{stats.rejected}</p>
            </div>
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
  );
};

export default HomePage;
