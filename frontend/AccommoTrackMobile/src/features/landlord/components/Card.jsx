import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext.jsx';

export default function Card({ children, style }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          padding: 16,
          borderRadius: 10,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
