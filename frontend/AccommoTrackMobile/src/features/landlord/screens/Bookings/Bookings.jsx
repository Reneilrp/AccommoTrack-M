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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { useUIState } from '../../../../contexts/UIStateContext.jsx';
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
  'completed': { bg: '#ECFDF5', color: '#047857', label: 'Completed' },
  'partial-completed': { bg: '#FEF3C7', color: '#B45309', label: 'Partial Complete' },
  'transferred': { bg: '#EEF2FF', color: '#4F46E5', label: 'Transferred' },
  'cancelled': { bg: '#FEE2E2', color: '#B91C1C', label: 'Cancelled' },
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

const resolveBookingMode = (booking) => String(booking?.bookingMode || booking?.booking_mode || 'normal').toLowerCase();

const resolveBedCount = (booking) => {
  const parsed = Number(booking?.bedCount ?? booking?.bed_count ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

const resolveOccupantCount = (booking) => {
  const explicit = Number(booking?.occupantCount ?? booking?.occupant_count ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.floor(explicit);
  }

  const loaded = Array.isArray(booking?.occupants) ? booking.occupants.length : 0;
  if (loaded > 0) {
    return loaded;
  }

  return resolveBookingMode(booking) === 'proxy' ? resolveBedCount(booking) : 1;
};

const resolveRoomCapacity = (booking) => {
  const parsed = Number(booking?.room?.capacity ?? booking?.room_capacity ?? booking?.capacity ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
};

const getOccupancyLabel = (booking) => {
  const occupants = resolveOccupantCount(booking);
  const capacity = resolveRoomCapacity(booking);

  if (capacity) {
    return `${occupants}/${capacity} occupants`;
  }

  return `${occupants} occupant${occupants === 1 ? '' : 's'}`;
};

export default function BookingsScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { showAlert } = useUIState();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('bookings'); // bookings, transfers, extensions
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
  const [user, setUser] = useState(null);
  const [settlementForm, setSettlementForm] = useState({
    damageFee: '',
    cleaningFee: '',
    otherFee: '',
    markRefunded: false,
    refundMethod: '',
    refundReference: '',
    note: ''
  });

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        if (!mounted || !userString) return;
        setUser(JSON.parse(userString));
      } catch (_error) {
        // Keep default role assumptions when user payload is unavailable.
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  const normalizedRole = user?.role || 'landlord';
  const isCaretaker = normalizedRole === 'caretaker';
  const caretakerPermissions = user?.caretaker_permissions || {};

  const normalizePermissionValue = useCallback((value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'allowed';
    }

    return Boolean(value);
  }, []);

  const buildPermissionCandidates = useCallback((key, aliases = []) => {
    const base = String(key || '').trim();
    const singular = base.endsWith('ies')
      ? `${base.slice(0, -3)}y`
      : base.endsWith('s')
        ? base.slice(0, -1)
        : base;
    const plural = base.endsWith('s')
      ? base
      : singular === 'property'
        ? 'properties'
        : `${singular}s`;

    const keys = new Set([base, singular, plural, ...aliases]);
    const expanded = [];

    keys.forEach((entry) => {
      if (!entry) return;
      expanded.push(entry, `can_view_${entry}`, `can_manage_${entry}`);
    });

    return expanded;
  }, []);

  const hasCaretakerPermission = useCallback((key, aliases = []) => {
    if (!isCaretaker) return true;

    return buildPermissionCandidates(key, aliases).some((candidate) =>
      normalizePermissionValue(caretakerPermissions?.[candidate]),
    );
  }, [buildPermissionCandidates, caretakerPermissions, isCaretaker, normalizePermissionValue]);

  const canApproveBookings = hasCaretakerPermission('approve_bookings', ['approve_booking']);
  const canCancelBookings = hasCaretakerPermission('cancel_bookings', ['cancel_booking']);
  const canManageBookings = canApproveBookings || canCancelBookings;

  const guardAnyBookingAction = useCallback(() => {
    if (canManageBookings) return false;
    showAlert('Permission Required', 'Caretaker booking actions are disabled.');
    return true;
  }, [canManageBookings, showAlert]);

  const guardApprovalAction = useCallback(() => {
    if (canApproveBookings) return false;
    showAlert('Permission Required', 'You do not have approval permission for this booking action.');
    return true;
  }, [canApproveBookings, showAlert]);

  const guardCancellationAction = useCallback(() => {
    if (canCancelBookings) return false;
    showAlert('Permission Required', 'You do not have cancellation permission for this booking action.');
    return true;
  }, [canCancelBookings, showAlert]);

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

  const transferRequestsQuery = useQuery({
    queryKey: ['landlord', 'transferRequests'],
    queryFn: async () => {
      const response = await PropertyService.getTransferRequests();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load transfer requests');
      }
      return Array.isArray(response.data) ? response.data : EMPTY_REQUESTS;
    },
    placeholderData: (previousData) => previousData,
  });

  const bookings = bookingsQuery.data || EMPTY_BOOKINGS;
  const stats = statsQuery.data || DEFAULT_STATS;
  const extensionRequests = extensionRequestsQuery.data || EMPTY_REQUESTS;
  const transferRequests = transferRequestsQuery.data || EMPTY_REQUESTS;
  const loading = bookingsQuery.isPending && bookings.length === 0;
  const loadingExtensions = extensionRequestsQuery.isPending && extensionRequests.length === 0;
  const loadingTransfers = transferRequestsQuery.isPending && transferRequests.length === 0;
  const error = bookingsQuery.error?.message || statsQuery.error?.message || '';

  const refetchBookings = bookingsQuery.refetch;
  const refetchStats = statsQuery.refetch;
  const refetchExtensionRequests = extensionRequestsQuery.refetch;
  const refetchTransferRequests = transferRequestsQuery.refetch;
  const bookingRefetchers = useMemo(
    () => [refetchBookings, refetchStats, refetchExtensionRequests, refetchTransferRequests],
    [refetchBookings, refetchStats, refetchExtensionRequests, refetchTransferRequests],
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
    if (guardAnyBookingAction()) return;

    try {
      setRequestActionLoading(true);
      const response = await PropertyService.handleExtensionRequest(requestId, { action });
      if (!response.success) throw new Error(response.error || 'Unable to update extension request');
      setActionError('');
      await refetchLandlordQueries([refetchExtensionRequests]);
      showAlert('Extension Request', `Request ${action}d successfully.`);
    } catch (err) {
      setActionError(err.message || 'Unable to process extension request');
      showAlert('Extension Request', err.message || 'Unable to process extension request');
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
        {item.status === 'pending' && canManageBookings ? (
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
        ) : item.status === 'pending' ? (
          <Text style={styles.requestMeta}>Action unavailable for your caretaker permissions.</Text>
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
        showAlert('Deposit Settlement', err.message || 'Unable to fetch settlement history.');
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
    if (guardCancellationAction()) return;

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

    const normalizedStatus = String(status || '').toLowerCase();
    if (normalizedStatus === 'cancelled') {
      if (guardCancellationAction()) return;
    } else if (guardApprovalAction()) {
      return;
    }

    if (status === 'completed' && Number(selectedBooking.deposit_balance || 0) > 0) {
      showAlert(
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
      showAlert('Booking', err.message || 'Unable to update booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaymentChange = async (paymentStatus) => {
    if (!selectedBooking) return;

    if (paymentStatus === 'refunded') {
      if (guardCancellationAction()) return false;
    } else if (guardApprovalAction()) {
      return false;
    }

    try {
      setActionLoading(true);
      const response = await PropertyService.updateBookingPayment(selectedBooking.id, { payment_status: paymentStatus });
      if (!response.success) throw new Error(response.error || 'Unable to update payment');
      setActionError('');
      await refetchLandlordQueries([refetchBookings, refetchStats]);
      updateSelectedBooking({ paymentStatus, ...response.data?.booking });

      if (response.data?.completion_blocked) {
        showAlert('Payment Updated', response.data?.message || 'Payment updated, but booking cannot be completed until deposit is settled.');
      }

      return true;
    } catch (err) {
      setActionError(err.message || 'Unable to update payment');
      showAlert('Payment', err.message || 'Unable to update payment');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolvePartialCompleted = async () => {
    if (!selectedBooking) return;

    if (Number(selectedBooking.deposit_balance || 0) > 0) {
      showAlert(
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
    showAlert(
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
    if (guardApprovalAction()) return;

    try {
      setActionLoading(true);
      const response = await PropertyService.finalizeBookingCheckout(booking.id, options);
      if (!response.success) throw new Error(response.error || 'Unable to finalize checkout');

      setActionError('');
      await refetchLandlordQueries([refetchBookings, refetchStats]);
      closeDetailModal();

      showAlert('Checkout Finalized', response.message || 'Checkout finalized successfully.');
    } catch (err) {
      setActionError(err.message || 'Unable to finalize checkout.');
      showAlert('Checkout', err.message || 'Unable to finalize checkout.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettleDeposit = async () => {
    if (!selectedBooking) return;
    if (guardApprovalAction()) return;

    const damageFee = Number.parseFloat(settlementForm.damageFee) || 0;
    const cleaningFee = Number.parseFloat(settlementForm.cleaningFee) || 0;
    const otherFee = Number.parseFloat(settlementForm.otherFee) || 0;
    const markRefunded = Boolean(settlementForm.markRefunded);
    const totalDeductions = damageFee + cleaningFee + otherFee;

    if (totalDeductions <= 0 && !markRefunded) {
      showAlert('Deposit Settlement', 'Add at least one deduction or mark remaining balance as refunded.');
      return;
    }

    if (markRefunded && !settlementForm.refundMethod.trim()) {
      showAlert('Deposit Settlement', 'Refund method is required when marking as refunded.');
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
      showAlert('Deposit Settlement', response.message || 'Deposit settlement recorded successfully.');
    } catch (err) {
      setActionError(err.message || 'Unable to settle deposit.');
      showAlert('Deposit Settlement', err.message || 'Unable to settle deposit.');
    } finally {
      setSubmittingSettlement(false);
    }
  };

  const submitCancellation = () => {
    if (guardCancellationAction()) return;

    if (!cancelForm.reason.trim()) {
      showAlert('Cancellation', 'Provide a reason before cancelling.');
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
    const modeLabel = resolveBookingMode(item) === 'proxy' ? 'Proxy' : 'Normal';
    const initials = item.guestName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2);

    return (
      <TouchableOpacity style={styles.bookingCard} onPress={() => openDetailModal(item)}>
        <View style={[styles.cardTop, { alignItems: 'center' }]}>
          <View style={[styles.guestAvatar, { marginRight: 12 }]}>
            <Text style={styles.guestAvatarText}>{initials || 'GN'}</Text>
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.guestName} numberOfLines={1}>{item.guestName}</Text>
            <Text style={styles.guestEmail} numberOfLines={1}>{item.email}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
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
          <Ionicons name="people-outline" size={16} color="#94A3B8" />
          <Text style={styles.detailText}>{modeLabel} • Beds {resolveBedCount(item)} • {getOccupancyLabel(item)}</Text>
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

  const handleTransferRequestAction = async (requestId, action) => {
    if (guardAnyBookingAction()) return;

    try {
      setRequestActionLoading(true);
      const response = await PropertyService.handleTransferRequest(requestId, { action });
      if (!response.success) throw new Error(response.error || 'Unable to update transfer request');
      setActionError('');
      await refetchLandlordQueries([refetchTransferRequests]);
      showAlert('Transfer Request', `Request ${action}d successfully.`);
    } catch (err) {
      setActionError(err.message || 'Unable to process transfer request');
      showAlert('Transfer Request', err.message || 'Unable to process transfer request');
    } finally {
      setRequestActionLoading(false);
    }
  };

  const renderTransferRequestCard = (item) => {
    const tenantName = item.tenant?.full_name || [item.tenant?.first_name, item.tenant?.last_name].filter(Boolean).join(' ') || 'Tenant';
    return (
      <View key={`tr-${item.id}`} style={styles.requestCard}>
        <View style={styles.requestCardTop}>
          <Text style={styles.requestTitle}>{tenantName}</Text>
          <Text style={styles.requestStatus}>{item.status || 'pending'}</Text>
        </View>
        <Text style={styles.requestSubtitle}>
          From Room {item.current_room?.room_number || '—'} → To Room {item.requested_room?.room_number || '—'}
        </Text>
        <Text style={styles.requestMeta}>Property: {item.property?.title || 'Property'}</Text>
        <Text style={styles.requestMeta}>Reason: {item.reason}</Text>
        {item.status === 'pending' && canManageBookings ? (
          <View style={styles.requestActionsRow}>
            <TouchableOpacity
              style={styles.requestApproveBtn}
              disabled={requestActionLoading}
              onPress={() => handleTransferRequestAction(item.id, 'approve')}
            >
              <Text style={styles.requestApproveText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.requestRejectBtn}
              disabled={requestActionLoading}
              onPress={() => handleTransferRequestAction(item.id, 'reject')}
            >
              <Text style={styles.requestRejectText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : item.status === 'pending' ? (
          <Text style={styles.requestMeta}>Action unavailable for your caretaker permissions.</Text>
        ) : null}
      </View>
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

      {/* Main Feature Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        {[
          { id: 'bookings', label: 'All Bookings', icon: 'calendar' },
          { id: 'transfers', label: 'Transfers', icon: 'shuffle', count: transferRequests.filter(r => r.status === 'pending').length },
          { id: 'extensions', label: 'Extensions', icon: 'calendar-outline', count: extensionRequests.filter(r => r.status === 'pending').length }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              borderBottomWidth: 3,
              borderBottomColor: activeTab === tab.id ? theme.colors.primary : 'transparent'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: 'bold',
                color: activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary
              }}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={{ backgroundColor: theme.colors.error, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{tab.count}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'bookings' && (
        <>
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
        </>
      )}
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
          onPress={() => {
            if (guardApprovalAction()) return;
            navigation.navigate('AddBooking');
          }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {isCaretaker && !canManageBookings ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>You need approve and/or cancel booking permissions to perform actions.</Text>
        </View>
      ) : null}

      {(error || actionError) ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{actionError || error}</Text>
        </View>
      ) : null}

      <FlatList
        data={activeTab === 'bookings' ? filteredBookings : []}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        renderItem={activeTab === 'bookings' ? renderBookingCard : null}
        ListHeaderComponent={listHeader}
        ListFooterComponent={() => (
          <View style={{ paddingBottom: 40 }}>
            {activeTab === 'transfers' && (
              <View style={styles.requestSection}>
                {loadingTransfers ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : transferRequests.length === 0 ? (
                  <Text style={styles.emptySubtitle}>No pending transfer requests.</Text>
                ) : (
                  transferRequests.map(renderTransferRequestCard)
                )}
              </View>
            )}
            {activeTab === 'extensions' && (
              <View style={styles.requestSection}>
                {loadingExtensions ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : extensionRequests.length === 0 ? (
                  <Text style={styles.emptySubtitle}>No pending extension requests.</Text>
                ) : (
                  extensionRequests.map(renderExtensionRequestCard)
                )}
              </View>
            )}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
        ListEmptyComponent={
          activeTab === 'bookings' ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No bookings found</Text>
              <Text style={styles.emptySubtitle}>Bookings will appear here when guests reserve rooms.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Detail Modal */}
      <Modal visible={detailVisible} animationType="slide" onRequestClose={closeDetailModal}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Booking Details</Text>
            <TouchableOpacity onPress={closeDetailModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {selectedBooking ? (
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Timeline - Blue themed like web */}
              <View style={[styles.timelineCard, { backgroundColor: theme.isDark ? 'rgba(30,64,175,0.1)' : '#EFF6FF', borderColor: theme.isDark ? '#1e40af' : '#DBEAFE' }]}>
                <View style={styles.timelineItem}>
                  <Text style={[styles.timelineLabelBlue, { color: theme.isDark ? '#93c5fd' : '#1e40af' }]}>CHECK-IN</Text>
                  <Text style={[styles.timelineValueBlue, { color: theme.isDark ? '#dbeafe' : '#1e3a8a' }]}>{formatDate(selectedBooking.checkIn)}</Text>
                </View>
                <Text style={[styles.timelineArrow, { color: theme.isDark ? '#3b82f6' : '#3b82f6' }]}>→</Text>
                <View style={styles.timelineItemCenter}>
                  <Text style={[styles.timelineLabelBlue, { color: theme.isDark ? '#93c5fd' : '#1e40af' }]}>DURATION</Text>
                  <Text style={[styles.timelineValueBlue, { color: theme.isDark ? '#dbeafe' : '#1e3a8a' }]}>{selectedBooking.duration || '1 month'}</Text>
                </View>
                <Text style={[styles.timelineArrow, { color: theme.isDark ? '#3b82f6' : '#3b82f6' }]}>→</Text>
                <View style={styles.timelineItemEnd}>
                  <Text style={[styles.timelineLabelBlue, { color: theme.isDark ? '#93c5fd' : '#1e40af' }]}>CHECK-OUT</Text>
                  <Text style={[styles.timelineValueBlue, { color: theme.isDark ? '#dbeafe' : '#1e3a8a' }]}>{formatDate(selectedBooking.checkOut)}</Text>
                </View>
              </View>

              {/* Status Badges Row */}
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <Text style={[styles.statusItemLabel, { color: theme.colors.textSecondary }]}>Booking Status</Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: (STATUS_BADGES[selectedBooking.status] || STATUS_BADGES.pending).bg }]}>
                    <Text style={[styles.statusBadgeText, { color: (STATUS_BADGES[selectedBooking.status] || STATUS_BADGES.pending).color }]}>
                      {(STATUS_BADGES[selectedBooking.status] || STATUS_BADGES.pending).label}
                    </Text>
                  </View>
                </View>
                <View style={styles.statusItem}>
                  <Text style={[styles.statusItemLabel, { color: theme.colors.textSecondary }]}>Payment Status</Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: (PAYMENT_BADGES[selectedBooking.paymentStatus] || PAYMENT_BADGES.unpaid).bg }]}>
                    <Text style={[styles.statusBadgeText, { color: (PAYMENT_BADGES[selectedBooking.paymentStatus] || PAYMENT_BADGES.unpaid).color }]}>
                      {(PAYMENT_BADGES[selectedBooking.paymentStatus] || PAYMENT_BADGES.unpaid).label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Guest Information */}
              <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Guest Information</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Name</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{selectedBooking.guestName}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Email</Text>
                    <Text style={[styles.infoValueSmall, { color: theme.colors.textTertiary }]}>{selectedBooking.email}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Phone</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{selectedBooking.phone || '—'}</Text>
                  </View>
                </View>
              </View>

              {/* Booking Information */}
              <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Booking Information</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Reference</Text>
                    <Text style={[styles.referenceValue, { color: theme.colors.primary }]}>{selectedBooking.bookingReference}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Property</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{selectedBooking.propertyTitle}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Room</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>Room {selectedBooking.roomNumber} - {selectedBooking.roomType}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Booking Mode</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{resolveBookingMode(selectedBooking) === 'proxy' ? 'Proxy' : 'Normal'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Beds Booked</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{resolveBedCount(selectedBooking)}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Occupancy</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{getOccupancyLabel(selectedBooking)}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Monthly Rent</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{formatCurrency(selectedBooking.monthlyRent || selectedBooking.amount)}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Payment Plan</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text, textTransform: 'capitalize' }]}>{selectedBooking.paymentPlan || 'Full'}</Text>
                  </View>
                </View>
                <View style={[styles.totalAmountBox, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <Text style={[styles.totalAmountLabel, { color: theme.colors.textSecondary }]}>Total Amount</Text>
                  <Text style={[styles.totalAmountValue, { color: theme.colors.primary }]}>{formatCurrency(selectedBooking.amount)}</Text>
                </View>
              </View>

              {(resolveBookingMode(selectedBooking) === 'proxy' || Array.isArray(selectedBooking.occupants)) ? (
                <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Proxy Occupants</Text>
                  {Array.isArray(selectedBooking.occupants) && selectedBooking.occupants.length > 0 ? (
                    selectedBooking.occupants.map((occupant, index) => {
                      const fullName = [occupant.first_name, occupant.middle_name, occupant.last_name].filter(Boolean).join(' ').trim() || `Occupant ${index + 1}`;
                      return (
                        <View key={occupant.id || `${fullName}-${index}`} style={[styles.occupantCard, { borderBottomColor: theme.colors.border }]}>
                          <Text style={[styles.occupantName, { color: theme.colors.text }]}>{fullName}</Text>
                          <Text style={[styles.occupantMeta, { color: theme.colors.textSecondary }]}>
                            {occupant.relationship_to_booker || 'Relationship not provided'} • {occupant.sex || 'Sex not provided'}
                          </Text>
                          {(occupant.phone || occupant.email) ? (
                            <Text style={[styles.occupantMeta, { color: theme.colors.textSecondary }]}>{[occupant.phone, occupant.email].filter(Boolean).join(' • ')}</Text>
                          ) : null}
                        </View>
                      );
                    })
                  ) : (
                    <Text style={[styles.requestEmptyText, { color: theme.colors.textTertiary }]}>No occupant profiles are attached yet for this proxy booking.</Text>
                  )}
                </View>
              ) : null}

              {/* Update Payment Status */}
              <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Update Payment Status</Text>
                <View style={styles.paymentPillRow}>
                  {['unpaid', 'partial', 'paid', 'refunded'].map((status) => {
                    const requiresCancel = status === 'refunded';
                    if ((requiresCancel && !canCancelBookings) || (!requiresCancel && !canApproveBookings)) {
                      return null;
                    }

                    return (
                      <TouchableOpacity
                        key={status}
                        style={[styles.paymentPill, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }, selectedBooking.paymentStatus === status && styles.paymentPillActive]}
                        onPress={() => handlePaymentChange(status)}
                        disabled={actionLoading}
                      >
                        <Text style={[styles.paymentPillText, { color: theme.colors.textSecondary }, selectedBooking.paymentStatus === status && styles.paymentPillTextActive]}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {!canApproveBookings && !canCancelBookings ? (
                  <Text style={[styles.requestMeta, { color: theme.colors.textSecondary }]}>Payment updates are not available for your caretaker permissions.</Text>
                ) : null}
              </View>

              <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Deposit Settlement</Text>
                <Text style={[styles.depositBalanceLabel, { color: theme.colors.textSecondary }]}>Current Deposit Balance</Text>
                <Text style={[styles.depositBalanceValue, { color: theme.colors.text }]}>{formatCurrency(selectedBooking.deposit_balance || 0)}</Text>

                {canApproveBookings ? (
                  <>
                    <View style={styles.settlementFeeRow}>
                      <View style={styles.settlementFeeField}>
                        <Text style={[styles.transferApprovalLabel, { color: theme.colors.textSecondary }]}>Damage Fee</Text>
                        <TextInput
                          value={settlementForm.damageFee}
                          onChangeText={(value) => setSettlementForm((prev) => ({ ...prev, damageFee: value }))}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor={theme.colors.textTertiary}
                          style={[styles.transferApprovalInput, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text, borderColor: theme.colors.border }]}
                        />
                      </View>
                      <View style={styles.settlementFeeField}>
                        <Text style={[styles.transferApprovalLabel, { color: theme.colors.textSecondary }]}>Cleaning Fee</Text>
                        <TextInput
                          value={settlementForm.cleaningFee}
                          onChangeText={(value) => setSettlementForm((prev) => ({ ...prev, cleaningFee: value }))}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor={theme.colors.textTertiary}
                          style={[styles.transferApprovalInput, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text, borderColor: theme.colors.border }]}
                        />
                      </View>
                      <View style={styles.settlementFeeField}>
                        <Text style={[styles.transferApprovalLabel, { color: theme.colors.textSecondary }]}>Other Fee</Text>
                        <TextInput
                          value={settlementForm.otherFee}
                          onChangeText={(value) => setSettlementForm((prev) => ({ ...prev, otherFee: value }))}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor={theme.colors.textTertiary}
                          style={[styles.transferApprovalInput, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text, borderColor: theme.colors.border }]}
                        />
                      </View>
                    </View>

                    <View style={styles.switchRow}>
                      <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Mark remaining balance as refunded?</Text>
                      <Switch
                        value={settlementForm.markRefunded}
                        onValueChange={(value) => setSettlementForm((prev) => ({ ...prev, markRefunded: value }))}
                        trackColor={{ true: '#86EFAC', false: theme.colors.border }}
                        thumbColor={settlementForm.markRefunded ? theme.colors.primary : '#FFFFFF'}
                      />
                    </View>

                    {settlementForm.markRefunded ? (
                      <>
                        <Text style={[styles.transferApprovalLabel, { color: theme.colors.textSecondary }]}>Refund Method *</Text>
                        <TextInput
                          value={settlementForm.refundMethod}
                          onChangeText={(value) => setSettlementForm((prev) => ({ ...prev, refundMethod: value }))}
                          placeholder="Cash, GCash, Bank Transfer"
                          placeholderTextColor={theme.colors.textTertiary}
                          style={[styles.transferApprovalInput, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text, borderColor: theme.colors.border }]}
                        />

                        <Text style={[styles.transferApprovalLabel, { color: theme.colors.textSecondary }]}>Refund Reference</Text>
                        <TextInput
                          value={settlementForm.refundReference}
                          onChangeText={(value) => setSettlementForm((prev) => ({ ...prev, refundReference: value }))}
                          placeholder="Optional reference id"
                          placeholderTextColor={theme.colors.textTertiary}
                          style={[styles.transferApprovalInput, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text, borderColor: theme.colors.border }]}
                        />
                      </>
                    ) : null}

                    <Text style={[styles.transferApprovalLabel, { color: theme.colors.textSecondary }]}>Notes</Text>
                    <TextInput
                      value={settlementForm.note}
                      onChangeText={(value) => setSettlementForm((prev) => ({ ...prev, note: value }))}
                      placeholder="Optional settlement note"
                      placeholderTextColor={theme.colors.textTertiary}
                      style={[styles.transferApprovalTextArea, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text, borderColor: theme.colors.border }]}
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
                  </>
                ) : (
                  <Text style={[styles.requestMeta, { color: theme.colors.textSecondary }]}>Deposit settlement requires booking approval permission.</Text>
                )}

                <Text style={[styles.settlementHistoryTitle, { color: theme.colors.text }]}>Settlement History</Text>
                {settlementHistoryLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : settlementHistory.length === 0 ? (
                  <Text style={[styles.requestEmptyText, { color: theme.colors.textTertiary }]}>No settlement records yet.</Text>
                ) : (
                  settlementHistory.map((entry) => (
                    <View key={entry.id} style={[styles.settlementHistoryCard, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}>
                      <Text style={[styles.settlementHistoryAmount, { color: theme.colors.text }]}>
                        Deductions {formatCurrency(entry.total_deductions || 0)} • Balance {formatCurrency(entry.ending_balance || 0)}
                      </Text>
                      <Text style={[styles.settlementHistoryMeta, { color: theme.colors.textSecondary }]}>{formatDate(entry.created_at)}</Text>
                      {entry.mark_refunded ? (
                        <Text style={[styles.settlementHistoryMeta, { color: theme.colors.textSecondary }]}>
                          Refunded via {entry.refund_method || 'N/A'}{entry.refund_reference ? ` • ${entry.refund_reference}` : ''}
                        </Text>
                      ) : null}
                      {entry.note ? <Text style={[styles.requestNote, { color: theme.colors.textSecondary, backgroundColor: theme.colors.surface }]}>{entry.note}</Text> : null}
                    </View>
                  ))
                )}
              </View>

              {/* Booking Actions */}
              <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Booking Actions</Text>
                <View style={styles.actionButtonsRow}>
                  {selectedBooking.status === 'pending' && (
                    <>
                      {canApproveBookings ? (
                        <TouchableOpacity style={styles.confirmBtnFull} onPress={() => handleBookingStatus('confirmed')} disabled={actionLoading}>
                          {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.confirmBtnText}>Confirm Booking</Text>}
                        </TouchableOpacity>
                      ) : null}
                      {canCancelBookings ? (
                        <TouchableOpacity style={styles.rejectBtnFull} onPress={() => openCancelModal(selectedBooking)}>
                          <Text style={styles.rejectBtnText}>Cancel</Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                  )}
                  {selectedBooking.status === 'confirmed' && (
                    <>
                      {canApproveBookings ? (
                        <TouchableOpacity style={styles.completeBtnFull} onPress={() => handleFinalizeCheckout(selectedBooking)} disabled={actionLoading}>
                          {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.completeBtnText}>Finalize Checkout</Text>}
                        </TouchableOpacity>
                      ) : null}
                      {canCancelBookings ? (
                        <TouchableOpacity style={styles.cancelRefundBtnFull} onPress={() => openCancelModal(selectedBooking)}>
                          <Text style={styles.cancelRefundBtnText}>Cancel & Refund</Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                  )}
                  {selectedBooking.status === 'partial-completed' && (
                    <View style={[styles.cancelledNote, { backgroundColor: theme.colors.backgroundSecondary }]}>
                      <Text style={[styles.cancelledNoteText, { color: theme.colors.textSecondary }]}>
                        Partial Complete: Mark as fully completed once all balances are settled.
                      </Text>
                      {canApproveBookings ? (
                        <TouchableOpacity
                          style={[styles.completeBtnFull, { marginTop: 12 }]}
                          onPress={confirmResolvePartialCompleted}
                          disabled={actionLoading}
                        >
                          {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.completeBtnText}>Mark Fully Paid & Completed</Text>}
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                  {selectedBooking.status === 'completed' && (
                    canCancelBookings ? (
                      <TouchableOpacity style={styles.cancelRefundBtnFull} onPress={() => openCancelModal(selectedBooking)}>
                        <Text style={styles.cancelRefundBtnText}>Cancel & Refund</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.cancelledNote, { backgroundColor: theme.colors.backgroundSecondary }]}>
                        <Text style={[styles.cancelledNoteText, { color: theme.colors.textSecondary }]}>Cancellation is not allowed without cancel permission.</Text>
                      </View>
                    )
                  )}
                  {selectedBooking.status === 'cancelled' && (
                    <View style={[styles.cancelledNote, { backgroundColor: theme.colors.backgroundSecondary }]}>
                      <Text style={[styles.cancelledNoteText, { color: theme.colors.textSecondary }]}>This booking has been cancelled.</Text>
                    </View>
                  )}
                  {!canManageBookings ? (
                    <View style={[styles.cancelledNote, { backgroundColor: theme.colors.backgroundSecondary }]}>
                      <Text style={[styles.cancelledNoteText, { color: theme.colors.textSecondary }]}>No action is available for this booking based on your caretaker permissions.</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* Cancel Modal */}
      <Modal visible={cancelVisible} animationType="slide" onRequestClose={closeCancelModal}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Cancel Booking</Text>
            <TouchableOpacity onPress={closeCancelModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Reason</Text>
            <TextInput
              style={[styles.input, { height: 100, backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              multiline
              placeholder="Explain why this booking is cancelled"
              placeholderTextColor={theme.colors.textTertiary}
              value={cancelForm.reason}
              onChangeText={(text) => setCancelForm((prev) => ({ ...prev, reason: text }))}
            />
            <View style={styles.switchRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Refund payment?</Text>
              <Switch
                value={cancelForm.shouldRefund}
                onValueChange={(value) => setCancelForm((prev) => ({ ...prev, shouldRefund: value }))}
                trackColor={{ true: '#86EFAC', false: theme.colors.border }}
                thumbColor={cancelForm.shouldRefund ? theme.colors.primary : '#FFFFFF'}
              />
            </View>
            {cancelForm.shouldRefund ? (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Refund Amount</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                  keyboardType="numeric"
                  value={cancelForm.refundAmount}
                  onChangeText={(text) => setCancelForm((prev) => ({ ...prev, refundAmount: text }))}
                />
              </>
            ) : null}
          </ScrollView>
          <View style={[styles.modalActions, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity style={[styles.goBackBtn, { backgroundColor: theme.colors.backgroundSecondary }]} onPress={closeCancelModal}>
              <Text style={[styles.goBackBtnText, { color: theme.colors.textSecondary }]}>Go Back</Text>
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

