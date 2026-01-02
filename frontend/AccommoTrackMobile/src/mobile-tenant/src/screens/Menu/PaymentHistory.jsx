import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { styles } from '../../../../styles/Menu/Payments.js';
import PaymentService from '../../../../services/PaymentService.js';

export default function PaymentHistory() {
  const navigation = useNavigation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const paymentsResult = await PaymentService.getMyPayments();
      if (paymentsResult.success && paymentsResult.data) {
        setPayments(paymentsResult.data);
      } else {
        setPayments([]);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Payments</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>Loading payments...</Text>
            </View>
          ) : payments.length > 0 ? (
            payments.map((payment) => (
              <TouchableOpacity key={payment.id} style={styles.paymentCard} onPress={() => navigation.navigate('PaymentDetail', { invoiceId: payment.id })}>
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentIcon}>
                    <Ionicons name="receipt-outline" size={24} color="#10b981" />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.propertyName}>{payment.propertyName}</Text>
                    <Text style={styles.paymentDate}>{payment.date}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `#00000020` }]}>
                    <Text style={[styles.statusText, { color: '#000' }]}>{payment.paymentStatus || payment.status}</Text>
                  </View>
                </View>

                <View style={styles.paymentDetails}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Amount:</Text>
                    <Text style={styles.paymentAmount}>₱{payment.amount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Method:</Text>
                    <Text style={styles.paymentValue}>{payment.method}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Reference No:</Text>
                    <Text style={styles.paymentValue}>{payment.referenceNo}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Payments Yet</Text>
              <Text style={styles.emptyText}>Your payment history will appear here once you make payments.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
