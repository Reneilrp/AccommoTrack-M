import React from 'react';
import { View, Text } from 'react-native';
import { COLORS, SPACING, TYPO } from '../constants/theme';

export default function Badge({ children, style, color = COLORS.accent }) {
  return (
    <View
      style={[
        {
          backgroundColor: color,
          paddingVertical: SPACING.xs,
          paddingHorizontal: SPACING.sm,
          borderRadius: 999,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ color: '#fff', fontSize: TYPO.small }}>{children}</Text>
    </View>
  );
}
