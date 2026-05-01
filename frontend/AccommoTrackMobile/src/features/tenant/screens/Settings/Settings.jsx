import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, StatusBar, RefreshControl, Modal, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStyles } from '../../../../styles/Menu/Settings.js';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { ListItemSkeleton } from '../../../../components/Skeletons/index.jsx';
import ProfileService from '../../../../services/ProfileService.js';
import { navigate as rootNavigate, triggerForcedLogout, triggerRoleSwitch } from '../../../../navigation/RootNavigation.js';
import { useAuthStore } from '../../../../stores/auth/authStore.js';
import { useAppVersion } from '../../../../shared/hooks/useAppVersion.js';
import { downloadAndInstallUpdate } from '../../../../services/AppUpdateService.js';
import { showError, showSuccess } from '../../../../utils/toast.js';
import { logger } from '../../../../utils/logger.js';
import {
  tenantQueryKeys,
  useTenantFocusRefetch,
  useTenantRefreshHandler,
} from '../../hooks/useTenantQueryHelpers.js';

const DEFAULT_NOTIFICATION_SETTINGS = {
  notifications: true,
  emailNotifications: true,
  pushNotifications: true,
  locationServices: true,
};

const LANDLORD_SWITCH_READY_STATUSES = new Set([
  'approved',
  'partial_verified',
  'pending_documents_review',
  'verified',
]);

const normalizeLandlordVerificationStatus = (status) =>
  String(status || 'not_submitted').toLowerCase();

const normalizeNotificationSettings = (input) => {
  if (!input) return { ...DEFAULT_NOTIFICATION_SETTINGS };

  let parsed = input;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return { ...DEFAULT_NOTIFICATION_SETTINGS };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }

  return {
    notifications: parsed.notifications ?? true,
    emailNotifications: parsed.emailNotifications ?? true,
    pushNotifications: parsed.pushNotifications ?? true,
    locationServices: parsed.locationServices ?? true,
  };
};

export default function Settings({ onLogout, isGuest, onLoginPress }) {
  const navigation = useNavigation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const clearAuthSession = useAuthStore((state) => state.clearAuthSession);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const themedHomeStyles = React.useMemo(() => homeStyles(theme), [theme]);

  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(isGuest ?? true);
  const [loading, setLoading] = useState(true);

  const {
    currentVersion,
    latestVersion,
    updateAvailable,
    downloadUrl,
    refetch: refetchVersion,
    otaUpdateId
  } = useAppVersion();
  const [userRole, setUserRole] = useState('tenant');
  const [landlordVerificationStatus, setLandlordVerificationStatus] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalTitle, setRoleModalTitle] = useState('');
  const [roleModalMessage, setRoleModalMessage] = useState('');
  const [roleModalConfirmLabel, setRoleModalConfirmLabel] = useState('OK');
  const [roleModalConfirmTone, setRoleModalConfirmTone] = useState('primary');
  const [roleModalShowCancel, setRoleModalShowCancel] = useState(false);
  const [roleModalProcessing, setRoleModalProcessing] = useState(false);
  const [roleModalAction, setRoleModalAction] = useState(null);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const checkState = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (!isMounted) return;

        const guest = isGuest === true || !userJson;
        setIsGuestMode(guest);

        if (!guest) {
          const user = JSON.parse(userJson);
          setUserRole(user.role || 'tenant');
          setActiveRole(user.role || 'tenant');
          setLoading(false);
        } else {
          clearAuthSession();
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking state:', error);
        if (isMounted) setLoading(false);
      }
    };

    checkState();
    return () => { isMounted = false; };
  }, [isGuest, clearAuthSession, setActiveRole]);

  const settingsBundleQuery = useQuery({
    queryKey: tenantQueryKeys.settingsBundle(),
    queryFn: async () => {
      const [profileRes, verificationRes] = await Promise.all([
        ProfileService.getProfile(),
        ProfileService.getVerificationStatus(),
      ]);

      return {
        notificationSettings: normalizeNotificationSettings(profileRes?.data?.notification_preferences),
        landlordVerificationStatus: verificationRes?.success
          ? normalizeLandlordVerificationStatus(verificationRes?.data?.status)
          : null,
      };
    },
    enabled: !isGuestMode && !loading,
    placeholderData: (previousData) => previousData,
  });

  const refetchSettingsBundle = settingsBundleQuery.refetch;
  const settingsRefetchers = React.useMemo(
    () => [refetchSettingsBundle],
    [refetchSettingsBundle],
  );

  useTenantFocusRefetch({
    enabled: !isGuestMode,
    refetchers: settingsRefetchers,
  });

  const onRefresh = useTenantRefreshHandler({
    enabled: !isGuestMode,
    setRefreshing,
    refetchers: [...settingsRefetchers, refetchVersion],
  });

  useEffect(() => {
    if (!settingsBundleQuery.data) return;
    setNotificationSettings(settingsBundleQuery.data.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS);
    setLandlordVerificationStatus(settingsBundleQuery.data.landlordVerificationStatus || null);
  }, [settingsBundleQuery.data]);

  useEffect(() => {
    if (!settingsBundleQuery.error) return;
    console.error('Error loading settings:', settingsBundleQuery.error);
  }, [settingsBundleQuery.error]);

  const updateSetting = async (key, value) => {
    if (isGuestMode) return;

    const previousSettings = notificationSettings;
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);
    queryClient.setQueryData(tenantQueryKeys.settingsBundle(), (previousBundle) => ({
      ...(previousBundle || {}),
      notificationSettings: newSettings,
    }));

    try {
      await ProfileService.updateSettings({
        notification_preferences: newSettings
      });

      // Update local storage too for consistency
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        user.notification_preferences = newSettings;
        await AsyncStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      setNotificationSettings(previousSettings);
      queryClient.setQueryData(tenantQueryKeys.settingsBundle(), (previousBundle) => ({
        ...(previousBundle || {}),
        notificationSettings: previousSettings,
      }));
    }
  };

  const handleSettingPress = async (label) => {
    switch (label) {
      case "Profile":
        rootNavigate('Profile');
        break;
      case "Preferences & Lifestyle":
        rootNavigate('PreferencesLifestyle');
        break;
      case "Notification Preferences":
        // Scroll to notifications or navigate if separate
        break;
      case "Account Security":
        rootNavigate('AccountSecurity');
        break;
      case "My Wallet & Credits":
        rootNavigate('MyWallet');
        break;
      case "Help & Support":
      case "Help Center":
        rootNavigate('HelpSupport');
        break;
      case "Report a Problem":
        rootNavigate('HelpSupport');
        break;
      case "Terms & Conditions":
      case "Terms of Service":
        rootNavigate('HelpSupport', { openResource: 'terms' });
        break;
      case "Privacy Policy":
        rootNavigate('HelpSupport', { openResource: 'privacy' });
        break;
      case "Login / Sign Up":
        handleLoginPress();
        break;
      case "Register as Landlord":
      case "Switch to Landlord":
      case "Switch to Tenant":
        handleSwitchRole();
        break;
      case "Update Available":
      case "Update App":
        if (!downloadUrl) {
          showError('Update unavailable', 'No update link is configured right now.');
          break;
        }
        setDownloadingUpdate(true);
        setDownloadProgress(0);
        try {
          const result = await downloadAndInstallUpdate({
            downloadUrl,
            onProgress: (progress) => {
              setDownloadProgress(progress);
            }
          });

          if (result?.openedInstallSettings) {
            showError(
              'Allow install permission',
              'Android opened Install unknown apps settings for AccommoTrack. Enable it, return to app, then tap Update App again.',
            );
          }

          if (result?.openedExternally) {
            showError(
              'Continue update',
              'Opened browser/download manager for APK. If install is blocked, allow "Install unknown apps" in Android settings.',
            );
          }

          if (result?.requiresManualFallback) {
            const fallbackUrl = result?.resolvedUrl || downloadUrl;
            Alert.alert(
              'Install needs manual fallback',
              `${result?.fallbackReason || 'Android could not open installer.'} We kept update flow in-app by default. You can retry now, or open the APK in browser/download manager.`,
              [
                {
                  text: 'Retry in app',
                  style: 'cancel',
                },
                {
                  text: 'Open Browser',
                  onPress: () => {
                    if (!fallbackUrl) return;

                    Linking.openURL(fallbackUrl).catch(() => {
                      showError(
                        'Open browser failed',
                        'Could not open browser. Please open the APK URL manually.',
                      );
                    });
                  },
                },
              ],
            );
          }
        } catch (error) {
          showError(
            'Update failed',
            error?.message || 'Unable to download/install update inside the app.',
          );
        } finally {
          setDownloadingUpdate(false);
          setDownloadProgress(0);
        }
        break;
      case "EAS Update ID":
      case "What's New":
        navigation.navigate('UpdateDetails');
        break;
      default:
        logger.debug('Setting pressed:', label);
    }
  };

  const handleLoginPress = () => {
    if (onLoginPress) {
      onLoginPress();
    } else {
      triggerForcedLogout();
    }
  };

  const performRoleSwitch = async (newRole, payload = {}) => {
    try {
      setLoading(true);
      const res = await ProfileService.switchRole(newRole, payload);
      if (res.success) {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          user.role = newRole;
          await AsyncStorage.setItem('user', JSON.stringify(user));
          if (user.id) {
            await AsyncStorage.setItem(`user_role_${user.id}`, newRole);
          }
        }
        setActiveRole(newRole);
        triggerRoleSwitch(newRole);
        return true;
      }

      if (res.status === 401) {
        showError('Session expired', 'Please log in again to switch roles.');
        return false;
      }

      showError('Role switch failed', res.error || 'Failed to switch role');
      return false;
    } catch (error) {
      console.error('Role switch error:', error);
      showError('Role switch failed', 'An unexpected error occurred while switching roles.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const openRoleModal = ({
    title,
    message,
    confirmLabel = 'OK',
    confirmTone = 'primary',
    showCancel = false,
    onConfirm = null,
  }) => {
    setRoleModalTitle(title);
    setRoleModalMessage(message);
    setRoleModalConfirmLabel(confirmLabel);
    setRoleModalConfirmTone(confirmTone);
    setRoleModalShowCancel(showCancel);
    setRoleModalAction(() => onConfirm);
    setShowRoleModal(true);
  };

  const closeRoleModal = () => {
    if (roleModalProcessing) return;
    setShowRoleModal(false);
    setRoleModalAction(null);
  };

  const confirmRoleModalAction = async () => {
    if (roleModalProcessing) return;

    if (typeof roleModalAction !== 'function') {
      closeRoleModal();
      return;
    }

    setRoleModalProcessing(true);
    try {
      const result = await roleModalAction();
      if (result !== false) {
        setShowRoleModal(false);
        setRoleModalAction(null);
      }
    } finally {
      setRoleModalProcessing(false);
    }
  };

  const handleSwitchRole = async () => {
    if (isGuestMode) {
      navigation.navigate('LandlordRegister');
      return;
    }

    const newRole = userRole === 'landlord' ? 'tenant' : 'landlord';
    const roleName = newRole.charAt(0).toUpperCase() + newRole.slice(1);

    if (userRole === 'tenant' && newRole === 'landlord') {
      let effectiveVerificationStatus = normalizeLandlordVerificationStatus(landlordVerificationStatus);

      try {
        const latestVerification = await ProfileService.getVerificationStatus();
        if (latestVerification?.success) {
          effectiveVerificationStatus = normalizeLandlordVerificationStatus(latestVerification?.data?.status);
          setLandlordVerificationStatus(effectiveVerificationStatus);
          queryClient.setQueryData(tenantQueryKeys.settingsBundle(), (previousBundle) => ({
            ...(previousBundle || {}),
            landlordVerificationStatus: effectiveVerificationStatus,
          }));
        }
      } catch (verificationError) {
        console.error('Failed to refresh verification status before role switch:', verificationError);
      }

      if (LANDLORD_SWITCH_READY_STATUSES.has(effectiveVerificationStatus)) {
        openRoleModal({
          title: 'Switch to Landlord',
          message: 'Your landlord access is active. Switch to landlord mode now?',
          confirmLabel: 'Switch',
          showCancel: true,
          onConfirm: () => performRoleSwitch('landlord'),
        });
      } else if (effectiveVerificationStatus === 'pending') {
        // Hard block: Do not allow role switch for pending status
        showError(
          'Registration Pending',
          'Your landlord registration is still under review. Please wait for admin approval before switching to landlord mode.'
        );
        return;
      } else {
        openRoleModal({
          title: 'Register as Landlord',
          message: 'Complete landlord registration first by submitting your valid ID and business permit in the app.',
          confirmLabel: 'Proceed',
          showCancel: true,
          onConfirm: () => {
            navigation.navigate('VerificationStatus');
            return true;
          },
        });
      }
      return;
    }

    // Landlord switching to Tenant (or any other case)
    openRoleModal({
      title: `Switch to ${roleName}`,
      message: `Are you sure you want to switch your account to ${roleName} mode?`,
      confirmLabel: 'Switch',
      showCancel: true,
      onConfirm: () => performRoleSwitch(newRole),
    });
  };

  const handleLogout = async () => {
    setShowLogoutModal(true);
  };

  const closeLogoutModal = () => {
    if (loggingOut) return;
    setShowLogoutModal(false);
  };

  const confirmLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      if (onLogout) {
        await onLogout();
        showSuccess('Logged out successfully');
      } else {
        // Clear only auth-related data
        clearAuthSession();
        await AsyncStorage.multiRemove(['token', 'user', 'user_id', 'isGuest']);
        showSuccess('Logged out successfully');
        triggerForcedLogout();
      }

      setShowLogoutModal(false);
    } catch (error) {
      console.error('Logout error:', error);
      showError('Logout failed', 'Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  // Settings sections - different for guests vs logged in users
  const getSettingSections = () => {
    if (isGuestMode) {
      return [
        {
          title: "Account",
          items: [
            { id: 1, label: "Login / Sign Up", icon: "log-in-outline", arrow: true, highlight: true },
            { id: 2, label: "Register as Landlord", icon: "business-outline", arrow: true },
            {
              id: 3,
              label: "Dark Mode",
              icon: isDarkMode ? "moon" : "moon-outline",
              toggle: true,
              value: isDarkMode,
              onChange: toggleTheme
            },
          ]
        },
        {
          title: "Support",
          items: [
            { id: 12, label: "Help & Support", icon: "help-circle-outline", arrow: true },
            { id: 14, label: "Terms & Conditions", icon: "document-text-outline", arrow: true },
            { id: 15, label: "Privacy Policy", icon: "shield-outline", arrow: true },
          ]
        }
      ];
    }

    // Logged in user - full options
    return [
      {
        title: "Account & Preferences",
        items: [
          { id: 1, label: "Profile", icon: "person-outline", arrow: true },
          { id: 16, label: "Preferences & Lifestyle", icon: "options-outline", arrow: true },
          { id: 2, label: "Account Security", icon: "lock-closed-outline", arrow: true },
          { id: 18, label: "My Wallet & Credits", icon: "wallet-outline", arrow: true },
          {
            id: 3,
            label: "Dark Mode",
            icon: isDarkMode ? "moon" : "moon-outline",
            toggle: true,
            value: isDarkMode,
            onChange: toggleTheme
          },
          {
            id: 4,
            label: userRole === 'landlord'
              ? 'Switch to Tenant'
              : LANDLORD_SWITCH_READY_STATUSES.has(normalizeLandlordVerificationStatus(landlordVerificationStatus))
                ? 'Switch to Landlord'
                : 'Register as Landlord',
            icon: "swap-horizontal-outline",
            arrow: true
          },
        ]
      },
      {
        title: "Notifications",
        items: [
          {
            id: 8,
            label: "Push",
            icon: "notifications-outline",
            toggle: true,
            value: notificationSettings.pushNotifications,
            onChange: (val) => updateSetting('pushNotifications', val)
          },
          {
            id: 9,
            label: "Email",
            icon: "mail-outline",
            toggle: true,
            value: notificationSettings.emailNotifications,
            onChange: (val) => updateSetting('emailNotifications', val)
          },
        ]
      },
      {
        title: "Support",
        items: [
          { id: 12, label: "Help & Support", icon: "help-circle-outline", arrow: true },
          { id: 14, label: "Terms & Conditions", icon: "document-text-outline", arrow: true },
          { id: 15, label: "Privacy Policy", icon: "shield-outline", arrow: true },
        ]
      },
      {
        title: "App Info",
        items: [
          ...(updateAvailable ? [{
            id: 16,
            label: downloadingUpdate ? "Downloading..." : "Update App",
            icon: "cloud-download-outline",
            highlight: true,
            value: downloadingUpdate ? `${Math.round(downloadProgress * 100)}%` : `v${latestVersion}`,
          }] : []),
          {
            id: 18,
            label: "What's New",
            icon: "sparkles-outline",
            value: otaUpdateId ? otaUpdateId.substring(0, 8) : "View details",
            arrow: true,
          },
          {
            id: 17,
            label: "App Version",
            icon: "albums-outline",
            value: currentVersion,
          },
        ]
      }
    ];
  };

  const settingSections = getSettingSections();
  const isScreenLoading = loading || (!isGuestMode && settingsBundleQuery.isLoading && !settingsBundleQuery.data);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" />
      {/* Content Area */}
      <View style={{ flex: 1 }}>
        {isScreenLoading ? (
          <ScrollView style={themedHomeStyles.contentContainerPadding} showsVerticalScrollIndicator={false}>
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={themedHomeStyles.contentContainerPadding}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          >

            {settingSections.map((section, sectionIndex) => (
              <View key={sectionIndex} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{section.title}</Text>
                <View style={[styles.settingsCard, { backgroundColor: theme.colors.surface }]}>
                  {section.items.map((item, itemIndex) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.settingItem,
                        itemIndex !== section.items.length - 1 && [styles.settingItemBorder, { borderBottomColor: theme.colors.border }],
                        item.highlight && styles.settingItemHighlight,
                        item.highlight && { backgroundColor: theme.colors.primary + '10' }
                      ]}
                      disabled={item.toggle || item.label === "App Version" || downloadingUpdate}
                      onPress={() => handleSettingPress(item.label)}
                      activeOpacity={item.toggle ? 1 : 0.7}
                    >
                      <View style={styles.settingLeft}>
                        <View style={[styles.settingIcon, item.highlight && styles.settingIconHighlight, item.highlight && { backgroundColor: theme.colors.primary }]}>
                          <Ionicons name={item.icon} size={22} color={item.highlight ? "#FFFFFF" : theme.colors.primary} />
                        </View>
                        <Text style={[styles.settingLabel, item.highlight && styles.settingLabelHighlight, item.highlight && { color: theme.colors.primary }, { color: theme.colors.text }]}>{item.label}</Text>
                      </View>

                      <View style={styles.settingRight}>
                        {item.toggle ? (
                          <Switch
                            value={item.value}
                            onValueChange={item.onChange}
                            trackColor={{ false: '#D1D5DB', true: theme.colors.brand200 }}
                            thumbColor={item.value ? theme.colors.primary : '#F3F4F6'}
                          />
                        ) : (
                          <>
                            {item.value && (
                              <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{item.value}</Text>
                            )}
                            {item.arrow && (
                              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            )}
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {/* Logout Button - Only show for logged in users */}
            {!isGuestMode && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={[styles.dangerButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error + '20' }]}
                  onPress={handleLogout}
                >
                  <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
                  <Text style={[styles.dangerButtonText, { color: theme.colors.error }]}>Logout</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={themedHomeStyles.spacer} />
          </ScrollView>
        )}
      </View>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={closeLogoutModal}
        statusBarTranslucent
        navigationBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View style={styles.logoutModalOverlay}>
          <TouchableOpacity
            style={styles.logoutModalBackdrop}
            activeOpacity={1}
            onPress={closeLogoutModal}
          />

          <View style={styles.logoutModalCard}>
            <Text style={styles.logoutModalTitle}>Logout</Text>
            <Text style={styles.logoutModalMessage}>Are you sure you want to logout?</Text>

            <View style={styles.logoutModalActions}>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutModalCancelButton]}
                onPress={closeLogoutModal}
                disabled={loggingOut}
              >
                <Text style={styles.logoutModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutModalConfirmButton]}
                onPress={confirmLogout}
                disabled={loggingOut}
              >
                <Text style={styles.logoutModalConfirmText}>
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={closeRoleModal}
        statusBarTranslucent
        navigationBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View style={styles.logoutModalOverlay}>
          <TouchableOpacity
            style={styles.logoutModalBackdrop}
            activeOpacity={1}
            onPress={closeRoleModal}
          />

          <View style={styles.logoutModalCard}>
            <Text style={styles.logoutModalTitle}>{roleModalTitle}</Text>
            <Text style={styles.logoutModalMessage}>{roleModalMessage}</Text>

            <View style={styles.logoutModalActions}>
              {roleModalShowCancel && (
                <TouchableOpacity
                  style={[styles.logoutModalButton, styles.logoutModalCancelButton]}
                  onPress={closeRoleModal}
                  disabled={roleModalProcessing}
                >
                  <Text style={styles.logoutModalCancelText}>Cancel</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.logoutModalButton,
                  {
                    backgroundColor: roleModalConfirmTone === 'danger'
                      ? theme.colors.error
                      : theme.colors.primary,
                  },
                ]}
                onPress={confirmRoleModalAction}
                disabled={roleModalProcessing}
              >
                <Text style={styles.logoutModalConfirmText}>
                  {roleModalProcessing ? 'Processing...' : roleModalConfirmLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}