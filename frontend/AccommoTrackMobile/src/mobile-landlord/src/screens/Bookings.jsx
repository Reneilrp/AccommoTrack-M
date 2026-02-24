import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import PropertyService from '../../../services/PropertyServices';
import { styles } from '../../../styles/Landlord/Bookings.js';

const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

const STATUS_BADGES = {
  pending: { bg: '#FEF3C7', color: '#B45309', label: 'Pending' },
  confirmed: { bg: '#DCFCE7', color: '#15803D', label: 'Confirmed' },
  completed: { bg: '#E0F2FE', color: '#0369A1', label: 'Completed' },
  'partial-completed': { bg: '#FEF3C7', color: '#B45309', label: 'Partial Complete' },
  cancelled: { bg: '#FEE2E2', color: '#B91C1C', label: 'Cancelled' }
};

const PAYMENT_BADGES = {
  paid: { bg: '#DCFCE7', color: '#15803D', label: 'Paid' },
  partial: { bg: '#FEF3C7', color: '#B45309', label: 'Partial' },
  unpaid: { bg: '#FEE2E2', color: '#B91C1C', label: 'Unpaid' },
  refunded: { bg: '#EDE9FE', color: '#6D28D9', label: 'Refunded' }
};

const DEFAULT_STATS = { total: 0, confirmed: 0, pending: 0, completed: 0 };

const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString('en-PH')}`;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function BookingsScreen({ navigation }) {
  const { theme } = useTheme();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelForm, setCancelForm] = useState({ reason: '', shouldRefund: false, refundAmount: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const response = await PropertyService.getBookingStats();
      if (!response.success) throw new Error(response.error || 'Failed to load stats');
      setStats({
        total: response.data?.total ?? 0,
        confirmed: response.data?.confirmed ?? 0,
        pending: response.data?.pending ?? 0,
        completed: response.data?.completed ?? 0
      });
    } catch (err) {
      console.warn('stats error', err.message);
    }
  }, []);

  const loadBookings = useCallback(
    async (fromRefresh = false) => {
      try {
        fromRefresh ? setRefreshing(true) : setLoading(true);
        setError('');
        const response = await PropertyService.getBookings();
        if (!response.success) throw new Error(response.error || 'Failed to load bookings');
        const list = Array.isArray(response.data) ? response.data : response.data?.data || [];
        setBookings(list);
      } catch (err) {
        setError(err.message || 'Unable to load bookings');
        setBookings([]);
      } finally {
        fromRefresh ? setRefreshing(false) : setLoading(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadBookings();
      loadStats();
    }, [loadBookings, loadStats])
  );

  const handleRefresh = () => {
    loadBookings(true);
    loadStats();
  };

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (filter !== 'all' && booking.status !== filter) return false;
      if (!query) return true;
      const haystack = [
        booking.guestName,
        booking.email,
        booking.propertyTitle,
        booking.roomType,
        booking.roomNumber?.toString(),
        booking.bookingReference
      ]
        .filter(Boolean)
        .map((field) => field.toLowerCase());
      return haystack.some((field) => field.includes(query));
    });
  }, [bookings, filter, searchQuery]);

  const openDetailModal = (booking) => {
    setSelectedBooking(booking);
    setDetailVisible(true);
  };

  const closeDetailModal = () => {
    setSelectedBooking(null);
    setDetailVisible(false);
  };

  const openCancelModal = (booking) => {
    setSelectedBooking(booking);
    setCancelForm({ reason: '', shouldRefund: false, refundAmount: booking.amount?.toString() || '' });
    setCancelVisible(true);
  };

  const closeCancelModal = () => {
    setCancelVisible(false);
    setCancelForm({ reason: '', shouldRefund: false, refundAmount: '' });
  };

  const updateSelectedBooking = (updated) => {
    setBookings((prev) => prev.map((booking) => (booking.id === updated.id ? { ...booking, ...updated } : booking)));
    setSelectedBooking((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
  };

  const handleBookingStatus = async (status, extra = {}) => {
    if (!selectedBooking) return;
    try {
      setActionLoading(true);
      const response = await PropertyService.updateBookingStatus(selectedBooking.id, { status, ...extra });
      if (!response.success) throw new Error(response.error || 'Unable to update status');
      await loadBookings();
      await loadStats();
      updateSelectedBooking({ status, ...response.data?.booking });
      if (status === 'cancelled') closeDetailModal();
    } catch (err) {
      Alert.alert('Booking', err.message || 'Unable to update booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaymentChange = async (paymentStatus) => {
    if (!selectedBooking) return;
    try {
      setActionLoading(true);
      const response = await PropertyService.updateBookingPayment(selectedBooking.id, { payment_status: paymentStatus });
      if (!response.success) throw new Error(response.error || 'Unable to update payment');
      await loadBookings();
      await loadStats();
      updateSelectedBooking({ paymentStatus });
    } catch (err) {
      Alert.alert('Payment', err.message || 'Unable to update payment');
    } finally {
      setActionLoading(false);
    }
  };

  const submitCancellation = () => {
    if (!cancelForm.reason.trim()) {
      Alert.alert('Cancellation', 'Provide a reason before cancelling.');
      return;
    }
    const payload = {
      status: 'cancelled',
      cancellation_reason: cancelForm.reason,
      should_refund: cancelForm.shouldRefund,
      refund_amount: cancelForm.shouldRefund ? Number(cancelForm.refundAmount) || 0 : 0
    };
    handleBookingStatus('cancelled', payload);
    closeCancelModal();
  };

  const renderBookingCard = ({ item }) => {
    const statusBadge = STATUS_BADGES[item.status] || STATUS_BADGES.pending;
    const paymentBadge = PAYMENT_BADGES[item.paymentStatus] || PAYMENT_BADGES.unpaid;
    const initials = item.guestName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2);

    return (
      <TouchableOpacity style={styles.bookingCard} onPress={() => openDetailModal(item)}>
        <View style={styles.cardTop}>
          <View style={styles.guestBlock}>
            <View style={styles.guestAvatar}>
              <Text style={styles.guestAvatarText}>{initials || 'GN'}</Text>
            </View>
            <View>
              <Text style={styles.guestName}>{item.guestName}</Text>
              <Text style={styles.guestEmail}>{item.email}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }] }>
            <Text style={[styles.statusText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="home-outline" size={16} color="#94A3B8" />
          <Text style={styles.detailText}>{item.propertyTitle}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="bed-outline" size={16} color="#94A3B8" />
          <Text style={styles.detailText}>Room {item.roomNumber} • {item.roomType}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
          <Text style={styles.detailText}>{formatDate(item.checkIn)} - {formatDate(item.checkOut)}</Text>
        </View>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.metaLabel}>Total Amount</Text>
            <Text style={styles.metaValue}>{formatCurrency(item.amount)}</Text>
          </View>
          <View style={[styles.paymentBadge, { backgroundColor: paymentBadge.bg }]}>
            <Text style={[styles.paymentText, { color: paymentBadge.color }]}>{paymentBadge.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Bookings</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Confirmed</Text>
          <Text style={styles.statValue}>{stats.confirmed}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={styles.statValue}>{stats.pending}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statValue}>{stats.completed}</Text>
        </View>
      </ScrollView>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search guest, property, room, or reference"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading && bookings.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.centerText}>Loading bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={styles.heroHeader}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.heroTitle}>Bookings</Text>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={() => navigation.navigate('AddBooking')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        renderItem={renderBookingCard}
        ListHeaderComponent={listHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No bookings found</Text>
            <Text style={styles.emptySubtitle}>Bookings will appear here when guests reserve rooms.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Detail Modal */}
      <Modal visible={detailVisible} animationType="slide" onRequestClose={closeDetailModal}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Booking Details</Text>
            <TouchableOpacity onPress={closeDetailModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          {selectedBooking ? (
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Timeline - Blue themed like web */}
              <View style={styles.timelineCard}>
                <View style={styles.timelineItem}>
                  <Text style={styles.timelineLabelBlue}>CHECK-IN</Text>
                  <Text style={styles.timelineValueBlue}>{formatDate(selectedBooking.checkIn)}</Text>
                </View>
                <Text style={styles.timelineArrow}>→</Text>
                <View style={styles.timelineItemCenter}>
                  <Text style={styles.timelineLabelBlue}>DURATION</Text>
                  <Text style={styles.timelineValueBlue}>{selectedBooking.duration || '1 month'}</Text>
                </View>
                <Text style={styles.timelineArrow}>→</Text>
                <View style={styles.timelineItemEnd}>
                  <Text style={styles.timelineLabelBlue}>CHECK-OUT</Text>
                  <Text style={styles.timelineValueBlue}>{formatDate(selectedBooking.checkOut)}</Text>
                </View>
              </View>

              {/* Status Badges Row */}
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusItemLabel}>Booking Status</Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: (STATUS_BADGES[selectedBooking.status] || STATUS_BADGES.pending).bg }]}>
                    <Text style={[styles.statusBadgeText, { color: (STATUS_BADGES[selectedBooking.status] || STATUS_BADGES.pending).color }]}>
                      {(STATUS_BADGES[selectedBooking.status] || STATUS_BADGES.pending).label}
                    </Text>
                  </View>
                </View>
                <View style={styles.statusItem}>
                  <Text style={styles.statusItemLabel}>Payment Status</Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: (PAYMENT_BADGES[selectedBooking.paymentStatus] || PAYMENT_BADGES.unpaid).bg }]}>
                    <Text style={[styles.statusBadgeText, { color: (PAYMENT_BADGES[selectedBooking.paymentStatus] || PAYMENT_BADGES.unpaid).color }]}>
                      {(PAYMENT_BADGES[selectedBooking.paymentStatus] || PAYMENT_BADGES.unpaid).label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Guest Information */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>Guest Information</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Name</Text>
                    <Text style={styles.infoValue}>{selectedBooking.guestName}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValueSmall}>{selectedBooking.email}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{selectedBooking.phone || '—'}</Text>
                  </View>
                </View>
              </View>

              {/* Booking Information */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>Booking Information</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Reference</Text>
                    <Text style={styles.referenceValue}>{selectedBooking.bookingReference}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Property</Text>
                    <Text style={styles.infoValue}>{selectedBooking.propertyTitle}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Room</Text>
                    <Text style={styles.infoValue}>Room {selectedBooking.roomNumber} - {selectedBooking.roomType}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Monthly Rent</Text>
                    <Text style={styles.infoValue}>{formatCurrency(selectedBooking.monthlyRent || selectedBooking.amount)}</Text>
                  </View>
                </View>
                <View style={styles.totalAmountBox}>
                  <Text style={styles.totalAmountLabel}>Total Amount</Text>
                  <Text style={styles.totalAmountValue}>{formatCurrency(selectedBooking.amount)}</Text>
                </View>
              </View>

              {/* Update Payment Status */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>Update Payment Status</Text>
                <View style={styles.paymentPillRow}>
                  {['unpaid', 'partial', 'paid', 'refunded'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.paymentPill, selectedBooking.paymentStatus === status && styles.paymentPillActive]}
                      onPress={() => handlePaymentChange(status)}
                      disabled={actionLoading}
                    >
                      <Text style={[styles.paymentPillText, selectedBooking.paymentStatus === status && styles.paymentPillTextActive]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Booking Actions */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>Booking Actions</Text>
                <View style={styles.actionButtonsRow}>
                  {selectedBooking.status === 'pending' && (
                    <>
                      <TouchableOpacity style={styles.confirmBtnFull} onPress={() => handleBookingStatus('confirmed')} disabled={actionLoading}>
                        {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.confirmBtnText}>Confirm Booking</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtnFull} onPress={() => openCancelModal(selectedBooking)}>
                        <Text style={styles.rejectBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedBooking.status === 'confirmed' && (
                    <>
                      <TouchableOpacity style={styles.completeBtnFull} onPress={() => handleBookingStatus('completed')} disabled={actionLoading}>
                        {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.completeBtnText}>Complete</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cancelRefundBtnFull} onPress={() => openCancelModal(selectedBooking)}>
                        <Text style={styles.cancelRefundBtnText}>Cancel & Refund</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedBooking.status === 'completed' && (
                    <TouchableOpacity style={styles.cancelRefundBtnFull} onPress={() => openCancelModal(selectedBooking)}>
                      <Text style={styles.cancelRefundBtnText}>Cancel & Refund</Text>
                    </TouchableOpacity>
                  )}
                  {selectedBooking.status === 'cancelled' && (
                    <View style={styles.cancelledNote}>
                      <Text style={styles.cancelledNoteText}>This booking has been cancelled.</Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* Cancel Modal */}
      <Modal visible={cancelVisible} animationType="slide" onRequestClose={closeCancelModal}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cancel Booking</Text>
            <TouchableOpacity onPress={closeCancelModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.sectionTitle}>Reason</Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              multiline
              placeholder="Explain why this booking is cancelled"
              value={cancelForm.reason}
              onChangeText={(text) => setCancelForm((prev) => ({ ...prev, reason: text }))}
            />
            <View style={styles.switchRow}>
              <Text style={styles.detailLabel}>Refund payment?</Text>
                <Switch
                value={cancelForm.shouldRefund}
                onValueChange={(value) => setCancelForm((prev) => ({ ...prev, shouldRefund: value }))}
                trackColor={{ true: '#86EFAC', false: '#CBD5F5' }}
                thumbColor={cancelForm.shouldRefund ? theme.colors.primary : '#FFFFFF'}
              />
            </View>
            {cancelForm.shouldRefund ? (
              <>
                <Text style={styles.sectionTitle}>Refund Amount</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={cancelForm.refundAmount}
                  onChangeText={(text) => setCancelForm((prev) => ({ ...prev, refundAmount: text }))}
                />
              </>
            ) : null}
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.goBackBtn} onPress={closeCancelModal}>
              <Text style={styles.goBackBtnText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={submitCancellation}>
              <Text style={styles.confirmCancelBtnText}>Confirm Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

