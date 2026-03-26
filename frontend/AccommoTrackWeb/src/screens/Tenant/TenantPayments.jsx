import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import api from '../../utils/api';
import { SkeletonWallet } from '../../components/Shared/Skeleton';
import { useUIState } from "../../contexts/UIStateContext";
import toast from 'react-hot-toast';
import { CircleDollarSign, ClipboardCheck, Calendar } from 'lucide-react';
import createEcho from '../../utils/echo';

export default function TenantPayments({ user }) {
  const navigate = useNavigate();
  const { uiState, updateScreenState, updateData } = useUIState();
  const { statusFilter, timeRange, searchQuery } = uiState.wallet || {
    searchQuery: "",
    statusFilter: "all",
    timeRange: "1m"
  };
  
  // Use cached data for instant mount
  const cachedData = uiState.data?.wallet;

  const [payments, setPayments] = useState(cachedData?.payments || []);
  const [stats, setStats] = useState(cachedData?.stats || null);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);
  const [__isRefreshing, _setIsRefreshing] = useState(false);
  const initialLoadRef = React.useRef(!cachedData);

  const loadData = useCallback(async () => {
    // Only set loading if we have NO data
    if (initialLoadRef.current && payments.length === 0) setLoading(true);
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
        paymentService.getPayments(statusFilter),
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
  }, [statusFilter, payments.length, updateData, navigate]);

  useEffect(() => {
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
    // Apply search query (property name, room number, reference, method)
    const q = (searchQuery || '').trim().toLowerCase();
    const filtered = list.filter((payment) => {
      if (!q) return true;
      const prop = (payment.propertyName || '').toString().toLowerCase();
      const ref = (payment.referenceNo || '').toString().toLowerCase();
      const method = (payment.method || '').toString().toLowerCase();
      const room = (payment.roomNumber || (payment.room && payment.room.roomNumber) || '').toString().toLowerCase();
      return prop.includes(q) || ref.includes(q) || method.includes(q) || room.includes(q);
    });
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  return (
    <div className="min-h-screen bg-transparent dark:bg-gray-900 p-4 md:p-6 lg:p-8">
      {/* Stats Cards - Responsive Grid */}
      {loading && payments.length === 0 ? (
        <SkeletonWallet />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Total Paid This Month */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-600 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CircleDollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Paid This Month</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {paymentService.formatAmount(stats?.totalPaidThisMonth || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Payments Count */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-600 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Payments This Month</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.paidCount || 0}</p>
              </div>
            </div>
          </div>

          {/* Next Due Date */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-600 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Next Due Date</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.nextDueDate || 'No unpaid balance'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-600">
        <div className="p-4 md:p-6 border-b border-gray-300 dark:border-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment History</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => updateScreenState('wallet', { searchQuery: e.target.value })}
                placeholder="Search property, room, ref..."
                className="px-4 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-48"
              />
              {searchQuery && (
                <button
                  onClick={() => updateScreenState('wallet', { searchQuery: '' })}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => updateScreenState('wallet', { statusFilter: e.target.value })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="inline-flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              {timeRanges.map(r => (
                <button
                  key={r.value}
                  onClick={() => updateScreenState('wallet', { timeRange: r.value })}
                  className={`px-4 py-2 text-sm rounded-md font-medium ${timeRange === r.value ? 'bg-green-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 mx-4 mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            <button onClick={loadData} className="mt-2 text-sm text-red-700 dark:text-red-300 underline">Try again</button>
          </div>
        )}

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto no-scrollbar">
          <table className="w-full">
            <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-300 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
              {(() => {
                const filtered = getFilteredPayments();
                return Array.isArray(filtered) && filtered.length > 0 ? (
                  filtered.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{payment.propertyName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {payment.roomNumber || (payment.room && payment.room.roomNumber) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">{paymentService.formatAmount(payment.amount)}</td>
                      <td className="px-6 py-4 text-sm">{payment.date}</td>
                      <td className="px-6 py-4 text-sm">{payment.dueDate || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs ${paymentService.getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono">{payment.referenceNo}</td>
                      <td className="px-6 py-4 text-sm">
                        {['pending', 'unpaid', 'partial', 'overdue'].includes(payment.status?.toLowerCase()) && (
                          <button
                            onClick={() => navigate(`/checkout/${payment.id}`)}
                            className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Pay Now
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">No payments found</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {(() => {
            const filtered = getFilteredPayments();
            if (!Array.isArray(filtered) || filtered.length === 0) {
              return (
                <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  No payments found
                </div>
              );
            }
            return filtered.map((payment) => (
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
                  <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentService.getStatusColor(payment.status)}`}>
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
  );
}