import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, Loader2 } from 'lucide-react';
import { tenantService } from '../../services/tenantService';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import MaintenanceRequestList from './components/Maintenance/MaintenanceRequestList';
import MaintenanceRequestDetail from './components/Maintenance/MaintenanceRequestDetail';
import MaintenanceRequestModal from '../../components/Modals/MaintenanceRequestModal';
import { showSuccess, showError } from '../../utils/toast';

export default function TenantMaintenance() {
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.tenant_maintenance || cacheManager.get('tenant_maintenance');

  const [requests, setRequests] = useState(cachedData?.requests || []);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(!cachedData);
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeStay, setActiveStay] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const [reqRes, stayRes] = await Promise.all([
      tenantService.getMaintenanceRequests(),
      tenantService.getActiveStays()
    ]);

    if (reqRes.success) {
      setRequests(reqRes.data);
      updateData('tenant_maintenance', { requests: reqRes.data });
      cacheManager.set('tenant_maintenance', { requests: reqRes.data });
      
      // Select first if none selected
      if (reqRes.data.length > 0) {
        setSelectedRequest(prev => prev || reqRes.data[0]);
      }
    }

    if (stayRes.success && stayRes.data.length > 0) {
      setActiveStay(stayRes.data[0]);
    }
    setLoading(false);
  }, [updateData]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleCreateRequest = async (formData) => {
    const res = await tenantService.submitMaintenanceRequest(formData);
    if (res.success) {
      showSuccess('Maintenance request submitted!');
      setShowNewModal(false);
      fetchRequests();
    } else {
      showError(res.error);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Maintenance</h1>
           <p className="text-sm font-medium text-gray-500">Report issues and track repair status.</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowNewModal(true)}
             className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all"
           >
             <Plus className="w-5 h-5" /> New Request
           </button>
           <button onClick={fetchRequests} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">
        <aside className="lg:col-span-1 space-y-4">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Your Tickets</h3>
           <MaintenanceRequestList 
             requests={requests} 
             selectedId={selectedRequest?.id} 
             onSelect={setSelectedRequest}
             loading={loading}
           />
        </aside>

        <main className="lg:col-span-2">
           <MaintenanceRequestDetail 
             request={selectedRequest} 
             formatDate={formatDate}
           />
        </main>
      </div>

      <MaintenanceRequestModal 
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={handleCreateRequest}
        activeStay={activeStay}
      />
    </div>
  );
}