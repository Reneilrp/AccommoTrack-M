import React from 'react';
import { Animated, View } from 'react-native';
// Global Header removed — screens should use TopNavigation when needed
import BottomNavigation from '../components/BottomNavigation.jsx';
import Header from '../components/Header.jsx';
import CartIcon from '../components/CartIcon.jsx';
import { navigationRef, addNavigationStateListener, navigate } from '../../../navigation/RootNavigation.js';
import TenantNavigator from './TenantNavigator.jsx';
import { useTheme } from '../../../contexts/ThemeContext.jsx';

export default function TenantLayout({ onLogout, isGuest = false, onAuthRequired }) {
  const { theme } = useTheme();
  const [headerMeasuredHeight, setHeaderMeasuredHeight] = React.useState(0);
  const headerVisibility = React.useRef(new Animated.Value(1)).current;

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
        // Ignore MenuModal (drawer) so the header title and icons stay fixed to the screen beneath
        if (target.name === 'MenuModal') return;

        setActiveRouteName(target.name);
        setActiveRouteParams(target.params || {});
      } else {
        // If we only have a state object, drill down to find the deepest name
        const deepestName = getDeepest(navigationRef.isReady() && navigationRef.getRootState ? navigationRef.getRootState() : route);
        
        // Ignore MenuModal here too
        if (deepestName === 'MenuModal') return;

        setActiveRouteName(deepestName);
        setActiveRouteParams({});
      }
    });
    return unsubscribe;
  }, []);

  // Hide header/bottom nav on routes that implement their own header/navigation
  const hideHeaderRoutes = new Set([
    'Profile',
    'MyWallet',
    'PreferencesLifestyle',
    'VerificationStatus',
    'UpdatePassword',
    'NotificationPreferences',
    'HelpSupport',
    'AccommodationDetails',
    'RoomsList',
    'RoomDetails',
    'Chat',
    'CreateMaintenanceRequest',
    'Addons',
    'BookingDetails',
    'ReportProperty',
    'LeaveReview',
    'MyReviews',
    'PaymentDetail',
    'PaymentHistory',
    'Notifications',
    'Messages',
    'Cart'
  ]);

  const hideBottomRoutes = new Set([
    'Profile',
    'PreferencesLifestyle',
    'VerificationStatus',
    'UpdatePassword',
    'NotificationPreferences',
    'HelpSupport',
    'AccommodationDetails',
    'RoomsList',
    'RoomDetails',
    'Chat',
    'CreateMaintenanceRequest',
    'Addons',
    'BookingDetails',
    'ReportProperty',
    'LeaveReview',
    'MyReviews',
    'PaymentDetail',
    'PaymentHistory',
    'Notifications',
    'Cart'
  ]);

  // Also respect explicit route param hideLayout=true
  const liveCurrentRoute = navigationRef?.isReady() && navigationRef.getCurrentRoute
    ? navigationRef.getCurrentRoute()
    : null;
  
  // Ignore MenuModal (drawer) in live route tracking to keep header state consistent with the underlying screen
  const filteredLiveRoute = liveCurrentRoute?.name !== 'MenuModal' ? liveCurrentRoute : null;
  
  const effectiveRouteName = filteredLiveRoute?.name || activeRouteName;
  const effectiveRouteParams =
    filteredLiveRoute?.name === effectiveRouteName
      ? (filteredLiveRoute?.params || activeRouteParams || {})
      : (activeRouteParams || {});

  const hideLayoutParam = effectiveRouteParams?.hideLayout === true;
  const hideLayoutChromeParam = effectiveRouteParams?.hideLayoutChrome === true;
  const hideTopHeaderParam = effectiveRouteName === 'TenantHome' && effectiveRouteParams?.hideTopHeader === true;

  // Defensive: treat any route name containing "detail", "chat", "maintenance", or "addon" (case-insensitive)
  // as a full-screen route to ensure layout elements are hidden.
  const isFullScreenRoute = typeof effectiveRouteName === 'string' && /(detail|chat|maintenance|addon)/i.test(effectiveRouteName);

  const canShowHeader = !hideHeaderRoutes.has(effectiveRouteName) && !hideLayoutParam && !hideLayoutChromeParam && !isFullScreenRoute;
  const animateHeaderVisibility = effectiveRouteName === 'TenantHome' && canShowHeader;
  const showHeader = canShowHeader && (!animateHeaderVisibility || !hideTopHeaderParam);
  const showBottom = !hideBottomRoutes.has(effectiveRouteName) && !hideLayoutParam && !hideLayoutChromeParam && !isFullScreenRoute;

  React.useEffect(() => {
    if (!canShowHeader) {
      headerVisibility.setValue(0);
      return;
    }

    if (!animateHeaderVisibility) {
      headerVisibility.setValue(1);
      return;
    }

    Animated.timing(headerVisibility, {
      toValue: hideTopHeaderParam ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [animateHeaderVisibility, canShowHeader, headerVisibility, hideTopHeaderParam]);

  // Compute a friendly title for the header based on route params or name
  const title = React.useMemo(() => {
    const nameMap = {
      TenantHome: 'Explore',
      Dashboard: 'Dashboard',
      MyBookings: 'My Bookings',
      Messages: 'Messages',
      Payments: 'Billing & Payments',
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
      console.log('[TenantLayout] activeRouteName=', activeRouteName, 'activeRouteParams=', activeRouteParams, 'showBottom=', showBottom);
    } catch {
      // ignore
    }
  }, [activeRouteName, activeRouteParams, showBottom]);

  // Determine header right button icon and action
  const isProfileRoute = effectiveRouteName === 'TenantHome' || effectiveRouteName === 'Messages';
  const isPaymentsRoute = effectiveRouteName === 'Payments';
  const isDashboardRoute = effectiveRouteName === 'Dashboard';
  const showRightHeaderIcon = isPaymentsRoute || isDashboardRoute;
  const rightHeaderIcon = isPaymentsRoute
    ? 'time-outline'
    : isDashboardRoute
      ? 'notifications-outline'
      : null;

  const handleRightPress = React.useCallback(() => {
    if (isPaymentsRoute) {
      if (isGuest) {
        onAuthRequired?.();
      } else {
        navigate('PaymentHistory');
      }
    } else if (isDashboardRoute) {
      // Dashboard shortcut to notifications
      if (isGuest) {
        onAuthRequired?.();
      } else {
        navigate('Notifications');
      }
    }
  }, [isGuest, onAuthRequired, isPaymentsRoute, isDashboardRoute]);

  // Build custom right actions for header (book icon + contextual shortcuts)
  const rightActions = React.useMemo(() => {
    const actions = [];

    // Add cart icon for TenantHome and Messages routes
    if (isProfileRoute) {
      actions.push({
        component: <CartIcon isGuest={isGuest} onAuthRequired={onAuthRequired} />,
        key: 'cart',
      });
    }

    // Add contextual icon shortcuts (payments history / notifications)
    if (showRightHeaderIcon) {
      actions.push({
        icon: rightHeaderIcon,
        onPress: handleRightPress,
        size: 28,
        key: 'right-icon',
      });
    }

    return actions;
  }, [isProfileRoute, showRightHeaderIcon, rightHeaderIcon, isGuest, onAuthRequired, handleRightPress]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {canShowHeader && (
        <Animated.View
          style={
            animateHeaderVisibility
              ? {
                height: headerVisibility.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, headerMeasuredHeight || 1],
                }),
                opacity: headerVisibility,
                overflow: 'hidden',
              }
              : undefined
          }
          pointerEvents={showHeader ? 'auto' : 'none'}
        >
          <View
            onLayout={(event) => {
              const nextHeight = event?.nativeEvent?.layout?.height || 0;
              if (nextHeight > 0 && nextHeight !== headerMeasuredHeight) {
                setHeaderMeasuredHeight(nextHeight);
              }
            }}
          >
            <Header
              title={title}
              onMenuPress={() => navigate('MenuModal')}
              rightActions={rightActions}
            />
          </View>
        </Animated.View>
      )}

      <View style={{ flex: 1 }}>
        <TenantNavigator onLogout={onLogout} isGuest={isGuest} onAuthRequired={onAuthRequired} />
      </View>

      {showBottom && (
        <View style={{ backgroundColor: theme.colors.surface }}>
          <BottomNavigation isGuest={isGuest} onAuthRequired={onAuthRequired} currentRouteName={activeRouteName} />
        </View>
      )}
    </View>
  );
}
