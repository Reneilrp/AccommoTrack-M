import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import PropertyService from "../../../../services/PropertyService.js";
import { getImageUrl } from "../../../../utils/imageUtils.js";
import { getStyles } from "../../../../styles/Landlord/RoomManagement.js";
import { useTheme } from "../../../../contexts/ThemeContext.jsx";
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from "../../hooks/useLandlordQueryHelpers.js";

const FILTERS = [
  { label: "All Rooms", value: "all" },
  { label: "Occupied", value: "occupied" },
  { label: "Available", value: "available" },
  { label: "Maintenance", value: "maintenance" },
];

const DEFAULT_STATS = { total: 0, occupied: 0, available: 0, maintenance: 0 };
const EMPTY_PROPERTIES = [];
const EMPTY_ROOMS = [];
const EMPTY_TENANTS = [];
const ALL_ROOM_TYPES = [
  { value: "single", label: "Single Room" },
  { value: "double", label: "Double Room" },
  { value: "quad", label: "Quad Room" },
  { value: "bedSpacer", label: "Bed Spacer" },
];

const normalizeRoomTypeValue = (value, fallback = "single") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s-]/g, "");

  if (normalized === "single") return "single";
  if (normalized === "double") return "double";
  if (normalized === "quad") return "quad";
  if (normalized === "bedspacer") return "bedSpacer";

  return fallback;
};

const normalizeGenderValue = (value, fallback = "male") => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "male" || normalized === "boy" || normalized === "boys")
    return "male";
  if (
    normalized === "female" ||
    normalized === "girl" ||
    normalized === "girls"
  )
    return "female";
  if (normalized === "mixed" || normalized === "coed" || normalized === "any")
    return "mixed";

  return fallback;
};

const normalizeFloorValue = (value, fallback = "1", maxFloor = 15) => {
  const floor = parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(floor) || floor < 1) return fallback;
  if (floor > maxFloor) return String(maxFloor);
  return String(floor);
};

const normalizeId = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

const getOrdinalSuffix = (num) => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

const buildFloors = (count = 1) =>
  Array.from({ length: Math.max(1, count) }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}${getOrdinalSuffix(i + 1)} Floor`,
  }));

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value))
    return value.filter(Boolean).map((item) => item?.trim?.() ?? item);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (_err) { }
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return "₱0";
  const number = Number(value) || 0;
  return `₱${number.toLocaleString("en-US")}`;
};

const LONG_TERM_PROMO_TERMS = ["3", "6", "9", "12"];

const createInitialDurationPricing = () =>
  LONG_TERM_PROMO_TERMS.reduce((acc, term) => {
    acc[term] = {
      enabled: false,
      discountType: "percent",
      discountValue: "",
    };
    return acc;
  }, {});

const buildDurationPricingPayload = (durationPricing) =>
  LONG_TERM_PROMO_TERMS.reduce((acc, term) => {
    const entry = durationPricing?.[term];
    if (!entry?.enabled) return acc;

    const parsedValue = parseFloat(entry.discountValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) return acc;

    acc[term] = {
      discount_type: entry.discountType === "fixed" ? "fixed" : "percent",
      discount_value: parsedValue,
    };

    return acc;
  }, {});

const statusTokens = {
  available: { bg: "#DCFCE7", color: "#15803D", label: "Available" },
  occupied: { bg: "#FEE2E2", color: "#B91C1C", label: "Occupied" },
  maintenance: { bg: "#FEF3C7", color: "#B45309", label: "Maintenance" },
};

export default function RoomManagementScreen({ navigation, route }) {
  const { theme } = useTheme();
  const showAlert = Alert.alert;
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const pickerMode = Platform.OS === "android" ? "dialog" : undefined;
  const pickerTextColor = theme.colors.text;
  const preselectedPropertyId = normalizeId(route?.params?.propertyId);
  const initialFilter = route?.params?.filter || "all";

  const [selectedPropertyId, setSelectedPropertyId] = useState(
    preselectedPropertyId || null,
  );
  const [filter, setFilter] = useState(initialFilter);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [modalLoading, setModalLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Web-exact state
  const [formData, setFormData] = useState({
    id: null,
    roomNumber: "",
    roomType: "single",
    genderRestriction: "male",
    floor: "1",
    monthlyRate: "",
    dailyRate: "",
    billingPolicy: "monthly",
    minStayDays: "1",
    capacity: "1",
    pricingModel: "full_room",
    description: "",
    status: "available",
    require1MonthAdvance: false,
    amenities: [],
    rules: [],
    durationPricing: createInitialDurationPricing(),
  });

  const [newAmenity, setNewAmenity] = useState("");
  const [newRule, setNewRule] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [floorSelectModalVisible, setFloorSelectModalVisible] = useState(false);
  const [roomTypeSelectModalVisible, setRoomTypeSelectModalVisible] = useState(false);
  const [genderSelectModalVisible, setGenderSelectModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailRoom, setDetailRoom] = useState(null);
  const [expandedDetailProxyKeys, setExpandedDetailProxyKeys] = useState({});

  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [extendTarget, setExtendTarget] = useState(null);
  const [extendType, setExtendType] = useState('months'); // 'days' or 'months'
  const [extendValue, setExtendValue] = useState('1');
  const [extending, setExtending] = useState(false);

  const [tenantModalVisible, setTenantModalVisible] = useState(false);
  const [assignTargetRoom, setAssignTargetRoom] = useState(null);
  const [assigningTenant, setAssigningTenant] = useState(false);
  const [activeMenuRoomId, setActiveMenuRoomId] = useState(null);
  const [expandedProxyKeys, setExpandedProxyKeys] = useState({});

  const propertiesQuery = useQuery({
    queryKey: landlordQueryKeys.properties(),
    queryFn: async () => {
      const response = await PropertyService.getMyProperties();
      if (!response.success) {
        throw new Error(response.error || "Failed to load properties");
      }

      return Array.isArray(response.data) ? response.data : EMPTY_PROPERTIES;
    },
    placeholderData: (previousData) => previousData,
  });

  const roomsQuery = useQuery({
    queryKey: landlordQueryKeys.roomsByProperty(selectedPropertyId),
    enabled: Boolean(selectedPropertyId),
    queryFn: async () => {
      const response = await PropertyService.getRooms(selectedPropertyId);
      if (!response.success) {
        throw new Error(response.error || "Failed to load rooms");
      }

      const data = response.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      return EMPTY_ROOMS;
    },
    placeholderData: (previousData) => previousData,
  });

  const roomStatsQuery = useQuery({
    queryKey: landlordQueryKeys.roomStatsByProperty(selectedPropertyId),
    enabled: Boolean(selectedPropertyId),
    queryFn: async () => {
      const response = await PropertyService.getRoomStats(selectedPropertyId);
      if (!response.success) {
        throw new Error(response.error || "Failed to load room stats");
      }

      const source = response.data?.data || response.data || {};
      return {
        total: Number(source.total ?? 0),
        occupied: Number(source.occupied ?? 0),
        available: Number(source.available ?? 0),
        maintenance: Number(source.maintenance ?? 0),
      };
    },
    placeholderData: (previousData) => previousData,
  });

  const allTenantsQuery = useQuery({
    queryKey: landlordQueryKeys.tenants(),
    queryFn: async () => {
      const response = await PropertyService.getTenants();
      if (!response.success) {
        throw new Error(response.error || "Failed to load tenants");
      }

      const data = response.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      return EMPTY_TENANTS;
    },
    placeholderData: (previousData) => previousData,
  });

  const properties = propertiesQuery.data || EMPTY_PROPERTIES;
  const rooms = roomsQuery.data || EMPTY_ROOMS;
  const stats = roomStatsQuery.data || DEFAULT_STATS;
  const allTenants = allTenantsQuery.data || EMPTY_TENANTS;
  const loadingProperties = propertiesQuery.isPending && properties.length === 0;
  const loadingRooms =
    Boolean(selectedPropertyId) && roomsQuery.isPending && rooms.length === 0;
  const loading = loadingProperties || loadingRooms;
  const fetchError =
    propertiesQuery.error?.message ||
    roomsQuery.error?.message ||
    roomStatsQuery.error?.message ||
    allTenantsQuery.error?.message ||
    "";

  const refetchProperties = propertiesQuery.refetch;
  const refetchRooms = roomsQuery.refetch;
  const refetchRoomStats = roomStatsQuery.refetch;
  const refetchAllTenants = allTenantsQuery.refetch;
  const propertyAndTenantRefetchers = useMemo(
    () => [refetchProperties, refetchAllTenants],
    [refetchProperties, refetchAllTenants],
  );
  const roomRefetchers = useMemo(
    () => [refetchRooms, refetchRoomStats],
    [refetchRooms, refetchRoomStats],
  );
  const roomAndTenantRefetchers = useMemo(
    () => [refetchRooms, refetchRoomStats, refetchAllTenants],
    [refetchRooms, refetchRoomStats, refetchAllTenants],
  );
  const fullRefreshRefetchers = useMemo(
    () =>
      selectedPropertyId
        ? [refetchProperties, refetchAllTenants, refetchRooms, refetchRoomStats]
        : [refetchProperties, refetchAllTenants],
    [
      selectedPropertyId,
      refetchProperties,
      refetchAllTenants,
      refetchRooms,
      refetchRoomStats,
    ],
  );

  useLandlordFocusRefetch({ refetchers: propertyAndTenantRefetchers });
  useLandlordFocusRefetch({
    enabled: Boolean(selectedPropertyId),
    refetchers: roomRefetchers,
  });

  const handleRoomsRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: fullRefreshRefetchers,
  });

  const selectedProperty = useMemo(
    () =>
      properties.find(
        (p) => normalizeId(p.id) === normalizeId(selectedPropertyId),
      ) || null,
    [properties, selectedPropertyId],
  );

  const propertyType = selectedProperty?.property_type || "";
  const propertyGender = normalizeGenderValue(
    selectedProperty?.gender_restriction,
    "mixed",
  );
  const normalizedType = propertyType.toLowerCase();
  const isApartment = normalizedType.includes("apartment");
  const isDormitory = normalizedType.includes("dormitory");
  const isBoarding = normalizedType.includes("boarding");
  const isBedSpacerProperty =
    normalizedType.includes("bedspacer") ||
    normalizedType.includes("bed spacer");

  const roomTypes = useMemo(() => {
    if (isApartment)
      return ALL_ROOM_TYPES.filter((rt) => rt.value !== "bedSpacer");
    if (isBedSpacerProperty)
      return ALL_ROOM_TYPES.filter((rt) => rt.value === "bedSpacer");
    if (isDormitory || isBoarding)
      return ALL_ROOM_TYPES.filter(
        (rt) => rt.value === "single" || rt.value === "bedSpacer",
      );
    return ALL_ROOM_TYPES.filter((rt) => rt.value !== "bedSpacer");
  }, [isApartment, isBedSpacerProperty, isDormitory, isBoarding]);

  const genderOptions = useMemo(
    () => [
      { label: "Boys", value: "male" },
      { label: "Girls", value: "female" },
      ...(isApartment || (!isDormitory && !isBoarding && !isBedSpacerProperty)
        ? [{ label: "Mixed", value: "mixed" }]
        : []),
    ],
    [isApartment, isDormitory, isBoarding, isBedSpacerProperty],
  );

  const roomTypeValue = useMemo(() => {
    const fallback = roomTypes[0]?.value || "single";
    return normalizeRoomTypeValue(formData.roomType, fallback);
  }, [formData.roomType, roomTypes]);

  const propertyFloorCount = useMemo(() => {
    const parsedTotalFloors = Number.parseInt(
      String(selectedProperty?.total_floors ?? "").trim(),
      10,
    );
    if (Number.isFinite(parsedTotalFloors) && parsedTotalFloors > 0) {
      return parsedTotalFloors;
    }

    const parsedFloorLevel = Number.parseInt(
      String(selectedProperty?.floor_level ?? "").trim(),
      10,
    );
    if (Number.isFinite(parsedFloorLevel) && parsedFloorLevel > 0) {
      return parsedFloorLevel;
    }

    return 1;
  }, [selectedProperty?.floor_level, selectedProperty?.total_floors]);

  const floorOptions = useMemo(
    () => buildFloors(propertyFloorCount),
    [propertyFloorCount],
  );

  const propertyAmenities = useMemo(
    () =>
      parseList(
        selectedProperty?.amenities_list || selectedProperty?.amenities,
      ),
    [selectedProperty],
  );
  const propertyRules = useMemo(
    () =>
      parseList(selectedProperty?.property_rules || selectedProperty?.rules),
    [selectedProperty],
  );

  const filteredRooms = useMemo(() => {
    if (filter === "all") return rooms;
    return rooms.filter((room) => room.status === filter);
  }, [rooms, filter]);

  useEffect(() => {
    if (properties.length === 0) return;

    if (!selectedPropertyId) {
      setSelectedPropertyId(
        normalizeId(preselectedPropertyId ?? properties[0].id),
      );
      return;
    }

    const hasSelectedProperty = properties.some(
      (property) =>
        normalizeId(property.id) === normalizeId(selectedPropertyId),
    );
    if (!hasSelectedProperty) {
      setSelectedPropertyId(normalizeId(properties[0].id));
    }
  }, [preselectedPropertyId, properties, selectedPropertyId]);

  const handleSelectTenant = async (tenantId) => {
    if (!assignTargetRoom) return;
    setAssigningTenant(true);
    try {
      const res = await PropertyService.assignTenantToRoom(
        tenantId,
        { room_id: assignTargetRoom.id }
      );
      if (res.success) {
        setActionError("");
        showAlert("Success", "Tenant assigned successfully");
        setTenantModalVisible(false);
        setAssignTargetRoom(null);
        await refetchLandlordQueries(roomAndTenantRefetchers);
      } else {
        setActionError(res.error || "Failed to assign tenant");
        showAlert("Error", res.error || "Failed to assign tenant");
      }
    } finally {
      setAssigningTenant(false);
    }
  };

  const [tenantSearch, setTenantSearch] = useState("");
  const filteredTenants = useMemo(() => {
    if (!tenantSearch.trim()) return allTenants;
    const query = tenantSearch.toLowerCase();
    return allTenants.filter(
      (t) =>
        t.first_name?.toLowerCase().includes(query) ||
        t.last_name?.toLowerCase().includes(query) ||
        t.email?.toLowerCase().includes(query),
    );
  }, [allTenants, tenantSearch]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      let updated = { ...prev, [field]: value };

      if (field === "roomType") {
        const capacityMap = { single: "1", double: "2", quad: "4" };
        if (capacityMap[value]) updated.capacity = capacityMap[value];
        if (value === "bedSpacer") updated.pricingModel = "per_bed";
        else if (value === "single") updated.pricingModel = "full_room";
      }

      if (field === "billingPolicy") {
        if (value !== "monthly" && value !== "monthly_with_daily")
          updated.monthlyRate = "";
        if (value !== "daily" && value !== "monthly_with_daily")
          updated.dailyRate = "";
      }

      return updated;
    });
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  useEffect(() => {
    if (roomTypes.length === 0) return;

    const fallback = roomTypes[0]?.value || "single";
    const normalized = normalizeRoomTypeValue(formData.roomType, fallback);
    const isAllowed = roomTypes.some((type) => type.value === normalized);

    if (!isAllowed) {
      handleInputChange("roomType", fallback);
      return;
    }

    if (normalized !== formData.roomType) {
      handleInputChange("roomType", normalized);
    }
  }, [formData.roomType, roomTypes]);

  useEffect(() => {
    const normalizedFloor = normalizeFloorValue(
      formData.floor,
      "1",
      propertyFloorCount,
    );
    if (normalizedFloor !== formData.floor) {
      handleInputChange("floor", normalizedFloor);
    }
  }, [formData.floor, propertyFloorCount]);

  useEffect(() => {
    const fallbackGender =
      propertyGender !== "mixed" ? propertyGender : isApartment ? "mixed" : "male";
    const normalizedGender = normalizeGenderValue(
      formData.genderRestriction,
      fallbackGender,
    );
    const allowedGenders = new Set(genderOptions.map((option) => option.value));

    if (!allowedGenders.has(normalizedGender)) {
      handleInputChange("genderRestriction", fallbackGender);
      return;
    }

    if (normalizedGender !== formData.genderRestriction) {
      handleInputChange("genderRestriction", normalizedGender);
    }
  }, [
    formData.genderRestriction,
    genderOptions,
    isApartment,
    propertyGender,
  ]);

  const updateDurationPricing = (term, patch) => {
    setFormData((prev) => ({
      ...prev,
      durationPricing: {
        ...prev.durationPricing,
        [term]: {
          ...prev.durationPricing?.[term],
          ...patch,
        },
      },
    }));
  };

  const validateForm = (data) => {
    const errors = {};
    if (!data.roomNumber || !String(data.roomNumber).trim())
      errors.roomNumber = "Room number is required";

    const bp = data.billingPolicy || "monthly";
    if (bp === "monthly" || bp === "monthly_with_daily") {
      const m = parseFloat(data.monthlyRate);
      if (!m || m <= 0) errors.monthlyRate = "Enter a valid monthly rate";
    }
    if (bp === "daily" || bp === "monthly_with_daily") {
      const d = parseFloat(data.dailyRate);
      if (!d || d <= 0) errors.dailyRate = "Enter a valid daily rate";
    }

    const cap = parseInt(data.capacity, 10);
    if (!cap || cap < 1) errors.capacity = "Capacity must be 1 or more";
    else if (cap > 10) errors.capacity = "Max capacity is 10";

    const ms = parseInt(data.minStayDays, 10);
    if (!ms || ms < 1) errors.minStayDays = "Min stay must be at least 1 day";

    if (data.roomType === "bedSpacer" && data.pricingModel !== "per_bed") {
      errors.pricingModel = "Bed Spacer must use per-bed pricing";
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  const openAddModal = () => {
    if (!selectedPropertyId) {
      showAlert("Error", "Select a property first");
      return;
    }
    setModalMode("add");
    const initialRT = isBedSpacerProperty ? "bedSpacer" : "single";
    const initialPM = isBedSpacerProperty ? "per_bed" : "full_room";

    setFormData({
      id: null,
      roomNumber: "",
      roomType: initialRT,
      genderRestriction: propertyGender !== "mixed" ? propertyGender : isApartment ? "mixed" : "male",
      floor: normalizeFloorValue("1", "1", propertyFloorCount),
      monthlyRate: "",
      dailyRate: "",
      billingPolicy: "monthly",
      minStayDays: "1",
      capacity: initialRT === "bedSpacer" ? "1" : "1",
      pricingModel: initialPM,
      description: "",
      status: "available",
      require1MonthAdvance: null,
      amenities: [],
      rules: [],
      durationPricing: createInitialDurationPricing(),
    });
    setSelectedImages([]);
    setFieldErrors({});
    setModalVisible(true);
  };

  const openEditModal = (room) => {
    const normalizedDurationPricing = createInitialDurationPricing();
    const promos = room.duration_pricing || room.long_term_promos;

    if (Array.isArray(promos)) {
      promos.forEach((entry) => {
        const term = String(entry?.months ?? entry?.term ?? '');
        if (!LONG_TERM_PROMO_TERMS.includes(term)) return;
        normalizedDurationPricing[term] = {
          enabled: true,
          discountType: entry?.discount_type === 'fixed' ? 'fixed' : 'percent',
          discountValue: String(entry?.discount_value ?? entry?.discountValue ?? ''),
        };
      });
    } else if (promos && typeof promos === 'object') {
      LONG_TERM_PROMO_TERMS.forEach((term) => {
        const entry = promos?.[term] ?? promos?.[Number(term)];
        if (!entry || typeof entry !== 'object') return;

        normalizedDurationPricing[term] = {
          enabled: true,
          discountType: entry.discount_type === 'fixed' ? 'fixed' : 'percent',
          discountValue: String(entry.discount_value ?? ''),
        };
      });
    }


    setModalMode("edit");
    setFormData({
      id: room.id,
      roomNumber: room.room_number || "",
      roomType: room.room_type || "single",
      genderRestriction: room.gender_restriction || (propertyGender !== "mixed" ? propertyGender : isApartment ? "mixed" : "male"),
      floor: normalizeFloorValue(room.floor, "1", propertyFloorCount),
      monthlyRate: String(room.monthly_rate || ""),
      dailyRate: String(room.daily_rate || ""),
      billingPolicy: room.billing_policy || "monthly",
      minStayDays: String(room.min_stay_days || "1"),
      capacity: String(room.capacity || "1"),
      pricingModel: room.pricing_model || "full_room",
      description: room.description || "",
      status: room.status || "available",
      amenities: parseList(room.amenities),
      rules: parseList(room.rules),
      require1MonthAdvance: room.require_1month_advance === null || room.require_1month_advance === undefined
        ? null
        : !!room.require_1month_advance,
      durationPricing: normalizedDurationPricing,
      occupied: room.occupied || 0,
    });
    setSelectedImages([]);
    setFieldErrors({});
    setModalVisible(true);
  };

  const toggleAmenity = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const toggleRule = (rule) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.includes(rule)
        ? prev.rules.filter((r) => r !== rule)
        : [...prev.rules, rule],
    }));
  };

  const handleAddAmenity = async () => {
    if (!newAmenity.trim() || !selectedPropertyId) return;
    const res = await PropertyService.addPropertyAmenity(
      selectedPropertyId,
      newAmenity.trim(),
    );
    if (res.success) {
      setActionError("");
      setFormData((prev) => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()],
      }));
      setNewAmenity("");
      await refetchLandlordQueries([refetchProperties]);
    } else {
      setActionError(res.error || "Failed to add amenity");
    }
  };

  const handleAddRule = async () => {
    if (!newRule.trim() || !selectedPropertyId) return;
    const res = await PropertyService.addPropertyRule(
      selectedPropertyId,
      newRule.trim(),
    );
    if (res.success) {
      setActionError("");
      setFormData((prev) => ({
        ...prev,
        rules: [...prev.rules, newRule.trim()],
      }));
      setNewRule("");
      await refetchLandlordQueries([refetchProperties]);
    } else {
      setActionError(res.error || "Failed to add property rule");
    }
  };

  const handlePickImages = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!res.canceled) {
      const mapped = res.assets.map((a, i) => ({
        uri: a.uri,
        name: a.fileName || `room-${Date.now()}-${i}.jpg`,
        type: a.mimeType || "image/jpeg",
      }));
      setSelectedImages((prev) => [...prev, ...mapped]);
    }
  };

  const handleSubmit = async () => {
    const { valid, errors } = validateForm(formData);
    if (!valid) {
      setFieldErrors(errors);
      showAlert("Validation Error", "Please fix the highlighted errors.");
      return;
    }

    setModalLoading(true);
    try {
      const payload = new FormData();
      payload.append("property_id", selectedPropertyId);
      payload.append("room_number", formData.roomNumber.trim());
      payload.append("room_type", formData.roomType);
      payload.append("gender_restriction", formData.genderRestriction);
      payload.append("floor", formData.floor);
      payload.append("capacity", isApartment ? "1" : formData.capacity);
      payload.append("billing_policy", formData.billingPolicy);
      payload.append("pricing_model", formData.pricingModel);
      // Only send min_stay_days for non-monthly billing (monthly auto-enforces 30 days)
      if (formData.billingPolicy !== "monthly" && formData.minStayDays) {
        payload.append("min_stay_days", formData.minStayDays);
      }
      payload.append("description", formData.description || "");
      payload.append("status", formData.status);
      // Only send if explicitly set; null means inherit from property
      if (formData.require1MonthAdvance !== null) {
        payload.append("require_1month_advance", formData.require1MonthAdvance ? "1" : "0");
      }

      const durationPricingPayload = buildDurationPricingPayload(
        formData.durationPricing,
      );
      if (Object.keys(durationPricingPayload).length > 0) {
        payload.append("duration_pricing", JSON.stringify(durationPricingPayload));
      }


      if (formData.monthlyRate)
        payload.append("monthly_rate", formData.monthlyRate);
      if (formData.dailyRate) payload.append("daily_rate", formData.dailyRate);

      formData.amenities.forEach((a, i) =>
        payload.append(`amenities[${i}]`, a),
      );
      formData.rules.forEach((r, i) => payload.append(`rules[${i}]`, r));
      selectedImages.forEach((img, i) => payload.append(`images[${i}]`, img));

      const res =
        modalMode === "add"
          ? await PropertyService.createRoom(payload)
          : await PropertyService.updateRoom(formData.id, payload);

      if (res.success) {
        setActionError("");
        showAlert("Success", modalMode === "add" ? "Room added successfully" : "Room updated successfully");
        setModalVisible(false);
        await refetchLandlordQueries(roomRefetchers);
      } else {
        setActionError(res.error || "Failed to save room");
        showAlert("Error", res.error || "Failed to save room");
      }
    } finally {
      setModalLoading(false);
    }
  };

  const openRoomDetailsModal = (room) => {
    if (!room) return;
    setDetailRoom(room);
    setExpandedDetailProxyKeys({});
    setDetailModalVisible(true);
  };

  const getOptionLabel = (options, value, fallback = "Select option") => {
    const matched = options.find((option) => option.value === value);
    return matched?.label || fallback;
  };

  const renderRoomCard = ({ item }) => {
    const badge = statusTokens[item.status] || statusTokens.available;
    const roomTenants = Array.isArray(item.tenants) ? item.tenants : [];
    const proxyAccounts = roomTenants.filter(
      (tenant) =>
        Boolean(tenant?.is_proxy_account)
        || String(tenant?.booking_mode || "").toLowerCase() === "proxy",
    );
    const directTenants = roomTenants.filter(
      (tenant) =>
        !Boolean(tenant?.is_proxy_account)
        && String(tenant?.booking_mode || "").toLowerCase() !== "proxy",
    );
    const calculatedOccupiedCount = roomTenants.reduce((acc, t) => {
      const isProxy =
        Boolean(t?.is_proxy_account) ||
        String(t?.booking_mode || "").toLowerCase() === "proxy";
      const tCount = isProxy
        ? Math.max(
          1,
          Number(
            t?.occupant_count ||
            (Array.isArray(t?.occupants) ? t.occupants.length : 0) ||
            t?.bed_count ||
            1,
          ),
        )
        : 1;
      return acc + tCount;
    }, 0);
    const occupiedCount = calculatedOccupiedCount > 0
      ? calculatedOccupiedCount
      : Number(item?.occupied || item?.occupied_count || 0);

    const fallbackTenantName =
      item?.tenant
      || item?.current_tenant?.name
      || [item?.current_tenant?.first_name, item?.current_tenant?.last_name]
        .filter(Boolean)
        .join(" ");
    const capacityCount = Number(item?.capacity || 0);
    const hasExistingTenant = Boolean(
      item.tenant_id ||
      item.current_tenant_id ||
      item.tenant?.id ||
      item.current_tenant?.id ||
      occupiedCount > 0,
    );
    const cover = item.images?.[0]
      ? {
        uri: getImageUrl(
          typeof item.images[0] === "string"
            ? item.images[0]
            : item.images[0].path,
        ),
      }
      : null;

    return (
      <View style={styles.roomCard}>
        {cover ? (
          <Image source={cover} style={styles.roomImage} />
        ) : (
          <View
            style={[
              styles.roomImage,
              { alignItems: "center", justifyContent: "center" },
            ]}
          >
            <Ionicons name="bed-outline" size={40} color="#94A3B8" />
          </View>
        )}
        <View style={styles.imageOverlayRow}>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>
              {badge.label}
            </Text>
          </View>

          <View style={styles.roomMenuAnchor}>
            <TouchableOpacity
              style={[
                styles.roomMenuButton,
                activeMenuRoomId === item.id ? styles.roomMenuButtonActive : null,
              ]}
              onPress={() =>
                setActiveMenuRoomId((prev) =>
                  prev === item.id ? null : item.id,
                )
              }
            >
              <Ionicons
                name="ellipsis-vertical"
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {activeMenuRoomId === item.id && (
              <View style={styles.roomMenuSheet}>
                <TouchableOpacity
                  style={styles.roomMenuItem}
                  onPress={() => {
                    setActiveMenuRoomId(null);
                    openEditModal(item);
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#0369A1" />
                  <Text style={styles.roomMenuItemText}>Edit</Text>
                </TouchableOpacity>

                {item.status === "available" && (
                  <TouchableOpacity
                    style={styles.roomMenuItem}
                    onPress={() => {
                      setActiveMenuRoomId(null);
                      setAssignTargetRoom(item);
                      setTenantModalVisible(true);
                    }}
                  >
                    <Ionicons name="person-add-outline" size={16} color="#15803D" />
                    <Text style={styles.roomMenuItemText}>Assign</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.roomMenuItem,
                    !hasExistingTenant && styles.roomMenuItemLast,
                  ]}
                  onPress={() => {
                    setActiveMenuRoomId(null);
                    setStatusTarget(item);
                    setStatusModalVisible(true);
                  }}
                >
                  <Ionicons name="swap-horizontal" size={16} color="#B45309" />
                  <Text style={styles.roomMenuItemText}>Status</Text>
                </TouchableOpacity>

                {hasExistingTenant && (
                  <TouchableOpacity
                    style={[styles.roomMenuItem, styles.roomMenuItemLast]}
                    onPress={() => {
                      setActiveMenuRoomId(null);
                      setExtendTarget(item);
                      setExtendType("months");
                      setExtendValue("1");
                      setExtendModalVisible(true);
                    }}
                  >
                    <Ionicons name="time-outline" size={16} color="#7E22CE" />
                    <Text style={styles.roomMenuItemText}>Extend</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.roomContent}>
          <View style={styles.roomTopRow}>
            <View>
              <Text style={styles.roomTitle}>Room {item.room_number}</Text>
              <Text style={styles.roomMeta}>
                {item.room_type} • Floor {item.floor} • Capacity: {item.capacity || 1}
              </Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.price}>
                {formatCurrency(item.unit_price || item.monthly_rate || item.daily_rate)}
              </Text>
              <Text style={styles.priceCaption}>
                {item.billing_policy === "daily" ? "per day" : "per month"}
              </Text>
            </View>
          </View>

          <View style={styles.capacityRow}>
            <Ionicons name="people-outline" size={15} color={theme.colors.textSecondary} />
            <Text style={styles.capacityText}>
              {occupiedCount}/{capacityCount || 1} Occupancy
            </Text>
          </View>

          <View style={styles.tenantCard}>
            <View>
              <Text style={styles.tenantLabel}>Current Occupants</Text>
              {roomTenants.length > 0 ? (
                roomTenants.map((tenant, idx) => {
                  const tenantName =
                    tenant?.name ||
                    [tenant?.first_name, tenant?.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                    `Tenant ${idx + 1}`;
                  return (
                    <Text
                      key={`${item.id}-tenant-${tenant?.id || idx}`}
                      style={styles.tenantText}
                    >
                      {tenantName}
                    </Text>
                  );
                })
              ) : (
                <Text style={styles.tenantText}>
                  {fallbackTenantName || "No tenant assigned"}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.roomDetailsLink}
              onPress={() => openRoomDetailsModal(item)}
            >
              <Text style={styles.roomDetailsLinkText}>View Room Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing && rooms.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.primary}
        />
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.emptyTitle}>Loading room data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.primary}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Room Management</Text>
        <TouchableOpacity style={styles.iconButton} onPress={openAddModal}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRoomCard}
        ListHeaderComponent={
          <View>
            {(fetchError || actionError) ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{actionError || fetchError}</Text>
              </View>
            ) : null}

            {!preselectedPropertyId && properties.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.propertyScroll}
              >
                {properties.map((p) => {
                  const isActive = normalizeId(p.id) === selectedPropertyId;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.propertyChip, isActive && styles.propertyChipActive]}
                      onPress={() => setSelectedPropertyId(normalizeId(p.id))}
                    >
                      <Text style={[styles.propertyChipTitle, isActive && styles.propertyChipTitleActive]}>
                        {p.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Occupied</Text>
                <Text style={[styles.statValue, { color: "#B91C1C" }]}>
                  {stats.occupied}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Available</Text>
                <Text style={[styles.statValue, { color: "#15803D" }]}>
                  {stats.available}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Maintenance</Text>
                <Text style={[styles.statValue, { color: "#B45309" }]}>
                  {stats.maintenance}
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.filterChip,
                    filter === f.value && styles.filterChipActive,
                  ]}
                  onPress={() => setFilter(f.value)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === f.value && { color: "#16a34a" },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRoomsRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Room Details Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.detailsModalOverlay}>
          <View style={styles.detailsModalCard}>
            <View style={styles.detailsModalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailsModalTitle}>
                  Room {detailRoom?.room_number || "-"}
                </Text>
                <Text style={styles.detailsModalMeta}>
                  {detailRoom?.room_type || "Room"} • Floor {detailRoom?.floor || "-"}
                </Text>
                {(() => {
                  const proxyCount = (Array.isArray(detailRoom?.tenants) ? detailRoom.tenants : []).filter(
                    (tenant) =>
                      Boolean(tenant?.is_proxy_account)
                      || String(tenant?.booking_mode || "").toLowerCase() === "proxy",
                  ).length;

                  if (proxyCount <= 0) return null;

                  return (
                    <View style={styles.detailsProxyBadge}>
                      <Text style={styles.detailsProxyBadgeText}>
                        {proxyCount} {proxyCount === 1 ? "Proxy Account" : "Proxy Accounts"}
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <TouchableOpacity
                style={styles.detailsModalCloseButton}
                onPress={() => setDetailModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.detailsModalScroll}
              contentContainerStyle={styles.detailsModalContent}
              showsVerticalScrollIndicator={false}
            >
              {(() => {
                const roomTenants = Array.isArray(detailRoom?.tenants) ? detailRoom.tenants : [];
                const calculatedOccupiedCount = roomTenants.reduce((acc, t) => {
                  const isProxy =
                    Boolean(t?.is_proxy_account) ||
                    String(t?.booking_mode || "").toLowerCase() === "proxy";
                  const tCount = isProxy
                    ? Math.max(
                      1,
                      Number(
                        t?.occupant_count ||
                        (Array.isArray(t?.occupants) ? t.occupants.length : 0) ||
                        t?.bed_count ||
                        1,
                      ),
                    )
                    : 1;
                  return acc + tCount;
                }, 0);
                const occupiedCount = calculatedOccupiedCount > 0
                  ? calculatedOccupiedCount
                  : Number(detailRoom?.occupied || detailRoom?.occupied_count || 0);

                const proxyAccounts = roomTenants.filter(
                  (tenant) =>
                    Boolean(tenant?.is_proxy_account)
                    || String(tenant?.booking_mode || "").toLowerCase() === "proxy",
                );
                const directTenants = roomTenants.filter(
                  (tenant) =>
                    !Boolean(tenant?.is_proxy_account)
                    && String(tenant?.booking_mode || "").toLowerCase() !== "proxy",
                );
                const fallbackTenantName =
                  detailRoom?.tenant
                  || detailRoom?.current_tenant?.name
                  || [detailRoom?.current_tenant?.first_name, detailRoom?.current_tenant?.last_name]
                    .filter(Boolean)
                    .join(" ");

                return (
                  <>
                    <View style={styles.detailsStatsRow}>
                      <View style={styles.detailsStatCard}>
                        <Text style={styles.detailsStatLabel}>Occupancy</Text>
                        <Text style={styles.detailsStatValue}>
                          {occupiedCount}/{Number(detailRoom?.capacity || 0) || 1}
                        </Text>
                      </View>
                      <View style={styles.detailsStatCard}>
                        <Text style={styles.detailsStatLabel}>Rate</Text>
                        <Text style={styles.detailsStatValue}>
                          {formatCurrency(detailRoom?.unit_price || detailRoom?.monthly_rate || detailRoom?.daily_rate || 0)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailsTenantSection}>
                      {proxyAccounts.length > 0 ? (
                        <View style={styles.proxyHierarchySection}>
                          <Text style={styles.tenantLabel}>Proxy Accounts</Text>
                          {proxyAccounts.map((proxyAccount, idx) => {
                            const proxyKey = `detail-${detailRoom?.id || "room"}-${proxyAccount?.booking_id || proxyAccount?.id || idx}`;
                            const isExpanded = Boolean(expandedDetailProxyKeys[proxyKey]);
                            const proxyName =
                              proxyAccount?.name
                              || [proxyAccount?.first_name, proxyAccount?.last_name].filter(Boolean).join(" ")
                              || "Proxy Account";
                            const occupantProfiles = Array.isArray(proxyAccount?.occupants)
                              ? proxyAccount.occupants
                              : [];
                            const occupantCount = Math.max(
                              1,
                              Number(proxyAccount?.occupant_count || occupantProfiles.length || proxyAccount?.bed_count || 1),
                            );

                            return (
                              <View key={proxyKey} style={styles.proxyAccountCard}>
                                <View style={styles.proxyAccountHeaderRow}>
                                  <Text style={styles.proxyAccountName}>{proxyName}</Text>
                                  <Text style={styles.proxyAccountMeta}>
                                    {occupantCount} {occupantCount === 1 ? "occupant" : "occupants"}
                                  </Text>
                                </View>

                                <TouchableOpacity
                                  onPress={() => {
                                    setExpandedDetailProxyKeys((prev) => ({
                                      ...prev,
                                      [proxyKey]: !prev[proxyKey],
                                    }));
                                  }}
                                  style={styles.proxyToggleButton}
                                >
                                  <Text style={styles.proxyToggleText}>
                                    {isExpanded ? "Hide Occupants" : "Show Occupants"}
                                  </Text>
                                </TouchableOpacity>

                                {isExpanded && (
                                  <View style={styles.proxyOccupantList}>
                                    {occupantProfiles.length > 0 ? (
                                      occupantProfiles.map((occupant, occupantIndex) => {
                                        const occupantName =
                                          occupant?.full_name
                                          || occupant?.name
                                          || `Occupant ${occupantIndex + 1}`;
                                        const occupantMeta = [
                                          occupant?.relationship_to_booker,
                                          occupant?.gender,
                                        ]
                                          .filter(Boolean)
                                          .join(" • ");

                                        return (
                                          <View key={`${proxyKey}-occupant-${occupant?.id || occupantIndex}`} style={styles.proxyOccupantRow}>
                                            <Text style={styles.proxyOccupantName}>{occupantName}</Text>
                                            {occupantMeta ? (
                                              <Text style={styles.proxyOccupantMeta}>{occupantMeta}</Text>
                                            ) : null}
                                          </View>
                                        );
                                      })
                                    ) : (
                                      <Text style={styles.proxyOccupantMeta}>Occupant details are still syncing.</Text>
                                    )}
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      ) : null}

                      {directTenants.length > 0 ? (
                        <View style={styles.regularTenantSection}>
                          <Text style={styles.tenantLabel}>Current Occupants</Text>
                          {directTenants.map((tenant, idx) => {
                            const tenantName =
                              tenant?.name
                              || [tenant?.first_name, tenant?.last_name].filter(Boolean).join(" ")
                              || `Tenant ${idx + 1}`;

                            return (
                              <Text key={`detail-${detailRoom?.id || "room"}-tenant-${tenant?.id || idx}`} style={styles.tenantText}>
                                {tenantName}
                              </Text>
                            );
                          })}
                        </View>
                      ) : null}

                      {proxyAccounts.length === 0 && directTenants.length === 0 ? (
                        <View>
                          <Text style={styles.tenantLabel}>Current Occupants</Text>
                          <Text style={styles.tenantText}>{fallbackTenantName || "No tenant assigned"}</Text>
                        </View>
                      ) : null}
                    </View>
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {modalMode === "add" ? "Add New Room" : "Edit Room"}
            </Text>
            <View style={styles.modalEmptyView} />
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            <Text style={styles.sectionTitle}>Basic Information</Text>

            {/* Row 1: Room Number | Floor | Room Type */}
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>
                  Room Number <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    fieldErrors.roomNumber && { borderColor: "#EF4444" },
                  ]}
                  value={formData.roomNumber}
                  onChangeText={(t) => handleInputChange("roomNumber", t)}
                  placeholder="e.g., 301"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>
                  Floor <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.selectTrigger}
                  onPress={() => setFloorSelectModalVisible(true)}
                >
                  <Text style={styles.selectTriggerText}>
                    {getOptionLabel(floorOptions, formData.floor, "Select floor")}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.label}>
              Room Type <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.selectTrigger,
                isBedSpacerProperty && {
                  backgroundColor: theme.colors.backgroundSecondary,
                },
              ]}
              disabled={isBedSpacerProperty}
              onPress={() => {
                if (!isBedSpacerProperty) {
                  setRoomTypeSelectModalVisible(true);
                }
              }}
            >
              <Text style={styles.selectTriggerText}>
                {getOptionLabel(roomTypes, roomTypeValue, "Select room type")}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <>
              <Text style={styles.label}>
                Gender <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.selectTrigger,
                  propertyGender !== "mixed" && {
                    backgroundColor: theme.colors.backgroundSecondary,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.selectTriggerInner}
                  disabled={propertyGender !== "mixed"}
                  onPress={() => {
                    if (propertyGender === "mixed") {
                      setGenderSelectModalVisible(true);
                    }
                  }}
                >
                  <Text style={styles.selectTriggerText}>
                    {getOptionLabel(
                      [
                        { label: "Boys", value: "male" },
                        { label: "Girls", value: "female" },
                        ...(isApartment || (!isDormitory && !isBoarding && !isBedSpacerProperty)
                          ? [{ label: "Mixed", value: "mixed" }]
                          : []),
                      ],
                      formData.genderRestriction,
                      "Select gender",
                    )}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {propertyGender !== "mixed" && (
                <Text style={[styles.helperText, { marginTop: -12, marginBottom: 12, color: "#D97706" }]}>
                  * Property is restricted to {propertyGender} only.
                </Text>
              )}
            </>

            {/* Billing Row */}
            <Text style={styles.sectionTitle}>Billing & Rates</Text>
            <Text style={styles.label}>Billing Policy</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                mode={pickerMode}
                style={styles.picker}
                itemStyle={styles.pickerItem}
                dropdownIconColor={theme.colors.textSecondary}
                selectedValue={formData.billingPolicy}
                onValueChange={(v) => handleInputChange("billingPolicy", v)}
              >
                <Picker.Item label="Monthly Rate" value="monthly" color={pickerTextColor} />
                <Picker.Item
                  label="Monthly + Daily"
                  value="monthly_with_daily"
                  color={pickerTextColor}
                />
                <Picker.Item label="Daily Rate" value="daily" color={pickerTextColor} />
              </Picker>
            </View>

            <View style={styles.inputRow}>
              {formData.billingPolicy !== "daily" && (
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>
                    Monthly Rate (₱/month){" "}
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.monthlyRate && { borderColor: "#EF4444" },
                    ]}
                    keyboardType="numeric"
                    value={formData.monthlyRate}
                    onChangeText={(t) => handleInputChange("monthlyRate", t)}
                    placeholder="e.g., 5000"
                  />
                </View>
              )}
              {formData.billingPolicy !== "monthly" && (
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>
                    Daily Rate (₱/day){" "}
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.dailyRate && { borderColor: "#EF4444" },
                    ]}
                    keyboardType="numeric"
                    value={formData.dailyRate}
                    onChangeText={(t) => handleInputChange("dailyRate", t)}
                    placeholder="e.g., 300"
                  />
                </View>
              )}
            </View>

            {/* Min Stay & Capacity Row */}
            <View style={styles.inputRow}>
              {/* Only show minimum stay for daily and monthly_with_daily billing */}
              {formData.billingPolicy !== "monthly" && (
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Minimum Stay (days)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.minStayDays && { borderColor: "#EF4444" },
                    ]}
                    keyboardType="numeric"
                    value={formData.minStayDays}
                    onChangeText={(t) => handleInputChange("minStayDays", t)}
                    placeholder="e.g., 7"
                  />
                  {fieldErrors.minStayDays && (
                    <Text style={{ color: "#EF4444", fontSize: 11, marginTop: 4 }}>
                      {fieldErrors.minStayDays}
                    </Text>
                  )}
                </View>
              )}
              {/* Show info message for monthly billing */}
              {formData.billingPolicy === "monthly" && (
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Minimum Stay</Text>
                  <View style={{ backgroundColor: "#DBEAFE", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#93C5FD" }}>
                    <Text style={{ fontSize: 13, color: "#1E40AF", fontWeight: "600" }}>
                      30 days (auto-enforced)
                    </Text>
                    <Text style={{ fontSize: 11, color: "#2563EB", marginTop: 4 }}>
                      Monthly billing requires minimum 1 month stay
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.inputHalf}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.label}>
                    Capacity <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    (isDormitory || isBoarding) &&
                    formData.roomType !== "bedSpacer" && {
                      backgroundColor: theme.colors.backgroundSecondary,
                    },
                    fieldErrors.capacity && { borderColor: "#EF4444" },
                  ]}
                  keyboardType="numeric"
                  value={formData.capacity}
                  onChangeText={(t) => handleInputChange("capacity", t)}
                  editable={
                    !(
                      (isDormitory || isBoarding) &&
                      formData.roomType !== "bedSpacer"
                    )
                  }
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Pricing Model</Text>
            <Text style={[styles.helperText, { marginBottom: 16 }]}>
              {formData.roomType === "bedSpacer"
                ? "Bed Spacer rooms use per-bed pricing only"
                : "How should tenants pay for this room?"}
            </Text>

            <View style={styles.pricingGroup}>
              {formData.roomType !== "bedSpacer" && (
                <TouchableOpacity
                  style={[
                    styles.pricingCard,
                    formData.pricingModel === "full_room" &&
                    styles.pricingCardActive,
                  ]}
                  onPress={() => handleInputChange("pricingModel", "full_room")}
                >
                  <View style={styles.pricingRadioRow}>
                    <Ionicons
                      name={
                        formData.pricingModel === "full_room"
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={20}
                      color={
                        formData.pricingModel === "full_room"
                          ? "#16a34a"
                          : "#6B7280"
                      }
                    />
                    <View style={styles.pricingTextContent}>
                      <Text
                        style={[
                          styles.pricingCardTitle,
                          formData.pricingModel === "full_room" && {
                            color: "#16a34a",
                          },
                        ]}
                      >
                        Room Price
                      </Text>
                      <Text style={styles.pricingCardDesc}>
                        {parseInt(formData.capacity) > 1
                          ? `Tenants divide ₱${formData.monthlyRate || "0"} equally (₱${formData.monthlyRate && formData.capacity ? Math.round(parseFloat(formData.monthlyRate) / parseInt(formData.capacity)).toLocaleString() : "0"}/person)`
                          : "Single tenant pays full price"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {(formData.roomType !== "single" ||
                formData.roomType === "bedSpacer") && (
                  <TouchableOpacity
                    style={[
                      styles.pricingCard,
                      formData.pricingModel === "per_bed" &&
                      styles.pricingCardActive,
                    ]}
                    onPress={() => handleInputChange("pricingModel", "per_bed")}
                  >
                    <View style={styles.pricingRadioRow}>
                      <Ionicons
                        name={
                          formData.pricingModel === "per_bed"
                            ? "radio-button-on"
                            : "radio-button-off"
                        }
                        size={20}
                        color={
                          formData.pricingModel === "per_bed"
                            ? "#16a34a"
                            : "#6B7280"
                        }
                      />
                      <View style={styles.pricingTextContent}>
                        <Text
                          style={[
                            styles.pricingCardTitle,
                            formData.pricingModel === "per_bed" && {
                              color: "#16a34a",
                            },
                          ]}
                        >
                          Per Bed/Tenant Price
                        </Text>
                        <Text style={styles.pricingCardDesc}>
                          Each tenant pays ₱${formData.monthlyRate || "0"} for
                          their bed (independent billing)
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
            </View>

            <Text style={styles.sectionTitle}>Lease Advance</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Require 1-Month Advance</Text>
                {formData.require1MonthAdvance === null && selectedProperty?.require_1month_advance ? (
                  <Text style={{ fontSize: 11, color: '#D97706', marginTop: 2 }}>
                    ✦ Inherited from property — toggle to override
                  </Text>
                ) : formData.require1MonthAdvance === null ? (
                  <Text style={styles.helperText}>If enabled, tenants must pay an extra month upfront.</Text>
                ) : (
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                    {formData.require1MonthAdvance
                      ? 'Override: advance enabled for this room.'
                      : 'Override: advance disabled for this room.'}
                  </Text>
                )}
              </View>
              <Switch
                value={formData.require1MonthAdvance ?? (selectedProperty?.require_1month_advance ?? false)}
                onValueChange={(v) => handleInputChange("require1MonthAdvance", v)}
                trackColor={{ true: "#16a34a", false: "#CBD5E1" }}
                thumbColor="#FFFFFF"
              />
            </View>
            {formData.require1MonthAdvance !== null && (
              <TouchableOpacity
                onPress={() => handleInputChange("require1MonthAdvance", null)}
                style={{ marginBottom: 16 }}
              >
                <Text style={{ fontSize: 11, color: '#3B82F6', textDecorationLine: 'underline' }}>
                  Reset to inherit from property
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>Long-Term Promos</Text>
            <Text style={[styles.helperText, { marginBottom: 16 }]}>
              Enable discounts for exact 3, 6, 9, or 12-month stays.
            </Text>

            <View style={{ gap: 12 }}>
              {LONG_TERM_PROMO_TERMS.map((term) => {
                const promo = formData.durationPricing?.[term] || {};
                return (
                  <View
                    key={term}
                    style={[
                      styles.promoCard,
                      promo.enabled && styles.promoCardActive,
                    ]}
                  >
                    <View style={styles.promoHeader}>
                      <Text style={styles.promoTermText}>{term} Months</Text>
                      <Switch
                        value={promo.enabled}
                        onValueChange={(v) => updateDurationPricing(term, { enabled: v })}
                        trackColor={{ true: "#16a34a", false: "#CBD5E1" }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                    {promo.enabled && (
                      <View style={styles.promoInputs}>
                        <View style={[styles.pickerWrapper, { flex: 1, marginRight: 8 }]}>
                          <Picker
                            mode={pickerMode}
                            style={styles.picker}
                            itemStyle={styles.pickerItem}
                            dropdownIconColor={theme.colors.textSecondary}
                            selectedValue={promo.discountType}
                            onValueChange={(v) => updateDurationPricing(term, { discountType: v })}
                          >
                            <Picker.Item label="% Off" value="percent" color={pickerTextColor} />
                            <Picker.Item label="PHP Off" value="fixed" color={pickerTextColor} />
                          </Picker>
                        </View>
                        <TextInput
                          style={[styles.input, { flex: 1, marginBottom: 0 }]}
                          keyboardType="numeric"
                          value={String(promo.discountValue)}
                          onChangeText={(v) => updateDurationPricing(term, { discountValue: v })}
                          placeholder={promo.discountType === "percent" ? "e.g. 10" : "e.g. 1500"}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add room description..."
              multiline
              value={formData.description}
              onChangeText={(t) => handleInputChange("description", t)}
            />

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Room Rules (optional)</Text>
            <View style={[styles.pillList, { marginBottom: 16 }]}>
              {propertyRules.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.pill,
                    formData.rules.includes(r) && styles.pillActive,
                  ]}
                  onPress={() => toggleRule(r)}
                >
                  <Text style={styles.pillText}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Add new rule (e.g., no smoking)"
                value={newRule}
                onChangeText={setNewRule}
              />
              <TouchableOpacity
                style={[
                  styles.pill,
                  {
                    paddingVertical: 0,
                    justifyContent: "center",
                    borderColor: "#16a34a",
                  },
                ]}
                onPress={handleAddRule}
              >
                <Ionicons name="add" size={20} color="#16a34a" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.helperText, { marginTop: 8 }]}>
              Select rules to include for this room or add a new rule to the
              property.
            </Text>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Room Amenities</Text>
            <View style={[styles.pillList, { marginBottom: 16 }]}>
              {propertyAmenities.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[
                    styles.pill,
                    formData.amenities.includes(a) && styles.pillActive,
                  ]}
                  onPress={() => toggleAmenity(a)}
                >
                  <Text style={styles.pillText}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="e.g., Water Heater, Study Lamp"
                value={newAmenity}
                onChangeText={setNewAmenity}
              />
              <TouchableOpacity
                style={[
                  styles.pill,
                  {
                    paddingVertical: 0,
                    justifyContent: "center",
                    borderColor: "#16a34a",
                  },
                ]}
                onPress={handleAddAmenity}
              >
                <Ionicons name="add" size={20} color="#16a34a" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.helperText, { marginTop: 8 }]}>
              Add amenities that will be available in this room and saved to
              property
            </Text>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Room Images</Text>
            <View style={styles.imageGrid}>
              {selectedImages.map((img, i) => (
                <View key={i} style={styles.imagePreview}>
                  <Image
                    source={{ uri: img.uri }}
                    style={{ width: "100%", height: "100%" }}
                  />
                  {i === 0 && (
                    <View
                      style={{
                        position: "absolute",
                        left: 6,
                        top: 6,
                        backgroundColor: "#16a34a",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 10,
                          fontWeight: "700",
                        }}
                      >
                        Cover
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.imageRemove}
                    onPress={() =>
                      setSelectedImages((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                  >
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {selectedImages.length < 10 && (
                <TouchableOpacity
                  style={[styles.imagePreview, styles.addImageTile]}
                  onPress={handlePickImages}
                >
                  <Ionicons name="camera" size={28} color="#94A3B8" />
                  <Text
                    style={{ color: "#94A3B8", fontSize: 10, marginTop: 8 }}
                  >
                    Add Image
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.helperText, { marginTop: 8 }]}>
              PNG, JPG up to 10MB (Max 10 images)
            </Text>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setModalVisible(false)}
              disabled={modalLoading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSubmit}
              disabled={modalLoading}
            >
              {modalLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {modalMode === "add" ? "Add Room" : "Save Changes"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={floorSelectModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setFloorSelectModalVisible(false)}
      >
        <Pressable
          style={styles.statusModalOverlay}
          onPress={() => setFloorSelectModalVisible(false)}
        >
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 20 }]}>Select Floor</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {floorOptions.map((option, index) => {
                const isLast = index === floorOptions.length - 1;
                const isActive = option.value === formData.floor;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.statusOption, isLast && styles.statusOptionLast]}
                    onPress={() => {
                      handleInputChange("floor", option.value);
                      setFloorSelectModalVisible(false);
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={styles.statusOptionText}>{option.label}</Text>
                      {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setFloorSelectModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={roomTypeSelectModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setRoomTypeSelectModalVisible(false)}
      >
        <Pressable
          style={styles.statusModalOverlay}
          onPress={() => setRoomTypeSelectModalVisible(false)}
        >
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 20 }]}>Select Room Type</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {roomTypes.map((option, index) => {
                const isLast = index === roomTypes.length - 1;
                const isActive = option.value === roomTypeValue;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.statusOption, isLast && styles.statusOptionLast]}
                    onPress={() => {
                      handleInputChange("roomType", option.value);
                      setRoomTypeSelectModalVisible(false);
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={styles.statusOptionText}>{option.label}</Text>
                      {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setRoomTypeSelectModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={genderSelectModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setGenderSelectModalVisible(false)}
      >
        <Pressable
          style={styles.statusModalOverlay}
          onPress={() => setGenderSelectModalVisible(false)}
        >
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 20 }]}>Select Gender</Text>
            {[
              { label: "Boys", value: "male" },
              { label: "Girls", value: "female" },
              ...(isApartment || (!isDormitory && !isBoarding && !isBedSpacerProperty)
                ? [{ label: "Mixed", value: "mixed" }]
                : []),
            ].map((option, index, arr) => {
              const isLast = index === arr.length - 1;
              const isActive = option.value === formData.genderRestriction;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.statusOption, isLast && styles.statusOptionLast]}
                  onPress={() => {
                    handleInputChange("genderRestriction", option.value);
                    setGenderSelectModalVisible(false);
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={styles.statusOptionText}>{option.label}</Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setGenderSelectModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Status Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
      >
        <View style={styles.statusModalOverlay}>
          <View style={styles.statusSheet}>
            <Text
              style={[styles.sectionTitle, { marginTop: 0, marginBottom: 24 }]}
            >
              Update Room Status
            </Text>
            {Object.keys(statusTokens).map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.statusOption}
                onPress={async () => {
                  const res = await PropertyService.updateRoomStatus(
                    statusTarget.id,
                    s,
                  );
                  if (res.success) {
                    setActionError("");
                    setStatusModalVisible(false);
                    await refetchLandlordQueries(roomRefetchers);
                  } else {
                    setActionError(res.error || "Failed to update room status");
                  }
                }}
              >
                <Text style={styles.statusOptionText}>
                  {statusTokens[s].label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.statusOption, { borderBottomWidth: 0 }]}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Extend Stay Modal */}
      <Modal
        visible={extendModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
      >
        <View style={styles.statusModalOverlay}>
          <View style={[styles.statusSheet, { padding: 16 }]}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 8 }]}>
              Extend Stay
            </Text>
            <Text style={[styles.helperText, { marginBottom: 24 }]}>
              Extend the current tenant's stay for Room {extendTarget?.room_number}.
            </Text>

            <View style={{ flexDirection: 'row', marginBottom: 24, gap: 8 }}>
              <TouchableOpacity
                style={[
                  { flex: 1, padding: 16, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
                  extendType === 'months' ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }
                ]}
                onPress={() => setExtendType('months')}
              >
                <Text style={{ color: extendType === 'months' ? '#FFF' : theme.colors.text }}>Months</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  { flex: 1, padding: 16, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
                  extendType === 'days' ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }
                ]}
                onPress={() => setExtendType('days')}
              >
                <Text style={{ color: extendType === 'days' ? '#FFF' : theme.colors.text }}>Days</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { marginBottom: 25 }]}
              placeholder={`Number of ${extendType}`}
              keyboardType="numeric"
              value={extendValue}
              onChangeText={setExtendValue}
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={() => setExtendModalVisible(false)}
                disabled={extending}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 2 }]}
                onPress={async () => {
                  if (!extendValue || isNaN(extendValue) || parseInt(extendValue) <= 0) {
                    showAlert('Invalid Value', `Please enter a valid number of ${extendType}.`);
                    return;
                  }
                  setExtending(true);
                  try {
                    const payload = {
                      [extendType]: parseInt(extendValue),
                      tenant_id: extendTarget.tenant?.id || extendTarget.tenant_id
                    };
                    const res = await PropertyService.extendStay(extendTarget.id, payload);
                    if (res.success) {
                      setActionError("");
                      setExtendModalVisible(false);
                      await refetchLandlordQueries(roomRefetchers);
                      showAlert('Success', 'Stay extended successfully.');
                    } else {
                      setActionError(res.error || 'Failed to extend stay.');
                      showAlert('Error', res.error || 'Failed to extend stay.');
                    }
                  } catch (_err) {
                    setActionError('An unexpected error occurred.');
                    showAlert('Error', 'An unexpected error occurred.');
                  } finally {
                    setExtending(false);
                  }
                }}
                disabled={extending}
              >
                {extending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Confirm Extension</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tenant Selection Modal */}
      <Modal
        visible={tenantModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
      >
        <View style={styles.statusModalOverlay}>
          <View
            style={[
              styles.statusSheet,
              {
                height: "80%",
                paddingBottom: 16,
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 15,
              }}
            >
              <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
                Select Tenant
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setTenantModalVisible(false);
                  setAssignTargetRoom(null);
                  setTenantSearch("");
                }}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.colors.surface,
                borderRadius: 10,
                paddingHorizontal: 8,
                marginBottom: 15,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={{
                  flex: 1,
                  height: 45,
                  marginLeft: 8,
                  color: theme.colors.text,
                }}
                placeholder="Search tenants..."
                placeholderTextColor={theme.colors.textTertiary}
                value={tenantSearch}
                onChangeText={setTenantSearch}
              />
            </View>

            <FlatList
              data={filteredTenants}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                  }}
                  onPress={() => handleSelectTenant(item.id)}
                  disabled={assigningTenant}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.colors.primary + "20",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    >
                      {item.first_name?.[0] || ""}
                      {item.last_name?.[0] || ""}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: theme.colors.text,
                      }}
                    >
                      {item.first_name} {item.last_name}
                    </Text>
                    <Text
                      style={{ fontSize: 13, color: theme.colors.textSecondary }}
                    >
                      {item.email}
                    </Text>
                  </View>
                  {assigningTenant && assignTargetRoom?.id === item.id ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.textTertiary}
                    />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: "center", marginTop: 50 }}>
                  <Text style={{ color: theme.colors.textSecondary }}>
                    No tenants found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
