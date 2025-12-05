import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { styles } from '../../../styles/Menu/MyBookings.js';
import BookingService from '../../../services/BookingServices.js';

const API_BASE_URL = 'http://10.221.1.156:8000';

export default function MyBookings() {
  const navigation = useNavigation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const result = await BookingService.getMyBookings();
      
      if (result.success && result.data) {
        // Transform backend data to match frontend format
        const transformedBookings = result.data.map(booking => {
          // Get property image
          let imageUri = null;
          if (booking.property && booking.property.images && booking.property.images.length > 0) {
            const primaryImage = booking.property.images.find(img => img.is_primary) || booking.property.images[0];
            if (primaryImage && primaryImage.image_url) {
              const cleanPath = primaryImage.image_url.replace(/^\/?(storage\/)?/, '');
              imageUri = { uri: `${API_BASE_URL}/storage/${cleanPath}` };
            }
          }
          
          // Fallback to placeholder if no image
          if (!imageUri) {
            imageUri = { uri: 'https://via.placeholder.com/400x200?text=No+Image' };
          }

          // Format location
          const locationParts = [];
          if (booking.property) {
            if (booking.property.city) locationParts.push(booking.property.city);
            if (booking.property.province) locationParts.push(booking.property.province);
            if (booking.property.country) locationParts.push(booking.property.country);
          }
          const location = locationParts.length > 0 ? locationParts.join(', ') : 'Location not available';

          // Format dates
          const checkIn = booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }) : 'N/A';
          
          const checkOut = booking.checkOut ? new Date(booking.checkOut).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }) : 'N/A';

          // Map status from backend to display format
          const statusMap = {
            'pending': 'Pending',
            'confirmed': 'Confirmed',
            'cancelled': 'Cancelled',
            'completed': 'Completed',
            'partial-completed': 'Partial Complete'
          };

          return {
            id: booking.id,
            name: booking.propertyTitle || 'Unknown Property',
            image: imageUri,
            location: location,
            checkIn: checkIn,
            checkOut: checkOut,
            price: booking.monthlyRent || booking.amount || 0,
            status: statusMap[booking.status] || booking.status || 'Pending',
            statusRaw: booking.status,
            paymentStatus: booking.paymentStatus,
            bookingReference: booking.bookingReference
          };
        });
        
        setBookings(transformedBookings);
      } else {
        console.error('Failed to fetch bookings:', result.error);
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchBookings();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Confirmed': return '#10B981';
      case 'Completed': return '#10B981';
      case 'Pending': return '#F59E0B';
      case 'Partial': return '#3B82F6';
      case 'Partial Complete': return '#3B82F6';
      case 'Cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.emptyText}>Loading bookings...</Text>
          </View>
        ) : bookings.length > 0 ? (
          bookings.map((booking) => (
            <TouchableOpacity key={booking.id} style={styles.bookingCard}>
              <Image source={booking.image} style={styles.bookingImage} />
              <View style={styles.bookingInfo}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingName}>{booking.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                      {booking.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.locationText}>{booking.location}</Text>
                </View>
                <View style={styles.dateRow}>
                  <View style={styles.dateItemLeft}>
                    <Text style={styles.dateLabel}>Check-in</Text>
                    <Text style={styles.dateValue}>{booking.checkIn}</Text>
                  </View>
                  <View style={styles.dateIconContainer}>
                    <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
                  </View>
                  <View style={styles.dateItemRight}>
                    <Text style={styles.dateLabel}>Check-out</Text>
                    <Text style={styles.dateValue}>{booking.checkOut}</Text>
                  </View>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Monthly Rent:</Text>
                  <Text style={styles.price}>₱{booking.price.toLocaleString()}/month</Text>
                </View>
                {booking.paymentStatus && (
                  <View style={styles.paymentStatusRow}>
                    <Text style={styles.paymentStatusLabel}>Payment:</Text>
                    <Text style={[styles.paymentStatusText, { 
                      color: booking.paymentStatus === 'paid' ? '#10b981' : 
                             booking.paymentStatus === 'partial' ? '#3B82F6' : 
                             booking.paymentStatus === 'refunded' ? '#8B5CF6' : '#EF4444'
                    }]}>
                      {booking.paymentStatus === 'paid' ? 'Paid' : 
                       booking.paymentStatus === 'partial' ? 'Partial Paid' : 
                       booking.paymentStatus === 'refunded' ? 'Refunded' : 'Unpaid'}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Bookings Yet</Text>
            <Text style={styles.emptyText}>Start exploring accommodations to make your first booking!</Text>
            <TouchableOpacity style={styles.exploreButton} onPress={() => navigation.navigate('TenantHome')}>
              <Text style={styles.exploreButtonText}>Explore Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}