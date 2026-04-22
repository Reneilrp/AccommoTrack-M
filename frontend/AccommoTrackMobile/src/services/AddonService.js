import api, { normalizeResponse, normalizeError } from './api.js';

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
            return normalizeResponse(response);
        } catch (error) {
            console.error('Error fetching property addons:', error);
            return normalizeError(error);
        }
    },

    /**
     * Create a new addon for a property (Landlord)
     */
    async createAddon(propertyId, addonData) {
        try {
            const response = await api.post(`/landlord/properties/${propertyId}/addons`, addonData);
            return normalizeResponse(response);
        } catch (error) {
            console.error('Error creating addon:', error);
            return normalizeError(error);
        }
    },

    /**
     * Update an addon (Landlord)
     */
    async updateAddon(propertyId, addonId, addonData) {
        try {
            const response = await api.put(`/landlord/properties/${propertyId}/addons/${addonId}`, addonData);
            return normalizeResponse(response);
        } catch (error) {
            console.error('Error updating addon:', error);
            return normalizeError(error);
        }
    },

    /**
     * Delete an addon (Landlord)
     */
    async deleteAddon(propertyId, addonId) {
        try {
            const response = await api.delete(`/landlord/properties/${propertyId}/addons/${addonId}`);
            return normalizeResponse(response);
        } catch (error) {
            console.error('Error deleting addon:', error);
            return normalizeError(error);
        }
    },

    /**
     * Get pending addon requests for a property (Landlord)
     */
    async getPendingRequests(propertyId) {
        try {
            const response = await api.get(`/landlord/properties/${propertyId}/addons/pending`);
            return normalizeResponse(response);
        } catch (error) {
            console.error('Error fetching pending requests:', error);
            return normalizeError(error);
        }
    },

    /**
     * Get active addons across all bookings for a property (Landlord)
     */
    async getActiveAddons(propertyId) {
        try {
            const response = await api.get(`/landlord/properties/${propertyId}/addons/active`);
            return normalizeResponse(response);
        } catch (error) {
            console.error('Error fetching active addons:', error);
            return normalizeError(error);
        }
    },

    /**
     * Approve or reject an addon request (Landlord)
     */
    async handleAddonRequest(bookingId, addonId, action, note = null, approvedPrice = null) {
        try {
            const payload = {
                action, // 'approve' or 'reject'
                note
            };

            const numericApprovedPrice = Number(approvedPrice);
            if (action === 'approve' && Number.isFinite(numericApprovedPrice) && numericApprovedPrice > 0) {
                payload.approved_price = numericApprovedPrice;
            }

            const response = await api.patch(`/landlord/bookings/${bookingId}/addons/${addonId}`, payload);
            return normalizeResponse(response);
        } catch (error) {
            console.error('Error handling addon request:', error);
            return normalizeError(error);
        }
    }
};

export default AddonService;
