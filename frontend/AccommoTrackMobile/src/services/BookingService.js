import api from './api.js';

class BookingService {

  async searchGuests(query) {
    try {
      const response = await api.get('/users/search', {
        params: { query },
      });
      return {
        success: true,
        data: response.data?.users || [],
      };
    } catch (error) {
      console.error('Error searching guests:', error);
      return {
        success: false,
        data: [],
        error: error.response?.data?.message || 'Failed to search guests',
      };
    }
  }

  /**
   * Create a new booking
   * UPDATED: Now sends start_date and end_date instead of total_months
   */
  async createBooking(bookingData) {
    try {
      console.log('Sending booking data:', bookingData);
      const isFormData = bookingData instanceof FormData;
      const response = await api.post(
        `/bookings`,
        bookingData,
        {
          headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
        }
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
          error: error.response.data.error || error.response.data.message || 'Failed to create booking',
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

  async requestMoveOut(bookingId, data = {}) {
    try {
      const response = await api.patch(
        `/tenant/bookings/${bookingId}/request-move-out`,
        data,
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error requesting move-out:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to request move-out' };
    }
  }

  async convertOccupantToTenant(bookingId, occupantId, data) {
    try {
      const response = await api.post(
        `/landlord/bookings/${bookingId}/occupants/${occupantId}/convert-to-tenant`,
        data
      );
      return { success: true, data: response.data?.data || response.data, message: response.data?.message };
    } catch (error) {
      console.error('Error converting occupant to tenant:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to convert occupant to tenant' };
    }
  }

  /**
   * LANDLORD: Approve a tenant's reservation
   */
  async approveReservation(bookingId) {
    try {
      const response = await api.post(`/bookings/${bookingId}/approve-reservation`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error('Error approving reservation:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to approve reservation',
      };
    }
  }

  /**
   * LANDLORD: Check in a tenant and generate first invoice
   */
  async checkIn(bookingId) {
    try {
      const response = await api.post(`/bookings/${bookingId}/check-in`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error('Error checking in tenant:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to check in tenant',
      };
    }
  }
}

export default new BookingService();