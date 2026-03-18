import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

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
  updateUser: (id: string, updates: Partial<AppUser>) => void;
  getUsersByRole: (role: string) => AppUser[];
}

const UsersContext = createContext<UsersContextType | null>(null);

const INITIAL_USERS: AppUser[] = [
  { id: "1", name: "Ahmad Razak", email: "ahmad.razak@drb.com", staffId: "STF-8821", role: "IT TEAM", department: "Executive Management" },
  { id: "2", name: "Sarah Abdullah", email: "sarah.abdullah@drb.com", staffId: "STF-4309", role: "HR ADMIN", department: "Human Resources", supervisor: "Ahmad Razak" },
  { id: "3", name: "Fatimah Hassan", email: "fatimah.hassan@drb.com", staffId: "STF-1102", role: "HOD", department: "IT Infrastructure" },
  { id: "4", name: "Ismail Rahman", email: "ismail.rahman@drb.com", staffId: "STF-9941", role: "EMPLOYEE", department: "Financial Planning", supervisor: "Sarah Abdullah" },
  { id: "5", name: "Lim Wei Jie", email: "wj.lim@drb.com", staffId: "STF-2287", role: "EMPLOYEE", department: "Operations" },
  { id: "6", name: "Nurul Aina", email: "nurul.aina@drb.com", staffId: "STF-3344", role: "HOS", department: "Corporate Affairs" },
  { id: "7", name: "Raj Kumar", email: "raj.kumar@drb.com", staffId: "STF-5567", role: "EMPLOYEE", department: "Engineering" },
  { id: "8", name: "Siti Aminah", email: "siti.aminah@drb.com", staffId: "STF-7789", role: "FINANCE ADMIN", department: "Finance", supervisor: "Ahmad Razak" },
];

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);

  const updateUser = useCallback((id: string, updates: Partial<AppUser>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, []);

  const getUsersByRole = useCallback((role: string) => {
    return users.filter(u => u.role === role);
  }, [users]);

  const value = useMemo(() => ({ users, updateUser, getUsersByRole }), [users, updateUser, getUsersByRole]);

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
