import React, { useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStyles } from '../../../styles/Tenant/HomePage.js';
import { API_BASE_URL, BASE_URL } from '../../../config/index.js';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import { getImageUrl } from '../../../utils/imageUtils.js';

export default function PropertyCard({ accommodation, property, onPress }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  // Accept both 'accommodation' and 'property' props for flexibility
  const item = accommodation || property;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Early return if property is invalid
  if (!item || !item.id) {
    console.warn('PropertyCard: Invalid property data', item);
    return null;
  }

  // Image handling from backend
  const imageUri = getImageUrl(item.image) || 'https://via.placeholder.com/400x200?text=No+Image';

  // Standardized available rooms from backend (available_rooms or availableRooms)
  const availableRooms = item.available_rooms || item.availableRooms || 0;

  // Capitalize type
  const propertyType = (item.type || 'property').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const getFullAddress = () => {
    // Use full_address from backend if available
    if (item.full_address) return item.full_address;
    
    // Build address from parts
    const parts = [];
    if (item.street_address) parts.push(item.street_address);
    if (item.barangay) parts.push(`Brgy. ${item.barangay}`);
    if (item.city) parts.push(item.city);
    if (item.province && item.province !== item.city) parts.push(item.province);
    
    if (parts.length > 0) return parts.join(', ');
    
    // Fallback to location or city
    return item.location || item.address || item.city || 'Unknown Location';
  };

  return (
    <TouchableOpacity
      style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      {/* Image Section */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
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
          <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.locationText} numberOfLines={2}>
            {getFullAddress()}
          </Text>
        </View>

        {/* Curfew & Gender */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          {item.curfew_time && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>
                {item.curfew_time}
              </Text>
            </View>
          )}
          {item.gender_restriction && item.gender_restriction !== 'mixed' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons 
                name={item.gender_restriction === 'male' ? 'male-outline' : 'female-outline'} 
                size={16} 
                color={theme.colors.primary} 
              />
              <Text style={{ fontSize: 13, color: theme.colors.primary, fontWeight: '600' }}>
                {item.gender_restriction === 'male' ? 'Boys Only' : 'Girls Only'}
              </Text>
            </View>
          )}
        </View>

        {/* Availability */}
        {availableRooms > 0 ? (
          <View style={[styles.availabilityBadge, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
            <Text style={[styles.availabilityText, { color: theme.colors.primary }]}>
              {availableRooms} room{availableRooms !== 1 ? 's' : ''} available
            </Text>
          </View>
        ) : (
          <View style={[styles.availabilityBadge, { backgroundColor: theme.colors.errorLight }]}>
            <Ionicons name="close-circle" size={14} color={theme.colors.error} />
            <Text style={[styles.availabilityText, { color: theme.colors.error }]}>
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