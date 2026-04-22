import api from '../utils/api';

export const reportService = {
  /**
   * Submit a report
   * @param {Object} payload { property_id, reason, description }
   */
  async submitReport(payload) {
    try {
      const res = await api.post('/reports', payload);
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Get all reports (Admin)
   */
  async getReports(params = {}) {
    try {
      const res = await api.get('/admin/reports', { params });
      return { 
        success: true, 
        data: this.normalizePaginatedResponse(res.data) 
      };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Update report status (Admin)
   */
  async updateStatus(id, status, notes, issueStrike = false) {
    try {
      const res = await api.patch(`/admin/reports/${id}`, { status, admin_notes: notes, issue_strike: issueStrike });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Helper to normalize Laravel paginated and non-paginated responses
   */
  normalizePaginatedResponse(payload) {
    if (payload && payload.data && Array.isArray(payload.data)) {
      return {
        items: payload.data,
        pagination: {
          currentPage: payload.current_page,
          lastPage: payload.last_page,
          perPage: payload.per_page,
          total: payload.total,
          hasMorePages: payload.current_page < payload.last_page
        }
      };
    }
    return {
      items: Array.isArray(payload) ? payload : (payload?.data || []),
      pagination: null
    };
  },
};
