import api from '../utils/api';

/**
 * Landlord-specific tenant management operations.
 * Separates tenant CRUD/assignment from the broader PropertyService.
 */
export const landlordService = {

  /**
   * Get all tenants for a property
   * GET /landlord/tenants?property_id=...
   */
  async getTenants(params = {}) {
    try {
      const res = await api.get('/landlord/tenants', { params });
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Get accessible properties for landlord/caretaker
   * GET /properties/accessible
   */
  async getAccessibleProperties() {
    try {
      const res = await api.get('/properties/accessible');
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Assign a room to a tenant
   * POST /landlord/tenants/:id/assign-room
   */
  async assignRoom(tenantId, payload) {
    try {
      const res = await api.post(`/landlord/tenants/${tenantId}/assign-room`, payload);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Unassign a tenant from their room
   * DELETE /landlord/tenants/:id/unassign-room
   */
  async unassignRoom(tenantId) {
    try {
      const res = await api.delete(`/landlord/tenants/${tenantId}/unassign-room`);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Transfer a tenant to a different room
   * POST /landlord/tenants/:id/transfer-room
   */
  async transferRoom(tenantId, data) {
    try {
      const res = await api.post(`/landlord/tenants/${tenantId}/transfer-room`, data);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Schedule a tenant eviction
   * POST /landlord/tenants/:id/evictions/schedule
   */
  async scheduleEviction(tenantId, data) {
    try {
      const res = await api.post(`/landlord/tenants/${tenantId}/evictions/schedule`, data);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Finalize a tenant eviction
   * POST /landlord/tenants/:id/evictions/finalize
   */
  async finalizeEviction(tenantId) {
    try {
      const res = await api.post(`/landlord/tenants/${tenantId}/evictions/finalize`);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Cancel a scheduled eviction
   * POST /landlord/tenants/:id/evictions/cancel
   */
  async cancelEviction(tenantId) {
    try {
      const res = await api.post(`/landlord/tenants/${tenantId}/evictions/cancel`);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Undo a finalized eviction
   * POST /landlord/tenants/:id/evictions/undo
   */
  async undoEviction(tenantId, data = {}) {
    try {
      const res = await api.post(`/landlord/tenants/${tenantId}/evictions/undo`, data);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },
};

export default landlordService;
