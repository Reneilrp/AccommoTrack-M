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
  overdue: { bg: '#FEE2E2', color: '#B91C1C', label: 'Overdue' },
  refunded: { bg: '#EDE9FE', color: '#6D28D9', label: 'Refunded' }
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
    const total = tenants.length;
    const active = tenants.filter((tenant) => tenant.tenantProfile?.status === 'active').length;
    const inactive = tenants.filter((tenant) => tenant.tenantProfile?.status === 'inactive').length;
    const unpaid = tenants.filter((tenant) => tenant.latestBooking?.payment_status !== 'paid').length;
    return { total, active, inactive, unpaid };
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const matchesSearch = !query
        || tenant.full_name?.toLowerCase().includes(query)
        || tenant.email?.toLowerCase().includes(query)
        || tenant.room?.room_number?.toString().includes(query);

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
      setError('');
      const response = await PropertyService.getMyProperties();
      if (!response.success) throw new Error(response.error || 'Failed to load properties');
      const data = Array.isArray(response.data) ? response.data : [];
      setProperties(data);
      setSelectedPropertyId((prevSelected) => {
        if (preselectedPropertyId) return normalizeId(preselectedPropertyId);
        if (!prevSelected && data.length > 0) return normalizeId(data[0].id);
        const stillExists = data.some((property) => normalizeId(property.id) === normalizeId(prevSelected));
        if (stillExists) return normalizeId(prevSelected);
        return data.length > 0 ? normalizeId(data[0].id) : null;
      });
    } catch (err) {
      setError(err.message || 'Unable to load properties');
    } finally {
      setLoadingProperties(false);
    }
  }, [preselectedPropertyId]);

  const loadTenants = useCallback(
    async (fromRefresh = false) => {
      if (!selectedPropertyId) return;
      try {
        fromRefresh ? setRefreshing(true) : setLoadingTenants(true);
        setError('');
        const response = await PropertyService.getTenants({ property_id: selectedPropertyId });
        if (!response.success) throw new Error(response.error || 'Failed to load tenants');
        const payload = Array.isArray(response.data) ? response.data : response.data?.data || [];
        setTenants(payload);
      } catch (err) {
        setError(err.message || 'Unable to load tenants');
        setTenants([]);
      } finally {
        fromRefresh ? setRefreshing(false) : setLoadingTenants(false);
      }
    },
    [selectedPropertyId]
  );

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    if (selectedPropertyId) {
      loadTenants();
    }
  }, [selectedPropertyId, loadTenants]);

  const handleRefresh = () => {
    if (!selectedPropertyId) return;
    loadTenants(true);
  };

  const openDetailModal = (tenant) => {
    setDetailTenant(tenant);
    setDetailVisible(true);
  };

  const closeDetailModal = () => {
    setDetailTenant(null);
    setDetailVisible(false);
  };

  const noProperties = !loadingProperties && properties.length === 0;

  const renderTenantCard = ({ item }) => {
    const payment = PAYMENT_BADGES[item.latestBooking?.payment_status] || PAYMENT_BADGES.unpaid;
    const initials = (item.full_name || '')
      .split(' ')
      .filter(Boolean)
      .map((name) => name[0])
      .join('')
      .slice(0, 2);

    return (
      <View style={styles.tenantCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials || 'TN'}</Text>
        </View>
        <View style={styles.tenantContent}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.tenantName}>{item.full_name || `${item.first_name} ${item.last_name}`}</Text>
              <Text style={styles.tenantEmail}>{item.email}</Text>
            </View>
          </View>
          <View style={styles.roomRow}>
            <Ionicons name="bed-outline" size={16} color="#94A3B8" />
            <Text style={styles.roomText}>
              {item.room ? `Room ${item.room.room_number} • ${item.room.type_label || item.room.room_type}` : 'Not assigned'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Monthly Rent</Text>
              <Text style={styles.metaValue}>{item.room ? formatCurrency(item.room.monthly_rate) : '—'}</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>
                {item.tenantProfile?.status ? item.tenantProfile.status.replace('-', ' ') : 'pending'}
              </Text>
            </View>
            <View style={[styles.paymentBadge, { backgroundColor: payment.bg }] }>
              <Text style={[styles.paymentText, { color: payment.color }]}>{payment.label}</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() =>
                navigation.navigate('Messages', {
                  startConversation: true,
                  tenant: item,
                  propertyId: selectedPropertyId
                })
              }
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#0369A1" />
              <Text style={styles.secondaryBtnText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => openDetailModal(item)}>
              <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const listHeader = (
    <View>
      <View style={styles.propertySelector}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.propertyScroll}
        >
          {properties.map((property) => (
            <TouchableOpacity
              key={property.id}
              style={[
                styles.propertyChip,
                normalizeId(property.id) === normalizeId(selectedPropertyId) && styles.propertyChipActive
              ]}
              onPress={() => setSelectedPropertyId(normalizeId(property.id))}
            >
              <Text style={styles.propertyChipTitle}>{property.title || property.name || 'Untitled Property'}</Text>
              <Text style={styles.propertyChipMeta}>
                {[property.city, property.province].filter(Boolean).join(', ') || 'No address'}
              </Text>
              <Text style={styles.propertyChipMeta}>{property.total_rooms ?? 0} Rooms</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Tenants</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active</Text>
          <Text style={styles.statValue}>{stats.active}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Inactive</Text>
          <Text style={styles.statValue}>{stats.inactive}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Unpaid</Text>
          <Text style={styles.statValue}>{stats.unpaid}</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or room"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((chip) => (
          <TouchableOpacity
            key={chip.value}
            style={[styles.filterChip, filter === chip.value && styles.filterChipActive]}
            onPress={() => setFilter(chip.value)}
          >
            <Text style={[styles.filterText, filter === chip.value && styles.filterTextActive]}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loadingProperties && properties.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.centerText}>Loading properties...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tenant Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {noProperties ? (
        <View style={styles.emptyState}>
          <Ionicons name="home-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No properties yet</Text>
          <Text style={styles.emptySubtitle}>Add a property first to manage tenants.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('AddProperty')}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Add Property</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTenants}
          keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
          renderItem={renderTenantCard}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4CAF50" colors={['#4CAF50']} />}
          ListEmptyComponent={
            loadingTenants ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.centerText}>Loading tenants...</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={44} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No tenants found</Text>
                <Text style={styles.emptySubtitle}>Invite tenants or assign rooms to see them here.</Text>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={detailVisible} animationType="slide" onRequestClose={closeDetailModal}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeDetailModal} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tenant Details</Text>
            <View style={{ width: 40 }} />
          </View>
          {detailTenant ? (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.detailHero}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>
                    {(detailTenant.full_name || '').split(' ').map((n) => n[0]).join('').slice(0, 2) || 'TN'}
                  </Text>
                </View>
                <Text style={styles.detailName}>{detailTenant.full_name}</Text>
                <Text style={styles.detailEmail}>{detailTenant.email}</Text>
                <View style={styles.detailTags}>
                  <View style={styles.detailTag}>
                    <Ionicons name="call-outline" size={14} color="#16A34A" />
                    <Text style={styles.detailTagText}>{detailTenant.phone || 'No phone'}</Text>
                  </View>
                  <View style={styles.detailTag}>
                    <Ionicons name="person-outline" size={14} color="#16A34A" />
                    <Text style={styles.detailTagText}>{detailTenant.tenantProfile?.status || 'inactive'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Room Assignment</Text>
                {detailTenant.room ? (
                  <View style={styles.assignmentCard}>
                    <Text style={styles.assignmentTitle}>Room {detailTenant.room.room_number}</Text>
                    <Text style={styles.assignmentMeta}>{detailTenant.room.type_label || detailTenant.room.room_type}</Text>
                    <Text style={styles.assignmentMeta}>{formatCurrency(detailTenant.room.monthly_rate)} / month</Text>
                  </View>
                ) : (
                  <View style={[styles.assignmentCard, styles.assignmentEmpty]}>
                    <Ionicons name="bed-outline" size={24} color="#94A3B8" />
                    <Text style={styles.assignmentEmptyText}>No room assigned.</Text>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Emergency Contact</Text>
                {detailTenant.tenantProfile?.emergency_contact_name ? (
                  <View style={styles.detailList}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{detailTenant.tenantProfile.emergency_contact_name}</Text>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{detailTenant.tenantProfile.emergency_contact_phone}</Text>
                    <Text style={styles.detailLabel}>Relationship</Text>
                    <Text style={styles.detailValue}>{detailTenant.tenantProfile.emergency_contact_relationship}</Text>
                  </View>
                ) : (
                  <Text style={styles.helperText}>No emergency contact added.</Text>
                )}
              </View>

              {detailTenant.tenantProfile?.current_address ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Current Address</Text>
                  <Text style={styles.detailValue}>{detailTenant.tenantProfile.current_address}</Text>
                </View>
              ) : null}

              {detailTenant.tenantProfile?.preference ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <Text style={styles.detailValue}>{detailTenant.tenantProfile.preference}</Text>
                </View>
              ) : null}
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

