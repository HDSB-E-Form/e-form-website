import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

const Root = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    // You can return a loading spinner here if you have one
    return <div>Loading...</div>;
  }

  // If there is a user, render the AppLayout which contains an <Outlet /> for nested routes.
  // Otherwise, redirect to the login page.
  return user ? <AppLayout /> : <Navigate to="/login" replace />;
};

export default Root;