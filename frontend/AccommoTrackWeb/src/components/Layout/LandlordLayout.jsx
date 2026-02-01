import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../../assets/Logo.png';
import { useSidebar } from '../../contexts/SidebarContext.jsx';
import LogoutConfirmModal from '../Shared/LogoutConfirmModal';
import api, { getImageUrl } from '../../utils/api';

export default function LandlordLayout({
  user,
  onLogout,
  children,
  accessRole = 'landlord',
}) {

  const { isSidebarOpen, setIsSidebarOpen, asideRef } = useSidebar();
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
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      path: '/properties', 
      label: 'My Properties', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    
    { 
      path: '/bookings', 
      label: 'Bookings', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      path: '/payments', 
      label: 'Payments', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-3.866 0-7 1.79-7 4v4h14v-4c0-2.21-3.134-4-7-4zM12 8V5m0 0L9 8m3-3 3 3" />
        </svg>
      )
    },
    { 
      path: '/messages', 
      label: 'Messages', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    { 
      path: '/analytics', 
      label: 'Analytics', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  const caretakerAllowedPaths = new Set([
    caretakerPermissions.rooms ? '/rooms' : null,
    caretakerPermissions.bookings ? '/bookings' : null,
    caretakerPermissions.messages ? '/messages' : null,
    '/settings',
  ].filter(Boolean));

  const caretakerMenu = caretakerAllowedPaths.size > 0
    ? landlordMenu.filter((item) => caretakerAllowedPaths.has(item.path))
    : landlordMenu.filter((item) => item.path === '/settings');

  const menuItems = isCaretaker ? caretakerMenu : landlordMenu;

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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside ref={asideRef} className={`fixed left-0 top-0 bottom-0 z-20 bg-white border-r border-gray-200 transition-all duration-300 ${
        isSidebarOpen ? 'w-64' : 'w-20'
      } flex flex-col min-h-0`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
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
                <span className="text-lg font-bold text-gray-900">AccommoTrack</span>
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
            className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${!isSidebarOpen && 'hidden'}`}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Collapsed Sidebar - Show hamburger when closed */}
        {!isSidebarOpen && (
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-full p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}

        {/* User Profile */}
        <div 
            className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => navigate('/settings')}
            title="Go to Profile Settings"
        >
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.profile_image ? (
                <img 
                  src={getImageUrl(user.profile_image)} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-brand-600 font-semibold">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              )}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                {isCaretaker && (
                  <p className="text-xs text-amber-600 font-semibold mt-1">Caretaker Access</p>
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
                    ? 'bg-brand-50 text-brand-600 border-r-4 border-brand-600'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${!isSidebarOpen && 'justify-center'}`
              }
            >
              {item.icon}
              {isSidebarOpen && (
                <>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
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
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-gray-500">Caretaker</div>
            </div>

            <div className="mb-2">
              <div className="text-xs text-gray-500">Monitoring</div>
              <div className="text-sm font-medium text-gray-800 mt-1">
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
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M3 7h18M3 7l9-4 9 4M4 7v14h16V7"/></svg>
                    <span>Rooms</span>
                  </NavLink>
                ) : (
                  <div className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400 bg-gray-50" aria-disabled="true">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M3 7h18M3 7l9-4 9 4M4 7v14h16V7"/></svg>
                    <span>Rooms</span>
                  </div>
                )
              )}

              {caretakerPermissions.tenants && (
                (selectedCaretakerProperty) ? (
                  <NavLink
                    to={`/tenants?property=${selectedCaretakerProperty}`}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 11a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                    <span>Tenants</span>
                  </NavLink>
                ) : (
                  <div className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400 bg-gray-50" aria-disabled="true">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 11a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                    <span>Tenants</span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="p-4 border-t border-gray-200 mt-auto">
          <button
            onClick={handleLogoutClick}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
              !isSidebarOpen && 'justify-center'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isSidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto transition-all ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {children}
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