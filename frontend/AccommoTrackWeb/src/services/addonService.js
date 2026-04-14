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
      return response.data;
    } catch (error) {
      console.error("Error fetching property addons:", error);
      throw error;
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
      return response.data;
    } catch (error) {
      console.error("Error creating addon:", error);
      throw error;
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
      return response.data;
    } catch (error) {
      console.error("Error updating addon:", error);
      throw error;
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
      return response.data;
    } catch (error) {
      console.error("Error deleting addon:", error);
      throw error;
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
      return response.data;
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      throw error;
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
      return response.data;
    } catch (error) {
      console.error("Error fetching active addons:", error);
      throw error;
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
      return response.data;
    } catch (error) {
      console.error("Error handling addon request:", error);
      throw error;
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
      return response.data;
    } catch (error) {
      console.error("Error updating active addon price:", error);
      throw error;
    }
  },
};
