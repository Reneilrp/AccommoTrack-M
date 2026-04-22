import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, Plus, Loader2, ArrowLeft, Sparkles, BellRing, Check } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../utils/api';
import AddonTable from './components/Addons/AddonTable';
import AddonModal from './components/Addons/AddonModal';
import AddonRequestTable from './components/Addons/AddonRequestTable';
import ActiveAddonTab from './components/Addons/ActiveAddonTab';

export default function AddonManagement({ user }) {
  const navigate = useNavigate();
  const [addons, setAddons] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, revenue: 0, approved: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [processing, setProcessing] = useState(false);

  const [requests, setRequests] = useState([]);
  const [activeAddons, setActiveAddons] = useState({ activeAddons: [], summary: {} });
  const [activeTab, setActiveTab] = useState('manage'); // manage, requests, active
  const [actionType, setActionType] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [addonsRes, requestsRes, activeRes] = await Promise.all([
        api.get('/landlord/addons'),
        api.get('/landlord/addons/pending-requests'),
        api.get('/landlord/addons/active')
      ]);
      if (addonsRes.data) setAddons(addonsRes.data);
      if (requestsRes.data) setRequests(requestsRes.data);
      if (activeRes.data) setActiveAddons(activeRes.data);
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

  const handleToggleActive = async (addon) => {
    try {
      await api.put(`/landlord/addons/${addon.id}`, { is_active: !addon.is_active });
      showSuccess(addon.is_active ? 'Add-on deactivated' : 'Add-on activated');
      fetchData();
    } catch (_err) {
      showError(_err.response?.data?.message || 'Failed to update add-on');
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

  const handleRequestAction = async (id, addonId, action, customPrice = null) => {
    setProcessing(true);
    setProcessingId(id);
    setActionType(action);
    try {
      const payload = { action };
      if (action === 'approve' && customPrice !== null) {
        payload.custom_price = customPrice;
      }
      await api.patch(`/landlord/addons/requests/${id}`, payload);
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

  const handleUpdateActivePrice = async (bookingId, addonId, newPrice) => {
    try {
      await api.put(`/landlord/addons/active/${bookingId}/${addonId}`, { price: newPrice });
      fetchData();
    } catch (_err) {
      showError('Failed to update price');
      throw _err;
    }
  };

  const tabs = [
    { id: "manage", label: "Manage Add-ons", icon: Sparkles, count: addons.length },
    { id: "requests", label: "Pending Requests", icon: BellRing, count: requests.length },
    { id: "active", label: "Active Add-ons", icon: Check, count: activeAddons?.summary?.totalActive || 0 },
  ];

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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Add-on Services</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage extra usage fees and rentals for tenants
            </p>
            <button
              onClick={() => { setSelectedAddon(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-bold shadow-lg shadow-green-500/20"
            >
              <Plus className="w-5 h-5" />
              Add New Usage Fee
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeTab === tab.id
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={fetchData}
                disabled={loading}
                title="Refresh"
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md shadow-blue-500/20"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 relative min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-10 flex items-center justify-center backdrop-blur-[1px] rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          )}

          {activeTab === 'manage' && (
            <AddonTable 
              addons={addons} 
              onEdit={(a) => { setSelectedAddon(a); setShowModal(true); }} 
              onDelete={handleDelete}
              onToggleStatus={handleToggleActive} 
            />
          )}
          {activeTab === 'requests' && (
            <AddonRequestTable 
              requests={requests}
              onAction={handleRequestAction}
              processingId={processingId}
              actionType={actionType}
            />
          )}
          {activeTab === 'active' && (
            <ActiveAddonTab 
              data={activeAddons}
              onUpdatePrice={handleUpdateActivePrice}
            />
          )}
        </div>

        <AddonModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          addon={selectedAddon} 
          onSubmit={handleSubmit}
          submitting={processing}
        />
      </div>
    </div>
  );
}