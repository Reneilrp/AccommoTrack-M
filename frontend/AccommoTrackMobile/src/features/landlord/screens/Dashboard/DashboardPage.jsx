import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getStyles } from '../../../../styles/Landlord/DashboardPage.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { triggerForcedLogout } from '../../../../navigation/RootNavigation.js';
import Button from '../../components/Button.jsx';
import MenuDrawer from '../../components/MenuDrawer.jsx';
import PropertyService from '../../../../services/PropertyService.js';
import ProfileService from '../../../../services/ProfileService.js';
import LandlordDashboardService from '../../../../services/LandlordDashboardService.js';


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
  maintenance: 'construct-outline',
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

export default function LandlordDashboard({ navigation, user: initialUser, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    activities: [],
    upcomingPayments: { upcomingCheckouts: [], unpaidBookings: [] },
    propertyPerformance: []
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const [firstProperty, setFirstProperty] = useState(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const isMountedRef = useRef(true);

  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const isCaretaker = user?.role === 'caretaker';
  const caretakerPermissions = user?.caretaker_permissions || {};
  const hasPermission = useCallback((key) => {
    if (!isCaretaker) return true;
    return Boolean(caretakerPermissions?.[key] || caretakerPermissions?.[`can_view_${key}`]);
  }, [isCaretaker, caretakerPermissions]);

  const quickActions = [
    { id: 1, title: 'Properties', icon: 'business', color: theme.colors.primary, screen: 'Properties', show: !isCaretaker || hasPermission('properties') || hasPermission('rooms') || hasPermission('tenants') },
    { id: 2, title: 'Rooms', icon: 'bed', color: '#8B5CF6', screen: 'RoomManagement', show: !isCaretaker || hasPermission('rooms') },
    { id: 3, title: 'Tenants', icon: 'people', color: '#2196F3', screen: 'Tenants', show: !isCaretaker || hasPermission('tenants') },
    { id: 4, title: 'Bookings', icon: 'calendar', color: '#FF9800', screen: 'Bookings', show: !isCaretaker || hasPermission('bookings') },
    { id: 5, title: 'Payments', icon: 'cash', color: '#059669', screen: 'Payments', show: !isCaretaker },
    { id: 6, title: 'Analytics', icon: 'bar-chart', color: '#9C27B0', screen: 'Analytics', show: !isCaretaker },
    { id: 7, title: 'Messages', icon: 'chatbubbles', color: theme.colors.primary, screen: 'Messages', show: !isCaretaker || hasPermission('messages') },
    { id: 8, title: 'Maintenance', icon: 'construct', color: '#F59E0B', screen: 'MaintenanceRequests', show: !isCaretaker || hasPermission('rooms') },
    { id: 9, title: 'Reviews', icon: 'star', color: '#FCD34D', screen: 'Reviews', show: !isCaretaker }
  ];

  // Load user if not provided via props (happens in BottomTabNavigator)
  useEffect(() => {
    const loadUser = async () => {
      if (!user) {
        try {
          const userString = await AsyncStorage.getItem('user');
          if (userString) {
            setUser(JSON.parse(userString));
          }
        } catch (e) {}
      }
    };
    loadUser();
  }, []);

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

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await LandlordDashboardService.fetchUnreadNotificationsCount();
      if (isMountedRef.current && response.success) {
        const count = typeof response.data === 'object' ? response.data.count : response.data;
        setUnreadNotificationCount(Number(count) || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  const initializeDashboard = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setDashboardLoading(true);
    setDashboardError('');
    
    try {
      await Promise.all([fetchDashboard(), fetchVerification(), fetchUnreadCount()]);
    } catch (error) {
      if (isMountedRef.current) {
        setDashboardError(error.message || 'Failed to initialize dashboard');
      }
    } finally {
      if (isMountedRef.current) {
        setDashboardLoading(false);
      }
    }
  }, [fetchDashboard, fetchVerification, fetchUnreadCount]);

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
    await Promise.all([fetchDashboard(), fetchFirstProperty(), fetchVerification(), fetchUnreadCount()]);
    setRefreshing(false);
  }, [fetchDashboard, fetchFirstProperty, fetchVerification, fetchUnreadCount]);

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
                        // Clear only auth-related data
                        await AsyncStorage.multiRemove(['token', 'user', 'user_id', 'isGuest']);
                        triggerForcedLogout();
                      }          } catch (error) {
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

  const stats = dashboardData.stats;
  const activities = dashboardData.activities || [];
  const upcomingCheckouts = dashboardData.upcomingPayments?.upcomingCheckouts || [];
  const unpaidBookings = dashboardData.upcomingPayments?.unpaidBookings || [];
  const vacatingSoon = dashboardData.upcomingPayments?.vacatingSoon || [];
  const billingHealth = dashboardData.upcomingPayments?.billingHealth || {
    dueForBillingCount: 0,
    dueForBilling: [],
    overdueInvoicesCount: 0,
    overdueInvoicesAmount: 0,
    dueSoonInvoicesCount: 0,
    dueSoonInvoicesAmount: 0,
    overdueInvoices: [],
    dueSoonInvoices: [],
  };
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
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={[styles.bannerTitle, { color: isRejected ? "#991B1B" : isPending ? "#92400E" : "#9A3412" }]}>
            Verification: {verificationStatus.status.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={styles.bannerText}>
            {isRejected ? (verificationStatus.rejection_reason || "Your documents were rejected. Tap to view reason.") : 
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
          {unreadNotificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </Text>
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
            <View style={[styles.statCard, styles.statCardBlue]}>
              <View style={styles.statCardLeft}>
                <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="business" size={18} color="#1D4ED8" />
                </View>
                <View style={[styles.statBadge, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={[styles.statBadgeText, { color: '#1D4ED8' }]}>
                    {stats?.properties?.active ?? 0} Active
                  </Text>
                </View>
              </View>
              <View style={styles.statCardRight}>
                <Text style={styles.statValue}>{stats?.properties?.total ?? 0}</Text>
                <Text style={styles.statLabel}>Total Properties</Text>
              </View>
            </View>

            {/* Total Rooms */}
            <View style={[styles.statCard, styles.statCardGreen]}>
              <View style={styles.statCardLeft}>
                <View style={[styles.statIconContainer, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="home" size={18} color="#166534" />
                </View>
                <View style={[styles.statBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.statBadgeText, { color: '#166534' }]}>
                    {stats?.rooms?.occupancyRate ?? 0}% Occ
                  </Text>
                </View>
              </View>
              <View style={styles.statCardRight}>
                <Text style={styles.statValue}>{stats?.rooms?.total ?? 0}</Text>
                <Text style={styles.statLabel}>Total Rooms</Text>
              </View>
            </View>

            {/* Bookings */}
            <View style={[styles.statCard, styles.statCardPurple]}>
              <View style={styles.statCardLeft}>
                <View style={[styles.statIconContainer, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="calendar" size={18} color="#7E22CE" />
                </View>
                {(stats?.bookings?.pending ?? 0) > 0 ? (
                  <View style={[styles.statBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.statBadgeText, { color: '#D97706' }]}>
                      {stats?.bookings?.pending ?? 0} Pend
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.statBadge, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.statBadgeText, { color: '#166534' }]}>
                      {stats?.bookings?.confirmed ?? 0} Conf
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.statCardRight}>
                <Text style={styles.statValue}>{(stats?.bookings?.pending ?? 0) + (stats?.bookings?.confirmed ?? 0)}</Text>
                <Text style={styles.statLabel}>Total Bookings</Text>
              </View>
            </View>

            {!isCaretaker && (
              <View style={[styles.statCard, styles.statCardAmber]}>
                <View style={styles.statCardLeft}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="cash" size={18} color="#C2410C" />
                  </View>
                  <View style={[styles.statBadge, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.statBadgeText, { color: '#166534' }]}>Monthly</Text>
                  </View>
                </View>
                <View style={styles.statCardRight}>
                  <Text style={styles.statValue}>₱{(stats?.revenue?.monthly ?? 0).toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Monthly Revenue</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.filter(a => a.show).map((action) => (
              <Button
                key={action.id}
                style={styles.actionCard}
                onPress={() => navigation.navigate(action.screen)}
                type="transparent"
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <Ionicons name={action.icon} size={20} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
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

        {/* Vacating Soon */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vacating Soon</Text>
            <Text style={styles.sectionHelper}>{vacatingSoon.length} noticed</Text>
          </View>
          <View style={styles.cardContainer}>
            {vacatingSoon.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-done-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No move-out notices</Text>
              </View>
            ) : (
              vacatingSoon.slice(0, 5).map((tenant) => {
                const urgency = urgencyColorMap[tenant.urgency] || urgencyColorMap.low;
                return (
                  <TouchableOpacity
                    key={tenant.id}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('Bookings', {
                      filter: 'confirmed',
                      searchQuery: tenant.tenantName,
                      focusBookingId: tenant.id,
                      drilldownToken: Date.now(),
                    })}
                    style={[styles.listItem, { borderColor: urgency.border, backgroundColor: urgency.bg }]}
                  >
                    <View style={styles.listContent}>
                      <Text style={styles.listTitle}>{tenant.tenantName}</Text>
                      <Text style={styles.listSubtitle}>{tenant.propertyTitle} • Room {tenant.roomNumber}</Text>
                      <Text style={styles.listMeta}>Move-out {tenant.endDate}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: '#FFFFFF' }]}>
                      <Text style={[styles.pillText, { color: urgency.fg }]}>{tenant.daysLeft}d</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        {/* Billing Health */}
        {!isCaretaker && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Billing Health</Text>
              <Text style={styles.sectionHelper}>{billingHealth.overdueInvoicesCount || 0} overdue</Text>
            </View>

            <View style={[styles.cardContainer, { gap: 12 }]}> 
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    const dueSoonInvoice = (billingHealth.dueSoonInvoices || [])[0];
                    if (dueSoonInvoice?.id) {
                      navigation.navigate('Payments', {
                        filter: 'pending',
                        searchQuery: dueSoonInvoice.tenantName,
                        focusInvoiceId: dueSoonInvoice.id,
                        drilldownToken: Date.now(),
                      });
                      return;
                    }

                    navigation.navigate('Payments', { filter: 'pending' });
                  }}
                  style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FCD34D', backgroundColor: '#FFFBEB' }}
                >
                  <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '700' }}>Due This Week</Text>
                  <Text style={{ fontSize: 20, color: '#92400E', fontWeight: '800', marginTop: 4 }}>{billingHealth.dueForBillingCount || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    const overdueInvoice = (billingHealth.overdueInvoices || [])[0];
                    if (overdueInvoice?.id) {
                      navigation.navigate('Payments', {
                        filter: 'overdue',
                        searchQuery: overdueInvoice.tenantName,
                        focusInvoiceId: overdueInvoice.id,
                        drilldownToken: Date.now(),
                      });
                      return;
                    }

                    navigation.navigate('Payments', { filter: 'overdue' });
                  }}
                  style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}
                >
                  <Text style={{ fontSize: 11, color: '#991B1B', fontWeight: '700' }}>Overdue Invoices</Text>
                  <Text style={{ fontSize: 20, color: '#991B1B', fontWeight: '800', marginTop: 4 }}>{billingHealth.overdueInvoicesCount || 0}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ paddingHorizontal: 4 }}>
                <Text style={styles.listMeta}>Overdue Amount: ₱{Number(billingHealth.overdueInvoicesAmount || 0).toLocaleString()}</Text>
                <Text style={styles.listMeta}>Due Soon Amount: ₱{Number(billingHealth.dueSoonInvoicesAmount || 0).toLocaleString()}</Text>
              </View>

              {(billingHealth.overdueInvoices || []).slice(0, 3).map((invoice) => (
                <TouchableOpacity
                  key={invoice.id}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('Payments', {
                    filter: 'overdue',
                    searchQuery: invoice.tenantName,
                    focusInvoiceId: invoice.id,
                    drilldownToken: Date.now(),
                  })}
                  style={[styles.listItem, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}
                > 
                  <View style={styles.listContent}>
                    <Text style={styles.listTitle}>{invoice.tenantName}</Text>
                    <Text style={styles.listSubtitle}>{invoice.propertyTitle} • Room {invoice.roomNumber}</Text>
                    <Text style={[styles.listMeta, { color: '#991B1B' }]}>Due {invoice.dueDate}</Text>
                  </View>
                  <Text style={styles.listAmount}>₱{Number(invoice.amount || 0).toLocaleString()}</Text>
                </TouchableOpacity>
              ))}

              {(billingHealth.overdueInvoices || []).length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={36} color="#9CA3AF" />
                  <Text style={styles.emptyStateText}>No overdue invoices</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Unpaid Bookings */}
        {!isCaretaker && (
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
        )}

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
                    {!isCaretaker && (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.performanceStatLabel}>Revenue</Text>
                        <Text style={styles.performanceStatValue}>₱{(property.actualRevenue ?? 0).toLocaleString()}</Text>
                      </View>
                    )}
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

