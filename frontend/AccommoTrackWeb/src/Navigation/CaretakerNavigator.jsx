import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import CaretakerLayout from '../components/Layout/CaretakerLayout';
import RouteLoadingFallback from '../components/Shared/RouteLoadingFallback.jsx';
import { useCaretakerPermissions } from '../hooks/useCaretakerPermissions';
import { getDefaultLandingRoute } from '../utils/userRoutes.js';

const PropertyDetailRoute  = lazy(() => import('./PropertyDetailRoute.jsx'));
const PropertySummary      = lazy(() => import('../screens/Landlord/PropertySummary.jsx'));
const CaretakerDashboard   = lazy(() => import('../screens/Landlord/CaretakerDashboard.jsx'));
const DashboardPage        = lazy(() => import('../screens/Landlord/DashboardPage.jsx'));
const MyProperties         = lazy(() => import('../screens/Landlord/MyProperties.jsx'));
const RoomManagement       = lazy(() => import('../screens/Landlord/RoomManagement.jsx'));
const LandlordMaintenance  = lazy(() => import('../screens/Landlord/LandlordMaintenance.jsx'));
const AddonManagement      = lazy(() => import('../screens/Landlord/AddonManagement.jsx'));
const Bookings             = lazy(() => import('../screens/Landlord/Bookings.jsx'));
const Payments             = lazy(() => import('../screens/Landlord/Payments.jsx'));
const LandlordPaymentLogs  = lazy(() => import('../screens/Landlord/LandlordPaymentLogs.jsx'));
const Tenants              = lazy(() => import('../screens/Landlord/TenantManagement.jsx'));
const Messages             = lazy(() => import('../screens/Landlord/Messages.jsx'));
const Analytics            = lazy(() => import('../screens/Landlord/Analytics.jsx'));
const Settings             = lazy(() => import('../screens/Landlord/Settings.jsx'));
const NotificationsPage    = lazy(() => import('../screens/Landlord/NotificationsPage.jsx'));

export default function CaretakerNavigator({ user, onLogout, onUserUpdate }) {
  const perms = useCaretakerPermissions(user);
  const {
    canManageProperties,
    canManageRooms,
    canManageMaintenance,
    canManageAddons,
    canManageBookings,
    canManagePayments,
    canManageTenants,
    canManageMessages,
    canManageAnalytics,
    fullAccess,
  } = perms;

  const caretakerHome = getDefaultLandingRoute(user);

  const withSuspense = (screen, label = 'Loading page') => (
    <Suspense fallback={<RouteLoadingFallback label={label} />}>
      {screen}
    </Suspense>
  );

  return (
    <SidebarProvider>
      <Routes>
        <Route
          element={
            <CaretakerLayout
              user={user}
              onLogout={onLogout}
              onUserUpdate={onUserUpdate}
            />
          }
        >
          {/* Always-accessible routes */}
          <Route index element={<Navigate to={caretakerHome} replace />} />
          <Route
            path="dashboard"
            element={withSuspense(
              fullAccess ? <DashboardPage user={user} /> : <CaretakerDashboard user={user} />,
              'Loading dashboard',
            )}
          />
          <Route
            path="settings"
            element={withSuspense(
              <Settings user={user} accessRole="caretaker" onUserUpdate={onUserUpdate} />,
              'Loading settings',
            )}
          />
          <Route
            path="notifications"
            element={withSuspense(<NotificationsPage />, 'Loading notifications')}
          />

          {/* Permission-gated routes */}
          {canManageProperties && (
            <>
              <Route
                path="properties"
                element={withSuspense(<MyProperties user={user} />, 'Loading properties')}
              />
              <Route
                path="properties/:id"
                element={withSuspense(
                  <PropertySummary caretakerPermissions={perms} />,
                  'Loading property summary',
                )}
              />
              <Route
                path="properties/:id/edit"
                element={withSuspense(<PropertyDetailRoute />, 'Loading property editor')}
              />
            </>
          )}

          {canManageRooms && (
            <Route
              path="rooms"
              element={withSuspense(
                <RoomManagement user={user} accessRole="caretaker" />,
                'Loading room management',
              )}
            />
          )}

          {canManageMaintenance && (
            <Route
              path="maintenance"
              element={withSuspense(
                <LandlordMaintenance user={user} accessRole="caretaker" />,
                'Loading maintenance',
              )}
            />
          )}

          {canManageAddons && (
            <Route
              path="addons"
              element={withSuspense(
                <AddonManagement user={user} accessRole="caretaker" />,
                'Loading add-ons',
              )}
            />
          )}


          {canManageBookings && (
            <Route
              path="bookings"
              element={withSuspense(
                <Bookings user={user} accessRole="caretaker" />,
                'Loading bookings',
              )}
            />
          )}

          {canManagePayments && (
            <>
              <Route
                path="payments"
                element={withSuspense(
                  <Payments user={user} accessRole="caretaker" />,
                  'Loading payments',
                )}
              />
              <Route
                path="payments/logs"
                element={withSuspense(
                  <LandlordPaymentLogs user={user} />,
                  'Loading payment logs',
                )}
              />
            </>
          )}

          {canManageTenants && (
            <Route
              path="tenants"
              element={withSuspense(
                <Tenants user={user} accessRole="caretaker" />,
                'Loading tenants',
              )}
            />
          )}

          {canManageMessages && (
            <Route
              path="messages"
              element={withSuspense(
                <Messages user={user} accessRole="caretaker" />,
                'Loading messages',
              )}
            />
          )}

          {canManageAnalytics && (
            <Route
              path="analytics"
              element={withSuspense(
                <Analytics user={user} accessRole="caretaker" />,
                'Loading analytics',
              )}
            />
          )}

          {/* Catch-all — redirect unknown paths to home */}
          <Route path="*" element={<Navigate to={caretakerHome} replace />} />
        </Route>
      </Routes>
    </SidebarProvider>
  );
}
