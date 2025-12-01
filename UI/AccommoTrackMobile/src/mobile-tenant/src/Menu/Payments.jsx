import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { styles } from '../../../styles/Menu/Payments.js';
import PaymentService from '../../../services/PaymentService.js';

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
    { id: 1, name: "GCash", icon: "phone-portrait", color: "#007AFF", enabled: false },
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

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      // Fetch payments and stats in parallel
      const [paymentsResult, statsResult] = await Promise.all([
        PaymentService.getMyPayments(),
        PaymentService.getPaymentStats()
      ]);

      if (paymentsResult.success && paymentsResult.data) {
        setPayments(paymentsResult.data);
      } else {
        console.error('Failed to fetch payments:', paymentsResult.error);
        setPayments([]);
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      } else {
        console.error('Failed to fetch payment stats:', statsResult.error);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments</Text>
        <View style={{ width: 24 }} />
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

        {/* Payment History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>Loading payments...</Text>
            </View>
          ) : payments.length > 0 ? (
            payments.map((payment) => (
              <TouchableOpacity key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentIcon}>
                    <Ionicons name="receipt-outline" size={24} color="#10b981" />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.propertyName}>{payment.propertyName}</Text>
                    <Text style={styles.paymentDate}>{payment.date}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(payment.paymentStatus || payment.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(payment.paymentStatus || payment.status) }]}>
                      {payment.paymentStatus || payment.status}
                    </Text>
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
                  {payment.dueDate && (
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentLabel}>Due Date:</Text>
                      <Text style={styles.paymentValue}>{payment.dueDate}</Text>
                    </View>
                  )}
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

