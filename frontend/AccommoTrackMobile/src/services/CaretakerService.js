import api from './api';
import { API_BASE_URL as API_URL } from '../config';

class CaretakerService {

  /**
   * Get all caretakers
   */
  async getCaretakers() {
    try {
      const response = await api.get(`/landlord/caretakers`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching caretakers:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to fetch caretakers' };
    }
  }

  /**
   * Create a new caretaker
   */
  async createCaretaker(data) {
    try {
      const response = await api.post(`/landlord/caretakers`, data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error creating caretaker:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to create caretaker' };
    }
  }

  /**
   * Update caretaker permissions/properties
   */
  async updateCaretaker(assignmentId, data) {
    try {
      const response = await api.patch(`/landlord/caretakers/${assignmentId}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error updating caretaker:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to update caretaker' };
    }
  }

  /**
   * Revoke/Delete caretaker
   */
  async deleteCaretaker(assignmentId) {
    try {
      const response = await api.delete(`/landlord/caretakers/${assignmentId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error deleting caretaker:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to delete caretaker' };
    }
  }

  /**
   * Reset caretaker password
   */
  async resetPassword(assignmentId) {
    try {
      const response = await api.post(`/landlord/caretakers/${assignmentId}/reset-password`, {});
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to reset password' };
    }
  }
}

export default new CaretakerService();
