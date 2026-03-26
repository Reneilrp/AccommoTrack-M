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
    const caretakerHome = getDefaultLandingRoute(user);
    return (
      <SidebarProvider>
        <LandlordLayout user={user} onLogout={onLogout} accessRole="caretaker">
          <Routes>
            <Route path="/" element={<Navigate to={caretakerHome} replace />} />
            <Route path="/dashboard" element={<CaretakerDashboard user={user} />} />
            {caretakerPermissions.rooms && (
              <>
                <Route path="/rooms" element={<RoomManagement user={user} accessRole="caretaker" />} />
                <Route path="/maintenance" element={<LandlordMaintenance user={user} accessRole="caretaker" />} />
              </>
            )}
            {caretakerPermissions.bookings && (
              <Route path="/bookings" element={<Bookings user={user} accessRole="caretaker" />} />
            )}
            {caretakerPermissions.tenants && (
              <Route path="/tenants" element={<Tenants user={user} accessRole="caretaker" />} />
            )}
            {caretakerPermissions.messages && (
              <Route path="/messages" element={<Messages user={user} accessRole="caretaker" />} />
            )}
            <Route
              path="/settings"
              element={<Settings user={user} accessRole="caretaker" onUserUpdate={onUserUpdate} />}
            />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="*" element={<Navigate to={caretakerHome} replace />} />
          </Routes>
        </LandlordLayout>
      </SidebarProvider>
    );
  }

  // Landlord routes
  return (
    <SidebarProvider>
      <LandlordLayout user={user} onLogout={onLogout} accessRole="landlord">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage user={user} />} />
          <Route path="/properties" element={<MyProperties user={user} />} />
          <Route path="/properties/:id" element={<PropertySummary />} />
          <Route path="/properties/:id/edit" element={<PropertyDetailRoute />} />
          <Route path="/rooms" element={<RoomManagement user={user} />} />
          <Route path="/maintenance" element={<LandlordMaintenance user={user} />} />
          <Route path="/tenants/:id" element={<TenantLogs user={user} />} />
          <Route path="/tenants/logs" element={<TenantLogs user={user} />} />
          <Route path="/payments" element={<Payments user={user} />} />
          <Route path="/reviews" element={<LandlordReviews user={user} />} />
          <Route path="/tenants" element={<Tenants user={user} accessRole="landlord" />} />
          <Route path="/bookings" element={<Bookings user={user} accessRole="landlord" />} />
          <Route path="/transfers" element={<TransferRequests user={user} accessRole="landlord" />} />
          <Route path="/messages" element={<Messages user={user} accessRole="landlord" />} />
          <Route path="/addons" element={<AddonManagement user={user} accessRole="landlord" />} />
          <Route path="/analytics" element={<Analytics user={user} accessRole="landlord" />} />
          <Route
            path="/settings"
            element={
              <Settings user={user} accessRole="landlord" onUserUpdate={onUserUpdate} />
            }
          />
          <Route path="/verification" element={<VerificationStatus user={user} onUpdate={onUserUpdate} />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Routes>
      </LandlordLayout>
    </SidebarProvider>
  );
}
