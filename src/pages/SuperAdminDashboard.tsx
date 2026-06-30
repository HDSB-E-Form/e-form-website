import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Shield, Users, UserCheck, User, Plus, Trash2, ShieldAlert, ShieldCheck as SafetyIcon, Settings, FolderPlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { supabase } from "@/supabase";
import { useUsers } from "@/contexts/UsersContext";

interface FirestoreUser {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
  position: string;
  role: UserRole;
  createdAt?: Date;
  avatar?: string;
  secondary_roles?: UserRole[];
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; description: string; icon: any }> = [
  { value: "employee", label: "Employee", description: "Standard submission access", icon: User },
  { value: "security_guard", label: "Security Guard", description: "Approve pass exit forms", icon: ShieldAlert },
  { value: "hos", label: "Head of Section", description: "Approve section submissions", icon: Users },
  { value: "hod", label: "Head of Department", description: "Approve department submissions", icon: Users },
  { value: "hr_admin", label: "HR Admin", description: "Manage HR forms & fleet", icon: UserCheck },
  { value: "finance_admin", label: "Finance Admin", description: "Manage finance & claims", icon: UserCheck },
  { value: "safety_admin", label: "Safety Admin", description: "View safety dashboards & reports", icon: SafetyIcon },
  { value: "super_admin", label: "Super Admin", description: "Full system access & user management", icon: Shield },
];

const SECONDARY_ROLE_OPTIONS: Array<{ value: UserRole; label: string; }> = [
  { value: "head_of_purchasing", label: "Head of Purchasing" },
  { value: "head_of_finance", label: "Head of Finance" },
];


const roleBadge = (role: UserRole) => {
  switch (role) {
    case "super_admin":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[10px] font-bold">⭐ SUPER ADMIN</Badge>;
    case "hr_admin":
      return <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-bold">HR ADMIN</Badge>;
    case "finance_admin":
      return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-0 text-[10px] font-bold">FINANCE ADMIN</Badge>;
    case "head_of_purchasing":
      return <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400 border-0 text-[10px] font-bold">HEAD OF PURCHASING</Badge>;
    case "head_of_finance":
      return <Badge className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-0 text-[10px] font-bold">HEAD OF FINANCE</Badge>;
    case "hod":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] font-bold">HOD</Badge>;
    case "hos":
      return <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-400 border-0 text-[10px] font-bold">HOS</Badge>;
    case "employee":
      return <Badge className="bg-muted text-muted-foreground border-0 text-[10px] font-bold">EMPLOYEE</Badge>;
    case "safety_admin":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] font-bold">SAFETY ADMIN</Badge>;
    case "security_guard":
      return <Badge className="bg-gray-500/20 text-gray-800 dark:text-gray-300 border-0 text-[10px] font-bold">SECURITY</Badge>;
    default:
      return <Badge className="bg-muted text-muted-foreground border-0 text-[10px] font-bold">EMPLOYEE</Badge>;
  }
};

const getInitials = (name?: string) =>
  (name || " ").split(" ").map(n => n ? n[0] : "").join("").toUpperCase().slice(0, 2);

const getInitialColor = (name: string) => {
  const colors = ["bg-violet-500/15 text-violet-700 dark:text-violet-400", "bg-sky-500/15 text-sky-700 dark:text-sky-400", "bg-amber-500/15 text-amber-700 dark:text-amber-400", "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", "bg-rose-500/15 text-rose-700 dark:text-rose-400"];
  let hash = 0;
  const safeName = name || " ";
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const SuperAdminDashboard = () => {
  const { updateUserRole } = useAuth();
  const { updateUser } = useUsers();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<FirestoreUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRole, setEditRole] = useState<UserRole>("employee");
  const [editDepartment, setEditDepartment] = useState("");
  const [editSecondaryRoles, setEditSecondaryRoles] = useState<UserRole[]>([]);
  const [isViewAll, setIsViewAll] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");


  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        
        // Fetch departments from database
        const { data: deptData } = await supabase.from("departments").select("name").order("name");
        if (deptData) {
          setDepartmentsList(deptData.map((d: any) => d.name));
        }

        const { data, error } = await supabase.from("users").select("*").order("name");
        if (error) throw error;

        const fetchedUsers: FirestoreUser[] = (data || []).map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          email: doc.email,
          employeeId: doc.employeeId,
          department: doc.department,
          position: doc.position,
          role: doc.role || "employee",
          createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
          is_head_of_finance: doc.is_head_of_finance || false,
          avatar: doc.avatar,
          secondary_roles: doc.secondary_roles || [],
        }));

        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filtered = users.filter(u => {
    // Role filter
    if (roleFilter === "employee" && u.role !== "employee") return false;
    if (roleFilter === "hos" && u.role !== "hos") return false;
    if (roleFilter === "hod" && u.role !== "hod") return false;
    if (roleFilter === "admin" && !["hr_admin", "finance_admin", "head_of_purchasing", "head_of_finance", "safety_admin", "super_admin"].includes(u.role as string)) return false;

    // Department filter
    if (departmentFilter !== "all" && u.department !== departmentFilter) return false;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const nameMatch = (u.name || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const idMatch = (u.employeeId || '').toLowerCase().includes(q);
      const roleMatch = (u.role || '').toLowerCase().includes(q);

      if (!(nameMatch || emailMatch || idMatch || roleMatch)) {
        return false;
      }
    }
    return true;
  });

  const stats = {
    totalPersonnel: users.length,
    activeAdmins: users.filter(u => ["hr_admin", "finance_admin", "super_admin"].includes(u.role)).length,
    departments: [...new Set(users.map(u => u.department))].length,
  };

  const openManage = (user: FirestoreUser) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditDepartment(user.department);
    setEditSecondaryRoles(user.secondary_roles || []);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    
    try {
      const updates = { 
        role: editRole, 
        department: editDepartment,
        secondary_roles: editSecondaryRoles,
      };
      
      // The updateUser function from the context handles both the DB update
      // and the local state update, ensuring synchronization.
      const success = await updateUser(selectedUser.id, updates);

      if (!success) {
        // The context function will have already shown a toast error.
        // We just need to prevent the sheet from closing.
        return;
      }

      setSheetOpen(false);
      toast.success(`${selectedUser.name}'s role updated to ${ROLE_OPTIONS.find(r => r.value === editRole)?.label}`);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Failed to update permissions: ${error.message || "Database rejected the role"}`);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    if (!window.confirm(`Are you sure you want to completely remove ${selectedUser.name} from the system? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from("users").delete().eq("id", selectedUser.id);
      if (error) throw error;

      setUsers(users.filter(u => u.id !== selectedUser.id));
      setSheetOpen(false);
      toast.success("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };


  const handleAddDepartmentSubmit = async () => {
    if (!newDeptName.trim()) {
      toast.error("Department name cannot be empty");
      return;
    }
    const cleanName = newDeptName.trim();
    if (departmentsList.some(d => d.toLowerCase() === cleanName.toLowerCase())) {
      toast.error("Department already exists");
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.from("departments").insert([{ name: cleanName }]);
      if (error) throw error;
      
      setDepartmentsList([...departmentsList, cleanName].sort());
      toast.success(`Department "${cleanName}" added successfully`);
      setAddDeptOpen(false);
      setNewDeptName("");
    } catch (err: any) {
      console.error("Error adding department:", err);
      toast.error("Failed to add department: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDepartment = async (deptName: string) => {
    if (!window.confirm(`Are you sure you want to delete the department "${deptName}"?`)) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.from("departments").delete().eq("name", deptName);
      if (error) throw error;
      
      setDepartmentsList(departmentsList.filter(d => d !== deptName));
      toast.success(`Department "${deptName}" deleted successfully`);
    } catch (err: any) {
      console.error("Error deleting department:", err);
      toast.error("Failed to delete department: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAllForms = async () => {
    const confirm1 = window.confirm("⚠️ WARNING: This will permanently delete ALL form submissions (Gate Passes, Claims, etc) across the entire system to prepare for launch. Are you absolutely sure?");
    if (!confirm1) return;
    
    const confirm2 = window.prompt('To prevent accidental deletion, please type "RESET" in all caps to confirm:');
    if (confirm2 !== "RESET") {
      toast.info("System reset cancelled.");
      return;
    }

    setIsLoading(true);
    try {
      // Delete all submissions safely by matching all records where id is not "0"
      const { error } = await supabase.from("submissions").delete().neq("id", "0");
      if (error) throw error;

      toast.success("✅ System Reset Complete! All old forms are wiped.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error("Error wiping forms:", err);
      toast.error("Failed to delete forms: " + err.message);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all user accounts and permissions.</p>
        </div>
        <div className="relative w-full sm:w-[180px]">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="w-full h-10 px-4 flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-lg transition-colors text-sm font-bold whitespace-nowrap shadow-sm"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
              <div className="absolute right-0 left-0 top-full mt-2 w-full bg-background border border-border rounded-xl shadow-xl z-50 flex flex-col p-1.5 animate-in fade-in slide-in-from-top-2">
                <button onClick={() => { setAddDeptOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center justify-start gap-2.5 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-foreground">
                  <FolderPlus className="h-4 w-4 text-muted-foreground" /> Edit Department
                </button>
                <div className="h-px bg-border/50 my-1 mx-2" />
                <button onClick={() => { handleResetAllForms(); setIsMenuOpen(false); }} className="w-full flex items-center justify-start gap-2.5 px-3 py-2.5 hover:bg-destructive/10 text-destructive rounded-lg text-sm font-medium transition-colors">
                  <Trash2 className="h-4 w-4 text-destructive/70" /> Wipe All Forms
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="card-elevated p-5">
          <p className="text-xs text-muted-foreground font-medium">Total Personnel</p>
          <p className="text-3xl font-bold text-foreground mt-1">{stats.totalPersonnel.toLocaleString()}</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-xs text-muted-foreground font-medium">Active Admins</p>
          <p className="text-3xl font-bold text-foreground mt-1">{stats.activeAdmins}</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-xs text-muted-foreground font-medium">Departments</p>
          <p className="text-3xl font-bold text-foreground mt-1">{stats.departments}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="card-elevated overflow-hidden">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setIsViewAll(false); }} className="pl-9 h-9 text-sm" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={roleFilter} onValueChange={val => { setRoleFilter(val); setIsViewAll(false); }}>
              <SelectTrigger className="h-9 w-full sm:w-[240px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="employee">Employees Only</SelectItem>
                <SelectItem value="hos">HOS Only</SelectItem>
                <SelectItem value="hod">HOD Only</SelectItem>
                <SelectItem value="admin">Admins Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={val => { setDepartmentFilter(val); setIsViewAll(false); }}>
              <SelectTrigger className="h-9 w-full sm:w-[240px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">All Departments</SelectItem>
                {departmentsList.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs font-bold uppercase tracking-wider w-12 text-center">No.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Name</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Email</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Role</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Department</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isViewAll ? filtered : filtered.slice(0, 10)).map((u, index) => (
              <TableRow key={u.id} className="hover:bg-muted/20">
                <TableCell className="text-sm font-medium text-muted-foreground text-center">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${!u.avatar ? getInitialColor(u.name) : 'bg-transparent'}`}>
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(u.name)
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.employeeId}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-foreground">{u.email}</TableCell>
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
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No users found</p>
          </div>
        )}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <p className="text-sm text-muted-foreground">Showing {Math.min(filtered.length, isViewAll ? filtered.length : 10)} of {filtered.length} users</p>
          {filtered.length > 10 && (
            <button 
              onClick={() => setIsViewAll(!isViewAll)}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
            >
              {isViewAll ? "View Less" : "View More"}
            </button>
          )}
        </div>
      </div>

      {/* Manage Permissions Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-0">
            <SheetTitle className="text-xl font-bold text-foreground">Manage User</SheetTitle>
            <p className="text-sm text-muted-foreground">Editing: {selectedUser?.name}</p>
            <p className="text-xs text-muted-foreground">{selectedUser?.email}</p>
          </SheetHeader>

          <div className="mt-6 space-y-6 px-1">
            {/* User Info */}
            <div>
              <p className="text-xs font-bold text-primary tracking-wider mb-3">USER INFORMATION</p>
              <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Staff ID</p>
                  <p className="text-sm font-medium text-foreground">{selectedUser?.employeeId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Position</p>
                  <p className="text-sm font-medium text-foreground">{selectedUser?.position}</p>
                </div>
              </div>
            </div>

            {/* Security Role */}
            <div>
              <p className="text-xs font-bold text-primary tracking-wider mb-3">ASSIGN ROLE</p>
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

            {/* Department */}
            <div>
              <p className="text-xs font-bold text-primary tracking-wider mb-3">DEPARTMENT</p>
              <Select value={departmentsList.includes(editDepartment) ? editDepartment : undefined} onValueChange={setEditDepartment}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {departmentsList.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Secondary Roles */}
            <div>
              <p className="text-xs font-bold text-primary tracking-wider mb-3">ADDITIONAL ROLES</p>
              <Select onValueChange={(val) => {
                if (val && !editSecondaryRoles.includes(val as UserRole)) {
                  setEditSecondaryRoles([...editSecondaryRoles, val as UserRole]);
                }
              }}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Add a secondary role..." />
                </SelectTrigger>
                <SelectContent>
                  {SECONDARY_ROLE_OPTIONS.filter(opt => !editSecondaryRoles.includes(opt.value)).map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 flex flex-wrap gap-2">
                {editSecondaryRoles.map(role => (
                  <Badge key={role} className="bg-primary/10 text-primary text-xs font-bold pl-3 pr-1.5 py-1 rounded-md">
                    {SECONDARY_ROLE_OPTIONS.find(o => o.value === role)?.label || role}
                    <button onClick={() => setEditSecondaryRoles(editSecondaryRoles.filter(r => r !== role))} className="ml-1.5 p-0.5 rounded-full hover:bg-black/10">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {editSecondaryRoles.length === 0 && <p className="text-xs text-muted-foreground p-2">No additional roles assigned.</p>}
                </div>
              </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleDeleteUser}
                className="px-3 py-2.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-colors flex items-center justify-center"
                title="Delete User"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSheetOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manage Departments Sheet */}
      <Sheet open={addDeptOpen} onOpenChange={setAddDeptOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="text-xl font-bold text-foreground">Manage Departments</SheetTitle>
            <p className="text-sm text-muted-foreground">Add new departments or remove existing ones.</p>
          </SheetHeader>

          <div className="mt-6 space-y-6 px-1">
            {/* Add New Section */}
            <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
              <p className="text-xs font-bold text-primary tracking-wider uppercase">Add New Department</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input placeholder="e.g. Research & Development" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="bg-background flex-1" />
              </div>
              <button onClick={handleAddDepartmentSubmit} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> Add Department
              </button>
            </div>

            {/* Existing List */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Existing Departments</p>
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                {departmentsList.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground text-center bg-muted/5">No departments found.</p>
                ) : departmentsList.map(dept => (
                  <div key={dept} className="p-3 flex items-center justify-between hover:bg-muted/10 transition-colors group bg-background">
                    <span className="text-sm font-medium text-foreground truncate pr-4">{dept}</span>
                    <button onClick={() => handleDeleteDepartment(dept)} className="p-2 sm:p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100" title="Delete Department">
                      <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SuperAdminDashboard;
