import api from "../utils/api";

export const addonService = {
  /**
   * Get all addons for a property (Landlord)
   */
  async getPropertyAddons(propertyId) {
    try {
      const response = await api.get(
        `/landlord/properties/${propertyId}/addons`,
      );
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error fetching property addons:", error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  /**
   * Create a new addon for a property (Landlord)
   */
  async createAddon(propertyId, addonData) {
    try {
      const response = await api.post(
        `/landlord/properties/${propertyId}/addons`,
        addonData,
      );
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error creating addon:", error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  /**
   * Update an addon (Landlord)
   */
  async updateAddon(propertyId, addonId, addonData) {
    try {
      const response = await api.put(
        `/landlord/properties/${propertyId}/addons/${addonId}`,
        addonData,
      );
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error updating addon:", error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  /**
   * Delete an addon (Landlord)
   */
  async deleteAddon(propertyId, addonId) {
    try {
      const response = await api.delete(
        `/landlord/properties/${propertyId}/addons/${addonId}`,
      );
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error deleting addon:", error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  /**
   * Get pending addon requests for a property (Landlord)
   */
  async getPendingRequests(propertyId) {
    try {
      const response = await api.get(
        `/landlord/properties/${propertyId}/addons/pending`,
      );
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  /**
   * Get active addons across all bookings for a property (Landlord)
   */
  async getActiveAddons(propertyId) {
    try {
      const response = await api.get(
        `/landlord/properties/${propertyId}/addons/active`,
      );
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error fetching active addons:", error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  /**
   * Approve or reject an addon request (Landlord)
   */
  async handleAddonRequest(bookingId, addonId, payload) {
    try {
      const response = await api.patch(
        `/landlord/bookings/${bookingId}/addons/${addonId}`,
        payload,
      );
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error handling addon request:", error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  /**
   * Update price for an active addon (Landlord)
   * Changes will apply to next billing cycle
   */
  async updateActiveAddonPrice(bookingId, addonId, newPrice) {
    try {
      const response = await api.patch(
        `/landlord/bookings/${bookingId}/addons/${addonId}/price`,
        { new_price: newPrice },
      );
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error("Error updating active addon price:", error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },
};

export default addonService;
