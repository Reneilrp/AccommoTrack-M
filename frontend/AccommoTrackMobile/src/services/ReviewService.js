import api from './api.js';
import { API_BASE_URL as API_URL } from '../config/index.js';

  /**
   * Get all reviews for a specific property (Public)
   */

  const ReviewService = class {
  async getPropertyReviews(propertyId) {
    try {
      const response = await api.get(`/public/properties/${propertyId}/reviews`);
      return { success: true, data: response.data.reviews || [], summary: response.data.summary || null };
    } catch (error) {
      console.error('Error fetching property reviews:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to fetch reviews' };
    }
  }

  /**
   * Get all reviews for landlord's properties
   */
  async getLandlordReviews() {
    try {
      const response = await api.get(`/landlord/reviews`);
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error('Error fetching landlord reviews:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to fetch reviews' };
    }
  }

  /**
   * Respond to a review
   */
  async respondToReview(reviewId, responseText) {
    try {
      const response = await api.post(
        `/landlord/reviews/${reviewId}/respond`,
        { response: responseText },
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error responding to review:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to submit response' };
    }
  }
}

export default new ReviewService();
