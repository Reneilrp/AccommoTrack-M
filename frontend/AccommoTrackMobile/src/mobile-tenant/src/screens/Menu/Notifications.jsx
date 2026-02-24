import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadPrefsMobile, DEFAULT_PREFS } from '../../../../shared/notificationPrefs';
import { StyleSheet } from 'react-native';

import BookingServices from '../../../../services/BookingServices.js';
import PaymentService from '../../../../services/PaymentService.js';
import { useTheme } from '../../../../contexts/ThemeContext';

const getNotificationTypeMap = (theme) => ({
  booking: { icon: 'calendar', color: theme.colors.info, bg: theme.colors.infoLight },
  payment: { icon: 'card-outline', color: theme.colors.success, bg: theme.colors.successLight },
  message: { icon: 'chatbubble-outline', color: theme.colors.purple, bg: theme.colors.purpleLight },
  default: { icon: 'notifications-outline', color: theme.colors.textTertiary, bg: theme.colors.backgroundTertiary },
});

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


export default function TenantNotifications({ navigation }) {
  const { theme } = useTheme();
  const notificationTypeMap = getNotificationTypeMap(theme);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'bookings' | 'payments'
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsRes, paymentsRes] = await Promise.all([
        BookingServices.getMyBookings(),
        PaymentService.getMyPayments(),
      ]);

      const items = [];

      if (bookingsRes.success && Array.isArray(bookingsRes.data)) {
        bookingsRes.data.forEach((b) => {
          items.push({
            id: `b-${b.id}`,
            type: 'booking',
            title: `Booking ${b.reference || b.id}`,
            message: `Status: ${b.status}`,
            timestamp: b.updated_at || b.created_at || new Date().toISOString(),
            read: b.status === 'confirmed' || b.status === 'cancelled',
            raw: b,
          });
        });
      }

      if (paymentsRes.success && Array.isArray(paymentsRes.data)) {
        paymentsRes.data.forEach((p) => {
          items.push({
            id: `p-${p.id}`,
            type: 'payment',
            title: `Invoice ${p.invoice_reference || p.id}`,
            message: `Payment status: ${p.status}`,
            timestamp: p.updated_at || p.created_at || new Date().toISOString(),
            read: p.status === 'paid',
            raw: p,
          });
        });
      }

      // Sort latest first
      items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setNotifications(items);
    } catch (err) {
      console.warn('Error fetching tenant notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // derive displayed notifications using filters and user preferences
  const displayedNotifications = notifications.filter((n) => {
    // type filter
    if (filterType === 'bookings' && n.type !== 'booking') return false;
    if (filterType === 'payments' && n.type !== 'payment') return false;

    // Respect saved preferences: hide types user disabled
    if (n.type === 'booking' && prefs.email_booking === false) return false;
    if (n.type === 'payment' && prefs.email_payment === false) return false;
    if (n.type === 'message' && prefs.push_messages === false) return false;

    return true;
  });

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // load saved notification preferences and apply to feed
  useEffect(() => {
    (async () => {
      try {
        const next = await loadPrefsMobile(AsyncStorage);
        setPrefs(next);
      } catch (e) {
        console.warn('Load prefs error', e);
      }
    })();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAsRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={[ 'top' ]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textInverse }]}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => setNotifications((prev) => prev.map(n => ({...n, read: true})))} style={[styles.markAllButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={[styles.markAllText, { color: theme.colors.textInverse }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter bar: type + date range */}
      <View style={[styles.filterBar, { backgroundColor: theme.colors.backgroundSecondary, borderBottomColor: theme.colors.border }]}>
        <View style={[styles.segmented, { backgroundColor: theme.colors.surface }]}> 
          <TouchableOpacity onPress={() => setFilterType('all')} style={[styles.segmentButton, filterType === 'all' && { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.segmentText, { color: filterType === 'all' ? theme.colors.textInverse : theme.colors.textSecondary }]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterType('bookings')} style={[styles.segmentButton, filterType === 'bookings' && { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.segmentText, { color: filterType === 'bookings' ? theme.colors.textInverse : theme.colors.textSecondary }]}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterType('payments')} style={[styles.segmentButton, filterType === 'payments' && { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.segmentText, { color: filterType === 'payments' ? theme.colors.textInverse : theme.colors.textSecondary }]}>Payments</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* DatePicker removed — only type filter remains. */}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
        }
      >
        {displayedNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No notifications</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>You're all caught up!</Text>
          </View>
        ) : (
          displayedNotifications.map((notification) => {
            const typeConfig = notificationTypeMap[notification.type] || notificationTypeMap.default;
            return (
              <TouchableOpacity
                key={notification.id}
                style={[styles.notificationItem, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }, !notification.read && { backgroundColor: theme.colors.successLight }]}
                onPress={() => markAsRead(notification.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: typeConfig.bg }]}>
                  <Ionicons name={typeConfig.icon} size={22} color={typeConfig.color} />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={[styles.notificationTitle, { color: theme.colors.text }, !notification.read && { fontWeight: '700', color: theme.colors.text }]}>{notification.title}</Text>
                  <Text style={[styles.notificationMessage, { color: theme.colors.textSecondary }]}>{notification.message}</Text>
                  <Text style={[styles.notificationTime, { color: theme.colors.textTertiary }]}>{formatRelativeTime(notification.timestamp)}</Text>
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginLeft: 12 },
  markAllButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16 },
  markAllText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  scrollView: { flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  notificationItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  notificationUnread: { backgroundColor: '#F0FDF4' },
  iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  notificationContent: { flex: 1, marginLeft: 12 },
  notificationTitle: { fontSize: 15, fontWeight: '500', color: '#374151' },
  unreadText: { fontWeight: '700', color: '#111827' },
  notificationMessage: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  notificationTime: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  filterBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EEF6',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
  },
  segmentText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  dateButtonText: {
    fontSize: 13,
    color: '#374151',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

