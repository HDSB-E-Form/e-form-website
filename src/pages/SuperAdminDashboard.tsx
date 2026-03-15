import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Download, SlidersHorizontal, UserPlus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MockUser {
  id: string;
  name: string;
  email: string;
  staffId: string;
  role: string;
  department: string;
}

const MOCK_ALL_USERS: MockUser[] = [
  { id: "1", name: "Ahmad Razak", email: "ahmad.razak@drb.com", staffId: "STF-8821", role: "SUPER ADMIN", department: "Executive Management" },
  { id: "2", name: "Sarah Abdullah", email: "sarah.abdullah@drb.com", staffId: "STF-4309", role: "ADMIN", department: "Human Resources" },
  { id: "3", name: "Fatimah Hassan", email: "fatimah.hassan@drb.com", staffId: "STF-1102", role: "SUPERVISOR", department: "IT Infrastructure" },
  { id: "4", name: "Ismail Rahman", email: "ismail.rahman@drb.com", staffId: "STF-9941", role: "EMPLOYEE", department: "Financial Planning" },
  { id: "5", name: "Lim Wei Jie", email: "wj.lim@drb.com", staffId: "STF-2287", role: "EMPLOYEE", department: "Operations" },
  { id: "6", name: "Nurul Aina", email: "nurul.aina@drb.com", staffId: "STF-3344", role: "SUPERVISOR", department: "Corporate Affairs" },
  { id: "7", name: "Raj Kumar", email: "raj.kumar@drb.com", staffId: "STF-5567", role: "EMPLOYEE", department: "Engineering" },
  { id: "8", name: "Siti Aminah", email: "siti.aminah@drb.com", staffId: "STF-7789", role: "ADMIN", department: "Finance" },
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

  const filtered = MOCK_ALL_USERS.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.staffId.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const stats = {
    totalPersonnel: MOCK_ALL_USERS.length,
    activeAdmins: MOCK_ALL_USERS.filter(u => u.role === "ADMIN" || u.role === "SUPER ADMIN").length,
    pendingApprovals: 8,
    departments: [...new Set(MOCK_ALL_USERS.map(u => u.department))].length,
  };

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

      {/* Stats Cards - 4 columns */}
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
                  <button className="px-4 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
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
    </div>
  );
};

export default SuperAdminDashboard;
