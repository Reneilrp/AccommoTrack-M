import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getStyles } from '../../../../styles/Menu/Payments.js';
import PaymentService from '../../../../services/PaymentService.js';
import { BASE_URL } from '../../../../config';
import { useTheme } from '../../../../contexts/ThemeContext';
import homeStyles from '../../../../styles/Tenant/HomePage.js';

export default function PaymentDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { invoiceId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const res = await PaymentService.getPaymentDetails(invoiceId);
      if (res.success && res.data) {
        setInvoice(res.data);
      } else {
        Alert.alert('Error', res.error || 'Failed to load invoice');
      }
    } catch (e) {
      console.error('Error fetching invoice:', e);
      Alert.alert('Error', 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const handleGCashPay = async () => {
    if (!invoice) return;
    try {
      setLoading(true);
      const res = await PaymentService.createPaymongoSource(invoice.id, 'gcash', null);
      if (!res.success) return Alert.alert('Payment Error', res.error || 'Failed to create source');

      const sourceBody = res.data?.source || res.data;
      const checkoutUrl = sourceBody?.data?.attributes?.redirect?.checkout_url;
      if (checkoutUrl) {
        // Open checkout in-app so we can detect the return URL and refresh the invoice
        navigation.navigate('PaymentRedirectWebview', { checkoutUrl, invoiceId: invoice.id });
      } else {
        Alert.alert('Payment', 'No checkout URL returned.');
      }
    } catch (e) {
      console.error('GCash pay error', e);
      Alert.alert('Payment Error', 'Failed to initiate GCash payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPay = () => {
    const base = PaymentService.API_BASE || null;
    // Build tokenize URL from backend (strip /api if present)
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
          </View>

          <Text style={[styles.statusRow, { color: theme.colors.textSecondary }]}>Status: <Text style={[styles.statusValue, { color: theme.colors.text }]}>{invoice.status}</Text></Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={handleGCashPay} style={[homeStyles.buttonFlex, styles.payBtn, { backgroundColor: '#007AFF' }]}>
              <Text style={styles.payBtnText}>Pay with GCash</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCardPay} style={[homeStyles.buttonFlex, styles.payBtn, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.payBtnText}>Pay with Card</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
