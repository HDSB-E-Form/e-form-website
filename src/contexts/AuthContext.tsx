import React, { createContext, useContext, useState, useCallback } from "react";

export type UserRole = "employee" | "hod" | "hos" | "hr_admin" | "finance_admin" | "super_admin";

export interface User {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
  position: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: Partial<User> & { password: string }) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USERS: Record<string, User> = {
  "employee@drb.com": {
    id: "1",
    name: "Ahmad Razak",
    email: "employee@drb.com",
    employeeId: "EMP-001",
    department: "Engineering",
    position: "Software Engineer",
    role: "employee",
  },
  "hod@drb.com": {
    id: "2",
    name: "Sarah Abdullah",
    email: "hod@drb.com",
    employeeId: "EMP-002",
    department: "Engineering",
    position: "Head of Department",
    role: "hod",
  },
  "hr@drb.com": {
    id: "3",
    name: "Fatimah Hassan",
    email: "hr@drb.com",
    employeeId: "EMP-003",
    department: "Human Resources",
    position: "HR Admin",
    role: "hr_admin",
  },
  "finance@drb.com": {
    id: "4",
    name: "Ismail Rahman",
    email: "finance@drb.com",
    employeeId: "EMP-004",
    department: "Finance",
    position: "Finance Admin",
    role: "finance_admin",
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("hr_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, _password: string) => {
    const mockUser = MOCK_USERS[email];
    if (mockUser) {
      setUser(mockUser);
      localStorage.setItem("hr_user", JSON.stringify(mockUser));
      return true;
    }
    // Allow any email for demo
    const newUser: User = {
      id: Math.random().toString(36).slice(2),
      name: email.split("@")[0],
      email,
      employeeId: `EMP-${Math.floor(Math.random() * 900 + 100)}`,
      department: "General",
      position: "Employee",
      role: "employee",
    };
    setUser(newUser);
    localStorage.setItem("hr_user", JSON.stringify(newUser));
    return true;
  }, []);

  const register = useCallback(async (data: Partial<User> & { password: string }) => {
    const newUser: User = {
      id: Math.random().toString(36).slice(2),
      name: data.name || "New User",
      email: data.email || "",
      employeeId: `EMP-${Math.floor(Math.random() * 900 + 100)}`,
      department: data.department || "General",
      position: data.position || "Employee",
      role: "employee",
    };
    setUser(newUser);
    localStorage.setItem("hr_user", JSON.stringify(newUser));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("hr_user");
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    if (user) {
      const updated = { ...user, role };
      setUser(updated);
      localStorage.setItem("hr_user", JSON.stringify(updated));
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
