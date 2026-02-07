import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import PropertyService, { getImageUrl } from '../../../services/PropertyServices';
import { styles } from '../../../styles/Landlord/RoomManagement.js';
import { useTheme } from '../../../contexts/ThemeContext';

const FILTERS = [
  { label: 'All Rooms', value: 'all' },
  { label: 'Occupied', value: 'occupied' },
  { label: 'Available', value: 'available' },
  { label: 'Maintenance', value: 'maintenance' }
];

const ROOM_TYPES = [
  { label: 'Single Room', value: 'single' },
  { label: 'Double Room', value: 'double' },
  { label: 'Quad Room', value: 'quad' },
  { label: 'Bed Spacer', value: 'bedSpacer' }
];

const PRICING_MODELS = [
  { label: 'Full Room', value: 'full_room' },
  { label: 'Per Bed', value: 'per_bed' }
];

const DEFAULT_STATS = { total: 0, occupied: 0, available: 0, maintenance: 0 };

const normalizeId = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

const buildFloors = () =>
  Array.from({ length: 10 }, (_, index) => {
    const num = index + 1;
    const suffix = num % 10 === 1 && num !== 11 ? 'st' : num % 10 === 2 && num !== 12 ? 'nd' : num % 10 === 3 && num !== 13 ? 'rd' : 'th';
    return { value: String(num), label: `${num}${suffix} Floor` };
  });

const FLOORS = buildFloors();

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => item?.trim?.() ?? item);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch (err) {
      // noop
    }
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === 'object') {
    return Object.values(value)
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }
  return [];
};

const normalizeRoomType = (value) => {
  if (!value) return 'single';
  const key = String(value).toLowerCase().replace(/\s+/g, '');
  const map = {
    single: 'single',
    singleroom: 'single',
    double: 'double',
    doubleroom: 'double',
    quad: 'quad',
    quadroom: 'quad',
    bedspacer: 'bedSpacer',
    bedspacers: 'bedSpacer'
  };
  return map[key] || value;
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '₱0';
  const number = Number(value) || 0;
  return `₱${number.toLocaleString('en-PH')}`;
};

const statusTokens = {
  available: { bg: '#DCFCE7', color: '#15803D', label: 'Available' },
  occupied: { bg: '#FEE2E2', color: '#B91C1C', label: 'Occupied' },
  maintenance: { bg: '#FEF3C7', color: '#B45309', label: 'Maintenance' }
};

const buildEmptyForm = () => ({
  id: null,
  roomNumber: '',
  roomType: 'single',
  floor: '1',
  monthlyRate: '',
  capacity: '1',
  pricingModel: 'full_room',
  description: '',
  status: 'available',
  amenities: [],
  occupied: 0
});

export default function RoomManagementScreen({ navigation, route }) {
  const { theme } = useTheme();
  const preselectedPropertyId = normalizeId(route?.params?.propertyId);
  const initialFilter = route?.params?.filter || 'all';
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(preselectedPropertyId || null);
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [filter, setFilter] = useState(initialFilter);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [roomForm, setRoomForm] = useState(buildEmptyForm());
  const [modalLoading, setModalLoading] = useState(false);
  const [newAmenity, setNewAmenity] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  const selectedProperty = useMemo(
    () => properties.find((property) => normalizeId(property.id) === normalizeId(selectedPropertyId)) || null,
    [properties, selectedPropertyId]
  );

  const propertyAmenities = useMemo(() => parseList(selectedProperty?.amenities_list || selectedProperty?.amenities), [selectedProperty]);

  const filteredRooms = useMemo(() => {
    if (filter === 'all') return rooms;
    return rooms.filter((room) => room.status === filter);
  }, [rooms, filter]);

  const loadProperties = useCallback(async () => {
    try {
      setLoadingProperties(true);
      setError('');
      const response = await PropertyService.getMyProperties();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load properties');
      }
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

  const loadRooms = useCallback(
    async (fromRefresh = false) => {
      if (!selectedPropertyId) return;
      try {
        fromRefresh ? setRefreshing(true) : setLoadingRooms(true);
        setError('');
        const [roomsRes, statsRes] = await Promise.all([
          PropertyService.getRooms(selectedPropertyId),
          PropertyService.getRoomStats(selectedPropertyId)
        ]);

        if (!roomsRes.success) {
          throw new Error(roomsRes.error || 'Failed to load rooms');
        }
        if (!statsRes.success) {
          throw new Error(statsRes.error || 'Failed to load room stats');
        }

        const resolvedRooms = Array.isArray(roomsRes.data)
          ? roomsRes.data
          : roomsRes.data?.rooms || roomsRes.data?.data || [];
        setRooms(resolvedRooms);
        const statsData = statsRes.data?.data || statsRes.data || {};
        setStats({
          total: Number(statsData.total ?? statsData.total_rooms ?? resolvedRooms.length ?? 0),
          occupied: Number(statsData.occupied ?? 0),
          available: Number(statsData.available ?? 0),
          maintenance: Number(statsData.maintenance ?? 0)
        });
      } catch (err) {
        setError(err.message || 'Unable to load rooms');
      } finally {
        fromRefresh ? setRefreshing(false) : setLoadingRooms(false);
      }
    },
    [selectedPropertyId]
  );

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    if (selectedPropertyId) {
      loadRooms();
    }
  }, [selectedPropertyId, loadRooms]);

  const handleRefresh = useCallback(() => {
    if (!selectedPropertyId) return;
    loadRooms(true);
  }, [loadRooms, selectedPropertyId]);

  const closeModal = () => {
    setModalVisible(false);
    setRoomForm(buildEmptyForm());
    setSelectedImages([]);
    setNewAmenity('');
    setModalLoading(false);
  };

  const openAddModal = () => {
    if (!selectedPropertyId) {
      Alert.alert('Property Required', 'Select a property before adding rooms.');
      return;
    }
    setModalMode('add');
    setRoomForm(buildEmptyForm());
    setSelectedImages([]);
    setModalVisible(true);
  };

  const parseFloorValue = (room) => {
    if (!room) return '1';
    if (room.floor) return String(room.floor);
    if (room.floor_label) {
      const match = room.floor_label.match(/\d+/);
      return match ? match[0] : '1';
    }
    return '1';
  };

  const openEditModal = (room) => {
    setModalMode('edit');
    setRoomForm({
      id: room.id,
      roomNumber: room.room_number || room.name || '',
      roomType: normalizeRoomType(room.room_type || room.type_label),
      floor: parseFloorValue(room),
      monthlyRate: room.monthly_rate ? String(room.monthly_rate) : '',
      capacity: room.capacity ? String(room.capacity) : '1',
      pricingModel: room.pricing_model || 'full_room',
      description: room.description || '',
      status: room.status || 'available',
      amenities: parseList(room.amenities),
      occupied: room.occupied || 0
    });
    setSelectedImages([]);
    setModalVisible(true);
  };

  const handleFormChange = (field, value) => {
    setRoomForm((prev) => {
      let next = { ...prev, [field]: value };
      if (field === 'roomType') {
        // Auto-set capacity based on room type (except bedSpacer which is manual)
        if (value !== 'bedSpacer') {
          const capacityMap = { single: '1', double: '2', quad: '4' };
          next.capacity = capacityMap[value] || prev.capacity;
        }
        // For bedSpacer, always use per_bed pricing model
        if (value === 'bedSpacer') {
          next.pricingModel = 'per_bed';
        }
        // For single rooms, always use full_room pricing
        if (value === 'single') {
          next.pricingModel = 'full_room';
        }
      }
      return next;
    });
  };

  const toggleAmenity = (amenity) => {
    setRoomForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((item) => item !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleAddAmenity = async () => {
    const value = newAmenity.trim();
    if (!value || !selectedPropertyId) return;
    try {
      const response = await PropertyService.addPropertyAmenity(selectedPropertyId, value);
      if (!response.success) {
        throw new Error(response.error || 'Unable to add amenity');
      }
      setProperties((prev) =>
        prev.map((property) =>
          property.id === selectedPropertyId
            ? {
                ...property,
                amenities_list: [...parseList(property.amenities_list || property.amenities), value]
              }
            : property
        )
      );
      setRoomForm((prev) => ({ ...prev, amenities: [...prev.amenities, value] }));
      setNewAmenity('');
    } catch (err) {
      Alert.alert('Amenity', err.message || 'Failed to add amenity');
    }
  };

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo library access to upload room images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8
    });

    if (!result.canceled) {
      const mapped = (result.assets || []).map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `room-${Date.now()}-${index}.jpg`,
        type: asset.mimeType || 'image/jpeg'
      }));
      setSelectedImages((prev) => [...prev, ...mapped]);
    }
  };

  const removeSelectedImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const validateForm = () => {
    if (!roomForm.roomNumber.trim()) {
      Alert.alert('Validation', 'Room number is required.');
      return false;
    }
    if (!roomForm.monthlyRate || Number(roomForm.monthlyRate) <= 0) {
      Alert.alert('Validation', 'Enter a valid monthly rate.');
      return false;
    }
    if (!selectedPropertyId) {
      Alert.alert('Validation', 'Select a property before saving.');
      return false;
    }
    return true;
  };

  const buildCreatePayload = () => {
    const payload = new FormData();
    payload.append('property_id', selectedPropertyId);
    payload.append('room_number', roomForm.roomNumber.trim());
    payload.append('room_type', roomForm.roomType);
    payload.append('floor', parseInt(roomForm.floor, 10) || 1);
    payload.append('monthly_rate', parseFloat(roomForm.monthlyRate));
    payload.append('capacity', parseInt(roomForm.capacity, 10) || 1);
    payload.append('pricing_model', roomForm.pricingModel);
    payload.append('description', roomForm.description || '');
    payload.append('status', roomForm.status || 'available');
    roomForm.amenities.forEach((amenity, index) => {
      payload.append(`amenities[${index}]`, amenity);
    });
    selectedImages.forEach((image, index) => {
      payload.append(`images[${index}]`, image);
    });
    return payload;
  };

  const buildUpdatePayload = () => ({
    room_number: roomForm.roomNumber.trim(),
    room_type: roomForm.roomType,
    floor: parseInt(roomForm.floor, 10) || 1,
    monthly_rate: parseFloat(roomForm.monthlyRate),
    capacity: parseInt(roomForm.capacity, 10) || 1,
    pricing_model: roomForm.pricingModel,
    status: roomForm.status,
    description: roomForm.description || '',
    amenities: roomForm.amenities
  });

  const handleSubmitRoom = async () => {
    if (!validateForm()) return;
    try {
      setModalLoading(true);
      const response =
        modalMode === 'add'
          ? await PropertyService.createRoom(buildCreatePayload())
          : await PropertyService.updateRoom(roomForm.id, buildUpdatePayload());

      if (!response.success) {
        throw new Error(response.error || 'Unable to save room');
      }
      closeModal();
      loadRooms();
    } catch (err) {
      Alert.alert('Room Management', err.message || 'Unable to save room');
    } finally {
      setModalLoading(false);
    }
  };

  const confirmDeleteRoom = () => {
    Alert.alert('Delete Room', 'This room will be permanently removed. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setModalLoading(true);
            const response = await PropertyService.deleteRoom(roomForm.id);
            if (!response.success) {
              throw new Error(response.error || 'Unable to delete room');
            }
            closeModal();
            loadRooms();
          } catch (err) {
            Alert.alert('Delete Room', err.message || 'Unable to delete room');
          } finally {
            setModalLoading(false);
          }
        }
      }
    ]);
  };

  const openStatusModal = (room) => {
    setStatusTarget(room);
    setStatusModalVisible(true);
  };

  const handleStatusChange = async (status) => {
    if (!statusTarget) return;
    try {
      setStatusModalVisible(false);
      const response = await PropertyService.updateRoomStatus(statusTarget.id, status);
      if (!response.success) {
        throw new Error(response.error || 'Unable to update status');
      }
      loadRooms();
    } catch (err) {
      Alert.alert('Status Update', err.message || 'Unable to update status');
    }
  };

  const renderRoomCard = ({ item }) => {
    const badge = statusTokens[item.status] || statusTokens.available;
    const imageSource = (() => {
      if (item.images && item.images.length > 0) {
        const first = item.images[0];
        if (typeof first === 'string') return { uri: getImageUrl(first) };
        if (first && (first.image_url || first.url || first.path)) {
          return { uri: getImageUrl(first.image_url || first.url || first.path) };
        }
      }
      return null;
    })();
    const amenities = parseList(item.amenities);
    const occupantCount = item.occupied ?? item.current_occupancy ?? 0;
    const capacity = item.capacity ?? item.max_occupants ?? 0;
    const openSlots = item.available_slots ?? Math.max((capacity || 0) - occupantCount, 0);
    return (
      <View style={styles.roomCard}>
        {imageSource ? (
          <Image source={imageSource} style={styles.roomImage} />
        ) : (
          <View style={[styles.roomImage, { alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="bed-outline" size={36} color="#94A3B8" />
          </View>
        )}
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
        </View>
        <View style={styles.roomContent}>
          <View style={styles.roomTopRow}>
            <View>
              <Text style={styles.roomTitle}>Room {item.room_number}</Text>
              <Text style={styles.roomMeta}>
                {item.type_label || item.room_type} • {item.floor_label || `Floor ${item.floor || '-'}`}
              </Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.price}>{formatCurrency(item.monthly_rate)}</Text>
              <Text style={styles.priceCaption}>per month</Text>
            </View>
          </View>
          <View style={styles.capacityRow}>
            <Ionicons name="people" size={16} color="#6B7280" />
            <Text style={styles.capacityText}>
              {occupantCount}/{capacity || '—'} occupants
              {openSlots > 0 ? ` • ${openSlots} slot${openSlots === 1 ? '' : 's'} open` : ''}
            </Text>
          </View>
          {item.tenant ? (
            <View style={styles.tenantCard}>
              <Text style={styles.tenantLabel}>Current Tenant(s)</Text>
              <Text style={styles.tenantText} numberOfLines={2}>
                {item.tenant}
              </Text>
            </View>
          ) : (
            <View style={styles.tenantCard}>
              <Text style={styles.tenantLabel}>Current Tenant(s)</Text>
              <Text style={styles.tenantText} numberOfLines={1}>
                None assigned
              </Text>
            </View>
          )}
          {amenities.length > 0 && (
            <View style={styles.amenitiesRow}>
              {amenities.slice(0, 3).map((amenity, index) => (
                <View key={`${amenity}-${index}`} style={styles.amenityChip}>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
              {amenities.length > 3 && (
                <Text style={{ fontSize: 12, color: '#6B7280', alignSelf: 'center' }}>+{amenities.length - 3}</Text>
              )}
            </View>
          )}
          <View style={styles.roomActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
              <Ionicons name="create-outline" size={18} color="#0369A1" />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.statusButton]} onPress={() => openStatusModal(item)}>
              <Ionicons name="swap-horizontal" size={18} color="#B45309" />
              <Text style={[styles.actionText, styles.statusButtonText]}>Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      {!preselectedPropertyId && (
        <View style={styles.propertySelector}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.propertyScroll}
          >
            {properties.map((property) => (
              <TouchableOpacity
                key={property.id}
                activeOpacity={0.9}
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
                <Text style={[styles.propertyChipMeta, { marginTop: 8 }]}>Rooms: {property.total_rooms ?? '—'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Rooms</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Occupied</Text>
          <Text style={styles.statValue}>{stats.occupied}</Text>
        </View>
      </View>
      <View style={[styles.statsRow, { marginTop: 8 }] }>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Available</Text>
          <Text style={styles.statValue}>{stats.available}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Maintenance</Text>
          <Text style={styles.statValue}>{stats.maintenance}</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTERS.map((chip) => (
          <TouchableOpacity
            key={chip.value}
            style={[styles.filterChip, filter === chip.value && styles.filterChipActive]}
            onPress={() => setFilter(chip.value)}
          >
            <Text style={[styles.filterText, filter === chip.value && { color: '#0F172A' }]}>{chip.label}</Text>
            {chip.value === 'all' ? (
              <Text style={styles.filterBadge}>{stats.total}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  if (loadingProperties && properties.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading properties...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const noProperties = !loadingProperties && properties.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Room Management</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('MyProperties')}>
          <Ionicons name="home-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {noProperties ? (
        <View style={styles.emptyState}>
          <Ionicons name="bed-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No properties yet</Text>
          <Text style={styles.emptySubtitle}>Add a property first to start creating rooms.</Text>
          <TouchableOpacity style={[styles.addButton, { marginTop: 24 }]} onPress={() => navigation.navigate('AddProperty')}>
            <Ionicons name="add" size={18} color={theme.colors.primary} />
            <Text style={styles.addButtonText}>Add Property</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
          renderItem={renderRoomCard}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            loadingRooms ? (
              <View style={{ paddingTop: 60, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading rooms...</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="bed-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No rooms yet</Text>
                <Text style={styles.emptySubtitle}>Add rooms to this property to view them here.</Text>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectedProperty && !noProperties && (
        <TouchableOpacity style={styles.fab} onPress={openAddModal}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.fabText}>Add Room</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={closeModal}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{modalMode === 'add' ? 'Add Room' : `Edit Room ${roomForm.roomNumber}`}</Text>
            <View style={{ width: 42 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { marginTop: 0 }]}>Basic Details</Text>
            <Text style={styles.label}>Room Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 301"
              value={roomForm.roomNumber}
              onChangeText={(text) => handleFormChange('roomNumber', text)}
            />
            <Text style={styles.label}>Room Type</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={roomForm.roomType}
                onValueChange={(value) => handleFormChange('roomType', value)}
              >
                {ROOM_TYPES.filter((type) =>
                  selectedProperty?.property_type?.toLowerCase() === 'apartment' ? type.value !== 'bedSpacer' : true
                ).map((type) => (
                  <Picker.Item key={type.value} label={type.label} value={type.value} />
                ))}
              </Picker>
            </View>
            <Text style={styles.label}>Monthly Rate (₱)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={roomForm.monthlyRate}
              onChangeText={(text) => handleFormChange('monthlyRate', text.replace(/[^0-9.]/g, ''))}
            />
            <Text style={styles.label}>Floor</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={roomForm.floor} onValueChange={(value) => handleFormChange('floor', value)}>
                {FLOORS.map((floor) => (
                  <Picker.Item key={floor.value} label={floor.label} value={floor.value} />
                ))}
              </Picker>
            </View>
            <Text style={styles.label}>Capacity</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={roomForm.capacity}
              onChangeText={(text) => handleFormChange('capacity', text.replace(/[^0-9]/g, ''))}
            />
            <Text style={styles.sectionTitle}>Pricing Model</Text>
            {roomForm.roomType === 'bedSpacer' ? (
              <View style={styles.pricingInfoBox}>
                <Text style={styles.pricingInfoText}>
                  Bed Spacer rooms use per-bed pricing only. Each tenant pays ₱{roomForm.monthlyRate || '0'} for their individual bed.
                </Text>
              </View>
            ) : roomForm.roomType === 'single' ? (
              <View style={styles.pricingInfoBox}>
                <Text style={styles.pricingInfoText}>
                  Single rooms use full room pricing. The tenant pays ₱{roomForm.monthlyRate || '0'}/month.
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.pricingCard, roomForm.pricingModel === 'full_room' && styles.pricingCardActive]}
                  onPress={() => handleFormChange('pricingModel', 'full_room')}
                >
                  <Text style={styles.pricingCardTitle}>Full Room Price</Text>
                  <Text style={styles.pricingCardDesc}>
                    {parseInt(roomForm.capacity) > 1
                      ? `Tenants divide ₱${roomForm.monthlyRate || '0'} equally (₱${roomForm.monthlyRate && roomForm.capacity ? Math.round(parseFloat(roomForm.monthlyRate) / parseInt(roomForm.capacity)).toLocaleString() : '0'}/person)`
                      : 'Single tenant pays full price'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pricingCard, roomForm.pricingModel === 'per_bed' && styles.pricingCardActive]}
                  onPress={() => handleFormChange('pricingModel', 'per_bed')}
                >
                  <Text style={styles.pricingCardTitle}>Per Bed/Tenant Price</Text>
                  <Text style={styles.pricingCardDesc}>
                    Each tenant pays ₱{roomForm.monthlyRate || '0'} for their bed (independent billing)
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              value={roomForm.description}
              onChangeText={(text) => handleFormChange('description', text)}
            />
            <Text style={styles.sectionTitle}>Amenities</Text>
            {propertyAmenities.length > 0 ? (
              <View style={styles.pillList}>
                {propertyAmenities.map((amenity) => (
                  <TouchableOpacity
                    key={amenity}
                    style={[styles.pill, roomForm.amenities.includes(amenity) && styles.pillActive]}
                    onPress={() => toggleAmenity(amenity)}
                  >
                    <Text style={styles.pillText}>{amenity}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.helperText}>No amenities saved for this property yet.</Text>
            )}
            <TextInput
              style={styles.input}
              placeholder="Add new amenity"
              value={newAmenity}
              onChangeText={setNewAmenity}
              onSubmitEditing={handleAddAmenity}
            />
            <TouchableOpacity style={styles.pill} onPress={handleAddAmenity}>
              <Text style={[styles.pillText, { color: theme.colors.primary }]}>Save Amenity</Text>
            </TouchableOpacity>
            {modalMode === 'add' && (
              <>
                <Text style={styles.sectionTitle}>Photos</Text>
                <View style={styles.imageGrid}>
                  {selectedImages.map((image, index) => (
                    <View key={`${image.uri}-${index}`} style={styles.imagePreview}>
                      <Image source={{ uri: image.uri }} style={{ width: '100%', height: '100%' }} />
                      <TouchableOpacity style={styles.imageRemove} onPress={() => removeSelectedImage(index)}>
                        <Ionicons name="trash" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={[styles.imagePreview, styles.addImageTile]} onPress={handlePickImages}>
                    <Ionicons name="add" size={28} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </>
            )}
            {modalMode === 'edit' && (
              <>
                <Text style={styles.sectionTitle}>Status</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={roomForm.status} onValueChange={(value) => handleFormChange('status', value)}>
                    <Picker.Item label="Available" value="available" />
                    <Picker.Item label="Occupied" value="occupied" />
                    <Picker.Item label="Maintenance" value="maintenance" />
                  </Picker>
                </View>
              </>
            )}
          </ScrollView>
          <View style={styles.modalActions}>
            {modalMode === 'edit' ? (
              <TouchableOpacity
                style={[styles.dangerButton, { flex: 1 }]}
                onPress={confirmDeleteRoom}
                disabled={roomForm.occupied > 0 || modalLoading}
              >
                {modalLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Delete</Text>}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={closeModal} disabled={modalLoading}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={handleSubmitRoom} disabled={modalLoading}>
              {modalLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{modalMode === 'add' ? 'Add Room' : 'Save Changes'}</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={statusModalVisible} transparent animationType="slide" onRequestClose={() => setStatusModalVisible(false)}>
        <View style={styles.statusModalOverlay}>
          <View style={styles.statusSheet}>
            {['available', 'occupied', 'maintenance'].map((status, index, arr) => (
              <TouchableOpacity
                key={status}
                style={[styles.statusOption, index === arr.length - 1 && styles.statusOptionLast]}
                onPress={() => handleStatusChange(status)}
              >
                <Text style={styles.statusOptionText}>{statusTokens[status].label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.statusOption, styles.statusOptionLast]} onPress={() => setStatusModalVisible(false)}>
              <Text style={[styles.statusOptionText, { color: '#6B7280' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

