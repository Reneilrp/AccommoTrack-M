import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from './Header.jsx';
import BottomNavigation from './BottomNavigation.jsx';
import { useTheme } from '../../../contexts/ThemeContext';
import homeStyles from '../../../styles/Tenant/HomePage.js';

export default function ScreenLayout({ children, contentContainerStyle, onMenuPress, onProfilePress, isGuest, onAuthRequired }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Header onMenuPress={onMenuPress} onProfilePress={onProfilePress} isGuest={isGuest} />

      <View style={homeStyles.flex1}>
        <ScrollView
          contentContainerStyle={[homeStyles.contentContainerPadding, { paddingBottom: (homeStyles.contentContainerPadding?.paddingBottom || 24) + insets.bottom }, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>

      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: theme.colors.surface }}>
        <BottomNavigation isGuest={isGuest} onAuthRequired={onAuthRequired} />
      </SafeAreaView>
    </View>
  );
}
