import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  FlatList,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import LandlordDashboardService from '../../../../services/LandlordDashboardService.js';
import { getStyles } from '../../../../styles/Landlord/PropertyActivityLogs.js';
import {
  landlordQueryKeys,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';

const FILTERS = ['All', 'Dorm Settings', 'Room Management', 'Payments', 'Due'];
const EMPTY_LOGS = [];

export default function PropertyActivityLogs({ route, navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { propertyId, propertyTitle } = route.params || {};

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const logsQuery = useQuery({
    queryKey: landlordQueryKeys.propertyActivityLogs(propertyId),
    enabled: Boolean(propertyId),
    queryFn: async () => {
      const response = await LandlordDashboardService.fetchPropertyActivities(propertyId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch activities');
      }

      return Array.isArray(response.data) ? response.data : [];
    },
  });

  const logs = useMemo(
    () => (Array.isArray(logsQuery.data) ? logsQuery.data : EMPTY_LOGS),
    [logsQuery.data],
  );
  const refetchLogs = logsQuery.refetch;
  const activityLogsRefetchers = React.useMemo(
    () => [refetchLogs],
    [refetchLogs],
  );

  useLandlordFocusRefetch({
    enabled: Boolean(propertyId),
    refetchers: activityLogsRefetchers,
  });

  const handleRefresh = useLandlordRefreshHandler({
    enabled: Boolean(propertyId),
    setRefreshing,
    refetchers: activityLogsRefetchers,
  });

  const filteredLogs = useMemo(() => {
    let list = [...logs];

    // Sorting by date descending (newest first)
    list.sort((a, b) => {
      const ta = new Date(a.created_at || a.time || a.timestamp || 0).getTime();
      const tb = new Date(b.created_at || b.time || b.timestamp || 0).getTime();
      return tb - ta;
    });

    if (activeFilter === 'All') return list;

    return list.filter(log => {
      const type = (log.type || '').toLowerCase();
      const title = (log.title || log.action || '').toLowerCase();
      const desc = (log.description || log.details || '').toLowerCase();

      if (activeFilter === 'Dorm Settings') {
        return type.includes('property') || title.includes('setting') || title.includes('profile');
      }
      if (activeFilter === 'Room Management') {
        return type.includes('room') || title.includes('room') || title.includes('occupy') || title.includes('added') || title.includes('removed');
      }
      if (activeFilter === 'Payments') {
        return type.includes('payment') || title.includes('payment') || title.includes('paid') || title.includes('invoice');
      }
      if (activeFilter === 'Due') {
        return title.includes('due') || !!log.due_date || type.includes('due') || desc.includes('due');
      }
      return true;
    });
  }, [logs, activeFilter]);

  const renderLogItem = ({ item }) => (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
        <Text style={styles.logTitle}>{item.title || item.action || item.type || 'Activity'}</Text>
        {(item.amount || item.amount_cents) ? (
          <Text style={styles.logAmount}>
            {item.amount ? item.amount : `₱${(Number(item.amount_cents || 0) / 100).toLocaleString()}`}
          </Text>
        ) : null}
      </View>
      
      <View style={styles.logMeta}>
        <Ionicons name="person-circle-outline" size={14} color="#6B7280" />
        <Text style={styles.logUser}>{item.by || item.user || item.actor || 'System'}</Text>
        <Text style={{ color: '#E5E7EB' }}>•</Text>
        <Text style={styles.logDate}>{item.created_at || item.time || ''}</Text>
      </View>

      {item.details || item.description ? (
        <Text style={styles.logDetails}>{item.details || item.description}</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Logs</Text>
      </View>

      {/* Property Info */}
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyTitle}>{propertyTitle || 'Property Activity'}</Text>
        <Text style={styles.propertySubtitle}>Logs are ordered by time (newest first)</Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.activeFilterChip]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredLogs}
        renderItem={renderLogItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#059669']}
          />
        }
        ListEmptyComponent={
          logsQuery.isPending ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={styles.emptySubtitle}>Loading activity logs...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No activity found</Text>
              <Text style={styles.emptySubtitle}>There are no logs matching the selected filter for this property.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
