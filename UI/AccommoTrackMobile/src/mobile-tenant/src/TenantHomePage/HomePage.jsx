import React, { useState, useEffect } from 'react';
import { View, ScrollView, StatusBar, TouchableOpacity, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Tenant/TenantHomePage.js';

import Header from '../components/Header.jsx';
import MenuDrawer from '../components/MenuDrawer.jsx';
import SearchBar from '../components/SearchBar.jsx';
import FilterModal from '../components/FilterModal.jsx';
import CategoryTabs from '../components/CategoryTabs.jsx';
import AccommodationCard from '../components/AccommodationCard.jsx';
import BottomNavigation from '../components/BottomNavigation.jsx';

import {
  featuredAccommodation,
  bestRatingAccommodation,
  bestAmenitiesAccommodation,
  lowPriceAccommodation
} from './Data/AccommodationData.js';

export default function TenantHomePage({ onLogout }) {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('featured');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [activeNavTab, setActiveNavTab] = useState('home');
  const [filteredAccommodations, setFilteredAccommodations] = useState([]);

  const getCurrentAccommodation = () => {
    let accommodation;
    switch (activeTab) {
      case 'rating': accommodation = bestRatingAccommodation; break;
      case 'amenities': accommodation = bestAmenitiesAccommodation; break;
      case 'price': accommodation = lowPriceAccommodation; break;
      default: accommodation = featuredAccommodation;
    }

    if (selectedFilter === 'All') {
      return accommodation;
    }
    return accommodation.filter(item => item.type === selectedFilter);
  };

  // Search functionality
  const handleSearch = () => {
    const baseAccommodations = getCurrentAccommodation();
    
    if (!searchQuery.trim()) {
      setFilteredAccommodations(baseAccommodations);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    const filtered = baseAccommodations.filter(accommodation => {
      // Search by name/title
      const matchesName = accommodation.name?.toLowerCase().includes(query) ||
                         accommodation.title?.toLowerCase().includes(query);
      
      // Search by location
      const matchesLocation = accommodation.location?.toLowerCase().includes(query) ||
                            accommodation.address?.toLowerCase().includes(query) ||
                            accommodation.city?.toLowerCase().includes(query);
      
      // Search by amenities
      const matchesAmenities = accommodation.amenities?.some(amenity => 
        amenity.toLowerCase().includes(query)
      );

      // Search by type
      const matchesType = accommodation.type?.toLowerCase().includes(query);

      // Search by owner/landlord name if available
      const matchesOwner = accommodation.ownerName?.toLowerCase().includes(query) ||
                          accommodation.landlord?.toLowerCase().includes(query);

      return matchesName || matchesLocation || matchesAmenities || matchesType || matchesOwner;
    });

    setFilteredAccommodations(filtered);
  };

  // Update filtered accommodations when tab, filter, or search changes
  useEffect(() => {
    handleSearch();
  }, [activeTab, selectedFilter, searchQuery]);

  // Selection FilterButton
  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
    setFilterModalVisible(false);
  };
  // Clear/Unclicked
  const handleClearFilter = () => {
    setSelectedFilter('All');
    setSearchQuery('');
  };

  const handleMenuItemPress = async (itemTitle) => {
    setMenuModalVisible(false);

    switch (itemTitle) {
      case 'My Bookings':
        navigation.navigate('MyBookings');
        break;
      case 'Favorites':
        navigation.navigate('Favorites');
        break;
      case 'Payments':
        navigation.navigate('Payments');
        break;
      case 'Settings':
        navigation.navigate('Settings');
        break;
      case 'Help & Support':
        navigation.navigate('HelpSupport');
        break;
      case 'Logout':
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

                  if (onLogout) {
                    onLogout();
                  }

                } catch (error) {
                  console.error('Logout error:', error);
                }
              }
            }
          ]
        );
        break;
      default:
        console.log('Menu item pressed:', itemTitle);
    }
  };

  const handleAccommodationPress = (accommodation) => {
    navigation.navigate('AccommodationDetails', { accommodation });
  };

  const handleLikePress = (id) => {
    console.log('Like pressed for:', id);
    // Toggle like status
  };

  // Get accommodations to display
  const accommodationsToDisplay = searchQuery.trim() 
    ? filteredAccommodations 
    : getCurrentAccommodation();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <Header
          onMenuPress={() => setMenuModalVisible(true)}
          onProfilePress={() => navigation.navigate('Profile')}
        />

        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterPress={() => setFilterModalVisible(true)}
          onSearchPress={handleSearch}
          selectedFilter={selectedFilter}
          onClearFilter={handleClearFilter}
        />

        <CategoryTabs
          activeTab={activeTab}
          onTabPress={setActiveTab}
        />

        {/* Accommodation Cards */}
        <View style={styles.cardsContainer}>
          {accommodationsToDisplay.length > 0 ? (
            accommodationsToDisplay.map((accommodation) => (
              <AccommodationCard
                key={accommodation.id}
                accommodation={accommodation}
                onPress={handleAccommodationPress}
                onLikePress={handleLikePress}
              />
            ))
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                No accommodations found for "{searchQuery}"
              </Text>
            </View>
          )}
        </View>

        {/* Load More Button */}
        {accommodationsToDisplay.length > 0 && (
          <View style={styles.loadMoreContainer}>
            <TouchableOpacity style={styles.loadMoreButton}>
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <MenuDrawer
        visible={menuModalVisible}
        onClose={() => setMenuModalVisible(false)}
        onMenuItemPress={handleMenuItemPress}
      />

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        selectedFilter={selectedFilter}
        onFilterSelect={handleFilterSelect}
      />

      <BottomNavigation
        activeTab={activeNavTab}
        onTabPress={setActiveNavTab}
      />
    </SafeAreaView>
  );
}