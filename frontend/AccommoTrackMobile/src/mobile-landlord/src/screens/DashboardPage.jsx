import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getStyles } from '../../../styles/Landlord/DashboardPage.js';
import { useTheme } from '../../../contexts/ThemeContext';
import Button from '../components/Button';
import MenuDrawer from '../components/MenuDrawer';
import PropertyService from '../../../services/PropertyServices';
import ProfileService from '../../../services/ProfileService';
import LandlordDashboardService from '../../../services/LandlordDashboardService';

const activityColorMap = {
  green: { bg: '#DCFCE7', fg: '#166534' },
  blue: { bg: '#DBEAFE', fg: '#1D4ED8' },
  yellow: { bg: '#FEF9C3', fg: '#854D0E' },
  red: { bg: '#FEE2E2', fg: '#991B1B' },
  gray: { bg: '#E5E7EB', fg: '#374151' }
};

const activityIconMap = {
  booking: 'calendar',
  room: 'bed',
  payment: 'cash-outline',
  default: 'notifications-outline'
};

const statusBadgeMap = {
  pending: { bg: '#FEF3C7', fg: '#92400E' },
  confirmed: { bg: '#DCFCE7', fg: '#166534' },
  available: { bg: '#DCFCE7', fg: '#166534' },
  occupied: { bg: '#DBEAFE', fg: '#1D4ED8' },
  cancelled: { bg: '#FEE2E2', fg: '#991B1B' }
};

const urgencyColorMap = {
  high: { bg: '#FEE2E2', border: '#FCA5A5', fg: '#991B1B' },
  medium: { bg: '#FEF3C7', border: '#FCD34D', fg: '#854D0E' },
  low: { bg: '#DCFCE7', border: '#86EFAC', fg: '#166534' }
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) return `${diffMinutes || 1}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function LandlordDashboard({ navigation, user, onLogout }) {
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    activities: [],
    upcomingPayments: { upcomingCheckouts: [], unpaidBookings: [] },
    revenueChart: { labels: [], data: [] },
    propertyPerformance: []
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);

  const [firstProperty, setFirstProperty] = useState(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const isMountedRef = useRef(true);

  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const quickActions = [
    { id: 1, title: 'Properties', icon: 'business', color: theme.colors.primary, screen: 'Properties' },
    { id: 2, title: 'Rooms', icon: 'bed', color: '#8B5CF6', screen: 'RoomManagement' },
    { id: 3, title: 'Tenants', icon: 'people', color: '#2196F3', screen: 'Tenants' },
    { id: 4, title: 'Bookings', icon: 'calendar', color: '#FF9800', screen: 'Bookings' },
    { id: 5, title: 'Payments', icon: 'cash', color: '#16a34a', screen: 'Payments' },
    { id: 6, title: 'Analytics', icon: 'bar-chart', color: '#9C27B0', screen: 'Analytics' },
    { id: 7, title: 'Messages', icon: 'chatbubbles', color: theme.colors.primary, screen: 'Messages' },
    { id: 8, title: 'Maintenance', icon: 'construct', color: '#F59E0B', screen: 'MaintenanceRequests' },
    { id: 9, title: 'Reviews', icon: 'star', color: '#FCD34D', screen: 'Reviews' }
  ];

  // Reset mounted ref on each mount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await LandlordDashboardService.fetchDashboard();
      if (!isMountedRef.current) {
        return response.success;
      }

      if (response.success) {
        setDashboardData(response.data);
        setDashboardError('');
      } else {
        setDashboardError(response.error || 'Failed to load dashboard');
      }
      return response.success;
    } catch (error) {
      if (isMountedRef.current) {
        setDashboardError(error.message || 'An unexpected error occurred');
      }
      return false;
    }
  }, []);

  const fetchVerification = useCallback(async () => {
    try {
      const response = await ProfileService.getVerificationStatus();
      if (isMountedRef.current && response.success) {
        setVerificationStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  }, []);

  const initializeDashboard = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setDashboardLoading(true);
    setDashboardError('');
    
    try {
      await Promise.all([fetchDashboard(), fetchVerification()]);
    } catch (error) {
      if (isMountedRef.current) {
        setDashboardError(error.message || 'Failed to initialize dashboard');
      }
    } finally {
      if (isMountedRef.current) {
        setDashboardLoading(false);
      }
    }
  }, [fetchDashboard]);

  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  const fetchFirstProperty = useCallback(async () => {
    if (isMountedRef.current) {
      setLoadingProperty(true);
    }
    try {
      const res = await PropertyService.getMyProperties();
      if (!isMountedRef.current) return;
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setFirstProperty(res.data[0]);
      } else {
        setFirstProperty(null);
      }
    } catch (error) {
      if (isMountedRef.current) {
        setFirstProperty(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingProperty(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchFirstProperty();
  }, [fetchFirstProperty]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchFirstProperty(), fetchVerification()]);
    setRefreshing(false);
  }, [fetchDashboard, fetchFirstProperty, fetchVerification]);

  const handleRetry = () => {
    initializeDashboard();
    fetchFirstProperty();
  };

  const handleMenuItemPress = (screen) => {
    navigation.navigate(screen);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            if (onLogout) {
              await onLogout();
            } else {
              await AsyncStorage.clear();
              navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
            }
          } catch (error) {
            console.error('Logout error:', error);
          }
        }
      }
    ]);
  };

  const getFullAddress = (prop) => {
    if (!prop) return 'Location not set';
    const parts = [];
    if (prop.street_address) parts.push(prop.street_address);
    if (prop.barangay) parts.push(prop.barangay);
    if (prop.city) parts.push(prop.city);
    if (prop.province) parts.push(prop.province);
    if (prop.postal_code) parts.push(prop.postal_code);
    if (parts.length > 0) return parts.join(', ');
    return 'Location not set';
  };

  const [recentActivity] = useState([
    {
      id: 1,
      type: 'payment',
      title: 'Payment received from John Doe',
      subtitle: 'Room 101 • 2 hours ago',
      amount: 5000,
      icon: 'checkmark-circle',
      iconColor: '#16a34a'
    },
    {
      id: 2,
      type: 'inquiry',
      title: 'New tenant inquiry',
      subtitle: 'Sarah Williams • 5 hours ago',
      icon: 'person-add',
      iconColor: '#2196F3'
    },
    {
      id: 3,
      type: 'maintenance',
      title: 'Maintenance request',
      subtitle: 'Room 203 • 1 day ago',
      icon: 'warning',
      iconColor: '#FF9800'
    }
  ]);
 

  const stats = dashboardData.stats;
  const activities = dashboardData.activities || [];
  const upcomingCheckouts = dashboardData.upcomingPayments?.upcomingCheckouts || [];
  const unpaidBookings = dashboardData.upcomingPayments?.unpaidBookings || [];
  const propertyPerformance = dashboardData.propertyPerformance || [];

  const findPropertyPerformance = () => {
    if (!propertyPerformance.length) return null;
    if (firstProperty) {
      return propertyPerformance.find((perf) => perf.id === firstProperty.id) || propertyPerformance[0];
    }
    return propertyPerformance[0];
  };

  const firstPropertyPerformance = findPropertyPerformance();
  const occupancyRate = firstPropertyPerformance?.occupancyRate;
  const occupiedRooms = firstPropertyPerformance?.occupiedRooms ?? (
    (firstProperty?.total_rooms || 0) - (firstProperty?.available_rooms || 0)
  );
  const totalRooms = firstPropertyPerformance?.totalRooms ?? firstProperty?.total_rooms;
  const derivedAvailableRooms = firstProperty?.available_rooms ?? (
    totalRooms && occupiedRooms != null ? totalRooms - occupiedRooms : 0
  );
  const derivedOccupancyPercent = totalRooms
    ? Math.round(((totalRooms - derivedAvailableRooms) / totalRooms) * 100)
    : 0;
  const occupancyLabel = typeof occupancyRate === 'number'
    ? `${occupancyRate}% Full`
    : `${derivedOccupancyPercent}% Full`;
  const tenantCount = occupiedRooms ?? 0;
  
  // Calculate total pending notifications (Bookings + Maintenance + Addons)
  const pendingNotifications = (stats?.bookings?.pending ?? 0) + 
                               (stats?.requests?.maintenance ?? 0) + 
                               (stats?.requests?.addons ?? 0);

  const renderVerificationBanner = () => {
    if (!verificationStatus || verificationStatus.status === 'approved') return null;

    const isRejected = verificationStatus.status === 'rejected';
    const isPending = verificationStatus.status === 'pending';

    return (
      <TouchableOpacity 
        style={[
          styles.verificationBanner, 
          isRejected ? styles.bannerRejected : isPending ? styles.bannerPending : styles.bannerNotSubmitted
        ]}
        onPress={() => navigation.navigate('VerificationStatus')}
      >
        <Ionicons 
          name={isRejected ? "alert-circle" : isPending ? "time" : "shield-checkmark"} 
          size={24} 
          color={isRejected ? "#991B1B" : isPending ? "#92400E" : "#9A3412"} 
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.bannerTitle, { color: isRejected ? "#991B1B" : isPending ? "#92400E" : "#9A3412" }]}>
            Verification: {verificationStatus.status.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={styles.bannerText}>
            {isRejected ? "Your documents were rejected. Tap to view reason." : 
             isPending ? "Your documents are being reviewed." : 
             "Submit your documents to verify your account."}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
      </TouchableOpacity>
    );
  };

  if (dashboardLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (dashboardError && !dashboardLoading) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <Ionicons name="warning" size={48} color="#F87171" />
        <Text style={styles.errorTitle}>Unable to load dashboard</Text>
        <Text style={styles.errorMessage}>{dashboardError}</Text>
        <Button type="primary" onPress={handleRetry} style={styles.retryButton}>
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Menu Drawer */}
      <MenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onMenuItemPress={handleMenuItemPress}
        onLogout={handleLogout}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="menu" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.userName}>{user?.first_name || 'Dashboard'}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={20} color="#fff" />
          {pendingNotifications > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{pendingNotifications}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {renderVerificationBanner()}

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            {/* Total Properties */}
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="business" size={24} color="#6366F1" />
              </View>
              <Text style={styles.statValue}>{stats?.properties?.total ?? 0}</Text>
              <Text style={styles.statLabel}>Total Properties</Text>
                <View style={[styles.statBadge, { backgroundColor: theme.colors.successLight }]}>
                <Text style={[styles.statBadgeText, { color: theme.colors.primary }]}>
                  {stats?.properties?.active ?? 0} Active
                </Text>
              </View>
            </View>

            {/* Total Rooms */}
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name="home" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.statValue}>{stats?.rooms?.total ?? 0}</Text>
              <Text style={styles.statLabel}>Total Rooms</Text>
              <View style={[styles.statBadge, { backgroundColor: '#DBEAFE' }]}>
                <Text style={[styles.statBadgeText, { color: '#2563EB' }]}>
                  {stats?.rooms?.occupancyRate ?? 0}% Occupied
                </Text>
              </View>
            </View>

            {/* Bookings */}
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="calendar" size={24} color="#9333EA" />
              </View>
              <Text style={styles.statValue}>{(stats?.bookings?.pending ?? 0) + (stats?.bookings?.confirmed ?? 0)}</Text>
              <Text style={styles.statLabel}>Total Bookings</Text>
              {(stats?.bookings?.pending ?? 0) > 0 ? (
                <View style={[styles.statBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.statBadgeText, { color: '#D97706' }]}>
                    {stats?.bookings?.pending ?? 0} Pending
                  </Text>
                </View>
              ) : (
                <View style={[styles.statBadge, { backgroundColor: theme.colors.successLight }]}>
                    <Text style={[styles.statBadgeText, { color: theme.colors.primary }]}>
                      {stats?.bookings?.confirmed ?? 0} Confirmed
                    </Text>
                  </View>
              )}
            </View>

            {/* Monthly Revenue */}
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="cash" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>₱{(stats?.revenue?.monthly ?? 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>Monthly Revenue</Text>
              <View style={[styles.statBadge, { backgroundColor: theme.colors.successLight, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Ionicons name="trending-up" size={12} color={theme.colors.primary} />
                <Text style={[styles.statBadgeText, { color: theme.colors.primary }]}>This Month</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <Button
                key={action.id}
                style={styles.actionCard}
                onPress={() => navigation.navigate(action.screen)}
                type="transparent"
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                {/* <Ionicons name="chevron-forward" size={14} color="#9CA3AF" style={styles.actionArrow} /> */}
              </Button>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Button 
              type="transparent"
              onPress={() => navigation.navigate('AllActivities', { activities })}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </Button>
          </View>

          <View style={styles.activityContainer}>
            {activities.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="alert-circle-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No recent activity</Text>
              </View>
            ) : (
              activities.slice(0, 5).map((activity, index) => {
                const palette = activityColorMap[activity.color] || activityColorMap.gray;
                const iconName = activityIconMap[activity.type] || activityIconMap.default;
                const statusStyle = statusBadgeMap[activity.status] || { bg: '#E5E7EB', fg: '#374151' };
                return (
                  <View key={`${activity.action}-${index}`} style={styles.activityItem}>
                    <View style={[styles.activityIcon, { backgroundColor: palette.bg }]}>
                      <Ionicons name={iconName} size={20} color={palette.fg} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{activity.action}</Text>
                      <Text style={styles.activitySubtitle}>{activity.description}</Text>
                      <Text style={styles.activityTimestamp}>{formatRelativeTime(activity.timestamp)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}> 
                      <Text style={[styles.statusBadgeText, { color: statusStyle.fg }]}>
                        {activity.status}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Upcoming Checkouts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Checkouts</Text>
            <Text style={styles.sectionHelper}>{upcomingCheckouts.length} scheduled</Text>
          </View>
          <View style={styles.cardContainer}>
            {upcomingCheckouts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="bed-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No upcoming checkouts</Text>
              </View>
            ) : (
              upcomingCheckouts.slice(0, 5).map((checkout) => {
                const urgency = urgencyColorMap[checkout.urgency] || urgencyColorMap.low;
                return (
                  <View
                    key={checkout.id}
                    style={[styles.listItem, { borderColor: urgency.border, backgroundColor: urgency.bg }]}
                  >
                    <View style={styles.listContent}>
                      <Text style={styles.listTitle}>{checkout.tenantName}</Text>
                      <Text style={styles.listSubtitle}>{checkout.propertyTitle} • Room {checkout.roomNumber}</Text>
                      <Text style={styles.listMeta}>{checkout.endDate}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: '#FFFFFF' }]}> 
                      <Text style={[styles.pillText, { color: urgency.fg }]}>{checkout.daysLeft}d</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Unpaid Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Unpaid Bookings</Text>
            <Text style={styles.sectionHelper}>{unpaidBookings.length} pending</Text>
          </View>
          <View style={styles.cardContainer}>
            {unpaidBookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>All payments are up to date</Text>
              </View>
            ) : (
              unpaidBookings.slice(0, 5).map((booking) => (
                <View key={booking.id} style={[styles.listItem, { borderColor: '#F87171', backgroundColor: '#FEF2F2' }]}> 
                  <View style={styles.listContent}>
                    <Text style={styles.listTitle}>{booking.tenantName}</Text>
                    <Text style={styles.listSubtitle}>{booking.propertyTitle} • Room {booking.roomNumber}</Text>
                    <Text style={[styles.listMeta, { color: '#B91C1C' }]}>{booking.paymentStatus}</Text>
                  </View>
                  <Text style={styles.listAmount}>₱{booking.amount.toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Property Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Overview</Text>

          {loadingProperty ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : firstProperty ? (
            <Button
              style={styles.propertyCard}
              onPress={() => navigation.navigate('Properties')}
              type="transparent"
            >
              <View style={styles.propertyHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.propertyName} numberOfLines={1}>{firstProperty.name || firstProperty.title}</Text>
                  <Text style={styles.propertyAddress} numberOfLines={2}>{getFullAddress(firstProperty)}</Text>
                </View>
                <View style={styles.occupancyBadge}>
                  <Text style={styles.occupancyText}>{occupancyLabel}</Text>
                </View>
              </View>
              <View style={styles.propertyStats}>
                <View style={styles.propertyStatItem}>
                  <Ionicons name="bed" size={20} color={theme.colors.primary} />
                  <Text style={styles.propertyStatText}>{totalRooms || 0} Rooms</Text>
                </View>
                <View style={styles.propertyStatItem}>
                  <Ionicons name="people" size={20} color={theme.colors.primary} />
                  <Text style={styles.propertyStatText}>{tenantCount} Tenants</Text>
                </View>
              </View>
            </Button>
          ) : (
            <View style={{ padding: 16 }}>
              <Text>No properties yet. Create one to get started.</Text>
            </View>
          )}
        </View>

        {/* Property Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Performance</Text>
          <View style={styles.cardContainer}>
            {propertyPerformance.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>Add a property to see performance</Text>
              </View>
            ) : (
              propertyPerformance.map((property) => (
                <TouchableOpacity 
                  key={property.id} 
                  style={styles.performanceCard}
                  onPress={() => navigation.navigate('RoomManagement', { 
                    propertyId: property.id, 
                    filter: 'occupied' 
                  })}
                  activeOpacity={0.7}
                >
                  <View style={styles.performanceHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.performanceTitle}>{property.title}</Text>
                      <Text style={styles.performanceSubtitle}>{property.status}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: '#E0F2FE' }]}> 
                      <Text style={[styles.statusBadgeText, { color: '#0369A1' }]}>Occ {property.occupancyRate}%</Text>
                    </View>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressBarFill, { width: `${property.occupancyRate}%` }]} />
                  </View>
                  <View style={styles.performanceRow}>
                    <View>
                      <Text style={styles.performanceStatLabel}>Occupied</Text>
                      <Text style={styles.performanceStatValue}>{property.occupiedRooms}/{property.totalRooms}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.performanceStatLabel}>Revenue</Text>
                      <Text style={styles.performanceStatValue}>₱{(property.actualRevenue ?? 0).toLocaleString()}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

