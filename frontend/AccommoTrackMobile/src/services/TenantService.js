import api from './api';
import { API_BASE_URL as API_URL } from '../config';

class TenantService {

  /**
   * Get current stay details (active booking with room, property, landlord info)
   */
  async getCurrentStay() {
    try {
      const response = await api.get(`/tenant/current-stay`);

      return {
        success: true,
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error fetching current stay:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch current stay',
        data: null
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
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch dashboard stats',
        data: {
          payments: {
            monthlyDue: 0,
            totalPaid: 0,
            nextDueDate: null
          }
        }
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
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error fetching booking history:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch booking history'
      };
    }
  }

  /**
   * Request an addon for current booking
   */
  async requestAddon(addonId, quantity = 1, note = null) {
    try {
      const body = { addon_id: addonId, quantity };
      if (note) body.note = note;

      // support optional bookingId passed via note parameter or as fourth arg
      if (arguments.length >= 4) {
        const bookingId = arguments[3];
        if (bookingId) body.booking_id = bookingId;
      }

      const response = await api.post(`/tenant/addons/request`, body);

      return {
        success: true,
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error requesting addon:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to request addon'
      };
    }
  }

  /**
   * Cancel a pending addon request
   */
  async cancelAddonRequest(addonId) {
    try {
      const response = await api.delete(`/tenant/addons/request/${addonId}`);

      return {
        success: true,
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error canceling addon request:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to cancel addon request'
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
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error fetching available addons:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch available addons'
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
        data: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error fetching addon requests:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch addon requests'
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
      const headers = {};
      if (isForm) {
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        headers['Content-Type'] = 'application/json';
      }

      const response = await api.post(`/tenant/maintenance-requests`, payload, { headers });

      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to submit maintenance request' };
    }
  }

  /**
   * Get tenant's maintenance requests (list)
   */
  async getMyMaintenanceRequests(page = 1) {
    try {
      const response = await api.get(`/tenant/maintenance-requests?page=${page}`);

      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to fetch maintenance requests' };
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
      console.error('Error submitting report:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to submit report' };
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
      console.error('Error submitting review:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to submit review' };
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
      console.error('Error fetching tenant reviews:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to fetch reviews' };
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
      console.error('Error updating review:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to update review' };
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
      console.error('Error deleting review:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to delete review' };
    }
  }

  // --- LANDLORD METHODS ---

  async getTenants(params = {}) {
    try {
      const response = await api.get(`/landlord/tenants`, { params });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching tenants:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to fetch tenants' };
    }
  }

  async getTenantDetails(tenantId) {
    try {
      const response = await api.get(`/landlord/tenants/${tenantId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching tenant details:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to fetch tenant details' };
    }
  }

  async createTenant(tenantData) {
    try {
      const response = await api.post(`/landlord/tenants`, tenantData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error creating tenant:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to create tenant' };
    }
  }

  async updateTenant(tenantId, tenantData) {
    try {
      const response = await api.put(`/landlord/tenants/${tenantId}`, tenantData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error updating tenant:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to update tenant' };
    }
  }

  async deleteTenant(tenantId) {
    try {
      const response = await api.delete(`/landlord/tenants/${tenantId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error deleting tenant:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to delete tenant' };
    }
  }
}

export default new TenantService();
