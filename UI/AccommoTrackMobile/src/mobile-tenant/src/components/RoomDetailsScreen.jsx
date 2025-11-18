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
  ActivityIndicator } from 'react-native';
  
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Tenant/RoomDetailsScreen';

import BookingService from '../../../services/BookingServices';  

const { width } = Dimensions.get('window');

export default function RoomDetailsScreen({ route, isGuest = false, onAuthRequired }) {
  const navigation = useNavigation();
  const { room, property } = route.params;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState({
    start_date: '',
    total_months: '',
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

  // 🔐 AUTH GATE: Check if user is authenticated before booking
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
    
    // Pre-fill with today's date in correct format
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    setBookingData({
      start_date: formattedDate,
      total_months: '',
      notes: ''
    });
    
    setBookingModalVisible(true);
  };

  const validateDate = (dateString) => {
    // Check format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }
    
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if valid date and not in the past
    return date instanceof Date && !isNaN(date) && date >= today;
  };

  const handleSubmitBooking = async () => {
    try {
      // Validate inputs
      if (!bookingData.start_date || !bookingData.total_months) {
        Alert.alert('Missing Information', 'Please fill in all required fields.');
        return;
      }

      // Validate date format
      if (!validateDate(bookingData.start_date)) {
        Alert.alert(
          'Invalid Date', 
          'Please enter a valid date in YYYY-MM-DD format (e.g., 2024-12-25) that is not in the past.'
        );
        return;
      }

      // Validate total months
      const months = parseInt(bookingData.total_months);
      if (isNaN(months) || months < 1) {
        Alert.alert('Invalid Duration', 'Please enter a valid number of months (minimum 1).');
        return;
      }

      setIsSubmitting(true);

      const data = {
        room_id: room.id,
        start_date: bookingData.start_date,
        total_months: months,
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

  const updateBookingData = (field, value) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    const months = parseInt(bookingData.total_months);
    if (isNaN(months) || months < 1) return 0;
    return room.monthly_rate * months;
  };

  // 🔐 AUTH GATE: Contact landlord also requires auth
  const handleContactLandlord = () => {
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

    // TODO: Navigate to messages/chat
    Alert.alert('Contact Landlord', 'Messaging feature coming soon!');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
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

          {/* 🔐 GUEST USER NOTICE */}
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

      {/* Booking Modal - Only shown for authenticated users */}
      <Modal
        visible={bookingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isSubmitting && setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Book Room {room.room_number}</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Start Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (e.g., 2024-12-25)"
                placeholderTextColor="#999"
                value={bookingData.start_date}
                onChangeText={(text) => updateBookingData('start_date', text)}
                editable={!isSubmitting}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Duration (Months) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter number of months"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={bookingData.total_months}
                onChangeText={(text) => updateBookingData('total_months', text)}
                editable={!isSubmitting}
              />
            </View>

            {bookingData.total_months && parseInt(bookingData.total_months) > 0 && (
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Amount:</Text>
                <Text style={styles.totalAmount}>₱{calculateTotal().toLocaleString()}</Text>
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Add any special requests or notes"
                placeholderTextColor="#999"
                multiline
                value={bookingData.notes}
                onChangeText={(text) => updateBookingData('notes', text)}
                editable={!isSubmitting}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
              onPress={handleSubmitBooking}
              disabled={isSubmitting}
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