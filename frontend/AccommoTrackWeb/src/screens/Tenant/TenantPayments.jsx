import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useTenantPayments,
  useTenantPaymentStats,
  useTenantWalletLogs
} from '../../hooks/useTenantQueries';
import { paymentService } from '../../services/paymentService';
import { invoiceService } from '../../services/invoiceService';
import api from '../../utils/api';
import { SkeletonWallet, SkeletonTableRow } from '../../components/Shared/Skeleton';
import { useUIState } from "../../contexts/UIStateContext";
import { showSuccess, showError, showLoading } from '../../utils/toast';
import { CircleDollarSign, ClipboardCheck, Calendar, Search, RefreshCw, Loader2, Receipt, X, FileText, AlertCircle } from 'lucide-react';
import createEcho from '../../utils/echo';
import systemToggleService from '../../services/systemToggleService';
import Decimal from '../../utils/decimal';

const DEFAULT_TOGGLES = systemToggleService.getDefaults();

const toPrice = (val) => {
  try {
    return new Decimal(val || 0).toNumber();
  } catch (__e) {
    return 0;
  }
};

const formatDate = (date) => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_e) {
    return '—';
  }
};

export default function TenantPayments({ user }) {
  const navigate = useNavigate();
  const { uiState, updateScreenState } = useUIState();
  const { statusFilter, archiveFilter, timeRange, searchQuery } = uiState.wallet || {
    searchQuery: "",
    statusFilter: "all",
    archiveFilter: "active",
    timeRange: "m"
  };

  // --- Queries ---
  const paymentsQuery = useTenantPayments('all', archiveFilter || 'active');
  const statsQuery = useTenantPaymentStats();
  const [walletLogsPage, setWalletLogsPage] = useState(1);
  const walletLogsQuery = useTenantWalletLogs(walletLogsPage);

  const { data: payments = [], isLoading: paymentsLoading, refetch: refetchPayments } = paymentsQuery;
  const { data: stats = null, isLoading: statsLoading, refetch: refetchStats } = statsQuery;
  const { data: walletLogsBundle = { data: [], meta: null }, isLoading: walletLogsLoading, refetch: refetchLogs } = walletLogsQuery;

  const walletLogs = walletLogsBundle.data;
  const walletLogsPagination = walletLogsBundle.meta;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tenantPaymentsTempDisabled, setTenantPaymentsTempDisabled] = useState(DEFAULT_TOGGLES.tenantPaymentsDisabled);
  const [processingPaymentKey, setProcessingPaymentKey] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const cachedData = uiState.data?.wallet;
  const loading = (paymentsLoading || statsLoading) && !cachedData;
  const error = paymentsQuery.error?.message || statsQuery.error?.message || null;

  const loadData = useCallback(async () => {
    await Promise.all([refetchPayments(), refetchStats(), refetchLogs()]);
  }, [refetchPayments, refetchStats, refetchLogs]);

  // Sync wallet balance to UI state if needed
  useEffect(() => {
    if (stats?.totalCredits !== undefined) {
      updateScreenState('wallet', { balance: toPrice(stats.totalCredits) });
    }
  }, [stats?.totalCredits, updateScreenState]);

  const fetchLogs = useCallback(async (page = 1) => {
    setWalletLogsPage(page);
  }, []);

  useEffect(() => {
    let mounted = true;
    systemToggleService.getToggles().then((result) => {
      if (!mounted || !result?.data) return;
      setTenantPaymentsTempDisabled(Boolean(result.data.tenantPaymentsDisabled));
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('payment_refresh') === 'true' && !tenantPaymentsTempDisabled) {
      (async () => {
        const toastId = showLoading('Updating payment status...');
        const listRes = await paymentService.getPayments('all', archiveFilter || 'active');
        if (listRes.success && Array.isArray(listRes.data)) {
          const pending = listRes.data.filter(p => ['pending', 'unpaid', 'partial'].includes(p.status?.toLowerCase()));
          await Promise.all(pending.map(p => api.post(`/tenant/invoices/${p.id}/paymongo-refresh`)));
          showSuccess('Payment statuses updated', toastId);
        }
        navigate('/payments', { replace: true });
        loadData();
      })();
    }
  }, [tenantPaymentsTempDisabled, archiveFilter, loadData, navigate]);

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const echo = createEcho();
    if (!echo) return;

    const channel = echo.private(`user.${user.id}`)
      .listen('.invoice.updated', (e) => {
        console.log('Real-time invoice update received:', e);
        loadData();
        showSuccess('Payment status updated!');
      });

    return () => {
      channel.stopListening('.invoice.updated');
      echo.disconnect();
    };
  }, [user?.id, loadData]);

  const resolvePaymentEntryKey = useCallback((payment) => {
    if (!payment || typeof payment !== 'object') return null;
    return payment?.id || payment?.invoice_id || payment?.invoiceId || payment?.booking_id || payment?.bookingId || null;
  }, []);

  const resolveNearestInvoiceId = useCallback((payload) => {
    const created = Array.isArray(payload?.created) ? payload.created : [];
    const existing = Array.isArray(payload?.existing) ? payload.existing : [];

    const invoices = [...created, ...existing]
      .filter((invoice) => invoice && invoice.id)
      .sort((a, b) => {
        const aDate = new Date(a?.due_date || a?.billing_period_start || a?.created_at || 0).getTime();
        const bDate = new Date(b?.due_date || b?.billing_period_start || b?.created_at || 0).getTime();
        return aDate - bDate;
      });

    return invoices.length > 0 ? invoices[0].id : null;
  }, []);

  const openCheckout = useCallback(async (payment, options = {}) => {
    if (processingPaymentKey) return;

    const startFrom = options?.startFrom === 'next' ? 'next' : 'current';
    const monthsCount = Math.max(1, Math.min(Number(options?.monthsCount) || 1, 2));

    if (tenantPaymentsTempDisabled) {
      showError('Tenant payments are temporarily unavailable.');
      return;
    }

    const bookingId = payment?.bookingId || payment?.booking_id || null;
    let invoiceId = payment?.invoiceId || payment?.invoice_id || payment?.id || null;
    const entryKey = resolvePaymentEntryKey(payment) || bookingId || invoiceId;

    try {
      setProcessingPaymentKey(entryKey);

      if (startFrom === 'next') {
        if (!bookingId) {
          showError('This payment has no booking link for advance generation.');
          return;
        }

        const response = await paymentService.createAdvanceBookingInvoices(bookingId, monthsCount);
        if (!response.success || !response.data) {
          showError(response.error || 'Failed to prepare advance invoice checkout.');
          return;
        }

        invoiceId = resolveNearestInvoiceId(response.data);
        if (!invoiceId) {
          showError('No payable advance invoice was generated for this booking.');
          return;
        }

        if (monthsCount > 1) {
          const generatedCount = [
            ...(Array.isArray(response.data?.created) ? response.data.created : []),
            ...(Array.isArray(response.data?.existing) ? response.data.existing : []),
          ].filter((invoice) => invoice && invoice.id).length;

          if (generatedCount > 1) {
            showSuccess('Advance invoices are ready. Opening nearest due invoice first.');
          }
        }

        navigate(`/checkout/${invoiceId}`);
        return;
      }

      if (!invoiceId) {
        if (!bookingId) {
          showError('No booking or invoice linked to this payment.');
          return;
        }

        const response = await paymentService.createBookingInvoice(bookingId);
        if (!response.success || !response.data) {
          showError(response.error || 'Failed to prepare invoice checkout.');
          return;
        }

        invoiceId = response.data?.id || response.data?.data?.id || null;
      }

      if (!invoiceId) {
        showError('Unable to resolve invoice checkout for this payment.');
        return;
      }

      navigate(`/checkout/${invoiceId}`);
    } catch (err) {
      console.error('Checkout resolution error:', err);
      showError(startFrom === 'next' ? 'Failed to prepare advance invoice checkout.' : 'Failed to prepare invoice checkout.');
    } finally {
      setProcessingPaymentKey(null);
    }
  }, [navigate, resolveNearestInvoiceId, resolvePaymentEntryKey, tenantPaymentsTempDisabled, processingPaymentKey]);

  const handlePrintReceipt = (payment) => {
    if (!payment) return;
    const invoiceId = payment.id || payment.invoice_id;
    if (!invoiceId) {
      showError('Unable to find invoice reference for this payment.');
      return;
    }
    const url = invoiceService.getReceiptUrl(invoiceId);
    window.open(url, "_blank");
  };

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

  const filteredPayments = useMemo(() => {
    const threshold = getThresholdDate(timeRange);
    const list = [...payments].filter((p) => {
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
      const prop = (payment?.propertyName || '').toString().toLowerCase();
      const ref = (payment?.referenceNo || '').toString().toLowerCase();
      const method = (payment?.method || '').toString().toLowerCase();
      const room = (payment?.roomNumber || (payment?.room && payment?.room?.roomNumber) || '').toString().toLowerCase();
      return prop.includes(q) || ref.includes(q) || method.includes(q) || room.includes(q);
    });

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [payments, statusFilter, timeRange, searchQuery]);

  return (
    <div className="min-h-screen bg-transparent dark:bg-gray-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && payments.length === 0 ? (
          <SkeletonWallet />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Paid This Month</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {paymentService.formatAmount(toPrice(stats?.totalPaidThisMonth))}
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
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Unpaid Balance</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">
                    {paymentService.formatAmount(toPrice(stats?.pendingAmount))}
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>


            <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Next Due Date</p>
                  <p className="text-sm md:text-lg font-bold text-orange-600 mt-2 truncate">
                    {(() => {
                      if (!stats?.nextDueDate) return 'No unpaid balance';
                      const d = new Date(stats.nextDueDate);
                      return isNaN(d) ? 'Invalid Date' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    })()}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Billing Items</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{stats?.paidCount || 0}</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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

        {tenantPaymentsTempDisabled && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Tenant payments are temporarily unavailable while payment compliance updates are in progress.
          </div>
        )}

        {!tenantPaymentsTempDisabled && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Tip: For booking-linked items, you can pay Current Due, Next Month, or Next 2 Months.
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
                  className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors whitespace-nowrap ${statusFilter === option.value
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
                    className={`px-3 py-2 text-xs font-bold rounded-md transition-colors ${timeRange === r.value
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => navigate('/payments/logs')}
                title="Payment Logs"
                className="flex items-center gap-1.5 px-3 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-bold shadow-md shadow-green-500/20 whitespace-nowrap"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Logs</span>
              </button>
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
          {archiveFilter === 'wallet' ? (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Property</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {walletLogsLoading ? (
                    [...Array(5)].map((_, i) => <SkeletonTableRow key={i} columns={6} />)
                  ) : walletLogs.length > 0 ? (
                    walletLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{log.property?.title || 'System'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          <div className="flex flex-col">
                            <span className="font-semibold">{log.description || 'No description'}</span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500 font-bold uppercase">
                              {log.room?.room_number && (
                                <>
                                  <span>Room {log.room.room_number}</span>
                                  {log.invoice?.invoice_number && <span>•</span>}
                                </>
                              )}
                              {log.invoice?.invoice_number && (
                                <span>#Inv {log.invoice.invoice_number}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md ${log.type === 'credit' ? 'bg-emerald-100 text-emerald-700' :
                            log.type === 'debit' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                            {log.type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm font-bold ${log.type === 'debit' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {log.type === 'debit' ? '-' : '+'}{paymentService.formatAmount(toPrice(log.amount_cents))}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full capitalize">
                            {log.status || 'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No wallet transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {walletLogsPagination && walletLogsPagination.last_page > 1 && (
                <div className="flex justify-center p-4 gap-2">
                  <button
                    disabled={walletLogsPagination.current_page === 1}
                    onClick={() => fetchLogs(walletLogsPagination.current_page - 1)}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-500">Page {walletLogsPagination.current_page} of {walletLogsPagination.last_page}</span>
                  <button
                    disabled={walletLogsPagination.current_page === walletLogsPagination.last_page}
                    onClick={() => fetchLogs(walletLogsPagination.current_page + 1)}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto no-scrollbar">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
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
                          <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            #{payment.invoiceNumber || payment.id}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{payment.propertyName}</td>
                          <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                            {payment.roomNumber || (payment.room && payment.room.roomNumber) || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{paymentService.formatAmount(toPrice(payment.amount))}</td>
                          <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{formatDate(payment.date)}</td>
                          <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{formatDate(payment.dueDate)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-4 py-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${paymentService.getStatusColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{payment.referenceNo || '—'}</td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowPaymentModal(true);
                              }}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                            >
                              View
                            </button>
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
                          <p className="text-base font-bold text-gray-900 dark:text-white">{paymentService.formatAmount(toPrice(payment.amount))}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(payment.date)}</p>
                        </div>
                        {payment.dueDate && (
                          <div className="text-right">
                            <p className="text-[11px] text-gray-500 dark:text-gray-500 uppercase font-bold">Due</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(payment.dueDate)}</p>
                          </div>
                        )}
                      </div>
                      {payment.referenceNo && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">Ref: {payment.referenceNo}</p>
                      )}
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowPaymentModal(true);
                        }}
                        className="w-full py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors mt-2"
                      >
                        View Details
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </>
          )}
        </div>

        {/* Payment Details Modal */}
        {showPaymentModal && selectedPayment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-bold dark:text-white text-gray-900 uppercase tracking-tight">
                    Payment #{selectedPayment.invoiceNumber || selectedPayment.invoiceNo || selectedPayment.id}
                  </h3>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2">
                    {selectedPayment.propertyName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {['paid', 'partially_refunded'].includes(selectedPayment.status?.toLowerCase()) && (
                    <button
                      onClick={() => handlePrintReceipt(selectedPayment)}
                      className="p-2.5 bg-brand-50 hover:bg-brand-100 text-brand-600 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 dark:text-brand-400 rounded-lg transition-colors border border-brand-100 dark:border-brand-800"
                      title="Print Official Receipt"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedPayment(null);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Payment Info */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Amount</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{paymentService.formatAmount(toPrice(selectedPayment.amount))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</span>
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${paymentService.getStatusColor(selectedPayment.status)}`}>
                      {selectedPayment.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{formatDate(selectedPayment.date)}</span>
                  </div>
                  {selectedPayment.dueDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Due Date</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{formatDate(selectedPayment.dueDate)}</span>
                    </div>
                  )}
                  {selectedPayment.referenceNo && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Reference</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{selectedPayment.referenceNo}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Room</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{selectedPayment.roomNumber || (selectedPayment.room && selectedPayment.room.roomNumber) || 'N/A'}</span>
                  </div>
                </div>

                {/* Info Notice */}
                {!tenantPaymentsTempDisabled && ['pending', 'unpaid', 'partial', 'overdue'].includes(selectedPayment.status?.toLowerCase()) && (selectedPayment?.bookingId || selectedPayment?.booking_id) && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> "Next Month" and "Next 2 Months" will automatically pay the next unpaid period(s), skipping any already-paid advance months.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {!tenantPaymentsTempDisabled && ['pending', 'unpaid', 'partial', 'overdue'].includes(selectedPayment.status?.toLowerCase()) && (
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        setShowPaymentModal(false);
                        openCheckout(selectedPayment);
                      }}
                      disabled={processingPaymentKey === resolvePaymentEntryKey(selectedPayment)}
                      className="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl border-2 border-green-200 dark:border-green-800 transition-all disabled:opacity-50"
                    >
                      <Receipt className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
                      <span className="text-xs font-bold text-green-700 dark:text-green-300 text-center">Pay Current Due</span>
                    </button>
                    {(selectedPayment?.bookingId || selectedPayment?.booking_id) && (
                      <>
                        <button
                          onClick={() => {
                            setShowPaymentModal(false);
                            openCheckout(selectedPayment, { startFrom: 'next', monthsCount: 1 });
                          }}
                          disabled={processingPaymentKey === resolvePaymentEntryKey(selectedPayment)}
                          className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl border-2 border-blue-200 dark:border-blue-800 transition-all disabled:opacity-50"
                        >
                          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-300 text-center">Pay Next Unpaid</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowPaymentModal(false);
                            openCheckout(selectedPayment, { startFrom: 'next', monthsCount: 2 });
                          }}
                          disabled={processingPaymentKey === resolvePaymentEntryKey(selectedPayment)}
                          className="flex flex-col items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 transition-all disabled:opacity-50"
                        >
                          <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-2" />
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 text-center">Pay Next 2 Unpaid</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-700/30 text-right">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                  }}
                  className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}