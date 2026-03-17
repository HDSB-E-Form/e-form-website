import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Download, SlidersHorizontal, UserPlus, Search, X, Shield, Users, UserCheck, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface MockUser {
  id: string;
  name: string;
  email: string;
  staffId: string;
  role: string;
  department: string;
  supervisor?: string;
}

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "Employee", description: "Standard submission access", icon: User },
  { value: "HR ADMIN", label: "HR Admin", description: "Manage HR forms & fleet", icon: UserCheck },
  { value: "FINANCE ADMIN", label: "Finance Admin", description: "Manage finance & claims", icon: UserCheck },
  { value: "HOD", label: "Head of Department", description: "Approve department submissions", icon: Users },
  { value: "HOS", label: "Head of Service", description: "Approve service submissions", icon: Users },
  { value: "IT TEAM", label: "IT Team / Super Admin", description: "Full system override & access control", icon: Shield },
];

const DEPARTMENTS = [
  "Executive Management", "Human Resources", "IT Infrastructure",
  "Financial Planning", "Operations", "Corporate Affairs", "Engineering", "Finance"
];

const INITIAL_USERS: MockUser[] = [
  { id: "1", name: "Ahmad Razak", email: "ahmad.razak@drb.com", staffId: "STF-8821", role: "SUPER ADMIN", department: "Executive Management" },
  { id: "2", name: "Sarah Abdullah", email: "sarah.abdullah@drb.com", staffId: "STF-4309", role: "ADMIN", department: "Human Resources", supervisor: "Ahmad Razak" },
  { id: "3", name: "Fatimah Hassan", email: "fatimah.hassan@drb.com", staffId: "STF-1102", role: "SUPERVISOR", department: "IT Infrastructure" },
  { id: "4", name: "Ismail Rahman", email: "ismail.rahman@drb.com", staffId: "STF-9941", role: "EMPLOYEE", department: "Financial Planning", supervisor: "Sarah Abdullah" },
  { id: "5", name: "Lim Wei Jie", email: "wj.lim@drb.com", staffId: "STF-2287", role: "EMPLOYEE", department: "Operations" },
  { id: "6", name: "Nurul Aina", email: "nurul.aina@drb.com", staffId: "STF-3344", role: "SUPERVISOR", department: "Corporate Affairs" },
  { id: "7", name: "Raj Kumar", email: "raj.kumar@drb.com", staffId: "STF-5567", role: "EMPLOYEE", department: "Engineering" },
  { id: "8", name: "Siti Aminah", email: "siti.aminah@drb.com", staffId: "STF-7789", role: "ADMIN", department: "Finance", supervisor: "Ahmad Razak" },
];

const roleBadge = (role: string) => {
  switch (role) {
    case "SUPER ADMIN":
      return <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] font-bold">⭐ SUPER ADMIN</Badge>;
    case "ADMIN":
      return <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-bold">ADMIN</Badge>;
    case "SUPERVISOR":
      return <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] font-bold">SUPERVISOR</Badge>;
    case "EMPLOYEE":
    default:
      return <Badge className="bg-muted text-muted-foreground border-0 text-[10px] font-bold">EMPLOYEE</Badge>;
  }
};

const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const getInitialColor = (name: string) => {
  const colors = ["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700"];
  return colors[name.charCodeAt(0) % colors.length];
};

const SuperAdminDashboard = () => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<MockUser[]>(INITIAL_USERS);
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRole, setEditRole] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [supervisorSearch, setSupervisorSearch] = useState("");
  const [editSupervisor, setEditSupervisor] = useState("");

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.staffId.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const stats = {
    totalPersonnel: users.length,
    activeAdmins: users.filter(u => u.role === "ADMIN" || u.role === "SUPER ADMIN").length,
    pendingApprovals: 8,
    departments: [...new Set(users.map(u => u.department))].length,
  };

  const openManage = (user: MockUser) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditDepartment(user.department);
    setEditSupervisor(user.supervisor || "");
    setSupervisorSearch("");
    setSheetOpen(true);
  };

  const handleSave = () => {
    if (!selectedUser) return;
    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, role: editRole, department: editDepartment, supervisor: editSupervisor } : u));
    setSheetOpen(false);
    toast.success(`Permissions updated for ${selectedUser.name}`);
  };

  const supervisorOptions = users.filter(u =>
    u.id !== selectedUser?.id &&
    (u.role === "SUPERVISOR" || u.role === "ADMIN" || u.role === "SUPER ADMIN") &&
    (!supervisorSearch || u.name.toLowerCase().includes(supervisorSearch.toLowerCase()))
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Breadcrumb & Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">Admin › <span className="font-medium text-foreground">All Users</span></p>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
          <UserPlus className="h-4 w-4" /> Add New User
        </button>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage corporate access, department hierarchy and security roles.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted/50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted/50">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card-elevated p-5">
          <p className="text-xs text-muted-foreground font-medium">Total Personnel</p>
          <p className="text-3xl font-bold text-foreground mt-1">{stats.totalPersonnel.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">↗ +12% vs last month</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-xs text-muted-foreground font-medium">Active Admins</p>
          <p className="text-3xl font-bold text-foreground mt-1">{stats.activeAdmins}</p>
          <p className="text-xs text-muted-foreground mt-1">System stability: 99.9%</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-xs text-muted-foreground font-medium">Pending Approvals</p>
          <p className="text-3xl font-bold text-foreground mt-1">{String(stats.pendingApprovals).padStart(2, "0")}</p>
          <p className="text-xs text-destructive font-medium mt-1">! Needs attention</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-xs text-muted-foreground font-medium">Departments</p>
          <p className="text-3xl font-bold text-foreground mt-1">{stats.departments}</p>
          <p className="text-xs text-muted-foreground mt-1">Across 3 global regions</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="card-elevated overflow-hidden">
        <div className="p-5 border-b border-border">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs font-bold uppercase tracking-wider">Name</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Staff ID</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Role</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Department</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id} className="hover:bg-muted/20">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${getInitialColor(u.name)}`}>
                      {getInitials(u.name)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-foreground">{u.staffId}</TableCell>
                <TableCell>{roleBadge(u.role)}</TableCell>
                <TableCell className="text-sm text-foreground">{u.department}</TableCell>
                <TableCell className="text-center">
                  <button onClick={() => openManage(u)} className="px-4 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                    Manage
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between p-4 border-t border-border">
          <p className="text-sm text-muted-foreground">Showing 1 to {filtered.length} of {filtered.length} entries</p>
          <div className="flex gap-1">
            <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground"><ChevronLeft className="h-4 w-4" /></button>
            <button className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</button>
            <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-sm text-muted-foreground">2</button>
            <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-sm text-muted-foreground">3</button>
            <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Manage Permissions Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-0">
            <SheetTitle className="text-xl font-bold text-foreground">Manage Permissions</SheetTitle>
            <p className="text-sm text-muted-foreground">Editing user: {selectedUser?.name}</p>
          </SheetHeader>

          <div className="mt-6 space-y-6 px-1">
            {/* Security Role */}
            <div>
              <p className="text-xs font-bold text-accent tracking-wider mb-3">SECURITY ROLE</p>
              <div className="space-y-2">
                {ROLE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const isSelected = editRole === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setEditRole(opt.value)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/30 hover:bg-muted/30"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary" : "border-muted-foreground/30"}`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Department & Reporting */}
            <div>
              <p className="text-xs font-bold text-accent tracking-wider mb-3">DEPARTMENT & REPORTING</p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Assign Department</label>
                  <Select value={editDepartment} onValueChange={setEditDepartment}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Direct Supervisor</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search supervisor name..."
                      value={supervisorSearch}
                      onChange={e => setSupervisorSearch(e.target.value)}
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                  {editSupervisor && (
                    <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${getInitialColor(editSupervisor)}`}>
                        {getInitials(editSupervisor)}
                      </div>
                      <span className="text-sm font-medium text-foreground flex-1">{editSupervisor}</span>
                      <button onClick={() => setEditSupervisor("")} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {supervisorSearch && (
                    <div className="mt-1 border border-border rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                      {supervisorOptions.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { setEditSupervisor(s.name); setSupervisorSearch(""); }}
                          className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/50 text-sm"
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${getInitialColor(s.name)}`}>
                            {getInitials(s.name)}
                          </div>
                          {s.name} ({s.role})
                        </button>
                      ))}
                      {supervisorOptions.length === 0 && (
                        <p className="p-2.5 text-xs text-muted-foreground">No matching supervisors</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={() => setSheetOpen(false)}
              className="px-6 py-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SuperAdminDashboard;
