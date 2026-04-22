import React, { memo } from 'react';
import { Calendar, DollarSign, Info } from 'lucide-react';

const PaymentDatesStep = ({ data, onDataChange, roomPrice }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-600" />
          Dates & Payments
        </h3>
        <p className="text-sm text-gray-500">Set the stay period and financial terms.</p>
      </div>

      <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/30 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-green-600" />
          <span className="text-sm font-bold text-green-800 dark:text-green-300">Monthly Rent:</span>
        </div>
        <span className="text-lg font-black text-green-600">₱{Number(roomPrice || 0).toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">Check-in Date *</label>
          <input
            type="date"
            value={data.start_date}
            onChange={(e) => onDataChange('start_date', e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">Initial End Date</label>
          <input
            type="date"
            value={data.end_date}
            onChange={(e) => onDataChange('end_date', e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 transition-colors">
          <input 
            type="checkbox" 
            checked={data.require_deposit}
            onChange={(e) => onDataChange('require_deposit', e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-tight">Require Security Deposit</p>
            <p className="text-[10px] text-gray-500">Collect a security deposit alongside the first payment.</p>
          </div>
        </label>

        {data.require_deposit && (
          <div className="pl-8 animate-in slide-in-from-left-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Deposit Amount (₱)</label>
            <input
              type="number"
              value={data.deposit_amount}
              onChange={(e) => onDataChange('deposit_amount', e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white font-bold"
              placeholder="0.00"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
        <Info className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-tight">
          Creating a manual booking will automatically generate a pending invoice for the tenant and block the bed in the system.
        </p>
      </div>
    </div>
  );
};

export default memo(PaymentDatesStep);