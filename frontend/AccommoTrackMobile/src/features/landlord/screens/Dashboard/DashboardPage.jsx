import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
import { hasPermission as checkPermission } from '../../../../utils/permissionHelpers.js';
import PermissionBlockedModal from '../../components/PermissionBlockedModal.jsx';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';


const getActivityColorMap = (isDark) => ({
  green: { bg: isDark ? 'rgba(22,101,52,0.2)' : '#DCFCE7', fg: isDark ? '#4ade80' : '#166534' },
  blue: { bg: isDark ? 'rgba(30,64,175,0.2)' : '#DBEAFE', fg: isDark ? '#60a5fa' : '#1D4ED8' },
  yellow: { bg: isDark ? 'rgba(146,64,14,0.2)' : '#FEF9C3', fg: isDark ? '#fbbf24' : '#854D0E' },
  red: { bg: isDark ? 'rgba(153,27,27,0.2)' : '#FEE2E2', fg: isDark ? '#f87171' : '#991B1B' },
  gray: { bg: isDark ? 'rgba(55,65,81,0.2)' : '#E5E7EB', fg: isDark ? '#9ca3af' : '#374151' }
});

const getStatusBadgeMap = (isDark) => {
  const activity = getActivityColorMap(isDark);
  return {
    pending: activity.yellow,
    pending_offline: activity.yellow,
    in_progress: activity.yellow,
    partial: activity.yellow,
    'partial-completed': activity.yellow,
    processing: activity.yellow,
    confirmed: activity.green,
    completed: activity.green,
    paid: activity.green,
    approved: activity.green,
    active: activity.green,
    available: activity.green,
    resolved: activity.green,
    succeeded: activity.green,
    verified: activity.green,
    occupied: activity.blue,
    updated: activity.blue,
    changed: activity.blue,
    cancelled: activity.red,
    canceled: activity.red,
    rejected: activity.red,
    failed: activity.red,
    declined: activity.red,
    overdue: activity.red,
    refunded: activity.red,
    inactive: activity.gray,
    maintenance: activity.gray,
    draft: activity.gray,
    notified: activity.blue
  };
};

const activityIconMap = {
  booking: 'calendar',
  room: 'bed',
  payment: 'cash-outline',
  invoice: 'cash-outline',
  maintenance: 'construct-outline',
  transfer: 'swap-horizontal',
  default: 'notifications-outline'
};

const normalizeActivityStatus = (status) => String(status || '').toLowerCase();

const resolveActivityColorKey = (activity) => {
  const explicitColor = String(activity?.color || '').toLowerCase();
  if (['green', 'blue', 'yellow', 'red', 'gray'].includes(explicitColor)) return explicitColor;

  const status = normalizeActivityStatus(activity?.status);
  const type = String(activity?.type || '').toLowerCase();

  if (type === 'property' && (status === 'updated' || status === 'changed')) return 'blue';
  if (type === 'room' && status === 'occupied') return 'blue';
  if (['cancelled', 'canceled', 'rejected', 'failed', 'declined', 'overdue', 'refunded'].includes(status)) return 'red';
  if (['pending', 'pending_offline', 'in_progress', 'partial', 'partial-completed', 'processing'].includes(status)) return 'yellow';
  if (['confirmed', 'completed', 'paid', 'approved', 'active', 'available', 'resolved', 'succeeded', 'verified'].includes(status)) return 'green';
  if (['notified', 'received', 'submitted'].includes(status)) return 'blue';
  if (['inactive', 'maintenance', 'draft'].includes(status)) return 'gray';

  return 'gray';
};

const resolveStatusBadgeStyle = (activity, isDark) => {
  const status = normalizeActivityStatus(activity?.status);
  const badgeMap = getStatusBadgeMap(isDark);
  return badgeMap[status] || getActivityColorMap(isDark)[resolveActivityColorKey(activity)] || { bg: isDark ? '#374151' : '#E5E7EB', fg: isDark ? '#9ca3af' : '#374151' };
};

const getUrgencyColorMap = (isDark) => ({
  high: { bg: isDark ? 'rgba(153,27,27,0.2)' : '#FEE2E2', border: isDark ? '#991B1B' : '#FCA5A5', fg: isDark ? '#f87171' : '#991B1B' },
  medium: { bg: isDark ? 'rgba(146,64,14,0.2)' : '#FEF3C7', border: isDark ? '#92400E' : '#FCD34D', fg: isDark ? '#fbbf24' : '#854D0E' },
  low: { bg: isDark ? 'rgba(22,101,52,0.2)' : '#DCFCE7', border: isDark ? '#166534' : '#86EFAC', fg: isDark ? '#4ade80' : '#166534' }
});

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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function LandlordDashboard({ navigation, user: initialUser, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const { uiState, updateData, invalidateData } = useUIState();
  const BUCKET = 'landlord_dashboard';

  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [moreActionsVisible, setMoreActionsVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
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

  const hasPermission = useCallback((key, aliases = []) => {
    return checkPermission(user?.caretaker_permissions, isCaretaker, key, aliases);
  }, [isCaretaker, user?.caretaker_permissions]);

  const openPermissionModal = useCallback((actionTitle) => {
    setPermissionModal({
      visible: true,
      actionTitle: actionTitle || 'this module',
    });
  }, []);

  const canAccessNamedModule = useCallback((moduleKey) => {
    if (!isCaretaker) return true;

    switch (String(moduleKey || '').toLowerCase()) {
      case 'properties':
        return hasPermission('properties', ['property', 'property_management']);
      case 'rooms':
        return hasPermission('rooms');
      case 'tenants':
        return hasPermission('tenants');
      case 'bookings':
        return hasPermission('bookings');
      case 'payments':
        return hasPermission('payments');
      case 'analytics':
        return hasPermission('analytics');
      case 'messages':
        return hasPermission('messages');
      case 'maintenance':
        return hasPermission('maintenance');
      case 'manage_add_ons':
        return hasPermission('manage_add_ons');
      default:
        return false;
    }
  }, [hasPermission, isCaretaker]);

  const canAccessNotifications = !isCaretaker;

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
    staleTime: 5 * 60 * 1000, // 5 minutes fresh time
    gcTime: 30 * 60 * 1000,   // 30 minutes cache retention
    refetchOnWindowFocus: false,
    placeholderData: cachedDashboard || undefined,
  });

  const verificationQuery = useQuery({
    queryKey: landlordQueryKeys.verificationStatusBundle(),
    queryFn: async () => {
      const response = await ProfileService.getVerificationStatus();
      return response.success ? response.data : null;
    },
    staleTime: 10 * 60 * 1000, // Verification status changes rarely
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
    staleTime: 30 * 1000, // Check unread count every 30 seconds at most automatically
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
    staleTime: 60 * 1000, // Transfers count can be slightly stale
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
      category: 'Core Category',
      requiredPermission: { key: 'properties', aliases: ['property', 'property_management'] },
    },
    {
      id: 2,
      title: 'Rooms',
      icon: 'bed',
      color: '#8B5CF6',
      screen: 'RoomManagement',
      category: 'Core Category',
      requiredPermission: { key: 'rooms' },
    },
    {
      id: 3,
      title: 'Tenants',
      icon: 'people',
      color: '#2196F3',
      screen: 'Tenants',
      category: 'Core Category',
      requiredPermission: { key: 'tenants' },
    },
    {
      id: 4,
      title: 'Bookings',
      icon: 'calendar',
      color: '#FF9800',
      screen: 'Bookings',
      category: 'Core Category',
      requiredPermission: { key: 'bookings' },
    },
    {
      id: 5,
      title: 'Payments',
      icon: 'cash',
      color: '#16a34a',
      screen: 'Payments',
      category: 'Core Category',
      requiredPermission: { key: 'payments' },
    },
    {
      id: 6,
      title: 'Analytics',
      icon: 'bar-chart',
      color: '#9C27B0',
      screen: 'Analytics',
      category: 'Core Category',
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
      category: 'Room Category',
      show: hasPermission('tenants'),
      badgeCount: pendingTransferCount,
    },
    {
      id: 8,
      title: 'Add-ons',
      icon: 'sparkles-outline',
      color: '#14B8A6',
      screen: 'AddonManagement',
      category: 'Room Category',
      show: hasPermission('manage_add_ons'),
    },
    {
      id: 9,
      title: 'Maintenance',
      icon: 'construct',
      color: '#F59E0B',
      screen: 'MaintenanceRequests',
      category: 'Room Category',
      show: hasPermission('maintenance'),
    },
    {
      id: 10,
      title: 'Reviews',
      icon: 'star',
      color: '#FCD34D',
      screen: 'Reviews',
      category: 'Reputation Category',
      show: !isCaretaker,
    },
    {
      id: 11,
      title: 'Messages',
      icon: 'chatbubbles',
      color: theme.colors.primary,
      screen: 'Messages',
      category: 'Communication Category',
      show: hasPermission('messages'),
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

  const allQuickActions = [...majorQuickActions, ...minorQuickActions.filter((action) => action.show)];
  const visibleQuickActions = allQuickActions.slice(0, 8);
  const quickActionColumns = 4;
  const quickActionGap = isTablet ? 12 : 8;
  const quickActionAvailableWidth = Math.max(320, screenWidth - 32);
  const quickActionRawSize = Math.floor(
    (quickActionAvailableWidth - quickActionGap * (quickActionColumns - 1)) / quickActionColumns,
  );
  const quickActionTileSize = isTablet
    ? Math.min(136, Math.max(98, quickActionRawSize))
    : Math.min(96, Math.max(74, quickActionRawSize));
  const quickActionsToRender = visibleQuickActions;
  const showMoreQuickActions = allQuickActions.length > visibleQuickActions.length;
  const quickActionsSectionStyle = isTablet
    ? { width: '100%', maxWidth: 1080, alignSelf: 'center' }
    : null;
  const quickActionsGridStyle = {
    justifyContent: 'center',
    alignSelf: 'center',
    columnGap: quickActionGap,
    rowGap: quickActionGap,
  };
  const quickActionCardStyle = isTablet
    ? {
      width: quickActionTileSize,
      minHeight: 102,
      borderRadius: 14,
      paddingHorizontal: 4,
      paddingVertical: 8,
    }
    : {
      width: quickActionTileSize,
      minHeight: 84,
      borderRadius: 12,
      paddingHorizontal: 4,
      paddingVertical: 8,
    };
  const quickActionIconStyle = {
    width: isTablet ? 42 : 40,
    height: isTablet ? 46 : 44,
    borderRadius: 10,
    marginBottom: isTablet ? 6 : 4,
  };
  const quickActionTitleStyle = {
    fontSize: isTablet ? 12 : 10,
    lineHeight: isTablet ? 14 : 12,
    paddingHorizontal: 2,
  };

  const groupedQuickActionsForModal = (() => {
    const categories = [
      'Core Category',
      'Room Category',
      'Communication Category',
      'Reputation Category',
      'General Category',
    ];

    const grouped = categories
      .map((category) => ({
        category,
        items: allQuickActions.filter((action) => (action.category || 'General Category') === category),
      }))
      .filter((group) => group.items.length > 0);

    if (grouped.length > 0) {
      return grouped;
    }

    return [
      {
        category: 'General Category',
        items: allQuickActions,
      },
    ];
  })();

  const handleQuickActionPress = useCallback((action, closeMore = false) => {
    if (closeMore) {
      setMoreActionsVisible(false);
    }

    if (!hasQuickActionAccess(action)) {
      openPermissionModal(action?.title || 'this module');
      return;
    }

    navigation.navigate(action.screen);
  }, [hasQuickActionAccess, navigation, openPermissionModal]);

  const handleActivityPress = useCallback((activity) => {
    if (!activity) return;

    const type = String(activity.type || '').toLowerCase();
    const entityId = activity.id;

    const ensureActivityAccess = (moduleKey, label) => {
      if (canAccessNamedModule(moduleKey)) {
        return true;
      }

      openPermissionModal(label);
      return false;
    };

    switch (type) {
      case 'booking': {
        if (!ensureActivityAccess('bookings', 'Bookings')) return;

        const params = {
          focusBookingId: entityId || null,
          drilldownToken: Date.now(),
        };
        navigation.navigate('Bookings', params);
        break;
      }
      case 'payment': {
        if (!ensureActivityAccess('payments', 'Payments')) return;

        const invoiceId = activity.invoice_id || activity.data?.invoice_id || entityId;
        const params = {
          focusInvoiceId: invoiceId || null,
          drilldownToken: Date.now(),
        };
        navigation.navigate('Payments', params);
        break;
      }
      case 'room': {
        if (!ensureActivityAccess('rooms', 'Rooms')) return;

        const params = {
          focusRoomId: entityId,
          drilldownToken: Date.now(),
        };
        navigation.navigate('RoomManagement', params);
        break;
      }
      case 'property': {
        if (!ensureActivityAccess('properties', 'Properties')) return;

        navigation.navigate('Properties', {
          focusPropertyId: entityId,
          drilldownToken: Date.now(),
        });
        break;
      }
      case 'maintenance': {
        if (!ensureActivityAccess('maintenance', 'Maintenance')) return;

        navigation.navigate('MaintenanceRequests', {
          focusRequestId: entityId,
          drilldownToken: Date.now(),
        });
        break;
      }
      case 'addon': {
        if (!ensureActivityAccess('manage_add_ons', 'Add-ons')) return;


        navigation.navigate('AddonManagement', {
          focusRequestId: entityId,
          drilldownToken: Date.now(),
        });
        break;
      }
      case 'transfer': {
        const params = {
          focusTransferId: entityId || null,
          drilldownToken: Date.now(),
        };
        navigation.navigate('TransferRequests', params);
        break;
      }
      default:
    }
  }, [canAccessNamedModule, navigation, openPermissionModal]);

  const handleNotificationsPress = useCallback(() => {
    if (!canAccessNotifications) {
      openPermissionModal('Notifications');
      return;
    }

    navigation.navigate('Notifications');
  }, [canAccessNotifications, navigation, openPermissionModal]);

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
        } catch (_error) { }
      }
    };
    loadUser();
  }, [user]);

  const refetchDashboard = useCallback(() => {
    if (dashboardQuery.isStale || !dashboardQuery.data) {
      dashboardQuery.refetch();
    }
  }, [dashboardQuery.isStale, dashboardQuery.data, dashboardQuery.refetch]);

  const refetchVerification = useCallback(() => {
    if (verificationQuery.isStale || !verificationQuery.data) {
      verificationQuery.refetch();
    }
  }, [verificationQuery.isStale, verificationQuery.data, verificationQuery.refetch]);

  const refetchUnreadCount = useCallback(() => {
    if (unreadCountQuery.isStale || !unreadCountQuery.data) {
      unreadCountQuery.refetch();
    }
  }, [unreadCountQuery.isStale, unreadCountQuery.data, unreadCountQuery.refetch]);

  const refetchPendingTransfers = useCallback(() => {
    if (pendingTransfersQuery.isStale || !pendingTransfersQuery.data) {
      pendingTransfersQuery.refetch();
    }
  }, [pendingTransfersQuery.isStale, pendingTransfersQuery.data, pendingTransfersQuery.refetch]);

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

  const handleMenuItemPress = useCallback((screen) => {
    const menuPermissionMap = {
      MyProperties: { module: 'properties', label: 'Properties' },
      RoomManagement: { module: 'rooms', label: 'Rooms' },
      Tenants: { module: 'tenants', label: 'Tenants' },
      Payments: { module: 'payments', label: 'Payments' },
      Analytics: { module: 'analytics', label: 'Analytics' },
    };

    const mapped = menuPermissionMap?.[screen];
    if (mapped && !canAccessNamedModule(mapped.module)) {
      openPermissionModal(mapped.label);
      return;
    }

    navigation.navigate(screen);
  }, [canAccessNamedModule, navigation, openPermissionModal]);

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const handleLogoutConfirm = async () => {
    setLogoutModalVisible(false);
    try {
      if (onLogout) {
        await onLogout();
      } else {
        // Clear only auth-related data
        await AsyncStorage.multiRemove(['token', 'user', 'user_id', 'isGuest']);
        triggerForcedLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
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
    if (verificationState === 'approved' || verificationState === 'verified') return null;

    const isRejected = verificationState === 'rejected';
    const isPending = verificationState === 'pending';

    let bannerBg = theme.isDark ? 'rgba(153,27,27,0.1)' : '#FEF2F2';
    let contentColor = theme.isDark ? '#f87171' : '#991B1B';
    let borderColor = theme.isDark ? '#991B1B' : '#FCA5A5';

    if (isPending) {
      bannerBg = theme.isDark ? 'rgba(146,64,14,0.1)' : '#FFFBEB';
      contentColor = theme.isDark ? '#fbbf24' : '#92400E';
      borderColor = theme.isDark ? '#92400E' : '#FCD34D';
    } else if (verificationState === 'not_submitted') {
      bannerBg = theme.isDark ? 'rgba(124,45,18,0.1)' : '#FFF7ED';
      contentColor = theme.isDark ? '#fb923c' : '#9A3412';
      borderColor = theme.isDark ? '#9A3412' : '#FFEDD5';
    }

    return (
      <TouchableOpacity
        style={[
          styles.verificationBanner,
          { backgroundColor: bannerBg, borderColor: borderColor, borderWidth: 1 }
        ]}
        onPress={() => navigation.navigate('VerificationStatus')}
      >
        <Ionicons
          name={isRejected ? "alert-circle" : isPending ? "time" : "shield-checkmark"}
          size={24}
          color={contentColor}
        />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={[styles.bannerTitle, { color: contentColor }]}>
            Verification: {verificationState.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={[styles.bannerText, { color: theme.colors.textSecondary }]}>
            {isRejected ? (verificationStatus.rejection_reason || "Your landlord verification documents were rejected. This is separate from your property drafts. Tap to view reason.") :
              isPending ? "Your documents are being reviewed." :
                "Submit your documents to verify your account."}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
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
          <Text style={styles.userName}>{'Dashboard'}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.notificationButton,
            !canAccessNotifications && { opacity: 0.7 },
          ]}
          onPress={handleNotificationsPress}
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
              <TouchableWithoutFeedback onPress={() => { }}>
                <View style={styles.quickActionsModalCard}>
                  <View style={styles.quickActionsModalHeader}>
                    <Text style={styles.quickActionsModalTitle}>More Actions</Text>
                    <TouchableOpacity
                      style={styles.quickActionsModalClose}
                      onPress={() => setMoreActionsVisible(false)}
                    >
                      <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.quickActionsModalBody}
                  >
                    {groupedQuickActionsForModal.map((group) => (
                      <View key={group.category} style={styles.quickActionsCategorySection}>
                        <View style={styles.quickActionsCategoryCard}>
                          <View style={styles.quickActionsCategoryHeader}>
                            <View
                              style={[
                                styles.quickActionsCategoryDot,
                                { backgroundColor: group.items[0]?.color || theme.colors.primary },
                              ]}
                            />
                            <Text style={styles.quickActionsCategoryTitle}>{group.category}</Text>
                          </View>

                          <ScrollView
                            horizontal
                            nestedScrollEnabled
                            directionalLockEnabled
                            keyboardShouldPersistTaps="handled"
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.quickActionsCategoryRow}
                          >
                            {group.items.map((action, index) => {
                              const hasAccess = hasQuickActionAccess(action);
                              const isLastItem = index === group.items.length - 1;

                              return (
                                <Button
                                  key={`more-${group.category}-${action.id}`}
                                  style={[
                                    styles.actionCard,
                                    styles.quickActionsCategoryAction,
                                    isLastItem && styles.quickActionsCategoryActionLast,
                                    quickActionCardStyle,
                                    !hasAccess && styles.actionCardRestricted,
                                  ]}
                                  delayPressIn={100}
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
                                  <View style={[styles.actionIcon, quickActionIconStyle, { backgroundColor: action.color + '20' }]}>
                                    <Ionicons name={action.icon} size={20} color={action.color} />
                                  </View>
                                  <Text style={[styles.actionTitle, quickActionTitleStyle]}>{action.title}</Text>
                                </Button>
                              );
                            })}
                          </ScrollView>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </Pressable>
          </Modal>
        )}

        <PermissionBlockedModal
          visible={permissionModal.visible}
          onClose={() => setPermissionModal({ visible: false, actionTitle: '' })}
          actionTitle={permissionModal.actionTitle}
        />

        <Modal
          transparent
          visible={logoutModalVisible}
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          presentationStyle="overFullScreen"
          onRequestClose={() => setLogoutModalVisible(false)}
        >
          <Pressable
            style={styles.logoutModalBackdrop}
            onPress={() => setLogoutModalVisible(false)}
          >
            <Pressable style={styles.logoutModalCard} onPress={() => { }}>
              <View style={styles.logoutModalIconWrap}>
                <Ionicons name="log-out-outline" size={22} color="#B91C1C" />
              </View>

              <Text style={styles.logoutModalTitle}>Logout</Text>
              <Text style={styles.logoutModalMessage}>
                Are you sure you want to logout?
              </Text>

              <View style={styles.logoutModalActions}>
                <TouchableOpacity
                  style={styles.logoutModalCancelButton}
                  onPress={() => setLogoutModalVisible(false)}
                >
                  <Text style={styles.logoutModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.logoutModalConfirmButton}
                  onPress={handleLogoutConfirm}
                >
                  <Text style={styles.logoutModalConfirmText}>Logout</Text>
                </TouchableOpacity>
              </View>
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
                const palette = getActivityColorMap(theme.isDark)[colorKey] || getActivityColorMap(theme.isDark).gray;
                const iconName = activityIconMap[activity.type] || activityIconMap.default;
                const statusStyle = resolveStatusBadgeStyle(activity, theme.isDark);
                return (
                  <TouchableOpacity
                    key={`${activity.action}-${index}`}
                    activeOpacity={0.7}
                    onPress={() => handleActivityPress(activity)}
                    style={[styles.activityItem, { borderBottomColor: theme.colors.border }]}
                  >
                    <View style={[styles.activityIcon, { backgroundColor: palette.bg }]}>
                      <Ionicons name={iconName} size={20} color={palette.fg} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={[styles.activityTitle, { color: theme.colors.text }]}>{activity.action}</Text>
                      <Text style={[styles.activitySubtitle, { color: theme.colors.textSecondary }]}>{activity.description}</Text>
                      <Text style={[styles.activityTimestamp, { color: theme.colors.textTertiary }]}>{formatRelativeTime(activity.timestamp)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusStyle.fg }]}>
                        {activity.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
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
                const urgency = getUrgencyColorMap(theme.isDark)[checkout.urgency] || getUrgencyColorMap(theme.isDark).low;
                return (
                  <View
                    key={checkout.id}
                    style={[styles.listItem, { borderColor: urgency.border, backgroundColor: urgency.bg, borderWidth: 1 }]}
                  >
                    <View style={styles.listContent}>
                      <Text style={[styles.listTitle, { color: theme.colors.text }]}>{checkout.tenantName}</Text>
                      <Text style={[styles.listSubtitle, { color: theme.colors.textSecondary }]}>{checkout.propertyTitle} • Room {checkout.roomNumber}</Text>
                      <Text style={[styles.listMeta, { color: theme.colors.textTertiary }]}>{checkout.endDate}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
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
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Vacating Soon</Text>
            <Text style={[styles.sectionHelper, { color: theme.colors.textSecondary }]}>{vacatingSoon.length} noticed</Text>
          </View>
          <View style={styles.cardContainer}>
            {vacatingSoon.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-done-outline" size={36} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>No move-out notices</Text>
              </View>
            ) : (
              vacatingSoon.slice(0, 5).map((tenant) => {
                const urgency = getUrgencyColorMap(theme.isDark)[tenant.urgency] || getUrgencyColorMap(theme.isDark).low;
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
                    style={[styles.listItem, { borderColor: urgency.border, backgroundColor: urgency.bg, borderWidth: 1 }]}
                  >
                    <View style={styles.listContent}>
                      <Text style={[styles.listTitle, { color: theme.colors.text }]}>{tenant.tenantName}</Text>
                      <Text style={[styles.listSubtitle, { color: theme.colors.textSecondary }]}>{tenant.propertyTitle} • Room {tenant.roomNumber}</Text>
                      <Text style={[styles.listMeta, { color: theme.colors.textTertiary }]}>Move-out {tenant.endDate}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
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
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Billing Health</Text>
              <Text style={[styles.sectionHelper, { color: theme.colors.error }]}>{billingHealth.overdueInvoicesCount || 0} overdue</Text>
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
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.isDark ? '#92400E' : '#FCD34D',
                    backgroundColor: theme.isDark ? 'rgba(146,64,14,0.1)' : '#FFFBEB'
                  }}
                >
                  <Text style={{ fontSize: 11, color: theme.isDark ? '#fbbf24' : '#92400E', fontWeight: '700' }}>Due This Week</Text>
                  <Text style={{ fontSize: 20, color: theme.isDark ? '#fbbf24' : '#92400E', fontWeight: '800', marginTop: 4 }}>{billingHealth.dueForBillingCount || 0}</Text>
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
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.isDark ? '#991B1B' : '#FCA5A5',
                    backgroundColor: theme.isDark ? 'rgba(153,27,27,0.1)' : '#FEF2F2'
                  }}
                >
                  <Text style={{ fontSize: 11, color: theme.isDark ? '#f87171' : '#991B1B', fontWeight: '700' }}>Overdue Invoices</Text>
                  <Text style={{ fontSize: 20, color: theme.isDark ? '#f87171' : '#991B1B', fontWeight: '800', marginTop: 4 }}>{billingHealth.overdueInvoicesCount || 0}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ paddingHorizontal: 4 }}>
                <Text style={[styles.listMeta, { color: theme.colors.textSecondary }]}>Overdue Amount: ₱{Number(billingHealth.overdueInvoicesAmount || 0).toLocaleString()}</Text>
                <Text style={[styles.listMeta, { color: theme.colors.textSecondary }]}>Due Soon Amount: ₱{Number(billingHealth.dueSoonInvoicesAmount || 0).toLocaleString()}</Text>
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
                  style={[
                    styles.listItem,
                    {
                      borderColor: theme.isDark ? '#991B1B' : '#FCA5A5',
                      backgroundColor: theme.isDark ? 'rgba(153,27,27,0.1)' : '#FEF2F2',
                      borderWidth: 1
                    }
                  ]}
                >
                  <View style={styles.listContent}>
                    <Text style={[styles.listTitle, { color: theme.colors.text }]}>{invoice.tenantName}</Text>
                    <Text style={[styles.listSubtitle, { color: theme.colors.textSecondary }]}>{invoice.propertyTitle} • Room {invoice.roomNumber}</Text>
                    <Text style={[styles.listMeta, { color: theme.isDark ? '#f87171' : '#991B1B' }]}>Due {invoice.dueDate}</Text>
                  </View>
                  <Text style={[styles.listAmount, { color: theme.colors.text }]}>₱{Number(invoice.amount || 0).toLocaleString()}</Text>
                </TouchableOpacity>
              ))}

              {(billingHealth.overdueInvoices || []).length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={36} color={theme.colors.success} />
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>No overdue invoices</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Unpaid Bookings */}
        {!isCaretaker && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Unpaid Bookings</Text>
              <Text style={[styles.sectionHelper, { color: theme.colors.textSecondary }]}>{unpaidBookings.length} pending</Text>
            </View>
            <View style={styles.cardContainer}>
              {unpaidBookings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={36} color={theme.colors.success} />
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>All payments are up to date</Text>
                </View>
              ) : (
                unpaidBookings.slice(0, 5).map((booking) => (
                  <View
                    key={booking.id}
                    style={[
                      styles.listItem,
                      {
                        borderColor: theme.isDark ? '#991B1B' : '#F87171',
                        backgroundColor: theme.isDark ? 'rgba(153,27,27,0.1)' : '#FEF2F2',
                        borderWidth: 1
                      }
                    ]}
                  >
                    <View style={styles.listContent}>
                      <Text style={[styles.listTitle, { color: theme.colors.text }]}>{booking.tenantName}</Text>
                      <Text style={[styles.listSubtitle, { color: theme.colors.textSecondary }]}>{booking.propertyTitle} • Room {booking.roomNumber}</Text>
                      <Text style={[styles.listMeta, { color: theme.isDark ? '#f87171' : '#B91C1C' }]}>{booking.paymentStatus}</Text>
                    </View>
                    <Text style={[styles.listAmount, { color: theme.colors.text }]}>₱{booking.amount.toLocaleString()}</Text>
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

