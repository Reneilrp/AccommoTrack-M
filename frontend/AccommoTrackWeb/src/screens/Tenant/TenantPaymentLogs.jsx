import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, RefreshCw, Loader2, Receipt, ChevronDown, ChevronUp,
  Archive, FileText, CheckCircle, Clock, AlertTriangle, XCircle, RotateCcw
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';

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
    case 'awaiting verification':
    case 'pending_verification':
      return { label: s === 'pending_verification' || s === 'awaiting verification' ? 'Awaiting Verify' : 'Partial', icon: Clock, cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' };
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

function PaymentRow({ payment, navigate }) {
  const meta = getStatusMeta(payment.status);
  const StatusIcon = meta.icon;
  const isPayable = ['pending', 'unpaid', 'partial', 'overdue'].includes((payment.status || '').toLowerCase());

  return (
    <tr
      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
      onClick={() => {
        if (payment.invoiceId || payment.invoice_id || payment.id) {
          navigate(`/checkout/${payment.invoiceId || payment.invoice_id || payment.id}`);
        }
      }}
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
        {payment.dueDate || '—'}
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
        {isPayable && (
          <button
            onClick={() => navigate(`/checkout/${payment.invoiceId || payment.invoice_id || payment.id}`)}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
          >
            Pay
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TenantPaymentLogs({ user }) {
  const navigate = useNavigate();

  const [allPayments, setAllPayments] = useState([]);
  const [archivedPayments, setArchivedPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [archiveOpen, setArchiveOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allRes, archiveRes] = await Promise.all([
        paymentService.getPayments('all', 'all'),
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
    <div className="min-h-screen bg-transparent dark:bg-gray-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/payments')}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Back to Payments"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-green-500" />
                Payment Logs
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Complete history of your invoices and payments
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-sm text-red-700 dark:text-red-300">
            {error}
            <button onClick={loadData} className="ml-2 underline font-semibold">Try again</button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ARCHIVE SECTION
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <button
            onClick={() => setArchiveOpen((p) => !p)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            aria-expanded={archiveOpen}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Archive className="w-5 h-5 text-gray-500 dark:text-gray-300" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">Payment Archive</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Fully settled invoices older than 30 days
                  {archivedPayments.length > 0 && ` · ${archivedPayments.length} records`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {archivedPayments.length > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full">
                  {filteredArchived.length}
                </span>
              )}
              {archiveOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          </button>

          {archiveOpen && (
            <div className="border-t border-gray-100 dark:border-gray-700">
              {loading ? (
                <div className="flex items-center justify-center py-10 gap-3 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading archive…
                </div>
              ) : filteredArchived.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
                  <Archive className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">No archived payments found</p>
                  <p className="text-xs mt-1">Fully paid invoices older than 30 days will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    {tableHead}
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredArchived.map((p) => (
                        <PaymentRow key={p.id} payment={p} navigate={navigate} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            FULL LOG SECTION
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">Full Payment Log</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{filteredAll.length} of {allPayments.length} records</p>
              </div>
            </div>

            <div className="relative flex-1 min-w-0 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search property, room, reference…"
                className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-green-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-base"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-0.5 no-scrollbar">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    statusFilter === f.value
                      ? 'bg-green-600 text-white shadow-sm shadow-green-500/20'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" /> Loading payment logs…
            </div>
          ) : filteredAll.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <Receipt className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-base font-semibold">No payments found</p>
              <p className="text-sm mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                {tableHead}
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredAll.map((p) => (
                    <PaymentRow key={p.id} payment={p} navigate={navigate} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
