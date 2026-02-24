import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../../assets/Logo.png';
import { useSidebar } from '../../contexts/SidebarContext.jsx';
import LogoutConfirmModal from '../Shared/LogoutConfirmModal';
import api, { getImageUrl } from '../../utils/api';
import NotificationDropdown from '../Shared/NotificationDropdown';
import { useUIState } from '../../contexts/UIStateContext';
import { 
  Plus, 
  Banknote, 
  LayoutDashboard, 
  Building2, 
  Users, 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  Settings as SettingsIcon,
  LogOut,
  Menu,
  ChevronLeft
} from 'lucide-react';

export default function LandlordLayout({
  user,
  onLogout,
  children,
  accessRole = 'landlord',
}) {

  const { isSidebarOpen, setIsSidebarOpen, asideRef } = useSidebar();
  const { uiState } = useUIState();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [caretakerProperties, setCaretakerProperties] = useState([]);
  const [selectedCaretakerProperty, setSelectedCaretakerProperty] = useState(() => {
    try { return Number(localStorage.getItem('caretaker_property')) || null; } catch (e) { return null; }
  });
  const location = useLocation();
  const navigate = useNavigate();

  const normalizedRole = accessRole || user?.role || 'landlord';
  const isCaretaker = normalizedRole === 'caretaker';
  const caretakerPermissions = user?.caretaker_permissions || {};

  const landlordMenu = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    { 
      path: '/properties', 
      label: 'My Properties', 
      icon: <Building2 className="w-5 h-5" />
    },
    {
      path: '/tenants',
      label: 'Tenants',
      icon: <Users className="w-5 h-5" />,
      onlyCaretaker: true
    },
    
    { 
      path: '/bookings', 
      label: 'Bookings', 
      icon: <Calendar className="w-5 h-5" />
    },
    { 
      path: '/payments', 
      label: 'Payments', 
      icon: <Banknote className="w-5 h-5" />
    },
    { 
      path: '/messages', 
      label: 'Messages', 
      icon: <MessageSquare className="w-5 h-5" />
    },
    { 
      path: '/analytics', 
      label: 'Analytics', 
      icon: <BarChart3 className="w-5 h-5" />
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: <SettingsIcon className="w-5 h-5" />
    }
  ];

  const caretakerAllowedPaths = new Set([
    caretakerPermissions.rooms ? '/rooms' : null,
    caretakerPermissions.rooms ? '/maintenance' : null,
    caretakerPermissions.bookings ? '/bookings' : null,
    caretakerPermissions.tenants ? '/tenants' : null,
    caretakerPermissions.messages ? '/messages' : null,
    '/settings',
  ].filter(Boolean));

  const caretakerMenu = caretakerAllowedPaths.size > 0
    ? landlordMenu.filter((item) => caretakerAllowedPaths.has(item.path))
    : landlordMenu.filter((item) => item.path === '/settings');

  const menuItems = isCaretaker
    ? caretakerMenu
    : landlordMenu.filter((item) => !item.onlyCaretaker);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  // Load accessible properties for caretakers so they can pick which property to monitor
  React.useEffect(() => {
    if (!isCaretaker) return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/properties/accessible');
        if (!mounted) return;
        setCaretakerProperties(res.data || []);
        // If nothing selected, pick first
        if (!selectedCaretakerProperty && Array.isArray(res.data) && res.data.length > 0) {
          setSelectedCaretakerProperty(res.data[0].id);
          try { localStorage.setItem('caretaker_property', String(res.data[0].id)); } catch (e) {}
        }
      } catch (e) {
        // ignore failures silently; page routes already protect access
      }
    })();
    return () => { mounted = false; };
  }, [isCaretaker]);

  const handleSelectCaretakerProperty = (id) => {
    setSelectedCaretakerProperty(id);
    try { localStorage.setItem('caretaker_property', String(id)); } catch (e) {}
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    onLogout();
  };

  const getPageTitle = () => {
    const item = landlordMenu.find(m => m.path === location.pathname);
    if (item) return item.label;
    if (location.pathname === '/settings') return 'Settings';
    
    // Dynamic Property Title
    if (location.pathname.startsWith('/properties/')) {
      const parts = location.pathname.split('/');
      const propId = parts[2];
      if (propId && propId !== 'new') {
        const propData = uiState.data?.landlord_property_details?.[propId]?.property;
        if (propData?.title) return propData.title;
      }
      return 'Property Details';
    }

    if (location.pathname.startsWith('/tenants/')) return 'Tenant Logs';
    return 'AccommoTrack';
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside ref={asideRef} className={`fixed left-0 top-0 bottom-0 z-20 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
        isSidebarOpen ? 'w-64' : 'w-20'
      } flex flex-col min-h-0`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <div 
             className="cursor-pointer"
             onClick={() => navigate('/dashboard')}
             title="Go to Dashboard"
          >
            {isSidebarOpen ? (
              <div className="flex items-center gap-2">
                <img 
                  src={Logo} 
                  alt="AccommoTrack Logo" 
                  className="h-8 w-auto"
                />
                <span className="text-lg font-bold text-gray-900 dark:text-white">AccommoTrack</span>
              </div>
            ) : (
              <img 
                src={Logo} 
                alt="AccommoTrack Logo" 
                className="h-8 w-auto mx-auto"
              />
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

        {/* User Profile */}
        <div 
            className="p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => navigate('/settings')}
            title="Go to Profile Settings"
        >
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.profile_image ? (
                <img 
                  src={getImageUrl(user.profile_image)} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-brand-600 dark:text-brand-400 font-semibold">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              )}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={`${user?.first_name} ${user?.last_name}`}>
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={user?.email}>{user?.email}</p>
                {isCaretaker && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">Caretaker Access</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `w-full flex items-center gap-3 px-4 py-3 transition-colors relative ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border-r-4 border-brand-600 dark:border-brand-500'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                } ${!isSidebarOpen && 'justify-center'}`
              }
              title={!isSidebarOpen ? item.label : ''}
            >
              {item.icon}
              {isSidebarOpen && (
                <>
                  <span className="flex-1 text-left font-medium truncate" title={item.label}>{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {!isSidebarOpen && item.badge && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Caretaker-only quick links */}
        {isCaretaker && (
          <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Caretaker</div>
            </div>

            <div className="mb-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Monitoring</div>
              <div 
                className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1 truncate"
                title={selectedCaretakerProperty ? (caretakerProperties.find((p) => p.id === selectedCaretakerProperty)?.title || `Property ${selectedCaretakerProperty}`) : ''}
              >
                {selectedCaretakerProperty
                  ? (caretakerProperties.find((p) => p.id === selectedCaretakerProperty)?.title || `Property ${selectedCaretakerProperty}`)
                  : 'No assigned property'}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {caretakerPermissions.rooms && (
                (selectedCaretakerProperty) ? (
                  <NavLink
                    to={`/rooms?property=${selectedCaretakerProperty}`}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span>Rooms</span>
                  </NavLink>
                ) : (
                  <div className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700" aria-disabled="true">
                    <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <span>Rooms</span>
                  </div>
                )
              )}

              {caretakerPermissions.tenants && (
                (selectedCaretakerProperty) ? (
                  <NavLink
                    to={`/tenants?property=${selectedCaretakerProperty}`}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span>Tenants</span>
                  </NavLink>
                ) : (
                  <div className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700" aria-disabled="true">
                    <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <span>Tenants</span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto space-y-2">
          <button
            onClick={handleLogoutClick}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${
              !isSidebarOpen && 'justify-center'
            }`}
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Header - Excluded on specific pages */}
        {!(
          (location.pathname.startsWith('/properties/') && location.pathname !== '/properties') ||
          (location.pathname === '/properties' && uiState.data?.landlord_property_view === 'add') ||
          location.pathname === '/rooms' ||
          location.pathname.startsWith('/rooms/') ||
          location.pathname === '/tenants' ||
          location.pathname.startsWith('/tenants/') ||
          location.pathname === '/maintenance' ||
          location.pathname === '/reviews'
        ) && (
          <header className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/20 h-16 flex items-center justify-center px-4 lg:px-8 flex-shrink-0 z-10 relative">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              {getPageTitle()}
            </h1>
            <div className="absolute right-4 lg:right-8 flex items-center gap-4">
              {location.pathname === '/properties' && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-add-property'))}
                  className="flex items-center gap-2 p-2 lg:px-4 lg:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg shadow-green-500/20"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden lg:inline">Add Property</span>
                </button>
              )}
              {location.pathname === '/bookings' && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-add-booking'))}
                  className="flex items-center gap-2 p-2 lg:px-4 lg:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg shadow-green-500/20"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden lg:inline">Add Booking</span>
                </button>
              )}
              {location.pathname === '/dashboard' && <NotificationDropdown />}
            </div>
          </header>
        )}

        {/* Page Content */}
        <div 
          className={`flex-1 overflow-y-auto ${
            (
              (location.pathname.startsWith('/properties/') && location.pathname !== '/properties') ||
              (location.pathname === '/properties' && uiState.data?.landlord_property_view === 'add') ||
              location.pathname === '/rooms' ||
              location.pathname.startsWith('/rooms/') ||
              location.pathname === '/tenants' ||
              location.pathname.startsWith('/tenants/') ||
              location.pathname === '/maintenance' ||
              location.pathname === '/reviews'
            ) ? 'p-0' : 'p-4 lg:p-8'
          }`}
          style={{ scrollbarGutter: 'stable' }}
        >
          {children}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal 
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
}