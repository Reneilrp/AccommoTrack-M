import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Menu/Payments.js';
import PaymentService from '../../../services/PaymentService.js';

export default function PaymentDetail() {
  const route = useRoute();
  const navigation = useNavigation();
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
    const apiUrl = 'http://192.168.254.106:8000';
    const tokenizeUrl = `${apiUrl}/payments/tokenize/${invoice.id}`;
    navigation.navigate('PaymentCardWebview', { tokenizeUrl, invoiceId: invoice.id });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ padding: 20 }}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ padding: 20 }}>
          <Text style={{ color: '#6B7280' }}>Invoice not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice #{invoice.reference || invoice.id}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>{invoice.description || 'Invoice'}</Text>

          <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#6B7280' }}>Subtotal</Text>
              <Text style={{ fontWeight: '600' }}>₱{((invoice.subtotal_cents ?? invoice.amount_cents ?? 0)/100).toLocaleString()}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#6B7280' }}>Tax</Text>
              <Text style={{ fontWeight: '600' }}>₱{((invoice.tax_cents ?? 0)/100).toLocaleString()}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>Total</Text>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>₱{((invoice.total_cents ?? invoice.amount_cents ?? 0)/100).toLocaleString()}</Text>
            </View>
          </View>

          <Text style={{ color: '#6B7280', marginBottom: 8 }}>Status: <Text style={{ color: '#111827', fontWeight: '600' }}>{invoice.status}</Text></Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={handleGCashPay} style={{ flex: 1, backgroundColor: '#007AFF', padding: 14, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ color: '#FFF', fontWeight: '700' }}>Pay with GCash</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCardPay} style={{ flex: 1, backgroundColor: '#10B981', padding: 14, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ color: '#FFF', fontWeight: '700' }}>Pay with Card</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
