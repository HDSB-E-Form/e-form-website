import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/supabase";
import { toast } from "sonner";
import { type UserRole } from "./types";

export interface User {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
  position: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  is_head_of_finance?: boolean;
  is_head_of_purchasing?: boolean;
  secondary_roles?: UserRole[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (data: Partial<User> & { password: string }) => Promise<boolean>;
  logout: () => void;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  updateUserProfile: (userId: string, updates: Partial<User>) => Promise<boolean>;
  changePassword: (userId: string, oldPassword: string, newPassword: string) => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("hr_user") || sessionStorage.getItem("hr_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync user from localStorage on mount and listen for changes
  useEffect(() => {
    const storedUser = localStorage.getItem("hr_user") || sessionStorage.getItem("hr_user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // Check if Supabase actually has a valid session
        supabase.auth.getSession().then(({ data: sessionData }) => {
          if (!sessionData.session) {
            // If no active session, destroy the stale local storage
            setUser(null);
            localStorage.removeItem("hr_user");
            sessionStorage.removeItem("hr_user");
            return;
          }

          // Background refresh to ensure missing fields (like employeeId) are synced from DB
          supabase.from("users").select("*").eq("id", parsedUser.id).single()
            .then(async ({ data, error }) => {
              if (data && !error) {
                // Also fetch auth metadata to grab the phone number safely
                const { data: authData } = await supabase.auth.getUser();
                
                // Ensure role is perfectly formatted without spaces or bad casing
                const dbRole = (data.role || parsedUser.role || "employee").toString().trim().toLowerCase();

                const updatedUser = {
                  ...parsedUser,
                  name: data.name || parsedUser.name,
                  employeeId: data.employeeId || data.employeeid || authData?.user?.user_metadata?.employeeId || parsedUser.employeeId,
                  department: data.department || authData?.user?.user_metadata?.department || parsedUser.department,
                  position: data.position || authData?.user?.user_metadata?.position || parsedUser.position,
                  role: dbRole as UserRole,
                  phone: data.phone || authData?.user?.user_metadata?.phone || parsedUser.phone || "",
                  avatar: data.avatar || authData?.user?.user_metadata?.avatar || parsedUser.avatar || "",
                  is_head_of_finance: data.is_head_of_finance || false,
                  is_head_of_purchasing: data.is_head_of_purchasing || false,
                  secondary_roles: data.secondary_roles || [],
                };
                setUser(updatedUser);
                const storage = localStorage.getItem("hr_user") ? localStorage : sessionStorage;
                storage.setItem("hr_user", JSON.stringify(updatedUser));
              }
            });
        });
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        setUser(null);
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    setIsLoading(true);

    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Fetch their custom role & profile from your 'users' table
      const { data: userProfile, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      let userData: User;

      if (dbError || !userProfile) {
        console.error("Could not fetch user profile:", dbError);
        // Fallback if profile is missing
        userData = {
          id: authData.user.id,
          name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || "User",
          email: authData.user.email || email,
          employeeId: authData.user.user_metadata?.employeeId || "EMP-000",
          department: authData.user.user_metadata?.department || "General",
          position: authData.user.user_metadata?.position || "",
          role: authData.user.user_metadata?.role || "employee",
          phone: authData.user.user_metadata?.phone || "",
          avatar: authData.user.user_metadata?.avatar || "",
          is_head_of_finance: false,
          is_head_of_purchasing: false,
          secondary_roles: [],
        };

        // Try to insert the missing profile now that the user is authenticated
        await supabase.from("users").upsert([{ ...userData, createdAt: new Date().toISOString() }]);
      } else {
        // Clean up the role just in case there's a trailing space in the DB
        const dbRole = (userProfile.role || "employee").toString().trim().toLowerCase();
        
        userData = {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          employeeId: userProfile.employeeId || userProfile.employeeid || authData.user.user_metadata?.employeeId || "EMP-000",
          department: userProfile.department || authData.user.user_metadata?.department || "General",
          position: userProfile.position || authData.user.user_metadata?.position || "",
          role: dbRole as UserRole,
          phone: userProfile.phone || authData.user.user_metadata?.phone || "",
          avatar: userProfile.avatar || authData.user.user_metadata?.avatar || "",
          is_head_of_finance: userProfile.is_head_of_finance || false,
          is_head_of_purchasing: userProfile.is_head_of_purchasing || false,
          secondary_roles: userProfile.secondary_roles || [],
        };
      }

      setUser(userData);
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("hr_user", JSON.stringify(userData));
      
    setIsLoading(false);
    return true;
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Invalid credentials");
      setIsLoading(false);
      return false;
    }
  }, []);

  const register = useCallback(async (data: Partial<User> & { password: string }) => {
    setIsLoading(true);
    try {
      // 1. Register with Supabase Authentication (This sends the OTP!)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email!,
        password: data.password,
        options: {
          data: {
            name: data.name,
            employeeId: data.employeeId,
            department: data.department,
            position: data.position,
            role: "employee",
            phone: data.phone || ""
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("No user returned from Supabase Auth.");
      }

      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register account.");
      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    // Ensure we actually tell Supabase to destroy the secure session token
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem("hr_user");
    sessionStorage.removeItem("hr_user");
  }, []);

  const updateUserRole = useCallback(async (userId: string, role: UserRole) => {
    try {
      // Update in Supabase
      const { data, error } = await supabase.from("users").update({ role }).eq("id", userId).select();
      if (error) throw error;

      // This is the crucial check: if no rows were updated (likely due to RLS), throw an error.
      if (!data || data.length === 0) {
        throw new Error("Update failed. You may not have permission to change this user's role. Check RLS policies.");
      }

      // Update current user if it's the logged-in user
      if (user?.id === userId) {
        const updated = { ...user, role };
        setUser(updated);
        localStorage.setItem("hr_user", JSON.stringify(updated));
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      throw error;
    }
  }, [user]);

  const updateUserProfile = useCallback(async (userId: string, updates: Partial<User>) => {
    // Prevent role changes via this function for security
    if ('role' in updates) {
      delete (updates as Partial<User>).role;
    }

    const dbUpdates = { ...updates };

    try {
      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase.from("users").update(dbUpdates).eq("id", userId);
        if (error) {
          console.error("Error updating user profile:", error);
          toast.error("Failed to update profile: " + error.message);
          return false;
        }
      }

      // Save the profile fields securely in Supabase Auth user_metadata
      if (updates.phone !== undefined || updates.avatar !== undefined || updates.position !== undefined || updates.department !== undefined) {
        const metaUpdates: any = {};
        if (updates.phone !== undefined) metaUpdates.phone = updates.phone;
        if (updates.avatar !== undefined) metaUpdates.avatar = updates.avatar;
        if (updates.position !== undefined) metaUpdates.position = updates.position;
        if (updates.department !== undefined) metaUpdates.department = updates.department;
        await supabase.auth.updateUser({ data: metaUpdates });
      }

      // Update user in context and storage if it's the current user
      if (user?.id === userId) {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        const storage = localStorage.getItem("hr_user") ? localStorage : sessionStorage;
        storage.setItem("hr_user", JSON.stringify(updatedUser));
      }
      return true;
    } catch (err: any) {
      console.error("Exception in updateUserProfile:", err);
      toast.error(`Profile update failed: ${err.message}`);
      return false;
    }
  }, [user]);

  const changePassword = useCallback(async (userId: string, oldPassword: string, newPassword: string) => {
    try {
      // 1. Verify the old password by attempting to sign in
      if (user?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: oldPassword,
        });
        
        if (signInError) {
          toast.error("Current password is incorrect.");
          return false;
        }
      }

      // 2. Update password securely via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        toast.error("Failed to update password: " + updateError.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error("Exception in changePassword:", err);
      toast.error(`Password change failed: ${err.message}`);
      return false;
    }
  }, [user?.email]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, updateUserRole, updateUserProfile, changePassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
