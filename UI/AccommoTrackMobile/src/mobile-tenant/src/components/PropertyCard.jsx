import { useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Tenant/HomePage.js';

export default function PropertyCard({ accommodation, property, onPress }) {
  // Accept both 'accommodation' and 'property' props for flexibility
  const item = accommodation || property;

  const API_BASE_URL = 'http://192.168.254.106:8000';

  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Early return if property is invalid
  if (!item || !item.id) {
    console.warn('PropertyCard: Invalid property data', item);
    return null;
  }

  // Standardized image handling from backend (string URL or object)
  const getImageSource = () => {
    if (!item.image) {
      return { uri: 'https://via.placeholder.com/400x200?text=No+Image' };
    }

    if (typeof item.image === 'string') {
      // If it's already a full URL, use it directly
      if (item.image.startsWith('http://') || item.image.startsWith('https://')) {
        return { uri: item.image };
      }

      // If it's a relative path, construct full URL
      // Remove any leading 'storage/' if present since backend adds it
      const cleanPath = item.image.replace(/^\/?(storage\/)?/, '');
      return { uri: `${API_BASE_URL}/storage/${cleanPath}` };
    }

    return item.image;
  };

  // Standardized available rooms from backend (available_rooms or availableRooms)
  const availableRooms = item.available_rooms || item.availableRooms || 0;

  // Capitalize type
  const propertyType = (item.type || 'property').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const getFullAddress = () => {
    const parts = [];
    if (item.street_address) parts.push(item.street_address);
    if (item.barangay) parts.push(item.barangay);
    if (item.city) parts.push(item.city);
    if (item.province) parts.push(item.province);
    if (item.postal_code) parts.push(item.postal_code);
    if (parts.length > 0) return parts.join(', ');
    return item.address || item.location || item.city || 'Unknown Location';
  };

  return (
    <TouchableOpacity
      style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
      onPress={() => onPress(item)}
      activeOpacity={1}
    >
      {/* Image Section */}
      <View style={styles.imageContainer}>
        <Image
          source={getImageSource()}
          style={styles.image}
          resizeMode="cover"
          onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
        />
        {/* Type Badge */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {propertyType}
          </Text>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.cardContent}>
        {/* Name/Title */}
        <Text style={styles.dormName} numberOfLines={2}>
          {item.name || item.title || 'Unnamed Property'}
        </Text>

        {/* Location */}
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={16} color="#757575" />
          <Text style={styles.locationText} numberOfLines={2}>
            {getFullAddress()}
          </Text>
        </View>

        {/* Availability */}
        {availableRooms > 0 ? (
          <View style={styles.availabilityBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
            <Text style={styles.availabilityText}>
              {availableRooms} room{availableRooms !== 1 ? 's' : ''} available
            </Text>
          </View>
        ) : (
          <View style={[styles.availabilityBadge, { backgroundColor: '#FFE5E5' }]}>
            <Ionicons name="close-circle" size={14} color="#D32F2F" />
            <Text style={[styles.availabilityText, { color: '#D32F2F' }]}>
              No rooms available
            </Text>
          </View>
        )}

        {/* View Button */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={(e) => {
              e.stopPropagation();
              onPress(item);
            }}
          >
            <Text style={styles.viewButtonText}>View More</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}