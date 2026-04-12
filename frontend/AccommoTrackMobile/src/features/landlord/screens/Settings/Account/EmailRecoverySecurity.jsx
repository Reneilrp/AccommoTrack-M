import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../../../contexts/ThemeContext.jsx';
import ProfileService from '../../../../../services/ProfileService.js';

const parseEmailRecoveryState = (user) => {
  const security = user?.preferences?.security;
  if (!security || typeof security !== 'object') {
    return { enabled: false, verifiedAt: null };
  }

  return {
    enabled: Boolean(security.emailRecoveryEnabled),
    verifiedAt: security.emailRecoveryVerifiedAt || null,
  };
};

export default function EmailRecoverySecurity({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshingState, setRefreshingState] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [emailRecoveryState, setEmailRecoveryState] = useState({
    enabled: false,
    verifiedAt: null,
  });

  const hydrateCurrentUser = useCallback(async () => {
    setRefreshingState(true);
    try {
      const currentUserRes = await ProfileService.getCurrentUser();
      if (!currentUserRes.success || !currentUserRes.data) {
        return;
      }

      const nextUser = currentUserRes.data;
      setEmailRecoveryState(parseEmailRecoveryState(nextUser));

      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        await AsyncStorage.setItem('user', JSON.stringify({ ...parsed, ...nextUser }));
      }
    } catch (_error) {
      // No-op; screen still renders from previous state.
    } finally {
      setLoading(false);
      setRefreshingState(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      hydrateCurrentUser();
    }, [hydrateCurrentUser])
  );

  const applyUserUpdate = useCallback(async (nextUser) => {
    if (!nextUser) return;

    setEmailRecoveryState(parseEmailRecoveryState(nextUser));

    const stored = await AsyncStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      await AsyncStorage.setItem('user', JSON.stringify({ ...parsed, ...nextUser }));
    }
  }, []);

  const handleEnableAndSendOtp = async () => {
    setActionLoading(true);
    try {
      const res = await ProfileService.sendLandlordEmailRecoveryOtp();
      if (!res.success) {
        Alert.alert('Error', res.error || 'Failed to send verification code.');
        return;
      }

      await applyUserUpdate(res.data);
      Alert.alert('Success', res.message || 'Verification code sent to your email address.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const normalizedCode = (otpCode || '').trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      Alert.alert('Validation', 'Please enter the 6-digit verification code.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await ProfileService.verifyLandlordEmailRecoveryOtp(normalizedCode);
      if (!res.success) {
        Alert.alert('Error', res.error || 'Failed to verify code.');
        return;
      }

      await applyUserUpdate(res.data);
      setOtpCode('');
      Alert.alert('Success', res.message || 'Email recovery verified successfully.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async () => {
    setActionLoading(true);
    try {
      const res = await ProfileService.disableLandlordEmailRecovery();
      if (!res.success) {
        Alert.alert('Error', res.error || 'Failed to disable email recovery.');
        return;
      }

      await applyUserUpdate(res.data);
      setOtpCode('');
      Alert.alert('Success', res.message || 'Email recovery has been disabled.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loaderText}>Loading security settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isEnabled = emailRecoveryState.enabled;
  const isVerified = isEnabled && Boolean(emailRecoveryState.verifiedAt);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Recovery</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Email Recovery Verification</Text>
          <Text style={styles.description}>
            This setup is only from Settings. Once verified, your landlord account can use forgot/reset password.
          </Text>

          <View style={styles.statusWrap}>
            <Text style={styles.statusLabel}>Status</Text>
            <View
              style={[
                styles.statusBadge,
                isVerified
                  ? styles.statusVerified
                  : isEnabled
                    ? styles.statusPending
                    : styles.statusDisabled,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isVerified
                    ? styles.statusTextVerified
                    : isEnabled
                      ? styles.statusTextPending
                      : styles.statusTextDisabled,
                ]}
              >
                {isVerified ? 'Verified' : isEnabled ? 'Pending Verification' : 'Disabled'}
              </Text>
            </View>
          </View>

          {isVerified && emailRecoveryState.verifiedAt ? (
            <Text style={styles.verifiedAtText}>
              Verified on {new Date(emailRecoveryState.verifiedAt).toLocaleString()}
            </Text>
          ) : null}

          {!isEnabled ? (
            <TouchableOpacity
              style={[styles.primaryButton, actionLoading && styles.buttonDisabled]}
              onPress={handleEnableAndSendOtp}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.primaryButtonText}>Enable and Send OTP</Text>
              )}
            </TouchableOpacity>
          ) : null}

          {isEnabled && !isVerified ? (
            <View style={styles.otpWrap}>
              <TextInput
                style={styles.otpInput}
                keyboardType="number-pad"
                value={otpCode}
                onChangeText={(value) => setOtpCode(value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                placeholderTextColor={theme.colors.textTertiary}
                editable={!actionLoading}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    ((otpCode || '').length !== 6 || actionLoading) && styles.buttonDisabled,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={(otpCode || '').length !== 6 || actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, actionLoading && styles.buttonDisabled]}
                  onPress={handleEnableAndSendOtp}
                  disabled={actionLoading}
                >
                  <Text style={styles.secondaryButtonText}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {isEnabled ? (
            <TouchableOpacity
              style={[styles.ghostButton, (actionLoading || refreshingState) && styles.buttonDisabled]}
              onPress={handleDisable}
              disabled={actionLoading || refreshingState}
            >
              <Text style={styles.ghostButtonText}>Disable Email Recovery</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.primary,
    },
    loaderWrap: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    loaderText: {
      marginTop: 12,
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    header: {
      height: 56,
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: theme.colors.textInverse,
      fontWeight: '700',
      fontSize: 17,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 16,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 12,
    },
    title: {
      color: theme.colors.text,
      fontWeight: '700',
      fontSize: 18,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    statusWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    statusLabel: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    statusVerified: {
      backgroundColor: theme.colors.successLight,
    },
    statusPending: {
      backgroundColor: theme.colors.warningLight,
    },
    statusDisabled: {
      backgroundColor: theme.colors.backgroundTertiary,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '700',
    },
    statusTextVerified: {
      color: theme.colors.successDark,
    },
    statusTextPending: {
      color: theme.colors.warningDark,
    },
    statusTextDisabled: {
      color: theme.colors.textSecondary,
    },
    verifiedAtText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    otpWrap: {
      gap: 10,
    },
    otpInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      letterSpacing: 2,
    },
    buttonRow: {
      gap: 8,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    primaryButtonText: {
      color: theme.colors.textInverse,
      fontWeight: '700',
      fontSize: 14,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: 10,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surface,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: 14,
    },
    ghostButton: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surface,
    },
    ghostButtonText: {
      color: theme.colors.text,
      fontWeight: '600',
      fontSize: 14,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
