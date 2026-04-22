import React, { memo } from 'react';

const PricingStep = ({ data, onChange, errors }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Pricing & Availability</h3>
        <p className="text-sm text-gray-500">Set the costs and fees associated with this room.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Base Price (₱) *</label>
          <input
            type="number"
            min="0"
            value={data.price}
            onChange={(e) => onChange('price', e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${errors.price ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all font-bold text-lg`}
            placeholder="0.00"
          />
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
          <p className="text-[10px] text-gray-500 mt-1 uppercase">Price per month (or per day if transient)</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Security Deposit (₱)</label>
          <input
            type="number"
            min="0"
            value={data.security_deposit}
            onChange={(e) => onChange('security_deposit', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Reservation Fee (₱)</label>
          <input
            type="number"
            min="0"
            value={data.reservation_fee}
            onChange={(e) => onChange('reservation_fee', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Initial Room Status</label>
          <select
            value={data.status}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
          >
            <option value="available">Available</option>
            <option value="maintenance">Under Maintenance</option>
            <option value="inactive">Inactive/Draft</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default memo(PricingStep);