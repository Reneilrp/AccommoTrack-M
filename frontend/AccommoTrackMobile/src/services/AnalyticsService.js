import api from './api.js';

const buildErrorMessage = (error, fallbackMessage) => {
  if (error?.response?.data) {
    return (
      error.response.data.message ||
      error.response.data.error ||
      (typeof error.response.data === 'string' ? error.response.data : null) ||
      fallbackMessage
    );
  }
  return error?.message || fallbackMessage;
};

const analyticsService = {
  /**
   * Get comprehensive dashboard analytics data
   * @param {object} params - Optional params like { time_range, property_id }
   */
  async getDashboardAnalytics({ timeRange = 'month', propertyId = 'all' } = {}) {
    try {
      const params = {
        time_range: timeRange,
        ...(propertyId && propertyId !== 'all' ? { property_id: propertyId } : {})
      };
      const response = await api.get('/landlord/analytics/dashboard', { params });
      return { success: true, data: response.data || null };
    } catch (error) {
      console.error('Analytics dashboard fetch failed:', error.response?.data || error.message);
      return { success: false, error: buildErrorMessage(error, 'Unable to load dashboard analytics') };
    }
  },

  /**
   * Get a list of landlord's properties for filtering
   */
  async getProperties() {
    try {
      const response = await api.get('/landlord/properties');
      return { success: true, data: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      console.error('Property list fetch failed:', error.response?.data || error.message);
      return { success: false, error: buildErrorMessage(error, 'Unable to load properties') };
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
        return { success: false, error: buildErrorMessage(error, 'Failed to fetch overview stats') };
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
          return { success: false, error: buildErrorMessage(error, 'Failed to fetch revenue analytics') };
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
          return { success: false, error: buildErrorMessage(error, 'Failed to fetch occupancy analytics') };
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
          return { success: false, error: buildErrorMessage(error, 'Failed to fetch room type analytics') };
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
          return { success: false, error: buildErrorMessage(error, 'Failed to fetch property comparison') };
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
          return { success: false, error: buildErrorMessage(error, 'Failed to fetch tenant analytics') };
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
          return { success: false, error: buildErrorMessage(error, 'Failed to fetch payment analytics') };
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
          return { success: false, error: buildErrorMessage(error, 'Failed to fetch booking analytics') };
      }
  }
};

export default analyticsService;
