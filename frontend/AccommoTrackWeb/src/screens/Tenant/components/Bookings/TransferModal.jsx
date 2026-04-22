import React, { useState, useEffect, useCallback, memo } from 'react';
import { Shuffle, X, Loader2, Info } from 'lucide-react';
import api from '../../../../utils/api';

const TransferModal = ({ isOpen, onClose, onSubmit, booking, isSubmitting }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (isOpen && booking?.property_id) {
      loadOptions();
    }
  }, [isOpen, booking?.property_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOptions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tenant/transfers/options?property_id=${booking.property_id}`);
      setOptions(res.data?.rooms || []);
    } catch (err) {
      console.error('Failed to load transfer options', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = useCallback(async (roomId) => {
    if (!roomId) {
      setPreview(null);
      return;
    }
    setLoadingPreview(true);
    try {
      const res = await api.get(`/tenant/transfers/preview?booking_id=${booking.id}&new_room_id=${roomId}`);
      setPreview(res.data);
    } catch (err) {
      console.error('Failed to load transfer preview', err);
    } finally {
      setLoadingPreview(false);
    }
  }, [booking?.id]);

  useEffect(() => {
    if (selectedRoomId) {
      loadPreview(selectedRoomId);
    }
  }, [selectedRoomId, loadPreview]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
              <Shuffle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Room Transfer</h3>
              <p className="text-sm text-gray-500">Request a move to another room</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>
          ) : options.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No other rooms available for transfer in this property.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Available Rooms</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm dark:text-white"
                >
                  <option value="">Select a room...</option>
                  {options.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.room_number} — {room.room_type} (₱{Number(room.price).toLocaleString()}/mo)
                    </option>
                  ))}
                </select>
              </div>

              {loadingPreview ? (
                <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
              ) : preview && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-sm mb-1">
                    <Info className="w-4 h-4" />
                    Proration Summary
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Current Room Credit:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">₱{Number(preview.unused_credit).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">New Room Charge:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">₱{Number(preview.new_room_charge).toLocaleString()}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-amber-200 dark:border-amber-800 flex justify-between font-bold">
                    <span className="text-amber-900 dark:text-amber-300">{preview.diff >= 0 ? 'To Pay Now:' : 'Refund/Credit:'}</span>
                    <span className={preview.diff >= 0 ? 'text-red-600' : 'text-green-600'}>
                      ₱{Math.abs(preview.diff).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-700 dark:text-amber-500 mt-2 leading-tight">
                    * Final amounts will be calculated on the day of actual transfer approval.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Reason for Transfer</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm dark:text-white resize-none"
                  placeholder="Tell your landlord why you'd like to move rooms..."
                />
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ booking_id: booking.id, new_room_id: selectedRoomId, reason })}
            disabled={isSubmitting || !selectedRoomId || !reason.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
            Request Transfer
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(TransferModal);