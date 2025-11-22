import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.43.84:8000/api';

/**
 * Property Service for handling all property-related API calls
 */
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

            // Axios automatically puts the response in response.data
            // So if Laravel returns an array directly, it's in response.data
            return {
                success: true,
                data: response.data, // This is already the array from Laravel
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
     * Matches: GET /api/properties
     * @returns {Promise<Object>} - { success: boolean, data: array, error: string }
     */
    async getMyProperties() {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                return {
                    success: false,
                    data: [],
                    error: 'No authentication token found'
                };
            }

            const response = await axios.get(`${API_BASE_URL}/properties`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error fetching my properties:', error);
            return {
                success: false,
                data: [],
                error: error.response?.data?.message || error.message || 'Failed to fetch properties'
            };
        }
    },

    /**
     * Create a new property
     * Matches: POST /api/properties
     * @param {Object} propertyData - Property data
     * @returns {Promise<Object>} - { success: boolean, data: object, error: string }
     */
    async createProperty(propertyData) {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                return {
                    success: false,
                    data: null,
                    error: 'No authentication token found'
                };
            }

            const response = await axios.post(`${API_BASE_URL}/properties`, propertyData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error creating property:', error);
            return {
                success: false,
                data: null,
                error: error.response?.data?.message || error.response?.data?.errors || error.message || 'Failed to create property'
            };
        }
    },

    /**
     * Update a property
     * Matches: PUT /api/properties/{id}
     * @param {number} propertyId - Property ID
     * @param {Object} propertyData - Updated property data
     * @returns {Promise<Object>} - { success: boolean, data: object, error: string }
     */
    async updateProperty(propertyId, propertyData) {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                return {
                    success: false,
                    data: null,
                    error: 'No authentication token found'
                };
            }

            const response = await axios.put(
                `${API_BASE_URL}/properties/${propertyId}`,
                propertyData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );

            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error updating property:', error);
            return {
                success: false,
                data: null,
                error: error.response?.data?.message || error.message || 'Failed to update property'
            };
        }
    },

    /**
     * Delete a property
     * Matches: DELETE /api/properties/{id}
     * @param {number} propertyId - Property ID
     * @returns {Promise<Object>} - { success: boolean, error: string }
     */
    async deleteProperty(propertyId) {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                return {
                    success: false,
                    error: 'No authentication token found'
                };
            }

            await axios.delete(`${API_BASE_URL}/properties/${propertyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            return {
                success: true,
                error: null
            };
        } catch (error) {
            console.error('Error deleting property:', error);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to delete property'
            };
        }
    },
};

export default PropertyService;