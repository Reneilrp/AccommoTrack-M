import React, { useState } from 'react';
import { X, Trash2, BookOpen, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '../../utils/toast';
import { useCart } from '../../contexts/CartContext';
import { getImageUrl } from '../../utils/api';

export default function CartDrawer({ isOpen, onClose, onEditItem }) {
  const {
    cart,
    loading,
    staleItemIds,
    removeItem,
    updateItem,
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
  
  // Graceful Redirect States
  const [collisionData, setCollisionData] = useState(null);

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

  const handleCheckout = async () => {
    if (staleItemIds.size > 0) {
      showError('Unavailable Rooms', 'Please remove or change the sold-out rooms before proceeding.');
      return;
    }

    setCheckingOut(true);
    const res = await checkout();
    
    if (res.success) {
      showSuccess('Your bookings have been created successfully!');
      onClose();
      navigate('/bookings');
    } else {
      // HANDLE GRACEFUL REDIRECT DATA
      if (res.error?.includes('room_full') || res.errors?.general?.[0]?.includes('room_full')) {
         try {
           // The backend sends a JSON string in the error message
           const errorData = JSON.parse(res.error || res.errors?.general?.[0]);
           setCollisionData(errorData);
         } catch (_e) {
           showError('Room no longer available. Please refresh your cart.');
         }
      } else {
        showError(res.error || 'Failed to complete checkout');
      }
    }
    setCheckingOut(false);
  };

  const handleSwapRoom = async (oldItemId, newRoomId) => {
    // 1. Get existing item details
    const oldItem = cart.items.find(i => i.id === oldItemId);
    if (!oldItem) return;

    // 2. Prepare payload for update
    const payload = {
      room_id: newRoomId,
      start_date: oldItem.start_date,
      end_date: oldItem.end_date,
      bed_count: oldItem.bed_count,
    };

    const res = await updateItem(oldItemId, payload);
    if (res.success) {
      showSuccess('Room swapped successfully!');
      setCollisionData(null);
    } else {
      showError(res.error || 'Failed to swap room');
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('Are you sure you want to remove all items from your book?')) return;
    const res = await clearCart();
    if (!res.success) showError(res.error || 'Failed to clear selection');
    else showSuccess('Selection cleared');
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

  const hasStaleItems = staleItemIds.size > 0;

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
            <BookOpen className="w-5 h-5 text-gray-700 dark:text-gray-300" />
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

        {hasStaleItems && (
          <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/30 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              Some rooms in your book are no longer available. Please remove them to proceed.
            </p>
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
              <BookOpen className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
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
              {cart.items.map((item) => {
                const isStale = staleItemIds.has(item.id);
                return (
                  <div 
                    key={item.id} 
                    className={`bg-white dark:bg-gray-800 rounded-xl border overflow-hidden shadow-sm transition-all ${isStale ? 'border-red-300 dark:border-red-900 ring-2 ring-red-500/10' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <div className="relative">
                      <img
                        src={getImageUrl(item.room?.property?.image || item.room?.property?.images?.[0]?.image_url || item.room?.image) || 'https://via.placeholder.com/400x200?text=No+Image'}
                        alt="Property"
                        className={`w-full h-32 object-cover ${isStale ? 'grayscale opacity-60' : ''}`}
                      />
                      {isStale && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-900/40 backdrop-blur-[2px]">
                           <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg border border-red-400">
                             Sold Out
                           </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {item.room?.property?.title || 'Property'}
                      </h3>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Room {item.room?.room_number || 'N/A'}
                        </p>
                        {isStale && (
                           <span className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1">
                             <AlertTriangle className="w-3 h-3" /> UNAVAILABLE
                           </span>
                        )}
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        {item.occupants?.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Beds</span>
                            <span className="font-medium text-gray-900 dark:text-white">{item.bed_numbers ? item.bed_numbers.split(',').map(n => `Bed ${n}`).join(', ') : item.bed_count}</span>
                          </div>
                        )}
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

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => {
                            onClose();
                            if (onEditItem) onEditItem(item);
                          }}
                          disabled={isStale}
                          className="flex-1 flex items-center justify-center gap-2 py-2 border border-green-600 dark:border-green-500 text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors text-sm font-medium disabled:opacity-30 disabled:grayscale"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={removingItemId === item.id}
                          className="flex-1 flex items-center justify-center gap-2 py-2 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {removingItemId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          {removingItemId === item.id ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart && cart.items?.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="space-y-2 mb-4">
              {cart.items.some(item => item.occupants?.length > 0) && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Total Beds</span>
                  <span className="font-medium text-gray-900 dark:text-white">{getTotalBedCount()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(getTotalPrice())}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkingOut || isExpired() || hasStaleItems}
              className="w-full flex justify-center items-center py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold shadow-lg shadow-green-500/20"
            >
              {checkingOut ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {checkingOut ? 'Creating Bookings...' : 'Confirm and Pay'}
            </button>
          </div>
        )}
      </div>

      {/* GRACEFUL REDIRECT MODAL */}
      {collisionData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCollisionData(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <AlertTriangle className="w-8 h-8" />
              <h2 className="text-xl font-bold dark:text-white">Room {collisionData.room_number} was just taken!</h2>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              So close! While you were checking out, another tenant successfully reserved the last spot in Room {collisionData.room_number}. Don't worry, your information is saved.
            </p>

            {collisionData.alternatives?.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Suggested Alternatives:</p>
                <div className="grid gap-3">
                  {collisionData.alternatives.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => handleSwapRoom(cart.items.find(i => i.room?.room_number === collisionData.room_number)?.id, room.id)}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group text-left"
                    >
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">Room {room.room_number}</p>
                        <p className="text-xs text-gray-500">Similar price and type</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">₱{room.rate.toLocaleString()}</span>
                        <RefreshCw className="w-4 h-4 text-gray-400 group-hover:rotate-180 transition-transform duration-500" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/50">
                No similar rooms are currently available in this property.
              </p>
            )}

            <button
              onClick={() => setCollisionData(null)}
              className="mt-8 w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
            >
              Cancel and review my book
            </button>
          </div>
        </div>
      )}
    </>
  );
}
