import api from '../utils/api';

/**
 * Room CRUD and management operations.
 * Centralizes all room-specific API calls previously scattered across screens.
 */
export const roomService = {

  /**
   * Get all rooms for a property (with optional filters)
   * GET /rooms/property/:propertyId
   */
  async getRoomsByProperty(propertyId, params = {}) {
    try {
      const res = await api.get(`/rooms/property/${propertyId}`, { params });
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Get room stats for a property
   * GET /rooms/property/:propertyId/stats
   */
  async getRoomStats(propertyId) {
    try {
      const res = await api.get(`/rooms/property/${propertyId}/stats`);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Get a single room by ID
   * GET /rooms/:id/details
   */
  async getRoom(roomId) {
    try {
      const res = await api.get(`/rooms/${roomId}/details`);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Update a room (multipart form data)
   * POST /landlord/rooms/:id
   */
  async updateRoom(roomId, formData) {
    try {
      const res = await api.post(`/landlord/rooms/${roomId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Delete a room
   * DELETE /landlord/rooms/:id
   */
  async deleteRoom(roomId) {
    try {
      const res = await api.delete(`/landlord/rooms/${roomId}`);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Update a room's status (available / occupied / maintenance)
   * PATCH /rooms/:id/status
   */
  async updateStatus(roomId, status) {
    try {
      const res = await api.patch(`/rooms/${roomId}/status`, { status });
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Extend a tenant's stay in a room
   * POST /rooms/:id/extend
   */
  async extendStay(roomId, payload) {
    try {
      const res = await api.post(`/rooms/${roomId}/extend`, payload);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.message || err.response?.data?.error || err.message 
      };
    }
  },

  /**
   * Remove a tenant from a room
   * DELETE /rooms/:id/remove-tenant
   */
  async removeTenant(roomId, tenantId = null) {
    try {
      const res = await api.delete(`/rooms/${roomId}/remove-tenant`, {
        data: tenantId ? { tenant_id: tenantId } : undefined,
      });
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },
};

export default roomService;
