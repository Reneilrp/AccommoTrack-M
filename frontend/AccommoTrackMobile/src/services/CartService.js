import api from './api.js';

class CartService {
  /**
   * Get or create active cart for authenticated user
   * GET /api/cart
   */
  async getCart(propertyId = null) {
    try {
      const response = await api.get('/cart', {
        params: propertyId ? { property_id: propertyId } : {},
      });
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error) {
      console.error('Error fetching cart:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch cart',
      };
    }
  }

  /**
   * Add item to cart
   * POST /api/cart/items
   */
  async addToCart(payload) {
    try {
      const response = await api.post('/cart/items', payload);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add to cart',
        details: error.response?.data?.errors || null,
        errors: error.response?.data?.errors || null,
      };
    }
  }

  /**
   * Update cart item
   * PUT /api/cart/items/:itemId
   */
  async updateCartItem(itemId, payload) {
    try {
      const response = await api.put(`/cart/items/${itemId}`, payload);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error) {
      console.error('Error updating cart item:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update cart item',
      };
    }
  }

  /**
   * Remove item from cart
   * DELETE /api/cart/items/:itemId
   */
  async removeFromCart(itemId) {
    try {
      const response = await api.delete(`/cart/items/${itemId}`);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error) {
      console.error('Error removing from cart:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to remove from cart',
      };
    }
  }

  /**
   * Clear all items from cart
   * DELETE /api/cart/clear
   */
  async clearCart() {
    try {
      const response = await api.delete('/cart/clear');
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to clear cart',
      };
    }
  }

  /**
   * Checkout cart and create bookings
   * POST /api/cart/:cartId/checkout
   */
  async checkout(cartId) {
    try {
      const response = await api.post(`/cart/${cartId}/checkout`);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error) {
      console.error('Error checking out cart:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to checkout cart',
      };
    }
  }
}

export default new CartService();
