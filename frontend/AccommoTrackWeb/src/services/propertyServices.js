import api from '../utils/api';

export const propertyService = {
    // Fetch all properties with optional filters
    async getAllProperties(filters = {}) {
        try {
            // Convert filters to query string parameters
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.type) params.append('type', filters.type);
            if (filters.minPrice) params.append('min_price', filters.minPrice);
            if (filters.maxPrice) params.append('max_price', filters.maxPrice);

            const queryString = params.toString();
            const url = queryString ? `/properties?${queryString}` : '/properties';
            
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching properties:', error);
            throw error;
        }
    },

    // Fetch a single property by ID
    async getPropertyById(id) {
        try {
            const response = await api.get(`/properties/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching property ${id}:`, error);
            throw error;
        }
    },

    // Get property types for filtering
    async getPropertyTypes() {
        try {
            // If there's an endpoint for types, use it. Otherwise return static list.
            // const response = await api.get('/property-types');
            // return response.data;
            return ['Dormitory', 'Apartment', 'Boarding House', 'Bed Spacer'];
        } catch (error) {
            console.error('Error fetching property types:', error);
            return [];
        }
    }
};
