import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, StatusBar, RefreshControl } from 'react-native';
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
  const [userRole, setUserRole] = useState('tenant');
  const [landlordVerificationStatus, setLandlordVerificationStatus] = useState(null);

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
        landlordVerificationStatus: verificationRes?.success ? verificationRes?.data?.status : null,
      };
    },
    enabled: !isGuestMode,
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
    refetchers: settingsRefetchers,
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

  const handleSettingPress = (label) => {
    switch(label) {
      case "Profile":
        rootNavigate('Profile');
        break;
      case "Preferences & Lifestyle":
        rootNavigate('PreferencesLifestyle');
        break;
      case "My Reviews":
        rootNavigate('ServiceRequests', { initialTab: 'Reviews' });
        break;
      case "Notification Preferences":
        // Scroll to notifications or navigate if separate
        break;
      case "Account Security":
        rootNavigate('UpdatePassword');
        break;
      case "Help & Support":
      case "Help Center":
        rootNavigate('HelpSupport');
        break;
      case "Report a Problem":
        Alert.alert('Report a Problem', 'This feature will be implemented soon');
        break;
      case "Terms of Service":
        Alert.alert('Terms of Service', 'This feature will be implemented soon');
        break;
      case "Privacy Policy":
        Alert.alert('Privacy Policy', 'This feature will be implemented soon');
        break;
      case "Login / Sign Up":
        handleLoginPress();
        break;
      case "Become a Landlord":
      case "Register as Landlord":
      case "Switch to Landlord":
      case "Switch to Tenant":
        handleSwitchRole();
        break;
      default:
        console.log('Setting pressed:', label);
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

      Alert.alert('Error', res.error || 'Failed to switch role');
      return false;
    } catch (error) {
      console.error('Role switch error:', error);
      Alert.alert('Error', 'An unexpected error occurred while switching roles.');
      return false;
    } finally {
      setLoading(false);
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
      if (landlordVerificationStatus === 'approved') {
        Alert.alert('Switch to Landlord', 'Your landlord registration is approved. Switch to landlord mode now?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch', onPress: () => performRoleSwitch('landlord') },
        ]);
      } else if (landlordVerificationStatus === 'pending') {
        Alert.alert('Registration Pending', 'Your landlord registration is still under review. Please wait for approval before switching.');
      } else {
        Alert.alert('Register as Landlord', 'Complete landlord registration first by submitting your valid ID and business permit in the app.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Proceed', onPress: () => navigation.navigate('VerificationStatus') },
        ]);
      }
      return;
    }

    // Landlord switching to Tenant (or any other case)
    Alert.alert(`Switch to ${roleName}`, `Are you sure you want to switch your account to ${roleName} mode?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Switch', onPress: () => performRoleSwitch(newRole) },
    ]);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              if (onLogout) {
                await onLogout();
              } else {
                // Clear only auth-related data
                clearAuthSession();
                await AsyncStorage.multiRemove(['token', 'user', 'user_id', 'isGuest']);
                triggerForcedLogout();
              }
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
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
            { id: 13, label: "Report a Problem", icon: "flag-outline", arrow: true },
            { id: 14, label: "Terms of Service", icon: "document-text-outline", arrow: true },
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
          { id: 17, label: "My Reviews", icon: "star-outline", arrow: true },
          { id: 2, label: "Account Security", icon: "lock-closed-outline", arrow: true },
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
              : landlordVerificationStatus === 'approved'
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
          { id: 13, label: "Report a Problem", icon: "flag-outline", arrow: true },
          { id: 14, label: "Terms of Service", icon: "document-text-outline", arrow: true },
          { id: 15, label: "Privacy Policy", icon: "shield-outline", arrow: true },
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
      <View style={{flex: 1}}>
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
                  disabled={item.toggle || item.label === "App Version"}
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

    </View>
  );
}