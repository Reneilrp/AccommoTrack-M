import React from 'react';
import { View, SafeAreaView } from 'react-native';
import Header from '../components/Header.jsx';
import BottomNavigation from '../components/BottomNavigation.jsx';
import TenantNavigator from './TenantNavigator.jsx';
import { navigate } from '../../../navigation/RootNavigation';
import { useTheme } from '../../../contexts/ThemeContext';

export default function TenantShell({ onLogout, isGuest = false, onAuthRequired }) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Header onMenuPress={() => navigate('MenuModal')} onProfilePress={() => navigate('Profile')} isGuest={isGuest} />

      <View style={{ flex: 1 }}>
        <TenantNavigator onLogout={onLogout} isGuest={isGuest} onAuthRequired={onAuthRequired} />
      </View>

      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: theme.colors.surface }}>
        <BottomNavigation isGuest={isGuest} onAuthRequired={onAuthRequired} />
      </SafeAreaView>
    </View>
  );
}
