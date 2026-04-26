import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import cartService from '../services/cartService';
import { useWebSocket } from './WebSocketContext';
import { showWarning } from '../utils/toast';

const CartContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
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
  const [staleItemIds, setStaleItemIds] = useState(new Set());
  
  const { echo } = useWebSocket();
  const activeSubscriptions = useRef(new Set());

  // Fetch cart from backend
  const fetchCart = useCallback(async (propertyId = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await cartService.getCart(propertyId);
      if (result.success) {
        setCart(result.data);
        // Reset stale items when fetching fresh cart
        setStaleItemIds(new Set());
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for availability updates for rooms in the cart
  useEffect(() => {
    if (!echo || !cart?.items) return;

    // 1. Identify distinct property IDs in the cart to subscribe to channels
    const propertyIds = [...new Set(cart.items.map(item => item.room?.property_id).filter(Boolean))];
    
    // 2. Cleanup old subscriptions that are no longer in cart
    activeSubscriptions.current.forEach(propId => {
      if (!propertyIds.includes(propId)) {
        echo.leave(`property.${propId}`);
        activeSubscriptions.current.delete(propId);
      }
    });

    // 3. Subscribe to new channels
    propertyIds.forEach(propId => {
      if (!activeSubscriptions.current.has(propId)) {
        echo.channel(`property.${propId}`)
          .listen('.room.availability_updated', (event) => {
            const { room_id, available_slots } = event;
            
            // Check if this room is in our cart
            const matchingItems = cart.items.filter(item => item.room_id === room_id);
            
            matchingItems.forEach(item => {
              if (available_slots < item.bed_count) {
                // MARK AS STALE
                setStaleItemIds(prev => {
                  const next = new Set(prev);
                  next.add(item.id);
                  return next;
                });
                
                showWarning(
                  'Room Unavailable',
                  `Room ${item.room?.room_number} is no longer available for the requested slots.`
                );
              } else {
                // If it was stale but now has slots (e.g. someone cancelled), unmark it
                setStaleItemIds(prev => {
                  if (!prev.has(item.id)) return prev;
                  const next = new Set(prev);
                  next.delete(item.id);
                  return next;
                });
              }
            });
          });
        activeSubscriptions.current.add(propId);
      }
    });

    return () => {
      // Don't leave all channels here, wait for unmount or item removal
    };
  }, [echo, cart?.items, staleItemIds]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (echo) {
        activeSubscriptions.current.forEach(propId => {
          echo.leave(`property.${propId}`);
        });
      }
    };
  }, [echo]);

  // ... (rest of cart methods remain similar but may need to check staleItemIds) ...

  // Add item to cart
  const addItem = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await cartService.addToCart(payload);
      if (result.success) {
        await fetchCart();
        window.dispatchEvent(new CustomEvent('accommo:cart-updated'));
        return { success: true };
      } else {
        setError(result.error);
        return {
          success: false,
          error: result.error,
          details: result.details,
          errors: result.errors,
        };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message, details: null, errors: null };
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
        window.dispatchEvent(new CustomEvent('accommo:cart-updated'));
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
        window.dispatchEvent(new CustomEvent('accommo:cart-updated'));
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
        window.dispatchEvent(new CustomEvent('accommo:cart-updated'));
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
        window.dispatchEvent(new CustomEvent('accommo:cart-updated'));
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

    const handleCartUpdated = () => {
      const userData = localStorage.getItem('userData');
      if (userData) {
        fetchCart();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('accommo:cart-updated', handleCartUpdated);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('accommo:cart-updated', handleCartUpdated);
    };
  }, [fetchCart]);

  const value = {
    cart,
    loading,
    error,
    staleItemIds,
    fetchCart,
    addToCart: addItem,
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
