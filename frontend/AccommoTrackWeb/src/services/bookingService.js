import api from '../utils/api';

const bookingService = {

  // =====================
  // Tenant-facing methods
  // =====================

  async createBooking(payload) {
    try {
      const res = await api.post('/bookings', payload);
      return { success: true, data: res.data };
    } catch (_err) {
      console.error('createBooking error:',_err?.response?.data ||_err);
      return { success: false, error:_err?.response?.data?.message ||_err.message };
    }
  },

  async getMyBookings() {
    try {
      const res = await api.get('/tenant/bookings');
      return { success: true, data: res.data };
    } catch (_err) {
      console.error('getMyBookings error:',_err?.response?.data ||_err);
      return { success: false, error:_err?.response?.data?.message ||_err.message };
    }
  },

  async getBookingDetails(bookingId) {
    try {
      const res = await api.get(`/tenant/bookings/${bookingId}`);
      return { success: true, data: res.data };
    } catch (_err) {
      console.error('getBookingDetails error:',_err?.response?.data ||_err);
      return { success: false, error:_err?.response?.data?.message ||_err.message };
    }
  },

  async cancelBooking(bookingId, data = {}) {
    try {
      const res = await api.patch(`/tenant/bookings/${bookingId}/cancel`, data);
      return { success: true, data: res.data };
    } catch (_err) {
      console.error('cancelBooking error:',_err?.response?.data ||_err);
      return { success: false, error:_err?.response?.data?.message ||_err.message };
    }
  },

  async requestMoveOut(bookingId, data = {}) {
    try {
      const res = await api.patch(`/tenant/bookings/${bookingId}/request-move-out`, data);
      return { success: true, data: res.data };
    } catch (_err) {
      console.error('requestMoveOut error:',_err?.response?.data ||_err);
      return { success: false, error:_err?.response?.data?.message ||_err.message };
    }
  },

  // ======================
  // Landlord-facing methods
  // ======================

  /**
   * Fetch all landlord bookings with optional filters
   * GET /bookings
   */
  async getBookings(params = {}) {
    try {
      const res = await api.get('/bookings', { params });
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      const status = _err?.response?.status;
      if (status === 404 || status === 204) {
        return { success: true, data: [] };
      }
      return { success: false, status, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Fetch a single booking by ID
   * GET /bookings/:id
   */
  async getBooking(bookingId) {
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Fetch aggregated booking stats
   * GET /bookings/stats
   */
  async getStats() {
    try {
      const res = await api.get('/bookings/stats');
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Fetch all extension requests
   * GET /landlord/extensions
   */
  async getExtensions() {
    try {
      const res = await api.get('/landlord/extensions');
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Fetch all transfer requests (with optional property filter)
   * GET /landlord/transfers
   */
  async getTransfers(params = {}) {
    try {
      const res = await api.get('/landlord/transfers', { params });
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Approve or reject an extension request
   * PATCH /landlord/extensions/:id/handle
   */
  async handleExtension(id, action, data = {}) {
    try {
      const res = await api.patch(`/landlord/extensions/${id}/handle`, { action, ...data });
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Approve or reject a transfer request
   * PATCH /landlord/transfers/:id/handle
   */
  async handleTransfer(id, action, data = {}) {
    try {
      const res = await api.patch(`/landlord/transfers/${id}/handle`, { action, ...data });
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Get a transfer request's proration details
   * GET /landlord/transfers/:id/proration
   */
  async getTransferProration(id) {
    try {
      const res = await api.get(`/landlord/transfers/${id}/proration`);
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Update the status of a booking
   * PATCH /bookings/:id/status
   */
  async updateStatus(bookingId, status, data = {}) {
    try {
      const res = await api.patch(`/bookings/${bookingId}/status`, { status, ...data });
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Approve a GCash reservation proof-of-payment
   * POST /bookings/:id/approve-reservation
   */
  async approveReservation(bookingId) {
    try {
      const res = await api.post(`/bookings/${bookingId}/approve-reservation`);
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Check-in a tenant for a booking
   * POST /bookings/:id/check-in
   */
  async checkIn(bookingId) {
    try {
      const res = await api.post(`/bookings/${bookingId}/check-in`);
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Record a manual payment against a booking
   * PATCH /bookings/:id/payment
   */
  async recordPayment(bookingId, data) {
    try {
      const res = await api.patch(`/bookings/${bookingId}/payment`, data);
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Finalize checkout for an active booking
   * POST /bookings/:id/finalize-checkout
   */
  async finalizeCheckout(bookingId, data = {}) {
    try {
      const res = await api.post(`/bookings/${bookingId}/finalize-checkout`, data);
      return { success: true, data: res.data?.data || res.data, message: res.data?.message };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Fetch deposit settlement details for a booking
   * GET /bookings/:id/deposit-settlements
   */
  async getDepositSettlements(bookingId) {
    try {
      const res = await api.get(`/bookings/${bookingId}/deposit-settlements`);
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Create a deposit settlement for a booking
   * POST /bookings/:id/deposit-settlement
   */
  async createDepositSettlement(bookingId, data) {
    try {
      const res = await api.post(`/bookings/${bookingId}/deposit-settlement`, data);
      return { success: true, data: res.data?.data || res.data };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  },

  /**
   * Convert an occupant of a proxy booking to a tenant user
   * POST /landlord/bookings/:id/occupants/:occupantId/convert-to-tenant
   */
  async convertOccupantToTenant(bookingId, occupantId, data) {
    try {
      const res = await api.post(`/landlord/bookings/${bookingId}/occupants/${occupantId}/convert-to-tenant`, data);
      return { success: true, data: res.data?.data || res.data, message: res.data?.message };
    } catch (_err) {
      return { success: false, error: _err.response?.data?.message || _err.message };
    }
  }
};

export default bookingService;

