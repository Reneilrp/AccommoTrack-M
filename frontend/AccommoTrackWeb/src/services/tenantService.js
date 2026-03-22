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
    async requestAddon(payload) {
        try {
            const response = await api.post('/tenant/addons/request', payload);
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
     * Cancel a booking
     */
    async cancelBooking(bookingId, reason = '') {
        try {
            const response = await api.patch(`/tenant/bookings/${bookingId}/cancel`, {
                cancellation_reason: reason
            });
            return response.data;
        } catch (error) {
            console.error('Error cancelling booking:', error);
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
                new_password: newPassword,
                new_password_confirmation: newPasswordConfirmation
            });
            return response.data;
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    },

    /**
     * Get available add-ons for active booking
     */
    async getAvailableAddons() {
        try {
            const response = await api.get('/tenant/addons/available');
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) return { success: false, status: 404 };
            console.error('Error fetching available addons:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get current addon requests (pending/active)
     */
    async getAddonRequests() {
        try {
            const response = await api.get('/tenant/addons/requests');
            return response.data;
        } catch (error) {
            console.error('Error fetching addon requests:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get recent activities for tenant
     */
    async getActivities() {
        try {
            const response = await api.get('/tenant/dashboard/activities');
            return response.data;
        } catch (error) {
            console.error('Error fetching tenant activities:', error);
            return { success: false, activities: [] };
        }
    }
};
