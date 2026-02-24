import React, { useState, useEffect } from 'react';
import { addonService } from '../../services/addonService';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Sparkles,
  BellRing,
  DollarSign,
  RefreshCw
} from 'lucide-react';

const AddonManagement = ({ propertyId }) => {
  const { uiState, updateData } = useUIState();
  const cacheKey = `landlord_addons_${propertyId}`;
  const cachedData = uiState.data?.[cacheKey] || cacheManager.get(cacheKey);

  const [addons, setAddons] = useState(cachedData?.addons || []);
  const [pendingRequests, setPendingRequests] = useState(cachedData?.pendingRequests || []);
  const [activeAddons, setActiveAddons] = useState(cachedData?.activeAddons || { activeAddons: [], summary: {} });
  const [loading, setLoading] = useState(!cachedData);
  const [activeTab, setActiveTab] = useState('manage'); // 'manage', 'requests', 'active'
  const [showModal, setShowModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    price_type: 'monthly',
    addon_type: 'fee',
    stock: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  const fetchData = async () => {
    if (!cachedData) setLoading(true);
    try {
      const [addonsRes, pendingRes, activeRes] = await Promise.all([
        addonService.getPropertyAddons(propertyId),
        addonService.getPendingRequests(propertyId),
        addonService.getActiveAddons(propertyId)
      ]);
      const addonsList = addonsRes.addons || [];
      const pendingList = pendingRes.pendingRequests || [];
      const activeData = activeRes;

      setAddons(addonsList);
      setPendingRequests(pendingList);
      setActiveAddons(activeData);

      // Update cache
      const combined = { addons: addonsList, pendingRequests: pendingList, activeAddons: activeData };
      updateData(cacheKey, combined);
      cacheManager.set(cacheKey, combined);
    } catch (error) {
      console.error('Failed to fetch addon data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        stock: formData.stock ? parseInt(formData.stock) : null
      };

      if (editingAddon) {
        await addonService.updateAddon(propertyId, editingAddon.id, data);
      } else {
        await addonService.createAddon(propertyId, data);
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save addon');
    }
  };

  const handleDelete = async (addonId) => {
    if (!confirm('Are you sure you want to delete this addon?')) return;
    try {
      await addonService.deleteAddon(propertyId, addonId);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete addon');
    }
  };

  const handleRequest = async (bookingId, addonId, action) => {
    const note = action === 'reject' ? prompt('Reason for rejection (optional):') : null;
    try {
      await addonService.handleAddonRequest(bookingId, addonId, action, note);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${action} request`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      price_type: 'monthly',
      addon_type: 'fee',
      stock: '',
      is_active: true
    });
    setEditingAddon(null);
  };

  const openEditModal = (addon) => {
    setEditingAddon(addon);
    setFormData({
      name: addon.name,
      description: addon.description || '',
      price: addon.price.toString(),
      price_type: addon.priceType,
      addon_type: addon.addonType,
      stock: addon.stock?.toString() || '',
      is_active: addon.isActive
    });
    setShowModal(true);
  };

  const tabs = [
    { id: 'manage', label: 'Manage Add-ons', icon: Sparkles, count: addons.length },
    { id: 'requests', label: 'Pending Requests', icon: BellRing, count: pendingRequests.length },
    { id: 'active', label: 'Active Add-ons', icon: Check, count: activeAddons.summary?.totalActive || 0 }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <RefreshCw className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage extra services and rentals for tenants</p>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-bold shadow-lg shadow-green-500/20"
          >
            <Plus className="w-5 h-5" />
            Add New Service
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === tab.id ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'manage' && (
          <ManageTab 
            addons={addons} 
            onEdit={openEditModal} 
            onDelete={handleDelete} 
          />
        )}
        {activeTab === 'requests' && (
          <RequestsTab 
            requests={pendingRequests} 
            onHandle={handleRequest} 
          />
        )}
        {activeTab === 'active' && (
          <ActiveTab 
            data={activeAddons} 
          />
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <AddonFormModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => { setShowModal(false); resetForm(); }}
          isEditing={!!editingAddon}
        />
      )}
    </div>
  );
};

// ==================== Manage Tab ====================
const ManageTab = ({ addons, onEdit, onDelete }) => {
  if (addons.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <Sparkles className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="font-medium">No add-ons created yet.</p>
        <p className="text-sm">Create add-ons to offer extra services to your tenants.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {addons.map((addon) => (
        <div key={addon.id} className={`border rounded-xl p-5 transition-all shadow-sm ${addon.isActive ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50'}`}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">{addon.name}</h4>
                {!addon.isActive && (
                  <span className="text-[10px] font-black uppercase bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">Inactive</span>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                  addon.priceType === 'monthly' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                }`}>
                  {addon.priceTypeLabel}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                  addon.addonType === 'rental' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                }`}>
                  {addon.addonTypeLabel}
                </span>
              </div>
              {addon.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">{addon.description}</p>
              )}
              <p className="text-xl font-black text-green-600 dark:text-green-400 mt-3">
                ₱{addon.price.toLocaleString()}
                {addon.priceType === 'monthly' && <span className="text-xs font-bold text-gray-400 dark:text-gray-500 ml-1">/ mo</span>}
              </p>
              {addon.stock !== null && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">Available Stock: {addon.stock}</p>
              )}
            </div>
            <div className="flex gap-1 ml-2">
              <button
                onClick={() => onEdit(addon)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(addon.id)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== Requests Tab ====================
const RequestsTab = ({ requests, onHandle }) => {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <BellRing className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="font-medium">No pending requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div key={request.requestId} className="border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 dark:text-white text-lg">{request.addonName}</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  request.priceType === 'monthly' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                }`}>
                  {request.priceType === 'monthly' ? 'Monthly' : 'One-time'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 font-black text-xs">
                  {request.tenant.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {request.tenant.name} <span className="mx-1 font-normal text-gray-400 dark:text-gray-500">•</span> <span className="text-amber-700 dark:text-amber-400">Room {request.roomNumber}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{request.tenant.email}</p>
                </div>
              </div>
              {request.requestNote && (
                <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-amber-100 dark:border-amber-900/20">
                  <p className="text-xs text-gray-600 dark:text-gray-300 italic leading-relaxed">"{request.requestNote}"</p>
                </div>
              )}
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-3 uppercase tracking-widest">
                Requested: {new Date(request.requestedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-green-600 dark:text-green-400">
                ₱{request.price.toLocaleString()}
                {request.priceType === 'monthly' && <span className="text-xs font-bold">/mo</span>}
              </p>
              {request.stock !== null && (
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1">STOCK: {request.stock}</p>
              )}
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  onClick={() => onHandle(request.bookingId, request.addonId, 'approve')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all active:scale-95 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => onHandle(request.bookingId, request.addonId, 'reject')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== Active Tab ====================
const ActiveTab = ({ data }) => {
  const { activeAddons, summary } = data;

  return (
    <div>
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Active Subscriptions</p>
            <p className="text-3xl font-black text-green-700 dark:text-green-300">{summary.totalActive || 0}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Monthly Revenue</p>
            <p className="text-3xl font-black text-blue-700 dark:text-blue-300">₱{(summary.monthlyRevenue || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* List */}
      {activeAddons && activeAddons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeAddons.map((item) => (
            <div key={item.requestId} className="border border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10 rounded-xl p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 dark:text-white text-lg block mb-1">{item.addonName}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-200 dark:bg-green-900/50 flex items-center justify-center text-[10px] font-black text-green-700 dark:text-green-400">
                      {item.tenantName?.charAt(0)}
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {item.tenantName} <span className="mx-1 opacity-30">•</span> <span className="text-green-700 dark:text-green-400 font-bold">Room {item.roomNumber}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-green-600 dark:text-green-400">
                    ₱{item.price.toLocaleString()}
                    {item.priceType === 'monthly' && <span className="text-xs font-bold opacity-60">/mo</span>}
                  </p>
                  <span className={`inline-block mt-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    item.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Check className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="font-medium">No active add-ons yet.</p>
        </div>
      )}
    </div>
  );
};

// ==================== Form Modal ====================
const AddonFormModal = ({ formData, setFormData, onSubmit, onClose, isEditing }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">{isEditing ? 'Edit Add-on' : 'Create New Add-on'}</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="p-6 space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Add-on Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white outline-none transition-all"
            required
            placeholder="e.g., Rice Cooker, Wi-Fi Upgrade"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white outline-none transition-all h-24 resize-none"
            rows={2}
            placeholder="Briefly describe what this service covers..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Price (₱) *</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white outline-none transition-all"
              required
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Price Type *</label>
            <select
              value={formData.price_type}
              onChange={(e) => setFormData({ ...formData, price_type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none"
            >
              <option value="monthly">Monthly (Recurring)</option>
              <option value="one_time">One-time Fee</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Add-on Type *</label>
            <select
              value={formData.addon_type}
              onChange={(e) => setFormData({ ...formData, addon_type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none"
            >
              <option value="fee">Usage Fee (Tenant Item)</option>
              <option value="rental">Rental (Owner Provided)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Stock (Optional)</label>
            <input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white outline-none"
              min="0"
              placeholder="Unlimited"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-5 h-5 text-green-600 rounded-lg focus:ring-green-500"
          />
          <label htmlFor="is_active" className="text-sm font-bold text-gray-700 dark:text-gray-200 cursor-pointer">Active (Tenant can see this)</label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-500/20 active:scale-95 transition-all"
          >
            {isEditing ? 'Save Changes' : 'Create Add-on'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

export default AddonManagement;
