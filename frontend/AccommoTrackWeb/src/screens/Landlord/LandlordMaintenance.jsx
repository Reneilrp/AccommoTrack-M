import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { maintenanceService } from '../../services/maintenanceService';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Building2,
  User,
  ArrowLeft,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import { getImageUrl } from '../../utils/api';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import AssignWorkerModal from '../../components/Maintenance/AssignWorkerModal';

export default function LandlordMaintenance({ user, accessRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const propertyId = queryParams.get('property_id');
  const isCaretaker = accessRole === 'caretaker' || user?.role === 'caretaker';
  const { uiState, updateScreenState, updateData } = useUIState();
  const cachedData = uiState.data?.landlord_maintenance || cacheManager.get('landlord_maintenance');
  const savedState = uiState.maintenance || {};

  const [requests, setRequests] = useState(cachedData?.requests || []);
  const [loading, setLoading] = useState(!cachedData);
  const [filterStatus, setFilterStatus] = useState(savedState.filterStatus || 'all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [drilldownApplied, setDrilldownApplied] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [requestToAssign, setRequestToAssign] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const params = {};
      if (propertyId) params.property_id = propertyId;
      const response = await maintenanceService.getSummary(params);
      if (response.success) {
        setSummary(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch summary', err);
    } finally {
      setLoadingSummary(false);
    }
  }, [propertyId]);

  const fetchRequests = useCallback(async (statusToLoad) => {
    try {
      setLoading(true);
      fetchSummary(); // Load stats alongside requests
      const payload = { status: statusToLoad };
      if (propertyId) payload.property_id = propertyId;
      const response = await maintenanceService.getLandlordRequests(payload);
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      setRequests(list);

      // Handle requestId drilldown
      const drilldownId = new URLSearchParams(location.search).get('requestId');
      if (drilldownId && !drilldownApplied && list.length > 0) {
        const target = list.find(r => String(r.id) === String(drilldownId));
        if (target) {
          setDrilldownApplied(true);
          setSelectedRequest(target);
        }
      }

      const nextCache = { requests: list };
      updateData('landlord_maintenance', nextCache);
      cacheManager.set('landlord_maintenance', nextCache);
      return true;
    } catch (err) {
      console.error('Failed to fetch maintenance requests', err);
      showError('Failed to load maintenance records');
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateData, propertyId, fetchSummary, location.search, drilldownApplied]);

  useEffect(() => {
    fetchRequests(filterStatus);
  }, [fetchRequests, filterStatus]);

  const handleFilterChange = async (status) => {
    if (status === filterStatus || loading) return;
    const success = await fetchRequests(status);
    if (!success) return;

    setFilterStatus(status);
    updateScreenState('maintenance', { filterStatus: status });
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await maintenanceService.updateStatus(id, newStatus);
      showSuccess(`Request marked as ${newStatus.replace('_', ' ')}`);

      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      if (selectedRequest?.id === id) {
        setSelectedRequest(prev => ({ ...prev, status: newStatus }));
      }

      if (filterStatus !== 'all') {
        await fetchRequests(filterStatus);
      }
    } catch {
      showError('Failed to update status');
    }
  };

  const handleAssignWorker = async (id, workerId) => {
    try {
      const response = await maintenanceService.assignWorker(id, workerId);
      if (response.success) {
        showSuccess(response.message || 'Worker assigned successfully');

        const updatedRequest = response.data;
        setRequests(prev => prev.map(r => r.id === id ? updatedRequest : r));
        if (selectedRequest?.id === id) {
          setSelectedRequest(updatedRequest);
        }
      } else {
        showError(response.message || 'Failed to assign worker');
      }
    } catch (err) {
      console.error('Assignment error', err);
      showError('An error occurred during assignment');
    }
  };

  const handleCompleteRequest = async (id) => {
    try {
      const response = await maintenanceService.completeRequest(id);
      if (response.success) {
        showSuccess(response.message || 'Request resolved');

        const updatedRequest = response.data;
        setRequests(prev => prev.map(r => r.id === id ? updatedRequest : r));
        if (selectedRequest?.id === id) {
          setSelectedRequest(updatedRequest);
        }
      }
    } catch {
      showError('Failed to mark as completed');
    }
  };

  return (

    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 mb-8">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

          <div className="flex items-center justify-center relative min-h-[40px]">

            {/* Left: Back button */}

            <div className="absolute left-0 flex items-center">

              <button

                type="button"

                onClick={() => navigate(-1)}

                className="p-2 bg-white dark:bg-gray-800 text-green-600 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 hover:scale-110 transition-all flex-shrink-0"

              >

                <ArrowLeft className="w-5 h-5" />

              </button>

            </div>



            {/* Center: Title */}

            <div className="text-center">

              <h1 className="text-xl font-bold text-gray-900 dark:text-white">

                Maintenance Requests

              </h1>

            </div>

          </div>

        </div>

      </header>



      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
        {/* Summary Stats */}
        <div className={`grid grid-cols-2 ${isCaretaker ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
          {isCaretaker && (
            <StatCard
              label="Assigned to Me"
              value={summary?.assigned_to_me ?? 0}
              icon={UserCheck}
              color="text-brand-600"
              bgColor="bg-brand-50"
              loading={loadingSummary}
            />
          )}
          <StatCard
            label="Pending"
            value={summary?.pending ?? 0}
            icon={Clock}
            color="text-yellow-600"
            bgColor="bg-yellow-50"
            loading={loadingSummary}
          />
          <StatCard
            label="In Progress"
            value={summary?.in_progress ?? 0}
            icon={RefreshCw}
            color="text-blue-600"
            bgColor="bg-blue-50"
            loading={loadingSummary}
          />
          <StatCard
            label="Completed Today"
            value={summary?.completed_today ?? 0}
            icon={CheckCircle2}
            color="text-green-600"
            bgColor="bg-green-50"
            loading={loadingSummary}
          />
        </div>

        {/* Filters */}

        <div className="flex gap-2 overflow-x-auto pb-2">

          {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map(s => (

            <button

              key={s}

              type="button"

              onClick={() => handleFilterChange(s)}
              disabled={loading}

              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap ${filterStatus === s

                ? 'bg-brand-600 text-white shadow-md'

                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-gray-50'

                } disabled:opacity-60 disabled:cursor-not-allowed`}

            >

              {s.replace('_', ' ')}

            </button>

          ))}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => fetchRequests(filterStatus)}
              disabled={loading}
              title="Refresh"
              className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </button>
          </div>

        </div>



        {/* Requests Grid with Overlay Loader */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative min-h-[200px]">

          {loading && (

            <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-10 flex items-center justify-center backdrop-blur-[1px] rounded-2xl">

              <Loader2 className="w-8 h-8 animate-spin text-brand-700" />

            </div>

          )}



          {!loading && requests.length === 0 ? (

            <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">

              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">

                <CheckCircle2 className="w-8 h-8 text-green-300" />

              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">All clear!</h3>

              <p className="text-gray-500 text-sm max-w-xs mx-auto">No maintenance requests found for this status.</p>

            </div>

          ) : (

            requests.map((req) => (

              <div

                key={req.id}

                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all flex flex-col"

              >

                {/* Header */}

                <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-start">

                  <div className={`px-2 py-2 rounded text-[10px] font-bold uppercase border ${maintenanceService.getPriorityColor(req.priority)}`}>

                    {req.priority}

                  </div>

                  <span className={`px-2 py-2 rounded-full text-[10px] font-bold uppercase ${maintenanceService.getStatusColor(req.status)}`}>

                    {req.status.replace('_', ' ')}

                  </span>

                </div>



                {/* Body */}

                <div className="p-6 flex-1 space-y-4">

                  <div>

                    <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{req.title}</h4>

                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-2">{req.description}</p>

                  </div>



                  <div className="grid grid-cols-2 gap-4 text-xs">

                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">

                      <Building2 className="w-3.5 h-3.5" />

                      <span className="truncate">{req.property?.title || 'Property'}</span>

                    </div>

                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">

                      <User className="w-3.5 h-3.5" />

                      <span className="truncate">{req.tenant?.first_name} {req.tenant?.last_name}</span>

                    </div>

                  </div>



                  {req.assigned_to && (
                    <div className="flex items-center gap-2 text-brand-700 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/10 p-2 rounded-lg border border-brand-100 dark:border-brand-900/30">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold truncate">Assigned to: {req.assigned_to_user?.first_name || req.assigned_to_user?.name || req.assigned_to?.first_name || 'Assigned'}</span>
                    </div>
                  )}



                  {req.images && req.images.length > 0 && (

                    <div className="flex gap-2 overflow-hidden h-12">

                      {req.images.map((img, i) => (

                        <img

                          key={i}

                          src={getImageUrl(img)}

                          className="w-12 h-12 object-cover rounded-lg border border-gray-100 dark:border-gray-600"

                          alt="Issue"

                        />

                      ))}

                    </div>

                  )}

                </div>



                {/* Actions */}

                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-50 dark:border-gray-700 flex gap-2">

                  {req.status === 'pending' && (

                    <button

                      onClick={() => handleUpdateStatus(req.id, 'in_progress')}

                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"

                    >

                      Accept

                    </button>

                  )}

                  {req.status === 'in_progress' && (

                    <button

                      onClick={() => handleCompleteRequest(req.id)}

                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"

                    >

                      Complete

                    </button>

                  )}

                  {!req.assigned_to && (req.status === 'pending' || req.status === 'in_progress') && (
                    <button
                      onClick={() => {
                        setRequestToAssign(req);
                        setIsAssignModalOpen(true);
                      }}
                      className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Assign
                    </button>
                  )}

                  <button

                    onClick={() => setSelectedRequest(req)}

                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"

                  >

                    View

                  </button>

                </div>

              </div>

            ))

          )}

        </div>

        {/* Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Maintenance Details</h3>
                <button onClick={() => setSelectedRequest(null)} className="text-gray-500 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedRequest.title}</h2>
                    <p className="text-sm text-gray-500 mt-2">Submitted on {new Date(selectedRequest.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase ${maintenanceService.getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${maintenanceService.getPriorityColor(selectedRequest.priority)}`}>
                      {selectedRequest.priority} Priority
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Tenant</p>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedRequest.tenant?.first_name} {selectedRequest.tenant?.last_name}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Location</p>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedRequest.property?.title} - Room {selectedRequest.booking?.room?.room_number}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Description</p>
                  <p className="text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedRequest.description}
                  </p>
                </div>

                {selectedRequest.images && selectedRequest.images.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-4">Attached Photos</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedRequest.images.map((img, i) => (
                        <a key={i} href={getImageUrl(img)} target="_blank" rel="noreferrer" className="block h-40 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                          <img src={getImageUrl(img)} className="w-full h-full object-cover hover:scale-105 transition-transform" alt="Evidence" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-4">
                <div className="flex gap-2">
                  {selectedRequest.status !== 'cancelled' && selectedRequest.status !== 'completed' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'cancelled')}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 font-bold text-sm rounded-lg"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-lg"
                  >
                    Close
                  </button>
                  {selectedRequest.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'in_progress')}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-lg shadow-blue-200"
                    >
                      Start Working
                    </button>
                  )}
                  {selectedRequest.status === 'in_progress' && (
                    <button
                      onClick={() => handleCompleteRequest(selectedRequest.id)}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg shadow-lg shadow-green-200"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {!selectedRequest.assigned_to && (selectedRequest.status === 'pending' || selectedRequest.status === 'in_progress') && (
                    <button
                      onClick={() => {
                        setRequestToAssign(selectedRequest);
                        setIsAssignModalOpen(true);
                      }}
                      className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-lg shadow-lg shadow-brand-200"
                    >
                      Assign Worker
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Modals */}
        <AssignWorkerModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          request={requestToAssign}
          onAssign={handleAssignWorker}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bgColor, loading }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
      <div className={`p-3 ${bgColor} dark:bg-gray-700 rounded-xl`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        {loading ? (
          <div className="h-6 w-8 bg-gray-100 dark:bg-gray-700 animate-pulse rounded mt-1" />
        ) : (
          <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}