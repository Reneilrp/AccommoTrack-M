import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import PropertyService from "../../../../services/PropertyService.js";
import ProfileService from "../../../../services/ProfileService.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getImageUrl } from "../../../../utils/imageUtils.js";
import { getStyles } from "../../../../styles/Landlord/MyProperties.js";
import { useTheme } from "../../../../contexts/ThemeContext.jsx";
import {
  landlordQueryKeys,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from "../../hooks/useLandlordQueryHelpers.js";
import { useUIState } from "../../../../contexts/UIStateContext.jsx";
import { TextInput } from "react-native-gesture-handler";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "pending", label: "Pending" },
  { key: "draft", label: "Draft" },
];

const STATUS_COLORS = {
  active: { bg: "#DCFCE7", fg: "#166534" },
  inactive: { bg: "#E5E7EB", fg: "#374151" },
  hidden: { bg: "#F3F4F6", fg: "#4B5563" },
  pending: { bg: "#FEF3C7", fg: "#92400E" },
  draft: { bg: "#F3E8FF", fg: "#6B21A8" },
  maintenance: { bg: "#DBEAFE", fg: "#1D4ED8" },
  default: { bg: "#E5E7EB", fg: "#6B7280" },
};

const LANDLORD_ACCESS_STATUSES = [
  "approved",
  "partial_verified",
  "pending_documents_review",
  "verified",
];

const EMPTY_PROPERTIES = [];
const emptyMetrics = { active: 0, inactive: 0, pending: 0, draft: 0, totalRooms: 0 };

export default function MyPropertiesScreen({ navigation }) {
  const { theme } = useTheme();
  // eslint-disable-next-line no-unused-vars
  const { uiState } = useUIState();

  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const verificationQuery = useQuery({
    queryKey: landlordQueryKeys.verificationStatusBundle(),
    queryFn: async () => {
      let isCaretaker = false;

      try {
        const userString = await AsyncStorage.getItem("user");
        if (userString) {
          const user = JSON.parse(userString);
          isCaretaker = user?.role === "caretaker";
        }
      } catch {
        isCaretaker = false;
      }

      if (isCaretaker) {
        return { isCaretaker: true, status: "approved", user: { is_verified: true } };
      }

      const response = await ProfileService.getVerificationStatus();
      if (!response?.success) {
        return { isCaretaker: false, status: "not_submitted", user: { is_verified: false } };
      }

      const responseData = response.data && typeof response.data === "object"
        ? response.data
        : { status: "not_submitted" };

      return {
        isCaretaker: false,
        ...responseData,
        user: {
          is_verified: responseData?.user?.is_verified === true,
        },
      };
    },
  });

  const isCaretaker = verificationQuery.data?.isCaretaker === true;
  const verificationPayload = verificationQuery.data;
  const verificationStatus = typeof verificationPayload === "string"
    ? verificationPayload
    : verificationPayload?.status || null;
  const normalizedVerificationStatus = String(verificationStatus || "").toLowerCase();
  const isVerified =
    isCaretaker ||
    LANDLORD_ACCESS_STATUSES.includes(normalizedVerificationStatus) ||
    verificationPayload?.user?.is_verified === true;

  const propertiesQuery = useQuery({
    queryKey: landlordQueryKeys.properties(),
    queryFn: async () => {
      const response = await PropertyService.getMyProperties();
      if (!response.success) {
        throw new Error(response.error || "Unable to fetch properties");
      }

      return Array.isArray(response.data) ? response.data : EMPTY_PROPERTIES;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const properties = propertiesQuery.data || EMPTY_PROPERTIES;
  const loading = propertiesQuery.isPending && properties.length === 0;
  const error = propertiesQuery.error?.message || "";
  const refetchProperties = propertiesQuery.refetch;
  const refetchVerification = verificationQuery.refetch;
  const propertiesRefetchers = useMemo(
    () => (isCaretaker ? [refetchProperties] : [refetchProperties, refetchVerification]),
    [isCaretaker, refetchProperties, refetchVerification],
  );

  useLandlordFocusRefetch({ refetchers: propertiesRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: propertiesRefetchers,
  });

  const stats = useMemo(() => {
    if (!properties.length) return emptyMetrics;

    return properties.reduce(
      (acc, property) => {
        const status = (property.current_status || "pending").toLowerCase();
        if (acc[status] !== undefined) {
          acc[status] += 1;
        }
        acc.totalRooms += Number(property.total_rooms || 0);
        return acc;
      },
      { ...emptyMetrics },
    );
  }, [properties]);

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const status = (property.current_status || "pending").toLowerCase();
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        (property.title || '').toLowerCase().includes(q) || 
        (property.city || '').toLowerCase().includes(q) ||
        (property.street_address || '').toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [properties, statusFilter, searchQuery]);

  const formatAddress = (property) => {
    const parts = [
      property.street_address,
      property.barangay,
      property.city,
      property.province,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const getCoverImage = (property) => {
    if (Array.isArray(property.images) && property.images.length > 0) {
      const first = property.images[0];
      const path =
        typeof first === "string"
          ? first
          : first?.image_url || first?.url || first?.path;
      return getImageUrl(path);
    }
    return null;
  };

  const renderProperty = ({ item }) => {
    let statusKey = (item.current_status || "pending").toLowerCase();
    if (statusKey === 'active' && !item.is_published) {
      statusKey = 'hidden';
    }
    const palette = STATUS_COLORS[statusKey] || STATUS_COLORS.default;
    const cover = getCoverImage(item);
    const totalRooms = Number(item.total_rooms || 0);
    const availableRooms = Number(item.available_rooms || 0);
    const occupiedRooms = Math.max(totalRooms - availableRooms, 0);
    const occupancyRate = totalRooms
      ? Math.round((occupiedRooms / totalRooms) * 100)
      : 0;

    return (
      <View style={{ paddingHorizontal: 16 }}>
        <TouchableOpacity
          style={styles.propertyCard}
          onPress={() =>
            navigation.navigate("PropertySummary", { propertyId: item.id })
          }
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title || "Untitled property"}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: palette.bg }]}>
              <Text style={[styles.statusText, { color: palette.fg }]}>
                {statusKey}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.imageColumn}>
              <View style={styles.propertyImage}>
                {cover ? (
                  <Image
                    source={{ uri: cover }}
                    style={styles.propertyImageMedia}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={26} color="#9CA3AF" />
                  </View>
                )}
              </View>
              <View style={styles.propertyTypeContainer}>
                <Text style={styles.propertyTypeText}>
                  {PropertyService.formatPropertyType(item.property_type)}
                </Text>
              </View>
            </View>

            <View style={styles.cardDetails}>
              <Text style={styles.addressText}>
                {formatAddress(item) || "Location not set"}
              </Text>

              <View style={styles.metricsGrid}>
                <View style={styles.metricsGridRow}>
                  <View style={styles.metricItem}>
                    <Ionicons
                      name="bed-outline"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.metricLabel}>{totalRooms} rooms</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Ionicons name="log-in-outline" size={16} color="#F97316" />
                    <Text style={styles.metricLabel}>
                      {availableRooms} available
                    </Text>
                  </View>
                </View>
                <View style={styles.metricsGridRow}>
                  <View style={styles.metricItem}>
                    <Ionicons name="people-outline" size={16} color="#2563EB" />
                    <Text style={styles.metricLabel}>
                      {occupiedRooms} tenants
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Ionicons
                      name="speedometer-outline"
                      size={16}
                      color="#7C3AED"
                    />
                    <Text style={styles.metricLabel}>
                      {occupancyRate}% occupied
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${occupancyRate}%` }]}
                />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderListHeader = () => (
    <View style={styles.section}>
      {/* Verification Warning */}
      {!isVerified && (
        <TouchableOpacity 
          style={{ 
            margin: 16, 
            padding: 16, 
            backgroundColor: theme.isDark ? 'rgba(124,45,18,0.1)' : '#FFF7ED', 
            borderRadius: 12, 
            borderWidth: 1, 
            borderColor: theme.isDark ? '#9A3412' : '#FFEDD5',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12
          }}
          onPress={() => navigation.navigate('VerificationStatus')}
        >
          <Ionicons name="shield-alert-outline" size={24} color="#9A3412" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#9A3412' }}>Verification Required</Text>
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
              Your properties will remain as "Draft" and won't be visible to guests until your account is verified.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9A3412" />
        </TouchableOpacity>
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={18} color="#B91C1C" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Ionicons name="refresh" size={18} color="#B91C1C" />
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScroll}
      >
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Listings</Text>
          <Text style={styles.statValueGreen}>{stats.active}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending Listings</Text>
          <Text style={styles.statValueOrange}>{stats.pending}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Drafts</Text>
          <Text style={[styles.statValueOrange, { color: '#6B21A8' }]}>{stats.draft}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Inactive Listings</Text>
          <Text style={styles.statValueRed}>{stats.inactive}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Rooms</Text>
          <Text style={styles.statValueBlue}>{stats.totalRooms}</Text>
        </View>
      </ScrollView>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          backgroundColor: theme.colors.backgroundSecondary, 
          borderRadius: 10, 
          paddingHorizontal: 12,
          height: 44,
          borderWidth: 1,
          borderColor: theme.colors.border
        }}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textTertiary} />
          <TextInput
            placeholder="Search properties..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ 
              flex: 1, 
              marginLeft: 8, 
              fontSize: 14, 
              color: theme.colors.text,
              padding: 0 
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={{ marginTop: 8 }}>
        <View style={styles.filtersRow}>
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterChip,
                  active ? styles.filterActive : styles.filterInactive,
                ]}
                onPress={() => setStatusFilter(tab.key)}
              >
                <Text
                  style={[
                    styles.filterLabel,
                    { color: active ? "#166534" : theme.colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.primary}
        />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading properties...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.primary}
      />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Properties</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate("AddProperty")}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={renderProperty}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16 }}>
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No properties found</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to add your first listing
              </Text>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
