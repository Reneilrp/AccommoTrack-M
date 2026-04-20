import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, RefreshCw, Loader2, Receipt, ChevronDown, ChevronUp,
  Archive, FileText, CheckCircle, Clock, AlertTriangle, XCircle, RotateCcw, Eye, X, Calendar
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { invoiceService } from '../../services/invoiceService';
import systemToggleService from '../../services/systemToggleService';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';

const DEFAULT_TOGGLES = systemToggleService.getDefaults();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'refunded', label: 'Refunded' },
];

const getStatusMeta = (status) => {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'paid':
      return { label: 'Paid', icon: CheckCircle, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' };
    case 'partial':
      return { label: 'Partial', icon: Clock, cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' };
    case 'awaiting verification':
    case 'pending_verification':
    case 'pending_offline':
      return {
        label: 'Awaiting Verify',
        icon: Clock,
        cls: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400/80 dark:border-amber-500/20'
      };
    case 'overdue':
      return { label: 'Overdue', icon: AlertTriangle, cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' };
    case 'refunded':
      return { label: 'Refunded', icon: RotateCcw, cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' };
    case 'cancelled':
      return { label: 'Cancelled', icon: XCircle, cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20' };
    default:
      return { label: s ? (s.charAt(0).toUpperCase() + s.slice(1)) : 'Pending', icon: Clock, cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' };
  }
};

const formatDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
};

// ─── Payment Row ──────────────────────────────────────────────────────────────

function PaymentRow({ payment, navigate, onViewProof }) {
  const meta = getStatusMeta(payment.status);
  const StatusIcon = meta.icon;
  const isPayable = ['pending', 'unpaid', 'partial', 'overdue'].includes((payment.status || '').toLowerCase());
  const hasProof = !!(payment.proofImage || payment.proof_image || payment.proof_url);

  return (
    <tr
      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
      onClick={() => onViewProof(payment)}
    >
      <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100 max-w-[150px] truncate">
        {payment.propertyName || '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
        {payment.roomNumber || '—'}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
        {paymentService.formatAmount(payment.amount)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {formatDate(payment.date)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {formatDate(payment.dueDate)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[120px] truncate">
        {payment.referenceNo || '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {payment.method || '—'}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${meta.cls}`}>
          <StatusIcon className="w-3 h-3 flex-shrink-0" />
          {meta.label}
        </span>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {hasProof && (
            <button
              onClick={() => onViewProof(payment)}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors"
              title="View Proof of Payment"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          {isPayable && (
            <button
              onClick={() => navigate(`/checkout/${payment.invoiceId || payment.invoice_id || payment.id}`)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              Pay
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TenantPaymentLogs({ _user }) {
  const navigate = useNavigate();

  const [allPayments, setAllPayments] = useState([]);
  const [archivedPayments, setArchivedPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'archive'
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [tenantPaymentsTempDisabled, setTenantPaymentsTempDisabled] = useState(DEFAULT_TOGGLES.tenantPaymentsDisabled);
  const [processingPaymentKey, setProcessingPaymentKey] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allRes, archiveRes] = await Promise.all([
        paymentService.getPayments('all', 'active'),
        paymentService.getPayments('all', 'archived'),
      ]);

      if (allRes.success) setAllPayments(Array.isArray(allRes.data) ? allRes.data : []);
      else setError(allRes.error || 'Failed to load payment history.');

      if (archiveRes.success) setArchivedPayments(Array.isArray(archiveRes.data) ? archiveRes.data : []);
    } catch (e) {
      setError('Unexpected error loading payment logs.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    let mounted = true;
    systemToggleService.getToggles().then((result) => {
      if (!mounted || !result?.data) return;
      setTenantPaymentsTempDisabled(Boolean(result.data.tenantPaymentsDisabled));
    });
    return () => { mounted = false; };
  }, []);

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

  const handleArchivePayment = async (payment) => {
    if (!payment) return;
    const invoiceId = payment.id || payment.invoice_id;
    if (!invoiceId) {
      showError('Unable to find invoice reference for this payment.');
      return;
    }

    try {
      showLoading('Updating archive status...');
      const res = await paymentService.archiveInvoice(invoiceId);
      dismissToast(); // Remove loading toast

      if (res.success) {
        showSuccess(res.data?.message || 'Archive status updated successfully');
        setShowPaymentModal(false);
        setSelectedPayment(null);
        loadData(); // Refresh list to reflect moving between tabs
      } else {
        showError(res.error || 'Failed to update archive status');
      }
    } catch (err) {
      dismissToast();
      console.error('Archive error:', err);
      showError('An unexpected error occurred while archiving.');
    }
  };

  const applyFilter = useCallback((list) => {
    const q = (searchQuery || '').trim().toLowerCase();
    return list
      .filter((p) => {
        const status = (p.status || '').toLowerCase();
        const matchStatus = statusFilter === 'all' || status === statusFilter ||
          (statusFilter === 'pending' && ['pending', 'unpaid', 'partial', 'awaiting verification'].includes(status));
        if (!matchStatus) return false;
        if (!q) return true;
        const prop = (p.propertyName || '').toLowerCase();
        const ref = (p.referenceNo || '').toLowerCase();
        const method = (p.method || '').toLowerCase();
        const room = (p.roomNumber || '').toLowerCase();
        return prop.includes(q) || ref.includes(q) || method.includes(q) || room.includes(q);
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [searchQuery, statusFilter]);

  const filteredAll = useMemo(() => applyFilter(allPayments), [applyFilter, allPayments]);
  const filteredArchived = useMemo(() => {
    // Archive doesn't apply status filter — show all archived
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return archivedPayments;
    return archivedPayments.filter((p) => {
      const prop = (p.propertyName || '').toLowerCase();
      const ref = (p.referenceNo || '').toLowerCase();
      const room = (p.roomNumber || '').toLowerCase();
      return prop.includes(q) || ref.includes(q) || room.includes(q);
    });
  }, [archivedPayments, searchQuery]);

  const tableHead = (
    <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
      <tr>
        {['Property', 'Room', 'Amount', 'Date', 'Due', 'Reference', 'Method', 'Status', ''].map((h) => (
          <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      {/* ── Custom Sticky Header ── */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-14 md:h-18 flex items-center justify-between px-4 lg:px-8 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/payments')}
            className="p-2 -ml-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Back to Payments"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
              Payment Logs
            </h1>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* ── Sub-Header: Tabs (The Slider) ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 sticky top-14 md:top-18 z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl relative">
            {/* Active Tab Background Slider */}
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-700 rounded-lg shadow-sm transition-all duration-300 ease-in-out ${
                activeTab === 'archive' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
            
            <button
              onClick={() => setActiveTab('logs')}
              className={`relative z-10 flex-1 py-2 text-sm font-bold transition-colors ${
                activeTab === 'logs' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Full Payment Log
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`relative z-10 flex-1 py-2 text-sm font-bold transition-colors ${
                activeTab === 'archive' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Payment Archive
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-sm text-red-700 dark:text-red-300">
            {error}
            <button onClick={loadData} className="ml-2 underline font-semibold">Try again</button>
          </div>
        )}

        {/* ── Search & Filters Container ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
          <div className="p-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'archive' ? "Search archive..." : "Search property, room, reference…"}
                className="w-full pl-9 pr-10 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filters - Only show for Logs tab */}
            {activeTab === 'logs' && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                      statusFilter === f.value
                        ? 'bg-green-600 text-white shadow-sm shadow-green-500/20'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium animate-pulse">Syncing payment history...</p>
            </div>
          ) : activeTab === 'logs' ? (
            /* Logs View */
            filteredAll.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500 text-center px-4">
                <Receipt className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-base font-semibold text-gray-600 dark:text-gray-300">No payment logs found</p>
                <p className="text-sm mt-1">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  {tableHead}
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredAll.map((p) => (
                      <PaymentRow
                        key={p.id}
                        payment={p}
                        navigate={navigate}
                        onViewProof={(payment) => {
                          setSelectedPayment(payment);
                          setShowPaymentModal(true);
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Archive View */
            filteredArchived.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500 text-center px-4">
                <Archive className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-base font-semibold text-gray-600 dark:text-gray-300">Archive is empty</p>
                <p className="text-sm mt-1">Fully paid invoices older than 30 days will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  {tableHead}
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredArchived.map((p) => (
                      <PaymentRow
                        key={p.id}
                        payment={p}
                        navigate={navigate}
                        onViewProof={(payment) => {
                          setSelectedPayment(payment);
                          setShowPaymentModal(true);
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        <div className="h-8" />
      </div>

      {/* Payment Details Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold dark:text-white text-gray-900 uppercase tracking-tight">
                  Payment #{selectedPayment.invoiceNumber || selectedPayment.invoiceNo || selectedPayment.referenceNo || selectedPayment.id}
                </h3>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2">
                  {selectedPayment.propertyName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {['paid', 'partially_refunded'].includes(selectedPayment.status?.toLowerCase()) && (
                  <button
                    onClick={() => handlePrintReceipt(selectedPayment)}
                    className="p-2.5 bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:text-green-400 rounded-lg transition-colors border border-green-100 dark:border-green-800"
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
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{paymentService.formatAmount(selectedPayment.amount)}</span>
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

              {/* Proof of Payment (if exists) */}
              {(selectedPayment.proofImage || selectedPayment.proof_image || selectedPayment.proof_url) && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Proof of Payment</p>
                  <div className="p-2 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                    <img
                      src={selectedPayment.proofImage || selectedPayment.proof_image || selectedPayment.proof_url}
                      alt="Proof"
                      className="w-full max-h-48 object-contain rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(selectedPayment.proofImage || selectedPayment.proof_image || selectedPayment.proof_url, '_blank')}
                      onError={(e) => { e.target.src = 'https://placehold.co/400x600?text=Image+Not+Found'; }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!tenantPaymentsTempDisabled && ['pending', 'unpaid', 'partial', 'overdue'].includes(selectedPayment.status?.toLowerCase()) && (
                <div className="pt-4">
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      openCheckout(selectedPayment);
                    }}
                    disabled={processingPaymentKey === resolvePaymentEntryKey(selectedPayment)}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-md disabled:opacity-50"
                  >
                    <Receipt className="w-5 h-5" />
                    Pay Now
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-700/30 flex justify-end gap-3">
              {['paid', 'partially_refunded', 'refunded'].includes(selectedPayment.status?.toLowerCase()) && (
                <button
                  onClick={() => handleArchivePayment(selectedPayment)}
                  className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  {selectedPayment.is_archived || selectedPayment.isArchived ? 'Restore' : 'Archive'}
                </button>
              )}
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
  );
}
