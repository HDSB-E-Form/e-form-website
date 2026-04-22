import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Shield, Users, UserCheck, User, Plus, Trash2, ShieldAlert } from "lucide-react";
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
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; description: string; icon: any }> = [
  { value: "employee", label: "Employee", description: "Standard submission access", icon: User },
  { value: "security_guard", label: "Security Guard", description: "Approve pass exit forms", icon: ShieldAlert },
  { value: "hos", label: "Head of Section", description: "Approve section submissions", icon: Users },
  { value: "hod", label: "Head of Department", description: "Approve department submissions", icon: Users },
  { value: "hr_admin", label: "HR Admin", description: "Manage HR forms & fleet", icon: UserCheck },
  { value: "finance_admin", label: "Finance Admin", description: "Manage finance & claims", icon: UserCheck },
  { value: "super_admin", label: "Super Admin", description: "Full system access & user management", icon: Shield },
];

const INITIAL_DEPARTMENTS = [
  "Executive Management", "Human Resources", "IT Infrastructure",
  "Financial Planning", "Operations", "Corporate Affairs", "Engineering", "Finance", "General"
];

const roleBadge = (role: UserRole) => {
  switch (role) {
    case "super_admin":
      return <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] font-bold">⭐ SUPER ADMIN</Badge>;
    case "hr_admin":
      return <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-bold">HR ADMIN</Badge>;
    case "finance_admin":
      return <Badge className="bg-sky-100 text-sky-700 border-0 text-[10px] font-bold">FINANCE ADMIN</Badge>;
    case "hod":
      return <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] font-bold">HOD</Badge>;
    case "hos":
      return <Badge className="bg-violet-100 text-violet-700 border-0 text-[10px] font-bold">HOS</Badge>;
    case "employee":
      return <Badge className="bg-muted text-muted-foreground border-0 text-[10px] font-bold">EMPLOYEE</Badge>;
    case "security_guard":
      return <Badge className="bg-gray-200 text-gray-800 border-0 text-[10px] font-bold">SECURITY</Badge>;
    default:
      return <Badge className="bg-muted text-muted-foreground border-0 text-[10px] font-bold">EMPLOYEE</Badge>;
  }
};

const getInitials = (name?: string) =>
  (name || " ").split(" ").map(n => n ? n[0] : "").join("").toUpperCase().slice(0, 2);

const getInitialColor = (name: string) => {
  const colors = ["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700"];
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
  const [isViewAll, setIsViewAll] = useState(false);

  const [departmentsList, setDepartmentsList] = useState<string[]>(() => {
    const saved = localStorage.getItem("hdsb_departments");
    return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
  });
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: "",
    email: "",
    employeeId: "",
    department: "General",
    position: "",
    role: "employee" as UserRole,
  });

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
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
          avatar: doc.avatar,
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

  useEffect(() => {
    localStorage.setItem("hdsb_departments", JSON.stringify(departmentsList));
  }, [departmentsList]);

  const filtered = users.filter(u => {
    // Role filter
    if (roleFilter === "employee" && u.role !== "employee") return false;
    if (roleFilter === "admin" && u.role === "employee") return false;

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
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    
    try {
      // Update role in Firestore and context
      await updateUserRole(selectedUser.id, editRole);
      
      // Update department if needed
      if (editDepartment !== selectedUser.department) {
        await supabase.from("users").update({ department: editDepartment }).eq("id", selectedUser.id);
      }

      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, role: editRole, department: editDepartment }
          : u
      ));

      // Update global users context so dropdowns work immediately without refresh
      updateUser(selectedUser.id, { role: editRole, department: editDepartment });

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

  const handleAddUser = async () => {
    if (!addFormData.name || !addFormData.email || !addFormData.employeeId) {
      toast.error("Please fill all required fields (Name, Email, Employee ID)");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const newId = Math.random().toString(36).slice(2);
      const userToSave = {
        id: newId,
        ...addFormData,
        password: "password123", // Default password for admin-created accounts
        createdAt: new Date().toISOString(),
      };
      
      // Save to Supabase
      const { error } = await supabase.from("users").insert([userToSave]);
      if (error) throw error;

      // Update local state to immediately show the new user
      setUsers([...users, { ...userToSave, createdAt: new Date(userToSave.createdAt) }]);
      toast.success("User successfully added! Default password is 'password123'");
      setAddSheetOpen(false);
      setAddFormData({ name: "", email: "", employeeId: "", department: "General", position: "", role: "employee" });
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error("Failed to save new user to database");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDepartmentSubmit = () => {
    if (!newDeptName.trim()) {
      toast.error("Department name cannot be empty");
      return;
    }
    if (departmentsList.some(d => d.toLowerCase() === newDeptName.trim().toLowerCase())) {
      toast.error("Department already exists");
      return;
    }
    setDepartmentsList([...departmentsList, newDeptName.trim()]);
    toast.success(`Department "${newDeptName.trim()}" added successfully`);
    setAddDeptOpen(false);
    setNewDeptName("");
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
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all user accounts and permissions.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <button 
            onClick={() => setAddDeptOpen(true)} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add Department
          </button>
          <button 
            onClick={() => setAddSheetOpen(true)} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add New User
          </button>
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
              <SelectTrigger className="h-9 w-full sm:w-[140px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="employee">Employees Only</SelectItem>
                <SelectItem value="admin">Admins Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={val => { setDepartmentFilter(val); setIsViewAll(false); }}>
              <SelectTrigger className="h-9 w-full sm:w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departmentsList.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${!u.avatar ? getInitialColor(u.name) : 'bg-transparent'}`}>
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
              <Select value={editDepartment} onValueChange={setEditDepartment}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departmentsList.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Add New User Sheet */}
      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="text-xl font-bold text-foreground">Add New User</SheetTitle>
            <p className="text-sm text-muted-foreground">Create a new user account manually.</p>
          </SheetHeader>

          <div className="mt-6 space-y-4 px-1">
            <div>
              <p className="text-xs font-bold text-primary tracking-wider mb-2">FULL NAME <span className="text-red-500">*</span></p>
              <Input placeholder="e.g. John Doe" value={addFormData.name} onChange={e => setAddFormData({...addFormData, name: e.target.value})} />
            </div>
            <div>
              <p className="text-xs font-bold text-primary tracking-wider mb-2">EMAIL <span className="text-red-500">*</span></p>
              <Input type="email" placeholder="e.g. john@company.com" value={addFormData.email} onChange={e => setAddFormData({...addFormData, email: e.target.value})} />
            </div>
            <div>
              <p className="text-xs font-bold text-primary tracking-wider mb-2">STAFF ID <span className="text-red-500">*</span></p>
              <Input placeholder="e.g. EMP-123" value={addFormData.employeeId} onChange={e => setAddFormData({...addFormData, employeeId: e.target.value})} />
            </div>
            <div>
              <p className="text-xs font-bold text-primary tracking-wider mb-2">POSITION</p>
              <Input placeholder="e.g. Software Engineer" value={addFormData.position} onChange={e => setAddFormData({...addFormData, position: e.target.value})} />
            </div>
            <div>
              <p className="text-xs font-bold text-primary tracking-wider mb-2">DEPARTMENT</p>
              <Select value={addFormData.department} onValueChange={val => setAddFormData({...addFormData, department: val})}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                {departmentsList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-bold text-primary tracking-wider mb-2">ROLE</p>
              <Select value={addFormData.role} onValueChange={(val: UserRole) => setAddFormData({...addFormData, role: val})}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-6 border-t border-border mt-4">
              <button onClick={() => setAddSheetOpen(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50" disabled={isSubmitting}>
                Cancel
              </button>
              <button onClick={handleAddUser} className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Create User"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add New Department Sheet */}
      <Sheet open={addDeptOpen} onOpenChange={setAddDeptOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="text-xl font-bold text-foreground">Add New Department</SheetTitle>
            <p className="text-sm text-muted-foreground">Create a new department in the system.</p>
          </SheetHeader>

          <div className="mt-6 space-y-4 px-1">
            <div>
              <p className="text-xs font-bold text-primary tracking-wider mb-2">DEPARTMENT NAME <span className="text-red-500">*</span></p>
              <Input placeholder="e.g. Research & Development" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
            </div>

            <div className="flex gap-3 pt-6 border-t border-border mt-4">
              <button onClick={() => setAddDeptOpen(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50">
                Cancel
              </button>
              <button onClick={handleAddDepartmentSubmit} className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                Create Department
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SuperAdminDashboard;
