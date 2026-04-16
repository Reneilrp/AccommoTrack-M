import api from "./api.js";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  };
};

const unwrapInvoiceList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.invoices)) {
    return payload.invoices;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

class PaymentService {
  /**
   * Get all payments for the authenticated tenant
   */
  async getPayments(status = "all") {
    try {
      const url =
        status !== "all"
          ? `/tenant/payments?status=${status}`
          : `/tenant/payments`;

      const response = await api.get(url);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("Error fetching payments:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch payments",
      };
    }
  }

  /**
   * Get payment statistics
   */
  async getStats() {
    try {
      const response = await api.get(`/tenant/payments/stats`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("Error fetching payment stats:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch payment stats",
      };
    }
  }

  /**
   * Get single payment details
   */
  async getPaymentDetails(paymentId) {
    try {
      const response = await api.get(`/tenant/payments/${paymentId}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("Error fetching payment details:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to fetch payment details",
      };
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

      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error) {
      console.error("Error creating booking invoice:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to create invoice for booking",
      };
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

      return { success: true, data: response.data };
    } catch (error) {
      // Provide more diagnostic details so mobile UI can display the server response
      console.error(
        "Error creating paymongo source:",
        error.response?.data || error.message,
      );
      const serverBody = error.response?.data;
      let errMsg = "Failed to create source";
      if (serverBody) {
        // try to extract useful fields
        errMsg =
          serverBody.message || serverBody.error || JSON.stringify(serverBody);
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
      console.error(
        "Error creating paymongo payment:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error: error.response?.data?.message || "Failed to create payment",
      };
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
      console.error(
        "Error recording offline payment:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to record offline payment",
      };
    }
  }

  /**
   * LANDLORD: Get all invoices
   */
  async getInvoices(params = {}) {
    try {
      const response = await api.get(`/invoices`, { params });

      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error fetching invoices:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch invoices",
      };
    }
  }

  /**
   * LANDLORD: Get summarized invoice totals/counts for dashboard cards
   */
  async getInvoiceSummary(params = {}) {
    try {
      const response = await api.get('/invoices/summary', { params });
      const payload = response.data;

      if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'success')) {
        return {
          success: Boolean(payload.success),
          data: payload.data ?? null,
          message: payload.message || '',
          error: payload.success ? null : (payload.message || 'Failed to fetch invoice summary'),
        };
      }

      return { success: true, data: payload?.data || payload };
    } catch (error) {
      console.error('Error fetching invoice summary:', error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          'Failed to fetch invoice summary',
      };
    }
  }

  /**
   * LANDLORD: Get invoices for a specific tenant
   */
  async getInvoicesByTenant(tenantId) {
    try {
      const response = await api.get(`/invoices?tenant_id=${tenantId}`);
      const invoices = unwrapInvoiceList(response.data).map(normalizeInvoiceItem);

      return {
        success: true,
        data: invoices,
        raw: response.data,
      };
    } catch (error) {
      console.error("Error fetching tenant invoices:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to fetch tenant invoices",
      };
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
      return { success: true, data: response.data };
    } catch (error) {
      console.error(
        "Error recording payment:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error: error.response?.data?.message || "Failed to record payment",
      };
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

      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error updating booking payment:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to update payment",
      };
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
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error refunding transaction:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to refund transaction",
      };
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
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error refunding invoice:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to refund invoice",
      };
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
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error verifying cash payment:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to verify cash payment",
      };
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
      console.error(
        "Error refreshing invoice status:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to refresh invoice status",
      };
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
      return { success: true, data: response.data };
    } catch (error) {
      console.error(
        "Error creating payment link:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error: error.response?.data?.message || "Failed to create payment link",
      };
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
      return { success: true, data: response.data };
    } catch (error) {
      console.error(
        "Error generating cash invoice:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to generate cash invoice",
      };
    }
  }

  /**
   * TENANT: Get wallet credit balance.
   * Uses tenant profile payload where wallet_balance is already exposed by backend.
   */
  async getWalletBalance() {
    try {
      const response = await api.get('/tenant/profile');
      const balance = Number(response?.data?.wallet_balance ?? 0);
      return {
        success: true,
        data: Number.isFinite(balance) ? balance : 0,
      };
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch wallet balance',
      };
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

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error applying wallet credit:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to apply wallet credits',
      };
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
