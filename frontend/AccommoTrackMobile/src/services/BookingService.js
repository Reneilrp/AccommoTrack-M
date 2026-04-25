import api, { normalizeResponse, normalizeError } from './api.js';

class BookingService {

  async searchGuests(query) {
    try {
      const response = await api.get('/landlord/tenants', {
        params: { search: query },
      });
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error searching guests:', error);
      return normalizeError(error);
    }
  }

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
        {}
      );
      console.log('Booking response:', response.data);
      return normalizeResponse(response);
    } catch (error) {
      console.error('Booking error full:', error);
      return normalizeError(error);
    }
  }

  async getMyBookings() {
    try {
      const response = await api.get(
        `/tenant/bookings`,
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return normalizeError(error);
    }
  }

  async getBookingDetails(bookingId) {
    try {
      const response = await api.get(
        `/tenant/bookings/${bookingId}`,
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      return normalizeError(error);
    }
  }

  async cancelBooking(bookingId, data = {}) {
    try {
      const response = await api.patch(
        `/tenant/bookings/${bookingId}/cancel`,
        data,
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error cancelling booking:', error.response?.data || error.message);
      return normalizeError(error);
    }
  }

  async rescheduleBooking(bookingId, start_date) {
    try {
      const response = await api.patch(
        `/tenant/bookings/${bookingId}/reschedule`,
        { start_date }
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error rescheduling booking:', error.response?.data || error.message);
      return normalizeError(error);
    }
  }

  async requestMoveOut(bookingId, data = {}) {
    try {
      const response = await api.patch(
        `/tenant/bookings/${bookingId}/request-move-out`,
        data,
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error requesting move-out:', error.response?.data || error.message);
      return normalizeError(error);
    }
  }

  async convertOccupantToTenant(bookingId, occupantId, data) {
    try {
      const response = await api.post(
        `/bookings/${bookingId}/occupants/${occupantId}/convert-to-tenant`,
        data
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error converting occupant to tenant:', error.response?.data || error.message);
      return normalizeError(error);
    }
  }

  /**
   * LANDLORD: Handle stay extension request (approve/reject/modify)
   */
  async handleExtension(id, action, data = {}) {
    try {
      const response = await api.post(`/landlord/extensions/${id}`, { action, ...data });
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error handling extension request:', error);
      return normalizeError(error);
    }
  }

  /**
   * LANDLORD: Finalize checkout and settle security deposit
   */
  async finalizeCheckout(bookingId, data) {
    try {
      const response = await api.post(`/bookings/${bookingId}/finalize-checkout`, data);
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error finalizing checkout:', error);
      return normalizeError(error);
    }
  }

  /**
   * LANDLORD: Approve a tenant's reservation
   */
  async approveReservation(bookingId) {
    try {
      const response = await api.post(`/bookings/${bookingId}/approve-reservation`);
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error approving reservation:', error);
      return normalizeError(error);
    }
  }

  /**
   * LANDLORD: Check in a tenant and generate first invoice
   */
  async checkIn(bookingId) {
    try {
      const response = await api.post(`/bookings/${bookingId}/check-in`);
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error checking in tenant:', error);
      return normalizeError(error);
    }
  }
}

export default new BookingService();