import api from './api';
import { API_BASE_URL as API_URL } from '../config';

class MaintenanceService {

  /**
   * Get landlord's maintenance requests
   * @param {Object} params - { status: 'pending'|'in_progress'|'completed'|'all' }
   */
  async getLandlordRequests(params = {}) {
    try {
      const response = await api.get(`/landlord/maintenance-requests`, {
        params
      });
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to fetch requests' };
    }
  }

  /**
   * Update maintenance request status
   * @param {number} id - Request ID
   * @param {string} status - New status
   */
  async updateStatus(id, status) {
    try {
      const response = await api.patch(
        `/landlord/maintenance-requests/${id}/status`,
        { status },
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error updating status:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to update status' };
    }
  }

  getStatusColor(status) {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getPriorityColor(priority) {
    switch (priority) {
      case 'high': return 'border-red-200 text-red-700 bg-red-50';
      case 'medium': return 'border-yellow-200 text-yellow-700 bg-yellow-50';
      case 'low': return 'border-blue-200 text-blue-700 bg-blue-50';
      default: return 'border-gray-200 text-gray-700 bg-gray-50';
    }
  }
}

export default new MaintenanceService();
