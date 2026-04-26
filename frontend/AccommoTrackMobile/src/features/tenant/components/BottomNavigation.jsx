import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// eslint-disable-next-line no-unused-vars
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef, navigate as rootNavigate } from '../../../navigation/RootNavigation.js';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import { getStyles } from '../../../styles/Tenant/HomePage.js';
import { useAuthStore } from '../../../stores/auth/authStore.js';
import { useUserCounters } from '../hooks/useTenantQueryHelpers.js';

export default function BottomNavigation({ activeTab: propActiveTab, onTabPress, isGuest, onAuthRequired, currentRouteName: propRouteName }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [isNavigating, setIsNavigating] = useState(false);
  
  const userId = useAuthStore((state) => state.userId);
  const { data: counters } = useUserCounters(!!userId);

  // Determine current route name. Prefer propRouteName (provided by layout),
  // otherwise fall back to navigationRef (safe outside navigator hooks).
  let currentRouteName = propRouteName;
  if (!currentRouteName) {
    try {
      const r = navigationRef.isReady() ? navigationRef.getCurrentRoute() : null;
      const getDeepest = (route) => {
        if (!route) return null;
        let rr = route;
        while (rr.state && typeof rr.state.index === 'number') {
          const idx = rr.state.index;
          rr = rr.state.routes && rr.state.routes[idx] ? rr.state.routes[idx] : rr;
        }
        return rr?.name || null;
      };
      currentRouteName = getDeepest(r) || 'TenantHome';
    } catch (_e) {
      currentRouteName = 'TenantHome';
    }
  }

  const tabs = [
    { id: 'Explore', icon: 'search', label: 'Explore', route: 'TenantHome' },
    { id: 'Dashboard', icon: 'grid', label: 'Dashboard', route: 'Dashboard', countKey: 'maintenance' },
    { id: 'Bookings', icon: 'calendar', label: 'My Bookings', route: 'MyBookings' },
    { id: 'Messages', icon: 'chatbubbles', label: 'Messages', route: 'Messages', countKey: 'messages' },
    { id: 'Settings', icon: 'settings', label: 'Settings', route: 'Settings' },
  ];

  const renderBadge = (count) => {
    if (!count || count <= 0) return null;
    return (
      <View style={{
        position: 'absolute',
        right: -6,
        top: -3,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: theme.colors.surface,
      }}>
        <Text style={{
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: '700',
        }}>
          {count > 99 ? '99+' : count}
        </Text>
      </View>
    );
  };

  const getActiveTabFromRoute = (routeName) => {
    switch (routeName) {
      case 'Dashboard':
        return 'Dashboard';
      case 'MyBookings':
      case 'BookingDetails':
        return 'Bookings';
      case 'TenantHome':
        return 'Explore';
      case 'Messages':
        return 'Messages';
      case 'Settings':
        return 'Settings';
      default:
        return propActiveTab || 'Explore';
    }
  };

  const activeTab = getActiveTabFromRoute(currentRouteName);

  const handleTabPress = (tab) => {
    if (isNavigating) return;
    if (activeTab === tab.id) return;

    if (isGuest) {
      if (tab.id === 'Dashboard' || tab.id === 'Bookings' || tab.id === 'Messages') {
        if (onAuthRequired) onAuthRequired();
        return;
      }
    }

    if (onTabPress) onTabPress(tab.id);

    setIsNavigating(true);
    // Use rootNavigate to reach screens regardless of nesting level
    rootNavigate(tab.route);

    setTimeout(() => setIsNavigating(false), 300);
  };

  const fabTab = tabs.find(t => t.id === 'Explore');

  return (
    <View style={[styles.navContainer, { paddingBottom: insets.bottom }]}>
      <View
        style={[
          styles.bottomNav,
          styles.tabButtonContainer,
        ]}
      >
        {/* Render tabs with a center placeholder so FAB has an empty slot */}
        {(() => {
          const nonFab = tabs.filter(t => t.id !== 'Explore');
          const slots = nonFab.length + 1; // +1 for placeholder slot
          const centerIndex = Math.floor(slots / 2);
          const items = [];
          let ni = 0;
          for (let i = 0; i < slots; i++) {
            if (i === centerIndex) {
              // placeholder should not block touches; allow touches to pass through
              items.push(
                <View key="placeholder" style={[styles.tabButton, { height: '100%' }]} pointerEvents="none" />
              );
            } else {
              const tab = nonFab[ni++];
              const isTabActive = activeTab === tab.id;
              items.push(
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabButton, { height: '100%', justifyContent: 'center' }]}
                  onPress={() => handleTabPress(tab)}
                  disabled={isNavigating}
                >
                  <View>
                    <Ionicons
                      name={isTabActive ? tab.icon : `${tab.icon}-outline`}
                      size={24}
                      color={isTabActive ? theme.colors.primary : theme.colors.textTertiary}
                    />
                    {tab.countKey && renderBadge(counters?.[tab.countKey])}
                  </View>
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: isTabActive ? theme.colors.primary : theme.colors.textTertiary,
                        fontWeight: isTabActive ? '600' : '400',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            }
          }
          return items;
        })()}
      </View>

      {/* FAB: absolutely positioned centered above the bottom bar */}
      {fabTab ? (
        // allow touches to pass through this overlay except for its children (the FAB)
        <View 
          pointerEvents="box-none" 
          style={[styles.fabOverlay, { bottom: insets.bottom + 10 }]}
        >
          <TouchableOpacity
            style={[styles.fabButton, { backgroundColor: theme.colors.primary, marginBottom: 0 }]}
            onPress={() => handleTabPress(fabTab)}
            disabled={isNavigating}
          >
            <Ionicons name={activeTab === fabTab.id ? fabTab.icon : `${fabTab.icon}-outline`} size={28} color="#fff" />
          </TouchableOpacity>
          <Text
            style={{
              ...styles.tabLabel,
              color: activeTab === fabTab.id ? theme.colors.primary : theme.colors.textTertiary,
              fontWeight: activeTab === fabTab.id ? '600' : '400',
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            {fabTab.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
