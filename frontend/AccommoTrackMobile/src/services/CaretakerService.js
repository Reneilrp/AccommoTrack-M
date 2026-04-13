import api from './api.js';
import { extractErrorMessage } from '../utils/error.js';

const unwrapResponseData = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }

  return payload;
};

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
      const payload = unwrapResponseData(response.data) || {};
      const caretakers = Array.isArray(payload?.caretakers) ? payload.caretakers : [];

      let landlordProperties;
      if (Array.isArray(payload?.landlord_properties)) {
        landlordProperties = normalizeLandlordProperties(payload.landlord_properties);
      } else {
        const propertiesResponse = await api.get(`/landlord/properties`);
        const propertiesPayload = unwrapResponseData(propertiesResponse.data);
        landlordProperties = normalizeLandlordProperties(propertiesPayload);
      }

      return {
        success: true,
        data: {
          ...payload,
          caretakers,
          landlord_properties: landlordProperties,
        },
      };
    } catch (error) {
      console.error('Error fetching caretakers:', error);
      return { success: false, error: extractErrorMessage(error) || 'Failed to fetch caretakers' };
    }
  }

  /**
   * Create a new caretaker
   */
  async createCaretaker(data) {
    try {
      const response = await api.post(`/landlord/caretakers`, data);
      return { success: true, data: unwrapResponseData(response.data) };
    } catch (error) {
      console.error('Error creating caretaker:', error);
      return { success: false, error: extractErrorMessage(error) || 'Failed to create caretaker' };
    }
  }

  /**
   * Update caretaker permissions/properties
   */
  async updateCaretaker(assignmentId, data) {
    try {
      const response = await api.patch(`/landlord/caretakers/${assignmentId}`, data);
      return { success: true, data: unwrapResponseData(response.data) };
    } catch (error) {
      console.error('Error updating caretaker:', error);
      return { success: false, error: extractErrorMessage(error) || 'Failed to update caretaker' };
    }
  }

  /**
   * Revoke/Delete caretaker
   */
  async deleteCaretaker(assignmentId) {
    try {
      const response = await api.delete(`/landlord/caretakers/${assignmentId}`);
      return { success: true, data: unwrapResponseData(response.data) };
    } catch (error) {
      console.error('Error deleting caretaker:', error);
      return { success: false, error: extractErrorMessage(error) || 'Failed to delete caretaker' };
    }
  }

  /**
   * Reset caretaker password
   */
  async resetPassword(assignmentId) {
    try {
      const response = await api.post(`/landlord/caretakers/${assignmentId}/reset-password`, {});
      return { success: true, data: unwrapResponseData(response.data) };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: extractErrorMessage(error) || 'Failed to reset password' };
    }
  }
}

export default new CaretakerService();
