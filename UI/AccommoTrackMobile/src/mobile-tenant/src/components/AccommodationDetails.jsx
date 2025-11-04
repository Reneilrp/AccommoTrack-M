import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Tenant/AccommodationDetails.js';

const { width } = Dimensions.get('window');

export default function AccommodationDetails({ route }) {
  const navigation = useNavigation();
  const { accommodation } = route.params;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Sample images - in real app, accommodation would have multiple images
  const images = [
    accommodation.image,
    "https://images.unsplash.com/photo-1502672260066-6bc05c107e00?w=400",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400"
  ];

  const getAmenityIcon = (amenity) => {
    switch(amenity) {
      case 'WiFi': return 'wifi';
      case 'Parking': return 'car';
      case 'Kitchen': return 'restaurant';
      case 'AC': return 'snow';
      default: return 'checkmark-circle';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {images.map((img, index) => (
              <Image
                key={index}
                source={{ uri: img }}
                style={styles.image}
              />
            ))}
          </ScrollView>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>

          {/* Like Button */}
          <TouchableOpacity style={styles.likeButton}>
            <Ionicons
              name={accommodation.liked ? 'heart' : 'heart-outline'}
              size={24}
              color={accommodation.liked ? '#EF4444' : '#111827'}
            />
          </TouchableOpacity>

          {/* Image Indicators */}
          <View style={styles.indicatorContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  currentImageIndex === index && styles.indicatorActive
                ]}
              />
            ))}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Owner Info */}
          <View style={styles.ownerContainer}>
            <View style={styles.ownerAvatar}>
              <Ionicons name="person" size={24} color="#00A651" />
            </View>
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>Aileen Limpasan</Text>
              <Text style={styles.ownerLabel}>Landlord</Text>
            </View>
            <TouchableOpacity style={styles.messageButton}>
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>

          {/* Title and Type */}
          <View style={styles.titleContainer}>
            <View>
              <Text style={styles.title}>{accommodation.name}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{accommodation.type}</Text>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={20} color="#00A651" />
            <Text style={styles.locationText}>{accommodation.location}</Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={18} color="#F59E0B" />
              <Text style={styles.ratingText}>{accommodation.rating}</Text>
            </View>
            <Text style={styles.reviewsText}>({accommodation.reviews} reviews)</Text>
          </View>

          {/* Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details:</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Type of Dormitory</Text>
              <Text style={styles.detailValue}>
                Located in Brgy San Jose, Imus, Cavite. 
                {'\n'}Just right along the Aguinaldo Highway, it is 
                {'\n'}near Imus City.
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Room Type</Text>
              <Text style={styles.detailValue}>Shared Room • 4-6 persons</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Available Rooms</Text>
              <Text style={styles.detailValue}>3 rooms available</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description:</Text>
            <Text style={styles.description}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
              incididunt ut labore et dolore magna aliqua. Duis aute irure dolor in reprehenderit 
              in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </Text>
          </View>

          {/* Amenities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities:</Text>
            <View style={styles.amenitiesGrid}>
              {accommodation.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityItem}>
                  <View style={styles.amenityIcon}>
                    <Ionicons name={getAmenityIcon(amenity)} size={24} color="#00A651" />
                  </View>
                  <Text style={styles.amenityLabel}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Images Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos:</Text>
            <View style={styles.photosGrid}>
              {images.map((img, index) => (
                <Image
                  key={index}
                  source={{ uri: img }}
                  style={styles.photoThumbnail}
                />
              ))}
            </View>
          </View>

          {/* Spacer for bottom button */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Price and Book Button */}
      <View style={styles.bottomContainer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.price}>₱{accommodation.price.toLocaleString()}/month</Text>
        </View>
        <TouchableOpacity style={styles.bookButton}>
          <Text style={styles.bookButtonText}>BOOK</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

