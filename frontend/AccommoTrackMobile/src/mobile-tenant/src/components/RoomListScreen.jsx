import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import PropertyService from '../../../services/PropertyServices';
import { styles } from '../../../styles/Tenant/RoomListScreen';
import { BASE_URL as API_BASE_URL } from '../../../config';

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
  const navigation = useNavigation();
  const { property } = route.params;

  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    filterRooms();
  }, [rooms, selectedFilter]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const result = await PropertyService.getPublicProperty(property.id);
      if (result.success && result.data.rooms) {
        const standardizedRooms = result.data.rooms.map(room => ({
          ...room,
          images: room.images || [],
          monthly_rate: parseFloat(room.monthly_rate) || 0,
          status: room.status || 'unknown'
        }));
        setRooms(standardizedRooms);
      } else {
        throw new Error(result.error || 'No rooms data');
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      Alert.alert('Error', 'Failed to load rooms. Please try again.');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRooms = () => {
    let filtered = [...rooms];
    switch (selectedFilter) {
      case 'available':
        filtered = filtered.filter(room => room.status === 'available');
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
    setFilteredRooms(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'occupied': return '#ef4444';
      case 'maintenance': return '#f59e0b';
      default: return '#6b7280';
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
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {property.name || property.title}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filters */}
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

      {/* Room Cards Container */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {filteredRooms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bed-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No rooms found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filter</Text>
          </View>
        ) : (
          <View style={styles.roomsContainer}>
            {filteredRooms.map((room) => (
              <TouchableOpacity
                key={room.id}
                style={styles.roomCard}
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

                  <View style={styles.roomDetailsGrid}>
                    <View style={styles.roomDetailItem}>
                      <Ionicons name="layers-outline" size={16} color="#6b7280" />
                      <Text style={styles.roomDetailText}>{room.floor_label || `Floor ${room.floor}`}</Text>
                    </View>
                    <View style={styles.roomDetailItem}>
                      <Ionicons name="people-outline" size={16} color="#6b7280" />
                      <Text style={styles.roomDetailText}>Capacity: {room.capacity}</Text>
                    </View>
                  </View>

                  {/* View Details Button */}
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => navigation.navigate('RoomDetails', { room, property })}
                  >
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <Ionicons name="arrow-forward" size={16} color="#10b981" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}