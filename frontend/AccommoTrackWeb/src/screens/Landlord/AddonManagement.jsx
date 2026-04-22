import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../utils/api';
import AddonStats from './components/Addons/AddonStats';
import AddonTable from './components/Addons/AddonTable';
import AddonModal from './components/Addons/AddonModal';
import AddonRequestTable from './components/Addons/AddonRequestTable';

export default function AddonManagement() {
  const [addons, setAddons] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, revenue: 0, approved: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [processing, setProcessing] = useState(false);

  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('inventory'); // inventory or requests
  const [actionType, setActionType] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [addonsRes, statsRes, requestsRes] = await Promise.all([
        api.get('/landlord/addons'),
        api.get('/landlord/addons/stats'),
        api.get('/landlord/addons/pending-requests')
      ]);
      if (addonsRes.data) setAddons(addonsRes.data);
      if (statsRes.data) setStats(statsRes.data);
      if (requestsRes.data) setRequests(requestsRes.data);
    } catch (_err) {
      showError('Failed to load add-ons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this add-on?')) return;
    try {
      await api.delete(`/landlord/addons/${id}`);
      showSuccess('Add-on deleted successfully');
      fetchData();
    } catch (_err) {
      showError(_err.response?.data?.message || 'Failed to delete add-on');
    }
  };

  const handleSubmit = async (data) => {
    setProcessing(true);
    try {
      if (selectedAddon) {
        await api.put(`/landlord/addons/${selectedAddon.id}`, data);
        showSuccess('Add-on updated successfully');
      } else {
        await api.post('/landlord/addons', data);
        showSuccess('Add-on created successfully');
      }
      fetchData();
      setShowModal(false);
    } catch (_err) {
      showError(_err.response?.data?.message || 'Failed to save add-on');
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestAction = async (id, action) => {
    setProcessing(true);
    setProcessingId(id);
    setActionType(action);
    try {
      await api.patch(`/landlord/addons/requests/${id}`, { action });
      showSuccess(`Request ${action}d successfully`);
      fetchData();
    } catch (_err) {
      showError(_err.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(false);
      setProcessingId(null);
      setActionType(null);
    }
  };

  const [processingId, setProcessingId] = useState(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add-on Management</h1>
          <p className="text-sm text-gray-500">Create and manage additional services for your properties.</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => { setSelectedAddon(null); setShowModal(true); }}
             className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all"
           >
             <Plus className="w-5 h-5" /> New Add-on
           </button>
           <button onClick={fetchData} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <AddonStats stats={stats} />

      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'inventory' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Add-on Inventory
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all relative ${activeTab === 'requests' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Tenant Requests
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-800">
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {loading && (addons.length === 0 && requests.length === 0) ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-green-600" /></div>
      ) : activeTab === 'inventory' ? (
        <AddonTable 
          addons={addons} 
          onEdit={(a) => { setSelectedAddon(a); setShowModal(true); }} 
          onDelete={handleDelete}
          onToggleStatus={() => {}} 
        />
      ) : (
        <AddonRequestTable 
          requests={requests}
          onAction={handleRequestAction}
          processingId={processingId}
          actionType={actionType}
        />
      )}

      <AddonModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        addon={selectedAddon} 
        onSubmit={handleSubmit}
        submitting={processing}
      />
    </div>
  );
}