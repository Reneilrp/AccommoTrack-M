import api from '../utils/api';
import { cacheManager } from '../utils/cache';

const CACHE_KEYS = {
    PROPERTIES_PREFIX: 'properties_',
    SINGLE_PROPERTY_PREFIX: 'property_',
    PROPERTY_TYPES: 'property_types'
};

const FALLBACK_PROPERTY_TYPES = [
    { value: 'dormitory', label: 'Dormitory', count: 0 },
    { value: 'apartment', label: 'Apartment', count: 0 },
    { value: 'boardingHouse', label: 'Boarding House', count: 0 },
    { value: 'bedSpacer', label: 'Bed Spacer', count: 0 }
];

const normalizeTypeToken = (value) =>
    String(value || '')
        .toLowerCase()
        .replace(/[\s_-]/g, '');

const formatTypeLabel = (value) => {
    const normalized = normalizeTypeToken(value);
    if (normalized === 'dormitory') return 'Dormitory';
    if (normalized === 'apartment') return 'Apartment';
    if (normalized === 'boardinghouse') return 'Boarding House';
    if (normalized === 'bedspacer') return 'Bed Spacer';

    const spaced = String(value || '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return spaced
        ? spaced.replace(/\b\w/g, (char) => char.toUpperCase())
        : 'Other';
};

const normalizeTypeOption = (item) => {
    if (typeof item === 'string') {
        const value = item.trim();
        if (!value) return null;
        return { value, label: formatTypeLabel(value), count: 0 };
    }

    if (!item || typeof item !== 'object') {
        return null;
    }

    const value = String(item.value ?? item.property_type ?? item.type ?? '').trim();
    if (!value) return null;

    const label = String(item.label ?? '').trim() || formatTypeLabel(value);
    const count = Number(item.count ?? item.total ?? 0);

    return {
        value,
        label,
        count: Number.isFinite(count) ? count : 0
    };
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
            const cached = cacheManager.get(CACHE_KEYS.PROPERTY_TYPES);
            if (Array.isArray(cached) && cached.length > 0) {
                return cached;
            }

            const response = await api.get('/public/property-types');
            const payload = response?.data;
            const rawTypes = Array.isArray(payload)
                ? payload
                : (Array.isArray(payload?.data) ? payload.data : []);

            const normalized = rawTypes
                .map(normalizeTypeOption)
                .filter(Boolean);

            const seen = new Set();
            const unique = normalized.filter((typeOption) => {
                const key = normalizeTypeToken(typeOption.value);
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            const result = unique.length > 0 ? unique : FALLBACK_PROPERTY_TYPES;
            cacheManager.set(CACHE_KEYS.PROPERTY_TYPES, result);

            return result;
        } catch (error) {
            console.error('Error fetching property types:', error);
            return FALLBACK_PROPERTY_TYPES;
        }
    },

    /**
     * Clear all property related caches
     */
    invalidateAll() {
        Object.keys(localStorage).forEach(key => {
            if (key.includes(`cache_${CACHE_KEYS.PROPERTIES_PREFIX}`) || 
                key.includes(`cache_${CACHE_KEYS.SINGLE_PROPERTY_PREFIX}`) ||
                key.includes(`cache_${CACHE_KEYS.PROPERTY_TYPES}`)) {
                localStorage.removeItem(key);
            }
        });
    },

    /**
     * Get eligible workers (caretakers) for a property (Landlord)
     */
    async getPropertyWorkers(propertyId) {
        try {
            const response = await api.get(`/landlord/properties/${propertyId}/workers`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching workers for property ${propertyId}:`, error);
            throw error;
        }
    }
};

export default propertyService;
