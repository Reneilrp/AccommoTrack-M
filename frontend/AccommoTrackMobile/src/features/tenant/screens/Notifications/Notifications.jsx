import React, { useState, useEffect } from "react";
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
import { useQuery } from "@tanstack/react-query";
import api from "../../../../services/api.js";
import { useTheme } from "../../../../contexts/ThemeContext.jsx";
import { logger } from "../../../../utils/logger.js";
import {
  tenantQueryKeys,
  useTenantFocusRefetch,
  useTenantRefreshHandler,
} from "../../hooks/useTenantQueryHelpers.js";

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
  transfer: {
    icon: "swap-horizontal-outline",
    color: theme.colors.warning,
    bg: theme.colors.warningLight,
  },
  addon: {
    icon: "cube-outline",
    color: theme.colors.purple,
    bg: theme.colors.purpleLight,
  },
  extension: {
    icon: "time-outline",
    color: theme.colors.info,
    bg: theme.colors.infoLight,
  },
  move_out: {
    icon: "log-out-outline",
    color: theme.colors.error,
    bg: theme.colors.errorLight,
  },
  maintenance: {
    icon: "construct-outline",
    color: theme.colors.warning,
    bg: theme.colors.warningLight,
  },
  room: {
    icon: "home-outline",
    color: theme.colors.info,
    bg: theme.colors.infoLight,
  },
  tenant: {
    icon: "person-outline",
    color: theme.colors.info,
    bg: theme.colors.infoLight,
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const resolveNotificationType = (rawType = "") => {
  const type = String(rawType || "").toLowerCase();
  if (type.includes("transfer")) return "transfer";
  if (type.includes("move_out")) return "move_out";
  if (type.includes("extension")) return "extension";
  if (type.includes("addon")) return "addon";
  if (type.includes("maintenance")) return "maintenance";
  if (type.includes("message")) return "message";
  if (type.includes("booking")) return "booking";
  if (type.includes("payment") || type.includes("billing") || type === "rent_paid" || type === "cash_payment_verified") return "payment";
  if (type.includes("room")) return "room";
  if (type.includes("tenant")) return "tenant";
  return "default";
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
    unreadOnlyButton: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    unreadOnlyText: {
      fontSize: 12,
      fontWeight: "600",
      marginLeft: 6,
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
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [actionError, setActionError] = useState("");

  const extractNotificationRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    return [];
  };

  const notificationsFeedQuery = useQuery({
    queryKey: tenantQueryKeys.notificationsFeed(),
    queryFn: async () => {
      try {
        const [backendResult, activitiesResult] = await Promise.allSettled([
          api.get("/notifications?role=tenant&per_page=200"),
          api.get("/tenant/dashboard/activities"),
        ]);

        const backendNotifs = backendResult.status === "fulfilled"
          ? extractNotificationRows(backendResult.value?.data)
          : [];
        const notificationItems = backendNotifs.map((n) => ({
          id: `n-${n.id}`,
          _kind: "notification",
          type: resolveNotificationType(n.data?.type || n.type),
          title: n.data?.title || "Notification",
          message: n.data?.message || n.data?.body || "You have a new update.",
          timestamp: n.created_at || new Date().toISOString(),
          read: Boolean(n.is_read || n.read_at),
          raw: n,
        }));

        const rawActivities = activitiesResult.status === "fulfilled"
          ? (activitiesResult.value?.data?.activities || activitiesResult.value?.data || [])
          : [];
        const activityItems = (Array.isArray(rawActivities) ? rawActivities : [])
          .slice(0, 20)
          .map((a) => ({
            id: `a-${a.id || a.timestamp}`,
            _kind: "activity",
            type: resolveNotificationType(a.type),
            title: a.action || "Activity",
            message: a.description || "",
            timestamp: a.timestamp || new Date().toISOString(),
            read: true,
            raw: a,
          }));

        const seen = new Set();
        const items = [...notificationItems, ...activityItems]
          .filter((item) => {
            const uniqueId = `${item._kind}-${item.id}`;
            if (seen.has(uniqueId)) return false;
            seen.add(uniqueId);
            return true;
          })
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        let feedError = "";
        if (backendResult.status !== "fulfilled" && activitiesResult.status !== "fulfilled") {
          feedError = "Unable to load notifications right now. Pull to refresh.";
        } else if (backendResult.status !== "fulfilled") {
          feedError = "Unable to load notifications right now. Pull to refresh.";
        } else if (activitiesResult.status !== "fulfilled") {
          feedError = "Recent activity feed is temporarily unavailable.";
        }

        return {
          items,
          fetchError: feedError,
        };
      } catch (err) {
        logger.warn("Error fetching tenant notifications", err);
        return {
          items: [],
          fetchError: "Unable to load notifications right now. Pull to refresh.",
        };
      }
    },
    placeholderData: (previousData) => previousData,
  });

  const loading = notificationsFeedQuery.isLoading;
  const fetchError = notificationsFeedQuery.data?.fetchError || "";
  const refetchNotificationsFeed = notificationsFeedQuery.refetch;
  const notificationsRefetchers = React.useMemo(
    () => [refetchNotificationsFeed],
    [refetchNotificationsFeed],
  );

  useTenantFocusRefetch({ refetchers: notificationsRefetchers });

  const handleRefresh = useTenantRefreshHandler({
    setRefreshing,
    refetchers: notificationsRefetchers,
  });

  useEffect(() => {
    const incomingItems = notificationsFeedQuery.data?.items;
    if (!Array.isArray(incomingItems)) return;
    setNotifications(incomingItems);
  }, [notificationsFeedQuery.data]);

  const displayedNotifications = notifications.filter((n) => {
    if (filterType === "bookings" && n.type !== "booking") return false;
    if (filterType === "payments" && n.type !== "payment") return false;
    if (unreadOnly && n.read) return false;
    return true;
  });

  const markAsRead = async (id) => {
    if (!id.startsWith("n-")) return;

    const previousState = notifications;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );

    const backendId = id.replace("n-", "");
    try {
      await api.patch(`/notifications/${backendId}/read`);
      setActionError("");
    } catch (err) {
      logger.warn("Failed to mark notification as read", err);
      setNotifications(previousState);
      setActionError("Could not mark that notification as read. Please try again.");
    }
  };

  const markAllAsRead = async () => {
    const previousState = notifications;
    setNotifications((prev) => prev.map((n) => (n.id.startsWith("n-") ? { ...n, read: true } : n)));

    try {
      await api.patch("/notifications/read-all?role=tenant");
      setActionError("");
    } catch (err) {
      logger.warn("Failed to mark all notifications as read", err);
      setNotifications(previousState);
      setActionError("Could not mark all notifications as read. Please try again.");
    }
  };

  const openNotificationTarget = (item) => {
    const type = resolveNotificationType(item?.type);

    if (type === "booking" || type === "move_out" || type === "extension") {
      navigation.navigate("MyBookings");
      return;
    }

    if (type === "payment") {
      navigation.navigate("Payments");
      return;
    }

    if (type === "message") {
      navigation.navigate("Messages");
      return;
    }

    if (type === "transfer") {
      navigation.navigate("ServiceRequests", { initialTab: "Transfers" });
      return;
    }

    if (type === "addon") {
      navigation.navigate("ServiceRequests", { initialTab: "Add-ons" });
      return;
    }

    if (type === "maintenance") {
      navigation.navigate("ServiceRequests", { initialTab: "Maintenance" });
    }
  };

  const handleNotificationPress = (item) => {
    if (item?.id?.startsWith("n-") && !item.read) {
      markAsRead(item.id);
    }

    openNotificationTarget(item);
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
              <Text style={styles.markAllText}>Mark all read</Text>
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

        <TouchableOpacity
          onPress={() => setUnreadOnly((prev) => !prev)}
          style={[
            styles.unreadOnlyButton,
            {
              backgroundColor: unreadOnly
                ? theme.colors.primary
                : theme.colors.surface,
              borderColor: unreadOnly
                ? theme.colors.primary
                : theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name={unreadOnly ? "mail-unread" : "mail-unread-outline"}
            size={14}
            color={unreadOnly ? theme.colors.textInverse : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.unreadOnlyText,
              {
                color: unreadOnly
                  ? theme.colors.textInverse
                  : theme.colors.textSecondary,
              },
            ]}
          >
            Unread only
          </Text>
        </TouchableOpacity>
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
          <TouchableOpacity onPress={refetchNotificationsFeed}>
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
              {unreadOnly ? "No unread notifications." : "You're all caught up!"}
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
                onPress={() => handleNotificationPress(notification)}
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
