import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext.jsx';

export default function Button({ children, onPress, style, disabled, loading, type = 'primary' }) {
  const { theme } = useTheme();
  const bg = type === 'primary' ? theme.colors.primary : 'transparent';
  const color = type === 'primary' ? theme.colors.textInverse : theme.colors.primary;

  // Check if children is a string or needs to be wrapped in Text
  const isTextChild = typeof children === 'string';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: bg,
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : isTextChild ? (
        <Text style={{ color, fontSize: 14 }}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
