import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import LandlordLayout from '../components/Layout/LandlordLayout';
import PropertyDetailRoute from './PropertyDetailRoute.jsx';
import PropertySummary from '../screens/Landlord/PropertySummary.jsx';
import { getDefaultLandingRoute } from '../utils/userRoutes.js';

// Component imports
import DashboardPage from '../screens/Landlord/DashboardPage.jsx';
import RoomManagement from '../screens/Landlord/RoomManagement.jsx';
import Tenants from '../screens/Landlord/TenantManagement.jsx';
import TenantLogs from '../screens/Landlord/TenantLogs.jsx';
import Bookings from '../screens/Landlord/Bookings.jsx';
import Payments from '../screens/Landlord/Payments.jsx';
import Messages from '../screens/Landlord/Messages.jsx';
import Analytics from '../screens/Landlord/Analytics.jsx';
import Settings from '../screens/Landlord/Settings.jsx';
import MyProperties from '../screens/Landlord/MyProperties.jsx';
import CaretakerDashboard from '../screens/Landlord/CaretakerDashboard.jsx';
import LandlordMaintenance from '../screens/Landlord/LandlordMaintenance.jsx';
import LandlordReviews from '../screens/Landlord/Reviews.jsx';
import VerificationStatus from '../screens/Landlord/VerificationStatus.jsx';
import AddonManagement from '../screens/Landlord/AddonManagement.jsx';
import NotificationsPage from '../screens/Landlord/NotificationsPage.jsx';
import TransferRequests from '../screens/Landlord/TransferRequests.jsx';

export default function LandlordNavigator({ user, onLogout, onUserUpdate }) {
  if (user?.role === 'caretaker') {
    const caretakerPermissions = user?.caretaker_permissions || {};

    const normalizePermissionValue = (value) => {
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'allowed';
      }
      return Boolean(value);
    };

    const buildPermissionCandidates = (key, aliases = []) => {
      const base = String(key || '').trim();
      const singular = base.endsWith('ies')
        ? `${base.slice(0, -3)}y`
        : base.endsWith('s')
          ? base.slice(0, -1)
          : base;
      const plural = base.endsWith('s')
        ? base
        : singular === 'property'
          ? 'properties'
          : `${singular}s`;

      const keys = new Set([base, singular, plural, ...aliases]);
      const expanded = [];

      keys.forEach((entry) => {
        if (!entry) return;
        expanded.push(entry, `can_view_${entry}`, `can_manage_${entry}`);
      });

      return expanded;
    };

    const hasCaretakerPermission = (key, aliases = []) => {
      return buildPermissionCandidates(key, aliases).some((candidate) =>
        normalizePermissionValue(caretakerPermissions?.[candidate]),
      );
    };

    const canManageProperties = hasCaretakerPermission('properties', ['property', 'property_management']);
    const canManageMaintenance = hasCaretakerPermission('maintenance', ['rooms']);
    const canManagePayments = hasCaretakerPermission('payments');
    const canManageRooms = hasCaretakerPermission('rooms');
    const canManageBookings = hasCaretakerPermission('bookings');
    const canManageTenants = hasCaretakerPermission('tenants');
    const canManageMessages = hasCaretakerPermission('messages');
    const canManageAnalytics = hasCaretakerPermission('analytics');
    const caretakerHome = getDefaultLandingRoute(user);
    return (
      <SidebarProvider>
        <Routes>
          <Route element={<LandlordLayout user={user} onLogout={onLogout} accessRole="caretaker" />}>
            <Route index element={<Navigate to={caretakerHome} replace />} />
            <Route path="dashboard" element={<CaretakerDashboard user={user} />} />
            {canManageProperties && (
              <>
                <Route path="properties" element={<MyProperties user={user} />} />
                <Route path="properties/:id" element={<PropertySummary />} />
                <Route path="properties/:id/edit" element={<PropertyDetailRoute />} />
              </>
            )}
            {canManageRooms && (
              <Route path="rooms" element={<RoomManagement user={user} accessRole="caretaker" />} />
            )}
            {canManageMaintenance && (
              <Route path="maintenance" element={<LandlordMaintenance user={user} accessRole="caretaker" />} />
            )}
            {canManageBookings && (
              <Route path="bookings" element={<Bookings user={user} accessRole="caretaker" />} />
            )}
            {canManagePayments && (
              <Route path="payments" element={<Payments user={user} accessRole="caretaker" />} />
            )}
            {canManageTenants && (
              <Route path="tenants" element={<Tenants user={user} accessRole="caretaker" />} />
            )}
            {canManageMessages && (
              <Route path="messages" element={<Messages user={user} accessRole="caretaker" />} />
            )}
            {canManageAnalytics && (
              <Route path="analytics" element={<Analytics user={user} accessRole="caretaker" />} />
            )}
            <Route
              path="settings"
              element={<Settings user={user} accessRole="caretaker" onUserUpdate={onUserUpdate} />}
            />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="*" element={<Navigate to={caretakerHome} replace />} />
          </Route>
        </Routes>
      </SidebarProvider>
    );
  }

  // Landlord routes
  return (
    <SidebarProvider>
      <Routes>
        <Route element={<LandlordLayout user={user} onLogout={onLogout} accessRole="landlord" />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage user={user} />} />
          <Route path="properties" element={<MyProperties user={user} />} />
          <Route path="properties/:id" element={<PropertySummary />} />
          <Route path="properties/:id/edit" element={<PropertyDetailRoute />} />
          <Route path="rooms" element={<RoomManagement user={user} />} />
          <Route path="maintenance" element={<LandlordMaintenance user={user} />} />
          <Route path="tenants/:id" element={<TenantLogs user={user} />} />
          <Route path="tenants/logs" element={<TenantLogs user={user} />} />
          <Route path="payments" element={<Payments user={user} />} />
          <Route path="reviews" element={<LandlordReviews user={user} />} />
          <Route path="tenants" element={<Tenants user={user} accessRole="landlord" />} />
          <Route path="bookings" element={<Bookings user={user} accessRole="landlord" />} />
          <Route path="transfers" element={<TransferRequests user={user} accessRole="landlord" />} />
          <Route path="messages" element={<Messages user={user} accessRole="landlord" />} />
          <Route path="addons" element={<AddonManagement user={user} />} />
          <Route path="analytics" element={<Analytics user={user} accessRole="landlord" />} />
          <Route
            path="settings"
            element={
              <Settings user={user} accessRole="landlord" onUserUpdate={onUserUpdate} />
            }
          />
          <Route path="verification" element={<VerificationStatus user={user} onUpdate={onUserUpdate} />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </SidebarProvider>
  );
}
