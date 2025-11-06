import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Menu/MyBookings.js';

export default function MyBookings() {
  const navigation = useNavigation();

  // Sample bookings data
  const bookings = [
    {
      id: 1,
      name: "Sunshine Dormitory",
      image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400",
      location: "Manila, Philippines",
      checkIn: "Jan 15, 2024",
      checkOut: "May 15, 2024",
      price: 5000,
      status: "Confirmed"
    },
    {
      id: 2,
      name: "Ocean View Residence",
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400",
      location: "Makati, Philippines",
      checkIn: "Feb 1, 2024",
      checkOut: "Jun 1, 2024",
      price: 6500,
      status: "Pending"
    }
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'Confirmed': return '#10B981';
      case 'Pending': return '#F59E0B';
      case 'Cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {bookings.length > 0 ? (
          bookings.map((booking) => (
            <TouchableOpacity key={booking.id} style={styles.bookingCard}>
              <Image source={{ uri: booking.image }} style={styles.bookingImage} />
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
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Check-in</Text>
                    <Text style={styles.dateValue}>{booking.checkIn}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Check-out</Text>
                    <Text style={styles.dateValue}>{booking.checkOut}</Text>
                  </View>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Total Price:</Text>
                  <Text style={styles.price}>₱{booking.price.toLocaleString()}/month</Text>
                </View>
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