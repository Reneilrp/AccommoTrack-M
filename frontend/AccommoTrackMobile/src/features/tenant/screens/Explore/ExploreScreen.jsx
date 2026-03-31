import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  FlatList,
  StatusBar,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { Ionicons } from '@expo/vector-icons';
import { getStyles } from "../../../../styles/Tenant/HomePage.js";
import { useTheme } from "../../../../contexts/ThemeContext.jsx";

import MenuDrawer from "../../components/MenuDrawer.jsx";
import SearchBar from "../../components/SearchBar.jsx";
import PropertyCard from "../../components/PropertyCard.jsx";
import { PropertyCardSkeleton } from "../../../../components/Skeletons/index.jsx";
import Header from "../../components/Header.jsx";

import PropertyService from "../../../../services/PropertyService.js";
import { navigate as rootNavigate } from "../../../../navigation/RootNavigation.js";

const DEFAULT_ADVANCED_FILTERS = {
  minPrice: "",
  maxPrice: "",
  availabilityOnly: false,
  minRating: 0,
  amenities: [],
};

export default function TenantHomePage({
  onLogout,
  isGuest = false,
  onAuthRequired,
}) {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("featured");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedCurfew, setSelectedCurfew] = useState(null);
  const [advancedFilters, setAdvancedFilters] = useState({
    ...DEFAULT_ADVANCED_FILTERS,
  });
  const [draftAdvancedFilters, setDraftAdvancedFilters] = useState({
    ...DEFAULT_ADVANCED_FILTERS,
  });
  const [curfewModalVisible, setCurfewModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState("Explore");
  const [showGuestBanner, setShowGuestBanner] = useState(true);

  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter options matching your screenshot and backend types
  const filterOptions = [
    { label: "All", value: "All" },
    { label: "Dormitory", value: "dormitory" },
    { label: "Apartment", value: "apartment" },
    { label: "Boarding House", value: "boardingHouse" },
    { label: "Bed Spacer", value: "bedSpacer" },
  ];

  const genderOptions = [
    { label: "All Genders", value: "All" },
    { label: "Mixed", value: "mixed" },
    { label: "Boys Only", value: "male" },
    { label: "Girls Only", value: "female" },
  ];

  useEffect(() => {
    filterProperties();
  }, [
    properties,
    searchQuery,
    activeTab,
    selectedFilter,
    selectedCurfew,
    selectedGender,
    advancedFilters,
  ]);

  const loadProperties = useCallback(async (override = {}) => {
    try {
      if (properties.length === 0) {
        setLoading(true);
      }
      setError(null);

      const effectiveType = override.type ?? selectedFilter;
      const effectiveAdvancedFilters =
        override.advancedFilters ?? advancedFilters;

      const filters = {};
      if (effectiveType !== "All") {
        filters.type = effectiveType;
      }
      if (effectiveAdvancedFilters.minPrice) {
        filters.min_price = effectiveAdvancedFilters.minPrice;
      }
      if (effectiveAdvancedFilters.maxPrice) {
        filters.max_price = effectiveAdvancedFilters.maxPrice;
      }
      if (effectiveAdvancedFilters.availabilityOnly) {
        filters.availability = "1";
      }
      if (Number(effectiveAdvancedFilters.minRating) > 0) {
        filters.min_rating = Number(effectiveAdvancedFilters.minRating);
      }
      if (Array.isArray(effectiveAdvancedFilters.amenities) && effectiveAdvancedFilters.amenities.length > 0) {
        filters.amenities = effectiveAdvancedFilters.amenities;
      }

      const result = await PropertyService.getPublicProperties(filters);

      if (result.success) {
        const transformedProperties = result.data.map((property) =>
          PropertyService.transformPropertyToAccommodation(property),
        );

        setProperties(transformedProperties);
      } else {
        setError(result.error || "Failed to load properties");
        Alert.alert("Error", "Failed to load properties. Please try again.");
      }
    } catch (err) {
      console.error("Error loading properties:", err);
      setError(err.message);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [advancedFilters, properties.length, selectedFilter]);

  useFocusEffect(
    useCallback(() => {
      loadProperties();
    }, [loadProperties])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setShowGuestBanner(true); // Show banner again on refresh
    await loadProperties();
    setRefreshing(false);
  };

  const filterProperties = () => {
    let filtered = [...properties];

    if (selectedFilter !== "All") {
      filtered = filtered.filter((prop) => {
        const propType = (prop.type || "").toLowerCase().replace(/\s+/g, "");
        const filterType = selectedFilter.toLowerCase();

        // Special case: BedSpacer filter
        if (filterType === "bedspacer") {
          const hasBedSpacer =
            prop.has_bedspacer_room === true ||
            prop.has_bedspacer_room === "true" ||
            prop.has_bedspacer_room === 1;
          return (
            hasBedSpacer ||
            propType === "bedspacer" ||
            propType.includes("bed") ||
            propType.includes("spacer")
          );
        }

        const typeMap = {
          boardinghouse: ["boarding", "house", "boardinghouse"],
          dormitory: ["dorm", "dormitory"],
          apartment: ["apartment", "apt"],
        };

        return (
          propType === filterType ||
          propType.includes(filterType) ||
          (typeMap[filterType] &&
            typeMap[filterType].some((t) => propType.includes(t)))
        );
      });
    }

    const minPrice = Number(advancedFilters.minPrice);
    if (Number.isFinite(minPrice) && minPrice > 0) {
      filtered = filtered.filter((prop) => Number(prop.minPrice || 0) >= minPrice);
    }

    const maxPrice = Number(advancedFilters.maxPrice);
    if (Number.isFinite(maxPrice) && maxPrice > 0) {
      filtered = filtered.filter((prop) => Number(prop.minPrice || 0) <= maxPrice);
    }

    if (advancedFilters.availabilityOnly) {
      filtered = filtered.filter((prop) => Number(prop.availableRooms || prop.available_rooms || 0) > 0);
    }

    if (Number(advancedFilters.minRating) > 0) {
      filtered = filtered.filter((prop) => Number(prop.rating || 0) >= Number(advancedFilters.minRating));
    }

    if (Array.isArray(advancedFilters.amenities) && advancedFilters.amenities.length > 0) {
      const selectedAmenities = advancedFilters.amenities.map((amenity) => String(amenity).toLowerCase());
      filtered = filtered.filter((prop) => {
        const propertyAmenities = (prop.amenities || []).map((amenity) => String(amenity).toLowerCase());
        return selectedAmenities.some((amenity) => propertyAmenities.includes(amenity));
      });
    }

    if (selectedGender !== "All") {
      filtered = filtered.filter((prop) => {
        const propGender = (prop.gender_restriction || "mixed").toLowerCase();
        return propGender === selectedGender.toLowerCase();
      });
    }

    if (selectedCurfew) {
        const timeToMinutes = (timeStr) => {
            if (!timeStr || typeof timeStr !== 'string') return null;
            const lowerTime = timeStr.toLowerCase();
            if (lowerTime === 'none') return Infinity; // Or a very large number

            const match = lowerTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
            if (!match) return null;

            let hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const isPm = match[3] === 'pm';

            if (isPm && hours < 12) hours += 12;
            if (!isPm && hours === 12) hours = 0; // 12 AM is midnight

            // Treat early morning curfews as "late"
            if (hours >= 0 && hours <= 4) {
                hours += 24;
            }
            
            return hours * 60 + minutes;
        };
        
        const selectedMinutes = timeToMinutes(selectedCurfew);

        if (selectedMinutes !== null) {
            if (selectedMinutes === Infinity) { // "No Curfew"
                 filtered = filtered.filter(prop => !prop.curfew_time || prop.curfew_time.toLowerCase() === 'none');
            } else {
                filtered = filtered.filter(prop => {
                    const propMinutes = timeToMinutes(prop.curfew_time);
                    return propMinutes !== null && propMinutes <= selectedMinutes;
                });
            }
        }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((property) => {
        const matchesName =
          property.name?.toLowerCase().includes(query) ||
          property.title?.toLowerCase().includes(query);
        const matchesLocation =
          property.location?.toLowerCase().includes(query) ||
          property.address?.toLowerCase().includes(query) ||
          property.city?.toLowerCase().includes(query) ||
          property.barangay?.toLowerCase().includes(query);
        const matchesAmenities = property.amenities?.some((amenity) =>
          amenity.toLowerCase().includes(query),
        );
        const matchesType = property.type?.toLowerCase().includes(query);

        return (
          matchesName || matchesLocation || matchesAmenities || matchesType
        );
      });
    }

    switch (activeTab) {
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "amenities":
        filtered.sort(
          (a, b) => (b.amenities?.length || 0) - (a.amenities?.length || 0),
        );
        break;
      case "price":
        filtered.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
        break;
      case "featured":
      default:
        break;
    }

    setFilteredProperties(filtered);
  };

  const handleCurfewSelect = (curfew) => {
    setSelectedCurfew(curfew);
    setCurfewModalVisible(false);
  };

  const handleFilterSelect = (filterValue) => {
    setSelectedFilter(filterValue);
    loadProperties({ type: filterValue });
  };

  const handleClearFilter = () => {
    const resetAdvanced = { ...DEFAULT_ADVANCED_FILTERS };
    setSelectedFilter("All");
    setSelectedGender("All");
    setSelectedCurfew(null);
    setSearchQuery("");
    setAdvancedFilters(resetAdvanced);
    setDraftAdvancedFilters(resetAdvanced);
    loadProperties({ type: "All", advancedFilters: resetAdvanced });
  };

  const advancedFilterCount =
    (advancedFilters.minPrice ? 1 : 0) +
    (advancedFilters.maxPrice ? 1 : 0) +
    (advancedFilters.availabilityOnly ? 1 : 0) +
    (Number(advancedFilters.minRating) > 0 ? 1 : 0) +
    (advancedFilters.amenities?.length > 0 ? 1 : 0);

  const availableAmenities = Array.from(
    new Set(
      properties.flatMap((property) =>
        Array.isArray(property.amenities)
          ? property.amenities.map((amenity) => String(amenity).trim()).filter(Boolean)
          : [],
      ),
    ),
  ).slice(0, 16);

  const openAdvancedFilters = () => {
    setDraftAdvancedFilters({
      ...advancedFilters,
      amenities: [...(advancedFilters.amenities || [])],
    });
    setFilterModalVisible(true);
  };

  const applyAdvancedFilters = () => {
    const nextFilters = {
      minPrice: String(draftAdvancedFilters.minPrice || "").replace(/[^0-9]/g, ""),
      maxPrice: String(draftAdvancedFilters.maxPrice || "").replace(/[^0-9]/g, ""),
      availabilityOnly: Boolean(draftAdvancedFilters.availabilityOnly),
      minRating: Number(draftAdvancedFilters.minRating) || 0,
      amenities: Array.from(
        new Set(
          (draftAdvancedFilters.amenities || [])
            .map((amenity) => String(amenity).trim())
            .filter(Boolean),
        ),
      ),
    };

    if (
      Number(nextFilters.minPrice) > 0
      && Number(nextFilters.maxPrice) > 0
      && Number(nextFilters.minPrice) > Number(nextFilters.maxPrice)
    ) {
      Alert.alert('Invalid Price Range', 'Minimum price cannot be greater than maximum price.');
      return;
    }

    setAdvancedFilters(nextFilters);
    setFilterModalVisible(false);
    loadProperties({ advancedFilters: nextFilters });
  };

  const clearAdvancedFilters = () => {
    const resetAdvanced = { ...DEFAULT_ADVANCED_FILTERS };
    setDraftAdvancedFilters(resetAdvanced);
    setAdvancedFilters(resetAdvanced);
    setFilterModalVisible(false);
    loadProperties({ advancedFilters: resetAdvanced });
  };

  const renderFilterControls = () => (
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
            selectedFilter === filter.value && {
              backgroundColor: theme.colors.primary,
            },
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

      <TouchableOpacity
        style={[
          styles.filterButton,
          selectedCurfew && {
            backgroundColor: theme.colors.primary,
          },
        ]}
        onPress={() => setCurfewModalVisible(true)}
      >
        <Text
          style={[
            styles.filterButtonText,
            selectedCurfew && styles.filterButtonTextActive,
          ]}
        >
          {selectedCurfew ? `${selectedCurfew}` : "Curfew"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterButton,
          selectedGender !== "All" && {
            backgroundColor: theme.colors.primary,
          },
        ]}
        onPress={() => setGenderModalVisible(true)}
      >
        <Text
          style={[
            styles.filterButtonText,
            selectedGender !== "All" && styles.filterButtonTextActive,
          ]}
        >
          {selectedGender !== "All"
            ? genderOptions.find((o) => o.value === selectedGender)?.label
            : "Gender"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterButton,
          advancedFilterCount > 0 && { backgroundColor: theme.colors.primary },
        ]}
        onPress={openAdvancedFilters}
      >
        <Text
          style={[
            styles.filterButtonText,
            advancedFilterCount > 0 && styles.filterButtonTextActive,
          ]}
        >
          {advancedFilterCount > 0 ? `Advanced (${advancedFilterCount})` : "Advanced"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterButton,
          mapModalVisible && { backgroundColor: theme.colors.primary },
        ]}
        onPress={() => setMapModalVisible(true)}
      >
        <Text
          style={[
            styles.filterButtonText,
            mapModalVisible && styles.filterButtonTextActive,
          ]}
        >
          Map View
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const mapProperties = filteredProperties
    .filter(
      (property) =>
        Number.isFinite(Number(property.latitude)) &&
        Number.isFinite(Number(property.longitude)),
    )
    .map((property) => ({
      id: property.id,
      name: property.name || property.title || "Property",
      address: property.address || property.location || "",
      latitude: Number(property.latitude),
      longitude: Number(property.longitude),
    }));

  const getExploreMapHTML = () => {
    if (mapProperties.length === 0) return null;
    const encodedData = JSON.stringify(mapProperties)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
          <style>
            html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
            .leaflet-popup-content { font-size: 12px; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
          <script>
            var properties = ${encodedData};
            var first = properties[0];
            var map = L.map('map').setView([first.latitude, first.longitude], properties.length > 1 ? 13 : 15);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);

            var bounds = L.latLngBounds([]);
            properties.forEach(function(item) {
              var marker = L.marker([item.latitude, item.longitude]).addTo(map);
              marker.bindPopup('<strong>' + item.name + '</strong><br />' + (item.address || ''));
              marker.on('click', function() {
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(String(item.id));
                }
              });
              bounds.extend([item.latitude, item.longitude]);
            });

            if (properties.length > 1) {
              map.fitBounds(bounds.pad(0.2));
            }
          </script>
        </body>
      </html>
    `;
  };

  const handleMapMarkerPress = (propertyId) => {
    const selected = filteredProperties.find(
      (property) => String(property.id) === String(propertyId),
    );
    if (!selected) return;

    setMapModalVisible(false);
    handleAccommodationPress(selected);
  };

  const handleSearch = () => {
    filterProperties();
  };

  const handleMenuItemPress = async (itemTitle) => {
    setMenuModalVisible(false);

    if (isGuest) {
      const protectedItems = [
        "Dashboard",
        "My Bookings",
        "Payments",
        "Notifications",
        "My Maintenance Requests",
        "My Addon Requests",
      ];

      if (protectedItems.includes(itemTitle)) {
        if (onAuthRequired) {
          onAuthRequired();
        }
        return;
      }
    }

    switch (itemTitle) {
      case "Dashboard":
        rootNavigate("Dashboard");
        break;
      case "Notifications":
        rootNavigate("Notifications");
        break;
      case "My Bookings":
        rootNavigate("MyBookings");
        break;
      case "Payments":
        rootNavigate("Payments");
        break;
      case "Settings":
        rootNavigate("Settings");
        break;
      case "Help & Support":
        rootNavigate("HelpSupport");
        break;
      case "My Maintenance Requests":
        rootNavigate("MyMaintenanceRequests");
        break;
      case "My Addon Requests":
        rootNavigate("Addons");
        break;
      case "Logout":
        if (isGuest) {
          if (onAuthRequired) {
            onAuthRequired();
          }
        } else {
          Alert.alert("Logout", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Logout",
              style: "destructive",
              onPress: async () => {
                try {
                  await AsyncStorage.removeItem("token");
                  await AsyncStorage.removeItem("user");
                  if (onLogout) {
                    onLogout();
                  }
                } catch (error) {
                  console.error("Logout error:", error);
                }
              },
            },
          ]);
        }
        break;
      default:
        console.log("Menu item pressed:", itemTitle);
    }
  };

  const handleAccommodationPress = (accommodation) => {
    navigation.navigate("AccommodationDetails", {
      accommodation,
      hideLayout: true,
    });
  };

  const handleLikePress = async (id) => {
    if (isGuest) {
      Alert.alert(
        "Sign In Required",
        "You need to sign in to save favorites.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign In",
            onPress: () => {
              if (onAuthRequired) {
                onAuthRequired();
              }
            },
          },
        ],
      );
      return;
    }

    console.log("Like pressed for:", id);
  };

  const handleProfilePress = () => {
    if (isGuest) {
      if (onAuthRequired) {
        onAuthRequired();
      }
    } else {
      navigation.navigate("Profile");
    }
  };

  if (loading && properties.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <StatusBar barStyle="light-content" />
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchPress={handleSearch}
          selectedFilter={selectedFilter}
          onClearFilter={handleClearFilter}
          properties={properties}
          userRole={isGuest ? "guest" : "authenticated"}
          onSelectProperty={() => {}}
        />

        {renderFilterControls()}

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
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchPress={handleSearch}
        properties={properties}
        userRole={isGuest ? "guest" : "authenticated"}
        onSelectProperty={handleAccommodationPress}
      />

      {isGuest && showGuestBanner && (
        <View style={styles.guestBanner}>
          <TouchableOpacity
            style={styles.guestBannerContent}
            onPress={() => onAuthRequired && onAuthRequired()}
          >
            <Text style={styles.guestBannerText}>
              👋 Browse properties as a guest or{" "}
              <Text style={styles.guestBannerLink}>Sign In</Text> to book
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowGuestBanner(false)}
            style={{
              padding: 8,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadProperties} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderFilterControls()}

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
        ListEmptyComponent={
          !loading ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                {searchQuery.trim()
                  ? `No properties found for "${searchQuery}"`
                  : "No properties available at the moment"}
              </Text>
              {searchQuery.trim() && (
                <TouchableOpacity
                  onPress={handleClearFilter}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearButtonText}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />

      <MenuDrawer
        visible={menuModalVisible}
        onClose={() => setMenuModalVisible(false)}
        onMenuItemPress={handleMenuItemPress}
        isGuest={isGuest}
      />

      <Modal
        visible={mapModalVisible}
        animationType="slide"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View
            style={{
              height: 56,
              backgroundColor: theme.colors.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
              Explore on Map
            </Text>
            <TouchableOpacity onPress={() => setMapModalVisible(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {getExploreMapHTML() ? (
            <WebView
              originWhitelist={["*"]}
              source={{ html: getExploreMapHTML() }}
              onMessage={(event) => handleMapMarkerPress(event.nativeEvent.data)}
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
              )}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
              <Ionicons name="map-outline" size={52} color={theme.colors.textTertiary} />
              <Text style={{ marginTop: 12, color: theme.colors.textSecondary, textAlign: 'center' }}>
                No mappable properties found for the current filters.
              </Text>
            </View>
          )}
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.centeredView}
          activeOpacity={1}
          onPressOut={() => setFilterModalVisible(false)}
        >
          <View
            style={[styles.modalView, { width: '88%', padding: 20, alignItems: 'stretch' }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalText}>Advanced Filters</Text>

            <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
              Minimum Price
            </Text>
            <TextInput
              value={draftAdvancedFilters.minPrice}
              onChangeText={(value) =>
                setDraftAdvancedFilters((prev) => ({
                  ...prev,
                  minPrice: value.replace(/[^0-9]/g, ''),
                }))
              }
              keyboardType="numeric"
              placeholder="e.g. 2500"
              placeholderTextColor={theme.colors.textTertiary}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: theme.colors.text,
                marginBottom: 12,
                backgroundColor: theme.colors.backgroundSecondary,
              }}
            />

            <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
              Maximum Price
            </Text>
            <TextInput
              value={draftAdvancedFilters.maxPrice}
              onChangeText={(value) =>
                setDraftAdvancedFilters((prev) => ({
                  ...prev,
                  maxPrice: value.replace(/[^0-9]/g, ''),
                }))
              }
              keyboardType="numeric"
              placeholder="e.g. 8000"
              placeholderTextColor={theme.colors.textTertiary}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: theme.colors.text,
                marginBottom: 12,
                backgroundColor: theme.colors.backgroundSecondary,
              }}
            />

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 12,
                backgroundColor: theme.colors.backgroundSecondary,
              }}
              onPress={() =>
                setDraftAdvancedFilters((prev) => ({
                  ...prev,
                  availabilityOnly: !prev.availabilityOnly,
                }))
              }
            >
              <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Available Rooms Only</Text>
              <Ionicons
                name={draftAdvancedFilters.availabilityOnly ? 'checkbox' : 'square-outline'}
                size={20}
                color={draftAdvancedFilters.availabilityOnly ? theme.colors.primary : theme.colors.textTertiary}
              />
            </TouchableOpacity>

            <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
              Minimum Rating
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              {[0, 1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor:
                      Number(draftAdvancedFilters.minRating) === rating
                        ? theme.colors.primary
                        : theme.colors.backgroundSecondary,
                    borderWidth: 1,
                    borderColor:
                      Number(draftAdvancedFilters.minRating) === rating
                        ? theme.colors.primary
                        : theme.colors.border,
                  }}
                  onPress={() =>
                    setDraftAdvancedFilters((prev) => ({
                      ...prev,
                      minRating: rating,
                    }))
                  }
                >
                  <Text
                    style={{
                      color:
                        Number(draftAdvancedFilters.minRating) === rating
                          ? '#fff'
                          : theme.colors.textSecondary,
                      fontWeight: '700',
                    }}
                  >
                    {rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {availableAmenities.length > 0 && (
              <>
                <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                  Amenities
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {availableAmenities.map((amenity) => {
                    const isSelected = (draftAdvancedFilters.amenities || []).includes(amenity);
                    return (
                      <TouchableOpacity
                        key={amenity}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          backgroundColor: isSelected ? theme.colors.primary + '15' : theme.colors.backgroundSecondary,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                        onPress={() => {
                          setDraftAdvancedFilters((prev) => {
                            const currentAmenities = prev.amenities || [];
                            const nextAmenities = currentAmenities.includes(amenity)
                              ? currentAmenities.filter((item) => item !== amenity)
                              : [...currentAmenities, amenity];
                            return { ...prev, amenities: nextAmenities };
                          });
                        }}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={14}
                          color={isSelected ? theme.colors.primary : theme.colors.textTertiary}
                        />
                        <Text
                          style={{
                            color: isSelected ? theme.colors.primary : theme.colors.textSecondary,
                            fontSize: 12,
                            fontWeight: isSelected ? '700' : '600',
                          }}
                        >
                          {amenity}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <TouchableOpacity style={styles.modalButton} onPress={applyAdvancedFilters}>
              <Text style={styles.modalButtonText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={clearAdvancedFilters}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.primary }]}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={curfewModalVisible}
        onRequestClose={() => {
          setCurfewModalVisible(!curfewModalVisible);
        }}
      >
        <TouchableOpacity 
            style={styles.centeredView} 
            activeOpacity={1} 
            onPressOut={() => setCurfewModalVisible(false)}
        >
          <View style={styles.modalView} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalText}>Select Curfew</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => handleCurfewSelect("10:00 PM")}
            >
              <Text style={styles.modalButtonText}>Before 10 PM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => handleCurfewSelect("12:00 AM")}
            >
              <Text style={styles.modalButtonText}>Before 12 AM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => handleCurfewSelect("None")}
            >
              <Text style={styles.modalButtonText}>No Curfew</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, {backgroundColor: theme.colors.backgroundSecondary, borderWidth: 1, borderColor: theme.colors.primary, marginTop: 8}]}
              onPress={() => handleCurfewSelect(null)}
            >
              <Text style={[styles.modalButtonText, {color: theme.colors.primary}]}>Clear Filter</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={genderModalVisible}
        onRequestClose={() => {
          setGenderModalVisible(!genderModalVisible);
        }}
      >
        <TouchableOpacity 
            style={styles.centeredView} 
            activeOpacity={1} 
            onPressOut={() => setGenderModalVisible(false)}
        >
          <View style={styles.modalView} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalText}>Select Gender Restriction</Text>
            {genderOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.modalButton,
                  selectedGender === opt.value && { backgroundColor: theme.colors.primary + "20" }
                ]}
                onPress={() => {
                  setSelectedGender(opt.value);
                  setGenderModalVisible(false);
                }}
              >
                <Text style={[
                  styles.modalButtonText,
                  selectedGender === opt.value && { color: theme.colors.primary, fontWeight: '700' }
                ]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalButton, {backgroundColor: theme.colors.backgroundSecondary, borderWidth: 1, borderColor: theme.colors.primary, marginTop: 8}]}
              onPress={() => {
                setSelectedGender("All");
                setGenderModalVisible(false);
              }}
            >
              <Text style={[styles.modalButtonText, {color: theme.colors.primary}]}>Clear Filter</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
