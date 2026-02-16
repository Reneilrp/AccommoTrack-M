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
          <p className="text-sm text-gray-500">Manage extra services and rentals for tenants</p>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-bold shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add New Service
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
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
      <div className="text-center py-12 text-gray-500">
        <Sparkles className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p>No add-ons created yet.</p>
        <p className="text-sm">Create add-ons to offer extra services to your tenants.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {addons.map((addon) => (
        <div key={addon.id} className={`border rounded-lg p-4 ${addon.isActive ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900">{addon.name}</h4>
                {!addon.isActive && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Inactive</span>
                )}
              </div>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  addon.priceType === 'monthly' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {addon.priceTypeLabel}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  addon.addonType === 'rental' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {addon.addonTypeLabel}
                </span>
              </div>
              {addon.description && (
                <p className="text-sm text-gray-500 mt-2">{addon.description}</p>
              )}
              <p className="text-lg font-semibold text-green-600 mt-2">
                ₱{addon.price.toLocaleString()}
                {addon.priceType === 'monthly' && <span className="text-sm font-normal">/month</span>}
              </p>
              {addon.stock !== null && (
                <p className="text-xs text-gray-400 mt-1">Stock: {addon.stock}</p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(addon)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(addon.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      <div className="text-center py-12 text-gray-500">
        <BellRing className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p>No pending requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div key={request.requestId} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{request.addonName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  request.priceType === 'monthly' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {request.priceType === 'monthly' ? 'Monthly' : 'One-time'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">{request.tenant.name}</span> • Room {request.roomNumber}
              </p>
              <p className="text-sm text-gray-500">{request.tenant.email}</p>
              {request.requestNote && (
                <p className="text-sm text-gray-600 mt-2 italic">"{request.requestNote}"</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Requested: {new Date(request.requestedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-green-600">
                ₱{request.price.toLocaleString()}
                {request.priceType === 'monthly' && <span className="text-xs">/mo</span>}
              </p>
              {request.stock !== null && (
                <p className="text-xs text-gray-400">Stock: {request.stock}</p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => onHandle(request.bookingId, request.addonId, 'approve')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => onHandle(request.bookingId, request.addonId, 'reject')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200"
                >
                  <X className="w-4 h-4" />
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
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600">Active Subscriptions</p>
            <p className="text-2xl font-bold text-green-700">{summary.totalActive || 0}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600">Monthly Add-on Revenue</p>
            <p className="text-2xl font-bold text-blue-700">₱{(summary.monthlyRevenue || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* List */}
      {activeAddons && activeAddons.length > 0 ? (
        <div className="space-y-3">
          {activeAddons.map((item) => (
            <div key={item.requestId} className="border border-green-200 bg-green-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-gray-900">{item.addonName}</span>
                  <p className="text-sm text-gray-600">
                    {item.tenantName} • Room {item.roomNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    ₱{item.price.toLocaleString()}
                    {item.priceType === 'monthly' && <span className="text-xs">/mo</span>}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Check className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p>No active add-ons yet.</p>
        </div>
      )}
    </div>
  );
};

// ==================== Form Modal ====================
const AddonFormModal = ({ formData, setFormData, onSubmit, onClose, isEditing }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold">{isEditing ? 'Edit Add-on' : 'Create Add-on'}</h3>
      </div>
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
            placeholder="e.g., Rice Cooker, Wi-Fi Upgrade"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={2}
            placeholder="Brief description of the add-on"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₱) *</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              min="0"
              step="0.01"
              placeholder="100.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price Type *</label>
            <select
              value={formData.price_type}
              onChange={(e) => setFormData({ ...formData, price_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="monthly">Monthly (Recurring)</option>
              <option value="one_time">One-time</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Add-on Type *</label>
            <select
              value={formData.addon_type}
              onChange={(e) => setFormData({ ...formData, addon_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="fee">Usage Fee (Tenant brings item)</option>
              <option value="rental">Rental (You provide item)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock (Rentals)</label>
            <input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              min="0"
              placeholder="Leave empty for unlimited"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">Active (visible to tenants)</label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

export default AddonManagement;
