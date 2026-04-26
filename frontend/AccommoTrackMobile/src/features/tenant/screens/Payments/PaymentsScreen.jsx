import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import PaymentService from '../../../../services/PaymentService.js';
import { normalizePaginatedResponse } from '../../../../services/api.js';
import SystemToggleService from '../../../../services/SystemToggleService.js';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { ListItemSkeleton } from '../../../../components/Skeletons/index.jsx';
import { showSuccess, showError, showWarning } from '../../../../utils/toast.js';
import { getStyles } from '../../../../styles/Tenant/WalletStyles.js';
import createEcho from '../../../../services/echo.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  refetchTenantQueries,
  tenantQueryKeys,
  useTenantFocusRefetch,
  useTenantRefreshHandler,
} from '../../hooks/useTenantQueryHelpers.js';
import { formatPrice } from '../../../../utils/price.js';

export default function PaymentsScreen() {
  const { width: viewportWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const showAlert = Alert.alert;
  const navigation = useNavigation();
  const contentWrapStyle = React.useMemo(
    () => (viewportWidth >= 768 ? { width: '100%', maxWidth: 860, alignSelf: 'center' } : null),
    [viewportWidth],
  );
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingPaymentId, setResolvingPaymentId] = useState(null);
  const [tenantPaymentsTempDisabled, setTenantPaymentsTempDisabled] = useState(
    SystemToggleService.getDefaults().tenantPaymentsDisabled,
  );
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const currentUserIdQuery = useQuery({
    queryKey: tenantQueryKeys.paymentsCurrentUserId(),
    queryFn: async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          if (user?.id || user?.id === 0) {
            return String(user.id);
          }
        }

        const storedId = await AsyncStorage.getItem('user_id');
        return storedId ? String(storedId) : null;
      } catch (_error) {
        return null;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const userId = currentUserIdQuery.data || null;

  const paymentsInfiniteQuery = useInfiniteQuery({
    queryKey: tenantQueryKeys.payments(statusFilter),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await PaymentService.getPayments({
        status: statusFilter,
        archiveFilter: 'active',
        page: pageParam,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to load payments');
      }
      return normalizePaginatedResponse(response.data);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.current_page < lastPage.pagination.last_page) {
        return lastPage.pagination.current_page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    placeholderData: (previousData) => previousData,
  });

  const payments = React.useMemo(() => {
    return paymentsInfiniteQuery.data?.pages.flatMap((page) => page.items) || [];
  }, [paymentsInfiniteQuery.data]);

  const statsQuery = useQuery({
    queryKey: tenantQueryKeys.paymentStats(),
    queryFn: async () => {
      const response = await PaymentService.getStats();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load stats');
      }
      return response.data || {};
    },
    placeholderData: (previousData) => previousData,
  });

  const stats = React.useMemo(() => statsQuery.data || {}, [statsQuery.data]);
  const paymentsLoading = paymentsInfiniteQuery.isPending;
  const statsLoading = statsQuery.isLoading;
  const refetchPayments = paymentsInfiniteQuery.refetch;
  const refetchStats = statsQuery.refetch;

  const paymentRefetchers = React.useMemo(
    () => [refetchPayments, refetchStats],
    [refetchPayments, refetchStats],
  );

  const triggerPaymentDataRefresh = React.useCallback(
    () => refetchTenantQueries(paymentRefetchers),
    [paymentRefetchers],
  );

  useTenantFocusRefetch({ refetchers: paymentRefetchers });

  const onRefresh = useTenantRefreshHandler({
    setRefreshing,
    refetchers: paymentRefetchers,
  });

  // System settings setup
  useEffect(() => {
    let mounted = true;
    SystemToggleService.getToggles().then((result) => {
      if (!mounted || !result?.data) return;
      setTenantPaymentsTempDisabled(Boolean(result.data.tenantPaymentsDisabled));
    });

    return () => {
      mounted = false;
    };
  }, []);

  const resolveEntryKey = React.useCallback((item) => {
    if (!item || typeof item !== 'object') return null;
    return item?.id || item?.invoice_id || item?.invoiceId || item?.booking_id || item?.bookingId || null;
  }, []);

  const resolveAdvanceInvoiceId = React.useCallback((payload) => {
    const created = Array.isArray(payload?.created) ? payload.created : [];
    const existing = Array.isArray(payload?.existing) ? payload.existing : [];

    const invoices = [...created, ...existing]
      .filter((invoice) => invoice && invoice.id)
      .sort((a, b) => {
        const aDate = new Date(a?.due_date || a?.billing_period_start || a?.created_at || 0).getTime();
        const bDate = new Date(b?.due_date || b?.billing_period_start || b?.created_at || 0).getTime();
        return aDate - bDate;
      });

    return invoices.length > 0 ? invoices[0].id : null;
  }, []);

  const openCheckout = async (payment, options = {}) => {
    const startFrom = options?.startFrom === 'next' ? 'next' : 'current';
    const monthsCount = Math.max(1, Math.min(Number(options?.monthsCount) || 1, 2));

    if (tenantPaymentsTempDisabled) {
      showWarning('Payments Temporarily Disabled', 'Tenant payments are temporarily unavailable while payment compliance updates are in progress.');
      return;
    }

    const item = typeof payment === 'object'
      ? payment
      : (payments.find((entry) => entry.id === payment) || { id: payment });

    const resolvingKey = resolveEntryKey(item);

    if (startFrom === 'next') {
      const bookingId = item?.bookingId || item?.booking_id || null;
      if (!bookingId) {
        showError('Payment Error', 'This payment does not have a booking link for advance invoice generation.');
        return;
      }

      try {
        setResolvingPaymentId(resolvingKey || bookingId);

        const response = await PaymentService.createAdvanceBookingInvoices(bookingId, monthsCount);
        if (!response.success || !response.data) {
          showError('Payment Error', response.error || 'Failed to prepare advance invoice checkout.');
          return;
        }

        const invoiceId = resolveAdvanceInvoiceId(response.data);
        if (!invoiceId) {
          showError('Payment Error', 'No payable advance invoice was generated for this booking.');
          return;
        }

        if (monthsCount > 1) {
          const generatedCount = [
            ...(Array.isArray(response.data?.created) ? response.data.created : []),
            ...(Array.isArray(response.data?.existing) ? response.data.existing : []),
          ].filter((invoice) => invoice && invoice.id).length;

          if (generatedCount > 1) {
            showSuccess('Advance Invoices Ready', 'Opening the nearest due invoice first.');
          }
        }

        navigation.navigate('PaymentDetail', { invoiceId });
      } catch (error) {
        console.error('Advance invoice resolution error:', error);
        showError('Payment Error', 'Failed to prepare advance invoice checkout.');
      } finally {
        setResolvingPaymentId(null);
      }

      return;
    }

    let invoiceId = item?.invoiceId || item?.invoice_id || item?.id || null;

    if (!invoiceId) {
      const bookingId = item?.bookingId || item?.booking_id || null;
      if (!bookingId) {
        showError('Payment Error', 'No booking or invoice linked to this payment. Please contact the landlord.');
        return;
      }

      try {
        setResolvingPaymentId(resolvingKey || bookingId);

        const response = await PaymentService.createBookingInvoice(bookingId);
        if (!response.success || !response.data) {
          showError('Payment Error', response.error || 'Failed to prepare invoice checkout.');
          return;
        }

        invoiceId = response.data?.id || response.data?.data?.id || null;
      } catch (error) {
        console.error('Invoice resolution error:', error);
        showError('Payment Error', 'Failed to prepare invoice checkout.');
        return;
      } finally {
        setResolvingPaymentId(null);
      }
    }

    if (!invoiceId) {
      showError('Payment Error', 'Unable to resolve invoice checkout for this payment.');
      return;
    }

    navigation.navigate('PaymentDetail', { invoiceId });
  };

  const openCheckoutOptions = (payment) => {
    showAlert(
      'Choose Payment',
      'Note: "Next" options automatically skip any already-paid advance months and pay the next unpaid period(s).',
      [
        { text: 'Pay Current Due', onPress: () => openCheckout(payment) },
        { text: 'Pay Next Unpaid', onPress: () => openCheckout(payment, { startFrom: 'next', monthsCount: 1 }) },
        { text: 'Pay Next 2 Unpaid', onPress: () => openCheckout(payment, { startFrom: 'next', monthsCount: 2 }) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const isPayable = (payment) => {
    // 1. Basic status check
    const status = (payment.status || '').toString().toLowerCase();
    const paymentStatus = (payment.paymentStatus || '').toString().toLowerCase();
    
    // 2. Booking status check (Prevention)
    // If the associated booking is still pending, the invoice should not be payable yet.
    const bookingStatus = (payment.booking?.status || payment.booking_status || '').toString().toLowerCase();
    if (bookingStatus === 'pending') {
      return false;
    }

    const payableStatus = ['unpaid', 'pending', 'partial'];
    const payableBookingStatus = ['unpaid', 'partial'];
    
    // Status 'refunded' or 'cancelled' should never be payable
    if (status === 'refunded' || status === 'cancelled') return false;

    return payableStatus.includes(status) || payableBookingStatus.includes(paymentStatus);
  };

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
    { value: 'overdue', label: 'Overdue' },
  ];

  const timeRangeOptions = [
    { value: 'w', label: 'W' },
    { value: 'm', label: 'M' },
    { value: 'y', label: 'Y' },
    { value: 'all', label: 'All' },
  ];

  const getThresholdDate = (range) => {
    if (!range || range === 'all') return null;
    const now = new Date();
    switch (range) {
      case 'w': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'm': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default: return null;
    }
  };

  const filteredPayments = React.useMemo(() => {
    const threshold = getThresholdDate(timeRange);

    // Initial sort and date filter
    let list = [...payments].filter((p) => {
      if (!threshold) return true;
      const d = new Date(p.date || p.created_at);
      return isNaN(d.getTime()) ? true : d >= threshold;
    });

    // Search filter (property, room, reference, method)
    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const prop = (p.propertyName || p.property_title || p.property?.title || '').toString().toLowerCase();
        const ref = (p.referenceNo || p.reference || '').toString().toLowerCase();
        const method = (p.method || '').toString().toLowerCase();
        const room = (p.roomNumber || (p.room && p.room.roomNumber) || p.room?.room_number || '').toString().toLowerCase();
        const desc = (p.description || '').toString().toLowerCase();
        return prop.includes(q) || ref.includes(q) || method.includes(q) || room.includes(q) || desc.includes(q);
      });
    }

    return list.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  }, [payments, timeRange, searchQuery]);

  const formatCurrency = (amount) => formatPrice(amount);

  const formatDate = (dateString) => {
    if (!dateString) return 'None';

    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'None';
    }

    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const nextDueDateValue = stats?.nextDueDate ?? stats?.next_due_date ?? null;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return theme.colors.primary;
      case 'pending':
      case 'partial':
        return '#F59E0B';
      case 'refunded':
        return '#9333EA';
      case 'overdue':
      case 'failed':
      case 'cancelled':
        return '#EF4444';
      case 'deferred':
        return '#6B7280';
      default:
        return theme.colors.textSecondary;
    }
  };

  const loading = paymentsLoading || statsLoading;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >

        <View style={contentWrapStyle}>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#DCFCE7', minHeight: 110, justifyContent: 'center' }]}>
              <Ionicons name="checkmark-circle" size={26} color={theme.colors.primary} />
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.statValue, { color: '#166534' }]}>
                {statsLoading ? '...' : formatCurrency(stats?.totalPaidThisMonth || 0)}
              </Text>
              <Text numberOfLines={1} style={[styles.statLabel, { color: '#15803D' }]}>Paid This Month</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#FEF3C7', minHeight: 110, justifyContent: 'center' }]}>
              <Ionicons name="time" size={26} color="#F59E0B" />
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.statValue, { color: '#92400E' }]}>
                {statsLoading ? '...' : formatCurrency(stats?.pendingAmount || 0)}
              </Text>
              <Text numberOfLines={1} style={[styles.statLabel, { color: '#B45309' }]}>Pending</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#DBEAFE', minHeight: 110, justifyContent: 'center' }]}>
              <Ionicons name="calendar" size={26} color="#3B82F6" />
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.statValue, { color: '#1E3A8A' }]}>
                {statsLoading ? '...' : formatDate(nextDueDateValue)}
              </Text>
              <Text numberOfLines={1} style={[styles.statLabel, { color: '#1E40AF' }]}>Next Due</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.surface,
              borderRadius: 12,
              paddingHorizontal: 12,
              height: 48,
              borderWidth: 1,
              borderColor: theme.colors.border
            }}>
              <Ionicons name="search-outline" size={20} color={theme.colors.textTertiary} />
              <TextInput
                placeholder="Search property, room, ref..."
                placeholderTextColor={theme.colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  color: theme.colors.text,
                  fontSize: 14,
                }}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Filter Tabs Container */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            {/* Status Filter Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.filterContainer, { marginBottom: 0, paddingRight: 8 }]}
              style={{ flex: 1 }}
            >
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterTab,
                    {
                      backgroundColor:
                        statusFilter === option.value ? theme.colors.primary : theme.colors.backgroundSecondary,
                      borderColor: statusFilter === option.value ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setStatusFilter(option.value)}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.filterText,
                      { color: statusFilter === option.value ? '#fff' : theme.colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Time Range Tabs */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: 10,
              padding: 2,
            }}>
              {timeRangeOptions.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  onPress={() => setTimeRange(r.value)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: timeRange === r.value ? theme.colors.surface : 'transparent',
                    borderWidth: timeRange === r.value ? 1 : 0,
                    borderColor: theme.colors.border,
                  }}
                >
                  <Text style={{
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: timeRange === r.value ? theme.colors.primary : theme.colors.textSecondary
                  }}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

          </View>

          {/* Payment List */}
          <View style={[styles.listCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Transactions</Text>

            {!tenantPaymentsTempDisabled && (
              <View style={{ marginBottom: 12, padding: 12, backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#93c5fd', borderRadius: 10 }}>
                <Text style={{ color: '#1e40af', fontWeight: '600', fontSize: 12 }}>
                  💡 Tip: Click any transaction to view full details and payment options.
                </Text>
              </View>
            )}

            {loading && payments.length === 0 ? (
              <>
                <ListItemSkeleton />
                <ListItemSkeleton />
                <ListItemSkeleton />
              </>
            ) : filteredPayments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={48} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No payments found
                </Text>
              </View>
            ) : (
              filteredPayments.map((payment, index) => (
                <TouchableOpacity
                  key={payment.id || index}
                  onPress={() => {
                    setSelectedPayment(payment);
                    setShowDetailModal(true);
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.paymentItem,
                    { minHeight: 88 },
                    index < filteredPayments.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.paymentLeft}>
                    <View
                      style={[
                        styles.paymentIcon,
                        { backgroundColor: `${getStatusColor(payment.status)}20`, width: 48, height: 48, borderRadius: 24 },
                      ]}
                    >
                      <Ionicons
                        name={
                          payment.status?.toLowerCase() === 'paid' || payment.status?.toLowerCase() === 'completed'
                            ? 'checkmark-circle'
                            : payment.status?.toLowerCase() === 'pending'
                              ? 'time'
                              : payment.status?.toLowerCase() === 'refunded'
                                ? 'refresh-circle'
                                : 'close-circle'
                        }
                        size={24}
                        color={getStatusColor(payment.status)}
                      />
                    </View>
                    <View style={[styles.paymentInfo, { flex: 1, maxWidth: '60%' }]}>
                      <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.paymentTitle, { color: theme.colors.text }]}>
                        {payment.propertyName || payment.property?.title || 'System Payment'}
                      </Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                        Room {payment.roomNumber || (payment.room && (payment.room.roomNumber || payment.room.room_number)) || 'N/A'}
                      </Text>
                      <Text numberOfLines={1} style={[styles.paymentDate, { color: theme.colors.textTertiary }]}>
                        {formatDate(payment.date || payment.issued_at || payment.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.paymentRight, { minWidth: 100, alignItems: 'flex-end' }]}>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.paymentAmount, { color: theme.colors.text }]}>
                      {formatCurrency(payment.amount)}
                    </Text>
                    <View
                      style={[styles.statusBadge, { backgroundColor: `${getStatusColor(payment.status)}20`, minWidth: 70, height: 24 }]}
                    >
                      <Text numberOfLines={1} style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
                        {payment.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Transaction Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDetailModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close-circle" size={24} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {selectedPayment && (
              <View style={{ gap: 16 }}>
                <View style={{ padding: 16, backgroundColor: theme.colors.backgroundSecondary, borderRadius: 12, gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Property</Text>
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 14 }}>{selectedPayment.propertyName || 'N/A'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Room</Text>
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 14 }}>
                      {selectedPayment.roomNumber || (selectedPayment.room && (selectedPayment.room.roomNumber || selectedPayment.room.room_number)) || 'N/A'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Amount</Text>
                    <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>{formatCurrency(selectedPayment.amount)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Status</Text>
                    <View style={{ backgroundColor: `${getStatusColor(selectedPayment.status || selectedPayment.paymentStatus)}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ color: getStatusColor(selectedPayment.status || selectedPayment.paymentStatus), fontWeight: '700', fontSize: 12 }}>
                        {selectedPayment.status || selectedPayment.paymentStatus}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Date</Text>
                    <Text style={{ color: theme.colors.text, fontSize: 13 }}>{formatDate(selectedPayment.date || selectedPayment.issued_at || selectedPayment.created_at)}</Text>
                  </View>
                  {(selectedPayment.due_date || selectedPayment.dueDate) && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Due Date</Text>
                      <Text style={{ color: theme.colors.text, fontSize: 13 }}>{formatDate(selectedPayment.due_date || selectedPayment.dueDate)}</Text>
                    </View>
                  )}
                  {(selectedPayment.referenceNo || selectedPayment.reference) && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Reference</Text>
                      <Text style={{ color: theme.colors.text, fontSize: 13 }}>{selectedPayment.referenceNo || selectedPayment.reference}</Text>
                    </View>
                  )}
                  {selectedPayment.method && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Method</Text>
                      <Text style={{ color: theme.colors.text, fontSize: 13 }}>{selectedPayment.method}</Text>
                    </View>
                  )}
                  {(selectedPayment.roomNumber || selectedPayment.room_number) && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Room</Text>
                      <Text style={{ color: theme.colors.text, fontSize: 13 }}>{selectedPayment.roomNumber || selectedPayment.room_number}</Text>
                    </View>
                  )}
                </View>

                {!tenantPaymentsTempDisabled && isPayable(selectedPayment) && (
                  <TouchableOpacity
                    onPress={() => {
                      setShowDetailModal(false);
                      if (selectedPayment?.bookingId || selectedPayment?.booking_id) {
                        openCheckoutOptions(selectedPayment);
                      } else {
                        openCheckout(selectedPayment);
                      }
                    }}
                    style={{
                      backgroundColor: theme.colors.primary,
                      height: 50,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 10,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Proceed to Payment</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
