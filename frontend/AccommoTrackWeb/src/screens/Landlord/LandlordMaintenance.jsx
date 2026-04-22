import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { maintenanceService } from '../../services/maintenanceService';
import { RefreshCw, Loader2, Wrench } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import AssignWorkerModal from '../../components/Maintenance/AssignWorkerModal';
import MaintenanceStats from './components/Maintenance/MaintenanceStats';
import MaintenanceFilters from './components/Maintenance/MaintenanceFilters';
import MaintenanceTableRow from './components/Maintenance/MaintenanceTableRow';
import MaintenanceDetailModal from './components/Maintenance/MaintenanceDetailModal';
import { SkeletonTableRow } from '../../components/Shared/Skeleton';

export default function LandlordMaintenance() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const propertyId = queryParams.get('property_id');
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.landlord_maintenance || cacheManager.get('landlord_maintenance');

  const [requests, setRequests] = useState(cachedData?.requests || []);
  const [loading, setLoading] = useState(!cachedData);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [summary, setSummary] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [requestToAssign, setRequestToAssign] = useState(null);
  const [processing, setProcessing] = useState(false);

  const fetchSummary = useCallback(async () => {
    const res = await maintenanceService.getSummary(propertyId ? { property_id: propertyId } : {});
    if (res.success) setSummary(res.data);
  }, [propertyId]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    fetchSummary();
    const res = await maintenanceService.getLandlordRequests({ 
      status: filterStatus !== 'all' ? filterStatus : undefined,
      property_id: propertyId,
      search: searchQuery
    });
    if (res.success) {
      const list = res.data?.items || res.data || [];
      setRequests(list);
      updateData('landlord_maintenance', { requests: list });
    }
    setLoading(false);
  }, [filterStatus, propertyId, searchQuery, updateData, fetchSummary]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleUpdateStatus = async (id, status) => {
    setProcessing(true);
    const res = await maintenanceService.updateRequestStatus(id, { status, notes: `Status updated to ${status} by landlord.` });
    if (res.success) {
      showSuccess(`Request ${status}`);
      fetchRequests();
      setShowDetailModal(false);
    } else {
      showError(res.error);
    }
    setProcessing(false);
  };

  const handleAssignWorker = async (workerId) => {
    setProcessing(true);
    const res = await maintenanceService.assignWorker(requestToAssign.id, workerId);
    if (res.success) {
      showSuccess('Worker assigned');
      fetchRequests();
      setIsAssignModalOpen(false);
      setShowDetailModal(false);
    } else {
      showError(res.error);
    }
    setProcessing(false);
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const getStatusBadge = (s) => maintenanceService.getStatusColor(s);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maintenance Requests</h1>
          <p className="text-sm text-gray-500">Manage repair tickets and property upkeep tasks.</p>
        </div>
        <button onClick={fetchRequests} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <MaintenanceStats summary={summary} />
      
      <MaintenanceFilters 
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ticket</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Issue</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading && requests.length === 0 ? (
                [...Array(5)].map((_, i) => <SkeletonTableRow key={i} columns={6} />)
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No maintenance requests found.</td>
                </tr>
              ) : (
                requests.map((r) => (
                  <MaintenanceTableRow 
                    key={r.id} 
                    request={r} 
                    onView={() => { setSelectedRequest(r); setShowDetailModal(true); }}
                    onAssign={() => { setRequestToAssign(r); setIsAssignModalOpen(true); }}
                    getStatusBadge={getStatusBadge}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MaintenanceDetailModal 
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        request={selectedRequest}
        onUpdateStatus={handleUpdateStatus}
        onAssign={(req) => { setRequestToAssign(req); setIsAssignModalOpen(true); }}
        processing={processing}
        formatDate={formatDate}
        getStatusBadge={getStatusBadge}
      />

      <AssignWorkerModal 
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        request={requestToAssign}
        onAssign={handleAssignWorker}
      />
    </div>
  );
}