import React, { useState, useMemo } from 'react';
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
  confirmed: { bg: '#DCFCE7', fg: '#166534' },
  available: { bg: '#DCFCE7', fg: '#166534' },
  occupied: { bg: '#DBEAFE', fg: '#1D4ED8' },
  cancelled: { bg: '#FEE2E2', fg: '#991B1B' }
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
              const palette = activityColorMap[activity.color] || activityColorMap.gray;
              const iconName = activityIconMap[activity.type] || activityIconMap.default;
              const statusStyle = statusBadgeMap[activity.status] || { bg: '#E5E7EB', fg: '#374151' };
              
              return (
                <View key={`${activity.action}-${index}`} style={styles.activityItem}>
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
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
