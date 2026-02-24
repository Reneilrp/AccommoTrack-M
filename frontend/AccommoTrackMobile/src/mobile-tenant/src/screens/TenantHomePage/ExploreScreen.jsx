import { useState, useEffect } from 'react';
import { View, ScrollView, FlatList, StatusBar, TouchableOpacity, Text, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../../styles/Tenant/HomePage.js';
import { useTheme } from '../../../../contexts/ThemeContext';

import MenuDrawer from '../../components/MenuDrawer.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import PropertyCard from '../../components/PropertyCard.jsx';
import { PropertyCardSkeleton } from '../../../../components/Skeletons';
import Header from '../../components/Header.jsx';

import PropertyService from '../../../../services/PropertyServices.js';

export default function TenantHomePage({ onLogout, isGuest = false, onAuthRequired }) {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('featured');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [activeNavTab, setActiveNavTab] = useState('Explore');

  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { theme } = useTheme();

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
        const transformedProperties = result.data.map(property =>
          PropertyService.transformPropertyToAccommodation(property)
        );

        setProperties(transformedProperties);
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

        // Special case: BedSpacer filter
        if (filterType === 'bedspacer') {
          const hasBedSpacer = prop.has_bedspacer_room === true || 
                               prop.has_bedspacer_room === 'true' || 
                               prop.has_bedspacer_room === 1;
          return hasBedSpacer || 
                 propType === 'bedspacer' || 
                 propType.includes('bed') || 
                 propType.includes('spacer');
        }

        const typeMap = {
          'boardinghouse': ['boarding', 'house', 'boardinghouse'],
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
    loadProperties();
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

    if (isGuest) {
      const protectedItems = [
        'Dashboard', 
        'My Bookings', 
        'Favorites', 
        'Payments', 
        'Notifications',
        'My Maintenance Requests',
        'My Addon Requests'
      ];
      
      if (protectedItems.includes(itemTitle)) {
        if (onAuthRequired) {
          onAuthRequired();
        }
        return;
      }
    }

    switch (itemTitle) {
      case 'Dashboard':
        navigation.navigate('Dashboard');
        break;
      case 'Future UI Demo':
        navigation.navigate('DemoUI');
        break;
      case 'Notifications':
        navigation.navigate('Notifications');
        break;
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
      case 'My Maintenance Requests':
        navigation.navigate('MyMaintenanceRequests');
        break;
      case 'My Addon Requests':
        navigation.navigate('Addons');
        break;
      case 'Logout':
        if (isGuest) {
          if (onAuthRequired) {
            onAuthRequired();
          }
        } else {
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
        }
        break;
      default:
        console.log('Menu item pressed:', itemTitle);
    }
  };

  const handleAccommodationPress = (accommodation) => {
    navigation.navigate('AccommodationDetails', { accommodation, hideLayout: true });
  };

  const handleLikePress = async (id) => {
    if (isGuest) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to save favorites.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => {
              if (onAuthRequired) {
                onAuthRequired();
              }
            }
          }
        ]
      );
      return;
    }
    
    console.log('Like pressed for:', id);
  };

  const handleProfilePress = () => {
    if (isGuest) {
      if (onAuthRequired) {
        onAuthRequired();
      }
    } else {
      navigation.navigate('Profile');
    }
  };

  if (loading && properties.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" />
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchPress={handleSearch}
          selectedFilter={selectedFilter}
          onClearFilter={handleClearFilter}
          properties={properties}
          userRole={isGuest ? 'guest' : 'authenticated'}
          onSelectProperty={() => {}}
        />

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
                selectedFilter === filter.value && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => handleFilterSelect(filter.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === filter.value && styles.filterButtonTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.contentContainerPadding}>
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
        </ScrollView>
        <MenuDrawer
          visible={menuModalVisible}
          onClose={() => setMenuModalVisible(false)}
          onMenuItemPress={handleMenuItemPress}
          isGuest={isGuest}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchPress={handleSearch}
          properties={properties}
          userRole={isGuest ? 'guest' : 'authenticated'}
          onSelectProperty={handleAccommodationPress}
        />

        {isGuest && (
          <TouchableOpacity
            style={styles.guestBanner}
            onPress={() => onAuthRequired && onAuthRequired()}
          >
            <View style={styles.guestBannerContent}>
              <Text style={styles.guestBannerText}>
                👋 Browse properties as a guest or{' '}
                <Text style={styles.guestBannerLink}>Sign In</Text>
                {' '}to book
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadProperties} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PropertyCard
              accommodation={item}
              onPress={handleAccommodationPress}
              onLikePress={handleLikePress}
            />
          )}
          contentContainerStyle={styles.contentContainerPadding}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={!loading ? (
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
        />

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

        <MenuDrawer
          visible={menuModalVisible}
          onClose={() => setMenuModalVisible(false)}
          onMenuItemPress={handleMenuItemPress}
          isGuest={isGuest}
        />
    </View>
  );
}
