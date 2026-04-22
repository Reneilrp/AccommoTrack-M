import React, { useState, memo } from 'react';
import { X, Loader2, RotateCcw, AlertCircle, Info } from 'lucide-react';

const RefundModal = ({ isOpen, onClose, payment, onSubmit, submitting, formatDate }) => {
  const [refundAmount, setRefundAmount] = useState(payment?.total_amount || 0);
  const [reason, setRefundReason] = useState('');

  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Issue Refund</h3>
              <p className="text-xs text-gray-500 mt-1">Inv #{payment.invoice_number || payment.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-800/30 flex gap-3">
            <Info className="w-5 h-5 text-purple-600 shrink-0" />
            <div className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
              <p>Total Paid: <strong>₱{Number(payment.total_amount).toLocaleString()}</strong></p>
              <p>Processed on: {formatDate(payment.created_at)}</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Refund Amount (₱)</label>
            <input
              type="number"
              max={payment.total_amount}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 dark:text-white font-bold text-lg"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Reason for Refund</label>
            <textarea
              value={reason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
              placeholder="e.g. Overpayment, booking cancellation..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 dark:text-white resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
          <button
            onClick={() => onSubmit({ amount: refundAmount, reason })}
            disabled={submitting || !refundAmount || !reason.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
            Confirm Refund
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(RefundModal);