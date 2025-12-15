import { useState, useEffect } from 'react';
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
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from '../../../styles/Tenant/RoomDetailsScreen';
import BookingService from '../../../services/BookingServices';
import PropertyService from '../../../services/PropertyServices';

const { width } = Dimensions.get('window');

const API_BASE_URL = 'http://10.20.74.141:8000';

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
  const { room, property } = route.params;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [propertyData, setPropertyData] = useState(property || null);
  const [roomData, setRoomData] = useState(room || null);

  useEffect(() => {
    // keep roomData in sync when navigation param changes
    setRoomData(room);
    setPropertyData(property);
  }, [room, property]);

  // Prefer the freshest room object (roomData updated on refresh), fallback to route param
  const activeRoom = roomData || room;

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [bookingData, setBookingData] = useState({
    start_date: new Date(),
    end_date: null,
    notes: ''
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'occupied': return '#ef4444';
      case 'maintenance': return '#f59e0b';
      default: return '#6b7280';
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
  // - check-in must be within current month (from today through end of this month)
  // - check-out can be any future date after check-in
  const getEndOfCurrentMonth = (fromDate = new Date()) => {
    const year = fromDate.getFullYear();
    const month = fromDate.getMonth(); // 0-indexed
    const lastDay = new Date(year, month + 1, 0);
    lastDay.setHours(23, 59, 59, 999);
    return lastDay;
  };

  const isStartWithinCurrentMonth = (date) => {
    if (!date) return false;
    const dt = new Date(date);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = getEndOfCurrentMonth();
    return dt >= start && dt <= end;
  };

  // Calculate duration between dates
  const calculateDuration = () => {
    if (!bookingData.start_date || !bookingData.end_date) return null;

    const start = new Date(bookingData.start_date);
    const end = new Date(bookingData.end_date);

    if (end <= start) return null;

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30); // full 30-day months
    const extraDays = diffDays % 30;

    return { days: diffDays, months, extraDays };
  };

  // Calculate total cost
  const calculateTotal = () => {
    const duration = calculateDuration();
    if (!duration) return 0;
    // Normalize billing policy keys to be robust against underscores/spaces/casing
    const billing = String(activeRoom.billing_policy || 'monthly')
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, '_');
    const monthly = Number(activeRoom.monthly_rate) || 0;
    const daily = Number(activeRoom.daily_rate) || Math.round(monthly / 30) || 0;

    // Conservative fallback: if policy is monthly but a daily rate exists and there are extra days,
    // treat as monthly_with_daily to avoid over-charging by rounding up full months.
    let effectiveBilling = billing;
    if (effectiveBilling === 'monthly' && daily > 0 && duration.extraDays > 0) {
      effectiveBilling = 'monthly_with_daily';
    }

    if (effectiveBilling === 'monthly_with_daily' || effectiveBilling === 'monthly+daily' || effectiveBilling === 'monthly_and_daily') {
      // charge full months + remaining days at daily rate
      return (duration.months * monthly) + (duration.extraDays * daily);
    }

    if (effectiveBilling === 'daily') {
      return duration.days * daily;
    }

    // default: monthly billing (round up to nearest month)
    const monthsCeil = Math.ceil(duration.days / 30);
    return monthsCeil * monthly;
  };

  // Handle start date change - auto-fill checkout to 30 days later
  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Ensure selected start date is within current month
      if (!isStartWithinCurrentMonth(selectedDate)) {
        Alert.alert('Invalid Check-in', 'Check-in must be within the current month.');
        return;
      }

      // Calculate default checkout date (30 days / 1 month later) - allow it to extend beyond current month
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
      notes: ''
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

    // Ensure start is within current month
    if (!isStartWithinCurrentMonth(start)) {
      Alert.alert('Invalid Date', 'Check-in must be within the current month.');
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
        notes: bookingData.notes || null
      };

      console.log('Submitting booking:', data);

      const result = await BookingService.createBooking(data);

      console.log('Booking result:', result);

      if (result.success) {
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
        // Check if it's an authentication error
        if (result.error && (
          result.error.toLowerCase().includes('authentication') ||
          result.error.toLowerCase().includes('unauthenticated') ||
          result.error.toLowerCase().includes('token') ||
          result.error.toLowerCase().includes('login')
        )) {
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please log in again.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setBookingModalVisible(false);
                  if (onAuthRequired) {
                    onAuthRequired();
                  } else {
                    navigation.navigate('Auth');
                  }
                }
              }
            ]
          );
          return;
        }

        // Handle validation errors
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

  const duration = calculateDuration();
  const total = calculateTotal();

  // Prepare readable duration and breakdown lines for the summary
  let durationLabel = '';
  let breakdownLine = '';
  if (duration) {
    // Normalize billing policy keys to be robust against underscores/spaces/casing
    const billing = String(activeRoom.billing_policy || 'monthly')
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, '_');
    const monthly = Number(activeRoom.monthly_rate) || 0;
    const daily = Number(activeRoom.daily_rate) || Math.round(monthly / 30) || 0;

    // Apply the same conservative fallback used in calculation
    let effectiveBilling = billing;
    if (effectiveBilling === 'monthly' && daily > 0 && duration.extraDays > 0) {
      effectiveBilling = 'monthly_with_daily';
    }

    // debug strings removed in production

    if (effectiveBilling === 'monthly_with_daily' || effectiveBilling === 'monthly+daily' || effectiveBilling === 'monthly_and_daily') {
      durationLabel = `${duration.days} days (${duration.months} ${duration.months === 1 ? 'month' : 'months'}${duration.extraDays > 0 ? ` + ${duration.extraDays} ${duration.extraDays === 1 ? 'day' : 'days'}` : ''})`;
      breakdownLine = `₱${monthly.toLocaleString()}/month × ${duration.months} ${duration.months === 1 ? 'month' : 'months'}${duration.extraDays > 0 ? ` + ₱${daily.toLocaleString()}/day × ${duration.extraDays} ${duration.extraDays === 1 ? 'day' : 'days'}` : ''}`;
    } else if (effectiveBilling === 'daily') {
      durationLabel = `${duration.days} days`;
      breakdownLine = `₱${daily.toLocaleString()}/day × ${duration.days} ${duration.days === 1 ? 'day' : 'days'}`;
    } else {
      const monthsCeil = Math.ceil(duration.days / 30);
      durationLabel = `${duration.days} days (${monthsCeil} ${monthsCeil === 1 ? 'month' : 'months'})`;
      breakdownLine = `₱${monthly.toLocaleString()}/month × ${monthsCeil} ${monthsCeil === 1 ? 'month' : 'months'}`;
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Room Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10b981"]}
            tintColor="#10b981"
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
              <Text style={{ marginTop: 6, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>
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
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.amenityText}>{amenity}</Text>
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
                  maximumDate={getEndOfCurrentMonth()}
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

            {/* Duration & Cost Summary */}
            {duration && (
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duration</Text>
                  <Text style={styles.summaryValue}>
                    {durationLabel}
                  </Text>
                </View>
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#bbf7d0', paddingTop: 8, marginTop: 8 }]}>
                  <Text style={styles.summaryLabelBold}>Total Amount</Text>
                  <Text style={styles.summaryValueBold}>₱{total.toLocaleString()}</Text>
                </View>
                <Text style={styles.summaryNote}>
                  {breakdownLine}
                </Text>

                {/* debug badge removed */}
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
              style={[styles.submitButton, (!duration || isSubmitting) && styles.submitButtonDisabled]}
              onPress={handleSubmitBooking}
              disabled={!duration || isSubmitting}
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