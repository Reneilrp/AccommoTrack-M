import React, { memo } from 'react';
import { Loader2, Send, Plus } from 'lucide-react';

const CustomAddonForm = ({ 
  show, 
  onShow, 
  onCancel, 
  data, 
  onChange, 
  onSubmit, 
  isSubmitting 
}) => {
  if (!show) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <button
          onClick={onShow}
          className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
        >
          <Plus className="w-5 h-5" /> Request something specific...
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Request</h3>
        <input
          placeholder="Item name (e.g. Desk Lamp)"
          value={data.name}
          onChange={(e) => onChange('name', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
            <select
              value={data.addon_type}
              onChange={(e) => onChange('addon_type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="rental">Rental</option>
              <option value="fee">Usage Fee</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Billing</label>
            <select
              value={data.price_type}
              onChange={(e) => onChange('price_type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="one_time">One-time</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Suggested Price (₱) <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 500"
            value={data.suggested_price}
            onChange={(e) => onChange('suggested_price', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <textarea
          placeholder="Notes for landlord..."
          value={data.note}
          onChange={(e) => onChange('note', e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <div className="flex justify-end gap-4">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!data.name || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(CustomAddonForm);