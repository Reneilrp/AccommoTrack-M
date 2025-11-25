import { useState } from 'react';
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
  Platform
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from '../../../styles/Tenant/RoomDetailsScreen';

import BookingService from '../../../services/BookingServices';

const { width } = Dimensions.get('window');

export default function RoomDetailsScreen({ route, isGuest = false, onAuthRequired }) {
  const navigation = useNavigation();
  const { room, property } = route.params;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Calculate duration between dates
  const calculateDuration = () => {
    if (!bookingData.start_date || !bookingData.end_date) return null;

    const start = new Date(bookingData.start_date);
    const end = new Date(bookingData.end_date);

    if (end <= start) return null;

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.ceil(diffDays / 30); // Approximate months

    return { days: diffDays, months };
  };

  // Calculate total cost
  const calculateTotal = () => {
    const duration = calculateDuration();
    if (!duration) return 0;
    return room.monthly_rate * duration.months;
  };

  // Handle start date change
  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setBookingData(prev => ({ ...prev, start_date: selectedDate }));

      // Reset end date if it's before the new start date
      if (prev.end_date && selectedDate >= prev.end_date) {
        setBookingData(prev => ({ ...prev, end_date: null }));
      }
    }
  };

  // Handle end date change
  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setBookingData(prev => ({ ...prev, end_date: selectedDate }));
    }
  };

  // AUTH GATE: Check if user is authenticated before booking
  const handleBook = () => {
    if (room.status !== 'available') {
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

    // Reset form with today's date and tomorrow as default end date
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    setBookingData({
      start_date: today,
      end_date: tomorrow,
      notes: ''
    });

    setBookingModalVisible(true);
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

    return true;
  };

  const handleSubmitBooking = async () => {
    try {
      if (!validateDates()) return;

      setIsSubmitting(true);

      const data = {
        room_id: room.id,
        start_date: bookingData.start_date.toISOString().split('T')[0], // YYYY-MM-DD
        end_date: bookingData.end_date.toISOString().split('T')[0], // YYYY-MM-DD
        notes: bookingData.notes || null
      };

      console.log('Submitting booking:', data);

      const result = await BookingService.createBooking(data);

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
      // Navigate to Messages with landlord and property info
      navigation.navigate('Messages', {
        startConversation: true,
        recipient: {
          id: property.landlord_id,
          name: property.landlord_name || 'Landlord',
        },
        property: {
          id: property.id,
          title: property.name || property.title,
        },
        room: {
          id: room.id,
          room_number: room.room_number,
        }
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  const duration = calculateDuration();
  const total = calculateTotal();

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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        {room.images && room.images.length > 0 ? (
          <View style={styles.imageGalleryContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleImageScroll}
              scrollEventThrottle={16}
            >
              {room.images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  style={styles.roomImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            {/* Image Indicators */}
            {room.images.length > 1 && (
              <View style={styles.imageIndicator}>
                {room.images.map((_, index) => (
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
            <Text style={styles.roomNumber}>Room {room.room_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(room.status) + '20' }]}>
              <Ionicons name={getStatusIcon(room.status)} size={14} color={getStatusColor(room.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(room.status) }]}>
                {capitalizeStatus(room.status)}
              </Text>
            </View>
          </View>

          {/* Room Type */}
          <Text style={styles.roomType}>{room.type_label || room.room_type}</Text>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₱{room.monthly_rate.toLocaleString()}</Text>
            <Text style={styles.priceLabel}>/month</Text>
          </View>

          {/* Room Details Grid */}
          <View style={styles.section}>
            <View style={styles.amenitiesGrid}>
              <View style={styles.amenityItem}>
                <Ionicons name="layers-outline" size={18} color="#6b7280" />
                <Text style={styles.amenityText}>{room.floor_label || `Floor ${room.floor}`}</Text>
              </View>
              <View style={styles.amenityItem}>
                <Ionicons name="people-outline" size={18} color="#6b7280" />
                <Text style={styles.amenityText}>Capacity: {room.capacity} {room.capacity === 1 ? 'person' : 'people'}</Text>
              </View>
            </View>
            {room.capacity && parseInt(room.capacity, 10) > 1 && (
              <Text style={{ marginTop: 6, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>
                PS: This room has a capacity of {room.capacity}. The monthly rent can be divided if you find another tenant (or wait for one); otherwise you'll pay the full room rent.
              </Text>
            )}
          </View>

          {/* Description */}
          {room.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{room.description}</Text>
            </View>
          )}

          {/* Amenities */}
          {room.amenities && room.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Room Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {room.amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Property Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Information</Text>

            {/* Property Name */}
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={18} color="#6b7280" />
              <Text style={styles.infoText}>{property.name || property.title}</Text>
            </View>

            {/* Address */}
            {property.address && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color="#6b7280" />
                <Text style={styles.infoText}>{property.address}</Text>
              </View>
            )}

            {/* Property Rules */}
            {property.propertyRules && property.propertyRules.length > 0 && (
              <View style={styles.rulesContainer}>
                <Text style={styles.rulesTitle}>Property Rules</Text>
                {property.propertyRules.slice(0, 3).map((rule, index) => (
                  <View key={index} style={styles.ruleItem}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#10b981" />
                    <Text style={styles.ruleText}>{rule}</Text>
                  </View>
                ))}
                {property.propertyRules.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => navigation.navigate('AccommodationDetails', { accommodation: property })}
                  >
                    <Text style={styles.viewAllText}>View all property details →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

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
          {room.status === 'available' && (
            <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
              <Text style={styles.bookButtonText}>
                {isGuest ? 'Sign In to Book' : 'Book This Room'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.contactButton} onPress={handleContactLandlord}>
            <Ionicons name="chatbubble-outline" size={18} color="#10b981" />
            <Text style={styles.contactButtonText}>Contact Landlord</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Booking Modal - UPDATED WITH DATE PICKERS */}
      <Modal
        visible={bookingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isSubmitting && setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Book Room {room.room_number}</Text>

            {/* Start Date Picker */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Check-in Date *</Text>
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
                />
              )}
            </View>

            {/* End Date Picker */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Check-out Date *</Text>
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
                />
              )}
            </View>

            {/* Duration & Cost Summary */}
            {duration && (
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duration</Text>
                  <Text style={styles.summaryValue}>
                    {duration.days} days ({duration.months} {duration.months === 1 ? 'month' : 'months'})
                  </Text>
                </View>
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#bbf7d0', paddingTop: 8, marginTop: 8 }]}>
                  <Text style={styles.summaryLabelBold}>Total Amount</Text>
                  <Text style={styles.summaryValueBold}>₱{total.toLocaleString()}</Text>
                </View>
                <Text style={styles.summaryNote}>
                  ₱{room.monthly_rate.toLocaleString()}/month × {duration.months} months
                </Text>
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