import api from './api';
import { API_BASE_URL as API_URL } from '../config';

class PaymentService {

  /**
   * Get all payments for the authenticated tenant
   */
  async getMyPayments(status = 'all') {
    try {
      const url = status !== 'all' 
        ? `/tenant/payments?status=${status}`
        : `/tenant/payments`;

      const response = await api.get(url);

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
      const response = await api.get(
        `/tenant/payments/stats`,
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
      const response = await api.get(
        `/tenant/payments/${paymentId}`,
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
      const payload = { method };
      if (returnUrl) payload.return_url = returnUrl;

      const response = await api.post(
        `/tenant/invoices/${invoiceId}/paymongo-source`,
        payload,
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
      const response = await api.post(
        `/tenant/invoices/${invoiceId}/paymongo-pay`,
        data,
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
      const response = await api.post(
        `/tenant/invoices/${invoiceId}/record-offline`,
        data,
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error recording offline payment:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to record offline payment' };
    }
  }

  /**
   * LANDLORD: Get all invoices
   */
  async getInvoices() {
    try {
      const response = await api.get(`/invoices`);

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to fetch invoices' };
    }
  }

  /**
   * LANDLORD: Get invoices for a specific tenant
   */
  async getInvoicesByTenant(tenantId) {
    try {
      const response = await api.get(`/invoices?tenant_id=${tenantId}`);

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching tenant invoices:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to fetch tenant invoices' };
    }
  }

  /**
   * LANDLORD: Update booking payment status
   */
  async updateBookingPayment(bookingId, payload) {
    try {
      const response = await api.patch(`/bookings/${bookingId}/payment`, payload);

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error updating booking payment:', error);
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to update payment' };
    }
  }

  /**
   * Ask the backend to query PayMongo for the invoice's gateway reference and update status.
   * Useful when testing locally without a public webhook.
   */
  async refreshInvoice(invoiceId) {
    try {
      const response = await api.post(
        `/tenant/invoices/${invoiceId}/paymongo-refresh`,
        {},
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error refreshing invoice status:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to refresh invoice status' };
    }
  }
}

export default new PaymentService();

