import api from '../utils/api';

const bookingService = {

  async createBooking(payload) {
    try {
      const res = await api.post('/bookings', payload);
      return res.data;
    } catch (err) {
      console.error('createBooking error:', err?.response?.data || err);
      throw err;
    }
  },

  async getMyBookings() {
    try {
      const res = await api.get('/tenant/bookings');
      return res.data;
    } catch (err) {
      console.error('getMyBookings error:', err?.response?.data || err);
      throw err;
    }
  },

  async getBookingDetails(bookingId) {
    try {
      const res = await api.get(`/tenant/bookings/${bookingId}`);
      return res.data;
    } catch (err) {
      console.error('getBookingDetails error:', err?.response?.data || err);
      throw err;
    }
  },

  async cancelBooking(bookingId, data = {}) {
    try {
      const res = await api.patch(`/tenant/bookings/${bookingId}/cancel`, data);
      return res.data;
    } catch (err) {
      console.error('cancelBooking error:', err?.response?.data || err);
      throw err;
    }
  }
};

export default bookingService;
