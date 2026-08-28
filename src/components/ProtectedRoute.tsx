import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/contexts/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Remember where they were headed (e.g. a dashboard link from an email) so
    // login can send them there instead of the generic home page.
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const effectiveRoles = user ? [user.role, ...(user.secondary_roles || [])] : [];

  if (user && !effectiveRoles.some(role => allowedRoles.includes(role))) {
    // Redirect to home/appropriate dashboard based on user's actual role
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
