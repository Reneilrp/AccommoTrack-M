import React, { useState, memo } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';

const CancelBookingModal = ({ isOpen, onClose, booking, onConfirm, processing }) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">Cancel Booking</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed font-medium">
              Are you sure you want to cancel this booking for <strong>{booking.tenant_name || 'this tenant'}</strong>? This action will mark the booking as cancelled and potentially trigger refund processes.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Reason for Cancellation *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Tenant request, policy violation, payment failure..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-red-500 dark:text-white resize-none"
              required
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 rounded-xl transition-colors">Go Back</button>
          <button
            onClick={() => onConfirm(booking.id, reason)}
            disabled={processing || !reason.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
          >
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Cancel Booking
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(CancelBookingModal);