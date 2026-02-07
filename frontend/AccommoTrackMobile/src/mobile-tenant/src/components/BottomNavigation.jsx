import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { styles } from '../../../styles/Tenant/HomePage.js';

export default function BottomNavigation({ activeTab: propActiveTab, onTabPress, isGuest, onAuthRequired }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Get the current route name to determine active tab
  const currentRouteName = useNavigationState((state) => {
    if (!state || !state.routes || state.routes.length === 0) return 'TenantHome';
    return state.routes[state.index]?.name || 'TenantHome';
  });

  // Define tabs array matching demo UI
  const tabs = [
    { id: 'Dashboard', icon: 'grid', label: 'Dashboard', route: 'Dashboard' },
    { id: 'Bookings', icon: 'calendar', label: 'My Booking', route: 'MyBookings' },
    { id: 'Explore', icon: 'search', label: 'Explore', route: 'TenantHome' },
    { id: 'Messages', icon: 'chatbubbles', label: 'Messages', route: 'Messages' },
    { id: 'Settings', icon: 'settings', label: 'Settings', route: 'Settings' },
  ];

  // Map route names to tab IDs
  const getActiveTabFromRoute = (routeName) => {
    switch (routeName) {
      case 'Dashboard':
        return 'Dashboard';
      case 'MyBookings':
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

  // Use route-based active tab instead of prop-based
  const activeTab = getActiveTabFromRoute(currentRouteName);

  const handleTabPress = (tab) => {
    // Prevent multiple rapid clicks
    if (isNavigating) return;

    // Don't navigate if already on the same tab
    if (activeTab === tab.id) return;

    // Check authentication requirements
    if (isGuest) {
      // Dashboard and Bookings require authentication
      if (tab.id === 'Dashboard' || tab.id === 'Bookings') {
        if (onAuthRequired) {
          onAuthRequired();
        }
        return;
      }
      // Messages require authentication
      if (tab.id === 'Messages') {
        if (onAuthRequired) {
          onAuthRequired();
        }
        return;
      }
    }
    
    if (onTabPress) {
      onTabPress(tab.id);
    }
    
    setIsNavigating(true);
    
    // Navigate to the route
    navigation.navigate(tab.route);
    
    // Reset navigating state after a short delay
    setTimeout(() => {
      setIsNavigating(false);
    }, 300);
  };

  return (
    <View style={[styles.bottomNav, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
      {/* Floating menu button to open global MenuDrawer modal */}
      <TouchableOpacity
        onPress={() => navigation.navigate('MenuModal')}
        style={{ position: 'absolute', left: 12, top: -28, zIndex: 999 }}
      >
        <Ionicons name="menu" size={28} color={theme.colors.textTertiary} />
      </TouchableOpacity>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        // Special handling for Explore tab (FAB)
        if (tab.id === 'Explore') {
          return (
            <View key={tab.id} style={styles.fabContainer}>
              <TouchableOpacity
                style={[styles.fabButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleTabPress(tab)}
                disabled={isNavigating}
              >
                <Ionicons
                  name={isActive ? tab.icon : `${tab.icon}-outline`}
                  size={28}
                  color="#fff"
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? theme.colors.primary : theme.colors.textTertiary,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </View>
          );
        }
        
        // Regular tabs
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabButton}
            onPress={() => handleTabPress(tab)}
            disabled={isNavigating}
          >
            <Ionicons
              name={isActive ? tab.icon : `${tab.icon}-outline`}
              size={24}
              color={isActive ? theme.colors.primary : theme.colors.textTertiary}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? theme.colors.primary : theme.colors.textTertiary,
                  fontWeight: isActive ? '600' : '400',
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}