import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import PropertyService from '../../../../services/PropertyService.js';
import { getStyles } from '../../../../styles/Tenant/RoomListScreen.js';
import { BASE_URL as API_BASE_URL } from '../../../../config/index.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import {
  tenantQueryKeys,
  useTenantFocusRefetch,
  useTenantRefreshHandler,
} from '../../hooks/useTenantQueryHelpers.js';

// Helper function to get proper image URL
const getRoomImageUrl = (imageUrl) => {
  if (!imageUrl) return 'https://via.placeholder.com/150x100?text=No+Image';
  
  if (typeof imageUrl === 'string') {
    // Already a full URL
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // Relative path - construct full URL
    const cleanPath = imageUrl.replace(/^\/?storage\//, '');
    return `${API_BASE_URL}/storage/${cleanPath}`;
  }
  
  return 'https://via.placeholder.com/150x100?text=No+Image';
};

export default function RoomListScreen({ route }) {
  const { width: viewportWidth } = useWindowDimensions();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const showAlert = Alert.alert;
  const contentWrapStyle = React.useMemo(
    () => (viewportWidth >= 768 ? { width: '100%', maxWidth: 960, alignSelf: 'center' } : null),
    [viewportWidth],
  );
  const { property } = route.params;

  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const roomListQuery = useQuery({
    queryKey: tenantQueryKeys.explorePropertyRooms(property?.id),
    enabled: Boolean(property?.id),
    queryFn: async () => {
      const result = await PropertyService.getPublicProperty(property.id);
      if (!result?.success || !Array.isArray(result?.data?.rooms)) {
        throw new Error(result?.error || 'No rooms data');
      }

      return result.data.rooms.map((room) => {
        const rawStatus = (room.display_status || room.status || 'unknown')
          .toString()
          .toLowerCase();
        const normalizedStatus =
          typeof room.is_available === 'boolean' &&
          !room.is_available &&
          rawStatus === 'available'
            ? 'reserved'
            : rawStatus;

        return {
          ...room,
          images: room.images || [],
          monthly_rate: parseFloat(room.monthly_rate) || 0,
          status: normalizedStatus,
        };
      });
    },
    placeholderData: (previousData) => previousData,
  });

  const rooms = React.useMemo(() => roomListQuery.data ?? [], [roomListQuery.data]);
  const loading = roomListQuery.isLoading;
  const refetchRoomList = roomListQuery.refetch;
  const roomListRefetchers = React.useMemo(
    () => [refetchRoomList],
    [refetchRoomList],
  );

  useTenantFocusRefetch({
    enabled: Boolean(property?.id),
    refetchers: roomListRefetchers,
  });

  const onRefresh = useTenantRefreshHandler({
    enabled: Boolean(property?.id),
    setRefreshing,
    refetchers: roomListRefetchers,
  });

  useEffect(() => {
    if (!roomListQuery.error) return;
    console.error('Error loading rooms:', roomListQuery.error);
    showAlert('Error', roomListQuery.error.message || 'Failed to load rooms. Please try again.');
  }, [roomListQuery.error]);

  const filteredRooms = React.useMemo(() => {
    let filtered = [...rooms];
    switch (selectedFilter) {
      case 'available':
        filtered = filtered.filter((room) => (
          typeof room.is_available === 'boolean'
            ? room.is_available
            : room.status === 'available'
        ));
        break;
      case 'occupied':
        filtered = filtered.filter(room => room.status === 'occupied');
        break;
      case 'maintenance':
        filtered = filtered.filter(room => room.status === 'maintenance');
        break;
      case 'all':
      default:
        break;
    }
    return filtered;
  }, [rooms, selectedFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return theme.colors.success;
      case 'occupied': return theme.colors.error;
      case 'maintenance': return theme.colors.warning;
      default: return theme.colors.textTertiary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return 'checkmark-circle';
      case 'occupied': return 'people';
      case 'maintenance': return 'construct';
      default: return 'help-circle';
    }
  };

  const capitalizeStatus = (status) => {
    return (status || '').replace(/^\w/, c => c.toUpperCase()) || 'Unknown';
  };

  const getPromoTerms = (room) => {
    const promos = room?.duration_pricing;
    if (!promos || typeof promos !== 'object') {
      // The backend might return an array from the JSON cast.
      if (Array.isArray(promos) && promos.length > 0) {
        return promos.map(p => p.months || p.term).filter(Boolean);
      }
      return [];
    }
    // Handle object format
    return Object.keys(promos).filter(
      (term) => promos[term] && promos[term].discount_value > 0,
    );
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rooms</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
          {property.name || property.title}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filters */}
      <View style={contentWrapStyle}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {[
            { key: 'all', label: 'All' },
            { key: 'available', label: 'Available' },
            { key: 'occupied', label: 'Occupied' },
            { key: 'maintenance', label: 'Maintenance' }
          ].map(filter => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterButton, selectedFilter === filter.key && styles.filterButtonActive]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text style={[styles.filterText, selectedFilter === filter.key && styles.filterTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Room Cards Container */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={contentWrapStyle}>
          {filteredRooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bed-outline" size={64} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>No rooms found</Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Try adjusting your filter</Text>
            </View>
          ) : (
            <View style={styles.roomsContainer}>
              {filteredRooms.map((room) => {
                const isOccupied = room.status === 'occupied';
                const promoTerms = getPromoTerms(room);
                return (
                <TouchableOpacity
                  key={room.id}
                  style={[styles.roomCard, isOccupied && styles.roomCardOccupied]}
                  onPress={() => navigation.navigate('RoomDetails', { room, property })}
                >
                  {/* Left: Image + Price */}
                  <View style={styles.leftSection}>
                    <View style={styles.roomImageContainer}>
                      <Image
                        source={{ uri: getRoomImageUrl(room.images?.[0]) }}
                        style={styles.roomImage}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.priceSection}>
                      <Text style={styles.roomPrice}>₱{room.monthly_rate.toLocaleString()}</Text>
                      <Text style={styles.priceLabel}>/month</Text>
                    </View>
                  </View>

                  {/* Right: Room Info */}
                  <View style={styles.roomInfo}>
                    <View style={styles.roomHeader}>
                      <Text style={styles.roomNumber}>Room {room.room_number}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(room.status) + '20' }]}>
                        <Ionicons name={getStatusIcon(room.status)} size={14} color={getStatusColor(room.status)} />
                        <Text style={[styles.statusText, { color: getStatusColor(room.status) }]}>
                          {capitalizeStatus(room.status)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.roomType}>{room.type_label || room.room_type}</Text>

                    {promoTerms.length > 0 && (
                      <View style={styles.promoContainer}>
                        <Ionicons name="pricetag-outline" size={12} color={theme.colors.primary} />
                        <Text style={styles.promoText}>
                          {promoTerms.join('/')}-Month
                          {promoTerms.length > 1 ? ' Promos' : ' Promo'}
                        </Text>
                      </View>
                    )}

                    <View style={styles.roomDetailsGrid}>
                      <View style={styles.roomDetailItem}>
                        <Ionicons name="layers-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.roomDetailText, { color: theme.colors.textSecondary }]}>{room.floor_label || `Floor ${room.floor}`}</Text>
                      </View>
                      <View style={styles.roomDetailItem}>
                        <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.roomDetailText, { color: theme.colors.textSecondary }]}>Capacity: {room.capacity}</Text>
                      </View>
                    </View>

                    {/* View Details Button */}
                    <TouchableOpacity
                      style={styles.viewDetailsButton}
                      onPress={() => navigation.navigate('RoomDetails', { room, property })}
                    >
                      <Text style={[styles.viewDetailsText, { color: theme.colors.primary }]}>View Details</Text>
                      <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}