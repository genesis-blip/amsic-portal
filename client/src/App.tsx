import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { PortalLayout } from './components/layout/PortalLayout';
import { RequireAuth } from './auth/RequireAuth';
import type { Capability } from './types';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import ResidentsPage from './pages/residents/ResidentsPage';
import ResidentDetailPage from './pages/residents/ResidentDetailPage';
import ResidentFormPage from './pages/residents/ResidentFormPage';
import RequestsPage from './pages/requests/RequestsPage';
import RequestDetailPage from './pages/requests/RequestDetailPage';
import RequestFormPage from './pages/requests/RequestFormPage';
import SchedulePage from './pages/SchedulePage';
import PaymentsPage from './pages/PaymentsPage';
import DocumentTypesPage from './pages/DocumentTypesPage';
import IncidentsPage from './pages/IncidentsPage';
import BlottersPage from './pages/blotters/BlottersPage';
import BlotterDetailPage from './pages/blotters/BlotterDetailPage';
import SosPage from './pages/SosPage';
import BulletinsPage from './pages/BulletinsPage';
import HealthPage from './pages/HealthPage';
import ReportsPage from './pages/ReportsPage';
import AccountPage from './pages/AccountPage';
import AccountsPage from './pages/AccountsPage';
import PortalHomePage from './pages/portal/PortalHomePage';
import PortalRequestFormPage from './pages/portal/PortalRequestFormPage';
import PortalRequestsPage from './pages/portal/PortalRequestsPage';
import PortalRequestDetailPage from './pages/portal/PortalRequestDetailPage';
import PortalReportPage from './pages/portal/PortalReportPage';
import PortalSosPage from './pages/portal/PortalSosPage';
import PortalProfilePage from './pages/portal/PortalProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import VerifyPage from './pages/VerifyPage';

const staff = (anyOf: Capability[], page: ReactNode) => <RequireAuth type="staff" anyOf={anyOf}>{page}</RequireAuth>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage portal="resident" />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/staff/login" element={<LoginPage portal="staff" />} />
      <Route path="/staff" element={<Navigate to="/app" replace />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/verify/:reference" element={<VerifyPage />} />

      <Route path="/app" element={<RequireAuth type="staff"><AppLayout /></RequireAuth>}>
        <Route index element={staff(['dashboard.view'], <DashboardPage />)} />
        <Route path="residents" element={staff(['residents.view'], <ResidentsPage />)} />
        <Route path="residents/new" element={staff(['residents.manage'], <ResidentFormPage />)} />
        <Route path="residents/:id" element={staff(['residents.view'], <ResidentDetailPage />)} />
        <Route path="residents/:id/edit" element={staff(['residents.manage'], <ResidentFormPage />)} />
        <Route path="requests" element={staff(['documents.view'], <RequestsPage />)} />
        <Route path="requests/new" element={staff(['documents.process'], <RequestFormPage />)} />
        <Route path="requests/:id" element={staff(['documents.view'], <RequestDetailPage />)} />
        <Route path="requests/:id/edit" element={staff(['documents.process'], <RequestFormPage />)} />
        <Route path="schedule" element={staff(['documents.view'], <SchedulePage />)} />
        <Route path="payments" element={staff(['payments.view'], <PaymentsPage />)} />
        <Route path="document-types" element={staff(['document_types.manage'], <DocumentTypesPage />)} />
        <Route path="incidents" element={staff(['incidents.view'], <IncidentsPage />)} />
        <Route path="blotters" element={staff(['blotter.view'], <BlottersPage />)} />
        <Route path="blotters/:id" element={staff(['blotter.view'], <BlotterDetailPage />)} />
        <Route path="sos" element={staff(['sos.view'], <SosPage />)} />
        <Route path="bulletins" element={staff(['bulletins.manage'], <BulletinsPage />)} />
        <Route path="health" element={staff(['health.view'], <HealthPage />)} />
        <Route path="reports" element={staff(['reports.view'], <ReportsPage />)} />
        <Route path="accounts" element={staff(['staff.manage', 'residents.manage'], <AccountsPage />)} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/portal" element={<RequireAuth type="resident"><PortalLayout /></RequireAuth>}>
        <Route index element={<PortalHomePage />} />
        <Route path="requests" element={<PortalRequestsPage />} />
        <Route path="requests/new" element={<PortalRequestFormPage />} />
        <Route path="requests/:id" element={<PortalRequestDetailPage />} />
        <Route path="report" element={<PortalReportPage />} />
        <Route path="sos" element={<PortalSosPage />} />
        <Route path="profile" element={<PortalProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
