import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { useUIState } from '../../../../contexts/UIStateContext.jsx';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';
import PaymentService from '../../../../services/PaymentService.js';
import { getStyles } from '../../../../styles/Landlord/Payments.js';

const STATUS_FILTERS = ['all', 'pending', 'pending_verification', 'paid', 'unpaid', 'partial', 'overdue', 'cancelled', 'refunded'];

const REFUND_FIXED_PENALTY_CENTS = 0;
const REFUND_ELIGIBLE_STATUSES = ['succeeded', 'paid', 'partially_refunded', 'refunded'];
const EMPTY_INVOICES = [];

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

const getInvoiceStatsDate = (invoice) => {
  const raw = invoice?.issued_at || invoice?.created_at || invoice?.due_date || null;
  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
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

const getStayProgress = (booking) => {
  const start = toDateOnly(booking?.start_date || booking?.checkIn);
  const end = toDateOnly(booking?.end_date || booking?.checkOut);
  if (!start || !end || end < start) return null;

  const today = toDateOnly(new Date());
  const totalDays = Math.max(1, Math.floor((end - start) / 86400000) + 1);
  const billingPolicy = getBillingPolicy(booking);

  if (billingPolicy === 'daily') {
    let stayedDays = 0;
    if (today >= start && today <= end) stayedDays = Math.floor((today - start) / 86400000) + 1;
    else if (today > end) stayedDays = totalDays;
    const refundableDays = Math.max(0, totalDays - stayedDays);
    return { mode: 'daily', totalUnits: totalDays, usedUnits: stayedDays, refundableUnits: refundableDays, refundableRatio: totalDays > 0 ? refundableDays / totalDays : 0, unitLabel: 'days', totalDays, stayedDays, refundableDays };
  }

  const totalMonths = Math.max(1, Number(booking?.total_months || Math.ceil(totalDays / 30)));
  let elapsedDays = 0;
  if (today > start && today <= end) elapsedDays = Math.floor((today - start) / 86400000);
  else if (today > end) elapsedDays = totalMonths * 30;
  const usedMonths = Math.min(totalMonths, Math.max(0, Math.floor(elapsedDays / 30)));
  const refundableMonths = Math.max(0, totalMonths - usedMonths);
  return { mode: 'monthly', totalUnits: totalMonths, usedUnits: usedMonths, refundableUnits: refundableMonths, refundableRatio: totalMonths > 0 ? refundableMonths / totalMonths : 0, unitLabel: totalMonths === 1 ? 'month' : 'months', totalDays, stayedDays: Math.min(totalDays, elapsedDays), refundableDays: Math.max(0, totalDays - elapsedDays) };
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
  const proratedCents = Math.floor((paidBaseCents * stayProgress.refundableUnits) / stayProgress.totalUnits);
  const invoiceCapCents = Math.max(0, proratedCents - REFUND_FIXED_PENALTY_CENTS - alreadyRefundedCents);
  return { maxRefundableCents: Math.min(txRemainingCents, invoiceCapCents), txRemainingCents, fixedPenaltyCents: REFUND_FIXED_PENALTY_CENTS, stayProgress };
};

export default function Payments({ navigation, route }) {
  const { theme } = useTheme();
  const { showAlert } = useUIState();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [statsRange, setStatsRange] = useState('month');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [refundingTxId, setRefundingTxId] = useState(null);
  const [verifyingAction, setVerifyingAction] = useState(null);
  const [recordData, setRecordData] = useState({ amount: '', method: 'cash', reference: '', notes: '' });
  const [pendingFocusInvoiceId, setPendingFocusInvoiceId] = useState(null);

  const invoicesQuery = useQuery({
    queryKey: landlordQueryKeys.invoices(),
    queryFn: async () => {
      const response = await PaymentService.getInvoices({
        exclude_invoice_type: 'subscription',
        _t: Date.now(),
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch invoices');
      }

      let data = response.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data = data.invoices || data.data || [];
      }

      return Array.isArray(data) ? data : EMPTY_INVOICES;
    },
    placeholderData: (previousData) => previousData,
  });

  const invoices = invoicesQuery.data || EMPTY_INVOICES;
  const loading = invoicesQuery.isPending && invoices.length === 0;
  const refetchInvoices = invoicesQuery.refetch;

  const invoiceSummaryQuery = useQuery({
    queryKey: landlordQueryKeys.invoiceSummary(statsRange),
    queryFn: async () => {
      const response = await PaymentService.getInvoiceSummary({
        range: statsRange === 'month' ? 'month' : 'all',
        exclude_invoice_type: 'subscription',
        _t: Date.now(),
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch invoice summary');
      }

      return response.data || null;
    },
    placeholderData: (previousData) => previousData,
  });

  const invoiceSummary = invoiceSummaryQuery.data || null;
  const refetchInvoiceSummary = invoiceSummaryQuery.refetch;
  const invoiceRefetchers = useMemo(
    () => [refetchInvoices, refetchInvoiceSummary],
    [refetchInvoices, refetchInvoiceSummary],
  );

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

  useEffect(() => {
    const requestedFilterRaw = route?.params?.filter;
    const requestedFilter =
      typeof requestedFilterRaw === 'string' ? requestedFilterRaw.toLowerCase() : null;
    const requestedSearch = route?.params?.searchQuery;
    const focusInvoiceId = route?.params?.focusInvoiceId;
    const drilldownToken = route?.params?.drilldownToken;

    if (requestedFilter && STATUS_FILTERS.includes(requestedFilter)) {
      setActiveFilter(requestedFilter);
    }

    if (typeof requestedSearch === 'string') {
      setSearchQuery(requestedSearch);
    }

    if (focusInvoiceId) {
      setPendingFocusInvoiceId(String(focusInvoiceId));
    }

    // Consume one-shot drilldown params so they do not leak into later generic visits.
    if (
      typeof navigation?.setParams === 'function' &&
      (requestedFilterRaw !== undefined || requestedSearch !== undefined || drilldownToken !== undefined)
    ) {
      navigation.setParams({
        filter: undefined,
        searchQuery: undefined,
        drilldownToken: undefined,
      });
    }
  }, [
    route?.params?.filter,
    route?.params?.searchQuery,
    route?.params?.focusInvoiceId,
    route?.params?.drilldownToken,
    navigation,
  ]);

  useEffect(() => {
    if (!pendingFocusInvoiceId || invoices.length === 0) return;

    const targetInvoice = invoices.find((invoice) => String(invoice.id) === String(pendingFocusInvoiceId));
    if (!targetInvoice) return;

    openInvoiceModal(targetInvoice);
    setPendingFocusInvoiceId(null);

    if (typeof navigation?.setParams === 'function') {
      navigation.setParams({
        focusInvoiceId: undefined,
      });
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
        showAlert('Success', 'Payment status updated');
      } else {
        showAlert('Error', res.error || 'Failed to update status');
      }
    } catch {
      showAlert('Error', 'An unexpected error occurred');
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyCash = async (action) => {
    if (!selectedInvoice?.id) return;

    setVerifyingAction(action);
    try {
      const response = await PaymentService.verifyCash(selectedInvoice.id, action);
      if (!response.success) {
        showAlert('Error', response.error || 'Failed to verify cash payment');
        return;
      }

      setShowModal(false);
      await refetchLandlordQueries(invoiceRefetchers);
      showAlert(
        'Success',
        action === 'approve'
          ? 'Cash payment approved successfully.'
          : 'Cash payment rejected successfully.',
      );
    } catch {
      showAlert('Error', 'An unexpected error occurred');
    } finally {
      setVerifyingAction(null);
    }
  };

  const handleRecordPayment = async () => {
    const amountNum = parseFloat(recordData.amount);
    if (!recordData.amount || isNaN(amountNum) || amountNum <= 0) {
      showAlert('Validation', 'Please enter a valid amount.');
      return;
    }
    if (!selectedInvoice?.id) {
      showAlert('Error', 'No invoice selected.');
      return;
    }
    setRecording(true);
    try {
      const res = await PaymentService.recordLandlordPayment(selectedInvoice.id, {
        amount_cents: Math.round(amountNum * 100),
        method: recordData.method,
        reference: recordData.reference || null,
        notes: recordData.notes || null,
      });
      if (res.success) {
        // Calculate if full payment reached to auto-update booking status
        const invoiceTotal = getInvoiceTotal(selectedInvoice);
        const currentPaid = getSettledAmount(selectedInvoice);
        
        if (currentPaid + amountNum >= invoiceTotal && selectedInvoice.booking_id) {
           // Auto-update booking to paid if threshold reached
           await PaymentService.updateBookingPayment(selectedInvoice.booking_id, { payment_status: 'paid' });
        }

        setShowModal(false);
        setRecordData({ amount: '', method: 'cash', reference: '', notes: '' });
        await refetchLandlordQueries(invoiceRefetchers);
        showAlert('Success', 'Payment recorded successfully.');
      } else {
        showAlert('Error', res.error || 'Failed to record payment');
      }
    } catch {
      showAlert('Error', 'An unexpected error occurred');
    } finally {
      setRecording(false);
    }
  };

  const handleRefund = async (tx) => {
    if (!tx || !tx.id) return;

    // Calculate prorated refund preview
    const booking = selectedInvoice?.booking || null;
    const preview = getTransactionRefundPreview(selectedInvoice, tx, booking);
    const maxRefund = preview ? preview.maxRefundableCents : (tx.amount_cents || 0);

    if (maxRefund <= 0) {
      showAlert('No Refund Available', 'This transaction has no refundable amount remaining based on the stay progress.');
      return;
    }

    const stayInfo = preview?.stayProgress
      ? `\n\nStay Progress: ${preview.stayProgress.usedUnits}/${preview.stayProgress.totalUnits} ${preview.stayProgress.unitLabel} used`
        + (preview.fixedPenaltyCents > 0 ? `\nPenalty: ₱${(preview.fixedPenaltyCents / 100).toLocaleString()}` : '')
      : '';

    showAlert(
      'Confirm Prorated Refund',
      `Max refundable: ₱${(maxRefund / 100).toLocaleString()}${stayInfo}\n\nAre you sure? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Refund',
          style: 'destructive',
          onPress: async () => {
            setRefundingTxId(tx.id);
            try {
              const res = await PaymentService.refundTransaction(tx.id, maxRefund);
              if (res.success) {
                if (selectedInvoice.booking_id) {
                  await PaymentService.updateBookingPayment(selectedInvoice.booking_id, { payment_status: 'refunded' });
                }
                showAlert('Success', `Refunded ₱${(maxRefund / 100).toLocaleString()} successfully`);
                await refetchLandlordQueries(invoiceRefetchers);
                setShowModal(false);
              } else {
                showAlert('Error', res.error || 'Failed to refund transaction');
              }
            } catch {
              showAlert('Error', 'An unexpected error occurred during refund');
            } finally {
              setRefundingTxId(null);
            }
          }
        }
      ]
    );
  };

  const filteredInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    return invoices.filter(inv => {
      const status = getInvoiceStatus(inv);
      const bookingStatus = (inv.booking?.status || '').toLowerCase();

      const matchesFilter = activeFilter === 'all' || status === activeFilter;
      
      if (!matchesFilter) return false;
      if (activeFilter === 'all' && (bookingStatus === 'cancelled' || bookingStatus === 'pending')) return false;
      
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const ref = (inv.reference || inv.id || '').toString().toLowerCase();
      const tenant = ((inv.tenant?.full_name || `${inv.tenant?.first_name || ''} ${inv.tenant?.last_name || ''}`) || '').toLowerCase();
      const property = (inv.property?.title || inv.property_title || inv.booking?.property?.title || '').toLowerCase();
      
      return ref.includes(q) || tenant.includes(q) || property.includes(q);
    });
  }, [invoices, activeFilter, searchQuery]);

  const statsSourceInvoices = useMemo(() => {
    if (statsRange === 'all') {
      return invoices;
    }

    const now = new Date();
    return invoices.filter((inv) => {
      const date = getInvoiceStatsDate(inv);
      if (!date) return false;

      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
  }, [invoices, statsRange]);

  // ──── Payment Stats (W4) ────
  const fallbackStats = useMemo(() => {
    const s = {
      totalPaid: 0,
      totalBalance: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      pendingVerifCount: 0,
    };
    statsSourceInvoices.forEach(inv => {
      const status = getInvoiceStatus(inv);
      const total = inv.amount_cents ? inv.amount_cents / 100 : Number(inv.amount || 0);
      const paid = (inv.transactions || []).filter(tx => ['succeeded', 'paid', 'partially_refunded'].includes(tx.status)).reduce((sum, tx) => {
        const txAmt = tx.amount_cents ? tx.amount_cents / 100 : Number(tx.amount || 0);
        const txRef = tx.refunded_amount_cents ? tx.refunded_amount_cents / 100 : 0;
        return sum + (txAmt - txRef);
      }, 0);
      s.totalPaid += paid;
      s.totalBalance += Math.max(0, total - paid);
      if (status === 'paid') s.paidCount++;
      else if (status === 'pending_verification') s.pendingVerifCount++;
      else if (['pending', 'unpaid', 'partial'].includes(status)) s.pendingCount++;
      else if (status === 'overdue') s.overdueCount++;
    });
    return s;
  }, [statsSourceInvoices]);

  const stats = useMemo(() => {
    const totals = invoiceSummary?.totals;
    if (!totals) {
      return fallbackStats;
    }

    const totalPaid = Number(
      totals.total_paid ??
        ((Number.isFinite(Number(totals.total_paid_cents))
          ? Number(totals.total_paid_cents)
          : 0) /
          100),
    );
    const totalBalance = Number(
      totals.total_balance ??
        ((Number.isFinite(Number(totals.total_balance_cents))
          ? Number(totals.total_balance_cents)
          : 0) /
          100),
    );

    return {
      totalPaid,
      totalBalance,
      paidCount: Number(totals.paid_count || 0),
      pendingCount: Number(totals.pending_count || 0),
      overdueCount: Number(totals.overdue_count || 0),
      pendingVerifCount: Number(totals.pending_verification_count || 0),
    };
  }, [invoiceSummary, fallbackStats]);

  const getStatusStyle = (status) => {
    const isDark = theme.isDark;
    switch (status?.toLowerCase()) {
      case 'paid': 
        return { bg: isDark ? 'rgba(22,101,52,0.2)' : '#DCFCE7', fg: isDark ? '#4ade80' : '#166534' };
      case 'pending_verification': 
        return { bg: isDark ? 'rgba(194,65,12,0.2)' : '#FFEDD5', fg: isDark ? '#fb923c' : '#C2410C' };
      case 'pending':
      case 'partial': 
        return { bg: isDark ? 'rgba(146,64,14,0.2)' : '#FEF3C7', fg: isDark ? '#fbbf24' : '#92400E' };
      case 'unpaid':
      case 'cancelled': 
        return { bg: isDark ? 'rgba(153,27,27,0.2)' : '#FEE2E2', fg: isDark ? '#f87171' : '#991B1B' };
      case 'refunded': 
        return { bg: isDark ? 'rgba(88,28,135,0.2)' : '#F3E8FF', fg: isDark ? '#a855f7' : '#7E22CE' };
      default: 
        return { bg: isDark ? 'rgba(55,65,81,0.2)' : '#F3F4F6', fg: isDark ? '#9ca3af' : '#4B5563' };
    }
  };

  const renderInvoiceItem = ({ item }) => {
    const status = getInvoiceStatus(item);

    const statusStyle = getStatusStyle(status);
    const amount = item.amount || (item.amount_cents ? item.amount_cents / 100 : 0);
    const tenantName = item.tenant?.full_name || (item.tenant ? `${item.tenant.first_name} ${item.tenant.last_name}` : '—');
    const propertyTitle = item.property?.title || item.property_title || item.booking?.property?.title || '—';
    const roomNumber = item.booking?.room?.room_number || '—';
    
    return (
      <View style={[styles.invoiceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
        <View style={[styles.invoiceHeader, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.invoiceId, { color: theme.colors.text }]}>{item.reference || `INV-${item.id}`}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.fg }]}>{getStatusLabel(status)}</Text>
          </View>
        </View>

        <View style={styles.invoiceBody}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{tenantName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {propertyTitle} {roomNumber !== '—' ? `• Room ${roomNumber}` : ''}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              {item.issued_at ? new Date(item.issued_at).toLocaleDateString() : '—'}
            </Text>
          </View>
        </View>

        <View style={[styles.invoiceFooter, { borderTopColor: theme.colors.border }]}>
          <View>
            <Text style={[styles.amountLabel, { color: theme.colors.textTertiary }]}>Amount</Text>
            <Text style={[styles.amountValue, { color: theme.colors.text }]}>₱{parseFloat(amount).toLocaleString()}</Text>
          </View>
          {item.booking_id && (
            <TouchableOpacity 
              style={[styles.viewButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => openInvoiceModal(item)}
            >
              <Text style={[styles.viewButtonText, { color: '#FFFFFF' }]}>{status === 'paid' ? 'Details' : 'Manage'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading payments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Payments & Invoices</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by invoice, tenant, property..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.activeFilterChip]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
                {getStatusLabel(filter)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Stats Summary Cards (W4) ── */}
      {invoices.length > 0 && (
        <>
          <View style={styles.statsRangeContainer}>
            {[
              { value: 'month', label: 'This Month' },
              { value: 'all', label: 'All Time' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.statsRangeChip,
                  statsRange === option.value && styles.statsRangeChipActive,
                ]}
                onPress={() => setStatsRange(option.value)}
              >
                <Text
                  style={[
                    styles.statsRangeChipText,
                    statsRange === option.value && styles.statsRangeChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
            {[
              { label: statsRange === 'month' ? 'Collected (Month)' : 'Collected', value: `₱${stats.totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: 'checkmark-circle', color: '#16a34a', bg: '#DCFCE7' },
              { label: statsRange === 'month' ? 'Outstanding (Month)' : 'Outstanding', value: `₱${stats.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: 'time-outline', color: '#D97706', bg: '#FEF3C7' },
              { label: statsRange === 'month' ? 'Paid (Month)' : 'Paid', value: stats.paidCount, icon: 'receipt-outline', color: '#16a34a', bg: '#DCFCE7' },
              { label: statsRange === 'month' ? 'Pending (Month)' : 'Pending', value: stats.pendingCount, icon: 'hourglass-outline', color: '#92400E', bg: '#FEF3C7' },
              { label: statsRange === 'month' ? 'Cash Verify (Month)' : 'Cash Verify', value: stats.pendingVerifCount, icon: 'shield-checkmark-outline', color: '#C2410C', bg: '#FFEDD5' },
              { label: statsRange === 'month' ? 'Overdue (Month)' : 'Overdue', value: stats.overdueCount, icon: 'alert-circle-outline', color: '#DC2626', bg: '#FEE2E2' },
            ].map((card, i) => (
              <View key={i} style={{ backgroundColor: theme.isDark ? theme.colors.surface : card.bg, borderRadius: 12, padding: 14, minWidth: 110, borderWidth: 1, borderColor: theme.isDark ? theme.colors.border : 'transparent' }}>
                <Ionicons name={card.icon} size={20} color={theme.isDark ? theme.colors.textSecondary : card.color} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: theme.isDark ? theme.colors.text : card.color, marginTop: 6 }}>{card.value}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: theme.isDark ? theme.colors.textSecondary : card.color, opacity: 0.8, marginTop: 2 }}>{card.label}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#16a34a']}
            tintColor="#16a34a"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No invoices found</Text>
            <Text style={styles.emptySubtitle}>Payments will appear here once bookings are confirmed.</Text>
          </View>
        }
      />

      {/* Manage Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: theme.isDark ? 1 : 0 }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Manage Payment</Text>
                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Invoice Summary */}
                <View style={[styles.summaryGrid, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Tenant</Text>
                    <Text style={[styles.summaryValue, { color: theme.colors.text }]} numberOfLines={2}>
                      {selectedInvoice?.tenant?.full_name || (selectedInvoice?.tenant ? `${selectedInvoice.tenant.first_name} ${selectedInvoice.tenant.last_name}` : '—')}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Invoice Total</Text>
                    <Text style={[styles.summaryValue, { color: theme.isDark ? '#4ade80' : '#16a34a' }]}>
                      ₱{parseFloat(selectedInvoice?.amount || ((selectedInvoice?.amount_cents ?? 0) / 100)).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Status-based Conditional Rendering */}
                {(() => {
                  const status = getInvoiceStatus(selectedInvoice);

                  const isSettled = ['paid', 'refunded', 'cancelled'].includes(status);
                  
                  if (isSettled) return null;

                  if (status === 'pending_verification') {
                    return (
                      <View style={[styles.verificationSection, { backgroundColor: theme.isDark ? 'rgba(194,65,12,0.1)' : '#FFF7ED', borderColor: theme.isDark ? '#C2410C' : '#FFEDD5' }]}>
                        <View style={styles.verificationHeader}>
                          <Ionicons name="shield-checkmark-outline" size={24} color="#C2410C" />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.verificationTitle, { color: theme.colors.text }]}>Cash Payment Awaiting Verification</Text>
                            <Text style={[styles.verificationSubtitle, { color: theme.colors.textSecondary }]}>
                              The tenant reported this invoice as paid in cash. Approve or reject after checking proof.
                            </Text>
                          </View>
                        </View>

                        <View style={styles.verificationActionRow}>
                          <TouchableOpacity
                            style={[styles.verifyButton, styles.verifyApproveButton]}
                            onPress={() => handleVerifyCash('approve')}
                            disabled={Boolean(verifyingAction)}
                          >
                            {verifyingAction === 'approve' ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.verifyButtonText}>Approve Payment</Text>
                              </>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.verifyButton, styles.verifyRejectButton]}
                            onPress={() => handleVerifyCash('reject')}
                            disabled={Boolean(verifyingAction)}
                          >
                            {verifyingAction === 'reject' ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.verifyButtonText}>Reject Payment</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <>
                      {/* ── Record a Payment ── */}
                      <View style={[styles.sectionDivider, { borderTopColor: theme.colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Record a Payment</Text>
                      </View>

                      {/* Amount */}
                      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Amount Paid (₱) *</Text>
                      <TextInput
                        style={[styles.fieldInput, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text, borderColor: theme.colors.border }]}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 5000"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={recordData.amount}
                        onChangeText={(v) => setRecordData((d) => ({ ...d, amount: v }))}
                        returnKeyType="done"
                      />

                      {/* Payment Method */}
                      <Text style={[styles.fieldLabel, { marginTop: 16, color: theme.colors.textSecondary }]}>Payment Method *</Text>
                      <View style={styles.methodRow}>
                        {[
                          { id: 'cash', label: 'Cash' },
                          { id: 'gcash', label: 'GCash' },
                          { id: 'bank_transfer', label: 'Bank' },
                          { id: 'check', label: 'Check' },
                          { id: 'other', label: 'Other' },
                        ].map((m) => (
                          <TouchableOpacity
                            key={m.id}
                            style={[
                              styles.methodChip,
                              { backgroundColor: theme.colors.backgroundSecondary },
                              recordData.method === m.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                            ]}
                            onPress={() => setRecordData((d) => ({ ...d, method: m.id }))}
                          >
                            <Text style={[
                              styles.methodChipText,
                              { color: theme.colors.textSecondary },
                              recordData.method === m.id && { color: theme.colors.textInverse, fontWeight: '700' },
                            ]}>{m.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Reference */}
                      <Text style={[styles.fieldLabel, { marginTop: 16, color: theme.colors.textSecondary }]}>Reference # (Optional)</Text>
                      <TextInput
                        style={[styles.fieldInput, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text, borderColor: theme.colors.border }]}
                        placeholder="Transaction / OR number…"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={recordData.reference}
                        onChangeText={(v) => setRecordData((d) => ({ ...d, reference: v }))}
                      />

                      {/* Notes */}
                      <Text style={[styles.fieldLabel, { marginTop: 16, color: theme.colors.textSecondary }]}>Notes (Optional)</Text>
                      <TextInput
                        style={[styles.fieldInput, styles.fieldTextarea, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text, borderColor: theme.colors.border }]}
                        placeholder="Add any internal notes…"
                        placeholderTextColor={theme.colors.textTertiary}
                        multiline
                        numberOfLines={3}
                        value={recordData.notes}
                        onChangeText={(v) => setRecordData((d) => ({ ...d, notes: v }))}
                      />

                      <TouchableOpacity
                        style={[styles.recordButton, recording && { opacity: 0.6 }]}
                        onPress={handleRecordPayment}
                        disabled={recording}
                      >
                        {recording ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.recordButtonText}>Record Payment</Text>
                        )}
                      </TouchableOpacity>

                      {/* ── Quick Status Update ── */}
                      <View style={[styles.sectionDivider, { marginTop: 24, borderTopColor: theme.colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Quick Status Update</Text>
                      </View>

                      <View style={styles.statusGrid}>
                        {[
                          { id: 'unpaid', label: 'Unpaid', color: theme.isDark ? 'rgba(153,27,27,0.2)' : '#FEE2E2', text: theme.isDark ? '#f87171' : '#991B1B', border: theme.isDark ? '#991B1B' : '#FCA5A5' },
                          { id: 'partial', label: 'Partial', color: theme.isDark ? 'rgba(146,64,14,0.2)' : '#FEF3C7', text: theme.isDark ? '#fbbf24' : '#92400E', border: theme.isDark ? '#92400E' : '#FCD34D' },
                          { id: 'paid', label: 'Paid', color: theme.isDark ? 'rgba(22,101,52,0.2)' : '#DCFCE7', text: theme.isDark ? '#4ade80' : '#166534', border: theme.isDark ? '#166534' : '#86EFAC' },
                        ].map((s) => (
                          <TouchableOpacity
                            key={s.id}
                            style={[styles.statusOption, { backgroundColor: s.color, borderColor: s.border }]}
                            onPress={() => handleUpdatePayment(s.id)}
                            disabled={updating}
                          >
                            {updating ? (
                              <ActivityIndicator size="small" color={s.text} />
                            ) : (
                              <Text style={[styles.statusOptionText, { color: s.text }]}>{s.label}</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  );
                })()}

                {/* ── Payment Transactions ── */}
                {Array.isArray(selectedInvoice?.transactions) && selectedInvoice.transactions.length > 0 && (
                  <>
                    <View style={[styles.sectionDivider, { marginTop: 24, borderTopColor: theme.colors.border }]}>
                      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Payment Transactions</Text>
                    </View>
                    {selectedInvoice.transactions.map((tx, idx) => {
                      const isRefunding = refundingTxId === tx.id;
                      const isRefunded = tx.status === 'refunded';
                      const txAmount = tx.amount_cents ? tx.amount_cents / 100 : (tx.amount || 0);
                      
                      return (
                        <View key={tx.id || idx} style={[styles.transactionItem, { borderBottomColor: theme.colors.border }]}>
                          <View style={styles.transactionInfo}>
                             <Text style={[styles.transactionAmount, { color: theme.colors.text }]}>₱{Number(txAmount).toLocaleString()}</Text>
                             <Text style={[styles.transactionMeta, { color: theme.colors.textSecondary }]}>
                               {tx.method?.replace('_', ' ')} • {new Date(tx.created_at || tx.date).toLocaleDateString()}
                             </Text>
                             {tx.reference && <Text style={[styles.transactionRef, { color: theme.colors.textTertiary }]}>Ref: {tx.reference}</Text>}
                          </View>
                          
                          {isRefunded ? (
                            <View style={[styles.refundedBadge, { backgroundColor: theme.colors.backgroundSecondary }]}>
                               <Text style={[styles.refundedText, { color: theme.colors.textSecondary }]}>REFUNDED</Text>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              style={[styles.refundButton, { borderColor: theme.isDark ? '#a855f7' : '#7E22CE' }, isRefunding && { opacity: 0.7 }]}
                              onPress={() => handleRefund(tx)}
                              disabled={isRefunding}
                            >
                              {isRefunding ? (
                                <ActivityIndicator size="small" color={theme.isDark ? '#a855f7' : '#7E22CE'} />
                              ) : (
                                <>
                                  <Ionicons name="refresh-circle-outline" size={16} color={theme.isDark ? '#a855f7' : '#7E22CE'} />
                                  <Text style={[styles.refundButtonText, { color: theme.isDark ? '#a855f7' : '#7E22CE' }]}>Refund</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </>
                )}

                <TouchableOpacity
                  style={[styles.cancelButton, { marginTop: 24, backgroundColor: theme.colors.backgroundSecondary }]}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
