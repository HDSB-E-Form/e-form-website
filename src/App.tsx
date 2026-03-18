import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubmissionsProvider } from "@/contexts/SubmissionsContext";
import { UsersProvider } from "@/contexts/UsersContext";
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
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UsersProvider>
      <SubmissionsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route path="/home" element={<AppLayout><HomePage /></AppLayout>} />
              <Route path="/hr" element={<AppLayout><HRFormsPage /></AppLayout>} />
              <Route path="/finance" element={<AppLayout><FinanceFormsPage /></AppLayout>} />
              <Route path="/hr/car-rental" element={<AppLayout><CarRentalForm /></AppLayout>} />
              <Route path="/hr/leave" element={<AppLayout><LeaveForm /></AppLayout>} />
              <Route path="/finance/claim" element={<AppLayout><ClaimForm /></AppLayout>} />
              <Route path="/submissions" element={<AppLayout><MySubmissions /></AppLayout>} />

              {/* Role-specific admin dashboards */}
              <Route path="/admin/hr" element={<AppLayout><AdminDashboard /></AppLayout>} />
              <Route path="/admin/finance" element={<AppLayout><FinanceDashboard /></AppLayout>} />
              <Route path="/admin/approvals" element={<AppLayout><ApproverDashboard /></AppLayout>} />
              <Route path="/admin/users" element={<AppLayout><SuperAdminDashboard /></AppLayout>} />
              <Route path="/admin/cars" element={<AppLayout><CarManagement /></AppLayout>} />

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
);

export default App;
