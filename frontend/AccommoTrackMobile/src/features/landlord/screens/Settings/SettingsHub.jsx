import React, { useState, useEffect, useMemo } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { getStyles } from "../../../../styles/Landlord/Settings.js";
import { useTheme } from "../../../../contexts/ThemeContext.jsx";
import { triggerForcedLogout, triggerRoleSwitch } from "../../../../navigation/RootNavigation.js";

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
        paddingVertical: 4,
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
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("landlord");
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationPrefs, setNotificationPrefs] = useState({
    payments: true,
    messages: true,
    maintenance: false,
    push: true,
    email: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [profileRes, verificationRes] = await Promise.all([
        ProfileService.getProfile(),
        ProfileService.getVerificationStatus()
      ]);

      if (profileRes.success && profileRes.data) {
        setUser(profileRes.data);
        setUserRole(profileRes.data.role || "landlord");
        const prefs = profileRes.data.notification_preferences;
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
      }

      if (verificationRes.success) {
        setVerificationStatus(verificationRes.data.status || 'not_submitted');
      }
    } catch (error) {
      console.error("Failed to load user info:", error.message);
    } finally {
      setLoading(false);
    }
  };

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
                        await AsyncStorage.multiRemove(['token', 'user', 'user_id', 'isGuest']);
                        triggerForcedLogout();
                      }          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
  };

  const handleSwitchRole = async () => {
    const newRole = userRole === "landlord" ? "tenant" : "landlord";
    const roleName = newRole.charAt(0).toUpperCase() + newRole.slice(1);

    Alert.alert(
      `Switch to ${roleName}`,
      `Are you sure you want to switch your account to ${roleName} mode?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch",
          onPress: async () => {
            try {
              setLoading(true);
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
              setLoading(false);
            }
          },
        },
      ],
    );
  };

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
            label: userRole === "landlord" ? "Switch to Tenant" : "Switch to Landlord",
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
  }, [notificationPrefs, userRole, isDarkMode, user]);

  const initials = () => {
    const first = user?.first_name || user?.firstName || "";
    const last = user?.last_name || user?.lastName || "";
    if (!first && !last) return "LL";
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.primary}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
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
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
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
