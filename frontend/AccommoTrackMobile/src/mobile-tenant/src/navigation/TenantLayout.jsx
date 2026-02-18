import React from 'react';
import { View, SafeAreaView } from 'react-native';
// Global Header removed — screens should use TopNavigation when needed
import BottomNavigation from '../components/BottomNavigation.jsx';
import Header from '../components/Header.jsx';
import { navigationRef, addNavigationStateListener } from '../../../navigation/RootNavigation';
import TenantNavigator from './TenantNavigator.jsx';
import { navigate } from '../../../navigation/RootNavigation';
import { useTheme } from '../../../contexts/ThemeContext';

export default function TenantLayout({ onLogout, isGuest = false, onAuthRequired }) {
  const { theme } = useTheme();

  const [activeRouteName, setActiveRouteName] = React.useState(() => {
    // Prefer the full root state so we can descend into nested navigators reliably
    const root = navigationRef?.isReady() ? navigationRef.getRootState ? navigationRef.getRootState() : null : null;
    const startRoute = root || (navigationRef?.isReady() ? navigationRef.getCurrentRoute() : null);

    const getDeepest = (route) => {
      if (!route) return null;
      let r = route;
      while (r.state && typeof r.state.index === 'number') {
        const idx = r.state.index;
        r = r.state.routes && r.state.routes[idx] ? r.state.routes[idx] : r;
      }
      return r?.name || null;
    };

    return getDeepest(startRoute);
  });
  const [activeRouteParams, setActiveRouteParams] = React.useState({});

  React.useEffect(() => {
    // Register listener to update active route when navigation state changes
    const getDeepest = (route) => {
      if (!route) return null;
      let r = route;
      while (r.state && typeof r.state.index === 'number') {
        const idx = r.state.index;
        r = r.state.routes && r.state.routes[idx] ? r.state.routes[idx] : r;
      }
      return r?.name || null;
    };

    const unsubscribe = addNavigationStateListener((route) => {
      // Prefer navigationRef.getCurrentRoute() for the most up-to-date deepest route
      const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute() : null;
      
      // Fallback to the route object passed to the listener if it looks like a route (has a name)
      const target = currentRoute || (route && typeof route === 'object' && route.name ? route : null);

      if (target) {
        setActiveRouteName(target.name);
        setActiveRouteParams(target.params || {});
      } else {
        // If we only have a state object, drill down to find the deepest name
        const deepestName = getDeepest(navigationRef.isReady() && navigationRef.getRootState ? navigationRef.getRootState() : route);
        setActiveRouteName(deepestName);
        setActiveRouteParams({});
      }
    });
    return unsubscribe;
  }, []);

  // Hide header/bottom nav on routes that implement their own header/navigation
  const hideHeaderRoutes = new Set(['Settings','Profile', 'UpdatePassword', 'NotificationPreferences', 'HelpSupport', 'AccommodationDetails', 'RoomsList', 'RoomDetails', 'Chat', 'CreateMaintenanceRequest', 'Addons', 'BookingDetails']);
  const hideBottomRoutes = new Set(['Profile', 'UpdatePassword', 'NotificationPreferences', 'HelpSupport', 'AccommodationDetails', 'RoomsList', 'RoomDetails', 'Chat', 'CreateMaintenanceRequest', 'Addons', 'BookingDetails']);
  
  // Also respect explicit route param hideLayout=true
  const hideLayoutParam = activeRouteParams?.hideLayout === true;

  // Defensive: treat any route name containing "detail", "chat", "maintenance", or "addon" (case-insensitive)
  // as a full-screen route to ensure layout elements are hidden.
  const isFullScreenRoute = typeof activeRouteName === 'string' && /(detail|chat|maintenance|addon)/i.test(activeRouteName);
  
  const showHeader = !hideHeaderRoutes.has(activeRouteName) && !hideLayoutParam && !isFullScreenRoute;
  const showBottom = !hideBottomRoutes.has(activeRouteName) && !hideLayoutParam && !isFullScreenRoute;

  // Compute a friendly title for the header based on route params or name
  const title = React.useMemo(() => {
    const nameMap = {
      TenantHome: 'Explore',
      Dashboard: 'Dashboard',
      MyBookings: 'My Bookings',
      Messages: 'Messages',
      Favorites: 'Favorites',
      Payments: 'Payments',
      Settings: 'Settings',
    };

    // Prefer explicit layoutTitle passed by screens
    if (activeRouteParams?.layoutTitle) return activeRouteParams.layoutTitle;
    if (activeRouteParams?.title) return activeRouteParams.title;
    if (activeRouteParams?.accommodation?.title) return activeRouteParams.accommodation.title;
    if (activeRouteParams?.property?.title) return activeRouteParams.property.title;
    if (activeRouteParams?.room?.title) return activeRouteParams.room.title;

    // If activeRouteName is not yet available, attempt to read the current route directly
    const currentRoute = navigationRef?.isReady() && navigationRef.getCurrentRoute ? navigationRef.getCurrentRoute() : null;
    if (currentRoute) {
      const rp = currentRoute.params || {};
      if (rp?.layoutTitle) return rp.layoutTitle;
      if (rp?.title) return rp.title;
      if (rp?.accommodation?.title) return rp.accommodation.title;
      if (rp?.property?.title) return rp.property.title;
      if (rp?.room?.title) return rp.room.title;
      if (currentRoute.name && nameMap[currentRoute.name]) return nameMap[currentRoute.name];
      if (typeof currentRoute.name === 'string') return currentRoute.name.replace(/([A-Z])/g, ' $1').trim();
    }

    if (activeRouteName && nameMap[activeRouteName]) return nameMap[activeRouteName];

    if (typeof activeRouteName === 'string') {
      // Split camelCase/PascalCase route names into words
      return activeRouteName.replace(/([A-Z])/g, ' $1').trim();
    }

    return 'AccommoTrack';
  }, [activeRouteName, activeRouteParams]);

  // Debug logging for navigation state (keep only route logging)
  React.useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log('[TenantLayout] activeRouteName=', activeRouteName, 'activeRouteParams=', activeRouteParams, 'showBottom=', showBottom);
    } catch (err) {
      // ignore
    }
  }, [activeRouteName, activeRouteParams, showBottom]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {showHeader && (
        <Header
          title={title}
          onMenuPress={() => navigate('MenuModal')}
          onProfilePress={() => {
            if (isGuest) {
              onAuthRequired?.();
            } else {
              navigate('Profile');
            }
          }}
        />
      )}

      <View style={{ flex: 1 }}>
        <TenantNavigator onLogout={onLogout} isGuest={isGuest} onAuthRequired={onAuthRequired} />
      </View>

      {showBottom && (
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: theme.colors.surface }}>
          <BottomNavigation isGuest={isGuest} onAuthRequired={onAuthRequired} currentRouteName={activeRouteName} />
        </SafeAreaView>
      )}
    </View>
  );
}
