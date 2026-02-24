import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as API_URL } from '../config';

class CaretakerService {
  async getAuthToken() {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          if (user?.token) return user.token;
        } catch (e) {}
      }
      const token = await AsyncStorage.getItem('token');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Get all caretakers
   */
  async getCaretakers() {
    try {
      const token = await this.getAuthToken();
      if (!token) return { success: false, error: 'Authentication required' };

      const response = await axios.get(`${API_URL}/landlord/caretakers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

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
      const token = await this.getAuthToken();
      if (!token) return { success: false, error: 'Authentication required' };

      const response = await axios.post(`${API_URL}/landlord/caretakers`, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

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
      const token = await this.getAuthToken();
      if (!token) return { success: false, error: 'Authentication required' };

      // Use PATCH if backend supports it for updates, or PUT. Route says PATCH.
      const response = await axios.patch(`${API_URL}/landlord/caretakers/${assignmentId}`, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

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
      const token = await this.getAuthToken();
      if (!token) return { success: false, error: 'Authentication required' };

      const response = await axios.delete(`${API_URL}/landlord/caretakers/${assignmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

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
      const token = await this.getAuthToken();
      if (!token) return { success: false, error: 'Authentication required' };

      const response = await axios.post(`${API_URL}/landlord/caretakers/${assignmentId}/reset-password`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to reset password' };
    }
  }
}

export default new CaretakerService();
