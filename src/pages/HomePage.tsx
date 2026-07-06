import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Users, DollarSign, FileText, CheckCircle, XCircle, ShieldCheck, IdCard, Briefcase, Megaphone, X } from "lucide-react";

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { submissions, announcements } = useSubmissions();
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);

  const activeAnnouncement = useMemo(() => {
    return (announcements || []).find(a => a.is_active);
  }, [announcements]);
  
  const getInitials = (name?: string) =>
    (name || " ").split(" ").map(n => n ? n[0] : "").join("").toUpperCase().slice(0, 2);

  const excludedForms = ["inventory_addition", "ppe_request", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"];

  const mySubmissions = submissions.filter(s => s.submittedBy === user?.id && !excludedForms.includes(s.formType));
  const stats = {
    total: mySubmissions.length,
    accepted: mySubmissions.filter(s => s.status === "approved").length,
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
  ];

  const departments = allDepartments.filter(dept => {
    if (dept.id === 'safety') {
      return user?.role === 'safety_admin' || user?.role === 'super_admin';
    }
    return true;
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 slide-in-from-bottom-2 duration-500">
      {/* Global Announcement Banner */}
      {activeAnnouncement && isAnnouncementVisible && (
        <div className="relative bg-primary/10 border border-primary/20 text-primary rounded-xl p-4 pl-12 mb-6 shadow-sm">
          <div className="absolute left-4 top-4">
            <Megaphone className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium pr-6">{activeAnnouncement.content}</p>
          <button 
            onClick={() => setIsAnnouncementVisible(false)}
            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-primary/20 transition-colors"
            title="Dismiss announcement"
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
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold shadow-xl shadow-primary/20 overflow-hidden border-2 border-primary/20">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                getInitials(user?.name)
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-background rounded-full flex items-center justify-center border border-border">
              <div className="w-5 h-5 bg-emerald-500 rounded-full ring-2 ring-background" title="Online"></div>
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
            onClick={() => navigate(dept.path)}
            className="dept-card group"
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
