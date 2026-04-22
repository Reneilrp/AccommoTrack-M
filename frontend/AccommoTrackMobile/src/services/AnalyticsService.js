import api, { normalizeResponse, normalizeError } from './api.js';

const analyticsService = {
  /**
   * Get comprehensive dashboard analytics data
   * @param {object} params - Optional params like { timeRange, propertyId, _t }
   */
  async getDashboardAnalytics({ timeRange = 'month', propertyId = 'all', ...extra } = {}) {
    try {
      const params = {
        time_range: timeRange,
        ...(propertyId && propertyId !== 'all' ? { property_id: propertyId } : {}),
        ...extra
      };
      const response = await api.get('/landlord/analytics/dashboard', { params });
      return normalizeResponse(response);
    } catch (error) {
      console.error('Analytics dashboard fetch failed:', error.response?.data || error.message);
      return normalizeError(error);
    }
  },

  /**
   * Get a list of landlord's properties for filtering
   */
  async getProperties() {
    try {
      const response = await api.get('/properties/accessible');
      return normalizeResponse(response);
    } catch (error) {
      console.error('Property list fetch failed:', error.response?.data || error.message);
      return normalizeError(error);
    }
  },

  /**
   * Export analytics report as CSV from backend
   * @param {object} params - Optional params like { time_range, property_id }
   */
  async exportAnalyticsCsv(params = {}) {
    try {
      const response = await api.get('/landlord/analytics/export-csv', {
        params,
        responseType: 'text'
      });

      const normalized = normalizeResponse(response);

      const disposition = response?.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
      const filename = match ? match[1].replace(/['"]/g, '') : null;

      return {
        ...normalized,
        filename
      };
    } catch (error) {
      return normalizeError(error);
    }
  },

  /**
   * Get Overview Statistics
   * @param {object} params - Optional params like { property_id }
   */
  async getOverviewStats(params = {}) {
    try {
        const response = await api.get('/landlord/analytics/overview', { params });
        return normalizeResponse(response);
    } catch (error) {
        return normalizeError(error);
    }
  },

  /**
   * Get Revenue Analytics
   * @param {object} params - Optional params like { property_id, time_range }
   */
  async getRevenueAnalytics(params = {}) {
      try {
          const response = await api.get('/landlord/analytics/revenue', { params });
          return normalizeResponse(response);
      } catch (error) {
          return normalizeError(error);
      }
  },

  /**
   * Get Occupancy Analytics
   * @param {object} params - Optional params like { property_id }
   */
  async getOccupancyAnalytics(params = {}) {
      try {
          const response = await api.get('/landlord/analytics/occupancy', { params });
          return normalizeResponse(response);
      } catch (error) {
          return normalizeError(error);
      }
  },

  /**
   * Get Room Type Analytics
   * @param {object} params - Optional params like { property_id }
   */
  async getRoomTypeAnalytics(params = {}) {
      try {
          const response = await api.get('/landlord/analytics/room-types', { params });
          return normalizeResponse(response);
      } catch (error) {
          return normalizeError(error);
      }
  },

  /**
   * Get Property Comparison
   * @param {object} params - Optional params like { property_id }
   */
  async getPropertyComparison(params = {}) {
      try {
          const response = await api.get('/landlord/analytics/properties', { params });
          return normalizeResponse(response);
      } catch (error) {
          return normalizeError(error);
      }
  },

  /**
   * Get Tenant Analytics
   * @param {object} params - Optional params like { property_id, time_range }
   */
  async getTenantAnalytics(params = {}) {
      try {
          const response = await api.get('/landlord/analytics/tenants', { params });
          return normalizeResponse(response);
      } catch (error) {
          return normalizeError(error);
      }
  },

  /**
   * Get Payment Analytics
   * @param {object} params - Optional params like { property_id }
   */
  async getPaymentAnalytics(params = {}) {
      try {
          const response = await api.get('/landlord/analytics/payments', { params });
          return normalizeResponse(response);
      } catch (error) {
          return normalizeError(error);
      }
  },

  /**
   * Get Booking Analytics
   * @param {object} params - Optional params like { property_id, time_range }
   */
  async getBookingAnalytics(params = {}) {
      try {
          const response = await api.get('/landlord/analytics/bookings', { params });
          return normalizeResponse(response);
      } catch (error) {
          return normalizeError(error);
      }
  }
};

export default analyticsService;
