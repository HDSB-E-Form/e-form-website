import { useLocation, useNavigate } from "react-router-dom";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
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
import { NavLink } from "@/components/NavLink";
import { Home, FileText, LayoutDashboard, Car, LogOut, User, Users, Settings, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";

const employeeNav = [
  { title: "Home", url: "/home", icon: Home },
  { title: "My Submissions", url: "/submissions", icon: FileText },
];

const hrAdminNav = [
  { title: "Dashboard", url: "/admin/hr", icon: LayoutDashboard },
  { title: "Car Management", url: "/admin/cars", icon: Car },
];

const financeAdminNav = [
  { title: "Dashboard / Papan Pemuka", url: "/admin/finance", icon: LayoutDashboard },
];

const safetyAdminNav = [
  { title: "Dashboard", url: "/admin/safety", icon: LayoutDashboard },
];

const approverNav = [
  { title: "Dashboard / Papan Pemuka", url: "/admin/approvals", icon: LayoutDashboard },
];

const securityNav = [
  { title: "Dashboard", url: "/home", icon: LayoutDashboard },
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
  switch (role) {
    case "hr_admin": return hrAdminNav;
    case "finance_admin": return financeAdminNav;
    case "safety_admin": return safetyAdminNav;
    case "hod":
    case "hos": return approverNav;
    case "super_admin": return superAdminNav;
    case "security_guard": return securityNav;
    default: return [];
  }
};

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role && ["hr_admin", "finance_admin", "hod", "hos", "super_admin", "security_guard", "safety_admin"].includes(user.role);
  const isSuperAdmin = user?.role === "super_admin";
  const isSecurityGuard = user?.role === "security_guard";
  const adminNav = getAdminNav(user?.role);

  const visibleEmployeeNav = employeeNav.filter(item => {
    // Hide personal "My Submissions" for standard admin/manager roles to keep their sidebars clean
    // Keep it visible for super admin to maintain previous design
    if (isSecurityGuard) {
      return false; // Security guard should not see any employee nav items
    }
    if (isAdmin && !isSuperAdmin && item.title === 'My Submissions') {
      return false;
    }
    return true;
  });

  // Combine nav items for regular admins into a single menu. Super admins keep separated menus.
  const mainNav = (isAdmin && !isSuperAdmin) ? [...visibleEmployeeNav, ...adminNav] : visibleEmployeeNav;

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
                      <NavLink to={item.url} end onClick={() => setOpenMobile?.(false)} className="hover:bg-sidebar-accent/50 text-base py-2.5" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
                      <item.icon className={`h-5 w-5 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && adminNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50">Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end onClick={() => setOpenMobile?.(false)} className="hover:bg-sidebar-accent/50 text-base py-2.5" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
                        <item.icon className={`h-5 w-5 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
                        {!collapsed && <span>{item.title}</span>}
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
          <SidebarMenuItem className="mb-2">
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg bg-sidebar-accent/20 transition-all`}>
              <div className="shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full object-cover shadow-sm border border-border/50 bg-background" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shadow-sm border border-border/50">
                    <User className="h-5 w-5 text-sidebar-primary" />
                  </div>
                )}
              </div>
              {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.name}</p>
                <p className="text-xs text-sidebar-foreground/70">{roleLabels[user?.role || "employee"]}</p>
              </div>
              )}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="My Profile">
              <button onClick={() => { navigate('/profile'); setOpenMobile?.(false); }} className="hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground text-base py-5">
                <Settings className={`h-5 w-5 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
                {!collapsed && <span>My Profile</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
