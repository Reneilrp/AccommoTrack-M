import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Search, RefreshCw, X, Loader2, ArrowLeft, Shuffle, Users, UserCheck, CreditCard, Clock, AlertOctagon, UserX, LayoutGrid, LayoutList, MoreVertical, MessageSquare, ShieldAlert, AlertCircle, Mail, Phone, Home, Calendar, ChevronDown } from 'lucide-react';
import api from '../../utils/api';
import PriceRow from '../../components/Shared/PriceRow';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import TenantCard from './TenantCard';
import { Skeleton, SkeletonTableRow } from '../../components/Shared/Skeleton';
import toast from 'react-hot-toast';

export default function TenantManagement({ user, accessRole = 'landlord' }) {
  const { uiState, updateData } = useUIState();
  const location = useLocation();
  const navigate = useNavigate();

  const cachedProps = uiState.data?.accessible_properties || cacheManager.get('accessible_properties');

  // Synchronously determine initial property ID
  const getInitialPropertyId = () => {
    const params = new URLSearchParams(location.search || '');
    const fromUrl = params.get('property');
    if (fromUrl) return Number(fromUrl);
    if (cachedProps && cachedProps.length > 0) return cachedProps[0].id;
    return '';
  };

  const [__properties, setProperties] = useState(cachedProps || []);
  const [selectedPropertyId, setSelectedPropertyId] = useState(getInitialPropertyId());
  
  const tenantCacheKey = selectedPropertyId ? `tenants_property_${selectedPropertyId}` : null;
  const cachedTenants = tenantCacheKey ? (uiState.data?.[tenantCacheKey] || cacheManager.get(tenantCacheKey)) : null;

  const [tenants, setTenants] = useState(cachedTenants || []);
  const [transferringTenant, setTransferringTenant] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRoomsForTransfer, setLoadingRoomsForTransfer] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferData, setTransferData] = useState({ new_room_id: '', reason: '', damage_charge: '', damage_description: '' });
  const [__error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(new URLSearchParams(location.search).get('search') || '');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(selectedPropertyId && !cachedTenants);

  // New state for bulk actions & modals
  const [selectedTenants, setSelectedTenants] = useState([]);
  const [showEvictModal, setShowEvictModal] = useState(false);
  const [evictingTenant, setEvictingTenant] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('tenantViewMode') || 'card');

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('tenantViewMode', mode);
  };

  const normalizedRole = accessRole || user?.role || 'landlord';
  const isCaretaker = normalizedRole === 'caretaker';
  const isFromProperty = Boolean(new URLSearchParams(location.search).get('property'));
  
  const handleBackClick = () => {
    if (isFromProperty && selectedPropertyId) {
      navigate(`/properties/${selectedPropertyId}`);
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        if (!cachedProps) setLoading(true);
        const { data } = await api.get('/properties/accessible');
        setProperties(data);
        updateData('accessible_properties', data);
        cacheManager.set('accessible_properties', data);

        if (!selectedPropertyId && data && data.length) {
          setSelectedPropertyId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!selectedPropertyId) setLoading(false);
      }
    };
    load();
  }, []);

  const loadTenants = useCallback(async () => {
    if (!selectedPropertyId) return;
    const currentCacheKey = `tenants_property_${selectedPropertyId}`;
    const currentCached = uiState.data?.[currentCacheKey] || cacheManager.get(currentCacheKey);
    
    try {
      if (!currentCached) setLoading(true);
      setError('');
      
      const res = await api.get(`/landlord/tenants?property_id=${selectedPropertyId}&t=${Date.now()}`);
      const data = res.data;
      
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      
      updateData(currentCacheKey, list);
      cacheManager.set(currentCacheKey, list);
      return list;
    } catch (err) {
      console.error('Failed to load tenants:', err);
      if (!currentCached) {
        setTenants([]);
        setError('Failed to load tenants: ' + err.message);
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedPropertyId, updateData]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    loadTenants();
  }, [selectedPropertyId, loadTenants]);

  useEffect(() => {
    // Clear selections when filters change
    setSelectedTenants([]);
  }, [searchQuery, filter, selectedPropertyId]);

  const handleTransferInitiate = async (tenant) => {
    setTransferringTenant(tenant);
    setTransferData({ new_room_id: '', reason: '', damage_charge: '', damage_description: '' });
    setShowTransferModal(true);
    setLoadingRoomsForTransfer(true);
    try {
      const propertyId = tenant.room?.property_id;
      if (!propertyId) throw new Error("Tenant has no assigned property");
      
      const res = await api.get(`/rooms/property/${propertyId}`);
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      // Filter for available rooms, excluding current one
      setAvailableRooms(list.filter(r => r.status === 'available' && r.id !== tenant.room?.id));
    } catch {
      setError("Failed to load available rooms for transfer");
    } finally {
      setLoadingRoomsForTransfer(false);
    }
  };

  const handleEvictInitiate = (tenant) => {
    setEvictingTenant(tenant);
    setShowEvictModal(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferData.new_room_id || !transferData.reason) {
      toast.error("Please select a room and provide a reason");
      return;
    }

    setIsTransferring(true);
    try {
      await api.post(`/landlord/tenants/${transferringTenant.id}/transfer-room`, transferData);
      toast.success("Room transfer completed successfully");
      setShowTransferModal(false);
      loadTenants();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to transfer room");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSelectTenant = (tenantId) => {
    setSelectedTenants(prev => 
      prev.includes(tenantId)
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const filteredTenants = tenants.filter(tenant => {
    const fullName = `${tenant.first_name} ${tenant.last_name}`.toLowerCase();
    const email = (tenant.email || '').toLowerCase();
    const roomNumber = tenant.room?.room_number || '';
    const q = (searchQuery || '').toLowerCase();
    
    const matchesSearch = !q || fullName.includes(q) || email.includes(q) || roomNumber.includes(q);
    if (!matchesSearch) return false;

    if (filter === 'all') return true;
    if (filter === 'active') return tenant.tenantProfile?.status === 'active';
    if (filter === 'paid') return tenant.latestBooking?.payment_status === 'paid';
    if (filter === 'unpaid') return tenant.latestBooking?.payment_status === 'unpaid';
    if (filter === 'overdue') return tenant.latestBooking?.payment_status === 'overdue';
    
    return true;
  });

  const handleSelectAll = () => {
    if (selectedTenants.length === filteredTenants.length) {
      setSelectedTenants([]);
    } else {
      setSelectedTenants(filteredTenants.map(t => t.id));
    }
  };


  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.tenantProfile?.status === 'active').length,
    paid: tenants.filter(t => t.latestBooking?.payment_status === 'paid').length,
    pending: tenants.filter(t => t.latestBooking?.payment_status === 'unpaid').length,
    overdue: tenants.filter(t => t.latestBooking?.payment_status === 'overdue').length
  };

  return (
    <div className="min-h-screen bg-transparent dark:bg-gray-900">
      {__error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <X className="w-5 h-5 cursor-pointer" onClick={() => setError('')} />
          <span className="font-bold uppercase tracking-wide text-xs">{__error}</span>
        </div>
      )}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-300 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <button onClick={handleBackClick} className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors" aria-label="Back to property">
              <ArrowLeft className="w-5 h-5 text-green-600 dark:text-green-500" />
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenant Management</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard label="Total" value={stats.total} icon={Users} />
            <StatCard label="Active" value={stats.active} icon={UserCheck} color="green" />
            <StatCard label="Paid" value={stats.paid} icon={CreditCard} color="blue" />
            <StatCard label="Pending" value={stats.pending} icon={Clock} color="yellow" />
            <StatCard label="Overdue" value={stats.overdue} icon={AlertOctagon} color="red" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative w-full lg:w-[28rem]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-500" />
              <input type="text" placeholder="Search by name, room or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:bg-gray-700 dark:text-white outline-none text-sm" />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
              {['all', 'active', 'paid', 'unpaid', 'overdue'].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors whitespace-nowrap ${filter === f ? "bg-green-600 text-white shadow-md shadow-green-500/20" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1">
                <button onClick={() => handleSetViewMode('card')} title="Card view" className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white dark:bg-gray-600 shadow text-green-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button onClick={() => handleSetViewMode('list')} title="List view" className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow text-green-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>

              <button onClick={loadTenants} disabled={loading} title="Refresh" className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md shadow-blue-500/20">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {selectedTenants.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-200 dark:border-green-700 mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <input type="checkbox" checked={selectedTenants.length === filteredTenants.length} onChange={handleSelectAll} className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" />
            <span className="text-sm font-bold text-green-700 dark:text-green-300 flex-1">{selectedTenants.length} tenant{selectedTenants.length !== 1 ? 's' : ''} selected</span>
            <button onClick={() => setSelectedTenants([])} className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-800 rounded-lg" title="Clear selection">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenants.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No tenants found</p>
                <p className="text-sm mt-2 text-gray-500 dark:text-gray-500">{searchQuery ? 'Try adjusting your search query.' : "Tenants will appear here once they're assigned."}</p>
              </div>
            ) : (
              filteredTenants.map(tenant => (
                <div key={tenant.id} className="relative">
                  <div className="absolute top-3 left-3 z-10 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-2 rounded-full">
                    <input type="checkbox" checked={selectedTenants.includes(tenant.id)} onChange={() => handleSelectTenant(tenant.id)} className="w-4 h-4 text-green-600 rounded-full border-gray-300 focus:ring-green-500" />
                  </div>
                  <TenantCard tenant={tenant} onTransfer={handleTransferInitiate} onEvict={handleEvictInitiate} canTransfer={!isCaretaker} />
                </div>
              ))
            )}
          </div>
        ) : (
          <TenantListView
            tenants={filteredTenants}
            selectedTenants={selectedTenants}
            onSelect={handleSelectTenant}
            onSelectAll={handleSelectAll}
            onTransfer={handleTransferInitiate}
            onEvict={handleEvictInitiate}
            canTransfer={!isCaretaker}
            searchQuery={searchQuery}
          />
        )}
      </div>

      {showTransferModal && <TransferModal tenant={transferringTenant} availableRooms={availableRooms} loading={loadingRoomsForTransfer} isSubmitting={isTransferring} data={transferData} setData={setTransferData} onClose={() => setShowTransferModal(false)} onSubmit={handleTransferSubmit} />}
      {showEvictModal && <EvictionModal tenant={evictingTenant} onClose={() => setShowEvictModal(false)} onConfirm={loadTenants} />}
    </div>
  );
}

// Helper components for modals and stats
const StatCard = ({ label, value, icon: Icon, color = 'gray' }) => {
  const colors = {
    gray: { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-600 dark:text-gray-400' },
    green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-2xl font-bold ${color === 'gray' ? 'text-gray-900 dark:text-white' : colors[color].text}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 ${colors[color].bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colors[color].text}`} />
        </div>
      </div>
    </div>
  );
};

const TransferModal = ({ tenant, availableRooms, loading, isSubmitting, data, setData, onClose, onSubmit }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto border border-gray-100 dark:border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
      <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Shuffle className="w-5 h-5 text-amber-500" />Transfer Room</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
      </div>
      <form onSubmit={onSubmit} className="p-6 space-y-6">
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
          Transferring <strong>{tenant.first_name} {tenant.last_name}</strong> from <strong>Room {tenant.room?.room_number}</strong>.
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">New Room *</label>
          <select required className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white" value={data.new_room_id} onChange={e => setData({ ...data, new_room_id: e.target.value })} disabled={loading}>
            <option value="">{loading ? 'Loading rooms...' : 'Select New Room'}</option>
            {availableRooms.map(r => (<option key={r.id} value={r.id}>Room {r.room_number} ({r.type_label})</option>))}
          </select>
          {availableRooms.length === 0 && !loading && <p className="text-[10px] text-red-500 mt-2 font-bold italic">No other available rooms in this property.</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Reason for Transfer *</label>
          <textarea required className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white h-24 resize-none" value={data.reason} onChange={e => setData({ ...data, reason: e.target.value })} placeholder="e.g., Room maintenance required, tenant requested a larger room..." />
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-4">Damage Charges (Optional)</p>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Charge Amount (₱)</label>
              <input type="number" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none dark:bg-gray-700 dark:text-white" value={data.damage_charge} onChange={e => setData({ ...data, damage_charge: e.target.value })} placeholder="0.00" min="0" />
            </div>
            {parseFloat(data.damage_charge) > 0 && (<div className="animate-in slide-in-from-top-1">
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Charge Description *</label>
              <input type="text" required={parseFloat(data.damage_charge) > 0} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none dark:bg-gray-700 dark:text-white" value={data.damage_description} onChange={e => setData({ ...data, damage_description: e.target.value })} placeholder="e.g., Broken window blind, wall scratches..." />
            </div>)}
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          <button type="submit" disabled={isSubmitting || availableRooms.length === 0} className="flex-1 px-4 py-4 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Transferring...</> : 'Execute Transfer'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

const EvictionModal = ({ tenant, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [isEvicting, setIsEvicting] = useState(false);
  
  const handleConfirm = async () => {
    if (!reason) return toast.error("Reason for eviction is required.");
    setIsEvicting(true);
    try {
      await api.post(`/landlord/tenants/${tenant.id}/evict`, { reason });
      toast.success(`${tenant.first_name} has been evicted.`);
      onConfirm(); // Callback to refresh the tenant list
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to evict tenant.");
    } finally {
      setIsEvicting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 shadow-2xl">
        <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2"><UserX /> Confirm Eviction</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">You are about to evict <strong>{tenant.first_name} {tenant.last_name}</strong>. This will terminate their current booking and mark them as inactive. This action cannot be undone.</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for eviction... (required)" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-red-500 outline-none dark:bg-gray-700 dark:text-white h-24 resize-none text-sm" />
        <div className="flex gap-4 mt-4">
          <button onClick={onClose} disabled={isEvicting} className="flex-1 px-4 py-4 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleConfirm} disabled={isEvicting || !reason} className="flex-1 px-4 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {isEvicting ? <Loader2 className="w-4 h-4 animate-spin"/> : "Confirm Eviction"}
          </button>
        </div>
      </div>
    </div>
  );
}; 

// ─── List View ────────────────────────────────────────────────────────────────

const TenantListView = ({ tenants, selectedTenants, onSelect, onSelectAll, onTransfer, onEvict, canTransfer, searchQuery }) => {
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [expandedEmergency, setExpandedEmergency] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  const handleMenuOpen = (e, tenantId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    // Use absolute positioning relative to document body
    setMenuPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.right + window.scrollX - 192, // 192 = width of dropdown (w-48)
    });
    setOpenMenuId(openMenuId === tenantId ? null : tenantId);
  };

  const isLate = (t) => t.has_overdue_invoices;
  const isExpiring = (t) => {
    if (!t.latestBooking?.end_date) return false;
    const diff = Math.ceil((new Date(t.latestBooking.end_date) - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  };

  const statusBadge = (status) => {
    const map = {
      active:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
      inactive: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    };
    return map[status] || 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
  };

  const allSelected = tenants.length > 0 && selectedTenants.length === tenants.length;

  if (tenants.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No tenants found</p>
        <p className="text-sm mt-2 text-gray-500">{searchQuery ? 'Try adjusting your search query.' : "Tenants will appear here once they're assigned."}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <th className="px-4 py-3 text-left">
                <input type="checkbox" checked={allSelected} onChange={onSelectAll} className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Full Name</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Email</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Room</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Contract End</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
            {tenants.map((tenant, idx) => {
              const profile = tenant.tenantProfile;
              const late = isLate(tenant);
              const expiring = isExpiring(tenant);
              const isOpen = openMenuId === tenant.id;
              const showEmergency = expandedEmergency === tenant.id;

              return (
                <React.Fragment key={tenant.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedTenants.includes(tenant.id)} onChange={() => onSelect(tenant.id)} className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" />
                    </td>

                    {/* Full Name + behavioral badges */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {tenant.first_name} {tenant.last_name}
                        </span>
                        {late && (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-red-200 dark:border-red-800">
                            <AlertCircle className="w-2.5 h-2.5" /> Late
                          </span>
                        )}
                        {expiring && !late && (
                          <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-orange-200 dark:border-orange-800">
                            <Clock className="w-2.5 h-2.5" /> Expiring
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[180px]">{tenant.email}</span>
                      </span>
                    </td>

                    {/* Room */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {tenant.room ? (
                        <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5 font-medium">
                          <Home className="w-3 h-3 text-gray-400 shrink-0" /> {tenant.room.room_number}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">None</span>
                      )}
                    </td>

                    {/* Contract End */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`flex items-center gap-1.5 ${expiring ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                        <Calendar className="w-3 h-3 shrink-0" />
                        {tenant.latestBooking?.end_date
                          ? new Date(tenant.latestBooking.end_date).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${statusBadge(profile?.status)}`}>
                        {profile?.status || 'Active'}
                      </span>
                    </td>

                    {/* Manage Dropdown */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => handleMenuOpen(e, tenant.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-colors"
                      >
                        Manage <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && ReactDOM.createPortal(
                        <div
                          ref={dropdownRef}
                          style={{ position: 'absolute', top: menuPos.top, left: menuPos.left, zIndex: 9999, width: 192 }}
                          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
                        >
                          <button
                            onClick={() => { setOpenMenuId(null); navigate('/messages', { state: { startConversation: true, recipient: { id: tenant.id }, property: tenant.room ? { id: tenant.room.property_id } : null } }); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-green-600" /> Message
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); navigate(`/payments?search=${tenant.email}`); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Payments
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); navigate(`/tenants/${tenant.id}`); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5 text-gray-500" /> View Logs
                          </button>
                          <div className="border-t border-gray-100 dark:border-gray-700" />
                          <button
                            onClick={() => { setOpenMenuId(null); onTransfer?.(tenant); }}
                            disabled={!canTransfer || !tenant.room}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Shuffle className="w-3.5 h-3.5 text-amber-500" /> Transfer Room
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); setExpandedEmergency(showEmergency ? null : tenant.id); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-purple-500" /> Emergency Contact
                          </button>
                          <div className="border-t border-gray-100 dark:border-gray-700" />
                          <button
                            onClick={() => { setOpenMenuId(null); onEvict?.(tenant); }}
                            disabled={!canTransfer}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors disabled:opacity-40"
                          >
                            <UserX className="w-3.5 h-3.5" /> Evict Tenant
                          </button>
                        </div>,
                        document.body
                      )}
                    </td>
                  </tr>

                  {/* Emergency Contact Expandable Row */}
                  {showEmergency && profile && (
                    <tr key={`${tenant.id}-emergency`} className="bg-purple-50 dark:bg-purple-900/10">
                      <td colSpan={7} className="px-8 py-3">
                        <div className="flex items-center gap-6 text-xs text-gray-700 dark:text-gray-300">
                          <span className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-400 uppercase text-[10px]">
                            <ShieldAlert className="w-3 h-3" /> Emergency Contact
                          </span>
                          <span className="font-semibold">{profile.emergency_contact_name || '—'}</span>
                          <span className="flex items-center gap-1 text-gray-500"><Phone className="w-3 h-3" />{profile.emergency_contact_phone || '—'}</span>
                          {profile.emergency_contact_relationship && (
                            <span className="text-gray-400 italic">({profile.emergency_contact_relationship})</span>
                          )}
                          <button onClick={() => setExpandedEmergency(null)} className="ml-auto text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

