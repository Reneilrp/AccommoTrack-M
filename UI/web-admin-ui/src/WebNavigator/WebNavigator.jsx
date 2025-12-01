import { Routes, Route, Navigate } from 'react-router-dom';
import LandlordLayout from '../components/LandlordLayout';
import AdminLayout from '../components/AdminLayout';

import DashboardPage from '../components/Pages/DashboardPage';
import RoomManagement from '../components/Pages/RoomManagement';
import Tenants from '../components/Pages/TenantManagement';
import Bookings from '../components/Pages/Bookings';
import Messages from '../components/Pages/Messages';
import Analytics from '../components/Pages/Analytics';
import Settings from '../components/Pages/Settings';
import MyProperties from '../components/Pages/MyProperties';

import AdminDashboard from '../../admin/AdminDashboard.jsx';
import UserManagement from '../../admin/UserManagement.jsx';
import PropertyApproval from '../../admin/PropertyApproval.jsx';
import { getDefaultLandingRoute } from '../utils/userRoutes';

export default function WebNavigator({ user, onLogout, onUserUpdate }) {
  // If user is admin, only show admin routes
  if (user?.role === 'admin') {
    return (
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminLayout user={user} onLogout={onLogout}>
              <AdminDashboard user={user} />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminLayout user={user} onLogout={onLogout}>
              <UserManagement />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/properties"
          element={
            <AdminLayout user={user} onLogout={onLogout}>
              <PropertyApproval />
            </AdminLayout>
          }
        />
        {/* Redirect any other route to admin dashboard */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  if (user?.role === 'caretaker') {
    const caretakerPermissions = user?.caretaker_permissions || {};
    const caretakerHome = getDefaultLandingRoute(user);

    return (
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
    );
  }

  // Landlord routes
  return (
    <LandlordLayout
      user={user}
      onLogout={onLogout}
      accessRole="landlord"
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage user={user} />} />
        <Route path="/properties" element={<MyProperties user={user} />} />
        <Route path="/rooms" element={<RoomManagement user={user} />} />
        <Route path="/tenants" element={<Tenants user={user} accessRole="landlord" />} />
        <Route path="/bookings" element={<Bookings user={user} accessRole="landlord" />} />
        <Route path="/messages" element={<Messages user={user} accessRole="landlord" />} />
        <Route path="/analytics" element={<Analytics user={user} accessRole="landlord" />} />
        <Route
          path="/settings"
          element={
            <Settings
              user={user}
              accessRole="landlord"
              onUserUpdate={onUserUpdate}
            />
          }
        />
      </Routes>
    </LandlordLayout>
  );
}