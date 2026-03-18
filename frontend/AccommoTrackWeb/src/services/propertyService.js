import api from '../utils/api';
import { cacheManager } from '../utils/cache';

const CACHE_KEYS = {
    PROPERTIES_PREFIX: 'properties_',
    SINGLE_PROPERTY_PREFIX: 'property_'
};

export const propertyService = {
    // Fetch all properties with optional filters
    async getAllProperties(filters = {}) {
        try {
            // Create a unique cache key based on filters
            const filterKey = JSON.stringify(filters);
            const cacheKey = `${CACHE_KEYS.PROPERTIES_PREFIX}${filterKey}`;
            
            const cachedData = cacheManager.get(cacheKey);
            if (cachedData) return cachedData;

            // Convert filters to query string parameters
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.type) params.append('type', filters.type);
            if (filters.minPrice || filters.price_min) {
                params.append('min_price', filters.minPrice ?? filters.price_min);
            }
            if (filters.maxPrice || filters.price_max) {
                params.append('max_price', filters.maxPrice ?? filters.price_max);
            }
            if (filters.availability) params.append('availability', filters.availability);
            if (filters.min_rating) params.append('min_rating', filters.min_rating);

            if (Array.isArray(filters.amenities) && filters.amenities.length > 0) {
                filters.amenities.forEach((amenity) => {
                    if (amenity) params.append('amenities[]', amenity);
                });
            }

            const queryString = params.toString();
            // Use public route for general browsing if it's for guests/explore
            const url = queryString ? `/public/properties?${queryString}` : '/public/properties';
            
            const response = await api.get(url);
            
            // Cache the result
            cacheManager.set(cacheKey, response.data);
            
            return response.data;
        } catch (error) {
            console.error('Error fetching properties:', error);
            throw error;
        }
    },

    // Fetch a single property by ID
    async getPropertyById(id) {
        try {
            const cacheKey = `${CACHE_KEYS.SINGLE_PROPERTY_PREFIX}${id}`;
            const cachedData = cacheManager.get(cacheKey);
            if (cachedData) return cachedData;

            const response = await api.get(`/public/properties/${id}`);
            
            cacheManager.set(cacheKey, response.data);
            
            return response.data;
        } catch (error) {
            console.error(`Error fetching property ${id}:`, error);
            throw error;
        }
    },

    // Get property types for filtering
    async getPropertyTypes() {
        try {
            return ['Dormitory', 'Apartment', 'Boarding House', 'Bed Spacer'];
        } catch (error) {
            console.error('Error fetching property types:', error);
            return [];
        }
    },

    /**
     * Clear all property related caches
     */
    invalidateAll() {
        Object.keys(localStorage).forEach(key => {
            if (key.includes(`cache_${CACHE_KEYS.PROPERTIES_PREFIX}`) || 
                key.includes(`cache_${CACHE_KEYS.SINGLE_PROPERTY_PREFIX}`)) {
                localStorage.removeItem(key);
            }
        });
    }
};
