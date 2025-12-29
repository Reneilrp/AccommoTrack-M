import api from './api';

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

const LandlordAnalyticsService = {
  async fetchDashboard({ timeRange = 'month', propertyId = 'all' } = {}) {
    try {
      const params = {
        time_range: timeRange,
        ...(propertyId && propertyId !== 'all' ? { property_id: propertyId } : {})
      };

      const response = await api.get('/landlord/analytics/dashboard', { params });

      return {
        success: true,
        data: response.data || null
      };
    } catch (error) {
      console.error('Analytics fetch failed:', error.response?.data || error.message);
      return {
        success: false,
        error: buildErrorMessage(error, 'Unable to load analytics')
      };
    }
  },

  async fetchProperties() {
    try {
      const response = await api.get('/landlord/properties');
      return {
        success: true,
        data: Array.isArray(response.data) ? response.data : []
      };
    } catch (error) {
      console.error('Property list fetch failed:', error.response?.data || error.message);
      return {
        success: false,
        error: buildErrorMessage(error, 'Unable to load properties')
      };
    }
  }
};

export default LandlordAnalyticsService;
