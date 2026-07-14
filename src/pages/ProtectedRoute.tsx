import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
};

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = [user.role, ...(user.secondary_roles || [])].filter(Boolean) as UserRole[];
    if (!allowedRoles.some(role => userRoles.includes(role))) {
      return <Navigate to="/home" replace />; // Or an unauthorized page
    }
  }

  return <>{children}</>;
};