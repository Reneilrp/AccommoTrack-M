import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as API_URL } from '../config';

class ReviewService {
  async getAuthToken() {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          if (user?.token) return user.token;
        } catch (e) {}
      }
      const token = await AsyncStorage.getItem('token');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Get all reviews for landlord's properties
   */
  async getLandlordReviews() {
    try {
      const token = await this.getAuthToken();
      if (!token) return { success: false, error: 'Authentication required' };

      const response = await axios.get(`${API_URL}/landlord/reviews`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

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
      const token = await this.getAuthToken();
      if (!token) return { success: false, error: 'Authentication required' };

      const response = await axios.post(
        `${API_URL}/landlord/reviews/${reviewId}/respond`,
        { response: responseText },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error responding to review:', error);
      return { success: false, error: error.response?.data?.message || 'Failed to submit response' };
    }
  }
}

export default new ReviewService();
