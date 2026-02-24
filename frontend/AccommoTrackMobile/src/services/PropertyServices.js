import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, BASE_URL } from '../config';

const STORAGE_URL = `${BASE_URL}/storage`;
const LANDLORD_PREFIX = `${API_BASE_URL}/landlord`;

const getAuthToken = async () => {
    // Prefer token stored inside the persisted `user` object
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            const t = user?.token;
            if (t) return t;
        } catch (e) {}
    }
    const token = (await AsyncStorage.getItem('token'));
    if (!token) {
        throw new Error('No authentication token found');
    }
    return token;
};

const buildHeaders = (token, options = {}) => {
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    };

    if (options.contentType) {
        headers['Content-Type'] = options.contentType;
    }

    return headers;
};

const isFormData = (payload) => typeof FormData !== 'undefined' && payload instanceof FormData;

const extractErrorMessage = (error) => {
    const errors = error.response?.data?.errors;
    if (errors && typeof errors === 'object') {
        const joined = Object.values(errors)
            .flat()
            .map((msg) => (typeof msg === 'string' ? msg : ''))
            .filter(Boolean)
            .join(' ');
        if (joined) {
            return joined;
        }
    }

    if (error.response?.data?.message) return error.response.data.message;
    if (error.response?.data?.error) return error.response.data.error;
    if (typeof error.response?.data === 'string') return error.response.data;
    return error.message || 'Request failed';
};

/**
 * Property Service for handling all property-related API calls
 */
export const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    const cleanPath = imagePath.replace(/^\/+/, '');
    if (cleanPath.startsWith('storage/')) {
        return `${BASE_URL}/${cleanPath}`;
    }
    return `${STORAGE_URL}/${cleanPath}`;
};

const PropertyService = {
    /**
     * Get all public properties (no auth required)
     * Matches: GET /api/properties/public
     * @param {Object} filters - Optional filters (type, city, min_price, max_price)
     * @returns {Promise<Object>} - { success: boolean, data: array, error: string }
     */
    async getPublicProperties(filters = {}) {
        try {
            const params = new URLSearchParams();

            // Add filters if provided
            if (filters.type && filters.type !== 'All') {
                params.append('type', filters.type);
            }
            if (filters.city) {
                params.append('city', filters.city);
            }
            if (filters.min_price) {
                params.append('min_price', filters.min_price);
            }
            if (filters.max_price) {
                params.append('max_price', filters.max_price);
            }

            const url = `${API_BASE_URL}/public/properties${params.toString() ? '?' + params.toString() : ''}`;
            console.log('Fetching properties from:', url);

            const response = await axios.get(url);

            // Debug: Log the actual response
            console.log('Response status:', response.status);
            console.log('Response data type:', typeof response.data);
            console.log('Response data is array?', Array.isArray(response.data));
            console.log('Response data:', JSON.stringify(response.data).substring(0, 200));

            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error fetching public properties:');
            console.error('Error message:', error.message);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);

            return {
                success: false,
                data: [],
                error: error.response?.data?.message || error.message || 'Failed to fetch properties'
            };
        }
    },

    /**
     * Get single public property with full details including rooms
     * Matches: GET /api/properties/public/{id}
     * @param {number} propertyId - Property ID
     * @returns {Promise<Object>} - { success: boolean, data: object, error: string }
     */
    async getPublicProperty(propertyId) {
        try {
            console.log('Fetching property details:', propertyId);
            const response = await axios.get(`${API_BASE_URL}/public/properties/${propertyId}`);

            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error fetching property:', error);
            return {
                success: false,
                data: null,
                error: error.response?.data?.message || error.message || 'Failed to fetch property'
            };
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
            const response = await axios.get(`${API_BASE_URL}/reverse-geocode`, {
                params: { lat, lon }
            });

            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error reverse geocoding:', error);
            return {
                success: false,
                data: null,
                error: error.response?.data?.message || error.message || 'Reverse geocode failed'
            };
        }
    },

    /**
     * Transform backend property data to accommodation format for frontend
     * This matches the structure from PropertyController::publicIndex() and publicShow()
     * @param {Object} property - Property from backend
     * @returns {Object} - Transformed accommodation object
     */
    transformPropertyToAccommodation(property) {
        // Backend already provides the image URL or placeholder
        const coverImage = property.image || 'https://via.placeholder.com/400x200?text=No+Image';

        // Parse property_rules if it's a JSON string
        let propertyRules = [];
        if (property.property_rules) {
            if (Array.isArray(property.property_rules)) {
                propertyRules = property.property_rules;
            } else if (typeof property.property_rules === 'string') {
                try {
                    const parsed = JSON.parse(property.property_rules);
                    propertyRules = Array.isArray(parsed) ? parsed : [];
                } catch {
                    // If parsing fails, treat as single rule or empty
                    propertyRules = property.property_rules.trim() ? [property.property_rules] : [];
                }
            }
        }

        return {
            id: property.id,
            name: property.name || property.title,
            title: property.title,
            type: property.type || property.property_type || 'Property',
            property_type: property.property_type, // Raw property type from backend
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
            occupiedRooms: property.total_rooms - (property.availableRooms || property.available_rooms || 0),
            rating: null, // Not implemented yet
            amenities: this.extractPropertyAmenities(property.rooms),
            propertyRules: propertyRules,
            rooms: property.rooms || [],
            latitude: property.latitude ? parseFloat(property.latitude) : null,
            longitude: property.longitude ? parseFloat(property.longitude) : null,
            nearby_landmarks: property.nearby_landmarks,

            landlord_id: property.landlord_id,
            user_id: property.user_id || property.landlord_id,
            landlord_name: property.landlord_name,
            owner_name: property.owner_name || property.landlord_name,
            landlord: property.landlord || null,
        };
    },

    /**
     * Format property type to display format
     * Matches the property_type values from your backend
     * @param {string} type - Property type from backend
     * @returns {string} - Formatted type
     */
    formatPropertyType(type) {
        if (!type) return 'Property';

        const normalized = String(type).toLowerCase().trim().replace(/\s+/g, '');
        const typeMap = {
            'apartment': 'Apartment',
            'dormitory': 'Dormitory',
            'boardinghouse': 'Boarding House',
            'bedspacer': 'Bed Spacer',
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
            const token = await getAuthToken();
            const response = await axios.get(`${LANDLORD_PREFIX}/properties`, {
                headers: buildHeaders(token)
            });

            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error fetching my properties:', error.response?.data || error.message);
            return {
                success: false,
                data: [],
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Get specific landlord property with relations
     * Matches: GET /api/landlord/properties/{id}
     */
    async getProperty(propertyId) {
        try {
            const token = await getAuthToken();
            const response = await axios.get(`${LANDLORD_PREFIX}/properties/${propertyId}`, {
                headers: buildHeaders(token)
            });

            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error fetching property details:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
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
            const token = await getAuthToken();
            const headers = buildHeaders(token, {
                contentType: isFormData(propertyData)
                    ? 'multipart/form-data'
                    : 'application/json'
            });
            const response = await axios.post(`${LANDLORD_PREFIX}/properties`, propertyData, { headers });

            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error creating property:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
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
            const token = await getAuthToken();
            let payload = propertyData;
            let headers = buildHeaders(token, {
                contentType: isFormData(propertyData)
                    ? 'multipart/form-data'
                    : 'application/json'
            });

            // For multipart/form-data with PUT, use POST + _method=PUT spoofing
            if (isFormData(propertyData)) {
                propertyData.append('_method', 'PUT');
            }

            const response = await axios.post(
                `${LANDLORD_PREFIX}/properties/${propertyId}`,
                payload,
                { headers }
            );

            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error updating property:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
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
            const token = await getAuthToken();
            await axios.delete(`${LANDLORD_PREFIX}/properties/${propertyId}`, {
                headers: buildHeaders(token),
                data: { password }
            });

            return {
                success: true,
                error: null
            };
        } catch (error) {
            console.error('Error deleting property:', error.response?.data || error.message);
            return {
                success: false,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Verify password before destructive action
     * Matches: POST /api/landlord/properties/verify-password
     */
    async verifyPropertyPassword(password) {
        try {
            const token = await getAuthToken();
            const response = await axios.post(
                `${LANDLORD_PREFIX}/properties/verify-password`,
                { password },
                { headers: buildHeaders(token) }
            );
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Password verification failed:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Fetch rooms for a property
     * Matches: GET /api/landlord/properties/{id}/rooms
     */
    async getRooms(propertyId) {
        try {
            const token = await getAuthToken();
            const response = await axios.get(`${LANDLORD_PREFIX}/properties/${propertyId}/rooms`, {
                headers: buildHeaders(token)
            });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error fetching rooms:', error.response?.data || error.message);
            return {
                success: false,
                data: [],
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Fetch room statistics for a property
     * Matches: GET /api/landlord/properties/{id}/rooms/stats
     */
    async getRoomStats(propertyId) {
        try {
            const token = await getAuthToken();
            const response = await axios.get(`${LANDLORD_PREFIX}/properties/${propertyId}/rooms/stats`, {
                headers: buildHeaders(token)
            });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error fetching room stats:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Create a room for the landlord
     * Matches: POST /api/landlord/rooms
     */
    async createRoom(roomData) {
        try {
            const token = await getAuthToken();
            const headers = buildHeaders(token, {
                contentType: isFormData(roomData) ? 'multipart/form-data' : 'application/json'
            });
            const response = await axios.post(`${LANDLORD_PREFIX}/rooms`, roomData, { headers });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error creating room:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Update a room
     * Matches: PUT /api/rooms/{id}
     */
    async updateRoom(roomId, roomData) {
        try {
            const token = await getAuthToken();
            let payload = roomData;
            let headers = buildHeaders(token, {
                contentType: isFormData(roomData) ? 'multipart/form-data' : 'application/json'
            });

            if (isFormData(roomData)) {
                roomData.append('_method', 'PUT');
            }

            const url = isFormData(roomData) 
                ? `${API_BASE_URL}/rooms/${roomId}`
                : `${API_BASE_URL}/rooms/${roomId}?_method=PUT`;

            const response = await axios.post(url, payload, { headers });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error updating room:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Delete a room
     * Matches: DELETE /api/rooms/{id}
     */
    async deleteRoom(roomId) {
        try {
            const token = await getAuthToken();
            await axios.delete(`${API_BASE_URL}/rooms/${roomId}`, {
                headers: buildHeaders(token)
            });
            return {
                success: true,
                error: null
            };
        } catch (error) {
            console.error('Error deleting room:', error.response?.data || error.message);
            return {
                success: false,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Update room status
     * Matches: PATCH /api/rooms/{id}/status
     */
    async updateRoomStatus(roomId, status) {
        try {
            const token = await getAuthToken();
            const response = await axios.patch(`${API_BASE_URL}/rooms/${roomId}/status`, { status }, {
                headers: buildHeaders(token)
            });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error updating room status:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Add amenity to property catalog
     * Matches: POST /api/landlord/properties/{id}/amenities
     */
    async addPropertyAmenity(propertyId, amenity) {
        try {
            const token = await getAuthToken();
            const response = await axios.post(
                `${LANDLORD_PREFIX}/properties/${propertyId}/amenities`,
                { amenity },
                { headers: buildHeaders(token, { contentType: 'application/json' }) }
            );
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error adding property amenity:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Add rule to property catalog
     * Matches: POST /api/landlord/properties/{id}/rules
     */
    async addPropertyRule(propertyId, rule) {
        try {
            const token = await getAuthToken();
            const response = await axios.post(
                `${LANDLORD_PREFIX}/properties/${propertyId}/rules`,
                { rule },
                { headers: buildHeaders(token, { contentType: 'application/json' }) }
            );
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error adding property rule:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Fetch tenants for the authenticated landlord
     * Matches: GET /api/landlord/tenants
     */
    async getTenants(params = {}) {
        try {
            const token = await getAuthToken();
            const response = await axios.get(`${LANDLORD_PREFIX}/tenants`, {
                headers: buildHeaders(token),
                params
            });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error fetching tenants:', error.response?.data || error.message);
            return {
                success: false,
                data: [],
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Create a tenant on behalf of landlord
     * Matches: POST /api/landlord/tenants
     */
    async createTenant(tenantData) {
        try {
            const token = await getAuthToken();
            const response = await axios.post(`${LANDLORD_PREFIX}/tenants`, tenantData, {
                headers: buildHeaders(token, { contentType: 'application/json' })
            });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error creating tenant:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Update tenant details
     * Matches: PUT /api/landlord/tenants/{id}
     */
    async updateTenant(tenantId, tenantData) {
        try {
            const token = await getAuthToken();
            const response = await axios.put(`${LANDLORD_PREFIX}/tenants/${tenantId}`, tenantData, {
                headers: buildHeaders(token, { contentType: 'application/json' })
            });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error updating tenant:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Delete tenant
     * Matches: DELETE /api/landlord/tenants/{id}
     */
    async deleteTenant(tenantId) {
        try {
            const token = await getAuthToken();
            await axios.delete(`${LANDLORD_PREFIX}/tenants/${tenantId}`, {
                headers: buildHeaders(token)
            });
            return {
                success: true,
                error: null
            };
        } catch (error) {
            console.error('Error deleting tenant:', error.response?.data || error.message);
            return {
                success: false,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Assign tenant to room
     * Matches: POST /api/landlord/tenants/{id}/assign-room
     */
    async assignTenantToRoom(tenantId, payload) {
        try {
            const token = await getAuthToken();
            const response = await axios.post(
                `${LANDLORD_PREFIX}/tenants/${tenantId}/assign-room`,
                payload,
                { headers: buildHeaders(token, { contentType: 'application/json' }) }
            );
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error assigning tenant to room:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Unassign tenant from room
     * Matches: DELETE /api/landlord/tenants/{id}/unassign-room
     */
    async unassignTenantFromRoom(tenantId) {
        try {
            const token = await getAuthToken();
            const response = await axios.delete(`${LANDLORD_PREFIX}/tenants/${tenantId}/unassign-room`, {
                headers: buildHeaders(token)
            });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error unassigning tenant room:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Fetch bookings for landlord
     * Matches: GET /api/bookings
     */
    async getBookings(params = {}) {
        try {
            const token = await getAuthToken();
            const response = await axios.get(`${API_BASE_URL}/bookings`, {
                headers: buildHeaders(token),
                params
            });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error fetching bookings:', error.response?.data || error.message);
            return {
                success: false,
                data: [],
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Fetch booking stats
     * Matches: GET /api/bookings/stats
     */
    async getBookingStats() {
        try {
            const token = await getAuthToken();
            const response = await axios.get(`${API_BASE_URL}/bookings/stats`, {
                headers: buildHeaders(token)
            });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error fetching booking stats:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Update booking status
     * Matches: PATCH /api/bookings/{id}/status
     */
    async updateBookingStatus(bookingId, payload) {
        try {
            const token = await getAuthToken();
            const response = await axios.patch(`${API_BASE_URL}/bookings/${bookingId}/status`, payload, {
                headers: buildHeaders(token, { contentType: 'application/json' })
            });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error updating booking status:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    /**
     * Update booking payment status
     * Matches: PATCH /api/bookings/{id}/payment
     */
    async updateBookingPayment(bookingId, payload) {
        try {
            const token = await getAuthToken();
            const response = await axios.patch(`${API_BASE_URL}/bookings/${bookingId}/payment`, payload, {
                headers: buildHeaders(token, { contentType: 'application/json' })
            });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error updating booking payment:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                error: extractErrorMessage(error)
            };
        }
    },

    getImageUrl
};

export default PropertyService;