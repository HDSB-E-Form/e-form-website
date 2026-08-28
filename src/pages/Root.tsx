import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

const Root = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // You can return a loading spinner here if you have one
    return <div>Loading...</div>;
  }

  // If there is a user, render the AppLayout which contains an <Outlet /> for nested routes.
  // Otherwise, redirect to login, remembering the target (e.g. a dashboard link
  // from a notification email) so it can be reopened after signing in.
  if (user) return <AppLayout />;
  const next = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/login?next=${next}`} replace />;
};

export default Root;