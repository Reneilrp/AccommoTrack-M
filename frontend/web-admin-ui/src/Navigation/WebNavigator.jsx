
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminNavigator from './AdminNavigator.jsx';
import LandlordNavigator from './LandlordNavigator.jsx';
import LandingPage from '../components/Pages/Guest/LandingPage.jsx';
import BrowsingPropertyPage from '../components/Pages/Guest/BrowsingPropertyPage.jsx';

export default function WebNavigator({ user, onLogout, onUserUpdate }) {
  
  // Guest routes (no user)
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/browse-properties" element={<BrowsingPropertyPage />} />
        {/* Add more guest routes as needed */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }
  
  // Admin role
  if (user?.role === 'admin') {
    return <AdminNavigator user={user} onLogout={onLogout} />;
  }

  // Landlord and caretaker roles
  if (user?.role === 'landlord' || user?.role === 'caretaker') {
    return <LandlordNavigator user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />;
  }

  // TODO: Add TenantNavigator here for tenant role
  return null;
}