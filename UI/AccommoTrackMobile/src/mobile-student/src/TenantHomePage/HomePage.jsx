import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/TenantHomePage.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';

export default function TenantHomePage() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('featured');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filterOptions = ['All', 'Dormitory', 'Apartment', 'Boarding House', 'Bed Spacer'];

  // Menu items
  const menuItems = [
    { id: 1, title: 'My Bookings', icon: 'calendar-outline', color: '#7C3AED' },
    { id: 2, title: 'Favorites', icon: 'heart-outline', color: '#EF4444' },
    { id: 3, title: 'Messages', icon: 'chatbubble-outline', color: '#3B82F6' },
    { id: 4, title: 'Payments', icon: 'card-outline', color: '#10B981' },
    { id: 5, title: 'Settings', icon: 'settings-outline', color: '#6B7280' },
    { id: 6, title: 'Help & Support', icon: 'help-circle-outline', color: '#F59E0B' },
    { id: 7, title: 'Logout', icon: 'log-out-outline', color: '#EF4444' },
  ];

  // Sample data - replace with API call later
  const featuredDorms = [
    {
      id: 1,
      name: "Sunshine Dormitory",
      type: "Dormitory",
      image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400",
      rating: 4.8,
      reviews: 124,
      price: 5000,
      location: "Manila, Philippines",
      amenities: ["WiFi", "Parking", "Kitchen", "AC"],
      liked: false
    },
    {
      id: 2,
      name: "Ocean View Residence",
      type: "Apartment",
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400",
      rating: 4.9,
      reviews: 98,
      price: 6500,
      location: "Makati, Philippines",
      amenities: ["WiFi", "Parking", "AC"],
      liked: false
    },
    {
      id: 3,
      name: "City Center Apartments",
      type: "Apartment",
      image: "https://images.unsplash.com/photo-1502672260066-6bc05c107e00?w=400",
      rating: 4.7,
      reviews: 156,
      price: 4500,
      location: "Quezon City, Philippines",
      amenities: ["WiFi", "Kitchen", "AC"],
      liked: true
    }
  ];

  const bestRatingDorms = [
    {
      id: 4,
      name: "Premium Student Lodge",
      type: "Boarding House",
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400",
      rating: 5.0,
      reviews: 89,
      price: 7000,
      location: "BGC, Philippines",
      amenities: ["WiFi", "Parking", "Kitchen", "AC"],
      liked: false
    },
    {
      id: 5,
      name: "Cozy Haven Dorm",
      type: "Dormitory",
      image: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=400",
      rating: 4.9,
      reviews: 145,
      price: 5500,
      location: "Pasig, Philippines",
      amenities: ["WiFi", "AC"],
      liked: false
    }
  ];

  const bestAmenitiesDorms = [
    {
      id: 6,
      name: "Luxury Student Suites",
      type: "Apartment",
      image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400",
      rating: 4.8,
      reviews: 76,
      price: 8000,
      location: "Ortigas, Philippines",
      amenities: ["WiFi", "Parking", "Kitchen", "AC"],
      liked: false
    },
    {
      id: 7,
      name: "Modern Living Spaces",
      type: "Boarding House",
      image: "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=400",
      rating: 4.7,
      reviews: 92,
      price: 6000,
      location: "Manila, Philippines",
      amenities: ["WiFi", "Parking", "Kitchen", "AC"],
      liked: true
    }
  ];

  const lowPriceDorms = [
    {
      id: 8,
      name: "Budget Friendly Dorm",
      type: "Bed Spacer",
      image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400",
      rating: 4.5,
      reviews: 134,
      price: 3000,
      location: "Mandaluyong, Philippines",
      amenities: ["WiFi", "Kitchen"],
      liked: false
    },
    {
      id: 9,
      name: "Affordable Student House",
      type: "Bed Spacer",
      image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400",
      rating: 4.4,
      reviews: 167,
      price: 3500,
      location: "Taguig, Philippines",
      amenities: ["WiFi", "AC"],
      liked: false
    }
  ];

  const getCurrentDorms = () => {
    let dorms;
    switch(activeTab) {
      case 'rating': dorms = bestRatingDorms; break;
      case 'amenities': dorms = bestAmenitiesDorms; break;
      case 'price': dorms = lowPriceDorms; break;
      default: dorms = featuredDorms;
    }

    // Apply filter
    if (selectedFilter === 'All') {
      return dorms;
    }
    return dorms.filter(dorm => dorm.type === selectedFilter);
  };

  const getAmenityIcon = (amenity) => {
    switch(amenity) {
      case 'WiFi': return 'wifi';
      case 'Parking': return 'car';
      case 'Kitchen': return 'restaurant';
      case 'AC': return 'snow';
      default: return 'checkmark-circle';
    }
  };

  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
    setFilterModalVisible(false);
  };

  const handleMenuItemPress = async (itemTitle) => {
  setMenuModalVisible(false);

  if (itemTitle === 'Logout') {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              navigation.replace('Auth');
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  } else {
    console.log('Menu item pressed:', itemTitle);
    // Add navigation to other menu items later
  }
};


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Hamburger and Account */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => setMenuModalVisible(true)}
          >
            <Ionicons name="menu" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>AccommoTrack</Text>
          
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="person-circle-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Hamburger Menu Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={menuModalVisible}
          onRequestClose={() => setMenuModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.menuBackdrop}
              activeOpacity={1}
              onPress={() => setMenuModalVisible(false)}
            />
            <View style={styles.menuDrawer}>
              {/* Menu Header */}
              <View style={styles.menuHeader}>
                <View style={styles.menuUserInfo}>
                  <View style={styles.menuAvatar}>
                    <Ionicons name="person" size={32} color="#7C3AED" />
                  </View>
                  <View>
                    <Text style={styles.menuUserName}>John Doe</Text>
                    <Text style={styles.menuUserEmail}>john.doe@example.com</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setMenuModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#111827" />
                </TouchableOpacity>
              </View>

              {/* Menu Items */}
              <ScrollView style={styles.menuItems}>
                {menuItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.menuItem}
                    onPress={() => handleMenuItemPress(item.title)}
                  >
                    <Ionicons name={item.icon} size={24} color={item.color} />
                    <Text style={styles.menuItemText}>{item.title}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Search Bar with Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            {/* Filter Button */}
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons name="options-outline" size={24} color="#7C3AED" />
              {selectedFilter !== 'All' && <View style={styles.filterBadge} />}
            </TouchableOpacity>

            <TextInput
              style={styles.searchInput}
              placeholder="Search by location, name, or amenities..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.searchButton}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>

          {/* Active Filter Display */}
          {selectedFilter !== 'All' && (
            <View style={styles.activeFilterContainer}>
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>{selectedFilter}</Text>
                <TouchableOpacity onPress={() => setSelectedFilter('All')}>
                  <Ionicons name="close-circle" size={18} color="#7C3AED" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Filter Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={filterModalVisible}
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter by Type</Text>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#111827" />
                </TouchableOpacity>
              </View>

              <View style={styles.filterOptionsContainer}>
                {filterOptions.map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterOption,
                      selectedFilter === filter && styles.filterOptionActive
                    ]}
                    onPress={() => handleFilterSelect(filter)}
                  >
                    <View style={styles.filterOptionContent}>
                      <Ionicons 
                        name={
                          filter === 'All' ? 'apps' :
                          filter === 'Dormitory' ? 'business' :
                          filter === 'Apartment' ? 'home' :
                          filter === 'Boarding House' ? 'home-outline' :
                          'bed'
                        } 
                        size={24} 
                        color={selectedFilter === filter ? '#7C3AED' : '#6B7280'} 
                      />
                      <Text style={[
                        styles.filterOptionText,
                        selectedFilter === filter && styles.filterOptionTextActive
                      ]}>
                        {filter}
                      </Text>
                    </View>
                    {selectedFilter === filter && (
                      <Ionicons name="checkmark-circle" size={24} color="#7C3AED" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'featured' && styles.tabActive]}
            onPress={() => setActiveTab('featured')}
          >
            <Text style={[styles.tabText, activeTab === 'featured' && styles.tabTextActive]}>
              ⭐ Featured
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rating' && styles.tabActive]}
            onPress={() => setActiveTab('rating')}
          >
            <Text style={[styles.tabText, activeTab === 'rating' && styles.tabTextActive]}>
              🏆 Best Rating
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'amenities' && styles.tabActive]}
            onPress={() => setActiveTab('amenities')}
          >
            <Text style={[styles.tabText, activeTab === 'amenities' && styles.tabTextActive]}>
              ✨ Best Amenities
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'price' && styles.tabActive]}
            onPress={() => setActiveTab('price')}
          >
            <Text style={[styles.tabText, activeTab === 'price' && styles.tabTextActive]}>
              💰 Low Prices
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Dormitory Cards */}
        <View style={styles.cardsContainer}>
          {getCurrentDorms().map((dorm) => (
            <View key={dorm.id} style={styles.card}>
              {/* Image */}
              <View style={styles.imageContainer}>
                <Image source={{ uri: dorm.image }} style={styles.image} />
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{dorm.type}</Text>
                </View>
                <TouchableOpacity style={styles.likeButton}>
                  <Ionicons
                    name={dorm.liked ? 'heart' : 'heart-outline'}
                    size={24}
                    color={dorm.liked ? '#EF4444' : '#4B5563'}
                  />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <Text style={styles.dormName}>{dorm.name}</Text>
                
                {/* Location */}
                <View style={styles.locationContainer}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.locationText}>{dorm.location}</Text>
                </View>

                {/* Rating */}
                <View style={styles.ratingContainer}>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.ratingText}>{dorm.rating}</Text>
                  </View>
                  <Text style={styles.reviewsText}>({dorm.reviews} reviews)</Text>
                </View>

                {/* Amenities */}
                <View style={styles.amenitiesContainer}>
                  {dorm.amenities.map((amenity, idx) => (
                    <View key={idx} style={styles.amenityBadge}>
                      <Ionicons name={getAmenityIcon(amenity)} size={14} color="#7C3AED" />
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>

                {/* Price and Button */}
                <View style={styles.footer}>
                  <View>
                    <Text style={styles.price}>₱{dorm.price.toLocaleString()}</Text>
                    <Text style={styles.priceLabel}>/month</Text>
                  </View>
                  <TouchableOpacity style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Load More Button */}
        <View style={styles.loadMoreContainer}>
          <TouchableOpacity style={styles.loadMoreButton}>
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}