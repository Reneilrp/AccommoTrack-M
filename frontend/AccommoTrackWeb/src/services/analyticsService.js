import api from '../utils/api';

/**
 * Analytics Service
 * 
 * Provides methods to fetch analytics data from the backend.
 * All functions accept an optional `params` object which can contain:
 * - `property_id` (number): Filter analytics for a specific property.
 * - `time_range` (string): 'week', 'month', 'year'. Defaults to 'month'.
 */
export const analyticsService = {

    /**
     * Get comprehensive dashboard analytics data
     * @param {object} params - Optional params like { property_id, time_range }
     */
    async getDashboardAnalytics(params = {}) {
        try {
            const response = await api.get('/landlord/analytics/dashboard', { params });
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Failed to fetch dashboard analytics' };
        }
    },

    /**
     * Get Overview Statistics
     * @param {object} params - Optional params like { property_id }
     */
    async getOverviewStats(params = {}) {
        try {
            const response = await api.get('/landlord/analytics/overview', { params });
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Failed to fetch overview stats' };
        }
    },

    /**
     * Get Revenue Analytics
     * @param {object} params - Optional params like { property_id, time_range }
     */
    async getRevenueAnalytics(params = {}) {
        try {
            const response = await api.get('/landlord/analytics/revenue', { params });
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Failed to fetch revenue analytics' };
        }
    },

    /**
     * Get Occupancy Analytics
     * @param {object} params - Optional params like { property_id }
     */
    async getOccupancyAnalytics(params = {}) {
        try {
            const response = await api.get('/landlord/analytics/occupancy', { params });
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Failed to fetch occupancy analytics' };
        }
    },

    /**
     * Get Room Type Analytics
     * @param {object} params - Optional params like { property_id }
     */
    async getRoomTypeAnalytics(params = {}) {
        try {
            const response = await api.get('/landlord/analytics/room-types', { params });
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Failed to fetch room type analytics' };
        }
    },

    /**
     * Get Property Comparison
     * @param {object} params - Optional params like { property_id }
     */
    async getPropertyComparison(params = {}) {
        try {
            const response = await api.get('/landlord/analytics/properties', { params });
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Failed to fetch property comparison' };
        }
    },

    /**
     * Get Tenant Analytics
     * @param {object} params - Optional params like { property_id, time_range }
     */
    async getTenantAnalytics(params = {}) {
        try {
            const response = await api.get('/landlord/analytics/tenants', { params });
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Failed to fetch tenant analytics' };
        }
    },

    /**
     * Get Payment Analytics
     * @param {object} params - Optional params like { property_id }
     */
    async getPaymentAnalytics(params = {}) {
        try {
            const response = await api.get('/landlord/analytics/payments', { params });
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Failed to fetch payment analytics' };
        }
    },

    /**
     * Get Booking Analytics
     * @param {object} params - Optional params like { property_id, time_range }
     */
    async getBookingAnalytics(params = {}) {
        try {
            const response = await api.get('/landlord/analytics/bookings', { params });
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Failed to fetch booking analytics' };
        }
    }
};

export default analyticsService;
