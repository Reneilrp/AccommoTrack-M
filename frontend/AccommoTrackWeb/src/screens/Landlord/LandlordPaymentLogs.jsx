import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, RefreshCw, Loader2, Receipt, ChevronDown, ChevronUp,
  Archive, FileText, CheckCircle, Clock, AlertTriangle, XCircle, RotateCcw
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { formatPrice } from '../../utils/price';
import Decimal from '../../utils/decimal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'pending_verification', label: 'Cash Verify' },
  { value: 'partial', label: 'Partial' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' },
];

const buildTenantName = (invoice) => {
  const t = invoice?.tenant || invoice?.booking?.tenant;
  return (
    t?.full_name ||
    [t?.first_name, t?.last_name].filter(Boolean).join(' ').trim() ||
    invoice?.tenant_name ||
    'Tenant —'
  );
};

const buildRoomLabel = (invoice) => {
  const room = invoice?.booking?.room || invoice?.room || null;
  const val =
    room?.room_number || room?.name ||
    invoice?.room_number || invoice?.booking?.room_number || null;
  if (!val) return '—';
  const s = String(val).trim();
  return /^room\b/i.test(s) ? s : `Room ${s}`;
};

const getInvoiceStatus = (inv) => {
  const invStatus = (inv?.status || '').toLowerCase();
  const bookPay = (inv?.booking?.payment_status || inv?.payment_status || '').toLowerCase();
  if (invStatus === 'pending_verification' || bookPay === 'pending_verification') return 'pending_verification';
  if (invStatus === 'refunded' || bookPay === 'refunded') return 'refunded';
  if (invStatus === 'cancelled' || bookPay === 'cancelled') return 'cancelled';
  if (invStatus === 'paid' || bookPay === 'paid') return 'paid';
  if (invStatus === 'partial' || bookPay === 'partial') return 'partial';
  if (inv?.due_date && new Date(inv.due_date) < new Date()) return 'overdue';
  return invStatus || bookPay || 'pending';
};

const getStatusMeta = (status) => {
  switch (status?.toLowerCase()) {
    case 'paid':
      return { label: 'Paid', icon: CheckCircle, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' };
    case 'pending_verification':
      return { label: 'Cash Verify', icon: Clock, cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' };
    case 'partial':
      return { label: 'Partial', icon: Clock, cls: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20' };
    case 'overdue':
      return { label: 'Overdue', icon: AlertTriangle, cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' };
    case 'refunded':
      return { label: 'Refunded', icon: RotateCcw, cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' };
    case 'cancelled':
      return { label: 'Cancelled', icon: XCircle, cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' };
    default:
      return { label: 'Pending', icon: Clock, cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' };
  }
};

const formatCurrency = (amount) => formatPrice(amount);

const formatDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
};

// ─── Invoice Row ──────────────────────────────────────────────────────────────

function InvoiceRow({ invoice, navigate }) {
  const isSubscription = invoice.invoice_type === 'subscription';
  const status = getInvoiceStatus(invoice);
  const meta = getStatusMeta(status);
  const StatusIcon = meta.icon;

  const tenantName = isSubscription ? (invoice.description || 'Platform Subscription') : buildTenantName(invoice);
  const roomLabel = isSubscription ? 'System' : buildRoomLabel(invoice);
  const property = isSubscription ? 'AccommoTrack' : (invoice?.property?.title || invoice?.property_title || invoice?.booking?.property?.title || '—');
  const amount = invoice?.amount_cents
    ? new Decimal(invoice.amount_cents).div(100).toNumber()
    : new Decimal(invoice?.amount || 0).toNumber();

  return (
    <tr
      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
      onClick={() => navigate(isSubscription ? `/invoices/${invoice.id}/receipt?print=1` : `/payments?invoiceId=${invoice.id}`)}
    >
      <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
        #{invoice.id}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 font-medium max-w-[140px] truncate">
        {tenantName}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-[140px] truncate">
        {property}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
        {roomLabel}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
        {formatCurrency(amount)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {formatDate(invoice.issued_at || invoice.created_at)}
      </td>
      {!isSubscription && (
        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatDate(invoice.due_date)}
        </td>
      )}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${meta.cls}`}>
          <StatusIcon className="w-3 h-3 flex-shrink-0" />
          {meta.label}
        </span>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LandlordPaymentLogs() {
  const navigate = useNavigate();

  const [allInvoices, setAllInvoices] = useState([]);
  const [archivedInvoices, setArchivedInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [logType, setLogType] = useState('tenant'); // 'tenant' or 'subscription'

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (logType === 'subscription') {
        const res = await invoiceService.getSubscriptionInvoices({ t: Date.now() });
        if (res.success) {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          setAllInvoices(list);
          setArchivedInvoices([]); // Subscriptions don't use archive logic for now
        } else {
          setError(res.error || 'Failed to load subscription invoices');
        }
      } else {
        const [allRes, archiveRes] = await Promise.all([
          invoiceService.getInvoices({ exclude_invoice_type: 'subscription', t: Date.now() }),
          invoiceService.getInvoices({ exclude_invoice_type: 'subscription', archive_filter: 'archived', t: Date.now() }),
        ]);

        if (allRes.success) {
          const list = Array.isArray(allRes.data) ? allRes.data : (allRes.data?.data || []);
          setAllInvoices(list);
        } else {
          setError(allRes.error || 'Failed to load invoices');
        }

        if (archiveRes.success) {
          const list = Array.isArray(archiveRes.data) ? archiveRes.data : (archiveRes.data?.data || []);
          setArchivedInvoices(list);
        }
      }
    } catch (e) {
      setError('Unexpected error loading payment logs.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [logType]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredAll = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return allInvoices
      .filter((inv) => {
        const status = getInvoiceStatus(inv);
        const matchStatus = statusFilter === 'all' || status === statusFilter;
        if (!matchStatus) return false;
        if (!q) return true;
        const tenant = buildTenantName(inv).toLowerCase();
        const property = (inv?.property?.title || inv?.property_title || inv?.booking?.property?.title || '').toLowerCase();
        const ref = (inv?.reference || String(inv?.id || '')).toLowerCase();
        const room = buildRoomLabel(inv).toLowerCase();
        return tenant.includes(q) || property.includes(q) || ref.includes(q) || room.includes(q);
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [allInvoices, searchQuery, statusFilter]);

  const filteredArchived = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return archivedInvoices;
    return archivedInvoices.filter((inv) => {
      const tenant = buildTenantName(inv).toLowerCase();
      const property = (inv?.property?.title || inv?.property_title || inv?.booking?.property?.title || '').toLowerCase();
      const ref = (inv?.reference || String(inv?.id || '')).toLowerCase();
      const room = buildRoomLabel(inv).toLowerCase();
      return tenant.includes(q) || property.includes(q) || ref.includes(q) || room.includes(q);
    });
  }, [archivedInvoices, searchQuery]);

  const tableHead = (
    <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
      <tr>
        {logType === 'subscription' ? (
          ['Invoice #', 'Plan / Detail', 'Platform', 'Type', 'Amount', 'Date', 'Status'].map((h) => (
            <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
              {h}
            </th>
          ))
        ) : (
          ['Invoice #', 'Tenant', 'Property', 'Room', 'Amount', 'Issued', 'Due', 'Status'].map((h) => (
            <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
              {h}
            </th>
          ))
        )}
      </tr>
    </thead>
  );

  return (
    <div className="min-h-screen bg-transparent dark:bg-gray-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
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
                Full history of all invoices &amp; transactions
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

        {/* ── Log Type Toggle ── */}
        <div className="flex items-center gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 w-fit">
          <button
            onClick={() => setLogType('tenant')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${logType === 'tenant'
                ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
          >
            Tenant Payments
          </button>
          <button
            onClick={() => setLogType('subscription')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${logType === 'subscription'
                ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
          >
            Platform Billing
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-sm text-red-700 dark:text-red-300">
            {error}
            <button onClick={loadData} className="ml-2 underline font-semibold">Try again</button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ARCHIVE SECTION (collapsible, at top)
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <button
            onClick={() => setArchiveOpen((prev) => !prev)}
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
                  Paid/settled invoices older than 30 days
                  {archivedInvoices.length > 0 && ` · ${archivedInvoices.length} records`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {archivedInvoices.length > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full">
                  {filteredArchived.length}
                </span>
              )}
              {archiveOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
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
                  <p className="text-xs mt-1">Paid invoices older than 30 days will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    {tableHead}
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredArchived.map((inv) => (
                        <InvoiceRow key={inv.id} invoice={inv} navigate={navigate} />
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
          {/* Sub-header */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">Full Payment Log</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {filteredAll.length} of {allInvoices.length} records
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-0 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tenant, property, invoice, room…"
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

            {/* Status filter pills */}
            <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-0.5 no-scrollbar">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${statusFilter === f.value
                      ? 'bg-green-600 text-white shadow-sm shadow-green-500/20'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" /> Loading payment logs…
            </div>
          ) : filteredAll.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <Receipt className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-base font-semibold">No invoices found</p>
              <p className="text-sm mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                {tableHead}
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredAll.map((inv) => (
                    <InvoiceRow key={inv.id} invoice={inv} navigate={navigate} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom padding */}
        <div className="h-8" />
      </div>
    </div>
  );
}