import React, { useRef } from 'react';

import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  Animated, 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Tenant/TenantHomePage.js';

export default function AccommodationCard({ accommodation, onPress, onLikePress }) {
  const getAmenityIcon = (amenity) => {
    switch (amenity) {
      case 'WiFi': return 'wifi';
      case 'Parking': return 'car';
      case 'Kitchen': return 'restaurant';
      case 'AC': return 'snow';
      default: return 'checkmark-circle';
    }
  };

  const scaleAnim = useRef(new Animated.Value(1)).current;


  return (
    <TouchableOpacity
      style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
      onPress={() => onPress(accommodation)}
      activeOpacity={1}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: accommodation.image }} style={styles.image} />
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{accommodation.type}</Text>
        </View>

        {/* Like Button - Prevent card press when tapping like */}
        <TouchableOpacity
          style={styles.likeButton}
          onPress={(e) => {
            e.stopPropagation(); // Prevent triggering card press
            onLikePress(accommodation.id);
          }}
        >
          <Ionicons
            name={accommodation.liked ? 'heart' : 'heart-outline'}
            size={24}
            color={accommodation.liked ? '#EF4444' : '#4B5563'}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={styles.dormName}>{accommodation.name}</Text>

        {/* Location */}
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.locationText}>{accommodation.location}</Text>
        </View>

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.ratingText}>{accommodation.rating}</Text>
          </View>
          <Text style={styles.reviewsText}>({accommodation.reviews} reviews)</Text>
        </View>

        {/* Amenities */}
        <View style={styles.amenitiesContainer}>
          {accommodation.amenities.map((amenity, idx) => (
            <View key={idx} style={styles.amenityBadge}>
              <Ionicons name={getAmenityIcon(amenity)} size={14} color="#00A651" />
              <Text style={styles.amenityText}>{amenity}</Text>
            </View>
          ))}
        </View>

        {/* Price and Button */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.price}>₱{accommodation.price.toLocaleString()}</Text>
            <Text style={styles.priceLabel}>/month</Text>
          </View>

          {/* View Details Button */}
          <TouchableOpacity
            style={styles.viewButton}
            onPress={(e) => {
              e.stopPropagation();
              onPress(accommodation);
            }}
          >
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}