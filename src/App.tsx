import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubmissionsProvider } from "@/contexts/SubmissionsContext";
import { UsersProvider } from "@/contexts/UsersContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import HomePage from "@/pages/HomePage";
import HRFormsPage from "@/pages/HRFormsPage";
import FinanceFormsPage from "@/pages/FinanceFormsPage";
import CarRentalForm from "@/pages/CarRentalForm";
import LeaveForm from "@/pages/LeaveForm";
import ClaimForm from "@/pages/ClaimForm";
import MySubmissions from "@/pages/MySubmissions";
import AdminDashboard from "@/pages/AdminDashboard";
import FinanceDashboard from "@/pages/FinanceDashboard";
import ApproverDashboard from "@/pages/ApproverDashboard";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import CarManagement from "@/pages/CarManagement";
import SecurityDashboard from "@/pages/SecurityDashboard";
import NotFound from "@/pages/NotFound";
import AllSubmissionsPage from "@/pages/AllSubmissionsPage";
import ProfilePage from "@/pages/ProfilePage";

import { useRealtimeNotifications } from "@/useRealtimeNotifications";

const queryClient = new QueryClient();

// --- EMERGENCY LOCAL STORAGE CLEANUP ---
// Prevents the app from crashing if corrupted data was saved during development
try {
  const local = localStorage.getItem("hr_user");
  if (local === "undefined" || local === "[object Object]") {
    localStorage.removeItem("hr_user");
  } else if (local) {
    // If it can't be parsed as JSON, it's corrupted. Delete it.
    try { JSON.parse(local); } catch { localStorage.removeItem("hr_user"); }
  }

  const session = sessionStorage.getItem("hr_user");
  if (session === "undefined" || session === "[object Object]") {
    sessionStorage.removeItem("hr_user");
  } else if (session) {
    try { JSON.parse(session); } catch { sessionStorage.removeItem("hr_user"); }
  }
} catch (e) {
  console.error("Failed to clean storage", e);
}

const GlobalNotificationListener = () => {
  useRealtimeNotifications();
  return null;
};

const ConditionalHomePage = () => {
  const { user } = useAuth();
  if (user?.role === 'security_guard') {
    return <SecurityDashboard />;
  }
  return <HomePage />;
};

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="p-8 max-w-2xl w-full bg-white border border-red-200 rounded-2xl shadow-xl text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Application Error</h2>
            <p className="text-gray-700 mb-4">The application crashed. This is usually caused by corrupted saved data.</p>
            <pre className="bg-red-50 p-4 rounded-lg text-xs text-red-900 overflow-auto mb-6 border border-red-100 whitespace-pre-wrap text-left">
              {this.state.error?.message}
            </pre>
            <button 
              onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.href = "/"; }} 
              className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors w-full"
            >
              Clear Corrupted Data & Restart App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UsersProvider>
      <SubmissionsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <GlobalNotificationListener />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route path="/home" element={<AppLayout><ConditionalHomePage /></AppLayout>} />
              <Route path="/hr" element={<AppLayout><HRFormsPage /></AppLayout>} />
              <Route path="/finance" element={<AppLayout><FinanceFormsPage /></AppLayout>} />
              <Route path="/hr/car-rental" element={<AppLayout><CarRentalForm /></AppLayout>} />
              <Route path="/hr/leave" element={<AppLayout><LeaveForm /></AppLayout>} />
              <Route path="/finance/claim" element={<AppLayout><ClaimForm /></AppLayout>} />
              <Route path="/submissions" element={<AppLayout><MySubmissions /></AppLayout>} />
              <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />

              {/* Role-specific admin dashboards with protection */}
              <Route 
                path="/admin/hr" 
                element={
                  <ProtectedRoute allowedRoles={["hr_admin"]}>
                    <AppLayout><AdminDashboard /></AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/finance" 
                element={
                  <ProtectedRoute allowedRoles={["finance_admin"]}>
                    <AppLayout><FinanceDashboard /></AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/security" 
                element={
                  <ProtectedRoute allowedRoles={["security_guard"]}>
                    <AppLayout><SecurityDashboard /></AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/approvals" 
                element={
                  <ProtectedRoute allowedRoles={["hod", "hos"]}>
                    <AppLayout><ApproverDashboard /></AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/users" 
                element={
                  <ProtectedRoute allowedRoles={["super_admin"]}>
                    <AppLayout><SuperAdminDashboard /></AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/submissions" 
                element={
                  <ProtectedRoute allowedRoles={["super_admin"]}>
                    <AppLayout><AllSubmissionsPage /></AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/cars" 
                element={
                  <ProtectedRoute allowedRoles={["hr_admin"]}>
                    <AppLayout><CarManagement /></AppLayout>
                  </ProtectedRoute>
                } 
              />

              {/* Legacy route redirect */}
              <Route path="/admin/dashboard" element={<Navigate to="/admin/hr" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SubmissionsProvider>
      </UsersProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
