import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../../../../utils/imageUtils.js';
import { formatPrice } from '../../../../utils/price.js';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';
import PaymentService from '../../../../services/PaymentService.js';
import { normalizeActionError } from '../../../../utils/error.js';
import { getStyles } from '../../../../styles/Landlord/Payments.js';
import { hasPermission as checkPermission } from '../../../../utils/permissionHelpers.js';
import { showError, showSuccess, showWarning } from '../../../../utils/toast.js';

const STATUS_FILTERS = ['all', 'pending', 'pending_verification', 'paid', 'unpaid', 'partial', 'overdue', 'cancelled', 'refunded'];

const REFUND_FIXED_PENALTY_CENTS = 0;
const REFUND_ELIGIBLE_STATUSES = ['succeeded', 'paid', 'partially_refunded', 'refunded'];

const METHOD_OPTIONS = [
  { id: 'cash', label: 'Cash', icon: 'cash-outline' },
  { id: 'gcash', label: 'GCash', icon: 'phone-portrait-outline' },
  { id: 'bank_transfer', label: 'Bank', icon: 'card-outline' },
  { id: 'paymaya', label: 'PayMaya', icon: 'wallet-outline' },
];

const CASH_REJECTION_REASONS = [
  { id: 'invalid_proof', label: 'Invalid payment proof' },
  { id: 'duplicate_submission', label: 'Duplicate submission' },
  { id: 'wrong_amount', label: 'Amount does not match invoice' },
  { id: 'mismatched_reference', label: 'Reference does not match records' },
  { id: 'unclear_image', label: 'Proof image is unclear' },
  { id: 'other', label: 'Other' },
];
const CASH_REJECTION_REASON_IDS = CASH_REJECTION_REASONS.map((item) => item.id);

const getInvoiceTotal = (invoice) => parseFloat(invoice?.amount || ((invoice?.amount_cents ?? 0) / 100));

const getSettledAmount = (invoice) =>
  (invoice?.transactions || [])
    .filter((tx) => ['succeeded', 'paid', 'partially_refunded'].includes((tx?.status || '').toLowerCase()))
    .reduce((sum, tx) => {
      const txAmount = tx?.amount_cents ? tx.amount_cents / 100 : parseFloat(tx?.amount || 0);
      const refunded = tx?.refunded_amount_cents ? tx.refunded_amount_cents / 100 : 0;
      return sum + Math.max(0, txAmount - refunded);
    }, 0);

const getInvoiceStatus = (invoice) => {
  const bookingPayStatus = (invoice?.booking?.payment_status || invoice?.payment_status || '').toLowerCase();
  const invStatus = (invoice?.status || '').toLowerCase();
  const bookingStatus = (invoice?.booking?.status || '').toLowerCase();

  if (invStatus === 'pending_verification' || bookingPayStatus === 'pending_verification') {
    return 'pending_verification';
  }

  if (bookingPayStatus === 'refunded' || invStatus === 'refunded') return 'refunded';
  if (bookingPayStatus === 'cancelled' || invStatus === 'cancelled') return 'cancelled';
  if (bookingPayStatus === 'paid' || invStatus === 'paid') return 'paid';

  if (invStatus === 'partial' || bookingPayStatus === 'partial') return 'partial';
  if (invStatus === 'unpaid' || bookingPayStatus === 'unpaid') return 'unpaid';

  if (invoice?.due_date && new Date(invoice.due_date) < new Date()) return 'overdue';

  if (invStatus) return invStatus;
  if (bookingPayStatus) return bookingPayStatus;
  if (bookingStatus === 'pending') return 'pending';

  return 'pending';
};

const getStatusLabel = (status) => {
  if (!status) return 'Pending';
  if (status === 'pending_verification') return 'Cash Verify';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getRemainingAmount = (invoice) => Math.max(0, getInvoiceTotal(invoice) - getSettledAmount(invoice));

const buildTenantName = (invoice) => {
  const directTenant = invoice?.tenant;
  const bookingTenant = invoice?.booking?.tenant;

  const fromProfile =
    directTenant?.full_name ||
    [directTenant?.first_name, directTenant?.last_name].filter(Boolean).join(' ').trim() ||
    bookingTenant?.full_name ||
    [bookingTenant?.first_name, bookingTenant?.last_name].filter(Boolean).join(' ').trim();

  return (
    fromProfile ||
    invoice?.tenant_name ||
    invoice?.booking?.tenant_name ||
    'Tenant —'
  );
};

const buildRoomLabel = (invoice) => {
  const room = invoice?.booking?.room || invoice?.room || null;
  const rawRoomValue =
    room?.room_number ||
    room?.name ||
    room?.room_name ||
    invoice?.room_number ||
    invoice?.room_name ||
    invoice?.booking?.room_number ||
    invoice?.booking?.room_name ||
    null;

  if (!rawRoomValue) return 'Room —';

  const value = String(rawRoomValue).trim();
  if (!value) return 'Room —';
  return /^room\b/i.test(value) ? value : `Room ${value}`;
};

const toDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const getBillingPolicy = (booking) =>
  String(booking?.billing_policy || booking?.room?.billing_policy || 'monthly').toLowerCase();

const addCalendarMonth = (date, billingDay) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  const maxDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(billingDay, maxDay));
  return result;
};

const calculateMonthsElapsed = (startDate, currentDate, billingDay) => {
  if (!startDate || !currentDate) return 0;
  let months = 0;
  let cursor = new Date(startDate);
  while (cursor <= currentDate) {
    const nextBilling = addCalendarMonth(cursor, billingDay);
    if (nextBilling <= currentDate) {
      months++;
      cursor = nextBilling;
    } else {
      break;
    }
  }
  return months;
};

const calculateTotalMonths = (startDate, endDate, billingDay) => {
  if (!startDate || !endDate) return 0;
  let months = 0;
  let cursor = new Date(startDate);
  while (cursor < endDate) {
    months++;
    cursor = addCalendarMonth(cursor, billingDay);
  }
  return months;
};

const getStayProgress = (booking) => {
  const start = toDateOnly(booking?.start_date || booking?.checkIn);
  const end = toDateOnly(booking?.end_date || booking?.checkOut);
  if (!start || !end || end < start) return null;

  const today = toDateOnly(new Date());
  const totalDays = Math.max(1, Math.floor((end - start) / 86400000) + 1);
  const billingDay = booking?.billing_day || start.getDate();
  const billingPolicy = getBillingPolicy(booking);

  if (billingPolicy === 'daily') {
    let stayedDays = 0;
    if (today >= start && today <= end) stayedDays = Math.floor((today - start) / 86400000) + 1;
    else if (today > end) stayedDays = totalDays;
    const refundableDays = Math.max(0, totalDays - stayedDays);
    return { mode: 'daily', totalUnits: totalDays, usedUnits: stayedDays, refundableUnits: refundableDays, unitLabel: 'days', totalDays, stayedDays, refundableDays };
  }

  const totalMonths = calculateTotalMonths(start, end, billingDay);
  const usedMonths = calculateMonthsElapsed(start, today, billingDay);
  const refundableMonths = Math.max(0, totalMonths - usedMonths);

  return { mode: 'monthly', totalUnits: totalMonths, usedUnits: usedMonths, refundableUnits: refundableMonths, unitLabel: totalMonths === 1 ? 'month' : 'months', totalDays, stayedDays: Math.min(totalDays, Math.floor((today - start) / 86400000)), refundableDays: Math.max(0, totalDays - Math.floor((today - start) / 86400000)) };
};

const getTransactionRefundPreview = (invoice, tx, booking) => {
  if (!tx || !invoice) return null;
  const txAmountCents = Math.max(0, Number(tx.amount_cents || 0));
  const txRefundedCents = Math.max(0, Number(tx.refunded_amount_cents || 0));
  const txRemainingCents = Math.max(0, txAmountCents - txRefundedCents);
  if (txRemainingCents <= 0) return { maxRefundableCents: 0, txRemainingCents: 0, fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS, stayProgress: getStayProgress(booking) };

  const stayProgress = getStayProgress(booking);
  if (!stayProgress) return { maxRefundableCents: txRemainingCents, txRemainingCents, fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS, stayProgress: null };

  const paidBaseCents = (invoice.transactions || []).filter(l => Number(l.amount_cents || 0) > 0).filter(l => REFUND_ELIGIBLE_STATUSES.includes((l.status || '').toLowerCase())).reduce((s, l) => s + Math.max(0, Number(l.amount_cents || 0)), 0);
  const alreadyRefundedCents = (invoice.transactions || []).filter(l => Number(l.amount_cents || 0) > 0).reduce((s, l) => s + Math.max(0, Number(l.refunded_amount_cents || 0)), 0);
  const proratedCents = stayProgress.totalUnits > 0
    ? Math.floor((paidBaseCents * stayProgress.refundableUnits) / stayProgress.totalUnits)
    : 0;
  const invoiceCapCents = Math.max(0, proratedCents - REFUND_FIXED_PENALTY_CENTS - alreadyRefundedCents);
  return { maxRefundableCents: Math.min(txRemainingCents, invoiceCapCents), txRemainingCents, fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS, stayProgress };
};

const getInvoiceRefundPreview = (invoice, booking) => {
  if (!invoice) return null;
  const stayProgress = getStayProgress(booking);
  if (!stayProgress) return { maxRefundableCents: 0, fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS, stayProgress: null };

  const transactions = invoice.transactions || [];
  const positiveTransactions = transactions.filter(t => (t.amount_cents || 0) > 0);
  const totalPaidCents = positiveTransactions.reduce((sum, t) => sum + (t.amount_cents || 0), 0);
  const alreadyRefundedCents = positiveTransactions.reduce((sum, t) => sum + Math.max(0, Number(t.refunded_amount_cents || 0)), 0);
  const remainingTotalCents = Math.max(0, totalPaidCents - alreadyRefundedCents);

  if (totalPaidCents <= 0) return { maxRefundableCents: 0, fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS, stayProgress };

  const proratedCents = stayProgress.totalUnits > 0
    ? Math.floor((totalPaidCents * stayProgress.refundableUnits) / stayProgress.totalUnits)
    : 0;
  const invoiceCapCents = Math.max(0, proratedCents - REFUND_FIXED_PENALTY_CENTS - alreadyRefundedCents);

  return {
    maxRefundableCents: Math.min(remainingTotalCents, invoiceCapCents),
    fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS,
    stayProgress,
  };
};

export default function Payments({ navigation, route }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth > 768;
  const cardWidth = isTablet ? 260 : 220;
  const cardHeight = isTablet ? 86 : 78;

  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [statsRange, setStatsRange] = useState('month');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [refundingTxId, setRefundingTxId] = useState(null);
  const [showRefundPreview, setShowRefundPreview] = useState(false);
  const [refundPreviewData, setRefundPreviewData] = useState(null);
  const [refundTargetType, setRefundTargetType] = useState('merged');
  const [targetTx, setTargetTx] = useState(null);
  const [isRefundingInvoice, setIsRefundingInvoice] = useState(false);

  const [verifyingAction, setVerifyingAction] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reasonModalVisible, setReasonModalVisible] = useState(false);
  const [rejectReasonCode, setRejectReasonCode] = useState('unclear_image');
  const [rejectReason, setRejectReason] = useState('');
  const [recordData, setRecordData] = useState({ amount: '', method: 'cash', reference: '', notes: '' });
  const [pendingFocusInvoiceId, setPendingFocusInvoiceId] = useState(null);
  const [proofLightboxUrl, setProofLightboxUrl] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          setUser(JSON.parse(userString));
        }
      } catch (_error) { }
    };
    loadUser();
  }, []);

  const isCaretaker = user?.role === 'caretaker';
  const hasPermission = useCallback((key, aliases = []) => {
    return checkPermission(user?.caretaker_permissions, isCaretaker, key, aliases);
  }, [isCaretaker, user?.caretaker_permissions]);

  const canRecordPayments = !isCaretaker || hasPermission('record_payments');
  const canVoidPayments = !isCaretaker || hasPermission('void_payments');

  const getPaymentError = useCallback(
    (errorOrMessage, fallbackMessage) => normalizeActionError(errorOrMessage, fallbackMessage),
    [],
  );

  const formatRecordPaymentError = useCallback((errorOrMessage) => {
    const normalized = getPaymentError(errorOrMessage, 'Unable to record payment.');
    const lower = String(normalized || '').toLowerCase();
    if (/(given data was invalid|validation)/i.test(lower)) return 'Invalid payment details. Check amount and method.';
    if (/(selected method is invalid|\bmethod\b.*invalid)/i.test(lower)) return 'Payment method not supported.';
    if (/(amount_cents|amount cents|\bamount\b.*(required|invalid|integer|min))/i.test(lower)) return 'Invalid amount. Must be greater than 0.';
    if (/(unauthorized|forbidden|permission|access denied)/i.test(lower)) return 'No permission to record payments.';
    if (/(invoice not found|not found)/i.test(lower)) return 'Invoice not found. Refresh and try again.';
    return normalized;
  }, [getPaymentError]);

  const invoicesInfiniteQuery = useInfiniteQuery({
    queryKey: ['landlord', 'invoices', activeFilter, searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const params = {
        page: pageParam,
        status: activeFilter !== 'all' ? activeFilter : undefined,
        search: searchQuery || undefined,
        exclude_invoice_type: 'subscription',
      };
      const response = await PaymentService.getInvoices(params);
      if (!response.success) throw new Error(response.error || 'Failed to fetch invoices');
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.current_page < lastPage.pagination.last_page) {
        return lastPage.pagination.current_page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  const invoiceSummaryQuery = useQuery({
    queryKey: ['landlord', 'paymentSummary', statsRange],
    queryFn: async () => {
      const response = await PaymentService.getInvoiceSummary({
        range: statsRange,
        exclude_invoice_type: 'subscription',
      });
      if (!response.success) throw new Error(response.error || 'Failed to fetch summary');
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const invoices = useMemo(() => {
    return invoicesInfiniteQuery.data?.pages.flatMap((page) => page.items) || [];
  }, [invoicesInfiniteQuery.data]);

  const stats = useMemo(() => {
    const totals = invoiceSummaryQuery.data?.totals;
    if (!totals) {
      return { totalPaid: 0, totalBalance: 0, paidCount: 0, pendingCount: 0, overdueCount: 0, pendingVerifCount: 0 };
    }
    return {
      totalPaid: Number(totals.total_paid || 0),
      totalBalance: Number(totals.total_balance || 0),
      paidCount: Number(totals.paid_count || 0),
      pendingCount: Number(totals.pending_count || 0),
      overdueCount: Number(totals.overdue_count || 0),
      pendingVerifCount: Number(totals.pending_verification_count || 0),
    };
  }, [invoiceSummaryQuery.data]);

  const invoiceRefetchers = useMemo(() => [invoicesInfiniteQuery.refetch, invoiceSummaryQuery.refetch], [invoicesInfiniteQuery.refetch, invoiceSummaryQuery.refetch]);

  const openInvoiceModal = useCallback((invoice) => {
    if (!invoice) return;
    setSelectedInvoice(invoice);
    const remaining = getRemainingAmount(invoice);
    setRecordData({ amount: remaining > 0 ? remaining.toString() : '', method: 'cash', reference: '', notes: '' });
    setShowModal(true);
  }, []);

  useLandlordFocusRefetch({ refetchers: invoiceRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: invoiceRefetchers,
  });

  const handleLoadMore = () => {
    if (invoicesInfiniteQuery.hasNextPage && !invoicesInfiniteQuery.isFetchingNextPage) {
      invoicesInfiniteQuery.fetchNextPage();
    }
  };

  useEffect(() => {
    const params = route?.params;
    if (!params) return;
    const requestedFilter = typeof params.filter === 'string' ? params.filter.toLowerCase() : null;
    if (requestedFilter && STATUS_FILTERS.includes(requestedFilter)) setActiveFilter(requestedFilter);
    if (typeof params.searchQuery === 'string') setSearchQuery(params.searchQuery);
    if (params.focusInvoiceId) setPendingFocusInvoiceId(String(params.focusInvoiceId));

    if (typeof navigation?.setParams === 'function' && (params.filter !== undefined || params.searchQuery !== undefined)) {
      navigation.setParams({ filter: undefined, searchQuery: undefined });
    }
  }, [route?.params, navigation]);

  useEffect(() => {
    if (invoices.length === 0 || !pendingFocusInvoiceId) return;
    const targetInvoice = invoices.find((inv) => String(inv.id) === pendingFocusInvoiceId);
    if (targetInvoice) {
      openInvoiceModal(targetInvoice);
      setPendingFocusInvoiceId(null);
      if (typeof navigation?.setParams === 'function') {
        navigation.setParams({ focusInvoiceId: undefined });
      }
    }
  }, [invoices, pendingFocusInvoiceId, openInvoiceModal, navigation]);

  const handleUpdatePayment = async (status) => {
    if (!selectedInvoice?.booking_id) return;
    setUpdating(true);
    try {
      const res = await PaymentService.updateBookingPayment(selectedInvoice.booking_id, { payment_status: status });
      if (res.success) {
        setShowModal(false);
        await refetchLandlordQueries(invoiceRefetchers);
        showSuccess('Success', 'Payment status updated');
      } else {
        showError('Error', getPaymentError(res.error, 'Unable to update payment status.'));
      }
    } catch (error) {
      showError('Error', getPaymentError(error, 'Unable to update payment status.'));
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyCash = async (payload) => {
    if (!selectedInvoice?.id) return;
    const action = payload?.action;
    if (!action || !['approve', 'reject'].includes(action)) return;
    const reasonCode = String(payload?.reason_code || '').trim();
    const reason = String(payload?.reason || '').trim();
    if (action === 'reject' && (!CASH_REJECTION_REASON_IDS.includes(reasonCode) || !reason)) {
      showWarning('Validation', 'Please provide rejection reason and details.');
      return;
    }

    setVerifyingAction(action);
    try {
      const response = await PaymentService.verifyCash(selectedInvoice.id, action === 'approve' ? { action } : { action, reason_code: reasonCode, reason });
      if (response.success) {
        setShowRejectModal(false);
        setShowModal(false);
        await refetchLandlordQueries(invoiceRefetchers);
        showSuccess('Success', action === 'approve' ? 'Approved.' : 'Rejected.');
      } else {
        showError('Error', getPaymentError(response.error, 'Unable to verify.'));
      }
    } catch (error) {
      showError('Error', getPaymentError(error, 'Unable to verify.'));
    } finally {
      setVerifyingAction(null);
    }
  };

  const handleRecordPayment = async () => {
    const amountNum = parseFloat(recordData.amount);
    if (!recordData.amount || isNaN(amountNum) || amountNum <= 0) {
      showWarning('Validation', 'Enter a valid amount.');
      return;
    }
    if (!selectedInvoice?.id) return;
    setRecording(true);
    try {
      const res = await PaymentService.recordLandlordPayment(selectedInvoice.id, {
        amount_cents: Math.round(amountNum * 100),
        method: recordData.method,
        reference: recordData.reference || null,
        notes: recordData.notes || null,
      });
      if (res.success) {
        if (getSettledAmount(selectedInvoice) + amountNum >= getInvoiceTotal(selectedInvoice) && selectedInvoice.booking_id) {
          await PaymentService.updateBookingPayment(selectedInvoice.booking_id, { payment_status: 'paid' });
        }
        setShowModal(false);
        await refetchLandlordQueries(invoiceRefetchers);
        showSuccess('Success', 'Recorded.');
      } else {
        showError('Error', formatRecordPaymentError(res.error));
      }
    } catch (error) {
      showError('Error', formatRecordPaymentError(error));
    } finally {
      setRecording(false);
    }
  };

  const confirmMergedRefund = async () => {
    if (!selectedInvoice || !refundPreviewData) return;
    const maxRefund = refundPreviewData.maxRefundableCents;
    const isSingle = refundTargetType === 'single' && targetTx;
    
    if (isSingle) setRefundingTxId(targetTx.id);
    else setIsRefundingInvoice(true);

    try {
      const res = isSingle 
        ? await PaymentService.refundTransaction(targetTx.id, maxRefund)
        : await PaymentService.refundInvoice(selectedInvoice.id, maxRefund);
      
      if (res.success) {
        if (selectedInvoice.booking_id) await PaymentService.updateBookingPayment(selectedInvoice.booking_id, { payment_status: 'refunded' });
        showSuccess('Success', 'Refunded successfully.');
        setShowRefundPreview(false);
        setShowModal(false);
        await refetchLandlordQueries(invoiceRefetchers);
      } else {
        showError('Error', getPaymentError(res.error, 'Refund failed.'));
      }
    } catch (error) {
      showError('Error', getPaymentError(error, 'Refund failed.'));
    } finally {
      setRefundingTxId(null);
      setIsRefundingInvoice(false);
    }
  };

  const handleMergedRefund = () => {
    const preview = getInvoiceRefundPreview(selectedInvoice, selectedInvoice?.booking);
    if (!preview || preview.maxRefundableCents <= 0) {
      showWarning('No Refund', 'No refundable amount remaining.');
      return;
    }
    setRefundTargetType('merged');
    setTargetTx(null);
    setRefundPreviewData(preview);
    setShowRefundPreview(true);
  };

  const handleRefund = (tx) => {
    const preview = getTransactionRefundPreview(selectedInvoice, tx, selectedInvoice?.booking);
    if (!preview || preview.maxRefundableCents <= 0) {
      showWarning('No Refund', 'No refundable amount remaining.');
      return;
    }
    setRefundTargetType('single');
    setTargetTx(tx);
    setRefundPreviewData(preview);
    setShowRefundPreview(true);
  };

  const getStatusStyle = (status) => {
    const isDark = theme.isDark;
    switch (status?.toLowerCase()) {
      case 'paid': return { bg: isDark ? 'rgba(22,101,52,0.2)' : '#DCFCE7', fg: isDark ? '#4ade80' : '#166534' };
      case 'pending_verification': return { bg: isDark ? 'rgba(194,65,12,0.2)' : '#FFEDD5', fg: isDark ? '#fb923c' : '#C2410C' };
      case 'pending':
      case 'partial': return { bg: isDark ? 'rgba(146,64,14,0.2)' : '#FEF3C7', fg: isDark ? '#fbbf24' : '#92400E' };
      case 'unpaid':
      case 'overdue':
      case 'cancelled': return { bg: isDark ? 'rgba(153,27,27,0.2)' : '#FEE2E2', fg: isDark ? '#f87171' : '#991B1B' };
      case 'refunded': return { bg: isDark ? 'rgba(88,28,135,0.2)' : '#F3E8FF', fg: isDark ? '#a855f7' : '#7E22CE' };
      default: return { bg: isDark ? 'rgba(55,65,81,0.2)' : '#F3F4F6', fg: isDark ? '#9ca3af' : '#4B5563' };
    }
  };

  const flatListData = useMemo(() => [
    { id: 'sticky-search' },
    { id: 'sticky-filters' },
    ...invoices
  ], [invoices]);

  const renderInvoiceItem = useCallback(({ item }) => {
    if (item.id === 'sticky-search') {
      return (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput style={styles.searchInput} placeholder="Search..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#9CA3AF" />
            {searchQuery !== '' && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color="#9CA3AF" /></TouchableOpacity>}
          </View>
        </View>
      );
    }
    if (item.id === 'sticky-filters') {
      return (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity key={f} style={[styles.filterChip, activeFilter === f && styles.activeFilterChip]} onPress={() => setActiveFilter(f)}>
                <Text style={[styles.filterText, activeFilter === f && styles.activeFilterText]}>{getStatusLabel(f)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    const status = getInvoiceStatus(item);
    const style = getStatusStyle(status);
    const amount = item.amount || (item.amount_cents ? item.amount_cents / 100 : 0);

    return (
      <View style={[styles.invoiceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
        <View style={[styles.invoiceHeader, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.invoiceId, { color: theme.colors.text }]}>{item.reference || `INV-${item.id}`}</Text>
          <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
            <Text style={[styles.statusText, { color: style.fg }]}>{getStatusLabel(status)}</Text>
          </View>
        </View>
        <View style={styles.invoiceBody}>
          <View style={styles.infoRow}><Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} /><Text style={[styles.infoText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{`Tenant: ${buildTenantName(item)}`}</Text></View>
          <View style={styles.infoRow}><Ionicons name="business-outline" size={16} color={theme.colors.textSecondary} /><Text style={[styles.infoText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{`${item.property?.title || '—'} • ${buildRoomLabel(item)}`}</Text></View>
        </View>
        <View style={[styles.invoiceFooter, { borderTopColor: theme.colors.border }]}>
          <View><Text style={[styles.amountLabel, { color: theme.colors.textTertiary }]}>Amount</Text><Text style={[styles.amountValue, { color: theme.colors.text }]}>{formatPrice(amount)}</Text></View>
          <TouchableOpacity style={[styles.viewButton, { backgroundColor: theme.colors.primary }]} onPress={() => openInvoiceModal(item)}>
            <Text style={[styles.viewButtonText, { color: '#FFFFFF' }]}>{status === 'paid' ? 'Details' : 'Manage'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [activeFilter, searchQuery, theme, openInvoiceModal, styles]);

  const listHeaderComponent = useMemo(() => (
    <View style={{ backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
      <View style={styles.statsRangeContainer}>
        {[{ value: 'month', label: 'This Month' }, { value: 'all', label: 'All Time' }].map((o) => (
          <TouchableOpacity key={o.value} style={[styles.statsRangeChip, statsRange === o.value && styles.statsRangeChipActive]} onPress={() => setStatsRange(o.value)}>
            <Text style={[styles.statsRangeChipText, statsRange === o.value && styles.statsRangeChipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        {[
          { label: 'Collected', val: formatPrice(stats.totalPaid, { minimumFractionDigits: 0 }), icon: 'checkmark-circle', color: '#16a34a', bg: '#DCFCE7' },
          { label: 'Outstanding', val: formatPrice(stats.totalBalance, { minimumFractionDigits: 0 }), icon: 'time-outline', color: '#D97706', bg: '#FEF3C7' },
          { label: 'Paid', val: stats.paidCount, icon: 'receipt-outline', color: '#16a34a', bg: '#DCFCE7' },
          { label: 'Pending', val: stats.pendingCount, icon: 'hourglass-outline', color: '#92400E', bg: '#FEF3C7' },
          { label: 'Verify', val: stats.pendingVerifCount, icon: 'shield-checkmark-outline', color: '#C2410C', bg: '#FFEDD5' },
          { label: 'Overdue', val: stats.overdueCount, icon: 'alert-circle-outline', color: '#DC2626', bg: '#FEE2E2' },
        ].map((card, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.isDark ? theme.colors.surface : card.bg, borderRadius: 14, paddingHorizontal: 14, width: cardWidth, height: cardHeight, borderWidth: 1, borderColor: theme.isDark ? theme.colors.border : 'transparent', marginRight: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
              <Ionicons name={card.icon} size={18} color={theme.isDark ? theme.colors.textSecondary : card.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.isDark ? theme.colors.text : card.color, textTransform: 'uppercase' }}>{card.label}</Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: theme.isDark ? theme.colors.text : card.color }}>{card.val}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  ), [statsRange, stats, theme, cardWidth, cardHeight, styles]);

  if (invoicesInfiniteQuery.isPending && !invoicesInfiniteQuery.data && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#FFFFFF" /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Payments</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PaymentLogs')} style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.18)' }}><Ionicons name="reader-outline" size={20} color="#FFFFFF" /></TouchableOpacity>
      </View>

      <FlatList
        data={flatListData}
        renderItem={renderInvoiceItem}
        keyExtractor={(item, index) => item.id?.toString() || `sticky-${index}`}
        stickyHeaderIndices={[0, 1]}
        ListHeaderComponent={listHeaderComponent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#16a34a']} tintColor="#16a34a" />}
        ListFooterComponent={invoicesInfiniteQuery.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 20 }} color="#16a34a" /> : null}
        ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="receipt-outline" size={64} color="#D1D5DB" /><Text style={styles.emptyTitle}>No invoices found</Text></View>}
      />

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: theme.isDark ? 1 : 0 }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <View style={{ flex: 1 }}><Text style={[styles.modalTitle, { color: theme.colors.text }]}>Details</Text><Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{selectedInvoice?.reference || `INV-${selectedInvoice?.id}`}</Text></View>
                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}><Ionicons name="close" size={24} color={theme.colors.textSecondary} /></TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {selectedInvoice && (
                  <View style={[styles.summaryCard, { backgroundColor: theme.colors.backgroundSecondary, padding: 14, borderRadius: 10, marginBottom: 20 }]}>
                    <View style={styles.summaryRow}><View style={{ flex: 1 }}><Text style={styles.summaryLabel}>Tenant</Text><Text style={styles.summaryValue}>{buildTenantName(selectedInvoice)}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={styles.summaryLabel}>Balance</Text><Text style={[styles.summaryValue, { color: '#D97706' }]}>{formatPrice(getRemainingAmount(selectedInvoice))}</Text></View></View>
                  </View>
                )}

                {/* Proof of Payment Section */}
                {(() => {
                  const txWithProof = (selectedInvoice?.transactions || []).find(tx => tx.proof_image_url);
                  if (!txWithProof) return null;

                  return (
                    <View style={{ marginBottom: 24, padding: 16, backgroundColor: theme.isDark ? 'rgba(99,102,241,0.08)' : '#F5F3FF', borderRadius: 14, borderWidth: 1, borderColor: theme.isDark ? 'rgba(99,102,241,0.2)' : '#DDD6FE' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.isDark ? '#818cf8' : '#4F46E5', textTransform: 'uppercase', marginBottom: 12 }}>Proof of Payment</Text>
                      <Pressable 
                        style={{ width: '100%', height: 180, borderRadius: 10, overflow: 'hidden', backgroundColor: theme.colors.background }}
                        onPress={() => setProofLightboxUrl(txWithProof.proof_image_url)}
                      >
                        <Image 
                          source={{ uri: txWithProof.proof_image_url }} 
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                        <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 6 }}>
                          <Ionicons name="expand-outline" size={16} color="#fff" />
                        </View>
                      </Pressable>
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 8 }}
                        onPress={() => setProofLightboxUrl(txWithProof.proof_image_url)}
                      >
                        <Ionicons name="eye-outline" size={16} color={theme.isDark ? '#818cf8' : '#4F46E5'} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.isDark ? '#818cf8' : '#4F46E5' }}>Inspect Proof</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}

                {getInvoiceStatus(selectedInvoice) === 'pending_verification' ? (
                  <View style={styles.verificationSection}>
                    <Text style={styles.verificationTitle}>Cash Payment Pending</Text>
                    <View style={styles.verificationActionRow}>
                      <TouchableOpacity style={[styles.verifyButton, styles.verifyApproveButton]} onPress={() => handleVerifyCash({ action: 'approve' })} disabled={!!verifyingAction}><Text style={styles.verifyButtonText}>Approve</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.verifyButton, styles.verifyRejectButton]} onPress={() => setShowRejectModal(true)} disabled={!!verifyingAction}><Text style={styles.verifyButtonText}>Reject</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>Amount Paid (₱) *</Text>
                    <TextInput style={styles.fieldInput} keyboardType="decimal-pad" value={recordData.amount} onChangeText={(v) => setRecordData((d) => ({ ...d, amount: v }))} />
                    <TouchableOpacity style={[styles.recordButton, { backgroundColor: theme.colors.primary }]} onPress={handleRecordPayment} disabled={recording}><Text style={styles.recordButtonText}>{recording ? '...' : 'Record Payment'}</Text></TouchableOpacity>
                  </>
                )}
                
                {Array.isArray(selectedInvoice?.transactions) && selectedInvoice.transactions.length > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>History</Text>
                    {selectedInvoice.transactions.map((tx, idx) => (
                      <View key={tx.id || idx} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                        <Text style={{ color: theme.colors.text }}>{formatPrice(tx.amount_cents ? tx.amount_cents / 100 : tx.amount)} • {tx.status}</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}><Text style={styles.cancelButtonText}>Close</Text></TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '92%', backgroundColor: theme.colors.surface, padding: 20 }]}>
            <Text style={styles.modalTitle}>Reject Payment</Text>
            <TextInput style={styles.fieldInput} placeholder="Reason..." value={rejectReason} onChangeText={setRejectReason} multiline numberOfLines={3} />
            <TouchableOpacity style={[styles.recordButton, { backgroundColor: '#DC2626' }]} onPress={() => handleVerifyCash({ action: 'reject', reason_code: rejectReasonCode, reason: rejectReason })}><Text style={styles.recordButtonText}>Reject</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}><Text style={styles.cancelButtonText}>Close</Text></TouchableOpacity>
            </View>
            </View>
            </Modal>

            {/* Proof Lightbox */}
            <Modal
            visible={!!proofLightboxUrl}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setProofLightboxUrl(null)}
            >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
            onPress={() => setProofLightboxUrl(null)}
            >
            <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {proofLightboxUrl ? (
            <Image 
              source={{ uri: proofLightboxUrl }} 
              style={{ width: '100%', height: '80%' }} 
              resizeMode="contain" 
            />
            ) : null}
            </View>
            </Modal>
            </SafeAreaView>
            );
            }

