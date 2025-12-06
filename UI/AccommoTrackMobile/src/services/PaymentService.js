import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.254.106:8000/api';

class PaymentService {
  async getAuthToken() {
    try {
      // Check both possible token keys for compatibility
      let token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        token = await AsyncStorage.getItem('token');
      }
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Get all payments for the authenticated tenant
   */
  async getMyPayments(status = 'all') {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const url = status !== 'all' 
        ? `${API_URL}/tenant/payments?status=${status}`
        : `${API_URL}/tenant/payments`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching payments:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch payments'
      };
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats() {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const response = await axios.get(
        `${API_URL}/tenant/payments/stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch payment stats'
      };
    }
  }

  /**
   * Get single payment details
   */
  async getPaymentDetails(paymentId) {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const response = await axios.get(
        `${API_URL}/tenant/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching payment details:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch payment details'
      };
    }
  }
}

export default new PaymentService();

