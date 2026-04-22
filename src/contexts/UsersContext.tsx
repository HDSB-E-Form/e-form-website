import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/supabase";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  staffId: string;
  role: string;
  department: string;
  supervisor?: string;
}

interface UsersContextType {
  users: AppUser[];
  updateUser: (id: string, updates: Partial<AppUser>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  getUsersByRole: (role: string) => AppUser[];
  isLoading: boolean;
}

const UsersContext = createContext<UsersContextType | null>(null);

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from("users").select("*").eq("status", "active");
        if (error) throw error;
        
        const fetchedUsers: AppUser[] = (data || []).map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          email: doc.email,
          staffId: doc.employeeId || "",
          role: doc.role || "employee",
          department: doc.department || "",
          supervisor: doc.supervisor || "",
        }));
        
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const updateUser = useCallback(async (id: string, updates: Partial<AppUser>) => {
    // Prepare the data for Supabase, mapping properties like staffId -> employeeId
    const dbUpdates: { [key: string]: any } = { ...updates };
    if (dbUpdates.staffId) {
      dbUpdates.employeeId = dbUpdates.staffId;
      delete dbUpdates.staffId;
    }

    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user: " + error.message);
      return false;
    }

    // Update local state with the confirmed data from the database
    const updatedUser: AppUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      staffId: data.employeeId || "",
      role: data.role || "employee",
      department: data.department || "",
      supervisor: data.supervisor || "",
    };
    setUsers(prev => prev.map(u => (u.id === id ? updatedUser : u)));
    return true;
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("users")
      .update({ status: "inactive" })
      .eq("id", id);

    if (error) {
      console.error("Error deactivating user:", error);
      return false;
    }
    
    setUsers(prev => prev.filter(u => u.id !== id));
    return true;
  }, []);

  const getUsersByRole = useCallback((role: string) => {
    return users.filter(u => u.role?.toLowerCase() === role.toLowerCase());
  }, [users]);

  const value = useMemo(() => ({ users, updateUser, deleteUser, getUsersByRole, isLoading }), [users, updateUser, deleteUser, getUsersByRole, isLoading]);

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error("useUsers must be used within UsersProvider");
  return ctx;
}
