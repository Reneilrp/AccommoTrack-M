import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getPropertyId(request) {
  return request?.property_id
    || request?.requested_room?.property?.id
    || request?.requestedRoom?.property?.id
    || request?.current_room?.property_id
    || request?.currentRoom?.property_id
    || null;
}

function getTenantName(request) {
  const tenant = request?.tenant || {};
  const full = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim();
  return full || tenant.name || 'Tenant';
}

function getRoomLabel(room) {
  if (!room) return 'N/A';
  return room.room_number || room.name || `Room ${room.id || 'N/A'}`;
}

export default function TransferRequests() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const propertyId = queryParams.get('property_id');
  const requestId = queryParams.get('request_id');

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [handlingAction, setHandlingAction] = useState('');
  const [notes, setNotes] = useState('');
  const [approvingTransferId, setApprovingTransferId] = useState(null);
  const [transferForms, setTransferForms] = useState({});
  const selectedRequestIdRef = useRef(null);
  const initialRequestIdRef = useRef(requestId ? Number(requestId) : null);

  useEffect(() => {
    selectedRequestIdRef.current = selectedRequestId;
  }, [selectedRequestId]);

  const selectedRequest = useMemo(
    () => requests.find(item => item.id === selectedRequestId) || null,
    [requests, selectedRequestId],
  );

  const updateTransferForm = (transferId, patch) => {
    setTransferForms((prev) => ({
      ...prev,
      [transferId]: {
        ...(prev[transferId] || {
          damage_charge: '',
          damage_description: '',
          landlord_notes: '',
          prorated_adjustment: '',
          prorationDetails: null,
          loadingProration: false,
        }),
        ...patch,
      },
    }));
  };

  const getTransferForm = (transferId) => {
    return transferForms[transferId] || {
      damage_charge: '',
      damage_description: '',
      landlord_notes: '',
      prorated_adjustment: '',
      prorationDetails: null,
      loadingProration: false,
    };
  };

  const startTransferApproval = async (transferId) => {
    setApprovingTransferId(transferId);
    updateTransferForm(transferId, { loadingProration: true });
    try {
      const res = await api.get(`/landlord/transfers/${transferId}/proration`);
      updateTransferForm(transferId, {
        prorationDetails: res.data,
        prorated_adjustment: res.data.suggested_adjustment,
        loadingProration: false,
      });
    } catch (err) {
      updateTransferForm(transferId, { loadingProration: false, prorationDetails: null });
      toast.error('Failed to calculate rent proration details');
    }
  };

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/landlord/transfers');
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
          ? res.data
          : [];

      const normalizedPropertyId = propertyId ? Number(propertyId) : null;
      const filtered = normalizedPropertyId
        ? list.filter(item => Number(getPropertyId(item)) === normalizedPropertyId)
        : list;

      setRequests(filtered);

      if (filtered.length === 0) {
        setSelectedRequestId(null);
        setNotes('');
        return;
      }

      const preferredId = initialRequestIdRef.current || selectedRequestIdRef.current;
      const target = preferredId
        ? filtered.find(item => Number(item.id) === Number(preferredId))
        : filtered[0];
      const next = target || filtered[0];

      setSelectedRequestId(next.id);
      setNotes(next.landlord_notes || '');
      initialRequestIdRef.current = null;
    } catch (err) {
      console.error('Failed to load transfer requests', err);
      toast.error(err?.response?.data?.message || 'Failed to load transfer requests');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (transferId, action) => {
    try {
      const form = getTransferForm(transferId);
      const damageCharge = Number(form.damage_charge || 0);

      if (action === 'approve' && damageCharge > 0 && !String(form.damage_description || '').trim()) {
        toast.error('Damage description is required when damage charge is set.');
        return;
      }

      setHandlingAction(action);

      const payload = {
        action,
        landlord_notes: String(form.landlord_notes || '').trim() || undefined,
        damage_charge: damageCharge > 0 ? damageCharge : undefined,
        damage_description: damageCharge > 0 ? String(form.damage_description || '').trim() : undefined,
        prorated_adjustment: form.prorated_adjustment !== '' ? Number(form.prorated_adjustment) : undefined,
      };

      await api.patch(`/landlord/transfers/${transferId}/handle`, payload);

      toast.success(`Transfer request ${action}d successfully`);

      setRequests(prev => prev.map(item => (
        item.id === transferId
          ? { ...item, status: action === 'approve' ? 'approved' : 'rejected', landlord_notes: payload.landlord_notes || item.landlord_notes || null }
          : item
      )));

      setApprovingTransferId(null);
      setTransferForms((prev) => {
        const updated = { ...prev };
        delete updated[transferId];
        return updated;
      });
    } catch (err) {
      console.error(`Failed to ${action} transfer request`, err);
      toast.error(err?.response?.data?.message || `Failed to ${action} transfer request`);
    } finally {
      setHandlingAction('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center relative min-h-[40px]">
            <div className="absolute left-0 flex items-center">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 bg-white dark:bg-gray-800 text-green-600 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 hover:scale-110 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Transfer Requests</h1>
            </div>

            <div className="absolute right-0 flex items-center">
              <button
                onClick={fetchRequests}
                disabled={loading}
                title="Refresh"
                className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-700" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">No transfer requests</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Pending and historical transfer requests will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              {requests.map((req) => {
                const status = req.status || 'pending';
                const statusColor = status === 'pending'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  : status === 'approved'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
                const isActive = selectedRequestId === req.id;

                return (
                  <button
                    key={req.id}
                    onClick={() => {
                      setSelectedRequestId(req.id);
                      setNotes(req.landlord_notes || '');
                      setApprovingTransferId(null);
                    }}
                    className={`w-full text-left bg-white dark:bg-gray-800 rounded-2xl border p-4 shadow-sm transition-all ${isActive ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{getTenantName(req)}</p>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor}`}>
                        {status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Requested: {formatDate(req.created_at)}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 truncate">
                      {getRoomLabel(req.current_room || req.currentRoom)}{' -> '}{getRoomLabel(req.requested_room || req.requestedRoom)}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-2">
              {selectedRequest ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Transfer Request Details</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getTenantName(selectedRequest)}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">From Room</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-1">{getRoomLabel(selectedRequest.current_room || selectedRequest.currentRoom)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Requested Room</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-1">{getRoomLabel(selectedRequest.requested_room || selectedRequest.requestedRoom)}</p>
                    </div>
                  </div>

                  <div className="mt-4 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg text-sm">
                    <p className="text-xs text-gray-500">Reason</p>
                    <p className="text-gray-900 dark:text-white mt-1">{selectedRequest.reason || 'No reason provided'}</p>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Landlord Notes</label>
                    <textarea
                      value={approvingTransferId === selectedRequest.id ? getTransferForm(selectedRequest.id).landlord_notes : notes}
                      onChange={(e) => {
                        if (approvingTransferId === selectedRequest.id) {
                          updateTransferForm(selectedRequest.id, { landlord_notes: e.target.value });
                        } else {
                          setNotes(e.target.value);
                        }
                      }}
                      rows={3}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="Optional notes"
                      disabled={selectedRequest.status !== 'pending'}
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                    {selectedRequest.status === 'pending' ? (
                      approvingTransferId === selectedRequest.id ? (
                        <div className="w-full space-y-4 animate-in slide-in-from-top-2">
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                            <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase mb-2">Rent Proration Details</p>
                            {getTransferForm(selectedRequest.id).loadingProration ? (
                              <div className="text-blue-600 dark:text-blue-400 text-xs flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Calculating...
                              </div>
                            ) : getTransferForm(selectedRequest.id).prorationDetails ? (
                              <>
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="text-gray-600 dark:text-gray-400">Unused Days (Old Room):</span>
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {Number(getTransferForm(selectedRequest.id).prorationDetails.remaining_days).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Suggested Final Adjustment:</span>
                                  <span className={`font-black ${getTransferForm(selectedRequest.id).prorationDetails.suggested_adjustment > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {getTransferForm(selectedRequest.id).prorationDetails.suggested_adjustment > 0 ? '+' : ''}
                                    ₱{getTransferForm(selectedRequest.id).prorationDetails.suggested_adjustment.toLocaleString()}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-red-500">Failed to calculate proration.</p>
                            )}

                            <div className="mt-3">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mt-2 mb-1">Final Override Adjustment (₱)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={getTransferForm(selectedRequest.id).prorated_adjustment}
                                onChange={(e) => updateTransferForm(selectedRequest.id, { prorated_adjustment: e.target.value })}
                                className="w-full text-base font-bold bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700/50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={getTransferForm(selectedRequest.id).damage_charge}
                              onChange={(e) => updateTransferForm(selectedRequest.id, { damage_charge: e.target.value })}
                              placeholder="Damage charge (optional)"
                              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-900 dark:text-white"
                            />
                            {parseFloat(getTransferForm(selectedRequest.id).damage_charge) > 0 && (
                              <input
                                type="text"
                                value={getTransferForm(selectedRequest.id).damage_description}
                                onChange={(e) => updateTransferForm(selectedRequest.id, { damage_description: e.target.value })}
                                placeholder="Damage description"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-900 dark:text-white"
                              />
                            )}
                          </div>

                          <textarea
                            value={getTransferForm(selectedRequest.id).landlord_notes}
                            onChange={(e) => updateTransferForm(selectedRequest.id, { landlord_notes: e.target.value })}
                            placeholder="Landlord notes / instructions..."
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-900 dark:text-white h-20 resize-none"
                          />

                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setApprovingTransferId(null)}
                              className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleAction(selectedRequest.id, 'approve')}
                              disabled={Boolean(handlingAction)}
                              className="px-4 py-2 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                            >
                              {handlingAction === 'approve' ? 'Approving...' : 'Confirm Approval'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAction(selectedRequest.id, 'reject')}
                            disabled={Boolean(handlingAction)}
                            className="px-4 py-2 rounded-lg text-sm font-bold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                          >
                            {handlingAction === 'reject' ? 'Rejecting...' : 'Reject'}
                          </button>
                          <button
                            onClick={() => startTransferApproval(selectedRequest.id)}
                            disabled={Boolean(handlingAction)}
                            className="px-4 py-2 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            Approve
                          </button>
                        </>
                      )
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Request already {selectedRequest.status}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Select a request from the list to view details.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}