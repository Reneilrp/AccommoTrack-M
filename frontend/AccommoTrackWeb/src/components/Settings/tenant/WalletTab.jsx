import React from 'react';
import { useUIState } from '../../../contexts/UIStateContext';
import { Wallet } from 'lucide-react';

const WalletTab = () => {
  const { uiState } = useUIState();
  const cachedProfile = uiState.data?.profile;

  const balance = cachedProfile?.wallet_balance !== undefined ? parseFloat(cachedProfile.wallet_balance) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Wallet & Credits</h2>
      </div>

      <div className="mb-8 p-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg border border-green-600 dark:from-green-600 dark:to-emerald-800 text-white flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold mb-1">Available Balance</h3>
          <p className="text-green-100 text-sm">Use this balance for your next payment or invoice.</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black tracking-tight">
            ₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WalletTab;
