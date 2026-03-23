import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Linking,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { triggerForcedLogout } from '../../../../navigation/RootNavigation.js';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getStyles } from '../../../../styles/Tenant/RoomDetailsScreen.js';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import BookingService from '../../../../services/BookingService.js';
import PropertyService from '../../../../services/PropertyService.js';
import PaymentService from '../../../../services/PaymentService.js';
import { BASE_URL as API_BASE_URL } from '../../../../config/index.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';

const { width } = Dimensions.get('window');

// Helper function to get proper image URL
const getRoomImageUrl = (imageUrl) => {
  if (!imageUrl) return 'https://via.placeholder.com/400x280?text=No+Image';
  
  if (typeof imageUrl === 'string') {
    // Already a full URL
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // Relative path - construct full URL
    const cleanPath = imageUrl.replace(/^\/?storage\//, '');
    return `${API_BASE_URL}/storage/${cleanPath}`;
  }
  
  return 'https://via.placeholder.com/400x280?text=No+Image';
};

export default function RoomDetailsScreen({ route, isGuest = false, onAuthRequired }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { room, property } = route.params;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [propertyData, setPropertyData] = useState(property || null);
  const [roomData, setRoomData] = useState(room || null);
  const [paymentOptions, setPaymentOptions] = useState({ methods: ['cash'], is_paymongo_ready: false });
  const [optionsLoading, setOptionsLoading] = useState(false);

  useEffect(() => {
    // keep roomData in sync when navigation param changes
    setRoomData(room);
    setPropertyData(property);
    if (room?.id) fetchPaymentOptions(room.id);
  }, [room, property]);

  const fetchPaymentOptions = async (roomId) => {
    try {
      setOptionsLoading(true);
      const res = await PropertyService.getRoomPaymentOptions(roomId);
      if (res.success && res.data) {
        setPaymentOptions(res.data);
      }
    } catch (error) {
      console.error('Error fetching payment options:', error);
    } finally {
      setOptionsLoading(false);
    }
  };

  // Hide parent tab bar and mark route to hide layout (TenantLayout)
  useEffect(() => {
    let isMounted = true;
    try {
      navigation.setParams?.({ hideLayout: true });
    } catch (e) {}
    const parent = navigation.getParent?.();
    try {
      parent?.setOptions?.({ tabBarStyle: { display: 'none' } });
    } catch (e) {}
    return () => {
      isMounted = false;
      try { 
        if (navigation.isFocused()) {
          navigation.setParams?.({ hideLayout: false }); 
        }
      } catch (e) {}
      try { parent?.setOptions?.({ tabBarStyle: undefined }); } catch (e) {}
    };
  }, [navigation]);

  // Set a friendly title for TenantLayout to use
  useEffect(() => {
    let isMounted = true;
    const title = (roomData && (roomData.title || roomData.name)) || (room && (room.title || room.name)) || (propertyData && (propertyData.title || propertyData.name));
    try { navigation.setParams?.({ layoutTitle: title, hideLayout: true }); } catch (e) {}
    return () => { 
      isMounted = false;
      try { 
        if (navigation.isFocused()) {
          navigation.setParams?.({ layoutTitle: undefined, hideLayout: false }); 
        }
      } catch (e) {} 
    };
  }, [roomData, room, propertyData, property, navigation]);

  // Prefer the freshest room object (roomData updated on refresh), fallback to route param
  const activeRoom = roomData || room;

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [bookingData, setBookingData] = useState({
    start_date: new Date(),
    end_date: null,
    notes: '',
    payment_method: 'cash',
    payment_plan: 'full',
  });

  const [totalPrice, setTotalPrice] = useState(0);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [pricingBreakdown, setPricingBreakdown] = useState(null);

  // Fetch price from backend instead of local calculation
  useEffect(() => {
    const fetchPrice = async () => {
      if (!bookingData.start_date || !bookingData.end_date) {
        setTotalPrice(0);
        return;
      }

      setIsPricingLoading(true);
      try {
        const startStr = bookingData.start_date.toISOString().split('T')[0];
        const endStr = bookingData.end_date.toISOString().split('T')[0];
        
        // Ensure end date is actually after start date
        if (new Date(endStr) <= new Date(startStr)) {
          setTotalPrice(0);
          return;
        }

        const res = await PropertyService.getRoomPricing(activeRoom.id, startStr, endStr);
        if (res.success) {
          setTotalPrice(res.data.total);
          setPricingBreakdown(res.data.breakdown);
        }
      } catch (err) {
        console.error('Pricing calculation failed', err);
      } finally {
        setIsPricingLoading(false);
      }
    };

    const timer = setTimeout(fetchPrice, 300); // Debounce
    return () => clearTimeout(timer);
  }, [bookingData.start_date, bookingData.end_date, activeRoom.id]);

  // Get allowed methods from landlord settings, default to cash only if not set
  const allowedMethods = activeRoom?.landlord?.payment_methods_settings?.allowed || ['cash'];
  const gcashDetails = activeRoom?.landlord?.payment_methods_settings?.details?.gcash_info;

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return theme.colors.success;
      case 'occupied': return theme.colors.error;
      case 'maintenance': return theme.colors.warning;
      default: return theme.colors.textTertiary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return 'checkmark-circle';
      case 'occupied': return 'people';
      case 'maintenance': return 'construct';
      default: return 'help-circle';
    }
  };

  const handleImageScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentImageIndex(Math.round(index));
  };

  const capitalizeStatus = (status) => {
    return (status || '').replace(/^\w/, c => c.toUpperCase()) || 'Unknown';
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Booking window helpers:
  // - check-in must be within 3 months from today
  // - check-out can be any future date after check-in
  const getAllowedMaxDate = (fromDate = new Date()) => {
    const dt = new Date(fromDate);
    dt.setMonth(dt.getMonth() + 3);
    return dt;
  };

  const isStartWithinAllowedRange = (date) => {
    if (!date) return false;
    const dt = new Date(date);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = getAllowedMaxDate();
    return dt >= start && dt <= end;
  };

  // Handle start date change - auto-fill checkout to 30 days later
  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Ensure selected start date is within allowed range
      if (!isStartWithinAllowedRange(selectedDate)) {
        Alert.alert('Invalid Check-in', 'Check-in must be within the next 3 months.');
        return;
      }

      // Calculate default checkout date (30 days / 1 month later) - allow it to extend beyond 3 months
      const defaultEndDate = new Date(selectedDate);
      defaultEndDate.setDate(defaultEndDate.getDate() + 30);

      setBookingData(prev => ({
        ...prev,
        start_date: selectedDate,
        end_date: defaultEndDate,
      }));
    }
  };

  // Handle end date change - tenant can still manually edit
  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Ensure end date is after start date
      if (bookingData.start_date && selectedDate <= bookingData.start_date) {
        Alert.alert('Invalid Date', 'Check-out date must be after check-in date.');
        return;
      }
      setBookingData(prev => ({ ...prev, end_date: selectedDate }));
    }
  };

  // AUTH GATE: Check if user is authenticated before booking
  const handleBook = () => {
    if (activeRoom.status !== 'available') {
      Alert.alert('Unavailable', 'This room is not available for booking.');
      return;
    }

    // If guest user, trigger auth requirement
    if (isGuest) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to book a room. Create an account or log in to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => {
              if (onAuthRequired) {
                onAuthRequired();
              }
            }
          }
        ]
      );
      return;
    }

    // Reset form with today's date and default end date 30 days later
    const today = new Date();
    const defaultEndDate = new Date(today);
    defaultEndDate.setDate(defaultEndDate.getDate() + 30);

    setBookingData({
      start_date: today,
      end_date: defaultEndDate,
      notes: '',
      payment_method: 'cash', // Reset to default
      payment_plan: 'full',
    });

    setBookingModalVisible(true);
  };

  const onRefresh = async () => {
    if (!propertyData?.id) return;
    setRefreshing(true);
    try {
      const res = await PropertyService.getPublicProperty(propertyData.id);
      if (res.success && res.data) {
        setPropertyData(res.data);
        // find the room in returned data
        const updatedRoom = (res.data.rooms || []).find(r => String(r.id) === String(roomData?.id));
        if (updatedRoom) setRoomData(updatedRoom);
      }
    } catch (err) {
      console.error('Failed to refresh room/property:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const validateDates = () => {
    if (!bookingData.start_date || !bookingData.end_date) {
      Alert.alert('Missing Information', 'Please select both check-in and check-out dates.');
      return false;
    }

    const start = new Date(bookingData.start_date);
    const end = new Date(bookingData.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      Alert.alert('Invalid Date', 'Check-in date cannot be in the past.');
      return false;
    }
    if (end <= start) {
      Alert.alert('Invalid Date', 'Check-out date must be after check-in date.');
      return false;
    }

    // Ensure start is within allowed range (3 months)
    if (!isStartWithinAllowedRange(start)) {
      Alert.alert('Invalid Date', 'Check-in must be within the next 3 months.');
      return false;
    }

    // End date may be any future date after start (no max)

    return true;
  };

  const handleSubmitBooking = async () => {
    try {
      if (!validateDates()) return;

      setIsSubmitting(true);

      const data = {
        room_id: activeRoom.id,
        start_date: bookingData.start_date.toISOString().split('T')[0],
        end_date: bookingData.end_date.toISOString().split('T')[0],
        payment_method: bookingData.payment_method || 'cash',
        payment_plan: bookingData.payment_plan,
        notes: bookingData.notes || null
      };

      console.log('Submitting booking:', data);

      // Create the booking first
      const result = await BookingService.createBooking(data);

      if (result.success) {
        // If payment method is online, create payment link
        if (bookingData.payment_method === 'online') {
          const payRes = await PaymentService.createPaymentLink(activeRoom.id);
          if (payRes.success && payRes.data.checkout_url) {
            await Linking.openURL(payRes.data.checkout_url);
          } else {
            Alert.alert('Booking Created', 'Your booking was created, but we could not generate a payment link. Please pay from your payments dashboard.');
          }
        } else if (bookingData.payment_method === 'cash') {
          // If cash, generate a cash invoice
          await PaymentService.generateCashInvoice(activeRoom.id);
        }

        Alert.alert(
          'Success',
          `Booking submitted successfully! Reference: ${result.data.booking?.booking_reference || 'N/A'}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setBookingModalVisible(false);
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        // Handle errors...
        if (result.error && (
          result.error.toLowerCase().includes('authentication') ||
          result.error.toLowerCase().includes('unauthenticated')
        )) {
          if (onAuthRequired) onAuthRequired();
          else triggerForcedLogout();
          return;
        }

        if (result.details) {
          const errorMessages = Object.values(result.details).flat().join('\n');
          Alert.alert('Validation Error', errorMessages);
        } else {
          Alert.alert('Error', result.error || 'Failed to submit booking.');
        }
      }
    } catch (error) {
      console.error('Booking submission error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // AUTH GATE: Contact landlord also requires auth
  const handleContactLandlord = async () => {
    if (isGuest) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to contact the landlord.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => {
              if (onAuthRequired) {
                onAuthRequired();
              }
            }
          }
        ]
      );
      return;
    }

    try {
      // COMPREHENSIVE DEBUG LOGGING
      console.log('=== CONTACT LANDLORD DEBUG ===');
      console.log('Full property object:', JSON.stringify(property, null, 2));
      console.log('Property keys:', Object.keys(property));
      console.log('Direct property.landlord_id:', property.landlord_id);
      console.log('Direct property.user_id:', property.user_id);
      console.log('Direct property.landlord:', property.landlord);
      console.log('Direct property.landlord_name:', property.landlord_name);
      console.log('Direct property.owner_name:', property.owner_name);
      console.log('==============================');

      // Try EVERY possible way to get landlord_id
      const landlordId = property.landlord_id ||
        property.user_id ||
        property.landlord?.id ||
        property.owner?.id;

      // Try EVERY possible way to get landlord name
      const landlordName = property.landlord_name ||
        property.owner_name ||
        (property.landlord ?
          `${property.landlord.first_name || ''} ${property.landlord.last_name || ''}`.trim()
          : null) ||
        (property.owner ?
          `${property.owner.first_name || ''} ${property.owner.last_name || ''}`.trim()
          : null) ||
        'Landlord';

      console.log('Extracted landlord info:', JSON.stringify({ landlordId, landlordName }, null, 2));

      // Check if we have the landlord information
      if (!landlordId) {
        console.error('LANDLORD ID NOT FOUND!');
        console.error('Available property data:', Object.keys(property));

        Alert.alert(
          'Debug Info',
          `Property ID: ${property.id}\n\nAvailable fields: ${Object.keys(property).join(', ')}\n\nPlease screenshot this and check the backend response.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Show more detailed error
                Alert.alert(
                  'Error',
                  'Landlord information not available. This might be an older property listing. Please try viewing the property again from the home page.',
                  [
                    {
                      text: 'Go Back',
                      onPress: () => navigation.goBack()
                    }
                  ]
                );
              }
            }
          ]
        );
        return;
      }

      console.log('Navigating to Messages with:', {
        landlordId,
        landlordName,
        propertyId: property.id,
        propertyTitle: property.name || property.title,
        roomId: activeRoom.id,
        roomNumber: activeRoom.room_number
      });

      // Navigate to Messages with the conversation parameters
      navigation.navigate('Messages', {
        startConversation: true,
        recipient: {
          id: landlordId,
          name: landlordName,
        },
        property: {
          id: property.id,
          title: property.name || property.title,
        },
        room: {
          id: activeRoom.id,
          room_number: activeRoom.room_number,
        }
      });
    } catch (error) {
      console.error('Error navigating to messages:', error);
      console.error('Error stack:', error.stack);
      Alert.alert('Error', `Failed to open messages: ${error.message}\n\nPlease try again.`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.headerBar, { backgroundColor: theme.colors.primary, borderBottomColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse || '#fff'} />
        </TouchableOpacity>

        <Text style={[styles.titleTxt, { color: theme.colors.textInverse || '#fff' }]}>Room Details</Text>

        <View style={styles.emptyHeaderSide} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Image Gallery */}
        {activeRoom.images && activeRoom.images.length > 0 ? (
          <View style={styles.imageGalleryContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleImageScroll}
              scrollEventThrottle={16}
            >
              {activeRoom.images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: getRoomImageUrl(image) }}
                  style={styles.roomImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            {/* Image Indicators */}
            {activeRoom.images.length > 1 && (
              <View style={styles.imageIndicator}>
                {activeRoom.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicatorDot,
                      index === currentImageIndex && styles.indicatorDotActive
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.imageGalleryContainer}>
            <Image
              source={{ uri: 'https://via.placeholder.com/400x280?text=No+Image' }}
              style={styles.roomImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Room Header */}
          <View style={styles.roomHeader}>
            <Text style={styles.roomNumber}>Room {activeRoom.room_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activeRoom.status) + '20' }]}>
              <Ionicons name={getStatusIcon(activeRoom.status)} size={14} color={getStatusColor(activeRoom.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(activeRoom.status) }]}>
                {capitalizeStatus(activeRoom.status)}
              </Text>
            </View>
          </View>

          {/* Room Type */}
          <Text style={styles.roomType}>{activeRoom.type_label || activeRoom.room_type}</Text>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₱{(Number(activeRoom.monthly_rate) || 0).toLocaleString()}</Text>
            <Text style={styles.priceLabel}>/month</Text>
          </View>

          {/* Room Details Grid */}
          <View style={styles.section}>
            <View style={styles.amenitiesGrid}>
              <View style={styles.amenityItem}>
                <Ionicons name="layers-outline" size={18} color="#6b7280" />
                <Text style={styles.amenityText}>{activeRoom.floor_label || `Floor ${activeRoom.floor}`}</Text>
              </View>
              <View style={styles.amenityItem}>
                <Ionicons name="people-outline" size={18} color="#6b7280" />
                <Text style={styles.amenityText}>Capacity: {activeRoom.capacity} {activeRoom.capacity === 1 ? 'person' : 'people'}</Text>
              </View>
            </View>
            {activeRoom.capacity && parseInt(activeRoom.capacity, 10) > 1 && (
              <Text style={styles.psText}>
                PS: This room has a capacity of {activeRoom.capacity}. The monthly rent can be divided if you find another tenant (or wait for one); otherwise you'll pay the full room rent.
              </Text>
            )}
          </View>

          {/* Description */}
          {activeRoom.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{activeRoom.description}</Text>
            </View>
          )}

          {/* Amenities */}
          {activeRoom.amenities && activeRoom.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Room Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {activeRoom.amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityItem}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                    <Text style={[styles.amenityText, { color: theme.colors.text }]}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Room Rules */}
          {((activeRoom.rules && activeRoom.rules.length > 0) || (propertyData?.rules && propertyData.rules.length > 0)) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Room Rules</Text>
              <View style={styles.rulesList}>
                {(activeRoom.rules?.length > 0 ? activeRoom.rules : propertyData?.rules || []).map((rule, index) => (
                  <View key={index} style={styles.ruleItem}>
                    <Ionicons name="alert-circle-outline" size={18} color="#f97316" />
                    <Text style={[styles.ruleText, { color: theme.colors.text }]}>{rule}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* GUEST USER NOTICE */}
          {isGuest && (
            <View style={styles.guestNotice}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.guestNoticeText}>
                Sign in to book rooms and contact landlords
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          {activeRoom.status === 'available' && (
            <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
              <Text style={styles.bookButtonText}>
                {isGuest ? 'Sign In to Book' : 'Book This Room'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.contactButton} onPress={handleContactLandlord}>
            <Ionicons name="chatbubble-outline" size={18} color="#ffffff" />
            <Text style={styles.contactButtonText}>Contact Landlord</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Booking Modal - UPDATED WITH DATE PICKERS */}
      <Modal
        visible={bookingModalVisible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => !isSubmitting && setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Book Room {activeRoom.room_number}</Text>
            <Text style={styles.psText}>Monthly = 30 days (no prorate)</Text>

            {/* Start Date Picker */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Check-in Date <Text style={{color: '#ef4444'}}>*</Text></Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
                disabled={isSubmitting}
              >
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                <Text style={styles.dateButtonText}>{formatDate(bookingData.start_date)}</Text>
              </TouchableOpacity>

              {showStartDatePicker && (
                <DateTimePicker
                  value={bookingData.start_date || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onStartDateChange}
                  minimumDate={new Date()}
                  maximumDate={getAllowedMaxDate()}
                />
              )}
            </View>

            {/* End Date Picker */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Check-out Date <Text style={{color: '#ef4444'}}>*</Text></Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
                disabled={isSubmitting}
              >
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                <Text style={styles.dateButtonText}>{formatDate(bookingData.end_date)}</Text>
              </TouchableOpacity>

              {showEndDatePicker && (
                <DateTimePicker
                  value={bookingData.end_date || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onEndDateChange}
                  minimumDate={bookingData.start_date || new Date()}
                  // No maximumDate: checkout may be any future date
                />
              )}
            </View>

            {/* Payment Method Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Payment Method <Text style={{color: '#ef4444'}}>*</Text></Text>
              
              <View style={styles.paymentMethodRow}>
                {paymentOptions.methods.includes('cash') && (
                  <TouchableOpacity 
                    style={[
                      styles.paymentMethodBtn, 
                      bookingData.payment_method === 'cash' && styles.paymentMethodBtnActive
                    ]}
                    onPress={() => setBookingData(prev => ({ ...prev, payment_method: 'cash' }))}
                  >
                     <Text style={[
                       styles.paymentMethodBtnText, 
                       bookingData.payment_method === 'cash' && styles.paymentMethodBtnTextActive
                     ]}>Cash</Text>
                  </TouchableOpacity>
                )}

                {paymentOptions.methods.includes('online') && paymentOptions.is_paymongo_ready && (
                  <TouchableOpacity 
                    style={[
                      styles.paymentMethodBtn, 
                      bookingData.payment_method === 'online' && styles.paymentMethodBtnActive
                    ]}
                    onPress={() => setBookingData(prev => ({ ...prev, payment_method: 'online' }))}
                  >
                     <Text style={[
                       styles.paymentMethodBtnText, 
                       bookingData.payment_method === 'online' && styles.paymentMethodBtnTextActive
                     ]}>Online (PayMongo)</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Payment Plan Selection - Only for stays >= 2 months */}
            {pricingBreakdown && pricingBreakdown.months >= 2 && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Payment Plan <Text style={{color: '#ef4444'}}>*</Text></Text>
                
                <View style={styles.paymentMethodRow}>
                  <TouchableOpacity 
                    style={[
                      styles.paymentMethodBtn, 
                      bookingData.payment_plan === 'full' && styles.paymentMethodBtnActive
                    ]}
                    onPress={() => setBookingData(prev => ({ ...prev, payment_plan: 'full' }))}
                  >
                     <Text style={[
                       styles.paymentMethodBtnText, 
                       bookingData.payment_plan === 'full' && styles.paymentMethodBtnTextActive
                     ]}>Full</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[
                      styles.paymentMethodBtn, 
                      bookingData.payment_plan === 'monthly' && styles.paymentMethodBtnActive
                    ]}
                    onPress={() => setBookingData(prev => ({ ...prev, payment_plan: 'monthly' }))}
                  >
                     <Text style={[
                       styles.paymentMethodBtnText, 
                       bookingData.payment_plan === 'monthly' && styles.paymentMethodBtnTextActive
                     ]}>Monthly</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.summaryNote, { marginTop: 8, fontStyle: 'italic' }]}>
                  {bookingData.payment_plan === 'monthly' 
                    ? 'Pay the first month now to confirm, then pay monthly.'
                    : 'Pay the total amount within 3 days to confirm your booking.'}
                </Text>
              </View>
            )}

            {/* Duration & Cost Summary */}
            {bookingData.end_date && (
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duration</Text>
                  <Text style={styles.summaryValue}>
                    {isPricingLoading ? 'Calculating...' : (
                      pricingBreakdown 
                        ? `${pricingBreakdown.months || 0} month(s) ${pricingBreakdown.remaining_days > 0 ? `+ ${pricingBreakdown.remaining_days} day(s)` : ''}`
                        : 'Select dates'
                    )}
                  </Text>
                </View>
                
                {activeRoom.requires_advance && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>1-Month Advance</Text>
                    <Text style={styles.summaryValue}>
                      ₱{(Number(activeRoom.monthly_rate) || 0).toLocaleString()}
                    </Text>
                  </View>
                )}

                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#bbf7d0', paddingTop: 8, marginTop: 8 }]}>
                  <Text style={styles.summaryLabelBold}>Total Amount</Text>
                  <Text style={styles.summaryValueBold}>
                    {isPricingLoading ? '...' : `₱${(
                      (Number(totalPrice) || 0) + (activeRoom.requires_advance ? Number(activeRoom.monthly_rate) : 0)
                    ).toLocaleString()}`}
                  </Text>
                </View>
                
                <View style={{ marginTop: 8 }}>
                  {pricingBreakdown && pricingBreakdown.months > 0 && (
                    <Text style={[styles.summaryNote, { marginBottom: 2 }]}>
                      Rent: ₱{(Number(activeRoom.monthly_rate) || 0).toLocaleString()}/month × {pricingBreakdown.months}
                    </Text>
                  )}
                  {activeRoom.requires_advance && (
                    <Text style={[styles.summaryNote, { color: theme.colors.primary, fontWeight: '600' }]}>
                      * Includes 1-month advance required for this room
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Notes */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Add any special requests or notes"
                placeholderTextColor="#999"
                multiline
                value={bookingData.notes}
                onChangeText={(text) => setBookingData(prev => ({ ...prev, notes: text }))}
                editable={!isSubmitting}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, (!bookingData.end_date || isSubmitting) && styles.submitButtonDisabled]}
              onPress={handleSubmitBooking}
              disabled={!bookingData.end_date || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Booking</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setBookingModalVisible(false)}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}