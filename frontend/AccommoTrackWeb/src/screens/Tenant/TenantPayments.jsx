import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import api from '../../utils/api';
import { SkeletonWallet } from '../../components/Shared/Skeleton';
import { useUIState } from "../../contexts/UIStateContext";
import toast from 'react-hot-toast';
import { CircleDollarSign, ClipboardCheck, Calendar, Search, RefreshCw, Loader2, Receipt } from 'lucide-react';
import createEcho from '../../utils/echo';

export default function TenantPayments({ user }) {
  const navigate = useNavigate();
  const { uiState, updateScreenState, updateData } = useUIState();
  const { statusFilter, timeRange, searchQuery } = uiState.wallet || {
    searchQuery: "",
    statusFilter: "all",
    timeRange: "m"
  };
  
  // Use cached data for instant mount
  const cachedData = uiState.data?.wallet;

  const [payments, setPayments] = useState(cachedData?.payments || []);
  const [stats, setStats] = useState(cachedData?.stats || null);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const initialLoadRef = useRef(!cachedData);
  const hadCachedDataOnMountRef = useRef(Boolean(cachedData));
  const didInitialFetchRef = useRef(false);

  const loadData = useCallback(async () => {
    // Only set loading if we have NO data
    if (initialLoadRef.current && !hadCachedDataOnMountRef.current) setLoading(true);
    initialLoadRef.current = false;
    setError(null);

    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('payment_refresh') === 'true') {
        // Find any pending/unpaid invoices and trigger a background refresh
        toast.loading('Updating payment status...', { id: 'refreshing' });
        const listRes = await paymentService.getPayments('all');
        if (listRes.success && Array.isArray(listRes.data)) {
          const pending = listRes.data.filter(p => ['pending', 'unpaid', 'partial'].includes(p.status?.toLowerCase()));
          await Promise.all(pending.map(p => api.post(`/tenant/invoices/${p.id}/paymongo-refresh`)));
          toast.success('Payment statuses updated', { id: 'refreshing' });
        }
        // Remove the parameter to stop the loop
        navigate('/payments', { replace: true });
      }

      const [paymentsRes, statsRes] = await Promise.all([
        paymentService.getPayments('all'),
        paymentService.getStats()
      ]);

      if (paymentsRes.success) {
        setPayments(paymentsRes.data || []);
      } else {
        setError(paymentsRes.error);
      }

      if (statsRes.success) {
        setStats(statsRes.data);
      }

      // Update global cache
      if (paymentsRes.success && statsRes.success) {
        updateData('wallet', prev => ({ ...prev, payments: paymentsRes.data, stats: statsRes.data }));
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Wallet load error:', err);
    } finally {
      setLoading(false);
    }
  }, [updateData, navigate]);

  useEffect(() => {
    if (didInitialFetchRef.current) return;
    didInitialFetchRef.current = true;
    loadData();
  }, [loadData]);

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return;
    
    const echo = createEcho();
    if (!echo) return;

    const channel = echo.private(`user.${user.id}`)
      .listen('.invoice.updated', (e) => {
        console.log('Real-time invoice update received:', e);
        loadData();
        toast.success('Payment status updated!', { icon: '💰' });
      });

    return () => {
      channel.stopListening('.invoice.updated');
      echo.disconnect();
    };
  }, [user?.id, loadData]);

  const filterOptions = [
    { value: 'all', label: 'All Payments' },
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
    { value: 'overdue', label: 'Overdue' }
  ];

  const timeRanges = [
    { value: 'w', label: 'W' },
    { value: 'm', label: 'M' },
    { value: 'y', label: 'Y' },
    { value: 'all', label: 'All' },
  ];

  const getThresholdDate = (range) => {
    if (!range || range === 'all') return null;
    const now = new Date();
    switch (range) {
      case 'w': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'm': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default: return null;
    }
  };

  const getFilteredPayments = () => {
    const threshold = getThresholdDate(timeRange);
    const list = [...payments].filter(p => {
      if (!threshold) return true;
      const d = new Date(p.date);
      return isNaN(d) ? true : d >= threshold;
    });
    const statusFiltered = list.filter((payment) => {
      if (statusFilter === 'all') return true;
      const normalized = (payment.status || '').toLowerCase();
      if (statusFilter === 'pending') {
        return ['pending', 'unpaid', 'partial', 'partially paid', 'pending_verification', 'awaiting verification'].includes(normalized);
      }
      return normalized === statusFilter;
    });
    // Apply search query (property name, room number, reference, method)
    const q = (searchQuery || '').trim().toLowerCase();
    const filtered = statusFiltered.filter((payment) => {
      if (!q) return true;
      const prop = (payment.propertyName || '').toString().toLowerCase();
      const ref = (payment.referenceNo || '').toString().toLowerCase();
      const method = (payment.method || '').toString().toLowerCase();
      const room = (payment.roomNumber || (payment.room && payment.room.roomNumber) || '').toString().toLowerCase();
      return prop.includes(q) || ref.includes(q) || method.includes(q) || room.includes(q);
    });
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const filteredPayments = useMemo(
    () => getFilteredPayments(),
    [payments, statusFilter, timeRange, searchQuery],
  );

  return (
    <div className="min-h-screen bg-transparent dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && payments.length === 0 ? (
          <SkeletonWallet />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Paid This Month</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {paymentService.formatAmount(stats?.totalPaidThisMonth || 0)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <CircleDollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Payments This Month</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{stats?.paidCount || 0}</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Next Due Date</p>
                  <p className="text-sm md:text-lg font-bold text-orange-600 mt-2 truncate">
                    {stats?.nextDueDate || 'No unpaid balance'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
            <button onClick={loadData} className="ml-2 underline font-semibold">Try again</button>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative w-full lg:w-80 shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => updateScreenState('wallet', { searchQuery: e.target.value })}
                placeholder="Search property, room, ref, method..."
                className="w-full pl-10 pr-9 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:bg-gray-700 dark:text-white outline-none text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => updateScreenState('wallet', { searchQuery: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-base"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateScreenState('wallet', { statusFilter: option.value })}
                  className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors whitespace-nowrap ${
                    statusFilter === option.value
                      ? 'bg-green-600 text-white shadow-md shadow-green-500/20'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto shrink-0">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {timeRanges.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => updateScreenState('wallet', { timeRange: r.value })}
                    className={`px-3 py-2 text-xs font-bold rounded-md transition-colors ${
                      timeRange === r.value
                        ? 'bg-green-600 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button
                onClick={async () => {
                  setIsRefreshing(true);
                  await loadData();
                  setIsRefreshing(false);
                }}
                disabled={loading || isRefreshing}
                title="Refresh"
                className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md shadow-blue-500/20"
              >
                {loading || isRefreshing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
          <div className="hidden md:block overflow-x-auto no-scrollbar">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {Array.isArray(filteredPayments) && filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{payment.propertyName}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {payment.roomNumber || (payment.room && payment.room.roomNumber) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{paymentService.formatAmount(payment.amount)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{payment.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{payment.dueDate || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-4 py-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${paymentService.getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-700 dark:text-gray-300">{payment.referenceNo || '—'}</td>
                      <td className="px-6 py-4 text-sm">
                        {['pending', 'unpaid', 'partial', 'overdue'].includes(payment.status?.toLowerCase()) ? (
                          <button
                            onClick={() => navigate(`/checkout/${payment.id}`)}
                            className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                          >
                            Pay Now
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">No payments found</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
                          Your payment history will appear here once invoices are generated and processed.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {(() => {
              if (!Array.isArray(filteredPayments) || filteredPayments.length === 0) {
                return (
                  <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    No payments found
                  </div>
                );
              }
              return filteredPayments.map((payment) => (
                <div key={payment.id} className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate">
                        {payment.propertyName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Room {payment.roomNumber || (payment.room && payment.room.roomNumber) || 'N/A'}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${paymentService.getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-500 uppercase font-bold">Amount</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{paymentService.formatAmount(payment.amount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500 dark:text-gray-500 uppercase font-bold">Date</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{payment.date}</p>
                    </div>
                    {payment.dueDate && (
                      <div className="text-right">
                        <p className="text-[11px] text-gray-500 dark:text-gray-500 uppercase font-bold">Due</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{payment.dueDate}</p>
                      </div>
                    )}
                  </div>
                  {payment.referenceNo && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">Ref: {payment.referenceNo}</p>
                  )}
                  {['pending', 'unpaid', 'partial', 'overdue'].includes(payment.status?.toLowerCase()) && (
                    <button
                      onClick={() => navigate(`/checkout/${payment.id}`)}
                      className="w-full py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors"
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}