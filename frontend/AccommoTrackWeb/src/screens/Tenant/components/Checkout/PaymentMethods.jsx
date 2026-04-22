import React, { memo } from 'react';
import { CreditCard, Wallet, Landmark, Loader2 } from 'lucide-react';

const PaymentMethods = ({ onSelect, processing, disabled, paymongoDisabled, gcashDisabled }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Choose Payment Method</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GCash Direct */}
        <button
          onClick={() => onSelect('gcash_manual')}
          disabled={processing || disabled || gcashDisabled}
          className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 hover:border-green-500 transition-all text-left shadow-sm group disabled:opacity-50"
        >
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-100 transition-colors">
            <Wallet className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">GCash Direct</p>
            <p className="text-[10px] text-gray-500 uppercase font-medium">Manual Verification</p>
          </div>
        </button>

        {/* Online Payment */}
        <button
          onClick={() => onSelect('paymongo')}
          disabled={processing || disabled || paymongoDisabled}
          className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 hover:border-green-500 transition-all text-left shadow-sm group disabled:opacity-50"
        >
          <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl group-hover:bg-purple-100 transition-colors">
            <CreditCard className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Online Payment</p>
            <p className="text-[10px] text-gray-500 uppercase font-medium">Cards, Maya, GCash API</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default memo(PaymentMethods);