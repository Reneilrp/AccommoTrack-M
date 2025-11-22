import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.43.84:8000/api';

class BookingService {
  async getAuthToken() {
    try {
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
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required. Please login again.'
        };
      }

      console.log('Sending booking data:', bookingData);

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
      console.error('Booking error:', error.response?.data || error.message);
      
      if (error.response) {
        // Server responded with error
        return {
          success: false,
          error: error.response.data.message || 'Failed to create booking',
          details: error.response.data.errors || null
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
}

export default new BookingService();