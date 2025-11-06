import { useState } from 'react';
import LandlordDashboard from '../components/LandlordDashboard';
import Logo from '../assets/Logo.png';

import DashboardPage from '../components/Pages/DashboardPage';
import DormProfile from '../components/Pages/DormProfileSettings';
import RoomManagement from '../components/Pages/RoomManagement';
import Tenants from '../components/Pages/TenantManagement';
import Bookings from '../components/Pages/Bookings';
import Messages from '../components/Pages/Messages';
import Analytics from '../components/Pages/Analytics';
import Settings from '../components/Pages/Settings';

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