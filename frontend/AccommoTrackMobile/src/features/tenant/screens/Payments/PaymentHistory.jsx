import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getStyles } from '../../../../styles/Menu/Payments.js';
import PaymentService from '../../../../services/PaymentService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import {
  tenantQueryKeys,
  useTenantFocusRefetch,
  useTenantRefreshHandler,
} from '../../hooks/useTenantQueryHelpers.js';

export default function PaymentHistory() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);

  const paymentHistoryQuery = useQuery({
    queryKey: tenantQueryKeys.paymentHistory(),
    queryFn: async () => {
      try {
        const paymentsResult = await PaymentService.getPayments();
        if (paymentsResult?.success && paymentsResult?.data) {
          return Array.isArray(paymentsResult.data) ? paymentsResult.data : [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching payments:', error);
        return [];
      }
    },
    placeholderData: (previousData) => previousData,
  });

  const payments = paymentHistoryQuery.data || [];
  const loading = paymentHistoryQuery.isLoading;
  const refetchPaymentHistory = paymentHistoryQuery.refetch;
  const paymentHistoryRefetchers = React.useMemo(
    () => [refetchPaymentHistory],
    [refetchPaymentHistory],
  );

  useTenantFocusRefetch({ refetchers: paymentHistoryRefetchers });

  const onRefresh = useTenantRefreshHandler({
    setRefreshing,
    refetchers: paymentHistoryRefetchers,
  });

  const formatCurrency = (amount) => {
    const value = Number(amount) || 0;
    return `₱${new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
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
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading payments...</Text>
            </View>
          ) : payments.length > 0 ? (
            payments.map((payment) => (
              <TouchableOpacity key={payment.id} style={styles.paymentCard} onPress={() => navigation.navigate('PaymentDetail', { invoiceId: payment.id })}>
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentIcon}>
                    <Ionicons name="receipt-outline" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.propertyName}>{payment.propertyName} {payment.roomNumber !== 'N/A' ? `• Room ${payment.roomNumber}` : ''}</Text>
                    <Text style={styles.paymentDate}>{payment.date}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `#00000020` }]}>
                    <Text style={[styles.statusText, { color: '#000' }]}>{payment.paymentStatus || payment.status}</Text>
                  </View>
                </View>

                <View style={styles.paymentDetails}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Amount:</Text>
                    <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
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
