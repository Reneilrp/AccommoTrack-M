import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import PropertyService from '../../../../services/PropertyService.js';
import { getStyles } from '../../../../styles/Landlord/Tenants.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';

const FILTERS = [
  { label: 'All Tenants', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Paid', value: 'paid' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Overdue', value: 'overdue' }
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
  const styles = React.useMemo(() => getStyles(theme), [theme]);
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

  const [selectedTenants, setSelectedTenants] = useState([]);

  const [transferVisible, setTransferVisible] = useState(false);
  const [transferringTenant, setTransferringTenant] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRoomsForTransfer, setLoadingRoomsForTransfer] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferData, setTransferData] = useState({
    new_room_id: '',
    reason: '',
    damage_charge: '',
    damage_description: ''
  });

  const [evictionVisible, setEvictionVisible] = useState(false);
  const [evictingTenant, setEvictingTenant] = useState(null);
  const [evictionReason, setEvictionReason] = useState('');
  const [isEvicting, setIsEvicting] = useState(false);

  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

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
      if (filter === 'paid') return tenant.latestBooking?.payment_status === 'paid';
      if (filter === 'unpaid') return tenant.latestBooking?.payment_status === 'unpaid';
      if (filter === 'overdue') return tenant.latestBooking?.payment_status === 'overdue';
      return true;
    });
  }, [tenants, searchQuery, filter]);

  useEffect(() => {
    setSelectedTenants([]);
  }, [searchQuery, filter, selectedPropertyId]);

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

  const handleSelectTenant = (tenantId) => {
    setSelectedTenants((current) => (
      current.includes(tenantId)
        ? current.filter((id) => id !== tenantId)
        : [...current, tenantId]
    ));
  };

  const handleSelectAll = () => {
    if (selectedTenants.length === filteredTenants.length) {
      setSelectedTenants([]);
      return;
    }
    setSelectedTenants(filteredTenants.map((tenant) => tenant.id));
  };

  const handleTransferInitiate = async (tenant) => {
    const propertyId = tenant.room?.property_id || selectedPropertyId;
    if (!propertyId) {
      Alert.alert('Transfer unavailable', 'Tenant has no assigned property.');
      return;
    }

    setTransferringTenant(tenant);
    setTransferData({ new_room_id: '', reason: '', damage_charge: '', damage_description: '' });
    setAvailableRooms([]);
    setTransferVisible(true);
    setLoadingRoomsForTransfer(true);

    try {
      const response = await PropertyService.getRoomsByProperty(propertyId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load rooms');
      }

      const currentRoomId = normalizeId(tenant.room?.id);
      const rooms = (response.data || []).filter((room) => (
        room.status === 'available' && normalizeId(room.id) !== currentRoomId
      ));
      setAvailableRooms(rooms);
    } catch (transferError) {
      Alert.alert('Error', transferError.message || 'Failed to load available rooms.');
    } finally {
      setLoadingRoomsForTransfer(false);
    }
  };

  const handleTransferSubmit = async () => {
    if (!transferringTenant) return;
    if (!transferData.new_room_id || !transferData.reason.trim()) {
      Alert.alert('Required fields', 'Please select a room and provide a reason.');
      return;
    }
    if (Number(transferData.damage_charge || 0) > 0 && !transferData.damage_description.trim()) {
      Alert.alert('Required fields', 'Please add a damage charge description.');
      return;
    }

    setIsTransferring(true);
    try {
      const payload = {
        new_room_id: transferData.new_room_id,
        reason: transferData.reason.trim(),
        damage_charge: transferData.damage_charge ? Number(transferData.damage_charge) : undefined,
        damage_description: transferData.damage_description.trim() || undefined
      };
      const response = await PropertyService.transferTenantRoom(transferringTenant.id, payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to transfer room.');
      }
      setTransferVisible(false);
      setTransferringTenant(null);
      await loadTenants(true);
      Alert.alert('Success', 'Room transfer completed successfully.');
    } catch (transferError) {
      Alert.alert('Error', transferError.message || 'Failed to transfer room.');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleEvictionInitiate = (tenant) => {
    setEvictingTenant(tenant);
    setEvictionReason('');
    setEvictionVisible(true);
  };

  const handleEvictConfirm = async () => {
    if (!evictingTenant) return;
    if (!evictionReason.trim()) {
      Alert.alert('Required', 'Reason for eviction is required.');
      return;
    }

    setIsEvicting(true);
    try {
      const response = await PropertyService.evictTenant(evictingTenant.id, evictionReason.trim());
      if (!response.success) {
        throw new Error(response.error || 'Failed to evict tenant.');
      }
      setEvictionVisible(false);
      setEvictingTenant(null);
      await loadTenants(true);
      Alert.alert('Success', 'Tenant has been evicted.');
    } catch (evictionError) {
      Alert.alert('Error', evictionError.message || 'Failed to evict tenant.');
    } finally {
      setIsEvicting(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      Alert.alert('Required', 'Message cannot be empty.');
      return;
    }
    if (selectedTenants.length === 0) {
      Alert.alert('No selection', 'Please select at least one tenant.');
      return;
    }

    setIsBroadcasting(true);
    try {
      const response = await PropertyService.broadcastToTenants(selectedTenants, broadcastMessage.trim());
      if (!response.success) {
        throw new Error(response.error || 'Failed to send broadcast.');
      }
      setBroadcastVisible(false);
      setBroadcastMessage('');
      Alert.alert('Success', `Message sent to ${selectedTenants.length} tenant(s).`);
    } catch (broadcastError) {
      Alert.alert('Error', broadcastError.message || 'Failed to send broadcast.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const renderTenantCard = ({ item }) => {
    const paymentStatus = item.latestBooking?.payment_status || 'unpaid';
    const payment = PAYMENT_BADGES[paymentStatus] || PAYMENT_BADGES.unpaid;
    const initials = (item.first_name?.[0] || '') + (item.last_name?.[0] || '');

    return (
      <View style={styles.tenantCard}>
        <TouchableOpacity style={styles.selectCheckbox} onPress={() => handleSelectTenant(item.id)}>
          <Ionicons
            name={selectedTenants.includes(item.id) ? 'checkbox' : 'square-outline'}
            size={20}
            color={selectedTenants.includes(item.id) ? '#16A34A' : '#94A3B8'}
          />
        </TouchableOpacity>
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
            <TouchableOpacity style={styles.warningBtn} onPress={() => handleTransferInitiate(item)}>
              <Ionicons name="swap-horizontal-outline" size={16} color="#FFFFFF" />
              <Text style={styles.warningBtnText}>Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerBtn} onPress={() => handleEvictionInitiate(item)}>
              <Ionicons name="person-remove-outline" size={16} color="#FFFFFF" />
              <Text style={styles.dangerBtnText}>Evict</Text>
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

            {selectedTenants.length > 0 && (
              <View style={styles.bulkActionsBar}>
                <View style={styles.bulkSelectionRow}>
                  <TouchableOpacity style={styles.selectAllButton} onPress={handleSelectAll}>
                    <Ionicons
                      name={selectedTenants.length === filteredTenants.length ? 'checkbox' : 'square-outline'}
                      size={18}
                      color="#16A34A"
                    />
                    <Text style={styles.selectAllText}>Select All</Text>
                  </TouchableOpacity>
                  <Text style={styles.bulkCountText}>{selectedTenants.length} selected</Text>
                </View>
                <View style={styles.bulkButtonsRow}>
                  <TouchableOpacity style={styles.bulkPrimaryBtn} onPress={() => setBroadcastVisible(true)}>
                    <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.bulkPrimaryBtnText}>Broadcast</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTenants(true)} tintColor="#16a34a" />}
        ListEmptyComponent={loadingTenants ? <ActivityIndicator style={styles.loadingIndicator} color="#16a34a" /> : <View style={styles.emptyState}><Text style={styles.emptyTitle}>No tenants found</Text></View>}
      />

      <Modal visible={detailVisible} animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.backButton}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tenant Profile</Text>
            <View style={styles.modalHeaderView} />
          </View>
          {detailTenant && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.detailHero}>
                <View style={styles.avatarLarge}><Text style={styles.avatarLargeText}>{detailTenant.first_name?.[0]}{detailTenant.last_name?.[0]}</Text></View>
                <Text style={styles.detailName}>{detailTenant.first_name} {detailTenant.last_name}</Text>
                <Text style={styles.detailEmail}>{detailTenant.email}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <View style={styles.detailList}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{detailTenant.phone || '—'}</Text>
                  <Text style={styles.detailLabel}>Date of Birth</Text>
                  <Text style={styles.detailValue}>
                    {detailTenant.date_of_birth 
                      ? new Date(detailTenant.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      : '—'}
                  </Text>
                  <Text style={styles.detailLabel}>Gender</Text>
                  <Text style={[styles.detailValue, { textTransform: 'capitalize' }]}>{detailTenant.gender || '—'}</Text>
                </View>
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

              <TouchableOpacity
                style={styles.profileScroll}
                onPress={() => { setDetailVisible(false); navigation.navigate('TenantLogs', { tenantId: detailTenant.id, tenantName: `${detailTenant.first_name} ${detailTenant.last_name}` }); }}
              >
                <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
                <Text style={styles.profileBtn}>View Payment Logs</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <Modal visible={transferVisible} transparent animationType="fade" onRequestClose={() => setTransferVisible(false)}>
        <View style={styles.overlayContainer}>
          <View style={styles.actionModalCard}>
            <Text style={styles.actionModalTitle}>Transfer Room</Text>
            <Text style={styles.actionModalSubtitle}>
              {transferringTenant
                ? `Transfer ${transferringTenant.first_name} ${transferringTenant.last_name} from Room ${transferringTenant.room?.room_number || 'N/A'}.`
                : 'Select a tenant to transfer.'}
            </Text>

            <Text style={styles.actionFieldLabel}>New Room *</Text>
            <ScrollView style={styles.roomsPicker}>
              {loadingRoomsForTransfer && <ActivityIndicator color="#f59e0b" style={styles.modalLoader} />}
              {!loadingRoomsForTransfer && availableRooms.length === 0 && (
                <Text style={styles.helperText}>No available rooms found.</Text>
              )}
              {availableRooms.map((room) => (
                <TouchableOpacity
                  key={room.id}
                  style={[
                    styles.roomOption,
                    normalizeId(transferData.new_room_id) === normalizeId(room.id) && styles.roomOptionActive
                  ]}
                  onPress={() => setTransferData((current) => ({ ...current, new_room_id: room.id }))}
                >
                  <Text style={styles.roomOptionTitle}>Room {room.room_number}</Text>
                  <Text style={styles.roomOptionMeta}>{room.type_label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.actionFieldLabel}>Reason *</Text>
            <TextInput
              value={transferData.reason}
              onChangeText={(value) => setTransferData((current) => ({ ...current, reason: value }))}
              placeholder="Reason for transfer"
              style={styles.actionTextArea}
              multiline
            />

            <Text style={styles.actionFieldLabel}>Damage Charge (optional)</Text>
            <TextInput
              value={transferData.damage_charge}
              onChangeText={(value) => setTransferData((current) => ({ ...current, damage_charge: value }))}
              placeholder="0.00"
              style={styles.actionInput}
              keyboardType="numeric"
            />

            {Number(transferData.damage_charge || 0) > 0 && (
              <>
                <Text style={styles.actionFieldLabel}>Damage Description *</Text>
                <TextInput
                  value={transferData.damage_description}
                  onChangeText={(value) => setTransferData((current) => ({ ...current, damage_description: value }))}
                  placeholder="Describe the charge"
                  style={styles.actionInput}
                />
              </>
            )}

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setTransferVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, (isTransferring || availableRooms.length === 0) && styles.modalDisabledBtn]}
                onPress={handleTransferSubmit}
                disabled={isTransferring || availableRooms.length === 0}
              >
                <Text style={styles.modalConfirmText}>{isTransferring ? 'Transferring...' : 'Transfer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={evictionVisible} transparent animationType="fade" onRequestClose={() => setEvictionVisible(false)}>
        <View style={styles.overlayContainer}>
          <View style={styles.actionModalCard}>
            <Text style={[styles.actionModalTitle, { color: '#DC2626' }]}>Confirm Eviction</Text>
            <Text style={styles.actionModalSubtitle}>
              {evictingTenant
                ? `You are about to evict ${evictingTenant.first_name} ${evictingTenant.last_name}.`
                : 'Select a tenant to evict.'}
            </Text>

            <Text style={styles.actionFieldLabel}>Reason *</Text>
            <TextInput
              value={evictionReason}
              onChangeText={setEvictionReason}
              placeholder="Reason for eviction"
              style={styles.actionTextArea}
              multiline
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEvictionVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDangerBtn, (isEvicting || !evictionReason.trim()) && styles.modalDisabledBtn]}
                onPress={handleEvictConfirm}
                disabled={isEvicting || !evictionReason.trim()}
              >
                <Text style={styles.modalConfirmText}>{isEvicting ? 'Evicting...' : 'Evict'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={broadcastVisible} transparent animationType="fade" onRequestClose={() => setBroadcastVisible(false)}>
        <View style={styles.overlayContainer}>
          <View style={styles.actionModalCard}>
            <Text style={styles.actionModalTitle}>Send Broadcast</Text>
            <Text style={styles.actionModalSubtitle}>
              This message will be sent to {selectedTenants.length} selected tenant(s).
            </Text>

            <TextInput
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
              placeholder="Type your message here..."
              style={styles.actionTextAreaLarge}
              multiline
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setBroadcastVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSuccessBtn, (isBroadcasting || !broadcastMessage.trim()) && styles.modalDisabledBtn]}
                onPress={handleSendBroadcast}
                disabled={isBroadcasting || !broadcastMessage.trim()}
              >
                <Text style={styles.modalConfirmText}>{isBroadcasting ? 'Sending...' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
