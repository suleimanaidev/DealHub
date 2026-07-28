import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Layout from "./components/layout/Layout";
import LandingPage from "./pages/landing/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import { DashboardPage } from "./pages/dashboard";
import { LeadListPage, LeadDetailPage, LeadFormPage } from "./pages/leads";
import { CustomerListPage, CustomerDetailPage, CustomerFormPage } from "./pages/customers";
import { PipelinePage, PipelineAnalyticsPage } from "./pages/pipeline";
import { DealDetailPage, DealFormPage } from "./pages/deals";
import { ProfilePage } from "./pages/profile";
import { TaskListPage, TaskDetailPage, TaskFormPage } from "./pages/tasks";
import { UserListPage, UserDetailPage, UserFormPage } from "./pages/users";
import NotificationPage from "./pages/notifications/NotificationPage";
import NotFoundPage from "./pages/errors/NotFoundPage";
import ForbiddenPage from "./pages/errors/ForbiddenPage";
import ServerErrorPage from "./pages/errors/ServerErrorPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/leads" element={<LeadListPage />} />
        <Route path="/leads/new" element={<LeadFormPage />} />
        <Route path="/leads/:leadId" element={<LeadDetailPage />} />
        <Route path="/leads/:leadId/edit" element={<LeadFormPage />} />
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/new" element={<CustomerFormPage />} />
        <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="/customers/:customerId/edit" element={<CustomerFormPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/pipeline/analytics" element={<PipelineAnalyticsPage />} />
        <Route path="/deals/new" element={<DealFormPage />} />
        <Route path="/deals/:dealId" element={<DealDetailPage />} />
        <Route path="/deals/:dealId/edit" element={<DealFormPage />} />
        <Route path="/tasks" element={<TaskListPage />} />
        <Route path="/tasks/new" element={<TaskFormPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/tasks/:taskId/edit" element={<TaskFormPage />} />
        <Route path="/users" element={<UserListPage />} />
        <Route path="/users/new" element={<UserFormPage />} />
        <Route path="/users/:userId" element={<UserDetailPage />} />
        <Route path="/users/:userId/edit" element={<UserFormPage />} />
        <Route path="/notifications" element={<NotificationPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/500" element={<ServerErrorPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
