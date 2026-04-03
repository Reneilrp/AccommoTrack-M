import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getStyles } from '../../../../styles/Menu/Payments.js';
import PaymentService from '../../../../services/PaymentService.js';
import { BASE_URL } from '../../../../config/index.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import {
  tenantQueryKeys,
  useTenantFocusRefetch,
} from '../../hooks/useTenantQueryHelpers.js';

export default function PaymentDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { invoiceId } = route.params || {};

  const [isPaying, setIsPaying] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
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
      if (!previousAmount) return remainingBalance.toString();

      const numericAmount = Number(previousAmount);
      if (!Number.isFinite(numericAmount) || numericAmount > remainingBalance) {
        return remainingBalance.toString();
      }

      return previousAmount;
    });
  }, [invoice?.id, remainingBalance]);

  const loading = paymentDetailQuery.isLoading || isPaying;

  const handleGCashPay = async () => {
    if (!invoice) return;
    const amountToPay = Number(paymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      return Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
    }
    if (amountToPay > remainingBalance) {
      return Alert.alert('Error', `Amount cannot exceed the remaining balance of ₱${remainingBalance.toLocaleString()}`);
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
    // Note: If using a custom tokenization view, it might need the amount passed in the URL.
    // For now, passing standard tokenizeUrl. If partial is needed for cards, backend updates for tokenization route might be required.
    const apiUrl = BASE_URL;
    const tokenizeUrl = `${apiUrl}/payments/tokenize/${invoice.id}`;
    navigation.navigate('PaymentCardWebview', { tokenizeUrl, invoiceId: invoice.id });
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
              />
              <Text style={{ fontSize: 12, color: theme.colors.textTertiary, marginBottom: 24 }}>
                You can pay the full remaining balance of ₱{remainingBalance.toLocaleString()} or enter a partial amount.
              </Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={handleGCashPay} style={[homeStyles.buttonFlex, styles.payBtn, { backgroundColor: '#007AFF' }]}>
                  <Text style={styles.payBtnText}>Pay with GCash</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCardPay} style={[homeStyles.buttonFlex, styles.payBtn, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.payBtnText}>Pay with Card</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
