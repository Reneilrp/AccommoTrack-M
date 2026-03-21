import React, { useState, useCallback, useMemo } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import PaymentService from '../../../../services/PaymentService.js';
import { getStyles } from '../../../../styles/Landlord/Payments.js';

const STATUS_FILTERS = ['all', 'pending', 'paid', 'unpaid', 'partial', 'overdue', 'cancelled', 'refunded'];

const REFUND_FIXED_PENALTY_CENTS = 0;
const REFUND_ELIGIBLE_STATUSES = ['succeeded', 'paid', 'partially_refunded', 'refunded'];

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

const getRemainingAmount = (invoice) => Math.max(0, getInvoiceTotal(invoice) - getSettledAmount(invoice));

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

export default function Payments({ navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [refundingTxId, setRefundingTxId] = useState(null);
  const [recordData, setRecordData] = useState({ amount: '', method: 'cash', reference: '', notes: '' });
  const [refundAmount, setRefundAmount] = useState('');
  const [showRefundConfirm, setShowRefundConfirm] = useState(null);

  const fetchInvoices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (invoices.length === 0) setLoading(true);

    try {
      const res = await PaymentService.getInvoices({ _t: Date.now() });
      if (res.success) {
        // Ensure we have an array
        let data = res.data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          data = data.invoices || data.data || [];
        }
        setInvoices(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch invoices:', res.error);
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error in fetchInvoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [invoices.length]);

  useFocusEffect(
    useCallback(() => {
      fetchInvoices();
    }, [fetchInvoices])
  );

  const handleUpdatePayment = async (status) => {
    if (!selectedInvoice?.booking_id) return;
    setUpdating(true);
    try {
      const res = await PaymentService.updateBookingPayment(selectedInvoice.booking_id, { payment_status: status });
      if (res.success) {
        setShowModal(false);
        fetchInvoices(true);
        Alert.alert('Success', 'Payment status updated');
      } else {
        Alert.alert('Error', res.error || 'Failed to update status');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setUpdating(false);
    }
  };

  const handleRecordPayment = async () => {
    const amountNum = parseFloat(recordData.amount);
    if (!recordData.amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount.');
      return;
    }
    if (!selectedInvoice?.id) {
      Alert.alert('Error', 'No invoice selected.');
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
        fetchInvoices(true);
        Alert.alert('Success', 'Payment recorded successfully.');
      } else {
        Alert.alert('Error', res.error || 'Failed to record payment');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred');
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
      Alert.alert('No Refund Available', 'This transaction has no refundable amount remaining based on the stay progress.');
      return;
    }

    const stayInfo = preview?.stayProgress
      ? `\n\nStay Progress: ${preview.stayProgress.usedUnits}/${preview.stayProgress.totalUnits} ${preview.stayProgress.unitLabel} used`
        + (preview.fixedPenaltyCents > 0 ? `\nPenalty: ₱${(preview.fixedPenaltyCents / 100).toLocaleString()}` : '')
      : '';

    Alert.alert(
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
                Alert.alert('Success', `Refunded ₱${(maxRefund / 100).toLocaleString()} successfully`);
                fetchInvoices(true);
                setShowModal(false);
              } else {
                Alert.alert('Error', res.error || 'Failed to refund transaction');
              }
            } catch {
              Alert.alert('Error', 'An unexpected error occurred during refund');
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

  // ──── Payment Stats (W4) ────
  const stats = useMemo(() => {
    const s = { totalPaid: 0, totalBalance: 0, paidCount: 0, pendingCount: 0, overdueCount: 0 };
    invoices.forEach(inv => {
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
      else if (['pending', 'unpaid', 'partial'].includes(status)) s.pendingCount++;
      else if (status === 'overdue') s.overdueCount++;
    });
    return s;
  }, [invoices]);

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return { bg: '#DCFCE7', fg: '#166534' };
      case 'pending':
      case 'partial': return { bg: '#FEF3C7', fg: '#92400E' };
      case 'unpaid':
      case 'cancelled': return { bg: '#FEE2E2', fg: '#991B1B' };
      case 'refunded': return { bg: '#F3E8FF', fg: '#7E22CE' };
      default: return { bg: '#F3F4F6', fg: '#4B5563' };
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
      <View style={styles.invoiceCard}>
        <View style={styles.invoiceHeader}>
          <Text style={styles.invoiceId}>{item.reference || `INV-${item.id}`}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.fg }]}>{status}</Text>
          </View>
        </View>

        <View style={styles.invoiceBody}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText} numberOfLines={1}>{tenantName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText} numberOfLines={1}>
              {propertyTitle} {roomNumber !== '—' ? `• Room ${roomNumber}` : ''}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              {item.issued_at ? new Date(item.issued_at).toLocaleDateString() : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.invoiceFooter}>
          <View>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>₱{parseFloat(amount).toLocaleString()}</Text>
          </View>
          {item.booking_id && (
            <TouchableOpacity 
              style={styles.viewButton}
              onPress={() => {
                setSelectedInvoice(item);
                const remaining = getRemainingAmount(item);
                setRecordData({ amount: remaining > 0 ? remaining.toString() : '', method: 'cash', reference: '', notes: '' });
                setShowModal(true);
              }}
            >
              <Text style={styles.viewButtonText}>{status === 'paid' ? 'Details' : 'Manage'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Loading payments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments & Invoices</Text>
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
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Stats Summary Cards (W4) ── */}
      {invoices.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}>
          {[
            { label: 'Collected', value: `₱${stats.totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: 'checkmark-circle', color: '#16a34a', bg: '#DCFCE7' },
            { label: 'Outstanding', value: `₱${stats.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: 'time-outline', color: '#D97706', bg: '#FEF3C7' },
            { label: 'Paid', value: stats.paidCount, icon: 'receipt-outline', color: '#16a34a', bg: '#DCFCE7' },
            { label: 'Pending', value: stats.pendingCount, icon: 'hourglass-outline', color: '#92400E', bg: '#FEF3C7' },
            { label: 'Overdue', value: stats.overdueCount, icon: 'alert-circle-outline', color: '#DC2626', bg: '#FEE2E2' },
          ].map((card, i) => (
            <View key={i} style={{ backgroundColor: theme.isDark ? theme.colors.surface : card.bg, borderRadius: 12, padding: 14, minWidth: 110, borderWidth: 1, borderColor: theme.isDark ? theme.colors.border : 'transparent' }}>
              <Ionicons name={card.icon} size={20} color={theme.isDark ? theme.colors.textSecondary : card.color} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.isDark ? theme.colors.text : card.color, marginTop: 6 }}>{card.value}</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.isDark ? theme.colors.textSecondary : card.color, opacity: 0.8, marginTop: 2 }}>{card.label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchInvoices(true)}
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
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Manage Payment</Text>
                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Invoice Summary */}
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Tenant</Text>
                    <Text style={styles.summaryValue} numberOfLines={2}>
                      {selectedInvoice?.tenant?.full_name || (selectedInvoice?.tenant ? `${selectedInvoice.tenant.first_name} ${selectedInvoice.tenant.last_name}` : '—')}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Invoice Total</Text>
                    <Text style={[styles.summaryValue, { color: '#16a34a' }]}>
                      ₱{parseFloat(selectedInvoice?.amount || ((selectedInvoice?.amount_cents ?? 0) / 100)).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Status-based Conditional Rendering */}
                {(() => {
                  const status = getInvoiceStatus(selectedInvoice);

                  const isSettled = ['paid', 'refunded', 'cancelled'].includes(status);
                  
                  if (isSettled) return null;

                  return (
                    <>
                      {/* ── Record a Payment ── */}
                      <View style={styles.sectionDivider}>
                        <Text style={styles.sectionTitle}>Record a Payment</Text>
                      </View>

                      {/* Amount */}
                      <Text style={styles.fieldLabel}>Amount Paid (₱) *</Text>
                      <TextInput
                        style={styles.fieldInput}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 5000"
                        placeholderTextColor="#9CA3AF"
                        value={recordData.amount}
                        onChangeText={(v) => setRecordData((d) => ({ ...d, amount: v }))}
                        returnKeyType="done"
                      />

                      {/* Payment Method */}
                      <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Payment Method *</Text>
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
                              recordData.method === m.id && styles.methodChipActive,
                            ]}
                            onPress={() => setRecordData((d) => ({ ...d, method: m.id }))}
                          >
                            <Text style={[
                              styles.methodChipText,
                              recordData.method === m.id && styles.methodChipTextActive,
                            ]}>{m.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Reference */}
                      <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Reference # (Optional)</Text>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="Transaction / OR number…"
                        placeholderTextColor="#9CA3AF"
                        value={recordData.reference}
                        onChangeText={(v) => setRecordData((d) => ({ ...d, reference: v }))}
                      />

                      {/* Notes */}
                      <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Notes (Optional)</Text>
                      <TextInput
                        style={[styles.fieldInput, styles.fieldTextarea]}
                        placeholder="Add any internal notes…"
                        placeholderTextColor="#9CA3AF"
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
                      <View style={[styles.sectionDivider, { marginTop: 24 }]}>
                        <Text style={styles.sectionTitle}>Quick Status Update</Text>
                      </View>

                      <View style={styles.statusGrid}>
                        {[
                          { id: 'unpaid', label: 'Unpaid', color: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
                          { id: 'partial', label: 'Partial', color: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
                          { id: 'paid', label: 'Paid', color: '#DCFCE7', text: '#166534', border: '#86EFAC' },
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
                    <View style={[styles.sectionDivider, { marginTop: 24 }]}>
                      <Text style={styles.sectionTitle}>Payment Transactions</Text>
                    </View>
                    {selectedInvoice.transactions.map((tx, idx) => {
                      const isRefunding = refundingTxId === tx.id;
                      const isRefunded = tx.status === 'refunded';
                      const txAmount = tx.amount_cents ? tx.amount_cents / 100 : (tx.amount || 0);
                      
                      return (
                        <View key={tx.id || idx} style={styles.transactionItem}>
                          <View style={styles.transactionInfo}>
                             <Text style={styles.transactionAmount}>₱{Number(txAmount).toLocaleString()}</Text>
                             <Text style={styles.transactionMeta}>
                               {tx.method?.replace('_', ' ')} • {new Date(tx.created_at || tx.date).toLocaleDateString()}
                             </Text>
                             {tx.reference && <Text style={styles.transactionRef}>Ref: {tx.reference}</Text>}
                          </View>
                          
                          {isRefunded ? (
                            <View style={styles.refundedBadge}>
                               <Text style={styles.refundedText}>REFUNDED</Text>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              style={[styles.refundButton, isRefunding && { opacity: 0.7 }]}
                              onPress={() => handleRefund(tx)}
                              disabled={isRefunding}
                            >
                              {isRefunding ? (
                                <ActivityIndicator size="small" color="#7E22CE" />
                              ) : (
                                <>
                                  <Ionicons name="refresh-circle-outline" size={16} color="#7E22CE" />
                                  <Text style={styles.refundButtonText}>Refund</Text>
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
                  style={[styles.cancelButton, { marginTop: 20 }]}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
