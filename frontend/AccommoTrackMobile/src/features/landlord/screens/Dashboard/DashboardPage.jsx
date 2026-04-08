import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getStyles } from '../../../../styles/Landlord/DashboardPage.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { useUIState } from '../../../../contexts/UIStateContext.jsx';
import { triggerForcedLogout } from '../../../../navigation/RootNavigation.js';
import Button from '../../components/Button.jsx';
import MenuDrawer from '../../components/MenuDrawer.jsx';
import PropertyService from '../../../../services/PropertyService.js';
import ProfileService from '../../../../services/ProfileService.js';
import LandlordDashboardService from '../../../../services/LandlordDashboardService.js';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';


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
  pending_offline: { bg: '#FEF3C7', fg: '#92400E' },
  in_progress: { bg: '#FEF3C7', fg: '#92400E' },
  partial: { bg: '#FEF3C7', fg: '#92400E' },
  'partial-completed': { bg: '#FEF3C7', fg: '#92400E' },
  processing: { bg: '#FEF3C7', fg: '#92400E' },
  confirmed: { bg: '#DCFCE7', fg: '#166534' },
  completed: { bg: '#DCFCE7', fg: '#166534' },
  paid: { bg: '#DCFCE7', fg: '#166534' },
  approved: { bg: '#DCFCE7', fg: '#166534' },
  active: { bg: '#DCFCE7', fg: '#166534' },
  available: { bg: '#DCFCE7', fg: '#166534' },
  resolved: { bg: '#DCFCE7', fg: '#166534' },
  succeeded: { bg: '#DCFCE7', fg: '#166534' },
  verified: { bg: '#DCFCE7', fg: '#166534' },
  occupied: { bg: '#DBEAFE', fg: '#1D4ED8' },
  updated: { bg: '#DBEAFE', fg: '#1D4ED8' },
  changed: { bg: '#DBEAFE', fg: '#1D4ED8' },
  cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
  canceled: { bg: '#FEE2E2', fg: '#991B1B' },
  rejected: { bg: '#FEE2E2', fg: '#991B1B' },
  failed: { bg: '#FEE2E2', fg: '#991B1B' },
  declined: { bg: '#FEE2E2', fg: '#991B1B' },
  overdue: { bg: '#FEE2E2', fg: '#991B1B' },
  inactive: { bg: '#E5E7EB', fg: '#374151' },
  maintenance: { bg: '#E5E7EB', fg: '#374151' },
  draft: { bg: '#E5E7EB', fg: '#374151' }
};

const normalizeActivityStatus = (status) => String(status || '').toLowerCase();

const resolveActivityColorKey = (activity) => {
  const explicitColor = String(activity?.color || '').toLowerCase();
  if (activityColorMap[explicitColor]) {
    return explicitColor;
  }

  const status = normalizeActivityStatus(activity?.status);
  const type = String(activity?.type || '').toLowerCase();

  if (type === 'property' && (status === 'updated' || status === 'changed')) return 'blue';
  if (type === 'room' && status === 'occupied') return 'blue';
  if (['cancelled', 'canceled', 'rejected', 'failed', 'declined', 'overdue'].includes(status)) return 'red';
  if (['pending', 'pending_offline', 'in_progress', 'partial', 'partial-completed', 'processing'].includes(status)) return 'yellow';
  if (['confirmed', 'completed', 'paid', 'approved', 'active', 'available', 'resolved', 'succeeded', 'verified'].includes(status)) return 'green';
  if (['inactive', 'maintenance', 'draft'].includes(status)) return 'gray';

  return 'gray';
};

const resolveStatusBadgeStyle = (activity) => {
  const status = normalizeActivityStatus(activity?.status);
  return statusBadgeMap[status] || activityColorMap[resolveActivityColorKey(activity)] || { bg: '#E5E7EB', fg: '#374151' };
};

const urgencyColorMap = {
  high: { bg: '#FEE2E2', border: '#FCA5A5', fg: '#991B1B' },
  medium: { bg: '#FEF3C7', border: '#FCD34D', fg: '#854D0E' },
  low: { bg: '#DCFCE7', border: '#86EFAC', fg: '#166534' }
};

const EMPTY_LIST = [];
const EMPTY_DASHBOARD = {
  stats: null,
  activities: EMPTY_LIST,
  upcomingPayments: { upcomingCheckouts: EMPTY_LIST, unpaidBookings: EMPTY_LIST },
  propertyPerformance: EMPTY_LIST
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
  const { uiState, updateData, invalidateData } = useUIState();
  const BUCKET = 'landlord_dashboard';

  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [moreActionsVisible, setMoreActionsVisible] = useState(false);
  const [permissionModal, setPermissionModal] = useState({
    visible: false,
    actionTitle: '',
  });

  const { theme } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const styles = React.useMemo(() => getStyles(theme, screenWidth, screenHeight), [theme, screenWidth, screenHeight]);
  const cachedDashboard = uiState.data?.[BUCKET];
  const isCaretaker = user?.role === 'caretaker';
  const isTablet = screenWidth >= 768;
  const isLargeTablet = screenWidth >= 1024;

  const normalizePermissionValue = useCallback((value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'allowed';
    }
    return Boolean(value);
  }, []);

  const buildPermissionCandidates = useCallback((key, aliases = []) => {
    const base = String(key || '').trim();
    const singular = base.endsWith('ies')
      ? `${base.slice(0, -3)}y`
      : base.endsWith('s')
        ? base.slice(0, -1)
        : base;
    const plural = base.endsWith('s')
      ? base
      : singular === 'property'
        ? 'properties'
        : `${singular}s`;

    const keys = new Set([base, singular, plural, ...aliases]);
    const expanded = [];

    keys.forEach((entry) => {
      if (!entry) return;
      expanded.push(entry, `can_view_${entry}`, `can_manage_${entry}`);
    });

    return expanded;
  }, []);

  const hasPermission = useCallback((key, aliases = []) => {
    if (!isCaretaker) return true;
    const permissions = user?.caretaker_permissions;
    return buildPermissionCandidates(key, aliases).some((candidate) =>
      normalizePermissionValue(permissions?.[candidate]),
    );
  }, [buildPermissionCandidates, isCaretaker, normalizePermissionValue, user?.caretaker_permissions]);

  const dashboardQuery = useQuery({
    queryKey: landlordQueryKeys.dashboardBundle(),
    queryFn: async () => {
      const response = await LandlordDashboardService.fetchDashboard({
        includeRevenueChart: !isCaretaker,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to load dashboard');
      }

      return response.data || EMPTY_DASHBOARD;
    },
    placeholderData: cachedDashboard || undefined,
  });

  const verificationQuery = useQuery({
    queryKey: landlordQueryKeys.verificationStatusBundle(),
    queryFn: async () => {
      const response = await ProfileService.getVerificationStatus();
      return response.success ? response.data : null;
    },
    enabled: Boolean(user) && !isCaretaker,
  });

  const unreadCountQuery = useQuery({
    queryKey: landlordQueryKeys.unreadNotificationCount(),
    queryFn: async () => {
      const response = await LandlordDashboardService.fetchUnreadNotificationsCount();
      if (!response.success) return 0;

      const rawCount =
        typeof response.data === 'object'
          ? response.data?.count ?? response.data?.data?.count
          : response.data;
      const count = Number(rawCount);
      return Number.isFinite(count) ? count : 0;
    },
  });

  const pendingTransfersQuery = useQuery({
    queryKey: landlordQueryKeys.pendingTransferCount(),
    queryFn: async () => {
      const response = await PropertyService.getTransferRequests();
      if (!response.success || !Array.isArray(response.data)) {
        return 0;
      }

      return response.data.filter(
        (item) => String(item.status || '').toLowerCase() === 'pending',
      ).length;
    },
  });

  const dashboardData = dashboardQuery.data ?? cachedDashboard ?? EMPTY_DASHBOARD;
  const hasDashboardData = Boolean(
    dashboardData?.stats
    || (dashboardData?.activities || EMPTY_LIST).length > 0
    || (dashboardData?.propertyPerformance || EMPTY_LIST).length > 0,
  );
  const dashboardLoading = dashboardQuery.isPending && !hasDashboardData;
  const dashboardError = !hasDashboardData && dashboardQuery.error
    ? dashboardQuery.error.message || 'Failed to load dashboard'
    : '';
  const verificationStatus = isCaretaker ? null : (verificationQuery.data || null);
  const unreadNotificationCount = unreadCountQuery.data ?? 0;
  const pendingTransferCount = pendingTransfersQuery.data ?? 0;

  const majorQuickActions = [
    {
      id: 1,
      title: 'Properties',
      icon: 'business',
      color: theme.colors.primary,
      screen: 'Properties',
      requiredPermission: { key: 'properties', aliases: ['property', 'property_management'] },
    },
    {
      id: 2,
      title: 'Rooms',
      icon: 'bed',
      color: '#8B5CF6',
      screen: 'RoomManagement',
      requiredPermission: { key: 'rooms' },
    },
    {
      id: 3,
      title: 'Tenants',
      icon: 'people',
      color: '#2196F3',
      screen: 'Tenants',
      requiredPermission: { key: 'tenants' },
    },
    {
      id: 4,
      title: 'Bookings',
      icon: 'calendar',
      color: '#FF9800',
      screen: 'Bookings',
      requiredPermission: { key: 'bookings' },
    },
    {
      id: 5,
      title: 'Payments',
      icon: 'cash',
      color: '#16a34a',
      screen: 'Payments',
      requiredPermission: { key: 'payments' },
    },
    {
      id: 6,
      title: 'Analytics',
      icon: 'bar-chart',
      color: '#9C27B0',
      screen: 'Analytics',
      requiredPermission: { key: 'analytics' },
    },
  ];

  const minorQuickActions = [
    {
      id: 7,
      title: 'Transfers',
      icon: 'swap-horizontal',
      color: '#F43F5E',
      screen: 'TransferRequests',
      show: !isCaretaker || hasPermission('tenants'),
      badgeCount: pendingTransferCount,
    },
    {
      id: 8,
      title: 'Add-ons',
      icon: 'sparkles-outline',
      color: '#14B8A6',
      screen: 'AddonManagement',
      show: !isCaretaker,
    },
    {
      id: 9,
      title: 'Maintenance',
      icon: 'construct',
      color: '#F59E0B',
      screen: 'MaintenanceRequests',
      show: !isCaretaker || hasPermission('maintenance'),
    },
    {
      id: 10,
      title: 'Reviews',
      icon: 'star',
      color: '#FCD34D',
      screen: 'Reviews',
      show: !isCaretaker,
    },
    {
      id: 11,
      title: 'Messages',
      icon: 'chatbubbles',
      color: theme.colors.primary,
      screen: 'Messages',
      show: !isCaretaker || hasPermission('messages'),
    },
    {
      id: 12,
      title: 'Settings',
      icon: 'settings',
      color: '#64748B',
      screen: 'Settings',
      show: true,
    },
  ];

  const hasQuickActionAccess = useCallback((action) => {
    if (!isCaretaker) return true;

    if (!action?.requiredPermission) {
      return true;
    }

    return hasPermission(
      action.requiredPermission.key,
      action.requiredPermission.aliases || [],
    );
  }, [hasPermission, isCaretaker]);

  const visibleMajorQuickActions = majorQuickActions;
  const allQuickActions = [
    ...visibleMajorQuickActions,
    ...minorQuickActions.filter((action) => action.show),
  ];
  const quickActionColumns = isLargeTablet ? 5 : isTablet ? 4 : 3;
  const quickActionGap = isTablet ? 12 : 8;
  const quickActionAvailableWidth = Math.max(320, screenWidth - 32);
  const quickActionRawSize = Math.floor(
    (quickActionAvailableWidth - quickActionGap * (quickActionColumns - 1)) / quickActionColumns,
  );
  const quickActionTileSize = isTablet
    ? Math.min(140, Math.max(104, quickActionRawSize))
    : Math.min(84, Math.max(72, quickActionRawSize));
  const quickActionsToRender = isTablet ? allQuickActions : visibleMajorQuickActions;
  const showMoreQuickActions = !isTablet && allQuickActions.length > visibleMajorQuickActions.length;
  const quickActionsSectionStyle = isTablet
    ? { width: '100%', maxWidth: 1080, alignSelf: 'center' }
    : null;
  const quickActionsGridStyle = {
    justifyContent: 'flex-start',
    columnGap: quickActionGap,
    rowGap: quickActionGap,
  };
  const quickActionCardStyle = isTablet
    ? {
        width: quickActionTileSize,
        height: 102,
        borderRadius: 18,
        paddingHorizontal: 8,
        paddingVertical: 10,
      }
    : {
        width: quickActionTileSize,
        height: quickActionTileSize,
        borderRadius: quickActionTileSize / 2,
      };
  const quickActionIconStyle = isTablet
    ? {
        width: 34,
        height: 34,
        borderRadius: 12,
        marginBottom: 6,
      }
    : null;
  const quickActionTitleStyle = isTablet
    ? {
        fontSize: 12,
        lineHeight: 14,
        paddingHorizontal: 4,
      }
    : null;

  const handleQuickActionPress = useCallback((action, closeMore = false) => {
    if (closeMore) {
      setMoreActionsVisible(false);
    }

    if (!hasQuickActionAccess(action)) {
      setPermissionModal({ visible: true, actionTitle: action?.title || 'this module' });
      return;
    }

    navigation.navigate(action.screen);
  }, [hasQuickActionAccess, navigation]);

  useEffect(() => {
    if (dashboardQuery.data) {
      updateData(BUCKET, dashboardQuery.data);
    }
  }, [dashboardQuery.data, updateData]);

  // Load user if not provided via props (happens in BottomTabNavigator)
  useEffect(() => {
    const loadUser = async () => {
      if (!user) {
        try {
          const userString = await AsyncStorage.getItem('user');
          if (userString) {
            setUser(JSON.parse(userString));
          }
        } catch (_error) {}
      }
    };
    loadUser();
  }, [user]);

  const refetchDashboard = dashboardQuery.refetch;
  const refetchVerification = verificationQuery.refetch;
  const refetchUnreadCount = unreadCountQuery.refetch;
  const refetchPendingTransfers = pendingTransfersQuery.refetch;

  const dashboardRefetchers = React.useMemo(
    () => [
      refetchDashboard,
      refetchVerification,
      refetchUnreadCount,
      refetchPendingTransfers,
    ],
    [
      refetchDashboard,
      refetchVerification,
      refetchUnreadCount,
      refetchPendingTransfers,
    ],
  );

  useLandlordFocusRefetch({ refetchers: dashboardRefetchers });

  const refreshDashboardQueries = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: dashboardRefetchers,
  });

  const handleRefresh = useCallback(async () => {
    invalidateData(BUCKET);
    await refreshDashboardQueries();
  }, [invalidateData, refreshDashboardQueries]);

  const handleRetry = useCallback(() => {
    refetchLandlordQueries(dashboardRefetchers);
  }, [dashboardRefetchers]);

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
  
  const renderVerificationBanner = () => {
    if (isCaretaker) return null;
    if (!verificationStatus) return null;

    const verificationState = String(verificationStatus?.status || 'not_submitted').toLowerCase();
    if (verificationState === 'approved') return null;

    const isRejected = verificationState === 'rejected';
    const isPending = verificationState === 'pending';

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
            Verification: {verificationState.replace('_', ' ').toUpperCase()}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsRow}
          >
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
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={[styles.quickActionsSection, quickActionsSectionStyle]}>
          <View style={styles.quickActionsHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            {showMoreQuickActions && (
              <TouchableOpacity
                style={styles.quickActionsMoreButton}
                onPress={() => setMoreActionsVisible(true)}
              >
                <Text style={styles.quickActionsMoreText}>More</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.actionsGrid, quickActionsGridStyle]}>
            {quickActionsToRender.map((action) => {
              const hasAccess = hasQuickActionAccess(action);
              return (
                <Button
                  key={action.id}
                  style={[
                    styles.actionCard,
                    quickActionCardStyle,
                    !hasAccess && styles.actionCardRestricted,
                  ]}
                  onPress={() => handleQuickActionPress(action)}
                  type="transparent"
                >
                  {!hasAccess && (
                    <View style={styles.actionRestrictedBadge}>
                      <Ionicons name="lock-closed" size={9} color="#FFFFFF" />
                    </View>
                  )}
                  {action.badgeCount > 0 && (
                    <View style={styles.actionBadge}>
                      <Text style={styles.actionBadgeText}>{action.badgeCount > 99 ? '99+' : action.badgeCount}</Text>
                    </View>
                  )}
                  <View style={[styles.actionIcon, quickActionIconStyle, { backgroundColor: action.color + '20' }]}> 
                    <Ionicons name={action.icon} size={20} color={action.color} />
                  </View>
                  <Text style={[styles.actionTitle, quickActionTitleStyle]}>{action.title}</Text>
                </Button>
              );
            })}
          </View>
        </View>

        {showMoreQuickActions && (
          <Modal
            transparent
            visible={moreActionsVisible}
            animationType="fade"
            statusBarTranslucent
            navigationBarTranslucent
            presentationStyle="overFullScreen"
            onRequestClose={() => setMoreActionsVisible(false)}
          >
            <Pressable
              style={styles.quickActionsModalBackdrop}
              onPress={() => setMoreActionsVisible(false)}
            >
              <Pressable style={styles.quickActionsModalCard} onPress={() => {}}>
                <View style={styles.quickActionsModalHeader}>
                  <Text style={styles.quickActionsModalTitle}>All Quick Actions</Text>
                  <TouchableOpacity
                    style={styles.quickActionsModalClose}
                    onPress={() => setMoreActionsVisible(false)}
                  >
                    <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.quickActionsModalBody}
                >
                  <View style={styles.quickActionsModalGrid}>
                    {allQuickActions.map((action) => {
                      const hasAccess = hasQuickActionAccess(action);
                      return (
                        <Button
                          key={`more-${action.id}`}
                          style={[
                            styles.actionCard,
                            !hasAccess && styles.actionCardRestricted,
                          ]}
                          onPress={() => handleQuickActionPress(action, true)}
                          type="transparent"
                        >
                          {!hasAccess && (
                            <View style={styles.actionRestrictedBadge}>
                              <Ionicons name="lock-closed" size={9} color="#FFFFFF" />
                            </View>
                          )}
                          {action.badgeCount > 0 && (
                            <View style={styles.actionBadge}>
                              <Text style={styles.actionBadgeText}>{action.badgeCount > 99 ? '99+' : action.badgeCount}</Text>
                            </View>
                          )}
                          <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}> 
                            <Ionicons name={action.icon} size={20} color={action.color} />
                          </View>
                          <Text style={styles.actionTitle}>{action.title}</Text>
                        </Button>
                      );
                    })}
                  </View>
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>
        )}

        <Modal
          transparent
          visible={permissionModal.visible}
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          presentationStyle="overFullScreen"
          onRequestClose={() => setPermissionModal({ visible: false, actionTitle: '' })}
        >
          <Pressable
            style={styles.permissionModalBackdrop}
            onPress={() => setPermissionModal({ visible: false, actionTitle: '' })}
          >
            <Pressable style={styles.permissionModalCard} onPress={() => {}}>
              <View style={styles.permissionModalIconWrap}>
                <Ionicons name="lock-closed" size={22} color="#B45309" />
              </View>
              <Text style={styles.permissionModalTitle}>Permission Required</Text>
              <Text style={styles.permissionModalMessage}>
                You do not have permission to access {permissionModal.actionTitle || 'this module'}. Please contact the landlord.
              </Text>
              <TouchableOpacity
                style={styles.permissionModalButton}
                onPress={() => setPermissionModal({ visible: false, actionTitle: '' })}
              >
                <Text style={styles.permissionModalButtonText}>Okay</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Button 
              type="transparent"
              onPress={() => navigation.navigate('AllActivities', {
                activities,
                isCaretaker,
              })}
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
                const colorKey = resolveActivityColorKey(activity);
                const palette = activityColorMap[colorKey] || activityColorMap.gray;
                const iconName = activityIconMap[activity.type] || activityIconMap.default;
                const statusStyle = resolveStatusBadgeStyle(activity);
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

      </ScrollView>
    </SafeAreaView>
  );
}

