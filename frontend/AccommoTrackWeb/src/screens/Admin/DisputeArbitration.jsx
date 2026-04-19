import React, { useState, useEffect, useCallback } from 'react';
import { Scale, AlertTriangle, CheckCircle2, Loader2, XCircle, MessageSquare, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import api from '../../utils/api';
import { showSuccess, showError } from '../../utils/toast';
import { exportToCSV } from '../../utils/csvExport';
import { Download } from 'lucide-react';

const STATUS_CLASSES = {
  open: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  dismissed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const RESOLUTION_LABELS = {
  force_refund: { label: 'Force Refund', icon: '💸', cls: 'bg-red-600 hover:bg-red-700' },
  release_to_landlord: { label: 'Release to Landlord', icon: '🏠', cls: 'bg-emerald-600 hover:bg-emerald-700' },
  dismissed: { label: 'Dismiss Dispute', icon: '🚫', cls: 'bg-gray-500 hover:bg-gray-600' },
};

function DisputeRow({ dispute, onResolved, type = 'booking' }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(dispute.admin_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [resolving, setResolving] = useState(null);

  const isReceipt = type === 'receipt';

  const handleResolve = async (resolution) => {
    const label = RESOLUTION_LABELS[resolution]?.label || resolution;
    if (!window.confirm(`Are you sure you want to "${label}" this dispute?`)) return;
    
    setResolving(resolution);
    try {
      const endpoint = isReceipt 
        ? `/admin/receipt-disputes/${dispute.id}/resolve` 
        : `/admin/disputes/${dispute.id}/resolve`;
        
      const payload = isReceipt 
        ? { status: resolution, admin_notes: notes }
        : { resolution, admin_notes: notes };

      const res = await api.post(endpoint, payload);
      showSuccess(res.data?.message || 'Resolution saved.');
      onResolved(res.data?.data);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to resolve.');
    } finally {
      setResolving(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!notes.trim()) return;
    if (isReceipt) {
        showError("Internal notes for receipts should be added during resolution.");
        return;
    }
    setSavingNotes(true);
    try {
      await api.patch(`/admin/disputes/${dispute.id}/notes`, { admin_notes: notes });
      showSuccess('Notes saved.');
    } catch {
      showError('Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const statusClass = STATUS_CLASSES[dispute.status] || STATUS_CLASSES.open;
  const isOpen = dispute.status === 'open';

  // For receipt disputes, normalize names
  const tenant = isReceipt ? dispute.invoice?.tenant : dispute.tenant;
  const landlord = isReceipt ? dispute.invoice?.property?.landlord : dispute.landlord;
  const reason = isReceipt ? dispute.message : dispute.reason;
  const identifier = isReceipt ? `Receipt #${dispute.receipt_reference}` : `Booking #${dispute.booking_id}`;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden transition-all ${
      isOpen ? 'border-amber-200 dark:border-amber-800/60' : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header row */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`mt-0.5 px-2 py-1 rounded-full text-[11px] font-bold uppercase shrink-0 ${statusClass}`}>
            {dispute.status}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {identifier} — {tenant?.first_name} {tenant?.last_name}
              {landlord && ` vs. ${landlord.first_name} ${landlord.last_name}`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
              {reason}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {dispute.created_at ? new Date(dispute.created_at).toLocaleDateString() : 'N/A'}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-5">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800/40">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Reporter / Tenant</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{tenant?.first_name} {tenant?.last_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{tenant?.email}</p>
            </div>
            {landlord && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-100 dark:border-purple-800/40">
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-1">Involved Landlord</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{landlord?.first_name} {landlord?.last_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{landlord?.email}</p>
              </div>
            )}
          </div>

          {/* Full reason */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              {isReceipt ? 'Report Message' : 'Dispute Reason'}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              {reason}
            </p>
          </div>

          {isReceipt && dispute.invoice_id && (
            <div className="pt-2">
                <button
                    onClick={() => window.open(`${api.defaults.baseURL}/invoices/${dispute.invoice_id}/receipt?print=1`, '_blank')}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                >
                    <FileText className="w-3.5 h-3.5" />
                    Open Official System Receipt
                </button>
            </div>
          )}

          {/* Resolved info */}
          {!isOpen && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800/40">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">
                Status: {dispute.status}
              </p>
              {dispute.resolved_at && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                   Modified on {new Date(dispute.updated_at).toLocaleString()}
                </p>
              )}
              {dispute.admin_notes && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{dispute.admin_notes}</p>
              )}
            </div>
          )}

          {/* Admin notes textarea (only for open) */}
          {isOpen && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                Resolution Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Explain the resolution or investigation findings…"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 resize-none"
              />
              {!isReceipt && (
                  <div className="mt-1 flex justify-end">
                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="px-3 py-1.5 text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                      {savingNotes ? 'Saving…' : 'Save Draft Notes'}
                    </button>
                  </div>
              )}
            </div>
          )}

          {/* Resolution actions (only for open disputes) */}
          {isOpen && (
            <div className="flex flex-wrap gap-2 pt-1">
              <p className="w-full text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Final Actions</p>
              {isReceipt ? (
                <>
                  <button
                    onClick={() => handleResolve('resolved')}
                    disabled={!!resolving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {resolving === 'resolved' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Mark as Resolved
                  </button>
                  <button
                    onClick={() => handleResolve('dismissed')}
                    disabled={!!resolving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {resolving === 'dismissed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Dismiss Report
                  </button>
                </>
              ) : (
                Object.entries(RESOLUTION_LABELS).map(([key, { label, icon, cls }]) => (
                    <button
                      key={key}
                      onClick={() => handleResolve(key)}
                      disabled={!!resolving}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 ${cls}`}
                    >
                      {resolving === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{icon}</span>}
                      {label}
                    </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DisputeArbitration() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [disputeType, setDisputeType] = useState('booking'); // 'booking' or 'receipt'

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = disputeType === 'receipt' ? '/admin/receipt-disputes' : '/admin/disputes';
      const res = await api.get(endpoint, {
        params: statusFilter !== 'all' ? { status: statusFilter } : {},
      });
      const raw = res.data?.data?.data || res.data?.data || [];
      setDisputes(Array.isArray(raw) ? raw : []);
    } catch {
      setError('Failed to load disputes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, disputeType]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const handleResolved = (updatedDispute) => {
    if (!updatedDispute) return;
    setDisputes((prev) => prev.map((d) => (d.id === updatedDispute.id ? updatedDispute : d)));
  };

  const handleExport = () => {
    exportToCSV('Dispute_Arbitration_Export', disputes.map((d) => ({
      ID: d.id,
      Booking_ID: d.booking_id,
      Status: d.status,
      Resolution: d.resolution || 'N/A',
      Tenant: `${d.tenant?.first_name} ${d.tenant?.last_name}`,
      Landlord: `${d.landlord?.first_name} ${d.landlord?.last_name}`,
      Reason: d.reason,
      Admin_Notes: d.admin_notes || '',
      Submitted: d.created_at ? new Date(d.created_at).toLocaleString() : 'N/A',
    })));
  };

  const openCount = disputes.filter((d) => d.status === 'open').length;

  return (
    <div className="w-full max-w-full px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            Dispute Arbitration
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {disputeType === 'receipt' 
              ? 'Review fraud reports submitted via QR verification scans.' 
              : 'Review and resolve tenant–landlord booking disputes.'}
          </p>
        </div>
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setDisputeType('booking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              disputeType === 'booking' ? 'bg-white dark:bg-gray-700 shadow-sm text-amber-600' : 'text-gray-500'
            }`}
          >
            Booking Disputes
          </button>
          <button
            onClick={() => setDisputeType('receipt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              disputeType === 'receipt' ? 'bg-white dark:bg-gray-700 shadow-sm text-amber-600' : 'text-gray-500'
            }`}
          >
            Receipt Reports
          </button>
        </div>
        <button
          onClick={handleExport}
          disabled={disputes.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50 w-fit"
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      {/* Filters + stats */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {['open', 'resolved', 'dismissed', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        {openCount > 0 && (
          <span className="ml-auto text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-1.5 rounded-full">
            {openCount} open dispute{openCount !== 1 ? 's' : ''} pending review
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading disputes…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">Failed to load</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button onClick={fetchDisputes} className="mt-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">Retry</button>
          </div>
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No disputes found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {statusFilter === 'open' ? 'All disputes have been resolved 🎉' : 'No records for this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => (
            <DisputeRow key={dispute.id} dispute={dispute} onResolved={handleResolved} type={disputeType} />
          ))}
        </div>
      )}
    </div>
  );
}
