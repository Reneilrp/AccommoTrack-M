import api, { normalizeResponse, normalizeError, normalizePaginatedResponse } from "./api.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getImageUrl } from "../utils/imageUtils.js";
import {
  normalizeActionError,
  normalizeExtendStayError,
} from "../utils/error.js";
import cacheStore from "../utils/cache.js";

const cacheManager = cacheStore;

const isFormData = (data) => data instanceof FormData;

const MULTIPART_CONFIG = {
  headers: {
    "Content-Type": "multipart/form-data",
    Accept: "application/json",
  },
  transformRequest: (data) => data,
};

const CACHE_KEYS = {
  PUBLIC_PROPERTIES: "public_properties",
  PUBLIC_PROPERTY: "public_property_", // + id
  LANDLORD_PROPERTIES: "landlord_properties",
};

const normalizeId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const extractCaretakerAssignedPropertyIds = (user) => {
  if (!user || user.role !== "caretaker") return [];

  const ids = new Set();
  const pushId = (value) => {
    const normalized = normalizeId(value);
    if (normalized) ids.add(normalized);
  };

  pushId(user.assigned_property_id);
  pushId(user.property_id);

  if (Array.isArray(user.assigned_property_ids)) {
    user.assigned_property_ids.forEach(pushId);
  }

  if (Array.isArray(user.assigned_properties)) {
    user.assigned_properties.forEach((property) => {
      if (property && typeof property === "object") {
        pushId(property.id ?? property.property_id);
      }
    });
  }

  return [...ids];
};

const scopePropertiesForCaretaker = (properties, user) => {
  if (!Array.isArray(properties)) return [];
  if (!user || user.role !== "caretaker") return properties;

  const assignedIds = extractCaretakerAssignedPropertyIds(user);
  if (!assignedIds.length) {
    return properties.slice(0, 1);
  }

  const assignedSet = new Set(assignedIds);
  const filtered = properties.filter((property) =>
    assignedSet.has(normalizeId(property?.id)),
  );

  if (filtered.length > 0) {
    return filtered;
  }

  return properties.slice(0, 1);
};

const buildLandlordPropertiesCacheKey = (user) => {
  const role = user?.role || "unknown";
  const userId = user?.id ?? "anon";
  return `${CACHE_KEYS.LANDLORD_PROPERTIES}_${role}_${userId}`;
};

const PropertyService = {
  /**
   * Get all public properties (no auth required)
   * Matches: GET /api/properties/public
   * @param {Object} filters - Optional filters (type, city, min_price, max_price)
   * @returns {Promise<Object>} - { success: boolean, data: array, error: string }
   */
  async getPublicProperties(filters = {}) {
    const cacheKey = `${CACHE_KEYS.PUBLIC_PROPERTIES}_${JSON.stringify(filters)}`;
    try {
      const cached = await cacheManager.get(cacheKey);
      if (cached) return { success: true, data: cached, error: null };

      const params = new URLSearchParams();

      // Add filters if provided
      if (filters.type && filters.type !== "All") {
        params.append("type", filters.type);
      }
      if (filters.search) {
        params.append("search", filters.search);
      }
      if (filters.city) {
        params.append("city", filters.city);
      }
      if (filters.min_price || filters.price_min) {
        params.append("min_price", filters.min_price || filters.price_min);
      }
      if (filters.max_price || filters.price_max) {
        params.append("max_price", filters.max_price || filters.price_max);
      }
      if (filters.availability) {
        params.append("availability", filters.availability);
      }
      if (filters.min_rating) {
        params.append("min_rating", filters.min_rating);
      }
      if (filters.sex_policy) {
        params.append("sex_policy", filters.sex_policy);
      }
      if (Array.isArray(filters.amenities) && filters.amenities.length > 0) {
        filters.amenities.forEach((amenity) => {
          params.append("amenities[]", amenity);
        });
      }

      const url = `/public/properties${params.toString() ? "?" + params.toString() : ""}`;
      const response = await api.get(url);
      const data = normalizePaginatedResponse(response);

      await cacheManager.set(cacheKey, data);

      return {
        success: true,
        data,
        error: null,
      };
    } catch (error) {
      console.error("Error fetching public properties:", error);
      return normalizeError(error);
    }
  },

  /**
   * Get single public property with full details including rooms
   * Matches: GET /api/properties/public/{id}
   * @param {number} propertyId - Property ID
   * @returns {Promise<Object>} - { success: boolean, data: object, error: string }
   */
  async getPublicProperty(propertyId) {
    const cacheKey = `${CACHE_KEYS.PUBLIC_PROPERTY}${propertyId}`;
    try {
      const cached = await cacheManager.get(cacheKey);
      if (cached) return { success: true, data: cached, error: null };

      const response = await api.get(`/public/properties/${propertyId}`);
      const res = normalizeResponse(response);

      if (res.success) {
        await cacheManager.set(cacheKey, res.data);
      }

      return res;
    } catch (error) {
      console.error("Error fetching public property:", error);
      return normalizeError(error);
    }
  },

  /**
   * Get notification stats for a property (for authenticated tenant)
   * Matches: GET /api/properties/{id}/stats
   * @param {number} propertyId - Property ID
   * @returns {Promise<Object>} - { success: boolean, data: object, error: string }
   */
  async getPropertyStats(propertyId) {
    try {
      const response = await api.get(`/properties/${propertyId}/stats`);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error fetching property stats:", error);
      return normalizeError(error);
    }
  },

  /**
   * Reverse geocode coordinates using backend relay
   * Matches: GET /api/reverse-geocode?lat={lat}&lon={lon}
   * @param {number|string} lat
   * @param {number|string} lon
   */
  async reverseGeocode(lat, lon) {
    try {
      const response = await api.get(`/reverse-geocode`, {
        params: { lat, lon },
      });
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      return normalizeError(error);
    }
  },

  /**
   * Transform backend property data to accommodation format for frontend
   * This matches the structure from PropertyController::publicIndex() and publicShow()
   * @param {Object} property - Property from backend
   * @returns {Object} - Transformed accommodation object
   */
  transformPropertyToAccommodation(property) {
    if (!property) return null;
    // Backend already provides the image URL or placeholder
    const coverImage =
      property.image || "https://via.placeholder.com/400x200?text=No+Image";

    // Parse property_rules if it's a JSON string
    let propertyRules = [];
    if (property.property_rules) {
      if (Array.isArray(property.property_rules)) {
        propertyRules = property.property_rules;
      } else if (typeof property.property_rules === "string") {
        try {
          const parsed = JSON.parse(property.property_rules);
          propertyRules = Array.isArray(parsed) ? parsed : [];
        } catch {
          // If parsing fails, treat as single rule or empty
          propertyRules = property.property_rules.trim()
            ? [property.property_rules]
            : [];
        }
      }
    }

    return {
      id: property.id,
      name: property.name || property.title,
      title: property.title,
      type: property.type || property.property_type || "Property",
      property_type: property.property_type, // Raw property type from backend
      sex_restriction: property.sex_restriction || 'mixed',
      has_bedspacer_room: property.has_bedspacer_room || false, // Flag for bedspacer filter
      location: property.location || property.city,
      address: property.full_address || property.address,
      street_address: property.street_address,
      city: property.city,
      province: property.province,
      barangay: property.barangay,
      postal_code: property.postal_code,
      description: property.description,
      image: coverImage,
      priceRange: property.priceRange || property.price_range,
      minPrice: property.minPrice || property.min_price,
      maxPrice: property.maxPrice || property.max_price,
      totalRooms: property.total_rooms,
      availableRooms: property.availableRooms || property.available_rooms,
      available_rooms: property.availableRooms || property.available_rooms,
      occupiedRooms:
        property.total_rooms -
        (property.availableRooms || property.available_rooms || 0),
      rating: null, // Not implemented yet
      amenities: property.amenities_list?.length
        ? property.amenities_list.map((a) => a.name || a)
        : this.extractPropertyAmenities(property.rooms),
      propertyRules: propertyRules,
      curfew_time: property.curfew_time,
      curfew_policy: property.curfew_policy,
      normal_booking_limit: property.normal_booking_limit || (property.property_type === 'bedSpacer' || property.has_bedspacer_room ? 1 : 1),
      proxy_booking_limit: property.proxy_booking_limit || 3,
      min_partial_payment_pct: property.min_partial_payment_pct || 20,
      rooms: (property.rooms || []).map(room => ({
        ...room,
        rules: room.rules || [], // Map rules from backend
        monthly_rate: room.monthly_rate, // keep as string/original for precision
        daily_rate: room.daily_rate,
      })),
      latitude: property.latitude ? parseFloat(property.latitude) : null,
      longitude: property.longitude ? parseFloat(property.longitude) : null,
      nearby_landmarks: property.nearby_landmarks,
      video_url: property.video_url,

      landlord_id: property.landlord_id,
      user_id: property.user_id || property.landlord_id,
      landlord_name: property.landlord_name,
      owner_name: property.owner_name || property.landlord_name,
      landlord: property.landlord || null,
      tenant_usage: property.tenant_usage || { normal: 0, proxy: 0 },
    };
  },

  /**
   * Format property type to display format
   * Matches the property_type values from your backend
   * @param {string} type - Property type from backend
   * @returns {string} - Formatted type
   */
  formatPropertyType(type) {
    if (!type) return "Property";

    const normalized = String(type).toLowerCase().trim().replace(/\s+/g, "");
    const typeMap = {
      apartment: "Apartment",
      dormitory: "Dormitory",
      boardinghouse: "Boarding House",
      bedspacer: "Bed Spacer",
    };
    return typeMap[normalized] || type;
  },

  /**
   * Extract unique amenities from all rooms in a property
   * @param {Array} rooms - Array of room objects
   * @returns {Array} - Unique amenities list
   */
  extractPropertyAmenities(rooms) {
    if (!rooms || rooms.length === 0) return [];

    const allAmenities = rooms.reduce((acc, room) => {
      if (room.amenities && Array.isArray(room.amenities)) {
        return [...acc, ...room.amenities];
      }
      return acc;
    }, []);

    // Return unique amenities
    return [...new Set(allAmenities)];
  },

  // ----- AUTHENTICATED ENDPOINTS (For landlords) -----

  /**
   * Get all properties for authenticated landlord
   * Matches: GET /api/landlord/properties
   * @returns {Promise<Object>} - { success: boolean, data: array, error: string }
   */
  async getMyProperties() {
    try {
      let currentUser = null;
      try {
        const userString = await AsyncStorage.getItem("user");
        currentUser = userString ? JSON.parse(userString) : null;
      } catch (_parseError) {
        currentUser = null;
      }

      const cacheKey = buildLandlordPropertiesCacheKey(currentUser);
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        return {
          success: true,
          data: scopePropertiesForCaretaker(cached, currentUser),
          error: null,
        };
      }

      const response = await api.get(`/landlord/properties`);
      const normalized = normalizeResponse(response);
      const rawItems = Array.isArray(normalized.data) ? normalized.data : [];
      const items = scopePropertiesForCaretaker(rawItems, currentUser);

      await cacheManager.set(cacheKey, items);

      return {
        success: true,
        data: items,
        error: null,
      };
    } catch (error) {
      console.error("Error fetching my properties:", error);
      return normalizeError(error);
    }
  },

  /**
   * Get property summary bundle (Consolidated data for PropertySummary screen)
   */
  async getPropertySummaryBundle(propertyId) {
    try {
      const response = await api.get(`/properties/${propertyId}/summary-bundle`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  },

  /**
   * Get specific landlord property with relations
   * Matches: GET /api/landlord/properties/{id}
   */
  async getProperty(propertyId) {
    try {
      const response = await api.get(`/landlord/properties/${propertyId}`);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error fetching property details:", error);
      return normalizeError(error);
    }
  },

  /**
   * Create a new property
   * Matches: POST /api/landlord/properties
   * @param {Object} propertyData - Property data
   * @returns {Promise<Object>} - { success: boolean, data: object, error: string }
   */
  async createProperty(propertyData) {
    try {
      // Set Content-Type: multipart/form-data with transformRequest: (data) => data
      // as requested to ensure FormData is handled correctly by Axios/RN.
      const response = await api.post(`/landlord/properties`, propertyData, MULTIPART_CONFIG);

      await cacheManager.invalidate(CACHE_KEYS.LANDLORD_PROPERTIES);
      await cacheManager.clearAll();

      return normalizeResponse(response);
    } catch (error) {
      // Log full response for debugging 500s
      if (error?.response) {
        console.error("[createProperty] Server responded with error:", {
          status: error.response.status,
          data: error.response.data,
        });
      } else {
        console.error("[createProperty] No response (network/timeout):", error?.message);
      }
      return normalizeError(error);
    }
  },

  /**
   * Update a property
   * Matches: PUT /api/landlord/properties/{id}
   * @param {number} propertyId - Property ID
   * @param {Object} propertyData - Updated property data
   * @returns {Promise<Object>} - { success: boolean, data: object, error: string }
   */
  async updateProperty(propertyId, propertyData) {
    try {
      let payload = propertyData;
      if (isFormData(propertyData)) {
        // Use POST with _method=PUT for multipart — do NOT set Content-Type manually
        propertyData.append("_method", "PUT");
      }

      const response = await api.post(
        `/landlord/properties/${propertyId}`,
        payload,
        MULTIPART_CONFIG
      );

      await cacheManager.invalidate(CACHE_KEYS.LANDLORD_PROPERTIES);
      await cacheManager.invalidate(`${CACHE_KEYS.PUBLIC_PROPERTY}${propertyId}`);
      await cacheManager.clearAll();

      return normalizeResponse(response);
    } catch (error) {
      if (error?.response) {
        console.error("[updateProperty] Server error:", {
          status: error.response.status,
          data: error.response.data,
        });
      } else {
        console.error("[updateProperty] No response (network/timeout):", error?.message);
      }
      return normalizeError(error);
    }
  },

  /**
   * Delete a property
   * Matches: DELETE /api/landlord/properties/{id}
   * @param {number} propertyId - Property ID
   * @param {string} password - Landlord password confirmation
   * @returns {Promise<Object>} - { success: boolean, error: string }
   */
  async deleteProperty(propertyId, password) {
    try {
      const response = await api.delete(`/landlord/properties/${propertyId}`, {
        data: { password },
      });

      await cacheManager.invalidate(CACHE_KEYS.LANDLORD_PROPERTIES);
      await cacheManager.invalidate(`${CACHE_KEYS.PUBLIC_PROPERTY}${propertyId}`);
      await cacheManager.clearAll();

      return normalizeResponse(response);
    } catch (error) {
      console.error("Error deleting property:", error);
      return normalizeError(error);
    }
  },

  /**
   * Verify password before destructive action
   * Matches: POST /api/landlord/properties/verify-password
   */
  async verifyPropertyPassword(password) {
    try {
      const response = await api.post(`/landlord/properties/verify-password`, {
        password,
      });
      return normalizeResponse(response);
    } catch (error) {
      console.error("Password verification failed:", error);
      return normalizeError(error);
    }
  },

  /**
   * Fetch rooms for a property
   * Matches: GET /api/landlord/properties/{id}/rooms
   */
  async getRooms(propertyId, page = 1) {
    try {
      const response = await api.get(
        `/landlord/properties/${propertyId}/rooms`,
        { params: { page } }
      );
      return {
        success: true,
        data: normalizePaginatedResponse(response),
        error: null
      };
    } catch (error) {
      console.error("Error fetching rooms:", error);
      return normalizeError(error);
    }
  },

  /**
   * Fetch room statistics for a property
   * Matches: GET /api/landlord/properties/{id}/rooms/stats
   */
  async getRoomStats(propertyId) {
    try {
      const response = await api.get(
        `/landlord/properties/${propertyId}/rooms/stats`,
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error fetching room stats:", error);
      return normalizeError(error);
    }
  },

  /**
   * Create a room for the landlord
   * Matches: POST /api/landlord/rooms
   */
  async createRoom(roomData) {
    try {
      const response = await api.post(`/landlord/rooms`, roomData, MULTIPART_CONFIG);
      await cacheManager.invalidate(CACHE_KEYS.LANDLORD_PROPERTIES);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error creating room:", error);
      return normalizeError(error);
    }
  },

  /**
   * Update a room
   * Matches: PUT /api/landlord/rooms/{id}
   */
  async updateRoom(roomId, roomData) {
    try {
      let payload = roomData;
      if (isFormData(roomData)) {
        roomData.append("_method", "PUT");
        return api.post(`/landlord/rooms/${roomId}`, payload, MULTIPART_CONFIG).then(async (res) => {
          await cacheManager.invalidate(CACHE_KEYS.LANDLORD_PROPERTIES);
          return normalizeResponse(res);
        });
      }

      const response = await api.put(`/landlord/rooms/${roomId}`, payload);
      await cacheManager.invalidate(CACHE_KEYS.LANDLORD_PROPERTIES);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error updating room:", error);
      return normalizeError(error);
    }
  },

  /**
   * Delete a room
   * Matches: DELETE /api/landlord/rooms/{id}
   */
  async deleteRoom(roomId) {
    try {
      const response = await api.delete(`/landlord/rooms/${roomId}`);
      await cacheManager.invalidate(CACHE_KEYS.LANDLORD_PROPERTIES);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error deleting room:", error);
      return normalizeError(error);
    }
  },

  /**
   * Update room status
   * Matches: PATCH /api/landlord/rooms/{id}/status
   */
  async updateRoomStatus(roomId, status) {
    if (!roomId) {
      return {
        success: false,
        data: null,
        error: "Unable to update room status: room id is missing.",
      };
    }

    try {
      const response = await api.patch(`/landlord/rooms/${roomId}/status`, { status });
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error updating room status:", error);
      return normalizeError(error);
    }
  },

  /**
   * Add amenity to property catalog
   * Matches: POST /api/landlord/properties/{id}/amenities
   */
  async addPropertyAmenity(propertyId, amenity) {
    try {
      const response = await api.post(
        `/landlord/properties/${propertyId}/amenities`,
        { amenity },
        { headers: { "Content-Type": "application/json" } },
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error adding property amenity:", error);
      return normalizeError(error);
    }
  },

  /**
   * Add rule to property catalog
   * Matches: POST /api/landlord/properties/{id}/rules
   */
  async addPropertyRule(propertyId, rule) {
    try {
      const response = await api.post(
        `/landlord/properties/${propertyId}/rules`,
        { rule },
        { headers: { "Content-Type": "application/json" } },
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error adding property rule:", error);
      return normalizeError(error);
    }
  },

  /**
   * Fetch tenants for the authenticated landlord
   * Matches: GET /api/landlord/tenants
   */
  async getTenants(params = {}) {
    try {
      const response = await api.get(`/landlord/tenants`, {
        params,
      });
      return {
        success: true,
        data: normalizePaginatedResponse(response),
        error: null
      };
    } catch (error) {
      console.error("Error fetching tenants:", error);
      return normalizeError(error);
    }
  },

  /**
   * Fetch rooms by property ID for transfer flow
   * Matches: GET /api/rooms/property/{propertyId}
   */
  async getRoomsByProperty(propertyId) {
    try {
      const response = await api.get(`/rooms/property/${propertyId}`);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error fetching rooms by property:", error);
      return normalizeError(error);
    }
  },

  /**
   * Transfer tenant to another room
   * Matches: POST /api/landlord/tenants/{tenantId}/transfer-room
   */
  async transferTenantRoom(tenantId, payload) {
    try {
      const response = await api.post(
        `/landlord/tenants/${tenantId}/transfer-room`,
        payload,
        { headers: { "Content-Type": "application/json" } },
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error transferring tenant room:", error);
      return normalizeError(error);
    }
  },

  /**
   * Schedule tenant eviction
   * Matches: POST /api/landlord/tenants/{tenantId}/evictions/schedule
   */
  async scheduleTenantEviction(tenantId, payload) {
    try {
      const response = await api.post(
        `/landlord/tenants/${tenantId}/evictions/schedule`,
        payload,
        { headers: { "Content-Type": "application/json" } },
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error evicting tenant:", error);
      return normalizeError(error);
    }
  },

  /**
   * Finalize scheduled eviction
   * Matches: POST /api/landlord/tenants/{tenantId}/evictions/finalize
   */
  async finalizeTenantEviction(tenantId, payload = {}) {
    try {
      const response = await api.post(
        `/landlord/tenants/${tenantId}/evictions/finalize`,
        payload,
        { headers: { "Content-Type": "application/json" } },
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error finalizing tenant eviction:", error);
      return normalizeError(error);
    }
  },

  /**
   * Cancel scheduled eviction
   * Matches: POST /api/landlord/tenants/{tenantId}/evictions/cancel
   */
  async cancelTenantEviction(tenantId, note = "") {
    try {
      const response = await api.post(
        `/landlord/tenants/${tenantId}/evictions/cancel`,
        { note },
        { headers: { "Content-Type": "application/json" } },
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error cancelling tenant eviction:", error);
      return normalizeError(error);
    }
  },

  /**
   * Undo finalized eviction
   * Matches: POST /api/landlord/tenants/{tenantId}/evictions/undo
   */
  async undoTenantEviction(tenantId, reason = "") {
    try {
      const response = await api.post(
        `/landlord/tenants/${tenantId}/evictions/undo`,
        { reason },
        { headers: { "Content-Type": "application/json" } },
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error undoing tenant eviction:", error);
      return normalizeError(error);
    }
  },

  /**
   * Legacy immediate eviction endpoint.
   * Matches: POST /api/landlord/tenants/{tenantId}/evict
   */
  async evictTenant(tenantId, reason) {
    return this.scheduleTenantEviction(tenantId, { reason, grace_hours: 0 });
  },

  /**
   * Broadcast message to selected tenants
   * Matches: POST /api/landlord/broadcast
   */
  async broadcastToTenants(tenantIds, message) {
    try {
      const response = await api.post(
        `/landlord/broadcast`,
        { tenant_ids: tenantIds, message },
        { headers: { "Content-Type": "application/json" } },
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error sending tenant broadcast:", error);
      return normalizeError(error);
    }
  },

  /**
   * Create a tenant on behalf of landlord
   * Matches: POST /api/landlord/tenants
   */
  async createTenant(tenantData) {
    try {
      const response = await api.post(`/landlord/tenants`, tenantData, {
        headers: { "Content-Type": "application/json" },
      });
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error creating tenant:", error);
      return normalizeError(error);
    }
  },

  /**
   * Generate one-time claim code for an existing tenant account
   * Matches: POST /api/landlord/tenants/{id}/claim-code
   */
  async generateTenantClaimCode(tenantId) {
    try {
      const response = await api.post(
        `/landlord/tenants/${tenantId}/claim-code`,
        {},
        { headers: { "Content-Type": "application/json" } },
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error generating tenant claim code:", error);
      return normalizeError(error);
    }
  },

  /**
   * Update tenant details
   * Matches: PUT /api/landlord/tenants/{id}
   */
  async updateTenant(tenantId, tenantData) {
    try {
      const response = await api.put(
        `/landlord/tenants/${tenantId}`,
        tenantData,
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error updating tenant:", error);
      return normalizeError(error);
    }
  },

  /**
   * Delete tenant
   * Matches: DELETE /api/landlord/tenants/{id}
   */
  async deleteTenant(tenantId) {
    try {
      const response = await api.delete(`/landlord/tenants/${tenantId}`);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error deleting tenant:", error);
      return normalizeError(error);
    }
  },

  /**
   * Assign tenant to room
   * Matches: POST /api/landlord/tenants/{id}/assign-room
   */
  async assignTenantToRoom(tenantId, payload) {
    try {
      const response = await api.post(
        `/landlord/tenants/${tenantId}/assign-room`,
        payload,
        { headers: { "Content-Type": "application/json" } },
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error assigning tenant to room:", error);
      return normalizeError(error);
    }
  },

  /**
   * Unassign tenant from room
   * Matches: DELETE /api/landlord/tenants/{id}/unassign-room
   */
  async unassignTenantFromRoom(tenantId) {
    try {
      const response = await api.delete(
        `/landlord/tenants/${tenantId}/unassign-room`,
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error unassigning tenant room:", error);
      return normalizeError(error);
    }
  },

  /**
   * Fetch bookings for landlord
   * Matches: GET /api/bookings
   */
  async getBookings(params = {}) {
    try {
      const response = await api.get(`/bookings`, {
        params,
      });
      return {
        success: true,
        data: normalizePaginatedResponse(response),
        error: null
      };
    } catch (error) {
      console.error("Error fetching bookings:", error);
      return normalizeError(error);
    }
  },

  /**
   * Fetch booking bundle
   * Matches: GET /api/bookings/bundle
   */
  async getBookingBundle() {
    try {
      const response = await api.get(`/bookings/bundle`);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error fetching booking bundle:", error);
      return normalizeError(error);
    }
  },

  /**
   * Fetch booking stats
   * Matches: GET /api/bookings/stats
   */
  async getBookingStats() {
    try {
      const response = await api.get(`/bookings/stats`);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error fetching booking stats:", error);
      return normalizeError(error);
    }
  },

  /**
   * Update booking status
   * Matches: PATCH /api/bookings/{id}/status
   */
  async updateBookingStatus(bookingId, payload) {
    try {
      const response = await api.patch(
        `/bookings/${bookingId}/status`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error updating booking status:", error);
      return normalizeError(error);
    }
  },

  /**
   * Update booking payment status
   * Matches: PATCH /api/bookings/{id}/payment
   */
  async updateBookingPayment(bookingId, payload) {
    try {
      const response = await api.patch(
        `/bookings/${bookingId}/payment`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error updating booking payment:", error);
      return normalizeError(error);
    }
  },

  /**
   * Finalize checkout for an active booking.
   * Matches: POST /api/bookings/{id}/finalize-checkout
   */
  async finalizeBookingCheckout(bookingId, payload = {}) {
    try {
      const response = await api.post(
        `/bookings/${bookingId}/finalize-checkout`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Checkout finalized successfully.';
      }
      return res;
    } catch (error) {
      console.error("Error finalizing booking checkout:", error);
      return normalizeError(error);
    }
  },

  /**
   * Record deposit settlement for a booking.
   * Matches: POST /api/bookings/{id}/deposit-settlement
   */
  async settleBookingDeposit(bookingId, payload) {
    try {
      const response = await api.post(
        `/bookings/${bookingId}/deposit-settlement`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Deposit settlement recorded successfully.';
      }
      return res;
    } catch (error) {
      console.error("Error settling booking deposit:", error);
      return normalizeError(error);
    }
  },

  /**
   * Fetch deposit settlement history for a booking.
   * Matches: GET /api/bookings/{id}/deposit-settlements
   */
  async getBookingDepositSettlements(bookingId) {
    try {
      const response = await api.get(`/bookings/${bookingId}/deposit-settlements`);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error fetching booking deposit settlements:", error);
      return normalizeError(error);
    }
  },

  /**
   * Fetch tenant extension requests for landlord
   * Matches: GET /api/landlord/extensions
   */
  async getExtensionRequests() {
    try {
      const response = await api.get(`/landlord/extensions`);
      return {
        success: true,
        data: normalizePaginatedResponse(response),
        error: null
      };
    } catch (error) {
      console.error("Error fetching extension requests:", error);
      return normalizeError(error);
    }
  },

  /**
   * Handle tenant extension request (approve/modify/reject)
   * Matches: PATCH /api/landlord/extensions/{id}/handle
   */
  async handleExtensionRequest(requestId, payload) {
    try {
      const response = await api.patch(
        `/landlord/extensions/${requestId}/handle`,
        payload,
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error handling extension request:", error);
      return normalizeError(error);
    }
  },

  /**
   * Fetch tenant transfer requests for landlord
   * Matches: GET /api/landlord/transfers
   */
  async getTransferRequests(params = {}) {
    try {
      const response = await api.get(`/landlord/transfers`, {
        params,
      });
      return {
        success: true,
        data: normalizePaginatedResponse(response),
        error: null
      };
    } catch (error) {
      console.error("Error fetching transfer requests:", error);
      return normalizeError(error);
    }
  },

  /**
   * Handle tenant transfer request (approve/reject)
   * Matches: PATCH /api/landlord/transfers/{id}/handle
   */
  async handleTransferRequest(requestId, payload) {
    try {
      const response = await api.patch(
        `/landlord/transfers/${requestId}/handle`,
        payload,
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error handling transfer request:", error);
      return normalizeError(error);
    }
  },

  /**
   * Fetch transfer proration details
   * Matches: GET /api/landlord/transfers/{id}/proration
   */
  async getTransferProration(requestId) {
    try {
      const response = await api.get(`/landlord/transfers/${requestId}/proration`);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error fetching transfer proration:", error);
      return normalizeError(error);
    }
  },

  /**
   * Get payment options for a room
   * Matches: GET /api/rooms/{roomId}/payment-options
   */
  async getRoomPaymentOptions(roomId) {
    try {
      const response = await api.get(`/rooms/${roomId}/payment-options`);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error fetching payment options:", error);
      return normalizeError(error);
    }
  },

  /**
   * Get dynamic pricing calculation for a room (no auth required)
   * Matches: GET /api/rooms/{roomId}/pricing?start_date={start}&end_date={end}
   * @param {number} roomId - Room ID
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @param {object} options - Optional params (contractMode, bedCount)
   */
  async getRoomPricing(roomId, startDate, endDate, options = {}) {
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
      };

      if (options?.contractMode) {
        params.contract_mode = options.contractMode;
      }

      if (options?.bedCount) {
        params.bed_count = options.bedCount;
      }

      const response = await api.get(`/rooms/${roomId}/pricing`, {
        params,
      });
      return normalizeResponse(response);
    } catch (error) {
      console.error("Pricing calculation failed:", error);
      return normalizeError(error);
    }
  },

  /**
   * Assign a tenant to a room
   * Matches: POST /api/rooms/{id}/assign-tenant
   */
  async assignRoomToTenant(roomId, tenantId, startDate = null) {
    try {
      const response = await api.post(`/rooms/${roomId}/assign-tenant`, {
        tenant_id: tenantId,
        start_date: startDate,
      });
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error assigning tenant:", error);
      return normalizeError(error);
    }
  },

  /**
   * Remove a tenant from a room
   * Matches: DELETE /api/rooms/{id}/remove-tenant
   */
  async removeTenantFromRoom(roomId, tenantId = null) {
    try {
      const response = await api.delete(`/rooms/${roomId}/remove-tenant`, {
        data: { tenant_id: tenantId },
      });
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error removing tenant:", error);
      return normalizeError(error);
    }
  },

  /**
   * Extend stay for a tenant in a room
   * Matches: POST /api/rooms/{id}/extend
   */
  async extendStay(roomId, payload) {
    try {
      const response = await api.post(`/rooms/${roomId}/extend`, payload);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error extending stay:", error);
      return normalizeError(error);
    }
  },

  getImageUrl,
};

export default PropertyService;
