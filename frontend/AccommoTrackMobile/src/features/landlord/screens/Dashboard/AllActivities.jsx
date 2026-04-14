import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getStyles } from '../../../../styles/Landlord/AllActivities.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import LandlordDashboardService from '../../../../services/LandlordDashboardService.js';
import {
  landlordQueryKeys,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';

const EMPTY_LIST = [];

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

export default function AllActivities({ navigation, route }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const routeActivities = Array.isArray(route.params?.activities) ? route.params.activities : EMPTY_LIST;
  const isCaretaker = route.params?.isCaretaker === true;
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const dashboardQuery = useQuery({
    queryKey: landlordQueryKeys.dashboardBundle(),
    queryFn: async () => {
      const response = await LandlordDashboardService.fetchDashboard({
        includeRevenueChart: !isCaretaker,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to load activities');
      }

      return response.data || {};
    },
    placeholderData: (previousData) => previousData ?? { activities: routeActivities },
  });

  const activities = Array.isArray(dashboardQuery.data?.activities)
    ? dashboardQuery.data.activities
    : routeActivities;
  const loading = dashboardQuery.isPending && activities.length === 0;
  const refetchActivities = dashboardQuery.refetch;
  const activityRefetchers = React.useMemo(
    () => [refetchActivities],
    [refetchActivities],
  );

  useLandlordFocusRefetch({ refetchers: activityRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: activityRefetchers,
  });

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'booking', label: 'Bookings' },
    { id: 'room', label: 'Rooms' },
    { id: 'payment', label: 'Payments' }
  ];

  const filteredActivities = useMemo(() => {
    let result = activities;

    // Apply type filter
    if (activeFilter !== 'all') {
      result = result.filter(activity => activity.type === activeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(activity => 
        activity.action?.toLowerCase().includes(query) ||
        activity.description?.toLowerCase().includes(query) ||
        activity.status?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [activities, searchQuery, activeFilter]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleActivityPress = useCallback((activity) => {
    if (!activity) return;

    const type = String(activity.type || '').toLowerCase();
    const entityId = activity.id;
    const description = activity.description || '';

    // Extract tenant name from description if available
    const tenantNameMatch = description.match(/^([^\s]+(?:\s+[^\s]+)?)/); 
    const tenantName = tenantNameMatch ? tenantNameMatch[1] : '';

    switch (type) {
      case 'booking': {
        const params = {
          searchQuery: tenantName,
          focusBookingId: entityId || null,
          drilldownToken: Date.now(),
        };
        const status = String(activity.status || '').toLowerCase();
        if (status) {
          params.filter = status;
        }
        navigation.navigate('Bookings', params);
        break;
      }
      case 'payment': {
        const params = {
          searchQuery: tenantName,
          focusInvoiceId: entityId || null,
          drilldownToken: Date.now(),
        };
        const status = String(activity.status || '').toLowerCase();
        if (status === 'overdue') params.filter = 'overdue';
        else if (status === 'paid' || status === 'confirmed') params.filter = 'paid';
        else params.filter = 'pending';
        navigation.navigate('Payments', params);
        break;
      }
      case 'room': {
        const params = {};
        if (entityId) params.focusRoomId = entityId;
        navigation.navigate('RoomManagement', params);
        break;
      }
      case 'property': {
        const params = {};
        if (entityId) params.focusPropertyId = entityId;
        navigation.navigate('Properties', params);
        break;
      }
      case 'maintenance': {
        const params = {};
        if (entityId) params.focusRequestId = entityId;
        navigation.navigate('MaintenanceRequests', params);
        break;
      }
      default:
        break;
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Activities</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search activities..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterTab,
                activeFilter === filter.id && styles.filterTabActive
              ]}
              onPress={() => setActiveFilter(filter.id)}
            >
              <Text style={[
                styles.filterTabText,
                activeFilter === filter.id && styles.filterTabTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
        </Text>
      </View>

      {/* Activities List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading activities...</Text>
          </View>
        ) : filteredActivities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons 
              name={searchQuery ? "search-outline" : "alert-circle-outline"} 
              size={48} 
              color="#9CA3AF" 
            />
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'No results found' : 'No activities'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? `No activities match "${searchQuery}"`
                : 'Your activity feed will appear here'
              }
            </Text>
            {searchQuery && (
              <TouchableOpacity style={styles.clearSearchButton} onPress={clearSearch}>
                <Text style={styles.clearSearchText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.activityList}>
            {filteredActivities.map((activity, index) => {
              const colorKey = resolveActivityColorKey(activity);
              const palette = activityColorMap[colorKey] || activityColorMap.gray;
              const iconName = activityIconMap[activity.type] || activityIconMap.default;
              const statusStyle = resolveStatusBadgeStyle(activity);
              
              return (
                <TouchableOpacity
                  key={`${activity.action}-${index}`}
                  activeOpacity={0.7}
                  onPress={() => handleActivityPress(activity)}
                  style={styles.activityItem}
                >
                  <View style={[styles.activityIcon, { backgroundColor: palette.bg }]}>
                    <Ionicons name={iconName} size={22} color={palette.fg} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.action}</Text>
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                    <Text style={styles.activityTimestamp}>{formatRelativeTime(activity.timestamp)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle.fg }]}>
                      {activity.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
