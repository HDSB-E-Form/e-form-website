import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink"; 
import { Home, FileText, LayoutDashboard, Car, LogOut, User, Users, Settings, ShieldCheck, Package, ShoppingCart, Droplet, Layers, Recycle, Database } from "lucide-react";
import logo from "@/assets/logo.png";

const employeeNav = [
  { title: "Home", url: "/home", icon: Home },
  { title: "My Submissions", url: "/submissions", icon: FileText },
  { title: "My Profile", url: "/profile", icon: Settings },
];

const hrAdminNav = [
  { title: "Form Approvals", url: "/admin/hr", icon: LayoutDashboard },
  { title: "Inventory Tracker", url: "/admin/hr/inventory", icon: Package },
  { title: "Car Management", url: "/admin/cars", icon: Car },
  { title: "Purchases", url: "/admin/hr/purchases", icon: ShoppingCart },
];

const financeAdminNav = [
  { title: "Dashboard", url: "/admin/finance", icon: LayoutDashboard },
];

const safetyAdminNav = [
  { title: "Final Discharge", url: "/admin/safety/discharge", icon: Droplet },
  { title: "Mixing & Chemical", url: "/admin/safety/mixing", icon: Layers },
  { title: "Scheduled Waste", url: "/admin/safety/waste", icon: Recycle },
  { title: "Records", url: "/admin/safety/waste-records", icon: Database },
];

const approverNav = [
  { title: "Dashboard", url: "/admin/approvals", icon: LayoutDashboard },
];

const securityNav = [
  { title: "Dashboard", url: "/admin/security", icon: LayoutDashboard },
];

const superAdminNav = [
  { title: "User Directory", url: "/admin/users", icon: Users },
  { title: "All Submissions", url: "/admin/submissions", icon: FileText },
];

const roleLabels: Record<UserRole, string> = {
  employee: "Employee",
  hod: "Head of Department",
  hos: "Head of Section",
  hr_admin: "HR Admin",
  finance_admin: "Finance Admin",
  super_admin: "Super Admin",
  security_guard: "Security Guard",
  safety_admin: "Safety Admin",
};

const getAdminNav = (role?: UserRole) => {
  if (!role) return [];

  // This handles users who might have multiple roles, ensuring all relevant dashboards are shown.
  // For now, we just check the primary role.
  if (role === "hr_admin") {
    return hrAdminNav;
  } else if (role === "finance_admin" ) {
    return financeAdminNav;
  } else if (role === "safety_admin") {
    return safetyAdminNav;
  } else if (role === "hod" || role === "hos") {
    return approverNav;
  } else if (role === "super_admin") {
    return superAdminNav;
  } else if (role === "security_guard") {
    return securityNav;
  }
  return [];
};

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();
  const { submissions } = useSubmissions();
  const navigate = useNavigate(); 

  const isAdmin = user?.role && ["hr_admin", "finance_admin", "hod", "hos", "super_admin", "security_guard", "safety_admin"].includes(user.role);
  const isSuperAdmin = user?.role === "super_admin";
  const isSecurityGuard = user?.role === "security_guard";

  const pendingCounts = useMemo(() => {
    if (!user) return { hr: 0, finance: 0, approver: 0, security: 0 };

    const hrCount = submissions.filter(s => 
      s.status === 'approved_hod' && ['car_rental', 'leave'].includes(s.formType)
    ).length;

    const financeCount = submissions.filter(s => 
      s.formType === 'claim' && ['pending_finance_review', 'approved_hof'].includes(s.status)
    ).length;

    const securityCount = submissions.filter(s => 
      s.formType === 'leave' && s.status === 'approved_hod'
    ).length;

    const approverCount = submissions.filter(s => {
      const isHOS = user.role === 'hos' && s.status === 'pending' && (s.data.hosName === user.name || s.data.hos === user.name);
      const isHOD = user.role === 'hod' && s.status === 'approved_hos' && (s.data.hodName === user.name || s.data.hod === user.name);
      const isHOP = (user.role === 'head_of_purchasing' || user.secondary_roles?.includes('head_of_purchasing')) && s.formType === 'claim' && s.status === 'approved_hod' && s.data.hopName === user.name;
      const isHOF = (user.role === 'head_of_finance' || user.secondary_roles?.includes('head_of_finance')) && s.formType === 'claim' && s.status === 'approved_hop' && s.data.hofName === user.name;
      return isHOS || isHOD || isHOP || isHOF;
    }).length;

    return {
      hr: hrCount,
      finance: financeCount,
      approver: approverCount,
      security: securityCount,
    };

  }, [submissions, user]);

  const adminNav = getAdminNav(user?.role);

  const visibleEmployeeNav = employeeNav.filter(item => {
    // Hide personal "My Submissions" for standard admin/manager roles to keep their sidebars clean
    // Keep it visible for super admin to maintain previous design
    if (isSecurityGuard) {
      // Security guard should only see Home and My Profile from the main menu
      return item.title === "Home" || item.title === "My Profile";
    }
    return true;
  });

  // The main navigation menu should always be the general employee navigation.
  const mainNav = visibleEmployeeNav;

  const sidebarTitle = (() => {
    switch (user?.role) {
      case "hr_admin": return { main: "HR Admin", sub: "Dept. Dashboard" };
      case "finance_admin": return { main: "Finance Admin", sub: "Dept. Dashboard" }; 
      case "safety_admin": return { main: "Safety Admin", sub: "Dept. Dashboard" };
      case "hod": return { main: "HOD Portal", sub: "Approvals" };
      case "hos": return { main: "HOS Portal", sub: "Approvals" };
      case "security_guard": return { main: "Security", sub: "Guard Portal" };
      case "super_admin": return { main: "Super Admin", sub: "Management Portal" };
      default: return { main: "HICOM Diecasting", sub: "Employee Portal" };
    }
  })();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 print:hidden">
      <div className={`px-4 flex items-center ${collapsed ? 'justify-center' : 'gap-3'} border-b border-white/20 h-16 shrink-0 transition-all`}>
        <div className="shrink-0">
          <img src={logo} alt="HICOM Diecasting" className="h-8 w-auto brightness-200" />
        </div>
        {!collapsed && (
          <div className="min-w-0 overflow-hidden">
            <span className="text-sidebar-foreground font-bold text-sm block truncate">{sidebarTitle.main}</span>
            <span className="text-sidebar-foreground/50 text-[10px] block truncate">{sidebarTitle.sub}</span>
          </div>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                      <NavLink to={item.url} end onClick={() => setOpenMobile?.(false)} className="hover:bg-sidebar-accent/50 text-base py-2.5 flex items-center" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
                      <item.icon className={`h-5 w-5 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
                        {!collapsed && (
                          <div className="flex items-center gap-2">
                            <span className="flex-1">{item.title}</span>
                            {user?.role === 'hr_admin' && item.title === 'Form Approvals' && pendingCounts.hr > 0 && <Badge className="ml-auto bg-red-500 text-white">{pendingCounts.hr}</Badge>}
                            {user?.role === 'finance_admin' && item.title.includes('Dashboard') && pendingCounts.finance > 0 && <Badge className="ml-auto bg-red-500 text-white">{pendingCounts.finance}</Badge>}
                            {user?.role === 'security_guard' && item.title.includes('Dashboard') && pendingCounts.security > 0 && <Badge className="ml-auto bg-red-500 text-white">{pendingCounts.security}</Badge>}
                            {(user?.role === 'hod' || user?.role === 'hos' || user?.secondary_roles?.includes('head_of_purchasing') || user?.secondary_roles?.includes('head_of_finance')) && item.title.includes('Dashboard') && pendingCounts.approver > 0 && (
                              <Badge className="ml-auto bg-red-500 text-white">{pendingCounts.approver}</Badge>
                            )}
                          </div>
                        )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && adminNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50">Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end onClick={() => setOpenMobile?.(false)} className="hover:bg-sidebar-accent/50 text-base py-2.5 flex items-center" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
                        <item.icon className={`h-5 w-5 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
                        {!collapsed && (
                          <div className="flex items-center gap-2">
                            <span className="flex-1">{item.title}</span>
                            {user?.role === 'hr_admin' && item.title === 'Form Approvals' && pendingCounts.hr > 0 && <Badge className="ml-auto bg-red-500 text-white">{pendingCounts.hr}</Badge>}
                            {user?.role === 'finance_admin' && item.title.includes('Dashboard') && pendingCounts.finance > 0 && <Badge className="ml-auto bg-red-500 text-white">{pendingCounts.finance}</Badge>}
                            {user?.role === 'security_guard' && item.title.includes('Dashboard') && pendingCounts.security > 0 && <Badge className="ml-auto bg-red-500 text-white">{pendingCounts.security}</Badge>}
                            {(user?.role === 'hod' || user?.role === 'hos' || user?.secondary_roles?.includes('head_of_purchasing') || user?.secondary_roles?.includes('head_of_finance')) && item.title.includes('Dashboard') && pendingCounts.approver > 0 && (
                              <Badge className="ml-auto bg-red-500 text-white">{pendingCounts.approver}</Badge>
                            )}
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/20 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Sign out">
              <button onClick={() => { handleLogout(); setOpenMobile?.(false); }} className="hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground text-base py-5">
                <LogOut className={`h-5 w-5 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
                {!collapsed && <span>Sign out</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
