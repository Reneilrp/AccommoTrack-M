import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import tenantService from '../../../../services/TenantService';
import { useTheme } from '../../../../contexts/ThemeContext';
import { DashboardStatSkeleton, PropertyCardSkeleton, BookingCardSkeleton } from '../../../../components/Skeletons/index';
import { showError } from '../../../../utils/toast';
import BottomNavigation from '../../components/BottomNavigation.jsx';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch current stay data
  const { data: stayData, isLoading: stayLoading, refetch: refetchStay } = useQuery({
    queryKey: ['currentStay'],
    queryFn: async () => {
      const response = await tenantService.getCurrentStay();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load stay data');
      }
      return response.data;
    },
    onError: (error) => {
      console.error('Failed to load stay data:', error);
      showError('Failed to load current stay', error.message);
    },
  });

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await tenantService.getDashboardStats();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load stats');
      }
      return response.data;
    },
    onError: (error) => {
      console.error('Failed to load stats:', error);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStay(), refetchStats()]);
    setRefreshing(false);
  };

  const calculateDaysStayed = (startDate) => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.4:8000'}/storage/${imagePath}`;
  };

  const getAvatarUrl = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=100`;
  };

  const loading = stayLoading || statsLoading;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <SafeAreaView style={{ backgroundColor: theme.colors.surface }}>
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <View style={styles.headerSpacer} />
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Dashboard Overview
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        {loading ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.statsRow}>
              <DashboardStatSkeleton />
              <DashboardStatSkeleton />
            </View>
            <View style={styles.statsRow}>
              <DashboardStatSkeleton />
              <DashboardStatSkeleton />
            </View>
            <View style={styles.spacer} />
            <PropertyCardSkeleton />
            <BookingCardSkeleton />
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
            }
          >

            {stayData?.hasActiveStay ? (
              <>
                {/* Stats Cards */}
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { backgroundColor: theme.colors.primaryLight }]}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name="bed-outline" size={24} color="#fff" />
                    </View>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {stayData.room?.room_number}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Current Room</Text>
                    <Text style={[styles.statSubLabel, { color: theme.colors.textTertiary }]}>
                      {stayData.room?.type}
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
                    <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' }]}>
                      <Ionicons name="calendar-outline" size={24} color="#fff" />
                    </View>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {calculateDaysStayed(stayData.booking?.start_date)}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Days Stayed</Text>
                    <Text style={[styles.statSubLabel, { color: theme.colors.textTertiary }]}>
                      Since {formatDate(stayData.booking?.start_date)}
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { backgroundColor: '#E9D5FF' }]}>
                    <View style={[styles.iconContainer, { backgroundColor: '#9333EA' }]}>
                      <Ionicons name="cash-outline" size={24} color="#fff" />
                    </View>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {formatCurrency(stayData.booking?.monthly_rent)}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Monthly Rent</Text>
                    <Text style={[styles.statSubLabel, { color: theme.colors.textTertiary }]}>
                      Due on {stayData.booking?.due_day}th
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                    <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' }]}>
                      <Ionicons name="wallet-outline" size={24} color="#fff" />
                    </View>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {formatCurrency(stats?.payments?.totalPaid || 0)}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Paid</Text>
                    <Text style={[styles.statSubLabel, { color: theme.colors.textTertiary }]}>All time</Text>
                  </View>
                </View>

                {/* Property Card */}
                <View style={[styles.propertyCard, { backgroundColor: theme.colors.surface }]}>
            <Image
              source={{
                uri:
                  getImageUrl(stayData.property?.images?.[0]?.image_url) ||
                  'https://via.placeholder.com/800x400',
              }}
              style={styles.propertyImage}
            />
                  <View style={styles.propertyOverlay}>
                    <Text style={styles.propertyTitle}>{stayData.property?.title}</Text>
                    <Text style={styles.propertyAddress}>{stayData.property?.address}</Text>
                  </View>

                  <View style={styles.propertyContent}>
                    {/* Landlord Info */}
                    <View style={[styles.landlordSection, { backgroundColor: theme.colors.backgroundSecondary }]}>
                      <Image
                        source={{
                          uri:
                            getImageUrl(stayData.landlord?.profile_image) ||
                            getAvatarUrl(stayData.landlord?.name),
                        }}
                        style={styles.landlordAvatar}
                      />
                      <View style={styles.landlordInfo}>
                        <Text style={[styles.landlordLabel, { color: theme.colors.textSecondary }]}>
                          Property Manager
                        </Text>
                        <Text style={[styles.landlordName, { color: theme.colors.text }]}>
                          {stayData.landlord?.name}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.messageButton, { borderColor: theme.colors.border }]}
                        onPress={() => navigation.navigate('Messages')}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Payment Overview */}
                <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Payment Overview</Text>
                  <View style={styles.paymentRow}>
                    <Text style={[styles.paymentLabel, { color: theme.colors.textSecondary }]}>
                      Pending Due
                    </Text>
                    <Text style={[styles.paymentValue, { color: '#EF4444' }]}>
                      {formatCurrency(stats?.payments?.monthlyDue || 0)}
                    </Text>
                  </View>
                  <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                  <View style={styles.paymentRow}>
                    <Text style={[styles.paymentLabel, { color: theme.colors.textSecondary }]}>
                      Total Paid
                    </Text>
                    <Text style={[styles.paymentValue, { color: theme.colors.primary }]}>
                      {formatCurrency(stats?.payments?.totalPaid || 0)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => navigation.navigate('Wallet')}
                  >
                    <Text style={styles.primaryButtonText}>View Wallet</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Quick Actions</Text>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.backgroundSecondary }]}
                    onPress={() =>
                      navigation.navigate('PropertyDetails', { propertyId: stayData.property?.id })
                    }
                  >
                    <Text style={[styles.actionText, { color: theme.colors.text }]}>
                      View Property Details
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.backgroundSecondary }]}
                    onPress={() => navigation.navigate('MyBookings')}
                  >
                    <Text style={[styles.actionText, { color: theme.colors.text }]}>Booking History</Text>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // Empty State
              <View style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name="home-outline" size={40} color={theme.colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Active Stay</Text>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  You don't have any active bookings at the moment. Explore our properties to find your next
                  home.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => navigation.navigate('TenantHome')}
                >
                  <Text style={styles.primaryButtonText}>Explore Properties</Text>
                </TouchableOpacity>

                {stayData?.upcomingBooking && (
                  <View style={[styles.upcomingCard, { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' }]}>
                    <View style={styles.upcomingIcon}>
                      <Ionicons name="calendar" size={24} color="#3B82F6" />
                    </View>
                    <View style={styles.upcomingContent}>
                      <Text style={styles.upcomingTitle}>Upcoming Stay Available</Text>
                      <Text style={styles.upcomingText}>
                        You have a booking at{' '}
                        <Text style={styles.upcomingBold}>{stayData.upcomingBooking.property}</Text> starting
                        on {formatDate(stayData.upcomingBooking.startDate)}.
                      </Text>
                      <TouchableOpacity onPress={() => navigation.navigate('MyBookings')}>
                        <Text style={styles.upcomingLink}>View Details →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Bottom Navigation */}
      <SafeAreaView style={{ backgroundColor: theme.colors.surface }}>
        <BottomNavigation />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 35,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerSpacer: {
    width: 40,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  spacer: {
    height: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statSubLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  propertyCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  propertyImage: {
    width: '100%',
    height: 200,
  },
  propertyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  propertyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  propertyAddress: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  propertyContent: {
    padding: 16,
  },
  landlordSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  landlordAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  landlordInfo: {
    flex: 1,
  },
  landlordLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  landlordName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  primaryButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  upcomingCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
  },
  upcomingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  upcomingText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  upcomingBold: {
    fontWeight: 'bold',
  },
  upcomingLink: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '600',
    marginTop: 8,
  },
});

export default DashboardScreen;
