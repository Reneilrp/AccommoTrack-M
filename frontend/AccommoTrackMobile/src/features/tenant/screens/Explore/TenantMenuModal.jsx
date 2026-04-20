import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MenuDrawer from '../../components/MenuDrawer.jsx';
import { navigate as rootNavigate } from '../../../../navigation/RootNavigation.js';

export default function TenantMenuModal({ isGuest = false, onAuthRequired, onLogout }) {
  const navigation = useNavigation();

  const handleClose = () => {
    navigation.goBack();
  };

  const handleMenuItemPress = (title) => {
    // If guest, protect certain routes and prompt to sign in
    const protectedItems = [
      'Dashboard',
      'My Bookings',
      'Billing & Payments',
      'Notifications',
      'Maintenance & Add-ons',
      // Backward compatibility for stale menu labels.
      'Payments',
      'Service Requests',
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
      case 'Maintenance & Add-ons':
      case 'Service Requests':
        rootNavigate('ServiceRequests');
        break;
      case 'Notifications':
        rootNavigate('Notifications');
        break;
      case 'Billing & Payments':
      case 'Payments':
        rootNavigate('Payments');
        break;
      case 'Settings':
        rootNavigate('Settings');
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
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <MenuDrawer
        visible={true}
        onClose={handleClose}
        onMenuItemPress={handleMenuItemPress}
        isGuest={isGuest}
      />
    </View>
  );
}
