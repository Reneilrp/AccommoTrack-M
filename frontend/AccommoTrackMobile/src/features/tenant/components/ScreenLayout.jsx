import React from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import homeStyles from '../../../styles/Tenant/HomePage.js';
export default function ScreenLayout({ children, contentContainerStyle }) {
  const { width: viewportWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const contentWrapStyle = React.useMemo(
    () => (viewportWidth >= 768 ? { width: '100%', maxWidth: 980, alignSelf: 'center' } : null),
    [viewportWidth],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={homeStyles.flex1}>
        <ScrollView
          contentContainerStyle={[homeStyles.contentContainerPadding, contentWrapStyle, { paddingBottom: (homeStyles.contentContainerPadding?.paddingBottom || 24) + insets.bottom }, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}
