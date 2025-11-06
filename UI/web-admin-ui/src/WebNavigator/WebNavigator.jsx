import { useState } from 'react';
import LandlordDashboard from './LandlordDashboard';
import Logo from '../assets/Logo.png';

// Import your page components (you mentioned you have these already)
import DashboardPage from './pages/DashboardPage';
import DormProfile from './pages/DormProfile';
import RoomManagement from './pages/RoomManagement';
import Tenants from './pages/Tenants';
import Bookings from './pages/Bookings';
import Messages from './pages/Messages';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

export default function WebNavigator({ user, onLogout }) {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleNavigate = (pageId) => {
    setCurrentPage(pageId);
  };

  // Render the appropriate page component based on currentPage
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage user={user} />;
      case 'dorm-profile':
        return <DormProfile user={user} />;
      case 'rooms':
        return <RoomManagement user={user} />;
      case 'tenants':
        return <Tenants user={user} />;
      case 'bookings':
        return <Bookings user={user} />;
      case 'messages':
        return <Messages user={user} />;
      case 'analytics':
        return <Analytics user={user} />;
      case 'settings':
        return <Settings user={user} />;
      default:
        return <DashboardPage user={user} />;
    }
  };

  return (
    <LandlordDashboard
      user={user}
      onLogout={onLogout}
      currentPage={currentPage}
      onNavigate={handleNavigate}
    >
      {renderPage()}
    </LandlordDashboard>
  );
}