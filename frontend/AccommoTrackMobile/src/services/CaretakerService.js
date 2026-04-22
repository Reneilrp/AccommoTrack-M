import api, { normalizeResponse, normalizeError } from './api.js';

const normalizeLandlordProperties = (properties) => {
  if (!Array.isArray(properties)) {
    return [];
  }

  return properties
    .map((property) => {
      if (!property || typeof property !== 'object') {
        return null;
      }

      const id = property.id ?? property.property_id;
      if (id === null || id === undefined) {
        return null;
      }

      return {
        ...property,
        id,
        name: property.name || property.title || 'Unnamed Property',
      };
    })
    .filter(Boolean);
};

class CaretakerService {

  /**
   * Get all caretakers
   */
  async getCaretakers() {
    try {
      const response = await api.get(`/landlord/caretakers`);
      const { data: payload } = normalizeResponse(response);
      const caretakers = Array.isArray(payload?.caretakers) ? payload.caretakers : [];

      let landlordProperties;
      if (Array.isArray(payload?.landlord_properties)) {
        landlordProperties = normalizeLandlordProperties(payload.landlord_properties);
      } else {
        const propertiesResponse = await api.get(`/landlord/properties`);
        const { data: propertiesPayload } = normalizeResponse(propertiesResponse);
        landlordProperties = normalizeLandlordProperties(propertiesPayload);
      }

      return {
        success: true,
        data: {
          ...payload,
          caretakers,
          landlord_properties: landlordProperties,
        },
        error: null
      };
    } catch (error) {
      console.error('Error fetching caretakers:', error);
      return normalizeError(error);
    }
  }

  /**
   * Create a new caretaker
   */
  async createCaretaker(data) {
    try {
      const response = await api.post(`/landlord/caretakers`, data);
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error creating caretaker:', error);
      return normalizeError(error);
    }
  }

  /**
   * Update caretaker permissions/properties
   */
  async updateCaretaker(assignmentId, data) {
    try {
      const response = await api.patch(`/landlord/caretakers/${assignmentId}`, data);
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error updating caretaker:', error);
      return normalizeError(error);
    }
  }

  /**
   * Revoke/Delete caretaker
   */
  async deleteCaretaker(assignmentId) {
    try {
      const response = await api.delete(`/landlord/caretakers/${assignmentId}`);
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error deleting caretaker:', error);
      return normalizeError(error);
    }
  }

  /**
   * Reset caretaker password
   */
  async resetPassword(assignmentId) {
    try {
      const response = await api.post(`/landlord/caretakers/${assignmentId}/reset-password`, {});
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error resetting password:', error);
      return normalizeError(error);
    }
  }
}

export default new CaretakerService();
