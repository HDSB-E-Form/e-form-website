import { useEffect, useMemo, useState } from "react";
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
import { Home, FileText, LayoutDashboard, Car, LogOut, Users, Settings, ShieldCheck, Headphones, Package, ShoppingCart, Droplet, Layers, Recycle, Database, MonitorCog, ChevronRight, CalendarDays, DollarSign, UploadCloud, Cctv, Scale, BarChart3, Warehouse } from "lucide-react";
import logo from "@/assets/logo.png";
import { useStoreDepartmentAccess } from "@/hooks/useStoreDepartmentAccess";

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

const formDepartments = [
  { id: "hr", title: "Human Resources", icon: Users, forms: [
    { title: "Company Car Request", url: "/hr/car-rental", icon: Car },
    { title: "Gate Pass", url: "/hr/leave", icon: CalendarDays },
    { title: "PPE | Uniform | Supply", url: "/hr/ppe-request", icon: Package },
  ] },
  { id: "finance", title: "Finance", icon: DollarSign, forms: [
    { title: "Petty Cash Claim", url: "/finance/claim", icon: DollarSign },
    { title: "Upload Receipt", url: "/finance/receipt-upload", icon: UploadCloud },
  ] },
  { id: "it", title: "IT Department", icon: MonitorCog, forms: [
    { title: "CCTV Access Request", url: "/it/cctv-access-request", icon: Cctv },
    { title: "IT Help Desk Ticket", url: "/it/help-desk", icon: Headphones },
    { title: "IT Request – Admin", url: "/it/request-admin", icon: MonitorCog },
    { title: "IT Request – Application", url: "/it/request-application", icon: MonitorCog },
  ] },
  { id: "safety", title: "Safety Department", icon: ShieldCheck, restricted: true, forms: [
    { title: "Mixing & Chemical", url: "/safety/mixing", icon: Layers },
    { title: "Final Discharge", url: "/safety/discharge", icon: Droplet },
    { title: "Waste Calculator", url: "/safety/waste-inventory", icon: Scale },
  ] },
  { id: "store", title: "Store Department", icon: Warehouse, departmentGated: true, forms: [
    { title: "Material Requisition Slip", url: "/store/material-requisition-slip", icon: Package },
  ] },
];

const storeAdminNav = [
  { title: "Store Approvals", url: "/admin/store", icon: Warehouse },
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
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "System Settings", url: "/admin/settings", icon: Settings },
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
  store_pic: "Store PIC",
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
  } else if (role === "store_pic") {
    return storeAdminNav;
  }
  return [];
};

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const { user, logout } = useAuth();
  const { submissions } = useSubmissions();
  const navigate = useNavigate(); 
  const { pathname } = useLocation();
  const currentFormDepartment = formDepartments.find(department => department.forms.some(form => pathname === form.url))?.id || null;
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(currentFormDepartment);

  useEffect(() => {
    if (currentFormDepartment) setExpandedDepartment(currentFormDepartment);
  }, [currentFormDepartment]);

  const isAdmin = user?.role && (["hr_admin", "finance_admin", "it_admin", "hod", "hos", "manco_member", "head_of_purchasing", "head_of_finance", "super_admin", "security_guard", "safety_admin", "store_pic"].includes(user.role) || (user.secondary_roles && user.secondary_roles.length > 0));
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
  const { hasAccess: hasStoreAccess } = useStoreDepartmentAccess();
  const visibleFormDepartments = formDepartments.filter(department => {
    if (department.departmentGated) return hasStoreAccess;
    return !department.restricted || user?.role === "safety_admin" || user?.role === "super_admin" || user?.secondary_roles?.includes("safety_admin");
  });

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
      case "store_pic": return { main: "Store PIC", sub: "Department Portal" };
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

  const handleNavigationClick = () => {
    if (!isMobile) return;
    window.setTimeout(() => setOpenMobile(false), 0);
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
  const displayPendingCount = (count: number) => count > 99 ? "99+" : count;

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
            <SidebarMenu className="gap-1">
              {(isAdmin ? mainNav : mainNav.filter(item => item.title === "Home")).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined} className={collapsed ? "mx-auto !size-10 rounded-xl p-0" : "h-11 rounded-xl p-0"}>
                      <NavLink
                        to={item.url}
                        end
                        onClick={handleNavigationClick}
                        className={`relative flex h-full w-full touch-manipulation select-none items-center text-[15px] font-medium text-sidebar-foreground transition-colors duration-100 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar motion-reduce:transition-none ${collapsed ? "min-h-10 justify-center rounded-xl border-0 p-0" : "min-h-11 rounded-xl border-l-[3px] border-transparent px-3 py-2.5 hover:border-sidebar-primary/30"}`}
                        activeClassName={collapsed ? "bg-sidebar-accent/80 text-sidebar-primary font-semibold ring-1 ring-sidebar-primary/15 [&_svg]:text-sidebar-primary" : "border-sidebar-primary bg-gradient-to-r from-sidebar-primary/20 via-sidebar-primary/10 to-transparent text-sidebar-primary font-semibold [&_svg]:text-sidebar-primary"}
                      >
                      <item.icon className={`h-5 w-5 shrink-0 transition-colors duration-100 motion-reduce:transition-none ${collapsed ? '' : 'mr-3'}`} />
                        {!collapsed && (
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="min-w-0 flex-1 truncate">{item.title}</span>
                          </div>
                        )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isAdmin && <SidebarGroup className="-mt-2 pt-0">
          <SidebarGroupContent>
            {collapsed ? (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Forms" className="mx-auto !size-10 rounded-xl p-0" onClick={() => { navigate("/home"); handleNavigationClick(); }}>
                    <FileText className="h-5 w-5 text-sidebar-foreground" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              <div className="space-y-1">
                {visibleFormDepartments.map(department => {
                  const isOpen = expandedDepartment === department.id;
                  const containsActiveForm = department.forms.some(form => pathname === form.url);
                  return <div key={department.id}>
                    <button type="button" onClick={() => setExpandedDepartment(current => current === department.id ? null : department.id)} aria-expanded={isOpen} className={`flex min-h-11 w-full items-center rounded-xl border-l-[3px] px-3 py-2.5 text-left text-[15px] font-medium transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary ${containsActiveForm ? "border-sidebar-primary bg-sidebar-primary/10 text-sidebar-primary" : "border-transparent text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
                      <department.icon className={`mr-3 h-5 w-5 shrink-0 ${containsActiveForm ? "text-sidebar-primary" : ""}`} />
                      <span className="min-w-0 flex-1 truncate">{department.title}</span>
                      <ChevronRight className={`ml-2 h-4 w-4 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`} />
                    </button>
                    {isOpen && <div className="ml-5 mt-1 space-y-0.5 border-l border-sidebar-border/80 pl-2">
                      {department.forms.map(form => <NavLink key={form.url} to={form.url} end onClick={handleNavigationClick} className="flex min-h-10 items-center rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground/75 transition-colors duration-100 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary" activeClassName="bg-sidebar-primary/15 font-semibold text-sidebar-primary [&_svg]:text-sidebar-primary">
                        <form.icon className="mr-2.5 h-4 w-4 shrink-0" />
                        <span className="truncate">{form.title}</span>
                      </NavLink>)}
                    </div>}
                  </div>;
                })}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>}

        {!isAdmin && <SidebarGroup className="-mt-1 pt-0">
          <SidebarGroupLabel className="h-6 text-sidebar-foreground/65 font-semibold uppercase tracking-wider text-[11px]">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {mainNav.filter(item => item.title !== "Home").map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined} className={collapsed ? "mx-auto !size-10 rounded-xl p-0" : "h-11 rounded-xl p-0"}>
                    <NavLink to={item.url} end onClick={handleNavigationClick} className={`relative flex h-full w-full touch-manipulation select-none items-center text-[15px] font-medium text-sidebar-foreground transition-colors duration-100 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar motion-reduce:transition-none ${collapsed ? "min-h-10 justify-center rounded-xl border-0 p-0" : "min-h-11 rounded-xl border-l-[3px] border-transparent px-3 py-2.5 hover:border-sidebar-primary/30"}`} activeClassName={collapsed ? "bg-sidebar-accent/80 text-sidebar-primary font-semibold ring-1 ring-sidebar-primary/15 [&_svg]:text-sidebar-primary" : "border-sidebar-primary bg-gradient-to-r from-sidebar-primary/20 via-sidebar-primary/10 to-transparent text-sidebar-primary font-semibold [&_svg]:text-sidebar-primary"}>
                      <item.icon className={`h-5 w-5 shrink-0 transition-colors duration-100 ${collapsed ? "" : "mr-3"}`} />
                      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>}

        {isAdmin && adminNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/65 font-semibold uppercase tracking-wider text-[11px]">Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined} className={collapsed ? "mx-auto !size-10 rounded-xl p-0" : "h-11 rounded-xl p-0"}>
                      <NavLink
                        to={item.url}
                        end
                        onClick={handleNavigationClick}
                        className={`relative flex h-full w-full touch-manipulation select-none items-center text-[15px] font-medium text-sidebar-foreground transition-colors duration-100 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar motion-reduce:transition-none ${collapsed ? "min-h-10 justify-center rounded-xl border-0 p-0" : "min-h-11 rounded-xl border-l-[3px] border-transparent px-3 py-2.5 hover:border-sidebar-primary/30"}`}
                        activeClassName={collapsed ? "bg-sidebar-accent/80 text-sidebar-primary font-semibold ring-1 ring-sidebar-primary/15 [&_svg]:text-sidebar-primary" : "border-sidebar-primary bg-gradient-to-r from-sidebar-primary/20 via-sidebar-primary/10 to-transparent text-sidebar-primary font-semibold [&_svg]:text-sidebar-primary"}
                      >
                        <item.icon className={`h-5 w-5 shrink-0 transition-colors duration-100 motion-reduce:transition-none ${collapsed ? '' : 'mr-3'}`} />
                        {collapsed && getPendingCount(item) > 0 && (
                          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-sidebar" aria-label={`${getPendingCount(item)} pending items`} />
                        )}
                        {!collapsed && (
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="min-w-0 flex-1 truncate">{item.title}</span>
                            {getPendingCount(item) > 0 && <Badge className="ml-auto h-5 min-w-5 shrink-0 rounded-full border border-red-300/20 bg-red-500/90 px-1.5 text-[10px] font-semibold tabular-nums text-white shadow-sm hover:bg-red-500">{displayPendingCount(getPendingCount(item))}</Badge>}
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

      <SidebarFooter className={collapsed ? "p-2" : "p-3"}>
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <div className={`flex items-center rounded-xl border border-white/10 bg-sidebar-accent/20 text-sidebar-foreground ${collapsed ? "min-h-10 justify-center p-0" : "min-h-14 px-2.5 py-2"}`}>
              <div className={`shrink-0 rounded-full bg-gradient-to-br from-sidebar-primary via-blue-400 to-cyan-300 p-[1.5px] shadow-sm shadow-sidebar-primary/20 ${collapsed ? "h-8 w-8" : "mr-3 h-9 w-9"}`}>
                <Avatar className="h-full w-full border-0">
                  <AvatarImage src={user?.avatar || undefined} alt={user?.name || "User profile"} className="object-cover" />
                  <AvatarFallback className="bg-sidebar-accent text-xs font-bold text-sidebar-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
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
          <SidebarMenuItem className="mt-2">
            <SidebarMenuButton asChild tooltip={collapsed ? "Sign out" : undefined} className={collapsed ? "mx-auto !size-10 rounded-xl p-0" : "!h-12 rounded-xl p-0"}>
              <button onClick={() => { handleLogout(); setOpenMobile?.(false); }} className={`group/signout flex w-full items-center text-[15px] font-medium text-sidebar-foreground transition-all duration-200 hover:bg-red-500/15 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60 focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar motion-reduce:transition-none ${collapsed ? "min-h-10 justify-center rounded-xl p-0" : "min-h-12 rounded-xl px-3 py-3"}`}>
                <LogOut className={`h-5 w-5 shrink-0 text-sidebar-foreground transition-colors group-hover/signout:text-red-200 ${collapsed ? '' : 'mr-3'}`} />
                {!collapsed && <span>Sign out</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
