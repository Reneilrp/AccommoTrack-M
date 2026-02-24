import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
  View,
  Dimensions
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

const DEFAULT_STATS = { total: 0, occupied: 0, available: 0, maintenance: 0 };

const normalizeId = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

const getOrdinalSuffix = (num) => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
};

const buildFloors = () =>
  Array.from({ length: 15 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}${getOrdinalSuffix(i + 1)} Floor`
  }));

const FLOORS = buildFloors();

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => item?.trim?.() ?? item);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (err) {}
    return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
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
  const [modalLoading, setModalLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  
  // Web-exact state
  const [formData, setFormData] = useState({
    id: null,
    roomNumber: '',
    roomType: 'single',
    floor: '1',
    monthlyRate: '',
    dailyRate: '',
    billingPolicy: 'monthly',
    minStayDays: '1',
    capacity: '1',
    pricingModel: 'full_room',
    description: '',
    status: 'available',
    amenities: [],
    rules: []
  });

  const [newAmenity, setNewAmenity] = useState('');
  const [newRule, setNewRule] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  const selectedProperty = useMemo(
    () => properties.find((p) => normalizeId(p.id) === normalizeId(selectedPropertyId)) || null,
    [properties, selectedPropertyId]
  );

  const propertyType = selectedProperty?.property_type || '';
  const normalizedType = propertyType.toLowerCase();
  const isApartment = normalizedType.includes('apartment');
  const isDormitory = normalizedType.includes('dormitory');
  const isBoarding = normalizedType.includes('boarding');
  const isBedSpacerProperty = normalizedType.includes('bedspacer') || normalizedType.includes('bed spacer');

  const allRoomTypes = [
    { value: 'single', label: 'Single Room' },
    { value: 'double', label: 'Double Room' },
    { value: 'quad', label: 'Quad Room' },
    { value: 'bedSpacer', label: 'Bed Spacer' }
  ];

  const roomTypes = useMemo(() => {
    if (isApartment) return allRoomTypes.filter(rt => rt.value !== 'bedSpacer');
    if (isBedSpacerProperty) return allRoomTypes.filter(rt => rt.value === 'bedSpacer');
    if (isDormitory || isBoarding) return allRoomTypes.filter(rt => rt.value === 'single' || rt.value === 'bedSpacer');
    return allRoomTypes.filter(rt => rt.value !== 'bedSpacer');
  }, [isApartment, isBedSpacerProperty, isDormitory, isBoarding]);

  const propertyAmenities = useMemo(() => parseList(selectedProperty?.amenities_list || selectedProperty?.amenities), [selectedProperty]);
  const propertyRules = useMemo(() => parseList(selectedProperty?.property_rules || selectedProperty?.rules), [selectedProperty]);

  const filteredRooms = useMemo(() => {
    if (filter === 'all') return rooms;
    return rooms.filter((room) => room.status === filter);
  }, [rooms, filter]);

  const loadProperties = useCallback(async () => {
    try {
      setLoadingProperties(true);
      const res = await PropertyService.getMyProperties();
      if (res.success) {
        const data = res.data || [];
        setProperties(data);
        if (!selectedPropertyId && data.length > 0) {
          setSelectedPropertyId(normalizeId(data[0].id));
        }
      }
    } catch (err) {
      setError('Failed to load properties');
    } finally {
      setLoadingProperties(false);
    }
  }, [selectedPropertyId]);

  const loadRooms = useCallback(async (fromRefresh = false) => {
    if (!selectedPropertyId) return;
    try {
      fromRefresh ? setRefreshing(true) : setLoadingRooms(true);
      const [roomsRes, statsRes] = await Promise.all([
        PropertyService.getRooms(selectedPropertyId),
        PropertyService.getRoomStats(selectedPropertyId)
      ]);

      if (roomsRes.success) setRooms(roomsRes.data || []);
      if (statsRes.success) {
        const s = statsRes.data?.data || statsRes.data || {};
        setStats({
          total: Number(s.total ?? 0),
          occupied: Number(s.occupied ?? 0),
          available: Number(s.available ?? 0),
          maintenance: Number(s.maintenance ?? 0)
        });
      }
    } catch (err) {
      setError('Failed to load room data');
    } finally {
      fromRefresh ? setRefreshing(false) : setLoadingRooms(false);
    }
  }, [selectedPropertyId]);

  useEffect(() => { loadProperties(); }, [loadProperties]);
  useEffect(() => { if (selectedPropertyId) loadRooms(); }, [selectedPropertyId, loadRooms]);

  const handleRoomsRefresh = () => loadRooms(true);

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      let updated = { ...prev, [field]: value };
      
      if (field === 'roomType') {
        const capacityMap = { 'single': '1', 'double': '2', 'quad': '4' };
        if (capacityMap[value]) updated.capacity = capacityMap[value];
        if (value === 'bedSpacer') updated.pricingModel = 'per_bed';
        else if (value === 'single') updated.pricingModel = 'full_room';
      }

      if (field === 'billingPolicy') {
        if (value !== 'monthly' && value !== 'monthly_with_daily') updated.monthlyRate = '';
        if (value !== 'daily' && value !== 'monthly_with_daily') updated.dailyRate = '';
      }
      
      return updated;
    });
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (data) => {
    const errors = {};
    if (!data.roomNumber || !String(data.roomNumber).trim()) errors.roomNumber = 'Room number is required';

    const bp = data.billingPolicy || 'monthly';
    if (bp === 'monthly' || bp === 'monthly_with_daily') {
      const m = parseFloat(data.monthlyRate);
      if (!m || m <= 0) errors.monthlyRate = 'Enter a valid monthly rate';
    }
    if (bp === 'daily' || bp === 'monthly_with_daily') {
      const d = parseFloat(data.dailyRate);
      if (!d || d <= 0) errors.dailyRate = 'Enter a valid daily rate';
    }

    const cap = parseInt(data.capacity, 10);
    if (!cap || cap < 1) errors.capacity = 'Capacity must be 1 or more';
    else if (cap > 10) errors.capacity = 'Max capacity is 10';

    const ms = parseInt(data.minStayDays, 10);
    if (!ms || ms < 1) errors.minStayDays = 'Min stay must be at least 1 day';

    if (data.roomType === 'bedSpacer' && data.pricingModel !== 'per_bed') {
      errors.pricingModel = 'Bed Spacer must use per-bed pricing';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  const openAddModal = () => {
    if (!selectedPropertyId) {
      Alert.alert('Error', 'Select a property first');
      return;
    }
    setModalMode('add');
    const initialRT = isBedSpacerProperty ? 'bedSpacer' : 'single';
    const initialPM = isBedSpacerProperty ? 'per_bed' : 'full_room';
    
    setFormData({
      id: null,
      roomNumber: '',
      roomType: initialRT,
      floor: '1',
      monthlyRate: '',
      dailyRate: '',
      billingPolicy: 'monthly',
      minStayDays: '1',
      capacity: initialRT === 'bedSpacer' ? '1' : '1',
      pricingModel: initialPM,
      description: '',
      status: 'available',
      amenities: [],
      rules: []
    });
    setSelectedImages([]);
    setFieldErrors({});
    setModalVisible(true);
  };

  const openEditModal = (room) => {
    setModalMode('edit');
    setFormData({
      id: room.id,
      roomNumber: room.room_number || '',
      roomType: room.room_type || 'single',
      floor: String(room.floor || '1'),
      monthlyRate: String(room.monthly_rate || ''),
      dailyRate: String(room.daily_rate || ''),
      billingPolicy: room.billing_policy || 'monthly',
      minStayDays: String(room.min_stay_days || '1'),
      capacity: String(room.capacity || '1'),
      pricingModel: room.pricing_model || 'full_room',
      description: room.description || '',
      status: room.status || 'available',
      amenities: parseList(room.amenities),
      rules: parseList(room.rules),
      occupied: room.occupied || 0
    });
    setSelectedImages([]);
    setFieldErrors({});
    setModalVisible(true);
  };

  const toggleAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const toggleRule = (rule) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.includes(rule)
        ? prev.rules.filter(r => r !== rule)
        : [...prev.rules, rule]
    }));
  };

  const handleAddAmenity = async () => {
    if (!newAmenity.trim() || !selectedPropertyId) return;
    const res = await PropertyService.addPropertyAmenity(selectedPropertyId, newAmenity.trim());
    if (res.success) {
      setFormData(prev => ({ ...prev, amenities: [...prev.amenities, newAmenity.trim()] }));
      setNewAmenity('');
      loadProperties();
    }
  };

  const handleAddRule = async () => {
    if (!newRule.trim() || !selectedPropertyId) return;
    const res = await PropertyService.addPropertyRule(selectedPropertyId, newRule.trim());
    if (res.success) {
      setFormData(prev => ({ ...prev, rules: [...prev.rules, newRule.trim()] }));
      setNewRule('');
      loadProperties();
    }
  };

  const handlePickImages = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 0.8 });
    if (!res.canceled) {
      const mapped = res.assets.map((a, i) => ({ 
        uri: a.uri, 
        name: a.fileName || `room-${Date.now()}-${i}.jpg`, 
        type: a.mimeType || 'image/jpeg' 
      }));
      setSelectedImages(prev => [...prev, ...mapped]);
    }
  };

  const handleSubmit = async () => {
    const { valid, errors } = validateForm(formData);
    if (!valid) {
      setFieldErrors(errors);
      Alert.alert('Validation Error', 'Please fix the highlighted errors.');
      return;
    }

    setModalLoading(true);
    try {
      const payload = new FormData();
      payload.append('property_id', selectedPropertyId);
      payload.append('room_number', formData.roomNumber.trim());
      payload.append('room_type', formData.roomType);
      payload.append('floor', formData.floor);
      payload.append('capacity', isApartment ? '1' : formData.capacity);
      payload.append('billing_policy', formData.billingPolicy);
      payload.append('pricing_model', formData.pricingModel);
      payload.append('min_stay_days', formData.minStayDays);
      payload.append('description', formData.description || '');
      payload.append('status', formData.status);
      
      if (formData.monthlyRate) payload.append('monthly_rate', formData.monthlyRate);
      if (formData.dailyRate) payload.append('daily_rate', formData.dailyRate);

      formData.amenities.forEach((a, i) => payload.append(`amenities[${i}]`, a));
      formData.rules.forEach((r, i) => payload.append(`rules[${i}]`, r));
      selectedImages.forEach((img, i) => payload.append(`images[${i}]`, img));

      const res = modalMode === 'add' 
        ? await PropertyService.createRoom(payload)
        : await PropertyService.updateRoom(formData.id, payload);
      
      if (res.success) {
        setModalVisible(false);
        loadRooms();
      } else {
        Alert.alert('Error', res.error || 'Failed to save room');
      }
    } finally {
      setModalLoading(false);
    }
  };

  const renderRoomCard = ({ item }) => {
    const badge = statusTokens[item.status] || statusTokens.available;
    const cover = item.images?.[0] ? { uri: getImageUrl(typeof item.images[0] === 'string' ? item.images[0] : item.images[0].path) } : null;
    
    return (
      <View style={styles.roomCard}>
        {cover ? <Image source={cover} style={styles.roomImage} /> : (
          <View style={[styles.roomImage, { alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="bed-outline" size={40} color="#94A3B8" />
          </View>
        )}
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
        </View>
        <View style={styles.roomContent}>
          <View style={styles.roomTopRow}>
            <View>
              <Text style={styles.roomTitle}>Room {item.room_number}</Text>
              <Text style={styles.roomMeta}>{item.room_type} • Floor {item.floor}</Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.price}>{formatCurrency(item.monthly_rate || item.daily_rate)}</Text>
              <Text style={styles.priceCaption}>{item.billing_policy === 'daily' ? 'per day' : 'per month'}</Text>
            </View>
          </View>
          <View style={styles.roomActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
              <Ionicons name="create-outline" size={18} color="#0369A1" />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FEF3C7' }]} 
              onPress={() => { setStatusTarget(item); setStatusModalVisible(true); }}
            >
              <Ionicons name="swap-horizontal" size={18} color="#B45309" />
              <Text style={[styles.actionText, { color: '#B45309' }]}>Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Room Management</Text>
        <TouchableOpacity style={styles.iconButton} onPress={openAddModal}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRoomCard}
        ListHeaderComponent={(
          <View>
            {!preselectedPropertyId && (
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
            )}
            
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Occupied</Text>
                <Text style={[styles.statValue, { color: '#B91C1C' }]}>{stats.occupied}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Available</Text>
                <Text style={[styles.statValue, { color: '#15803D' }]}>{stats.available}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Maintenance</Text>
                <Text style={[styles.statValue, { color: '#B45309' }]}>{stats.maintenance}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {FILTERS.map(f => (
                <TouchableOpacity 
                  key={f.value} 
                  style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
                  onPress={() => setFilter(f.value)}
                >
                  <Text style={[styles.filterText, filter === f.value && { color: '#16A34A' }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRoomsRefresh} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{modalMode === 'add' ? 'Add New Room' : 'Edit Room'}</Text>
            <View style={{ width: 42 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            {/* Row 1: Room Number | Floor | Room Type */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Room Number <Text style={styles.requiredAsterisk}>*</Text></Text>
                <TextInput 
                  style={[styles.input, fieldErrors.roomNumber && { borderColor: '#EF4444' }]} 
                  value={formData.roomNumber} 
                  onChangeText={t => handleInputChange('roomNumber', t)}
                  placeholder="e.g., 301"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Floor <Text style={styles.requiredAsterisk}>*</Text></Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={formData.floor} onValueChange={v => handleInputChange('floor', v)}>
                    {FLOORS.map(f => <Picker.Item key={f.value} label={f.label} value={f.value} />)}
                  </Picker>
                </View>
              </View>
            </View>

            <Text style={styles.label}>Room Type <Text style={styles.requiredAsterisk}>*</Text></Text>
            <View style={[styles.pickerWrapper, isBedSpacerProperty && { backgroundColor: '#F3F4F6' }]}>
              <Picker 
                selectedValue={formData.roomType} 
                onValueChange={v => handleInputChange('roomType', v)}
                enabled={!isBedSpacerProperty}
              >
                {roomTypes.map(rt => <Picker.Item key={rt.value} label={rt.label} value={rt.value} />)}
              </Picker>
            </View>

            {/* Billing Row */}
            <Text style={styles.sectionTitle}>Billing & Rates</Text>
            <Text style={styles.label}>Billing Policy</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={formData.billingPolicy} onValueChange={v => handleInputChange('billingPolicy', v)}>
                <Picker.Item label="Monthly Rate" value="monthly" />
                <Picker.Item label="Monthly + Daily" value="monthly_with_daily" />
                <Picker.Item label="Daily Rate" value="daily" />
              </Picker>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              {(formData.billingPolicy !== 'daily') && (
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Monthly Rate (₱/month) <Text style={styles.requiredAsterisk}>*</Text></Text>
                  <TextInput 
                    style={[styles.input, fieldErrors.monthlyRate && { borderColor: '#EF4444' }]} 
                    keyboardType="numeric" 
                    value={formData.monthlyRate}
                    onChangeText={t => handleInputChange('monthlyRate', t)}
                    placeholder="e.g., 5000"
                  />
                </View>
              )}
              {(formData.billingPolicy !== 'monthly') && (
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Daily Rate (₱/day) <Text style={styles.requiredAsterisk}>*</Text></Text>
                  <TextInput 
                    style={[styles.input, fieldErrors.dailyRate && { borderColor: '#EF4444' }]} 
                    keyboardType="numeric" 
                    value={formData.dailyRate}
                    onChangeText={t => handleInputChange('dailyRate', t)}
                    placeholder="e.g., 300"
                  />
                </View>
              )}
            </View>

            {/* Min Stay & Capacity Row */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Minimum Stay (days)</Text>
                <TextInput 
                  style={[styles.input, fieldErrors.minStayDays && { borderColor: '#EF4444' }]} 
                  keyboardType="numeric" 
                  value={formData.minStayDays}
                  onChangeText={t => handleInputChange('minStayDays', t)}
                  placeholder="e.g., 30"
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.label}>Capacity <Text style={styles.requiredAsterisk}>*</Text></Text>
                </View>
                <TextInput 
                  style={[styles.input, (isDormitory || isBoarding) && formData.roomType !== 'bedSpacer' && { backgroundColor: '#F3F4F6' }, fieldErrors.capacity && { borderColor: '#EF4444' }]} 
                  keyboardType="numeric" 
                  value={formData.capacity}
                  onChangeText={t => handleInputChange('capacity', t)}
                  editable={!((isDormitory || isBoarding) && formData.roomType !== 'bedSpacer')}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Pricing Model</Text>
            <Text style={[styles.helperText, { marginBottom: 12 }]}>
              {formData.roomType === 'bedSpacer' ? 'Bed Spacer rooms use per-bed pricing only' : 'How should tenants pay for this room?'}
            </Text>
            
            <View style={{ gap: 10 }}>
              {formData.roomType !== 'bedSpacer' && (
                <TouchableOpacity 
                  style={[styles.pricingCard, formData.pricingModel === 'full_room' && styles.pricingCardActive]}
                  onPress={() => handleInputChange('pricingModel', 'full_room')}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name={formData.pricingModel === 'full_room' ? "radio-button-on" : "radio-button-off"} size={20} color={formData.pricingModel === 'full_room' ? "#16A34A" : "#6B7280"} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pricingCardTitle, formData.pricingModel === 'full_room' && { color: '#16A34A' }]}>Room Price</Text>
                      <Text style={styles.pricingCardDesc}>
                        {parseInt(formData.capacity) > 1 
                          ? `Tenants divide ₱${formData.monthlyRate || '0'} equally (₱${formData.monthlyRate && formData.capacity ? Math.round(parseFloat(formData.monthlyRate) / parseInt(formData.capacity)).toLocaleString() : '0'}/person)`
                          : 'Single tenant pays full price'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {(formData.roomType !== 'single' || formData.roomType === 'bedSpacer') && (
                <TouchableOpacity 
                  style={[styles.pricingCard, formData.pricingModel === 'per_bed' && styles.pricingCardActive]}
                  onPress={() => handleInputChange('pricingModel', 'per_bed')}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name={formData.pricingModel === 'per_bed' ? "radio-button-on" : "radio-button-off"} size={20} color={formData.pricingModel === 'per_bed' ? "#16A34A" : "#6B7280"} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pricingCardTitle, formData.pricingModel === 'per_bed' && { color: '#16A34A' }]}>Per Bed/Tenant Price</Text>
                      <Text style={styles.pricingCardDesc}>Each tenant pays ₱${formData.monthlyRate || '0'} for their bed (independent billing)</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.sectionTitle}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add room description..."
              multiline
              value={formData.description}
              onChangeText={t => handleInputChange('description', t)}
            />

            <Text style={styles.sectionTitle}>Room Rules (optional)</Text>
            <View style={[styles.pillList, { marginBottom: 12 }]}>
              {propertyRules.map(r => (
                <TouchableOpacity 
                  key={r} 
                  style={[styles.pill, formData.rules.includes(r) && styles.pillActive]}
                  onPress={() => toggleRule(r)}
                >
                  <Text style={styles.pillText}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Add new rule (e.g., no smoking)"
                value={newRule}
                onChangeText={setNewRule}
              />
              <TouchableOpacity 
                style={[styles.pill, { paddingVertical: 0, justifyContent: 'center', borderColor: '#16A34A' }]} 
                onPress={handleAddRule}
              >
                <Ionicons name="add" size={20} color="#16A34A" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.helperText, { marginTop: 8 }]}>Select rules to include for this room or add a new rule to the property.</Text>

            <Text style={styles.sectionTitle}>Room Amenities</Text>
            <View style={[styles.pillList, { marginBottom: 12 }]}>
              {propertyAmenities.map(a => (
                <TouchableOpacity 
                  key={a} 
                  style={[styles.pill, formData.amenities.includes(a) && styles.pillActive]}
                  onPress={() => toggleAmenity(a)}
                >
                  <Text style={styles.pillText}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="e.g., Water Heater, Study Lamp"
                value={newAmenity}
                onChangeText={setNewAmenity}
              />
              <TouchableOpacity 
                style={[styles.pill, { paddingVertical: 0, justifyContent: 'center', borderColor: '#16A34A' }]} 
                onPress={handleAddAmenity}
              >
                <Ionicons name="add" size={20} color="#16A34A" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.helperText, { marginTop: 8 }]}>Add amenities that will be available in this room and saved to property</Text>

            <Text style={styles.sectionTitle}>Room Images</Text>
            <View style={styles.imageGrid}>
              {selectedImages.map((img, i) => (
                <View key={i} style={styles.imagePreview}>
                  <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} />
                  {i === 0 && (
                    <View style={{ position: 'absolute', left: 6, top: 6, backgroundColor: '#16A34A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>Cover</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.imageRemove} onPress={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))}>
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {selectedImages.length < 10 && (
                <TouchableOpacity style={[styles.imagePreview, styles.addImageTile]} onPress={handlePickImages}>
                  <Ionicons name="camera" size={28} color="#94A3B8" />
                  <Text style={{ color: '#94A3B8', fontSize: 10, marginTop: 4 }}>Add Image</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.helperText, { marginTop: 8 }]}>PNG, JPG up to 10MB (Max 10 images)</Text>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setModalVisible(false)} disabled={modalLoading}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={modalLoading}>
              {modalLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{modalMode === 'add' ? 'Add Room' : 'Save Changes'}</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Status Modal */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <View style={styles.statusModalOverlay}>
          <View style={styles.statusSheet}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 20 }]}>Update Room Status</Text>
            {Object.keys(statusTokens).map(s => (
              <TouchableOpacity 
                key={s} 
                style={styles.statusOption}
                onPress={async () => {
                  const res = await PropertyService.updateRoomStatus(statusTarget.id, s);
                  if (res.success) { setStatusModalVisible(false); loadRooms(); }
                }}
              >
                <Text style={styles.statusOptionText}>{statusTokens[s].label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.statusOption, { borderBottomWidth: 0 }]} onPress={() => setStatusModalVisible(false)}>
              <Text style={[styles.statusOptionText, { color: '#EF4444' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
