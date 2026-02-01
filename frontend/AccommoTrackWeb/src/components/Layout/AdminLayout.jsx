import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSidebar } from '../../contexts/SidebarContext';
import LogoutConfirmModal from '../Shared/LogoutConfirmModal';
import Logo from '../../assets/Logo.png';

const AdminLayout = ({ children, user, onLogout = () => {} }) => {
  const { isSidebarOpen, setIsSidebarOpen, asideRef } = useSidebar();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const navLinkClasses = (isActive) =>
    `w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm font-medium ${
      isActive
        ? 'bg-brand-50 text-brand-700 border-r-4 border-brand-600'
        : 'text-gray-600 hover:bg-gray-100'
    } ${!isSidebarOpen && 'justify-center'}`;

  const adminMenu = [
    { 
      path: '/admin', 
      label: 'Dashboard', 
      end: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      path: '/admin/users', 
      label: 'Users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    { 
      path: '/admin/approvals', 
      label: 'Approvals',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    onLogout();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside 
        ref={asideRef}
        className={`fixed left-0 top-0 bottom-0 z-20 bg-white border-r border-gray-200 transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } flex flex-col min-h-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 bg-gray-50">
          <div 
            className="cursor-pointer flex items-center gap-2"
            onClick={() => navigate('/admin')}
            title="Go to Dashboard"
          >
            {isSidebarOpen ? (
              <>
                <img src={Logo} alt="AccommoTrack" className="h-8 w-auto" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-brand-600 font-semibold">Admin Suite</p>
                  <span className="text-sm font-bold text-gray-900">AccommoTrack</span>
                </div>
              </>
            ) : (
              <img src={Logo} alt="AccommoTrack" className="h-8 w-auto mx-auto" />
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${!isSidebarOpen && 'hidden'}`}
            aria-label="Toggle sidebar"
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
              aria-label="Open sidebar"
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
          onClick={() => navigate('/admin')}
          title="Admin Profile"
        >
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-brand-600 font-semibold">
                {user?.first_name?.[0]}{user?.last_name?.[0] || user?.email?.[0]?.toUpperCase()}
              </span>
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.email}
                </p>
                <p className="text-xs text-brand-600 font-medium">Administrator</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {adminMenu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => navLinkClasses(isActive)}
            >
              {item.icon}
              {isSidebarOpen && <span className="flex-1 text-left">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

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
      <main className={`flex-1 overflow-y-auto bg-gray-50 transition-all duration-300 ${
        isSidebarOpen ? 'ml-64' : 'ml-20'
      }`}>
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
};

export default AdminLayout;
