import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStyles } from '../../../../styles/Menu/Payments.js';
import PaymentService from '../../../../services/PaymentService.js';
import { BASE_URL } from '../../../../config/index.js';
import SystemToggleService from '../../../../services/SystemToggleService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import { formatPrice } from '../../../../utils/price.js';
import Decimal from '../../../../utils/decimal.js';
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

const IMAGE_MIME_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

const HEIC_MIME_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

const ALLOWED_PROOF_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const normalizeMimeType = (value) => {
  if (!value || typeof value !== 'string') return '';
  const normalized = value.toLowerCase();
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
};

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

const extractImageExtension = (value) => {
  if (!value || typeof value !== 'string') return '';
  const clean = value.split('?')[0];
  const match = /\.([a-zA-Z0-9]+)$/.exec(clean);
  return match ? match[1].toLowerCase() : '';
};

const resolveProofMeta = (asset) => {
  const rawName = asset?.fileName || asset?.name || (asset?.uri ? asset.uri.split('/').pop() : '');
  const extFromName = extractImageExtension(rawName);
  const extFromUri = extractImageExtension(asset?.uri || '');
  const ext = extFromName || extFromUri;

  let mimeFromAsset = normalizeMimeType(asset?.mimeType);
  
  // If the asset reports a generic 'image' or is missing a mime type, try to infer from extension
  if (!mimeFromAsset || mimeFromAsset === 'image') {
    mimeFromAsset = ext ? IMAGE_MIME_BY_EXT[ext] : '';
  }

  const mimeFromExt = ext ? IMAGE_MIME_BY_EXT[ext] : '';
  const mimeType = mimeFromAsset || mimeFromExt || 'image/jpeg';

  const safeExt = ext || (mimeType === 'image/png' ? 'png' : 'jpg');
  const fileName = rawName && rawName.includes('.')
    ? rawName
    : `proof_${Date.now()}.${safeExt}`;

  return { fileName, mimeType, ext };
};

const normalizeProofImageAsset = async (asset) => {
  if (!asset?.uri) return asset;
  const meta = resolveProofMeta(asset);
  const normalizedMime = normalizeMimeType(meta.mimeType);
  const isHeic = HEIC_MIME_TYPES.has(normalizedMime) || meta.ext === 'heic' || meta.ext === 'heif';
  const shouldConvert = isHeic || !normalizedMime || !ALLOWED_PROOF_MIME_TYPES.has(normalizedMime);

  if (shouldConvert) {
    const converted = await ImageManipulator.manipulateAsync(
      asset.uri,
      [],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    return {
      ...asset,
      uri: converted.uri,
      fileName: meta.fileName.replace(/\.[^/.]+$/, '.jpg'),
      mimeType: 'image/jpeg',
      type: 'image/jpeg', // Set to actual mime type
    };
  }

  return {
    ...asset,
    fileName: meta.fileName,
    mimeType: normalizedMime || 'image/jpeg',
    type: normalizedMime || 'image/jpeg', // Set to actual mime type
  };
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

const resolveInvoiceDueDate = (invoice) => (
  invoice?.due_date || invoice?.dueDateIso || invoice?.dueDate || invoice?.due_at || null
);

const resolveInvoiceReference = (invoice) => (
  invoice?.reference ||
  invoice?.reference_no ||
  invoice?.referenceNo ||
  invoice?.invoice_number ||
  invoice?.invoiceNumber ||
  invoice?.id ||
  ''
);

const resolveInvoiceRoom = (invoice) => (
  invoice?.booking?.room?.room_number ||
  invoice?.booking?.room?.roomNumber ||
  invoice?.booking?.room_number ||
  invoice?.room_number ||
  invoice?.roomNumber ||
  ''
);

const resolvePropertyTitle = (property, invoice) => (
  property?.title ||
  property?.name ||
  invoice?.property_name ||
  invoice?.propertyName ||
  '—'
);

const formatDateSafe = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    const unitPrice = Number(addon?.pivot?.price_at_booking_cents ?? addon?.price_at_booking_cents ?? addon?.price_cents ?? 0) / 100;
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
  const dueDateValue = resolveInvoiceDueDate(invoice);
  const referenceValue = resolveInvoiceReference(invoice);
  const roomValue = resolveInvoiceRoom(invoice);
  const propertyTitle = resolvePropertyTitle(property, invoice);
  const descriptionValue = invoice?.description || invoice?.invoice_description || invoice?.title || 'General Service';
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

    // Both amount_cents and amount might be present depending on API version.
    // We normalize everything to Pesos for the UI.
    const totalPesos = invoice.amount_cents
      ? Number(invoice.amount_cents) / 100
      : Number(invoice.amount ?? 0);

    const paidPesos = (invoice.transactions || [])
      .filter((tx) => REFUND_SETTLED_STATUSES.has(String(tx?.status || '').toLowerCase()))
      .reduce((sum, tx) => {
        // If amount_cents is present, it's cents. If only amount is present, it's already pesos.
        const txAmountPesos = tx.amount_cents
          ? Number(tx.amount_cents) / 100
          : Number(tx.amount ?? 0);

        const txRefundedPesos = tx.refunded_amount_cents
          ? Number(tx.refunded_amount_cents) / 100
          : Number(tx.refunded_amount ?? 0);

        return sum + Math.max(0, txAmountPesos - txRefundedPesos);
      }, 0);

    return Math.max(0, totalPesos - paidPesos);
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
      return `Amount cannot exceed ${formatPrice(remainingBalance)}`;
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
    Alert.alert(
      'Upload Proof',
      'Choose a source for your payment proof.',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
              showWarning('Permission required', "You've refused to allow this app to access your camera!");
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
            });

            if (!result.canceled) {
              try {
                const asset = result.assets[0];
                if (asset.fileSize && asset.fileSize > 15 * 1024 * 1024) {
                  showWarning('File Too Large', 'Image size must be less than 15MB');
                  return;
                }
                const normalized = await normalizeProofImageAsset(asset);
                setProofImage(normalized);
              } catch (error) {
                console.error('Proof image normalization failed', error);
                showError('Upload Error', 'Unable to process the photo. Please try again.');
              }
            }
          }
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
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
              try {
                const asset = result.assets[0];
                if (asset.fileSize && asset.fileSize > 15 * 1024 * 1024) {
                  showWarning('File Too Large', 'Image size must be less than 15MB');
                  return;
                }
                const normalized = await normalizeProofImageAsset(asset);
                setProofImage(normalized);
              } catch (error) {
                console.error('Proof image normalization failed', error);
                showError('Upload Error', 'Unable to process the image. Please try again.');
              }
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
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
      const amountCents = Math.round(new Decimal(amountToPay).mul(100).toNumber());
      const formData = new FormData();
      formData.append("amount_cents", String(amountCents));
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
      const proofMeta = resolveProofMeta(proofImage);
      const proofName = proofImage.fileName || proofImage.name || proofMeta.fileName;
      // prioritize .mimeType or .type from the proofImage object, then fallback to metadata or hardcoded jpeg
      const proofType = proofImage.mimeType || proofImage.type || proofMeta.mimeType || 'image/jpeg';

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Detail</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.detailContainer}>

          {/* 1. Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryMain}>
                <Text style={styles.summaryLabel}>Total Balance</Text>
                <Text style={styles.summaryAmount}>{formatPrice(remainingBalance)}</Text>
              </View>
              <View style={styles.summaryStatus}>
                <Text style={styles.summaryStatusText}>{invoice.status}</Text>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Reference</Text>
                <Text style={styles.summaryItemValue}>#{referenceValue || '—'}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Due Date</Text>
                <Text style={styles.summaryItemValue}>
                  {formatDateSafe(dueDateValue)}
                </Text>
              </View>
            </View>
          </View>

          {/* 2. Property & Description Section */}
          <View style={styles.cardSection}>
            <Text style={styles.cardSectionTitle}>Invoice Info</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Property</Text>
              <Text style={styles.infoRowValue}>{propertyTitle}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Room</Text>
              <Text style={styles.infoRowValue}>{roomValue || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Description</Text>
              <Text style={[styles.infoRowValue, { flex: 1, textAlign: 'right', marginLeft: 20 }]}>
                {descriptionValue}
              </Text>
            </View>
          </View>

          {/* 3. Bill Breakdown Section */}
          <View style={styles.cardSection}>
            <Text style={styles.cardSectionTitle}>Bill Breakdown</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Base Amount</Text>
              <Text style={styles.infoRowValue}>{formatPrice(invoice.total_cents ?? invoice.amount_cents ?? (invoice.amount ? invoice.amount * 100 : 0), { isCents: true })}</Text>
            </View>

            {addonTotalCents > 0 && addonLines.map((line) => (
              <View key={line.key} style={styles.infoRow}>
                <Text style={styles.infoRowLabel}>
                  {line.name}{line.quantity > 1 ? ` x ${line.quantity}` : ''}
                </Text>
                <Text style={styles.infoRowValue}>{formatPrice(line.amountCents, { isCents: true })}</Text>
              </View>
            ))}

            <View style={[styles.separator, { marginVertical: 12 }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoRowLabel, { fontWeight: '700', color: theme.colors.text }]}>Total Bill</Text>
              <Text style={[styles.infoRowValue, { fontSize: 16, color: theme.colors.primary }]}>
                {formatPrice(invoice.total_cents ?? invoice.amount_cents ?? (invoice.amount ? invoice.amount * 100 : 0), { isCents: true })}
              </Text>
            </View>
          </View>

          {/* 4. Rejection Reason (If applicable) */}
          {invoice?.status === 'rejected' && invoice?.rejection_reason && (
            <View style={[styles.cardSection, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={{ marginLeft: 8, fontWeight: '700', color: '#DC2626' }}>Payment Rejected</Text>
              </View>
              <Text style={{ fontSize: 13, color: '#991B1B', lineHeight: 18 }}>{invoice.rejection_reason}</Text>
            </View>
          )}

          {/* 5. Refund Breakdown (If applicable) */}
          {['refunded', 'partially_refunded'].includes(String(invoice?.status || '').toLowerCase()) && (() => {
            const stayProgress = getStayProgress(invoice.booking);
            if (!stayProgress) return null;
            return (
              <View style={styles.refundStatsCard}>
                <Text style={[styles.sectionTitle, { fontSize: 14, marginBottom: 12, color: theme.colors.purple }]}>
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
                  <Text style={styles.refundStatValue}>{formatPrice(((invoice.transactions?.filter(t => (t.amount_cents || t.amount || 0) > 0 && REFUND_ELIGIBLE_STATUSES.includes(String(t.status || '').toLowerCase())).reduce((sum, t) => sum + (t.amount_cents || t.amount || 0), 0) || 0) * stayProgress.refundableUnits) / stayProgress.totalUnits, { isCents: true })}</Text>
                </View>
                <View style={[styles.separator, { marginVertical: 8, backgroundColor: 'rgba(126,34,206,0.1)' }]} />
                <View style={styles.refundStatRow}>
                  <Text style={[styles.refundStatLabel, { fontWeight: '800', color: theme.colors.text }]}>Net Refunded</Text>
                  <Text style={[styles.refundStatValue, { fontSize: 15, color: theme.colors.purple }]}>
                    {formatPrice(invoice.transactions?.reduce((s, t) => s + (t.refunded_amount_cents || (t.refunded_amount ? t.refunded_amount * 100 : 0) || 0), 0), { isCents: true })}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* 6. Payment Flow */}
          {isFullyPaid ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.success + '15', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="checkmark-done-circle" size={48} color={theme.colors.success} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text, marginTop: 20 }}>Fully Paid</Text>
              <Text style={{ color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
                This invoice has been settled and no further action is required.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>

              {/* Payment Disabled Banner */}
              {isPaymentDisabled && (
                <View style={{ marginBottom: 20, padding: 16, borderRadius: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row' }}>
                  <Ionicons name="information-circle" size={20} color="#B45309" style={{ marginRight: 12 }} />
                  <Text style={{ flex: 1, color: '#92400E', fontSize: 13, lineHeight: 18, fontWeight: '500' }}>
                    {paymentDisabledReason}
                  </Text>
                </View>
              )}

              {/* Pending Verification Proof */}
              {isPendingManualVerification && (() => {
                const pendingTx = invoice?.transactions?.find(tx => tx.status === 'pending_offline');
                const proofUrl = pendingTx?.gateway_response?.proof_image_url;
                if (!proofUrl) return null;
                return (
                  <View style={{ marginBottom: 24 }}>
                    <Text style={styles.cardSectionTitle}>Submitted Proof</Text>
                    <Image
                      source={{ uri: proofUrl }}
                      style={styles.proofPreview}
                      resizeMode="contain"
                    />
                    <Text style={{ fontSize: 12, color: theme.colors.textTertiary, textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
                      Wait for the landlord to verify your cash submission.
                    </Text>
                  </View>
                );
              })()}

              {/* Amount Input */}
              <Text style={styles.amountInputLabel}>Enter Amount to Pay</Text>
              <View style={[styles.amountInputWrapper, paymentAmountError ? { borderColor: theme.colors.error } : {}]}>
                <Text style={styles.amountInputCurrency}>₱</Text>
                <TextInput
                  style={styles.amountInputField}
                  keyboardType="decimal-pad"
                  value={paymentAmount}
                  onChangeText={handlePaymentAmountChange}
                  placeholder="0.00"
                  editable={allowPartialPayments && !isPaymentDisabled}
                />
              </View>
              {paymentAmountError ? (
                <Text style={{ color: theme.colors.error, fontSize: 12, marginLeft: 4, marginBottom: 12 }}>{paymentAmountError}</Text>
              ) : (
                <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginLeft: 4, marginBottom: 16 }}>
                  {allowPartialPayments
                    ? `You can pay full or partial balance.`
                    : `Partial payments are disabled for this property.`}
                </Text>
              )}

              {/* Payment Method Group: Online */}
              {showOnline && !isPaymentDisabled && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.methodSelectionTitle}>Pay Online (Instant)</Text>

                  <TouchableOpacity style={styles.methodTile} onPress={handleGCashPay} disabled={isPaying || !!paymentAmountError}>
                    <View style={[styles.methodTileIcon, { backgroundColor: '#007AFF' }]}>
                      <Ionicons name="card" size={24} color="#FFF" />
                    </View>
                    <View style={styles.methodTileContent}>
                      <Text style={styles.methodTileName}>GCash</Text>
                      <Text style={styles.methodTileDesc}>Fast & Secure redirection</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.border} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.methodTile} onPress={handleCardPay} disabled={isPaying || !!paymentAmountError}>
                    <View style={[styles.methodTileIcon, { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name="card-outline" size={24} color="#FFF" />
                    </View>
                    <View style={styles.methodTileContent}>
                      <Text style={styles.methodTileName}>Credit / Debit Card</Text>
                      <Text style={styles.methodTileDesc}>Visa, Mastercard, etc.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.border} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Payment Method Group: Manual */}
              {(showCash || showManualGcash) && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.methodSelectionTitle}>Manual / Offline Submission</Text>

                  {showManualGcash && manualPaymentDetails?.gcash_info && (
                    <View style={{ padding: 12, borderRadius: 12, backgroundColor: theme.colors.primary + '10', marginBottom: 16, borderWidth: 1, borderColor: theme.colors.primary + '30' }}>
                      <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 12, marginBottom: 4 }}>Merchant GCash Info:</Text>
                      <Text style={{ color: theme.colors.text, fontSize: 13, lineHeight: 18 }}>{manualPaymentDetails.gcash_info}</Text>
                    </View>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Reference Number</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Required for GCash transfer"
                      value={offlineDetails.reference}
                      onChangeText={(val) => setOfflineDetails(p => ({ ...p, reference: val }))}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Notes (Optional)</Text>
                    <TextInput
                      style={[styles.formInput, styles.formInputMultiline]}
                      placeholder="Add any extra info for the landlord"
                      multiline
                      value={offlineDetails.notes}
                      onChangeText={(val) => setOfflineDetails(p => ({ ...p, notes: val }))}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Proof of Payment</Text>
                    <TouchableOpacity style={styles.uploadArea} onPress={handleProofImagePick}>
                      {proofImage ? (
                        <Image source={{ uri: proofImage.uri }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="cover" />
                      ) : (
                        <>
                          <Ionicons name="cloud-upload" size={32} color={theme.colors.primary} />
                          <Text style={styles.uploadAreaText}>Tap to Upload Proof</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {showManualGcash && (
                      <TouchableOpacity
                        style={[styles.payBtn, { flex: 1, backgroundColor: '#2563EB', opacity: isPaying ? 0.6 : 1 }]}
                        onPress={() => handleOfflinePayment('gcash')}
                        disabled={isPaying}
                      >
                        <Text style={[styles.payBtnText, { textAlign: 'center' }]}>Submit GCash</Text>
                      </TouchableOpacity>
                    )}
                    {showCash && (
                      <TouchableOpacity
                        style={[styles.payBtn, { flex: 1, backgroundColor: '#16A34A', opacity: isPaying ? 0.6 : 1 }]}
                        onPress={() => handleOfflinePayment('cash')}
                        disabled={isPaying}
                      >
                        <Text style={[styles.payBtnText, { textAlign: 'center' }]}>Request Cash</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Wallet Section */}
              {!tenantPaymentsTempDisabled && walletBalance > 0 && (
                <View style={{ marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.payBtn, { backgroundColor: '#7C3AED', opacity: isPaying ? 0.6 : 1 }]}
                    onPress={handleWalletCreditPayment}
                    disabled={isPaying}
                  >
                    <Text style={[styles.payBtnText, { textAlign: 'center' }]}>
                      Apply Wallet Balance (₱{Math.min(remainingBalance, walletBalance).toLocaleString()})
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 10, color: theme.colors.textTertiary, textAlign: 'center', marginTop: 10, paddingHorizontal: 30 }}>
                    Wallet credits are applied instantly against your balance.
                  </Text>
                </View>
              )}

            </View>
          )}

        </View>
      </ScrollView>

      {/* Subtle Loading Overlay */}
      {isPaying && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, fontWeight: '700', color: theme.colors.primary }}>Processing...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
