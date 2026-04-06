import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getStyles } from '../../../../styles/Menu/Payments.js';
import PaymentService from '../../../../services/PaymentService.js';
import { BASE_URL } from '../../../../config/index.js';
import SystemToggleService from '../../../../services/SystemToggleService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import {
  tenantQueryKeys,
  useTenantFocusRefetch,
} from '../../hooks/useTenantQueryHelpers.js';

const DEFAULT_PAYMENT_SETTINGS = {
  allowed: ['cash'],
  details: {},
};

const parseJsonIfNeeded = (value, fallback) => {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }
  return value;
};

const normalizeArray = (value, fallback = []) => {
  const parsed = parseJsonIfNeeded(value, value);
  if (Array.isArray(parsed)) return parsed;
  return fallback;
};

const normalizePaymentSettings = (value) => {
  const parsed = parseJsonIfNeeded(value, null);
  if (!parsed || typeof parsed !== 'object') {
    return DEFAULT_PAYMENT_SETTINGS;
  }

  return {
    allowed: normalizeArray(parsed.allowed, ['cash']),
    details: parsed.details && typeof parsed.details === 'object' ? parsed.details : {},
  };
};

export default function PaymentDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { invoiceId } = route.params || {};

  const [isPaying, setIsPaying] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [offlineDetails, setOfflineDetails] = useState({ reference: '', notes: '' });
  const [tenantPaymentsTempDisabled, setTenantPaymentsTempDisabled] = useState(
    SystemToggleService.getDefaults().tenantPaymentsDisabled,
  );
  const paymentDetailQuery = useQuery({
    queryKey: tenantQueryKeys.paymentDetail(invoiceId),
    queryFn: async () => {
      const res = await PaymentService.getPaymentDetails(invoiceId);
      if (!res?.success || !res?.data) {
        throw new Error(res?.error || 'Failed to load invoice');
      }

      return res.data;
    },
    enabled: Boolean(invoiceId),
    placeholderData: (previousData) => previousData,
  });

  const invoice = paymentDetailQuery.data || null;

  const property = invoice?.property || invoice?.booking?.property || null;
  const landlordSettings = normalizePaymentSettings(
    property?.landlord?.payment_methods_settings || invoice?.landlord?.payment_methods_settings,
  );
  const acceptedPayments = normalizeArray(property?.accepted_payments, ['cash']);
  const allowPartialPayments = property?.allow_partial_payments !== 0 && property?.allow_partial_payments !== false;
  const showOnline = acceptedPayments.includes('online') && landlordSettings.allowed.includes('online');
  const showCash = acceptedPayments.includes('cash') && landlordSettings.allowed.includes('cash');
  const showManualGcash = landlordSettings.allowed.includes('gcash');
  const manualPaymentDetails = landlordSettings.details || {};

  const refetchPaymentDetail = paymentDetailQuery.refetch;
  const paymentDetailRefetchers = React.useMemo(
    () => [refetchPaymentDetail],
    [refetchPaymentDetail],
  );

  useTenantFocusRefetch({
    enabled: Boolean(invoiceId),
    refetchers: paymentDetailRefetchers,
  });

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
    if (!paymentDetailQuery.error) return;
    console.error('Error fetching invoice:', paymentDetailQuery.error);
    Alert.alert('Error', paymentDetailQuery.error.message || 'Failed to load invoice');
  }, [paymentDetailQuery.error]);

  const remainingBalance = React.useMemo(() => {
    if (!invoice) return 0;

    const totalAmount = invoice.amount_cents
      ? invoice.amount_cents / 100
      : Number(invoice.amount || 0);

    const paidAmount =
      invoice.transactions
        ?.filter((tx) => tx.status === 'succeeded' || tx.status === 'paid')
        .reduce(
          (sum, tx) => sum + (tx.amount_cents ? tx.amount_cents / 100 : Number(tx.amount || 0)),
          0,
        ) || 0;

    return Math.max(0, totalAmount - paidAmount);
  }, [invoice]);

  useEffect(() => {
    if (!invoice) return;
    setPaymentAmount((previousAmount) => {
      if (!allowPartialPayments) return remainingBalance.toString();

      if (!previousAmount) return remainingBalance.toString();

      const numericAmount = Number(previousAmount);
      if (!Number.isFinite(numericAmount) || numericAmount > remainingBalance) {
        return remainingBalance.toString();
      }

      return previousAmount;
    });
  }, [invoice, remainingBalance, allowPartialPayments]);

  const loading = paymentDetailQuery.isLoading || isPaying;

  const resolveAmountToPay = () => {
    const parsed = Number(paymentAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { amount: null, error: 'Please enter a valid payment amount.' };
    }

    if (parsed > remainingBalance) {
      return {
        amount: null,
        error: `Amount cannot exceed the remaining balance of ₱${remainingBalance.toLocaleString()}`,
      };
    }

    if (!allowPartialPayments && parsed !== remainingBalance) {
      return {
        amount: null,
        error: 'Partial payments are disabled for this property. Please pay the exact remaining balance.',
      };
    }

    return { amount: parsed, error: null };
  };

  const handleGCashPay = async () => {
    if (tenantPaymentsTempDisabled) {
      Alert.alert('Payments Temporarily Disabled', 'Tenant payments are temporarily unavailable while payment compliance updates are in progress.');
      return;
    }

    if (!showOnline) {
      Alert.alert('Payment Method Unavailable', 'Online payments are currently not enabled for this property.');
      return;
    }

    if (!invoice) return;
    const { amount: amountToPay, error } = resolveAmountToPay();
    if (error) {
      return Alert.alert('Invalid Amount', error);
    }

    try {
      setIsPaying(true);
      const res = await PaymentService.createPaymongoSource(invoice.id, 'gcash', null, amountToPay);
      if (!res.success) return Alert.alert('Payment Error', res.error || 'Failed to create source');

      const sourceBody = res.data?.source || res.data;
      const checkoutUrl = sourceBody?.data?.attributes?.redirect?.checkout_url;
      if (checkoutUrl) {
        navigation.navigate('PaymentRedirectWebview', { checkoutUrl, invoiceId: invoice.id });
      } else {
        Alert.alert('Payment', 'No checkout URL returned.');
      }
    } catch (e) {
      console.error('GCash pay error', e);
      Alert.alert('Payment Error', 'Failed to initiate GCash payment');
    } finally {
      setIsPaying(false);
    }
  };

  const handleCardPay = () => {
    if (tenantPaymentsTempDisabled) {
      Alert.alert('Payments Temporarily Disabled', 'Tenant payments are temporarily unavailable while payment compliance updates are in progress.');
      return;
    }

    if (!showOnline) {
      Alert.alert('Payment Method Unavailable', 'Online payments are currently not enabled for this property.');
      return;
    }

    const { amount: amountToPay, error } = resolveAmountToPay();
    if (error) {
      Alert.alert('Invalid Amount', error);
      return;
    }

    // Note: If using a custom tokenization view, it might need the amount passed in the URL.
    // For now, passing standard tokenizeUrl. If partial is needed for cards, backend updates for tokenization route might be required.
    const apiUrl = BASE_URL;
    const tokenizeUrl = `${apiUrl}/payments/tokenize/${invoice.id}?amount=${encodeURIComponent(amountToPay)}`;
    navigation.navigate('PaymentCardWebview', { tokenizeUrl, invoiceId: invoice.id, amount: amountToPay });
  };

  const handleOfflinePayment = async (method) => {
    if (tenantPaymentsTempDisabled) {
      Alert.alert('Payments Temporarily Disabled', 'Tenant payments are temporarily unavailable while payment compliance updates are in progress.');
      return;
    }

    if (method === 'cash' && !showCash) {
      Alert.alert('Payment Method Unavailable', 'Cash payments are currently not enabled for this property.');
      return;
    }

    if (method === 'gcash' && !showManualGcash) {
      Alert.alert('Payment Method Unavailable', 'Manual GCash transfer is currently not enabled.');
      return;
    }

    const { amount: amountToPay, error } = resolveAmountToPay();
    if (error) {
      Alert.alert('Invalid Amount', error);
      return;
    }

    if (method === 'gcash' && !offlineDetails.reference.trim()) {
      Alert.alert('Reference Required', 'Please provide the GCash transfer reference number.');
      return;
    }

    try {
      setIsPaying(true);
      const response = await PaymentService.createOfflineRecord(invoice.id, {
        amount_cents: Math.round(amountToPay * 100),
        method,
        reference: offlineDetails.reference.trim() || null,
        notes: offlineDetails.notes.trim() || (method === 'gcash' ? 'Manual GCash transfer submitted by tenant' : 'Cash payment request submitted by tenant'),
      });

      if (!response.success) {
        Alert.alert('Payment Error', response.error || 'Failed to submit offline payment details.');
        return;
      }

      Alert.alert('Submitted', method === 'gcash'
        ? 'Manual GCash transfer details submitted. Waiting for landlord verification.'
        : 'Cash payment request submitted. Waiting for landlord confirmation.');
      setOfflineDetails({ reference: '', notes: '' });
      await refetchPaymentDetail();
    } catch (error) {
      console.error('Offline payment submit error', error);
      Alert.alert('Payment Error', 'Failed to submit offline payment details.');
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.detailContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.detailContainer}>
          <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Invoice not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFullyPaid = remainingBalance <= 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice #{invoice.reference || invoice.id}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.detailContainer}>
          <View style={[homeStyles.surfaceCardMedium, { backgroundColor: theme.colors.surface, marginBottom: 16 }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 8 }]}>Details</Text>
            <View style={homeStyles.rowBetween}>
              <Text style={{ color: theme.colors.textSecondary }}>Property</Text>
              <Text style={{ fontWeight: '600', color: theme.colors.text }}>{invoice.property?.title || invoice.booking?.property?.title || '—'}</Text>
            </View>
            <View style={[homeStyles.rowBetween, { marginTop: 8 }]}>
              <Text style={{ color: theme.colors.textSecondary }}>Room</Text>
              <Text style={{ fontWeight: '600', color: theme.colors.text }}>{invoice.booking?.room?.room_number || '—'}</Text>
            </View>
            <View style={[homeStyles.rowBetween, { marginTop: 8 }]}>
              <Text style={{ color: theme.colors.textSecondary }}>Issued At</Text>
              <Text style={{ fontWeight: '600', color: theme.colors.text }}>{invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : '—'}</Text>
            </View>
          </View>

          <Text style={[styles.invoiceTitle, { color: theme.colors.text }]}>{invoice.description || 'Invoice'}</Text>

          <View style={[homeStyles.surfaceCardMedium, { backgroundColor: theme.colors.surface }]}>
            <View style={homeStyles.rowBetween}>
              <Text style={{ color: theme.colors.textSecondary }}>Subtotal</Text>
              <Text style={{ fontWeight: '600', color: theme.colors.text }}>₱{((invoice.subtotal_cents ?? invoice.amount_cents ?? 0)/100).toLocaleString()}</Text>
            </View>
            <View style={[homeStyles.rowBetween, { marginTop: 8 }]}>
              <Text style={{ color: theme.colors.textSecondary }}>Tax</Text>
              <Text style={{ fontWeight: '600', color: theme.colors.text }}>₱{((invoice.tax_cents ?? 0)/100).toLocaleString()}</Text>
            </View>
            <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
            <View style={homeStyles.rowBetween}>
              <Text style={[styles.totalText, { color: theme.colors.text }]}>Total</Text>
              <Text style={[styles.totalText, { color: theme.colors.text }]}>₱{((invoice.total_cents ?? invoice.amount_cents ?? 0)/100).toLocaleString()}</Text>
            </View>
            <View style={[homeStyles.rowBetween, { marginTop: 8 }]}>
              <Text style={[styles.totalText, { color: theme.colors.text, fontSize: 16 }]}>Remaining Balance</Text>
              <Text style={[styles.totalText, { color: theme.colors.primary, fontSize: 16 }]}>₱{remainingBalance.toLocaleString()}</Text>
            </View>
          </View>

          <Text style={[styles.statusRow, { color: theme.colors.textSecondary }]}>Status: <Text style={[styles.statusValue, { color: theme.colors.text }]}>{invoice.status}</Text></Text>

          {isFullyPaid ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginTop: 16 }}>Invoice Fully Paid</Text>
              <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>This invoice has no remaining balance.</Text>
            </View>
          ) : (
            <View style={{ marginTop: 24 }}>
                {tenantPaymentsTempDisabled && (
                  <View style={{ marginBottom: 16, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb' }}>
                    <Text style={{ color: '#92400e', fontWeight: '600' }}>
                      Tenant payments are temporarily unavailable while payment compliance updates are in progress.
                    </Text>
                  </View>
                )}
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Amount to Pay (₱)</Text>
              <TextInput
                style={{
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: theme.colors.text,
                  marginBottom: 8
                }}
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textTertiary}
                editable={allowPartialPayments}
              />
              <Text style={{ fontSize: 12, color: theme.colors.textTertiary, marginBottom: 24 }}>
                {allowPartialPayments
                  ? `You can pay the full remaining balance of ₱${remainingBalance.toLocaleString()} or enter a partial amount.`
                  : `Partial payments are disabled by the landlord. Please pay the exact remaining balance of ₱${remainingBalance.toLocaleString()}.`}
              </Text>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>
                  Available Methods
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {showOnline ? 'Online' : null}
                  {showOnline && (showCash || showManualGcash) ? ' • ' : ''}
                  {showCash ? 'Cash' : null}
                  {showCash && showManualGcash ? ' • ' : ''}
                  {showManualGcash ? 'Manual GCash Transfer' : null}
                  {!showOnline && !showCash && !showManualGcash ? 'No payment method is currently enabled for this property.' : ''}
                </Text>
              </View>

              {showOnline && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={handleGCashPay} disabled={tenantPaymentsTempDisabled} style={[homeStyles.buttonFlex, styles.payBtn, { backgroundColor: '#007AFF', opacity: tenantPaymentsTempDisabled ? 0.6 : 1 }]}> 
                    <Text style={styles.payBtnText}>Pay with GCash</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCardPay} disabled={tenantPaymentsTempDisabled} style={[homeStyles.buttonFlex, styles.payBtn, { backgroundColor: theme.colors.primary, opacity: tenantPaymentsTempDisabled ? 0.6 : 1 }]}> 
                    <Text style={styles.payBtnText}>Pay with Card</Text>
                  </TouchableOpacity>
                </View>
              )}

              {(showCash || showManualGcash) && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary }}>
                    Manual / Offline Submission
                  </Text>
                  {showManualGcash && manualPaymentDetails?.gcash_info ? (
                    <View style={{ padding: 10, borderRadius: 8, backgroundColor: theme.colors.primaryLight, marginTop: 8, marginBottom: 8 }}>
                      <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>GCash Details</Text>
                      <Text style={{ color: theme.colors.textSecondary, marginTop: 4, fontSize: 12 }}>{manualPaymentDetails.gcash_info}</Text>
                    </View>
                  ) : null}

                  <TextInput
                    placeholder="Reference Number (required for manual GCash)"
                    placeholderTextColor="#9CA3AF"
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: 10,
                      padding: 14,
                      color: theme.colors.text,
                      backgroundColor: theme.colors.backgroundSecondary,
                      fontSize: 14,
                      marginBottom: 8
                    }}
                    value={offlineDetails.reference}
                    onChangeText={(value) => setOfflineDetails((prev) => ({ ...prev, reference: value }))}
                  />

                  <TextInput
                    placeholder="Notes (optional)"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: 10,
                      padding: 14,
                      color: theme.colors.text,
                      backgroundColor: theme.colors.backgroundSecondary,
                      minHeight: 80,
                      textAlignVertical: 'top',
                      fontSize: 14,
                      marginBottom: 8
                    }}
                    value={offlineDetails.notes}
                    onChangeText={(value) => setOfflineDetails((prev) => ({ ...prev, notes: value }))}
                  />

                  {showManualGcash && (
                    <TouchableOpacity
                      onPress={() => handleOfflinePayment('gcash')}
                      disabled={tenantPaymentsTempDisabled}
                      style={[styles.payBtn, { backgroundColor: '#2563EB', opacity: tenantPaymentsTempDisabled ? 0.6 : 1, marginBottom: 8 }]}
                    >
                      <Text style={styles.payBtnText}>Submit Manual GCash Transfer</Text>
                    </TouchableOpacity>
                  )}

                  {showCash && (
                    <TouchableOpacity
                      onPress={() => handleOfflinePayment('cash')}
                      disabled={tenantPaymentsTempDisabled}
                      style={[styles.payBtn, { backgroundColor: '#16a34a', opacity: tenantPaymentsTempDisabled ? 0.6 : 1 }]}
                    >
                      <Text style={styles.payBtnText}>Request Cash Payment</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
