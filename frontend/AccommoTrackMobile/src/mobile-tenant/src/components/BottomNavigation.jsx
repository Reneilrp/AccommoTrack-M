import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useNavigationState } from '@react-navigation/native';
import { styles } from '../../../styles/Tenant/HomePage.js';

export default function BottomNavigation({ activeTab: propActiveTab, onTabPress, isGuest, onAuthRequired }) {
  const navigation = useNavigation();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Get the current route name to determine active tab
  const currentRouteName = useNavigationState((state) => {
    if (!state || !state.routes || state.routes.length === 0) return 'TenantHome';
    return state.routes[state.index]?.name || 'TenantHome';
  });

  // Map route names to tab names
  const getActiveTabFromRoute = (routeName) => {
    switch (routeName) {
      case 'TenantHome':
        return 'home';
      case 'Messages':
        return 'messages';
      case 'Settings':
        return 'settings';
      default:
        return propActiveTab || 'home';
    }
  };

  // Use route-based active tab instead of prop-based
  const activeTab = getActiveTabFromRoute(currentRouteName);

  const handleTabPress = (tab) => {
    // Prevent multiple rapid clicks
    if (isNavigating) return;

    // Don't navigate if already on the same tab
    if (activeTab === tab) return;

    // Only restrict messages for guests, allow settings
    if (isGuest && tab === 'messages') {
      if (onAuthRequired) {
        onAuthRequired();
      }
      return;
    }
    
    if (onTabPress) {
      onTabPress(tab);
    }
    
    setIsNavigating(true);
    
    // Navigate immediately
    switch(tab) {
      case 'home':
        navigation.navigate('TenantHome');
        break;
      case 'messages':
        navigation.navigate('Messages');
        break;
      case 'settings':
        navigation.navigate('Settings');
        break;
      default:
        break;
    }
    
    // Reset navigating state after a short delay
    setTimeout(() => {
      setIsNavigating(false);
    }, 300);
  };

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('home')}
        disabled={isNavigating}
      >
        <Ionicons
          name={activeTab === 'home' ? 'home' : 'home-outline'}
          size={24}
          color={activeTab === 'home' ? '#FDD835' : 'white'}
        />
        {activeTab === 'home' && <View style={styles.activeIndicator} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('messages')}
        disabled={isNavigating}
      >
        <Ionicons
          name={activeTab === 'messages' ? 'chatbubble' : 'chatbubble-outline'}
          size={24}
          color={activeTab === 'messages' ? '#FDD835' : 'white'}
        />
        {activeTab === 'messages' && <View style={styles.activeIndicator} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('settings')}
        disabled={isNavigating}
      >
        <Ionicons
          name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
          size={24}
          color={activeTab === 'settings' ? '#FDD835' : 'white'}
        />
        {activeTab === 'settings' && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    </View>
  );
}