import React, { useState, useEffect, useCallback } from 'react';
import { paymentService } from '../../services/paymentService';
import { SkeletonWallet } from '../../components/Shared/Skeleton';
import { useUIState } from "../../contexts/UIStateContext";

export default function TenantWallet() {
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

  const loadData = useCallback(async () => {
    // Only set loading if we have NO data
    if (!cachedData && payments.length === 0) setLoading(true);
    setError(null);

    try {
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
        updateData('wallet', { payments: paymentsRes.data, stats: statsRes.data });
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Wallet load error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, cachedData, payments.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filterOptions = [
    { value: 'all', label: 'All Payments' },
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
    { value: 'overdue', label: 'Overdue' }
  ];

  const timeRanges = [
    { value: '1w', label: '1W' },
    { value: '1m', label: '1M' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' },
  ];

  const getThresholdDate = (range) => {
    if (!range || range === 'all') return null;
    const now = new Date();
    switch (range) {
      case '1w': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '1m': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '1y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
      {/* Stats Cards - Responsive Grid */}
      {loading && payments.length === 0 ? (
        <SkeletonWallet />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Total Paid This Month */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Payments This Month</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.paidCount || 0}</p>
              </div>
            </div>
          </div>

          {/* Next Due Date */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Next Due Date</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.nextDueDate || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment History</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => updateScreenState('wallet', { searchQuery: e.target.value })}
                placeholder="Search property, room, ref..."
                className="px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-48"
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
            <div className="inline-flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-1">
              {timeRanges.map(r => (
                <button
                  key={r.value}
                  onClick={() => updateScreenState('wallet', { timeRange: r.value })}
                  className={`px-3 py-1 text-sm rounded-md font-medium ${timeRange === r.value ? 'bg-green-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}
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
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {getFilteredPayments().length > 0 ? (
                getFilteredPayments().map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{payment.propertyName}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{paymentService.formatAmount(payment.amount)}</td>
                    <td className="px-6 py-4 text-sm">{payment.date}</td>
                    <td className="px-6 py-4 text-sm">{payment.dueDate || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs ${paymentService.getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">{payment.referenceNo}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No payments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}