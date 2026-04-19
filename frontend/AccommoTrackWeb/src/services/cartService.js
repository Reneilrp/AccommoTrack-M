import api from '../utils/api';

const cartService = {
  /**
   * Get or create active cart for authenticated user
   * GET /api/cart
   */
  async getCart(propertyId = null) {
    try {
      const res = await api.get('/cart', {
        params: propertyId ? { property_id: propertyId } : {}
      });
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Add item to cart
   * POST /api/cart/items
   */
  async addToCart(payload) {
    try {
      const res = await api.post('/cart/items', payload);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.message,
        details: err.response?.data?.errors || null,
        errors: err.response?.data?.errors || null,
      };
    }
  },

  /**
   * Update cart item
   * PUT /api/cart/items/:itemId
   */
  async updateCartItem(itemId, payload) {
    try {
      const res = await api.put(`/cart/items/${itemId}`, payload);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Remove item from cart
   * DELETE /api/cart/items/:itemId
   */
  async removeFromCart(itemId) {
    try {
      const res = await api.delete(`/cart/items/${itemId}`);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Clear all items from cart
   * DELETE /api/cart/clear
   */
  async clearCart() {
    try {
      const res = await api.delete('/cart/clear');
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Checkout cart and create bookings
   * POST /api/cart/:cartId/checkout
   */
  async checkout(cartId) {
    try {
      const res = await api.post(`/cart/${cartId}/checkout`);
      return { success: true, data: res.data?.data || res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },
};

export default cartService;
