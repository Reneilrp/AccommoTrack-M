import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Modal,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import PaymentService from '../../../services/PaymentService';
import BookingService from '../../../services/BookingServices'; // We might need to update booking status too
import { getStyles } from '../../../styles/Landlord/Payments';

const STATUS_FILTERS = ['all', 'pending', 'paid', 'unpaid', 'partial', 'cancelled', 'refunded'];

export default function Payments({ navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchInvoices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (invoices.length === 0) setLoading(true);

    try {
      const res = await PaymentService.getInvoices();
      if (res.success) {
        // Ensure we have an array
        let data = res.data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          data = data.invoices || data.data || [];
        }
        setInvoices(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch invoices:', res.error);
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error in fetchInvoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [invoices.length]);

  useFocusEffect(
    useCallback(() => {
      fetchInvoices();
    }, [fetchInvoices])
  );

  const handleUpdatePayment = async (status) => {
    if (!selectedInvoice?.booking_id) return;

    setUpdating(true);
    try {
      // In mobile project, BookingService updateBookingPayment might be the standard way
      // But let's use PaymentService logic if we want to be consistent with web
      // Since mobile already has PropertyService.updateBookingPayment, let's check that
      
      // For now, let's use a standard alert confirmation
      const res = await PaymentService.updateBookingPayment(selectedInvoice.booking_id, { payment_status: status });
      
      if (res.success) {
        setShowModal(false);
        fetchInvoices(true);
        Alert.alert('Success', 'Payment status updated');
      } else {
        Alert.alert('Error', res.error || 'Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setUpdating(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    return invoices.filter(inv => {
      const status = (inv.status || inv.booking?.payment_status || inv.payment_status || 'unpaid').toLowerCase();
      const matchesFilter = activeFilter === 'all' || status === activeFilter;
      
      if (!matchesFilter) return false;
      
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const ref = (inv.reference || inv.id || '').toString().toLowerCase();
      const tenant = ((inv.tenant?.full_name || `${inv.tenant?.first_name || ''} ${inv.tenant?.last_name || ''}`) || '').toLowerCase();
      const property = (inv.property?.title || inv.property_title || inv.booking?.property?.title || '').toLowerCase();
      
      return ref.includes(q) || tenant.includes(q) || property.includes(q);
    });
  }, [invoices, activeFilter, searchQuery]);

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return { bg: '#DCFCE7', fg: '#166534' };
      case 'pending':
      case 'partial': return { bg: '#FEF3C7', fg: '#92400E' };
      case 'unpaid':
      case 'cancelled': return { bg: '#FEE2E2', fg: '#991B1B' };
      case 'refunded': return { bg: '#F3E8FF', fg: '#7E22CE' };
      default: return { bg: '#F3F4F6', fg: '#4B5563' };
    }
  };

  const renderInvoiceItem = ({ item }) => {
    const status = item.status || item.booking?.payment_status || item.payment_status || 'unpaid';
    const statusStyle = getStatusStyle(status);
    const amount = item.amount || (item.amount_cents ? item.amount_cents / 100 : 0);
    const tenantName = item.tenant?.full_name || (item.tenant ? `${item.tenant.first_name} ${item.tenant.last_name}` : '—');
    const propertyTitle = item.property?.title || item.property_title || item.booking?.property?.title || '—';
    const roomNumber = item.booking?.room?.room_number || '—';
    
    return (
      <View style={styles.invoiceCard}>
        <View style={styles.invoiceHeader}>
          <Text style={styles.invoiceId}>{item.reference || `INV-${item.id}`}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.fg }]}>{status}</Text>
          </View>
        </View>

        <View style={styles.invoiceBody}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText} numberOfLines={1}>{tenantName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText} numberOfLines={1}>
              {propertyTitle} {roomNumber !== '—' ? `• Room ${roomNumber}` : ''}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              {item.issued_at ? new Date(item.issued_at).toLocaleDateString() : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.invoiceFooter}>
          <View>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>₱{parseFloat(amount).toLocaleString()}</Text>
          </View>
          {item.booking_id && (
            <TouchableOpacity 
              style={styles.viewButton}
              onPress={() => { setSelectedInvoice(item); setShowModal(true); }}
            >
              <Text style={styles.viewButtonText}>Manage</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Loading payments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments & Invoices</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by invoice, tenant, property..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.activeFilterChip]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchInvoices(true)}
            colors={['#16a34a']}
            tintColor="#16a34a"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No invoices found</Text>
            <Text style={styles.emptySubtitle}>Payments will appear here once bookings are confirmed.</Text>
          </View>
        }
      />

      {/* Manage Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Payment</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Tenant</Text>
                  <Text style={styles.summaryValue}>
                    {selectedInvoice?.tenant?.full_name || (selectedInvoice?.tenant ? `${selectedInvoice.tenant.first_name} ${selectedInvoice.tenant.last_name}` : '—')}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Property / Room</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {selectedInvoice?.property?.title || selectedInvoice?.property_title || '—'} 
                    {selectedInvoice?.booking?.room?.room_number ? ` (Room ${selectedInvoice.booking.room.room_number})` : ''}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Amount</Text>
                  <Text style={[styles.summaryValue, { color: '#16a34a' }]}>
                    ₱{parseFloat(selectedInvoice?.amount || (selectedInvoice?.amount_cents / 100) || 0).toLocaleString()}
                  </Text>
                </View>
              </View>

              <Text style={styles.updateLabel}>Update Payment Status</Text>
              <View style={styles.statusGrid}>
                {[
                  { id: 'unpaid', label: 'Unpaid', color: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
                  { id: 'partial', label: 'Partial', color: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
                  { id: 'paid', label: 'Paid', color: '#DCFCE7', text: '#166534', border: '#86EFAC' },
                  { id: 'refunded', label: 'Refunded', color: '#F3E8FF', text: '#7E22CE', border: '#D8B4FE' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.statusOption, { backgroundColor: s.color, borderColor: s.border }]}
                    onPress={() => handleUpdatePayment(s.id)}
                    disabled={updating}
                  >
                    {updating && selectedInvoice?.status === s.id ? (
                      <ActivityIndicator size="small" color={s.text} />
                    ) : (
                      <Text style={[styles.statusOptionText, { color: s.text }]}>{s.label}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ marginTop: 24 }}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
