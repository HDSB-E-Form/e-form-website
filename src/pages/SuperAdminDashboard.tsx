import { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// ADDED: "Save" icon to the lucide-react imports
import { Download, Search, Shield, Users, UserCheck, User, Plus, Trash2, ShieldAlert, ShieldCheck as SafetyIcon, FolderPlus, MonitorCog, X, Megaphone, Pencil, Save, Upload, Image as ImageIcon, ZoomIn, UserX, UserRoundCheck, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/contexts/types";
import { supabase } from "@/supabase";
import { useUsers } from "@/contexts/UsersContext"; 
import { useSubmissions, type Announcement } from "@/contexts/SubmissionsContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ITAdminFacilitiesSettings } from "@/components/ITAdminFacilitiesSettings";
import { ITApplicationOptionsSettings } from "@/components/ITApplicationOptionsSettings";

interface FirestoreUser {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
  position: string;
  phone?: string;
  role: UserRole;
  createdAt?: Date;
  avatar?: string;
  secondary_roles?: UserRole[];
  status?: string;
  deactivatedAt?: Date;
  deactivatedBy?: string;
  deactivatedByName?: string;
  reactivatedAt?: Date;
}

interface HomePosterConfig {
  enabled: boolean;
  url: string | null;
  version?: string;
}

const DEFAULT_HOME_POSTER_CONFIG: HomePosterConfig = { enabled: false, url: null };

const fetchAdminUsers = async (): Promise<FirestoreUser[]> => {
  const { data, error } = await supabase.from("users").select("*").order("name");
  if (error) throw error;

  return (data || []).map((doc: any) => ({
    id: doc.id,
    name: doc.name,
    email: doc.email,
    employeeId: doc.employeeId,
    department: doc.department,
    position: doc.position,
    phone: doc.phone,
    role: doc.role || "employee",
    createdAt: doc.createdAt || doc.created_at
      ? new Date(doc.createdAt || doc.created_at)
      : undefined,
    is_head_of_finance: doc.is_head_of_finance || false,
    avatar: doc.avatar,
    secondary_roles: doc.secondary_roles || [],
    status: doc.status || "active",
    deactivatedAt: doc.deactivated_at ? new Date(doc.deactivated_at) : undefined,
    deactivatedBy: doc.deactivated_by || undefined,
    deactivatedByName: doc.deactivated_by_name || undefined,
    reactivatedAt: doc.reactivated_at ? new Date(doc.reactivated_at) : undefined,
  }));
};

const fetchDepartmentNames = async (): Promise<string[]> => {
  const { data, error } = await supabase.from("departments").select("name").order("name");
  if (error) throw error;
  return (data || []).map((d: any) => d.name);
};

const fetchHomePosterConfig = async (): Promise<HomePosterConfig> => {
  const { data, error } = await supabase
    .from("safety_dashboard_settings")
    .select("value")
    .eq("key", "home_poster")
    .maybeSingle();
  if (error) throw error;
  return (data?.value as HomePosterConfig) || DEFAULT_HOME_POSTER_CONFIG;
};

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; description: string; icon: any }> = [
  { value: "employee", label: "Employee", description: "Standard submission access", icon: User },
  { value: "security_guard", label: "Security Guard", description: "Approve pass exit forms", icon: ShieldAlert },
  { value: "hos", label: "Head of Section", description: "Approve section submissions", icon: Users },
  { value: "hod", label: "Head of Department", description: "Approve department submissions", icon: Users },
  { value: "manco_member", label: "Manco Member", description: "Approve Gate Pass requests after HOD", icon: Users },
  { value: "hr_admin", label: "HR Admin", description: "Manage HR forms & fleet", icon: UserCheck },
  { value: "finance_admin", label: "Finance Admin", description: "Manage finance & claims", icon: UserCheck },
  { value: "it_admin", label: "IT Admin", description: "Manage CCTV access requests", icon: UserCheck },
  { value: "safety_admin", label: "Safety Admin", description: "View safety dashboards & reports", icon: SafetyIcon },
  { value: "store_pic", label: "Store PIC", description: "Approve or reject Material Requisition Slips", icon: UserCheck },
  { value: "store_admin", label: "Store Admin", description: "Full oversight of all Store Department submissions", icon: UserCheck },
  { value: "super_admin", label: "Super Admin", description: "Full system access & user management", icon: Shield },
];

const SECONDARY_ROLE_OPTIONS: Array<{ value: UserRole; label: string; }> = [
  { value: "hos", label: "Head of Section" },
  { value: "hod", label: "Head of Department" },
  { value: "head_of_purchasing", label: "Head of Purchasing" },
  { value: "head_of_finance", label: "Head of Finance" },
  { value: "manco_member", label: "Manco Member" },
  { value: "hr_admin", label: "HR Admin" },
  { value: "finance_admin", label: "Finance Admin" },
  { value: "safety_admin", label: "Safety Admin" },
  { value: "it_admin", label: "IT Admin" },
  { value: "security_guard", label: "Security Guard" },
  { value: "store_pic", label: "Store PIC" },
  { value: "store_admin", label: "Store Admin" },
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
    case "manco_member":
      return <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-0 text-[10px] font-bold">MANCO MEMBER</Badge>;
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
    case "store_pic":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[10px] font-bold">STORE PIC</Badge>;
    case "store_admin":
      return <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-0 text-[10px] font-bold">STORE ADMIN</Badge>;
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
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { updateUser, refreshUsers } = useUsers();
  const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useSubmissions();
  const queryClient = useQueryClient();
  const {
    data: users = [],
    isLoading: isUsersLoading,
    error: usersError,
  } = useQuery({ queryKey: ["admin-users"], queryFn: fetchAdminUsers });
  const {
    data: departmentsList = [],
    isLoading: isDepartmentsLoading,
  } = useQuery({ queryKey: ["departments"], queryFn: fetchDepartmentNames });
  const { data: homePosterConfig = DEFAULT_HOME_POSTER_CONFIG, error: posterError } = useQuery({
    queryKey: ["home-poster-config"],
    queryFn: fetchHomePosterConfig,
  });
  const isLoading = isUsersLoading || isDepartmentsLoading;

  useEffect(() => {
    if (usersError) {
      console.error("Error fetching users:", usersError);
      toast.error("Failed to load users");
    }
  }, [usersError]);

  useEffect(() => {
    if (posterError) console.error("Could not load Home poster settings:", posterError);
  }, [posterError]);

  const isSettingsPage = pathname === "/admin/settings";
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [registrationDateFilter, setRegistrationDateFilter] = useState("all");
  const [directoryView, setDirectoryView] = useState<"active" | "inactive">("active");
  const [selectedUser, setSelectedUser] = useState<FirestoreUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRole, setEditRole] = useState<UserRole>("employee");
  const [editDepartment, setEditDepartment] = useState("");
  const [editSecondaryRoles, setEditSecondaryRoles] = useState<UserRole[]>([]);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isDeactivatingUser, setIsDeactivatingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isViewAll, setIsViewAll] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportUserScope, setExportUserScope] = useState<"all" | "active" | "inactive">("all");
  const [isHomePosterOpen, setIsHomePosterOpen] = useState(false);
  const [isUploadingHomePoster, setIsUploadingHomePoster] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  const [isITFacilitiesOpen, setIsITFacilitiesOpen] = useState(false);
  const [isITApplicationOptionsOpen, setIsITApplicationOptionsOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementAction, setAnnouncementAction] = useState<string | null>(null);

  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState<string | null>(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState("");
  const [isSavingDepartment, setIsSavingDepartment] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState<string | null>(null);

  useEffect(() => {
    const panel = searchParams.get("panel");
    if (panel === "departments") setAddDeptOpen(true);
    if (panel === "poster") setIsHomePosterOpen(true);
    if (panel === "announcements") setIsAnnouncementsOpen(true);
  }, [searchParams]);

  const filtered = users.filter(u => {
    if ((u.status || "active") !== directoryView) return false;
    const effectiveRoles = [u.role, ...(u.secondary_roles || [])];
    if (roleFilter === "employee" && !effectiveRoles.includes("employee")) return false;
    if (roleFilter === "manco_member" && !effectiveRoles.includes("manco_member")) return false;
    if (roleFilter === "hos" && !effectiveRoles.includes("hos")) return false;
    if (roleFilter === "hod" && !effectiveRoles.includes("hod")) return false;
    if (roleFilter === "admin" && !effectiveRoles.some(role => ["hr_admin", "finance_admin", "it_admin", "safety_admin", "super_admin"].includes(role))) return false;

    if (departmentFilter !== "all" && u.department !== departmentFilter) return false;

    if (registrationDateFilter !== "all") {
      if (!u.createdAt || Number.isNaN(u.createdAt.getTime())) return false;

      const cutoff = new Date();
      if (registrationDateFilter === "week") cutoff.setDate(cutoff.getDate() - 7);
      if (registrationDateFilter === "month") cutoff.setDate(cutoff.getDate() - 30);
      if (registrationDateFilter === "year") cutoff.setFullYear(cutoff.getFullYear() - 1);

      if (u.createdAt < cutoff) return false;
    }

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

  const activeUsers = users.filter(person => (person.status || "active") === "active");
  const inactiveUsers = users.filter(person => person.status === "inactive");

  const handleExportUsers = () => {
    if (exportStartDate && exportEndDate && exportStartDate > exportEndDate) {
      toast.error("The From date must be earlier than or equal to the To date.");
      return;
    }

    const toDateKey = (date?: Date) => {
      if (!date || Number.isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const usersToExport = users
      .filter(person => exportUserScope === "all" || (person.status || "active") === exportUserScope)
      .filter(person => {
        const joinedDate = toDateKey(person.createdAt);
        if (exportStartDate && (!joinedDate || joinedDate < exportStartDate)) return false;
        if (exportEndDate && (!joinedDate || joinedDate > exportEndDate)) return false;
        return true;
      })
      .sort((a, b) => {
        const dateDifference = (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
        return dateDifference || (a.name || "").localeCompare(b.name || "");
      });

    if (usersToExport.length === 0) {
      toast.error("No users were found for the selected status and registration date range.");
      return;
    }

    const formatDateTime = (date?: Date) =>
      date && !Number.isNaN(date.getTime()) ? date.toLocaleString("en-GB") : "";
    const protectSpreadsheetText = (value?: string) => value ? `\u200B${value}` : "";
    const escapeCsvCell = (value: unknown) => {
      let text = value === null || value === undefined ? "" : String(value);
      if (/^[=+\-@]/.test(text.trimStart())) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };

    const includeAccountLifecycle = exportUserScope !== "active";
    const headerRow: Array<string | number> = [
      "No.",
      "Name",
      "Staff ID",
      "Email",
      "Phone Number",
      "Department",
      "Position",
      "Primary Role",
      "Additional Roles",
      "Account Status",
      "Date Joined / Registered",
    ];
    if (includeAccountLifecycle) {
      headerRow.push("Deactivated Date", "Deactivated By", "Reactivated Date");
    }
    const rows: Array<Array<string | number>> = [headerRow];

    usersToExport.forEach((person, index) => {
      const row: Array<string | number> = [
        index + 1,
        person.name || "",
        protectSpreadsheetText(person.employeeId),
        person.email || "",
        protectSpreadsheetText(person.phone),
        person.department || "",
        person.position || "",
        ROLE_OPTIONS.find(option => option.value === person.role)?.label || person.role.replace(/_/g, " "),
        (person.secondary_roles || [])
          .map(role => SECONDARY_ROLE_OPTIONS.find(option => option.value === role)?.label || role.replace(/_/g, " "))
          .join(", "),
        (person.status || "active").toUpperCase(),
        formatDateTime(person.createdAt),
      ];
      if (includeAccountLifecycle) {
        row.push(
          formatDateTime(person.deactivatedAt),
          person.deactivatedByName || "",
          formatDateTime(person.reactivatedAt),
        );
      }
      rows.push(row);
    });

    const csvContent = `\uFEFF${rows.map(row => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `HDSB_User_Directory_${exportUserScope}_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExportOpen(false);
    toast.success(`${usersToExport.length} user record${usersToExport.length === 1 ? "" : "s"} exported successfully.`);
  };

  const saveHomePosterConfig = async (nextConfig: HomePosterConfig) => {
    const previousConfig = homePosterConfig;
    queryClient.setQueryData<HomePosterConfig>(["home-poster-config"], nextConfig);
    const { error } = await supabase.from("safety_dashboard_settings").upsert({
      key: "home_poster",
      value: nextConfig,
      updated_by: currentUser?.id || "",
      updated_at: new Date().toISOString(),
    });
    if (error) {
      queryClient.setQueryData<HomePosterConfig>(["home-poster-config"], previousConfig);
      toast.error(`Failed to save Home poster settings: ${error.message}`);
      return false;
    }
    return true;
  };

  const getPosterStoragePath = (url: string | null) => {
    if (!url) return null;
    const marker = "/form-attachments/";
    const markerIndex = url.indexOf(marker);
    if (markerIndex < 0) return null;
    return decodeURIComponent(url.slice(markerIndex + marker.length));
  };

  const handleHomePosterUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Poster image size must be less than 12MB.");
      return;
    }

    setIsUploadingHomePoster(true);
    const previousUrl = homePosterConfig.url;
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `public/home-poster_${Date.now()}_${safeName}`;
    try {
      const { data, error } = await supabase.storage.from("form-attachments").upload(filePath, file);
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from("form-attachments").getPublicUrl(data.path);
      const saved = await saveHomePosterConfig({
        enabled: true,
        url: publicUrlData.publicUrl,
        version: new Date().toISOString(),
      });
      if (!saved) {
        await supabase.storage.from("form-attachments").remove([data.path]);
        return;
      }

      const previousPath = getPosterStoragePath(previousUrl);
      if (previousPath?.startsWith("public/home-poster_")) {
        const { error: cleanupError } = await supabase.storage.from("form-attachments").remove([previousPath]);
        if (cleanupError) console.warn("Could not remove the replaced Home poster file:", cleanupError);
      }
      toast.success(previousUrl ? "Home poster replaced successfully." : "Home poster uploaded successfully.");
    } catch (error: any) {
      toast.error(`Failed to upload Home poster: ${error.message}`);
    } finally {
      setIsUploadingHomePoster(false);
    }
  };

  const handleDeleteHomePoster = async () => {
    if (!homePosterConfig.url || !window.confirm("Delete the current Home poster? It will no longer appear for users.")) return;
    const currentPath = getPosterStoragePath(homePosterConfig.url);
    const saved = await saveHomePosterConfig({
      enabled: false,
      url: null,
      version: new Date().toISOString(),
    });
    if (!saved) return;

    if (currentPath?.startsWith("public/home-poster_")) {
      const { error } = await supabase.storage.from("form-attachments").remove([currentPath]);
      if (error) console.warn("The Home poster was removed from display but its storage file could not be deleted:", error);
    }
    toast.success("Home poster deleted.");
  };

  const normalizedAdditionalRoles = editSecondaryRoles.filter(role => role !== editRole).slice().sort();
  const originalAdditionalRoles = (selectedUser?.secondary_roles || []).filter(role => role !== selectedUser?.role).slice().sort();
  const hasUserChanges = Boolean(selectedUser) && (
    editRole !== selectedUser?.role ||
    editDepartment !== selectedUser?.department ||
    JSON.stringify(normalizedAdditionalRoles) !== JSON.stringify(originalAdditionalRoles)
  );

  const openManage = (user: FirestoreUser) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditDepartment(user.department);
    setEditSecondaryRoles(user.secondary_roles || []);
    setDeleteConfirmation("");
    setIsDeleteConfirmationOpen(false);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    if (editRole === "super_admin" && selectedUser.role !== "super_admin" && !window.confirm(`Grant Super Admin access to ${selectedUser.name}? This provides full system access.`)) return;

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

      queryClient.setQueryData<FirestoreUser[]>(["admin-users"], current =>
        (current || []).map(person => person.id === selectedUser.id ? { ...person, ...updates, secondary_roles: updates.secondary_roles.filter(role => role !== editRole) } : person));
      setSheetOpen(false);
      toast.success(`${selectedUser.name}'s role updated successfully`);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Failed to update permissions: ${error.message || "An unknown error occurred."}`);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!selectedUser) return;
    if (selectedUser.id === currentUser?.id) {
      toast.error("You cannot deactivate your own Super Admin account.");
      return;
    }
    if (!window.confirm(`Deactivate ${selectedUser.name}? They will be removed from the active directory and will no longer have application access.`)) return;

    setIsDeactivatingUser(true);
    try {
      const deactivatedAt = new Date().toISOString();
      const { data: deactivatedUser, error: deactivateError } = await supabase
        .from("users")
        .update({
          status: "inactive",
          deactivated_at: deactivatedAt,
          deactivated_by: currentUser?.id || null,
          deactivated_by_name: currentUser?.name || "Super Admin",
        })
        .eq("id", selectedUser.id)
        .select("id")
        .single();
      if (deactivateError || !deactivatedUser) throw deactivateError || new Error("The user record could not be deactivated.");

      const { error: auditError } = await supabase.from("permission_audit_logs").insert([{
        actor_user_id: currentUser?.id || null,
        actor_name: currentUser?.name || "Super Admin",
        target_user_id: selectedUser.id,
        target_user_name: selectedUser.name,
        action: "user_deactivated",
        previous_values: { status: selectedUser.status || "active", role: selectedUser.role, secondary_roles: selectedUser.secondary_roles || [] },
        new_values: { status: "inactive", deactivated_at: deactivatedAt },
      }]);
      if (auditError) console.error("Deactivation audit log could not be written:", auditError);

      queryClient.setQueryData<FirestoreUser[]>(["admin-users"], current => (current || []).map(person => person.id === selectedUser.id ? {
        ...person,
        status: "inactive",
        deactivatedAt: new Date(deactivatedAt),
        deactivatedBy: currentUser?.id,
        deactivatedByName: currentUser?.name || "Super Admin",
      } : person));
      await refreshUsers();
      setSheetOpen(false);
      toast.success("User deactivated successfully");
    } catch (error) {
      console.error("Error deactivating user:", error);
      toast.error("Failed to deactivate user");
    } finally {
      setIsDeactivatingUser(false);
    }
  };

  const handleReactivateUser = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Reactivate ${selectedUser.name}? They will be able to sign in and access the application again.`)) return;

    setIsDeactivatingUser(true);
    try {
      const reactivatedAt = new Date().toISOString();
      const { data: reactivatedUser, error: reactivateError } = await supabase
        .from("users")
        .update({
          status: "active",
          reactivated_at: reactivatedAt,
          reactivated_by: currentUser?.id || null,
          reactivated_by_name: currentUser?.name || "Super Admin",
        })
        .eq("id", selectedUser.id)
        .select("id")
        .single();
      if (reactivateError || !reactivatedUser) throw reactivateError || new Error("The user record could not be reactivated.");

      const { error: auditError } = await supabase.from("permission_audit_logs").insert([{
        actor_user_id: currentUser?.id || null,
        actor_name: currentUser?.name || "Super Admin",
        target_user_id: selectedUser.id,
        target_user_name: selectedUser.name,
        action: "user_reactivated",
        previous_values: { status: "inactive" },
        new_values: { status: "active", reactivated_at: reactivatedAt },
      }]);
      if (auditError) console.error("Reactivation audit log could not be written:", auditError);

      queryClient.setQueryData<FirestoreUser[]>(["admin-users"], current => (current || []).map(person => person.id === selectedUser.id ? {
        ...person,
        status: "active",
        reactivatedAt: new Date(reactivatedAt),
      } : person));
      await refreshUsers();
      setSheetOpen(false);
      toast.success("User reactivated successfully");
    } catch (error) {
      console.error("Error reactivating user:", error);
      toast.error("Failed to reactivate user");
    } finally {
      setIsDeactivatingUser(false);
    }
  };

  const handlePermanentDeleteUser = async () => {
    if (!selectedUser || selectedUser.status !== "inactive") return;
    if (selectedUser.id === currentUser?.id) {
      toast.error("You cannot permanently delete your own Super Admin account.");
      return;
    }
    if (deleteConfirmation.trim().toLowerCase() !== selectedUser.email.trim().toLowerCase()) {
      toast.error("Enter the user's email address exactly to confirm permanent deletion.");
      return;
    }

    setIsDeletingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: selectedUser.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.setQueryData<FirestoreUser[]>(["admin-users"], current =>
        (current || []).filter(person => person.id !== selectedUser.id));
      await refreshUsers();
      setDeleteConfirmation("");
      setIsDeleteConfirmationOpen(false);
      setSheetOpen(false);
      toast.success(`${selectedUser.name}'s account was permanently deleted.`);
    } catch (error: unknown) {
      console.error("Error permanently deleting user:", error);
      const message = error instanceof Error ? error.message : "Failed to permanently delete the user.";
      toast.error(message);
    } finally {
      setIsDeletingUser(false);
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

      queryClient.setQueryData<string[]>(["departments"], current => [...(current || []), cleanName].sort());
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

      queryClient.setQueryData<string[]>(["departments"], current => (current || []).filter(d => d !== deptName));
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

      const { error: usersUpdateError } = await supabase.from("users").update({ department: cleanName }).eq("department", currentName);
      if (usersUpdateError) {
        await supabase.from("departments").update({ name: currentName }).eq("name", cleanName);
        throw usersUpdateError;
      }

      queryClient.setQueryData<string[]>(["departments"], current => (current || []).map(name => name === currentName ? cleanName : name).sort());
      queryClient.setQueryData<FirestoreUser[]>(["admin-users"], current => (current || []).map(user => user.department === currentName ? { ...user, department: cleanName } : user));
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
    toast.error("Bulk deletion is disabled. Use Submission Records to delete one terminal record at a time.");
    return;
    /*
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
    */
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
      {isSettingsPage ? (
        <div>
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage organization-wide configuration and Home page content.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <button type="button" onClick={() => setAddDeptOpen(true)} className="group rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FolderPlus className="h-5 w-5" />
              </span>
              <span className="block text-base font-bold text-foreground">Manage Departments</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">Add, rename, or remove departments used throughout the system.</span>
            </button>

            <button type="button" onClick={() => setIsHomePosterOpen(true)} className="group rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <ImageIcon className="h-5 w-5" />
              </span>
              <span className="block text-base font-bold text-foreground">Manage Home Poster</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">Upload, replace, enable, or disable the Home page poster.</span>
            </button>

            <button type="button" onClick={() => setIsAnnouncementsOpen(true)} className="group rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Megaphone className="h-5 w-5" />
              </span>
              <span className="block text-base font-bold text-foreground">Announcements</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">Publish and manage organization-wide announcements.</span>
            </button>

            <button type="button" onClick={() => setIsITFacilitiesOpen(true)} className="group rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <MonitorCog className="h-5 w-5" />
              </span>
              <span className="block text-base font-bold text-foreground">IT Admin Facilities</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">Add, edit, or remove requisition checkboxes in the IT Request Form (Admin).</span>
            </button>

            <button type="button" onClick={() => setIsITApplicationOptionsOpen(true)} className="group rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <MonitorCog className="h-5 w-5" />
              </span>
              <span className="block text-base font-bold text-foreground">IT Application Options</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">Add, edit, or remove application checkboxes in the IT Request Form (Application).</span>
            </button>
          </div>
        </div>
      ) : (
      <>
      {/* Fullscreen Image Preview Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-8" onClick={() => setFullscreenImage(null)}>
          <div className="h-[90vh] w-[95vw]">
            <img src={fullscreenImage} alt="User avatar fullscreen preview" className="h-full w-full object-contain" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage active accounts and retain inactive employee records.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsExportOpen(true)}
          className="h-11 w-full gap-2 font-bold sm:w-auto"
        >
          <Download className="h-[18px] w-[18px]" />
          Export Users
        </Button>
      </div>

      {/* Users Table */}
      <div className="card-elevated overflow-hidden">
        <div className="flex border-b border-border bg-muted/10 px-5 pt-4">
          <button
            type="button"
            onClick={() => { setDirectoryView("active"); setIsViewAll(false); }}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${directoryView === "active" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <UserCheck className="h-4 w-4" />
            Active Users
            <Badge className="border-0 bg-muted text-muted-foreground">{activeUsers.length}</Badge>
          </button>
          <button
            type="button"
            onClick={() => { setDirectoryView("inactive"); setIsViewAll(false); }}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${directoryView === "inactive" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Archive className="h-4 w-4" />
            Inactive Users
            <Badge className="border-0 bg-muted text-muted-foreground">{inactiveUsers.length}</Badge>
          </button>
        </div>
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
                <SelectItem value="employee">Employees</SelectItem>
                <SelectItem value="manco_member">Manco Members</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="hod">HOD</SelectItem>
                <SelectItem value="hos">HOS</SelectItem>
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
            <Select value={registrationDateFilter} onValueChange={val => { setRegistrationDateFilter(val); setIsViewAll(false); }}>
              <SelectTrigger className="h-9 w-full md:w-[200px]">
                <SelectValue placeholder="Registration Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Registration Dates</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="year">Last 12 Months</SelectItem>
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
                <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
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
                    <div className={`group relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold ${!u.avatar ? getInitialColor(u.name) : 'bg-transparent'} ${u.avatar ? 'cursor-zoom-in ring-1 ring-border' : ''}`}
                         onClick={() => u.avatar && setFullscreenImage(u.avatar)}
                    >
                       {u.avatar ? (
                         <img src={u.avatar} alt={u.name} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" title="Click to enlarge"/>
                       ) : (
                        getInitials(u.name)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.employeeId}</p>
                      {directoryView === "inactive" && u.deactivatedAt && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Inactive since {u.deactivatedAt.toLocaleDateString("en-GB")}
                        </p>
                      )}
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
                <TableCell>
                  {directoryView === "active"
                    ? <Badge className="border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Active</Badge>
                    : <Badge className="border-0 bg-muted text-muted-foreground">Inactive</Badge>}
                </TableCell>
                <TableCell className="text-center">
                  <button onClick={() => openManage(u)} className="px-4 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                    {directoryView === "active" ? "Manage" : "View"}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">{directoryView === "active" ? "No active users found" : "No inactive users found"}</p>
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
      </>
      )}

      {/* Home Poster Settings Sheet */}
      <Sheet open={isHomePosterOpen} onOpenChange={open => { setIsHomePosterOpen(open); if (!open && searchParams.get("panel") === "poster") navigate("/admin/users"); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="mb-6 border-b border-border pb-4">
            <SheetTitle className="text-xl font-bold">Home Poster Settings</SheetTitle>
            <SheetDescription>Manage the popup poster displayed to all signed-in users on the Home page.</SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4 shadow-sm">
              <div>
                <p className="text-sm font-bold text-foreground">Enable Popup Poster</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {homePosterConfig.url ? "Show the poster when users enter the Home page." : "Upload a poster before enabling this option."}
                </p>
              </div>
              <button
                type="button"
                disabled={!homePosterConfig.url}
                onClick={() => void saveHomePosterConfig({ ...homePosterConfig, enabled: !homePosterConfig.enabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${homePosterConfig.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                role="switch"
                aria-checked={homePosterConfig.enabled}
                aria-label="Enable Home popup poster"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${homePosterConfig.enabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Poster</Label>
              <div className="flex min-h-56 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/20 p-3">
                {homePosterConfig.url ? (
                  <button type="button" onClick={() => setFullscreenImage(homePosterConfig.url)} className="group relative flex h-full w-full items-center justify-center" title="Preview poster">
                    <img src={homePosterConfig.url} alt="Home poster preview" className="max-h-80 max-w-full rounded-lg object-contain shadow-sm" />
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <ZoomIn className="h-3 w-3" /> Preview
                    </span>
                  </button>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">No Home poster uploaded</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">PNG, JPG or WebP up to 12MB</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">
                <Upload className="h-4 w-4" />
                {isUploadingHomePoster ? "Uploading..." : homePosterConfig.url ? "Replace Poster" : "Upload Poster"}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleHomePosterUpload} disabled={isUploadingHomePoster} />
              </label>
              <button
                type="button"
                disabled={!homePosterConfig.url || isUploadingHomePoster}
                onClick={() => void handleDeleteHomePoster()}
                className="flex items-center justify-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" /> Delete Poster
              </button>
            </div>

            <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-4">
              <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
                The poster appears once per browser session for each uploaded version. Replacing the image makes the new poster appear again for all users.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* User Directory Export Sheet */}
      <Sheet open={isExportOpen} onOpenChange={setIsExportOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="mb-6 border-b border-border pb-4">
            <SheetTitle className="text-xl font-bold">Export User Directory</SheetTitle>
            <SheetDescription>Download active, inactive, or all user records as a spreadsheet-compatible CSV file.</SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            <div className="space-y-3 rounded-xl border border-border bg-background p-4 shadow-sm">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground">Account Status</Label>
              <Select value={exportUserScope} onValueChange={value => setExportUserScope(value as "all" | "active" | "inactive")}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active Users Only</SelectItem>
                  <SelectItem value="inactive">Inactive Users Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-background p-4 shadow-sm">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground">Registration Date Range</Label>
                <p className="mt-1 text-xs text-muted-foreground">The range applies to the user’s date joined or registration date.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">From Date</Label>
                  <Input type="date" value={exportStartDate} onChange={event => setExportStartDate(event.target.value)} className="h-9 text-xs dark:[color-scheme:dark]" />
                </div>
                <div>
                  <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">To Date</Label>
                  <Input type="date" value={exportEndDate} onChange={event => setExportEndDate(event.target.value)} className="h-9 text-xs dark:[color-scheme:dark]" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  setExportStartDate(today);
                  setExportEndDate(today);
                }} className="rounded-md bg-muted px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted/80">Today</button>
                <button type="button" onClick={() => {
                  const today = new Date();
                  const lastWeek = new Date(today);
                  lastWeek.setDate(today.getDate() - 7);
                  setExportStartDate(lastWeek.toISOString().split("T")[0]);
                  setExportEndDate(today.toISOString().split("T")[0]);
                }} className="rounded-md bg-muted px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted/80">Last 7 Days</button>
                <button type="button" onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  setExportStartDate(firstDay.toISOString().split("T")[0]);
                  setExportEndDate(today.toISOString().split("T")[0]);
                }} className="rounded-md bg-muted px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted/80">This Month</button>
                <button type="button" onClick={() => {
                  setExportStartDate("");
                  setExportEndDate("");
                }} className="rounded-md bg-muted px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted/80">All Dates</button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/10 p-4">
              <h3 className="text-sm font-bold text-foreground">User Directory Spreadsheet</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Includes names, staff IDs, contact details, department, position, roles, account status, registration date, and account lifecycle dates.
              </p>
              <button type="button" onClick={handleExportUsers} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-600">
                <Download className="h-3.5 w-3.5" /> Download Spreadsheet
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manage Permissions Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="pb-0">
            <SheetTitle className="text-xl font-bold text-foreground">Manage User</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground pt-1">
              {selectedUser?.status === "inactive"
                ? "Review this archived account and its retained access history."
                : "Review account details and update access permissions."}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 px-1">
            <div>
              <p className="mb-3 text-xs font-bold tracking-wider text-primary">USER INFORMATION</p>
              <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3 border-b border-border/60 p-4 pr-24">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold ${!selectedUser?.avatar ? getInitialColor(selectedUser?.name) : "bg-transparent"}`}>
                    {selectedUser?.avatar ? <img src={selectedUser.avatar} alt={selectedUser.name} className="h-full w-full object-cover" /> : getInitials(selectedUser?.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{selectedUser?.name || "—"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{selectedUser?.email || "—"}</p>
                  </div>
                </div>
                <div className="absolute right-4 top-4">
                  <Badge className={`border-0 text-[9px] ${selectedUser?.status === "inactive" ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}>
                    {selectedUser?.status === "inactive" ? "INACTIVE" : "ACTIVE"}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 p-4 min-[380px]:grid-cols-2">
                  {[
                    ["Staff ID", selectedUser?.employeeId],
                    ["Position", selectedUser?.position],
                    ["Department", selectedUser?.department],
                    ["Phone", selectedUser?.phone],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                      <p className="mt-1 break-words text-xs font-semibold leading-snug text-foreground">{value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <fieldset disabled={selectedUser?.status === "inactive"} className={`space-y-6 ${selectedUser?.status === "inactive" ? "opacity-65" : ""}`}>
            <div>
              <p className="mb-3 text-xs font-bold tracking-wider text-primary">DEPARTMENT</p>
              <Select value={departmentsList.includes(editDepartment) ? editDepartment : undefined} onValueChange={setEditDepartment}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {departmentsList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold tracking-wider text-primary">PRIMARY ROLE</p>
              <Select value={editRole} onValueChange={value => {
                const role = value as UserRole;
                setEditRole(role);
                setEditSecondaryRoles(current => current.filter(item => item !== role));
              }}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {ROLE_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{ROLE_OPTIONS.find(option => option.value === editRole)?.description}</p>
            </div>

            <div>
              <p className="mb-1 text-xs font-bold tracking-wider text-primary">ADDITIONAL ACCESS</p>
              <p className="mb-3 text-xs text-muted-foreground">A user may have multiple additional roles.</p>
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
                    {SECONDARY_ROLE_OPTIONS.find(o => o.value === role)?.label || role.replace(/_/g, " ")}
                    <button onClick={() => setEditSecondaryRoles(editSecondaryRoles.filter(r => r !== role))} className="ml-1.5 p-0.5 rounded-full hover:bg-black/10">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {editSecondaryRoles.length === 0 && <p className="text-xs text-muted-foreground p-2">No additional roles assigned.</p>}
              </div>
            </div>
            </fieldset>

            {selectedUser?.status === "inactive" && (
              <>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-bold tracking-wider text-primary">ACCOUNT HISTORY</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Deactivated</p>
                      <p className="mt-1 text-xs font-semibold text-foreground">{selectedUser.deactivatedAt?.toLocaleString("en-GB") || "Not recorded"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Deactivated By</p>
                      <p className="mt-1 text-xs font-semibold text-foreground">{selectedUser.deactivatedByName || "Not recorded"}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    The profile, submissions, approvals, and audit history remain stored under the same user ID.
                  </p>
                </div>

                {isDeleteConfirmationOpen && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                    <p className="text-xs font-bold tracking-wider text-destructive">PERMANENT DELETE</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      This permanently removes the user's login and profile. It cannot be undone. Enter <strong className="text-foreground">{selectedUser.email}</strong> to continue.
                    </p>
                    <Label htmlFor="permanent-delete-confirmation" className="mt-4 block text-xs font-semibold">Confirm email address</Label>
                    <Input
                      id="permanent-delete-confirmation"
                      type="email"
                      value={deleteConfirmation}
                      onChange={event => setDeleteConfirmation(event.target.value)}
                      placeholder={selectedUser.email}
                      autoComplete="off"
                      className="mt-1.5"
                    />
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setDeleteConfirmation(""); setIsDeleteConfirmationOpen(false); }}
                        disabled={isDeletingUser}
                        className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handlePermanentDeleteUser}
                        disabled={isDeletingUser || deleteConfirmation.trim().toLowerCase() !== selectedUser.email.trim().toLowerCase()}
                        className="flex-1 rounded-lg bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeletingUser ? "Deleting..." : "Delete Permanently"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <fieldset disabled={selectedUser?.status === "inactive"} className={`space-y-6 ${selectedUser?.status === "inactive" ? "opacity-65" : ""}`}>
            <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Access Summary</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-foreground">
                Primary: {ROLE_OPTIONS.find(option => option.value === editRole)?.label}
                {normalizedAdditionalRoles.length > 0 && ` · Additional: ${normalizedAdditionalRoles.map(role => SECONDARY_ROLE_OPTIONS.find(option => option.value === role)?.label || role.replace(/_/g, " ")).join(", ")}`}
              </p>
            </div>
            </fieldset>

            <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap gap-3 border-t border-border bg-background/95 px-1 pb-1 pt-4 backdrop-blur">
              <button
                onClick={() => setSheetOpen(false)}
                disabled={isSavingUser || isDeactivatingUser || isDeletingUser}
                className="min-h-11 min-w-28 flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectedUser?.status === "inactive" ? "Close" : "Cancel"}
              </button>
              {selectedUser?.status === "inactive" ? (
                <>
                  <button
                    onClick={handleReactivateUser}
                    disabled={isDeactivatingUser || isDeletingUser || isDeleteConfirmationOpen}
                    className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <UserRoundCheck className="h-4 w-4" />
                    {isDeactivatingUser ? "Reactivating..." : "Reactivate Account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmationOpen(true)}
                    disabled={isDeactivatingUser || isDeletingUser || isDeleteConfirmationOpen || selectedUser?.id === currentUser?.id}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-destructive/40 px-3 py-2.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                    title={selectedUser?.id === currentUser?.id ? "You cannot delete your own account" : "Permanently delete this inactive account"}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete Permanently</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleDeactivateUser}
                    disabled={isSavingUser || isDeactivatingUser || selectedUser?.id === currentUser?.id}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-destructive/30 px-3 py-2.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                    title={selectedUser?.id === currentUser?.id ? "You cannot deactivate your own account" : "Deactivate Account"}
                  >
                    <UserX className="h-4 w-4" />
                    <span className="hidden sm:inline">Deactivate</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSavingUser || isDeactivatingUser || !hasUserChanges}
                    className="min-h-11 min-w-32 flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingUser ? "Saving..." : isDeactivatingUser ? "Deactivating..." : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Submission Records now belongs to the All Submissions page.
      <Sheet open={isSubmissionRecordsOpen} onOpenChange={setIsSubmissionRecordsOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle className="text-xl font-bold">Submission Records</SheetTitle>
            <SheetDescription>
              Permanent deletion is limited to completed, rejected, and voided records. An audit snapshot is retained.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-3">
            {eligibleDeletionSubmissions.length === 0 ? (
              <p className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">No eligible records.</p>
            ) : eligibleDeletionSubmissions.map(submission => {
              const reference = getSubmissionReference(submission);
              const selected = deletionTarget?.id === submission.id;
              return (
                <div key={submission.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{reference}</p>
                      <p className="text-xs text-muted-foreground">{submission.employeeName} · {submission.formType.replace(/_/g, " ")}</p>
                    </div>
                    <Badge className="border-0 bg-muted text-muted-foreground uppercase">{submission.status}</Badge>
                  </div>
                  {!selected ? (
                    <button type="button" onClick={() => { setDeletionTarget(submission); setDeletionReason(""); setDeletionConfirmation(""); }} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" /> Permanently Delete
                    </button>
                  ) : (
                    <div className="mt-4 space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                      <p className="text-xs font-semibold text-destructive">This cannot be undone. Type the exact reference number to confirm.</p>
                      <textarea value={deletionReason} onChange={event => setDeletionReason(event.target.value)} rows={2} placeholder="Required deletion reason..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                      <Input value={deletionConfirmation} onChange={event => setDeletionConfirmation(event.target.value)} placeholder={`Type ${reference}`} />
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" disabled={isDeletingSubmission} onClick={() => setDeletionTarget(null)} className="rounded-lg bg-muted px-4 py-2 text-sm font-semibold">Cancel</button>
                        <button type="button" disabled={isDeletingSubmission || deletionConfirmation !== reference || deletionReason.trim().length < 5} onClick={handlePermanentSubmissionDelete} className="rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground disabled:opacity-50">
                          {isDeletingSubmission ? "Deleting..." : "Delete Permanently"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
      */}

      {/* Manage Departments Sheet */}
      <Sheet open={addDeptOpen} onOpenChange={open => { setAddDeptOpen(open); if (!open && searchParams.get("panel") === "departments") navigate("/admin/users"); }}>
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
      <Sheet open={isAnnouncementsOpen} onOpenChange={open => { setIsAnnouncementsOpen(open); if (!open && searchParams.get("panel") === "announcements") navigate("/admin/users"); }}>
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

      <Sheet open={isITFacilitiesOpen} onOpenChange={setIsITFacilitiesOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle className="text-xl font-bold">IT Admin Facilities</SheetTitle>
            <SheetDescription>
              Manage the requisition options shown as checkboxes in IT Request Form (Admin). Existing submissions are never changed.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ITAdminFacilitiesSettings />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isITApplicationOptionsOpen} onOpenChange={setIsITApplicationOptionsOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle className="text-xl font-bold">IT Application Options</SheetTitle>
            <SheetDescription>
              Manage the application and ERP-module checkboxes shown in IT Request Form (Application). Existing submissions are never changed.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ITApplicationOptionsSettings />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SuperAdminDashboard;
