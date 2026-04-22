import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, CreditCard } from 'lucide-react';
import { tenantService } from '../../services/tenantService';
import paymentService from '../../services/paymentService';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import TenantPaymentTable from './components/Payments/TenantPaymentTable';
import DashboardStats from './components/Dashboard/DashboardStats';
import { Skeleton } from '../../components/Shared/Skeleton';

const TenantPayments = () => {
  const navigate = useNavigate();
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.tenant_payments;

  const [invoices, setInvoices] = useState(cachedData?.invoices || []);
  const [stats, setStats] = useState(cachedData?.stats || null);
  const [loading, setLoading] = useState(!cachedData);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [invRes, statsRes] = await Promise.all([
      paymentService.getPayments('all'),
      tenantService.getDashboardStats()
    ]);

    if (invRes.success) {
      const list = invRes.data?.data || invRes.data || [];
      setInvoices(list);
    }
    if (statsRes.success) setStats(statsRes.data);

    updateData('tenant_payments', { invoices: invRes.data, stats: statsRes.data });
    cacheManager.set('tenant_payments', { invoices: invRes.data, stats: statsRes.data });
    setLoading(false);
  }, [updateData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !stats) {
    return (
      <div className="max-w-7xl mx-auto py-8 space-y-8 animate-pulse">
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-3xl" />
        <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Payments</h1>
           <p className="text-sm font-medium text-gray-500 mt-1">Manage your invoices and rental payments.</p>
        </div>
        <button onClick={fetchData} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <DashboardStats stats={stats} />

      <TenantPaymentTable 
        invoices={invoices} 
        onPay={(id) => navigate(`/checkout/${id}`)}
        onView={(inv) => navigate(`/checkout/${inv.id}`)}
        loading={loading}
      />
    </div>
  );
};

export default memo(TenantPayments);