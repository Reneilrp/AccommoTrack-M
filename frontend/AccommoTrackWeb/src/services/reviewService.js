import api from '../utils/api';

export const reviewService = {
    /**
     * Get reviews for a property (Public)
     * @param {number} propertyId 
     */
    async getPropertyReviews(propertyId) {
        try {
            const response = await api.get(`/public/properties/${propertyId}/reviews`);
            return response.data;
        } catch (error) {
            console.error('Error fetching property reviews:', error);
            throw error;
        }
    },

    /**
     * Submit a review for a completed booking (Tenant)
     * @param {object} reviewData - { booking_id, rating, comment, cleanliness_rating, location_rating, value_rating, communication_rating }
     */
    async submitReview(reviewData) {
        try {
            const response = await api.post('/tenant/reviews', reviewData);
            return response.data;
        } catch (error) {
            console.error('Error submitting review:', error);
            throw error;
        }
    },

    /**
     * Get tenant's own reviews
     */
    async getMyReviews() {
        try {
            const response = await api.get('/tenant/reviews');
            return response.data;
        } catch (error) {
            console.error('Error fetching my reviews:', error);
            throw error;
        }
    },

    /**
     * Get reviews for landlord's properties (Landlord)
     */
    async getLandlordReviews() {
        try {
            const response = await api.get('/landlord/reviews');
            return response.data;
        } catch (error) {
            console.error('Error fetching landlord reviews:', error);
            throw error;
        }
    },

    /**
     * Respond to a review (Landlord)
     * @param {number} reviewId 
     * @param {string} response 
     */
    async respondToReview(reviewId, response) {
        try {
            const result = await api.post(`/landlord/reviews/${reviewId}/respond`, {
                response: response
            });
            return result.data;
        } catch (error) {
            console.error('Error responding to review:', error);
            throw error;
        }
    },

    /**
     * Format rating to stars display
     * @param {number} rating 
     */
    formatRating(rating) {
        return rating ? rating.toFixed(1) : 'N/A';
    },

    /**
     * Get rating color class based on rating value
     * @param {number} rating 
     */
    getRatingColor(rating) {
        if (rating >= 4.5) return 'text-green-600 bg-green-100';
        if (rating >= 4.0) return 'text-blue-600 bg-blue-100';
        if (rating >= 3.0) return 'text-yellow-600 bg-yellow-100';
        if (rating >= 2.0) return 'text-orange-600 bg-orange-100';
        return 'text-red-600 bg-red-100';
    }
};

export default reviewService;
