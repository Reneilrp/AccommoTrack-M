import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
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
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("landlord");
  const [userPermissions, setUserPermissions] = useState({});
  const [userProfileImage, setUserProfileImage] = useState(null);
  const [permissionModal, setPermissionModal] = useState({
    visible: false,
    actionTitle: "",
  });

  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible]);

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
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.menuDrawer}>
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
                <Text style={styles.menuUserName}>{userName}</Text>
                <Text style={styles.menuUserEmail}>{userEmail}</Text>
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
              <Ionicons name="close" size={28} color="#111827" />
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
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.menuFooter}>
            <Text style={styles.footerText}>AccommoTrack v1.0.0</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
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
  modalOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  menuBackdrop: {
    flex: 1,
  },
  menuDrawer: {
    width: "80%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
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
    marginLeft: 16,
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
    padding: 8,
  },
  menuItems: {
    flex: 1,
    paddingTop: 16,
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
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  logoutText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    fontWeight: "500",
    color: "#EF4444",
  },
  menuFooter: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});
