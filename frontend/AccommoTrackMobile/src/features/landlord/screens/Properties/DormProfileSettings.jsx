import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  Switch,
  Modal,
  Image,
  Alert,
  Pressable,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showSuccess, showError } from '../../../../utils/toast.js';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import PropertyService from '../../../../services/PropertyService.js';
import { getStyles } from '../../../../styles/Landlord/DormProfile.js';
import { getImageUrl } from '../../../../utils/imageUtils.js';
import {
  landlordQueryKeys,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';

const GENDER_OPTIONS = [
  { label: 'Mixed (Any Sex)', value: 'mixed' },
  { label: 'Boys Only', value: 'male' },
  { label: 'Girls Only', value: 'female' },
];

const PROPERTY_TYPES = [
  { label: 'Dormitory', value: 'dormitory' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'Boarding House', value: 'boardingHouse' },
  { label: 'Bed Spacer', value: 'bedSpacer' },
  { label: 'Others', value: 'others' }
];

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Maintenance', value: 'maintenance' }
];

const AMENITY_OPTIONS = [
  'Free WiFi', 'Air Conditioning', 'Kitchen', 'Laundry', 'Parking',
  '24/7 Security', 'CCTV', 'Study Area', 'Gym', 'Swimming Pool',
  'Backup Generator', 'Water Heater', 'Caretaker'
];

const parseAmenities = (amenitiesData) => {
  if (!amenitiesData) return [];
  if (Array.isArray(amenitiesData)) return amenitiesData.map(a => typeof a === 'string' ? a : a.name);
  if (typeof amenitiesData === 'string') {
    try {
      const parsed = JSON.parse(amenitiesData);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
};

const parseBooleanFlag = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off', ''].includes(normalized)) return false;
  }

  return fallback;
};

const buildEmptyForm = () => ({
  id: null,
  propertyType: '',
  sexRestriction: 'mixed',
  status: 'pending',
  title: '',
  description: '',
  streetAddress: '',
  barangay: '',
  city: '',
  province: '',
  postalCode: '',
  latitude: null,
  longitude: null,
  amenities: [],
  rules: [],
  images: [],
  video: null,
  credentials: [],
  deletedImageIds: [],
  deletedCredentialIds: [],
  deleteExistingVideo: false,
  totalRooms: '',
  maxOccupants: '',
  bedrooms: '0',
  bathrooms: '0',
  floorArea: '',
  totalFloors: '1',
  floorLevel: [],
  isPublished: false,
  curfewTime: '',
  curfewPolicy: '',
  require1MonthAdvance: false,
  allowPartialPayments: true,
  forceWalletRefunds: true,
  requireReservationFee: false,
  reservationFeeAmount: '',
  reservationFeeGapDays: '3',
  gcashName: '',
  gcashNumber: '',
  gcashQr: null,
  deleteExistingGcashQr: false,
  transferFee: '',
  transferLimit: '1',
  normalBookingLimit: '1',
  proxyBookingLimit: '3',
  minPartialPaymentPct: '20',
});

const normalizeSettings = (data) => {
  let parsedRules = [];
  try {
    parsedRules = typeof data?.property_rules === 'string'
      ? JSON.parse(data.property_rules)
      : (data?.property_rules || []);
  } catch (_e) { parsedRules = []; }

  // Normalize images
  const images = (data?.images || []).map(img => ({
    id: img.id,
    uri: img.image_url || img.url,
    isExisting: true
  }));

  // Normalize credentials
  const credentials = (data?.credentials || []).map(c => ({
    id: c.id,
    name: c.original_name || c.name,
    uri: c.file_url || c.url,
    isExisting: true
  }));

  return {
    id: data?.id ?? null,
    propertyType: data?.property_type || '',
    sexRestriction: data?.sex_restriction || 'mixed',
    status: data?.current_status || 'pending',
    title: data?.title || '',
    description: data?.description || '',
    streetAddress: data?.street_address || '',
    barangay: data?.barangay || '',
    city: data?.city || '',
    province: data?.province || '',
    postalCode: data?.postal_code || '',
    latitude: data?.latitude ? Number(data.latitude) : null,
    longitude: data?.longitude ? Number(data.longitude) : null,
    amenities: parseAmenities(data?.amenities_list || data?.amenities),
    rules: Array.isArray(parsedRules) ? parsedRules : [],
    images: images,
    video: data?.video_url ? { uri: data.video_url, isExisting: true } : null,
    credentials: credentials,
    deletedImageIds: [],
    deletedCredentialIds: [],
    deleteExistingVideo: false,
    totalRooms: data?.total_rooms ? String(data.total_rooms) : '',
    maxOccupants: data?.max_occupants ? String(data.max_occupants) : '',
    bedrooms: data?.number_of_bedrooms ? String(data.number_of_bedrooms) : '0',
    bathrooms: data?.number_of_bathrooms ? String(data.number_of_bathrooms) : '0',
    floorArea: data?.floor_area ? String(data.floor_area) : '',
    totalFloors: data?.total_floors ? String(data.total_floors) : '1',
    floorLevel: data?.floor_level ? String(data.floor_level).split(',').filter(Boolean) : [],
    isPublished: parseBooleanFlag(data?.is_published, false),
    curfewTime: data?.curfew_time || '',
    curfewPolicy: data?.curfew_policy || '',
    require1MonthAdvance: parseBooleanFlag(data?.require_1month_advance, false),
    allowPartialPayments: parseBooleanFlag(data?.allow_partial_payments, true),
    forceWalletRefunds: parseBooleanFlag(data?.force_wallet_refunds, true),
    requireReservationFee: parseBooleanFlag(data?.require_reservation_fee, false),
    reservationFeeAmount: data?.reservation_fee_amount ? String(data.reservation_fee_amount) : '',
    reservationFeeGapDays: data?.reservation_fee_gap_days !== undefined
      ? String(data.reservation_fee_gap_days)
      : '3',
    gcashName: data?.gcash_name || '',
    gcashNumber: data?.gcash_number || '',
    gcashQr: data?.gcash_qr_path
      ? { uri: getImageUrl(data.gcash_qr_path), isExisting: true }
      : null,
    deleteExistingGcashQr: false,
    transferFee: data?.transfer_fee !== undefined ? String(data.transfer_fee) : '',
    transferLimit: data?.transfer_limit !== undefined ? String(data.transfer_limit) : '1',
    normalBookingLimit: data?.normal_booking_limit !== undefined ? String(data.normal_booking_limit) : '1',
    proxyBookingLimit: data?.proxy_booking_limit !== undefined ? String(data.proxy_booking_limit) : '3',
    minPartialPaymentPct: data?.min_partial_payment_pct !== undefined ? String(data.min_partial_payment_pct) : '20',
  };
};

export default function DormProfileSettings({ route, navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const propertyId = route.params?.propertyId;
  const [form, setForm] = useState(buildEmptyForm);
  const [refreshing, setRefreshing] = useState(false);
  const [showGcashConfirm, setShowGcashConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState('');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isPayMongoVerified, setIsPayMongoVerified] = useState(false);
  const [propertyTypeModalVisible, setPropertyTypeModalVisible] = useState(false);
  const [sexRestrictionModalVisible, setSexRestrictionModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const settingsQuery = useQuery({
    queryKey: landlordQueryKeys.propertySettings(propertyId),
    enabled: Boolean(propertyId),
    queryFn: async () => {
      const response = await PropertyService.getProperty(propertyId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load property settings');
      }

      return response.data || null;
    },
    placeholderData: (previousData) => previousData,
  });

  const loading = settingsQuery.isPending && !settingsQuery.data;
  const fetchError = settingsQuery.error?.message || '';
  const refetchSettings = settingsQuery.refetch;
  // eslint-disable-next-line no-unused-vars
  const pickerMode = Platform.OS === 'android' ? 'dropdown' : undefined;
  const settingsRefetchers = useMemo(() => [refetchSettings], [refetchSettings]);

  const handleRefresh = useLandlordRefreshHandler({
    enabled: Boolean(propertyId),
    setRefreshing,
    refetchers: settingsRefetchers,
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setForm(normalizeSettings(settingsQuery.data));
  }, [settingsQuery.data]);

  useEffect(() => {
    if (!fetchError) return;
    showError('Error', fetchError);
  }, [fetchError]);

  useEffect(() => {
    let mounted = true;

    const loadPayMongoStatus = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        if (!mounted || !userString) return;

        const user = JSON.parse(userString);
        const verified =
          user?.paymongo_verification_status === 'verified' ||
          user?.is_paymongo_ready === true;
        setIsPayMongoVerified(Boolean(verified));
      } catch (_error) {
        if (mounted) {
          setIsPayMongoVerified(false);
        }
      }
    };

    loadPayMongoStatus();

    return () => {
      mounted = false;
    };
  }, []);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFloor = (floorNumberStr) => {
    setForm((prev) => {
      const current = prev.floorLevel;
      const updated = current.includes(floorNumberStr)
        ? current.filter((f) => f !== floorNumberStr)
        : [...current, floorNumberStr].sort((a, b) => Number(a) - Number(b));
      return { ...prev, floorLevel: updated };
    });
  };

  const toggleAmenity = (amenity) => {
    setForm((prev) => {
      const current = prev.amenities;
      const updated = current.includes(amenity)
        ? current.filter((a) => a !== amenity)
        : [...current, amenity];
      return { ...prev, amenities: updated };
    });
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    setForm((prev) => ({
      ...prev,
      rules: [...prev.rules, newRule.trim()]
    }));
    setNewRule('');
  };

  const removeRule = (index) => {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => ({
        uri: asset.uri,
        isExisting: false
      }));
      setForm(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
    }
  };

  const removeImage = (index) => {
    setForm(prev => {
      const img = prev.images[index];
      if (img.isExisting && img.id) {
        return {
          ...prev,
          images: prev.images.filter((_, i) => i !== index),
          deletedImageIds: [...prev.deletedImageIds, img.id]
        };
      }
      return { ...prev, images: prev.images.filter((_, i) => i !== index) };
    });
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.duration && asset.duration > 45000) {
        showError('Video too long', 'Video must be 45 seconds or less.');
        return;
      }
      setForm(prev => ({ ...prev, video: { uri: asset.uri, isExisting: false }, deleteExistingVideo: !!prev.video?.isExisting }));
    }
  };

  const removeVideo = () => {
    setForm(prev => ({
      ...prev,
      video: null,
      deleteExistingVideo: prev.video?.isExisting || prev.deleteExistingVideo
    }));
  };

  const pickCredential = async () => {
    const options = [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            showError('Permission Required', 'Please allow camera access to capture documents.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (!result.canceled) {
            const asset = result.assets[0];
            const name = asset.uri.split('/').pop();
            setForm(prev => ({
              ...prev,
              credentials: [...prev.credentials, { uri: asset.uri, name, isExisting: false, type: asset.mimeType || 'image/jpeg' }]
            }));
          }
        }
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            showError('Permission Required', 'Please allow photo library access.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (!result.canceled) {
            const asset = result.assets[0];
            const name = asset.uri.split('/').pop();
            setForm(prev => ({
              ...prev,
              credentials: [...prev.credentials, { uri: asset.uri, name, isExisting: false, type: asset.mimeType || 'image/jpeg' }]
            }));
          }
        }
      },
      {
        text: 'Choose File (PDF/Image)',
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: ['application/pdf', 'image/*'],
              multiple: false,
              copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              setForm(prev => ({
                ...prev,
                credentials: [...prev.credentials, {
                  uri: asset.uri,
                  name: asset.name,
                  isExisting: false,
                  type: asset.mimeType || 'application/pdf'
                }]
              }));
            }
          } catch (err) {
            console.error('DocumentPicker Error:', err);
            showError('Error', 'Could not open file manager.');
          }
        }
      },
      { text: 'Cancel', style: 'cancel' }
    ];

    Alert.alert('Upload Credentials', 'Choose a source for your documents.', options, {
      showCloseButton: true,
      cancelable: true,
    });
  };

  const removeCredential = (index) => {
    setForm(prev => {
      const cred = prev.credentials[index];
      if (cred.isExisting && cred.id) {
        return {
          ...prev,
          credentials: prev.credentials.filter((_, i) => i !== index),
          deletedCredentialIds: [...prev.deletedCredentialIds, cred.id]
        };
      }
      return { ...prev, credentials: prev.credentials.filter((_, i) => i !== index) };
    });
  };

  const pickGcashQr = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setForm((prev) => ({
        ...prev,
        gcashQr: { uri: asset.uri, isExisting: false },
        deleteExistingGcashQr: false,
      }));
    }
  };

  const removeGcashQr = () => {
    setForm((prev) => ({
      ...prev,
      gcashQr: null,
      deleteExistingGcashQr: prev.gcashQr?.isExisting || prev.deleteExistingGcashQr,
    }));
  };

  const handleSave = async () => {
    const hasGcashName = Boolean((form.gcashName || "").trim());
    const hasGcashNumber = Boolean((form.gcashNumber || "").trim());

    if (hasGcashName || hasGcashNumber) {
      if (!hasGcashName || !hasGcashNumber) {
        showError("Validation Error", "Both GCash Name and GCash Number are required if you want to provide manual GCash payment.");
        return;
      }

      const gcashRegex = /^09\d{9}$/;
      if (!gcashRegex.test(form.gcashNumber)) {
        showError("Validation Error", "GCash Number must be exactly 11 digits starting with 09.");
        return;
      }
      
      setShowGcashConfirm(true);
      return;
    }

    await proceedWithSave();
  };

  const proceedWithSave = async () => {
    try {
      setSaving(true);
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('description', form.description);
      payload.append('property_type', form.propertyType);
      payload.append('sex_restriction', form.sexRestriction);
      payload.append('current_status', form.status);
      payload.append('is_published', form.status === 'active' ? (form.isPublished ? '1' : '0') : '0');
      payload.append('street_address', form.streetAddress);
      payload.append('barangay', form.barangay);
      payload.append('city', form.city);
      payload.append('province', form.province);
      payload.append('postal_code', form.postalCode);
      if (form.latitude) payload.append('latitude', String(form.latitude));
      if (form.longitude) payload.append('longitude', String(form.longitude));
      payload.append('total_rooms', form.totalRooms);
      payload.append('max_occupants', form.maxOccupants);
      payload.append('number_of_bedrooms', form.bedrooms);
      payload.append('number_of_bathrooms', form.bathrooms);
      payload.append('floor_area', form.floorArea);
      payload.append('total_floors', form.totalFloors);
      payload.append('floor_level', form.floorLevel.join(','));
      payload.append('curfew_time', form.curfewTime);
      payload.append('curfew_policy', form.curfewPolicy);
      payload.append('require_1month_advance', form.require1MonthAdvance ? '1' : '0');
      payload.append('allow_partial_payments', form.allowPartialPayments ? '1' : '0');
      payload.append('force_wallet_refunds', form.forceWalletRefunds ? '1' : '0');
      payload.append('require_reservation_fee', form.requireReservationFee ? '1' : '0');
      payload.append('reservation_fee_amount', form.reservationFeeAmount);
      const parsedGapDays = Number.parseInt(form.reservationFeeGapDays, 10);
      const reservationFeeGapDays = Number.isNaN(parsedGapDays) ? 3 : Math.max(0, parsedGapDays);
      payload.append('reservation_fee_gap_days', String(reservationFeeGapDays));
      payload.append('transfer_fee', form.transferFee || '0');
      payload.append('transfer_limit', form.transferLimit || '3');
      payload.append('gcash_name', form.requireReservationFee ? form.gcashName : '');
      payload.append('gcash_number', form.requireReservationFee ? form.gcashNumber : '');

      form.amenities.forEach(amenity => {
        payload.append('amenities[]', amenity);
      });

      payload.append('property_rules', JSON.stringify(form.rules));
      payload.append('normal_booking_limit', form.normalBookingLimit || '1');
      payload.append('proxy_booking_limit', form.proxyBookingLimit || '3');
      payload.append('min_partial_payment_pct', form.minPartialPaymentPct || '20');

      form.deletedImageIds.forEach(id => payload.append('deleted_images[]', id));
      form.deletedCredentialIds.forEach(id => payload.append('deleted_credentials[]', id));
      if (form.deleteExistingVideo) payload.append('delete_existing_video', '1');
      if (form.deleteExistingGcashQr) payload.append('delete_gcash_qr', '1');

      form.images.filter(img => !img.isExisting).forEach((img, idx) => {
        payload.append('images[]', {
          uri: img.uri,
          name: `image_${idx}.jpg`,
          type: 'image/jpeg'
        });
      });

      if (form.video && !form.video.isExisting) {
        payload.append('video', {
          uri: form.video.uri,
          name: 'video_tour.mp4',
          type: 'video/mp4'
        });
      }

      if (form.gcashQr && !form.gcashQr.isExisting) {
        payload.append('gcash_qr_path', {
          uri: form.gcashQr.uri,
          name: 'gcash_qr.jpg',
          type: 'image/jpeg'
        });
      }

      form.credentials.filter(c => !c.isExisting).forEach((c, idx) => {
        payload.append('credentials[]', {
          uri: c.uri,
          name: c.name || `credential_${idx}`,
          type: c.type || (c.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
        });
      });

      const response = await PropertyService.updateProperty(propertyId, payload);

      if (response.success) {
        showSuccess('Settings Updated', 'Property settings have been saved.');
        navigation.goBack();
      } else {
        throw new Error(response.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error('Save failed', err);
      showError('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!password.trim()) {
      showError('Required', 'Password is required to delete.');
      return;
    }
    try {
      setDeleteLoading(true);
      const response = await PropertyService.deleteProperty(propertyId, password.trim());
      if (response.success) {
        showSuccess('Deleted', 'Property deleted successfully.');
        setPasswordModalVisible(false);
        setPassword('');
        navigation.navigate('MyProperties', { refresh: true });
      } else {
        throw new Error(response.error || 'Failed to delete property');
      }
    } catch (err) {
      console.error('Delete failed', err);
      showError('Delete Failed', err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isGenderRestricted = form.propertyType !== '' && form.propertyType !== 'apartment';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButtonBg} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Settings</Text>
        <TouchableOpacity style={styles.iconButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="save-outline" size={22} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Text style={styles.sectionSubtitle}>Display name and overview for the property</Text>

          <Text style={styles.label}>Property Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Sunshine Dormitory"
            value={form.title}
            onChangeText={(val) => updateForm('title', val)}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your property..."
            multiline
            value={form.description}
            onChangeText={(val) => updateForm('description', val)}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Booking Limits</Text>
          <Text style={styles.sectionSubtitle}>Limit active bookings per tenant (Max 4)</Text>

          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Self Bookings</Text>
              <TextInput
                style={styles.input}
                placeholder="1-4"
                keyboardType="numeric"
                value={form.normalBookingLimit}
                onChangeText={(val) => {
                  const num = parseInt(val) || 0;
                  if (num <= 4) updateForm('normalBookingLimit', val);
                }}
              />
              <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>Default: 1</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.label}>Proxy Bookings</Text>
              <TextInput
                style={styles.input}
                placeholder="1-4"
                keyboardType="numeric"
                value={form.proxyBookingLimit}
                onChangeText={(val) => {
                  const num = parseInt(val) || 0;
                  if (num <= 4) updateForm('proxyBookingLimit', val);
                }}
              />
              <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>Default: 3</Text>
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>Min Partial Payment (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="1-100"
              keyboardType="numeric"
              value={form.minPartialPaymentPct}
              onChangeText={(val) => {
                const num = parseInt(val) || 0;
                if (num <= 100) updateForm('minPartialPaymentPct', val);
              }}
            />
            <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>Default: 20%</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Location Details</Text>
          <Text style={styles.sectionSubtitle}>Help tenants find your property</Text>

          <Text style={styles.label}>Street Address</Text>
          <TextInput
            style={styles.input}
            placeholder="No., Street name"
            value={form.streetAddress}
            onChangeText={(val) => updateForm('streetAddress', val)}
          />

          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Barangay</Text>
              <TextInput
                style={styles.input}
                placeholder="Barangay"
                value={form.barangay}
                onChangeText={(val) => updateForm('barangay', val)}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="City"
                value={form.city}
                onChangeText={(val) => updateForm('city', val)}
              />
            </View>
          </View>

          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Province</Text>
              <TextInput
                style={styles.input}
                placeholder="Province"
                value={form.province}
                onChangeText={(val) => updateForm('province', val)}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.label}>Zip Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 6000"
                keyboardType="numeric"
                value={form.postalCode}
                onChangeText={(val) => updateForm('postalCode', val)}
              />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 8 }]}>GPS Coordinates (Optional)</Text>
          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { fontSize: 11 }]}>Latitude</Text>
              <TextInput
                style={styles.input}
                placeholder="Latitude"
                keyboardType="decimal-pad"
                value={form.latitude ? String(form.latitude) : ''}
                onChangeText={(val) => updateForm('latitude', val)}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.label, { fontSize: 11 }]}>Longitude</Text>
              <TextInput
                style={styles.input}
                placeholder="Longitude"
                keyboardType="decimal-pad"
                value={form.longitude ? String(form.longitude) : ''}
                onChangeText={(val) => updateForm('longitude', val)}
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Property Specifications</Text>
          <Text style={styles.sectionSubtitle}>Define room capacities and managed floors</Text>

          <Text style={styles.label}>Property Type</Text>
          <TouchableOpacity
            style={styles.selectTrigger}
            onPress={() => setPropertyTypeModalVisible(true)}
          >
            <Text style={styles.selectTriggerText}>
              {PROPERTY_TYPES.find(t => t.value === form.propertyType)?.label || 'Select Type'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {isGenderRestricted && (
            <>
              <Text style={styles.label}>Sex Restriction</Text>
              <TouchableOpacity
                style={styles.selectTrigger}
                onPress={() => setSexRestrictionModalVisible(true)}
              >
                <Text style={styles.selectTriggerText}>
                  {GENDER_OPTIONS.find(o => o.value === form.sexRestriction)?.label || 'Select Sex'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.label}>Status</Text>
          <TouchableOpacity
            style={styles.selectTrigger}
            onPress={() => setStatusModalVisible(true)}
          >
            <Text style={styles.selectTriggerText}>
              {STATUS_OPTIONS.find(o => o.value === form.status)?.label || 'Select Status'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.switchRowContainer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Show on Public Listings</Text>
              <Text style={styles.switchHelpText}>
                {form.status === 'active'
                  ? 'Control whether tenants can discover this property in Explore.'
                  : 'Public visibility is available only when status is Active.'}
              </Text>
            </View>
            <Switch
              value={form.status === 'active' ? form.isPublished : false}
              onValueChange={(val) => updateForm('isPublished', val)}
              disabled={form.status !== 'active'}
              trackColor={{ true: theme.colors.primary, false: '#CBD5E1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Total Rooms</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.totalRooms}
                onChangeText={(val) => updateForm('totalRooms', val)}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.label}>Max Occupants</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.maxOccupants}
                onChangeText={(val) => updateForm('maxOccupants', val)}
              />
            </View>
          </View>

          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Bathrooms</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.bathrooms}
                onChangeText={(val) => updateForm('bathrooms', val)}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.label}>Bedrooms</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.bedrooms}
                onChangeText={(val) => updateForm('bedrooms', val)}
              />
            </View>
          </View>

          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Total Floors</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.totalFloors}
                onChangeText={(val) => updateForm('totalFloors', val)}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.label}>Floor Area (sqm)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.floorArea}
                onChangeText={(val) => updateForm('floorArea', val)}
              />
            </View>
          </View>

          {parseInt(form.totalFloors) > 1 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Managed Floors</Text>
              <Text style={[styles.sectionSubtitle, { marginBottom: 8 }]}>Select the floors you manage</Text>
              <View style={styles.floorsGrid}>
                {Array.from({ length: parseInt(form.totalFloors) || 0 }, (_, i) => String(i + 1)).map((floor) => (
                  <TouchableOpacity
                    key={floor}
                    style={[
                      styles.floorButton,
                      form.floorLevel.includes(floor) && styles.floorButtonActive
                    ]}
                    onPress={() => toggleFloor(floor)}
                  >
                    <Text style={[
                      styles.floorButtonText,
                      form.floorLevel.includes(floor) && styles.floorButtonTextActive
                    ]}>
                      {floor}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <Text style={styles.sectionSubtitle}>Select what's available at your property</Text>
          <View style={styles.pillGrid}>
            {AMENITY_OPTIONS.map((amenity) => (
              <TouchableOpacity
                key={amenity}
                style={[
                  styles.pill,
                  form.amenities.includes(amenity) && styles.pillActive
                ]}
                onPress={() => toggleAmenity(amenity)}
              >
                <Text style={[
                  styles.pillText,
                  form.amenities.includes(amenity) && styles.pillTextActive
                ]}>
                  {amenity}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>House Rules</Text>
          <Text style={styles.sectionSubtitle}>Guidelines for your tenants</Text>

          <View style={styles.inlineInputRow}>
            <TextInput
              style={styles.inlineInput}
              placeholder="e.g., No pets allowed"
              value={newRule}
              onChangeText={setNewRule}
            />
            <TouchableOpacity style={styles.inlineAddButton} onPress={addRule}>
              <Text style={styles.inlineAddButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 16 }}>
            {form.rules.map((rule, index) => (
              <View key={index} style={styles.ruleItem}>
                <Ionicons name="remove-circle-outline" size={20} color="#EF4444" onPress={() => removeRule(index)} />
                <Text style={{ color: theme.colors.text, flex: 1 }}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Property Photos</Text>
          <Text style={styles.sectionSubtitle}>Add up to 10 high-quality images</Text>
          <View style={styles.imagesRow}>
            {form.images.map((img, index) => (
              <View key={index} style={styles.imagePreview}>
                <Image source={{ uri: img.uri }} style={styles.imageFull} />
                <TouchableOpacity style={styles.imageRemove} onPress={() => removeImage(index)}>
                  <Ionicons name="close" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
            {form.images.length < 10 && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                <Ionicons name="camera-outline" size={28} color={theme.colors.primary} />
                <Text style={{ fontSize: 10, color: theme.colors.primary, marginTop: 8 }}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Video Tour</Text>
          <Text style={styles.sectionSubtitle}>Short 45-second tour of your property</Text>
          {form.video ? (
            <View style={{ position: 'relative', width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden' }}>
              <View style={styles.videoThumbnail}>
                <Ionicons name="play-circle" size={48} color="#FFF" />
                <Text style={{ color: '#FFF', marginTop: 8 }}>{form.video.isExisting ? 'Existing Video' : 'New Video Selected'}</Text>
              </View>
              <TouchableOpacity style={styles.imageRemove} onPress={removeVideo}>
                <Ionicons name="trash-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.outlineBtn} onPress={pickVideo}>
              <Ionicons name="videocam-outline" size={20} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Upload Video Tour</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Business Credentials</Text>
          <Text style={styles.sectionSubtitle}>Permits, Licenses, and Certifications</Text>
          {form.credentials.map((cred, index) => (
            <View key={index} style={styles.credentialItem}>
              <View style={styles.credentialInfo}>
                <Ionicons name="document-text-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.credentialName} numberOfLines={1}>{cred.name}</Text>
              </View>
              <TouchableOpacity onPress={() => removeCredential(index)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={[styles.outlineBtn, { marginTop: 16 }]} onPress={pickCredential}>
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Add Document</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Financial Settings</Text>

          <View style={styles.switchRowContainer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Require 1-Month Advance</Text>
              <Text style={styles.switchHelpText}>Move-in cost includes one extra month rent.</Text>
            </View>
            <Switch
              value={form.require1MonthAdvance}
              onValueChange={(val) => updateForm('require1MonthAdvance', val)}
              trackColor={{ true: theme.colors.primary, false: '#CBD5E1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchRowContainer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Allow Partial Payments</Text>
              <Text style={styles.switchHelpText}>Tenants can pay invoices in multiple parts.</Text>
            </View>
            <Switch
              value={form.allowPartialPayments}
              onValueChange={(val) => updateForm('allowPartialPayments', val)}
              trackColor={{ true: theme.colors.primary, false: '#CBD5E1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchRowContainer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Force Refunds to Wallet</Text>
              <Text style={styles.switchHelpText}>Excess transfer credits automatically go to tenant wallet.</Text>
            </View>
            <Switch
              value={form.forceWalletRefunds}
              onValueChange={(val) => updateForm('forceWalletRefunds', val)}
              trackColor={{ true: theme.colors.primary, false: '#CBD5E1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.switchRowContainer, { borderBottomWidth: form.requireReservationFee ? 1 : 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Require Reservation Fee</Text>
              <Text style={styles.switchHelpText}>Deductible from the first month's rent.</Text>
              {!isPayMongoVerified && (
                <Text style={styles.warningText}>PayMongo verification is required to enable this setting.</Text>
              )}
            </View>
            <Switch
              value={form.requireReservationFee}
              onValueChange={(val) => {
                if (!isPayMongoVerified && val) {
                  showError('PayMongo Not Verified', 'Complete PayMongo verification first from Settings > Payments.');
                  return;
                }
                updateForm('requireReservationFee', val);
              }}
              disabled={!isPayMongoVerified}
              trackColor={{ true: theme.colors.primary, false: '#CBD5E1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {form.requireReservationFee && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Reservation Fee Amount (₱)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="0.00"
                value={form.reservationFeeAmount}
                onChangeText={(val) => updateForm('reservationFeeAmount', val)}
              />

              <Text style={styles.label}>Require fee when move-in is more than (days)</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                placeholder="3"
                value={form.reservationFeeGapDays}
                onChangeText={(val) => updateForm('reservationFeeGapDays', val.replace(/[^0-9]/g, ''))}
              />
              <Text style={styles.switchHelpText}>Default is 3 days. Fee is required only when gap is above this value.</Text>

              <Text style={[styles.label, { marginTop: 8 }]}>GCash Account Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Juan Dela Cruz"
                value={form.gcashName}
                onChangeText={(val) => updateForm('gcashName', val)}
              />

              <Text style={styles.label}>GCash Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 09123456789"
                value={form.gcashNumber}
                onChangeText={(val) => updateForm('gcashNumber', val)}
              />

              <Text style={styles.label}>GCash QR Code</Text>
              {form.gcashQr ? (
                <View style={styles.qrPreviewContainer}>
                  <Image source={{ uri: form.gcashQr.uri }} style={styles.qrPreviewImage} />
                  <TouchableOpacity style={styles.imageRemove} onPress={removeGcashQr}>
                    <Ionicons name="trash-outline" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity style={[styles.outlineBtn, styles.outlineBtnPrimary]} onPress={pickGcashQr}>
                <Ionicons name="image-outline" size={20} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                  {form.gcashQr ? 'Replace GCash QR' : 'Upload GCash QR'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>Room Transfer Processing Fee (₱)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="0.00"
            value={form.transferFee}
            onChangeText={(val) => updateForm('transferFee', val)}
          />
          <Text style={styles.switchHelpText}>
            Used as the quoted transfer fee for tenant transfer requests.
          </Text>

          <Text style={[styles.label, { marginTop: 16 }]}>Transfer Limit (per tenant)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="1"
            value={form.transferLimit}
            onChangeText={(val) => updateForm('transferLimit', val)}
          />
          <Text style={styles.switchHelpText}>
            Max times a tenant can request a room transfer. Default: 1.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Curfew Settings</Text>
          <Text style={styles.label}>Curfew Time</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 10:00 PM"
            value={form.curfewTime}
            onChangeText={(val) => updateForm('curfewTime', val)}
          />
          <Text style={styles.label}>Curfew Policy</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g., Strictly no entry after 10 PM"
            multiline
            value={form.curfewPolicy}
            onChangeText={(val) => updateForm('curfewPolicy', val)}
          />
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save Settings</Text>}
        </TouchableOpacity>

        <View style={[styles.sectionCard, { borderColor: theme.colors.error, borderWidth: 1, marginTop: 24, backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>Danger Zone</Text>
          <Text style={styles.sectionSubtitle}>Deleting a property is permanent and will also remove its rooms and bookings.</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.colors.error, marginTop: 0 }]}
            onPress={() => setPasswordModalVisible(true)}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Delete Property</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Deletion</Text>
            <Text style={styles.modalDescription}>Enter your password to delete this property.</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => {
                setPassword('');
                setPasswordModalVisible(false);
              }}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, styles.modalButtonDangerText]}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Selection Modals */}
      <Modal
        visible={propertyTypeModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => setPropertyTypeModalVisible(false)}
      >
        <Pressable style={styles.statusModalOverlay} onPress={() => setPropertyTypeModalVisible(false)}>
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 20 }]}>Select Property Type</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {PROPERTY_TYPES.map((option, index, arr) => {
                const isLast = index === arr.length - 1;
                const isActive = option.value === form.propertyType;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.statusOption, isLast && styles.statusOptionLast]}
                    onPress={() => {
                      updateForm('propertyType', option.value);
                      setPropertyTypeModalVisible(false);
                    }}
                  >
                    <Text style={styles.statusOptionText}>{option.label}</Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setPropertyTypeModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={sexRestrictionModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => setSexRestrictionModalVisible(false)}
      >
        <Pressable style={styles.statusModalOverlay} onPress={() => setSexRestrictionModalVisible(false)}>
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 20 }]}>Select Sex Restriction</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {GENDER_OPTIONS.map((option, index, arr) => {
                const isLast = index === arr.length - 1;
                const isActive = option.value === form.sexRestriction;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.statusOption, isLast && styles.statusOptionLast]}
                    onPress={() => {
                      updateForm('sexRestriction', option.value);
                      setSexRestrictionModalVisible(false);
                    }}
                  >
                    <Text style={styles.statusOptionText}>{option.label}</Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setSexRestrictionModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <Pressable style={styles.statusModalOverlay} onPress={() => setStatusModalVisible(false)}>
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 20 }]}>Select Status</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {STATUS_OPTIONS.map((option, index, arr) => {
                const isLast = index === arr.length - 1;
                const isActive = option.value === form.status;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.statusOption, isLast && styles.statusOptionLast]}
                    onPress={() => {
                      updateForm('status', option.value);
                      setStatusModalVisible(false);
                    }}
                  >
                    <Text style={styles.statusOptionText}>{option.label}</Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* GCash Confirmation Modal */}
      <Modal
        visible={showGcashConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGcashConfirm(false)}
      >
        <Pressable style={styles.passwordModalOverlay} onPress={() => setShowGcashConfirm(false)}>
          <Pressable style={styles.passwordModalCard} onPress={() => { }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                <Ionicons name="shield-checkmark" size={30} color={theme.colors.primary} />
              </View>
              <Text style={styles.passwordModalTitle}>Double Check GCash</Text>
              <Text style={[styles.passwordModalText, { textAlign: 'center', marginTop: 10 }]}>
                Please double check your GCash Name and Number. Incorrect details will result in lost payments.
              </Text>
            </View>

            <View style={{ backgroundColor: theme.colors.backgroundSecondary, padding: 15, borderRadius: 12, marginBottom: 20 }}>
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase' }}>Name</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>{form.gcashName}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase' }}>Number</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>{form.gcashNumber}</Text>
              </View>
            </View>

            <View style={styles.passwordModalActions}>
              <TouchableOpacity
                style={styles.passwordModalCancel}
                onPress={() => setShowGcashConfirm(false)}
              >
                <Text style={styles.passwordModalCancelText}>Review</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.passwordModalConfirm, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setShowGcashConfirm(false);
                  proceedWithSave();
                }}
              >
                <Text style={styles.passwordModalConfirmText}>Confirm & Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
