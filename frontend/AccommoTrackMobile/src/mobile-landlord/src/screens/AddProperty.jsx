import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import PropertyService from '../../../services/PropertyServices';
import ProfileService from '../../../services/ProfileService';
import { styles } from '../../../styles/Landlord/AddProperty.js';
import { useTheme } from '../../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const PROPERTY_TYPES = [
  { label: 'Dormitory', value: 'dormitory' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'Boarding House', value: 'boardingHouse' },
  { label: 'Bed Spacer', value: 'bedSpacer' },
  { label: 'Others', value: 'others' }
];

const AMENITIES_SUGGESTIONS = [
  'WiFi', 'Air Conditioning', 'Furnished',
  'Parking', 'Security', 'Water Heater',
  'Kitchen', 'Laundry', 'Pet Friendly', 'Balcony'
];

const RULES_SUGGESTIONS = [
  'No smoking', 'No pets allowed', 'No visitors after 10 PM',
  'Quiet hours: 10 PM - 6 AM', 'Keep common areas clean',
  'No cooking in rooms', 'Respect other tenants'
];

const initialForm = {
  title: '',
  propertyType: '',
  otherType: '',
  description: '',
  street: '',
  barangay: '',
  city: '',
  province: 'Zamboanga Del Sur',
  postalCode: '',
  country: 'Philippines',
  latitude: null,
  longitude: null,
  nearbyLandmarks: '',
  totalRooms: '',
  maxOccupants: '',
  amenities: [],
  rules: [],
  isEligible: false
};

const STEPS = [
  { id: 1, title: 'Basic Info', icon: 'information-circle' },
  { id: 2, title: 'Location', icon: 'map' },
  { id: 3, title: 'Rules & Perks', icon: 'list' },
  { id: 4, title: 'Credentials', icon: 'shield-checkmark' }
];

export default function AddProperty({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [selectedImages, setSelectedImages] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [newRule, setNewRule] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(null); // null = loading
  const [successModal, setSuccessModal] = useState({ visible: false, isDraft: false });
  const webviewRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    checkVerification();
  }, []);

  const checkVerification = async () => {
    try {
      const res = await ProfileService.getVerificationStatus();
      setIsVerified(res.data?.status === 'approved' || res.data?.user?.is_verified === true);
    } catch (err) {
      setIsVerified(false);
    }
  };

  const leafletHTML = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html,body,#map{height:100%;margin:0;padding:0;touch-action:none;} 
          #map{border-radius:12px}
          .leaflet-control-attribution { display: none; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          var map = L.map('map', {
            tap: false,
            zoomControl: true,
            touchZoom: true,
            dragging: true
          }).setView([6.921, 122.079], 12);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
            maxZoom: 19
          }).addTo(map);
          
          var marker = null;
          function placeMarker(latlng) {
            if (marker) marker.setLatLng(latlng);
            else marker = L.marker(latlng).addTo(map);
          }

          // Use native touch events for faster interaction detection
          document.addEventListener('touchstart', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'interaction', state: 'start' }));
          }, {passive: true});

          document.addEventListener('touchend', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'interaction', state: 'end' }));
          }, {passive: true});

          map.on('click', function(e) {
            var lat = e.latlng.lat;
            var lon = e.latlng.lng;
            placeMarker(e.latlng);
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'location', lat: lat, lon: lon }));
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
    setForm((prev) => {
      let updated = { ...prev, [field]: value };
      if (field === 'city' && value.trim().toLowerCase() === 'zamboanga city') {
        updated.province = 'Zamboanga Del Sur';
        updated.country = 'Philippines';
      }
      return updated;
    });
  };

  const toggleAmenity = (amenity) => {
    setForm((prev) => {
      const amenities = prev.amenities.includes(amenity)
        ? prev.amenities.filter((item) => item !== amenity)
        : [...prev.amenities, amenity];
      return { ...prev, amenities };
    });
  };

  const toggleRule = (rule) => {
    setForm((prev) => {
      const rules = prev.rules.includes(rule)
        ? prev.rules.filter((item) => item !== rule)
        : [...prev.rules, rule];
      return { ...prev, rules };
    });
  };

  const addCustomRule = () => {
    if (!newRule.trim()) return;
    updateForm('rules', [...form.rules, newRule.trim()]);
    setNewRule('');
  };

  const addCustomAmenity = () => {
    if (!newAmenity.trim()) return;
    updateForm('amenities', [...form.amenities, customAmenity.trim()]);
    setNewAmenity('');
  };

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access.');
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

  const handlePickCredentials = async () => {
    // For simplicity using ImagePicker, but could use DocumentPicker for PDF
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (!result.canceled) {
      const mapped = result.assets.map((asset, idx) => ({
        uri: asset.uri,
        name: asset.fileName || `credential-${Date.now()}-${idx}.jpg`,
        type: asset.mimeType || 'image/jpeg'
      }));
      setCredentials((prev) => [...prev, ...mapped]);
    }
  };

  const onMapMessage = async (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data || '{}');
      
      if (payload.type === 'interaction') {
        if (payload.state === 'start') {
          setScrollEnabled(false);
        } else {
          setScrollEnabled(true);
        }
        return;
      }

      if (payload.type === 'location' && payload.lat && payload.lon) {
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
        }
      }
    } catch (err) {
      console.error('Map selection error', err);
    }
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!form.title.trim()) return 'Property name is required';
      if (!form.propertyType) return 'Property type is required';
      if (form.propertyType === 'others' && !form.otherType.trim()) return 'Please specify property type';
    } else if (step === 2) {
      if (!form.street.trim()) return 'Street address is required';
      if (!form.city.trim()) return 'City is required';
      if (!form.latitude || !form.longitude) return 'Please pin the property on the map';
    } else if (step === 4) {
      if (form.isEligible && credentials.length === 0) return 'Credentials are required for eligible properties';
    }
    return null;
  };

  const handleNext = () => {
    const errorMsg = validateStep(currentStep);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    setError('');
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const buildPayload = (isDraft = false) => {
    const payload = new FormData();
    const propertyType = form.propertyType === 'others' ? form.otherType : form.propertyType;

    const entries = {
      title: form.title.trim(),
      description: form.description.trim(),
      property_type: propertyType,
      current_status: isDraft ? 'draft' : 'pending',
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
      property_rules: form.rules.length ? JSON.stringify(form.rules) : null,
      is_eligible: form.isEligible ? '1' : '0',
      is_draft: isDraft ? '1' : '0'
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
      payload.append(`images[${index}]`, {
        uri: image.uri,
        name: image.name,
        type: image.type
      });
    });

    credentials.forEach((file, index) => {
      payload.append(`credentials[${index}]`, {
        uri: file.uri,
        name: file.name,
        type: file.type
      });
    });

    return payload;
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedImages([]);
    setCredentials([]);
    setCurrentStep(1);
    setError('');
  };

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft) {
      const errorMsg = validateStep(4);
      if (errorMsg) {
        setError(errorMsg);
        return;
      }
    }

    try {
      setSaving(true);
      setError('');
      const payload = buildPayload(isDraft);
      const res = await PropertyService.createProperty(payload);
      if (res.success) {
        setSuccessModal({ visible: true, isDraft });
        // Reset form state so if they come back it's empty
        resetForm();
      } else {
        setError(res.error || 'Failed to save property');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepsContainer}>
      {STEPS.map((step, index) => (
        <View key={step.id} style={styles.stepWrapper}>
          <View style={[
            styles.stepCircle,
            currentStep === step.id && styles.stepCircleActive,
            currentStep > step.id && styles.stepCircleCompleted
          ]}>
            {currentStep > step.id ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Text style={[styles.stepNumber, currentStep === step.id && styles.stepNumberActive]}>
                {step.id}
              </Text>
            )}
          </View>
          {index < STEPS.length - 1 && (
            <View style={[styles.stepLine, currentStep > step.id && styles.stepLineActive]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderSuccessModal = () => (
    <Modal
      visible={successModal.visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setSuccessModal({ visible: false, isDraft: false });
        navigation.goBack();
      }}
    >
      <View style={styles.successModalOverlay}>
        <View style={styles.successModalCard}>
          <View style={styles.successIconContainer}>
            <Ionicons 
              name={successModal.isDraft ? "document-text" : "checkmark-circle"} 
              size={48} 
              color="#16A34A" 
            />
          </View>
          <Text style={styles.successTitle}>
            {successModal.isDraft ? "Draft Saved!" : "Success!"}
          </Text>
          <Text style={styles.successMessage}>
            {successModal.isDraft 
              ? "Your property draft has been saved successfully. You can complete it later." 
              : "Your property has been submitted and is now pending admin approval."}
          </Text>
          <TouchableOpacity 
            style={styles.successButton}
            onPress={() => {
              setSuccessModal({ visible: false, isDraft: false });
              // Use goBack to return to MyProperties and remove AddProperty from stack
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MyProperties');
              }
            }}
          >
            <Text style={styles.successButtonText}>Go to My Properties</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Property</Text>
        <View style={{ width: 48 }} />
      </View>

      {renderStepIndicator()}

      <ScrollView 
        ref={scrollRef}
        style={styles.formContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        scrollEnabled={scrollEnabled}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError('')}>
              <Ionicons name="close" size={20} color="#B91C1C" />
            </TouchableOpacity>
          </View>
        ) : null}

        {isVerified === false && (
          <View style={styles.verificationWarning}>
            <Ionicons name="shield-alert" size={24} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Account Verification Required</Text>
              <Text style={styles.warningText}>
                You can save as draft, but you can't submit for approval until your account is verified.
              </Text>
            </View>
          </View>
        )}

        {/* STEP 1: BASIC INFO */}
        {currentStep === 1 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Text style={styles.sectionSubtitle}>Standard details about your property</Text>
              
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

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your property, facilities, and unique features..."
                multiline
                value={form.description}
                onChangeText={(text) => updateForm('description', text)}
              />
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Property Photos</Text>
              <Text style={styles.sectionSubtitle}>Add up to 10 photos of your property</Text>
              
              <View style={styles.imagesRow}>
                {selectedImages.map((image, index) => (
                  <View key={index} style={styles.imagePreview}>
                    <Image source={{ uri: image.uri }} style={{ width: '100%', height: '100%' }} />
                    <TouchableOpacity 
                      style={styles.imageRemove} 
                      onPress={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {selectedImages.length < 10 && (
                  <TouchableOpacity style={styles.addImageButton} onPress={handlePickImages}>
                    <Ionicons name="camera" size={32} color="#94A3B8" />
                    <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: LOCATION */}
        {currentStep === 2 && (
          <View>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pin Location</Text>
                {loadingAddress && <ActivityIndicator size="small" color={theme.colors.primary} />}
              </View>
              <Text style={styles.sectionSubtitle}>Tap the map to drop a pin and auto-fill address</Text>
              
              <View 
                style={styles.mapContainer}
                onTouchStart={() => setScrollEnabled(false)}
                onTouchEnd={() => setScrollEnabled(true)}
                onStartShouldSetResponderCapture={() => {
                  setScrollEnabled(false);
                  return false;
                }}
              >
                <WebView
                  ref={webviewRef}
                  originWhitelist={['*']}
                  source={{ html: leafletHTML }}
                  javaScriptEnabled
                  onMessage={onMapMessage}
                  scrollEnabled={false}
                  scalesPageToFit={false}
                />
              </View>

              <Text style={styles.label}>Street Address <Text style={styles.requiredAsterisk}>*</Text></Text>
              <TextInput 
                style={styles.input} 
                value={form.street} 
                onChangeText={(text) => updateForm('street', text)}
                placeholder="e.g., 123 Maria Clara St."
              />
              
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Barangay</Text>
                  <TextInput 
                    style={styles.input} 
                    value={form.barangay} 
                    onChangeText={(text) => updateForm('barangay', text)}
                    placeholder="Barangay Name"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>City <Text style={styles.requiredAsterisk}>*</Text></Text>
                  <TextInput 
                    style={styles.input} 
                    value={form.city} 
                    onChangeText={(text) => updateForm('city', text)}
                    placeholder="City"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Province</Text>
                  <TextInput 
                    style={[styles.input, form.city.toLowerCase().includes('zamboanga city') && { backgroundColor: '#F3F4F6' }]} 
                    value={form.province} 
                    editable={!form.city.toLowerCase().includes('zamboanga city')}
                    onChangeText={(text) => updateForm('province', text)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Postal Code</Text>
                  <TextInput 
                    style={styles.input} 
                    value={form.postalCode} 
                    keyboardType="number-pad"
                    onChangeText={(text) => updateForm('postalCode', text)}
                    placeholder="7000"
                  />
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Nearby Landmarks</Text>
              <Text style={styles.sectionSubtitle}>Add landmarks to help tenants find your place</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="e.g., Near Zamboanga State College, 2 mins walk from Market"
                multiline
                value={form.nearbyLandmarks}
                onChangeText={(text) => updateForm('nearbyLandmarks', text)}
              />
            </View>
          </View>
        )}

        {/* STEP 3: AMENITIES & RULES */}
        {currentStep === 3 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <Text style={styles.sectionSubtitle}>Select or add features available in your property</Text>
              
              <View style={styles.pillGrid}>
                {AMENITIES_SUGGESTIONS.map((amenity) => {
                  const active = form.amenities.includes(amenity);
                  return (
                    <TouchableOpacity
                      key={amenity}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => toggleAmenity(amenity)}
                    >
                      <Text style={[styles.pillText, active && { color: '#166534' }]}>{amenity}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Custom amenity..."
                  value={newAmenity}
                  onChangeText={setNewAmenity}
                />
                <TouchableOpacity 
                  style={[styles.pill, { paddingVertical: 0, justifyContent: 'center', borderColor: '#16A34A' }]} 
                  onPress={addCustomAmenity}
                >
                  <Ionicons name="add" size={20} color="#16A34A" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Property Rules</Text>
              <Text style={styles.sectionSubtitle}>House rules for potential tenants</Text>
              
              <View style={styles.pillGrid}>
                {RULES_SUGGESTIONS.map((rule) => {
                  const active = form.rules.includes(rule);
                  return (
                    <TouchableOpacity
                      key={rule}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => toggleRule(rule)}
                    >
                      <Text style={[styles.pillText, active && { color: '#166534' }]}>{rule}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Add custom rule..."
                  value={newRule}
                  onChangeText={setNewRule}
                />
                <TouchableOpacity 
                  style={[styles.pill, { paddingVertical: 0, justifyContent: 'center', borderColor: '#16A34A' }]} 
                  onPress={addCustomRule}
                >
                  <Ionicons name="add" size={20} color="#16A34A" />
                </TouchableOpacity>
              </View>

              {form.rules.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  {form.rules.map((rule, index) => (
                    <View key={index} style={styles.ruleItem}>
                      <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                      <Text style={{ flex: 1, fontSize: 14 }}>{rule}</Text>
                      <TouchableOpacity onPress={() => toggleRule(rule)}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* STEP 4: CREDENTIALS */}
        {currentStep === 4 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Admin Approval</Text>
              <Text style={styles.sectionSubtitle}>Submit documents for property verification</Text>
              
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}
                onPress={() => updateForm('isEligible', !form.isEligible)}
              >
                <Ionicons 
                  name={form.isEligible ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={theme.colors.primary} 
                />
                <Text style={{ fontSize: 14, color: '#374151' }}>Mark property as eligible for verification</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Credential Documents</Text>
              <Text style={styles.helperText}>Upload proof of ownership, business permits, or valid IDs</Text>
              
              {credentials.map((file, index) => (
                <View key={index} style={styles.credentialItem}>
                  <Ionicons name="document-text" size={20} color="#6B7280" />
                  <Text style={styles.credentialName} numberOfLines={1}>{file.name}</Text>
                  <TouchableOpacity 
                    onPress={() => setCredentials(prev => prev.filter((_, i) => i !== index))}
                    style={styles.removeCredential}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity 
                style={[styles.addImageButton, { width: '100%', height: 120, marginTop: 10 }]} 
                onPress={handlePickCredentials}
              >
                <Ionicons name="cloud-upload" size={40} color="#94A3B8" />
                <Text style={{ fontSize: 14, color: '#94A3B8', marginTop: 8 }}>Upload Documents</Text>
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>PNG, JPG or Photos</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FOOTER NAVIGATION */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {currentStep > 1 ? (
          <TouchableOpacity style={styles.prevButton} onPress={handlePrev} disabled={saving}>
            <Ionicons name="arrow-back" size={20} color="#374151" />
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.draftButton} 
            onPress={() => handleSubmit(true)} 
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color="#16A34A" /> : <Text style={[styles.buttonText, styles.buttonTextDraft]}>Save Draft</Text>}
          </TouchableOpacity>
        )}

        {currentStep < 4 ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Next Step</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.nextButton, (!isVerified && !form.isEligible) && { opacity: 0.7 }]} 
            onPress={() => handleSubmit(false)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Submit Property</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      {renderSuccessModal()}
    </SafeAreaView>
  );
}
