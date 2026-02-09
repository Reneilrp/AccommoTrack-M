import React, { useState, useEffect } from 'react';
import { View, Text, Image, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
// SafeAreaView provided by ScreenLayout
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import BookingService from '../../../../services/BookingServices.js';
import { styles } from '../../../../styles/Menu/MyBookings.js';
import { useTheme } from '../../../../contexts/ThemeContext';
import { BASE_URL as API_BASE_URL } from '../../../../config';
import { showSuccess, showError } from '../../../../utils/toast';
// ScreenLayout moved to TenantShell to keep header/footer mounted once
import homeStyles from '../../../../styles/Tenant/HomePage.js';

export default function BookingDetails() {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { bookingId } = route.params || {};

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);

  const fetchBooking = async (showToast = false) => {
    try {
      setLoading(true);
      const res = await BookingService.getBookingDetails(bookingId);
      if (res.success && res.data) {
        setBooking(res.data);
        if (showToast) showSuccess('Booking refreshed');
      }
    } catch (err) {
      console.error('Failed to load booking details', err);
      if (showToast) showError('Failed to refresh booking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) fetchBooking();
  }, [bookingId]);

  // Refresh booking details whenever this screen regains focus (after returning from addons/maintenance)
  useFocusEffect(
    React.useCallback(() => {
      if (bookingId) fetchBooking(true);
    }, [bookingId])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No booking found.</Text>
      </View>
    );
  }

  // derive image and display fields similar to MyBookings card
  let imageUri = { uri: 'https://via.placeholder.com/400x200?text=No+Image' };
  if (booking.property && booking.property.images && booking.property.images.length > 0) {
    const primary = booking.property.images.find(i => i.is_primary) || booking.property.images[0];
    if (primary && primary.image_url) {
      const cleanPath = primary.image_url.replace(/^\/?(storage\/)?/, '');
      imageUri = { uri: `${API_BASE_URL}/storage/${cleanPath}` };
    }
  }

  const locationParts = [];
  if (booking.property) {
    if (booking.property.city) locationParts.push(booking.property.city);
    if (booking.property.province) locationParts.push(booking.property.province);
    if (booking.property.country) locationParts.push(booking.property.country);
  }
  const location = locationParts.length > 0 ? locationParts.join(', ') : 'Location not available';

  const roomCandidates = [
    booking.room && (booking.room.number || booking.room.name),
    booking.room_number,
    booking.roomName,
    booking.room_no,
    booking.room_label,
    booking.rooms && booking.rooms[0] && (booking.rooms[0].number || booking.rooms[0].name)
  ];
  const roomLabel = roomCandidates.find(r => r !== undefined && r !== null && r !== '') || null;

  const checkIn = booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : (booking.start_date ? new Date(booking.start_date).toLocaleDateString() : 'N/A');
  const checkOut = booking.checkOut ? new Date(booking.checkOut).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : (booking.end_date ? new Date(booking.end_date).toLocaleDateString() : 'N/A');

  const price = booking.monthlyRent || booking.amount || 0;

  return (
    <View style={homeStyles.flex1}>
      <ScrollView contentContainerStyle={homeStyles.contentContainerPadding} showsVerticalScrollIndicator={false}>
        <Image source={imageUri} style={styles.bookingImage} />

        <View style={{ marginTop: 12 }}>
        <Text style={[styles.bookingName, { color: theme.colors.text }]}>{booking.propertyTitle || booking.property?.title || booking.property?.name || 'Booking'}</Text>
        <Text style={{ color: theme.colors.textSecondary, marginTop: 6 }}>Reference: {booking.bookingReference || booking.reference || 'N/A'}</Text>

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '600', color: theme.colors.text }}>Location</Text>
          <Text style={{ color: theme.colors.textSecondary }}>{location}</Text>
        </View>

        {roomLabel && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: '600', color: theme.colors.text }}>Room</Text>
            <Text style={{ color: theme.colors.textSecondary }}>Room {roomLabel}</Text>
          </View>
        )}

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '600', color: theme.colors.text }}>Check-in</Text>
          <Text style={{ color: theme.colors.textSecondary }}>{checkIn}</Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '600', color: theme.colors.text }}>Check-out</Text>
          <Text style={{ color: theme.colors.textSecondary }}>{checkOut}</Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '600', color: theme.colors.text }}>Monthly Rent</Text>
          <Text style={{ color: theme.colors.textSecondary }}>₱{price.toLocaleString()}/month</Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '600', color: theme.colors.text }}>Status</Text>
          <Text style={{ color: theme.colors.textSecondary }}>{booking.status || booking.statusRaw || 'N/A'}</Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '600', color: theme.colors.text }}>Payment</Text>
          <Text style={{ color: theme.colors.textSecondary }}>{booking.paymentStatus === 'paid' ? 'Paid' : booking.paymentStatus === 'partial' ? 'Partial Paid' : booking.paymentStatus === 'refunded' ? 'Refunded' : 'Unpaid'}</Text>
        </View>

        {/* Addons list (if available on booking) */}
        {booking.addons && booking.addons.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: '600', color: theme.colors.text }}>Add-ons</Text>
            {booking.addons.map((a) => (
              <View key={a.id} style={{ marginTop: 8 }}>
                <Text style={{ color: theme.colors.text }}>{a.name} x{a.pivot?.quantity || a.quantity || 1}</Text>
                {a.pivot?.note ? <Text style={{ color: theme.colors.textSecondary }}>{a.pivot.note}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* Maintenance requests summary (if present) */}
        {booking.maintenance_requests && booking.maintenance_requests.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: '600', color: theme.colors.text }}>Maintenance Requests</Text>
            {booking.maintenance_requests.map((m) => (
              <View key={m.id} style={{ marginTop: 8 }}>
                <Text style={{ color: theme.colors.text }}>{m.title || m.subject || 'Maintenance Request'}</Text>
                <Text style={{ color: theme.colors.textSecondary }}>{m.status || m.request_status || 'Pending'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions: requests grouped together, cancel placed below */}
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              disabled={isCanceling}
              onPress={() => navigation.navigate('CreateMaintenanceRequest', { bookingId: booking.id || bookingId, propertyId: booking.property?.id })}
              style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: theme.colors.primary, opacity: isCanceling ? 0.6 : 1 }}
            >
              <Text style={{ color: theme.colors.textInverse, fontWeight: '600', textAlign: 'center' }}>Request Maintenance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isCanceling}
              onPress={() => navigation.navigate('Addons', { bookingId: booking.id || bookingId, propertyId: booking.property?.id })}
              style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: theme.colors.primary, opacity: isCanceling ? 0.6 : 1 }}
            >
              <Text style={{ color: theme.colors.textInverse, fontWeight: '600', textAlign: 'center' }}>Request Addon</Text>
            </TouchableOpacity>
          </View>

          {(booking.status === 'pending' || booking.status === 'confirmed' || booking.statusRaw === 'pending' || booking.statusRaw === 'confirmed') && (
            <TouchableOpacity
              disabled={isCanceling}
              onPress={() => {
                Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes, Cancel', onPress: async () => {
                        try {
                          setIsCanceling(true);
                          const res = await BookingService.cancelBooking(booking.id || bookingId);
                          if (res.success) {
                            const updated = res.data?.booking || res.data || null;
                            if (updated) {
                              setBooking(updated);
                              showSuccess('Booking cancelled');
                            } else {
                              await fetchBooking(true);
                            }
                          } else {
                            showError('Failed to cancel', res.error || 'Failed to cancel booking');
                          }
                        } catch (err) {
                          console.error('Cancel error', err);
                          showError('Error', 'Failed to cancel booking');
                        } finally {
                          setIsCanceling(false);
                        }
                      }
                    }
                ]);
              }}
              style={{ marginTop: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.error || '#D32F2F', backgroundColor: 'transparent', opacity: isCanceling ? 0.6 : 1 }}
            >
              <Text style={{ color: theme.colors.error || '#D32F2F', fontWeight: '600', textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ marginTop: 12 }}>
          { (booking.status === 'completed' || booking.statusRaw === 'completed') && (
            <TouchableOpacity onPress={() => navigation.navigate('LeaveReview', { bookingId: booking.id || bookingId, propertyId: booking.property?.id })} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.colors.primary }}>
              <Text style={{ color: theme.colors.textInverse, fontWeight: '600', textAlign: 'center' }}>Leave Review</Text>
            </TouchableOpacity>
          )}
        </View>

        </View>
      </ScrollView>
    </View>
  );
}
