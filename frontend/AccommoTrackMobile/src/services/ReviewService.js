import api, { normalizeResponse, normalizeError, normalizePaginatedResponse } from './api.js';

  /**
   * Get all reviews for a specific property (Public)
   */

  const ReviewService = class {
  async getPropertyReviews(propertyId) {
    try {
      const response = await api.get(`/public/properties/${propertyId}/reviews`);
      const res = normalizeResponse(response);
      if (res.success) {
        res.data = response.data?.reviews || [];
        res.summary = response.data?.summary || null;
      }
      return res;
    } catch (error) {
      console.error('Error fetching property reviews:', error);
      return normalizeError(error);
    }
  }

  /**
   * Get all reviews for landlord's properties
   */
  async getLandlordReviews(params = {}) {
    try {
      const response = await api.get(`/landlord/reviews`, { params });
      return {
        success: true,
        data: normalizePaginatedResponse(response),
        error: null
      };
    } catch (error) {
      console.error('Error fetching landlord reviews:', error);
      return normalizeError(error);
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
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error responding to review:', error);
      return normalizeError(error);
    }
  }
}

export default new ReviewService();
