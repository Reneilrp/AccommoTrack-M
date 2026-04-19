import React, { useCallback, useMemo, useState } from 'react';
import { AlertCircle, Clock4, Loader2, Search, Shield, XCircle, Download } from 'lucide-react';
import adminService from '../../services/adminService';
import { exportToCSV } from '../../utils/csvExport';
import { showError } from '../../utils/toast';

const DEFAULT_FILTERS = {
  domain: '',
  event: '',
  actor_id: '',
  booking_id: '',
  invoice_id: '',
  payment_transaction_id: '',
  from: '',
  to: '',
  per_page: 50,
};

const DEFAULT_TIMELINE_QUERY = {
  entity_type: 'invoice',
  entity_id: '',
  order: 'asc',
};

const toPositiveIntegerOrNull = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString();
};

const formatMetadataPreview = (metadata) => {
  if (!metadata || typeof metadata !== 'object') {
    return 'No metadata';
  }

  const entries = Object.entries(metadata);
  if (entries.length === 0) {
    return 'No metadata';
  }

  return entries
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join(' | ');
};

const getSeverityChipClasses = (severity) => {
  switch (String(severity || '').toLowerCase()) {
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    case 'warning':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    case 'info':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }
};

const resolveTimelineSeed = (log) => {
  if (log?.invoiceId) {
    return { entity_type: 'invoice', entity_id: String(log.invoiceId), order: 'asc' };
  }

  if (log?.paymentTransactionId) {
    return { entity_type: 'payment', entity_id: String(log.paymentTransactionId), order: 'asc' };
  }

  if (log?.bookingId) {
    return { entity_type: 'booking', entity_id: String(log.bookingId), order: 'asc' };
  }

  if (log?.actorId) {
    return { entity_type: 'user', entity_id: String(log.actorId), order: 'asc' };
  }

  return { ...DEFAULT_TIMELINE_QUERY };
};

export default function AuditExplorer() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    from: null,
    to: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineQuery, setTimelineQuery] = useState(DEFAULT_TIMELINE_QUERY);
  const [timelineRecords, setTimelineRecords] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');

  const buildRequestFilters = useCallback(() => {
    return {
      domain: filters.domain,
      event: filters.event,
      actor_id: toPositiveIntegerOrNull(filters.actor_id),
      booking_id: toPositiveIntegerOrNull(filters.booking_id),
      invoice_id: toPositiveIntegerOrNull(filters.invoice_id),
      payment_transaction_id: toPositiveIntegerOrNull(filters.payment_transaction_id),
      from: filters.from,
      to: filters.to,
      per_page: filters.per_page,
    };
  }, [filters]);

  const fetchLogs = useCallback(
    async (page = 1, silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError('');

      const response = await adminService.getAuditLogs({
        ...buildRequestFilters(),
        page,
      });

      if (response.success) {
        setLogs(response.data?.items || []);
        setPagination({
          currentPage: response.data?.pagination?.currentPage || 1,
          lastPage: response.data?.pagination?.lastPage || 1,
          total: response.data?.pagination?.total || 0,
          from: response.data?.pagination?.from,
          to: response.data?.pagination?.to,
        });
      } else {
        setError(response.error || 'Failed to load audit logs.');
      }

      setLoading(false);
    },
    [buildRequestFilters],
  );

  React.useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const openTimeline = async (seed) => {
    setTimelineOpen(true);
    setTimelineRecords([]);
    setTimelineError('');
    setTimelineQuery(seed);

    if (!seed.entity_id) {
      return;
    }

    setTimelineLoading(true);
    const response = await adminService.getAuditTimeline({
      entity_type: seed.entity_type,
      entity_id: seed.entity_id,
      order: seed.order,
    });
    setTimelineLoading(false);

    if (response.success) {
      setTimelineRecords(response.data || []);
      return;
    }

    setTimelineError(response.error || 'Failed to load timeline records.');
  };

  const runTimelineSearch = async () => {
    if (!timelineQuery.entity_id) {
      showError('Entity ID is required for timeline lookup.');
      return;
    }

    setTimelineLoading(true);
    setTimelineError('');
    const response = await adminService.getAuditTimeline({
      entity_type: timelineQuery.entity_type,
      entity_id: timelineQuery.entity_id,
      order: timelineQuery.order,
    });
    setTimelineLoading(false);

    if (response.success) {
      setTimelineRecords(response.data || []);
      return;
    }

    setTimelineError(response.error || 'Failed to load timeline records.');
  };

  const closeTimeline = () => {
    setTimelineOpen(false);
    setTimelineQuery(DEFAULT_TIMELINE_QUERY);
    setTimelineRecords([]);
    setTimelineError('');
  };

  const hasData = logs.length > 0;

  const pageLabel = useMemo(() => {
    if (!pagination.total) {
      return 'No records';
    }

    if (pagination.from && pagination.to) {
      return `Showing ${pagination.from} to ${pagination.to} of ${pagination.total}`;
    }

    return `Total records: ${pagination.total}`;
  }, [pagination]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleExportCSV = () => {
    const dataToExport = logs.map(log => ({
      Timestamp: formatDateTime(log.createdAt),
      Domain: log.domain || 'N/A',
      Event: log.event || 'event.unknown',
      Severity: log.severity || 'info',
      Actor_ID: log.actorId || '-',
      Summary: log.summary || '-',
      Metadata: JSON.stringify(log.metadata || {})
    }));
    exportToCSV('Audit_Logs_Export', dataToExport);
  };

  return (
    <div className="w-full max-w-full px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Audit Explorer
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Search system audit entries and inspect entity timelines for booking, invoice, payment, and user events.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={!hasData}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Domain (e.g. payment)"
            value={filters.domain}
            onChange={(event) => handleFilterChange('domain', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />
          <input
            type="text"
            placeholder="Event (e.g. payment.denied)"
            value={filters.event}
            onChange={(event) => handleFilterChange('event', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />
          <input
            type="number"
            min="1"
            placeholder="Actor ID"
            value={filters.actor_id}
            onChange={(event) => handleFilterChange('actor_id', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />
          <input
            type="number"
            min="1"
            placeholder="Booking ID"
            value={filters.booking_id}
            onChange={(event) => handleFilterChange('booking_id', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />
          <input
            type="number"
            min="1"
            placeholder="Invoice ID"
            value={filters.invoice_id}
            onChange={(event) => handleFilterChange('invoice_id', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />
          <input
            type="number"
            min="1"
            placeholder="Payment Tx ID"
            value={filters.payment_transaction_id}
            onChange={(event) => handleFilterChange('payment_transaction_id', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />
          <input
            type="date"
            value={filters.from}
            onChange={(event) => handleFilterChange('from', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(event) => handleFilterChange('to', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchLogs(1)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Apply Filters
          </button>
          <button
            onClick={() => {
              setFilters(DEFAULT_FILTERS);
              setTimeout(() => fetchLogs(1), 0);
            }}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200"
          >
            Reset
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">{pageLabel}</span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading audit logs...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">Failed to load audit logs</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => fetchLogs(pagination.currentPage || 1)}
              className="mt-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {hasData ? (
              logs.map((log) => (
                <div key={log.id || `${log.event}-${log.createdAt}`} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{log.event || 'event.unknown'}</p>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getSeverityChipClasses(log.severity)}`}>
                      {log.severity || 'info'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{log.domain || 'domain.unknown'} • {formatDateTime(log.createdAt)}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{log.summary || 'No summary available.'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{formatMetadataPreview(log.metadata)}</p>

                  <button
                    onClick={() => openTimeline(resolveTimelineSeed(log))}
                    className="mt-3 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200"
                  >
                    View Timeline
                  </button>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
                <Shield className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No audit logs matched the current filters.</p>
              </div>
            )}
          </div>

          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Domain</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Actor</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Summary</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Metadata</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {hasData ? (
                    logs.map((log) => (
                      <tr key={log.id || `${log.event}-${log.createdAt}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(log.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{log.domain || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{log.event || 'event.unknown'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getSeverityChipClasses(log.severity)}`}>
                            {log.severity || 'info'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{log.actorId || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{log.summary || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[280px]">
                          <details>
                            <summary className="cursor-pointer">{formatMetadataPreview(log.metadata)}</summary>
                            <pre className="mt-2 text-[11px] whitespace-pre-wrap break-words">{JSON.stringify(log.metadata || {}, null, 2)}</pre>
                          </details>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openTimeline(resolveTimelineSeed(log))}
                            className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200"
                          >
                            Timeline
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                        No audit logs matched the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <span className="text-xs text-gray-500 dark:text-gray-400">Page {pagination.currentPage} of {Math.max(1, pagination.lastPage)}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(Math.max(1, pagination.currentPage - 1), true)}
                disabled={pagination.currentPage <= 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchLogs(Math.min(pagination.lastPage, pagination.currentPage + 1), true)}
                disabled={pagination.currentPage >= pagination.lastPage || loading}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {timelineOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock4 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Entity Timeline
              </h2>
              <button onClick={closeTimeline} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  value={timelineQuery.entity_type}
                  onChange={(event) => setTimelineQuery((prev) => ({ ...prev, entity_type: event.target.value }))}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                >
                  <option value="booking">Booking</option>
                  <option value="invoice">Invoice</option>
                  <option value="payment">Payment</option>
                  <option value="user">User</option>
                </select>
                <input
                  type="number"
                  min="1"
                  placeholder="Entity ID"
                  value={timelineQuery.entity_id}
                  onChange={(event) => setTimelineQuery((prev) => ({ ...prev, entity_id: event.target.value }))}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                />
                <select
                  value={timelineQuery.order}
                  onChange={(event) => setTimelineQuery((prev) => ({ ...prev, order: event.target.value }))}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                >
                  <option value="asc">Order: Ascending</option>
                  <option value="desc">Order: Descending</option>
                </select>
                <button
                  onClick={runTimelineSearch}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Load Timeline
                </button>
              </div>

              {timelineLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading timeline...</p>
                </div>
              ) : timelineError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm text-red-600 dark:text-red-300">
                  {timelineError}
                </div>
              ) : timelineRecords.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No timeline records yet. Provide an entity ID and load timeline.
                </div>
              ) : (
                <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {timelineRecords.map((record) => (
                      <div key={record.id || `${record.event}-${record.createdAt}`} className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{record.event || 'event.unknown'}</p>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getSeverityChipClasses(record.severity)}`}>
                            {record.severity || 'info'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{record.domain || 'domain.unknown'} • {formatDateTime(record.createdAt)}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{record.summary || 'No summary available.'}</p>
                        <details className="mt-2">
                          <summary className="text-xs text-indigo-600 dark:text-indigo-300 cursor-pointer">View metadata</summary>
                          <pre className="mt-2 text-[11px] whitespace-pre-wrap break-words text-gray-600 dark:text-gray-300">{JSON.stringify(record.metadata || {}, null, 2)}</pre>
                        </details>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
