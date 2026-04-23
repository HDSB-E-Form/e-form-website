import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, KeyRound, Save, Pencil, X, Mail, Phone, IdCard, Briefcase, Camera } from "lucide-react";
import { supabase } from "@/supabase";

const getInitials = (name?: string) =>
  (name || " ").split(" ").map(n => n ? n[0] : "").join("").toUpperCase().slice(0, 2);

const roleLabels: Record<string, string> = {
  employee: "Employee",
  hod: "Head of Department",
  hos: "Head of Section",
  hr_admin: "HR Admin",
  finance_admin: "Finance Admin",
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

  const [profile, setProfile] = useState({
    name: user?.name || "",
    employeeId: user?.employeeId || "",
    department: user?.department || "",
    phone: user?.phone || "",
  });

  // Keep profile form in sync if background fetch updates user
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || "",
        employeeId: user.employeeId || "",
        department: user.department || "",
        phone: user.phone || "",
      });
      setPreviewUrl(user.avatar || "");
      setAvatarFile(null);
    }
  }, [user]);

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

      const success = await updateUserProfile(user.id, { ...profile, avatar: finalAvatarUrl });
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
    if (password.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
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

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your personal information and security settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left side: Profile form */}
        <div className="lg:col-span-2">
          {!isEditing ? (
            <div className="card-elevated p-6 relative overflow-hidden">
              <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors" title="Edit Profile">
                <Pencil className="h-4 w-4" />
              </button>
              
              <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shadow-sm overflow-hidden flex-shrink-0 border border-border">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(user?.name)
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
                <p className="text-sm font-medium text-muted-foreground mt-0.5">{user?.role ? roleLabels[user.role] || user.role : ""}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">Email Address</p>
                  <p className="text-sm font-medium text-foreground flex items-start gap-2"><Mail className="h-4 w-4 text-primary/70 mt-0.5 flex-shrink-0"/> <span className="break-all">{user?.email}</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">Phone Number</p>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2"><Phone className="h-4 w-4 text-primary/70 flex-shrink-0"/> {user?.phone || <span className="text-muted-foreground italic">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">Staff ID</p>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2"><IdCard className="h-4 w-4 text-primary/70 flex-shrink-0"/> {user?.employeeId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">Department</p>
                  <p className="text-sm font-medium text-foreground flex items-start gap-2"><Briefcase className="h-4 w-4 text-primary/70 mt-0.5 flex-shrink-0"/> <span className="break-words">{user?.department}</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">Position</p>
                  <p className="text-sm font-medium text-foreground flex items-start gap-2"><Briefcase className="h-4 w-4 text-primary/70 mt-0.5 flex-shrink-0"/> <span className="break-words">{(user as any)?.position || <span className="text-muted-foreground italic">Not set</span>}</span></p>
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
                  <button type="button" onClick={handleCancel} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors" title="Cancel">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-5 mb-6">
                  <div className="relative group w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shadow-sm overflow-hidden flex-shrink-0 border border-border">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(profile.name)
                    )}
                    <label className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                      <Camera className="h-6 w-6" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={isProfileSaving} />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Profile Photo</p>
                    <p className="text-xs text-muted-foreground">Click the image to upload a new photo</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input value={profile.name} onChange={e => handleProfileChange("name", e.target.value)} autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email Address</Label>
                      <Input value={user?.email || ""} disabled className="cursor-not-allowed bg-muted/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Staff ID</Label>
                      <Input value={profile.employeeId} onChange={e => handleProfileChange("employeeId", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone Number</Label>
                      <Input value={profile.phone} onChange={e => handleProfileChange("phone", e.target.value)} placeholder="e.g. +60123456789" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Input value={profile.department} onChange={e => handleProfileChange("department", e.target.value)} />
                  </div>
                </div>
                <div className="mt-6 border-t border-border pt-5 flex justify-end gap-3">
                  <button type="button" onClick={handleCancel} className="px-5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="btn-gold px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2" disabled={isProfileSaving}>
                    <Save className="h-4 w-4" />
                    {isProfileSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Right side: Password form */}
        <div>
          <form onSubmit={handlePasswordSubmit}>
            <div className="card-elevated p-6">
              <div className="flex items-center gap-3 mb-5">
                <KeyRound className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-foreground text-lg">Change Password</h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  {isPasswordRecovery ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <p className="text-sm text-blue-800 font-medium">
                        Enter a new password for your account.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Label>Current Password <span className="text-destructive">*</span></Label>
                      <Input type="password" value={password.currentPassword} onChange={e => handlePasswordChange("currentPassword", e.target.value)} required={!isPasswordRecovery} />
                    </>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>New Password <span className="text-destructive">*</span></Label>
                  <Input type="password" value={password.newPassword} onChange={e => handlePasswordChange("newPassword", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm New Password <span className="text-destructive">*</span></Label>
                  <Input type="password" value={password.confirmPassword} onChange={e => handlePasswordChange("confirmPassword", e.target.value)} required />
                </div>
              </div>
              <div className="mt-6 border-t border-border pt-4 flex justify-end">
                <button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md text-sm font-bold" disabled={isPasswordSaving}>
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
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm flex flex-col items-center shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-foreground mb-1">Adjust Photo</h3>
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