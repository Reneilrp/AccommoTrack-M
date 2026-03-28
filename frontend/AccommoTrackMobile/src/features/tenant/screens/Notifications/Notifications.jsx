import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  loadPrefsMobile,
  DEFAULT_PREFS,
} from "../../../../shared/notificationPrefs.js";

import BookingService from "../../../../services/BookingService.js";
import PaymentService from "../../../../services/PaymentService.js";
import api from "../../../../services/api.js";
import { useTheme } from "../../../../contexts/ThemeContext.jsx";

const getNotificationTypeMap = (theme) => ({
  booking: {
    icon: "calendar",
    color: theme.colors.info,
    bg: theme.colors.infoLight,
  },
  payment: {
    icon: "card-outline",
    color: theme.colors.success,
    bg: theme.colors.successLight,
  },
  message: {
    icon: "chatbubble-outline",
    color: theme.colors.purple,
    bg: theme.colors.purpleLight,
  },
  default: {
    icon: "notifications-outline",
    color: theme.colors.textTertiary,
    bg: theme.colors.backgroundTertiary,
  },
});

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) return `${diffMinutes || 1}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      justifyContent: "space-between",
    },
    backButton: { width: 80, alignItems: "flex-start" },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textInverse,
      textAlign: "center",
    },
    headerSide: { width: 80, alignItems: "flex-end" },
    markAllButton: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 16,
    },
    markAllText: {
      color: theme.colors.textInverse,
      fontSize: 12,
      fontWeight: "600",
    },
    scrollView: { flex: 1 },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 80,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
    },
    notificationItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    notificationContent: { flex: 1, marginLeft: 16 },
    notificationTitle: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.colors.text,
    },
    notificationMessage: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    notificationTime: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 8,
    },
    unreadDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
    filterBar: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    segmented: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      overflow: "hidden",
      marginBottom: 8,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: "600",
    },
    errorBanner: {
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 6,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
    },
    errorText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "500",
      marginLeft: 8,
    },
    errorRetryText: {
      fontSize: 12,
      fontWeight: "700",
      marginLeft: 10,
    },
  });

export default function TenantNotifications({ navigation }) {
  const { theme } = useTheme();
  const notificationTypeMap = getNotificationTypeMap(theme);
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS });
  const [fetchError, setFetchError] = useState("");
  const [actionError, setActionError] = useState("");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setFetchError("");

    try {
      const [backendResult, bookingsResult, paymentsResult] =
        await Promise.allSettled([
          api.get("/notifications?role=tenant"),
          BookingService.getMyBookings(),
          PaymentService.getPayments(),
        ]);

      const items = [];
      let failedSources = 0;

      if (backendResult.status === "fulfilled") {
        const backendPayload =
          backendResult.value?.data?.data || backendResult.value?.data || [];
        const backendNotifs = Array.isArray(backendPayload) ? backendPayload : [];

        backendNotifs.forEach((n) => {
          items.push({
            id: `n-${n.id}`,
            type: n.data?.type || "default",
            title: n.data?.title || "Notification",
            message: n.data?.message || "",
            timestamp: n.created_at || new Date().toISOString(),
            read: !!n.read_at,
            raw: n,
          });
        });
      } else {
        failedSources += 1;
      }

      if (bookingsResult.status === "fulfilled") {
        const bookingsRes = bookingsResult.value;
        if (bookingsRes?.success && Array.isArray(bookingsRes.data)) {
          bookingsRes.data.forEach((b) => {
            items.push({
              id: `b-${b.id}`,
              type: "booking",
              title: `Booking ${b.reference || b.id}`,
              message: `Status: ${b.status}`,
              timestamp: b.updated_at || b.created_at || new Date().toISOString(),
              read: b.status === "confirmed" || b.status === "cancelled",
              raw: b,
            });
          });
        } else {
          failedSources += 1;
        }
      } else {
        failedSources += 1;
      }

      if (paymentsResult.status === "fulfilled") {
        const paymentsRes = paymentsResult.value;
        if (paymentsRes?.success && Array.isArray(paymentsRes.data)) {
          paymentsRes.data.forEach((p) => {
            items.push({
              id: `p-${p.id}`,
              type: "payment",
              title: `Invoice ${p.invoice_reference || p.id}`,
              message: `Payment status: ${p.status}`,
              timestamp: p.updated_at || p.created_at || new Date().toISOString(),
              read: p.status === "paid",
              raw: p,
            });
          });
        } else {
          failedSources += 1;
        }
      } else {
        failedSources += 1;
      }

      if (failedSources > 0) {
        setFetchError(
          failedSources === 3
            ? "Unable to load notifications right now. Pull to refresh."
            : "Some notification data could not be loaded. Pull to refresh.",
        );
      }

      items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setNotifications(items);
    } catch (err) {
      console.warn("Error fetching tenant notifications", err);
      setFetchError("Unable to load notifications right now. Pull to refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    (async () => {
      try {
        const next = await loadPrefsMobile(AsyncStorage);
        setPrefs(next);
      } catch (e) {
        console.warn("Load prefs error", e);
      }
    })();
  }, []);

  const displayedNotifications = notifications.filter((n) => {
    if (filterType === "bookings" && n.type !== "booking") return false;
    if (filterType === "payments" && n.type !== "payment") return false;
    if (n.type === "booking" && prefs.email_booking === false) return false;
    if (n.type === "payment" && prefs.email_payment === false) return false;
    if (n.type === "message" && prefs.push_messages === false) return false;
    return true;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (id) => {
    const previousState = notifications;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );

    if (!id.startsWith("n-")) return;

    const backendId = id.replace("n-", "");
    try {
      await api.patch(`/notifications/${backendId}/read`);
      setActionError("");
    } catch (err) {
      console.warn("Failed to mark notification as read", err);
      setNotifications(previousState);
      setActionError("Could not mark that notification as read. Please try again.");
    }
  };

  const markAllAsRead = async () => {
    const previousState = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await api.patch("/notifications/read-all?role=tenant");
      setActionError("");
    } catch (err) {
      console.warn("Failed to mark all notifications as read", err);
      setNotifications(previousState);
      setActionError("Could not mark all notifications as read. Please try again.");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.primary}
        />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={[styles.loadingText, { color: theme.colors.textSecondary }]}
        >
          Loading notifications...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.primary}
      />

      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}> 
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.textInverse }]}> 
          Notifications
        </Text>

        <View style={styles.headerSide}>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Mark all</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </View>

      <View
        style={[
          styles.filterBar,
          {
            backgroundColor: theme.colors.backgroundSecondary,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View
          style={[styles.segmented, { backgroundColor: theme.colors.surface }]}
        >
          <TouchableOpacity
            onPress={() => setFilterType("all")}
            style={[
              styles.segmentButton,
              filterType === "all" && { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    filterType === "all"
                      ? theme.colors.textInverse
                      : theme.colors.textSecondary,
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterType("bookings")}
            style={[
              styles.segmentButton,
              filterType === "bookings" && {
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    filterType === "bookings"
                      ? theme.colors.textInverse
                      : theme.colors.textSecondary,
                },
              ]}
            >
              Bookings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterType("payments")}
            style={[
              styles.segmentButton,
              filterType === "payments" && {
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    filterType === "payments"
                      ? theme.colors.textInverse
                      : theme.colors.textSecondary,
                },
              ]}
            >
              Payments
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {(fetchError || actionError) && (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: theme.isDark ? "rgba(127,29,29,0.25)" : "#FEF2F2",
              borderColor: theme.isDark ? "#7F1D1D" : "#FCA5A5",
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color={theme.isDark ? "#FCA5A5" : "#B91C1C"}
          />
          <Text
            style={[
              styles.errorText,
              { color: theme.isDark ? "#FCA5A5" : "#B91C1C" },
            ]}
          >
            {actionError || fetchError}
          </Text>
          <TouchableOpacity onPress={fetchNotifications}>
            <Text
              style={[
                styles.errorRetryText,
                { color: theme.isDark ? "#FCA5A5" : "#B91C1C" },
              ]}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {displayedNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color={theme.colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}> 
              No notifications
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              You're all caught up!
            </Text>
          </View>
        ) : (
          displayedNotifications.map((notification) => {
            const typeConfig =
              notificationTypeMap[notification.type] ||
              notificationTypeMap.default;

            return (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  {
                    backgroundColor: theme.colors.surface,
                    borderBottomColor: theme.colors.border,
                  },
                  !notification.read && {
                    backgroundColor: theme.isDark
                      ? theme.colors.brand900
                      : theme.colors.successLight,
                  },
                ]}
                onPress={() => markAsRead(notification.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: typeConfig.bg },
                  ]}
                >
                  <Ionicons
                    name={typeConfig.icon}
                    size={22}
                    color={typeConfig.color}
                  />
                </View>

                <View style={styles.notificationContent}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      { color: theme.colors.text },
                      !notification.read && {
                        fontWeight: "700",
                        color: theme.colors.text,
                      },
                    ]}
                  >
                    {notification.title}
                  </Text>
                  <Text
                    style={[
                      styles.notificationMessage,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {notification.message}
                  </Text>
                  <Text
                    style={[
                      styles.notificationTime,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    {formatRelativeTime(notification.timestamp)}
                  </Text>
                </View>

                {!notification.read && (
                  <View
                    style={[
                      styles.unreadDot,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
