import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, FileDown } from 'lucide-react';
import paymentService from '../../services/paymentService';
import { useUIState } from '../../contexts/UIStateContext';
import TransactionLogTable from './components/Payments/TransactionLogTable';
import { showError } from '../../utils/toast';

export default function TenantPaymentLogs() {
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.tenant_payment_logs;

  const [logs, setLogs] = useState(cachedData?.logs || []);
  const [loading, setLoading] = useState(!cachedData);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await paymentService.getTransactionLog();
    if (res.success) {
      setLogs(res.data.items || res.data || []);
      updateData('tenant_payment_logs', { logs: res.data });
    } else {
      showError('Failed to load transaction history');
    }
    setLoading(false);
  }, [updateData]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleDownload = (id) => {
    const url = paymentService.getReceiptUrl(id);
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Payment History</h1>
           <p className="text-sm font-medium text-gray-500">Review your past transactions and download receipts.</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all">
             <FileDown className="w-4 h-4" /> Export CSV
           </button>
           <button onClick={fetchLogs} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <TransactionLogTable 
        logs={logs} 
        onDownload={handleDownload}
        loading={loading}
      />
    </div>
  );
}