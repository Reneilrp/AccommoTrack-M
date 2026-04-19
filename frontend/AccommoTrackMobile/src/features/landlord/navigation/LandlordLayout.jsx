import React from 'react';
import { View } from 'react-native';
import { navigationRef, addNavigationStateListener } from '../../../navigation/RootNavigation.js';
import LandlordNavigator from './LandlordNavigator.jsx';
// eslint-disable-next-line no-unused-vars
import Header from '../components/Header.jsx';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import StaffToolbelt from '../../../components/StaffToolbelt.jsx';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { landlordQueryKeys } from '../hooks/useLandlordQueryHelpers.js';

export default function LandlordLayout({ onLogout }) {
  const { theme } = useTheme();

  const [activeRouteName, setActiveRouteName] = React.useState(() => {
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

  const userQuery = useQuery({
    queryKey: landlordQueryKeys.messagesCurrentUserId(), // Reusing to just get user info quickly
    queryFn: async () => {
        try {
            const stored = await AsyncStorage.getItem('user');
            if (!stored) return null;
            return JSON.parse(stored);
        } catch (_e) {
            return null;
        }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const isCaretaker = userQuery.data?.role === 'caretaker';

  React.useEffect(() => {
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
      const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute() : null;
      const target = currentRoute || (route && typeof route === 'object' && route.name ? route : null);

      if (target) {
        setActiveRouteName(target.name);
        setActiveRouteParams(target.params || {});
      } else {
        const deepestName = getDeepest(navigationRef.isReady() && navigationRef.getRootState ? navigationRef.getRootState() : route);
        setActiveRouteName(deepestName);
        setActiveRouteParams({});
      }
    });
    return unsubscribe;
  }, []);

  const hideHeaderRoutes = new Set(['MyProfile', 'Settings', 'AddProperty', 'PropertySummary', 'Chat', 'DevTeam']);
  
  const showHeader = !hideHeaderRoutes.has(activeRouteName); // eslint-disable-line no-unused-vars

  const title = React.useMemo(() => { // eslint-disable-line no-unused-vars
    const nameMap = {
      Home: 'Dashboard',
      Properties: 'My Properties',
      Bookings: 'Bookings',
      Messages: 'Messages',
      Settings: 'Settings',
      Analytics: 'Analytics',
      Tenants: 'Tenants',
      RoomManagement: 'Rooms',
      Notifications: 'Notifications',
      Payments: 'Payments',
      MaintenanceRequests: 'Maintenance',
      Reviews: 'Reviews',
      Caretakers: 'Caretakers',
    };

    if (activeRouteParams?.layoutTitle) return activeRouteParams.layoutTitle;
    if (activeRouteParams?.title) return activeRouteParams.title;
    
    if (activeRouteName && nameMap[activeRouteName]) return nameMap[activeRouteName];

    if (typeof activeRouteName === 'string') {
      return activeRouteName.replace(/([A-Z])/g, ' $1').trim();
    }

    return 'AccommoTrack';
  }, [activeRouteName, activeRouteParams]);



  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      

      <View style={{ flex: 1 }}>
        <LandlordNavigator onLogout={onLogout} />
      </View>
      
      {isCaretaker && <StaffToolbelt />}
    </View>
  );
}
