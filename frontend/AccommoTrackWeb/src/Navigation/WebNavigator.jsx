import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
// IMPORT NAVIGATORS
import AdminNavigator from './AdminNavigator.jsx';
import LandlordNavigator from './LandlordNavigator.jsx';
import TenantNavigator from './TenantNavigator.jsx';

// IMPORT THE NEW COMPONENT
import PropertyDetails from '../screens/Guest/PropertyDetails.jsx';
import LandingPage from '../screens/Guest/LandingPage.jsx';
import BrowsingPropertyPage from '../screens/Guest/BrowsingPropertyPage.jsx';

// --- WRAPPER FOR DETAILS PAGE ---
// This wrapper is needed to extract the ID from the URL and pass it to your component
const PublicDetailsWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  return <PropertyDetails propertyId={id} onBack={() => navigate(-1)} />;
};

export default function WebNavigator({ user, onLogout, onUserUpdate }) {
  
  // Guest routes (no user)
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/browse-properties" element={<BrowsingPropertyPage />} />
        
        {/* --- ADD THIS LINE TO REGISTER THE ROUTE --- */}
        <Route path="/property/:id" element={<PublicDetailsWrapper />} />
        
        {/* Catch-all: Redirect unknown routes to Home */}
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

  // Tenant role
  if (user?.role === 'tenant') {
    return <TenantNavigator user={user} onLogout={onLogout} />;
  }

  return null;
}