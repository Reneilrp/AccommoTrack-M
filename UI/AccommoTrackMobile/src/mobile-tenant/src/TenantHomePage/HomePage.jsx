import React, { useState, useEffect } from 'react';
import { View, ScrollView, StatusBar, TouchableOpacity, Text, Alert, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Tenant/HomePage.js';

import Header from '../components/Header.jsx';
import MenuDrawer from '../components/MenuDrawer.jsx';
import SearchBar from '../components/SearchBar.jsx';
// import FilterModal from '../components/FilterModal.jsx'; // Commented out since we're using buttons now
import PropertyCard from '../components/PropertyCard.jsx';
import BottomNavigation from '../components/BottomNavigation.jsx';

import PropertyService from '../../../services/PropertyServices.js';

export default function TenantHomePage({ onLogout }) {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('featured');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [activeNavTab, setActiveNavTab] = useState('home');

  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter options matching your screenshot and backend types
  const filterOptions = [
    { label: 'All', value: 'All' },
    { label: 'Dormitory', value: 'dormitory' },
    { label: 'Apartment', value: 'apartment' },
    { label: 'Boarding House', value: 'boardingHouse' },
    { label: 'Bed Spacer', value: 'bedSpacer' },
  ];

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    filterProperties();
  }, [properties, searchQuery, selectedFilter, activeTab]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {};
      if (selectedFilter !== 'All') {
        filters.type = selectedFilter;
      }

      const result = await PropertyService.getPublicProperties(filters);

      if (result.success) {
        // DEBUG: Check raw data from API
        console.log('=== RAW API DATA ===');
        console.log('First property:', JSON.stringify(result.data[0], null, 2));

        const transformedProperties = result.data.map(property =>
          PropertyService.transformPropertyToAccommodation(property)
        );

        // DEBUG: Check transformed data
        console.log('=== TRANSFORMED DATA ===');
        console.log('First transformed:', JSON.stringify(transformedProperties[0], null, 2));
        console.log('Total properties:', transformedProperties.length);

        setProperties(transformedProperties);
        console.log('Properties set in state');
      } else {
        setError(result.error || 'Failed to load properties');
        Alert.alert('Error', 'Failed to load properties. Please try again.');
      }
    } catch (err) {
      console.error('Error loading properties:', err);
      setError(err.message);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProperties();
    setRefreshing(false);
  };

  const filterProperties = () => {
    let filtered = [...properties];

    if (selectedFilter !== 'All') {
      filtered = filtered.filter(prop => {
        const propType = (prop.type || '').toLowerCase().replace(/\s+/g, '');
        const filterType = selectedFilter.toLowerCase();

        // Match variations
        const typeMap = {
          'boardinghouse': ['boarding', 'house', 'boardinghouse'],
          'bedspacer': ['bed', 'spacer', 'bedspacer'],
          'dormitory': ['dorm', 'dormitory'],
          'apartment': ['apartment', 'apt']
        };

        return propType === filterType ||
          propType.includes(filterType) ||
          (typeMap[filterType] && typeMap[filterType].some(t => propType.includes(t)));
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(property => {
        const matchesName = property.name?.toLowerCase().includes(query) ||
          property.title?.toLowerCase().includes(query);
        const matchesLocation = property.location?.toLowerCase().includes(query) ||
          property.address?.toLowerCase().includes(query) ||
          property.city?.toLowerCase().includes(query) ||
          property.barangay?.toLowerCase().includes(query);
        const matchesAmenities = property.amenities?.some(amenity =>
          amenity.toLowerCase().includes(query)
        );
        const matchesType = property.type?.toLowerCase().includes(query);

        return matchesName || matchesLocation || matchesAmenities || matchesType;
      });
    }

    switch (activeTab) {
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'amenities':
        filtered.sort((a, b) => (b.amenities?.length || 0) - (a.amenities?.length || 0));
        break;
      case 'price':
        filtered.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
        break;
      case 'featured':
      default:
        break;
    }

    setFilteredProperties(filtered);
  };

  const handleFilterSelect = (filterValue) => {
    setSelectedFilter(filterValue);
    loadProperties(); // Reload with new filter
  };

  const handleClearFilter = () => {
    setSelectedFilter('All');
    setSearchQuery('');
    loadProperties();
  };

  const handleSearch = () => {
    filterProperties();
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

  const handleLikePress = async (id) => {
    console.log('Like pressed for:', id);
    // TODO: Implement favorites functionality
  };

  if (loading && properties.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StatusBar barStyle="light-content" />
        <Header
          onMenuPress={() => setMenuModalVisible(true)}
          onProfilePress={() => navigation.navigate('Profile')}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
        <MenuDrawer
          visible={menuModalVisible}
          onClose={() => setMenuModalVisible(false)}
          onMenuItemPress={handleMenuItemPress}
        />
        <BottomNavigation
          activeTab={activeNavTab}
          onTabPress={setActiveNavTab}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10b981']}
            tintColor="#10b981"
          />
        }
      >
        <Header
          onMenuPress={() => setMenuModalVisible(true)}
          onProfilePress={() => navigation.navigate('Profile')}
        />

        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchPress={handleSearch}
          selectedFilter={selectedFilter}
          onClearFilter={handleClearFilter}
        />

        {/* NEW: Filter Buttons Row (matches your screenshot) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterButtonsRow}
          contentContainerStyle={styles.filterButtonsContainer}
        >
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterButton,
                selectedFilter === filter.value && styles.filterButtonActive
              ]}
              onPress={() => handleFilterSelect(filter.value)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedFilter === filter.value && styles.filterButtonTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadProperties} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.cardsContainer}>
          {filteredProperties.length > 0 ? (
            filteredProperties.map((accommodation) => (
              <PropertyCard
                key={accommodation.id}
                accommodation={accommodation}
                onPress={handleAccommodationPress}
                onLikePress={handleLikePress}
              />
            ))
          ) : !loading ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                {searchQuery.trim()
                  ? `No properties found for "${searchQuery}"`
                  : 'No properties available at the moment'
                }
              </Text>
              {searchQuery.trim() && (
                <TouchableOpacity onPress={handleClearFilter} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>

        {filteredProperties.length > 0 && filteredProperties.length >= 10 && (
          <View style={styles.loadMoreContainer}>
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() => {
                Alert.alert('Coming Soon', 'Pagination will be implemented soon!');
              }}
            >
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

      {/* FilterModal is no longer needed with buttons, but keep if you want
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        selectedFilter={selectedFilter}
        onFilterSelect={handleFilterSelect}
      /> */}

      <BottomNavigation
        activeTab={activeNavTab}
        onTabPress={setActiveNavTab}
      />
    </SafeAreaView>
  );
}