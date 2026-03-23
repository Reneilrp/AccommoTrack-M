import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  FlatList,
  StatusBar,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getStyles } from "../../../../styles/Tenant/HomePage.js";
import { useTheme } from "../../../../contexts/ThemeContext.jsx";

import MenuDrawer from "../../components/MenuDrawer.jsx";
import SearchBar from "../../components/SearchBar.jsx";
import PropertyCard from "../../components/PropertyCard.jsx";
import { PropertyCardSkeleton } from "../../../../components/Skeletons/index.jsx";
import Header from "../../components/Header.jsx";

import PropertyService from "../../../../services/PropertyService.js";
import { navigate as rootNavigate } from "../../../../navigation/RootNavigation.js";

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
  const [curfewModalVisible, setCurfewModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState("Explore");

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
  }, [properties, searchQuery, activeTab, selectedCurfew, selectedGender]);

  const loadProperties = useCallback(async () => {
    try {
      if (properties.length === 0) {
        setLoading(true);
      }
      setError(null);

      const filters = {};
      if (selectedFilter !== "All") {
        filters.type = selectedFilter;
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
  }, [selectedFilter]);

  useFocusEffect(
    useCallback(() => {
      loadProperties();
    }, [loadProperties])
  );

  const onRefresh = async () => {
    setRefreshing(true);
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
    loadProperties();
  };

  const handleClearFilter = () => {
    setSelectedFilter("All");
    setSearchQuery("");
    loadProperties();
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
                  selectedFilter === filter.value &&
                    styles.filterButtonTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
          {/* New Curfew Filter Button */}
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

          {/* New Gender Filter Button */}
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

      {isGuest && (
        <TouchableOpacity
          style={styles.guestBanner}
          onPress={() => onAuthRequired && onAuthRequired()}
        >
          <View style={styles.guestBannerContent}>
            <Text style={styles.guestBannerText}>
              👋 Browse properties as a guest or{" "}
              <Text style={styles.guestBannerLink}>Sign In</Text> to book
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
