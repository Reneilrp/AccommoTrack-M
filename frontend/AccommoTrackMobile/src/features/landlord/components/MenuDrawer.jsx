import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Image,
  Animated,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext.jsx";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getImageUrl } from "../../../utils/imageUtils.js";
import PermissionBlockedModal from "./PermissionBlockedModal.jsx";

const menuItems = [
  {
    id: 1,
    title: "My Properties",
    icon: "business-outline",
    color: "#16a34a",
    screen: "MyProperties",
    permissionKey: "properties",
    aliases: ["property", "property_management"]
  },
  {
    id: 2,
    title: "Room Management",
    icon: "bed-outline",
    color: "#8B5CF6",
    screen: "RoomManagement",
    permissionKey: "rooms",
  },
  {
    id: 3,
    title: "Tenants",
    icon: "people-outline",
    color: "#2196F3",
    screen: "Tenants",
    permissionKey: "tenants",
  },
  {
    id: 4,
    title: "Payments",
    icon: "card-outline",
    color: "#FF9800",
    screen: "Payments",
    permissionKey: "payments",
  },
  {
    id: 5,
    title: "Analytics",
    icon: "bar-chart-outline",
    color: "#9C27B0",
    screen: "Analytics",
    permissionKey: "analytics",
  },
];

const logoutItem = {
  id: 99,
  title: "Logout",
  icon: "log-out-outline",
  color: "#EF4444",
  action: "logout",
};

export default function MenuDrawer({
  visible,
  onClose,
  onMenuItemPress,
  onLogout,
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const drawerWidth = useMemo(() => Math.min(viewportWidth * 0.8, 320), [viewportWidth]);

  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("landlord");
  const [userPermissions, setUserPermissions] = useState({});
  const [userProfileImage, setUserProfileImage] = useState(null);
  const [permissionModal, setPermissionModal] = useState({
    visible: false,
    actionTitle: "",
  });

  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      loadUserData();
      // Slide in from left
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out to left
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -drawerWidth,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, drawerWidth, fadeAnim, slideAnim]);

  const loadUserData = async () => {
    try {
      const userString = await AsyncStorage.getItem("user");
      if (userString) {
        const user = JSON.parse(userString);
        const fullName =
          user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.first_name || user.name || "User";
        setUserName(fullName);
        setUserEmail(user.email || "");
        setUserRole(user.role || "landlord");
        setUserPermissions(user.caretaker_permissions || {});
        setUserProfileImage(getImageUrl(user.profile_image) || null);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const handleItemPress = (item) => {
    if (item.action === "logout") {
      onClose();
      onLogout?.();
      return;
    }

    if (item.permissionKey && !hasPermission(item.permissionKey, item.aliases || [])) {
      setPermissionModal({
        visible: true,
        actionTitle: item.title,
      });
      return;
    }

    onClose();
    if (item.screen) {
      onMenuItemPress?.(item.screen);
    }
  };

  const normalizePermissionValue = (value) => {
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "allowed";
    }
    return Boolean(value);
  };

  const buildPermissionCandidates = (key, aliases = []) => {
    const base = String(key || "").trim();
    const singular = base.endsWith("ies")
      ? `${base.slice(0, -3)}y`
      : base.endsWith("s")
        ? base.slice(0, -1)
        : base;
    const plural = base.endsWith("s")
      ? base
      : singular === "property"
        ? "properties"
        : `${singular}s`;

    const keys = new Set([base, singular, plural, ...aliases]);
    const expanded = [];

    keys.forEach((entry) => {
      if (!entry) return;
      expanded.push(entry, `can_view_${entry}`, `can_manage_${entry}`);
    });

    return expanded;
  };

  const hasPermission = (key, aliases = []) => {
    if (userRole !== "caretaker") return true;
    return buildPermissionCandidates(key, aliases).some((candidate) =>
      normalizePermissionValue(userPermissions?.[candidate]),
    );
  };


  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={modalVisible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      presentationStyle="overFullScreen"
    >
      <View style={styles.fullFlex}>
        {/* Backdrop with fade animation */}
        <Animated.View
          style={[
            styles.menuBackdrop,
            {
              opacity: fadeAnim,
              backgroundColor: "rgba(0,0,0,0.5)",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.fullFlex}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        {/* Drawer with slide animation */}
        <Animated.View
          style={[
            styles.menuDrawer,
            {
              transform: [{ translateX: slideAnim }],
              width: drawerWidth,
              top: insets.top > 0 ? insets.top : 8,
              bottom: insets.bottom > 0 ? insets.bottom : 8,
              borderTopRightRadius: 24,
              borderBottomRightRadius: 24,
              overflow: 'hidden',
            },
          ]}
        >
          {/* Menu Header */}
          <View style={styles.menuHeader}>
            <View style={styles.menuUserInfo}>
              <View style={styles.menuAvatar}>
                {userProfileImage ? (
                  <Image
                    source={{ uri: userProfileImage }}
                    style={{ width: "100%", height: "100%", borderRadius: 999 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons
                    name="person"
                    size={32}
                    color={theme.colors.primary}
                  />
                )}
              </View>
              <View style={styles.userTextContainer}>
                <Text style={styles.menuUserName} numberOfLines={1}>{userName}</Text>
                <Text style={styles.menuUserEmail} numberOfLines={1} ellipsizeMode="tail">{userEmail}</Text>
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor:
                        userRole === "caretaker" ? "#DBEAFE" : "#DCFCE7",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      {
                        color: userRole === "caretaker" ? "#1D4ED8" : "#166534",
                      },
                    ]}
                  >
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView
            style={styles.menuItems}
            showsVerticalScrollIndicator={false}
          >
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleItemPress(item)}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={item.id === 1 ? theme.colors.primary : item.color}
                />
                <Text style={styles.menuItemText}>{item.title}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Logout Button - Fixed at bottom */}
          <TouchableOpacity
            style={styles.logoutItem}
            onPress={() => handleItemPress(logoutItem)}
          >
            <Ionicons
              name={logoutItem.icon}
              size={24}
              color={logoutItem.color}
            />
            <Text style={styles.logoutText}>{logoutItem.title}</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.menuFooter}>
            <Text style={styles.footerText}>AccommoTrack v1.0.0</Text>
          </View>
        </Animated.View>
      </View>
      <PermissionBlockedModal
        visible={permissionModal.visible}
        onClose={() => setPermissionModal({ visible: false, actionTitle: "" })}
        actionTitle={permissionModal.actionTitle}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullFlex: {
    flex: 1,
  },
  menuBackdrop: {
    flex: 1,
  },
  menuDrawer: {
    position: "absolute",
    left: 0,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: "#F0FDF4",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  menuUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  userTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  menuUserName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  menuUserEmail: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  closeButton: {
    padding: 4,
  },
  menuItems: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FEF2F2",
  },
  menuItemText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  logoutText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 15,
    fontWeight: "500",
    color: "#EF4444",
  },
  menuFooter: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
});
