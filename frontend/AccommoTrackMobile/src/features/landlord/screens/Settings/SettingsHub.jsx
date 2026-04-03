import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  StatusBar,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { getStyles } from "../../../../styles/Landlord/Settings.js";
import { useTheme } from "../../../../contexts/ThemeContext.jsx";
import { triggerForcedLogout, triggerRoleSwitch } from "../../../../navigation/RootNavigation.js";
import { useAuthStore } from "../../../../stores/auth/authStore.js";
import {
  landlordQueryKeys,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from "../../hooks/useLandlordQueryHelpers.js";

import ProfileService from "../../../../services/ProfileService.js";
import { getImageUrl } from "../../../../utils/imageUtils.js";

const SettingRow = ({ item, onPress, onToggle, theme, styles }) => {
  const content = (
    <View style={styles.settingLeft}>
      <View
        style={[
          styles.settingIcon,
          { backgroundColor: theme.colors.primaryLight },
        ]}
      >
        <Ionicons name={item.icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.settingTextBlock}>
        <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
          {item.label}
        </Text>
        {item.description ? (
          <Text
            style={[
              styles.settingDescription,
              { color: theme.colors.textSecondary },
            ]}
          >
            {item.description}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const rightContent = () => {
    if (item.type === "toggle") {
      return (
        <Switch
          value={item.value}
          onValueChange={() => onToggle(item)}
          trackColor={{ false: "#D1D5DB", true: theme.colors.brand200 }}
          thumbColor={item.value ? theme.colors.primary : "#F3F4F6"}
        />
      );
    }

    if (item.type === "status") {
      const statusStyle = {
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor:
          item.value === "Verified"
            ? theme.colors.successLight
            : item.value === "Pending"
              ? theme.colors.warningLight
              : item.value === "Rejected"
                ? theme.colors.errorLight
                : theme.colors.backgroundTertiary,
      };
      const textStyle = {
        fontSize: 12,
        fontWeight: "600",
        color:
          item.value === "Verified"
            ? theme.colors.successDark
            : item.value === "Pending"
              ? theme.colors.warningDark
              : item.value === "Rejected"
                ? theme.colors.error
                : theme.colors.textSecondary,
      };
      return (
        <View style={statusStyle}>
          <Text style={textStyle}>{item.value}</Text>
        </View>
      );
    }

    return (
      <View style={styles.settingRight}>
        {item.value ? (
          <Text
            style={[styles.settingValue, { color: theme.colors.textSecondary }]}
          >
            {item.value}
          </Text>
        ) : null}
        {item.type === "navigate" || item.type === "action" ? (
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        ) : null}
      </View>
    );
  };

  const isDisabled = item.type === "info" || item.disabled;

  return (
    <TouchableOpacity
      disabled={item.type === "toggle" || isDisabled}
      activeOpacity={item.type === "toggle" ? 1 : 0.7}
      style={styles.settingRow}
      onPress={() => onPress(item)}
    >
      {content}
      {rightContent()}
    </TouchableOpacity>
  );
};

export default function SettingsScreen({ navigation, onLogout }) {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const clearAuthSession = useAuthStore((state) => state.clearAuthSession);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("landlord");
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    payments: true,
    messages: true,
    maintenance: false,
    push: true,
    email: true,
  });
  const [fetchError, setFetchError] = useState("");

  const settingsQuery = useQuery({
    queryKey: landlordQueryKeys.settingsHub(),
    queryFn: async () => {
      const [profileRes, verificationRes] = await Promise.all([
        ProfileService.getProfile(),
        ProfileService.getVerificationStatus(),
      ]);

      if (!profileRes.success || !profileRes.data) {
        throw new Error(profileRes.error || "Failed to load settings");
      }

      return {
        profile: profileRes.data,
        verificationStatus: verificationRes.success
          ? (verificationRes.data?.status || "not_submitted")
          : null,
      };
    },
    placeholderData: (previousData) => previousData,
  });

  const loading = settingsQuery.isPending && !settingsQuery.data;
  const refetchSettings = settingsQuery.refetch;
  const settingsRefetchers = useMemo(() => [refetchSettings], [refetchSettings]);

  useLandlordFocusRefetch({ refetchers: settingsRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: settingsRefetchers,
  });

  useEffect(() => {
    if (!settingsQuery.data?.profile) return;

    const profile = settingsQuery.data.profile;
    const role = profile.role || "landlord";
    setUser(profile);
    setUserRole(role);
    setActiveRole(role);

    const prefs = profile.notification_preferences;
    if (prefs) {
      const parsed = typeof prefs === "string" ? JSON.parse(prefs) : prefs;
      setNotificationPrefs({
        payments: parsed.payments ?? true,
        messages: parsed.messages ?? true,
        maintenance: parsed.maintenance ?? false,
        push: parsed.push ?? true,
        email: parsed.email ?? true,
      });
    }

    if (settingsQuery.data.verificationStatus !== null) {
      setVerificationStatus(settingsQuery.data.verificationStatus);
    }
  }, [settingsQuery.data, setActiveRole]);

  useEffect(() => {
    if (!settingsQuery.error) {
      setFetchError("");
      return;
    }

    setFetchError(
      settingsQuery.error?.message ||
      "Unable to load settings right now. Pull to refresh or retry.",
    );
  }, [settingsQuery.error]);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
                      if (onLogout) {
                        await onLogout();
                      } else {
                        // Clear only auth-related data
                        clearAuthSession();
                        await AsyncStorage.multiRemove(['token', 'user', 'user_id', 'isGuest']);
                        triggerForcedLogout();
                      }          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
  };

  const handleSwitchRole = useCallback(async () => {
    const newRole = userRole === "landlord" ? "tenant" : "landlord";
    const roleName = newRole.charAt(0).toUpperCase() + newRole.slice(1);

    if (userRole === 'tenant' && newRole === 'landlord') {
      if (verificationStatus === 'approved') {
        Alert.alert('Switch to Landlord', 'Your landlord registration is approved. Switch to landlord mode now?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch',
            onPress: async () => {
              try {
                setActionLoading(true);
                const res = await ProfileService.switchRole('landlord');
                if (res.success) {
                  const userJson = await AsyncStorage.getItem('user');
                  if (userJson) {
                    const parsed = JSON.parse(userJson);
                    parsed.role = 'landlord';
                    await AsyncStorage.setItem('user', JSON.stringify(parsed));
                    if (parsed.id) {
                      await AsyncStorage.setItem(`user_role_${parsed.id}`, 'landlord');
                    }
                  }
                  setActiveRole('landlord');
                  triggerRoleSwitch('landlord');
                } else {
                  Alert.alert('Error', res.error || 'Failed to switch role');
                }
              } catch (error) {
                console.error('Role switch error:', error);
                Alert.alert('Error', 'An unexpected error occurred while switching roles.');
              } finally {
                setActionLoading(false);
              }
            },
          },
        ]);
      } else if (verificationStatus === 'pending') {
        Alert.alert('Registration Pending', 'Your landlord registration is still under review. Please wait for approval before switching.');
      } else {
        Alert.alert('Register as Landlord', 'Complete landlord registration first by submitting your valid ID and business permit.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Proceed', onPress: () => navigation.navigate('VerificationStatus') },
        ]);
      }
      return;
    }

    Alert.alert(
      `Switch to ${roleName}`,
      `Are you sure you want to switch your account to ${roleName} mode?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch",
          onPress: async () => {
            try {
              setActionLoading(true);
              const res = await ProfileService.switchRole(newRole);
              if (res.success) {
                // Update local storage
                const userJson = await AsyncStorage.getItem("user");
                if (userJson) {
                  const user = JSON.parse(userJson);
                  user.role = newRole;
                  await AsyncStorage.setItem("user", JSON.stringify(user));
                  // Persist role preference across logout/login cycles
                  if (user.id) {
                    await AsyncStorage.setItem(`user_role_${user.id}`, newRole);
                  }
                }
                setActiveRole(newRole);
                // Trigger navigation refresh
                triggerRoleSwitch(newRole);
              } else {
                Alert.alert("Error", res.error || "Failed to switch role");
              }
            } catch (error) {
              console.error("Role switch error:", error);
              Alert.alert(
                "Error",
                "An unexpected error occurred while switching roles.",
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }, [navigation, setActiveRole, userRole, verificationStatus]);

  const handleUnavailable = (label) => {
    Alert.alert(label, "This option will be available soon.");
  };

  const handleConnectPayMongo = async () => {
    // TODO: Re-enable once PayMongo approves Connect/Platform API access on our account
    // try {
    //   const res = await ProfileService.getPayMongoOnboardingUrl();
    //   if (res.success && res.data.onboarding_url) {
    //     await Linking.openURL(res.data.onboarding_url);
    //     loadSettings();
    //   } else {
    //     Alert.alert('Error', res.error || 'Could not start PayMongo connection.');
    //   }
    // } catch (error) {
    //   Alert.alert('Error', 'An unexpected error occurred.');
    // }
    Alert.alert(
      "Coming Soon",
      "PayMongo online payment onboarding is currently being set up. We will notify you once it is available.",
      [{ text: "OK" }],
    );
  };

  const handleItemPress = (item) => {
    if (item.type === "navigate" || item.target) {
      navigation.navigate(item.target);
      return;
    }
    if (item.action) {
      item.action();
      return;
    }
    if (item.type === "value" || item.type === "status") {
      // If no action or target, do nothing
      return;
    }
    handleUnavailable(item.label);
  };

  const handleToggle = async (item) => {
    if (item.stateKey === "darkMode") {
      await toggleTheme();
      return;
    }

    const newPrefs = {
      ...notificationPrefs,
      [item.stateKey]: !notificationPrefs[item.stateKey],
    };
    setNotificationPrefs(newPrefs);

    try {
      await ProfileService.updateProfile({
        notification_preferences: newPrefs,
      });
      const stored = await AsyncStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.notification_preferences = newPrefs;
        await AsyncStorage.setItem("user", JSON.stringify(parsed));
      }
    } catch (error) {
      console.error("Error saving notification preferences:", error);
    }
  };

  const sections = useMemo(() => {
    const payMongoStatus = !user?.paymongo_child_id
      ? "Not Connected"
      : user.paymongo_verification_status === "verified"
        ? "Verified"
        : "Pending";

    const idStatusLabel = !verificationStatus || verificationStatus === 'not_submitted'
      ? "Not Submitted"
      : verificationStatus === 'pending'
        ? "Pending"
        : verificationStatus === 'rejected'
          ? "Rejected"
          : "Verified";

    const allSections = [
      {
        title: "Account",
        items: [
          {
            id: "verification",
            label: verificationStatus === 'not_submitted' ? "Submit Documents" : "ID Verification",
            description: "ID and business permit status",
            icon: verificationStatus === 'approved' ? "shield-checkmark-outline" : "alert-circle-outline",
            type: "status",
            value: idStatusLabel,
            target: "VerificationStatus",
            role: "landlord",
          },
          {
            id: "caretakers",
            label: "Caretaker Management",
            description: "Manage access and permissions",
            icon: "people-outline",
            type: "navigate",
            target: "Caretakers",
            role: "landlord",
          },
        ],
      },
      {
        title: "Payments",
        items: [
          {
            id: "paymongo-status",
            label: "PayMongo Status",
            icon: "card-outline",
            type: "status",
            value: payMongoStatus,
          },
          {
            id: "paymongo-connect",
            label:
              payMongoStatus === "Not Connected"
                ? "Connect to PayMongo"
                : "View Account",
            description: "Enable online payments for your properties",
            icon: "link-outline",
            type: "action",
            action: handleConnectPayMongo,
          },
          {
            id: "property-payment-methods",
            label: "Property Payment Methods",
            description: "Set accepted payment methods per property",
            icon: "business-outline",
            type: "navigate",
            target: "PropertyPaymentSettings",
          },
          {
            id: "manual-payment-methods",
            label: "Manual Payment Details",
            description: "Configure GCash, Bank, and other details",
            icon: "wallet-outline",
            type: "navigate",
            target: "ManualPaymentSettings",
          },
        ],
      },
      {
        title: "Security",
        items: [
          {
            id: "change-password",
            label: "Change Password",
            description: "Update your login credentials",
            icon: "lock-closed-outline",
            type: "navigate",
            target: "UpdatePassword",
          },
        ],
      },
      {
        title: "Notifications",
        items: [
          {
            id: "payment-alerts",
            label: "Payment Updates",
            icon: "cash-outline",
            type: "toggle",
            value: notificationPrefs.payments,
            stateKey: "payments",
          },
          {
            id: "message-alerts",
            label: "New Messages",
            icon: "chatbubble-ellipses-outline",
            type: "toggle",
            value: notificationPrefs.messages,
            stateKey: "messages",
          },
          {
            id: "maintenance-alerts",
            label: "Maintenance Requests",
            icon: "construct-outline",
            type: "toggle",
            value: notificationPrefs.maintenance,
            stateKey: "maintenance",
          },
        ],
      },
      {
        title: "Support",
        items: [
          {
            id: "help",
            label: "Help & Support",
            description: "FAQs and contact options",
            icon: "help-circle-outline",
            type: "navigate",
            target: "HelpSupport",
          },
          {
            id: "report",
            label: "Report a Problem",
            icon: "flag-outline",
            type: "action",
            action: () => handleUnavailable("Report a Problem"),
          },
          {
            id: "about",
            label: "About AccommoTrack",
            description: "Release notes, dev team, and terms",
            icon: "information-circle-outline",
            type: "navigate",
            target: "About",
          },
        ],
      },
      {
        title: "App Info",
        items: [
          {
            id: "dark-mode",
            label: "Dark Mode",
            icon: isDarkMode ? "moon" : "moon-outline",
            type: "toggle",
            value: isDarkMode,
            stateKey: "darkMode",
          },
          {
            id: "switch-role",
            label: userRole === 'landlord'
              ? 'Switch to Tenant'
              : verificationStatus === 'approved'
                ? 'Switch to Landlord'
                : 'Register as Landlord',
            icon: "swap-horizontal-outline",
            type: "action",
            action: () => handleSwitchRole(),
          },
          {
            id: "version",
            label: "Version",
            icon: "albums-outline",
            type: "info",
            value: "1.0.0",
          },
          {
            id: "updates",
            label: "Release Channel",
            icon: "cloud-download-outline",
            type: "info",
            value: "Testing",
          },
        ],
      },
    ];

    return allSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !item.role || item.role === userRole,
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [
    notificationPrefs,
    userRole,
    verificationStatus,
    isDarkMode,
    user,
    handleSwitchRole,
  ]);

  const initials = () => {
    const first = user?.first_name || user?.firstName || "";
    const last = user?.last_name || user?.lastName || "";
    if (!first && !last) return "LL";
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.primary}
        />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.primary}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {fetchError ? (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: theme.isDark ? '#7F1D1D' : '#FECACA',
              backgroundColor: theme.isDark ? 'rgba(127,29,29,0.32)' : '#FEF2F2',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="alert-circle-outline" size={18} color={theme.isDark ? '#FCA5A5' : '#B91C1C'} />
            <Text
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 12,
                fontWeight: "500",
                color: theme.isDark ? '#FCA5A5' : '#B91C1C',
              }}
            >
              {fetchError}
            </Text>
            <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  marginLeft: 10,
                  color: theme.isDark ? '#FCA5A5' : '#B91C1C',
                }}
              >
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>
            Customize how AccommoTrack works for you
          </Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            {user?.profile_image ? (
              <Image
                source={{ uri: getImageUrl(user.profile_image) }}
                style={{ width: "100%", height: "100%", borderRadius: 999 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.profileInitials}>{initials()}</Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.first_name || user?.firstName || "Landlord"}{" "}
              {user?.last_name || user?.lastName || ""}
            </Text>
            <Text style={styles.profileEmail}>
              {user?.email || "support@accommotrack.com"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("MyProfile")}
            style={styles.profileAction}
          >
            <Text style={styles.profileActionText}>View</Text>
          </TouchableOpacity>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <View key={item.id}>
                  <SettingRow
                    item={item}
                    onPress={handleItemPress}
                    onToggle={handleToggle}
                    theme={theme}
                    styles={styles}
                  />
                  {idx < section.items.length - 1 ? (
                    <View style={styles.divider} />
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.dangerButton, actionLoading && { opacity: 0.7 }]}
            onPress={handleLogout}
            disabled={actionLoading}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.dangerButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          © 2026 AccommoTrack. All rights reserved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
