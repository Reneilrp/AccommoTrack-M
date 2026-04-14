import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import AdminLayout from '../components/Layout/AdminLayout.jsx';
import RouteLoadingFallback from '../components/Shared/RouteLoadingFallback.jsx';

const AdminDashboard = lazy(() => import('../screens/Admin/AdminDashboard.jsx'));
const UserManagement = lazy(() => import('../screens/Admin/UserManagement.jsx'));
const InquiryManagement = lazy(() => import('../screens/Admin/InquiryManagement.jsx'));
const Approvals = lazy(() => import('../screens/Admin/Approvals.jsx'));
const Reports = lazy(() => import('../screens/Admin/Reports.jsx'));
const PaymentOversight = lazy(() => import('../screens/Admin/PaymentOversight.jsx'));
const SubscriptionGrants = lazy(() => import('../screens/Admin/SubscriptionGrants.jsx'));
const PaymongoBypassManagement = lazy(() => import('../screens/Admin/PaymongoBypassManagement.jsx'));
const AuditExplorer = lazy(() => import('../screens/Admin/AuditExplorer.jsx'));
const ArchivedProperties = lazy(() => import('../screens/Admin/ArchivedProperties.jsx'));
const SystemSettings = lazy(() => import('../screens/Admin/SystemSettings.jsx'));
const DisputeArbitration = lazy(() => import('../screens/Admin/DisputeArbitration.jsx'));
const GlobalBroadcast = lazy(() => import('../screens/Admin/GlobalBroadcast.jsx'));

export default function AdminNavigator({ user, onLogout }) {
  const withSuspense = (screen, label = 'Loading admin module') => (
    <Suspense fallback={<RouteLoadingFallback label={label} />}>
      {screen}
    </Suspense>
  );

  const withLayout = (screen, label) => (
    <AdminLayout user={user} onLogout={onLogout}>
      {withSuspense(screen, label)}
    </AdminLayout>
  );

  return (
    <SidebarProvider>
      <Routes>
        <Route
          path="/admin"
          element={withLayout(<AdminDashboard user={user} />, 'Loading dashboard')}
        />
        <Route
          path="/admin/users"
          element={withLayout(<UserManagement />, 'Loading user management')}
        />
        <Route
          path="/admin/approvals"
          element={withLayout(<Approvals />, 'Loading approvals')}
        />
        <Route
          path="/admin/reports"
          element={withLayout(<Reports />, 'Loading reports')}
        />
        <Route
          path="/admin/inquiries"
          element={withLayout(<InquiryManagement />, 'Loading inquiries')}
        />
        <Route
          path="/admin/payments-oversight"
          element={withLayout(<PaymentOversight />, 'Loading payment oversight')}
        />
        <Route
          path="/admin/subscription-grants"
          element={withLayout(<SubscriptionGrants />, 'Loading subscription grants')}
        />
        <Route
          path="/admin/paymongo-bypass"
          element={withLayout(<PaymongoBypassManagement />, 'Loading PayMongo bypass management')}
        />
        <Route
          path="/admin/audit-logs"
          element={withLayout(<AuditExplorer />, 'Loading audit logs')}
        />
        <Route
          path="/admin/archives"
          element={withLayout(<ArchivedProperties />, 'Loading archives')}
        />
        <Route
          path="/admin/settings"
          element={withLayout(<SystemSettings />, 'Loading settings')}
        />
        <Route
          path="/admin/disputes"
          element={withLayout(<DisputeArbitration />, 'Loading disputes')}
        />
        <Route
          path="/admin/broadcasts"
          element={withLayout(<GlobalBroadcast />, 'Loading broadcasts')}
        />
        {/* Redirect any other route to admin dashboard */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </SidebarProvider>
  );
}
