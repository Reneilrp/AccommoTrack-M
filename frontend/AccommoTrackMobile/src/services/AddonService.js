import api from './api';

/**
 * Addon Service for handling all addon-related API calls
 */
const AddonService = {
    /**
     * Get all addons for a property (Landlord)
     */
    async getPropertyAddons(propertyId) {
        try {
            const response = await api.get(`/landlord/properties/${propertyId}/addons`);
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error fetching property addons:', error);
            return {
                success: false,
                data: null,
                error: error.response?.data?.message || error.message || 'Failed to fetch addons'
            };
        }
    },

    /**
     * Create a new addon for a property (Landlord)
     */
    async createAddon(propertyId, addonData) {
        try {
            const response = await api.post(`/landlord/properties/${propertyId}/addons`, addonData);
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error creating addon:', error);
            return {
                success: false,
                data: null,
                error: error.response?.data?.message || error.message || 'Failed to create addon'
            };
        }
    },

    /**
     * Update an addon (Landlord)
     */
    async updateAddon(propertyId, addonId, addonData) {
        try {
            const response = await api.put(`/landlord/properties/${propertyId}/addons/${addonId}`, addonData);
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error updating addon:', error);
            return {
                success: false,
                data: null,
                error: error.response?.data?.message || error.message || 'Failed to update addon'
            };
        }
    },

    /**
     * Delete an addon (Landlord)
     */
    async deleteAddon(propertyId, addonId) {
        try {
            const response = await api.delete(`/landlord/properties/${propertyId}/addons/${addonId}`);
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error deleting addon:', error);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to delete addon'
            };
        }
    },

    /**
     * Get pending addon requests for a property (Landlord)
     */
    async getPendingRequests(propertyId) {
        try {
            const response = await api.get(`/landlord/properties/${propertyId}/addons/pending`);
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error fetching pending requests:', error);
            return {
                success: false,
                data: null,
                error: error.response?.data?.message || error.message || 'Failed to fetch pending requests'
            };
        }
    },

    /**
     * Get active addons across all bookings for a property (Landlord)
     */
    async getActiveAddons(propertyId) {
        try {
            const response = await api.get(`/landlord/properties/${propertyId}/addons/active`);
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error fetching active addons:', error);
            return {
                success: false,
                data: null,
                error: error.response?.data?.message || error.message || 'Failed to fetch active addons'
            };
        }
    },

    /**
     * Approve or reject an addon request (Landlord)
     */
    async handleAddonRequest(bookingId, addonId, action, note = null) {
        try {
            const response = await api.patch(`/landlord/bookings/${bookingId}/addons/${addonId}`, {
                action, // 'approve' or 'reject'
                note
            });
            return {
                success: true,
                data: response.data,
                error: null
            };
        } catch (error) {
            console.error('Error handling addon request:', error);
            return {
                success: false,
                error: error.response?.data?.message || error.message || `Failed to ${action} request`
            };
        }
    }
};

export default AddonService;
