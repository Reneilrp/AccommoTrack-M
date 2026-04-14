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

const REFUND_SETTLED_STATUSES = new Set([
  'succeeded',
  'paid',
  'partially_refunded',
  'refunded',
]);

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

const toPositiveInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed);
};

const normalizeInvoiceAddonLines = (invoice) => {
  const lines = [];

  const metadataAddonsRaw = invoice?.metadata?.addons;
  const metadataAddons = Array.isArray(metadataAddonsRaw)
    ? metadataAddonsRaw
    : (metadataAddonsRaw && typeof metadataAddonsRaw === 'object' ? Object.values(metadataAddonsRaw) : []);

  const metadataAddonIds = new Set();

  metadataAddons.forEach((addon, idx) => {
    const amountCents = toPositiveInteger(addon?.amount_cents ?? addon?.price_cents ?? addon?.price);
    if (!amountCents) return;

    const quantity = Math.max(1, toPositiveInteger(addon?.quantity) || 1);
    const addonId = addon?.addon_id ?? addon?.id ?? null;
    if (addonId !== null && addonId !== undefined) {
      metadataAddonIds.add(String(addonId));
    }

    lines.push({
      key: `meta-${addonId ?? idx}`,
      addonId: addonId ?? null,
      name: addon?.addon_name || addon?.name || 'Add-on',
      quantity,
      amountCents,
    });
  });

  const bookingAddons = Array.isArray(invoice?.booking?.addons) ? invoice.booking.addons : [];
  bookingAddons.forEach((addon, idx) => {
    const addonId = addon?.id ?? addon?.addon_id ?? null;
    if (addonId !== null && addonId !== undefined && metadataAddonIds.has(String(addonId))) {
      return;
    }

    const quantity = Math.max(1, toPositiveInteger(addon?.pivot?.quantity ?? addon?.quantity) || 1);
    const unitPrice = Number(addon?.pivot?.price_at_booking ?? addon?.price_at_booking ?? addon?.price ?? 0);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return;

    lines.push({
      key: `booking-${addon?.pivot?.id ?? addonId ?? idx}`,
      addonId: addonId ?? null,
      name: addon?.name || addon?.addon_name || 'Add-on',
      quantity,
      amountCents: Math.round(unitPrice * 100 * quantity),
    });
  });

  return lines;
};

export default function PaymentDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const showAlert = Alert.alert;
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { invoiceId } = route.params || {};

  const [isPaying, setIsPaying] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAmountError, setPaymentAmountError] = useState('');
  const [offlineDetails, setOfflineDetails] = useState({ reference: '', notes: '' });
  const [tenantPaymentsTempDisabled, setTenantPaymentsTempDisabled] = useState(
    SystemToggleService.getDefaults().tenantPaymentsDisabled,
  );
  const [invoicePaymongoDisabled, setInvoicePaymongoDisabled] = useState(
    SystemToggleService.getDefaults().invoicePaymongoDisabled,
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
  const isPendingManualVerification = String(invoice?.status || '').toLowerCase() === 'pending_verification';

  const isPaymentDisabled = React.useMemo(() => {
    return tenantPaymentsTempDisabled || invoicePaymongoDisabled || isPendingManualVerification;
  }, [tenantPaymentsTempDisabled, invoicePaymongoDisabled, isPendingManualVerification]);

  const paymentDisabledReason = React.useMemo(() => {
    if (tenantPaymentsTempDisabled) {
      return 'Tenant payments are temporarily unavailable while payment compliance updates are in progress.';
    }
    if (invoicePaymongoDisabled) {
      return 'Online invoice payments are temporarily unavailable while payment compliance updates are in progress.';
    }
    if (isPendingManualVerification) {
      return 'This invoice is awaiting manual payment verification. Online checkout is temporarily disabled to prevent duplicate payments.';
    }
    return null;
  }, [tenantPaymentsTempDisabled, invoicePaymongoDisabled, isPendingManualVerification]);

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
      setInvoicePaymongoDisabled(Boolean(result.data.invoicePaymongoDisabled));
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!paymentDetailQuery.error) return;
    console.error('Error fetching invoice:', paymentDetailQuery.error);
    showAlert('Error', paymentDetailQuery.error.message || 'Failed to load invoice');
  }, [paymentDetailQuery.error]);

  const addonLines = React.useMemo(() => normalizeInvoiceAddonLines(invoice), [invoice]);
  const addonTotalCents = React.useMemo(
    () => addonLines.reduce((sum, line) => sum + line.amountCents, 0),
    [addonLines],
  );

  const remainingBalance = React.useMemo(() => {
    if (!invoice) return 0;

    const totalAmount = invoice.amount_cents
      ? invoice.amount_cents / 100
      : Number(invoice.amount || 0);

    const paidAmount =
      invoice.transactions
        ?.filter((tx) => REFUND_SETTLED_STATUSES.has(String(tx?.status || '').toLowerCase()))
        .reduce(
          (sum, tx) => {
            const txAmountCents = Number(tx?.amount_cents ?? 0);
            const txRefundedCents = Number(tx?.refunded_amount_cents ?? 0);

            if (Number.isFinite(txAmountCents) && txAmountCents > 0) {
              return sum + Math.max(0, (txAmountCents - Math.max(0, txRefundedCents)) / 100);
            }

            const txAmount = Number(tx?.amount || 0);
            return Number.isFinite(txAmount) && txAmount > 0 ? sum + txAmount : sum;
          },
          0,
        ) || 0;

    return Math.max(0, totalAmount - paidAmount);
  }, [invoice]);

  useEffect(() => {
    if (!invoice) return;
    const newAmount = remainingBalance.toString();
    setPaymentAmount(newAmount);
    setPaymentAmountError('');
  }, [invoice, remainingBalance]);

  const validatePaymentAmount = React.useCallback((amount) => {
    const parsed = Number(amount);

    if (!amount || amount.trim() === '') {
      return 'Please enter a payment amount.';
    }

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 'Please enter a valid payment amount.';
    }

    if (parsed > remainingBalance) {
      return `Amount cannot exceed ₱${remainingBalance.toLocaleString()}`;
    }

    if (!allowPartialPayments && parsed !== remainingBalance) {
      return 'Partial payments are disabled. Pay exact balance.';
    }

    return null;
  }, [remainingBalance, allowPartialPayments]);

  const handlePaymentAmountChange = React.useCallback((value) => {
    setPaymentAmount(value);
    const error = validatePaymentAmount(value);
    setPaymentAmountError(error || '');
  }, [validatePaymentAmount]);

  const loading = paymentDetailQuery.isLoading || isPaying;

  const resolveAmountToPay = () => {
    const error = validatePaymentAmount(paymentAmount);
    if (error) {
      return { amount: null, error };
    }
    return { amount: Number(paymentAmount), error: null };
  };

  const handleGCashPay = async () => {
    if (isPaymentDisabled) {
      showAlert('Payment Unavailable', paymentDisabledReason);
      return;
    }

    if (!showOnline) {
      showAlert('Payment Method Unavailable', 'Online payments are currently not enabled for this property.');
      return;
    }

    if (!invoice) return;
    const { amount: amountToPay, error } = resolveAmountToPay();
    if (error) {
      return showAlert('Invalid Amount', error);
    }

    try {
      setIsPaying(true);
      const res = await PaymentService.createPaymongoSource(invoice.id, 'gcash', null, amountToPay);
      if (!res.success) return showAlert('Payment Error', res.error || 'Failed to create source');

      const sourceBody = res.data?.source || res.data;
      const checkoutUrl = sourceBody?.data?.attributes?.redirect?.checkout_url;
      if (checkoutUrl) {
        navigation.navigate('PaymentRedirectWebview', { checkoutUrl, invoiceId: invoice.id });
      } else {
        showAlert('Payment', 'No checkout URL returned.');
      }
    } catch (e) {
      console.error('GCash pay error', e);
      showAlert('Payment Error', 'Failed to initiate GCash payment');
    } finally {
      setIsPaying(false);
    }
  };

  const handleCardPay = () => {
    if (isPaymentDisabled) {
      showAlert('Payment Unavailable', paymentDisabledReason);
      return;
    }

    if (!showOnline) {
      showAlert('Payment Method Unavailable', 'Online payments are currently not enabled for this property.');
      return;
    }

    const { amount: amountToPay, error } = resolveAmountToPay();
    if (error) {
      showAlert('Invalid Amount', error);
      return;
    }

    const apiUrl = BASE_URL;
    const tokenizeUrl = `${apiUrl}/payments/tokenize/${invoice.id}?amount=${encodeURIComponent(amountToPay)}`;
    navigation.navigate('PaymentCardWebview', { tokenizeUrl, invoiceId: invoice.id, amount: amountToPay });
  };

  const handleOfflinePayment = async (method) => {
    if (tenantPaymentsTempDisabled) {
      showAlert('Payments Temporarily Disabled', 'Tenant payments are temporarily unavailable while payment compliance updates are in progress.');
      return;
    }

    if (method === 'cash' && !showCash) {
      showAlert('Payment Method Unavailable', 'Cash payments are currently not enabled for this property.');
      return;
    }

    if (method === 'gcash' && !showManualGcash) {
      showAlert('Payment Method Unavailable', 'Manual GCash transfer is currently not enabled.');
      return;
    }

    const { amount: amountToPay, error } = resolveAmountToPay();
    if (error) {
      showAlert('Invalid Amount', error);
      return;
    }

    if (method === 'gcash' && !offlineDetails.reference.trim()) {
      showAlert('Reference Required', 'Please provide the GCash transfer reference number.');
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
        showAlert('Payment Error', response.error || 'Failed to submit offline payment details.');
        return;
      }

      showAlert('Submitted', method === 'gcash'
        ? 'Manual GCash transfer details submitted. Waiting for landlord verification.'
        : 'Cash payment request submitted. Waiting for landlord confirmation.');
      setOfflineDetails({ reference: '', notes: '' });
      await refetchPaymentDetail();
    } catch (error) {
      console.error('Offline payment submit error', error);
      showAlert('Payment Error', 'Failed to submit offline payment details.');
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
              <Text style={{ fontWeight: '600', color: theme.colors.text }}>{invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</Text>
            </View>
          </View>

          <Text style={[styles.invoiceTitle, { color: theme.colors.text }]}>{invoice.description || 'Invoice'}</Text>

          <View style={[homeStyles.surfaceCardMedium, { backgroundColor: theme.colors.surface }]}>
            <View style={homeStyles.rowBetween}>
              <Text style={{ color: theme.colors.textSecondary }}>Subtotal</Text>
              <Text style={{ fontWeight: '600', color: theme.colors.text }}>₱{((invoice.subtotal_cents ?? invoice.amount_cents ?? 0) / 100).toLocaleString()}</Text>
            </View>
            <View style={[homeStyles.rowBetween, { marginTop: 8 }]}>
              <Text style={{ color: theme.colors.textSecondary }}>Tax</Text>
              <Text style={{ fontWeight: '600', color: theme.colors.text }}>₱{((invoice.tax_cents ?? 0) / 100).toLocaleString()}</Text>
            </View>
            {addonTotalCents > 0 && (
              <>
                {addonLines.map((line) => (
                  <View key={line.key} style={[homeStyles.rowBetween, { marginTop: 8 }]}>
                    <Text style={{ color: theme.colors.textSecondary }}>
                      {line.name}{line.quantity > 1 ? ` x ${line.quantity}` : ''}
                    </Text>
                    <Text style={{ fontWeight: '600', color: theme.colors.text }}>₱{(line.amountCents / 100).toLocaleString()}</Text>
                  </View>
                ))}
                <View style={[homeStyles.rowBetween, { marginTop: 8 }]}>
                  <Text style={{ color: theme.colors.textSecondary }}>Add-ons Total</Text>
                  <Text style={{ fontWeight: '600', color: theme.colors.text }}>₱{(addonTotalCents / 100).toLocaleString()}</Text>
                </View>
              </>
            )}
            <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
            <View style={homeStyles.rowBetween}>
              <Text style={[styles.totalText, { color: theme.colors.text }]}>Total</Text>
              <Text style={[styles.totalText, { color: theme.colors.text }]}>₱{((invoice.total_cents ?? invoice.amount_cents ?? 0) / 100).toLocaleString()}</Text>
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
                    {paymentDisabledReason}
                  </Text>
                </View>
              )}
              {!tenantPaymentsTempDisabled && (invoicePaymongoDisabled || isPendingManualVerification) && (
                <View style={{ marginBottom: 16, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb' }}>
                  <Text style={{ color: '#92400e', fontWeight: '600' }}>
                    {paymentDisabledReason}
                  </Text>
                </View>
              )}
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Amount to Pay (₱)</Text>
              <TextInput
                style={{
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: paymentAmountError ? '#EF4444' : theme.colors.border,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: theme.colors.text,
                  marginBottom: 4
                }}
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={handlePaymentAmountChange}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textTertiary}
                editable={allowPartialPayments}
              />
              {paymentAmountError ? (
                <Text style={{ fontSize: 12, color: '#EF4444', marginBottom: 8 }}>
                  {paymentAmountError}
                </Text>
              ) : null}
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
                  {showOnline && !isPaymentDisabled ? 'Online (GCash, Card)' : null}
                  {showOnline && !isPaymentDisabled && (showCash || showManualGcash) ? ' • ' : ''}
                  {showCash ? 'Cash' : null}
                  {showCash && showManualGcash ? ' • ' : ''}
                  {showManualGcash ? 'Manual GCash Transfer' : null}
                  {(isPaymentDisabled || !showOnline) && !showCash && !showManualGcash ? 'No payment method is currently enabled for this property.' : ''}
                </Text>
              </View>

              {showOnline && !isPaymentDisabled && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={handleGCashPay} disabled={isPaymentDisabled || !!paymentAmountError} style={[homeStyles.buttonFlex, styles.payBtn, { backgroundColor: '#007AFF', opacity: (isPaymentDisabled || paymentAmountError) ? 0.5 : 1 }]}>
                    <Text style={styles.payBtnText}>Pay with GCash</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCardPay} disabled={isPaymentDisabled || !!paymentAmountError} style={[homeStyles.buttonFlex, styles.payBtn, { backgroundColor: theme.colors.primary, opacity: (isPaymentDisabled || paymentAmountError) ? 0.5 : 1 }]}>
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
