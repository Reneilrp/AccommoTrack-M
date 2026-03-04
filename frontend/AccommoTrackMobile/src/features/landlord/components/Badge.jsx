import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext.jsx';

export default function Badge({ children, style, color }) {
  const { theme } = useTheme();
  const backgroundColor = color || theme.colors.primary;

  return (
    <View
      style={[
        {
          backgroundColor,
          paddingVertical: 4,
          paddingHorizontal: 8,
          borderRadius: 999,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ color: '#fff', fontSize: 12 }}>{children}</Text>
    </View>
  );
}
