import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
// SafeAreaView handled by shared ScreenLayout
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { styles } from '../../../../styles/Menu/MyBookings.js';
import BookingService from '../../../../services/BookingServices.js';
import { Alert } from 'react-native';
import { BASE_URL as API_BASE_URL } from '../../../../config';
import { useTheme } from '../../../../contexts/ThemeContext';
import { BookingCardSkeleton } from '../../../../components/Skeletons';
import Header from '../../components/Header.jsx';
import homeStyles from '../../../../styles/Tenant/HomePage.js';

export default function MyBookings() {
  const navigation = useNavigation();
  const { theme } = useTheme();
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

          // Derive room label from common shapes/relations
          const roomCandidates = [
            booking.room && (booking.room.number || booking.room.name),
            booking.room_number,
            booking.roomName,
            booking.room_no,
            booking.room_label,
            // fallback to first room in rooms array
            booking.rooms && booking.rooms[0] && (booking.rooms[0].number || booking.rooms[0].name)
          ];
          const roomLabel = roomCandidates.find(r => r !== undefined && r !== null && r !== '') || null;

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
            propertyId: booking.property?.id || null,
            image: imageUri,
            location: location,
            roomLabel,
            checkIn: checkIn,
            checkOut: checkOut,
            price: booking.monthlyRent || booking.amount || 0,
            status: statusMap[booking.status] || booking.status || 'Pending',
            statusRaw: booking.status,
            paymentStatus: booking.paymentStatus,
            bookingReference: booking.bookingReference,
            hasReview: booking.hasReview
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

  const handleCancel = (bookingId) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', onPress: async () => {
            try {
              const res = await BookingService.cancelBooking(bookingId);
              if (res.success) {
                // refresh list
                fetchBookings();
              } else {
                Alert.alert('Failed', res.error || 'Failed to cancel booking');
              }
            } catch (err) {
              console.error('Cancel error', err);
              Alert.alert('Error', 'Failed to cancel booking');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Confirmed': return theme.colors.primary;
      case 'Completed': return theme.colors.primary;
      case 'Pending': return '#F59E0B';
      case 'Partial': return '#3B82F6';
      case 'Partial Complete': return '#3B82F6';
      case 'Cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <View style={homeStyles.flex1}>
      <ScrollView 
        style={[styles.content, { backgroundColor: theme.colors.background }]} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={homeStyles.contentContainerPadding}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
          {loading ? (
            <>
              <BookingCardSkeleton />
              <BookingCardSkeleton />
              <BookingCardSkeleton />
              <BookingCardSkeleton />
            </>
          ) : bookings.length > 0 ? (
            bookings.map((booking) => (
            <TouchableOpacity key={booking.id} style={[styles.bookingCard, { backgroundColor: theme.colors.surface }]} onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id, propertyId: booking.propertyId })}>
              <Image source={booking.image} style={styles.bookingImage} />
              <View style={styles.bookingInfo}>
                <View style={styles.bookingHeader}>
                  <Text style={[styles.bookingName, { color: theme.colors.text }]}>{booking.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                      {booking.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>{booking.location}</Text>
                </View>
                {booking.roomLabel ? (
                  <View style={styles.locationRow}>
                    <Ionicons name="bed-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>Room {booking.roomLabel}</Text>
                  </View>
                ) : null}
                <View style={[styles.dateRow, { backgroundColor: theme.colors.backgroundSecondary || '#F3F4F6' }]}>
                  <View style={styles.dateItemLeft}>
                    <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>Check-in</Text>
                    <Text style={[styles.dateValue, { color: theme.colors.text }]}>{booking.checkIn}</Text>
                  </View>
                  <View style={styles.dateIconContainer}>
                    <Ionicons name="arrow-forward" size={16} color={theme.colors.textTertiary} />
                  </View>
                  <View style={styles.dateItemRight}>
                    <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>Check-out</Text>
                    <Text style={[styles.dateValue, { color: theme.colors.text }]}>{booking.checkOut}</Text>
                  </View>
                </View>
                <View style={[styles.priceRow, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>Monthly Rent:</Text>
                  <Text style={[styles.price, { color: theme.colors.primary }]}>₱{booking.price.toLocaleString()}/month</Text>
                </View>
                {booking.paymentStatus && (
                  <View style={[styles.paymentStatusRow, { borderTopColor: theme.colors.border }]}>
                    <Text style={[styles.paymentStatusLabel, { color: theme.colors.textSecondary }]}>Payment:</Text>
                    <Text style={[styles.paymentStatusText, { 
                       color: booking.paymentStatus === 'paid' ? theme.colors.primary : 
                             booking.paymentStatus === 'partial' ? '#3B82F6' : 
                             booking.paymentStatus === 'refunded' ? '#8B5CF6' : '#EF4444'
                    }]}>
                      {booking.paymentStatus === 'paid' ? 'Paid' : 
                       booking.paymentStatus === 'partial' ? 'Partial Paid' : 
                       booking.paymentStatus === 'refunded' ? 'Refunded' : 'Unpaid'}
                    </Text>
                  </View>
                )}
                {((booking.statusRaw === 'completed' || booking.statusRaw === 'confirmed') && !booking.hasReview) && (
                  <View style={styles.reviewBtnContainer}>
                    <TouchableOpacity onPress={() => navigation.navigate('LeaveReview', { bookingId: booking.id, propertyId: booking.propertyId })} style={[styles.reviewBtn, { backgroundColor: theme.colors.primary }]}>
                      <Text style={{ color: theme.colors.textInverse, fontWeight: '600' }}>{booking.statusRaw === 'confirmed' ? 'Review Property' : 'Leave Review'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('ReportProperty', { propertyId: booking.propertyId, propertyTitle: booking.name })} 
                      style={[styles.reviewBtn, { backgroundColor: '#FEE2E2', marginLeft: 8, borderWidth: 1, borderColor: '#FECACA' }]}
                    >
                      <Text style={{ color: '#991B1B', fontWeight: '600' }}>Report</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {booking.hasReview && (
                   <View style={styles.reviewBtnContainer}>
                      <TouchableOpacity 
                        onPress={() => navigation.navigate('ReportProperty', { propertyId: booking.propertyId, propertyTitle: booking.name })} 
                        style={[styles.reviewBtn, { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA', width: '100%' }]}
                      >
                        <Text style={{ color: '#991B1B', fontWeight: '600', textAlign: 'center' }}>Report Issue with Listing</Text>
                      </TouchableOpacity>
                   </View>
                )}
              </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="calendar-outline" size={64} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Bookings Yet</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Start exploring accommodations to make your first booking!</Text>
              <TouchableOpacity style={[styles.exploreButton, { backgroundColor: theme.colors.primary }]} onPress={() => navigation.navigate('TenantHome')}>
                <Text style={styles.exploreButtonText}>Explore Now</Text>
              </TouchableOpacity>
            </View>
          )}
      </ScrollView>
    </View>
  );
}