import api, { normalizeResponse, normalizeError, normalizePaginatedResponse } from "./api.js";

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
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      const response = await api.get(`/tenant/dashboard/stats`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Get consolidated dashboard data (stats, activities, upcoming, stay, breakdown)
   */
  async getDashboardBundle() {
    try {
      const response = await api.get(`/tenant/dashboard/bundle`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Get recent tenant activities for dashboard feed.
   */
  async getDashboardActivities() {
    try {
      const response = await api.get(`/tenant/dashboard/activities`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Get upcoming payment/check-in items for dashboard alerts.
   */
  async getDashboardUpcoming() {
    try {
      const response = await api.get(`/tenant/dashboard/upcoming`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Get month-by-month payment schedule breakdown for dashboard timeline.
   */
  async getPaymentBreakdown(months = 6) {
    try {
      const response = await api.get(`/tenant/payments/breakdown?months=${months}`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
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
        data: normalizePaginatedResponse(response),
      };
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Request stay extension for a booking
   */
  async requestExtension(bookingId, payload) {
    try {
      const response = await api.post(`/bookings/${bookingId}/extend`, payload);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Request room transfer for current stay
   */
  async requestTransfer(payload) {
    try {
      const response = await api.post(`/tenant/transfers`, payload);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
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
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Get transfer requests for current tenant
   */
  async getTransferRequests() {
    try {
      const response = await api.get(`/tenant/transfers`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
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
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
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
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Request an addon for current booking
   */
  async requestAddon(data) {
    try {
      const response = await api.post(`/tenant/addons/request`, data);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Cancel a pending addon request
   */
  async cancelAddonRequest(addonId) {
    try {
      const response = await api.delete(`/tenant/addons/${addonId}/cancel`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Get list of available addons for current property
   */
  async getAvailableAddons() {
    try {
      const response = await api.get(`/tenant/addons/available`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Get current booking's addon requests
   */
  async getAddonRequests() {
    try {
      const response = await api.get(`/tenant/addons/requests`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
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
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Get details for a specific maintenance request, including history timeline.
   */
  async getRequestDetails(requestId) {
    try {
      const response = await api.get(`/tenant/maintenance-requests/${requestId}`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
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
      return {
        success: true,
        data: normalizePaginatedResponse(response),
      };
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Submit a report for a property
   */
  async submitReport(payload) {
    try {
      const response = await api.post(`/reports`, payload);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Submit a review/rating for a property (tenant-only)
   * payload: { booking_id, property_id, rating, comment }
   */
  async submitReview(payload) {
    try {
      const response = await api.post(`/tenant/reviews`, payload);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Get tenant's own reviews
   */
  async getTenantReviews() {
    try {
      const response = await api.get(`/tenant/reviews`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Update an existing review (tenant)
   */
  async updateReview(reviewId, payload) {
    try {
      const response = await api.put(`/tenant/reviews/${reviewId}`, payload);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Delete a review (tenant)
   */
  async deleteReview(reviewId) {
    try {
      const response = await api.delete(`/tenant/reviews/${reviewId}`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  // --- LANDLORD METHODS ---

  async getTenants(params = {}) {
    try {
      const response = await api.get(`/landlord/tenants`, { params });
      return {
        success: true,
        data: normalizePaginatedResponse(response),
      };
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Schedule a tenant eviction
   */
  async scheduleEviction(tenantId, data) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/evictions/schedule`, data);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Finalize a tenant eviction
   */
  async finalizeEviction(tenantId) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/evictions/finalize`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Cancel a scheduled eviction
   */
  async cancelEviction(tenantId) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/evictions/cancel`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Undo a finalized eviction
   */
  async undoEviction(tenantId, data = {}) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/evictions/undo`, data);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Get a pre-filled "Notice to Vacate" template for a tenant
   */
  async getEvictionNotice(tenantId) {
    try {
      const response = await api.get(`/landlord/tenants/${tenantId}/evictions/notice`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Generate a one-time claim code for an existing tenant account
   */
  async generateTenantClaimCode(tenantId) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/claim-code`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  async getTenantDetails(tenantId) {
    try {
      const response = await api.get(`/landlord/tenants/${tenantId}`);
      const normalizedData = normalizeTenantDetails(response.data);
      return {
        success: true,
        data: normalizedData,
        raw: response.data,
      };
    } catch (error) {
      return normalizeError(error);
    }
  }

  async createTenant(tenantData) {
    try {
      const response = await api.post(`/landlord/tenants`, tenantData);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  async updateTenant(tenantId, tenantData) {
    try {
      const response = await api.put(
        `/landlord/tenants/${tenantId}`,
        tenantData,
      );
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  async deleteTenant(tenantId) {
    try {
      const response = await api.delete(`/landlord/tenants/${tenantId}`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Assign a room to a tenant
   */
  async assignRoom(tenantId, payload) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/assign-room`, payload);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Unassign a tenant from their room
   */
  async unassignRoom(tenantId) {
    try {
      const response = await api.delete(`/landlord/tenants/${tenantId}/unassign-room`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  /**
   * Transfer a tenant to a different room
   */
  async transferRoom(tenantId, data) {
    try {
      const response = await api.post(`/landlord/tenants/${tenantId}/transfer-room`, data);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
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
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }
}

export default new TenantService();

