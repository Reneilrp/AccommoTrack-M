import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  FlatList,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import TenantService from '../../../services/TenantService';
import PaymentService from '../../../services/PaymentService';
import { getStyles } from '../../../styles/Landlord/TenantLogs';

export default function TenantLogs({ route, navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { tenantId, tenantName: initialName } = route.params || {};

  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'paid', 'due'

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!tenantId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Get tenant details
      // We'll use TenantService.getTenantDetails if it exists, otherwise fallback
      // Since I don't see a specific getTenantDetails, let's use the list and filter if needed
      // but usually there's a show endpoint. Let's try to find it or use a generic one.
      
      // For this implementation, we'll assume the API matches web
      const [tenantRes, paymentsRes] = await Promise.all([
        TenantService.getTenantDetails(tenantId),
        PaymentService.getInvoicesByTenant(tenantId)
      ]);

      if (tenantRes.success) setTenant(tenantRes.data);
      if (paymentsRes.success) setPayments(paymentsRes.data || []);

    } catch (error) {
      console.error('Error fetching tenant logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPayments = useMemo(() => {
    if (activeFilter === 'all') return payments;
    return payments.filter(p => {
      const status = (p.status || p.payment_status || '').toLowerCase();
      if (activeFilter === 'paid') return status === 'paid';
      if (activeFilter === 'due') return status !== 'paid';
      return true;
    });
  }, [payments, activeFilter]);

  const dueAmount = useMemo(() => {
    const unpaid = payments.filter(p => {
      const status = (p.status || p.payment_status || '').toLowerCase();
      return status !== 'paid';
    });
    return unpaid.reduce((sum, p) => sum + parseFloat(p.amount || (p.amount_cents / 100) || 0), 0);
  }, [payments]);

  const getInitials = (name) => {
    if (!name) return 'TN';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getPaymentStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return { bg: '#DCFCE7', fg: '#166534' };
      case 'partial':
      case 'pending': return { bg: '#FEF3C7', fg: '#92400E' };
      case 'unpaid':
      case 'overdue': return { bg: '#FEE2E2', fg: '#991B1B' };
      default: return { bg: '#F3F4F6', fg: '#4B5563' };
    }
  };

  const renderPaymentItem = ({ item }) => {
    const status = item.status || item.payment_status || 'unpaid';
    const statusStyle = getPaymentStatusStyle(status);
    const amount = item.amount || (item.amount_cents ? item.amount_cents / 100 : 0);

    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentRef}>{item.reference || `INV-${item.id}`}</Text>
          <Text style={styles.paymentDate}>
            {item.paid_at ? `Paid: ${new Date(item.paid_at).toLocaleDateString()}` : 
             item.due_date ? `Due: ${new Date(item.due_date).toLocaleDateString()}` : 
             new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.paymentRight}>
          <Text style={styles.paymentAmount}>₱{parseFloat(amount).toLocaleString()}</Text>
          <View style={[styles.paymentStatusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.paymentStatusText, { color: statusStyle.fg }]}>{status}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Loading logs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = tenant ? `${tenant.first_name} ${tenant.last_name}` : initialName || 'Tenant';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tenant History</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#16a34a']} />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(fullName)}</Text>
          </View>
          <Text style={styles.tenantName}>{fullName}</Text>
          <Text style={styles.tenantEmail}>{tenant?.email || '—'}</Text>
          
          <View style={[styles.statusBadge, { backgroundColor: tenant?.tenantProfile?.status === 'active' ? '#DCFCE7' : '#F3F4F6' }]}>
            <Text style={[styles.statusText, { color: tenant?.tenantProfile?.status === 'active' ? '#166534' : '#6B7280' }]}>
              {tenant?.tenantProfile?.status || 'active'}
            </Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Room</Text>
              <Text style={styles.infoValue}>
                {tenant?.room ? `Room ${tenant.room.room_number}` : 'No Room'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Outstanding</Text>
              <Text style={[styles.infoValue, { color: dueAmount > 0 ? '#DC2626' : '#16a34a' }]}>
                ₱{dueAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Payments Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment History</Text>
        </View>

        <View style={styles.filterContainer}>
          {[
            { id: 'all', label: 'All' },
            { id: 'paid', label: 'Paid' },
            { id: 'due', label: 'Due' }
          ].map((tab) => (
            <TouchableOpacity 
              key={tab.id}
              style={[styles.filterTab, activeFilter === tab.id && styles.activeFilterTab]}
              onPress={() => setActiveFilter(tab.id)}
            >
              <Text style={[styles.filterTabText, activeFilter === tab.id && styles.activeFilterTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredPayments.length > 0 ? (
          filteredPayments.map((item, index) => (
            <React.Fragment key={item.id || index}>
              {renderPaymentItem({ item })}
            </React.Fragment>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No payment records</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
