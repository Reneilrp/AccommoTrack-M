import React from 'react';
import { View } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

export default function Card({ children, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: COLORS.cardBg,
          padding: SPACING.md,
          borderRadius: 10,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
