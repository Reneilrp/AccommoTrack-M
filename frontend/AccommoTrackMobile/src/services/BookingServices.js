import api from './api';
import { API_BASE_URL as API_URL } from '../config';

class BookingService {

  /**
   * Create a new booking
   * UPDATED: Now sends start_date and end_date instead of total_months
   */
  async createBooking(bookingData) {
    try {
      console.log('Sending booking data:', bookingData);
      const response = await api.post(
        `/bookings`,
        bookingData,
      );
      console.log('Booking response:', response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Booking error full:', error);
      if (error.response) {
        if (error.response.status === 401) {
          return {
            success: false,
            error: 'Authentication failed. Your session may have expired. Please login again.',
            authError: true
          };
        }
        return {
          success: false,
          error: error.response.data.message || 'Failed to create booking',
          details: error.response.data.errors || null,
          status: error.response.status
        };
      } else if (error.request) {
        return {
          success: false,
          error: 'No response from server. Please check your connection.'
        };
      } else {
        return {
          success: false,
          error: error.message || 'An unexpected error occurred'
        };
      }
    }
  }

  async getMyBookings() {
    try {
      const response = await api.get(
        `/tenant/bookings`,
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
      const response = await api.get(
        `/tenant/bookings/${bookingId}`,
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
      const response = await api.patch(
        `/tenant/bookings/${bookingId}/cancel`,
        data,
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error cancelling booking:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to cancel booking' };
    }
  }
}

export default new BookingService();