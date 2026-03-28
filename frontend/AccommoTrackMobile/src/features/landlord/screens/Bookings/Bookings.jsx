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
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
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

const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString('en-PH')}`;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function BookingsScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
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
  const [extensionRequests, setExtensionRequests] = useState([]);
  const [transferRequests, setTransferRequests] = useState([]);
  const [loadingExtensions, setLoadingExtensions] = useState(false);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const [approvingTransferRequestId, setApprovingTransferRequestId] = useState(null);
  const [rejectingTransferRequestId, setRejectingTransferRequestId] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [transferApprovalData, setTransferApprovalData] = useState({
    damage_charge: '',
    damage_description: '',
    landlord_notes: ''
  });
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

  const loadExtensionRequests = useCallback(async () => {
    try {
      setLoadingExtensions(true);
      const response = await PropertyService.getExtensionRequests();
      if (!response.success) throw new Error(response.error || 'Failed to load extension requests');
      setExtensionRequests(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setExtensionRequests([]);
    } finally {
      setLoadingExtensions(false);
    }
  }, []);

  const loadTransferRequests = useCallback(async () => {
    try {
      setLoadingTransfers(true);
      const response = await PropertyService.getTransferRequests();
      if (!response.success) throw new Error(response.error || 'Failed to load transfer requests');
      setTransferRequests(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setTransferRequests([]);
    } finally {
      setLoadingTransfers(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
      loadStats();
      loadExtensionRequests();
      loadTransferRequests();
    }, [loadBookings, loadStats, loadExtensionRequests, loadTransferRequests])
  );

  useEffect(() => {
    const params = route?.params || {};
    const requestedFilter = params.filter;
    const requestedSearch = params.searchQuery;
    const focusBookingId = params.focusBookingId;

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

  useEffect(() => {
    if (!pendingFocusBookingId || bookings.length === 0) return;

    const targetBooking = bookings.find((booking) => String(booking.id) === String(pendingFocusBookingId));
    if (!targetBooking) return;

    openDetailModal(targetBooking);
    setPendingFocusBookingId(null);

    if (typeof navigation?.setParams === 'function') {
      navigation.setParams({
        focusBookingId: undefined,
      });
    }
  }, [bookings, pendingFocusBookingId, navigation]);

  const handleRefresh = () => {
    loadBookings(true);
    loadStats();
    loadExtensionRequests();
    loadTransferRequests();
  };

  const handleExtensionRequestAction = async (requestId, action) => {
    try {
      setRequestActionLoading(true);
      const response = await PropertyService.handleExtensionRequest(requestId, { action });
      if (!response.success) throw new Error(response.error || 'Unable to update extension request');
      await loadExtensionRequests();
      Alert.alert('Extension Request', `Request ${action}d successfully.`);
    } catch (err) {
      Alert.alert('Extension Request', err.message || 'Unable to process extension request');
    } finally {
      setRequestActionLoading(false);
    }
  };

  const handleTransferRequestAction = async (requestId, action, transferData = {}) => {
    try {
      setRequestActionLoading(true);
      const response = await PropertyService.handleTransferRequest(requestId, {
        action,
        ...transferData
      });
      if (!response.success) throw new Error(response.error || 'Unable to update transfer request');
      await loadTransferRequests();
      if (action === 'approve') {
        setApprovingTransferRequestId(null);
        setTransferApprovalData({ damage_charge: '', damage_description: '', landlord_notes: '' });
      }
      if (action === 'reject') {
        setRejectingTransferRequestId(null);
        setRejectNotes('');
      }
      Alert.alert('Transfer Request', `Request ${action}d successfully.`);
    } catch (err) {
      Alert.alert('Transfer Request', err.message || 'Unable to process transfer request');
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

  const renderTransferRequestCard = (item) => {
    const tenantName = item.tenant?.full_name || [item.tenant?.first_name, item.tenant?.last_name].filter(Boolean).join(' ') || 'Tenant';
    const isApprovingCurrent = approvingTransferRequestId === item.id;
    const isRejectingCurrent = rejectingTransferRequestId === item.id;
    return (
      <View key={`trf-${item.id}`} style={styles.requestCard}>
        <View style={styles.requestCardTop}>
          <Text style={styles.requestTitle}>{tenantName}</Text>
          <Text style={styles.requestStatus}>{item.status || 'pending'}</Text>
        </View>
        <Text style={styles.requestSubtitle}>{item.requested_room?.property?.title || 'Property'}</Text>
        <Text style={styles.requestMeta}>Current Room: {item.current_room?.room_number || '—'}</Text>
        <Text style={styles.requestMeta}>Requested Room: {item.requested_room?.room_number || '—'}</Text>
        <Text style={styles.requestNote}>"{item.reason || 'No reason provided'}"</Text>
        {item.status === 'pending' ? (
          isApprovingCurrent ? (
            <View style={styles.transferApprovalWrap}>
              <Text style={styles.transferApprovalLabel}>Damage Charge (optional)</Text>
              <TextInput
                value={transferApprovalData.damage_charge}
                onChangeText={(value) => setTransferApprovalData((current) => ({ ...current, damage_charge: value }))}
                placeholder="0.00"
                style={styles.transferApprovalInput}
                keyboardType="numeric"
              />

              {Number(transferApprovalData.damage_charge || 0) > 0 ? (
                <>
                  <Text style={styles.transferApprovalLabel}>Damage Description *</Text>
                  <TextInput
                    value={transferApprovalData.damage_description}
                    onChangeText={(value) => setTransferApprovalData((current) => ({ ...current, damage_description: value }))}
                    placeholder="What was damaged?"
                    style={styles.transferApprovalInput}
                  />
                </>
              ) : null}

              <Text style={styles.transferApprovalLabel}>Landlord Notes</Text>
              <TextInput
                value={transferApprovalData.landlord_notes}
                onChangeText={(value) => setTransferApprovalData((current) => ({ ...current, landlord_notes: value }))}
                placeholder="Any notes for the tenant..."
                style={styles.transferApprovalTextArea}
                multiline
              />

              <View style={styles.requestActionsRow}>
                <TouchableOpacity
                  style={styles.requestApproveBtn}
                  disabled={requestActionLoading}
                  onPress={() => {
                    const damageCharge = Number(transferApprovalData.damage_charge || 0);
                    if (damageCharge > 0 && !transferApprovalData.damage_description.trim()) {
                      Alert.alert('Transfer Request', 'Please provide a damage description.');
                      return;
                    }
                    handleTransferRequestAction(item.id, 'approve', {
                      damage_charge: damageCharge > 0 ? damageCharge : undefined,
                      damage_description: transferApprovalData.damage_description.trim() || undefined,
                      landlord_notes: transferApprovalData.landlord_notes.trim() || undefined
                    });
                  }}
                >
                  <Text style={styles.requestApproveText}>Confirm Transfer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.requestNeutralBtn}
                  disabled={requestActionLoading}
                  onPress={() => {
                    setApprovingTransferRequestId(null);
                    setTransferApprovalData({ damage_charge: '', damage_description: '', landlord_notes: '' });
                  }}
                >
                  <Text style={styles.requestNeutralText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : isRejectingCurrent ? (
            <View style={styles.transferApprovalWrap}>
              <Text style={styles.transferApprovalLabel}>Rejection Reason *</Text>
              <TextInput
                value={rejectNotes}
                onChangeText={setRejectNotes}
                placeholder="Why are you rejecting this transfer?"
                style={styles.transferApprovalTextArea}
                multiline
              />
              <View style={styles.requestActionsRow}>
                <TouchableOpacity
                  style={styles.requestRejectBtn}
                  disabled={requestActionLoading}
                  onPress={() => {
                    const notes = rejectNotes.trim();
                    if (!notes) {
                      Alert.alert('Transfer Request', 'Please provide a rejection reason.');
                      return;
                    }

                    handleTransferRequestAction(item.id, 'reject', {
                      landlord_notes: notes
                    });
                  }}
                >
                  <Text style={styles.requestRejectText}>Confirm Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.requestNeutralBtn}
                  disabled={requestActionLoading}
                  onPress={() => {
                    setRejectingTransferRequestId(null);
                    setRejectNotes('');
                  }}
                >
                  <Text style={styles.requestNeutralText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.requestActionsRow}>
              <TouchableOpacity
                style={styles.requestApproveBtn}
                disabled={requestActionLoading}
                onPress={() => {
                  setApprovingTransferRequestId(item.id);
                  setRejectingTransferRequestId(null);
                  setRejectNotes('');
                  setTransferApprovalData({ damage_charge: '', damage_description: '', landlord_notes: '' });
                }}
              >
                <Text style={styles.requestApproveText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.requestRejectBtn}
                disabled={requestActionLoading}
                onPress={() => {
                  setApprovingTransferRequestId(null);
                  setTransferApprovalData({ damage_charge: '', damage_description: '', landlord_notes: '' });
                  setRejectingTransferRequestId(item.id);
                  setRejectNotes('');
                }}
              >
                <Text style={styles.requestRejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )
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
      setBookings((prev) => prev.map((booking) => (
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
  }, []);

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
    setBookings((prev) => prev.map((booking) => (booking.id === updated.id ? { ...booking, ...updated } : booking)));
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
      updateSelectedBooking({ paymentStatus, ...response.data?.booking });

      if (response.data?.completion_blocked) {
        Alert.alert('Payment Updated', response.data?.message || 'Payment updated, but booking cannot be completed until deposit is settled.');
      }
    } catch (err) {
      Alert.alert('Payment', err.message || 'Unable to update payment');
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

      setBookings((prev) => prev.map((booking) => (
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

      Alert.alert('Deposit Settlement', response.message || 'Deposit settlement recorded successfully.');
    } catch (err) {
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

      <View style={styles.requestSection}>
        <Text style={styles.requestSectionTitle}>Extension Requests</Text>
        {loadingExtensions ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : extensionRequests.length > 0 ? (
          extensionRequests.map(renderExtensionRequestCard)
        ) : (
          <Text style={styles.requestEmptyText}>No extension requests.</Text>
        )}
      </View>

      <View style={styles.requestSection}>
        <Text style={styles.requestSectionTitle}>Transfer Requests</Text>
        {loadingTransfers ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : transferRequests.length > 0 ? (
          transferRequests.map(renderTransferRequestCard)
        ) : (
          <Text style={styles.requestEmptyText}>No transfer requests.</Text>
        )}
      </View>
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

