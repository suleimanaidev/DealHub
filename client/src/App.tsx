import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { DashboardPage } from "./pages/dashboard";
import { LeadListPage, LeadDetailPage, LeadFormPage } from "./pages/leads";
import { CustomerListPage, CustomerDetailPage, CustomerFormPage } from "./pages/customers";
import { PipelinePage, PipelineAnalyticsPage } from "./pages/pipeline";
import { TaskListPage, TaskDetailPage, TaskFormPage } from "./pages/tasks";
import { UserListPage, UserDetailPage, UserFormPage } from "./pages/users";
import NotificationPage from "./pages/notifications/NotificationPage";
import NotFoundPage from "./pages/errors/NotFoundPage";
import ForbiddenPage from "./pages/errors/ForbiddenPage";
import ServerErrorPage from "./pages/errors/ServerErrorPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
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
        <Route path="/tasks" element={<TaskListPage />} />
        <Route path="/tasks/new" element={<TaskFormPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/tasks/:taskId/edit" element={<TaskFormPage />} />
        <Route path="/users" element={<UserListPage />} />
        <Route path="/users/new" element={<UserFormPage />} />
        <Route path="/users/:userId" element={<UserDetailPage />} />
        <Route path="/users/:userId/edit" element={<UserFormPage />} />
        <Route path="/notifications" element={<NotificationPage />} />
      </Route>
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/500" element={<ServerErrorPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
