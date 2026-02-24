import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PropertyService from '../../../services/PropertyServices.js';
import { styles } from '../../../styles/Landlord/Tenants.js';
import { useTheme } from '../../../contexts/ThemeContext';

const FILTERS = [
  { label: 'All Tenants', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'No Room', value: 'no-room' },
  { label: 'Unpaid', value: 'unpaid' }
];

const PAYMENT_BADGES = {
  paid: { bg: '#DCFCE7', color: '#15803D', label: 'Paid' },
  partial: { bg: '#FEF3C7', color: '#B45309', label: 'Partial' },
  unpaid: { bg: '#FEE2E2', color: '#B91C1C', label: 'Unpaid' },
  overdue: { bg: '#FEE2E2', color: '#B91C1C', label: 'Overdue' }
};

const normalizeId = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '₱0';
  return `₱${Number(value).toLocaleString('en-PH')}`;
};

export default function TenantsScreen({ navigation, route }) {
  const { theme } = useTheme();
  const preselectedPropertyId = normalizeId(route?.params?.propertyId);

  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(preselectedPropertyId || null);
  const [tenants, setTenants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [detailTenant, setDetailTenant] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const selectedProperty = useMemo(
    () => properties.find((property) => normalizeId(property.id) === normalizeId(selectedPropertyId)) || null,
    [properties, selectedPropertyId]
  );

  const stats = useMemo(() => {
    return {
      total: tenants.length,
      active: tenants.filter(t => t.tenantProfile?.status === 'active').length,
      paid: tenants.filter(t => t.latestBooking?.payment_status === 'paid').length,
      pending: tenants.filter(t => t.latestBooking?.payment_status === 'unpaid' || !t.latestBooking).length,
      overdue: tenants.filter(t => t.latestBooking?.payment_status === 'overdue').length
    };
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const fullName = (tenant.full_name || `${tenant.first_name} ${tenant.last_name}`).toLowerCase();
      const matchesSearch = !query
        || fullName.includes(query)
        || (tenant.email || '').toLowerCase().includes(query)
        || (tenant.room?.room_number || '').toString().includes(query);

      if (!matchesSearch) return false;

      if (filter === 'all') return true;
      if (filter === 'active') return tenant.tenantProfile?.status === 'active';
      if (filter === 'inactive') return tenant.tenantProfile?.status === 'inactive';
      if (filter === 'no-room') return !tenant.room;
      if (filter === 'unpaid') return tenant.latestBooking?.payment_status !== 'paid';
      return true;
    });
  }, [tenants, searchQuery, filter]);

  const loadProperties = useCallback(async () => {
    try {
      setLoadingProperties(true);
      const response = await PropertyService.getMyProperties();
      if (response.success) {
        const data = response.data || [];
        setProperties(data);
        if (!selectedPropertyId && data.length > 0) {
          setSelectedPropertyId(normalizeId(data[0].id));
        }
      }
    } finally {
      setLoadingProperties(false);
    }
  }, [selectedPropertyId]);

  const loadTenants = useCallback(async (fromRefresh = false) => {
    if (!selectedPropertyId) return;
    try {
      fromRefresh ? setRefreshing(true) : setLoadingTenants(true);
      const response = await PropertyService.getTenants({ property_id: selectedPropertyId });
      if (response.success) {
        setTenants(Array.isArray(response.data) ? response.data : response.data?.data || []);
      }
    } finally {
      setLoadingTenants(false);
      setRefreshing(false);
    }
  }, [selectedPropertyId]);

  useEffect(() => { loadProperties(); }, [loadProperties]);
  useEffect(() => { if (selectedPropertyId) loadTenants(); }, [selectedPropertyId, loadTenants]);

  const renderTenantCard = ({ item }) => {
    const paymentStatus = item.latestBooking?.payment_status || 'unpaid';
    const payment = PAYMENT_BADGES[paymentStatus] || PAYMENT_BADGES.unpaid;
    const initials = (item.first_name?.[0] || '') + (item.last_name?.[0] || '');

    return (
      <View style={styles.tenantCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials || 'TN'}</Text>
        </View>
        <View style={styles.tenantContent}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.tenantName}>{item.first_name} {item.last_name}</Text>
              <Text style={styles.tenantEmail}>{item.email}</Text>
            </View>
          </View>
          <View style={styles.roomRow}>
            <Ionicons name="bed-outline" size={16} color="#16A34A" />
            <Text style={styles.roomText}>
              {item.room ? `Room ${item.room.room_number}` : 'No room assigned'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Monthly Rent</Text>
              <Text style={styles.metaValue}>{item.room ? formatCurrency(item.room.monthly_rate) : '—'}</Text>
            </View>
            <View style={[styles.paymentBadge, { backgroundColor: payment.bg }]}>
              <Text style={[styles.paymentText, { color: payment.color }]}>{payment.label}</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setDetailTenant(item); setDetailVisible(true); }}>
              <Ionicons name="eye-outline" size={16} color="#475569" />
              <Text style={styles.secondaryBtnText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={() => navigation.navigate('Messages', { startConversation: true, tenant: item, propertyId: selectedPropertyId })}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tenant Management</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => loadTenants(true)}>
          <Ionicons name="refresh" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTenants}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTenantCard}
        ListHeaderComponent={(
          <View>
            <View style={styles.propertySelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyScroll}>
                {properties.map(p => (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[styles.propertyChip, normalizeId(p.id) === selectedPropertyId && styles.propertyChipActive]}
                    onPress={() => setSelectedPropertyId(normalizeId(p.id))}
                  >
                    <Text style={styles.propertyChipTitle}>{p.title}</Text>
                    <Text style={styles.propertyChipMeta}>{p.city}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}><Text style={styles.statLabel}>Total</Text><Text style={styles.statValue}>{stats.total}</Text></View>
              <View style={styles.statCard}><Text style={[styles.statLabel, {color: '#16A34A'}]}>Active</Text><Text style={[styles.statValue, {color: '#16A34A'}]}>{stats.active}</Text></View>
              <View style={styles.statCard}><Text style={[styles.statLabel, {color: '#2563EB'}]}>Paid</Text><Text style={[styles.statValue, {color: '#2563EB'}]}>{stats.paid}</Text></View>
              <View style={styles.statCard}><Text style={[styles.statLabel, {color: '#D97706'}]}>Pending</Text><Text style={[styles.statValue, {color: '#D97706'}]}>{stats.pending}</Text></View>
              <View style={styles.statCard}><Text style={[styles.statLabel, {color: '#DC2626'}]}>Overdue</Text><Text style={[styles.statValue, {color: '#DC2626'}]}>{stats.overdue}</Text></View>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#94A3B8" />
              <TextInput style={styles.searchInput} placeholder="Search by name, room or email..." value={searchQuery} onChangeText={setSearchQuery} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FILTERS.map(f => (
                <TouchableOpacity key={f.value} style={[styles.filterChip, filter === f.value && styles.filterChipActive]} onPress={() => setFilter(f.value)}>
                  <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTenants(true)} tintColor="#16a34a" />}
        ListEmptyComponent={loadingTenants ? <ActivityIndicator style={{marginTop: 40}} color="#16a34a" /> : <View style={styles.emptyState}><Text style={styles.emptyTitle}>No tenants found</Text></View>}
      />

      <Modal visible={detailVisible} animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.backButton}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tenant Profile</Text>
            <View style={{width: 48}} />
          </View>
          {detailTenant && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.detailHero}>
                <View style={styles.avatarLarge}><Text style={styles.avatarLargeText}>{detailTenant.first_name?.[0]}{detailTenant.last_name?.[0]}</Text></View>
                <Text style={styles.detailName}>{detailTenant.first_name} {detailTenant.last_name}</Text>
                <Text style={styles.detailEmail}>{detailTenant.email}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Room Assignment</Text>
                {detailTenant.room ? (
                  <View style={styles.assignmentCard}>
                    <Text style={styles.assignmentTitle}>Room {detailTenant.room.room_number}</Text>
                    <Text style={styles.assignmentMeta}>{detailTenant.room.type_label}</Text>
                    <Text style={[styles.assignmentMeta, {color: '#16A34A', fontWeight: '700'}]}>{formatCurrency(detailTenant.room.monthly_rate)} / month</Text>
                  </View>
                ) : <Text style={styles.helperText}>No room assigned</Text>}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Emergency Contact</Text>
                {detailTenant.tenantProfile?.emergency_contact_name ? (
                  <View style={styles.detailList}>
                    <Text style={styles.detailLabel}>Name</Text><Text style={styles.detailValue}>{detailTenant.tenantProfile.emergency_contact_name}</Text>
                    <Text style={styles.detailLabel}>Phone</Text><Text style={styles.detailValue}>{detailTenant.tenantProfile.emergency_contact_phone}</Text>
                  </View>
                ) : <Text style={styles.helperText}>Not provided</Text>}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
