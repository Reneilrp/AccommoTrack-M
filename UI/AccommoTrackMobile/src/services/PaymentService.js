import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.20.74.141:8000/api';

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

  /**
   * Create a PayMongo source (redirect/QR) for an invoice
   */
  async createPaymongoSource(invoiceId, method = 'gcash', returnUrl = null) {
    try {
      const token = await this.getAuthToken();
      if (!token) return { success: false, error: 'Authentication required' };

      const payload = { method };
      if (returnUrl) payload.return_url = returnUrl;

      const response = await axios.post(
        `${API_URL}/tenant/invoices/${invoiceId}/paymongo-source`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      // Provide more diagnostic details so mobile UI can display the server response
      console.error('Error creating paymongo source:', error.response?.data || error.message);
      const serverBody = error.response?.data;
      let errMsg = 'Failed to create source';
      if (serverBody) {
        // try to extract useful fields
        errMsg = serverBody.message || serverBody.error || JSON.stringify(serverBody);
      } else if (error.message) {
        errMsg = error.message;
      }
      return { success: false, error: errMsg, raw: serverBody || null };
    }
  }

  /**
   * Create a PayMongo payment (using client-side payment_method_id or source_id)
   */
  async createPaymongoPayment(invoiceId, data = {}) {
    try {
      const token = await this.getAuthToken();
      if (!token) return { success: false, error: 'Authentication required' };

      const response = await axios.post(
        `${API_URL}/tenant/invoices/${invoiceId}/paymongo-pay`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error creating paymongo payment:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to create payment' };
    }
  }

  /**
   * Record an offline payment request (tenant -> landlord) for an invoice
   */
  async createOfflineRecord(invoiceId, data = {}) {
    try {
      const token = await this.getAuthToken();
      if (!token) return { success: false, error: 'Authentication required' };

      const response = await axios.post(
        `${API_URL}/tenant/invoices/${invoiceId}/record-offline`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error recording offline payment:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to record offline payment' };
    }
  }

  /**
   * Ask the backend to query PayMongo for the invoice's gateway reference and update status.
   * Useful when testing locally without a public webhook.
   */
  async refreshInvoice(invoiceId) {
    try {
      const token = await this.getAuthToken();
      if (!token) return { success: false, error: 'Authentication required' };

      const response = await axios.post(
        `${API_URL}/tenant/invoices/${invoiceId}/paymongo-refresh`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error refreshing invoice status:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to refresh invoice status' };
    }
  }
}

export default new PaymentService();

