import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { showError, showSuccess, showWarning } from '../../../../utils/toast.js';

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

const REFUND_FIXED_PENALTY_CENTS = 50000;
const REFUND_ELIGIBLE_STATUSES = ['paid', 'succeeded'];

const toDateOnly = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const addCalendarMonth = (date, dayOfMonth) => {
  const d = new Date(date);
  const currentMonth = d.getMonth();
  d.setMonth(currentMonth + 1);
  if (d.getMonth() > (currentMonth + 1) % 12) {
    d.setDate(0);
  } else {
    d.setDate(Math.min(dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  }
  return d;
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

const calculateMonthsElapsed = (startDate, today, billingDay) => {
  if (!startDate || !today) return 0;
  let months = 0;
  let cursor = new Date(startDate);
  while (cursor <= today) {
    months++;
    cursor = addCalendarMonth(cursor, billingDay);
  }
  return Math.max(0, months - 1);
};

const getStayProgress = (booking) => {
  const start = toDateOnly(booking?.start_date || booking?.checkIn);
  const end = toDateOnly(booking?.end_date || booking?.checkOut);
  if (!start || !end || end < start) return null;

  const today = toDateOnly(new Date());
  const totalDays = Math.max(1, Math.floor((end - start) / 86400000) + 1);
  const billingDay = booking?.billing_day || start.getDate();
  const billingPolicy = booking?.billing_policy || 'monthly';

  if (billingPolicy === 'daily') {
    let stayedDays = 0;
    if (today >= start && today <= end) stayedDays = Math.floor((today - start) / 86400000) + 1;
    else if (today > end) stayedDays = totalDays;
    const refundableDays = Math.max(0, totalDays - stayedDays);
    return { mode: 'daily', totalUnits: totalDays, usedUnits: stayedDays, refundableUnits: refundableDays, unitLabel: 'days' };
  }

  const totalMonths = Math.max(1, calculateTotalMonths(start, end, billingDay));
  const usedMonths = calculateMonthsElapsed(start, today, billingDay);
  const refundableMonths = Math.max(0, totalMonths - usedMonths);

  return { mode: 'monthly', totalUnits: totalMonths, usedUnits: usedMonths, refundableUnits: refundableMonths, unitLabel: totalMonths === 1 ? 'month' : 'months' };
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
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { invoiceId } = route.params || {};

  const [isPaying, setIsPaying] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAmountError, setPaymentAmountError] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [offlineDetails, setOfflineDetails] = useState({ reference: '', notes: '' });
  const [proofImage, setProofImage] = useState(null);
  const [tenantPaymentsTempDisabled, setTenantPaymentsTempDisabled] = useState(
    SystemToggleService.getDefaults().tenantPaymentsDisabled,
  );
  const [invoicePaymongoDisabled, setInvoicePaymongoDisabled] = useState(
    SystemToggleService.getDefaults().invoicePaymongoDisabled,
  );
  const [manualGcashReservationDisabled, setManualGcashReservationDisabled] = useState(
    SystemToggleService.getDefaults().manualGcashReservationDisabled,
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
  const isReservationInvoice = String(invoice?.invoice_type || invoice?.type || '').toLowerCase() === 'reservation_fee';
  const showOnline = acceptedPayments.includes('online') && landlordSettings.allowed.includes('online');
  const showCash = acceptedPayments.includes('cash') && landlordSettings.allowed.includes('cash');
  const showManualGcash = landlordSettings.allowed.includes('gcash') && (!isReservationInvoice || !manualGcashReservationDisabled);
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
      setManualGcashReservationDisabled(Boolean(result.data.manualGcashReservationDisabled));
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!paymentDetailQuery.error) return;
    console.error('Error fetching invoice:', paymentDetailQuery.error);
    showError('Error', paymentDetailQuery.error.message || 'Failed to load invoice');
  }, [paymentDetailQuery.error]);

  useEffect(() => {
    let mounted = true;
    PaymentService.getWalletBalance()
      .then((result) => {
        if (!mounted || !result?.success) return;
        const balance = Number(result.data ?? 0);
        setWalletBalance(Number.isFinite(balance) ? balance : 0);
      })
      .catch(() => {
        // Non-critical: wallet button remains hidden when balance is unavailable.
      });

    return () => {
      mounted = false;
    };
  }, [invoiceId]);

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
    if (isPaying) return;

    if (isPaymentDisabled) {
      showWarning('Payment Unavailable', paymentDisabledReason);
      return;
    }

    if (!showOnline) {
      showWarning('Payment Method Unavailable', 'Online payments are currently not enabled for this property.');
      return;
    }

    if (!invoice) return;
    const { amount: amountToPay, error } = resolveAmountToPay();
    if (error) {
      return showWarning('Invalid Amount', error);
    }

    try {
      setIsPaying(true);
      const res = await PaymentService.createPaymongoSource(invoice.id, 'gcash', null, amountToPay);
      if (!res.success) return showError('Payment Error', res.error || 'Failed to create source');

      const sourceBody = res.data?.source || res.data;
      const checkoutUrl = sourceBody?.data?.attributes?.redirect?.checkout_url;
      if (checkoutUrl) {
        navigation.navigate('PaymentRedirectWebview', { checkoutUrl, invoiceId: invoice.id });
      } else {
        showError('Payment', 'No checkout URL returned.');
      }
    } catch (e) {
      console.error('GCash pay error', e);
      showError('Payment Error', 'Failed to initiate GCash payment');
    } finally {
      setIsPaying(false);
    }
  };

  const handleCardPay = () => {
    if (isPaying) return;

    if (isPaymentDisabled) {
      showWarning('Payment Unavailable', paymentDisabledReason);
      return;
    }

    if (!showOnline) {
      showWarning('Payment Method Unavailable', 'Online payments are currently not enabled for this property.');
      return;
    }

    const { amount: amountToPay, error } = resolveAmountToPay();
    if (error) {
      showWarning('Invalid Amount', error);
      return;
    }

    const apiUrl = BASE_URL;
    const tokenizeUrl = `${apiUrl}/payments/tokenize/${invoice.id}?amount=${encodeURIComponent(amountToPay)}`;
    navigation.navigate('PaymentCardWebview', { tokenizeUrl, invoiceId: invoice.id, amount: amountToPay });
  };

  const handleProofImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      showWarning('Permission required', "You've refused to allow this app to access your photos!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setProofImage(result.assets[0]);
    }
  };

  const handleOfflinePayment = async (method) => {
    if (isPaying) return;

    if (tenantPaymentsTempDisabled) {
      showWarning('Payments Temporarily Disabled', 'Tenant payments are temporarily unavailable while payment compliance updates are in progress.');
      return;
    }

    if (method === 'cash' && !showCash) {
      showWarning('Payment Method Unavailable', 'Cash payments are currently not enabled for this property.');
      return;
    }

    if (method === 'gcash' && !showManualGcash) {
      showWarning('Payment Method Unavailable', 'Manual GCash transfer is currently not enabled.');
      return;
    }

    const { amount: amountToPay, error } = resolveAmountToPay();
    if (error) {
      showWarning('Invalid Amount', error);
      return;
    }

    if (method === 'gcash' && !offlineDetails.reference.trim()) {
      showWarning('Reference Required', 'Please provide the GCash transfer reference number.');
      return;
    }

    if (!proofImage) {
      showWarning('Proof Required', 'Please upload a proof of payment attachment.');
      return;
    }

    try {
      setIsPaying(true);
      const formData = new FormData();
      formData.append("amount_cents", Math.round(amountToPay * 100));
      formData.append("method", method);

      if (offlineDetails.reference.trim()) {
        formData.append("reference", offlineDetails.reference.trim());
      }

      formData.append(
        "notes",
        offlineDetails.notes.trim() ||
        (method === 'gcash'
          ? 'Manual GCash transfer submitted by tenant'
          : 'Cash payment request submitted by tenant'),
      );

      const proofUri = proofImage.uri;
      const proofName = proofImage.fileName || proofImage.name || proofUri.split('/').pop() || 'proof.jpg';
      const proofType = proofImage.mimeType || proofImage.type || 'image/jpeg';

      formData.append("proof_image", {
        uri: proofUri,
        type: proofType,
        name: proofName,
      });

      const response = await PaymentService.createOfflineRecord(invoice.id, formData);

      if (!response.success) {
        showError('Payment Error', response.error || 'Failed to submit offline payment details.');
        return;
      }

      showSuccess('Submitted', method === 'gcash'
        ? 'Manual GCash transfer successfully submitted. Please wait for landlord verification.'
        : 'Cash payment request submitted. Waiting for landlord confirmation.');
      setOfflineDetails({ reference: '', notes: '' });
      setProofImage(null);
      await refetchPaymentDetail();
      queryClient.invalidateQueries(tenantQueryKeys.all);
    } catch (error) {
      console.error('Offline payment submit error', error);
      showError('Payment Error', 'Failed to submit offline payment details.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleWalletCreditPayment = async () => {
    if (isPaying) return;

    if (tenantPaymentsTempDisabled) {
      showWarning('Payments Temporarily Disabled', 'Tenant payments are temporarily unavailable while payment compliance updates are in progress.');
      return;
    }

    const amountToPay = Math.min(remainingBalance, walletBalance);
    
    if (amountToPay <= 0) {
      showWarning('Invalid Amount', 'No remaining balance or wallet credits available.');
      return;
    }

    const amountCents = Math.round(amountToPay * 100);

    try {
      setIsPaying(true);
      const result = await PaymentService.applyWalletCredit(invoice.id, amountCents);
      if (!result?.success) {
        showError('Payment Error', result?.error || 'Failed to apply wallet credits.');
        return;
      }

      showSuccess('Payment Success', 'Wallet credits applied successfully.');
      await refetchPaymentDetail();
      queryClient.invalidateQueries(tenantQueryKeys.all);

      const balanceResult = await PaymentService.getWalletBalance();
      if (balanceResult?.success) {
        const refreshedBalance = Number(balanceResult.data ?? 0);
        setWalletBalance(Number.isFinite(refreshedBalance) ? refreshedBalance : 0);
      }
    } catch (error) {
      console.error('Wallet payment error', error);
      showError('Payment Error', 'Failed to apply wallet credits.');
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

          {invoice?.status === 'rejected' && invoice?.rejection_reason && (
            <View style={{ marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.05)', borderLeftWidth: 4, borderLeftColor: '#EF4444' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444', textTransform: 'uppercase', marginBottom: 4 }}>
                Reason for Rejection
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.text }}>{invoice.rejection_reason}</Text>
            </View>
          )}

          {invoice?.status === 'refunded' || invoice?.status === 'partially_refunded' ? (() => {
            const stayProgress = getStayProgress(invoice.booking);
            if (!stayProgress) return null;
            
            const totalPaidCents = invoice.transactions?.filter(t => (t.amount_cents || 0) > 0 && REFUND_ELIGIBLE_STATUSES.includes(String(t.status || '').toLowerCase())).reduce((sum, t) => sum + (t.amount_cents || 0), 0) || 0;
            const proratedCents = stayProgress.totalUnits > 0 ? Math.floor((totalPaidCents * stayProgress.refundableUnits) / stayProgress.totalUnits) : 0;
            
            return (
              <View style={styles.refundStatsCard}>
                <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 12, color: theme.colors.purple }]}>
                  Refund Breakdown
                </Text>
                <View style={styles.refundStatRow}>
                  <Text style={styles.refundStatLabel}>Stay Progress</Text>
                  <Text style={styles.refundStatValue}>
                    {stayProgress.usedUnits} / {stayProgress.totalUnits} {stayProgress.unitLabel} used
                  </Text>
                </View>
                <View style={styles.refundStatRow}>
                  <Text style={styles.refundStatLabel}>Refundable Portion</Text>
                  <Text style={[styles.refundStatValue, styles.refundStatEmphasis]}>
                    {Math.round((stayProgress.refundableUnits / stayProgress.totalUnits) * 100)}%
                  </Text>
                </View>
                <View style={styles.refundStatRow}>
                  <Text style={styles.refundStatLabel}>Prorated Amount</Text>
                  <Text style={styles.refundStatValue}>₱{(proratedCents / 100).toLocaleString()}</Text>
                </View>
                <View style={styles.refundStatRow}>
                  <Text style={styles.refundStatLabel}>Fixed Penalty</Text>
                  <Text style={styles.refundStatValue}>- ₱{(REFUND_FIXED_PENALTY_CENTS / 100).toLocaleString()}</Text>
                </View>
                <View style={[styles.separator, { marginVertical: 4, backgroundColor: 'rgba(126,34,206,0.1)' }]} />
                <View style={styles.refundStatRow}>
                  <Text style={[styles.refundStatLabel, { fontWeight: '800', color: theme.colors.text }]}>Total Refunded</Text>
                  <Text style={[styles.refundStatValue, { fontSize: 15, color: theme.colors.purple }]}>
                    ₱{(invoice.transactions?.reduce((s, t) => s + (t.refunded_amount_cents || 0), 0) / 100).toLocaleString()}
                  </Text>
                </View>
              </View>
            );
          })() : null}

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
              {!tenantPaymentsTempDisabled && (invoicePaymongoDisabled || isPendingManualVerification) && (() => {
                const pendingTx = invoice?.transactions?.find(tx => tx.status === 'pending_offline');
                const proofUrl = pendingTx?.gateway_response?.proof_image_url;
                return (
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb', marginBottom: proofUrl ? 10 : 0 }}>
                      <Text style={{ color: '#92400e', fontWeight: '700', marginBottom: 4 }}>
                        {isPendingManualVerification ? 'Awaiting Verification' : 'Payments Temporarily Unavailable'}
                      </Text>
                      <Text style={{ color: '#92400e', fontWeight: '400', fontSize: 13 }}>
                        {paymentDisabledReason}
                      </Text>
                      {pendingTx && (
                        <Text style={{ color: '#B45309', fontWeight: '600', fontSize: 11, marginTop: 6 }}>
                          Submitted: ₱{(pendingTx.amount_cents / 100).toLocaleString()} via {(pendingTx.method || '').replace('_', ' ')}
                          {pendingTx.gateway_reference ? ` · Ref: ${pendingTx.gateway_reference}` : ''}
                        </Text>
                      )}
                    </View>
                    {proofUrl && (
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                          Your Submitted Proof
                        </Text>
                        <Image
                          source={{ uri: proofUrl }}
                          style={{ width: '100%', height: 160, borderRadius: 10, borderWidth: 1.5, borderColor: '#fde68a' }}
                          resizeMode="contain"
                        />
                        <Text style={{ fontSize: 10, color: '#B45309', fontStyle: 'italic', textAlign: 'center', marginTop: 4 }}>
                          This is the proof you submitted
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
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
                  {showOnline && !isPaymentDisabled && (showCash || showManualGcash || walletBalance > 0) ? ' • ' : ''}
                  {showCash ? 'Cash' : null}
                  {showCash && (showManualGcash || walletBalance > 0) ? ' • ' : ''}
                  {showManualGcash ? 'Manual GCash Transfer' : null}
                  {showManualGcash && walletBalance > 0 ? ' • ' : ''}
                  {walletBalance > 0 ? `Wallet Credits (₱${walletBalance.toLocaleString()})` : null}
                  {(isPaymentDisabled || !showOnline) && !showCash && !showManualGcash && walletBalance <= 0 ? 'No payment method is currently enabled for this property.' : ''}
                </Text>
              </View>

              {showOnline && !isPaymentDisabled && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity 
                    onPress={handleGCashPay} 
                    disabled={isPaymentDisabled || isPaying || !!paymentAmountError} 
                    style={[homeStyles.buttonFlex, styles.payBtn, { backgroundColor: '#007AFF', opacity: (isPaymentDisabled || isPaying || paymentAmountError) ? 0.5 : 1 }]}
                  >
                    <Text style={styles.payBtnText}>Pay with GCash</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleCardPay} 
                    disabled={isPaymentDisabled || isPaying || !!paymentAmountError} 
                    style={[homeStyles.buttonFlex, styles.payBtn, { backgroundColor: theme.colors.primary, opacity: (isPaymentDisabled || isPaying || paymentAmountError) ? 0.5 : 1 }]}
                  >
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

                  <TouchableOpacity
                    onPress={handleProofImagePick}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: 10,
                      backgroundColor: theme.colors.backgroundSecondary,
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons name="image-outline" size={20} color={theme.colors.text} style={{ marginRight: 10 }} />
                    <Text style={{ color: theme.colors.text, fontSize: 14, flex: 1 }}>
                      {proofImage ? 'Change Proof of Payment' : 'Upload Proof of Payment *'}
                    </Text>
                  </TouchableOpacity>

                  {proofImage && (
                    <Image
                      source={{ uri: proofImage.uri }}
                      style={{ width: '100%', height: 150, borderRadius: 10, marginBottom: 8, objectFit: 'contain' }}
                    />
                  )}

                  {showManualGcash && (
                    <TouchableOpacity
                      onPress={() => handleOfflinePayment('gcash')}
                      disabled={tenantPaymentsTempDisabled || isPaying}
                      style={[styles.payBtn, { backgroundColor: '#2563EB', opacity: (tenantPaymentsTempDisabled || isPaying) ? 0.6 : 1, marginBottom: 8 }]}
                    >
                      <Text style={styles.payBtnText}>Submit Manual GCash Transfer</Text>
                    </TouchableOpacity>
                  )}

                  {showCash && (
                    <TouchableOpacity
                      onPress={() => handleOfflinePayment('cash')}
                      disabled={tenantPaymentsTempDisabled || isPaying}
                      style={[styles.payBtn, { backgroundColor: '#16a34a', opacity: (tenantPaymentsTempDisabled || isPaying) ? 0.6 : 1 }]}
                    >
                      <Text style={styles.payBtnText}>Request Cash Payment</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {!tenantPaymentsTempDisabled && walletBalance > 0 && (
                <View style={{ marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={handleWalletCreditPayment}
                    disabled={tenantPaymentsTempDisabled || isPaying}
                    style={[styles.payBtn, { backgroundColor: '#7C3AED', opacity: (tenantPaymentsTempDisabled || isPaying) ? 0.6 : 1, marginBottom: 8 }]}
                  >
                    <Text style={styles.payBtnText}>Apply Wallet Credits (₱{Math.min(remainingBalance, walletBalance).toLocaleString()})</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 16 }}>
                    * Credits are automatically earned from room transfers and refunds. Manual top-ups are not supported.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
