import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  Switch,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import PropertyService from '../../../../services/PropertyService.js';
import { getStyles } from '../../../../styles/Landlord/DormProfile.js';

const GENDER_OPTIONS = [
  { label: 'Mixed (Any Gender)', value: 'mixed' },
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

const buildEmptyForm = () => ({
  id: null,
  propertyType: '',
  genderRestriction: 'mixed',
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
  maxOccupants: '',
  bedrooms: '0',
  bathrooms: '0',
  floorArea: '',
  totalFloors: '1',
  floorLevel: [],
  curfewTime: '',
  curfewPolicy: '',
  require1MonthAdvance: false,
  allowPartialPayments: true,
  requireReservationFee: false,
  reservationFeeAmount: '',
});

const normalizeSettings = (data) => {
  let parsedRules = [];
  try {
    parsedRules = typeof data?.property_rules === 'string' 
      ? JSON.parse(data.property_rules) 
      : (data?.property_rules || []);
  } catch (e) { parsedRules = []; }

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
    genderRestriction: data?.gender_restriction || 'mixed',
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
    maxOccupants: data?.max_occupants ? String(data.max_occupants) : '',
    bedrooms: data?.number_of_bedrooms ? String(data.number_of_bedrooms) : '0',
    bathrooms: data?.number_of_bathrooms ? String(data.number_of_bathrooms) : '0',
    floorArea: data?.floor_area ? String(data.floor_area) : '',
    totalFloors: data?.total_floors ? String(data.total_floors) : '1',
    floorLevel: data?.floor_level ? String(data.floor_level).split(',').filter(Boolean) : [],
    curfewTime: data?.curfew_time || '',
    curfewPolicy: data?.curfew_policy || '',
    require1MonthAdvance: !!data?.require_1month_advance,
    allowPartialPayments: data?.allow_partial_payments !== undefined ? !!data.allow_partial_payments : true,
    requireReservationFee: !!data?.require_reservation_fee,
    reservationFeeAmount: data?.reservation_fee_amount ? String(data.reservation_fee_amount) : '',
  };
};

export default function DormProfileSettings({ route, navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const propertyId = route.params?.propertyId;
  const [form, setForm] = useState(buildEmptyForm);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState('');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadSettings = useCallback(async (fromRefresh = false) => {
    if (!propertyId) return;
    fromRefresh ? setRefreshing(true) : setLoading(true);

    try {
      const response = await PropertyService.getProperty(propertyId);
      if (response.success) {
        setForm(normalizeSettings(response.data));
      }
    } catch (err) {
      console.error('Failed to load settings', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load property settings.'
      });
    } finally {
      fromRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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
      // Web logic: check 45s duration
      if (asset.duration && asset.duration > 45000) {
        Toast.show({ type: 'error', text1: 'Video too long', text2: 'Video must be 45 seconds or less.' });
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
    // Note: DocumentPicker is better for general files, but using ImagePicker for simplicity 
    // since most credentials are photos of permits.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const name = asset.uri.split('/').pop();
      setForm(prev => ({
        ...prev,
        credentials: [...prev.credentials, { uri: asset.uri, name, isExisting: false }]
      }));
    }
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

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('description', form.description);
      payload.append('property_type', form.propertyType);
      payload.append('gender_restriction', form.genderRestriction);
      payload.append('current_status', form.status);
      payload.append('street_address', form.streetAddress);
      payload.append('barangay', form.barangay);
      payload.append('city', form.city);
      payload.append('province', form.province);
      payload.append('postal_code', form.postalCode);
      if (form.latitude) payload.append('latitude', String(form.latitude));
      if (form.longitude) payload.append('longitude', String(form.longitude));
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
      payload.append('require_reservation_fee', form.requireReservationFee ? '1' : '0');
      payload.append('reservation_fee_amount', form.reservationFeeAmount);
      
      // Add amenities individually (PHP handles multiple values with the same name if it ends in [])
      form.amenities.forEach(amenity => {
        payload.append('amenities[]', amenity);
      });
      
      // Rules as JSON string
      payload.append('property_rules', JSON.stringify(form.rules));

      // Handle Deleted Items
      form.deletedImageIds.forEach(id => payload.append('deleted_images[]', id));
      form.deletedCredentialIds.forEach(id => payload.append('deleted_credentials[]', id));
      if (form.deleteExistingVideo) payload.append('delete_existing_video', '1');

      // Upload New Images
      form.images.filter(img => !img.isExisting).forEach((img, idx) => {
        payload.append('images[]', {
          uri: img.uri,
          name: `image_${idx}.jpg`,
          type: 'image/jpeg'
        });
      });

      // Upload New Video
      if (form.video && !form.video.isExisting) {
        payload.append('video', {
          uri: form.video.uri,
          name: 'video_tour.mp4',
          type: 'video/mp4'
        });
      }

      // Upload New Credentials
      form.credentials.filter(c => !c.isExisting).forEach((c, idx) => {
        payload.append('credentials[]', {
          uri: c.uri,
          name: c.name || `credential_${idx}.jpg`,
          type: 'image/jpeg'
        });
      });
      
      // PropertyService.updateProperty handles multipart/form-data and _method spoofing
      const response = await PropertyService.updateProperty(propertyId, payload);
      
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Settings Updated',
          text2: 'Property settings have been saved.'
        });
        navigation.goBack();
      } else {
        throw new Error(response.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error('Save failed', err);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: err.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!password.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Password is required to delete.' });
      return;
    }
    try {
      setDeleteLoading(true);
      const response = await PropertyService.deleteProperty(propertyId, password.trim());
      if (response.success) {
        Toast.show({ type: 'success', text1: 'Deleted', text2: 'Property deleted successfully.' });
        setPasswordModalVisible(false);
        setPassword('');
        // Go back to the properties list
        navigation.navigate('MyProperties', { refresh: true });
      } else {
        throw new Error(response.error || 'Failed to delete property');
      }
    } catch (err) {
      console.error('Delete failed', err);
      Toast.show({ type: 'error', text1: 'Delete Failed', text2: err.message });
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

  const isGenderRestricted = ['dormitory', 'boardingHouse', 'bedSpacer'].includes(form.propertyType);

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSettings(true)} />}
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
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={form.propertyType}
              onValueChange={(val) => updateForm('propertyType', val)}
              style={styles.picker}
            >
              <Picker.Item label="Select Type" value="" />
              {PROPERTY_TYPES.map(t => <Picker.Item key={t.value} label={t.label} value={t.value} />)}
            </Picker>
          </View>

          {isGenderRestricted && (
            <>
              <Text style={styles.label}>Gender Restriction</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={form.genderRestriction}
                  onValueChange={(val) => updateForm('genderRestriction', val)}
                  style={styles.picker}
                >
                  {GENDER_OPTIONS.map(o => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
                </Picker>
              </View>
            </>
          )}

          <Text style={styles.label}>Status</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={form.status}
              onValueChange={(val) => updateForm('status', val)}
              style={styles.picker}
            >
              {STATUS_OPTIONS.map(o => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
            </Picker>
          </View>

          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
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
            <View style={{ position: 'relative', width: '100%', aspectRatio: 16/9, borderRadius: 12, overflow: 'hidden' }}>
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

          <View style={[styles.switchRowContainer, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Require Reservation Fee</Text>
              <Text style={styles.switchHelpText}>Deductible from the first month's rent.</Text>
            </View>
            <Switch
              value={form.requireReservationFee}
              onValueChange={(val) => updateForm('requireReservationFee', val)}
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
            </View>
          )}
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
