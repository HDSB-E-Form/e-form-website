import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// ADDED: "Save" icon to the lucide-react imports
import { Download, Search, Shield, Users, UserCheck, User, Plus, Trash2, ShieldAlert, ShieldCheck as SafetyIcon, Settings, FolderPlus, X, XCircle, Megaphone, Pencil, Save, Upload, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/contexts/types";
import { supabase } from "@/supabase";
import { useUsers } from "@/contexts/UsersContext"; 
import { useSubmissions, type Announcement } from "@/contexts/SubmissionsContext";
import { Skeleton } from "@/components/ui/skeleton";

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
  status?: string;
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; description: string; icon: any }> = [
  { value: "employee", label: "Employee", description: "Standard submission access", icon: User },
  { value: "security_guard", label: "Security Guard", description: "Approve pass exit forms", icon: ShieldAlert },
  { value: "hos", label: "Head of Section", description: "Approve section submissions", icon: Users },
  { value: "hod", label: "Head of Department", description: "Approve department submissions", icon: Users },
  { value: "hr_admin", label: "HR Admin", description: "Manage HR forms & fleet", icon: UserCheck },
  { value: "finance_admin", label: "Finance Admin", description: "Manage finance & claims", icon: UserCheck },
  { value: "it_admin", label: "IT Admin", description: "Manage CCTV access requests", icon: UserCheck },
  { value: "safety_admin", label: "Safety Admin", description: "View safety dashboards & reports", icon: SafetyIcon },
  { value: "super_admin", label: "Super Admin", description: "Full system access & user management", icon: Shield },
];

const SECONDARY_ROLE_OPTIONS: Array<{ value: UserRole; label: string; }> = [
  { value: "head_of_purchasing", label: "Head of Purchasing" },
  { value: "head_of_finance", label: "Head of Finance" },
  { value: "safety_admin", label: "Safety Admin" },
  { value: "it_admin", label: "IT Admin" },
];

const roleBadge = (role: UserRole) => {
  switch (role) {
    case "super_admin":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[10px] font-bold">⭐ SUPER ADMIN</Badge>;
    case "hr_admin":
      return <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-bold">HR ADMIN</Badge>;
    case "finance_admin":
      return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-0 text-[10px] font-bold">FINANCE ADMIN</Badge>;
    case "it_admin":
      return <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-400 border-0 text-[10px] font-bold">IT ADMIN</Badge>;
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

const AnimatedCount = ({ value, duration = 800 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const raf = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    if (raf.current) {
      cancelAnimationFrame(raf.current);
    }

    if (value <= 0) {
      setDisplayValue(value);
      return;
    }

    startTime.current = null;

    const animate = (timestamp: number) => {
      if (startTime.current === null) {
        startTime.current = timestamp;
      }

      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const current = Math.round(progress * value);
      setDisplayValue(current);

      if (progress < 1) {
        raf.current = requestAnimationFrame(animate);
      }
    };

    raf.current = requestAnimationFrame(animate);

    return () => {
      if (raf.current) {
        cancelAnimationFrame(raf.current);
      }
    };
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
};

const SuperAdminDashboard = () => {
  const { user: currentUser } = useAuth();
  const { updateUser, deleteUser } = useUsers();
  const { submissions, announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useSubmissions();
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
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isDeactivatingUser, setIsDeactivatingUser] = useState(false);
  const [isViewAll, setIsViewAll] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementAction, setAnnouncementAction] = useState<string | null>(null);

  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState<string | null>(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState("");
  const [isSavingDepartment, setIsSavingDepartment] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState<string | null>(null);

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        
        const { data: deptData } = await supabase.from("departments").select("name").order("name");
        if (deptData) {
          setDepartmentsList(deptData.map((d: any) => d.name));
        }

        const { data, error } = await supabase.from("users").select("*").eq("status", "active").order("name");
        if (error) throw error;

        const fetchedUsers: FirestoreUser[] = (data || []).map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          email: doc.email,
          employeeId: doc.employeeId,
          department: doc.department,
          position: doc.position,
          role: doc.role || "employee",
          createdAt: doc.created_at ? new Date(doc.created_at) : undefined,
          is_head_of_finance: doc.is_head_of_finance || false,
          avatar: doc.avatar,
          secondary_roles: doc.secondary_roles || [],
          status: doc.status || "active",
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
    const effectiveRoles = [u.role, ...(u.secondary_roles || [])];
    if (roleFilter === "employee" && u.role !== "employee") return false;
    if (roleFilter === "hos" && u.role !== "hos") return false;
    if (roleFilter === "hod" && u.role !== "hod") return false;
    if (roleFilter === "admin" && !effectiveRoles.some(role => ["hr_admin", "finance_admin", "it_admin", "head_of_purchasing", "head_of_finance", "safety_admin", "super_admin"].includes(role))) return false;

    if (departmentFilter !== "all" && u.department !== departmentFilter) return false;

    if (search) {
      const q = search.toLowerCase();
      const nameMatch = (u.name || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const idMatch = (u.employeeId || '').toLowerCase().includes(q);
      const roleMatch = (u.role || '').toLowerCase().includes(q);
      const secondaryRoleMatch = (u.secondary_roles || []).some(role => role.toLowerCase().includes(q));

      if (!(nameMatch || emailMatch || idMatch || roleMatch || secondaryRoleMatch)) {
        return false;
      }
    }
    return true;
  });

  const stats = {
    totalPersonnel: users.length,
    activeHOS: users.filter(u => u.role === 'hos').length,
    activeHOD: users.filter(u => u.role === 'hod').length,
    otherAdmins: users.filter(u => [u.role, ...(u.secondary_roles || [])].some(role => ["super_admin", "safety_admin", "finance_admin", "it_admin", "hr_admin", "security_guard"].includes(role))).length,
    totalCarBookings: submissions.filter(s => s.formType === 'car_rental').length,
    totalGatePass: submissions.filter(s => s.formType === 'leave').length,
    totalClaims: submissions.filter(s => s.formType === 'claim').length,
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

    setIsSavingUser(true);
    try {
      const updates = { 
        role: editRole, 
        department: editDepartment,
        secondary_roles: editSecondaryRoles.filter(role => role !== editRole),
      };
      
      const success = await updateUser(selectedUser.id, updates);

      if (!success) {
        throw new Error("The user record could not be updated.");
      }

      const { error: auditError } = await supabase.from("permission_audit_logs").insert([{
        actor_user_id: currentUser?.id || null,
        actor_name: currentUser?.name || "Super Admin",
        target_user_id: selectedUser.id,
        target_user_name: selectedUser.name,
        action: "permissions_updated",
        previous_values: { role: selectedUser.role, department: selectedUser.department, secondary_roles: selectedUser.secondary_roles || [] },
        new_values: updates,
      }]);
      if (auditError) console.error("Permission audit log could not be written:", auditError);

      setUsers(current => current.map(person => person.id === selectedUser.id ? { ...person, ...updates, secondary_roles: updates.secondary_roles.filter(role => role !== editRole) } : person));
      setSheetOpen(false);
      toast.success(`${selectedUser.name}'s role updated successfully`);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Failed to update permissions: ${error.message || "An unknown error occurred."}`);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Deactivate ${selectedUser.name}? They will be removed from the active directory and will no longer have application access.`)) return;

    setIsDeactivatingUser(true);
    try {
      const success = await deleteUser(selectedUser.id);
      if (!success) throw new Error("The user could not be deactivated.");

      const { error: auditError } = await supabase.from("permission_audit_logs").insert([{
        actor_user_id: currentUser?.id || null,
        actor_name: currentUser?.name || "Super Admin",
        target_user_id: selectedUser.id,
        target_user_name: selectedUser.name,
        action: "user_deactivated",
        previous_values: { status: selectedUser.status || "active", role: selectedUser.role, secondary_roles: selectedUser.secondary_roles || [] },
        new_values: { status: "inactive" },
      }]);
      if (auditError) console.error("Deactivation audit log could not be written:", auditError);

      setUsers(users.filter(u => u.id !== selectedUser.id));
      setSheetOpen(false);
      toast.success("User deactivated successfully");
    } catch (error) {
      console.error("Error deactivating user:", error);
      toast.error("Failed to deactivate user");
    } finally {
      setIsDeactivatingUser(false);
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
    
    setIsSavingDepartment(true);
    try {
      const { error } = await supabase.from("departments").insert([{ name: cleanName }]);
      if (error) throw error;
      
      setDepartmentsList([...departmentsList, cleanName].sort());
      toast.success(`Department "${cleanName}" added successfully`);
      setNewDeptName("");
    } catch (err: any) {
      console.error("Error adding department:", err);
      toast.error("Failed to add department: " + err.message);
    } finally {
      setIsSavingDepartment(false);
    }
  };

  const handleDeleteDepartment = async (deptName: string) => {
    setDeletingDepartment(deptName);
    try {
      const { count, error: assignmentError } = await supabase.from("users").select("id", { count: "exact", head: true }).eq("department", deptName);
      if (assignmentError) throw assignmentError;
      if ((count || 0) > 0) {
        toast.error(`Cannot delete "${deptName}" because ${count} user${count === 1 ? " is" : "s are"} still assigned to it. Reassign them first.`);
        return;
      }
      if (!window.confirm(`Are you sure you want to delete the department "${deptName}"?`)) return;

      const { error } = await supabase.from("departments").delete().eq("name", deptName);
      if (error) throw error;
      
      setDepartmentsList(departmentsList.filter(d => d !== deptName));
      toast.success(`Department "${deptName}" deleted successfully`);
    } catch (err: any) {
      console.error("Error deleting department:", err);
      toast.error("Failed to delete department: " + err.message);
    } finally {
      setDeletingDepartment(null);
    }
  };

  const handleRenameDepartment = async (currentName: string) => {
    const cleanName = editingDepartmentName.trim();
    if (!cleanName) return toast.error("Department name cannot be empty");
    if (cleanName === currentName) {
      setEditingDepartment(null);
      return;
    }
    if (departmentsList.some(name => name !== currentName && name.toLowerCase() === cleanName.toLowerCase())) {
      return toast.error("Department already exists");
    }

    setIsSavingDepartment(true);
    try {
      const { error: departmentError } = await supabase.from("departments").update({ name: cleanName }).eq("name", currentName);
      if (departmentError) throw departmentError;

      const { error: usersError } = await supabase.from("users").update({ department: cleanName }).eq("department", currentName);
      if (usersError) {
        await supabase.from("departments").update({ name: currentName }).eq("name", cleanName);
        throw usersError;
      }

      setDepartmentsList(current => current.map(name => name === currentName ? cleanName : name).sort());
      setUsers(current => current.map(user => user.department === currentName ? { ...user, department: cleanName } : user));
      setEditingDepartment(null);
      setEditingDepartmentName("");
      toast.success(`Department renamed to "${cleanName}"`);
    } catch (error: any) {
      console.error("Error renaming department:", error);
      toast.error("Failed to rename department: " + error.message);
    } finally {
      setIsSavingDepartment(false);
    }
  };

  const handleResetAllForms = async () => {
    const confirm1 = window.confirm("⚠️WARNING: This will permanently delete all form submissions across the entire system. Are you absolutely sure?");
    if (!confirm1) return;
    
    const confirm2 = window.prompt('Type "RESET_SUBMISSIONS" to confirm:');
    if (confirm2 !== "RESET_SUBMISSIONS") {
      toast.info("System reset cancelled.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("submissions").delete().neq("id", "0");
      if (error) throw error;

      toast.success("System Reset Completed!");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error("Error wiping forms:", err);
      toast.error("Failed to delete forms: " + err.message);
      setIsLoading(false);
    }
  };

  const handleAnnouncementSubmit = async () => {
    if (announcementAction) return;
    if (!announcementContent.trim()) {
      toast.error("Announcement content cannot be empty.");
      return;
    }
  
    try {
      setAnnouncementAction(editingAnnouncement ? `edit:${editingAnnouncement.id}` : "publish");
      if (editingAnnouncement) {
        const success = await updateAnnouncement(editingAnnouncement.id, {
          content: announcementContent,
          is_active: editingAnnouncement.is_active,
        });
        if (success) {
          toast.success("Announcement updated successfully!");
          setEditingAnnouncement(null);
          setAnnouncementContent("");
        }
      } else {
        const success = await addAnnouncement(announcementContent, true);
        if (success) {
          toast.success("Announcement published successfully!");
          setAnnouncementContent("");
        }
      }
    } catch (error) {
      console.error("Error handling announcement:", error);
      toast.error("Failed to save announcement.");
    } finally {
      setAnnouncementAction(null);
    }
  };

  const handleToggleAnnouncementActive = async (announcement: Announcement) => {
    if (announcementAction) return;
    try {
      setAnnouncementAction(`toggle:${announcement.id}`);
      const success = await updateAnnouncement(announcement.id, { is_active: !announcement.is_active });
      if (success) toast.success(announcement.is_active ? "Announcement deactivated." : "Announcement activated.");
    } catch (error) {
      console.error("Error toggling announcement:", error);
      toast.error("Failed to update announcement status.");
    } finally {
      setAnnouncementAction(null);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (announcementAction || !window.confirm("Are you sure you want to permanently delete this announcement?")) return;
    try {
      setAnnouncementAction(`delete:${id}`);
      const success = await deleteAnnouncement(id);
      if (success) {
        if (editingAnnouncement?.id === id) {
          setEditingAnnouncement(null);
          setAnnouncementContent("");
        }
        toast.success("Announcement removed.");
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement.");
    } finally {
      setAnnouncementAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 duration-300" aria-busy="true" aria-live="polite">
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-primary/60" />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Loading user directory…</p>
            <p className="text-sm text-muted-foreground">Retrieving the latest staff and access records.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[0, 1, 2, 3, 4, 5].map((card) => (
            <div key={card} className="card-elevated p-4 border-l-4 border-l-muted">
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>

        <div className="card-elevated overflow-hidden">
          <div className="p-5 flex flex-col sm:flex-row gap-4 justify-between">
            <Skeleton className="h-9 w-full sm:w-72" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          <div className="border-t border-border p-5 space-y-5">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 flex-shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="hidden sm:block h-4 w-24" />
                <Skeleton className="hidden lg:block h-4 w-24" />
                <Skeleton className="hidden lg:block h-5 w-20 rounded-full" />
                <Skeleton className="hidden lg:block h-8 w-16 justify-self-end" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Fullscreen Image Preview Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-0 cursor-zoom-out" onClick={() => setFullscreenImage(null)}>
          <button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-black/50 transition-colors">
            <XCircle className="h-8 w-8" />
          </button>
          <img src={fullscreenImage} alt="User avatar fullscreen preview" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all user accounts and permissions.</p>
        </div>
        <div className="relative w-full sm:w-[220px]">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="w-full h-11 px-5 flex items-center justify-center gap-2.5 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-lg transition-colors text-sm font-bold whitespace-nowrap shadow-sm"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            <Settings className="h-[18px] w-[18px]" />
            Settings
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
              <div role="menu" className="absolute right-0 top-full mt-2 w-full min-w-[220px] bg-background border border-border rounded-xl shadow-xl z-50 flex flex-col p-1.5 animate-in fade-in slide-in-from-top-2">
                <button onClick={() => { setAddDeptOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center justify-start gap-3 px-3.5 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-foreground">
                  <FolderPlus className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                  <span>Manage Departments</span>
                </button>
                <button onClick={() => { setIsAnnouncementsOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center justify-start gap-2.5 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-foreground">
                  <Megaphone className="h-4 w-4 text-muted-foreground flex-shrink-0" /> Announcements
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 animate-in fade-in-5 slide-in-from-bottom-2 duration-500">
        <div className="card-elevated p-4 border-l-4 border-l-primary/50">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Staff</p>
          <p className="text-3xl font-bold text-foreground"><AnimatedCount value={stats.totalPersonnel} /></p>
        </div>
        <div className="card-elevated p-4 border-l-4 border-l-violet-500">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Active HOS</p>
          <p className="text-3xl font-bold text-foreground"><AnimatedCount value={stats.activeHOS} /></p>
        </div>
        <div className="card-elevated p-4 border-l-4 border-l-sky-500">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Active HOD</p>
          <p className="text-3xl font-bold text-foreground"><AnimatedCount value={stats.activeHOD} /></p>
        </div>
        <div className="card-elevated p-4 border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Vehicle Forms</p>
          <p className="text-3xl font-bold text-foreground"><AnimatedCount value={stats.totalCarBookings} /></p>
        </div>
        <div className="card-elevated p-4 border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Gate Pass Forms</p>
          <p className="text-3xl font-bold text-foreground"><AnimatedCount value={stats.totalGatePass} /></p>
        </div>
        <div className="card-elevated p-4 border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Petty Cash Claims</p>
          <p className="text-3xl font-bold text-foreground"><AnimatedCount value={stats.totalClaims} /></p>
        </div>
      </div>

      {/* Users Table */}
      <div className="card-elevated overflow-hidden">
        <div className="p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setIsViewAll(false); }} className="pl-9 pr-9 h-9 text-sm" />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Select value={roleFilter} onValueChange={val => { setRoleFilter(val); setIsViewAll(false); }}>
              <SelectTrigger className="h-9 w-full md:w-[240px]">
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
              <SelectTrigger className="h-9 w-full md:w-[240px]">
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
                    <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${!u.avatar ? getInitialColor(u.name) : 'bg-transparent'} ${u.avatar ? 'cursor-pointer' : ''}`}
                         onClick={() => u.avatar && setFullscreenImage(u.avatar)}
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" title="Click to enlarge"/>
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
                <TableCell>
                  <div className="flex min-w-[150px] flex-wrap gap-1.5">
                    {roleBadge(u.role)}
                    {(u.secondary_roles || []).map(role => (
                      <Badge key={role} className="border border-primary/20 bg-primary/5 text-[9px] font-bold text-primary">
                        + {SECONDARY_ROLE_OPTIONS.find(option => option.value === role)?.label || role.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
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
            <SheetDescription className="text-sm text-muted-foreground pt-1">
              Editing permissions for {selectedUser?.name} ({selectedUser?.email}).
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 px-1">
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
                  {SECONDARY_ROLE_OPTIONS.filter(opt => opt.value !== editRole && !editSecondaryRoles.includes(opt.value)).map(opt => (
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

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleDeleteUser}
                disabled={isSavingUser || isDeactivatingUser}
                className="px-3 py-2.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-colors flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
                title="Deactivate User"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSheetOpen(false)}
                disabled={isSavingUser || isDeactivatingUser}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSavingUser || isDeactivatingUser}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingUser ? "Saving..." : isDeactivatingUser ? "Deactivating..." : "Save Changes"}
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
            <SheetDescription className="text-sm text-muted-foreground pt-1">
              Add new departments or remove existing ones from the system.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 px-1">
            <form onSubmit={event => { event.preventDefault(); if (!isSavingDepartment) handleAddDepartmentSubmit(); }} className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
              <p className="text-xs font-bold text-primary tracking-wider uppercase">Add New Department</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input placeholder="e.g. Research & Development" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="bg-background flex-1" disabled={isSavingDepartment} />
              </div>
              <button type="submit" disabled={isSavingDepartment || !newDeptName.trim()} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                <Plus className="h-4 w-4" /> {isSavingDepartment ? "Adding..." : "Add Department"}
              </button>
            </form>

            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Existing Departments</p>
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                {departmentsList.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground text-center bg-muted/5">No departments found.</p>
                ) : departmentsList.map(dept => (
                  <div key={dept} className="p-3 flex items-center justify-between gap-2 hover:bg-muted/10 transition-colors group bg-background">
                    {editingDepartment === dept ? (
                      <form onSubmit={event => { event.preventDefault(); handleRenameDepartment(dept); }} className="flex min-w-0 flex-1 items-center gap-2">
                        <Input value={editingDepartmentName} onChange={event => setEditingDepartmentName(event.target.value)} className="h-9 min-w-0 flex-1" autoFocus disabled={isSavingDepartment} />
                        <button type="submit" disabled={isSavingDepartment || !editingDepartmentName.trim()} className="rounded-md p-2 text-primary hover:bg-primary/10 disabled:opacity-50" title="Save department name"><Save className="h-4 w-4" /></button>
                        <button type="button" disabled={isSavingDepartment} onClick={() => { setEditingDepartment(null); setEditingDepartmentName(""); }} className="rounded-md p-2 text-muted-foreground hover:bg-muted" title="Cancel rename"><X className="h-4 w-4" /></button>
                      </form>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate pr-2 text-sm font-medium text-foreground">{dept}</span>
                        <div className="flex shrink-0 items-center gap-1">
                          <button onClick={() => { setEditingDepartment(dept); setEditingDepartmentName(dept); }} disabled={isSavingDepartment || deletingDepartment !== null} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50" title="Rename Department"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => handleDeleteDepartment(dept)} disabled={isSavingDepartment || deletingDepartment !== null} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" title="Delete Department">
                            {deletingDepartment === dept ? <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manage Announcements Sheet */}
      <Sheet open={isAnnouncementsOpen} onOpenChange={setIsAnnouncementsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="text-xl font-bold text-foreground">Manage Announcements</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground pt-1">
              Create and manage global site announcements for all users.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 px-1">
            <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
              <p className="text-xs font-bold text-primary tracking-wider uppercase">{editingAnnouncement ? "Edit Announcement" : "Add New Announcement"}</p>
              <div className="flex flex-col gap-2">
                <textarea
                  placeholder="Enter announcement text..."
                  value={announcementContent} 
                  onChange={e => setAnnouncementContent(e.target.value)} 
                  className="w-full min-h-[80px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                {editingAnnouncement && (
                  <button onClick={() => { setEditingAnnouncement(null); setAnnouncementContent(""); }} disabled={!!announcementAction} className="w-1/3 py-2.5 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/70 disabled:opacity-60 disabled:cursor-not-allowed">
                    Cancel
                  </button>
                )}
                <button onClick={handleAnnouncementSubmit} disabled={!!announcementAction} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                  {editingAnnouncement ? <Save className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                  {announcementAction === "publish" || announcementAction?.startsWith("edit:") ? "Saving..." : editingAnnouncement ? "Save Changes" : "Publish"}
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Existing Announcements</p>
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                {!announcements || announcements.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground text-center bg-muted/5">No announcements found.</p>
                ) : (announcements || []).map(ann => (
                  <div key={ann.id} className={`p-3 flex items-start justify-between gap-3 hover:bg-muted/10 transition-colors group ${ann.is_active ? 'bg-primary/5' : 'bg-background'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <Badge className={ann.is_active ? "border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "border-0 bg-muted text-muted-foreground"}>{ann.is_active ? "Active" : "Inactive"}</Badge>
                        <span className="text-[11px] text-muted-foreground">{new Date(ann.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                      </div>
                      <p className={`text-sm font-medium break-words ${ann.is_active ? 'text-foreground' : 'text-muted-foreground'}`}>{ann.content}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleToggleAnnouncementActive(ann)} disabled={!!announcementAction} aria-label={ann.is_active ? "Deactivate announcement" : "Activate announcement"} className={`p-2 sm:p-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${ann.is_active ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted'}`} title={ann.is_active ? "Deactivate" : "Activate"}>
                        <Megaphone className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </button>
                      <button onClick={() => { setEditingAnnouncement(ann); setAnnouncementContent(ann.content); }} disabled={!!announcementAction} aria-label="Edit announcement" className="p-2 sm:p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Edit">
                        <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteAnnouncement(ann.id)} disabled={!!announcementAction} aria-label="Delete announcement" className="p-2 sm:p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Delete">
                        <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </button>
                    </div>
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
