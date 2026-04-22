import React, { memo } from 'react';
import { Loader2, Plus, Minus } from 'lucide-react';

const AddonCard = ({ addon, qty, note, onQtyChange, onNoteChange, onRequest, isSubmitting }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <h4 className="font-semibold text-gray-900 dark:text-white">{addon.name}</h4>
          <span className="text-green-600 dark:text-green-400 font-bold text-sm">
            {addon.price ? `₱${Number(addon.price).toLocaleString()}` : 'Free'}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{addon.description || 'No description.'}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <input
          placeholder="Add a note (optional)..."
          value={note}
          onChange={(e) => onNoteChange(addon.id, e.target.value)}
          className="w-full px-4 py-2 mb-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onQtyChange(addon.id, Math.max(1, qty - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Minus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white w-6 text-center">{qty}</span>
            <button
              onClick={() => onQtyChange(addon.id, qty + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          <button
            onClick={() => onRequest(addon)}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(AddonCard);