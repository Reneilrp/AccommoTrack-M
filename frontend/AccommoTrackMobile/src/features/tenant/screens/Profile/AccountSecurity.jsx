import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
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
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import ProfileService from '../../../../services/ProfileService.js';
import { showError, showSuccess, showWarning } from '../../../../utils/toast.js';

const parseTwoFactorState = (sourceUser) => {
    const security = sourceUser?.preferences?.security;
    if (!security || typeof security !== 'object') {
        return {
            enabled: false,
            verifiedAt: null,
            enrollmentPending: false,
        };
    }

    return {
        enabled: Boolean(security.twoFactorAuth),
        verifiedAt: security.twoFactorVerifiedAt || null,
        enrollmentPending: Boolean(security.twoFactorEnrollmentPending),
    };
};

const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

export default function AccountSecurity({ navigation }) {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [twoFactorState, setTwoFactorState] = useState({
        enabled: false,
        verifiedAt: null,
        enrollmentPending: false,
    });

    const hydrateCurrentUser = useCallback(async () => {
        setLoading(true);
        try {
            const currentUserRes = await ProfileService.getCurrentUser();
            if (!currentUserRes.success || !currentUserRes.data) {
                return;
            }

            const nextUser = currentUserRes.data;
            setUserEmail(nextUser.email || '');
            setTwoFactorState(parseTwoFactorState(nextUser));

            const stored = await AsyncStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored);
                await AsyncStorage.setItem('user', JSON.stringify({ ...parsed, ...nextUser }));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            hydrateCurrentUser();
        }, [hydrateCurrentUser]),
    );

    const applyUserUpdate = useCallback(async (nextUser, fallbackTwoFactor = null) => {
        if (nextUser) {
            setUserEmail(nextUser.email || '');
            setTwoFactorState(parseTwoFactorState(nextUser));

            const stored = await AsyncStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored);
                await AsyncStorage.setItem('user', JSON.stringify({ ...parsed, ...nextUser }));
            }
            return;
        }

        if (fallbackTwoFactor) {
            setTwoFactorState({
                enabled: Boolean(fallbackTwoFactor.enabled),
                verifiedAt: fallbackTwoFactor.verified_at || null,
                enrollmentPending: Boolean(fallbackTwoFactor.enrollment_pending),
            });
        }
    }, []);

    const handleSendOtp = async () => {
        setActionLoading(true);
        try {
            const res = await ProfileService.sendTenantTwoFactorOtp();
            if (!res.success) {
                showError('Error', res.error || 'Failed to send verification code.');
                return;
            }

            setOtpCode('');
            await applyUserUpdate(res.data, res.twoFactor);
            showSuccess('Success', res.message || 'Verification code sent to your email address.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        const normalizedCode = (otpCode || '').trim();
        if (!/^\d{6}$/.test(normalizedCode)) {
            showWarning('Validation', 'Please enter the 6-digit verification code.');
            return;
        }

        setActionLoading(true);
        try {
            const res = await ProfileService.verifyTenantTwoFactorOtp(normalizedCode);
            if (!res.success) {
                showError('Error', res.error || 'Failed to verify code.');
                return;
            }

            setOtpCode('');
            await applyUserUpdate(res.data, res.twoFactor);
            showSuccess('Success', res.message || 'Two-factor authentication enabled successfully.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDisable = async () => {
        setActionLoading(true);
        try {
            const res = await ProfileService.disableTenantTwoFactor();
            if (!res.success) {
                showError('Error', res.error || 'Failed to disable two-factor authentication.');
                return;
            }

            setOtpCode('');
            await applyUserUpdate(res.data, res.twoFactor);
            showSuccess('Success', res.message || 'Two-factor authentication has been disabled.');
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
                    <Text style={styles.loaderText}>Loading account security...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const isEnabled = Boolean(twoFactorState.enabled);
    const isVerified = isEnabled && Boolean(twoFactorState.verifiedAt);
    const isPending = !isVerified && Boolean(twoFactorState.enrollmentPending);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Account Security</Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Account Email</Text>
                    <Text style={styles.sectionDescription}>Used for login and security verification.</Text>
                    <TextInput
                        editable={false}
                        value={userEmail}
                        style={styles.readonlyInput}
                        placeholder="Email not available"
                        placeholderTextColor={theme.colors.textTertiary}
                    />
                </View>

                <View style={styles.card}>
                    <View style={styles.statusRow}>
                        <View style={styles.statusLabelWrap}>
                            <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
                            <Text style={styles.sectionDescription}>
                                Requires an email code when login is from a new IP or incognito/new session.
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.statusBadge,
                                isVerified
                                    ? styles.statusVerified
                                    : isPending
                                        ? styles.statusPending
                                        : styles.statusDisabled,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusText,
                                    isVerified
                                        ? styles.statusTextVerified
                                        : isPending
                                            ? styles.statusTextPending
                                            : styles.statusTextDisabled,
                                ]}
                            >
                                {isVerified ? 'Enabled' : isPending ? 'Pending Verification' : 'Disabled'}
                            </Text>
                        </View>
                    </View>

                    {isVerified && twoFactorState.verifiedAt ? (
                        <Text style={styles.verifiedText}>Verified on {formatDate(twoFactorState.verifiedAt)}</Text>
                    ) : null}

                    {!isEnabled && !isPending ? (
                        <TouchableOpacity
                            style={[styles.primaryButton, actionLoading && styles.buttonDisabled]}
                            onPress={handleSendOtp}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <ActivityIndicator size="small" color={theme.colors.textInverse} />
                            ) : (
                                <Text style={styles.primaryButtonText}>Enable and Send OTP</Text>
                            )}
                        </TouchableOpacity>
                    ) : null}

                    {isPending ? (
                        <View style={styles.pendingWrap}>
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
                                onPress={handleSendOtp}
                                disabled={actionLoading}
                            >
                                <Text style={styles.secondaryButtonText}>Resend OTP</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {(isEnabled || isPending) ? (
                        <TouchableOpacity
                            style={[styles.ghostButton, actionLoading && styles.buttonDisabled]}
                            onPress={handleDisable}
                            disabled={actionLoading}
                        >
                            <Text style={styles.ghostButtonText}>Disable Two-Factor Authentication</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </ScrollView>
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
        },
        content: {
            padding: 16,
            gap: 14,
        },
        card: {
            backgroundColor: theme.colors.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.colors.border,
            gap: 10,
        },
        sectionTitle: {
            color: theme.colors.text,
            fontWeight: '700',
            fontSize: 17,
        },
        sectionDescription: {
            color: theme.colors.textSecondary,
            fontSize: 13,
            lineHeight: 18,
        },
        readonlyInput: {
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 10,
            backgroundColor: theme.colors.backgroundSecondary,
            color: theme.colors.textSecondary,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 14,
        },
        statusRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 8,
        },
        statusLabelWrap: {
            flex: 1,
            gap: 4,
        },
        statusBadge: {
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 5,
            alignSelf: 'flex-start',
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
            fontSize: 11,
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
        verifiedText: {
            color: theme.colors.textSecondary,
            fontSize: 12,
        },
        pendingWrap: {
            gap: 8,
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
