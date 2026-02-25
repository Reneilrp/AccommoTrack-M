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
import tenantService from '../../../../services/TenantService';
import { useTheme } from '../../../../contexts/ThemeContext';
import { DashboardStatSkeleton, PropertyCardSkeleton, BookingCardSkeleton } from '../../../../components/Skeletons/index';
import { showError } from '../../../../utils/toast';
import Header from '../../components/Header.jsx';
import { getStyles } from '../../../../styles/Tenant/DashboardScreen.js';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
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
    // If an object is passed, try common string fields
    if (typeof imagePath === 'object') {
      const candidates = ['url', 'image_url', 'imageUrl', 'image', 'path', 'file', 'file_path'];
      for (const k of candidates) {
        const v = imagePath[k];
        if (typeof v === 'string' && v.trim()) {
          imagePath = v.trim();
          break;
        }
      }
      // Fallback: take first string value found in the object
      if (typeof imagePath === 'object') {
        for (const v of Object.values(imagePath)) {
          if (typeof v === 'string' && v.trim()) {
            imagePath = v.trim();
            break;
          }
        }
      }
    }

    if (typeof imagePath !== 'string') return null;
    imagePath = imagePath.trim();
    if (imagePath.startsWith('http')) return imagePath;

    const base = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.4:8000';
    // If already starts with /storage, just prefix base
    if (imagePath.startsWith('/storage')) return `${base}${imagePath}`;
    // If contains storage segment already, ensure no duplicate slashes
    if (imagePath.includes('/storage/')) return `${base}/${imagePath.replace(/^\/+/, '')}`;
    // Default: assume path is a filename stored under storage
    return `${base}/storage/${imagePath.replace(/^\/+/, '')}`;
  };

  const getAvatarUrl = (nameOrObj, size = 48) => {
    let nameStr = '';
    if (!nameOrObj) {
      nameStr = 'User';
    } else if (typeof nameOrObj === 'object') {
      if (typeof nameOrObj.name === 'string' && nameOrObj.name.trim()) nameStr = nameOrObj.name.trim();
      else if (typeof nameOrObj.full === 'string' && nameOrObj.full.trim()) nameStr = nameOrObj.full.trim();
      else if ((nameOrObj.first_name || nameOrObj.last_name) && (nameOrObj.first_name || nameOrObj.last_name)) {
        nameStr = `${nameOrObj.first_name || ''} ${nameOrObj.last_name || ''}`.trim();
      } else {
        for (const v of Object.values(nameOrObj)) {
          if (typeof v === 'string' && v.trim()) { nameStr = v.trim(); break; }
        }
      }
    } else {
      nameStr = String(nameOrObj).trim();
    }

    if (!nameStr) nameStr = 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nameStr)}&background=random&size=${encodeURIComponent(String(size))}`;
  };

  const loading = stayLoading || statsLoading;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        onMenuPress={() => navigation.openDrawer()}
        onProfilePress={() => navigation.navigate('Notifications')}
        isGuest={false}
        title="Dashboard"
        showProfile={true}
        notificationCount={stats?.notifications?.unread || 0}
      />

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
                    onPress={() => navigation.navigate('Payments')}
                  >
                    <Text style={styles.primaryButtonText}>View Wallet</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Actions removed per request */}
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
    </View>
  );
};

export default DashboardScreen;