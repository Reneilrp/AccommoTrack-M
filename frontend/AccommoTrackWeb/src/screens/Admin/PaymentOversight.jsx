import React, { useCallback, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, Loader2, Shield, XCircle, Download } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import adminService from '../../services/adminService';
import { getImageUrl } from '../../utils/api';
import { exportToCSV } from '../../utils/csvExport';

const DEFAULT_FILTERS = {
  status: 'pending',
  risk_flag: 'all',
  date_from: '',
  date_to: '',
  property_id: '',
  landlord_id: '',
  tenant_id: '',
  per_page: 25,
};

const formatMethodLabel = (method) => {
  if (!method) return 'N/A';
  return method
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString();
};

const formatPesoFromCents = (amountCents) => {
  const amount = Number(amountCents || 0);
  return amount.toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
  });
};

const getStatusChipClasses = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    case 'approved':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'denied':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }
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

export default function PaymentOversight() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    from: null,
    to: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [overrideNote, setOverrideNote] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofImageUrl, setProofImageUrl] = useState('');

  const buildRequestFilters = useCallback(() => {
    const propertyId = toPositiveIntegerOrNull(filters.property_id);
    const landlordId = toPositiveIntegerOrNull(filters.landlord_id);
    const tenantId = toPositiveIntegerOrNull(filters.tenant_id);

    return {
      status: filters.status,
      risk_flag: filters.risk_flag,
      date_from: filters.date_from,
      date_to: filters.date_to,
      per_page: filters.per_page,
      property_id: propertyId,
      landlord_id: landlordId,
      tenant_id: tenantId,
    };
  }, [filters]);

  const fetchQueue = useCallback(
    async (page = 1, silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError('');

      const response = await adminService.getPaymentOversightQueue({
        ...buildRequestFilters(),
        page,
      });

      if (response.success) {
        setRecords(response.data?.items || []);
        setPagination({
          currentPage: response.data?.pagination?.currentPage || 1,
          lastPage: response.data?.pagination?.lastPage || 1,
          total: response.data?.pagination?.total || 0,
          from: response.data?.pagination?.from,
          to: response.data?.pagination?.to,
        });
      } else {
        setError(response.error || 'Failed to load payment oversight queue.');
      }

      setLoading(false);
    },
    [buildRequestFilters],
  );

  React.useEffect(() => {
    fetchQueue(1);
  }, [fetchQueue]);

  const hasData = records.length > 0;

  const pageLabel = useMemo(() => {
    if (!pagination.total) {
      return 'No records';
    }

    if (pagination.from && pagination.to) {
      return `Showing ${pagination.from} to ${pagination.to} of ${pagination.total}`;
    }

    return `Total records: ${pagination.total}`;
  }, [pagination]);

  const openOverrideModal = (record) => {
    setSelectedRecord(record);
    setOverrideNote('');
    setOverrideModalOpen(true);
  };

  const closeOverrideModal = () => {
    setOverrideModalOpen(false);
    setSelectedRecord(null);
    setOverrideNote('');
  };

  const handleOverrideApprove = async () => {
    if (!selectedRecord?.invoiceId) {
      showError('Invoice reference is missing for this row.');
      return;
    }

    const trimmedNote = overrideNote.trim();
    if (!trimmedNote) {
      showError('Override note is required.');
      return;
    }

    const confirmed = window.confirm('Proceed with admin override approval for this invoice?');
    if (!confirmed) {
      return;
    }

    setOverrideLoading(true);
    const response = await adminService.overrideApprovePayment(selectedRecord.invoiceId, { note: trimmedNote });
    setOverrideLoading(false);

    if (!response.success) {
      showError(response.error || 'Failed to apply override approval.');
      return;
    }

    showSuccess(response.message || 'Override approval applied successfully.');
    closeOverrideModal();
    fetchQueue(pagination.currentPage || 1, true);
  };

  const openProofModal = (record) => {
    const resolvedUrl = record?.proofImageUrl || (record?.proofImagePath ? getImageUrl(record.proofImagePath) : null);
    if (!resolvedUrl) {
      showError('No proof image available for this entry.');
      return;
    }

    setProofImageUrl(resolvedUrl);
    setProofModalOpen(true);
  };

  const closeProofModal = () => {
    setProofModalOpen(false);
    setProofImageUrl('');
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleExportCSV = () => {
    const dataToExport = records.map(record => ({
      Invoice_Reference: record.invoiceReference || `#${record.invoiceId || 'N/A'}`,
      Tenant_Name: record.tenantName || 'Unknown',
      Property_Title: record.propertyTitle || 'Unknown',
      Room: record.roomNumber || 'N/A',
      Amount_PHP: Number(record.amountCents || 0),
      Method: formatMethodLabel(record.method),
      Status: record.status || 'unknown',
      Risk_Flags: record.riskFlags?.join(', ') || 'None',
      Submitted_At: formatDateTime(record.submittedAt)
    }));
    exportToCSV('Payment_Oversight_Export', dataToExport);
  };

  return (
    <div className="w-full max-w-full px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Payment Oversight Queue
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review manual payment submissions, risk indicators, and apply justified override approvals.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={!hasData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <select
            value={filters.status}
            onChange={(event) => handleFilterChange('status', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          >
            <option value="all">Status: All</option>
            <option value="pending">Status: Pending</option>
            <option value="denied">Status: Denied</option>
            <option value="approved">Status: Approved</option>
          </select>

          <select
            value={filters.risk_flag}
            onChange={(event) => handleFilterChange('risk_flag', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          >
            <option value="all">Risk: All</option>
            <option value="high_denial_rate">Risk: High Denial Rate</option>
            <option value="multiple_denials">Risk: Multiple Denials</option>
          </select>

          <input
            type="date"
            value={filters.date_from}
            onChange={(event) => handleFilterChange('date_from', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />

          <input
            type="date"
            value={filters.date_to}
            onChange={(event) => handleFilterChange('date_to', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />

          <input
            type="number"
            min="1"
            placeholder="Property ID"
            value={filters.property_id}
            onChange={(event) => handleFilterChange('property_id', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />

          <input
            type="number"
            min="1"
            placeholder="Landlord ID"
            value={filters.landlord_id}
            onChange={(event) => handleFilterChange('landlord_id', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />

          <input
            type="number"
            min="1"
            placeholder="Tenant ID"
            value={filters.tenant_id}
            onChange={(event) => handleFilterChange('tenant_id', event.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />

          <select
            value={filters.per_page}
            onChange={(event) => handleFilterChange('per_page', Number.parseInt(event.target.value, 10))}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchQueue(1)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            Apply Filters
          </button>
          <button
            onClick={() => {
              setFilters(DEFAULT_FILTERS);
              setTimeout(() => fetchQueue(1), 0);
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
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading oversight queue...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">Failed to load oversight queue</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => fetchQueue(pagination.currentPage || 1)}
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
              records.map((record) => (
                <div key={record.id || `${record.invoiceId}-${record.submittedAt}`} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{record.invoiceReference || `Invoice #${record.invoiceId || 'N/A'}`}</p>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusChipClasses(record.status)}`}>
                      {record.status || 'unknown'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{record.tenantName || 'Unknown Tenant'} • {record.propertyTitle || 'Unknown Property'}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-semibold">{formatPesoFromCents(record.amountCents)} • {formatMethodLabel(record.method)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Submitted: {formatDateTime(record.submittedAt)}</p>

                  {record.riskFlags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {record.riskFlags.map((flag) => (
                        <span key={`${record.id}-${flag}`} className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          {flag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => openProofModal(record)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200"
                    >
                      Proof
                    </button>
                    <button
                      onClick={() => openOverrideModal(record)}
                      disabled={record.status !== 'denied'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${record.status === 'denied' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                    >
                      Override
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
                <Shield className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No payment records matched the current filters.</p>
              </div>
            )}
          </div>

          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Invoice / Receipt</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Tenant / Property</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Risk</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Submitted</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {hasData ? (
                    records.map((record) => (
                      <tr key={record.id || `${record.invoiceId}-${record.submittedAt}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{record.invoiceReference || `#${record.invoiceId || 'N/A'}`}</p>
                          {record.invoice?.receipt_reference && (
                            <p className="text-xs font-mono font-bold text-indigo-500 mt-1 uppercase" title="Receipt Reference Number">
                              {record.invoice.receipt_reference}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{record.tenantName || 'Unknown Tenant'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{record.propertyTitle || 'Unknown Property'}{record.roomNumber ? ` • Room ${record.roomNumber}` : ''}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{formatPesoFromCents(record.amountCents)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{formatMethodLabel(record.method)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusChipClasses(record.status)}`}>
                            {record.status || 'unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {record.riskFlags?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {record.riskFlags.map((flag) => (
                                <span key={`${record.id}-${flag}`} className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                  {flag.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(record.submittedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end items-center gap-2">
                            <button
                              onClick={() => openProofModal(record)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Proof
                            </button>
                            <button
                              onClick={() => openOverrideModal(record)}
                              disabled={record.status !== 'denied'}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${record.status === 'denied' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Override
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                        No payment records matched the current filters.
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
                onClick={() => fetchQueue(Math.max(1, pagination.currentPage - 1), true)}
                disabled={pagination.currentPage <= 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchQueue(Math.min(pagination.lastPage, pagination.currentPage + 1), true)}
                disabled={pagination.currentPage >= pagination.lastPage || loading}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {overrideModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Override Approval</h2>
              <button onClick={closeOverrideModal} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p><span className="font-semibold">Invoice:</span> {selectedRecord.invoiceReference || `#${selectedRecord.invoiceId || 'N/A'}`}</p>
                <p><span className="font-semibold">Tenant:</span> {selectedRecord.tenantName || 'Unknown Tenant'}</p>
                <p><span className="font-semibold">Current Status:</span> {selectedRecord.status || 'unknown'}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Override Note</label>
                <textarea
                  value={overrideNote}
                  onChange={(event) => setOverrideNote(event.target.value)}
                  placeholder="Provide a clear justification for this admin override."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={closeOverrideModal}
                  disabled={overrideLoading}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOverrideApprove}
                  disabled={overrideLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2"
                >
                  {overrideLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirm Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {proofModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Proof Image Preview</h2>
              <button onClick={closeProofModal} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <img src={proofImageUrl} alt="Payment proof" className="w-full max-h-[70vh] object-contain rounded-lg bg-black/5" />
              <div className="mt-3 text-right">
                <a
                  href={proofImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Open Full Image
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
