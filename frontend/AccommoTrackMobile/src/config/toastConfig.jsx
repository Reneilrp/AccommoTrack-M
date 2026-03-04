import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseToast, ErrorToast } from 'react-native-toast-message';

const themedToastConfig = (theme) => ({
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: theme.colors.success }}
      contentContainerStyle={{ paddingHorizontal: 15, backgroundColor: theme.colors.surface }}
      text1Style={{
        fontSize: 15,
        fontWeight: '400',
        color: theme.colors.text,
      }}
      text2Style={{
        fontSize: 13,
        color: theme.colors.textSecondary,
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: theme.colors.error }}
      contentContainerStyle={{ paddingHorizontal: 15, backgroundColor: theme.colors.surface }}
      text1Style={{
        fontSize: 15,
        fontWeight: '400',
        color: theme.colors.text,
      }}
      text2Style={{
        fontSize: 13,
        color: theme.colors.textSecondary,
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: theme.colors.info }}
      contentContainerStyle={{ paddingHorizontal: 15, backgroundColor: theme.colors.surface }}
      text1Style={{
        fontSize: 15,
        fontWeight: '400',
        color: theme.colors.text,
      }}
      text2Style={{
        fontSize: 13,
        color: theme.colors.textSecondary,
      }}
    />
  ),
  warning: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: theme.colors.warning }}
      contentContainerStyle={{ paddingHorizontal: 15, backgroundColor: theme.colors.surface }}
      text1Style={{
        fontSize: 15,
        fontWeight: '400',
        color: theme.colors.text,
      }}
      text2Style={{
        fontSize: 13,
        color: theme.colors.textSecondary,
      }}
    />
  ),
});

export const getToastConfig = (theme) => {
  return themedToastConfig(theme);
};
