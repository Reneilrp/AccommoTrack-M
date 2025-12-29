import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BookingServices from '../../../services/BookingServices.js';
import PaymentService from '../../../services/PaymentService.js';

export default function NotificationBadge({ type = 'combined', compact = false, style }) {
  const [loading, setLoading] = useState(true);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);

  const loadCounts = async () => {
    try {
      setLoading(true);
      // Try to fetch counts; services may return arrays or objects
      const [bookingsRes, paymentsRes] = await Promise.all([
        BookingServices.getMyBookings ? BookingServices.getMyBookings() : Promise.resolve({ success: false }),
        PaymentService.getMyPayments ? PaymentService.getMyPayments() : Promise.resolve({ success: false })
      ]);

      if (bookingsRes && bookingsRes.success && Array.isArray(bookingsRes.data)) {
        // Count bookings that are pending / need action
        const pending = bookingsRes.data.filter(b => b.status === 'pending' || b.status === 'awaiting_payment' || b.status === 'unconfirmed').length;
        setBookingsCount(pending);
      }

      if (paymentsRes && paymentsRes.success && Array.isArray(paymentsRes.data)) {
        // Count unpaid or failed payments
        const unpaid = paymentsRes.data.filter(p => p.status === 'pending' || p.status === 'unpaid' || p.status === 'failed').length;
        setPaymentsCount(unpaid);
      }
    } catch (err) {
      console.warn('NotificationBadge: error loading counts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCounts();
    // Polling could be added later or triggered by parent
  }, []);

  const total = (bookingsCount || 0) + (paymentsCount || 0);

  const getCountForType = () => {
    switch (type) {
      case 'payments':
        return paymentsCount || 0;
      case 'bookings':
        return bookingsCount || 0;
      case 'combined':
      default:
        return total || 0;
    }
  };

  const displayCount = getCountForType();

  if (loading) {
    // For compact mode (inline menu badges) prefer a small dot instead of spinner
    if (compact) {
      return null;
    }
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#10b981" />
      </View>
    );
  }

  if (!displayCount) return null;

  // Compact mode: only show the red bubble with number
  if (compact) {
    return (
      <View style={[styles.compactBadgeContainer, style]}>
        <Text style={styles.text}>{displayCount > 99 ? '99+' : displayCount}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="notifications-outline" size={18} color="#111827" />
      <View style={styles.badge}>
        <Text style={styles.text}>{displayCount > 99 ? '99+' : displayCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  compactBadgeContainer: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
