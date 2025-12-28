import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import LandlordLayout from '../components/LandlordLayout';
import PropertyDetailRoute from './PropertyDetailRoute.jsx';
import PropertySummary from '../components/Pages/Landlord/PropertySummary.jsx';
import { getDefaultLandingRoute } from '../utils/userRoutes.js';
import DashboardPage from '../components/Pages/Landlord/DashboardPage.jsx';
import RoomManagement from '../components/Pages/Landlord/RoomManagement.jsx';
import Tenants from '../components/Pages/Landlord/TenantManagement.jsx';
import TenantLogs from '../components/Pages/Landlord/TenantLogs.jsx';
import Bookings from '../components/Pages/Landlord/Bookings.jsx';
import Payments from '../components/Pages/Landlord/Payments.jsx';
import Messages from '../components/Pages/Landlord/Messages.jsx';
import Analytics from '../components/Pages/Landlord/Analytics.jsx';
import Settings from '../components/Pages/Landlord/Settings.jsx';
import MyProperties from '../components/Pages/Landlord/MyProperties.jsx';

export default function LandlordNavigator({ user, onLogout, onUserUpdate }) {
  if (user?.role === 'caretaker') {
    const caretakerPermissions = user?.caretaker_permissions || {};
    const caretakerHome = getDefaultLandingRoute(user);
    return (
      <SidebarProvider>
        <LandlordLayout user={user} onLogout={onLogout} accessRole="caretaker">
          <Routes>
            <Route path="/" element={<Navigate to={caretakerHome} replace />} />
            {caretakerPermissions.rooms && (
              <Route path="/rooms" element={<RoomManagement user={user} accessRole="caretaker" />} />
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
          <Route path="/tenants/:id" element={<TenantLogs user={user} />} />
          <Route path="/tenants/logs" element={<TenantLogs user={user} />} />
          <Route path="/payments" element={<Payments user={user} />} />
          <Route path="/tenants" element={<Tenants user={user} accessRole="landlord" />} />
          <Route path="/bookings" element={<Bookings user={user} accessRole="landlord" />} />
          <Route path="/messages" element={<Messages user={user} accessRole="landlord" />} />
          <Route path="/analytics" element={<Analytics user={user} accessRole="landlord" />} />
          <Route
            path="/settings"
            element={
              <Settings user={user} accessRole="landlord" onUserUpdate={onUserUpdate} />
            }
          />
        </Routes>
      </LandlordLayout>
    </SidebarProvider>
  );
}
