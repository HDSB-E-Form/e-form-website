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
import Index from "@/pages/Index";
import RegisterPage from "@/pages/RegisterPage";
import HomePage from "@/pages/HomePage";
import Root from "@/pages/Root"; // Import the new Root component
import HRFormsPage from "@/pages/HRFormsPage";
import SafetyFormsPage from "@/pages/SafetyFormsPage";
import FinanceFormsPage from "@/pages/FinanceFormsPage";
import CarBookingForm from "@/pages/CarBookingForm";
import LeaveForm from "@/pages/LeaveForm";
import PettyCashForm from "@/pages/PettyCashForm";
import MySubmissions from "@/pages/MySubmissions";
import AdminDashboard from "@/pages/AdminDashboard";
import FinanceDashboard from "@/pages/FinanceDashboard"; 
import InventoryDashboard from "@/components/InventoryDashboard";
import PurchasesDashboard from "@/components/PurchasesDashboard";
import DischargeDashboard from "@/pages/DischargeDashboard";
import MixingDashboard from "@/pages/MixingDashboard";
import WasteDashboard from "@/pages/WasteDashboard";
import ApproverDashboard from "@/pages/ApproverDashboard";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import CarManagement from "@/pages/CarManagement";
import SecurityDashboard from "@/pages/SecurityDashboard";
import NotFound from "@/pages/NotFound";
import AllSubmissionsPage from "@/pages/AllSubmissionsPage";
import ProfilePage from "@/pages/ProfilePage";
import WasteInventoryForm from "@/pages/WasteInventoryForm"; 
import PpeRequestForm from "@/pages/PpeRequestForm";
import DailyOperationMonitoringForm from "@/pages/WaterTreatmentForm"; // Note: Renamed component

import { useRealtimeNotifications } from "@/useRealtimeNotifications";

const queryClient = new QueryClient();

const GlobalNotificationListener = () => {
  useRealtimeNotifications();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UsersProvider>
        <SubmissionsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <GlobalNotificationListener />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                {/* No /register route needed if it's part of the login page */}

                {/* The Root component now handles the logic for the "/" path */}
                <Route path="/" element={<Root />}>
                  <Route path="home" element={<HomePage />} />
                  <Route path="hr" element={<HRFormsPage />} />
                  <Route path="safety" element={<ProtectedRoute allowedRoles={["safety_admin", "super_admin"]}><SafetyFormsPage /></ProtectedRoute>} />
                  <Route path="safety/waste-inventory" element={<ProtectedRoute allowedRoles={["safety_admin", "super_admin"]}><WasteInventoryForm /></ProtectedRoute>} />
                  <Route path="safety/mixing" element={<ProtectedRoute allowedRoles={["safety_admin", "super_admin"]}><DailyOperationMonitoringForm /></ProtectedRoute>} />                  <Route path="safety/discharge" element={<ProtectedRoute allowedRoles={["safety_admin", "super_admin"]}><DailyOperationMonitoringForm /></ProtectedRoute>} />
                  <Route path="finance" element={<FinanceFormsPage />} />
                  <Route path="hr/car-rental" element={<CarBookingForm />} />
                  <Route path="hr/leave" element={<LeaveForm />} />
                  <Route path="hr/ppe-request" element={<PpeRequestForm />} />
                  <Route path="finance/claim" element={<PettyCashForm />} />
                  <Route path="submissions" element={<MySubmissions />} />
                  <Route path="profile" element={<ProfilePage />} />

                  {/* Admin Routes */}
                  <Route path="admin/hr" element={<ProtectedRoute allowedRoles={["hr_admin"]}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="admin/hr/inventory" element={<ProtectedRoute allowedRoles={["hr_admin"]}><InventoryDashboard /></ProtectedRoute>} />
                  <Route path="admin/hr/purchases" element={<ProtectedRoute allowedRoles={["hr_admin"]}><PurchasesDashboard /></ProtectedRoute>} />
                  <Route path="admin/finance" element={<ProtectedRoute allowedRoles={["finance_admin"]}><FinanceDashboard /></ProtectedRoute>} />
                  <Route path="admin/security" element={<ProtectedRoute allowedRoles={["security_guard"]}><SecurityDashboard /></ProtectedRoute>} />
                  <Route path="admin/approvals" element={<ProtectedRoute allowedRoles={["hod", "hos", "head_of_purchasing", "head_of_finance"]}><ApproverDashboard /></ProtectedRoute>} />
                  <Route path="admin/users" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminDashboard /></ProtectedRoute>} />
                  <Route path="admin/submissions" element={<ProtectedRoute allowedRoles={["super_admin"]}><AllSubmissionsPage /></ProtectedRoute>} />
                  <Route path="admin/cars" element={<ProtectedRoute allowedRoles={["hr_admin", "super_admin"]}><CarManagement /></ProtectedRoute>} />
                  <Route path="admin/safety/discharge" element={<ProtectedRoute allowedRoles={["safety_admin", "super_admin"]}><DischargeDashboard /></ProtectedRoute>} />
                  <Route path="admin/safety/mixing" element={<ProtectedRoute allowedRoles={["safety_admin", "super_admin"]}><MixingDashboard /></ProtectedRoute>} />
                  <Route path="admin/safety/waste" element={<ProtectedRoute allowedRoles={["safety_admin", "super_admin"]}><WasteDashboard /></ProtectedRoute>} />

                  {/* Redirects */}
                  <Route path="/admin/dashboard" element={<Navigate to="/admin/hr" replace />} />
                  <Route index element={<Navigate to="/home" replace />} />
                </Route>
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