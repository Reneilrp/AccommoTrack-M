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
      const response = await api.get('/properties/accessible');
      const payload = response?.data;
      const data = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.data) ? payload.data : []);
      return { success: true, data };
    } catch (error) {
      console.error('Property list fetch failed:', error.response?.data || error.message);
      return { success: false, error: buildErrorMessage(error, 'Unable to load properties') };
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

      const disposition = response?.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
      const filename = match ? match[1].replace(/['"]/g, '') : null;

      return {
        success: true,
        data: response?.data || '',
        filename
      };
    } catch (error) {
      return {
        success: false,
        error: buildErrorMessage(error, 'Unable to export analytics report'),
        status: error?.response?.status || null
      };
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
