import api from '../utils/api';
import { cacheManager } from '../utils/cache';

const CACHE_KEYS = {
    PROFILE: 'tenant_profile'
};

export const tenantService = {
    /**
     * Get current stay details (active booking with room, addons, payments)
     */
    async getCurrentStay() {
        try {
            const response = await api.get('/tenant/current-stay');
            return response.data;
        } catch (error) {
            console.error('Error fetching current stay:', error);
            throw error;
        }
    },

    /**
     * Get booking history (past/completed bookings)
     */
    async getHistory(page = 1) {
        try {
            const response = await api.get(`/tenant/history?page=${page}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching booking history:', error);
            throw error;
        }
    },

    /**
     * Request an addon for current booking
     */
    async requestAddon(addonId, quantity = 1, note = null) {
        try {
            const response = await api.post('/tenant/addons/request', {
                addon_id: addonId,
                quantity,
                note
            });
            return response.data;
        } catch (error) {
            console.error('Error requesting addon:', error);
            throw error;
        }
    },

    /**
     * Cancel a pending addon request
     */
    async cancelAddonRequest(addonId) {
        try {
            const response = await api.delete(`/tenant/addons/${addonId}/cancel`);
            return response.data;
        } catch (error) {
            console.error('Error cancelling addon request:', error);
            throw error;
        }
    },

    /**
     * Get dashboard stats
     */
    async getDashboardStats() {
        try {
            const response = await api.get('/tenant/dashboard/stats');
            return response.data;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    },

    /**
     * Get tenant bookings
     */
    async getBookings() {
        try {
            const response = await api.get('/tenant/bookings');
            return response.data;
        } catch (error) {
            console.error('Error fetching bookings:', error);
            throw error;
        }
    },

    /**
     * Get tenant payments
     */
    async getPayments() {
        try {
            const response = await api.get('/tenant/payments');
            return response.data;
        } catch (error) {
            console.error('Error fetching payments:', error);
            throw error;
        }
    },

    /**
     * Get Tenant Profile
     */
    async getProfile() {
        try {
            // Try cache first
            const cachedProfile = cacheManager.get(CACHE_KEYS.PROFILE);
            if (cachedProfile) return cachedProfile;

            const response = await api.get('/tenant/profile');
            
            // Save to cache (5 mins)
            cacheManager.set(CACHE_KEYS.PROFILE, response.data);
            
            return response.data;
        } catch (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }
    },

    /**
     * Update Tenant Profile
     * @param {FormData} formData 
     */
    async updateProfile(formData) {
        try {
            formData.append('_method', 'PUT'); 
            const response = await api.post('/tenant/profile', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Invalidate cache so next fetch gets fresh data
            cacheManager.invalidate(CACHE_KEYS.PROFILE);

            return response.data;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    },
    
    /**
     * Change Password
     */
    async changePassword(currentPassword, newPassword, newPasswordConfirmation) {
        try {
            const response = await api.post('/tenant/change-password', {
                current_password: currentPassword,
                password: newPassword,
                password_confirmation: newPasswordConfirmation
            });
            return response.data;
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }
};
