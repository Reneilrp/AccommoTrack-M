import api from "./api.js";

const toNonEmptyString = (value) => {
  if (value === null || value === undefined) return "";
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : "";
};

const normalizeRoomPayload = (room) => {
  if (!room || typeof room !== "object") {
    return room;
  }

  const resolvedRoomNumber =
    toNonEmptyString(room.room_number) || toNonEmptyString(room.roomNumber);

  return {
    ...room,
    room_number: resolvedRoomNumber,
    roomNumber: resolvedRoomNumber,
  };
};

const unwrapPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload;
};

const normalizeTenantDetails = (payload) => {
  const tenant = unwrapPayload(payload);
  if (!tenant || typeof tenant !== "object") {
    return tenant;
  }

  const normalizedHistory = tenant.history && typeof tenant.history === "object"
    ? {
        ...tenant.history,
        bookings: Array.isArray(tenant.history.bookings)
          ? tenant.history.bookings.map((booking) => ({
              ...booking,
              room: normalizeRoomPayload(booking?.room),
            }))
          : [],
        transfers: Array.isArray(tenant.history.transfers)
          ? tenant.history.transfers.map((transfer) => ({
              ...transfer,
              current_room: normalizeRoomPayload(transfer?.current_room),
              requested_room: normalizeRoomPayload(transfer?.requested_room),
            }))
          : [],
      }
    : tenant.history;

  return {
    ...tenant,
    room: normalizeRoomPayload(tenant.room),
    history: normalizedHistory,
  };
};

class TenantService {
  /**
   * Get current stay details (active booking with room, property, landlord info)
   */
  async getCurrentStay() {
    try {
      const response = await api.get(`/tenant/current-stay`);

      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error("Error fetching current stay:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch current stay",
        data: null,
      };
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      const response = await api.get(`/tenant/dashboard/stats`);

      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to fetch dashboard stats",
        data: {
          payments: {
            monthlyDue: 0,
            pendingAmount: 0,
            totalDue: 0,
            totalPaid: 0,
            nextDueDate: null,
            invoice_breakdown: {
              pending: 0,
              partial: 0,
              overdue: 0,
              paid: 0,
            },
          },
        },
      };
    }
  }

  /**
   * Get consolidated dashboard data (stats, activities, upcoming, stay, breakdown)
   */
  async getDashboardBundle() {
    try {
      const response = await api.get(`/tenant/dashboard/bundle`);
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error("Error fetching dashboard bundle:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch dashboard bundle",
        data: null,
      };
    }
  }

  /**
   * Get recent tenant activities for dashboard feed.
   */
  async getDashboardActivities() {
    try {
      const response = await api.get(`/tenant/dashboard/activities`);

      return {
        success: true,
        data: response.data.data || response.data || [],
      };
    } catch (error) {
      console.error("Error fetching dashboard activities:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          "Failed to fetch dashboard activities",
        data: [],
      };
    }
  }

  /**
   * Get upcoming payment/check-in items for dashboard alerts.
   */
  async getDashboardUpcoming() {
    try {
      const response = await api.get(`/tenant/dashboard/upcoming`);

      return {
        success: true,
        data: response.data.data || response.data || {},
      };
    } catch (error) {
      console.error("Error fetching dashboard upcoming data:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          "Failed to fetch dashboard upcoming data",
        data: { upcomingCheckouts: [], unpaidBookings: [] },
      };
    }
  }

  /**
   * Get month-by-month payment schedule breakdown for dashboard timeline.
   */
  async getPaymentBreakdown(months = 6) {
    try {
      const response = await api.get(`/tenant/payments/breakdown?months=${months}`);

      return {
        success: true,
        data: response.data.data || response.data || { upcoming_months: [] },
      };
    } catch (error) {
      console.error("Error fetching payment breakdown:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to fetch payment breakdown",
        data: { upcoming_months: [] },
      };
    }
  }

  /**
   * Get booking history (past/completed bookings)
   */
  async getHistory(page = 1) {
    try {
      const response = await api.get(`/tenant/history?page=${page}`);

      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error("Error fetching booking history:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to fetch booking history",
      };
    }
  }

  /**
   * Request stay extension for a booking
   */
  async requestExtension(bookingId, payload) {
    try {
      const response = await api.post(`/bookings/${bookingId}/extend`, payload);

      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error("Error requesting extension:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to request extension",
      };
    }
  }

  /**
   * Request room transfer for current stay
   */
  async requestTransfer(payload) {
    try {
      const response = await api.post(`/tenant/transfers`, payload);

      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error("Error requesting transfer:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to request transfer",
      };
    }
  }

  /**
   * Get eligible room options for transfer
   */
  async getTransferOptions(bookingId, propertyId) {
    try {
      const response = await api.get(`/tenant/transfers/options`, {
        params: {
          booking_id: bookingId,
          property_id: propertyId,
        },
      });

      const raw = response.data?.data || response.data || [];
      return {
        success: true,
        data: Array.isArray(raw) ? raw : [],
        message: response.data?.message || "",
      };
    } catch (error) {
      console.error("Error fetching transfer options:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to fetch transfer options",
        data: [],
      };
    }
  }

  /**
   * Get transfer requests for current tenant
   */
  async getTransferRequests() {
    try {
      const response = await api.get(`/tenant/transfers`);

      const raw = response.data?.data || response.data || [];
      return {
        success: true,
        data: Array.isArray(raw) ? raw : [],
      };
    } catch (error) {
      console.error("Error fetching transfer requests:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to fetch transfer requests",
        data: [],
      };
    }
  }

  /**
   * Preview financial impact of a room transfer before submitting.
   * Returns rate comparison, proration credit, and suggested adjustment.
   */
  async getTransferPreview(bookingId, requestedRoomId) {
    try {
      const response = await api.get(`/tenant/transfers/preview`, {
        params: {
          booking_id: bookingId,
          requested_room_id: requestedRoomId,
        },
      });
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error) {
      console.error('Error fetching transfer preview:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch transfer preview',
        data: null,
      };
    }
  }

  /**
   * Cancel a pending transfer request
   */
  async cancelTransferRequest(transferRequestId) {
    try {
      const response = await api.patch(
        `/tenant/transfers/${transferRequestId}/cancel`,
      );

      return {
        success: true,
        data: response.data?.data || response.data,
        message: response.data?.message || "Transfer request cancelled.",
      };
    } catch (error) {
      console.error("Error cancelling transfer request:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          "Failed to cancel transfer request",
      };
    }
  }

  /**
   * Request an addon for current booking
   */
  async requestAddon(data) {
    try {
      const response = await api.post(`/tenant/addons/request`, data);

      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error("Error requesting addon:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to request addon",
      };
    }
  }

  /**
   * Cancel a pending addon request
   */
  async cancelAddonRequest(addonId) {
    try {
      const response = await api.delete(`/tenant/addons/${addonId}/cancel`);

      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error("Error canceling addon request:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to cancel addon request",
      };
    }
  }

  /**
   * Get list of available addons for current property
   */
  async getAvailableAddons() {
    try {
      const response = await api.get(`/tenant/addons/available`);

      return {
        success: true,
        data: response.data.data || response.data,
        status: response.status,
      };
    } catch (error) {
      console.error("Error fetching available addons:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to fetch available addons",
        status: error.response?.status,
      };
    }
  }

  /**
   * Get current booking's addon requests
   */
  async getAddonRequests() {
    try {
      const response = await api.get(`/tenant/addons/requests`);

      return {
        success: true,
        data: response.data.data || response.data,
        status: response.status,
      };
    } catch (error) {
      console.error("Error fetching addon requests:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to fetch addon requests",
        status: error.response?.status,
      };
    }
  }

  /**
   * Submit a maintenance request (supports JSON or FormData when sending images)
   * payload: object or FormData
   * isForm: boolean - true when payload is FormData
   */
  async submitMaintenanceRequest(payload, isForm = false) {
    try {
      const response = await api.post(`/tenant/maintenance-requests`, payload);

      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error("Error submitting maintenance request:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          "Failed to submit maintenance request",
      };
    }
  }

  /**
   * Get details for a specific maintenance request, including history timeline.
   */
  async getRequestDetails(requestId) {
    try {
      const response = await api.get(`/tenant/maintenance-requests/${requestId}`);
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error("Error fetching maintenance request details:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to fetch request details",
      };
    }
  }

  /**
   * Get tenant's maintenance requests (list)
   */
  async getMyMaintenanceRequests(page = 1) {
    try {
      const response = await api.get(
        `/tenant/maintenance-requests?page=${page}`,
      );

      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          "Failed to fetch maintenance requests",
      };
    }
  }

  /**
   * Submit a report for a property
   */
  async submitReport(payload) {
    try {
      const response = await api.post(`/reports`, payload);

      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error submitting report:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to submit report",
      };
    }
  }

  /**
   * Submit a review/rating for a property (tenant-only)
   * payload: { booking_id, property_id, rating, comment }
   */
  async submitReview(payload) {
    try {
      const response = await api.post(`/tenant/reviews`, payload);

      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error("Error submitting review:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to submit review",
      };
    }
  }

  /**
   * Get tenant's own reviews
   */
  async getTenantReviews() {
    try {
      const response = await api.get(`/tenant/reviews`);

      return { success: true, data: response.data || response.data.data || [] };
    } catch (error) {
      console.error("Error fetching tenant reviews:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch reviews",
      };
    }
  }

  /**
   * Update an existing review (tenant)
   */
  async updateReview(reviewId, payload) {
    try {
      const response = await api.put(`/tenant/reviews/${reviewId}`, payload);

      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error("Error updating review:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to update review",
      };
    }
  }

  /**
   * Delete a review (tenant)
   */
  async deleteReview(reviewId) {
    try {
      const response = await api.delete(`/tenant/reviews/${reviewId}`);

      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error("Error deleting review:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to delete review",
      };
    }
  }

  // --- LANDLORD METHODS ---

  async getTenants(params = {}) {
    try {
      const response = await api.get(`/landlord/tenants`, { params });
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error fetching tenants:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch tenants",
      };
    }
  }

  /**
   * Schedule a tenant eviction
   */
  async scheduleEviction(tenantId, data) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/evictions/schedule`, data);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error scheduling eviction:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to schedule eviction",
      };
    }
  }

  /**
   * Finalize a tenant eviction
   */
  async finalizeEviction(tenantId) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/evictions/finalize`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error finalizing eviction:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to finalize eviction",
      };
    }
  }

  /**
   * Cancel a scheduled eviction
   */
  async cancelEviction(tenantId) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/evictions/cancel`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error cancelling eviction:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to cancel eviction",
      };
    }
  }

  /**
   * Undo a finalized eviction
   */
  async undoEviction(tenantId, data = {}) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/evictions/undo`, data);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error undoing eviction:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to undo eviction",
      };
    }
  }

  /**
   * Get a pre-filled "Notice to Vacate" template for a tenant
   */
  async getEvictionNotice(tenantId) {
    try {
      const response = await api.get(`/landlord/tenants/${tenantId}/evictions/notice`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error fetching eviction notice:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch eviction notice",
      };
    }
  }

  /**
   * Generate a one-time claim code for an existing tenant account
   */
  async generateTenantClaimCode(tenantId) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/claim-code`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error generating claim code:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to generate claim code",
      };
    }
  }

  async getTenantDetails(tenantId) {
    try {
      const response = await api.get(`/landlord/tenants/${tenantId}`);
      return { success: true, data: normalizeTenantDetails(response.data), raw: response.data };
    } catch (error) {
      console.error("Error fetching tenant details:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to fetch tenant details",
      };
    }
  }

  async createTenant(tenantData) {
    try {
      const response = await api.post(`/landlord/tenants`, tenantData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error creating tenant:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to create tenant",
      };
    }
  }

  async updateTenant(tenantId, tenantData) {
    try {
      const response = await api.put(
        `/landlord/tenants/${tenantId}`,
        tenantData,
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error updating tenant:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to update tenant",
      };
    }
  }

  async deleteTenant(tenantId) {
    try {
      const response = await api.delete(`/landlord/tenants/${tenantId}`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error deleting tenant:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to delete tenant",
      };
    }
  }

  /**
   * Assign a room to a tenant
   */
  async assignRoom(tenantId, payload) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/assign-room`, payload);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error assigning room:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to assign room",
      };
    }
  }

  /**
   * Unassign a tenant from their room
   */
  async unassignRoom(tenantId) {
    try {
      const response = await api.delete(`/landlord/tenants/${tenantId}/unassign-room`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error unassigning room:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to unassign room",
      };
    }
  }

  /**
   * Transfer a tenant to a different room
   */
  async transferRoom(tenantId, data) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/transfer-room`, data);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error transferring room:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to transfer room",
      };
    }
  }

  /**
   * Report a reservation dispute (fake receipt, landlord scam, or general issue).
   * Only available for bookings in pending_reservation or reserved status.
   * @param {number} bookingId
   * @param {string} reason - Human readable description of the issue
   * @param {'fake_receipt'|'landlord_scam'|'other'} reportType
   */
  async reportDispute(bookingId, reason, reportType = 'other') {
    try {
      const response = await api.post('/reservation-disputes', {
        booking_id: bookingId,
        reason,
        report_type: reportType,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error submitting reservation dispute:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to submit dispute report',
      };
    }
  }
}

export default new TenantService();
