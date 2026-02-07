import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import PropertyService from '../../../services/PropertyServices';
import { styles } from '../../../styles/Landlord/AddProperty.js';
import { useTheme } from '../../../contexts/ThemeContext';

const PROPERTY_TYPES = [
  { label: 'Dormitory', value: 'dormitory' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'Boarding House', value: 'boardingHouse' },
  { label: 'Bed Spacer', value: 'bedSpacer' },
  { label: 'Others', value: 'others' }
];

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
];

const AMENITIES = ['WiFi', 'Air Conditioning', 'Parking', 'Security', 'Kitchen', 'Laundry', 'Water Heater', 'Pet Friendly'];

const initialForm = {
  title: '',
  propertyType: '',
  otherType: '',
  currentStatus: 'pending',
  description: '',
  street: '',
  barangay: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'Philippines',
  latitude: null,
  longitude: null,
  nearbyLandmarks: '',
  totalRooms: '',
  maxOccupants: '',
  amenities: [],
  rules: []
};

export default function AddProperty({ navigation }) {
  const { theme } = useTheme();
  const [form, setForm] = useState(initialForm);
  const [selectedImages, setSelectedImages] = useState([]);
  const [newRule, setNewRule] = useState('');
  const [customAmenity, setCustomAmenity] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const webviewRef = useRef(null);

  const leafletHTML = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>html,body,#map{height:100%;margin:0;padding:0} #map{border-radius:12px}</style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          var map = L.map('map').setView([6.921, 122.079], 12);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
          var marker = null;
          function placeMarker(latlng) {
            if (marker) marker.setLatLng(latlng);
            else marker = L.marker(latlng).addTo(map);
          }
          map.on('click', function(e) {
            var lat = e.latlng.lat;
            var lon = e.latlng.lng;
            placeMarker(e.latlng);
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lon: lon }));
            }
          });
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(pos) {
              map.setView([pos.coords.latitude, pos.coords.longitude], 14);
            });
          }
        </script>
      </body>
    </html>
  `, []);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenity) => {
    setForm((prev) => {
      const exists = prev.amenities.includes(amenity);
      const amenities = exists
        ? prev.amenities.filter((item) => item !== amenity)
        : [...prev.amenities, amenity];
      return { ...prev, amenities };
    });
  };

  const addCustomAmenity = () => {
    if (!customAmenity.trim()) return;
    updateForm('amenities', [...form.amenities, customAmenity.trim()]);
    setCustomAmenity('');
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    updateForm('rules', [...form.rules, newRule.trim()]);
    setNewRule('');
  };

  const removeRule = (index) => {
    updateForm('rules', form.rules.filter((_, idx) => idx !== index));
  };

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to upload property images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (!result.canceled) {
      const mapped = result.assets.map((asset, idx) => ({
        uri: asset.uri,
        name: asset.fileName || `property-${Date.now()}-${idx}.jpg`,
        type: asset.mimeType || 'image/jpeg'
      }));
      setSelectedImages((prev) => [...prev, ...mapped]);
    }
  };

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const onMapMessage = async (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data || '{}');
      if (payload.lat && payload.lon) {
        setForm((prev) => ({ ...prev, latitude: payload.lat, longitude: payload.lon }));
        setLoadingAddress(true);
        const res = await PropertyService.reverseGeocode(payload.lat, payload.lon);
        setLoadingAddress(false);
        if (res.success && res.data?.address) {
          const addr = res.data.address;
          setForm((prev) => ({
            ...prev,
            street: addr.road || addr.pedestrian || addr.house_number || prev.street,
            barangay: addr.suburb || addr.village || addr.neighbourhood || prev.barangay,
            city: addr.city || addr.town || addr.county || prev.city,
            province: addr.state || addr.region || prev.province,
            postalCode: addr.postcode || prev.postalCode,
            country: addr.country || prev.country
          }));
        } else {
          Alert.alert('Map', 'Unable to resolve the selected location.');
        }
      }
    } catch (err) {
      console.error('Map selection error', err);
    }
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
    if (form.propertyType === 'others' && !form.otherType.trim()) {
      setError('Please specify the property type.');
      return false;
    }
    if (!form.street.trim() || !form.city.trim() || !form.province.trim()) {
      setError('Street, city, and province are required.');
      return false;
    }
    if (!form.latitude || !form.longitude) {
      setError('Please pin the property on the map.');
      return false;
    }
    setError('');
    return true;
  };

  const buildPayload = () => {
    const payload = new FormData();
    const propertyType = form.propertyType === 'others' ? form.otherType : form.propertyType;

    const entries = {
      title: form.title.trim(),
      description: form.description.trim(),
      property_type: propertyType,
      current_status: form.currentStatus,
      street_address: form.street.trim(),
      barangay: form.barangay.trim(),
      city: form.city.trim(),
      province: form.province.trim(),
      postal_code: form.postalCode.trim(),
      country: form.country.trim() || 'Philippines',
      latitude: form.latitude,
      longitude: form.longitude,
      nearby_landmarks: form.nearbyLandmarks.trim(),
      total_rooms: form.totalRooms || 0,
      max_occupants: form.maxOccupants || 0,
      property_rules: form.rules.length ? JSON.stringify(form.rules) : null
    };

    Object.entries(entries).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        payload.append(key, String(value));
      }
    });

    form.amenities.forEach((amenity, index) => {
      payload.append(`amenities[${index}]`, amenity);
    });

    selectedImages.forEach((image, index) => {
      payload.append(`images[${index}]`, image);
    });

    return payload;
  };

  const handleSaveProperty = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const payload = buildPayload();
      const res = await PropertyService.createProperty(payload);
      if (res.success) {
        Alert.alert('Success', 'Property submitted successfully.', [
          {
            text: 'Go to My Properties',
            onPress: () => navigation.navigate('MyProperties')
          }
        ]);
      } else {
        setError(res.error || 'Failed to create property');
      }
    } catch (err) {
      console.error('Create property error', err);
      setError(err.message || 'Unexpected error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Property</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Text style={styles.label}>Property Name <Text style={styles.requiredAsterisk}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Sunrise Residences"
            value={form.title}
            onChangeText={(text) => updateForm('title', text)}
          />

          <Text style={styles.label}>Property Type <Text style={styles.requiredAsterisk}>*</Text></Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={form.propertyType}
              onValueChange={(value) => updateForm('propertyType', value)}
            >
              <Picker.Item label="Select type" value="" />
              {PROPERTY_TYPES.map((type) => (
                <Picker.Item key={type.value} label={type.label} value={type.value} />
              ))}
            </Picker>
          </View>

          {form.propertyType === 'others' && (
            <TextInput
              style={styles.input}
              placeholder="Specify property type"
              value={form.otherType}
              onChangeText={(text) => updateForm('otherType', text)}
            />
          )}

          <Text style={styles.label}>Status</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={form.currentStatus}
              onValueChange={(value) => updateForm('currentStatus', value)}
            >
              {STATUS_OPTIONS.map((status) => (
                <Picker.Item key={status.value} label={status.label} value={status.value} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your property, facilities, nearby points of interest, and policies."
            multiline
            value={form.description}
            onChangeText={(text) => updateForm('description', text)}
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location</Text>
            {loadingAddress && <ActivityIndicator size="small" color={theme.colors.primary} />}
          </View>
          <Text style={styles.helperText}>Tap the map to drop a pin and auto-fill the address.</Text>
          <View style={styles.mapContainer}>
            <WebView
              ref={webviewRef}
              originWhitelist={['*']}
              source={{ html: leafletHTML }}
              javaScriptEnabled
              onMessage={onMapMessage}
            />
          </View>

          <Text style={styles.label}>Street <Text style={styles.requiredAsterisk}>*</Text></Text>
          <TextInput style={styles.input} value={form.street} onChangeText={(text) => updateForm('street', text)} />
          <Text style={styles.label}>Barangay</Text>
          <TextInput style={styles.input} value={form.barangay} onChangeText={(text) => updateForm('barangay', text)} />
          <Text style={styles.label}>City <Text style={styles.requiredAsterisk}>*</Text></Text>
          <TextInput style={styles.input} value={form.city} onChangeText={(text) => updateForm('city', text)} />
          <Text style={styles.label}>Province <Text style={styles.requiredAsterisk}>*</Text></Text>
          <TextInput style={styles.input} value={form.province} onChangeText={(text) => updateForm('province', text)} />
          <Text style={styles.label}>Postal Code</Text>
          <TextInput style={styles.input} value={form.postalCode} onChangeText={(text) => updateForm('postalCode', text)} />
          <Text style={styles.label}>Nearby Landmarks</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Near university, beside mall"
            value={form.nearbyLandmarks}
            onChangeText={(text) => updateForm('nearbyLandmarks', text)}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Capacity</Text>
          <Text style={styles.label}>Total Rooms</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={form.totalRooms}
            onChangeText={(text) => updateForm('totalRooms', text.replace(/[^0-9]/g, ''))}
          />
          <Text style={styles.label}>Max Occupants</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={form.maxOccupants}
            onChangeText={(text) => updateForm('maxOccupants', text.replace(/[^0-9]/g, ''))}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <Text style={styles.helperText}>Tap to toggle amenities available in your property.</Text>
          <View style={styles.pillGrid}>
            {AMENITIES.map((amenity) => {
              const active = form.amenities.includes(amenity);
              return (
                <TouchableOpacity
                  key={amenity}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => toggleAmenity(amenity)}
                >
                  <Text style={styles.pillText}>{amenity}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Add Custom Amenity</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Study Lounge"
            value={customAmenity}
            onChangeText={setCustomAmenity}
            onSubmitEditing={addCustomAmenity}
          />
          <TouchableOpacity style={styles.pill} onPress={addCustomAmenity}>
            <Text style={[styles.pillText, { color: theme.colors.primary }]}>Add Amenity</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Property Rules</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter a rule and press add"
            value={newRule}
            onChangeText={setNewRule}
            onSubmitEditing={addRule}
          />
          <TouchableOpacity style={styles.pill} onPress={addRule}>
            <Text style={[styles.pillText, { color: theme.colors.primary }]}>Add Rule</Text>
          </TouchableOpacity>

          {form.rules.map((rule, index) => (
            <View key={`${rule}-${index}`}>
              <View style={styles.ruleItem}>
                <Text style={{ flex: 1, color: '#111827' }}>{rule}</Text>
                <TouchableOpacity onPress={() => removeRule(index)}>
                  <Ionicons name="close-circle" size={18} color="#B91C1C" />
                </TouchableOpacity>
              </View>
              {index < form.rules.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.imagesRow}>
            {selectedImages.map((image, index) => (
              <View key={`${image.uri}-${index}`} style={styles.imagePreview}>
                <Image source={{ uri: image.uri }} style={{ width: '100%', height: '100%' }} />
                <TouchableOpacity style={styles.imageRemove} onPress={() => removeImage(index)}>
                  <Ionicons name="trash" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addImageButton} onPress={handlePickImages}>
              <Ionicons name="add" size={28} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handleSaveProperty} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.actionButtonText}>Save Property</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
