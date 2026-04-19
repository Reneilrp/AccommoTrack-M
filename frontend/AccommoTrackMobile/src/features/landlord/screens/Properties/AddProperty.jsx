import React, { useState, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
  Switch,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import PropertyService from "../../../../services/PropertyService.js";
import ProfileService from "../../../../services/ProfileService.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStyles } from "../../../../styles/Landlord/AddProperty.js";
import { useTheme } from "../../../../contexts/ThemeContext.jsx";
import {
  landlordQueryKeys,
  useLandlordFocusRefetch,
} from "../../hooks/useLandlordQueryHelpers.js";
import { showError } from "../../../../utils/toast.js";

const PROPERTY_TYPES = [
  { label: "Dormitory", value: "dormitory" },
  { label: "Apartment", value: "apartment" },
  { label: "Boarding House", value: "boardingHouse" },
  { label: "Bed Spacer", value: "bedSpacer" },
  { label: "Others", value: "others" },
];

const GENDER_OPTIONS = [
  { label: "Mixed (Any Sex)", value: "mixed" },
  { label: "Boys Only", value: "male" },
  { label: "Girls Only", value: "female" },
];

const AMENITIES_SUGGESTIONS = [
  'WiFi',
  'Air Conditioning',
  'Security',
  'Kitchen',
  'Balcony'
];

const RULES_SUGGESTIONS = [
  'No smoking',
  'No pets allowed',
  'No visitors after 10 PM',
  'Quiet hours: 10 PM - 6 AM',
  'Keep common areas clean',
  'Respect other tenants',
  'No cooking in rooms'
];

const initialForm = {
  title: "",
  propertyType: "",
  otherType: "",
  sexRestriction: "mixed",
  description: "",
  street: "",
  barangay: "",
  city: "",
  province: "Zamboanga Del Sur",
  postalCode: "",
  country: "Philippines",
  latitude: null,
  longitude: null,
  nearbyLandmarks: "",
  totalRooms: "",
  maxOccupants: "",
  totalFloors: "1",
  floorLevel: [],
  amenities: [],
  rules: [],
  isEligible: false,
  acceptedPayments: ["cash"],
  require1MonthAdvance: false,
  allowPartialPayments: true,
  forceWalletRefunds: true,
  requireReservationFee: false,
  reservationFeeAmount: "",
  normalBookingLimit: "1",
  proxyBookingLimit: "3",
  minPartialPaymentPct: "20",
};

const STEPS = [
  { id: 1, title: "Basic Info", icon: "information-circle" },
  { id: 2, title: "Location", icon: "map" },
  { id: 3, title: "Rules & Perks", icon: "list" },
  { id: 4, title: "Credentials", icon: "shield-checkmark" },
];

const LANDLORD_ACCESS_STATUSES = [
  "approved",
  "partial_verified",
  "pending_documents_review",
];

const getOptionLabel = (options, value, fallback = "Select option") => {
  const matched = options.find((option) => option.value === value);
  return matched?.label || fallback;
};

export default function AddProperty({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [newRule, setNewRule] = useState("");
  const [newAmenity, setNewAmenity] = useState("");
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [propertyTypeModalVisible, setPropertyTypeModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [error, setError] = useState("");
  const [successModal, setSuccessModal] = useState({
    visible: false,
    isDraft: false,
  });
  const [alertModal, setAlertModal] = useState({
    visible: false,
    title: '',
    message: '',
  });
  const showAlert = (title, message) => setAlertModal({ visible: true, title, message });
  const hideAlert = () => setAlertModal(prev => ({ ...prev, visible: false }));
  const webviewRef = useRef(null);
  const scrollRef = useRef(null);

  const addPropertyVerificationQuery = useQuery({
    queryKey: landlordQueryKeys.addPropertyVerification(),
    queryFn: async () => {
      let isCaretaker = false;
      let isVerified = false;
      let isPayMongoVerified = false;
      let verificationStatus = null;

      try {
        const userString = await AsyncStorage.getItem("user");

        if (userString) {
          try {
            const user = JSON.parse(userString);
            isCaretaker = user?.role === "caretaker";
            isPayMongoVerified =
              user?.paymongo_verification_status === "verified" ||
              user?.paymongo_verification_bypass === true ||
              user?.is_paymongo_ready === true;
          } catch (_parseError) {
            isPayMongoVerified = false;
          }
        }

        if (isCaretaker) {
          isVerified = true;
          return { isCaretaker, isVerified, isPayMongoVerified, verificationStatus };
        }

        const verificationRes = await ProfileService.getVerificationStatus();

        if (verificationRes?.success) {
          verificationStatus = verificationRes.data?.status ?? null;
          isVerified =
            LANDLORD_ACCESS_STATUSES.includes(verificationStatus) ||
            verificationRes.data?.user?.is_verified === true;
        }
      } catch (_error) {
        isVerified = false;
      }

      return { isCaretaker, isVerified, isPayMongoVerified, verificationStatus };
    },
  });

  const isCaretaker = addPropertyVerificationQuery.data?.isCaretaker === true;
  const isVerified = addPropertyVerificationQuery.data?.isVerified ?? null;
  const verificationStatus = addPropertyVerificationQuery.data?.verificationStatus ?? null;
  const isPayMongoVerified =
    addPropertyVerificationQuery.data?.isPayMongoVerified ?? false;
  const canSubmitForApproval = isCaretaker || isVerified === true;
  const pickerMode = Platform.OS === 'android' ? 'dropdown' : undefined; // eslint-disable-line no-unused-vars
  const refetchAddPropertyVerification = addPropertyVerificationQuery.refetch;
  const addPropertyVerificationRefetchers = useMemo(
    () => [refetchAddPropertyVerification],
    [refetchAddPropertyVerification],
  );

  useLandlordFocusRefetch({ refetchers: addPropertyVerificationRefetchers });

  const leafletHTML = useMemo(
    () => `
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
  `,
    [],
  );

  const updateForm = (field, value) => {
    setForm((prev) => {
      let updated = { ...prev, [field]: value };
      if (field === "city" && value.trim().toLowerCase() === "zamboanga city") {
        updated.province = "Zamboanga Del Sur";
        updated.country = "Philippines";
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
    updateForm("rules", [...form.rules, newRule.trim()]);
    setNewRule("");
  };

  const addCustomAmenity = () => {
    if (!newAmenity.trim()) return;
    updateForm("amenities", [...form.amenities, newAmenity.trim()]);
    setNewAmenity("");
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

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert("Permission required", "Please allow photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      const validImages = [];
      const tooLargeFiles = [];

      for (const asset of result.assets) {
        // Strict 5MB limit check
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          tooLargeFiles.push(asset.fileName || "Selected image");
        } else {
          validImages.push({
            uri: asset.uri,
            name:
              asset.fileName ||
              `property-${Date.now()}-${validImages.length}.jpg`,
            type: asset.mimeType || "image/jpeg",
          });
        }
      }

      if (tooLargeFiles.length > 0) {
        showAlert(
          "Files too large",
          `The following images exceed the 5MB limit and were skipped:\n\n${tooLargeFiles.join("\n")}`,
        );
      }

      setSelectedImages((prev) => [...prev, ...validImages]);
    }
  };

  const handlePickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert("Permission Required", "Please allow photo library access to upload a video.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true, // Allow trimming on device
    });

    if (!result.canceled && result.assets.length > 0) {
      const video = result.assets[0];

      // Strict 200MB size check
      if (video.fileSize && video.fileSize > 200 * 1024 * 1024) {
        showAlert(
          "Video Too Large",
          `The selected video is ${(video.fileSize / (1024 * 1024)).toFixed(1)}MB. Please choose a video under 200MB.`,
        );
        return;
      }

      // 45 seconds duration check
      if (video.duration && video.duration > 45000) {
        showAlert(
          "Video Too Long",
          "Video tours must be 45 seconds or less. Please trim your video before uploading.",
        );
        return;
      }

      setSelectedVideo({
        uri: video.uri,
        name: video.fileName || `property-video-${Date.now()}.mp4`,
        type: video.mimeType || "video/mp4",
      });
    }
  };

  const handlePickCredentials = async () => {
    const options = [
      {
        text: "Take Photo",
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            showAlert("Permission Required", "Please allow camera access to capture documents.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });
          if (!result.canceled) {
            const asset = result.assets[0];
            setCredentials((prev) => [
              ...prev,
              {
                uri: asset.uri,
                name: asset.fileName || `credential-${Date.now()}.jpg`,
                type: asset.mimeType || "image/jpeg",
              },
            ]);
          }
        },
      },
      {
        text: "Choose from Library",
        onPress: async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            showAlert("Permission Required", "Please allow photo library access.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsMultipleSelection: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });
          if (!result.canceled) {
            const mapped = result.assets.map((asset, idx) => ({
              uri: asset.uri,
              name: asset.fileName || `credential-${Date.now()}-${idx}.jpg`,
              type: asset.mimeType || "image/jpeg",
            }));
            setCredentials((prev) => [...prev, ...mapped]);
          }
        },
      },
      {
        text: "Choose File (PDF/Image)",
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: ["application/pdf", "image/*"],
              multiple: true,
              copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
              const mapped = result.assets.map((asset, idx) => ({
                uri: asset.uri,
                name: asset.name || `credential-${Date.now()}-${idx}`,
                type: asset.mimeType || "application/pdf",
              }));
              setCredentials((prev) => [...prev, ...mapped]);
            }
          } catch (err) {
            console.error("DocumentPicker Error:", err);
            showAlert("Error", "Could not open file manager.");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ];

    showAlert("Upload Credentials", "Choose a source for your documents.", options, {
      showCloseButton: true,
      cancelable: true,
    });
  };

  const onMapMessage = async (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data || "{}");

      if (payload.type === "interaction") {
        if (payload.state === "start") {
          setScrollEnabled(false);
        } else {
          setScrollEnabled(true);
        }
        return;
      }

      if (payload.type === "location" && payload.lat && payload.lon) {
        setForm((prev) => ({
          ...prev,
          latitude: payload.lat,
          longitude: payload.lon,
        }));
        setLoadingAddress(true);
        const res = await PropertyService.reverseGeocode(
          payload.lat,
          payload.lon,
        );
        setLoadingAddress(false);
        if (res.success && res.data?.address) {
          const addr = res.data.address;
          setForm((prev) => ({
            ...prev,
            street:
              addr.road || addr.pedestrian || addr.house_number || prev.street,
            barangay:
              addr.suburb ||
              addr.village ||
              addr.neighbourhood ||
              prev.barangay,
            city: addr.city || addr.town || addr.county || prev.city,
            province: addr.state || addr.region || prev.province,
            postalCode: addr.postcode || prev.postalCode,
            country: addr.country || prev.country,
          }));
        }
      }
    } catch (err) {
      console.error("Map selection error", err);
    }
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!form.title.trim()) return "Property name is required";
      if (!form.propertyType) return "Property type is required";
      if (form.propertyType === "others" && !form.otherType.trim())
        return "Please specify property type";
    } else if (step === 2) {
      if (!form.street.trim()) return "Street address is required";
      if (!form.city.trim()) return "City is required";
      if (!form.latitude || !form.longitude)
        return "Please pin the property on the map";
    } else if (step === 4) {
      if (form.isEligible && credentials.length === 0)
        return "Credentials are required for eligible properties";
    }
    return null;
  };

  const handleNext = () => {
    const errorMsg = validateStep(currentStep);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    setError("");
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError("");
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const buildPayload = (isDraft = false) => {
    const payload = new FormData();
    const propertyType =
      form.propertyType === "others" ? form.otherType : form.propertyType;
    const parsedTotalRooms = Number.parseInt(String(form.totalRooms || "").trim(), 10);
    const parsedMaxOccupants = Number.parseInt(String(form.maxOccupants || "").trim(), 10);
    const parsedTotalFloors = Number.parseInt(String(form.totalFloors || "").trim(), 10);

    const entries = {
      title: form.title.trim(),
      description: form.description.trim(),
      property_type: propertyType,
      sex_restriction: form.sexRestriction,
      current_status: isDraft ? "draft" : "pending",
      street_address: form.street.trim(),
      barangay: form.barangay.trim(),
      city: form.city.trim(),
      province: form.province.trim(),
      postal_code: form.postalCode.trim(),
      country: form.country.trim() || "Philippines",
      latitude: form.latitude,
      longitude: form.longitude,
      nearby_landmarks: form.nearbyLandmarks.trim(),
      total_rooms:
        Number.isNaN(parsedTotalRooms) || parsedTotalRooms < 1
          ? null
          : parsedTotalRooms,
      max_occupants:
        Number.isNaN(parsedMaxOccupants) || parsedMaxOccupants < 1
          ? null
          : parsedMaxOccupants,
      total_floors:
        Number.isNaN(parsedTotalFloors) || parsedTotalFloors < 1
          ? 1
          : parsedTotalFloors,
      floor_level: form.floorLevel.length > 0 ? form.floorLevel.join(",") : "",
      property_rules: form.rules.length ? JSON.stringify(form.rules) : null,
      is_eligible: form.isEligible ? "1" : "0",
      is_draft: isDraft ? "1" : "0",
      require_1month_advance: form.require1MonthAdvance ? "1" : "0",
      allow_partial_payments: form.allowPartialPayments ? "1" : "0",
      force_wallet_refunds: form.forceWalletRefunds ? "1" : "0",
      require_reservation_fee: form.requireReservationFee ? "1" : "0",
      reservation_fee_amount: form.requireReservationFee
        ? form.reservationFeeAmount || "0"
        : "0",
      normal_booking_limit: form.normalBookingLimit || "1",
      proxy_booking_limit: form.proxyBookingLimit || "3",
      min_partial_payment_pct: form.minPartialPaymentPct || "20",
    };

    Object.entries(entries).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        payload.append(key, String(value));
      }
    });

    // Payment methods
    const methods = form.acceptedPayments.length
      ? form.acceptedPayments
      : ["cash"];
    methods.forEach((method, index) => {
      payload.append(`accepted_payments[${index}]`, method);
    });

    form.amenities.forEach((amenity, index) => {
      payload.append(`amenities[${index}]`, amenity);
    });

    selectedImages.forEach((image, index) => {
      payload.append(`images[${index}]`, {
        uri: image.uri,
        name: image.name,
        type: image.type,
      });
    });

    if (selectedVideo) {
      payload.append("video", {
        uri: selectedVideo.uri,
        name: selectedVideo.name,
        type: selectedVideo.type,
      });
    }

    credentials.forEach((file, index) => {
      payload.append(`credentials[${index}]`, {
        uri: file.uri,
        name: file.name,
        type: file.type,
      });
    });

    return payload;
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedImages([]);
    setSelectedVideo(null);
    setCredentials([]);
    setCurrentStep(1);
    setError("");
  };

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft) {
      if (isVerified === null) {
        setError("Checking verification status. Please try again in a moment.");
        return;
      }

      if (!canSubmitForApproval) {
        setError(
          "Your account needs partial verification (or approved status) before submitting for approval. You can still save as draft.",
        );
        return;
      }

      const errorMsg = validateStep(4);
      if (errorMsg) {
        setError(errorMsg);
        return;
      }
    }

    try {
      setSaving(true);
      setError("");
      const payload = buildPayload(isDraft);
      const res = await PropertyService.createProperty(payload);
      if (res.success) {
        setSuccessModal({ visible: true, isDraft });
        // Reset form state so if they come back it's empty
        resetForm();
      } else {
        showError("Error", res.error || "Failed to save property");
        setError(res.error || "Failed to save property");
      }
    } catch (err) {
      showError("Error", err.message || "An unexpected error occurred");
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepsContainer}>
      {STEPS.map((step, index) => (
        <View key={step.id} style={styles.stepWrapper}>
          <View
            style={[
              styles.stepCircle,
              currentStep === step.id && styles.stepCircleActive,
              currentStep > step.id && styles.stepCircleCompleted,
            ]}
          >
            {currentStep > step.id ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  currentStep === step.id && styles.stepNumberActive,
                ]}
              >
                {step.id}
              </Text>
            )}
          </View>
          {index < STEPS.length - 1 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step.id && styles.stepLineActive,
              ]}
            />
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
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      presentationStyle="overFullScreen"
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
              color="#16a34a"
            />
          </View>
          <Text style={styles.successTitle}>
            {successModal.isDraft ? "Draft Saved!" : "Success!"}
          </Text>
          <Text style={styles.successMessage}>
            {successModal.isDraft
              ? "Your property draft has been saved successfully. You can complete it later."
              : "Your property has been submitted and is now pending admin approval. Please wait 1-2 days for eligibility review."}
          </Text>
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => {
              setSuccessModal({ visible: false, isDraft: false });
              // Use goBack to return to MyProperties and remove AddProperty from stack
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("MyProperties");
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.primary}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Property</Text>
        <View style={styles.iconButtonEmpty} />
      </View>

      {renderStepIndicator()}

      <ScrollView
        ref={scrollRef}
        style={styles.formContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.modalScroll}
        scrollEnabled={scrollEnabled}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError("")}>
              <Ionicons name="close" size={20} color="#B91C1C" />
            </TouchableOpacity>
          </View>
        ) : null}

        {!isCaretaker && isVerified === false && (
          <View style={styles.verificationWarning}>
            <Ionicons name="shield-alert" size={24} color="#D97706" />
            <View style={styles.inputHalf}>
              <Text style={styles.warningTitle}>
                Account Verification Required
              </Text>
              <Text style={styles.warningText}>
                {verificationStatus === "pending"
                  ? "You can save as draft while your account is under review. Submit for approval unlocks after partial verification or full approval."
                  : "You can save as draft, but submit for approval unlocks after partial verification or full approval."}
              </Text>
            </View>
          </View>
        )}

        {/* STEP 1: BASIC INFO */}
        {currentStep === 1 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Text style={styles.sectionSubtitle}>
                Standard details about your property
              </Text>

              <Text style={styles.label}>
                Property Name <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Sunrise Residences"
                value={form.title}
                onChangeText={(text) => updateForm("title", text)}
              />

              <Text style={styles.label}>
                Property Type <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TouchableOpacity
                testID="add-property-type-picker"
                style={styles.selectTrigger}
                onPress={() => setPropertyTypeModalVisible(true)}
              >
                <Text style={styles.selectTriggerText}>
                  {getOptionLabel(PROPERTY_TYPES, form.propertyType, "Select property type")}
                </Text>
                <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              {form.propertyType === "others" && (
                <TextInput
                  style={styles.input}
                  placeholder="Specify property type"
                  value={form.otherType}
                  onChangeText={(text) => updateForm("otherType", text)}
                />
              )}

              {form.propertyType !== "" && form.propertyType !== "apartment" && (
                <>
                  <Text style={styles.label}>
                    Sex Restriction <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <TouchableOpacity
                    testID="add-property-sex-picker"
                    style={styles.selectTrigger}
                    onPress={() => setGenderModalVisible(true)}
                  >
                    <Text style={styles.selectTriggerText}>
                      {getOptionLabel(GENDER_OPTIONS, form.sexRestriction, "Select sex restriction")}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your property, facilities, and unique features..."
                multiline
                value={form.description}
                onChangeText={(text) => updateForm("description", text)}
              />
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Property Specifications</Text>
              <Text style={styles.sectionSubtitle}>Define room capacities and managed floors</Text>

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Total Rooms</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 10"
                    keyboardType="numeric"
                    value={form.totalRooms}
                    onChangeText={(text) => updateForm("totalRooms", text)}
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Max Occupants</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 20"
                    keyboardType="numeric"
                    value={form.maxOccupants}
                    onChangeText={(text) => updateForm("maxOccupants", text)}
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Total Floors</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 2"
                    keyboardType="numeric"
                    value={form.totalFloors}
                    onChangeText={(text) => updateForm("totalFloors", text)}
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

              <View style={styles.switchSectionDivider}>
                <View style={styles.switchRowContainer}>
                  <View style={styles.switchTextBlock}>
                    <Text style={styles.switchTitle}>Require 1-Month Advance Payment</Text>
                    <Text style={styles.switchHelpText}>
                      Tenant pays first month plus one advance month upon booking confirmation.
                    </Text>
                  </View>
                  <Switch
                    value={form.require1MonthAdvance}
                    onValueChange={(value) => updateForm("require1MonthAdvance", value)}
                    trackColor={{ true: theme.colors.primary, false: "#CBD5E1" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.switchRowContainer}>
                  <View style={styles.switchTextBlock}>
                    <Text style={styles.switchTitle}>Require Instant Reservation Fee</Text>
                    <Text style={styles.switchHelpText}>
                      Require a non-refundable reservation fee to secure the request.
                    </Text>
                    {!isPayMongoVerified ? (
                      <Text style={styles.switchWarningText}>
                        Complete PayMongo verification in Settings &gt; Payments to enable this.
                      </Text>
                    ) : null}
                  </View>
                  <Switch
                    value={form.requireReservationFee}
                    onValueChange={(value) => {
                      if (!isPayMongoVerified && value) {
                        showAlert(
                          "PayMongo Not Verified",
                          "You need to complete PayMongo verification before enabling reservation fee.",
                        );
                        return;
                      }
                      updateForm("requireReservationFee", value);
                    }}
                    disabled={!isPayMongoVerified}
                    trackColor={{ true: theme.colors.primary, false: "#CBD5E1" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {form.requireReservationFee ? (
                  <>
                    <Text style={styles.label}>Reservation Fee Amount (PHP)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 500"
                      value={form.reservationFeeAmount}
                      onChangeText={(text) => updateForm("reservationFeeAmount", text)}
                    />
                  </>
                ) : null}

                <View style={[styles.switchRowContainer, styles.switchRowLast]}>
                  <View style={styles.switchTextBlock}>
                    <Text style={styles.switchTitle}>Allow Partial Payments</Text>
                    <Text style={styles.switchHelpText}>
                      Tenants can pay invoices in smaller increments instead of full one-time payment.
                    </Text>
                  </View>
                  <Switch
                    value={form.allowPartialPayments}
                    onValueChange={(value) => updateForm("allowPartialPayments", value)}
                    trackColor={{ true: theme.colors.primary, false: "#CBD5E1" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.switchRowContainer, styles.switchRowLast]}>
                  <View style={styles.switchTextBlock}>
                    <Text style={styles.switchTitle}>Force Refunds to Wallet</Text>
                    <Text style={styles.switchHelpText}>
                      Excess transfer credits automatically go to tenant wallet.
                    </Text>
                  </View>
                  <Switch
                    value={form.forceWalletRefunds}
                    onValueChange={(value) => updateForm("forceWalletRefunds", value)}
                    trackColor={{ true: theme.colors.primary, false: "#CBD5E1" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Property Photos</Text>
              <Text style={styles.sectionSubtitle}>
                Add up to 10 photos of your property (Max 5MB each)
              </Text>

              <View style={styles.imagesRow}>
                {selectedImages.map((image, index) => (
                  <View key={index} style={styles.imagePreview}>
                    <Image
                      source={{ uri: image.uri }}
                      style={styles.imageFull}
                    />
                    <TouchableOpacity
                      style={styles.imageRemove}
                      onPress={() =>
                        setSelectedImages((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {selectedImages.length < 10 && (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={handlePickImages}
                  >
                    <Ionicons name="camera" size={32} color="#94A3B8" />
                    <Text style={styles.helperText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Property Video Tour</Text>
              <Text style={styles.sectionSubtitle}>
                Add a short video tour (Max 45s, 200MB)
              </Text>

              <View style={styles.imagesRow}>
                {selectedVideo ? (
                  <View style={styles.imagePreview}>
                    {/* Placeholder for video thumbnail; in real implementation, you might use expo-video to generate or show a thumbnail. */}
                    <View style={styles.videoThumbnail}>
                      <Ionicons name="play-circle" size={40} color="#FFFFFF" />
                    </View>
                    <TouchableOpacity
                      style={styles.imageRemove}
                      onPress={() => setSelectedVideo(null)}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.videoLabelBadge}>
                      <Text style={styles.videoLabelText}>VIDEO</Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={handlePickVideo}
                  >
                    <Ionicons name="videocam" size={32} color="#94A3B8" />
                    <Text style={styles.helperText}>Add Video</Text>
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
                {loadingAddress && (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                )}
              </View>
              <Text style={styles.sectionSubtitle}>
                Tap the map to drop a pin and auto-fill address
              </Text>

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
                  originWhitelist={["*"]}
                  source={{ html: leafletHTML }}
                  javaScriptEnabled
                  onMessage={onMapMessage}
                  scrollEnabled={false}
                  scalesPageToFit={false}
                />
              </View>

              <Text style={styles.label}>
                Street Address <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={form.street}
                onChangeText={(text) => updateForm("street", text)}
                placeholder="e.g., 123 Maria Clara St."
              />

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Barangay</Text>
                  <TextInput
                    style={styles.input}
                    value={form.barangay}
                    onChangeText={(text) => updateForm("barangay", text)}
                    placeholder="Barangay Name"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>
                    City <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={form.city}
                    onChangeText={(text) => updateForm("city", text)}
                    placeholder="City"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Province</Text>
                  <TextInput
                    style={[
                      styles.input,
                      form.city.toLowerCase().includes("zamboanga city") && {
                        backgroundColor: theme.colors.backgroundTertiary,
                      },
                    ]}
                    value={form.province}
                    editable={
                      !form.city.toLowerCase().includes("zamboanga city")
                    }
                    onChangeText={(text) => updateForm("province", text)}
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Postal Code</Text>
                  <TextInput
                    style={styles.input}
                    value={form.postalCode}
                    keyboardType="number-pad"
                    onChangeText={(text) => updateForm("postalCode", text)}
                    placeholder="7000"
                  />
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Nearby Landmarks</Text>
              <Text style={styles.sectionSubtitle}>
                Add landmarks to help tenants find your place
              </Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                placeholder="e.g., Near Zamboanga State College, 2 mins walk from Market"
                multiline
                value={form.nearbyLandmarks}
                onChangeText={(text) => updateForm("nearbyLandmarks", text)}
              />
            </View>
          </View>
        )}

        {/* STEP 3: AMENITIES & RULES */}
        {currentStep === 3 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <Text style={styles.sectionSubtitle}>
                Select or add features available in your property
              </Text>

              <View style={styles.pillGrid}>
                {AMENITIES_SUGGESTIONS.map((amenity) => {
                  const active = form.amenities.includes(amenity);
                  return (
                    <TouchableOpacity
                      key={amenity}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => toggleAmenity(amenity)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          active && styles.pillTextActive,
                        ]}
                      >
                        {amenity}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.inputPillAdd}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Custom amenity..."
                  value={newAmenity}
                  onChangeText={setNewAmenity}
                />
                <TouchableOpacity
                  style={[styles.pill, styles.inputPill]}
                  onPress={addCustomAmenity}
                >
                  <Ionicons name="add" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Property Rules</Text>
              <Text style={styles.sectionSubtitle}>
                House rules for potential tenants
              </Text>

              <View style={styles.pillGrid}>
                {RULES_SUGGESTIONS.map((rule) => {
                  const active = form.rules.includes(rule);
                  return (
                    <TouchableOpacity
                      key={rule}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => toggleRule(rule)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          active && styles.pillTextActive,
                        ]}
                      >
                        {rule}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.inputPillAdd}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Add custom rule..."
                  value={newRule}
                  onChangeText={setNewRule}
                />
                <TouchableOpacity
                  style={[styles.pill, styles.inputPill]}
                  onPress={addCustomRule}
                >
                  <Ionicons name="add" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>

              {form.rules.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  {form.rules.map((rule, index) => (
                    <View key={index} style={styles.ruleItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#16a34a"
                      />
                      <Text style={[styles.inputHalf, { fontSize: 14 }]}>
                        {rule}
                      </Text>
                      <TouchableOpacity onPress={() => toggleRule(rule)}>
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Booking Limits</Text>
              <Text style={styles.sectionSubtitle}>
                Limit active bookings per tenant (Max 4)
              </Text>

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
                      if (num <= 4) updateForm("normalBookingLimit", val);
                    }}
                  />
                  <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>
                    Default: 1
                  </Text>
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
                      if (num <= 4) updateForm("proxyBookingLimit", val);
                    }}
                  />
                  <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>
                    Default: 3
                  </Text>
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
                    if (num <= 100) updateForm("minPartialPaymentPct", val);
                  }}
                />
                <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>
                  Default: 20%
                </Text>
              </View>
            </View>

            {/* Payment Methods */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Accepted Payment Methods</Text>
              <Text style={styles.sectionSubtitle}>
                Choose which payment methods tenants can use for this property
              </Text>

              {/* Cash */}
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  paddingVertical: 8,
                }}
                onPress={() => {
                  const current = form.acceptedPayments;
                  if (current.includes("cash")) {
                    if (current.length === 1) return; // at least one required
                    updateForm(
                      "acceptedPayments",
                      current.filter((m) => m !== "cash"),
                    );
                  } else {
                    updateForm("acceptedPayments", [...current, "cash"]);
                  }
                }}
              >
                <Ionicons
                  name={
                    form.acceptedPayments.includes("cash")
                      ? "checkbox"
                      : "square-outline"
                  }
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: theme.colors.text,
                    }}
                  >
                    Cash
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: theme.colors.textSecondary }}
                  >
                    In-person cash payment
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Online */}
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  paddingVertical: 8,
                  opacity: isPayMongoVerified ? 1 : 0.5,
                }}
                onPress={() => {
                  if (!isPayMongoVerified) {
                    showAlert(
                      "PayMongo Not Verified",
                      "You need to complete PayMongo verification before enabling online payments.\n\nGo to Settings > Payments to connect your account.",
                    );
                    return;
                  }
                  const current = form.acceptedPayments;
                  if (current.includes("online")) {
                    updateForm(
                      "acceptedPayments",
                      current.filter((m) => m !== "online"),
                    );
                  } else {
                    updateForm("acceptedPayments", [...current, "online"]);
                  }
                }}
              >
                <Ionicons
                  name={
                    form.acceptedPayments.includes("online")
                      ? "checkbox"
                      : "square-outline"
                  }
                  size={24}
                  color={isPayMongoVerified ? "#2563EB" : "#9CA3AF"}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: isPayMongoVerified
                        ? theme.colors.text
                        : theme.colors.textTertiary,
                    }}
                  >
                    Online (GCash, Maya, GrabPay)
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: theme.colors.textSecondary }}
                  >
                    Via PayMongo – requires verification
                  </Text>
                </View>
              </TouchableOpacity>

              {!isPayMongoVerified && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 8,
                    backgroundColor: "#FEF3C7",
                    borderRadius: 10,
                    padding: 16,
                    marginTop: 6,
                  }}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color="#92400E"
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: "#92400E",
                      lineHeight: 17,
                    }}
                  >
                    Your PayMongo account is not yet verified. Only Cash is
                    available.{"\n"}
                    <Text style={{ fontWeight: "700" }}>
                      Go to Settings {">"} Payments
                    </Text>{" "}
                    to connect and verify your account.
                  </Text>
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
              <Text style={styles.sectionSubtitle}>
                Submit documents for property verification
              </Text>

              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 24,
                }}
                onPress={() => updateForm("isEligible", !form.isEligible)}
              >
                <Ionicons
                  name={form.isEligible ? "checkbox" : "square-outline"}
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={{ fontSize: 14, color: "#374151" }}>
                  Mark property as eligible for verification
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Credential Documents</Text>
              <Text style={styles.helperText}>
                Upload proof of ownership, business permits, or valid IDs
              </Text>

              {credentials.map((file, index) => (
                <View key={index} style={styles.credentialItem}>
                  <Ionicons name="document-text" size={20} color="#6B7280" />
                  <Text style={styles.credentialName} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setCredentials((prev) =>
                        prev.filter((_, i) => i !== index),
                      )
                    }
                    style={styles.removeCredential}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[
                  styles.addImageButton,
                  { width: "100%", height: 120, marginTop: 8 },
                ]}
                onPress={handlePickCredentials}
              >
                <Ionicons name="cloud-upload" size={40} color="#94A3B8" />
                <Text style={{ fontSize: 14, color: "#94A3B8", marginTop: 8 }}>
                  Upload Documents
                </Text>
                <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                  PNG, JPG or Photos
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FOOTER NAVIGATION */}
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        {currentStep > 1 ? (
          <TouchableOpacity
            style={styles.prevButton}
            onPress={handlePrev}
            disabled={saving}
          >
            <Ionicons name="arrow-back" size={20} color="#374151" />
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.draftButton}
            onPress={() => handleSubmit(true)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#16a34a" />
            ) : (
              <Text style={[styles.buttonText, styles.buttonTextDraft]}>
                Save Draft
              </Text>
            )}
          </TouchableOpacity>
        )}

        {currentStep < 4 ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={[styles.buttonText, styles.buttonTextPrimary]}>
              Next Step
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.nextButton,
              (saving || !canSubmitForApproval) && { opacity: 0.7 },
            ]}
            onPress={() => handleSubmit(false)}
            disabled={saving || !canSubmitForApproval}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={[styles.buttonText, styles.buttonTextPrimary]}>
                  Submit Property
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      {renderSuccessModal()}

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
              {PROPERTY_TYPES.map((option, index) => {
                const isLast = index === PROPERTY_TYPES.length - 1;
                const isActive = option.value === form.propertyType;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.statusOption, isLast && styles.statusOptionLast]}
                    onPress={() => {
                      updateForm("propertyType", option.value);
                      if (option.value !== "others") {
                        updateForm("otherType", "");
                      }
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
        visible={genderModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => setGenderModalVisible(false)}
      >
        <Pressable style={styles.statusModalOverlay} onPress={() => setGenderModalVisible(false)}>
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 20 }]}>Select Sex Restriction</Text>
            {GENDER_OPTIONS.map((option, index) => {
              const isLast = index === GENDER_OPTIONS.length - 1;
              const isActive = option.value === form.sexRestriction;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.statusOption, isLast && styles.statusOptionLast]}
                  onPress={() => {
                    updateForm("sexRestriction", option.value);
                    setGenderModalVisible(false);
                  }}
                >
                  <Text style={styles.statusOptionText}>{option.label}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setGenderModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        visible={alertModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={hideAlert}
      >
        <Pressable style={styles.successModalOverlay} onPress={hideAlert}>
          <Pressable style={styles.successModalCard} onPress={() => { }}>
            <TouchableOpacity
              onPress={hideAlert}
              style={{ position: "absolute", top: 12, right: 12, padding: 4, zIndex: 1 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close alert"
            >
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
            <View style={[styles.successIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning-outline" size={36} color="#DC2626" />
            </View>
            <Text style={styles.successTitle}>{alertModal.title}</Text>
            <Text style={styles.successMessage}>{alertModal.message}</Text>
            <TouchableOpacity style={[styles.successButton, { backgroundColor: '#DC2626' }]} onPress={hideAlert}>
              <Text style={styles.successButtonText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
