import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tenantService from '../../../../services/TenantService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { DashboardStatSkeleton, PropertyCardSkeleton, BookingCardSkeleton } from '../../../../components/Skeletons/index.jsx';
import { showError } from '../../../../utils/toast.js';
import { getImageUrl, getAvatarUrl } from '../../../../utils/imageUtils.js';
import Header from '../../components/Header.jsx';
import { getStyles } from '../../../../styles/Tenant/DashboardScreen.js';
import { BASE_URL } from '../../../../config/index.js';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadUserName = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          const user = JSON.parse(userString);
          setUserName(user.first_name || '');
        }
      } catch (error) {
        console.error('Error loading user name:', error);
      }
    };
    loadUserName();
  }, []);

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

  const loading = stayLoading || statsLoading;

  return (
    <View style={styles.container}>
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
            {/* Header Greeting */}
            <View style={{ marginBottom: 24, marginTop: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.text }}>
                Welcome back, {userName || 'User'}!
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 8 }}>
                Here's what's happening with your stay today.
              </Text>
            </View>

            {/* Stats Cards - Always visible */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: theme.colors.primaryLight }]}>
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="bed-outline" size={24} color="#fff" />
                </View>
                <Text style={styles.statValue}>
                  {stayData?.hasActiveStay ? stayData.room?.room_number : 'None'}
                </Text>
                <Text style={styles.statLabel}>Current Room</Text>
                <Text style={styles.statSubLabel}>
                  {stayData?.hasActiveStay ? stayData.room?.type : 'No active stay'}
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
                <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' }]}>
                  <Ionicons name="calendar-outline" size={24} color="#fff" />
                </View>
                <Text style={styles.statValue}>
                  {stayData?.hasActiveStay ? (stayData.booking?.daysStayed ?? 0) : '0'}
                </Text>
                <Text style={styles.statLabel}>Days Stayed</Text>
                <Text style={styles.statSubLabel}>
                  {stayData?.hasActiveStay ? `Since ${formatDate(stayData.booking?.start_date)}` : 'Not staying'}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: '#E9D5FF' }]}>
                <View style={[styles.iconContainer, { backgroundColor: '#9333EA' }]}>
                  <Ionicons name="cash-outline" size={24} color="#fff" />
                </View>
                <Text style={styles.statValue}>
                  {formatCurrency(stayData?.hasActiveStay ? stayData.booking?.monthly_rent : 0)}
                </Text>
                <Text style={styles.statLabel}>Monthly Rent</Text>
                <Text style={styles.statSubLabel}>
                  {stayData?.hasActiveStay ? `Due on ${stayData.booking?.due_day}th` : 'No active rent'}
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' }]}>
                  <Ionicons name="wallet-outline" size={24} color="#fff" />
                </View>
                <Text style={styles.statValue}>
                  {formatCurrency(stats?.payments?.pendingAmount || stats?.payments?.monthlyDue || 0)}
                </Text>
                <Text style={styles.statLabel}>Pending Due</Text>
                <Text style={styles.statSubLabel}>Current month</Text>
              </View>
            </View>

            {stayData?.hasActiveStay ? (
              /* Property Card (Only when stay is active) */
              <View style={styles.propertyCard}>
                <Image
                  source={{
                    uri: (
                      getImageUrl(stayData.property?.images?.[0]) ||
                      getImageUrl(stayData.property?.cover_image) ||
                      getImageUrl(stayData.property?.image) ||
                      getImageUrl(stayData.property?.photo) ||
                      'https://via.placeholder.com/800x400'
                    ),
                  }}
                  style={styles.propertyImage}
                />
                <View style={styles.propertyOverlay}>
                  <Text style={styles.propertyTitle}>{stayData.property?.title || stayData.property?.name || stayData.property?.property_name}</Text>
                  <Text style={styles.propertyAddress}>{stayData.property?.address}</Text>
                </View>

                <View style={styles.propertyContent}>
                  {/* Landlord Info */}
                  <View style={[styles.landlordSection, { backgroundColor: theme.colors.backgroundSecondary }]}>
                    <Image
                      source={{
                        uri: getImageUrl(stayData.landlord?.profile_image) || getAvatarUrl(stayData.landlord, 48),
                      }}
                      style={styles.landlordAvatar}
                    />
                    <View style={styles.landlordInfo}>
                      <Text style={styles.landlordLabel}>
                        Property Manager
                      </Text>
                      <Text style={styles.landlordName}>
                        {stayData.landlord?.name}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={() => {
                        if (stayData?.landlord?.id && stayData?.property?.id) {
                          navigation.navigate('Messages', {
                            startConversation: true,
                            recipient: {
                              id: stayData.landlord.id,
                              name: stayData.landlord.name,
                            },
                            property: {
                              id: stayData.property.id,
                              title: stayData.property.title || stayData.property.name,
                            },
                          });
                        } else {
                          // Fallback for safety
                          navigation.navigate('Messages');
                        }
                      }}
                    >
                      <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      {
                        marginTop: 16,
                        backgroundColor: stayData.booking?.status === 'completed' ? '#F59E0B' : theme.colors.primary,
                      },
                    ]}
                    onPress={() => {
                      // Navigate to a renewal/extension screen or open a modal
                      // For now, we'll assume there's an 'ExtensionRequest' screen or similar
                      navigation.navigate('MyBookings', { 
                        screen: 'BookingDetails', 
                        params: { bookingId: stayData.booking.id, initiateExtension: true } 
                      });
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="time-outline" size={20} color="#fff" />
                      <Text style={styles.primaryButtonText}>
                        {stayData.booking?.status === 'completed' ? 'Renew Stay' : 'Extend Stay'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Empty State Main Card (When no active stay) */
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name="home-outline" size={40} color={theme.colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Find Your Home</Text>
                <Text style={styles.emptyText}>
                  Browse our verified properties and find the perfect room for your needs.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('TenantHome')}
                >
                  <Text style={styles.primaryButtonText}>Explore Properties</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Upcoming Booking (Shown regardless of active stay if it exists) */}
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

            {/* Payment Overview - Always visible */}
            <View style={[styles.card, { marginTop: stayData?.hasActiveStay ? 0 : 16 }]}>
              <Text style={styles.cardTitle}>Payment Overview</Text>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>
                  Pending Due
                </Text>
                <Text style={[styles.paymentValue, { color: '#EF4444' }]}>
                  {formatCurrency(stats?.payments?.monthlyDue || 0)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>
                  Total Paid
                </Text>
                <Text style={[styles.paymentValue, { color: theme.colors.primary }]}>
                  {formatCurrency(stats?.payments?.totalPaid || 0)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('Payments')}
              >
                <Text style={styles.primaryButtonText}>View Wallet</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Actions (Matching web sidebar) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Quick Actions</Text>
              <View style={styles.actionList}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Profile')}
                >
                  <Text style={styles.actionText}>My Profile</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('MyBookings')}
                >
                  <Text style={styles.actionText}>Booking History</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('ServiceRequests')}
                >
                  <Text style={styles.actionText}>Maintenance</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Messages')}
                >
                  <Text style={styles.actionText}>Messages</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default DashboardScreen;