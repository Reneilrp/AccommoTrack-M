import React, { useState, memo } from 'react';
import { X, Loader2, PhilippinePeso, Calendar, FileText } from 'lucide-react';

const RecordManualPaymentModal = ({ isOpen, onClose, invoice, onSubmit, submitting }) => {
  const [data, setData] = useState({
    amount: invoice?.total_amount || 0,
    payment_method: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: ''
  });

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <PhilippinePeso className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Record Payment</h3>
              <p className="text-xs text-gray-500 mt-1">Manual entry for Inv #{invoice.invoice_number || invoice.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Amount Paid (₱) *</label>
              <input
                type="number"
                value={data.amount}
                onChange={(e) => setData({ ...data, amount: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Method *</label>
              <select
                value={data.payment_method}
                onChange={(e) => setData({ ...data, payment_method: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
              >
                <option value="Cash">Cash</option>
                <option value="GCash">GCash (Direct)</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Check">Check</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Date *</label>
            <input
              type="date"
              value={data.payment_date}
              onChange={(e) => setData({ ...data, payment_date: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Reference / OR Number</label>
            <input
              type="text"
              value={data.reference_number}
              onChange={(e) => setData({ ...data, reference_number: e.target.value })}
              placeholder="e.g. OR-12345"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Notes</label>
            <textarea
              value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
              rows={2}
              placeholder="Internal notes about this payment..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
          <button
            onClick={() => onSubmit(data)}
            disabled={submitting || !data.amount || !data.payment_date}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <PhilippinePeso className="w-5 h-5" />}
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(RecordManualPaymentModal);