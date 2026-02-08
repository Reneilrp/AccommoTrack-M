import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import PaymentService from '../../../../services/PaymentService';
import { API_BASE_URL } from '../../../../config';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ListItemSkeleton } from '../../../../components/Skeletons';
import { showError } from '../../../../utils/toast';
import homeStyles from '../../../../styles/Tenant/HomePage.js';

const { width } = Dimensions.get('window');

export default function WalletScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('1m');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading, refetch: refetchPayments } = useQuery({
    queryKey: ['payments', statusFilter],
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
  });

  // Fetch stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['paymentStats'],
    queryFn: async () => {
      const response = await PaymentService.getStats();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load stats');
      }
      return response.data || {};
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchPayments(), refetchStats()]);
    setRefreshing(false);
  };

  // --- Payment / Checkout flow (merged from Payments.jsx) ---
  const paymentMethods = [
    { id: 1, name: 'GCash', key: 'gcash', enabled: true },
    { id: 2, name: 'Cash on site', key: 'cash', enabled: true },
  ];

  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [checkoutMethod, setCheckoutMethod] = useState('gcash');
  const [processingPayment, setProcessingPayment] = useState(false);

  const openCheckout = (payment) => {
    setCheckoutItem(payment);
    setCheckoutMethod('gcash');
    setCheckoutVisible(true);
  };

  const isPayable = (payment) => {
    const status = (payment.status || '').toString().toLowerCase();
    const paymentStatus = (payment.paymentStatus || '').toString().toLowerCase();
    const payableStatus = ['unpaid', 'pending'];
    const payableBookingStatus = ['unpaid', 'partial'];
    return payableStatus.includes(status) || payableBookingStatus.includes(paymentStatus);
  };

  const handlePayInvoice = async (paymentItem, paymentMethod = 'gcash') => {
    try {
      setProcessingPayment(true);

      const item = typeof paymentItem === 'object' ? paymentItem : payments.find(p => p.id === paymentItem) || { id: paymentItem };

      let invoiceId = item.invoiceId || item.invoice_id || null;

      if (!invoiceId) {
        const bookingId = item.bookingId || item.booking_id || null;
        if (!bookingId) {
          Alert.alert('Payment Error', 'No booking or invoice linked to this payment. Please contact landlord.');
          return;
        }

        try {
          const token = await PaymentService.getAuthToken();
          if (!token) {
            Alert.alert('Authentication', 'Please login to continue');
            return;
          }

          const resp = await fetch(`${API_BASE_URL}/tenant/bookings/${bookingId}/invoice`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          const body = await resp.json();
          if (!resp.ok) {
            console.error('Create invoice failed', body);
            Alert.alert('Payment Error', body.message || 'Failed to create invoice');
            return;
          }

          invoiceId = body.data?.id || body.id || null;
          if (!invoiceId) {
            Alert.alert('Payment Error', 'Invoice creation succeeded but no invoice id returned');
            return;
          }
        } catch (err) {
          console.error('Invoice creation error:', err);
          Alert.alert('Payment Error', 'Failed to create invoice for this booking');
          return;
        }
      }

      if (paymentMethod !== 'cash' && paymentMethod !== 'cash_on_site') {
        const res = await PaymentService.createPaymongoSource(invoiceId, paymentMethod, null);
        if (!res.success) {
          Alert.alert('Payment Error', res.error || 'Failed to create payment source');
          return;
        }

        const sourceBody = res.data?.source || res.data;
        const checkoutUrl = sourceBody?.data?.attributes?.redirect?.checkout_url || sourceBody?.data?.attributes?.redirect_url || sourceBody?.redirect_url || null;
        if (checkoutUrl) {
          await Linking.openURL(checkoutUrl);
        } else {
          Alert.alert('Payment', 'No checkout URL returned.');
        }
      } else {
        const amountCents = Math.round((paymentItem.amount || 0) * 100);
        const resp = await PaymentService.createOfflineRecord(invoiceId, { amount_cents: amountCents, method: 'cash_on_site', notes: 'Tenant indicated cash on site payment' });
        if (!resp.success) {
          Alert.alert('Payment Error', resp.error || 'Failed to request cash payment');
        } else {
          Alert.alert('Request Sent', 'Your landlord has been notified to expect a cash payment.');
        }
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      Alert.alert('Payment Error', 'Failed to initiate payment.');
    } finally {
      setProcessingPayment(false);
      setCheckoutVisible(false);
    }
  };

  const confirmCheckout = async () => {
    if (!checkoutItem) return;
    setCheckoutVisible(false);
    if (checkoutMethod === 'cash') {
      await handlePayInvoice(checkoutItem, 'cash');
    } else {
      await handlePayInvoice(checkoutItem, checkoutMethod);
    }
  };
  // --- end payment flow ---

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
    { value: 'overdue', label: 'Overdue' },
  ];

  const timeRanges = [
    { value: '1w', label: '1W' },
    { value: '1m', label: '1M' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' },
  ];

  const getThresholdDate = (range) => {
    if (!range || range === 'all') return null;
    const now = new Date();
    switch (range) {
      case '1w':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '1m':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  };

  const getFilteredPayments = () => {
    const threshold = getThresholdDate(timeRange);
    const list = payments.filter((p) => {
      if (!threshold) return true;
      const d = new Date(p.date);
      return !isNaN(d) && d >= threshold;
    });
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return theme.colors.primary;
      case 'pending':
        return '#F59E0B';
      case 'overdue':
      case 'failed':
        return '#EF4444';
      default:
        return theme.colors.textSecondary;
    }
  };

  // Generate chart data
  const getChartData = () => {
    const filtered = getFilteredPayments();
    if (filtered.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }],
      };
    }

    // Group by month for display
    const monthlyData = {};
    filtered.forEach((payment) => {
      if (payment.status?.toLowerCase() === 'paid' || payment.status?.toLowerCase() === 'completed') {
        const date = new Date(payment.date);
        const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (payment.amount || 0);
      }
    });

    const labels = Object.keys(monthlyData).slice(-6);
    const data = labels.map((label) => monthlyData[label]);

    return {
      labels: labels.map((l) => l.split('/')[0]), // Just show month number
      datasets: [{ data: data.length > 0 ? data : [0] }],
    };
  };

  const chartData = getChartData();

  const filteredPayments = getFilteredPayments();
  const loading = paymentsLoading || statsLoading;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Payments</Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
          <Ionicons name="checkmark-circle" size={32} color={theme.colors.primary} />
          <Text style={[styles.statValue, { color: '#065F46' }]}>
            {formatCurrency(stats?.totalPaidThisMonth || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: '#047857' }]}>Paid This Month</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="time" size={32} color="#F59E0B" />
          <Text style={[styles.statValue, { color: '#92400E' }]}>
            {formatCurrency(stats?.pendingAmount || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: '#B45309' }]}>Pending</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
          <Ionicons name="calendar" size={32} color="#3B82F6" />
          <Text style={[styles.statValue, { color: '#1E3A8A' }]}>
            {stats?.nextDueDate ? formatDate(stats.nextDueDate) : 'N/A'}
          </Text>
          <Text style={[styles.statLabel, { color: '#1E40AF' }]}>Next Due</Text>
        </View>
      </View>

      {/* Payment Chart */}
      <View style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Payment History</Text>
          <View style={styles.timeRangeContainer}>
            {timeRanges.map((range) => (
              <TouchableOpacity
                key={range.value}
                style={[
                  styles.timeRangeButton,
                  {
                    backgroundColor:
                      timeRange === range.value ? theme.colors.primary : theme.colors.backgroundSecondary,
                  },
                ]}
                onPress={() => setTimeRange(range.value)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    { color: timeRange === range.value ? '#fff' : theme.colors.text },
                  ]}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {chartData.datasets[0].data.length > 0 && chartData.datasets[0].data[0] > 0 ? (
          <LineChart
            data={chartData}
            width={width - 64}
            height={200}
            chartConfig={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              labelColor: (opacity = 1) =>
                theme.isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: theme.colors.primary,
              },
            }}
            bezier
            style={styles.chart}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={[styles.noDataText, { color: theme.colors.textSecondary }]}>
              No payment data for selected period
            </Text>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
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
              style={[
                styles.filterText,
                { color: statusFilter === option.value ? '#fff' : theme.colors.text },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Payment List */}
      <View style={[styles.listCard, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Transactions</Text>

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

                {isPayable(payment) && (
                  <TouchableOpacity
                    onPress={() => openCheckout(payment)}
                    style={{
                      marginTop: 8,
                      backgroundColor: theme.colors.primary,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Pay</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Checkout Modal */}
      <Modal visible={checkoutVisible} animationType="slide" transparent onRequestClose={() => setCheckoutVisible(false)}>
        <View style={[homeStyles.flex1, { justifyContent: 'flex-end', backgroundColor: '#00000066' }] }>
          <View style={[homeStyles.modalContentBase, { backgroundColor: theme.colors.surface }]}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, color: theme.colors.text }}>Checkout</Text>
            {checkoutItem ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: '700', color: theme.colors.text }}>{checkoutItem.propertyName || checkoutItem.description || `Payment #${checkoutItem.id}`}</Text>
                <Text style={{ color: theme.colors.textSecondary, marginTop: 4 }}>{checkoutItem.roomId ? `Room ${checkoutItem.roomId}` : ''}</Text>
                <Text style={{ marginTop: 8, fontSize: 16, fontWeight: '700', color: theme.colors.text }}>₱{Number(checkoutItem.amount || 0).toLocaleString()}</Text>
              </View>
            ) : null}

            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: theme.colors.text }}>Choose payment method</Text>
            <View style={[homeStyles.rowBetween, { marginBottom: 16 }]}>
              {paymentMethods.map((m, i) => (
                <TouchableOpacity key={m.key} onPress={() => setCheckoutMethod(m.key)} style={[homeStyles.buttonFlex, { marginRight: i === paymentMethods.length - 1 ? 0 : 8, backgroundColor: checkoutMethod === m.key ? theme.colors.primary : theme.colors.backgroundSecondary }]}>
                  <Text style={{ fontWeight: '700', color: checkoutMethod === m.key ? '#fff' : theme.colors.text }}>{m.name}</Text>
                  <Text style={{ color: theme.colors.textSecondary, marginTop: 4 }}>{m.key === 'gcash' ? 'Pay via GCash (online)' : 'Pay with cash upon arrival'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={() => setCheckoutVisible(false)} style={[homeStyles.buttonFlex, { marginRight: 8, backgroundColor: theme.colors.backgroundSecondary }]}>
                <Text style={{ fontWeight: '700', color: theme.colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmCheckout} style={[homeStyles.buttonFlex, { marginLeft: 8, backgroundColor: theme.colors.primary }]}>
                {processingPayment ? <ActivityIndicator color="#fff" /> : <Text style={{ fontWeight: '700', color: '#fff' }}>Pay</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  chartCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 14,
    marginTop: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listCard: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  paymentDate: {
    fontSize: 13,
    marginTop: 4,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
});
