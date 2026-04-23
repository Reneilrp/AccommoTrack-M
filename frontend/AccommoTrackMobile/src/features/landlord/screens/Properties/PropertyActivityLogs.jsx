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
import { formatPrice } from '../../../../utils/price.js';

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

  const formatLogTimestamp = (log) => {
    const raw = log?.created_at || log?.time || log?.timestamp;
    if (!raw) return '—';

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return String(raw);

    return date.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatStatus = (status) => {
    if (!status) return '';
    return String(status)
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const resolveStatusTone = (log) => {
    const fromColor = String(log?.color || '').toLowerCase();
    const status = String(log?.status || '').toLowerCase();

    const tone = (name) => {
      if (name === 'green') {
        return theme.isDark
          ? { bg: 'rgba(22, 101, 52, 0.35)', border: 'rgba(74, 222, 128, 0.35)', text: '#86EFAC' }
          : { bg: '#DCFCE7', border: '#BBF7D0', text: '#166534' };
      }
      if (name === 'yellow') {
        return theme.isDark
          ? { bg: 'rgba(133, 77, 14, 0.35)', border: 'rgba(251, 191, 36, 0.35)', text: '#FDE68A' }
          : { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' };
      }
      if (name === 'red') {
        return theme.isDark
          ? { bg: 'rgba(127, 29, 29, 0.35)', border: 'rgba(248, 113, 113, 0.35)', text: '#FCA5A5' }
          : { bg: '#FEE2E2', border: '#FECACA', text: '#B91C1C' };
      }
      if (name === 'blue') {
        return theme.isDark
          ? { bg: 'rgba(30, 64, 175, 0.35)', border: 'rgba(96, 165, 250, 0.35)', text: '#93C5FD' }
          : { bg: '#DBEAFE', border: '#BFDBFE', text: '#1D4ED8' };
      }
      return theme.isDark
        ? { bg: 'rgba(55, 65, 81, 0.35)', border: 'rgba(156, 163, 175, 0.35)', text: '#D1D5DB' }
        : { bg: '#F3F4F6', border: '#E5E7EB', text: '#374151' };
    };

    if (fromColor === 'green' || fromColor === 'yellow' || fromColor === 'red' || fromColor === 'blue') {
      return tone(fromColor);
    }

    if (['confirmed', 'completed', 'paid', 'approved', 'active', 'available', 'resolved', 'verified'].includes(status)) {
      return tone('green');
    }
    if (['pending', 'pending_offline', 'partial', 'partial-completed', 'processing', 'in_progress'].includes(status)) {
      return tone('yellow');
    }
    if (['cancelled', 'canceled', 'rejected', 'failed', 'declined', 'overdue'].includes(status)) {
      return tone('red');
    }

    return tone('gray');
  };

  const renderLogItem = ({ item }) => {
    const statusLabel = formatStatus(item?.status);
    const statusTone = resolveStatusTone(item);
    const typeLabel = String(item?.type || '').trim();
    const hasAmount = item?.amount !== null && item?.amount !== undefined && item?.amount !== '';

    return (
      <View style={styles.logItem}>
        <View style={styles.logHeader}>
          <View style={styles.logHeadingWrap}>
            {typeLabel ? (
              <View style={styles.logTypeBadge}>
                <Text style={styles.logTypeText}>{typeLabel}</Text>
              </View>
            ) : null}
            <Text style={styles.logTitle}>{item.title || item.action || item.type || 'Activity'}</Text>
          </View>
          
          {hasAmount ? (
            <Text style={styles.logAmount}>
              {formatPrice(item.amount)}
            </Text>
          ) : null}
        </View>

        <View style={styles.logMeta}>
          <View style={styles.logActorBadge}>
            <Ionicons name="person-circle-outline" size={13} color={styles.logUser.color} />
            <Text style={styles.logUser}>{item.by || item.user || item.actor || 'System'}</Text>
          </View>
          <Text style={styles.logDate}>{formatLogTimestamp(item)}</Text>
        </View>

        {(item.details || item.description) ? (
          <Text style={styles.logDetails}>{item.details || item.description}</Text>
        ) : null}

        {statusLabel ? (
          <View style={[styles.statusBadge, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}> 
            <Text style={[styles.statusBadgeText, { color: statusTone.text }]}>{statusLabel}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
      
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
        keyExtractor={(item, index) => String(item?.id ?? `${item?.type || 'activity'}-${item?.timestamp || item?.created_at || index}`)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#16a34a']}
          />
        }
        ListEmptyComponent={
          logsQuery.isPending ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#16a34a" />
              <Text style={styles.emptySubtitle}>Loading activity logs...</Text>
            </View>
          ) : logsQuery.isError ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
              <Text style={styles.emptyTitle}>Failed to load logs</Text>
              <Text style={styles.emptySubtitle}>{logsQuery.error?.message || 'Something went wrong while loading activity logs.'}</Text>
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
