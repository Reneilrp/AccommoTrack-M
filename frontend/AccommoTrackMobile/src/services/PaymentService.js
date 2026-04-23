import api, { normalizeResponse, normalizeError, normalizePaginatedResponse } from "./api.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Decimal from "../utils/decimal.js";

const normalizeAmount = (value) => {
  if (value === null || value === undefined) return 0;
  try {
    // If the value is a large integer, it's likely cents. 
    // We use Decimal for precision and consistency across the platform.
    return new Decimal(value).div(100).toNumber();
  } catch (err) {
    console.error('[PaymentService] Amount normalization error:', err);
    return 0;
  }
};

const toNonEmptyString = (value) => {
  if (value === null || value === undefined) return "";
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : "";
};

const resolveInvoiceRoomNumber = (invoice) => {
  const roomNumber =
    invoice?.booking?.room?.room_number ??
    invoice?.booking?.room?.roomNumber ??
    invoice?.booking?.room_number ??
    invoice?.room?.room_number ??
    invoice?.room_number ??
    invoice?.roomNumber ??
    invoice?.metadata?.room_number ??
    invoice?.metadata?.roomNumber;

  return toNonEmptyString(roomNumber);
};

const normalizeInvoiceItem = (invoice) => {
  if (!invoice || typeof invoice !== "object") {
    return invoice;
  }

  const resolvedRoomNumber = resolveInvoiceRoomNumber(invoice);

  return {
    ...invoice,
    room_number: resolvedRoomNumber || invoice.room_number || "",
    roomNumber: resolvedRoomNumber || invoice.roomNumber || "",
    amount: normalizeAmount(invoice.amount),
    remainingBalance: normalizeAmount(invoice.remainingBalance),
    booking: invoice.booking
      ? {
          ...invoice.booking,
          room_number:
            toNonEmptyString(invoice.booking.room_number) || resolvedRoomNumber,
          room: invoice.booking.room
            ? {
                ...invoice.booking.room,
                room_number:
                  toNonEmptyString(invoice.booking.room.room_number) ||
                  resolvedRoomNumber,
                roomNumber:
                  toNonEmptyString(invoice.booking.room.roomNumber) ||
                  resolvedRoomNumber,
              }
            : invoice.booking.room,
        }
      : invoice.booking,
    transactions: Array.isArray(invoice.transactions) 
      ? invoice.transactions.map(tx => ({
          ...tx,
          amount: normalizeAmount(tx.amount_cents || tx.amount)
        }))
      : invoice.transactions,
  };
};

class PaymentService {
  /**
   * Get all payments for the authenticated tenant
   */
  async getPayments(options = {}) {
    try {
      const { status = 'all', archiveFilter = null, page = 1 } = options;
      const params = { page };
      if (status && status !== 'all') params.status = status;
      if (archiveFilter) params.archive_filter = archiveFilter;

      const response = await api.get('/tenant/payments', { params });
      const normalized = normalizePaginatedResponse(response);
      
      if (normalized.items && Array.isArray(normalized.items)) {
        normalized.items = normalized.items.map(normalizeInvoiceItem);
      }

      return {
        success: true,
        data: normalized,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching payments:', error);
      return normalizeError(error);
    }
  }

  /**
   * Get payment statistics
   */
  async getStats() {
    try {
      const response = await api.get(`/tenant/payments/stats`);
      const res = normalizeResponse(response);
      
      if (res.success && res.data) {
        res.data = {
          ...res.data,
          totalPaidThisMonth: normalizeAmount(res.data.totalPaidThisMonth),
          pendingAmount: normalizeAmount(res.data.pendingAmount),
          totalCredits: normalizeAmount(res.data.totalCredits),
        };
      }
      
      return res;
    } catch (error) {
      console.error("Error fetching payment stats:", error);
      return normalizeError(error);
    }
  }

  /**
   * Get single payment details
   */
  async getPaymentDetails(paymentId) {
    try {
      const response = await api.get(`/tenant/payments/${paymentId}`);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error fetching payment details:", error);
      return normalizeError(error);
    }
  }

  /**
   * Ensure an invoice exists for a booking and return it.
   * Matches: POST /api/tenant/bookings/{id}/invoice
   */
  async createBookingInvoice(bookingId, options = {}) {
    try {
      const payload =
        options && typeof options === "object" && Object.keys(options).length > 0
          ? options
          : undefined;

      const response = await api.post(`/tenant/bookings/${bookingId}/invoice`, payload);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error creating booking invoice:", error.response?.data || error.message);
      return normalizeError(error);
    }
  }

  /**
   * Generate advance monthly invoices for early payment (up to 2 months).
   */
  async createAdvanceBookingInvoices(bookingId, monthsCount = 2) {
    const normalizedMonths = Math.max(1, Math.min(Number(monthsCount) || 1, 2));

    return this.createBookingInvoice(bookingId, {
      start_from: "next",
      months_count: normalizedMonths,
    });
  }

  /**
   * Create a PayMongo source (redirect/QR) for an invoice
   */
  async createPaymongoSource(invoiceId, method = "gcash", returnUrl = null, amount = null) {
    try {
      const payload = { method };
      if (returnUrl) payload.return_url = returnUrl;
      if (amount) payload.amount = amount;

      const response = await api.post(
        `/tenant/invoices/${invoiceId}/paymongo-source`,
        payload,
      );

      return normalizeResponse(response);
    } catch (error) {
      // Provide more diagnostic details so mobile UI can display the server response
      console.error(
        "Error creating paymongo source:",
        error.response?.data || error.message,
      );
      return normalizeError(error);
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
      return normalizeResponse(response);
    } catch (error) {
      console.error(
        "Error creating paymongo payment:",
        error.response?.data || error.message,
      );
      return normalizeError(error);
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
      return normalizeResponse(response);
    } catch (error) {
      console.error(
        "Error recording offline payment:",
        error.response?.data || error.message,
      );
      return normalizeError(error);
    }
  }

  /**
   * LANDLORD: Get all invoices
   */
  async getInvoices(params = {}) {
    try {
      const response = await api.get(`/invoices`, { params });
      const normalized = normalizePaginatedResponse(response);
      
      if (normalized.items && Array.isArray(normalized.items)) {
        normalized.items = normalized.items.map(normalizeInvoiceItem);
      }

      return {
        success: true,
        data: normalized,
        error: null
      };
    } catch (error) {
      console.error("Error fetching invoices:", error);
      return normalizeError(error);
    }
  }

  /**
   * LANDLORD: Get payment bundle (invoices + summary)
   */
  async getPaymentBundle(params = {}) {
    try {
      const response = await api.get(`/invoices/bundle`, { params });
      return normalizeResponse(response);
    } catch (error) {
      console.error(
        "Error fetching payment bundle:",
        error.response?.data || error.message,
      );
      return normalizeError(error);
    }
  }

  /**
   * LANDLORD: Get summarized invoice totals/counts for dashboard cards
   */
  async getInvoiceSummary(params = {}) {
    try {
      const response = await api.get('/invoices/summary', { params });
      const res = normalizeResponse(response);
      
      if (res.success && res.data?.totals) {
        const t = res.data.totals;
        res.data.totals = {
          ...t,
          total_billed: normalizeAmount(t.total_billed_cents || t.total_billed),
          total_paid: normalizeAmount(t.total_paid_cents || t.total_paid),
          total_balance: normalizeAmount(t.total_balance_cents || t.total_balance),
          total_refunded: normalizeAmount(t.total_refunded_cents || t.total_refunded),
        };
      }
      
      return res;
    } catch (error) {
      console.error('Error fetching invoice summary:', error);
      return normalizeError(error);
    }
  }

  /**
   * LANDLORD: Get invoices for a specific tenant
   */
  async getInvoicesByTenant(tenantId) {
    try {
      const response = await api.get(`/invoices?tenant_id=${tenantId}`);
      const paginated = normalizePaginatedResponse(response);
      paginated.items = paginated.items.map(normalizeInvoiceItem);

      return {
        success: true,
        data: paginated,
        error: null,
        raw: response.data,
      };
    } catch (error) {
      console.error("Error fetching tenant invoices:", error);
      return normalizeError(error);
    }
  }

  /**
   * LANDLORD: Record an offline/cash payment against an invoice.
   * amount_cents – integer (e.g. 500000 = ₱5,000)
    * method      – 'cash' | 'bank_transfer' | 'gcash' | 'check' | 'other'
    * reference   – optional reference string
   * notes       – optional notes
   */
  async recordLandlordPayment(
    invoiceId,
    { amount_cents, method, reference = null, notes = null },
  ) {
    try {
      const response = await api.post(`/invoices/${invoiceId}/record`, {
        amount_cents,
        method,
        reference,
        notes,
        received_at: new Date().toISOString(),
      });
      return normalizeResponse(response);
    } catch (error) {
      console.error(
        "Error recording payment:",
        error.response?.data || error.message,
      );
      return normalizeError(error);
    }
  }

  /**
   * LANDLORD: Update booking payment status
   */
  async updateBookingPayment(bookingId, payload) {
    try {
      const response = await api.patch(
        `/bookings/${bookingId}/payment`,
        payload,
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error updating booking payment:", error);
      return normalizeError(error);
    }
  }

  /**
   * LANDLORD: Refund a transaction
   */
  async refundTransaction(transactionId, amountCents) {
    try {
      const response = await api.post(`/transactions/${transactionId}/refund`, {
        amount_cents: amountCents,
      });
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error refunding transaction:", error);
      return normalizeError(error);
    }
  }

  /**
   * LANDLORD: Refund entire invoice (merged)
   */
  async refundInvoice(invoiceId, amountCents) {
    try {
      const response = await api.post(`/invoices/${invoiceId}/refund`, {
        amount_cents: amountCents,
      });
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error refunding invoice:", error);
      return normalizeError(error);
    }
  }

  /**
   * LANDLORD: Verify or reject a tenant-reported cash payment.
   */
  async verifyCash(invoiceId, payloadOrAction) {
    try {
      const payload =
        typeof payloadOrAction === "string"
          ? { action: payloadOrAction }
          : payloadOrAction;

      const response = await api.post(`/invoices/${invoiceId}/verify-cash`, payload);
      return normalizeResponse(response);
    } catch (error) {
      console.error("Error verifying cash payment:", error);
      return normalizeError(error);
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
      return normalizeResponse(response);
    } catch (error) {
      console.error(
        "Error refreshing invoice status:",
        error.response?.data || error.message,
      );
      return normalizeError(error);
    }
  }

  /**
   * Create a PayMongo split payment link for a room
   * Matches: POST /api/tenant/rooms/{roomId}/payment-link
   */
  async createPaymentLink(roomId, data = {}) {
    try {
      const response = await api.post(
        `/tenant/rooms/${roomId}/payment-link`,
        data,
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error(
        "Error creating payment link:",
        error.response?.data || error.message,
      );
      return normalizeError(error);
    }
  }

  /**
   * Generate a cash invoice for a room
   * Matches: POST /api/rooms/{roomId}/generate-cash-invoice
   */
  async generateCashInvoice(roomId, data = {}) {
    try {
      const response = await api.post(
        `/rooms/${roomId}/generate-cash-invoice`,
        data,
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error(
        "Error generating cash invoice:",
        error.response?.data || error.message,
      );
      return normalizeError(error);
    }
  }

  /**
   * TENANT: Get wallet credit balance.
   * Uses tenant profile payload where wallet_balance is already exposed by backend.
   */
  async getWalletBalance() {
    try {
      const response = await api.get('/tenant/profile');
      const res = normalizeResponse(response);
      if (res.success) {
        const balance = Number(res.data?.wallet_balance ?? 0);
        res.data = Number.isFinite(balance) ? balance : 0;
      }
      return res;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return normalizeError(error);
    }
  }

  /**
   * TENANT: Apply wallet credits to an invoice.
   * Matches: POST /api/tenant/invoices/{id}/apply-wallet-credit
   */
  async applyWalletCredit(invoiceId, amountCents) {
    try {
      const response = await api.post(`/tenant/invoices/${invoiceId}/apply-wallet-credit`, {
        amount_cents: amountCents,
      });
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error applying wallet credit:', error.response?.data || error.message);
      return normalizeError(error);
    }
  }

  /**
   * TENANT: Get wallet credit transaction history
   * Matches: GET /api/tenant/wallet-credit/logs
   */
  async getWalletLogs(page = 1) {
    try {
      const response = await api.get(`/tenant/wallet-credit/logs?page=${page}`);
      const normalized = normalizePaginatedResponse(response);

      if (normalized.items && Array.isArray(normalized.items)) {
        normalized.items = normalized.items.map((log) => ({
          ...log,
          amount: normalizeAmount(log.amount_cents || log.amount),
        }));
      }

      return {
        success: true,
        data: normalized,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching wallet logs:', error);
      return normalizeError(error);
    }
  }

  /**
   * Get the stored auth token from AsyncStorage (used for raw fetch calls)
   */
  async getAuthToken() {
    try {
      const userJson = await AsyncStorage.getItem("user");
      if (userJson) {
        const user = JSON.parse(userJson);
        if (user?.token) return user.token;
      }
      return await AsyncStorage.getItem("token");
    } catch {
      return null;
    }
  }
}

export default new PaymentService();
