import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import cartService from '../services/cartService';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch cart from backend
  const fetchCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await cartService.getCart();
      if (result.success) {
        setCart(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add item to cart
  const addItem = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await cartService.addToCart(payload);
      if (result.success) {
        await fetchCart();
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchCart]);

  // Update cart item
  const updateItem = useCallback(async (itemId, payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await cartService.updateCartItem(itemId, payload);
      if (result.success) {
        await fetchCart();
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchCart]);

  // Remove item from cart
  const removeItem = useCallback(async (itemId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await cartService.removeFromCart(itemId);
      if (result.success) {
        await fetchCart();
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchCart]);

  // Clear cart
  const clearCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await cartService.clearCart();
      if (result.success) {
        setCart(null);
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Checkout cart
  const checkout = useCallback(async () => {
    if (!cart?.id) {
      return { success: false, error: 'No active cart' };
    }

    setLoading(true);
    setError(null);
    try {
      const result = await cartService.checkout(cart.id);
      if (result.success) {
        setCart(null);
        return { success: true, data: result.data };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [cart?.id]);

  // Get cart item count
  const getItemCount = useCallback(() => {
    return cart?.items?.length || 0;
  }, [cart]);

  // Get total bed count
  const getTotalBedCount = useCallback(() => {
    return cart?.items?.reduce((sum, item) => sum + (item.bed_count || 0), 0) || 0;
  }, [cart]);

  // Get total price
  const getTotalPrice = useCallback(() => {
    return cart?.items?.reduce((sum, item) => sum + parseFloat(item.price_snapshot || 0), 0) || 0;
  }, [cart]);

  // Check if cart is expired
  const isExpired = useCallback(() => {
    if (!cart?.expires_at) return false;
    return new Date(cart.expires_at) < new Date();
  }, [cart]);

  // Get time until expiration
  const getTimeUntilExpiration = useCallback(() => {
    if (!cart?.expires_at) return null;
    const expiresAt = new Date(cart.expires_at);
    const now = new Date();
    const diff = expiresAt - now;
    return diff > 0 ? diff : 0;
  }, [cart]);

  // Auto-fetch cart on mount
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      fetchCart();
    }
  }, [fetchCart]);

  // Auto-refresh cart on window focus
  useEffect(() => {
    const handleFocus = () => {
      const userData = localStorage.getItem('userData');
      if (userData) {
        fetchCart();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchCart]);

  const value = {
    cart,
    loading,
    error,
    fetchCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    checkout,
    getItemCount,
    getTotalBedCount,
    getTotalPrice,
    isExpired,
    getTimeUntilExpiration,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
