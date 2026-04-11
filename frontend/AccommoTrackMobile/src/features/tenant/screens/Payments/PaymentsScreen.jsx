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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import PaymentService from '../../../../services/PaymentService.js';
import SystemToggleService from '../../../../services/SystemToggleService.js';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { ListItemSkeleton } from '../../../../components/Skeletons/index.jsx';
import { showError } from '../../../../utils/toast.js';
import { getStyles } from '../../../../styles/Tenant/WalletStyles.js';
import createEcho from '../../../../services/echo.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import {
  refetchTenantQueries,
  tenantQueryKeys,
  useTenantFocusRefetch,
  useTenantRefreshHandler,
} from '../../hooks/useTenantQueryHelpers.js';

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

  const paymentsQuery = useQuery({
    queryKey: tenantQueryKeys.payments(statusFilter),
    queryFn: async () => {
      const response = await PaymentService.getPayments(statusFilter);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load payments');
      }
      return response.data || [];
    },
    onError: (error) => {
      showError('Failed to load payments', error.message);
    },
    placeholderData: (previousData) => previousData,
  });

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

  const payments = paymentsQuery.data || [];
  const stats = statsQuery.data || {};
  const paymentsLoading = paymentsQuery.isLoading;
  const statsLoading = statsQuery.isLoading;
  const refetchPayments = paymentsQuery.refetch;
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

  // Real-time updates
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

  useEffect(() => {
    if (!userId) return;

    let echoInstance = null;
    let channel = null;

    const setupEcho = async () => {
      echoInstance = await createEcho();
      if (!echoInstance) return;

      channel = echoInstance.private(`user.${userId}`)
        .listen('.invoice.updated', (e) => {
          console.log('[PaymentsScreen] Real-time update:', e);
          triggerPaymentDataRefresh();
          Toast.show({
            type: 'success',
            text1: 'Payment Updated',
            text2: 'Your payment status has been updated.',
            position: 'bottom'
          });
        });
    };

    setupEcho();

    return () => {
      if (channel) {
        channel.stopListening('.invoice.updated');
      }
      if (echoInstance) {
        echoInstance.disconnect();
      }
    };
  }, [userId, triggerPaymentDataRefresh]);

  const openCheckout = async (payment) => {
    if (tenantPaymentsTempDisabled) {
      showAlert('Payments Temporarily Disabled', 'Tenant payments are temporarily unavailable while payment compliance updates are in progress.');
      return;
    }

    const item = typeof payment === 'object'
      ? payment
      : (payments.find((entry) => entry.id === payment) || { id: payment });

    let invoiceId = item?.invoiceId || item?.invoice_id || item?.id || null;

    if (!invoiceId) {
      const bookingId = item?.bookingId || item?.booking_id || null;
      if (!bookingId) {
        showAlert('Payment Error', 'No booking or invoice linked to this payment. Please contact the landlord.');
        return;
      }

      try {
        setResolvingPaymentId(item?.id || bookingId);

        const response = await PaymentService.createBookingInvoice(bookingId);
        if (!response.success || !response.data) {
          showAlert('Payment Error', response.error || 'Failed to prepare invoice checkout.');
          return;
        }

        invoiceId = response.data?.id || response.data?.data?.id || null;
      } catch (error) {
        console.error('Invoice resolution error:', error);
        showAlert('Payment Error', 'Failed to prepare invoice checkout.');
        return;
      } finally {
        setResolvingPaymentId(null);
      }
    }

    if (!invoiceId) {
      showAlert('Payment Error', 'Unable to resolve invoice checkout for this payment.');
      return;
    }

    navigation.navigate('PaymentDetail', { invoiceId });
  };

  const isPayable = (payment) => {
    const status = (payment.status || '').toString().toLowerCase();
    const paymentStatus = (payment.paymentStatus || '').toString().toLowerCase();
    const payableStatus = ['unpaid', 'pending', 'refunded', 'partial'];
    const payableBookingStatus = ['unpaid', 'partial', 'refunded'];
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

  const formatCurrency = (amount) => {
    const value = Number(amount) || 0;
    return `₱${new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)}`;
  };

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
        <View style={[styles.statCard, { backgroundColor: '#DCFCE7' }]}>
          <Ionicons name="checkmark-circle" size={26} color={theme.colors.primary} />
          <Text numberOfLines={1} style={[styles.statValue, { color: '#166534' }]}>
            {formatCurrency(stats?.totalPaidThisMonth || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: '#15803D' }]}>Paid This Month</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="time" size={26} color="#F59E0B" />
          <Text numberOfLines={1} style={[styles.statValue, { color: '#92400E' }]}>
            {formatCurrency(stats?.pendingAmount || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: '#B45309' }]}>Pending</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
          <Ionicons name="calendar" size={26} color="#3B82F6" />
          <Text numberOfLines={1} style={[styles.statValue, { color: '#1E3A8A' }]}>
            {formatDate(nextDueDateValue)}
          </Text>
          <Text style={[styles.statLabel, { color: '#1E40AF' }]}>Next Due</Text>
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
          marginRight: 16
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

        {tenantPaymentsTempDisabled && (
          <View style={{ marginBottom: 12, padding: 12, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10 }}>
            <Text style={{ color: '#92400e', fontWeight: '600' }}>
              Tenant payments are temporarily unavailable while payment compliance updates are in progress.
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
            <View
              key={payment.id || index}
              style={[
                styles.paymentItem,
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
                    { backgroundColor: `${getStatusColor(payment.status)}20` },
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
                <View style={styles.paymentInfo}>
                  <Text style={[styles.paymentTitle, { color: theme.colors.text }]}>
                    {payment.description || `Payment #${payment.id}`}
                  </Text>
                  <Text style={[styles.paymentDate, { color: theme.colors.textSecondary }]}>
                    {formatDate(payment.date)}
                  </Text>
                </View>
              </View>
              <View style={styles.paymentRight}>
                <Text style={[styles.paymentAmount, { color: theme.colors.text }]}>
                  {formatCurrency(payment.amount)}
                </Text>
                <View
                  style={[styles.statusBadge, { backgroundColor: `${getStatusColor(payment.status)}20` }]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
                    {payment.status}
                  </Text>
                </View>

                {!tenantPaymentsTempDisabled && isPayable(payment) && (
                  <TouchableOpacity
                    disabled={resolvingPaymentId === (payment.id || payment.booking_id || payment.bookingId)}
                    onPress={() => openCheckout(payment)}
                    style={[
                      styles.payBtn,
                      {
                        backgroundColor: theme.colors.primary,
                        opacity: resolvingPaymentId === (payment.id || payment.booking_id || payment.bookingId) ? 0.65 : 1,
                      },
                    ]}
                  >
                    {resolvingPaymentId === (payment.id || payment.booking_id || payment.bookingId) ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.payBtnText}>Pay</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}
