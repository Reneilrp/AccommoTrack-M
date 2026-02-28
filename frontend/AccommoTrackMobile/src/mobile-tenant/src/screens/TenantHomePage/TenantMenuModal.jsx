import React from 'react';
import { View, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MenuDrawer from '../../components/MenuDrawer.jsx';
import { useTheme } from '../../../../contexts/ThemeContext';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import { navigate as rootNavigate } from '../../../../navigation/RootNavigation';

export default function TenantMenuModal({ isGuest = false, onAuthRequired, onLogout }) {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();

  const handleClose = () => {
    navigation.goBack();
  };

  const handleMenuItemPress = (title) => {
    // If guest, protect certain routes and prompt to sign in
    const protectedItems = [
      'Dashboard', 
      'My Bookings', 
      'Favorites', 
      'Payments', 
      'Notifications', 
      'Service Requests'
    ];
    
    if (isGuest && protectedItems.includes(title)) {
      navigation.goBack();
      if (onAuthRequired) {
        onAuthRequired();
      }
      return;
    }

    // Close modal first
    navigation.goBack();

    // Use rootNavigate to reach screens regardless of nesting level
    switch (title) {
      case 'Dashboard':
        rootNavigate('Dashboard');
        break;
      case 'My Bookings':
        rootNavigate('MyBookings');
        break;
      case 'Service Requests':
        rootNavigate('ServiceRequests');
        break;
      case 'Notifications':
        rootNavigate('Notifications');
        break;
      case 'Payments':
        rootNavigate('Payments');
        break;
      case 'Settings':
        rootNavigate('Settings');
        break;
      case 'Future UI Demo':
        rootNavigate('DemoUI');
        break;
      case 'Help & Support':
        rootNavigate('HelpSupport');
        break;
      case 'Logout':
        if (onLogout) onLogout();
        break;
      default:
        break;
    }
  };

  return (
    <View style={homeStyles.flex1}>
      <MenuDrawer
        visible={true}
        onClose={handleClose}
        onMenuItemPress={handleMenuItemPress}
        isGuest={isGuest}
      />
    </View>
  );
}
