import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Menu/Favorites.js';
import SunshineDorm from '../../../../assets/SunshineDorm.jpeg';
import R101 from '../../../../assets/101.jpeg';

export default function Favorites() {
  const navigation = useNavigation();

  // Sample favorites data
  const [favorites, setFavorites] = useState([
    {
      id: 1,
      name: "Sunshine Dormitory",
      type: "Dormitory",
      image: SunshineDorm,
      rating: 4.8,
      reviews: 124,
      price: 5000,
      location: "Manila, Philippines",
      liked: true
    },
    {
      id: 3,
      name: "City Center Apartments",
      type: "Apartment",
      image: R101,
      rating: 4.7,
      reviews: 156,
      price: 4500,
      location: "Quezon City, Philippines",
      liked: true
    }
  ]);

  const handleUnlike = (id) => {
    setFavorites(favorites.filter(fav => fav.id !== id));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {favorites.length > 0 ? (
          favorites.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.card}
              onPress={() => navigation.navigate('AccommodationDetails', { accommodation: item })}
            >
              <Image source={item.image} style={styles.cardImage} />
              <TouchableOpacity 
                style={styles.likeButton}
                onPress={() => handleUnlike(item.id)}
              >
                <Ionicons name="heart" size={24} color="#EF4444" />
              </TouchableOpacity>
              
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.locationText}>{item.location}</Text>
                </View>
                <View style={styles.ratingRow}>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                  <Text style={styles.reviewsText}>({item.reviews} reviews)</Text>
                </View>
                <View style={styles.footer}>
                  <Text style={styles.price}>₱{item.price.toLocaleString()}/mo</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{item.type}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptyText}>Start adding accommodations to your favorites!</Text>
            <TouchableOpacity style={styles.exploreButton} onPress={() => navigation.navigate('TenantHome')}>
              <Text style={styles.exploreButtonText}>Explore Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

