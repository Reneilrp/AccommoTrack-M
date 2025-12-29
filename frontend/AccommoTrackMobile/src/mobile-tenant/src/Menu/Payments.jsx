import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Linking, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { styles } from '../../../styles/Menu/Payments.js';
import PaymentService from '../../../services/PaymentService.js';
import BookingService from '../../../services/BookingServices.js';

export default function Payments() {
  const navigation = useNavigation();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalPaidThisMonth: 0,
    paidCount: 0,
    nextDueDate: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Payment methods - Only Cash is enabled for now
  const paymentMethods = [
    { id: 1, name: "GCash", icon: "phone-portrait", color: "#007AFF", enabled: true },
    { id: 2, name: "PayMaya", icon: "card", color: "#00D632", enabled: false },
    { id: 3, name: "Bank Transfer", icon: "business", color: "#EF4444", enabled: false },
    { id: 4, name: "Cash", icon: "cash", color: "#10B981", enabled: true }
  ];

  const handlePaymentMethodPress = (method) => {
    if (!method.enabled) {
      // Show message that this payment method is coming soon
      Alert.alert(
        'Coming Soon',
        `${method.name} payment method is coming soon. Please use Cash for now.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (method.name === "Cash") {
      // Cash payment is available (but no actual payment processing function)
      Alert.alert(
        'Cash Payment',
        'Cash payment is available. Please contact your landlord to arrange cash payment.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle pay press for a payment item. If there's no invoice, create one (tenant-side) then open PayMongo checkout.
  // paymentMethod: 'gcash'|'cash' etc.
  const handlePayInvoice = async (paymentItem, paymentMethod = 'gcash') => {
    try {
      setLoading(true);

      // If we received an id (legacy) convert to object lookup
      const item = typeof paymentItem === 'object' ? paymentItem : payments.find(p => p.id === paymentItem) || { id: paymentItem };

      // If the payment item already has an invoiceId field, use it; otherwise create invoice for booking
      let invoiceId = item.invoiceId || item.invoice_id || null;

      if (!invoiceId) {
        // try to create invoice for the booking (tenant route)
        // support both camelCase and snake_case booking id fields
        const bookingId = item.bookingId || item.booking_id || null;
        if (!bookingId) {
          Alert.alert('Payment Error', 'No booking or invoice linked to this payment. Please contact landlord.');
          return;
        }

        // Create invoice via tenant endpoint
        try {
          const token = await PaymentService.getAuthToken();
          if (!token) {
            Alert.alert('Authentication', 'Please login to continue');
            return;
          }

          const resp = await fetch(`${PaymentService.API_URL || 'http://192.168.254.184:8000/api'}/tenant/bookings/${bookingId}/invoice`, {
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

          invoiceId = body.data?.id || body.data?.id || body.data?.invoice_id || body.data?.id;
          if (!invoiceId && body.data && body.data.id) invoiceId = body.data.id;
          if (!invoiceId && body.data && body.data.reference) {
            // if invoice object provided without id, try to use its id field
            invoiceId = body.data.id || null;
          }

          if (!invoiceId && body.id) invoiceId = body.id;
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

      // If the chosen method is not offline, create a PayMongo source for redirect/QR flows
      if (paymentMethod !== 'cash' && paymentMethod !== 'cash_on_site') {
        const res = await PaymentService.createPaymongoSource(invoiceId, paymentMethod, null);
        if (!res.success) {
          Alert.alert('Payment Error', res.error || 'Failed to create payment source');
          return;
        }

        const sourceBody = res.data?.source || res.data;
        const checkoutUrl = sourceBody?.data?.attributes?.redirect?.checkout_url;
        if (checkoutUrl) {
          // Open the PayMongo checkout URL in the system browser
          await Linking.openURL(checkoutUrl);
        } else {
          Alert.alert('Payment', 'No checkout URL returned.');
        }
      } else {
        // Offline/cash flow: create offline record and notify landlord
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
      setLoading(false);
    }
  };

  // Checkout modal state and helpers
  const [checkoutVisible, setCheckoutVisible] = React.useState(false);
  const [checkoutItem, setCheckoutItem] = React.useState(null);
  const [checkoutMethod, setCheckoutMethod] = React.useState('gcash');

  const openCheckout = (payment) => {
    setCheckoutItem(payment);
    setCheckoutMethod('gcash');
    setCheckoutVisible(true);
  };

  const confirmCheckout = async () => {
    if (!checkoutItem) return;
    setCheckoutVisible(false);
    if (checkoutMethod === 'cash') {
      // Ensure invoice exists, then request offline record
      await handlePayInvoice(checkoutItem, 'cash');
    } else {
      await handlePayInvoice(checkoutItem, checkoutMethod);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      // Fetch payments and stats in parallel
      const [paymentsResult, statsResult, bookingsResult] = await Promise.all([
        PaymentService.getMyPayments(),
        PaymentService.getPaymentStats(),
        BookingService.getMyBookings()
      ]);

      const remotePayments = (paymentsResult.success && paymentsResult.data) ? paymentsResult.data : [];
      if (!paymentsResult.success) console.error('Failed to fetch payments:', paymentsResult.error);

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      } else {
        console.error('Failed to fetch payment stats:', statsResult.error);
      }

      // If bookings are returned, synthesize due items for confirmed bookings without payment records
      // build the effective payments list (remote payments + synthetic from bookings)
      let paymentsList = [...remotePayments];

      if (bookingsResult && bookingsResult.success && Array.isArray(bookingsResult.data)) {
        const bookings = bookingsResult.data;
        const existingBookingIds = remotePayments.map(p => p.bookingId).filter(Boolean);

        const synthetic = bookings
          .filter(b => (b.status === 'confirmed' || b.status === 'Confirmed') && ['unpaid', 'partial', 'unpaid'].includes((b.paymentStatus || '').toString().toLowerCase()))
          .filter(b => !existingBookingIds.includes(b.id))
          .map(b => ({
            id: `booking-${b.id}`,
            propertyName: b.propertyTitle || (b.property && b.property.title) || 'Property',
            amount: b.amount || b.total_amount || b.monthlyRent || 0,
            date: b.checkIn || b.created_at || null,
            dueDate: b.checkIn || null,
            status: 'Unpaid',
            paymentStatus: (b.paymentStatus === 'partial' ? 'Partial Paid' : 'Unpaid'),
            bookingId: b.id,
            roomId: b.roomNumber || b.roomId || null,
            method: 'N/A',
            referenceNo: b.bookingReference || null
          }));

        if (synthetic.length > 0) {
          // Prepend synthetic due items so they appear on top
          paymentsList = [...synthetic, ...paymentsList];
        }
      }

      // set the combined payments list into state
      setPayments(paymentsList);

      // After building paymentsList, check for due payments (<=5 days) and notify tenant if new
      try {
        const now = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysRemaining = (dateStr) => {
          if (!dateStr) return Infinity;
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return Infinity;
          return Math.ceil((d - now) / msPerDay);
        };

        const duePayments = paymentsList.filter(p => {
          const dr = daysRemaining(p.dueDate || p.date);
          return isPayable(p) && dr >= 0 && dr <= 5;
        });

        if (duePayments.length > 0) {
          // load notified ids from AsyncStorage
          const key = 'notified_due_invoices';
          const raw = await AsyncStorage.getItem(key);
          const seen = raw ? JSON.parse(raw) : [];
          const dueIds = duePayments.map(p => String(p.id));
          const newDue = dueIds.filter(id => !seen.includes(id));
          if (newDue.length > 0) {
            // notify user
            Alert.alert('Payments Due Soon', `You have ${newDue.length} payment(s) due within the next 5 days.`);
            // mark these as seen so we don't notify again repeatedly
            const merged = Array.from(new Set([...seen, ...dueIds]));
            await AsyncStorage.setItem(key, JSON.stringify(merged));
          }
        }
      } catch (err) {
        console.warn('Due notification check failed', err);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchPayments();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Paid': return '#10B981';
      case 'Partial Paid': return '#3B82F6';
      case 'Refunded': return '#8B5CF6';
      case 'Pending': return '#F59E0B';
      case 'Overdue': return '#EF4444';
      case 'Cancelled': return '#6B7280';
      case 'Unpaid': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  // Determine if a payment card should show the Pay button
  const isPayable = (payment) => {
    const status = (payment.status || '').toString().toLowerCase();
    const paymentStatus = (payment.paymentStatus || '').toString().toLowerCase();

    // Consider these as payable states
    const payableStatus = ['unpaid', 'pending'];
    const payableBookingStatus = ['unpaid', 'partial'];

    return payableStatus.includes(status) || payableBookingStatus.includes(paymentStatus);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PaymentHistory')}>
          <Ionicons name="receipt-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Paid This Month</Text>
          <Text style={styles.balanceAmount}>₱{stats.totalPaidThisMonth.toLocaleString()}</Text>
          <View style={styles.balanceDetails}>
            {stats.nextDueDate && (
              <View style={styles.balanceItem}>
                <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                <Text style={styles.balanceItemText}>Due: {stats.nextDueDate}</Text>
              </View>
            )}

            <View style={styles.balanceItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.balanceItemText}>{stats.paidCount} Paid</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <Text style={styles.sectionSubtitle}>Available payment options in Philippines</Text>
          <View style={styles.methodsGrid}>
            {paymentMethods.map((method) => (
              <TouchableOpacity 
                key={method.id} 
                style={[
                  styles.methodCard,
                  !method.enabled && styles.methodCardDisabled
                ]}
                onPress={() => handlePaymentMethodPress(method)}
                disabled={!method.enabled}
                activeOpacity={method.enabled ? 0.7 : 1}
              >
                <View style={[
                  styles.methodIcon, 
                  { backgroundColor: `${method.color}20` },
                  !method.enabled && styles.methodIconDisabled
                ]}>
                  <Ionicons 
                    name={method.icon} 
                    size={24} 
                    color={method.enabled ? method.color : '#9CA3AF'} 
                  />
                </View>
                <Text style={[
                  styles.methodName,
                  !method.enabled && styles.methodNameDisabled
                ]}>
                  {method.name}
                </Text>
                {!method.enabled && (
                  <Text style={styles.methodComingSoon}>Coming Soon</Text>
                )}
                {method.enabled && (
                  <View style={styles.methodAvailableBadge}>
                    <Text style={styles.methodAvailableText}>Available</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.paymentNote}>
            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.paymentNoteText}>
              Cash payment is currently available. Other payment methods will be available soon.
            </Text>
          </View>
        </View>

        {/* Due Payments (within 5 days) and Unpaid Payments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Due Payments</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>Loading payments...</Text>
            </View>
          ) : (
            (() => {
              const now = new Date();
              const msPerDay = 1000 * 60 * 60 * 24;

              // parse date safely and compute days remaining
              const daysRemaining = (dateStr) => {
                if (!dateStr) return Infinity;
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return Infinity;
                return Math.ceil((d - now) / msPerDay);
              };

              // Due Payments: payable and due in <=5 days (>=0)
              const duePayments = payments.filter(p => {
                if (!isPayable(p)) return false;
                const dr = daysRemaining(p.dueDate || p.date);
                return dr >= 0 && dr <= 5;
              });

              // Unpaid Payments: payable items regardless of due date, excluding ones already in duePayments
              const unpaidPayments = payments.filter(p => isPayable(p) && !duePayments.find(d => d.id === p.id));

              if (duePayments.length === 0) {
                return (
                  <View style={styles.emptyState}>
                    <Ionicons name="time-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No Due Payments</Text>
                    <Text style={styles.emptyText}>You have no payments due within the next 5 days.</Text>
                  </View>
                );
              }

              return (
                <>
                  {duePayments.map((payment) => {
                    const dr = daysRemaining(payment.dueDate || payment.date);
                    const prettyDate = payment.dueDate ? new Date(payment.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : (payment.date ? new Date(payment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'TBD');
                    return (
                      <View key={payment.id} style={[styles.paymentCard, { paddingVertical: 12 }]}> 
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={{ fontWeight: '700', fontSize: 16 }}>{payment.propertyName}</Text>
                            <Text numberOfLines={1} style={{ color: '#6B7280', marginTop: 4 }}>{payment.roomId ? `Room ${payment.roomId}` : ''}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                            <Text style={{ fontWeight: '700', fontSize: 16 }}>₱{Number(payment.amount || 0).toLocaleString()}</Text>
                            <Text style={{ color: '#6B7280', marginTop: 4 }}>{prettyDate}</Text>
                            <Text style={{ color: dr <= 0 ? '#EF4444' : '#F59E0B', marginTop: 4, fontSize: 12 }}>{dr === 0 ? 'Due today' : `${dr} day${dr>1?'s':''} left`}</Text>
                          </View>
                        </View>

                        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
                          <TouchableOpacity onPress={() => openCheckout(payment)} style={{ backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
                            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Pay</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </>
              );
            })()
          )}
        </View>

        {/* Unpaid Payments (monthly obligations even if far) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unpaid Payments</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>Loading payments...</Text>
            </View>
          ) : (
            (() => {
              const now = new Date();
              const duePaymentsIds = payments.filter(p => isPayable(p) && (() => {
                const d = new Date(p.dueDate || p.date);
                if (isNaN(d.getTime())) return false;
                const daysLeft = Math.ceil((d - now) / (1000*60*60*24));
                return daysLeft >=0 && daysLeft <=5;
              })()).map(p => p.id);

              const unpaid = payments.filter(p => isPayable(p) && !duePaymentsIds.includes(p.id));

              if (unpaid.length === 0) {
                return (
                  <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No Unpaid Payments</Text>
                    <Text style={styles.emptyText}>There are no unpaid monthly obligations at the moment.</Text>
                  </View>
                );
              }

              return (
                <>
                  {unpaid.map((payment) => (
                    <View key={payment.id} style={[styles.paymentCard, { paddingVertical: 12 }]}> 
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={{ fontWeight: '700', fontSize: 16 }}>{payment.propertyName}</Text>
                          <Text numberOfLines={1} style={{ color: '#6B7280', marginTop: 4 }}>{payment.roomId ? `Room ${payment.roomId}` : ''}</Text>
                        </View>

                        <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                          <Text style={{ fontWeight: '700', fontSize: 16 }}>₱{Number(payment.amount || 0).toLocaleString()}</Text>
                          <Text style={{ color: '#6B7280', marginTop: 4 }}>{payment.dueDate ? new Date(payment.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : (payment.date ? new Date(payment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '')}</Text>
                        </View>
                      </View>

                      <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
                        <TouchableOpacity onPress={() => openCheckout(payment)} style={{ backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
                          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Pay</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              );
            })()
          )}
        </View>
      </ScrollView>

      {/* Checkout Modal (Shopee-like quick checkout) */}
      <Modal visible={checkoutVisible} animationType="slide" transparent onRequestClose={() => setCheckoutVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16, maxHeight: '70%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Checkout</Text>
            {checkoutItem ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: '700' }}>{checkoutItem.propertyName}</Text>
                <Text style={{ color: '#6B7280', marginTop: 4 }}>{checkoutItem.roomId ? `Room ${checkoutItem.roomId}` : ''}</Text>
                <Text style={{ marginTop: 8, fontSize: 16, fontWeight: '700' }}>₱{Number(checkoutItem.amount || 0).toLocaleString()}</Text>
              </View>
            ) : null}

            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Choose payment method</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setCheckoutMethod('gcash')} style={{ flex: 1, marginRight: 8, padding: 12, borderRadius: 8, backgroundColor: checkoutMethod === 'gcash' ? '#E6FDF0' : '#F3F4F6', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700' }}>GCash</Text>
                <Text style={{ color: '#6B7280', marginTop: 4 }}>Pay via GCash (online)</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCheckoutMethod('cash')} style={{ flex: 1, marginLeft: 8, padding: 12, borderRadius: 8, backgroundColor: checkoutMethod === 'cash' ? '#E6FDF0' : '#F3F4F6', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700' }}>Cash on site</Text>
                <Text style={{ color: '#6B7280', marginTop: 4 }}>Pay with cash upon arrival</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={() => setCheckoutVisible(false)} style={{ flex: 1, marginRight: 8, padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmCheckout} style={{ flex: 1, marginLeft: 8, padding: 12, borderRadius: 8, backgroundColor: '#10B981', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#fff' }}>Pay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

