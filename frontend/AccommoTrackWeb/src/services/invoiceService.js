import api from '../utils/api';

/**
 * Invoice and transaction management operations.
 * Centralizes all invoice/payment verification calls previously scattered across Payments.jsx.
 */
export const invoiceService = {

  /**
   * Fetch all invoices with optional filters
   * GET /invoices
   */
  async getInvoices(params = {}) {
    try {
      const res = await api.get('/invoices', { params });
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Get a single invoice
   * GET /invoices/:id
   */
  async getInvoice(invoiceId) {
    try {
      const res = await api.get(`/invoices/${invoiceId}`);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Fetch summarized invoice totals/counts for landlord dashboard cards
   * GET /invoices/summary
   */
  async getSummary(params = {}) {
    try {
      const res = await api.get('/invoices/summary', { params });
      const payload = res.data;

      if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'success')) {
        return {
          success: Boolean(payload.success),
          data: payload.data ?? null,
          message: payload.message || '',
          error: payload.success ? null : (payload.message || 'Failed to fetch invoice summary'),
        };
      }

      return { success: true, data: payload?.data || payload, message: '' };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Record a cash payment against an invoice
   * POST /invoices/:id/record
   */
  async recordPayment(invoiceId, data) {
    try {
      const res = await api.post(`/invoices/${invoiceId}/record`, data);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Verify (approve or reject) a GCash/cash payment
   * POST /invoices/:id/verify-cash
   */
  async verifyCash(invoiceId, payloadOrAction) {
    try {
      const payload = typeof payloadOrAction === 'string'
        ? { action: payloadOrAction }
        : payloadOrAction;

      const res = await api.post(`/invoices/${invoiceId}/verify-cash`, payload);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Issue a refund for a transaction
   * POST /transactions/:id/refund
   */
  async refundTransaction(transactionId, data = {}) {
    try {
      const res = await api.post(`/transactions/${transactionId}/refund`, data);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Issue a merged refund for an entire invoice
   * POST /invoices/:id/refund
   */
  async refundInvoice(invoiceId, data = {}) {
    try {
      const res = await api.post(`/invoices/${invoiceId}/refund`, data);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },
};

export default invoiceService;
