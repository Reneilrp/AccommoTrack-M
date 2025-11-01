import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Menu/Payments.js';

export default function Payments() {
  const navigation = useNavigation();

  // Sample payment history
  const payments = [
    {
      id: 1,
      propertyName: "Sunshine Dormitory",
      amount: 5000,
      date: "Jan 15, 2024",
      status: "Completed",
      method: "GCash",
      referenceNo: "REF123456789"
    },
    {
      id: 2,
      propertyName: "Sunshine Dormitory",
      amount: 5000,
      date: "Dec 15, 2023",
      status: "Completed",
      method: "Bank Transfer",
      referenceNo: "REF987654321"
    },
    {
      id: 3,
      propertyName: "Ocean View Residence",
      amount: 6500,
      date: "Feb 1, 2024",
      status: "Pending",
      method: "PayMaya",
      referenceNo: "REF555666777"
    }
  ];

  // Payment methods
  const paymentMethods = [
    { id: 1, name: "GCash", icon: "phone-portrait", color: "#007AFF" },
    { id: 2, name: "PayMaya", icon: "card", color: "#00D632" },
    { id: 3, name: "Bank Transfer", icon: "business", color: "#EF4444" },
    { id: 4, name: "Cash", icon: "cash", color: "#10B981" }
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return '#10B981';
      case 'Pending': return '#F59E0B';
      case 'Failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Paid This Month</Text>
          <Text style={styles.balanceAmount}>₱11,500</Text>
          <View style={styles.balanceDetails}>
            <View style={styles.balanceItem}>
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
              <Text style={styles.balanceItemText}>Due: Feb 28</Text>
            </View>
            <View style={styles.balanceItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.balanceItemText}>2 Paid</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <View style={styles.methodsGrid}>
            {paymentMethods.map((method) => (
              <TouchableOpacity key={method.id} style={styles.methodCard}>
                <View style={[styles.methodIcon, { backgroundColor: `${method.color}20` }]}>
                  <Ionicons name={method.icon} size={24} color={method.color} />
                </View>
                <Text style={styles.methodName}>{method.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {payments.map((payment) => (
            <TouchableOpacity key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <View style={styles.paymentIcon}>
                  <Ionicons name="receipt-outline" size={24} color="#00A651" />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.propertyName}>{payment.propertyName}</Text>
                  <Text style={styles.paymentDate}>{payment.date}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(payment.status)}20` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
                    {payment.status}
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
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

