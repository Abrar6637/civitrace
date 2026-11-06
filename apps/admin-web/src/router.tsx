import { createBrowserRouter } from 'react-router';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RequireRole } from '@/components/auth/RequireRole';
import { AdminLayout } from '@/components/layout/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ComplaintsPage from '@/pages/ComplaintsPage';
import ComplaintDetailPage from '@/pages/ComplaintDetailPage';
import AssetsPage from '@/pages/AssetsPage';
import AssetDetailPage from '@/pages/AssetDetailPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import ProjectFormPage from '@/pages/ProjectFormPage';
import BudgetsPage from '@/pages/BudgetsPage';
import BudgetComparePage from '@/pages/BudgetComparePage';
import VerificationPage from '@/pages/VerificationPage';
import FeedbackPage from '@/pages/FeedbackPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import UsersPage from '@/pages/UsersPage';
import AuditLogPage from '@/pages/AuditLogPage';
import NotFoundPage from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'complaints', element: <ComplaintsPage /> },
          { path: 'complaints/:id', element: <ComplaintDetailPage /> },
          { path: 'verification', element: <VerificationPage /> },
          { path: 'feedback', element: <FeedbackPage /> },
          { path: 'assets', element: <AssetsPage /> },
          { path: 'assets/:id', element: <AssetDetailPage /> },
          { path: 'projects', element: <ProjectsPage /> },
          { path: 'projects/new', element: <ProjectFormPage /> },
          { path: 'projects/:id', element: <ProjectDetailPage /> },
          { path: 'projects/:id/edit', element: <ProjectFormPage /> },
          { path: 'budgets', element: <BudgetsPage /> },
          { path: 'budgets/compare', element: <BudgetComparePage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'settings', element: <SettingsPage /> },
          {
            element: <RequireRole roles={['super_admin']} />,
            children: [
              { path: 'users', element: <UsersPage /> },
              { path: 'audit-log', element: <AuditLogPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);