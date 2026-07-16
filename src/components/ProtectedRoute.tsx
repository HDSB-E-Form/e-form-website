import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/contexts/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const effectiveRoles = user ? [user.role, ...(user.secondary_roles || [])] : [];

  if (user && !effectiveRoles.some(role => allowedRoles.includes(role))) {
    // Redirect to home/appropriate dashboard based on user's actual role
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
