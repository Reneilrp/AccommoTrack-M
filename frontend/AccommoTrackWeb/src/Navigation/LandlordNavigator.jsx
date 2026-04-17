import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import LandlordLayout from '../components/Layout/LandlordLayout';
import RouteLoadingFallback from '../components/Shared/RouteLoadingFallback.jsx';

const PropertyDetailRoute = lazy(() => import('./PropertyDetailRoute.jsx'));
const PropertySummary = lazy(() => import('../screens/Landlord/PropertySummary.jsx'));
const DashboardPage = lazy(() => import('../screens/Landlord/DashboardPage.jsx'));
const RoomManagement = lazy(() => import('../screens/Landlord/RoomManagement.jsx'));
const Tenants = lazy(() => import('../screens/Landlord/TenantManagement.jsx'));
const TenantLogs = lazy(() => import('../screens/Landlord/TenantLogs.jsx'));
const Bookings = lazy(() => import('../screens/Landlord/Bookings.jsx'));
const Payments = lazy(() => import('../screens/Landlord/Payments.jsx'));
const LandlordPaymentLogs = lazy(() => import('../screens/Landlord/LandlordPaymentLogs.jsx'));
const Messages = lazy(() => import('../screens/Landlord/Messages.jsx'));
const Analytics = lazy(() => import('../screens/Landlord/Analytics.jsx'));
const Settings = lazy(() => import('../screens/Landlord/Settings.jsx'));
const MyProperties = lazy(() => import('../screens/Landlord/MyProperties.jsx'));
const LandlordMaintenance = lazy(() => import('../screens/Landlord/LandlordMaintenance.jsx'));
const LandlordReviews = lazy(() => import('../screens/Landlord/Reviews.jsx'));
const VerificationStatus = lazy(() => import('../screens/Landlord/VerificationStatus.jsx'));
const AddonManagement = lazy(() => import('../screens/Landlord/AddonManagement.jsx'));
const NotificationsPage = lazy(() => import('../screens/Landlord/NotificationsPage.jsx'));
const TransferRequests = lazy(() => import('../screens/Landlord/TransferRequests.jsx'));

export default function LandlordNavigator({ user, onLogout, onUserUpdate }) {
  const withSuspense = (screen, label = 'Loading page') => (
    <Suspense fallback={<RouteLoadingFallback label={label} />}>
      {screen}
    </Suspense>
  );

  // Landlord-only routes. Caretaker routing is handled by CaretakerNavigator.
  return (
    <SidebarProvider>
      <Routes>
        <Route element={<LandlordLayout user={user} onLogout={onLogout} accessRole="landlord" />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={withSuspense(<DashboardPage user={user} />, 'Loading dashboard')} />
          <Route path="properties" element={withSuspense(<MyProperties user={user} />, 'Loading properties')} />
          <Route path="properties/:id" element={withSuspense(<PropertySummary />, 'Loading property summary')} />
          <Route path="properties/:id/edit" element={withSuspense(<PropertyDetailRoute />, 'Loading property editor')} />
          <Route path="rooms" element={withSuspense(<RoomManagement user={user} />, 'Loading room management')} />
          <Route path="maintenance" element={withSuspense(<LandlordMaintenance user={user} />, 'Loading maintenance')} />
          <Route path="tenants/:id" element={withSuspense(<TenantLogs user={user} />, 'Loading tenant logs')} />
          <Route path="tenants/logs" element={withSuspense(<TenantLogs user={user} />, 'Loading tenant logs')} />
          <Route path="payments" element={withSuspense(<Payments user={user} />, 'Loading payments')} />
          <Route path="payments/logs" element={withSuspense(<LandlordPaymentLogs user={user} />, 'Loading payment logs')} />
          <Route path="reviews" element={withSuspense(<LandlordReviews user={user} />, 'Loading reviews')} />
          <Route path="tenants" element={withSuspense(<Tenants user={user} accessRole="landlord" />, 'Loading tenants')} />
          <Route path="bookings" element={withSuspense(<Bookings user={user} accessRole="landlord" />, 'Loading bookings')} />
          <Route path="transfers" element={withSuspense(<TransferRequests user={user} accessRole="landlord" />, 'Loading transfers')} />
          <Route path="messages" element={withSuspense(<Messages user={user} accessRole="landlord" />, 'Loading messages')} />
          <Route path="addons" element={withSuspense(<AddonManagement user={user} />, 'Loading addons')} />
          <Route path="analytics" element={withSuspense(<Analytics user={user} accessRole="landlord" />, 'Loading analytics')} />
          <Route
            path="settings"
            element={withSuspense(
              <Settings user={user} accessRole="landlord" onUserUpdate={onUserUpdate} />,
              'Loading settings',
            )}
          />
          <Route
            path="verification"
            element={withSuspense(<VerificationStatus user={user} onUpdate={onUserUpdate} />, 'Loading verification status')}
          />
          <Route path="notifications" element={withSuspense(<NotificationsPage />, 'Loading notifications')} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </SidebarProvider>
  );
}
