import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, TYPO } from '../../../../styles/Landlord/theme';

export default function Button({ children, onPress, style, disabled, loading, type = 'primary' }) {
  const bg = type === 'primary' ? COLORS.primary : 'transparent';
  const color = type === 'primary' ? '#fff' : COLORS.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: bg,
          paddingVertical: SPACING.sm,
          paddingHorizontal: SPACING.md,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={{ color, fontSize: TYPO.body }}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}
