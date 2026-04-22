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
  { title: "Dashboard / Papan Pemuka", url: "/admin/hr", icon: LayoutDashboard },
  { title: "Cars Overview / Gambaran Keseluruhan Kereta", url: "/admin/cars", icon: Car },
];

const financeAdminNav = [
  { title: "Dashboard / Papan Pemuka", url: "/admin/finance", icon: LayoutDashboard },
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
};

const getAdminNav = (role?: UserRole) => {
  switch (role) {
    case "hr_admin": return hrAdminNav;
    case "finance_admin": return financeAdminNav;
    case "hod":
    case "hos": return approverNav;
    case "super_admin": return superAdminNav;
    case "security_guard": return securityNav;
    default: return [];
  }
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role && ["hr_admin", "finance_admin", "hod", "hos", "super_admin", "security_guard"].includes(user.role);
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
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="p-4 flex items-center gap-3 border-b border-white">
        <img src={logo} alt="HICOM Diecasting" className="h-8 brightness-200" />
        {!collapsed && (
          <div>
            <span className="text-sidebar-foreground font-bold text-sm block">{sidebarTitle.main}</span>
            <span className="text-sidebar-foreground/50 text-[10px]">{sidebarTitle.sub}</span>
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
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50 text-base py-2.5" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
                      <item.icon className="mr-3 h-5 w-5" />
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
                      <NavLink to={item.url} end className="hover:bg-sidebar-accent/50 text-base py-2.5" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
                        <item.icon className="mr-3 h-5 w-5" />
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

      <SidebarFooter className="border-t border-white p-3">
        {!collapsed && (
          <>
            <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/30">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full object-cover shadow-sm border border-border/50 bg-background flex-shrink-0" />
              ) : (
                <User className="h-7 w-7 text-sidebar-primary flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.name}</p>
                <p className="text-xs text-sidebar-foreground/70">{roleLabels[user?.role || "employee"]}</p>
              </div>
            </div>

            <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 text-base font-medium mt-2">
              <Settings className="h-5 w-5" /> My Profile
            </button>

            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 text-base font-medium mt-1">
              <LogOut className="h-5 w-5" /> Sign out / Log Keluar
            </button>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
