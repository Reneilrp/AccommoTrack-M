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
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import TenantService from '../../../../services/TenantService.js';
import PaymentService from '../../../../services/PaymentService.js';
import { getStyles } from '../../../../styles/Landlord/TenantLogs.js';

export default function TenantLogs({ route, navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { tenantId, tenantName: initialName } = route.params || {};

  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Payments'); // 'Payments', 'Bookings', 'Maintenance', 'Add-ons', 'Transfers'
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'paid', 'due'

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!tenantId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [tenantRes, paymentsRes] = await Promise.all([
        TenantService.getTenantDetails(tenantId),
        PaymentService.getInvoicesByTenant(tenantId)
      ]);

      if (tenantRes.success) {
        setTenant(tenantRes.data);
      }
      if (paymentsRes.success) {
        setPayments(paymentsRes.data || []);
      }

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
    if (paymentFilter === 'all') return payments;
    return payments.filter(p => {
      const status = (p.status || p.payment_status || '').toLowerCase();
      if (paymentFilter === 'paid') return status === 'paid';
      if (paymentFilter === 'due') return status !== 'paid';
      return true;
    });
  }, [payments, paymentFilter]);

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

  const renderBookingItem = ({ item }) => {
    const statusStyle = {
      confirmed: { bg: '#DCFCE7', fg: '#166534' },
      active: { bg: '#DBEAFE', fg: '#1E40AF' },
      completed: { bg: '#F3F4F6', fg: '#4B5563' },
      cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
    }[item.status] || { bg: '#F3F4F6', fg: '#4B5563' };

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.room?.property?.title || 'Property'}</Text>
          <View style={[styles.cardBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.cardBadgeText, { color: statusStyle.fg }]}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Room</Text>
            <Text style={styles.cardValue}>{item.room?.room_number || 'N/A'}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Period</Text>
            <Text style={styles.cardValue}>
              {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>Booked on {new Date(item.created_at).toLocaleDateString()}</Text>
          <Text style={styles.cardValue}>₱{parseFloat(item.total_amount || 0).toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  const renderMaintenanceItem = ({ item }) => {
    const statusStyle = {
      pending: { bg: '#FEF3C7', fg: '#92400E' },
      in_progress: { bg: '#DBEAFE', fg: '#1E40AF' },
      resolved: { bg: '#DCFCE7', fg: '#166534' },
      cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
    }[item.status] || { bg: '#F3F4F6', fg: '#4B5563' };

    const priorityStyle = {
      high: { bg: '#FEE2E2', fg: '#991B1B' },
      medium: { bg: '#FEF3C7', fg: '#92400E' },
      low: { bg: '#DCFCE7', fg: '#166534' },
    }[item.priority] || { bg: '#F3F4F6', fg: '#4B5563' };

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.cardBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.cardBadgeText, { color: statusStyle.fg }]}>{item.status?.replace('_', ' ')}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardValue, { fontWeight: '400', marginBottom: 8 }]} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Priority</Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
              <Text style={[styles.priorityText, { color: priorityStyle.fg }]}>{item.priority}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>Reported on {new Date(item.created_at).toLocaleDateString()}</Text>
          {item.resolved_at && (
            <Text style={[styles.cardDate, { color: '#059669' }]}>
              Resolved {new Date(item.resolved_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderAddonItem = ({ item }) => {
    const statusStyle = {
      pending: { bg: '#FEF3C7', fg: '#92400E' },
      approved: { bg: '#DCFCE7', fg: '#166534' },
      active: { bg: '#DBEAFE', fg: '#1E40AF' },
      rejected: { bg: '#FEE2E2', fg: '#991B1B' },
      cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
    }[item.status] || { bg: '#F3F4F6', fg: '#4B5563' };

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.addon_name}</Text>
          <View style={[styles.cardBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.cardBadgeText, { color: statusStyle.fg }]}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Price</Text>
            <Text style={styles.cardValue}>₱{item.price.toLocaleString()} ({item.price_type})</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Booking</Text>
            <Text style={styles.cardValue}>{item.booking_reference}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>Requested on {new Date(item.created_at).toLocaleDateString()}</Text>
          {item.quantity > 1 && (
            <Text style={styles.cardValue}>Qty: {item.quantity}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderTransferItem = ({ item }) => {
    const statusStyle = {
      pending: { bg: '#FEF3C7', fg: '#92400E' },
      approved: { bg: '#DCFCE7', fg: '#166534' },
      completed: { bg: '#DCFCE7', fg: '#166534' },
      rejected: { bg: '#FEE2E2', fg: '#991B1B' },
      cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
    }[item.status] || { bg: '#F3F4F6', fg: '#4B5563' };

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Room Transfer</Text>
          <View style={[styles.cardBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.cardBadgeText, { color: statusStyle.fg }]}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>From</Text>
            <Text style={styles.cardValue}>Room {item.current_room?.room_number || 'N/A'}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>To</Text>
            <Text style={styles.cardValue}>Room {item.requested_room?.room_number || 'N/A'}</Text>
          </View>
          {item.reason && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Reason</Text>
              <Text style={styles.cardValue} numberOfLines={2}>{item.reason}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>Requested on {new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Payments':
        return (
          <>
            <View style={styles.filterContainer}>
              {[
                { id: 'all', label: 'All' },
                { id: 'paid', label: 'Paid' },
                { id: 'due', label: 'Due' }
              ].map((tab) => (
                <TouchableOpacity 
                  key={tab.id}
                  style={[styles.filterTab, paymentFilter === tab.id && styles.activeFilterTab]}
                  onPress={() => setPaymentFilter(tab.id)}
                >
                  <Text style={[styles.filterTabText, paymentFilter === tab.id && styles.activeFilterTabText]}>
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
          </>
        );

      case 'Bookings':
        const bookings = tenant?.history?.bookings || [];
        return bookings.length > 0 ? (
          bookings.map((item, index) => (
            <React.Fragment key={item.id || index}>
              {renderBookingItem({ item })}
            </React.Fragment>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No booking history</Text>
          </View>
        );

      case 'Maintenance':
        const maintenance = tenant?.history?.maintenance || [];
        return maintenance.length > 0 ? (
          maintenance.map((item, index) => (
            <React.Fragment key={item.id || index}>
              {renderMaintenanceItem({ item })}
            </React.Fragment>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No maintenance requests</Text>
          </View>
        );

      case 'Add-ons':
        const addons = tenant?.history?.addons || [];
        return addons.length > 0 ? (
          addons.map((item, index) => (
            <React.Fragment key={item.id || index}>
              {renderAddonItem({ item })}
            </React.Fragment>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="add-circle-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No addon requests</Text>
          </View>
        );

      case 'Transfers':
        const transfers = tenant?.history?.transfers || [];
        return transfers.length > 0 ? (
          transfers.map((item, index) => (
            <React.Fragment key={item.id || index}>
              {renderTransferItem({ item })}
            </React.Fragment>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="swap-horizontal-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No transfer history</Text>
          </View>
        );

      default:
        return null;
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading logs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = tenant ? `${tenant.first_name} ${tenant.last_name}` : initialName || 'Tenant';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />
      
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
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#059669']} />
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
              <Text style={[styles.infoValue, { color: dueAmount > 0 ? '#DC2626' : '#059669' }]}>
                ₱{dueAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Multi-Tab Section */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['Payments', 'Bookings', 'Maintenance', 'Add-ons', 'Transfers'].map((tab) => (
              <TouchableOpacity 
                key={tab}
                style={[styles.filterTab, { minWidth: 100 }, activeTab === tab && styles.activeFilterTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.filterTabText, activeTab === tab && styles.activeFilterTabText]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}
