import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useTheme } from '../../../contexts/ThemeContext';
import LandlordDashboardService from '../../../services/LandlordDashboardService';
import { styles } from '../../../styles/Landlord/PropertyActivityLogs';

const FILTERS = ['All', 'Dorm Settings', 'Room Management', 'Payments', 'Due'];

export default function PropertyActivityLogs({ route, navigation }) {
  const { theme } = useTheme();
  const { propertyId, propertyTitle } = route.params || {};

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (!propertyId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await LandlordDashboardService.fetchPropertyActivities(propertyId);
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchLogs(true)}
            colors={['#16a34a']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No activity found</Text>
            <Text style={styles.emptySubtitle}>There are no logs matching the selected filter for this property.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
