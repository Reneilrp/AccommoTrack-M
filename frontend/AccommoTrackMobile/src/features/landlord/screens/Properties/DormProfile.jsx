import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import PropertyService from '../../../../services/PropertyService.js';
import { getImageUrl } from '../../../../utils/imageUtils.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStyles } from '../../../../styles/Landlord/DormProfile.js';

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

const GENDER_OPTIONS = [
  { label: 'Mixed (Any Gender)', value: 'mixed' },
  { label: 'Boys Only', value: 'male' },
  { label: 'Girls Only', value: 'female' },
];

const AMENITY_OPTIONS = ['WiFi', 'Air Conditioning', 'Parking', 'Security', 'Kitchen', 'Laundry', 'Water Heater', 'Pet Friendly', 'Generator', 'Gym Access'];

const buildEmptyForm = () => ({
  id: null,
  title: '',
  propertyType: '',
  otherType: '',
  genderRestriction: 'mixed',
  status: 'pending',
  description: '',
  street: '',
  barangay: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'Philippines',
  nearbyLandmarks: '',
  latitude: '',
  longitude: '',
  totalRooms: '',
  availableRooms: '',
  maxOccupants: '',
  amenities: [],
  customAmenities: [],
  rules: [],
  images: [],
  credentials: [],
  acceptedPayments: ['cash'],
  primaryImageId: null,
});

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item.trim() : item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === 'string' ? item.trim() : item)).filter(Boolean);
      }
    } catch (err) {
      // fall through to split
    }
    return value
      .split(/[,\n]/)
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

const mapImages = (images = []) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((image, index) => {
      const uri = getImageUrl(image);
      if (!uri) return null;
      
      return {
        id: image?.id || `remote-${index}`,
        uri,
        is_primary: Boolean(image?.is_primary),
        display_order: image?.display_order ?? index,
        // Keep original object to access backend IDs easily
        raw: image
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.display_order - b.display_order);
};

const normalizeProperty = (data) => {
  const amenities = parseList(data?.amenities_list || data?.amenities);
  const customAmenities = parseList(data?.customAmenities || data?.additional_amenities);
  const rules = parseList(data?.property_rules);
  const images = mapImages(data?.images);
  
  // Find primary image ID
  const primaryImg = images.find(img => img.is_primary);

  const rawType = data?.property_type || '';
  const isStandardType = PROPERTY_TYPES.some(t => t.value === rawType && t.value !== 'others');

  return {
    id: data?.id ?? null,
    title: data?.title || data?.name || '',
    propertyType: isStandardType ? rawType : (rawType ? 'others' : ''),
    otherType: isStandardType ? '' : rawType,
    genderRestriction: data?.gender_restriction || 'mixed',
    status: data?.current_status || 'pending',
    description: data?.description || '',
    street: data?.street_address || '',
    barangay: data?.barangay || '',
    city: data?.city || '',
    province: data?.province || '',
    postalCode: data?.postal_code || '',
    country: data?.country || 'Philippines',
    nearbyLandmarks: data?.nearby_landmarks || '',
    latitude: data?.latitude ? String(data.latitude) : '',
    longitude: data?.longitude ? String(data.longitude) : '',
    totalRooms: data?.total_rooms ? String(data.total_rooms) : '',
    availableRooms: data?.available_rooms ? String(data.available_rooms) : '',
    maxOccupants: data?.max_occupants ? String(data.max_occupants) : '',
    amenities,
    customAmenities,
    rules,
    images,
    credentials: data?.credentials || [],
    videoUrl: data?.video_url || null,
    acceptedPayments: Array.isArray(data?.accepted_payments)
      ? data.accepted_payments
      : ['cash'],
    primaryImageId: primaryImg?.raw?.id || null,
  };
};

export default function DormProfileScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const propertyId = route.params?.propertyId || route.params?.property?.id;
  const [form, setForm] = useState(buildEmptyForm);
  const [baseline, setBaseline] = useState(buildEmptyForm);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newRule, setNewRule] = useState('');
  const [customAmenity, setCustomAmenity] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  
  // Staged deletions
  const [deletedImageIds, setDeletedImageIds] = useState([]);
  const [deletedCredentialIds, setDeletedCredentialIds] = useState([]);
  
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isPayMongoVerified, setIsPayMongoVerified] = useState(false);

  const availableStatusOptions = useMemo(() => {
    if (baseline.status === 'pending' || baseline.status === 'draft') {
      // If currently pending or draft, only allow pending, draft or maintenance. 
      // Active/Inactive require admin approval first.
      return STATUS_OPTIONS.filter(opt => opt.value === 'pending' || opt.value === 'draft' || opt.value === 'maintenance');
    }
    return STATUS_OPTIONS;
  }, [baseline.status]);

  useEffect(() => {
    AsyncStorage.getItem('user').then((s) => {
      if (s) {
        try {
          const u = JSON.parse(s);
          setIsPayMongoVerified(u?.paymongo_verification_status === 'verified');
        } catch (_) {}
      }
    });
  }, []);

  const occupancy = useMemo(() => {
    const total = Number(form.totalRooms) || 0;
    const available = Number(form.availableRooms) || 0;
    const occupied = Math.max(total - available, 0);
    const percentage = total ? Math.round((occupied / total) * 100) : 0;
    return { total, available, occupied, percentage };
  }, [form.totalRooms, form.availableRooms]);

  const loadProperty = useCallback(
    async (fromRefresh = false) => {
      if (!propertyId) {
        setError('Missing property identifier.');
        setLoading(false);
        return;
      }

      fromRefresh ? setRefreshing(true) : setLoading(true);

      try {
        setError('');
        const response = await PropertyService.getProperty(propertyId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to load property');
        }

        const normalized = normalizeProperty(response.data);
        setForm(normalized);
        setBaseline(normalized);
        setSelectedImages([]);
        setIsEditing(false);
      } catch (err) {
        console.error('Failed to load property', err);
        setError(err.message || 'Unable to load property details.');
      } finally {
        fromRefresh ? setRefreshing(false) : setLoading(false);
      }
    },
    [propertyId]
  );

  useEffect(() => {
    loadProperty(false);
  }, [loadProperty]);

  const handleRefresh = useCallback(() => {
    if (!propertyId) return;
    loadProperty(true);
  }, [loadProperty, propertyId]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenity) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((item) => item !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    updateForm('rules', [...form.rules, newRule.trim()]);
    setNewRule('');
  };

  const removeRule = (index) => {
    updateForm('rules', form.rules.filter((_, idx) => idx !== index));
  };

  const addCustomAmenity = () => {
    if (!customAmenity.trim()) return;
    updateForm('customAmenities', [...form.customAmenities, customAmenity.trim()]);
    setCustomAmenity('');
  };

  const removeCustomAmenity = (index) => {
    updateForm('customAmenities', form.customAmenities.filter((_, idx) => idx !== index));
  };

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Enable photo library access to attach property images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (!result.canceled) {
      const assets = result.assets || [];
      const validImages = [];
      const tooLargeFiles = [];

      for (const asset of assets) {
        // Strict 5MB limit check
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          tooLargeFiles.push(asset.fileName || 'Selected image');
        } else {
          validImages.push({
            uri: asset.uri,
            name: asset.fileName || `property-${Date.now()}-${validImages.length}.jpg`,
            type: asset.mimeType || 'image/jpeg'
          });
        }
      }

      if (tooLargeFiles.length > 0) {
        Alert.alert(
          'Files too large',
          `The following images exceed the 5MB limit and were skipped:\n\n${tooLargeFiles.join('\n')}`
        );
      }

      setSelectedImages((prev) => [...prev, ...validImages]);
    }
  };

  const handlePickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Enable photo library access to attach property video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true, // Allow trimming on device
    });

    if (!result.canceled && result.assets.length > 0) {
      const video = result.assets[0];
      
      // Strict 90MB size check
      if (video.fileSize && video.fileSize > 90 * 1024 * 1024) {
        Alert.alert(
          'Video too large', 
          `The selected video is ${(video.fileSize / (1024 * 1024)).toFixed(1)}MB. Please choose a video under 90MB.`
        );
        return;
      }

      // 45 seconds duration check
      if (video.duration && video.duration > 45000) {
        Alert.alert('Video too long', 'Video tours must be 45 seconds or less. Please trim your video.');
        return;
      }

      setSelectedVideo({
        uri: video.uri,
        name: video.fileName || `property-video-${Date.now()}.mp4`,
        type: video.mimeType || 'video/mp4'
      });
    }
  };

  const removeNewImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const removeExistingImage = (index) => {
    setForm((prev) => {
      const removed = prev.images[index];
      if (removed?.raw?.id) {
        setDeletedImageIds((ids) => [...ids, removed.raw.id]);
      }
      return {
        ...prev,
        images: prev.images.filter((_, idx) => idx !== index)
      };
    });
  };

  const setPrimaryImage = (index, isNew = false) => {
    if (isNew) {
      // Currently, setting a newly uploaded image as primary before saving 
      // is complex with current backend logic which expects an ID.
      // We'll prioritize existing images or handle via display_order implicitly.
      Alert.alert('Cover Photo', 'Please save your new images first to set one as the cover photo.');
      return;
    }

    const img = form.images[index];
    if (img?.raw?.id) {
      setForm(prev => ({ ...prev, primaryImageId: img.raw.id }));
      Toast.show({
        type: 'success',
        text1: 'Cover Photo Set',
        text2: 'This image will be shown as the main property photo.'
      });
    }
  };

  const handleCancelEdit = () => {
    setForm(baseline);
    setSelectedImages([]);
    setDeletedImageIds([]);
    setDeletedCredentialIds([]);
    setSelectedVideo(null);
    setNewRule('');
    setCustomAmenity('');
    setError('');
    setIsEditing(false);
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      setError('Property name is required.');
      return false;
    }
    if (!form.propertyType) {
      setError('Please select a property type.');
      return false;
    }
    if (!form.street.trim() || !form.city.trim() || !form.province.trim()) {
      setError('Street, city, and province are required.');
      return false;
    }
    
    // Check if at least one image exists
    if (form.images.length === 0 && selectedImages.length === 0) {
      setError('At least one property image is required.');
      return false;
    }

    setError('');
    return true;
  };

  const buildUpdatePayload = () => {
    const payload = new FormData();
    const selectedType = form.propertyType === 'others' ? form.otherType : form.propertyType;
    const entries = {
      title: form.title.trim(),
      description: form.description.trim(),
      property_type: selectedType,
      gender_restriction: form.genderRestriction,
      current_status: form.status,
      street_address: form.street.trim(),
      barangay: form.barangay.trim(),
      city: form.city.trim(),
      province: form.province.trim(),
      postal_code: form.postalCode.trim(),
      country: form.country.trim(),
      nearby_landmarks: form.nearbyLandmarks.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
      total_rooms: form.totalRooms,
      max_occupants: form.maxOccupants,
      primary_image_id: form.primaryImageId
    };

    Object.entries(entries).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        payload.append(key, String(value));
      }
    });

    const mergedAmenities = Array.from(new Set([...form.amenities, ...form.customAmenities]));
    mergedAmenities.forEach((amenity) => {
      payload.append('amenities[]', amenity);
    });

    form.rules.forEach((rule) => {
      payload.append('property_rules[]', rule);
    });

    // Staged deletions
    deletedImageIds.forEach((id, index) => {
      payload.append(`deleted_images[${index}]`, String(id));
    });
    
    deletedCredentialIds.forEach((id, index) => {
      payload.append(`deleted_credentials[${index}]`, String(id));
    });

    // Payment methods
    const methods = form.acceptedPayments.length ? form.acceptedPayments : ['cash'];
    methods.forEach((method, index) => {
      payload.append(`accepted_payments[${index}]`, method);
    });

    // New images
    selectedImages.forEach((image, index) => {
      payload.append('images[]', {
        uri: image.uri,
        name: image.name,
        type: image.type
      });
    });

    if (selectedVideo) {
      payload.append('video', {
        uri: selectedVideo.uri,
        name: selectedVideo.name,
        type: selectedVideo.type
      });
    }

    return payload;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: error || 'Please check all required fields.'
      });
      return;
    }

    try {
      setSaving(true);
      const payload = buildUpdatePayload();
      const response = await PropertyService.updateProperty(propertyId, payload);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update property');
      }

      Toast.show({
        type: 'success',
        text1: 'Property Updated',
        text2: 'Changes have been saved successfully.'
      });
      
      // Reset staged deletions on success
      setDeletedImageIds([]);
      setDeletedCredentialIds([]);
      
      await loadProperty(false);
    } catch (err) {
      console.error('Failed to update property', err);
      setError(err.message || 'Failed to save changes.');
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: err.message || 'An error occurred while saving.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!password.trim()) {
      setError('Password is required to delete.');
      return;
    }
    try {
      setDeleteLoading(true);
      const response = await PropertyService.deleteProperty(propertyId, password.trim());
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete property');
      }
      setPassword('');
      setPasswordModalVisible(false);
      Alert.alert('Property Deleted', 'The property has been removed.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('MyProperties')
        }
      ]);
    } catch (err) {
      console.error('Delete property failed', err);
      setError(err.message || 'Failed to delete property.');
      Alert.alert('Error', err.message || 'Failed to delete property');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!propertyId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.centered, { padding: 24 }]}>
          <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
            Unable to load property. Please go back and select a property again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButtonBg} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Profile</Text>
        {isEditing ? (
          <TouchableOpacity style={styles.iconButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="save-outline" size={22} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.iconButton} onPress={() => setIsEditing(true)}>
            <Ionicons name="create-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>{form.title || 'Property Name'}</Text>
                <Text style={styles.helperText}>{[form.street, form.city, form.province].filter(Boolean).join(', ') || 'No address set'}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{form.status || 'pending'}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{occupancy.total || 0}</Text>
                <Text style={styles.statLabel}>Total Rooms</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{occupancy.available || 0}</Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{`${occupancy.percentage}%`}</Text>
                <Text style={styles.statLabel}>Occupancy</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('RoomManagement', { propertyId: form.id })}
            >
              <Ionicons name="bed-outline" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>Manage Rooms</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineBtn, styles.outlineBtnBlue]}
              onPress={() => navigation.navigate('Tenants', { propertyId: form.id })}
            >
              <Ionicons name="people-outline" size={20} color="#2563EB" />
              <Text style={{ color: '#2563EB', fontWeight: '600', fontSize: 14 }}>Manage Tenants</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: '#F59E0B' }]}
              onPress={() => navigation.navigate('MaintenanceRequests')}
            >
              <Ionicons name="construct-outline" size={20} color="#F59E0B" />
              <Text style={{ color: '#F59E0B', fontWeight: '600', fontSize: 14 }}>Maintenance Requests</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: '#F43F5E' }]}
              onPress={() => navigation.navigate('Reviews')}
            >
              <Ionicons name="star-outline" size={20} color="#F43F5E" />
              <Text style={{ color: '#F43F5E', fontWeight: '600', fontSize: 14 }}>Guest Reviews</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.outlineBtn, styles.outlineBtnPrimary]}
              onPress={() => navigation.navigate('DormProfileSettings', { propertyId: form.id })}
            >
              <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 14 }}>Property Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.outlineBtn, styles.outlineBtnPrimary]}
              onPress={() => navigation.navigate('AddonManagement', { propertyId: form.id, propertyTitle: form.title })}
            >
              <Ionicons name="sparkles-outline" size={20} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 14 }}>Manage Add-ons</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.outlineBtn, styles.outlineBtnSecondary]}
              onPress={() => navigation.navigate('PropertyActivityLogs', { propertyId: form.id, propertyTitle: form.title })}
            >
              <Ionicons name="list-outline" size={20} color="#6B7280" />
              <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 14 }}>Activity Logs</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <Text style={styles.label}>Property Name <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              placeholder="e.g., Sunrise Residences"
              value={form.title}
              editable={isEditing}
              onChangeText={(text) => updateForm('title', text)}
            />

            <Text style={styles.label}>Property Type <Text style={styles.requiredAsterisk}>*</Text></Text>
            <View style={styles.pickerWrapper} pointerEvents={isEditing ? 'auto' : 'none'}>
              <Picker
                selectedValue={form.propertyType}
                onValueChange={(value) => updateForm('propertyType', value)}
                enabled={isEditing}
                style={styles.picker}
              >
                <Picker.Item label="Select type" value="" />
                {PROPERTY_TYPES.map((type) => (
                  <Picker.Item key={type.value} label={type.label} value={type.value} />
                ))}
              </Picker>
            </View>

            {form.propertyType === 'others' && (
              <TextInput
                style={[styles.input, !isEditing && styles.disabledInput]}
                placeholder="Specify property type"
                value={form.otherType}
                editable={isEditing}
                onChangeText={(text) => updateForm('otherType', text)}
              />
            )}

            {form.propertyType !== 'apartment' && (
              <>
                <Text style={styles.label}>Gender Restriction <Text style={styles.requiredAsterisk}>*</Text></Text>
                <View style={styles.pickerWrapper} pointerEvents={isEditing ? 'auto' : 'none'}>
                  <Picker
                    selectedValue={form.genderRestriction}
                    onValueChange={(value) => updateForm('genderRestriction', value)}
                    enabled={isEditing}
                    style={styles.picker}
                  >
                    {GENDER_OPTIONS.map((opt) => (
                      <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                    ))}
                  </Picker>
                </View>
              </>
            )}

            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerWrapper} pointerEvents={isEditing ? 'auto' : 'none'}>
              <Picker
                selectedValue={form.status}
                onValueChange={(value) => updateForm('status', value)}
                enabled={isEditing}
                style={styles.picker}
              >
                {availableStatusOptions.map((option) => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
            {isEditing && (baseline.status === 'pending' || baseline.status === 'draft') && (
              <Text style={{ fontSize: 11, color: '#92400E', marginTop: 4, fontStyle: 'italic' }}>
                * Properties with Pending or Draft status cannot be set to Active/Inactive until approved by the admin.
              </Text>
            )}

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, !isEditing && styles.disabledInput]}
              placeholder="Describe the property"
              multiline
              editable={isEditing}
              value={form.description}
              onChangeText={(text) => updateForm('description', text)}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.label}>Street <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={form.street}
              editable={isEditing}
              onChangeText={(text) => updateForm('street', text)}
            />
            <Text style={styles.label}>Barangay</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={form.barangay}
              editable={isEditing}
              onChangeText={(text) => updateForm('barangay', text)}
            />
            <Text style={styles.label}>City <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={form.city}
              editable={isEditing}
              onChangeText={(text) => updateForm('city', text)}
            />
            <Text style={styles.label}>Province <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={form.province}
              editable={isEditing}
              onChangeText={(text) => updateForm('province', text)}
            />
            <Text style={styles.label}>Postal Code</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={form.postalCode}
              editable={isEditing}
              keyboardType="number-pad"
              onChangeText={(text) => updateForm('postalCode', text.replace(/[^0-9]/g, ''))}
            />
            <Text style={styles.label}>Nearby Landmarks</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={form.nearbyLandmarks}
              editable={isEditing}
              onChangeText={(text) => updateForm('nearbyLandmarks', text)}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Capacity</Text>
            <Text style={styles.label}>Total Rooms</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={form.totalRooms}
              editable={isEditing}
              keyboardType="number-pad"
              onChangeText={(text) => updateForm('totalRooms', text.replace(/[^0-9]/g, ''))}
            />
            <Text style={styles.label}>Available Rooms</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={form.availableRooms}
              editable={false}
            />
            <Text style={styles.label}>Max Occupants</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={form.maxOccupants}
              editable={isEditing}
              keyboardType="number-pad"
              onChangeText={(text) => updateForm('maxOccupants', text.replace(/[^0-9]/g, ''))}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <Text style={styles.helperText}>Tap to toggle amenities available for tenants.</Text>
            <View style={styles.pillGrid}>
              {AMENITY_OPTIONS.map((amenity) => {
                const active = form.amenities.includes(amenity);
                return (
                  <TouchableOpacity
                    key={amenity}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => isEditing && toggleAmenity(amenity)}
                    activeOpacity={isEditing ? 0.8 : 1}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{amenity}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {form.customAmenities.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.label}>Custom Amenities</Text>
                {form.customAmenities.map((amenity, index) => (
                  <View key={`${amenity}-${index}`} style={styles.ruleItem}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={{ flex: 1, color: theme.colors.text }}>{amenity}</Text>
                    {isEditing && (
                      <TouchableOpacity onPress={() => removeCustomAmenity(index)}>
                        <Ionicons name="close-circle" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {isEditing && (
              <View style={styles.inlineInputRow}>
                <TextInput
                  style={styles.inlineInput}
                  placeholder="Add custom amenity"
                  value={customAmenity}
                  onChangeText={setCustomAmenity}
                  onSubmitEditing={addCustomAmenity}
                />
                <TouchableOpacity style={styles.inlineAddButton} onPress={addCustomAmenity}>
                  <Text style={styles.inlineAddButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Property Rules</Text>
            {form.rules.length === 0 ? (
              <Text style={styles.helperText}>No rules have been added yet.</Text>
            ) : (
              form.rules.map((rule, index) => (
                <View key={`${rule}-${index}`}>
                  <View style={styles.ruleItem}>
                    <Ionicons name="information-circle" size={16} color={theme.colors.primary} />
                    <Text style={{ flex: 1, color: theme.colors.text }}>{rule}</Text>
                    {isEditing && (
                      <TouchableOpacity onPress={() => removeRule(index)}>
                        <Ionicons name="close-circle" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {index < form.rules.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}

            {isEditing && (
              <View style={styles.inlineInputRow}>
                <TextInput
                  style={styles.inlineInput}
                  placeholder="Add a new rule"
                  value={newRule}
                  onChangeText={setNewRule}
                  onSubmitEditing={addRule}
                />
                <TouchableOpacity style={styles.inlineAddButton} onPress={addRule}>
                  <Text style={styles.inlineAddButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Photos</Text>
            {form.images.length === 0 && selectedImages.length === 0 ? (
              <Text style={styles.helperText}>No photos uploaded yet.</Text>
            ) : (
              <View style={styles.imagesRow}>
                {form.images.map((image, idx) => {
                  const isPrimary = image.raw?.id === form.primaryImageId;
                  return (
                    <View 
                      key={image.id} 
                      style={[
                        styles.imagePreview,
                        isPrimary && { borderColor: '#F59E0B', borderWidth: 2 }
                      ]}
                    >
                      <Image source={{ uri: image.uri }} style={styles.imageFull} />
                      {isEditing && (
                        <View style={styles.imageOverlay}>
                          <TouchableOpacity 
                            style={[styles.imageAction, { backgroundColor: isPrimary ? '#F59E0B' : 'rgba(0,0,0,0.5)' }]}
                            onPress={() => setPrimaryImage(idx)}
                          >
                            <Ionicons name={isPrimary ? "star" : "star-outline"} size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.imageAction, { backgroundColor: '#DC2626' }]}
                            onPress={() => removeExistingImage(idx)}
                          >
                            <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      )}
                      {isPrimary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>COVER</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
                {selectedImages.map((image, index) => (
                  <View key={`${image.uri}-${index}`} style={styles.imagePreview}>
                    <Image source={{ uri: image.uri }} style={styles.imageFull} />
                    <TouchableOpacity style={styles.imageRemove} onPress={() => removeNewImage(index)}>
                      <Ionicons name="trash" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={[styles.primaryBadge, { backgroundColor: '#3B82F6' }]}>
                      <Text style={styles.primaryBadgeText}>NEW</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {isEditing && (
              <TouchableOpacity style={[styles.addImageButton, { marginTop: 12 }]} onPress={handlePickImages}>
                <Ionicons name="add" size={28} color="#94A3B8" />
                <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Add Photo (Max 5MB)</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Video Tour</Text>
            {!form.videoUrl && !selectedVideo ? (
              <Text style={styles.helperText}>No video tour uploaded yet.</Text>
            ) : (
              <View style={styles.imagesRow}>
                {selectedVideo ? (
                  <View style={styles.imagePreview}>
                    <View style={styles.videoThumbnail}>
                       <Ionicons name="play-circle" size={40} color="#FFFFFF" />
                    </View>
                    <TouchableOpacity style={styles.imageRemove} onPress={() => setSelectedVideo(null)}>
                      <Ionicons name="trash" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.badgePill}>
                       <Text style={styles.badgeTextPill}>NEW VIDEO</Text>
                    </View>
                  </View>
                ) : form.videoUrl ? (
                  <View style={styles.imagePreview}>
                    <View style={styles.videoThumbnail}>
                       <Ionicons name="play-circle" size={40} color="#FFFFFF" />
                    </View>
                    <View style={styles.badgePill}>
                       <Text style={styles.badgeTextPill}>CURRENT VIDEO</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {isEditing && (
              <TouchableOpacity style={[styles.addImageButton, { marginTop: 12 }]} onPress={handlePickVideo}>
                <Ionicons name="videocam" size={28} color="#94A3B8" />
                <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, textAlign: 'center' }}>Add Video{'\n'}(Max 45s, 90MB)</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Credentials Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Property Credentials</Text>
            {form.credentials.length === 0 ? (
              <Text style={styles.helperText}>No business documents uploaded yet.</Text>
            ) : (
              form.credentials.map((cred, idx) => {
                const name = cred.original_name || cred.name || `Document ${idx + 1}`;
                const url = cred.file_url || cred.file_path || cred.url;
                
                return (
                  <View key={cred.id || idx} style={styles.credentialItem}>
                    <View style={styles.credentialInfo}>
                      <Ionicons name="document-text-outline" size={24} color="#6B7280" />
                      <Text style={styles.credentialName} numberOfLines={1}>{name}</Text>
                    </View>
                    <View style={styles.credentialActions}>
                      {url && (
                        <TouchableOpacity 
                          style={styles.credActionBtn}
                          onPress={() => {
                            const fullUrl = getImageUrl(url);
                            if (fullUrl) {
                              import('react-native').then(({ Linking }) => {
                                Linking.openURL(fullUrl);
                              });
                            }
                          }}
                        >
                          <Text style={styles.credActionText}>View</Text>
                        </TouchableOpacity>
                      )}
                      {isEditing && (
                        <TouchableOpacity 
                          style={[styles.credActionBtn, { marginLeft: 10 }]}
                          onPress={() => {
                            setForm(prev => {
                              const creds = [...prev.credentials];
                              const removed = creds.splice(idx, 1);
                              if (removed[0]?.id) {
                                setDeletedCredentialIds(ids => [...ids, removed[0].id]);
                              }
                              return { ...prev, credentials: creds };
                            });
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#DC2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
            {isEditing && (
              <Text style={[styles.helperText, { marginTop: 10, fontStyle: 'italic' }]}>
                To upload new credentials, please use the web dashboard.
              </Text>
            )}
          </View>

          {/* Payment Methods */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Accepted Payment Methods</Text>
            {!isPayMongoVerified && !isEditing && (
              <Text style={styles.helperText}>Only Cash accepted (PayMongo not connected).</Text>
            )}

            {/* Cash row */}
            <TouchableOpacity
              disabled={!isEditing}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: isEditing ? 1 : 0.95 }}
              onPress={() => {
                if (!isEditing) return;
                const current = form.acceptedPayments;
                if (current.includes('cash')) {
                  if (current.length === 1) return;
                  updateForm('acceptedPayments', current.filter((m) => m !== 'cash'));
                } else {
                  updateForm('acceptedPayments', [...current, 'cash']);
                }
              }}
            >
              <Ionicons
                name={form.acceptedPayments.includes('cash') ? 'checkbox' : 'square-outline'}
                size={22}
                color={isEditing ? theme.colors.primary : theme.colors.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>Cash</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>In-person cash payment</Text>
              </View>
              {form.acceptedPayments.includes('cash') && (
                <View style={{ backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#065F46' }}>Active</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Online row */}
            <TouchableOpacity
              disabled={!isEditing}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: (isEditing && isPayMongoVerified) ? 1 : 0.5 }}
              onPress={() => {
                if (!isEditing) return;
                if (!isPayMongoVerified) {
                  Alert.alert(
                    'PayMongo Not Verified',
                    'You need to complete PayMongo verification before enabling online payments.\n\nGo to Settings > Payments to connect your account.',
                    [{ text: 'OK' }]
                  );
                  return;
                }
                const current = form.acceptedPayments;
                if (current.includes('online')) {
                  updateForm('acceptedPayments', current.filter((m) => m !== 'online'));
                } else {
                  updateForm('acceptedPayments', [...current, 'online']);
                }
              }}
            >
              <Ionicons
                name={form.acceptedPayments.includes('online') ? 'checkbox' : 'square-outline'}
                size={22}
                color={isPayMongoVerified && isEditing ? '#2563EB' : '#9CA3AF'}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: isPayMongoVerified ? theme.colors.text : theme.colors.textTertiary }}>
                  Online (GCash, Maya, GrabPay)
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Via PayMongo</Text>
              </View>
              {form.acceptedPayments.includes('online') && (
                <View style={{ backgroundColor: '#DBEAFE', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF' }}>Active</Text>
                </View>
              )}
            </TouchableOpacity>

            {isEditing && !isPayMongoVerified && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginTop: 6 }}>
                <Ionicons name="alert-circle-outline" size={15} color="#92400E" />
                <Text style={{ flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 }}>
                  PayMongo not connected. Go to{' '}
                  <Text style={{ fontWeight: '700' }}>Settings {'>'} Payments</Text> to verify.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.dangerCard}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>
            <Text style={styles.dangerText}>Deleting a property is permanent and will also remove its rooms and bookings.</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={() => setPasswordModalVisible(true)}>
              <Text style={styles.deleteButtonText}>Delete Property</Text>
            </TouchableOpacity>
          </View>

          {isEditing && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.inputHalf]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.actionButtonText}>Save Changes</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton, styles.inputHalf]}
                onPress={handleCancelEdit}
                disabled={saving}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={passwordModalVisible} transparent animationType="fade" onRequestClose={() => setPasswordModalVisible(false)}>
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
    </SafeAreaView>
  );
}

