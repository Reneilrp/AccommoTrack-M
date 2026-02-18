import React from 'react';
import { View, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MenuDrawer from '../../components/MenuDrawer.jsx';
import { useTheme } from '../../../../contexts/ThemeContext';
import homeStyles from '../../../../styles/Tenant/HomePage.js';

export default function TenantMenuModal({ isGuest = false, onAuthRequired, onLogout }) {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();

  const handleClose = () => {
    navigation.goBack();
  };

  const handleMenuItemPress = (title) => {
    // If guest, protect certain routes and prompt to sign in
    // Note: Most protected items are hidden from the menu for guests, but this is a safety check
    const protectedItems = ['Dashboard', 'My Bookings', 'Favorites', 'Payments', 'Notifications'];
    if (isGuest && protectedItems.includes(title)) {
      navigation.goBack();
      if (onAuthRequired) {
        onAuthRequired();
      }
      return;
    }

    // Close modal first
    navigation.goBack();

    // Navigate based on selection
    switch (title) {
      case 'Dashboard':
        navigation.navigate('Dashboard');
        break;
      case 'My Bookings':
        navigation.navigate('MyBookings');
        break;
      case 'My Maintenance Requests':
        navigation.navigate('MyMaintenanceRequests');
        break;
      case 'My Addon Requests':
        // Open addons screen which now shows tenant requests at top
        navigation.navigate('Addons');
        break;
      case 'Notifications':
        navigation.navigate('Notifications');
        break;
      case 'Payments':
        navigation.navigate('Payments');
        break;
      case 'Settings':
        navigation.navigate('Main', { screen: 'Settings' });
        break;
      case 'Future UI Demo':
        navigation.navigate('DemoUI');
        break;
      case 'Help & Support':
        navigation.navigate('HelpSupport');
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
