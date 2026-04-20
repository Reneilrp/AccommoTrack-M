import React, { useState, useEffect } from 'react';
import { useUIState } from '../../../contexts/UIStateContext';
import { Wallet, History, ArrowUpRight, ArrowDownLeft, Clock, AlertCircle } from 'lucide-react';
import paymentService from '../../../services/paymentService';

const WalletTab = () => {
  const { uiState } = useUIState();
  const cachedProfile = uiState.data?.profile;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const balance = cachedProfile?.wallet_balance !== undefined ? parseFloat(cachedProfile.wallet_balance) : 0;

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const res = await paymentService.getWalletLogs();
      if (res.success) {
        setLogs(res.data?.data || []);
      } else {
        setError(res.error);
      }
      setLoading(false);
    };

    fetchLogs();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Balance Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-green-500/5 border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-green-500/10">
        <div className="bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 p-8 text-white relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-4 -top-4 w-32 h-32 bg-green-400/20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md border border-white/30">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold tracking-tight uppercase">My Wallet & Credits</h2>
              </div>
              <p className="text-green-50 text-sm leading-relaxed max-w-md opacity-90">
                Credits are automatically applied to your invoices. Track your balance and adjustments here.
              </p>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-green-200 text-xs font-bold uppercase tracking-widest mb-1">Available Balance</p>
              <div className="flex items-baseline gap-1 justify-center md:justify-end">
                <span className="text-4xl font-black tracking-tighter">
                  ₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-8 py-4 bg-gray-50/50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <AlertCircle className="w-3.5 h-3.5 text-green-500" />
              Credits are strictly derived from transfer adjustments & refunds.
            </div>
            <div className="flex items-center gap-2 text-[10px] font-medium text-amber-600 dark:text-amber-400 italic">
              <AlertCircle className="w-3 h-3" />
              Note: This balance is the total across all properties. Credits are property-specific and can only be applied to invoices within the property where they were earned.
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden self-start">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-sm">Transaction History</h3>
          </div>
          {logs.length > 0 && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-bold rounded-md">
              {logs.length} Total
            </span>
          )}
        </div>

        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4 opacity-20" />
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-200 dark:text-gray-700" />
              </div>
              <h4 className="text-gray-900 dark:text-white font-bold mb-1">No Transactions</h4>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
                Any credit or debit adjustments to your wallet will appear here.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const isDebit = log.type === 'debit';
              const logAmountCents = Number(log.amount_cents || 0);
              return (
                <div key={log.id} className="px-6 py-5 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors group">
                  <div className="flex items-center gap-4">
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                        <p className="font-bold text-gray-900 dark:text-white truncate">
                          {log.description || (isDebit ? 'Wallet Usage' : 'Credit Adjustment')}
                        </p>
                        <p className={`text-lg font-black shrink-0 ${isDebit ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                          {isDebit ? '-' : '+'} ₱{(logAmountCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.created_at)}
                        </div>
                        {log.property?.title && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium border-l border-gray-200 dark:border-gray-700 pl-3">
                            <span className="uppercase tracking-tight opacity-70">Property:</span>
                            <span className="text-gray-700 dark:text-gray-300 font-bold truncate max-w-[120px]">{log.property.title}</span>
                          </div>
                        )}
                        {log.room?.room_number && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium border-l border-gray-200 dark:border-gray-700 pl-3">
                            <span className="uppercase tracking-tight opacity-70">Room:</span>
                            <span className="text-gray-700 dark:text-gray-300 font-bold">{log.room.room_number}</span>
                          </div>
                        )}
                        {log.invoice?.invoice_number && (
                          <div className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-bold border-l border-gray-200 dark:border-gray-700 pl-3">
                            <span className="uppercase tracking-tight opacity-70">Inv #:</span>
                            <span>{log.invoice.invoice_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletTab;
