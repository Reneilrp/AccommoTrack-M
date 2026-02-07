import React from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MenuDrawer from '../../components/MenuDrawer.jsx';
import { useTheme } from '../../../../contexts/ThemeContext';

export default function TenantMenuModal({ isGuest = false, onAuthRequired, onLogout }) {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();

  const handleClose = () => {
    navigation.goBack();
  };

  const handleMenuItemPress = (title) => {
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
      case 'Notifications':
        navigation.navigate('Notifications');
        break;
      case 'Payments':
        navigation.navigate('Payments');
        break;
      case 'Settings':
        navigation.navigate('Settings');
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
