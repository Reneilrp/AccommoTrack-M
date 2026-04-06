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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';
import PropertyService from '../../../../services/PropertyService.js';
import { getStyles } from '../../../../styles/Landlord/Bookings.js';

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
const EMPTY_BOOKINGS = [];
const EMPTY_REQUESTS = [];

const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString('en-US')}`;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function BookingsScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelForm, setCancelForm] = useState({ reason: '', shouldRefund: false, refundAmount: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const [settlementHistory, setSettlementHistory] = useState([]);
  const [settlementHistoryLoading, setSettlementHistoryLoading] = useState(false);
  const [submittingSettlement, setSubmittingSettlement] = useState(false);
  const [pendingFocusBookingId, setPendingFocusBookingId] = useState(null);
  const [settlementForm, setSettlementForm] = useState({
    damageFee: '',
    cleaningFee: '',
    otherFee: '',
    markRefunded: false,
    refundMethod: '',
    refundReference: '',
    note: ''
  });

  const bookingsQuery = useQuery({
    queryKey: landlordQueryKeys.bookings(),
    queryFn: async () => {
      const response = await PropertyService.getBookings();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load bookings');
      }

      const list = response.data;
      if (Array.isArray(list)) return list;
      if (Array.isArray(list?.data)) return list.data;
      return EMPTY_BOOKINGS;
    },
    placeholderData: (previousData) => previousData,
  });

  const statsQuery = useQuery({
    queryKey: landlordQueryKeys.bookingStats(),
    queryFn: async () => {
      const response = await PropertyService.getBookingStats();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load booking stats');
      }

      return {
        total: response.data?.total ?? 0,
        confirmed: response.data?.confirmed ?? 0,
        pending: response.data?.pending ?? 0,
        completed: response.data?.completed ?? 0,
      };
    },
    placeholderData: (previousData) => previousData,
  });

  const extensionRequestsQuery = useQuery({
    queryKey: landlordQueryKeys.extensionRequests(),
    queryFn: async () => {
      const response = await PropertyService.getExtensionRequests();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load extension requests');
      }

      return Array.isArray(response.data) ? response.data : EMPTY_REQUESTS;
    },
    placeholderData: (previousData) => previousData,
  });

  const bookings = bookingsQuery.data || EMPTY_BOOKINGS;
  const stats = statsQuery.data || DEFAULT_STATS;
  const extensionRequests = extensionRequestsQuery.data || EMPTY_REQUESTS;
  const loading = bookingsQuery.isPending && bookings.length === 0;
  const loadingExtensions = extensionRequestsQuery.isPending && extensionRequests.length === 0;
  const error = bookingsQuery.error?.message || statsQuery.error?.message || '';

  const refetchBookings = bookingsQuery.refetch;
  const refetchStats = statsQuery.refetch;
  const refetchExtensionRequests = extensionRequestsQuery.refetch;
  const bookingRefetchers = useMemo(
    () => [refetchBookings, refetchStats, refetchExtensionRequests],
    [refetchBookings, refetchStats, refetchExtensionRequests],
  );

  useLandlordFocusRefetch({ refetchers: bookingRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: bookingRefetchers,
  });

  const resetSettlementState = () => {
    setSettlementHistory([]);
    setSettlementHistoryLoading(false);
    setSubmittingSettlement(false);
    setSettlementForm({
      damageFee: '',
      cleaningFee: '',
      otherFee: '',
      markRefunded: false,
      refundMethod: '',
      refundReference: '',
      note: ''
    });
  };

  useEffect(() => {
    const requestedFilter = route?.params?.filter;
    const requestedSearch = route?.params?.searchQuery;
    const focusBookingId = route?.params?.focusBookingId;

    if (requestedFilter && FILTERS.includes(requestedFilter)) {
      setFilter(requestedFilter);
    }

    if (typeof requestedSearch === 'string') {
      setSearchQuery(requestedSearch);
    }

    if (focusBookingId) {
      setPendingFocusBookingId(String(focusBookingId));
    }
  }, [route?.params?.filter, route?.params?.searchQuery, route?.params?.focusBookingId, route?.params?.drilldownToken]);

  const updateBookingsCache = useCallback(
    (updater) => {
      queryClient.setQueryData(landlordQueryKeys.bookings(), (current = EMPTY_BOOKINGS) => {
        const list = Array.isArray(current) ? current : EMPTY_BOOKINGS;
        return updater(list);
      });
    },
    [queryClient],
  );

  const handleExtensionRequestAction = async (requestId, action) => {
    try {
      setRequestActionLoading(true);
      const response = await PropertyService.handleExtensionRequest(requestId, { action });
      if (!response.success) throw new Error(response.error || 'Unable to update extension request');
      setActionError('');
      await refetchLandlordQueries([refetchExtensionRequests]);
      Alert.alert('Extension Request', `Request ${action}d successfully.`);
    } catch (err) {
      setActionError(err.message || 'Unable to process extension request');
      Alert.alert('Extension Request', err.message || 'Unable to process extension request');
    } finally {
      setRequestActionLoading(false);
    }
  };

  const renderExtensionRequestCard = (item) => {
    const tenantName = item.tenant?.full_name || [item.tenant?.first_name, item.tenant?.last_name].filter(Boolean).join(' ') || 'Tenant';
    return (
      <View key={`ext-${item.id}`} style={styles.requestCard}>
        <View style={styles.requestCardTop}>
          <Text style={styles.requestTitle}>{tenantName}</Text>
          <Text style={styles.requestStatus}>{item.status || 'pending'}</Text>
        </View>
        <Text style={styles.requestSubtitle}>
          Room {item.booking?.room?.room_number || '—'} • {item.booking?.room?.property?.title || 'Property'}
        </Text>
        <Text style={styles.requestMeta}>Current End: {formatDate(item.current_end_date)}</Text>
        <Text style={styles.requestMeta}>Requested End: {formatDate(item.requested_end_date)}</Text>
        <Text style={styles.requestMeta}>Fee: {formatCurrency(item.proposed_amount || 0)}</Text>
        {item.status === 'pending' ? (
          <View style={styles.requestActionsRow}>
            <TouchableOpacity
              style={styles.requestApproveBtn}
              disabled={requestActionLoading}
              onPress={() => handleExtensionRequestAction(item.id, 'approve')}
            >
              <Text style={styles.requestApproveText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.requestRejectBtn}
              disabled={requestActionLoading}
              onPress={() => handleExtensionRequestAction(item.id, 'reject')}
            >
              <Text style={styles.requestRejectText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
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

  const fetchSettlementHistory = useCallback(async (bookingId, showErrors = true) => {
    try {
      setSettlementHistoryLoading(true);
      const response = await PropertyService.getBookingDepositSettlements(bookingId);
      if (!response.success) throw new Error(response.error || 'Unable to fetch settlement history');

      const payload = response.data || {};
      const nextBalance = Number(payload.deposit_balance || 0);
      const history = Array.isArray(payload.settlements) ? payload.settlements : [];

      setSettlementHistory(history);
      updateBookingsCache((prev) => prev.map((booking) => (
        booking.id === bookingId ? { ...booking, deposit_balance: nextBalance } : booking
      )));
      setSelectedBooking((prev) => (
        prev && prev.id === bookingId ? { ...prev, deposit_balance: nextBalance } : prev
      ));
    } catch (err) {
      if (showErrors) {
        Alert.alert('Deposit Settlement', err.message || 'Unable to fetch settlement history.');
      }
    } finally {
      setSettlementHistoryLoading(false);
    }
  }, [updateBookingsCache]);

  useEffect(() => {
    if (!pendingFocusBookingId || bookings.length === 0) return;

    const targetBooking = bookings.find((booking) => String(booking.id) === String(pendingFocusBookingId));
    if (!targetBooking) return;

    setSelectedBooking(targetBooking);
    setDetailVisible(true);
    resetSettlementState();
    fetchSettlementHistory(targetBooking.id, false);
    setPendingFocusBookingId(null);

    if (typeof navigation?.setParams === 'function') {
      navigation.setParams({
        focusBookingId: undefined,
      });
    }
  }, [bookings, pendingFocusBookingId, navigation, fetchSettlementHistory]);

  const openDetailModal = (booking) => {
    setSelectedBooking(booking);
    setDetailVisible(true);
    resetSettlementState();
    fetchSettlementHistory(booking.id, false);
  };

  const closeDetailModal = () => {
    setSelectedBooking(null);
    setDetailVisible(false);
    resetSettlementState();
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
    updateBookingsCache((prev) => prev.map((booking) => (booking.id === updated.id ? { ...booking, ...updated } : booking)));
    setSelectedBooking((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
  };

  const handleBookingStatus = async (status, extra = {}) => {
    if (!selectedBooking) return;

    if (status === 'completed' && Number(selectedBooking.deposit_balance || 0) > 0) {
      Alert.alert(
        'Deposit Settlement Required',
        `Settle the deposit balance of ${formatCurrency(selectedBooking.deposit_balance)} before completing this booking.`
      );
      return;
    }

    try {
      setActionLoading(true);
      const response = await PropertyService.updateBookingStatus(selectedBooking.id, { status, ...extra });
      if (!response.success) throw new Error(response.error || 'Unable to update status');
      setActionError('');
      await refetchLandlordQueries([refetchBookings, refetchStats]);
      updateSelectedBooking({ status, ...response.data?.booking });
      if (status === 'cancelled') closeDetailModal();
    } catch (err) {
      setActionError(err.message || 'Unable to update booking');
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
      setActionError('');
      await refetchLandlordQueries([refetchBookings, refetchStats]);
      updateSelectedBooking({ paymentStatus, ...response.data?.booking });

      if (response.data?.completion_blocked) {
        Alert.alert('Payment Updated', response.data?.message || 'Payment updated, but booking cannot be completed until deposit is settled.');
      }

      return true;
    } catch (err) {
      setActionError(err.message || 'Unable to update payment');
      Alert.alert('Payment', err.message || 'Unable to update payment');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolvePartialCompleted = async () => {
    if (!selectedBooking) return;

    if (Number(selectedBooking.deposit_balance || 0) > 0) {
      Alert.alert(
        'Deposit Settlement Required',
        `Settle the deposit balance of ${formatCurrency(selectedBooking.deposit_balance)} before completing this booking.`
      );
      return;
    }

    if (selectedBooking.paymentStatus !== 'paid') {
      const paymentUpdated = await handlePaymentChange('paid');
      if (!paymentUpdated) return;
    }

    await handleBookingStatus('completed');
  };

  const confirmResolvePartialCompleted = () => {
    Alert.alert(
      'Mark Fully Paid & Completed',
      'Mark this booking as fully completed and paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => { handleResolvePartialCompleted(); } }
      ]
    );
  };

  const handleFinalizeCheckout = async (booking, options = {}) => {
    if (!booking?.id) return;

    try {
      setActionLoading(true);
      const response = await PropertyService.finalizeBookingCheckout(booking.id, options);
      if (!response.success) throw new Error(response.error || 'Unable to finalize checkout');

      setActionError('');
      await refetchLandlordQueries([refetchBookings, refetchStats]);
      closeDetailModal();

      Alert.alert('Checkout Finalized', response.message || 'Checkout finalized successfully.');
    } catch (err) {
      setActionError(err.message || 'Unable to finalize checkout.');
      Alert.alert('Checkout', err.message || 'Unable to finalize checkout.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettleDeposit = async () => {
    if (!selectedBooking) return;

    const damageFee = Number.parseFloat(settlementForm.damageFee) || 0;
    const cleaningFee = Number.parseFloat(settlementForm.cleaningFee) || 0;
    const otherFee = Number.parseFloat(settlementForm.otherFee) || 0;
    const markRefunded = Boolean(settlementForm.markRefunded);
    const totalDeductions = damageFee + cleaningFee + otherFee;

    if (totalDeductions <= 0 && !markRefunded) {
      Alert.alert('Deposit Settlement', 'Add at least one deduction or mark remaining balance as refunded.');
      return;
    }

    if (markRefunded && !settlementForm.refundMethod.trim()) {
      Alert.alert('Deposit Settlement', 'Refund method is required when marking as refunded.');
      return;
    }

    try {
      setSubmittingSettlement(true);
      const response = await PropertyService.settleBookingDeposit(selectedBooking.id, {
        damage_fee: damageFee,
        cleaning_fee: cleaningFee,
        other_fee: otherFee,
        mark_refunded: markRefunded,
        refund_method: markRefunded ? settlementForm.refundMethod.trim() : null,
        refund_reference: markRefunded && settlementForm.refundReference.trim()
          ? settlementForm.refundReference.trim()
          : null,
        note: settlementForm.note.trim() || null,
      });

      if (!response.success) throw new Error(response.error || 'Unable to settle deposit');

      const payload = response.data || {};
      const nextBalance = Number(payload.deposit_balance || 0);
      const latestSettlement = payload.settlement || null;

      updateBookingsCache((prev) => prev.map((booking) => (
        booking.id === selectedBooking.id ? { ...booking, deposit_balance: nextBalance } : booking
      )));
      setSelectedBooking((prev) => (
        prev && prev.id === selectedBooking.id ? { ...prev, deposit_balance: nextBalance } : prev
      ));
      setSettlementHistory((prev) => (latestSettlement ? [latestSettlement, ...prev] : prev));
      if (!latestSettlement) {
        await fetchSettlementHistory(selectedBooking.id, false);
      }

      setSettlementForm({
        damageFee: '',
        cleaningFee: '',
        otherFee: '',
        markRefunded: false,
        refundMethod: '',
        refundReference: '',
        note: ''
      });

      setActionError('');
      Alert.alert('Deposit Settlement', response.message || 'Deposit settlement recorded successfully.');
    } catch (err) {
      setActionError(err.message || 'Unable to settle deposit.');
      Alert.alert('Deposit Settlement', err.message || 'Unable to settle deposit.');
    } finally {
      setSubmittingSettlement(false);
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

      {loadingExtensions || extensionRequests.length > 0 ? (
        <View style={styles.requestSection}>
          {loadingExtensions ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            extensionRequests.map(renderExtensionRequestCard)
          )}
        </View>
      ) : null}
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

      {(error || actionError) ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{actionError || error}</Text>
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
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Payment Plan</Text>
                    <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>{selectedBooking.paymentPlan || 'Full'}</Text>
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

              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>Deposit Settlement</Text>
                <Text style={styles.depositBalanceLabel}>Current Deposit Balance</Text>
                <Text style={styles.depositBalanceValue}>{formatCurrency(selectedBooking.deposit_balance || 0)}</Text>

                <View style={styles.settlementFeeRow}>
                  <View style={styles.settlementFeeField}>
                    <Text style={styles.transferApprovalLabel}>Damage Fee</Text>
                    <TextInput
                      value={settlementForm.damageFee}
                      onChangeText={(value) => setSettlementForm((prev) => ({ ...prev, damageFee: value }))}
                      keyboardType="numeric"
                      placeholder="0.00"
                      style={styles.transferApprovalInput}
                    />
                  </View>
                  <View style={styles.settlementFeeField}>
                    <Text style={styles.transferApprovalLabel}>Cleaning Fee</Text>
                    <TextInput
                      value={settlementForm.cleaningFee}
                      onChangeText={(value) => setSettlementForm((prev) => ({ ...prev, cleaningFee: value }))}
                      keyboardType="numeric"
                      placeholder="0.00"
                      style={styles.transferApprovalInput}
                    />
                  </View>
                  <View style={styles.settlementFeeField}>
                    <Text style={styles.transferApprovalLabel}>Other Fee</Text>
                    <TextInput
                      value={settlementForm.otherFee}
                      onChangeText={(value) => setSettlementForm((prev) => ({ ...prev, otherFee: value }))}
                      keyboardType="numeric"
                      placeholder="0.00"
                      style={styles.transferApprovalInput}
                    />
                  </View>
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.detailLabel}>Mark remaining balance as refunded?</Text>
                  <Switch
                    value={settlementForm.markRefunded}
                    onValueChange={(value) => setSettlementForm((prev) => ({ ...prev, markRefunded: value }))}
                    trackColor={{ true: '#86EFAC', false: '#CBD5F5' }}
                    thumbColor={settlementForm.markRefunded ? theme.colors.primary : '#FFFFFF'}
                  />
                </View>

                {settlementForm.markRefunded ? (
                  <>
                    <Text style={styles.transferApprovalLabel}>Refund Method *</Text>
                    <TextInput
                      value={settlementForm.refundMethod}
                      onChangeText={(value) => setSettlementForm((prev) => ({ ...prev, refundMethod: value }))}
                      placeholder="Cash, GCash, Bank Transfer"
                      style={styles.transferApprovalInput}
                    />

                    <Text style={styles.transferApprovalLabel}>Refund Reference</Text>
                    <TextInput
                      value={settlementForm.refundReference}
                      onChangeText={(value) => setSettlementForm((prev) => ({ ...prev, refundReference: value }))}
                      placeholder="Optional reference id"
                      style={styles.transferApprovalInput}
                    />
                  </>
                ) : null}

                <Text style={styles.transferApprovalLabel}>Notes</Text>
                <TextInput
                  value={settlementForm.note}
                  onChangeText={(value) => setSettlementForm((prev) => ({ ...prev, note: value }))}
                  placeholder="Optional settlement note"
                  style={styles.transferApprovalTextArea}
                  multiline
                />

                <TouchableOpacity
                  style={styles.settleDepositBtn}
                  onPress={handleSettleDeposit}
                  disabled={submittingSettlement}
                >
                  {submittingSettlement ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.settleDepositBtnText}>Record Deposit Settlement</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.settlementHistoryTitle}>Settlement History</Text>
                {settlementHistoryLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : settlementHistory.length === 0 ? (
                  <Text style={styles.requestEmptyText}>No settlement records yet.</Text>
                ) : (
                  settlementHistory.map((entry) => (
                    <View key={entry.id} style={styles.settlementHistoryCard}>
                      <Text style={styles.settlementHistoryAmount}>
                        Deductions {formatCurrency(entry.total_deductions || 0)} • Balance {formatCurrency(entry.ending_balance || 0)}
                      </Text>
                      <Text style={styles.settlementHistoryMeta}>{formatDate(entry.created_at)}</Text>
                      {entry.mark_refunded ? (
                        <Text style={styles.settlementHistoryMeta}>
                          Refunded via {entry.refund_method || 'N/A'}{entry.refund_reference ? ` • ${entry.refund_reference}` : ''}
                        </Text>
                      ) : null}
                      {entry.note ? <Text style={styles.requestNote}>{entry.note}</Text> : null}
                    </View>
                  ))
                )}
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
                      <TouchableOpacity style={styles.completeBtnFull} onPress={() => handleFinalizeCheckout(selectedBooking)} disabled={actionLoading}>
                        {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.completeBtnText}>Finalize Checkout</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cancelRefundBtnFull} onPress={() => openCancelModal(selectedBooking)}>
                        <Text style={styles.cancelRefundBtnText}>Cancel & Refund</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedBooking.status === 'partial-completed' && (
                    <View style={styles.cancelledNote}>
                      <Text style={styles.cancelledNoteText}>
                        Partial Complete: Mark as fully completed once all balances are settled.
                      </Text>
                      <TouchableOpacity
                        style={[styles.completeBtnFull, { marginTop: 12 }]}
                        onPress={confirmResolvePartialCompleted}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.completeBtnText}>Mark Fully Paid & Completed</Text>}
                      </TouchableOpacity>
                    </View>
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

