import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as API_URL } from '../config';

class TenantService {
  async getAuthToken() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Get current stay details (active booking with room, property, landlord info)
   */
  async getCurrentStay() {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const response = await axios.get(
        `${API_URL}/tenant/current-stay`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error fetching current stay:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch current stay',
        data: null
      };
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const response = await axios.get(
        `${API_URL}/tenant/dashboard/stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch dashboard stats',
        data: {
          payments: {
            monthlyDue: 0,
            totalPaid: 0,
            nextDueDate: null
          }
        }
      };
    }
  }

  /**
   * Get booking history (past/completed bookings)
   */
  async getHistory(page = 1) {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const response = await axios.get(
        `${API_URL}/tenant/history?page=${page}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error fetching booking history:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch booking history'
      };
    }
  }

  /**
   * Request an addon for current booking
   */
  async requestAddon(addonId, quantity = 1, note = null) {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const response = await axios.post(
        `${API_URL}/tenant/addons/request`,
        {
          addon_id: addonId,
          quantity,
          note
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error requesting addon:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to request addon'
      };
    }
  }

  /**
   * Cancel a pending addon request
   */
  async cancelAddonRequest(addonId) {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const response = await axios.delete(
        `${API_URL}/tenant/addons/request/${addonId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error canceling addon request:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to cancel addon request'
      };
    }
  }

  /**
   * Get list of available addons for current property
   */
  async getAvailableAddons() {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const response = await axios.get(
        `${API_URL}/tenant/addons/available`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error fetching available addons:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch available addons'
      };
    }
  }

  /**
   * Get current booking's addon requests
   */
  async getAddonRequests() {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const response = await axios.get(
        `${API_URL}/tenant/addons/requests`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error fetching addon requests:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch addon requests'
      };
    }
  }
}

export default new TenantService();
