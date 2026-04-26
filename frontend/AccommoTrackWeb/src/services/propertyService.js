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
    async getAllProperties(filters = {}, isAuthenticated = false) {
        try {
            // Create a unique cache key based on filters and auth status
            const filterKey = JSON.stringify({ ...filters, auth: isAuthenticated });
            const cacheKey = `${CACHE_KEYS.PROPERTIES_PREFIX}${filterKey}`;
            
            const cachedData = cacheManager.get(cacheKey);
            if (cachedData) return cachedData;

            // Convert filters to query string parameters
            const queryParams = {
                search: filters.search,
                type: filters.type,
                page: filters.page,
                per_page: filters.per_page,
                min_price: filters.minPrice ?? filters.price_min,
                max_price: filters.maxPrice ?? filters.price_max,
                availability: filters.availability,
                min_rating: filters.min_rating,
                sex_policy: filters.sex_policy
            };

            const params = new URLSearchParams();
            Object.entries(queryParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, value);
                }
            });

            if (Array.isArray(filters.amenities) && filters.amenities.length > 0) {
                filters.amenities.forEach((amenity) => {
                    if (amenity) params.append('amenities[]', amenity);
                });
            }

            const queryString = params.toString();
            
            // Try protected endpoint first if authenticated, else public
            const endpoints = isAuthenticated 
                ? [queryString ? `/properties?${queryString}` : '/properties', queryString ? `/public/properties?${queryString}` : '/public/properties']
                : [queryString ? `/public/properties?${queryString}` : '/public/properties'];

            let result = null;
            let lastError = null;

            for (const endpoint of endpoints) {
                try {
                    const response = await api.get(endpoint);
                    result = response.data;
                    break;
                } catch (error) {
                    lastError = error;
                    // Only fallback on 401/403
                    if (error?.response?.status !== 401 && error?.response?.status !== 403) {
                        throw error;
                    }
                }
            }

            if (!result && lastError) throw lastError;

            // Cache the result (using a shorter TTL for paginated lists)
            cacheManager.set(cacheKey, result, 30);
            return result;
        } catch (error) {
            console.error('Error fetching properties:', error);
            throw error;
        }
    },

    // Fetch a single property by ID
    async getPropertyById(id, isAuthenticated = false) {
        try {
            const cacheKey = `${CACHE_KEYS.SINGLE_PROPERTY_PREFIX}${id}_${isAuthenticated ? 'auth' : 'pub'}`;
            const cachedData = cacheManager.get(cacheKey);
            if (cachedData) return cachedData;

            const endpoints = isAuthenticated
                ? [`/properties/${id}`, `/public/properties/${id}`]
                : [`/public/properties/${id}`];

            let result = null;
            let lastError = null;

            for (const endpoint of endpoints) {
                try {
                    const response = await api.get(endpoint);
                    result = response.data;
                    break;
                } catch (error) {
                    lastError = error;
                    if (error?.response?.status !== 401 && error?.response?.status !== 403) {
                        throw error;
                    }
                }
            }

            if (!result && lastError) throw lastError;
            
            cacheManager.set(cacheKey, result);
            return result;
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
