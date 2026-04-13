import api from '../utils/api';

/**
 * Landlord-specific tenant management operations.
 * Separates tenant CRUD/assignment from the broader PropertyService.
 */
export const landlordService = {

  /**
   * Get available subscription plans
   * GET /landlord/subscriptions/plans
   */
  async getSubscriptionPlans() {
    try {
      const res = await api.get('/landlord/subscriptions/plans');
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Get current subscription bundle (subscription + plan + usage)
   * GET /landlord/subscriptions/current
   */
  async getCurrentSubscription() {
    try {
      const res = await api.get('/landlord/subscriptions/current');
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Get current usage against subscription limits
   * GET /landlord/subscriptions/usage
   */
  async getSubscriptionUsage() {
    try {
      const res = await api.get('/landlord/subscriptions/usage');
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Start self-serve checkout for a target plan
   * POST /landlord/subscriptions/checkout
   */
  async checkoutSubscription(payload) {
    try {
      const res = await api.post('/landlord/subscriptions/checkout', payload);
      return {
        success: true,
        data: res.data?.data || res.data,
        message: res.data?.message || '',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.message,
        status: err.response?.status,
      };
    }
  },

  /**
   * Sync a checkout subscription after payment status updates
   * POST /landlord/subscriptions/checkout/:id/sync
   */
  async syncSubscriptionCheckout(subscriptionId) {
    try {
      const res = await api.post(`/landlord/subscriptions/checkout/${subscriptionId}/sync`);
      return {
        success: true,
        data: res.data?.data || res.data,
        message: res.data?.message || '',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.message,
        status: err.response?.status,
      };
    }
  },

  /**
   * Create or reuse a PayMongo checkout link for a scheduled subscription checkout
   * POST /landlord/subscriptions/checkout/:id/payment-link
   */
  async createSubscriptionCheckoutPayment(subscriptionId, payload = {}) {
    try {
      const res = await api.post(`/landlord/subscriptions/checkout/${subscriptionId}/payment-link`, payload);
      return {
        success: true,
        data: res.data?.data || res.data,
        message: res.data?.message || '',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.message,
        status: err.response?.status,
      };
    }
  },

  /**
   * Create a PayMongo source for an invoice and get checkout redirect metadata
   * POST /invoices/:id/paymongo-source
   */
  async createInvoicePaymongoSource(invoiceId, payload) {
    try {
      const res = await api.post(`/invoices/${invoiceId}/paymongo-source`, payload);
      return {
        success: true,
        data: res.data,
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.response?.data?.message || err.message,
        status: err.response?.status,
      };
    }
  },

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
   * Create a tenant account
   * POST /landlord/tenants
   */
  async createTenant(payload) {
    try {
      const res = await api.post('/landlord/tenants', payload);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.response?.data?.error || err.message,
      };
    }
  },

  /**
   * Generate a one-time claim code for an existing tenant account
   * POST /landlord/tenants/:id/claim-code
   */
  async generateTenantClaimCode(tenantId) {
    try {
      const res = await api.post(`/landlord/tenants/${tenantId}/claim-code`);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.response?.data?.error || err.message,
      };
    }
  },

  /**
   * Delete a tenant account
   * DELETE /landlord/tenants/:id
   */
  async deleteTenant(tenantId) {
    try {
      await api.delete(`/landlord/tenants/${tenantId}`);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.response?.data?.error || err.message,
      };
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
