import { Routes, Route, Navigate } from 'react-router-dom';
import LandlordLayout from '../components/LandlordDashboard';

import DashboardPage from '../components/Pages/DashboardPage';
import RoomManagement from '../components/Pages/RoomManagement';
import Tenants from '../components/Pages/TenantManagement';
import Bookings from '../components/Pages/Bookings';
import Messages from '../components/Pages/Messages';
import Analytics from '../components/Pages/Analytics';
import Settings from '../components/Pages/Settings';
import MyProperties from '../components/Pages/MyProperties';

export default function WebNavigator({ user, onLogout }) {
  return (
    <LandlordLayout user={user} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage user={user} />} />
        <Route path="/properties" element={<MyProperties user={user} />} />
        <Route path="/rooms" element={<RoomManagement user={user} />} />
        <Route path="/tenants" element={<Tenants user={user} />} />
        <Route path="/bookings" element={<Bookings user={user} />} />
        <Route path="/messages" element={<Messages user={user} />} />
        <Route path="/analytics" element={<Analytics user={user} />} />
        <Route path="/settings" element={<Settings user={user} />} />
      </Routes>
    </LandlordLayout>
  );
}