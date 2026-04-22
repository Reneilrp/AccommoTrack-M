import React, { memo } from 'react';
import PriceRow from '../../../../components/Shared/PriceRow';

const InvoiceSummary = ({ invoice, addonLines }) => {
  if (!invoice) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
      <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-6">Payment Summary</h2>
      
      <div className="space-y-4">
        {/* Base Rent */}
        <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-700">
           <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Monthly Rent</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase">Room {invoice.room?.room_number}</p>
           </div>
           <PriceRow amount={invoice.total_amount - addonLines.reduce((sum, line) => sum + line.amountCents, 0)} className="font-bold text-gray-900 dark:text-white" />
        </div>

        {/* Addons */}
        {addonLines.map((line) => (
          <div key={line.key} className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-700">
             <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{line.name}</p>
                <p className="text-[10px] text-gray-400 font-medium uppercase">Qty: {line.quantity}</p>
             </div>
             <PriceRow amount={line.amountCents} className="font-bold text-gray-900 dark:text-white" />
          </div>
        ))}

        {/* Total */}
        <div className="flex justify-between items-center pt-6">
           <span className="text-xl font-black text-gray-900 dark:text-white uppercase">Total Due</span>
           <PriceRow amount={invoice.total_amount} className="text-2xl font-black text-green-600" />
        </div>
      </div>
    </div>
  );
};

export default memo(InvoiceSummary);