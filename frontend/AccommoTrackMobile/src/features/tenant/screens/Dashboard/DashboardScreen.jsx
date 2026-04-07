import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tenantService from '../../../../services/TenantService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { DashboardStatSkeleton } from '../../../../components/Skeletons/index.jsx';
import { showError } from '../../../../utils/toast.js';
import { getStyles } from '../../../../styles/Tenant/DashboardScreen.js';
import {
  tenantQueryKeys,
  useTenantFocusRefetch,
  useTenantRefreshHandler,
} from '../../hooks/useTenantQueryHelpers.js';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const pesoFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const formatCurrency = (amount) => `₱${pesoFormatter.format(Number(amount || 0))}`;

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const resolveStays = (stayData) => {
  const direct = safeArray(stayData?.stays);
  if (direct.length > 0) {
    return direct;
  }

  return safeArray(stayData?.data?.stays);
};

const getNumeric = (...values) => {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return 0;
};

const estimateColumnWidth = (values, { min = 64, max = 220, charWidth = 7 } = {}) => {
  const longest = values.reduce(
    (maxLength, value) => Math.max(maxLength, String(value ?? '').length),
    0,
  );

  return Math.min(max, Math.max(min, Math.round(longest * charWidth) + 24));
};

const toTitleCaseWords = (value) => String(value || 'unknown')
  .toLowerCase()
  .replace(/_/g, ' ')
  .split(' ')
  .filter(Boolean)
  .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
  .join(' ');

const getPaymentStatusPalette = (status, theme) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized.includes('overdue') || normalized.includes('failed')) {
    return { bg: theme.colors.errorLight, fg: theme.colors.errorDark || theme.colors.error };
  }

  if (normalized.includes('partial') || normalized.includes('pending') || normalized.includes('unpaid')) {
    return { bg: theme.colors.warningLight, fg: theme.colors.warningDark || theme.colors.warning };
  }

  if (normalized.includes('paid') || normalized.includes('success')) {
    return { bg: theme.colors.successLight, fg: theme.colors.successDark || theme.colors.success };
  }

  return { bg: theme.colors.backgroundSecondary, fg: theme.colors.textSecondary };
};

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [expandedPanel, setExpandedPanel] = useState(null);

  // Guard: Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isGuest = await AsyncStorage.getItem('isGuest');
        const userString = await AsyncStorage.getItem('user');
        
        if (isGuest === 'true' || !userString) {
          navigation.replace('TenantHome');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
        navigation.replace('TenantHome');
      }
    };
    
    checkAuth();
  }, [navigation]);

  useEffect(() => {
    const loadUserName = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          const user = JSON.parse(userString);
          setUserName(user.first_name || user.name || 'Tenant');
        }
      } catch (error) {
        setUserName('Tenant');
      }
    };

    loadUserName();
  }, []);

  const currentStayQuery = useQuery({
    queryKey: tenantQueryKeys.dashboardCurrentStay(),
    queryFn: async () => {
      const response = await tenantService.getCurrentStay();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load stay data');
      }
      return response.data;
    },
    retry: false,
    onError: (error) => {
      console.error('Current stay error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigation.replace('TenantHome');
      }
    },
  });

  const statsQuery = useQuery({
    queryKey: tenantQueryKeys.dashboardStats(),
    queryFn: async () => {
      const response = await tenantService.getDashboardStats();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load dashboard stats');
      }
      return response.data;
    },
    retry: false,
    enabled: !currentStayQuery.isError,
  });

  const activitiesQuery = useQuery({
    queryKey: tenantQueryKeys.dashboardActivities(),
    queryFn: async () => {
      const response = await tenantService.getDashboardActivities();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load activities');
      }
      return safeArray(response.data);
    },
    staleTime: 30 * 1000,
    retry: false,
    enabled: !currentStayQuery.isError,
  });

  const upcomingQuery = useQuery({
    queryKey: tenantQueryKeys.dashboardUpcoming(),
    queryFn: async () => {
      const response = await tenantService.getDashboardUpcoming();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load upcoming details');
      }
      return response.data || {};
    },
    staleTime: 30 * 1000,
    retry: false,
    enabled: !currentStayQuery.isError,
  });

  const breakdownQuery = useQuery({
    queryKey: tenantQueryKeys.dashboardPaymentBreakdown(6),
    queryFn: async () => {
      const response = await tenantService.getPaymentBreakdown(6);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load payment breakdown');
      }
      return response.data || { upcoming_months: [] };
    },
    staleTime: 60 * 1000,
    retry: false,
    enabled: !currentStayQuery.isError,
  });

  const dashboardRefetchers = useMemo(
    () => [
      currentStayQuery.refetch,
      statsQuery.refetch,
      activitiesQuery.refetch,
      upcomingQuery.refetch,
      breakdownQuery.refetch,
    ],
    [
      currentStayQuery.refetch,
      statsQuery.refetch,
      activitiesQuery.refetch,
      upcomingQuery.refetch,
      breakdownQuery.refetch,
    ],
  );

  useTenantFocusRefetch({ refetchers: dashboardRefetchers });

  const onRefresh = useTenantRefreshHandler({
    setRefreshing,
    refetchers: dashboardRefetchers,
  });

  const loading = currentStayQuery.isLoading || statsQuery.isLoading;
  const stayData = currentStayQuery.data || {};
  const stats = statsQuery.data || {};
  const activities = safeArray(activitiesQuery.data).slice(0, 5);
  const upcoming = upcomingQuery.data || {};

  const stays = resolveStays(stayData);
  const primaryStay = stays[0] || null;

  const totalDaysStayed = stays.reduce(
    (sum, stay) => sum + getNumeric(stay?.booking?.daysStayed, stay?.booking?.days_stayed),
    0,
  );

  const monthlyRentTotal = stays.reduce((sum, stay) => {
    const base = getNumeric(stay?.booking?.monthlyRent, stay?.booking?.monthly_rent);
    const addons = getNumeric(stay?.addons?.monthlyTotal, stay?.addons?.monthly_total);
    return sum + base + addons;
  }, 0);

  const paymentData = stats?.payments || {};
  const balanceDue = getNumeric(
    paymentData.pendingAmount,
    paymentData.pending_amount,
    paymentData.totalDue,
    paymentData.total_due,
    paymentData.monthlyDue,
    paymentData.monthly_due,
  );

  const hasOverdueInvoices = Boolean(paymentData.hasOverdueInvoices || paymentData.has_overdue_invoices);

  const activeRooms = stays.map((stay) => {
    const booking = stay?.booking || {};
    const room = stay?.room || {};
    const property = stay?.property || {};

    return {
      id: booking.id || `${property.id || 'p'}-${room.id || 'r'}`,
      roomNumber: room.roomNumber || room.room_number || 'N/A',
      roomType: room.roomType || room.room_type || 'Room',
      floor: room.floor || room.floor_level || 'N/A',
      propertyTitle: property.title || property.property_name || 'Property',
      moveIn: booking.startDate || booking.start_date,
      status: booking.paymentStatus || booking.payment_status || 'unknown',
      monthlyTotal: getNumeric(booking.monthlyRent, booking.monthly_rent) + getNumeric(stay?.addons?.monthlyTotal, stay?.addons?.monthly_total),
      daysStayed: getNumeric(booking.daysStayed, booking.days_stayed),
      daysRemaining: getNumeric(booking.daysRemaining, booking.days_remaining),
    };
  });

  const unpaidInvoices = stays
    .flatMap((stay) => safeArray(stay?.financials?.invoices))
    .filter((invoice) => ['pending', 'partial', 'overdue', 'unpaid'].includes(String(invoice?.status || '').toLowerCase()))
    .slice(0, 8)
    .map((invoice) => ({
      id: invoice.id,
      amount: getNumeric(invoice.amount),
      date: invoice.date,
      dueDate: invoice.dueDate,
      status: String(invoice.status || '').toLowerCase(),
      description: invoice.description || 'Outstanding invoice',
    }));

  const tableColumnWidths = useMemo(() => {
    const roomColumn = estimateColumnWidth(
      ['Room', ...activeRooms.map((room) => `#${room.roomNumber}`)],
      { min: 68, max: 110 },
    );

    const propertyColumn = estimateColumnWidth(
      ['Property', ...activeRooms.map((room) => room.propertyTitle)],
      { min: 120, max: 260 },
    );

    const floorColumn = estimateColumnWidth(
      ['Floor', ...activeRooms.map((room) => room.floor)],
      { min: 66, max: 96 },
    );

    const dateColumn = estimateColumnWidth(
      ['Move-in', ...activeRooms.map((room) => formatDate(room.moveIn))],
      { min: 102, max: 136 },
    );

    const roomStatusColumn = estimateColumnWidth(
      ['Status', ...activeRooms.map((room) => toTitleCaseWords(room.status))],
      { min: 84, max: 150, charWidth: 6.6 },
    );

    const rentPropertyColumn = estimateColumnWidth(
      ['Property', ...stays.map((stay) => stay?.property?.title || 'Property')],
      { min: 120, max: 260 },
    );

    const rentRoomColumn = estimateColumnWidth(
      ['Room', ...stays.map((stay) => `#${stay?.room?.roomNumber || stay?.room?.room_number || 'N/A'}`)],
      { min: 68, max: 110 },
    );

    const baseRentValues = stays.map((stay) => {
      const booking = stay?.booking || {};
      return formatCurrency(getNumeric(booking.monthlyRent, booking.monthly_rent));
    });

    const addOnValues = stays.map((stay) => formatCurrency(getNumeric(stay?.addons?.monthlyTotal, stay?.addons?.monthly_total)));

    const totalValues = stays.map((stay) => {
      const booking = stay?.booking || {};
      const base = getNumeric(booking.monthlyRent, booking.monthly_rent);
      const addons = getNumeric(stay?.addons?.monthlyTotal, stay?.addons?.monthly_total);
      return formatCurrency(base + addons);
    });

    const baseRentColumn = estimateColumnWidth(
      ['Base Rent', ...baseRentValues],
      { min: 82, max: 132 },
    );

    const addOnColumn = estimateColumnWidth(
      ['Add-ons', ...addOnValues],
      { min: 76, max: 124 },
    );

    const monthlyTotalColumn = estimateColumnWidth(
      ['Monthly Total', ...totalValues],
      { min: 96, max: 150 },
    );

    const monthlyDueValues = activeRooms.map((room) => formatCurrency(room.monthlyTotal));
    const monthlyDueColumn = estimateColumnWidth(
      ['Monthly Due', ...monthlyDueValues],
      { min: 96, max: 150 },
    );

    const balanceStatusColumn = estimateColumnWidth(
      ['Status', ...activeRooms.map((room) => toTitleCaseWords(room.status))],
      { min: 84, max: 150, charWidth: 6.6 },
    );

    return {
      rooms: {
        room: roomColumn,
        property: propertyColumn,
        floor: floorColumn,
        date: dateColumn,
        status: roomStatusColumn,
      },
      rent: {
        property: rentPropertyColumn,
        room: rentRoomColumn,
        baseRent: baseRentColumn,
        addOns: addOnColumn,
        total: monthlyTotalColumn,
      },
      balance: {
        room: roomColumn,
        property: propertyColumn,
        money: monthlyDueColumn,
        status: balanceStatusColumn,
      },
    };
  }, [activeRooms, stays]);

  const daysTotal = Math.max(1, activeRooms.reduce((sum, room) => sum + room.daysStayed, 0));

  const upcomingMonths = safeArray(breakdownQuery.data?.upcoming_months);
  const scheduleTimeline = upcomingMonths.length > 0
    ? upcomingMonths
    : safeArray(upcoming?.unpaidBookings).slice(0, 4).map((item) => ({
        month: new Date(item?.dueDate || item?.due_date || Date.now()).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
        due_date: item?.dueDate || item?.due_date,
        month_total: getNumeric(item?.amount),
        bookings: [
          {
            booking_id: item?.id,
            room_number: item?.roomNumber || item?.room_number || 'N/A',
            total: getNumeric(item?.amount),
            status: item?.paymentStatus || item?.payment_status || 'pending',
          },
        ],
      }));

  const togglePanel = (panel) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPanel((current) => (current === panel ? null : panel));
  };

  const renderStatCard = ({ key, icon, title, value, subtitle, bgColor, iconColor }) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.statCard,
        expandedPanel === key && styles.statCardActive,
        { backgroundColor: bgColor },
      ]}
      onPress={() => togglePanel(key)}
    >
      <View style={[styles.statIcon, { backgroundColor: iconColor }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <Text numberOfLines={1} style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
      <Text numberOfLines={1} style={styles.statSubLabel}>{subtitle}</Text>
    </TouchableOpacity>
  );

  const renderPanel = (panel) => {
    if (expandedPanel !== panel) {
      return null;
    }

    if (panel === 'rooms') {
      return (
        <View style={styles.panelBody}>
          {activeRooms.length === 0 ? <Text style={styles.panelEmpty}>No active rooms.</Text> : (
            <View style={styles.tableWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableContentContainer}>
                <View style={styles.tableMinWidth}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.rooms.room }]}>Room</Text>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.rooms.property }]}>Property</Text>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.rooms.floor }]}>Floor</Text>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.rooms.date }]}>Move-in</Text>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.rooms.status }, styles.tableHeaderCellLast]}>Status</Text>
                  </View>

                  {activeRooms.map((room) => {
                    const palette = getPaymentStatusPalette(room.status, theme);
                    return (
                      <View key={room.id} style={styles.tableDataRow}>
                        <Text style={[styles.tableCellText, { width: tableColumnWidths.rooms.room }]}>#{room.roomNumber}</Text>
                        <Text style={[styles.tableCellText, { width: tableColumnWidths.rooms.property }]} numberOfLines={1}>{room.propertyTitle}</Text>
                        <Text style={[styles.tableCellText, { width: tableColumnWidths.rooms.floor }]}>{room.floor}</Text>
                        <Text style={[styles.tableCellText, { width: tableColumnWidths.rooms.date }]}>{formatDate(room.moveIn)}</Text>
                        <View style={[styles.tableCellLast, { width: tableColumnWidths.rooms.status }]}>
                          <View style={[styles.statusBadgeInline, { backgroundColor: palette.bg }]}> 
                            <Text style={[styles.statusBadgeInlineText, { color: palette.fg }]}>{toTitleCaseWords(room.status)}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      );
    }

    if (panel === 'days') {
      return (
        <View style={styles.panelBody}>
          {activeRooms.length === 0 ? <Text style={styles.panelEmpty}>No stay duration yet.</Text> : activeRooms.map((room) => {
            const share = Math.round((room.daysStayed / daysTotal) * 100);
            return (
              <View key={`days-${room.id}`} style={styles.panelRow}>
                <View style={styles.progressHeader}>
                  <Text style={styles.panelPrimary}>Room {room.roomNumber}</Text>
                  <Text style={styles.panelPrimary}>{room.daysStayed} days</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.max(6, share)}%` }]} />
                </View>
                <Text style={styles.panelTertiary}>{share}% of total stay time</Text>
              </View>
            );
          })}
        </View>
      );
    }

    if (panel === 'rent') {
      return (
        <View style={styles.panelBody}>
          {stays.length === 0 ? <Text style={styles.panelEmpty}>No rent records.</Text> : (
            <View style={styles.tableWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableContentContainer}>
                <View style={styles.tableMinWidth}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.rent.property }]}>Property</Text>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.rent.room }]}>Room</Text>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.rent.baseRent }]}>Base Rent</Text>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.rent.addOns }]}>Add-ons</Text>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.rent.total }, styles.tableHeaderCellLast]}>Monthly Total</Text>
                  </View>

                  {stays.map((stay, index) => {
                    const booking = stay?.booking || {};
                    const baseRent = getNumeric(booking.monthlyRent, booking.monthly_rent);
                    const addons = getNumeric(stay?.addons?.monthlyTotal, stay?.addons?.monthly_total);
                    const total = baseRent + addons;

                    return (
                      <View key={`rent-${booking.id || index}`} style={styles.tableDataRow}>
                        <Text style={[styles.tableCellText, { width: tableColumnWidths.rent.property }]} numberOfLines={1}>{stay?.property?.title || 'Property'}</Text>
                        <Text style={[styles.tableCellText, { width: tableColumnWidths.rent.room }]}>#{stay?.room?.roomNumber || stay?.room?.room_number || 'N/A'}</Text>
                        <Text style={[styles.tableCellText, { width: tableColumnWidths.rent.baseRent }]}>{formatCurrency(baseRent)}</Text>
                        <Text style={[styles.tableCellText, { width: tableColumnWidths.rent.addOns }]}>{formatCurrency(addons)}</Text>
                        <Text style={[styles.tableCellText, { width: tableColumnWidths.rent.total }, styles.tableCellLast]}>{formatCurrency(total)}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.panelBody}>
        {activeRooms.length === 0 ? <Text style={styles.panelEmpty}>No payment records for active rooms.</Text> : (
          <View style={styles.tableWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableContentContainer}>
              <View style={styles.tableMinWidth}>
                <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.balance.room }]}>Room</Text>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.balance.property }]}>Property</Text>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.balance.money }]}>Monthly Due</Text>
                    <Text style={[styles.tableHeaderCell, { width: tableColumnWidths.balance.status }, styles.tableHeaderCellLast]}>Status</Text>
                </View>

                {activeRooms.map((room) => {
                  const palette = getPaymentStatusPalette(room.status, theme);
                  return (
                    <View key={`payment-${room.id}`} style={styles.tableDataRow}>
                      <Text style={[styles.tableCellText, { width: tableColumnWidths.balance.room }]}>#{room.roomNumber}</Text>
                      <Text style={[styles.tableCellText, { width: tableColumnWidths.balance.property }]} numberOfLines={1}>{room.propertyTitle}</Text>
                      <Text style={[styles.tableCellText, { width: tableColumnWidths.balance.money }]}>{formatCurrency(room.monthlyTotal)}</Text>
                      <View style={[styles.tableCellLast, { width: tableColumnWidths.balance.status }]}>
                        <View style={[styles.statusBadgeInline, { backgroundColor: palette.bg }]}> 
                          <Text style={[styles.statusBadgeInlineText, { color: palette.fg }]}>{toTitleCaseWords(room.status)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {unpaidInvoices.length > 0 && (
          <Text style={styles.tableCaption}>
            Outstanding invoices: {unpaidInvoices.length} item(s) pending/overdue.
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.loadingContent}>
          <DashboardStatSkeleton />
          <DashboardStatSkeleton />
          <DashboardStatSkeleton />
          <DashboardStatSkeleton />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dashboard Overview</Text>
            <Text style={styles.sectionHint}>Tap a card to view table details</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsGrid}
          >
            {renderStatCard({
              key: 'rooms',
              icon: 'bed-outline',
              title: 'Active Rooms',
              value: String(activeRooms.length),
              subtitle: activeRooms.length ? activeRooms[0].propertyTitle : 'No active stays',
              bgColor: theme.colors.primaryLight,
              iconColor: theme.colors.primary,
            })}
            {renderStatCard({
              key: 'days',
              icon: 'calendar-outline',
              title: 'Days Stayed',
              value: String(totalDaysStayed),
              subtitle: totalDaysStayed > 0 ? 'Across all stays' : 'No stay days yet',
              bgColor: theme.colors.infoLight,
              iconColor: theme.colors.info,
            })}
            {renderStatCard({
              key: 'rent',
              icon: 'cash-outline',
              title: 'Monthly Rent',
              value: formatCurrency(monthlyRentTotal),
              subtitle: activeRooms.length ? `${activeRooms.length} room(s) total` : 'No active rent',
              bgColor: theme.colors.purpleLight,
              iconColor: theme.colors.purple,
            })}
            {renderStatCard({
              key: 'balance',
              icon: 'wallet-outline',
              title: hasOverdueInvoices ? 'Balance Due' : 'Status',
              value: hasOverdueInvoices ? formatCurrency(balanceDue) : (balanceDue > 0 ? formatCurrency(balanceDue) : 'Fully Paid'),
              subtitle: hasOverdueInvoices ? 'Overdue detected' : 'Current billing state',
              bgColor: hasOverdueInvoices ? theme.colors.errorLight : theme.colors.warningLight,
              iconColor: hasOverdueInvoices ? theme.colors.error : theme.colors.warning,
            })}
          </ScrollView>

          {renderPanel('rooms')}
          {renderPanel('days')}
          {renderPanel('rent')}
          {renderPanel('balance')}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alerts</Text>
          </View>

          {hasOverdueInvoices ? (
            <View style={[styles.alertCard, { backgroundColor: theme.colors.errorLight, borderColor: theme.colors.error }]}> 
              <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
              <View style={styles.alertBody}>
                <Text style={[styles.alertTitle, { color: theme.colors.errorDark }]}>Action required: overdue balance</Text>
                <Text style={[styles.alertText, { color: theme.colors.errorDark }]}>Please settle overdue invoices to avoid penalties.</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Payments')}>
                <Text style={[styles.alertLink, { color: theme.colors.errorDark }]}>Pay now</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {safeArray(stayData?.pendingCheckIns).map((pending) => (
            <View
              key={`pending-${pending.id}`}
              style={[
                styles.alertCard,
                {
                  backgroundColor: pending.status === 'confirmed' ? theme.colors.errorLight : theme.colors.warningLight,
                  borderColor: pending.status === 'confirmed' ? theme.colors.error : theme.colors.warning,
                },
              ]}
            >
              <Ionicons
                name={pending.status === 'confirmed' ? 'time' : 'alert-circle-outline'}
                size={18}
                color={pending.status === 'confirmed' ? theme.colors.error : theme.colors.warning}
              />
              <View style={styles.alertBody}>
                <Text style={styles.alertTitle}>{pending.status === 'confirmed' ? 'Check-in overdue' : 'Check-in pending approval'}</Text>
                <Text style={styles.alertText}>
                  {pending.property} • Start {formatDate(pending.startDate)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('MyBookings')}>
                <Text style={styles.alertLink}>View</Text>
              </TouchableOpacity>
            </View>
          ))}

          {stayData?.upcomingBooking ? (
            <View style={[styles.alertCard, { backgroundColor: theme.colors.infoLight, borderColor: theme.colors.info }]}> 
              <Ionicons name="calendar" size={18} color={theme.colors.info} />
              <View style={styles.alertBody}>
                <Text style={styles.alertTitle}>Upcoming booking</Text>
                <Text style={styles.alertText}>
                  {stayData.upcomingBooking.property} • Starts {formatDate(stayData.upcomingBooking.startDate)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('MyBookings')}>
                <Text style={styles.alertLink}>Open</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!hasOverdueInvoices && safeArray(stayData?.pendingCheckIns).length === 0 && !stayData?.upcomingBooking ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No alerts right now.</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Rooms</Text>
          </View>

          {activeRooms.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No active stays yet.</Text>
              <TouchableOpacity style={styles.inlineButton} onPress={() => navigation.navigate('TenantHome')}>
                <Text style={styles.inlineButtonText}>Explore Properties</Text>
              </TouchableOpacity>
            </View>
          ) : activeRooms.map((room) => (
            <View key={`room-card-${room.id}`} style={styles.roomCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.roomTitle}>{room.propertyTitle}</Text>
                <Text style={styles.roomPrice}>{formatCurrency(room.monthlyTotal)}</Text>
              </View>
              <Text style={styles.roomMeta}>Room {room.roomNumber} • {room.roomType} • Floor {room.floor}</Text>
              <Text style={styles.roomMeta}>Move-in {formatDate(room.moveIn)} • {room.daysRemaining} days left</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          {activities.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyCardText}>No recent activity.</Text></View>
          ) : activities.map((activity) => (
            <View key={`activity-${activity.id}-${activity.timestamp}`} style={styles.activityRow}>
              <View style={styles.activityIconWrap}>
                <Ionicons name="time-outline" size={14} color={theme.colors.primary} />
              </View>
              <View style={styles.activityBody}>
                <Text style={styles.activityTitle}>{activity.action || 'Booking update'}</Text>
                <Text style={styles.activityText}>{activity.description || 'Recent status update'}</Text>
              </View>
              <Text style={styles.activityTime}>{formatDate(activity.timestamp)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Schedule</Text>
          </View>

          {scheduleTimeline.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyCardText}>No upcoming scheduled payments.</Text></View>
          ) : scheduleTimeline.map((month, monthIndex) => (
            <View key={`schedule-${month.month}-${monthIndex}`} style={styles.timelineCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.timelineMonth}>{month.month || 'Upcoming'}</Text>
                <Text style={styles.timelineAmount}>{formatCurrency(month.month_total)}</Text>
              </View>
              <Text style={styles.timelineDue}>Due {formatDate(month.due_date)}</Text>
              {safeArray(month.bookings).slice(0, 3).map((entry, idx) => (
                <View key={`entry-${entry.booking_id || idx}`} style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <Text style={styles.timelineText}>Room {entry.room_number} • {formatCurrency(entry.total)} • {entry.status}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
};

export default DashboardScreen;
