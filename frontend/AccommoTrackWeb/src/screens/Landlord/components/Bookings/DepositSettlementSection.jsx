import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';

const DepositSettlementSection = ({ 
  booking, 
  form, 
  onInputChange, 
  onSettle, 
  submitting, 
  history, 
  loadingHistory, 
  canApprove,
  formatDate 
}) => {
  if (!booking || !['confirmed', 'active', 'completed'].includes(booking.status)) {
    return (
      <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">Deposit Settlement</p>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Deposit settlement is available after the booking is confirmed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 border-t border-gray-100 dark:border-gray-700 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Deposit Settlement</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Current Balance: <span className="font-bold text-gray-900 dark:text-white">₱{Number(booking.deposit_balance || 0).toLocaleString()}</span>
          </p>
        </div>
      </div>

      {canApprove ? (
        <div className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/70 dark:bg-gray-700/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Damage Fee</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.damageFee}
                onChange={(e) => onInputChange('damageFee', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-800 dark:text-white"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Cleaning Fee</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cleaningFee}
                onChange={(e) => onInputChange('cleaningFee', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-800 dark:text-white"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Other Fee</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.otherFee}
                onChange={(e) => onInputChange('otherFee', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-800 dark:text-white"
                placeholder="0.00"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={form.markRefunded}
              onChange={(e) => onInputChange('markRefunded', e.target.checked)}
              className="w-4 h-4"
            />
            Mark remaining balance as refunded
          </label>

          {form.markRefunded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Refund Method</label>
                <input
                  type="text"
                  value={form.refundMethod}
                  onChange={(e) => onInputChange('refundMethod', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-800 dark:text-white"
                  placeholder="Cash, GCash, Bank Transfer"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Refund Reference</label>
                <input
                  type="text"
                  value={form.refundReference}
                  onChange={(e) => onInputChange('refundReference', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-800 dark:text-white"
                  placeholder="Optional reference ID"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Notes</label>
            <textarea
              value={form.note}
              onChange={(e) => onInputChange('note', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-800 dark:text-white resize-none"
              placeholder="Optional summary (damages, refund reason, etc.)"
            />
          </div>

          <button
            onClick={onSettle}
            disabled={submitting}
            className="w-full md:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Record Deposit Settlement
          </button>
        </div>
      ) : (
        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          Deposit settlement requires booking approval permission.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Settlement History</p>
        {loadingHistory ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading settlement history...
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No settlement records yet.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {history.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Deductions ₱{Number(entry.total_deductions || 0).toLocaleString()} • Balance ₱{Number(entry.ending_balance || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(entry.created_at)}</p>
                </div>
                {entry.mark_refunded ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    Refunded via {entry.refund_method || 'N/A'}{entry.refund_reference ? ` • Ref ${entry.refund_reference}` : ''}
                  </p>
                ) : null}
                {entry.note ? <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{entry.note}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(DepositSettlementSection);