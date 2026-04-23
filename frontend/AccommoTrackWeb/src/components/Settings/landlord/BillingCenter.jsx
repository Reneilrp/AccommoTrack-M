import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, CreditCard, FileText, History, Loader2, Receipt, RefreshCw, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { showSuccess, showError } from '../../../utils/toast';
import invoiceService from '../../../services/invoiceService';
import Decimal from '../../../utils/decimal';

const toDecimal = (val, isCents = false) => {
  try {
    const d = new Decimal(val || 0);
    return isCents ? d.div(100) : d;
  } catch (__e) {
    return new Decimal(0);
  }
};

const TABS = [
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'history', label: 'History', icon: History },
];

const currency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const normalizeStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (!normalized) return 'pending';
  return normalized;
};

const computeInvoiceTotals = (invoice) => {
  const total = toDecimal(invoice?.amount_cents ?? invoice?.amount, !!invoice?.amount_cents);
  const paid = (invoice?.transactions || [])
    .filter((tx) => ['succeeded', 'paid', 'partially_refunded'].includes((tx.status || '').toLowerCase()))
    .reduce((sum, tx) => {
      const amount = toDecimal(tx.amount_cents ?? tx.amount, !!tx.amount_cents);
      const refunded = toDecimal(tx.refunded_amount_cents ?? tx.refunded_amount, !!tx.refunded_amount_cents);
      return sum.plus(Decimal.max(amount.minus(refunded), 0));
    }, new Decimal(0));

  return {
    total: total.toNumber(),
    paid: paid.toNumber(),
    outstanding: Decimal.max(total.minus(paid), 0).toNumber(),
  };
};

const buildHistory = (invoices) => {
  const events = [];

  invoices.forEach((invoice) => {
    const reference = invoice.reference || `Invoice #${invoice.id}`;

    events.push({
      id: `invoice-issued-${invoice.id}`,
      timestamp: invoice.issued_at || invoice.created_at,
      title: 'Invoice issued',
      detail: `${reference} was issued with status ${(invoice.status || 'pending').replace('_', ' ')}.`,
      type: 'invoice',
    });

    (invoice.transactions || []).forEach((tx) => {
      events.push({
        id: `tx-${tx.id}`,
        timestamp: tx.created_at || tx.updated_at,
        title: 'Payment update',
        detail: `${reference} ${tx.method ? `(${tx.method})` : ''} ${currency(
          toDecimal(tx.amount_cents ?? tx.amount, !!tx.amount_cents).toNumber()
        )} marked ${String(tx.status || 'pending').replace('_', ' ')}.`,
        type: 'payment',
      });
    });
  });

  return events
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export default function BillingCenter({ onOpenSubscriptionPlan }) {
  const [activeTab, setActiveTab] = useState('billing');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [invoicesResponse, summaryResponse] = await Promise.all([
        invoiceService.getInvoices({ invoice_type: 'subscription', t: Date.now() }),
        invoiceService.getSummary({ invoice_type: 'subscription', range: 'all', t: Date.now() }),
      ]);

      if (!invoicesResponse.success) {
        throw new Error(invoicesResponse.error || 'Failed to load invoices.');
      }

      const nextInvoices = Array.isArray(invoicesResponse.data)
        ? invoicesResponse.data
        : (invoicesResponse.data?.data || invoicesResponse.data || []);

      setInvoices(Array.isArray(nextInvoices) ? nextInvoices : []);
      setSummary(summaryResponse.success ? summaryResponse.data : null);
    } catch (error) {
      showError(error.message || 'Unable to load billing data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (silent) {
        showSuccess('Billing data refreshed');
      }
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const invoiceRows = useMemo(() => {
    return invoices.map((invoice) => {
      const totals = computeInvoiceTotals(invoice);
      const status = normalizeStatus(invoice.status);
      return {
        ...invoice,
        status,
        totals,
      };
    });
  }, [invoices]);

  const filteredInvoiceRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return invoiceRows.filter((invoice) => {
      if (statusFilter !== 'all' && invoice.status !== statusFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [
        invoice.reference,
        invoice.description,
        invoice.status,
        invoice.invoice_type,
        String(invoice.id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [invoiceRows, searchTerm, statusFilter]);

  const openBillingRows = useMemo(() => {
    return filteredInvoiceRows.filter((invoice) => {
      if (invoice.totals.outstanding <= 0) {
        return false;
      }

      return ['pending', 'unpaid', 'partial', 'pending_verification', 'overdue'].includes(invoice.status);
    });
  }, [filteredInvoiceRows]);

  const paymentRows = useMemo(() => {
    return filteredInvoiceRows
      .flatMap((invoice) =>
        (invoice.transactions || []).map((tx) => ({
          id: tx.id,
          invoiceId: invoice.id,
          invoiceReference: invoice.reference,
          method: tx.method || 'unknown',
          status: tx.status || 'pending',
          amount: toDecimal(tx.amount_cents ?? tx.amount).toNumber(),
          createdAt: tx.created_at || tx.updated_at,
        }))
      )
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [filteredInvoiceRows]);

  const historyRows = useMemo(() => buildHistory(filteredInvoiceRows), [filteredInvoiceRows]);

  const overview = useMemo(() => {
    const fallback = invoiceRows.reduce(
      (acc, invoice) => {
        acc.totalInvoiced += invoice.totals.total;
        acc.totalPaid += invoice.totals.paid;
        acc.totalOutstanding += invoice.totals.outstanding;

        const status = String(invoice.status || '').toLowerCase();
        if (status === 'pending_verification') {
          acc.pendingVerification += 1;
        }
        if (status === 'overdue') {
          acc.overdue += 1;
        }

        return acc;
      },
      {
        totalInvoiced: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        pendingVerification: 0,
        overdue: 0,
      }
    );

    const totals = summary?.totals;
    if (!totals) return fallback;

    return {
      totalInvoiced: Number(totals.total_billed ?? (totals.total_billed_cents || 0)),
      totalPaid: Number(totals.total_paid ?? (totals.total_paid_cents || 0)),
      totalOutstanding: Number(totals.total_balance ?? (totals.total_balance_cents || 0)),
      pendingVerification: Number(totals.pending_verification_count || 0),
      overdue: Number(totals.overdue_count || 0),
    };
  }, [invoiceRows, summary]);

  const tabCounts = useMemo(() => {
    return {
      billing: openBillingRows.length,
      payments: paymentRows.length,
      invoices: filteredInvoiceRows.length,
      history: historyRows.length,
    };
  }, [openBillingRows.length, paymentRows.length, filteredInvoiceRows.length, historyRows.length]);

  const subscriptionHealth = useMemo(() => {
    if (openBillingRows.length > 0) {
      return {
        tone: 'amber',
        title: 'Action Needed: Outstanding Subscription Billing',
        detail: `You have ${openBillingRows.length} open item${openBillingRows.length > 1 ? 's' : ''}. Complete payment to keep subscription access uninterrupted.`,
      };
    }

    if (overview.pendingVerification > 0) {
      return {
        tone: 'indigo',
        title: 'Pending Verification',
        detail: `You have ${overview.pendingVerification} payment${overview.pendingVerification > 1 ? 's' : ''} awaiting verification.`,
      };
    }

    return {
      tone: 'green',
      title: 'Billing Status Healthy',
      detail: 'No outstanding subscription invoices right now.',
    };
  }, [openBillingRows.length, overview.pendingVerification]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-green-600 dark:text-green-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Billing Center</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Dedicated billing workspace for your platform subscription plan and payments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 inline-flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>

            {onOpenSubscriptionPlan && (
              <button
                type="button"
                onClick={onOpenSubscriptionPlan}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Open Subscription Plan
              </button>
            )}

            <Link
              to="/payments"
              className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-semibold text-white"
            >
              Open Full Payments Page
            </Link>
          </div>
        </div>

        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${
            subscriptionHealth.tone === 'amber'
              ? 'border-amber-200 dark:border-amber-900 bg-amber-50/80 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200'
              : subscriptionHealth.tone === 'indigo'
                ? 'border-indigo-200 dark:border-indigo-900 bg-indigo-50/80 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-200'
                : 'border-green-200 dark:border-green-900 bg-green-50/80 dark:bg-green-900/20 text-green-900 dark:text-green-200'
          }`}
        >
          <p className="font-semibold">{subscriptionHealth.title}</p>
          <p className="mt-1 text-xs opacity-90">{subscriptionHealth.detail}</p>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by invoice reference, status, or description"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Invoiced</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{currency(overview.totalInvoiced)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Paid</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-1">{currency(overview.totalPaid)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Outstanding</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-1">{currency(overview.totalOutstanding)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pending Verification</p>
            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-400 mt-1">{overview.pendingVerification}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Overdue Invoices</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-400 mt-1">{overview.overdue}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const count = tabCounts[tab.id] ?? 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
                  active
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded ${active ? 'bg-green-200/70 dark:bg-green-800/60' : 'bg-gray-200 dark:bg-gray-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === 'billing' && (
          <div className="space-y-3">
            {openBillingRows.slice(0, 12).map((invoice) => (
              <div key={invoice.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{invoice.reference || `Invoice #${invoice.id}`}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      Due: {formatDate(invoice.due_date)} | {String(invoice.status).replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Outstanding: <span className="font-bold">{currency(invoice.totals.outstanding)}</span>
                  </div>
                </div>
              </div>
            ))}

            {openBillingRows.length === 0 && (
              <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50/80 dark:bg-green-900/20 p-4 text-sm text-green-900 dark:text-green-200 inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                No open billing items. Your subscription billing is up to date.
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-3">
            {paymentRows.slice(0, 20).map((payment) => (
              <div key={payment.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{payment.invoiceReference || `Invoice #${payment.invoiceId}`}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {payment.method} | {String(payment.status).replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{currency(payment.amount)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(payment.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}

            {paymentRows.length === 0 && <p className="text-sm text-gray-600 dark:text-gray-400">No payment records yet.</p>}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-3">
            {filteredInvoiceRows.slice(0, 20).map((invoice) => (
              <div key={invoice.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{invoice.reference || `Invoice #${invoice.id}`}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      Status: {String(invoice.status || 'pending').replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Total:</span> {currency(invoice.totals.total)}
                  </div>
                </div>
              </div>
            ))}

            {filteredInvoiceRows.length === 0 && <p className="text-sm text-gray-600 dark:text-gray-400">No invoices found.</p>}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {historyRows.slice(0, 30).map((event) => (
              <div key={event.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start gap-3">
                  <Clock3 className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2">
                      {event.title}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 uppercase tracking-wide">
                        {event.type}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{event.detail}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDateTime(event.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))}

            {historyRows.length === 0 && <p className="text-sm text-gray-600 dark:text-gray-400">No billing history entries yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}