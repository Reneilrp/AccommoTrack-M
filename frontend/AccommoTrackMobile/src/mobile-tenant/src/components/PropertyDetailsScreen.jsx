// Replace the entire PropertyDetailsScreen.jsx with this updated version

import React, { useEffect, useState, useCallback } from 'react';
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
  Platform,
  RefreshControl,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getStyles } from '../../../styles/Tenant/PropertyDetailsScreen';
import homeStyles from '../../../styles/Tenant/HomePage.js';
import PropertyService from '../../../services/PropertyServices';
import { useTheme } from '../../../contexts/ThemeContext';

export default function PropertyDetailsScreen({ route }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { accommodation, isGuest = false, onAuthRequired } = route.params || {};
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailedAccommodation, setDetailedAccommodation] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [accommodation?.id])
  );

  // Hide bottom tab bar for this details screen (if parent is a tab navigator)
  useEffect(() => {
    const parent = navigation.getParent?.();
    try {
      parent?.setOptions?.({ tabBarStyle: { display: 'none' } });
    } catch (e) {
      // ignore if parent doesn't support tabBarStyle
    }
    return () => {
      try {
        parent?.setOptions?.({ tabBarStyle: undefined });
      } catch (e) {}
    };
  }, [navigation]);

  const loadRooms = async () => {
    if (!accommodation?.id) {
      setRooms([]);
      setRoomsLoading(false);
      return;
    }

    try {
      setRoomsLoading(true);
      const result = await PropertyService.getPublicProperty(accommodation.id);

      console.log('Raw API response:', result); // DEBUG

      if (result.success && result.data) {
        // Store the raw API data with ALL landlord fields
        const rawData = result.data;
        
        console.log('Landlord data from API:', {
          landlord_id: rawData.landlord_id,
          user_id: rawData.user_id,
          landlord_name: rawData.landlord_name,
          landlord: rawData.landlord
        }); // DEBUG

        // Build detailed accommodation with ALL possible landlord fields
        const detailed = {
          ...rawData,
          // Preserve ALL landlord-related fields
          landlord_id: rawData.landlord_id,
          user_id: rawData.user_id || rawData.landlord_id,
          landlord_name: rawData.landlord_name,
          owner_name: rawData.owner_name || rawData.landlord_name,
          landlord: rawData.landlord,
          // Also add common aliases
          name: rawData.title || rawData.name,
          title: rawData.title || rawData.name,
          type: rawData.property_type || rawData.type,
          availableRooms: rawData.available_rooms,
          available_rooms: rawData.available_rooms,
          priceRange: rawData.price_range,
          amenities: rawData.amenities || []
        };

        console.log('Detailed accommodation object:', detailed); // DEBUG
        setDetailedAccommodation(detailed);

        const standardizedRooms = (rawData.rooms || []).map((room) => ({
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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRooms();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredRooms = rooms.filter((room) => {
    if (selectedFilter === 'all') return true;
    return room.status === selectedFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return theme.colors.success;
      case 'occupied':
        return theme.colors.error;
      case 'maintenance':
        return theme.colors.warning;
      default:
        return theme.colors.textTertiary;
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
    // Use detailedAccommodation first (has freshest API data), fallback to accommodation
    const sourceProperty = detailedAccommodation || accommodation;
    
    console.log('Source property for room press:', sourceProperty); // DEBUG
    
    // Build comprehensive property data with ALL landlord fields
    const propertyData = {
      // Basic property info
      id: sourceProperty.id,
      name: sourceProperty.name || sourceProperty.title,
      title: sourceProperty.title || sourceProperty.name,
      type: sourceProperty.type || sourceProperty.property_type,
      
      // Address fields
      street_address: sourceProperty.street_address,
      city: sourceProperty.city,
      province: sourceProperty.province,
      barangay: sourceProperty.barangay,
      postal_code: sourceProperty.postal_code,
      
      // Location
      latitude: sourceProperty.latitude,
      longitude: sourceProperty.longitude,
      
      // ALL possible landlord field variations
      landlord_id: sourceProperty.landlord_id || sourceProperty.user_id || sourceProperty.landlord?.id,
      user_id: sourceProperty.user_id || sourceProperty.landlord_id || sourceProperty.landlord?.id,
      landlord_name: sourceProperty.landlord_name || 
                     sourceProperty.owner_name || 
                     (sourceProperty.landlord ? 
                       `${sourceProperty.landlord.first_name || ''} ${sourceProperty.landlord.last_name || ''}`.trim() 
                       : 'Landlord'),
      owner_name: sourceProperty.owner_name || sourceProperty.landlord_name,
      
      // Full landlord object
      landlord: sourceProperty.landlord || null,
      
      // Other property data
      description: sourceProperty.description,
      amenities: sourceProperty.amenities,
      property_rules: sourceProperty.property_rules || sourceProperty.propertyRules,
      nearby_landmarks: sourceProperty.nearby_landmarks,
    };
    
    console.log('Property data being passed to RoomDetails:', {
      id: propertyData.id,
      landlord_id: propertyData.landlord_id,
      user_id: propertyData.user_id,
      landlord_name: propertyData.landlord_name,
      landlord: propertyData.landlord
    }); // DEBUG
    
    navigation.navigate('RoomDetails', { 
      room, 
      property: propertyData,
      hideLayout: true,
    });
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

  // Contact landlord function
  const handleContactLandlord = async () => {
    if (isGuest) {
      if (onAuthRequired) onAuthRequired();
      return;
    }

    try {
      const src = detailedAccommodation || accommodation;
      
      console.log('=== CONTACT LANDLORD FROM PROPERTY DEBUG ===');
      console.log('Full property object:', JSON.stringify(src, null, 2));
      
      const landlordId = src.landlord_id ||
        src.user_id ||
        src.landlord?.id ||
        src.owner?.id;

      const landlordName = src.landlord_name ||
        src.owner_name ||
        (src.landlord ?
          `${src.landlord.first_name || ''} ${src.landlord.last_name || ''}`.trim()
          : null) ||
        (src.owner ?
          `${src.owner.first_name || ''} ${src.owner.last_name || ''}`.trim()
          : null) ||
        'Landlord';

      console.log('Extracted landlord info:', { landlordId, landlordName });

      if (!landlordId) {
        Alert.alert(
          'Error',
          'Landlord information not available. Please try refreshing the property details.',
          [
            {
              text: 'Refresh',
              onPress: () => onRefresh()
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
        return;
      }

      console.log('Navigating to Messages with:', {
        landlordId,
        landlordName,
        propertyId: src.id,
        propertyTitle: src.name || src.title
      });

      navigation.navigate('Messages', {
        startConversation: true,
        recipient: {
          id: landlordId,
          name: landlordName,
        },
        property: {
          id: src.id,
          title: src.name || src.title,
        }
      });
    } catch (error) {
      console.error('Error navigating to messages:', error);
      Alert.alert('Error', `Failed to open messages: ${error.message}\n\nPlease try again.`);
    }
  };

  // Generate Leaflet HTML for WebView
  const getLeafletHTML = () => {
    const src = detailedAccommodation || accommodation;
    const { latitude, longitude } = src || {};
    const propertyName = ((src && (src.name || src.title)) || 'Property Location')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\"/g, '\\"')
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
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 19
            }).addTo(map);
            
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

  const active = detailedAccommodation || accommodation;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: theme.colors.primary, borderBottomWidth: 0.5, borderBottomColor: theme.colors.primary }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse || '#fff'} />
        </TouchableOpacity>

        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: theme.colors.textInverse || '#fff' }}>Property Details</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
        }
        nestedScrollEnabled={true}
      >
        {/* Info Section */}
        <View style={styles.infoSection}>
          {/* Title and Type */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{active.name || active.title}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{(active.type || 'property').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
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
              <Ionicons name="location" size={20} color={theme.colors.primary} />
              <View style={styles.addressTextContainer}>
                <Text style={[styles.addressText, { color: theme.colors.text }]}>{getFullAddress()}</Text>
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
              <Ionicons name="bed-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>{(active && (active.availableRooms || active.available_rooms)) || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Available Rooms</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="pricetag-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>{active && active.priceRange}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Price Range</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="star" size={24} color="#F59E0B" />
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {active && active.rating ? active.rating : '-'}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                {active && active.reviews_count ? `${active.reviews_count} Reviews` : 'No Reviews'}
              </Text>
            </View>
          </View>

          {/* Amenities */}
          {active && active.amenities && active.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              {active.amenities.map((amenity, index) => (
                <View key={index} style={styles.ruleItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                  <Text style={[styles.ruleText, { color: theme.colors.text }]}>{amenity}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Map Section */}
          {active.latitude && active.longitude && (
            <View style={styles.section}>
              <View style={styles.mapHeader}>
                <Text style={styles.sectionTitle}>Location</Text>
                <TouchableOpacity onPress={openMaps} style={styles.openMapsButton}>
                  <Ionicons name="open-outline" size={16} color={theme.colors.primary} />
                  <Text style={[styles.openMapsText, { color: theme.colors.primary }]}>Open in Maps</Text>
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
                    nestedScrollEnabled={true}
                    renderLoading={() => (
                      <View style={styles.mapLoadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={[styles.mapLoadingText, { color: theme.colors.text }]}>Loading map...</Text>
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
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                  <Text style={[styles.ruleText, { color: theme.colors.text }]}>{rule}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Contact Landlord Button */}
          <TouchableOpacity style={[styles.contactButton, { backgroundColor: theme.colors.primary }]} onPress={handleContactLandlord}>
            <Ionicons name="chatbubble-outline" size={18} color={theme.colors.textInverse} />
            <Text style={[styles.contactButtonText, { color: theme.colors.textInverse }]}>Contact Landlord</Text>
          </TouchableOpacity>

          {/* Report Maintenance removed from Property Details - only available via MyBookings */}

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
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.roomsLoadingText, { color: theme.colors.textSecondary }]}>Loading rooms...</Text>
              </View>
            ) : filteredRooms.length === 0 ? (
              <View style={styles.emptyRoomsContainer}>
                <Ionicons name="bed-outline" size={48} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyRoomsTitle, { color: theme.colors.text }]}>No rooms found</Text>
                <Text style={[styles.emptyRoomsSubtitle, { color: theme.colors.textSecondary }]}>
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
                          <Text style={[styles.viewDetailsText, { color: theme.colors.primary }]} numberOfLines={1}>
                            View Details
                          </Text>
                          <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
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