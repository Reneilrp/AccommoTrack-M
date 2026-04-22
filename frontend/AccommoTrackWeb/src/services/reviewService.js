import api from '../utils/api';

export const reviewService = {
    /**
     * Helper to normalize Laravel paginated and non-paginated responses
     */
    normalizePaginatedResponse(payload) {
        if (payload && payload.data && Array.isArray(payload.data)) {
            return {
                items: payload.data,
                pagination: {
                    currentPage: payload.current_page,
                    lastPage: payload.last_page,
                    perPage: payload.per_page,
                    total: payload.total,
                    hasMorePages: payload.current_page < payload.last_page
                }
            };
        }
        return {
            items: Array.isArray(payload) ? payload : (payload?.data || []),
            pagination: null
        };
    },

    /**
     * Get reviews for a property (Public)
     * @param {number} propertyId 
     * @param {object} params - {page, per_page}
     */
    async getPropertyReviews(propertyId, params = {}) {
        try {
            const response = await api.get(`/public/properties/${propertyId}/reviews`, { params });
            return { 
                success: true, 
                data: this.normalizePaginatedResponse(response.data) 
            };
        } catch (error) {
            console.error('Error fetching property reviews:', error);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Submit a review for a completed booking (Tenant)
     */
    async submitReview(reviewData) {
        try {
            const response = await api.post('/tenant/reviews', reviewData);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error submitting review:', error);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Get tenant's own reviews
     */
    async getMyReviews(params = {}) {
        try {
            const response = await api.get('/tenant/reviews', { params });
            return { 
                success: true, 
                data: this.normalizePaginatedResponse(response.data) 
            };
        } catch (error) {
            console.error('Error fetching my reviews:', error);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Get reviews for landlord's properties (Landlord)
     */
    async getLandlordReviews(params = {}) {
        try {
            const response = await api.get('/landlord/reviews', { params });
            return { 
                success: true, 
                data: this.normalizePaginatedResponse(response.data) 
            };
        } catch (error) {
            console.error('Error fetching landlord reviews:', error);
            return { success: false, error: error.response?.data?.message || error.message };
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
            return { success: true, data: result.data?.data || result.data };
        } catch (error) {
            console.error('Error responding to review:', error);
            return { success: false, error: error.response?.data?.message || error.message };
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
