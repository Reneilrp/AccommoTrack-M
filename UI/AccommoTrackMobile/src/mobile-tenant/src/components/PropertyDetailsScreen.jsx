import React, { useEffect, useState } from 'react';
import { 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  Image, 
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Tenant/PropertyDetailsScreen';
import PropertyService from '../../../services/PropertyServices';

export default function PropertyDetailsScreen({ route }) {
  const navigation = useNavigation();
  const { accommodation } = route.params;
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [detailedAccommodation, setDetailedAccommodation] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    loadRooms();
  }, [accommodation?.id]);

  const loadRooms = async () => {
    if (!accommodation?.id) {
      setRooms([]);
      setRoomsLoading(false);
      return;
    }

    try {
      setRoomsLoading(true);
      const result = await PropertyService.getPublicProperty(accommodation.id);

      if (result.success && result.data) {
        // Use transform helper to build a consistent accommodation object
        const detailed = PropertyService.transformPropertyToAccommodation(result.data);
        setDetailedAccommodation(detailed);

        const standardizedRooms = (result.data.rooms || []).map((room) => ({
          ...room,
          images: room.images || [],
          monthly_rate: parseFloat(room.monthly_rate) || 0,
          status: room.status || 'unknown',
        }));
        setRooms(standardizedRooms);
      } else {
        throw new Error(result.error || 'No rooms found for this property.');
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
      Alert.alert('Error', 'Unable to load rooms for this property right now.');
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  };

  const filteredRooms = rooms.filter((room) => {
    if (selectedFilter === 'all') return true;
    return room.status === selectedFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return '#10b981';
      case 'occupied':
        return '#ef4444';
      case 'maintenance':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return 'checkmark-circle';
      case 'occupied':
        return 'people';
      case 'maintenance':
        return 'construct';
      default:
        return 'help-circle';
    }
  };

  const capitalizeStatus = (status) => {
    return (status || '').replace(/^\w/, (c) => c.toUpperCase()) || 'Unknown';
  };

  const handleRoomPress = (room) => {
    const active = detailedAccommodation || accommodation;
    navigation.navigate('RoomDetails', { room, property: active });
  };

  // Parse property rules (could be JSON string or array)
  const getPropertyRules = () => {
    const src = detailedAccommodation || accommodation;
    if (!src || !src.propertyRules) return [];
    if (Array.isArray(src.propertyRules)) return src.propertyRules;
    try {
      const parsed = JSON.parse(src.propertyRules);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Build full address
  const getFullAddress = () => {
    const src = detailedAccommodation || accommodation;
    const parts = [];
    if (!src) return 'Address not available';
    if (src.street_address) parts.push(src.street_address);
    if (src.barangay) parts.push(src.barangay);
    if (src.city) parts.push(src.city);
    if (src.province) parts.push(src.province);
    if (src.postal_code) parts.push(src.postal_code);

    if (parts.length > 0) return parts.join(', ');
    return src.address || src.location || 'Address not available';
  };

  // Open maps app
  const openMaps = () => {
    const src = detailedAccommodation || accommodation;
    const { latitude, longitude } = src || {};
    if (!latitude || !longitude) {
      Alert.alert('Location Not Available', 'Map coordinates are not set for this property.');
      return;
    }

    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent((src && (src.name || src.title)) || '')})`,
    });

    Linking.openURL(url).catch(() => {
      // Fallback to web maps
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    });
  };

  // Generate Leaflet HTML for WebView
  const getLeafletHTML = () => {
    const src = detailedAccommodation || accommodation;
    const { latitude, longitude } = src || {};
    const propertyName = ((src && (src.name || src.title)) || 'Property Location')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '');
    
    if (!latitude || !longitude) return null;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
                integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
                crossorigin="" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body, #map { width: 100%; height: 100%; }
            #map { border-radius: 12px; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
                  crossorigin=""></script>
          <script>
            var map = L.map('map').setView([${latitude}, ${longitude}], 15);
            
            // Use OpenStreetMap tiles (free, no API key needed)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 19
            }).addTo(map);
            
            // Add marker with green icon
            var greenIcon = L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            });
            
            var marker = L.marker([${latitude}, ${longitude}], {icon: greenIcon}).addTo(map);
            marker.bindPopup('${propertyName}').openPopup();
          </script>
        </body>
      </html>
    `;
  };

  // Tenant-relevant only: No landlord info, focus on vacancy, amenities, rules

  const active = detailedAccommodation || accommodation;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info Section */}
        <View style={styles.infoSection}>
          {/* Title and Type */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{active.name || active.title}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{active.type}</Text>
            </View>
          </View>
          
          {/* Image */}
          {active && active.image && (
            <Image
              source={typeof active.image === 'string' ? { uri: active.image } : active.image}
              style={styles.mainImage}
              resizeMode="cover"
            />
          )}

          {/* Full Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            <View style={styles.addressContainer}>
              <Ionicons name="location" size={20} color="#10b981" />
              <View style={styles.addressTextContainer}>
                <Text style={styles.addressText}>{getFullAddress()}</Text>
                {active && active.nearby_landmarks && (
                  <Text style={styles.landmarksText}>
                    <Text style={styles.landmarksLabel}>Nearby: </Text>
                    {active.nearby_landmarks}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Description */}
          {active && active.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{active.description}</Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="bed-outline" size={24} color="#10b981" />
              <Text style={styles.statNumber}>{(active && (active.availableRooms || active.available_rooms)) || 0}</Text>
              <Text style={styles.statLabel}>Available Rooms</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="pricetag-outline" size={24} color="#10b981" />
              <Text style={styles.statNumber}>{active && active.priceRange}</Text>
              <Text style={styles.statLabel}>Price Range</Text>
            </View>
          </View>

          {/* Amenities */}
          {active && active.amenities && active.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              {active.amenities.map((amenity, index) => (
                <View key={index} style={styles.ruleItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.ruleText}>{amenity}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Map Section */}
          {accommodation.latitude && accommodation.longitude && (
            <View style={styles.section}>
              <View style={styles.mapHeader}>
                <Text style={styles.sectionTitle}>Location</Text>
                <TouchableOpacity onPress={openMaps} style={styles.openMapsButton}>
                  <Ionicons name="open-outline" size={16} color="#10b981" />
                  <Text style={styles.openMapsText}>Open in Maps</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.mapContainer}>
                {getLeafletHTML() ? (
                  <WebView
                    originWhitelist={['*']}
                    source={{ html: getLeafletHTML() }}
                    style={styles.mapWebView}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    scalesPageToFit={true}
                    renderLoading={() => (
                      <View style={styles.mapLoadingContainer}>
                        <ActivityIndicator size="large" color="#10b981" />
                        <Text style={styles.mapLoadingText}>Loading map...</Text>
                      </View>
                    )}
                  />
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <Ionicons name="map-outline" size={48} color="#d1d5db" />
                    <Text style={styles.mapPlaceholderText}>Map not available</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Property Rules */}
          {getPropertyRules().length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Property Rules</Text>
              {getPropertyRules().map((rule, index) => (
                <View key={index} style={styles.ruleItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Embedded Room List */}
          <View style={styles.roomsSection}>
            <View style={styles.roomsHeader}>
              <Text style={styles.sectionTitle}>Rooms</Text>
              <TouchableOpacity onPress={loadRooms}>
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
            >
              {[
                { key: 'all', label: 'All' },
                { key: 'available', label: 'Available' },
                { key: 'occupied', label: 'Occupied' },
                { key: 'maintenance', label: 'Maintenance' }
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    selectedFilter === filter.key && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedFilter(filter.key)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === filter.key && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {roomsLoading ? (
              <View style={styles.roomsLoadingContainer}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={styles.roomsLoadingText}>Loading rooms...</Text>
              </View>
            ) : filteredRooms.length === 0 ? (
              <View style={styles.emptyRoomsContainer}>
                <Ionicons name="bed-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyRoomsTitle}>No rooms found</Text>
                <Text style={styles.emptyRoomsSubtitle}>
                  Try refreshing or adjusting your filter.
                </Text>
              </View>
            ) : (
              <View style={styles.roomsList}>
                {filteredRooms.map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    style={styles.roomCard}
                    onPress={() => handleRoomPress(room)}
                  >
                    <View style={styles.roomImageWrapper}>
                      <Image
                        source={{
                          uri:
                            room.images[0] ||
                            'https://via.placeholder.com/120x120?text=Room',
                        }}
                        style={styles.roomImage}
                        resizeMode="cover"
                      />
                    </View>

                    <View style={styles.roomInfo}>
                      {/* Top Row: Room Number and Price */}
                      <View style={styles.roomHeader}>
                        <Text style={styles.roomNumber} numberOfLines={1}>
                          Room {room.room_number}
                        </Text>
                        <Text style={styles.roomPrice} numberOfLines={1}>
                          ₱{room.monthly_rate.toLocaleString()}
                        </Text>
                      </View>

                      {/* Second Row: Status Badge and Price Label */}
                      <View style={styles.roomStatusRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(room.status) + '20' },
                          ]}
                        >
                          <Ionicons
                            name={getStatusIcon(room.status)}
                            size={14}
                            color={getStatusColor(room.status)}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              { color: getStatusColor(room.status) },
                            ]}
                            numberOfLines={1}
                          >
                            {capitalizeStatus(room.status)}
                          </Text>
                        </View>
                        <Text style={styles.priceLabel} numberOfLines={1}>
                          /month
                        </Text>
                      </View>

                      {/* Third Row: Room Type and Floor */}
                      <View style={styles.roomDetailsRow}>
                        <View style={styles.roomDetailItem}>
                          <Text style={styles.roomType} numberOfLines={1}>
                            {room.type_label || room.room_type}
                          </Text>
                        </View>
                        <View style={styles.roomDetailItem}>
                          <Ionicons name="layers-outline" size={16} color="#6b7280" />
                          <Text style={styles.roomDetailText} numberOfLines={1}>
                            {room.floor_label || `Floor ${room.floor}`}
                          </Text>
                        </View>
                      </View>

                      {/* Fourth Row: Capacity and View Details */}
                      <View style={styles.roomDetailsRow}>
                        <View style={styles.roomDetailItem}>
                          <Ionicons name="people-outline" size={16} color="#6b7280" />
                          <Text style={styles.roomDetailText} numberOfLines={1}>
                            Capacity: {room.capacity}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.viewDetailsButton}
                          onPress={() => handleRoomPress(room)}
                        >
                          <Text style={styles.viewDetailsText} numberOfLines={1}>
                            View Details
                          </Text>
                          <Ionicons name="arrow-forward" size={14} color="#10b981" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}