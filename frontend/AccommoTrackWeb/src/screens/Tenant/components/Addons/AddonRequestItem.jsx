import React, { memo } from 'react';
import { Loader2, X } from 'lucide-react';

const STATUS_BADGE = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  active: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const AddonRequestItem = ({ request, onCancel, cancelingId }) => {
  const isCanceling = cancelingId === (request.id || request.request_id);

  const resolveAddonRequestPrice = (req) => {
    const candidates = [
      req?.price_at_booking,
      req?.pivot?.price_at_booking,
      req?.addon?.pivot?.price_at_booking,
      req?.price,
      req?.addon?.price,
    ];

    for (const candidate of candidates) {
      const numericValue = Number(candidate);
      if (Number.isFinite(numericValue) && numericValue > 0) {
        return numericValue;
      }
    }
    return 0;
  };

  const requestPrice = resolveAddonRequestPrice(request);

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{request.addon?.name || 'Add-on'}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Qty: {request.quantity || 1} • {requestPrice > 0 ? `₱${requestPrice.toLocaleString()}` : 'Free'}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span className={`px-2.5 py-2 rounded-full text-xs font-semibold uppercase ${STATUS_BADGE[request.status] || STATUS_BADGE.pending}`}>
          {request.status || 'pending'}
        </span>
        {(request.status === 'pending') && (
          <button
            onClick={() => onCancel(request)}
            disabled={isCanceling}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          >
            {isCanceling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          </button>
        )}
        {(request.status === 'active' || request.status === 'approved') && (
          <button
            onClick={() => onCancel(request)}
            disabled={isCanceling}
            title="Cancel for next month"
            className="text-xs px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-700 transition-colors font-semibold"
          >
            {isCanceling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel (Next Month)'}
          </button>
        )}
      </div>
    </div>
  );
};

export default memo(AddonRequestItem);