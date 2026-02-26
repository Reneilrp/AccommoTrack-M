import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../../contexts/SidebarContext';
import LogoutConfirmModal from '../Shared/LogoutConfirmModal';
import Logo from '../../assets/Logo.png';
import { getImageUrl } from '../../utils/api';
import NotificationDropdown from '../Shared/NotificationDropdown';
import { 
  LayoutDashboard, 
  Search, 
  Calendar, 
  Wallet, 
  MessageSquare, 
  Wrench, 
  Settings as SettingsIcon,
  Menu,
  ChevronLeft,
  LogOut
} from 'lucide-react';

export default function TenantLayout({ user, onLogout, children }) {
  const { isSidebarOpen, setIsSidebarOpen, asideRef } = useSidebar();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const tenantMenu = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      path: '/explore',
      label: 'Explore',
      icon: <Search className="w-5 h-5" />
    },
    {
      path: '/bookings',
      label: 'My Bookings',
      icon: <Calendar className="w-5 h-5" />
    },
    {
      path: '/wallet',
      label: 'Payments',
      icon: <Wallet className="w-5 h-5" />
    },
    {
      path: '/messages',
      label: 'Messages',
      icon: <MessageSquare className="w-5 h-5" />
    },
    {
      path: '/maintenance',
      label: 'Maintenance',
      icon: <Wrench className="w-5 h-5" />
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: <SettingsIcon className="w-5 h-5" />
    },
  ];


  const getPageTitle = () => {
    const item = tenantMenu.find(m => m.path === location.pathname);
    if (item) return item.label;
    if (location.pathname === '/settings') return 'Settings';
    if (location.pathname.startsWith('/property/')) return 'Property Details';
    return 'AccommoTrack';
  };

  const displayName = user?.name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Tenant');

  return (
    <div className="flex h-screen bg-gray-200 dark:bg-gray-900">
      {/* Sidebar */}
      <aside 
        ref={asideRef}
        className={`
          fixed left-0 top-0 bottom-0 z-30
          bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 transition-all duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'w-64' : 'w-20'}
        `}
      >
        {/* Logo & Toggle */}
        <div className="h-14 md:h-18 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <div 
            className="cursor-pointer" 
            onClick={() => navigate('/dashboard')}
            title="Go to Dashboard"
          >
            {isSidebarOpen ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <img src={Logo} alt="AccommoTrack" className="h-8 w-auto flex-shrink-0" />
                <span className="text-lg font-bold text-green-700 dark:text-green-400 truncate">AccommoTrack</span>
              </div>
            ) : (
              <img src={Logo} alt="AccommoTrack" className="h-8 w-auto mx-auto" />
            )}
          </div>
          
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${!isSidebarOpen && 'hidden'}`}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Collapsed Sidebar - Show hamburger when closed */}
        {!isSidebarOpen && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400 mx-auto" />
            </button>
          </div>
        )}

        {/* User Profile Summary */}
        <div 
            className="p-4 border-b bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={() => navigate('/settings')}
            title="Go to Profile Settings"
        >
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <img
              src={getImageUrl(user?.profile_image) || `https://ui-avatars.com/api/?name=${displayName}&background=random`}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-sm flex-shrink-0"
            />
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">{user?.role}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {tenantMenu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                w-full flex items-center gap-3 px-4 py-3 transition-colors relative
                ${isActive 
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-r-4 border-green-600 dark:border-green-500' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}
                ${!isSidebarOpen && 'justify-center'}
              `}
            >
              {item.icon}
              {isSidebarOpen && (
                <span className="font-medium truncate">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Settings + Logout Buttons (bottom) */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto space-y-2">
          <button
            onClick={() => setShowLogoutModal(true)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${
              !isSidebarOpen && 'justify-center'
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span className="font-medium">Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Header - Simplified (No Menu Button) */}
        <header className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/20 h-14 md:h-18 flex items-center px-4 lg:px-8 border-b border-gray-300 dark:border-gray-700 relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight pointer-events-auto">
              {getPageTitle()}
            </h1>
          </div>
          
          <div className="ml-auto z-10">
            {location.pathname === '/dashboard' && <NotificationDropdown />}
          </div>
        </header>

        {/* Page Content */}
        <div 
          className={`flex-1 overflow-y-auto bg-transparent dark:bg-gray-900 ${location.pathname.startsWith('/property/') ? '' : 'p-4 lg:p-8'}`}
          style={{ scrollbarGutter: 'stable' }}
        >
          {children}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal 
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          onLogout();
        }}
      />
    </div>
  );
}
