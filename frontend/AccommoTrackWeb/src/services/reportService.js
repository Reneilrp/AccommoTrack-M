import api from '../utils/api';

export const reportService = {
  /**
   * Submit a report
   * @param {Object} payload { property_id, reason, description }
   */
  async submitReport(payload) {
    return api.post('/reports', payload);
  },

  /**
   * Get all reports (Admin)
   */
  async getReports(params) {
    return api.get('/admin/reports', { params });
  },

  /**
   * Update report status (Admin)
   */
  async updateStatus(id, status, notes) {
    return api.patch(`/admin/reports/${id}`, { status, admin_notes: notes });
  }
};
