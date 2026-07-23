import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/contexts/types";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavLink } from "@/components/NavLink";
import { Home, FileText, LayoutDashboard, Car, LogOut, User, Users, Settings, ShieldCheck, Headphones, Package, ShoppingCart, Droplet, Layers, Recycle, Database, Hash, MonitorCog } from "lucide-react";
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

const itAdminNav = [
  { title: "CCTV Requests", url: "/admin/it", icon: ShieldCheck },
  { title: "IT Help Desk Ticket", url: "/admin/it/help-desk", icon: Headphones },
  { title: "IT Requests", url: "/admin/it/facilities", icon: MonitorCog },
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
  manco_member: "Manco Member",
  hos: "Head of Section",
  hr_admin: "HR Admin",
  finance_admin: "Finance Admin",
  it_admin: "IT Admin",
  head_of_purchasing: "Head of Purchasing",
  head_of_finance: "Head of Finance",
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
  } else if (role === "it_admin") {
    return itAdminNav;
  } else if (role === "safety_admin") {
    return safetyAdminNav;
  } else if (role === "hod" || role === "hos" || role === "manco_member" || role === "head_of_purchasing" || role === "head_of_finance") {
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
  const { pathname } = useLocation();

  const isAdmin = user?.role && (["hr_admin", "finance_admin", "it_admin", "hod", "hos", "manco_member", "head_of_purchasing", "head_of_finance", "super_admin", "security_guard", "safety_admin"].includes(user.role) || (user.secondary_roles && user.secondary_roles.length > 0));
  const isSuperAdmin = user?.role === "super_admin";
  const isSecurityGuard = user?.role === "security_guard";

  const pendingCounts = useMemo(() => {
    if (!user) return { hr: 0, finance: 0, it: 0, helpDesk: 0, facilities: 0, approver: 0, security: 0 };

    const hrCount = submissions.filter(s => 
      s.status === 'approved_hod' && s.formType === 'car_rental'
    ).length;

    const financeCount = submissions.filter(s => 
      s.formType === 'claim' && ['pending_finance_review', 'approved_hof'].includes(s.status)
    ).length;

    const itCount = submissions.filter(s =>
      s.formType === "cctv_access_request" && s.status === "approved_hod"
    ).length;

    const helpDeskCount = submissions.filter(s =>
      s.formType === "it_help_desk" && ["pending", "reopened"].includes(s.status)
    ).length;

    const facilitiesCount = submissions.filter(s =>
      ["it_admin_request", "it_application_request", "it_facilities_requisition"].includes(s.formType) && ["approved_hod", "reopened"].includes(s.status)
    ).length;

    const securityCount = submissions.filter(s => 
      s.formType === 'leave' && s.status === 'approved_manco'
    ).length;

    const approverCount = submissions.filter(s => {
      const isHOSRole = user.role === 'hos' || user.secondary_roles?.includes('hos');
      const isHODRole = user.role === 'hod' || user.secondary_roles?.includes('hod');
      const isMancoRole = user.role === 'manco_member' || user.secondary_roles?.includes('manco_member');
      const isHOS = isHOSRole && s.status === 'pending' && (s.data.hosUserId ? s.data.hosUserId === user.id : (s.data.hosName === user.name || s.data.hos === user.name));
      const isHOD = isHODRole && s.status === 'approved_hos' && (s.data.hodUserId ? s.data.hodUserId === user.id : (s.data.hodName === user.name || s.data.hod === user.name));
      const isHOP = (user.role === 'head_of_purchasing' || user.secondary_roles?.includes('head_of_purchasing')) && s.formType === 'claim' && s.status === 'approved_hod' && (s.data.hopUserId ? s.data.hopUserId === user.id : s.data.hopName === user.name);
      const isHOF = (user.role === 'head_of_finance' || user.secondary_roles?.includes('head_of_finance')) && s.formType === 'claim' && s.status === 'approved_hop' && (s.data.hofUserId ? s.data.hofUserId === user.id : s.data.hofName === user.name);
      const isManco = isMancoRole && s.formType === 'leave' && s.status === 'approved_hod' && (s.data.mancoMemberUserId ? s.data.mancoMemberUserId === user.id : s.data.mancoMemberName === user.name);
      return isHOS || isHOD || isManco || isHOP || isHOF;
    }).length;

    return {
      hr: hrCount,
      finance: financeCount,
      it: itCount,
      helpDesk: helpDeskCount,
      facilities: facilitiesCount,
      approver: approverCount,
      security: securityCount,
    };

  }, [submissions, user]);

  const adminNav = useMemo(() => {
    const primaryNav = getAdminNav(user?.role);
    const secondaryNavs = (user?.secondary_roles || []).flatMap(role => getAdminNav(role));
    // Combine and remove duplicates, preserving order
    const combined = [...primaryNav, ...secondaryNavs];
    const uniqueNav = Array.from(new Map(combined.map(item => [item.url, item])).values());
    return uniqueNav;
  }, [user]);

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
    const hrSubtitle = (() => {
      if (pathname.startsWith("/admin/hr/inventory")) return "Inventory Tracker";
      if (pathname.startsWith("/admin/hr/purchases")) return "Purchases";
      if (pathname.startsWith("/admin/cars")) return "Car Management";
      if (pathname.startsWith("/admin/hr")) return "Form Approvals";
      return "Department Portal";
    })();

    const financeSubtitle = pathname.startsWith("/admin/finance")
      ? "Finance Dashboard"
      : "Department Portal";

    const itSubtitle = (() => {
      if (pathname.startsWith("/admin/it/help-desk")) return "IT Help Desk";
      if (pathname.startsWith("/admin/it/facilities")) return "IT Requests";
      if (pathname.startsWith("/admin/it")) return "CCTV Requests";
      return "Department Portal";
    })();

    const safetySubtitle = (() => {
      if (pathname.startsWith("/admin/safety/discharge")) return "Final Discharge";
      if (pathname.startsWith("/admin/safety/mixing")) return "Mixing & Chemical";
      if (pathname.startsWith("/admin/safety/waste-records")) return "Safety Records";
      if (pathname.startsWith("/admin/safety/waste")) return "Scheduled Waste";
      return "Department Portal";
    })();

    switch (user?.role) {
      case "hr_admin": return { main: "HR Admin", sub: hrSubtitle };
      case "finance_admin": return { main: "Finance Admin", sub: financeSubtitle };
      case "it_admin": return { main: "IT Admin", sub: itSubtitle };
      case "safety_admin": return { main: "Safety Admin", sub: safetySubtitle };
      case "hod": return { main: "HOD Portal", sub: "Department Approvals" };
      case "hos": return { main: "HOS Portal", sub: "Section Approvals" };
      case "head_of_purchasing": return { main: "Purchasing Head", sub: "Approvals" };
      case "head_of_finance": return { main: "Finance Head", sub: "Approvals" };
      case "manco_member": return { main: "Manco Member", sub: "Gate Pass Approvals" };
      case "security_guard": return { main: "Security", sub: "Guard Portal" };
      case "super_admin": return { main: "Super Admin", sub: "Management Portal" };
      default: return { main: "HICOM Diecasting", sub: "Employee Portal" };
    }
  })();

  const userInitials = (user?.name || "User")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getPendingCount = (item: { title: string; url: string }) => {
    if (item.url === "/admin/hr") return pendingCounts.hr;
    if (item.url === "/admin/finance") return pendingCounts.finance;
    if (item.url === "/admin/it") return pendingCounts.it;
    if (item.url === "/admin/it/help-desk") return pendingCounts.helpDesk;
    if (item.url === "/admin/it/facilities") return pendingCounts.facilities;
    if (item.url === "/admin/security") return pendingCounts.security;
    if (item.url === "/admin/approvals") return pendingCounts.approver;
    return 0;
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 print:hidden">
      <div className={`px-4 flex items-center ${collapsed ? 'justify-center' : 'gap-3'} border-b border-white/20 h-16 shrink-0 transition-all`}>
        <div className="shrink-0">
          <img src={logo} alt="HICOM Diecasting" className="h-8 w-auto brightness-150" />
        </div>
        {!collapsed && (
          <div className="min-w-0 overflow-hidden">
            <span className="text-sidebar-foreground font-bold text-sm block truncate">{sidebarTitle.main}</span>
            <span className="text-sidebar-foreground/60 text-xs block truncate">{sidebarTitle.sub}</span>
          </div>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/65 font-semibold uppercase tracking-wider text-[11px]">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className="h-9">
                      <NavLink to={item.url} end onClick={() => setOpenMobile?.(false)} className="relative hover:bg-sidebar-accent/50 text-[15px] flex items-center" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-sidebar-primary">
                      <item.icon className={`h-5 w-5 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
                        {!collapsed && (
                          <div className="flex items-center gap-2">
                            <span className="flex-1">{item.title}</span>
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
            <SidebarGroupLabel className="text-sidebar-foreground/65 font-semibold uppercase tracking-wider text-[11px]">Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} className="h-9">
                      <NavLink to={item.url} end onClick={() => setOpenMobile?.(false)} className="relative hover:bg-sidebar-accent/50 text-[15px] flex items-center" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-sidebar-primary">
                        <item.icon className={`h-5 w-5 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
                        {collapsed && getPendingCount(item) > 0 && (
                          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-sidebar" aria-label={`${getPendingCount(item)} pending items`} />
                        )}
                        {!collapsed && (
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="flex-1">{item.title}</span>
                            {getPendingCount(item) > 0 && <Badge className="ml-auto h-5 min-w-5 rounded-full bg-red-500 px-1.5 text-[10px] text-white hover:bg-red-500">{getPendingCount(item)}</Badge>}
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

      <SidebarFooter className="p-3">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <div className={`flex min-h-12 items-center py-1.5 text-sidebar-foreground ${collapsed ? "justify-center" : "px-2"}`}>
              <Avatar className={`h-9 w-9 border border-white/20 ${collapsed ? "" : "mr-3"}`}>
                <AvatarImage src={user?.avatar || undefined} alt={user?.name || "User profile"} className="object-cover" />
                <AvatarFallback className="bg-sidebar-accent text-xs font-bold text-sidebar-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold">{user?.name || "User"}</span>
                  <span className="block truncate text-[11px] text-sidebar-foreground/60">
                    {user?.role ? roleLabels[user.role] : "Employee"}
                  </span>
                </div>
              )}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem aria-hidden="true" className="mx-2 my-1 border-t border-solid border-white/25" />
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Sign out" className="h-9">
              <button onClick={() => { handleLogout(); setOpenMobile?.(false); }} className="hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground text-[15px]">
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
