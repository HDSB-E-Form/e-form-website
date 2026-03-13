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
import { Home, FileText, LayoutDashboard, Car, LogOut, ChevronDown, Shield } from "lucide-react";
import logo from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const employeeNav = [
  { title: "Home", url: "/home", icon: Home },
  { title: "My Submissions", url: "/submissions", icon: FileText },
];

const adminNav = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Car Management", url: "/admin/cars", icon: Car },
];

const roleLabels: Record<UserRole, string> = {
  employee: "Employee",
  hod: "Head of Department",
  hos: "Head of Section",
  hr_admin: "HR Admin",
  finance_admin: "Finance Admin",
  super_admin: "Super Admin",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role && ["hr_admin", "finance_admin", "hod", "hos", "super_admin"].includes(user.role);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <img src={logo} alt="DRB-HICOM" className="h-8 brightness-200" />
        {!collapsed && <span className="text-sidebar-foreground font-bold text-sm">DRB-HICOM HR</span>}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {employeeNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50">Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
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

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 text-left">
                <Shield className="h-4 w-4 text-sidebar-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name}</p>
                  <p className="text-[10px] text-sidebar-foreground/50">{roleLabels[user?.role || "employee"]}</p>
                </div>
                <ChevronDown className="h-3 w-3 text-sidebar-foreground/50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <p className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Switch Role (Demo)</p>
                {(Object.keys(roleLabels) as UserRole[]).map(role => (
                  <DropdownMenuItem key={role} onClick={() => switchRole(role)} className={user?.role === role ? "bg-accent/10" : ""}>
                    {roleLabels[role]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 text-sm mt-1">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
