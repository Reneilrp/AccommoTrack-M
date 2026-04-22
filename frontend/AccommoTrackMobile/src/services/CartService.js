import api, { normalizeResponse, normalizeError } from './api.js';

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
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error fetching cart:', error);
      return normalizeError(error);
    }
  }

  /**
   * Add item to cart
   * POST /api/cart/items
   */
  async addToCart(payload) {
    try {
      const response = await api.post('/cart/items', payload);
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error adding to cart:', error);
      return normalizeError(error);
    }
  }

  /**
   * Update cart item
   * PUT /api/cart/items/:itemId
   */
  async updateCartItem(itemId, payload) {
    try {
      const response = await api.put(`/cart/items/${itemId}`, payload);
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error updating cart item:', error);
      return normalizeError(error);
    }
  }

  /**
   * Remove item from cart
   * DELETE /api/cart/items/:itemId
   */
  async removeFromCart(itemId) {
    try {
      const response = await api.delete(`/cart/items/${itemId}`);
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error removing from cart:', error);
      return normalizeError(error);
    }
  }

  /**
   * Clear all items from cart
   * DELETE /api/cart/clear
   */
  async clearCart() {
    try {
      const response = await api.delete('/cart/clear');
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error clearing cart:', error);
      return normalizeError(error);
    }
  }

  /**
   * Checkout cart and create bookings
   * POST /api/cart/:cartId/checkout
   */
  async checkout(cartId) {
    try {
      const response = await api.post(`/cart/${cartId}/checkout`);
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error checking out cart:', error);
      return normalizeError(error);
    }
  }
}

export default new CartService();
