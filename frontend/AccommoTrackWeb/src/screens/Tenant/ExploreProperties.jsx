import React, { useEffect, useState, useRef as __useRef } from "react";
import { useNavigate } from "react-router-dom";
import PropertyCarousel from "./PropertyCarousel";
import PropertyMap from "../../components/Shared/PropertyMap";
import {
  X,
  MapPin,
  Star,
  Shield,
  Search,
  ArrowLeft,
  ArrowRight,
  Filter,
  Map,
  Play,
  SlidersHorizontal,
} from "lucide-react";
import api, { getImageUrl } from "../../utils/api";
import { showError } from "../../utils/toast";
import { Skeleton } from "../../components/Shared/Skeleton";
import { authService } from "../../services/authService";
import RoomDetailsModal from "../../components/Modals/RoomDetailsModal";
import bookingService from "../../services/bookingService";
import { propertyService } from "../../services/propertyService";
import { useUIState } from "../../contexts/UIStateContext";
import { mapRoom, mapProperty } from "../../utils/propertyHelpers";
import Footer from "../../components/Shared/Footer";
import ImagePlaceholder from "../../components/Shared/ImagePlaceholder";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Keyboard, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const FALLBACK_TYPE_OPTIONS = [
  { value: "All", label: "All", count: null },
  { value: "dormitory", label: "Dormitory", count: 0 },
  { value: "apartment", label: "Apartment", count: 0 },
  { value: "boardingHouse", label: "Boarding House", count: 0 },
  { value: "bedSpacer", label: "Bed Spacer", count: 0 },
];

const DEFAULT_FILTER_AMENITIES = [
  "WiFi",
  "Parking",
  "CR",
  "Air Condition/AC",
  "CCTV",
];

const normalizeTypeToken = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");

const toTypeOption = (item) => {
  if (typeof item === "string") {
    const value = item.trim();
    return value ? { value, label: value, count: 0 } : null;
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const value = String(item.value ?? item.property_type ?? item.type ?? "").trim();
  if (!value) {
    return null;
  }

  const label = String(item.label ?? "").trim() || value;
  const count = Number(item.count ?? item.total ?? 0);

  return {
    value,
    label,
    count: Number.isFinite(count) ? count : 0,
  };
};

const normalizeTypeOptions = (items) => {
  const list = Array.isArray(items)
    ? items.map(toTypeOption).filter(Boolean)
    : [];
  const base = list.length > 0 ? list : FALLBACK_TYPE_OPTIONS.slice(1);
  const seen = new Set();
  const unique = base.filter((option) => {
    const key = normalizeTypeToken(option.value);
    if (!key || key === "all" || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  return [FALLBACK_TYPE_OPTIONS[0], ...unique];
};

const resolveSelectedTypeMeta = (selectedType, options) => {
  const selected = String(selectedType || "").trim();
  if (!selected || normalizeTypeToken(selected) === "all") {
    return { value: "All", label: "All" };
  }

  const selectedKey = normalizeTypeToken(selected);
  const match = options.find(
    (option) =>
      normalizeTypeToken(option.value) === selectedKey ||
      normalizeTypeToken(option.label) === selectedKey,
  );

  return match
    ? { value: match.value, label: match.label }
    : { value: "All", label: "All" };
};

const ExploreProperties = () => {
  const navigate = useNavigate();
  const { uiState, updateScreenState, updateData } = useUIState();
  const isAuthenticated = !!localStorage.getItem("userData");
  const { search, selectedType, currentPage, showMapModal } =
    uiState.explore || {
      search: "",
      selectedType: "All",
      currentPage: 1,
      showMapModal: false,
    };

  const cached = uiState.data?.explore_list;

  const [properties, setProperties] = useState(cached?.items || []);
  const [loading, setLoading] = useState(!cached);
  const [__error, setError] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search || "");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    priceMin: "",
    priceMax: "",
    availabilityOnly: false,
    amenities: [],
    rating: 0,
    sexPolicy: "All",
  });
  const [pagination, setPagination] = useState(cached?.pagination || {
    total: 0,
    totalPages: 0,
    currentPage: 1,
  });

  const [propertyTypeOptions, setPropertyTypeOptions] = useState(FALLBACK_TYPE_OPTIONS);
  const [typesLoaded, setTypesLoaded] = useState(false);

  const selectedTypeMeta = resolveSelectedTypeMeta(
    selectedType,
    propertyTypeOptions,
  );

  const normalizedSelectedType = selectedTypeMeta.value;

  // Search & Pagination helpers
  const pageSize = 12;

  // Modal State
  const [selectedRoomData, setSelectedRoomData] = useState(null);

  // State for the slide-in card inside Map
  const [__selectedMapProperty, setSelectedMapProperty] = useState(null);

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");

  const [modalLoading, setModalLoading] = useState(false);
  const [__modalError, setModalError] = useState(null);

  // Reviews State
  const [drawerReviews, setDrawerReviews] = useState({
    reviews: [],
    summary: null,
  });
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Video State
  const [__videoModalOpen, _setVideoModalOpen] = useState(false);
  const [__videoToPlay, _setVideoToPlay] = useState(null);

  // Full Gallery State
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [mapSearchStatus, setMapSearchStatus] = useState("idle");
  const [mapSearchFeedback, setMapSearchFeedback] = useState("");
  const mapSearchTimerRef = __useRef(null);

  const activeFilterCount =
    (normalizedSelectedType !== "All" ? 1 : 0) +
    (advancedFilters.priceMin || advancedFilters.priceMax ? 1 : 0) +
    (advancedFilters.rating > 0 ? 1 : 0) +
    (advancedFilters.sexPolicy && advancedFilters.sexPolicy !== "All" ? 1 : 0) +
    (advancedFilters.amenities.length > 0 ? 1 : 0);

  const openFullGallery = (property) => {
    if (!property) return;

    const items = [];
    const addedUrls = new Set();

    // 1. Add Video Tour if exists (as first item)
    if (property.video_url) {
      items.push({ type: "video", url: property.video_url });
    }

    // 2. Add ALL property images (not just the primary)
    const propertyImages = Array.isArray(property.images) ? property.images : [];
    if (propertyImages.length > 0) {
      propertyImages.forEach((img) => {
        const url = getImageUrl(img);
        if (url && !addedUrls.has(url)) {
          addedUrls.add(url);
          items.push({ type: "image", url });
        }
      });
    } else if (property.image) {
      // Fallback: if images array is empty but single image exists
      const url = getImageUrl(property.image);
      if (url) {
        addedUrls.add(url);
        items.push({ type: "image", url });
      }
    }

    // 3. Add all unique room images (that aren't already in property images)
    (property.rooms || []).forEach((room) => {
      const roomImgs = Array.isArray(room.images) ? room.images : [];
      // Also check room.image (single primary)
      if (room.image) {
        const url = getImageUrl(room.image);
        if (url && !addedUrls.has(url)) {
          addedUrls.add(url);
          items.push({ type: "image", url });
        }
      }
      roomImgs.forEach((img) => {
        const url = getImageUrl(img);
        if (url && !addedUrls.has(url)) {
          addedUrls.add(url);
          items.push({ type: "image", url });
        }
      });
    });

    setGalleryItems(items);
    setGalleryIndex(0);
    setGalleryOpen(true);
  };

  // Fetch reviews when drawer opens
  const fetchPropertyReviews = async (propertyId) => {
    try {
      setReviewsLoading(true);
      const res = await api.get(`/public/properties/${propertyId}/reviews`);
      setDrawerReviews(res.data);
    } catch (_err) {
      console.error("Failed to fetch reviews:", _err);
      showError("Failed to load property reviews.");
      setDrawerReviews({ reviews: [], summary: null });
    } finally {
      setReviewsLoading(false);
    }
  };

  // Handle Marker Click
  const onMapMarkerClick = (property) => {
    setDrawerData(property);
    setDrawerOpen(true);
    setActiveTab("Overview");
    setSelectedMapProperty(property); // Keep track for map if needed
    // Fetch reviews for this property
    fetchPropertyReviews(property.id);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search || "");
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let isMounted = true;

    const fetchPropertyTypes = async () => {
      try {
        const typeOptions = await propertyService.getPropertyTypes();
        if (!isMounted) {
          return;
        }

        setPropertyTypeOptions(normalizeTypeOptions(typeOptions));
        setTypesLoaded(true);
      } catch (_err) {
        console.error("Error fetching property types:", _err?.response?.data || _err);
        showError("Failed to load property categories.");
        if (isMounted) {
          setPropertyTypeOptions(FALLBACK_TYPE_OPTIONS);
          setTypesLoaded(true);
        }
      }
    };

    fetchPropertyTypes();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // ONLY normalize if types have finished loading. 
    // This prevents premature reset to 'All' on mount.
    if (typesLoaded && selectedType !== normalizedSelectedType) {
      updateScreenState("explore", {
        selectedType: normalizedSelectedType,
        currentPage: 1,
      });
    }
  }, [typesLoaded, selectedType, normalizedSelectedType, updateScreenState]);

  // Fetch properties from backend
  useEffect(() => {
    const fetchProperties = async () => {
      // If we have cached data and it matches current filters/page, 
      // we might skip the very first fetch if desired, 
      // but standard project pattern is: mount instant with cache, then fetch fresh in background (SWR-like)
      // To truly prevent "re-renders again" visual jump, we only show loader if no properties.
      if (properties.length === 0) {
        setLoading(true);
      }

      try {
        const params = {
          search: debouncedSearch,
          type: normalizedSelectedType === "All" ? "" : normalizedSelectedType,
          price_min: advancedFilters.priceMin || undefined,
          price_max: advancedFilters.priceMax || undefined,
          availability: advancedFilters.availabilityOnly ? "1" : undefined,
          min_rating: advancedFilters.rating > 0 ? advancedFilters.rating : undefined,
          sex_policy:
            advancedFilters.sexPolicy && advancedFilters.sexPolicy !== "All"
              ? advancedFilters.sexPolicy
              : undefined,
          amenities: advancedFilters.amenities,
          page: currentPage,
          per_page: pageSize,
        };

        const response = await propertyService.getAllProperties(params, isAuthenticated);
        
        let finalItems = [];
        let finalPagination = { total: 0, totalPages: 0, currentPage: 1 };

        // Handle paginated vs non-paginated response
        if (response.data && response.meta) {
          finalItems = response.data;
          finalPagination = {
            total: response.meta.total,
            totalPages: response.meta.last_page,
            currentPage: response.meta.current_page,
          };
        } else {
          // Fallback if backend isn't paginating as expected
          const data = Array.isArray(response) ? response : (response.data || []);
          finalItems = data;
          finalPagination = {
            total: data.length,
            totalPages: Math.ceil(data.length / pageSize),
            currentPage: 1,
          };
        }

        setProperties(finalItems);
        setPagination(finalPagination);
        updateData('explore_list', { items: finalItems, pagination: finalPagination });

      } catch (err) {
        console.error("Error fetching properties:", err?.response?.data || err);
        const msg = err.response?.data?.message || "Error fetching properties";
        setError(msg);
        showError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [debouncedSearch, normalizedSelectedType, advancedFilters, currentPage, isAuthenticated, updateData]);

  const safeProperties = Array.isArray(properties) ? properties : [];

  const mapDisplayProperties = safeProperties
    .map((property) => {
      const mapped = mapProperty(property);
      if (!mapped) return null;
      return {
        ...mapped,
        sex_restriction: property?.sex_restriction || mapped?.sex_restriction || "mixed",
      };
    })
    .filter(Boolean);

  // Use the results directly from the server (filtering is now backend-side)
  const filteredProperties = mapDisplayProperties;

  const availableAmenities = Array.from(
    new Set(
      safeProperties.flatMap((property) =>
        Array.isArray(property.amenities_list) ? property.amenities_list : [],
      ),
    ),
  );

  // Type-ahead Suggestions
  const searchSuggestions =
    search.length > 0
      ? mapDisplayProperties
        .filter((p) => {
          const term = search.toLowerCase();
          return (
            p.name.toLowerCase().includes(term) ||
            p.type.toLowerCase().includes(term) ||
            p.address.toLowerCase().includes(term)
          );
        })
        .slice(0, 5)
      : [];

  const flashMapSearchFeedback = (status, message) => {
    setMapSearchStatus(status);
    setMapSearchFeedback(message);

    if (mapSearchTimerRef.current) {
      clearTimeout(mapSearchTimerRef.current);
    }

    mapSearchTimerRef.current = setTimeout(() => {
      setMapSearchStatus("idle");
      setMapSearchFeedback("");
    }, 1500);
  };

  const handleMapSearchAction = () => {
    const term = (search || "").trim().toLowerCase();

    if (!term) {
      flashMapSearchFeedback("error", "Type a property name or location first.");
      return;
    }

    const matchedProperty = mapDisplayProperties.find((property) => {
      const name = String(property?.name || "").toLowerCase();
      const type = String(property?.type || "").toLowerCase();
      const address = String(property?.address || "").toLowerCase();
      return name.includes(term) || type.includes(term) || address.includes(term);
    });

    if (!matchedProperty) {
      flashMapSearchFeedback("error", "No matching property found.");
      return;
    }

    onMapMarkerClick(matchedProperty);
    flashMapSearchFeedback("success", `Showing ${matchedProperty.name}`);
  };

  useEffect(() => {
    return () => {
      if (mapSearchTimerRef.current) {
        clearTimeout(mapSearchTimerRef.current);
      }
    };
  }, [mapSearchTimerRef]);

  // Pagination
  const totalPages = pagination.totalPages;
  const paginated = filteredProperties;

  const handleSearchChange = (e) => {
    updateScreenState("explore", { search: e.target.value, currentPage: 1 });
  };

  const handlePageChange = (page) => {
    updateScreenState("explore", { currentPage: page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Modal Handlers
  const handleOpenDetails = async (room, property) => {
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await api.get(`/public/properties/${property.id}`);
      const fullProperty = res.data;
      const fullRoom = Array.isArray(fullProperty.rooms)
        ? fullProperty.rooms.find((r) => r.id === room.id)
        : null;

      // include landlord/owner identifiers so contact flow can find recipient
      setSelectedRoomData({
        room: fullRoom ? mapRoom(fullRoom) : room,
        property: {
          id: fullProperty.id,
          name: fullProperty.title || fullProperty.name,
          property_type: fullProperty.property_type,
          location: fullProperty.full_address || fullProperty.city || "",
          description: fullProperty.description || "",
          rating: fullProperty.rating || null,
          rules: Array.isArray(fullProperty.property_rules)
            ? fullProperty.property_rules
            : [],
          // common owner fields from backend: landlord_id, user_id, owner_id or nested user/owner objects
          landlord_id:
            fullProperty.landlord_id ||
            fullProperty.user_id ||
            fullProperty.owner_id ||
            null,
          landlord:
            fullProperty.landlord ||
            fullProperty.user ||
            fullProperty.owner ||
            null,
        },
      });
    } catch (_err) {
      console.error(_err);
      showError("Failed to prepare property details.");
      // Fallback to basic data if fetch fails - ensure room is normalized via mapRoom
      setSelectedRoomData({ room: mapRoom(room), property });
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedRoomData(null);
  };

  // Update UI to mark room as pending after a successful booking (optimistic client update)
  const handleBookingSuccess = (updatedRoom) => {
    if (!updatedRoom || !updatedRoom.id) return;

    // Update properties list (raw backend objects) so mapProperty will reflect change
    setProperties((prev) => {
      if (!Array.isArray(prev)) return [];
      return prev.map((prop) => {
        if (!Array.isArray(prop.rooms)) return prop;
        const found = prop.rooms.find((r) => r.id === updatedRoom.id);
        if (!found) return prop;
        return {
          ...prop,
          rooms: prop.rooms.map((r) =>
            r.id === updatedRoom.id
              ? {
                ...r,
                status: updatedRoom.status || r.status || "available",
                display_status: updatedRoom.display_status || "reserved",
                reserved_by_me: updatedRoom.reserved_by_me || true,
                reservation: updatedRoom.reservation || null,
              }
              : r,
          ),
        };
      });
    });

    // Update currently selected room data shown in modal if it matches
    setSelectedRoomData((prev) => {
      if (!prev) return prev;
      if (prev.room && prev.room.id === updatedRoom.id) {
        return {
          ...prev,
          room: {
            ...prev.room,
            status: updatedRoom.status || prev.room.status || "available",
            display_status: updatedRoom.display_status || "reserved",
            reserved_by_me: updatedRoom.reserved_by_me || true,
            reservation: updatedRoom.reservation || null,
          },
        };
      }
      return prev;
    });
  };

  const handlePropertyClick = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  return (
    <>
      <div className="min-h-screen bg-transparent dark:bg-gray-900 font-sans overflow-x-hidden">
        {__error && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <X className="w-5 h-5 cursor-pointer" onClick={() => setError(null)} />
            <span className="font-bold uppercase tracking-wide text-xs">{__error}</span>
          </div>
        )}
        <header className="sticky top-0 z-40 pb-4">
          {/* ROW 1: Navigation & Title (Only for Guests) */}
          {!authService.isAuthenticated() && (
            <div className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 h-14 md:h-16 flex items-center justify-center shadow-sm">
              <div className="absolute left-4 sm:left-6 lg:left-8">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Browse Properties
              </h1>
            </div>
          )}

          {/* ROW 2: Search Bar & Filters Card */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col items-center gap-4 md:gap-6">
              {/* Search Row */}
              <div className="w-full flex items-center gap-3 md:gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search properties, locations..."
                    className="w-full pl-10 md:pl-11 pr-4 py-2 md:py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 rounded-xl transition-all outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 font-semibold shadow-sm"
                    value={search}
                    onChange={handleSearchChange}
                  />
                </div>

                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`relative p-2.5 md:p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 transition-all text-gray-600 dark:text-gray-300 shadow-sm group ${isFilterOpen ? 'bg-green-50 dark:bg-green-900/30 !border-green-300 dark:!border-green-600' : ''}`}
                  aria-label="Toggle Filters"
                >
                  <SlidersHorizontal className={`w-5 h-5 group-hover:text-green-600 transition-colors ${isFilterOpen ? 'text-green-600' : ''}`} />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() =>
                    updateScreenState("explore", { showMapModal: true })
                  }
                  className="p-2.5 md:p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 transition-all text-gray-600 dark:text-gray-300 shadow-sm group"
                  aria-label="View Map"
                >
                  <Map className="w-5 h-5 group-hover:text-green-600 transition-colors" />
                </button>
              </div>

              {/* Active Filters Summary */}
              <div className="w-full flex flex-wrap items-center gap-2 min-h-[1.75rem]">
                {normalizedSelectedType !== "All" && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700">
                    Type: {selectedTypeMeta.label}
                  </span>
                )}

                {(advancedFilters.priceMin || advancedFilters.priceMax) && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
                    Price: P{advancedFilters.priceMin || "0"} - P{advancedFilters.priceMax || "Any"}
                  </span>
                )}

                {advancedFilters.rating > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
                    {advancedFilters.rating}+ Stars
                  </span>
                )}

                {advancedFilters.sexPolicy && advancedFilters.sexPolicy !== "All" && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-700">
                    Sex: {advancedFilters.sexPolicy === "male" ? "Boys only" : advancedFilters.sexPolicy === "female" ? "Girls only" : "Mixed"}
                  </span>
                )}

                {advancedFilters.amenities.length > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-700">
                    {advancedFilters.amenities.length} Amenities
                  </span>
                )}

                {activeFilterCount === 0 && null}
              </div>

              <FilterSidebar
                isOpen={isFilterOpen}
                filters={advancedFilters}
                amenities={availableAmenities}
                onApply={(nextFilters) => {
                  setAdvancedFilters(nextFilters);
                  updateScreenState("explore", { currentPage: 1 });
                }}
                onClear={(clearedFilters) => {
                  setAdvancedFilters(clearedFilters);
                  updateScreenState("explore", { currentPage: 1 });
                }}
                onClose={() => setIsFilterOpen(false)}
                propertyTypes={propertyTypeOptions}
                selectedType={normalizedSelectedType}
                onSelectType={(type) =>
                  updateScreenState("explore", { selectedType: type, currentPage: 1 })
                }
                inlineDesktop
              />
            </div>
          </div>
        </header>

        {/* MOBILE SEARCH REMOVED (Now consolidated in header) */}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="relative">
            <main className="min-w-0">
              {/* Helper Text */}
              <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
                <Filter className="w-4 h-4" />
                <span>Showing {pagination.total} {pagination.total === 1 ? "property" : "properties"}</span>
              </div>

              {loading && (
                <div className="space-y-6">
                  {/* Skeleton Property Cards */}
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-gray-800 rounded-xl p-6 sm:p-8 shadow-md border border-gray-300 dark:border-gray-700 animate-pulse"
                    >
                      {/* Header skeleton */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                          <div className="flex items-center gap-4 mb-2">
                            <Skeleton className="h-7 w-48" />
                            <Skeleton className="h-5 w-16 rounded-md" />
                          </div>
                          <Skeleton className="h-4 w-64" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-20 rounded-full" />
                          <Skeleton className="h-8 w-20 rounded-full" />
                        </div>
                      </div>

                      {/* Carousel skeleton */}
                      <div className="flex gap-4 overflow-hidden">
                        {[...Array(4)].map((_, j) => (
                          <Skeleton
                            key={j}
                            className="w-72 h-64 rounded-xl flex-shrink-0"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && filteredProperties.length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-600 shadow-md flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Filter className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                  </div>
                  <div>
                    <p className="text-gray-800 dark:text-gray-200 text-lg font-bold mb-1">
                      No properties found
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Try adjusting your filters or search terms.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      updateScreenState("explore", {
                        search: "",
                        selectedType: "All",
                        currentPage: 1,
                      });
                      setAdvancedFilters({
                        priceMin: "",
                        priceMax: "",
                        availabilityOnly: false,
                        amenities: [],
                        rating: 0,
                        sexPolicy: "All",
                      });
                    }}
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg transition-colors shadow-sm"
                  >
                    Clear all filters
                  </button>
                </div>
              )}

              {/* LIST */}
              <div className="space-y-12">
                {paginated.map((property) => (
                  <div
                    key={property.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 sm:p-8 shadow-md border border-gray-300 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300"
                  >
                    {/* Header */}
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 cursor-pointer group"
                      onClick={() => handlePropertyClick(property.id)}
                    >
                      <div>
                        <div className="flex items-center gap-4 mb-2">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors flex items-center gap-2">
                            {property.name}
                            <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-green-600 dark:text-green-500" />
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wide border border-green-100 dark:border-green-800">
                            {(property.type || '')
                              .replace(/([a-z])([A-Z])/g, '$1 $2')
                              .replace(/boardinghouse/i, 'Boarding House')
                              .replace(/bedspacer/i, 'Bed Spacer')
                              .split(/[-_\s]+/)
                              .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                              .join(' ')}
                          </span>
                        </div>
                        {property.location && (
                          <div className="flex items-center gap-2.5 text-gray-500 dark:text-gray-400 mt-2">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {property.location}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {property.video_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/property/${property.id}`, {
                                state: { openVideo: true },
                              });
                            }}
                            className="flex items-center gap-2.5 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            <Play className="w-4 h-4 fill-current" /> Video Tour
                          </button>
                        )}
                        <span className="px-4 py-2 border border-green-600 dark:border-green-500 text-green-700 dark:text-green-400 text-sm font-bold rounded-lg group-hover:bg-green-50 dark:group-hover:bg-green-900/30 transition-colors">
                          More Details →
                        </span>
                      </div>
                    </div>

                    {/* Carousel */}
                    <PropertyCarousel
                      property={property}
                      onOpenDetails={handleOpenDetails}
                    />
                  </div>
                ))}
              </div>

              {/* PAGINATION */}
              {!loading && totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12 mb-8">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border shadow-sm ${currentPage === 1 ? "border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 mx-2">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg border shadow-sm ${currentPage === totalPages ? "border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </main>
          </div>
        </div>

        {/* MODAL */}
        {(selectedRoomData || modalLoading || showMapModal) && (
          <>
            {showMapModal && (
              <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900">
                {/* FULL SCREEN MODAL */}
                <div className="relative w-full h-full bg-white dark:bg-gray-900 overflow-hidden animate-in fade-in zoom-in duration-200">
                  {/* Floating Search Bar (Replaces Property Map Label) */}
                  <div
                    className={`absolute top-6 left-6 z-[1000] w-[calc(100%-100px)] md:w-[calc(35%-48px)] animate-in slide-in-from-top-4 duration-500 shadow-2xl transition-all ease-in-out ${drawerOpen ? "opacity-0 pointer-events-none -translate-y-4" : "opacity-100 translate-y-0"}`}
                  >
                    <div className={`bg-white dark:bg-gray-800 rounded-full flex items-center p-2.5 border transition-all hover:shadow-lg focus-within:shadow-xl ${mapSearchStatus === "success"
                        ? "border-green-400 ring-2 ring-green-200 dark:ring-green-800"
                        : mapSearchStatus === "error"
                          ? "border-red-400 ring-2 ring-red-200 dark:ring-red-800"
                          : "border-gray-100 dark:border-gray-700"
                      }`}>
                      {/* Maps Icon / Menu Trigger */}
                      <div className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full cursor-pointer transition-colors group">
                        <Map className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white" />
                      </div>

                      {/* Input Field */}
                      <input
                        type="text"
                        placeholder="Search properties..."
                        className="flex-1 ml-2 bg-transparent border-none outline-none text-gray-800 dark:text-white text-sm font-medium h-10 placeholder:text-gray-500 dark:placeholder:text-gray-500"
                        value={search}
                        onChange={handleSearchChange}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleMapSearchAction();
                          }
                        }}
                      />

                      {/* Search Action / Divider */}
                      {search && (
                        <button
                          onClick={() =>
                            handleSearchChange({ target: { value: "" } })
                          }
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-500 mr-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={handleMapSearchAction}
                        className={`p-2.5 text-white rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 ml-2 ${mapSearchStatus === "success"
                            ? "bg-green-600 hover:bg-green-700"
                            : mapSearchStatus === "error"
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        aria-label="Search and center property"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>

                    {mapSearchFeedback && (
                      <p className={`mt-2 px-3 text-xs font-semibold ${mapSearchStatus === "error" ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                        {mapSearchFeedback}
                      </p>
                    )}

                    {/* SEARCH SUGGESTIONS DROPDOWN */}
                    {search &&
                      Array.isArray(searchSuggestions) &&
                      searchSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2">
                          {searchSuggestions.map((prop) => (
                            <div
                              key={prop.id}
                              onClick={() => {
                                onMapMarkerClick(prop);
                                setMapSearchFeedback("");
                                setMapSearchStatus("idle");
                                updateScreenState("explore", { search: "" });
                              }}
                              className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0 flex items-center gap-4 transition-colors"
                            >
                              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full text-gray-500 dark:text-gray-400">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-gray-800 dark:text-white truncate">
                                  {prop.name}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {prop.address}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Floating Close Button */}
                  <button
                    onClick={() =>
                      updateScreenState("explore", { showMapModal: false })
                    }
                    className="absolute top-6 right-6 z-[1000] p-2.5 bg-white dark:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white shadow-lg border border-gray-200 dark:border-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="w-full h-full relative flex overflow-hidden">
                    {/* SIDE DRAWER PROPERTY DETAILS */}
                    <div
                      className={`absolute top-0 bottom-0 left-0 w-full md:w-[35%] bg-white dark:bg-gray-800 shadow-2xl z-[500] flex flex-col border-r border-gray-100 dark:border-gray-700 transition-transform duration-500 ease-in-out ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
                    >
                      {drawerData && (
                        <>
                          {/* SINGLE SCROLLABLE CONTAINER */}
                          <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                            {/* Image Section */}
                            <div
                              className="h-[250px] w-full relative bg-gray-200 group cursor-pointer flex-shrink-0"
                              onClick={() => openFullGallery(drawerData)}
                            >
                              {getImageUrl(drawerData.image) ||
                                getImageUrl(drawerData.rooms?.[0]?.image) ? (
                                <img
                                  src={
                                    getImageUrl(drawerData.image) ||
                                    getImageUrl(drawerData.rooms?.[0]?.image)
                                  }
                                  alt={drawerData.name}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                              ) : (
                                <ImagePlaceholder className="w-full h-full" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                              {/* Close Selection Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDrawerOpen(false);
                                }}
                                className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full text-white transition-colors border border-white/20 z-10"
                              >
                                <X className="w-4 h-4" />
                              </button>

                              {/* See Photos Badge (Bottom Left) */}
                              <div className="absolute bottom-4 left-4 z-10">
                                <button className="bg-black/60 hover:bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all">
                                  <div className="w-4 h-4 grid grid-cols-2 gap-px opacity-80">
                                    <div className="bg-white rounded-[1px]"></div>
                                    <div className="bg-white rounded-[1px]"></div>
                                    <div className="bg-white rounded-[1px]"></div>
                                    <div className="bg-white rounded-[1px]"></div>
                                  </div>
                                  See photos
                                </button>
                              </div>
                            </div>

                            {/* HEADER INFO SECTION */}
                            <div className="p-6 pb-0 bg-white dark:bg-gray-800">
                              <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
                                {drawerData.name}
                              </h2>

                              <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center text-sm font-bold text-gray-900 dark:text-white">
                                  {drawerData.rating ? drawerData.rating : "New"}
                                  <div className="flex ml-2">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-3 h-3 ${i < Math.floor(drawerData.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <span className="text-gray-500 text-xs">•</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  ({drawerReviews.summary?.total_reviews || 0}{" "}
                                  reviews)
                                </span>
                                <span className="text-gray-500 text-xs">•</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {drawerData.type}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-500 font-medium mb-4">
                                <div className="w-4 h-4 rounded-full border border-green-600 dark:border-green-500 flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-500"></div>
                                </div>
                                Open Now
                                <span className="text-gray-500 dark:text-gray-500 font-normal ml-2">
                                  • Closes 9PM
                                </span>
                              </div>
                            </div>

                            {/* TABS HEADER - STICKY */}
                            <div className="flex items-center border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-30 px-6 pt-2 shadow-sm">
                              {["Overview", "Reviews", "About"].map((tab) => (
                                <button
                                  key={tab}
                                  onClick={() => setActiveTab(tab)}
                                  className={`mr-6 py-4 text-sm font-bold text-center relative transition-colors ${activeTab === tab
                                      ? "text-teal-700 dark:text-teal-400"
                                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                    }`}
                                >
                                  {tab}
                                  {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-700 dark:bg-teal-400 rounded-t-full" />
                                  )}
                                </button>
                              ))}
                            </div>

                            {/* Scrollable Content (Tabbed) */}
                            <div className="p-6 bg-gray-50/50 dark:bg-gray-900/50 min-h-[500px]">
                              {activeTab === "Overview" && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                                  {/* Address Section */}
                                  <div className="flex items-start gap-4 border-b border-gray-100 dark:border-gray-700 pb-6">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                      <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-2">
                                        {drawerData.address}
                                      </h4>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Zamboanga City, Philippines
                                      </p>
                                    </div>
                                    <button className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
                                      <Map className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                    </button>
                                  </div>

                                  {/* Visit Schedule */}
                                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md flex items-start gap-4">
                                    <div className="bg-orange-50 dark:bg-orange-900/30 p-2 rounded-lg">
                                      <div className="w-5 h-5 text-orange-500 dark:text-orange-400 font-bold flex items-center justify-center">
                                        🕒
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                        Visiting Hours
                                      </h4>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Physical viewing schedule
                                      </p>
                                      <span className="inline-block mt-2 text-[10px] font-bold text-white bg-orange-400 px-2 py-0.5 rounded">
                                        COMING SOON
                                      </span>
                                    </div>
                                  </div>

                                  {/* Gallery Preview */}
                                  <div>
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                                        Gallery
                                      </h4>
                                      <span
                                        className="text-xs text-teal-600 dark:text-teal-400 font-bold cursor-pointer hover:underline"
                                        onClick={() =>
                                          openFullGallery(drawerData)
                                        }
                                      >
                                        View All
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {/* 1. Main Video/Image */}
                                      {drawerData.video_url ? (
                                        <div
                                          className="col-span-2 h-32 bg-gray-800 dark:bg-gray-950 rounded-xl overflow-hidden relative group cursor-pointer"
                                          onClick={() =>
                                            openFullGallery(drawerData)
                                          }
                                        >
                                          {getImageUrl(drawerData.image) ? (
                                            <img
                                              src={getImageUrl(drawerData.image)}
                                              className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                            />
                                          ) : (
                                            <ImagePlaceholder className="w-full h-full" />
                                          )}
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-12 h-12 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 dark:border-white/20 group-hover:scale-110 transition-transform">
                                              <Play className="w-6 h-6 text-white fill-white ml-2" />
                                            </div>
                                          </div>
                                          <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-green-600 px-2 py-0.5 rounded shadow-sm flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                                            VIDEO TOUR
                                          </span>
                                        </div>
                                      ) : (
                                        <div
                                          className="col-span-2 h-32 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden relative cursor-pointer"
                                          onClick={() =>
                                            openFullGallery(drawerData)
                                          }
                                        >
                                          {getImageUrl(drawerData.image) ? (
                                            <img
                                              src={getImageUrl(drawerData.image)}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <ImagePlaceholder className="w-full h-full" />
                                          )}
                                          <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/50 px-2.5 rounded">
                                            MAIN VIEW
                                          </span>
                                        </div>
                                      )}
                                      {/* 2. Room Grid */}
                                      {(drawerData.rooms || [])
                                        .slice(0, 2)
                                        .map((room, idx) => (
                                          <div
                                            key={idx}
                                            className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden relative cursor-pointer"
                                            onClick={() =>
                                              openFullGallery(drawerData)
                                            }
                                          >
                                            {getImageUrl(room) ? (
                                              <img
                                                src={getImageUrl(room)}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <ImagePlaceholder className="w-full h-full" />
                                            )}
                                          </div>
                                        ))}
                                      {(drawerData.rooms?.length || 0) > 2 && (
                                        <div
                                          className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-500 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                          onClick={() =>
                                            openFullGallery(drawerData)
                                          }
                                        >
                                          +{drawerData.rooms.length - 2} More
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {activeTab === "Reviews" && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                  <div className="flex items-center justify-center mb-6">
                                    <div className="flex items-center gap-2 bg-yellow-400 text-white px-4 py-2 rounded-full text-sm font-bold shadow-sm">
                                      <Star className="w-4 h-4 fill-white text-white" />
                                      {drawerReviews.summary?.average_rating ||
                                        drawerData.rating ||
                                        "N/A"}
                                    </div>
                                    {drawerReviews.summary?.total_reviews > 0 && (
                                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                        ({drawerReviews.summary.total_reviews}{" "}
                                        reviews)
                                      </span>
                                    )}
                                  </div>

                                  {/* Review List - Real Data */}
                                  <div className="space-y-4">
                                    {reviewsLoading ? (
                                      <div className="flex justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                                      </div>
                                    ) : Array.isArray(drawerReviews?.reviews) &&
                                      drawerReviews.reviews.length > 0 ? (
                                      drawerReviews.reviews.map((review, i) => (
                                        <div
                                          key={review.id || i}
                                          className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md transition-all hover:shadow-lg"
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-400 to-green-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                                                {review.reviewer_image ? (
                                                  <img
                                                    src={review.reviewer_image}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                  />
                                                ) : (
                                                  review.reviewer_name?.charAt(
                                                    0,
                                                  ) || "U"
                                                )}
                                              </div>
                                              <div>
                                                <p className="text-xs font-bold text-gray-900 dark:text-white">
                                                  {review.reviewer_name ||
                                                    "Anonymous"}
                                                </p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-500">
                                                  {review.time_ago}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex text-yellow-400">
                                              {[...Array(5)].map((_, starI) => (
                                                <Star
                                                  key={starI}
                                                  className={`w-3 h-3 ${starI < review.rating ? "fill-current" : "text-gray-200 dark:text-gray-600"}`}
                                                />
                                              ))}
                                            </div>
                                          </div>
                                          {review.comment?.trim() && (
                                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                              "{review.comment.trim()}"
                                            </p>
                                          )}
                                          {review.landlord_response && (
                                            <div className="mt-4 pl-4 border-l-2 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/20 p-2 rounded-r-lg">
                                              <p className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold mb-2">
                                                Landlord Response:
                                              </p>
                                              <p className="text-xs text-gray-600 dark:text-gray-300">
                                                {review.landlord_response}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-center py-8">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                          No reviews yet
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                          Be the first to review this property
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {activeTab === "About" && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                                  {/* Description (Moved from Overview) */}
                                  <div>
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">
                                      Description
                                    </h4>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md">
                                      {drawerData.description ||
                                        "Welcome to this property. It offers a secure and comfortable environment with various amenities tailored for your needs."}
                                    </p>
                                  </div>

                                  <div>
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-4">
                                      Amenities
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {/* Use amenities from rooms or property */}
                                      {(() => {
                                        // Collect unique amenities from all rooms
                                        const allAmenities = new Set();
                                        (drawerData.rooms || []).forEach(
                                          (room) => {
                                            (room.amenities || []).forEach((a) =>
                                              allAmenities.add(a),
                                            );
                                          },
                                        );
                                        const amenitiesList =
                                          Array.from(allAmenities);

                                        if (amenitiesList.length > 0) {
                                          return amenitiesList.map((item, i) => (
                                            <span
                                              key={i}
                                              className="px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 hover:border-green-200 dark:hover:border-green-800 transition-colors border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-xl shadow-sm"
                                            >
                                              {item}
                                            </span>
                                          ));
                                        }
                                        return (
                                          <p className="text-xs text-gray-500 dark:text-gray-500">
                                            No amenities listed
                                          </p>
                                        );
                                      })()}
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-4">
                                      Room Rules
                                    </h4>
                                    <ul className="space-y-2 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md">
                                      {(() => {
                                        // Collect unique rules from all rooms
                                        const allRules = new Set();
                                        (drawerData.rooms || []).forEach(
                                          (room) => {
                                            (room.rules || []).forEach((r) =>
                                              allRules.add(r),
                                            );
                                          },
                                        );
                                        const rulesList = Array.from(allRules);

                                        if (rulesList.length > 0) {
                                          return rulesList.map((rule, idx) => (
                                            <li
                                              key={idx}
                                              className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
                                            >
                                              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0"></div>
                                              {rule}
                                            </li>
                                          ));
                                        }
                                        return (
                                          <li className="text-xs text-gray-500 dark:text-gray-500">
                                            No room rules specified
                                          </li>
                                        );
                                      })()}
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* END SINGLE SCROLLABLE CONTAINER */}

                          {/* Footer Action */}
                          <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] relative">
                            <button
                              onClick={() =>
                                navigate(`/property/${drawerData.id}`)
                              }
                              className="w-full py-4.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-lg shadow-teal-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                            >
                              View Full Details
                              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Pass only properties with coordinates */}
                    {/* Map is always full width behind the drawer on mobile, and pushed or covered on desktop? 
                                To maintain "Drawer" feel without content shift, we let the map be full width 
                                and just overlay the drawer. 
                            */}
                    <div className="w-full h-full">
                      <PropertyMap
                        properties={mapDisplayProperties.filter(
                          (p) => p.latitude && p.longitude,
                        )}
                        onMarkerClick={onMapMarkerClick}
                        centerOn={drawerData}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {modalLoading && !selectedRoomData && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
              </div>
            )}
            {selectedRoomData && (
              <RoomDetailsModal
                room={selectedRoomData.room}
                property={selectedRoomData.property}
                onClose={handleCloseDetails}
                isAuthenticated={authService.isAuthenticated()}
                onLoginRequired={() => navigate("/login")}
                onBookingSuccess={handleBookingSuccess}
                bookingService={bookingService}
              />
            )}
          </>
        )}

        {/* FULL MEDIA GALLERY MODAL */}
        {galleryOpen && galleryItems.length > 0 && (
          <div
            className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300"
            onClick={() => setGalleryOpen(false)}
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-green-500/5 blur-[150px] rounded-full pointer-events-none"></div>

            <div
              className="w-full h-full bg-transparent flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 md:p-6 flex items-center justify-between text-white border-b border-white/5 bg-black/40 backdrop-blur-md z-20">
                {/* Left Placeholder for Centering */}
                <div className="w-10 hidden md:block"></div>

                <div className="text-center flex-1">
                  <h3 className="font-bold text-lg md:text-xl tracking-tight line-clamp-1">
                    {drawerData?.name || "Property Gallery"}
                  </h3>
                  <p className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-[0.2em] mt-2">
                    {galleryIndex + 1} / {galleryItems.length}
                  </p>
                </div>

                <button
                  onClick={() => setGalleryOpen(false)}
                  className="p-2 md:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all hover:rotate-90 active:scale-90"
                >
                  <X className="w-6 h-6 md:w-7 md:h-7 text-white/80" />
                </button>
              </div>

              {/* Main Media Content Area */}
              <div className="flex-1 relative flex items-center justify-center min-h-0">
                <Swiper
                  modules={[Navigation, Pagination, Keyboard, A11y]}
                  spaceBetween={0}
                  slidesPerView={1}
                  keyboard={{ enabled: true }}
                  onSlideChange={(swiper) => setGalleryIndex(swiper.activeIndex)}
                  initialSlide={galleryIndex}
                  className="w-full h-full"
                  onSwiper={(swiper) => {
                    window._gallerySwiper = swiper;
                  }}
                >
                  {galleryItems.map((item, i) => (
                    <SwiperSlide
                      key={i}
                      className="h-full flex items-center justify-center"
                    >
                      <div className="w-full h-full flex items-center justify-center p-0">
                        {item.type === "video" ? (
                          <div className="w-full h-full bg-black relative flex items-center justify-center">
                            <video
                              src={item.url}
                              className="w-full h-full object-contain"
                              controls
                              autoPlay={i === galleryIndex}
                              playsInline
                            />
                          </div>
                        ) : (
                          <img
                            src={item.url}
                            alt={`Gallery item ${i + 1}`}
                            className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.8)]"
                          />
                        )}
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>

              {/* Modern Thumbnail Strip (Bottom Container) */}
              <div className="px-4 pb-4 md:px-6 md:pb-6 pt-2 bg-gradient-to-t from-black/90 to-transparent z-10 backdrop-blur-sm">
                <div className="max-w-6xl mx-auto">
                  <div className="flex items-center gap-2.5 overflow-x-auto py-2 no-scrollbar snap-x px-2">
                    {galleryItems.map((item, i) => (
                      <div
                        key={i}
                        className={`
                        relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer flex-shrink-0 snap-center
                        ${i === galleryIndex
                            ? "border-green-500 scale-110 shadow-[0_0_30px_rgba(34,197,94,0.5)] ring-4 ring-green-500/20"
                            : "border-white/10 opacity-30 hover:opacity-100 hover:border-white/30"
                          }
                      `}
                        onClick={() => window._gallerySwiper?.slideTo(i)}
                      >
                        {item.type === "video" ? (
                          <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
                            <Play className="w-6 h-6 fill-current" />
                            <div className="absolute inset-0 bg-black/20"></div>
                          </div>
                        ) : item.url ? (
                          <img
                            src={item.url}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <ImagePlaceholder className="w-full h-full" />
                        )}
                        {/* Active Overlay */}
                        {i === galleryIndex && (
                          <div className="absolute inset-0 bg-green-500/10 animate-pulse"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {!authService.isAuthenticated() && <Footer />}
      </div>
    </>
  );
};

const FilterSidebar = ({
  isOpen,
  filters,
  amenities,
  onApply,
  onClear,
  onClose,
  propertyTypes = [],
  selectedType = "All",
  onSelectType,
  inlineDesktop = false,
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [propertyTypeSearch, setPropertyTypeSearch] = useState("");
  const [amenityDraft, setAmenityDraft] = useState("");

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (!isOpen) {
      setPropertyTypeSearch("");
      setAmenityDraft("");
    }
  }, [isOpen]);

  const getTypeValue = (typeOption) =>
    typeof typeOption === "string"
      ? typeOption
      : String(
        typeOption?.value ??
        typeOption?.property_type ??
        typeOption?.type ??
        "",
      ).trim();

  const getTypeLabel = (typeOption) =>
    typeof typeOption === "string"
      ? typeOption
      : String(typeOption?.label ?? "").trim() || getTypeValue(typeOption);

  const getTypeCount = (typeOption) => {
    if (!typeOption || typeof typeOption !== "object") {
      return null;
    }

    const count = Number(typeOption.count ?? typeOption.total);
    return Number.isFinite(count) && count > 0 ? count : null;
  };

  const filteredPropertyTypes = propertyTypes.filter((typeOption) => {
    const value = getTypeValue(typeOption);
    const label = getTypeLabel(typeOption);
    if (!value) {
      return false;
    }

    if (normalizeTypeToken(value) === "all") {
      return true;
    }

    const term = normalizeTypeToken(propertyTypeSearch);
    if (!term) {
      return true;
    }

    return (
      normalizeTypeToken(value).includes(term) ||
      normalizeTypeToken(label).includes(term)
    );
  });

  const amenityOptions = Array.from(
    new globalThis.Map(
      [...DEFAULT_FILTER_AMENITIES, ...(Array.isArray(amenities) ? amenities : [])]
        .map((amenity) => {
          const label =
            typeof amenity === "string"
              ? amenity.trim()
              : String(amenity?.name ?? amenity?.label ?? "").trim();
          return [label.toLowerCase(), label];
        })
        .filter((entry) => entry[0]),
    ).values(),
  ).sort((a, b) => a.localeCompare(b));

  const amenitySuggestions = amenityOptions
    .filter((amenity) =>
      !localFilters.amenities.some(
        (selected) => selected.toLowerCase() === amenity.toLowerCase(),
      ),
    )
    .filter((amenity) =>
      amenity.toLowerCase().includes((amenityDraft || "").toLowerCase()),
    )
    .slice(0, 12);

  const toggleAmenity = (amenity) => {
    const normalizedAmenity = String(amenity || "").trim().toLowerCase();
    setLocalFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.some(
        (item) => item.toLowerCase() === normalizedAmenity,
      )
        ? prev.amenities.filter(
          (item) => item.toLowerCase() !== normalizedAmenity,
        )
        : [...prev.amenities, String(amenity).trim()],
    }));
  };

  const addAmenityFromInput = () => {
    const cleaned = String(amenityDraft || "").trim();
    if (!cleaned) {
      return;
    }

    toggleAmenity(cleaned);
    setAmenityDraft("");
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleClear = () => {
    const cleared = {
      priceMin: "",
      priceMax: "",
      availabilityOnly: false,
      amenities: [],
      rating: 0,
      sexPolicy: "All",
    };
    setLocalFilters(cleared);
    onClear(cleared);
    if (onSelectType) onSelectType("All");
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={`fixed inset-0 bg-black/50 z-20 transition-opacity md:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      ></div>

      <div
        className={`
          fixed top-0 left-0 bottom-0 z-30
          w-72 bg-white dark:bg-gray-800
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}

          md:relative md:top-auto md:left-auto md:bottom-auto md:w-full md:translate-x-0
          md:rounded-xl md:border md:border-gray-300 dark:md:border-gray-700 md:shadow-sm md:bg-gray-50/40 dark:md:bg-gray-900/20
          md:transition-all md:duration-300 md:ease-in-out
          ${isOpen
            ? `md:max-h-[480px] md:opacity-100 ${inlineDesktop ? "md:mt-1" : "md:mt-0"}`
            : "md:max-h-0 md:opacity-0 md:mt-0 md:overflow-hidden md:border-transparent md:shadow-none"}
        `}
      >
        <div className="p-4 md:p-4 h-full overflow-y-auto">
          {/* Mobile header */}
          <div className="flex justify-between items-center md:hidden mb-4">
            <h2 className="text-lg font-bold">Filters</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-4 md:gap-4 md:items-start">

            {/* Property Type */}
            {propertyTypes.length > 0 && (
              <div className="md:col-span-1">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Property Type
                </h3>
                <input
                  type="text"
                  value={propertyTypeSearch}
                  onChange={(e) => setPropertyTypeSearch(e.target.value)}
                  placeholder="Search property type"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white mb-2"
                />
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {filteredPropertyTypes.map((typeOption) => {
                    const typeValue = getTypeValue(typeOption);
                    const typeLabel = getTypeLabel(typeOption);
                    const typeCount = getTypeCount(typeOption);

                    return (
                      <button
                        key={typeValue}
                        onClick={() => onSelectType && onSelectType(typeValue)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedType === typeValue
                            ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate">{typeLabel}</span>
                          {typeCount !== null && typeValue !== "All" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {typeCount}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}

                  {filteredPropertyTypes.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-1 py-2">
                      No property type matches your search.
                    </p>
                  )}
                </div>
              </div>
            )}

            {propertyTypes.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 md:hidden"></div>
            )}

            <div className="md:col-span-1 space-y-4">
              {/* Price Range */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Price Range (Monthly)
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={localFilters.priceMin}
                    onChange={(e) =>
                      setLocalFilters((prev) => ({ ...prev, priceMin: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                  <span className="text-gray-500 text-sm">-</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={localFilters.priceMax}
                    onChange={(e) =>
                      setLocalFilters((prev) => ({ ...prev, priceMax: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 md:hidden"></div>

              {/* Amenities */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Amenities
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={amenityDraft}
                      onChange={(e) => setAmenityDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addAmenityFromInput();
                        }
                      }}
                      placeholder="Type amenity then press Enter"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={addAmenityFromInput}
                      className="px-3 py-2 text-xs font-semibold rounded-md border border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/40"
                    >
                      Add
                    </button>
                  </div>

                  {localFilters.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {localFilters.amenities.map((amenity) => (
                        <button
                          key={`selected-${amenity}`}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          title="Click to remove"
                        >
                          <span className="truncate max-w-[110px]">{amenity}</span>
                          <X className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {amenitySuggestions.length > 0 ? (
                      amenitySuggestions.map((amenity) => (
                        <button
                          key={`suggestion-${amenity}`}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          className="px-2 py-1 rounded-md text-[11px] font-medium border border-gray-200 dark:border-gray-600 hover:border-green-400 text-gray-700 dark:text-gray-300"
                        >
                          {amenity}
                        </button>
                      ))
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-1 space-y-4">
              {/* Minimum Rating */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Minimum Rating
                </h3>
                <div className="flex items-center justify-center gap-1 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setLocalFilters((prev) => ({
                          ...prev,
                          rating: prev.rating === star ? 0 : star,
                        }))
                      }
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${star <= localFilters.rating
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300 dark:text-gray-600 hover:text-yellow-300"
                          }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 md:hidden"></div>

              {/* Sex Policy */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Sex Policy
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "All", label: "All" },
                    { value: "male", label: "Boys" },
                    { value: "female", label: "Girls" },
                    { value: "mixed", label: "Mixed" },
                  ].map((policy) => (
                    <button
                      key={policy.value}
                      type="button"
                      onClick={() =>
                        setLocalFilters((prev) => ({
                          ...prev,
                          sexPolicy: policy.value,
                        }))
                      }
                      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors ${(localFilters.sexPolicy || "All") === policy.value
                          ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400"
                          : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                        }`}
                    >
                      {policy.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 md:pt-0 md:col-span-1 md:flex md:flex-col md:justify-center md:items-center md:h-full">
              <div className="border-t border-gray-200 dark:border-gray-700 md:hidden mb-2"></div>
              <button
                onClick={handleApply}
                className="w-full md:w-40 px-3 py-2 bg-green-600 text-white text-sm rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={handleClear}
                className="w-full md:w-40 mt-2 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold hover:underline"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExploreProperties;