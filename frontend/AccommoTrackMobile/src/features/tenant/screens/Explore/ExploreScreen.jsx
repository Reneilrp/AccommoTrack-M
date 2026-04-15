import React, { useState, useEffect, useCallback } from "react";
import {
  Animated,
  View,
  ScrollView,
  FlatList,
  StatusBar,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { WebView } from "react-native-webview";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import { getStyles } from "../../../../styles/Tenant/HomePage.js";
import { useTheme } from "../../../../contexts/ThemeContext.jsx";
import { useUIState } from "../../../../contexts/UIStateContext.jsx";

import MenuDrawer from "../../components/MenuDrawer.jsx";
import SearchBar from "../../components/SearchBar.jsx";
import PropertyCard from "../../components/PropertyCard.jsx";
import { PropertyCardSkeleton } from "../../../../components/Skeletons/index.jsx";

import PropertyService from "../../../../services/PropertyService.js";
import { navigate as rootNavigate } from "../../../../navigation/RootNavigation.js";
import { showError, showSuccess } from "../../../../utils/toast.js";
import {
  tenantQueryKeys,
  useTenantFocusRefetch,
  useTenantRefreshHandler,
} from "../../hooks/useTenantQueryHelpers.js";

const DEFAULT_ADVANCED_FILTERS = {
  minPrice: "",
  maxPrice: "",
  availabilityOnly: false,
  minRating: 0,
  amenities: [],
  sex: "All",
};

const HEADER_HIDE_GAP = 20;
const FILTER_HIDE_GAP = 52;
const SEARCH_HIDE_GAP = 92;
const FILTER_SHOW_GAP = 110;
const HEADER_SHOW_GAP = 44;
const SCROLL_DIRECTION_DELTA = 3;

const hasActiveAdvancedFilters = (filters = {}) =>
  Boolean(
    filters.minPrice
    || filters.maxPrice
    || filters.availabilityOnly
    || Number(filters.minRating) > 0
    || (Array.isArray(filters.amenities) && filters.amenities.length > 0)
    || (filters.sex && filters.sex !== "All"),
  );

const buildExploreApiFilters = (type, advancedFilters) => {
  const filters = {};

  if (type !== "All") {
    filters.type = type;
  }
  if (advancedFilters.minPrice) {
    filters.min_price = advancedFilters.minPrice;
  }
  if (advancedFilters.maxPrice) {
    filters.max_price = advancedFilters.maxPrice;
  }
  if (advancedFilters.availabilityOnly) {
    filters.availability = "1";
  }
  if (Number(advancedFilters.minRating) > 0) {
    filters.min_rating = Number(advancedFilters.minRating);
  }
  if (Array.isArray(advancedFilters.amenities) && advancedFilters.amenities.length > 0) {
    filters.amenities = advancedFilters.amenities;
  }
  if (advancedFilters.sex && advancedFilters.sex !== "All") {
    filters.sex_policy = advancedFilters.sex;
  }

  return filters;
};

export default function TenantHomePage({
  onLogout,
  isGuest = false,
  onAuthRequired,
}) {
  const { width: viewportWidth } = useWindowDimensions();
  const navigation = useNavigation();
  const { uiState, updateData, invalidateData, showAlert: uiShowAlert } = useUIState();
  const showAlert = uiShowAlert || Alert.alert;
  const BUCKET = 'explore_properties';

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("featured");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [advancedFilters, setAdvancedFilters] = useState({
    ...DEFAULT_ADVANCED_FILTERS,
  });
  const [draftAdvancedFilters, setDraftAdvancedFilters] = useState({
    ...DEFAULT_ADVANCED_FILTERS,
  });
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState("Explore");
  const [showGuestBanner, setShowGuestBanner] = useState(true);
  const [searchSectionHeight, setSearchSectionHeight] = useState(0);
  const [filterSectionHeight, setFilterSectionHeight] = useState(0);
  const [isTopHeaderHidden, setIsTopHeaderHidden] = useState(false);

  const searchSectionVisibility = React.useRef(new Animated.Value(1)).current;
  const filterSectionVisibility = React.useRef(new Animated.Value(1)).current;
  const lastScrollY = React.useRef(0);
  const topHeaderHiddenRef = React.useRef(false);
  const searchSectionHiddenRef = React.useRef(false);
  const filterSectionHiddenRef = React.useRef(false);

  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const contentWrapStyle = React.useMemo(
    () => (viewportWidth >= 768 ? { width: '100%', maxWidth: 980, alignSelf: 'center' } : null),
    [viewportWidth],
  );
  const searchSectionAnimatedHeight = searchSectionHeight + (isTopHeaderHidden ? insets.top : 0);

  const setTopHeaderHidden = useCallback((hidden) => {
    if (topHeaderHiddenRef.current === hidden) return;

    topHeaderHiddenRef.current = hidden;
    setIsTopHeaderHidden(hidden);
    navigation.setParams({ hideTopHeader: hidden });
  }, [navigation]);

  const setSearchSectionHidden = useCallback((hidden) => {
    if (searchSectionHiddenRef.current === hidden) return;

    searchSectionHiddenRef.current = hidden;
    Animated.timing(searchSectionVisibility, {
      toValue: hidden ? 0 : 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [searchSectionVisibility]);

  const setFilterSectionHidden = useCallback((hidden) => {
    if (filterSectionHiddenRef.current === hidden) return;

    filterSectionHiddenRef.current = hidden;
    Animated.timing(filterSectionVisibility, {
      toValue: hidden ? 0 : 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [filterSectionVisibility]);

  useEffect(() => {
    return () => {
      setSearchSectionHidden(false);
      setFilterSectionHidden(false);
      navigation.setParams({ hideTopHeader: false, hideLayoutChrome: false });
    };
  }, [navigation, setFilterSectionHidden, setSearchSectionHidden]);

  const cachedExplore = uiState.data?.[BUCKET];
  const [properties, setProperties] = useState(cachedExplore || []);
  const [filteredProperties, setFilteredProperties] = useState(cachedExplore || []);
  const [refreshing, setRefreshing] = useState(false);

  // Filter options matching your screenshot and backend types
  const filterOptions = [
    { label: "All", value: "All" },
    { label: "Dormitory", value: "dormitory" },
    { label: "Apartment", value: "apartment" },
    { label: "Boarding House", value: "boardingHouse" },
    { label: "Bed Spacer", value: "bedSpacer" },
  ];

  const genderOptions = [
    { label: "All", value: "All" },
    { label: "Mixed", value: "mixed" },
    { label: "Boys Only", value: "male" },
    { label: "Girls Only", value: "female" },
  ];

  const hasServerFilters = React.useMemo(
    () => selectedFilter !== "All" || hasActiveAdvancedFilters(advancedFilters),
    [selectedFilter, advancedFilters],
  );

  const explorePropertiesQuery = useQuery({
    queryKey: tenantQueryKeys.exploreProperties({
      type: selectedFilter,
      advancedFilters,
    }),
    queryFn: async () => {
      const filters = buildExploreApiFilters(selectedFilter, advancedFilters);
      const result = await PropertyService.getPublicProperties(filters);

      if (!result?.success || !Array.isArray(result?.data)) {
        throw new Error(result?.error || "Failed to load properties");
      }

      return result.data.map((property) =>
        PropertyService.transformPropertyToAccommodation(property),
      );
    },
    placeholderData: (previousData) =>
      previousData || (!hasServerFilters ? cachedExplore : undefined),
  });

  const refetchExploreProperties = explorePropertiesQuery.refetch;
  const exploreRefetchers = React.useMemo(
    () => [refetchExploreProperties],
    [refetchExploreProperties],
  );

  useTenantFocusRefetch({ refetchers: exploreRefetchers });

  const refreshExploreProperties = useTenantRefreshHandler({
    setRefreshing,
    refetchers: exploreRefetchers,
  });

  const loading = explorePropertiesQuery.isLoading && properties.length === 0;
  const error = explorePropertiesQuery.error?.message || null;

  useEffect(() => {
    if (!explorePropertiesQuery.data) return;

    setProperties(explorePropertiesQuery.data);
    if (!hasServerFilters) {
      updateData(BUCKET, explorePropertiesQuery.data);
    }
  }, [explorePropertiesQuery.data, hasServerFilters, updateData]);

  useEffect(() => {
    if (!explorePropertiesQuery.error) return;

    console.error("Error loading properties:", explorePropertiesQuery.error);
    showAlert(
      "Error",
      explorePropertiesQuery.error.message || "Failed to load properties. Please try again.",
    );
  }, [explorePropertiesQuery.error]);

  useEffect(() => {
    filterProperties();
  }, [
    properties,
    searchQuery,
    activeTab,
    selectedFilter,
    advancedFilters,
  ]);

  const onRefresh = useCallback(async () => {
    setShowGuestBanner(true);
    invalidateData(BUCKET);
    await refreshExploreProperties();
  }, [invalidateData, refreshExploreProperties]);

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

    if (advancedFilters.sex !== "All") {
      filtered = filtered.filter((prop) => {
        const propGender = (prop.sex_restriction || "mixed").toLowerCase();
        return propGender === advancedFilters.sex.toLowerCase();
      });
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

  const handleFilterSelect = (filterValue) => {
    setSelectedFilter(filterValue);
  };

  const handleClearFilter = () => {
    const resetAdvanced = { ...DEFAULT_ADVANCED_FILTERS };
    setSelectedFilter("All");
    setSearchQuery("");
    setAdvancedFilters(resetAdvanced);
    setDraftAdvancedFilters(resetAdvanced);
  };

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
      sex: draftAdvancedFilters.sex || "All",
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
      showAlert('Invalid Price Range', 'Minimum price cannot be greater than maximum price.');
      return;
    }

    setAdvancedFilters(nextFilters);
    setFilterModalVisible(false);
  };

  const clearAdvancedFilters = () => {
    const resetAdvanced = { ...DEFAULT_ADVANCED_FILTERS };
    setDraftAdvancedFilters(resetAdvanced);
    setAdvancedFilters(resetAdvanced);
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
        "Billing & Payments",
        "Notifications",
        "Maintenance & Add-ons",
        "My Maintenance Requests",
        "My Addon Requests",
        // Backward compatibility for stale menu labels.
        "Service Requests",
        "Payments",
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
      case "Billing & Payments":
      case "Payments":
        rootNavigate("Payments");
        break;
      case "Maintenance & Add-ons":
      case "Service Requests":
        rootNavigate("ServiceRequests");
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
          try {
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            showSuccess("Logged out successfully");
            if (onLogout) {
              onLogout();
            }
          } catch (error) {
            console.error("Logout error:", error);
            showError("Logout failed", "Please try again.");
          }
        }
        break;
      default:
        console.log("Menu item pressed:", itemTitle);
    }
  };

  const handleAccommodationPress = (accommodation) => {
    navigation.navigate("AccommodationDetails", {
      accommodation,
      isGuest,
      hideLayout: true,
    });
  };

  const handleLikePress = async (id) => {
    if (isGuest) {
      showAlert(
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

  const handleFilterSectionLayout = useCallback((event) => {
    const nextHeight = event?.nativeEvent?.layout?.height || 0;
    if (nextHeight > 0 && nextHeight !== filterSectionHeight) {
      setFilterSectionHeight(nextHeight);
    }
  }, [filterSectionHeight]);

  const handleSearchSectionLayout = useCallback((event) => {
    const nextHeight = event?.nativeEvent?.layout?.height || 0;
    if (nextHeight > 0 && nextHeight !== searchSectionHeight) {
      setSearchSectionHeight(nextHeight);
    }
  }, [searchSectionHeight]);

  const handleExploreScroll = useCallback((event) => {
    const currentY = Math.max(0, event?.nativeEvent?.contentOffset?.y || 0);
    const deltaY = currentY - lastScrollY.current;

    if (currentY <= 0) {
      setSearchSectionHidden(false);
      setFilterSectionHidden(false);
      setTopHeaderHidden(false);
      lastScrollY.current = 0;
      return;
    }

    if (deltaY > SCROLL_DIRECTION_DELTA) {
      if (currentY > HEADER_HIDE_GAP) {
        setTopHeaderHidden(true);
      }
      if (currentY > FILTER_HIDE_GAP) {
        setFilterSectionHidden(true);
      }
      if (currentY > SEARCH_HIDE_GAP) {
        setSearchSectionHidden(true);
      }
    } else if (deltaY < -SCROLL_DIRECTION_DELTA) {
      setSearchSectionHidden(false);
      if (currentY < FILTER_SHOW_GAP) {
        setFilterSectionHidden(false);
      }
      if (currentY < HEADER_SHOW_GAP) {
        setTopHeaderHidden(false);
      }
    }

    lastScrollY.current = currentY;
  }, [setFilterSectionHidden, setSearchSectionHidden, setTopHeaderHidden]);

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
          onMapPress={() => setMapModalVisible(true)}
          onFilterPress={openAdvancedFilters}
          selectedFilter={selectedFilter}
          onClearFilter={handleClearFilter}
          properties={properties}
          userRole={isGuest ? "guest" : "authenticated"}
          onSelectProperty={() => { }}
        />

        {renderFilterControls()}

        <ScrollView contentContainerStyle={[styles.contentContainerPadding, contentWrapStyle]}>
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
      <Animated.View
        style={{
          paddingTop: isTopHeaderHidden ? insets.top : 0,
          height: searchSectionVisibility.interpolate({
            inputRange: [0, 1],
            outputRange: [0, searchSectionAnimatedHeight || 1],
          }),
          opacity: searchSectionVisibility,
          overflow: "hidden",
        }}
      >
        <View onLayout={handleSearchSectionLayout}>
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchPress={handleSearch}
            onMapPress={() => setMapModalVisible(true)}
            onFilterPress={openAdvancedFilters}
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
              <TouchableOpacity onPress={refetchExploreProperties} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>

      <Animated.View
        style={{
          height: filterSectionVisibility.interpolate({
            inputRange: [0, 1],
            outputRange: [0, filterSectionHeight || 1],
          }),
          opacity: filterSectionVisibility,
        }}
      >
        <View onLayout={handleFilterSectionLayout}>
          {renderFilterControls()}
        </View>
      </Animated.View>

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
        contentContainerStyle={[styles.contentContainerPadding, contentWrapStyle]}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onScroll={handleExploreScroll}
        scrollEventThrottle={16}
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
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <SafeAreaView
            style={{
              flex: 1,
              justifyContent: 'flex-end',
            }}
            edges={["left", "right"]}
          >
            <View
              style={[
                styles.modalView,
                {
                  width: '100%',
                  maxWidth: 760,
                  maxHeight: '86%',
                  margin: 0,
                  paddingTop: 12,
                  paddingHorizontal: 20,
                  paddingBottom: 16,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  alignItems: 'stretch',
                  alignSelf: 'center',
                },
              ]}
            >
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <View
                  style={{
                    width: 44,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.border,
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={[styles.modalText, { marginBottom: 0, textAlign: 'left' }]}>Advanced Filters</Text>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flexGrow: 0 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 4 }}
              >

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
                  Sex Restriction
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {genderOptions.map((opt) => {
                    const isSelected = (draftAdvancedFilters.sex || 'All') === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={{
                          borderWidth: 1,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          backgroundColor: isSelected ? theme.colors.primary + '15' : theme.colors.backgroundSecondary,
                          borderRadius: 999,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                        }}
                        onPress={() =>
                          setDraftAdvancedFilters((prev) => ({
                            ...prev,
                            sex: opt.value,
                          }))
                        }
                      >
                        <Text
                          style={{
                            color: isSelected ? theme.colors.primary : theme.colors.textSecondary,
                            fontWeight: isSelected ? '700' : '600',
                            fontSize: 12,
                          }}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                  Rating
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 16,
                    gap: 10,
                  }}
                >
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Reset rating"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.backgroundSecondary,
                    }}
                    onPress={() =>
                      setDraftAdvancedFilters((prev) => ({
                        ...prev,
                        minRating: 0,
                      }))
                    }
                  >
                    <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>

                  {[1, 2, 3, 4, 5].map((rating) => {
                    const isFilled = Number(draftAdvancedFilters.minRating) >= rating;

                    return (
                      <TouchableOpacity
                        key={rating}
                        accessibilityRole="button"
                        accessibilityLabel={`Set minimum rating to ${rating} stars`}
                        style={{ padding: 2 }}
                        onPress={() =>
                          setDraftAdvancedFilters((prev) => ({
                            ...prev,
                            minRating: rating,
                          }))
                        }
                      >
                        <Ionicons
                          name={isFilled ? 'star' : 'star-outline'}
                          size={24}
                          color={isFilled ? '#F59E0B' : theme.colors.textTertiary}
                        />
                      </TouchableOpacity>
                    );
                  })}
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
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
