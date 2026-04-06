import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';
import api from '../../../../services/api.js';

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
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

const mapNotification = (notification) => ({
  id: notification.id,
  type: String(notification.type || 'default'),
  title: notification.data?.title || 'Notification',
  message: notification.data?.message || notification.data?.description || '',
  timestamp: notification.created_at,
  read: Boolean(notification.is_read || notification.read_at),
});

const notificationTypeMap = {
  booking: { icon: 'calendar', color: '#2196F3', bg: '#DBEAFE' },
  payment: { icon: 'cash-outline', color: '#16a34a', bg: '#DCFCE7' },
  message: { icon: 'chatbubble-outline', color: '#9C27B0', bg: '#F3E8FF' },
  maintenance: { icon: 'construct-outline', color: '#FF9800', bg: '#FEF3C7' },
  alert: { icon: 'warning-outline', color: '#F44336', bg: '#FEE2E2' },
  move_out_notice: { icon: 'log-out-outline', color: '#EF4444', bg: '#FEE2E2' },
  'App\\Notifications\\LandlordApprovedNotification': { icon: 'checkmark-circle', color: '#16a34a', bg: '#DCFCE7' },
  'App\\Notifications\\LandlordRejectedNotification': { icon: 'close-circle', color: '#EF4444', bg: '#FEE2E2' },
  default: { icon: 'notifications-outline', color: '#6B7280', bg: '#F3F4F6' },
};

export default function NotificationsScreen({ navigation }) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState('');

  const extractNotificationRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    return [];
  };

  const notificationsQuery = useQuery({
    queryKey: landlordQueryKeys.notifications(),
    queryFn: async () => {
      const response = await api.get('/notifications?role=landlord&per_page=200');
      const list = extractNotificationRows(response.data);

      return list.map(mapNotification);
    },
    placeholderData: (previousData) => previousData,
  });

  const notifications = notificationsQuery.data || [];
  const loading = notificationsQuery.isPending && notifications.length === 0;
  const fetchError = notificationsQuery.error?.message || '';
  const refetchNotifications = notificationsQuery.refetch;
  const notificationRefetchers = useMemo(
    () => [refetchNotifications],
    [refetchNotifications],
  );

  useLandlordFocusRefetch({ refetchers: notificationRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: notificationRefetchers,
  });

  const syncNotificationDerivedQueries = async () => {
    await Promise.all([
      refetchLandlordQueries(notificationRefetchers),
      queryClient.invalidateQueries({ queryKey: landlordQueryKeys.unreadNotificationCount() }),
      queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardBundle() }),
    ]);
  };

  const markAsRead = async (id) => {
    const previousState = notifications;

    // Optimistic update
    queryClient.setQueryData(landlordQueryKeys.notifications(), (previousNotifications = []) =>
      previousNotifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      await api.patch(`/notifications/${id}/read`);
      setActionError('');
      await syncNotificationDerivedQueries();
    } catch (error) {
      console.error('Error marking as read:', error);
      queryClient.setQueryData(landlordQueryKeys.notifications(), previousState);
      setActionError('Could not mark that notification as read. Please try again.');
    }
  };

  const markAllAsRead = async () => {
    const previousState = notifications;

    // Optimistic update
    queryClient.setQueryData(landlordQueryKeys.notifications(), (previousNotifications = []) =>
      previousNotifications.map((n) => ({ ...n, read: true }))
    );

    try {
      await api.patch('/notifications/read-all?role=landlord');
      setActionError('');
      await syncNotificationDerivedQueries();
    } catch (error) {
      console.error('Error marking all as read:', error);
      queryClient.setQueryData(landlordQueryKeys.notifications(), previousState);
      setActionError('Could not mark all notifications as read. Please try again.');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

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
        {(fetchError || actionError) && (
          <View
            style={[
              styles.errorBanner,
              {
                borderColor: theme.isDark ? '#7F1D1D' : '#FECACA',
                backgroundColor: theme.isDark ? 'rgba(127,29,29,0.32)' : '#FEF2F2',
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={18} color={theme.isDark ? '#FCA5A5' : '#B91C1C'} />
            <Text style={[styles.errorText, { color: theme.isDark ? '#FCA5A5' : '#B91C1C' }]}> 
              {actionError || fetchError}
            </Text>
            <TouchableOpacity onPress={handleRefresh}>
              <Text style={[styles.errorRetryText, { color: theme.isDark ? '#FCA5A5' : '#B91C1C' }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
          </View>
        ) : (
          notifications.map((notification) => {
            // Map backend types if complex
            let simpleType = 'default';
            if (notification.type.includes('Approved')) simpleType = 'App\\Notifications\\LandlordApprovedNotification';
            else if (notification.type.includes('Rejected')) simpleType = 'App\\Notifications\\LandlordRejectedNotification';
            else if (notification.type.toLowerCase().includes('booking')) simpleType = 'booking';
            else if (notification.type.toLowerCase().includes('payment')) simpleType = 'payment';
            else if (notification.type.toLowerCase().includes('message')) simpleType = 'message';
            else if (notification.type.toLowerCase().includes('maintenance')) simpleType = 'maintenance';
            else if (notification.type.toLowerCase().includes('move_out_notice')) simpleType = 'move_out_notice';
            
            const typeConfig = notificationTypeMap[simpleType] || notificationTypeMap[notification.type] || notificationTypeMap.default;
            
            return (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.notificationUnread,
                ]}
                onPress={() => markAsRead(notification.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: typeConfig.bg }]}>
                  <Ionicons name={typeConfig.icon} size={22} color={typeConfig.color} />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={[styles.notificationTitle, !notification.read && styles.unreadText]}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  <Text style={styles.notificationTime}>
                    {formatRelativeTime(notification.timestamp)}
                  </Text>
                </View>
                {!notification.read && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 16,
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  markAllText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  notificationUnread: {
    backgroundColor: '#F0FDF4',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 16,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  unreadText: {
    fontWeight: '700',
    color: '#111827',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16a34a',
    marginLeft: 8,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  errorRetryText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 10,
  },
});
