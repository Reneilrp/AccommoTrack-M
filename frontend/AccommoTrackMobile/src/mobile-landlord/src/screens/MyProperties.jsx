import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import PropertyService, { getImageUrl } from '../../../services/PropertyServices';
import { styles } from '../../../styles/Landlord/MyProperties.js';
import MapModal from '../../../mobile-tenant/src/components/MapModal';
import { useTheme } from '../../../contexts/ThemeContext';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'pending', label: 'Pending' }
];

const STATUS_COLORS = {
  active: { bg: '#DCFCE7', fg: '#166534' },
  inactive: { bg: '#E5E7EB', fg: '#374151' },
  pending: { bg: '#FEF3C7', fg: '#92400E' },
  maintenance: { bg: '#DBEAFE', fg: '#1D4ED8' },
  default: { bg: '#E5E7EB', fg: '#6B7280' }
};

const emptyMetrics = { active: 0, inactive: 0, pending: 0, totalRooms: 0 };

export default function MyPropertiesScreen({ navigation }) {
  const { theme } = useTheme();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mapOpen, setMapOpen] = useState(false);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await PropertyService.getMyProperties();
      if (res.success) {
        setProperties(Array.isArray(res.data) ? res.data : []);
        setError('');
      } else {
        setProperties([]);
        setError(res.error || 'Unable to fetch properties');
      }
    } catch (err) {
      setProperties([]);
      setError(err.message || 'Unable to fetch properties');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        setLoading(true);
        await fetchProperties();
        if (isActive) {
          setLoading(false);
        }
      })();
      return () => {
        isActive = false;
      };
    }, [fetchProperties])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProperties();
    setRefreshing(false);
  }, [fetchProperties]);

  const stats = useMemo(() => {
    if (!properties.length) return emptyMetrics;

    return properties.reduce(
      (acc, property) => {
        const status = (property.current_status || 'pending').toLowerCase();
        if (acc[status] !== undefined) {
          acc[status] += 1;
        }
        acc.totalRooms += Number(property.total_rooms || 0);
        return acc;
      },
      { ...emptyMetrics }
    );
  }, [properties]);

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const status = (property.current_status || 'pending').toLowerCase();
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const haystack = `${property.title || ''} ${property.street_address || ''} ${property.city || ''}`.toLowerCase();
      const matchesSearch = haystack.includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [properties, statusFilter, searchQuery]);

  const formatAddress = (property) => {
    const parts = [property.street_address, property.barangay, property.city, property.province].filter(Boolean);
    return parts.join(', ');
  };

  const getCoverImage = (property) => {
    if (Array.isArray(property.images) && property.images.length > 0) {
      const first = property.images[0];
      const path = typeof first === 'string'
        ? first
        : first?.image_url || first?.url || first?.path;
      return getImageUrl(path);
    }
    return null;
  };

  const renderProperty = ({ item }) => {
    const statusKey = (item.current_status || 'pending').toLowerCase();
    const palette = STATUS_COLORS[statusKey] || STATUS_COLORS.default;
    const cover = getCoverImage(item);
    const totalRooms = Number(item.total_rooms || 0);
    const availableRooms = Number(item.available_rooms || 0);
    const occupiedRooms = Math.max(totalRooms - availableRooms, 0);
    const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return (
      <View style={{ paddingHorizontal: 16 }}>
        <TouchableOpacity
          style={styles.propertyCard}
          onPress={() => navigation.navigate('DormProfile', { propertyId: item.id })}
        >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled property'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: palette.bg }]}> 
            <Text style={[styles.statusText, { color: palette.fg }]}>{statusKey}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.imageColumn}>
            <View style={styles.propertyImage}>
              {cover ? (
                <Image source={{ uri: cover }} style={styles.propertyImageMedia} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={26} color="#9CA3AF" />
                </View>
              )}
            </View>
            <View style={styles.propertyTypeContainer}>
              <Text style={styles.propertyTypeText}>{PropertyService.formatPropertyType(item.property_type)}</Text>
            </View>
          </View>

          <View style={styles.cardDetails}>
            <Text style={styles.addressText}>{formatAddress(item) || 'Location not set'}</Text>
            
            <View style={styles.metricsGrid}>
              <View style={styles.metricsGridRow}>
                <View style={styles.metricItem}>
                  <Ionicons name="bed-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.metricLabel}>{totalRooms} rooms</Text>
                </View>
                <View style={styles.metricItem}>
                  <Ionicons name="log-in-outline" size={16} color="#F97316" />
                  <Text style={styles.metricLabel}>{availableRooms} available</Text>
                </View>
              </View>
              <View style={styles.metricsGridRow}>
                <View style={styles.metricItem}>
                  <Ionicons name="people-outline" size={16} color="#2563EB" />
                  <Text style={styles.metricLabel}>{occupiedRooms} tenants</Text>
                </View>
                <View style={styles.metricItem}>
                  <Ionicons name="speedometer-outline" size={16} color="#7C3AED" />
                  <Text style={styles.metricLabel}>{occupancyRate}% occupied</Text>
                </View>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${occupancyRate}%` }]} />
            </View>
          </View>
        </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderListHeader = () => (
    <View style={styles.section}>
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={18} color="#B91C1C" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Ionicons name="refresh" size={18} color="#B91C1C" />
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Listings</Text>
          <Text style={styles.statValueGreen}>{stats.active}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending Listings</Text>
          <Text style={styles.statValueOrange}>{stats.pending}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Inactive Listings</Text>
          <Text style={styles.statValueRed}>{stats.inactive}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Rooms</Text>
          <Text style={styles.statValueBlue}>{stats.totalRooms}</Text>
        </View>
      </ScrollView>

      <View style={{ marginTop: 8 }}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or address"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
            <TouchableOpacity 
            style={styles.mapButton}
            onPress={() => setMapOpen(true)}
          >
            <Ionicons name="map-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.filtersRow}>
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterChip, active ? styles.filterActive : styles.filterInactive]}
                onPress={() => setStatusFilter(tab.key)}
              >
                <Text style={[styles.filterLabel, { color: active ? '#166534' : '#1F2937' }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading properties...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Properties</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('AddProperty')}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={renderProperty}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16 }}>
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No properties found</Text>
              <Text style={styles.emptySubtitle}>Tap the + button to add your first listing</Text>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      
      <MapModal 
        visible={mapOpen} 
        onClose={() => setMapOpen(false)} 
        properties={properties.map(p => ({
          ...p,
          image: getCoverImage(p),
          address: formatAddress(p)
        }))} 
        userRole="landlord"
        onSelectProperty={(data) => {
          if (data.action === 'open_property' && data.property) {
            setMapOpen(false);
            navigation.navigate('DormProfile', { propertyId: data.property.id });
          }
        }} 
      />
    </SafeAreaView>
  );
}
