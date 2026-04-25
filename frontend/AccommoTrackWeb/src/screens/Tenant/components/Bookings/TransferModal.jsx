import React, { useState, useEffect, useCallback, memo } from 'react';
import { Shuffle, X, Loader2, Info, Calendar, Wallet, CreditCard } from 'lucide-react';
import api from '../../../../utils/api';

const TransferModal = ({ isOpen, onClose, onSubmit, booking, isSubmitting }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // New state fields
  const [leaseDurationPreference, setLeaseDurationPreference] = useState('keep_current');
  const [newEndDate, setNewEndDate] = useState('');
  const [refundPreference, setRefundPreference] = useState('wallet');

  useEffect(() => {
    if (isOpen && booking?.property_id) {
      loadOptions();
    }
  }, [isOpen, booking?.property_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOptions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tenant/transfers/options?booking_id=${booking.id}&property_id=${booking.property_id}`);
      setOptions(res.data?.data || []);
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
      const res = await api.get(`/tenant/transfers/preview?booking_id=${booking.id}&requested_room_id=${roomId}`);
      setPreview(res.data?.data);
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

  const canSubmit = selectedRoomId && reason.trim() && (leaseDurationPreference !== 'new_lease' || newEndDate);

  const handleSubmit = () => {
    const payload = {
      booking_id: booking.id,
      property_id: booking.property_id,
      requested_room_id: selectedRoomId,
      reason,
      refund_preference: refundPreference,
    };
    if (leaseDurationPreference === 'new_lease' && newEndDate) {
      payload.new_end_date = newEndDate;
    }
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
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

        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>
          ) : options.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No other rooms available for transfer in this property.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Select New Room</label>
                <div className="grid gap-2">
                  {options.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        selectedRoomId === room.id 
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                          : 'border-gray-100 dark:border-gray-700 hover:border-amber-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 dark:text-white">Room {room.room_number}</span>
                        <span className="text-amber-600 font-bold">₱{Number(room.price || room.monthly_rate).toLocaleString()}/mo</span>
                      </div>
                      <div className="text-sm text-gray-500">{room.room_type || 'Standard Room'}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lease Duration Preference */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Lease Duration</label>
                <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                  <button
                    onClick={() => setLeaseDurationPreference('keep_current')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                      leaseDurationPreference === 'keep_current' 
                        ? 'bg-white dark:bg-gray-600 text-amber-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Keep Current
                  </button>
                  <button
                    onClick={() => setLeaseDurationPreference('new_lease')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                      leaseDurationPreference === 'new_lease' 
                        ? 'bg-white dark:bg-gray-600 text-amber-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    New Lease
                  </button>
                </div>

                {leaseDurationPreference === 'new_lease' && (
                  <div className="relative">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">New Lease End Date *</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Impact Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">💰 Financial Impact Preview</label>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-amber-500 cursor-help" />
                    <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 leading-relaxed">
                      Rent is prorated based on the actual number of days in your billing cycle. Any transfer processing fee is deducted from your unused credit.
                    </div>
                  </div>
                </div>

                {loadingPreview ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
                ) : preview ? (
                  <div className={`rounded-2xl border-2 overflow-hidden ${
                    preview.suggested_adjustment > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-emerald-100 bg-emerald-50/30'
                  }`}>
                    <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="flex-1 p-3 text-center border-r border-gray-100 dark:border-gray-700">
                        <div className="text-[10px] uppercase font-bold text-gray-400">Current Rate</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">₱{Number(preview.current_room_rate).toLocaleString()}/mo</div>
                      </div>
                      <div className="flex items-center px-2 text-gray-300">→</div>
                      <div className="flex-1 p-3 text-center">
                        <div className="text-[10px] uppercase font-bold text-gray-400">New Rate</div>
                        <div className="text-sm font-bold text-amber-600">₱{Number(preview.new_room_rate).toLocaleString()}/mo</div>
                      </div>
                    </div>

                    <div className="p-4 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Remaining days this cycle</span>
                        <span className="font-bold">{preview.remaining_days} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Old room unused value</span>
                        <span className="font-bold text-emerald-600">₱{Number(preview.old_room_unused_value).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">New room cost (remaining days)</span>
                        <span className="font-bold text-amber-600">₱{Number(preview.new_room_cost).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Transfer Processing Fee</span>
                        <span className="font-bold text-red-500">- ₱{Number(preview.transfer_fee).toLocaleString()}</span>
                      </div>
                      
                      <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {preview.suggested_adjustment > 0 ? 'Estimated Charge:' : 'Net Credit:'}
                          </span>
                          <span className={`text-base font-black ${preview.suggested_adjustment > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            ₱{Math.abs(preview.suggested_adjustment).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 italic">
                          * Final adjustments are applied upon landlord approval.
                        </p>
                      </div>

                      {preview.suggested_adjustment < 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-3">Excess Credit Preference *</label>
                          {preview.force_wallet_refunds ? (
                            <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                              <Wallet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                <strong>Automatic Wallet Credit:</strong> Excess amount will be automatically credited to your tenant wallet upon approval.
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setRefundPreference('wallet')}
                                className={`p-3 rounded-xl border-2 text-left transition-all ${
                                  refundPreference === 'wallet' 
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                                    : 'border-gray-100 dark:border-gray-700'
                                }`}
                              >
                                <Wallet className={`w-4 h-4 mb-2 ${refundPreference === 'wallet' ? 'text-amber-600' : 'text-gray-400'}`} />
                                <div className="font-bold text-[11px]">Wallet Credits</div>
                                <div className="text-[9px] text-gray-400">Fastest processing</div>
                              </button>
                              <button
                                onClick={() => setRefundPreference('cash')}
                                className={`p-3 rounded-xl border-2 text-left transition-all ${
                                  refundPreference === 'cash' 
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                                    : 'border-gray-100 dark:border-gray-700'
                                }`}
                              >
                                <CreditCard className={`w-4 h-4 mb-2 ${refundPreference === 'cash' ? 'text-amber-600' : 'text-gray-400'}`} />
                                <div className="font-bold text-[11px]">Manual Cash</div>
                                <div className="text-[9px] text-gray-400">Requires coordination</div>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedRoomId ? (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-600 text-center text-xs text-gray-500">
                    Select a room to see the financial impact.
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Reason for Transfer</label>
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

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3 bg-gray-50/50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
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