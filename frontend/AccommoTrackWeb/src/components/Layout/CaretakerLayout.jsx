import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../../assets/Logo.png';
import { useSidebar } from '../../contexts/SidebarContext.jsx';
import LogoutConfirmModal from '../Shared/LogoutConfirmModal';
import __api, { getImageUrl } from '../../utils/api';
import NotificationDropdown from '../Shared/NotificationDropdown';
import StaffToolbelt from '../Shared/StaffToolbelt';
import { useUIState } from '../../contexts/UIStateContext';
import { useCaretakerPermissions } from '../../hooks/useCaretakerPermissions';
import {
  LayoutDashboard,
  Building2,
  Wrench,
  Sparkles,
  Users,
  Calendar,
  MessageSquare,
  BarChart3,
  Banknote,
  Home,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  ChevronLeft,
  ShieldCheck,
  Info,
} from 'lucide-react';

// Menu shown when caretaker has full landlord access — mirrors the landlord sidebar.
const LANDLORD_STYLE_MENU = [
  { path: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard, permKey: null },
  { path: '/properties', label: 'My Properties', icon: Building2,       permKey: null },
  { path: '/bookings',   label: 'Bookings',      icon: Calendar,        permKey: null },
  { path: '/payments',   label: 'Payments',      icon: Banknote,        permKey: null },
  { path: '/messages',   label: 'Messages',      icon: MessageSquare,   permKey: null },
  { path: '/analytics',  label: 'Analytics',     icon: BarChart3,       permKey: null },
  { path: '/settings',   label: 'Settings',      icon: SettingsIcon,    permKey: null },
];

// Menu shown when caretaker has limited / partial access.
// Each entry is conditionally shown based on the specific permission granted.
const CARETAKER_MENU_DEFINITIONS = [
  { path: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard, permKey: null /* always */ },
  { path: '/properties', label: 'My Properties', icon: Building2,       permKey: 'canManageProperties' },
  { path: '/rooms',      label: 'Rooms',         icon: Home,            permKey: 'canManageRooms' },
  { path: '/maintenance',label: 'Maintenance',   icon: Wrench,          permKey: 'canManageMaintenance' },
  { path: '/addons',     label: 'Add-ons',       icon: Sparkles,        permKey: 'canManageAddons' },
  { path: '/bookings',   label: 'Bookings',      icon: Calendar,        permKey: 'canManageBookings' },
  { path: '/payments',   label: 'Payments',      icon: Banknote,        permKey: 'canManagePayments' },
  { path: '/tenants',    label: 'Tenants',       icon: Users,           permKey: 'canManageTenants' },
  { path: '/messages',   label: 'Messages',      icon: MessageSquare,   permKey: 'canManageMessages' },
  { path: '/analytics',  label: 'Analytics',     icon: BarChart3,       permKey: 'canManageAnalytics' },
  { path: '/settings',   label: 'Settings',      icon: SettingsIcon,    permKey: null /* always */ },
];

export default function CaretakerLayout({ user, onLogout, children, onUserUpdate }) {
  const { isSidebarOpen, setIsSidebarOpen, asideRef } = useSidebar();
  const { uiState } = useUIState();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  const perms = useCaretakerPermissions(user);
  const {
    canManageMessages,
    canManageProperties,
    fullAccess,
  } = perms;

  // ── Build the sidebar menu ───────────────────────────────────────────────────
  // Full access → landlord-style menu (clean, no operational sub-modules)
  // Limited access → permission-filtered caretaker menu
  const menuItems = fullAccess
    ? LANDLORD_STYLE_MENU
    : CARETAKER_MENU_DEFINITIONS.filter(({ permKey }) => {
        if (!permKey) return true;
        return perms[permKey] === true;
      });

  // When only Dashboard + Settings remain the caretaker has no module access
  const hasNoModuleAccess = !fullAccess && menuItems.length <= 2;

  // ── Unread message badge ─────────────────────────────────────────────────────
  const refreshMessageUnreadCount = useCallback(async () => {
    if (!canManageMessages) {
      setMessageUnreadCount(0);
      return;
    }
    try {
      const response = await __api.get('/messages/conversations');
      const rows = Array.isArray(response.data) ? response.data : [];
      const unread = rows.reduce((sum, conv) => sum + (Number(conv?.unread_count) || 0), 0);
      setMessageUnreadCount(unread);
    } catch (_error) {
      // Keep the previous count if refresh fails.
    }
  }, [canManageMessages]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    refreshMessageUnreadCount();
    const intervalId = window.setInterval(refreshMessageUnreadCount, 30000);

    const handleWindowFocus = () => refreshMessageUnreadCount();
    const handleUnreadUpdate = (event) => {
      const eventCount = Number.parseInt(String(event?.detail?.count ?? ''), 10);
      if (Number.isFinite(eventCount)) {
        setMessageUnreadCount(Math.max(0, eventCount));
        return;
      }
      refreshMessageUnreadCount();
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('accommo:messages-unread-updated', handleUnreadUpdate);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('accommo:messages-unread-updated', handleUnreadUpdate);
    };
  }, [refreshMessageUnreadCount]);

  // ── Page title ───────────────────────────────────────────────────────────────
  const getPageTitle = () => {
    const item = CARETAKER_MENU_DEFINITIONS.find((m) => m.path === location.pathname);
    if (item) return item.label;
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

  // ── Header suppression (full-page screens manage their own header) ────────────
  const suppressHeader =
    (location.pathname.startsWith('/properties/') && location.pathname !== '/properties') ||
    location.pathname === '/rooms' ||
    location.pathname.startsWith('/rooms/') ||
    location.pathname === '/tenants' ||
    location.pathname.startsWith('/tenants/') ||
    location.pathname === '/maintenance' ||
    location.pathname === '/addons';

  const handleLogoutClick = () => setShowLogoutModal(true);
  const confirmLogout = () => { setShowLogoutModal(false); onLogout(); };

  const fullName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : (user?.name || 'Caretaker');

  const avatarUrl =
    getImageUrl(user?.profile_image) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        ref={asideRef}
        className={`fixed left-0 top-0 bottom-0 z-20 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
          isSidebarOpen ? 'translate-x-0 lg:w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'
        } w-64 flex flex-col min-h-0`}
      >
        {/* Logo */}
        <div className="h-14 md:h-18 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <div
            className="cursor-pointer"
            onClick={() => navigate('/dashboard')}
            title="Go to Dashboard"
          >
            {isSidebarOpen ? (
              <div className="flex items-center gap-2">
                <img src={Logo} alt="AccommoTrack Logo" className="h-8 w-auto" />
                <span className="text-lg font-bold text-gray-900 dark:text-white">AccommoTrack</span>
              </div>
            ) : (
              <img src={Logo} alt="AccommoTrack Logo" className="h-8 w-auto mx-auto" />
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${!isSidebarOpen && 'hidden'}`}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Collapsed hamburger */}
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

        {/* Profile summary */}
        <div
          className="p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={() => navigate('/settings')}
          title="Go to Profile Settings"
        >
          <div className={`flex items-center gap-4 ${!isSidebarOpen && 'justify-center'}`}>
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
            />
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{fullName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">Caretaker</p>
                  {fullAccess && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[10px] font-bold leading-none">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      Full Access
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                w-full flex items-center gap-4 px-4 py-4 transition-colors relative
                ${isActive
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-r-4 border-green-600 dark:border-green-500'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}
                ${!isSidebarOpen && 'justify-center'}
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span className="font-medium truncate">{item.label}</span>}
              {item.path === '/messages' && messageUnreadCount > 0 && (
                <span
                  className={`inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold leading-none h-5 min-w-[20px] px-1.5 ${
                    isSidebarOpen ? 'ml-auto' : 'absolute top-2 right-2'
                  }`}
                >
                  {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                </span>
              )}
            </NavLink>
          ))}

          {/* No-module-access hint */}
          {hasNoModuleAccess && isSidebarOpen && (
            <div className="mx-3 mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-snug">
                  No modules assigned yet.{' '}
                  <span className="font-semibold">Contact your landlord</span> to unlock features.
                </p>
              </div>
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <button
            onClick={handleLogoutClick}
            className={`w-full flex items-center gap-4 px-4 py-4 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${
              !isSidebarOpen && 'justify-center'
            }`}
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">Log out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-10 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar trigger */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-30 lg:hidden p-2.5 rounded-lg bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700 shadow-lg"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
      )}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main
        className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        {/* Top header */}
        {!suppressHeader && (
          <header className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/20 h-14 md:h-18 flex items-center justify-start px-4 lg:px-8 flex-shrink-0 z-10 relative">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white text-left">
              {getPageTitle()}
            </h1>
            <div className="absolute right-4 lg:right-8 flex items-center gap-4">
              {location.pathname === '/properties' && canManageProperties && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-add-property'))}
                  className="flex items-center gap-2 p-2 lg:px-4 lg:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg shadow-green-500/20"
                >
                  <span className="hidden lg:inline">Add Property</span>
                </button>
              )}
              {location.pathname === '/dashboard' && <NotificationDropdown />}
            </div>
          </header>
        )}

        {/* Page content */}
        <div
          className={`flex-1 overflow-y-auto ${suppressHeader ? 'p-0' : 'p-4 lg:p-8'}`}
          style={{ scrollbarGutter: 'stable' }}
        >
          {children || <Outlet />}
        </div>
      </main>

      {/* Logout modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
      />

      {/* Staff toolbelt — always present for caretakers */}
      <StaffToolbelt user={user} />
    </div>
  );
}
