import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import homeStyles from '../../../styles/Tenant/HomePage.js';
export default function ScreenLayout({ children, contentContainerStyle }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={homeStyles.flex1}>
        <ScrollView
          contentContainerStyle={[homeStyles.contentContainerPadding, { paddingBottom: (homeStyles.contentContainerPadding?.paddingBottom || 24) + insets.bottom }, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}
