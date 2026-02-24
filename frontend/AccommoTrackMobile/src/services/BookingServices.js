import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as API_URL } from '../config';

class BookingService {
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
   * Create a new booking
   * UPDATED: Now sends start_date and end_date instead of total_months
   */
  async createBooking(bookingData) {
    try {
      const token = await this.getAuthToken();
      
      console.log('Token retrieved:', token ? 'Token exists' : 'No token found');
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required. Please login again.'
        };
      }

      console.log('Sending booking data:', bookingData);
      console.log('API URL:', `${API_URL}/bookings`);
      console.log('Auth header:', `Bearer ${token.substring(0, 20)}...`);

      const response = await axios.post(
        `${API_URL}/bookings`,
        bookingData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      console.log('Booking response:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Booking error full:', error);
      console.error('Booking error response:', error.response?.data);
      console.error('Booking error status:', error.response?.status);
      
      if (error.response) {
        // Check for authentication errors
        if (error.response.status === 401) {
          return {
            success: false,
            error: 'Authentication failed. Your session may have expired. Please login again.',
            authError: true
          };
        }

        // Server responded with error
        return {
          success: false,
          error: error.response.data.message || 'Failed to create booking',
          details: error.response.data.errors || null,
          status: error.response.status
        };
      } else if (error.request) {
        // Request made but no response
        return {
          success: false,
          error: 'No response from server. Please check your connection.'
        };
      } else {
        // Something else happened
        return {
          success: false,
          error: error.message || 'An unexpected error occurred'
        };
      }
    }
  }

  async getMyBookings() {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const response = await axios.get(
        `${API_URL}/tenant/bookings`,
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
      console.error('Error fetching bookings:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch bookings'
      };
    }
  }

  async getBookingDetails(bookingId) {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const response = await axios.get(
        `${API_URL}/tenant/bookings/${bookingId}`,
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
      console.error('Error fetching booking details:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch booking details'
      };
    }
  }

  async cancelBooking(bookingId, data = {}) {
    try {
      const token = await this.getAuthToken();
      if (!token) return { success: false, error: 'Authentication required' };

      const response = await axios.patch(
        `${API_URL}/tenant/bookings/${bookingId}/cancel`,
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
      console.error('Error cancelling booking:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to cancel booking' };
    }
  }
}

export default new BookingService();