import React from 'react';
import { View, Text } from 'react-native';

export default function ReservationPolicyNotice({
  policy,
  theme,
  marginBottom = 12,
  testID = 'reservation-policy-notice',
}) {
  if (!policy?.message) return null;

  const feeRequired = Boolean(policy?.fee_required);

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: feeRequired
          ? (theme?.isDark ? 'rgba(120,53,15,0.25)' : '#FFF7ED')
          : (theme?.isDark ? 'rgba(20,83,45,0.25)' : '#ECFDF5'),
        borderRadius: 12,
        padding: 12,
        marginBottom,
        borderWidth: 1,
        borderColor: feeRequired
          ? (theme?.isDark ? 'rgba(251,191,36,0.35)' : '#FED7AA')
          : (theme?.isDark ? 'rgba(74,222,128,0.35)' : '#BBF7D0'),
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: feeRequired
            ? (theme?.isDark ? '#FCD34D' : '#9A3412')
            : (theme?.isDark ? '#86EFAC' : '#166534'),
          lineHeight: 18,
        }}
      >
        {policy.message}
      </Text>
    </View>
  );
}