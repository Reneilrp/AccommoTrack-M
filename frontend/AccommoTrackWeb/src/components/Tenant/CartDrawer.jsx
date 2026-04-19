import React, { useState } from 'react';
import { X, Trash2, ShoppingCart, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '../../utils/toast';
import { useCart } from '../../contexts/CartContext';
import { getImageUrl } from '../../utils/api';

export default function CartDrawer({ isOpen, onClose }) {
  const {
    cart,
    loading,
    removeItem,
    clearCart,
    checkout,
    getItemCount,
    getTotalBedCount,
    getTotalPrice,
    isExpired,
  } = useCart();

  const navigate = useNavigate();
  const [removingItemId, setRemovingItemId] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const handleRemoveItem = async (itemId) => {
    setRemovingItemId(itemId);
    const res = await removeItem(itemId);
    if (!res.success) {
      showError(res.error || 'Failed to remove item');
    } else {
      showSuccess('Item removed');
    }
    setRemovingItemId(null);
  };

  const handleClearCart = async () => {
    if (!window.confirm('Are you sure you want to remove all items from your book?')) return;
    const res = await clearCart();
    if (!res.success) showError(res.error || 'Failed to clear selection');
    else showSuccess('Selection cleared');
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    const res = await checkout();
    if (res.success) {
      showSuccess('Your bookings have been created successfully!');
      onClose();
      navigate('/bookings');
    } else {
      showError(res.error || 'Failed to complete checkout');
    }
    setCheckingOut(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-gray-800 shadow-xl flex flex-col transition-transform transform translate-x-0 border-l border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add to Book ({getItemCount()})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isExpired() && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800/30">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">⚠️ Selection expired. Please refresh.</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {loading && !cart ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-green-600" />
              <p>Loading selection...</p>
            </div>
          ) : !cart || !cart.items || cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center px-4">
              <ShoppingCart className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Your book is empty</p>
              <p className="text-sm">Browse properties and add rooms to your book to book multiple rooms at once.</p>
              <button
                onClick={() => { onClose(); navigate('/explore'); }}
                className="mt-6 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                Browse Properties
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={handleClearCart}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                >
                  Clear All
                </button>
              </div>
              {cart.items.map((item) => (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  <img
                    src={getImageUrl(item.room?.property?.image || item.room?.property?.images?.[0]?.image_url || item.room?.image) || 'https://via.placeholder.com/400x200?text=No+Image'}
                    alt="Property"
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {item.room?.property?.title || 'Property'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Room {item.room?.room_number || 'N/A'}
                    </p>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Beds</span>
                        <span className="font-medium text-gray-900 dark:text-white">{item.bed_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Check-in</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatDate(item.start_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Check-out</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatDate(item.end_date)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                        <span className="text-gray-500 dark:text-gray-400 font-medium mt-1">Price</span>
                        <span className="font-bold text-lg text-green-600 dark:text-green-400">{formatCurrency(item.price_snapshot)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={removingItemId === item.id}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-2 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {removingItemId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {removingItemId === item.id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart && cart.items?.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total Beds</span>
                <span className="font-medium text-gray-900 dark:text-white">{getTotalBedCount()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(getTotalPrice())}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkingOut || isExpired()}
              className="w-full flex justify-center items-center py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {checkingOut ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {checkingOut ? 'Processing...' : 'Proceed to Checkout'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
