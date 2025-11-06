// BookingsScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Landlord/Bookings.js';

export default function BookingsScreen({ navigation }) {
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [bookings] = useState([
    {
      id: 1,
      guestName: 'Pheinz Magnun',
      email: 'pheinz.magnun@gmail.com',
      phone: '+63 993 692 9775',
      roomType: 'Single Room',
      checkIn: '2025-11-15',
      checkOut: '2025-12-15',
      duration: '1 month',
      amount: 5000,
      status: 'confirmed',
      paymentStatus: 'paid'
    },
    {
      id: 2,
      guestName: 'Jean Claro',
      email: 'JinBilog@gmail.com',
      phone: '+63 976 434 1384',
      roomType: 'Double Room',
      checkIn: '2025-11-20',
      checkOut: '2025-12-20',
      duration: '1 month',
      amount: 4500,
      status: 'pending',
      paymentStatus: 'pending'
    },
    {
      id: 3,
      guestName: 'Ar-rauf Imar',
      email: 'RaufImar@gmail.com',
      phone: '+63 939 345 6789',
      roomType: 'Quad Room',
      checkIn: '2025-11-10',
      checkOut: '2025-11-25',
      duration: '15 days',
      amount: 1750,
      status: 'completed',
      paymentStatus: 'paid'
    },
    {
      id: 4,
      guestName: 'JP Enriquez',
      email: 'JPEnriquez@gmail.com',
      phone: '+63 940 456 7890',
      roomType: 'Single Room',
      checkIn: '2025-01-01',
      checkOut: '2025-02-01',
      duration: '1 month',
      amount: 5500,
      status: 'pending',
      paymentStatus: 'unpaid'
    },
    {
      id: 5,
      guestName: 'Rhadzmiel Sali',
      email: 'RhadzmielSali@gmail.com',
      phone: '+63 940 456 7890',
      roomType: 'Single Room',
      checkIn: '2025-03-01',
      checkOut: '2025-04-01',
      duration: '1 month',
      amount: 5500,
      status: 'pending',
      paymentStatus: 'unpaid'
    }
  ]);

  const filteredBookings = filterStatus === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === filterStatus);

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    completed: bookings.filter(b => b.status === 'completed').length
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusBg = (status) => {
    switch(status) {
      case 'confirmed': return '#E8F5E9';
      case 'pending': return '#FFF3E0';
      case 'completed': return '#E3F2FD';
      case 'cancelled': return '#FFEBEE';
      default: return '#F5F5F5';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bookings</Text>
        <TouchableOpacity>
          <Ionicons name="add-circle" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#4CAF50' }]}>
          <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{stats.confirmed}</Text>
          <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>Confirmed</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#FF9800' }]}>
          <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>Pending</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#2196F3' }]}>
          <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{stats.completed}</Text>
          <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>Completed</Text>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'confirmed' && styles.filterChipActive]}
            onPress={() => setFilterStatus('confirmed')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'confirmed' && styles.filterChipTextActive]}>
              Confirmed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'pending' && styles.filterChipActive]}
            onPress={() => setFilterStatus('pending')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'pending' && styles.filterChipTextActive]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'completed' && styles.filterChipActive]}
            onPress={() => setFilterStatus('completed')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'completed' && styles.filterChipTextActive]}>
              Completed
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Bookings List */}
      <ScrollView style={styles.bookingsList} showsVerticalScrollIndicator={false}>
        {filteredBookings.map((booking) => (
          <TouchableOpacity
            key={booking.id}
            style={styles.bookingCard}
            onPress={() => navigation.navigate('BookingDetails', { booking })}
          >
            <View style={styles.bookingHeader}>
              <View style={styles.guestInfo}>
                <View style={styles.guestAvatar}>
                  <Text style={styles.guestInitials}>
                    {booking.guestName.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View>
                  <Text style={styles.guestName}>{booking.guestName}</Text>
                  <Text style={styles.guestEmail}>{booking.email}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusBg(booking.status) }]}>
                <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.bookingDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="bed-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{booking.roomType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{booking.checkIn} - {booking.checkOut}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{booking.duration}</Text>
              </View>
            </View>

            <View style={styles.bookingFooter}>
              <View>
                <Text style={styles.amountLabel}>Amount</Text>
                <Text style={styles.amountValue}>₱{booking.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="close-circle-outline" size={20} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

