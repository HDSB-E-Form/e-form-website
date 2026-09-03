import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, KeyRound, Save, Pencil, X, Mail, Phone, IdCard, Briefcase, Camera, CreditCard, Eye, EyeOff, Check } from "lucide-react";
import { supabase } from "@/supabase";
import { isStrongPassword, strongPasswordMessage, PASSWORD_REQUIREMENTS } from "@/lib/password";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const getInitials = (name?: string) =>
  (name || " ").split(" ").map(n => n ? n[0] : "").join("").toUpperCase().slice(0, 2);

const maskIcNumber = (value?: string) => {
  if (!value) return null;
  const visible = value.slice(-4);
  return `${"•".repeat(Math.max(value.length - 4, 4))}${visible}`;
};

const roleLabels: Record<string, string> = {
  employee: "Employee",
  hod: "Head of Department",
  hos: "Head of Section",
  hr_admin: "HR Admin",
  finance_admin: "Finance Admin",
  it_admin: "IT Admin",
  safety_admin: "Safety Admin",
  security_guard: "Security Guard",
  head_of_purchasing: "Head of Purchasing",
  head_of_finance: "Head of Finance",
  manco_member: "Manco Member",
  super_admin: "Super Admin",
};

const ProfilePage = () => {
  const { user, updateUserProfile, changePassword } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(user?.avatar || "");
  
  // Crop feature states
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({ current: false, next: false, confirm: false });
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const displayedRoles = user
    ? Array.from(new Set([user.role, ...(user.secondary_roles || [])])).map(role => roleLabels[role] || role.replace(/_/g, " "))
    : [];

  const [profile, setProfile] = useState({
    name: user?.name || "",
    employeeId: user?.employeeId || "",
    department: user?.department || "",
    phone: user?.phone || "",
    position: (user as any)?.position || "",
    icNo: user?.icNo || "",
    drivingLicenseNo: user?.drivingLicenseNo || "",
  });

  // Keep profile form in sync if background fetch updates user
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || "",
        employeeId: user.employeeId || "",
        department: user.department || "",
        phone: user.phone || "",
        position: (user as any)?.position || "",
        icNo: user.icNo || "",
        drivingLicenseNo: user.drivingLicenseNo || "",
      });
      setPreviewUrl(user.avatar || "");
      setAvatarFile(null);
    }
  }, [user]);

  // Fetch live departments from database
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase.from("departments").select("name").order("name");
      if (data) {
        setDepartmentsList(data.map((d: any) => d.name));
      }
    };
    fetchDepartments();
  }, []);

  // Listen for Supabase's PASSWORD_RECOVERY event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const cropDialogRef = useRef<HTMLDivElement>(null);

  // Make the avatar crop modal behave like a real dialog: lock body scroll,
  // trap focus, close on Escape, and restore focus to the trigger on close.
  useEffect(() => {
    if (!cropImage) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        cropDialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) || []
      ).filter(el => !el.hasAttribute("disabled"));

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCropImage(null);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [cropImage]);

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  const handleProfileChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPassword(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCropImage(URL.createObjectURL(file));
      setCropScale(1);
      setCropPosition({ x: 0, y: 0 });
      e.target.value = ''; // Reset input so the same file can be selected again
    }
  };

  const handleCropConfirm = () => {
    if (!cropImage) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Apply identical transformations to match the visual CSS cropper exactly
      ctx.translate(128 + cropPosition.x, 128 + cropPosition.y);
      const scaleCover = Math.max(256 / img.width, 256 / img.height);
      ctx.scale(scaleCover * cropScale, scaleCover * cropScale);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'avatar.png', { type: 'image/png' });
          setAvatarFile(file);
          setPreviewUrl(URL.createObjectURL(blob));
          setCropImage(null);
        }
      }, 'image/png');
    };
    img.src = cropImage;
  };

  const onCropMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - cropPosition.x, y: clientY - cropPosition.y });
  };

  const onCropMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setCropPosition({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const onCropMouseUp = () => setIsDragging(false);

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      setProfile({
        name: user.name || "",
        employeeId: user.employeeId || "",
        department: user.department || "",
        phone: user.phone || "",
        position: (user as any)?.position || "",
          icNo: user.icNo || "",
          drivingLicenseNo: user.drivingLicenseNo || "",
      });
      setPreviewUrl(user.avatar || "");
    }
    setAvatarFile(null);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !updateUserProfile) return;
    setIsProfileSaving(true);
    try {
      let finalAvatarUrl = user.avatar || "";

      if (avatarFile) {
        const filePath = `public/${user.id}/avatar_${Date.now()}_${avatarFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { data, error } = await supabase.storage.from('form-attachments').upload(filePath, avatarFile, { upsert: true });

        if (error) {
          toast.error(`Failed to upload avatar: ${error.message}`);
          setIsProfileSaving(false);
          return;
        }

        if (data) {
          const { data: urlData } = supabase.storage.from('form-attachments').getPublicUrl(data.path);
          finalAvatarUrl = urlData.publicUrl;
        }
      }

      // Map frontend state to database column names
      const { employeeId, drivingLicenseNo, icNo, ...restOfProfile } = profile;
      const updateData = {
        ...restOfProfile,
        employeeId: employeeId, // ensure employeeId is passed if it's a db column
        driving_license_no: drivingLicenseNo,
        ic_no: icNo,
        avatar: finalAvatarUrl,
      };
      const success = await updateUserProfile(user.id, updateData);
      if (success) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
        setAvatarFile(null);
      }
    } catch (error) {
      console.error("An unexpected error occurred in handleProfileSubmit:", error);
      toast.error("A client-side error occurred. Please check the console.");
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.newPassword !== password.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (!isStrongPassword(password.newPassword)) {
      toast.error(strongPasswordMessage);
      return;
    }
    setIsPasswordSaving(true);
    try {
      if (isPasswordRecovery) {
        // Password reset flow (user doesn't know current password)
        const { error } = await supabase.auth.updateUser({ password: password.newPassword });
        if (error) throw error;
        toast.success("Password updated successfully! You can now log in.");
        setIsPasswordRecovery(false);
        navigate("/login");
      } else {
        // Logged-in user changing their password
        if (!user || !changePassword) {
          throw new Error("User not authenticated for password change.");
        }
        const success = await changePassword(user.id, password.currentPassword, password.newPassword);
        if (success) {
          toast.success("Password changed successfully!");
          setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
        }
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error(error.message || "Failed to update password.");
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const confirmationEntered = password.confirmPassword.length > 0;
  const passwordsMatch = confirmationEntered && password.newPassword === password.confirmPassword;
  const passwordChecks = [
    { label: `At least ${PASSWORD_REQUIREMENTS.minLength} characters`, met: password.newPassword.length >= PASSWORD_REQUIREMENTS.minLength },
    { label: "One uppercase letter", met: PASSWORD_REQUIREMENTS.uppercase.test(password.newPassword) },
    { label: "One lowercase letter", met: PASSWORD_REQUIREMENTS.lowercase.test(password.newPassword) },
    { label: "One number", met: PASSWORD_REQUIREMENTS.number.test(password.newPassword) },
    { label: "One special character", met: PASSWORD_REQUIREMENTS.special.test(password.newPassword) },
  ];
  const passwordStrengthScore = password.newPassword ? passwordChecks.filter(check => check.met).length : 0;
  const passwordStrength =
    passwordStrengthScore <= 2
      ? { label: "Weak", color: "bg-destructive", textColor: "text-destructive" }
      : passwordStrengthScore === 3
        ? { label: "Fair", color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" }
        : passwordStrengthScore === 4
          ? { label: "Good", color: "bg-cyan-500", textColor: "text-cyan-600 dark:text-cyan-400" }
          : { label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 slide-in-from-bottom-2 duration-500">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your personal information and security settings.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left side: Profile form */}
        <div className="lg:col-span-2">
          {!isEditing ? (
            <div className="card-elevated p-6 relative overflow-hidden">
              <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit Profile">
                <Pencil className="h-4 w-4" />
                <span>Edit Profile</span>
              </button>
              
              <div className="flex items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary via-blue-500 to-cyan-400 p-0.5 shadow-lg shadow-primary/15 sm:h-24 sm:w-24">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[1.5px] border-white bg-muted/70 text-2xl font-bold text-primary dark:border-background">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(user?.name)
                  )}
                </div>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground leading-tight">{user?.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {displayedRoles.map((role, index) => <span key={role} className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{index > 0 && <span className="mr-1 opacity-60">+</span>}{role}</span>)}
                    </div>
                  </div>
                </div>
                
                <button onClick={() => setIsEditing(true)} className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/60 text-foreground shadow-sm transition-colors hover:bg-primary/10 hover:text-primary sm:hidden" title="Edit Profile" aria-label="Edit profile">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                <div className="md:col-span-2 border-b border-border/60 pb-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Account</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">Email Address</p>
                  <p className="text-sm font-medium text-foreground flex items-start gap-2"><Mail className="h-4 w-4 text-primary/70 mt-0.5 flex-shrink-0"/> <span className="break-all">{user?.email}</span></p>
                </div>
                <div className="md:col-span-2 border-b border-border/60 pb-2 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Employment</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">Staff ID</p>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2"><IdCard className="h-4 w-4 text-primary/70 flex-shrink-0"/> {user?.employeeId || <span className="text-muted-foreground italic">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">Department</p>
                  <p className="text-sm font-medium text-foreground flex items-start gap-2"><Briefcase className="h-4 w-4 text-primary/70 mt-0.5 flex-shrink-0"/> <span className="break-words">{user?.department || <span className="text-muted-foreground italic">Not set</span>}</span></p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">Position</p>
                  <p className="text-sm font-medium text-foreground flex items-start gap-2"><Briefcase className="h-4 w-4 text-primary/70 mt-0.5 flex-shrink-0"/> <span className="break-words">{(user as any)?.position || <span className="text-muted-foreground italic">Not set</span>}</span></p>
                </div>
                <div className="md:col-span-2 border-b border-border/60 pb-2 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Contact</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">Phone Number</p>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2"><Phone className="h-4 w-4 text-primary/70 flex-shrink-0"/> {user?.phone || <span className="text-muted-foreground italic">Not set</span>}</p>
                </div>
                <div className="md:col-span-2 border-b border-border/60 pb-2 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Identification</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">IC Number</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary/70 flex-shrink-0"/> {maskIcNumber(user?.icNo) || <span className="text-muted-foreground italic">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">License Number</p>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary/70 flex-shrink-0"/> {user?.drivingLicenseNo || <span className="text-muted-foreground italic">Not set</span>}</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileSubmit}>
              <div className="card-elevated p-6">
                <div className="flex items-center justify-between mb-5 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <h2 className="font-bold text-foreground text-lg">Edit Profile</h2>
                  </div>
                  <button type="button" onClick={handleCancel} className="flex items-center justify-center p-2.5 bg-muted/60 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors border border-border/50 shadow-sm" title="Cancel">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-5 mb-6">
                  <div className="group flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary via-blue-500 to-cyan-400 p-0.5 shadow-lg shadow-primary/15">
                    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[1.5px] border-white bg-muted/70 text-2xl font-bold text-primary dark:border-background">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        getInitials(profile.name)
                      )}
                      <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 text-white opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                        <Camera className="h-6 w-6" />
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={isProfileSaving} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Profile Photo</p>
                    <p className="text-xs text-muted-foreground">Click the image to upload a new photo</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Email Address</Label>
                    <Input value={user?.email || ""} disabled className="cursor-not-allowed bg-muted/50" />
                    <p className="text-[10px] text-muted-foreground">Your email address is used for login and cannot be changed.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input value={profile.name} onChange={e => handleProfileChange("name", e.target.value)} autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Staff ID</Label>
                      <Input value={profile.employeeId} onChange={e => handleProfileChange("employeeId", e.target.value)} placeholder="Enter your Staff ID" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Job Title / Position</Label>
                      <Input value={profile.position} onChange={e => handleProfileChange("position", e.target.value)} placeholder="e.g. Assistant Manager" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Department</Label>
                      <Select value={departmentsList.includes(profile.department) ? profile.department : undefined} onValueChange={val => handleProfileChange("department", val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                        {departmentsList.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Phone Number</Label>
                      <Input value={profile.phone} onChange={e => handleProfileChange("phone", e.target.value)} placeholder="e.g. +60123456789" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>IC Number</Label>
                      <Input value={profile.icNo} onChange={e => handleProfileChange("icNo", e.target.value)} placeholder="e.g. 900101-01-1111" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Driving License No.</Label>
                      <Input value={profile.drivingLicenseNo} onChange={e => handleProfileChange("drivingLicenseNo", e.target.value)} placeholder="Enter License No." />
                    </div>
                  </div>
                </div>
                <div className="mt-6 border-t border-border pt-5 flex flex-col-reverse sm:flex-row justify-end gap-3">
                  <button type="button" onClick={handleCancel} className="w-full sm:w-auto px-5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors text-center">
                    Cancel
                  </button>
                  <button type="submit" className="btn-gold w-full sm:w-auto px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300" disabled={isProfileSaving}>
                    <Save className="h-4 w-4" />
                    {isProfileSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Right side: Password form */}
        <div className={`${isEditing ? "hidden xl:block" : ""} xl:sticky xl:top-6 xl:self-start`}>
          <form onSubmit={handlePasswordSubmit}>
            <div className="card-elevated p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <KeyRound className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-lg">Change Password</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Use a secure password you do not use elsewhere.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  {isPasswordRecovery ? (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                    <p className="text-sm text-blue-800 dark:text-blue-400 font-medium">
                        Enter a new password for your account.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Label>Current Password <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Input type={visiblePasswords.current ? "text" : "password"} value={password.currentPassword} onChange={e => handlePasswordChange("currentPassword", e.target.value)} className="pr-10" required={!isPasswordRecovery} />
                        <button type="button" onClick={() => setVisiblePasswords(p => ({ ...p, current: !p.current }))} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={visiblePasswords.current ? "Hide current password" : "Show current password"}>
                          {visiblePasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>New Password <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input type={visiblePasswords.next ? "text" : "password"} value={password.newPassword} onChange={e => handlePasswordChange("newPassword", e.target.value)} className="pr-10" required />
                    <button type="button" onClick={() => setVisiblePasswords(p => ({ ...p, next: !p.next }))} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={visiblePasswords.next ? "Hide new password" : "Show new password"}>
                      {visiblePasswords.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.newPassword && (
                    <div className="space-y-1.5 pt-1" aria-live="polite">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Password strength</span>
                        <span className={`font-semibold ${passwordStrength.textColor}`}>{passwordStrength.label}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map(level => (
                          <span
                            key={level}
                            className={`h-1.5 rounded-full transition-colors ${
                              level <= passwordStrengthScore ? passwordStrength.color : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <ul className="space-y-1 pt-1" aria-live="polite">
                    {passwordChecks.map(check => (
                      <li
                        key={check.label}
                        className={`flex items-center gap-1.5 text-xs ${check.met ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                      >
                        {check.met
                          ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />}
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm New Password <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input type={visiblePasswords.confirm ? "text" : "password"} value={password.confirmPassword} onChange={e => handlePasswordChange("confirmPassword", e.target.value)} className="pr-10" required />
                    <button type="button" onClick={() => setVisiblePasswords(p => ({ ...p, confirm: !p.confirm }))} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={visiblePasswords.confirm ? "Hide confirmation password" : "Show confirmation password"}>
                      {visiblePasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmationEntered && (
                    <p
                      className={`flex items-center gap-1.5 text-xs font-medium ${
                        passwordsMatch
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      }`}
                      aria-live="polite"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${passwordsMatch ? "bg-emerald-500" : "bg-destructive"}`} />
                      {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 border-t border-border pt-4 flex justify-end">
                <button type="submit" className="btn-gold w-full h-11 rounded-lg text-sm font-bold disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300" disabled={isPasswordSaving}>
                  {isPasswordSaving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Interactive Crop Modal */}
      {cropImage && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 touch-none">
          <div
            ref={cropDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="crop-dialog-title"
            className="bg-background rounded-2xl p-6 w-full max-w-sm flex flex-col items-center shadow-2xl animate-in fade-in zoom-in duration-200"
          >
            <h3 id="crop-dialog-title" className="text-lg font-bold text-foreground mb-1">Adjust Photo</h3>
            <p className="text-xs text-muted-foreground mb-6">Drag to reposition, use slider to zoom</p>
            
            <div 
              className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-muted cursor-move select-none shadow-inner bg-black/5"
              onMouseDown={onCropMouseDown}
              onMouseMove={onCropMouseMove}
              onMouseUp={onCropMouseUp}
              onMouseLeave={onCropMouseUp}
              onTouchStart={onCropMouseDown}
              onTouchMove={onCropMouseMove}
              onTouchEnd={onCropMouseUp}
            >
              <img 
                src={cropImage} 
                alt="Crop preview" 
                className="absolute max-w-none pointer-events-none"
                style={{
                  transform: `translate(-50%, -50%) translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${cropScale})`,
                  left: '50%',
                  top: '50%',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                draggable={false}
              />
            </div>

            <div className="w-full mt-6 space-y-2 px-2">
              <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                <span>Zoom</span>
                <span>{Math.round(cropScale * 100)}%</span>
              </div>
              <input type="range" min="1" max="3" step="0.05" value={cropScale} onChange={(e) => setCropScale(parseFloat(e.target.value))} className="w-full accent-primary" />
            </div>

            <div className="w-full flex gap-3 mt-8">
              <button onClick={() => setCropImage(null)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors">
                Cancel
              </button>
              <button onClick={handleCropConfirm} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
                Confirm Fit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
