import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, RefreshCw, X, Loader2, AlertTriangle, ArrowLeft, Shuffle, Users, UserCheck, CreditCard, Clock, AlertOctagon, } from 'lucide-react';
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

  const [properties, setProperties] = useState(cachedProps || []);
  const [selectedPropertyId, setSelectedPropertyId] = useState(getInitialPropertyId());
  
  const tenantCacheKey = selectedPropertyId ? `tenants_property_${selectedPropertyId}` : null;
  const cachedTenants = tenantCacheKey ? (uiState.data?.[tenantCacheKey] || cacheManager.get(tenantCacheKey)) : null;

  const [tenants, setTenants] = useState(cachedTenants || []);
  const [viewingTenant, setViewingTenant] = useState(null);
  const [transferringTenant, setTransferringTenant] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRoomsForTransfer, setLoadingRoomsForTransfer] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferData, setTransferData] = useState({ new_room_id: '', reason: '', damage_charge: '', damage_description: '' });
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(new URLSearchParams(location.search).get('search') || '');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(selectedPropertyId && !cachedTenants);

  const normalizedRole = accessRole || user?.role || 'landlord';
  const isCaretaker = normalizedRole === 'caretaker';
  const [isFromProperty, setIsFromProperty] = useState(Boolean(new URLSearchParams(location.search).get('property')));

  const selectedProperty = properties.find(p => String(p.id) === String(selectedPropertyId)) || null;
  
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
  }, [selectedPropertyId]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    loadTenants();
  }, [selectedPropertyId, loadTenants]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedPropertyId) {
        loadTenants();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedPropertyId, loadTenants]);

  const handleView = (tenant) => {
    setViewingTenant(tenant);
  };

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
    } catch (err) {
      setError("Failed to load available rooms for transfer");
    } finally {
      setLoadingRoomsForTransfer(false);
    }
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

  const refresh = () => {
    loadTenants();
  };

  const handleSearch = async () => {
    let list = tenants || [];
    if (selectedPropertyId) {
      list = await loadTenants();
    }

    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return;

    const matches = (list || []).filter(tenant => {
      const fullName = `${tenant.first_name} ${tenant.last_name}`.toLowerCase();
      const email = (tenant.email || '').toLowerCase();
      const roomNumber = tenant.room?.room_number || '';
      return fullName.includes(q) || email.includes(q) || roomNumber.includes(q);
    });

    if (matches.length === 1) {
      const m = matches[0];
      const id = m.id || m.tenant_id || m.tenantId || m.user_id || (m.user && m.user.id);
      if (id) navigate(`/tenants/${id}`);
    }
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

  const safeTenants = Array.isArray(tenants) ? tenants : [];

  const stats = {
    total: safeTenants.length,
    active: safeTenants.filter(t => t.tenantProfile?.status === 'active').length,
    paid: safeTenants.filter(t => t.latestBooking?.payment_status === 'paid').length,
    pending: safeTenants.filter(t => t.latestBooking?.payment_status === 'unpaid').length,
    overdue: safeTenants.filter(t => t.latestBooking?.payment_status === 'overdue').length
  };

  // Show Skeleton loading state
  if (loading && tenants.length === 0 && properties.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
            <div className="text-center">
              <Skeleton className="h-8 w-64 mx-auto mb-2" />
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards Skeleton */}
          

          {/* Search Bar Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <Skeleton className="h-10 w-full max-w-md rounded-lg" />
              <div className="flex gap-2 w-full md:w-auto">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-300 dark:border-gray-700">
                  <tr>
                    {[...Array(7)].map((_, i) => (
                      <th key={i} className="px-6 py-3">
                        <Skeleton className="h-3 w-20" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(6)].map((_, i) => (
                    <SkeletonTableRow key={i} columns={7} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-300 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <button
              onClick={handleBackClick}
              className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              aria-label="Back to property"
            >
              <ArrowLeft className="w-5 h-5 text-green-600 dark:text-green-500" />
            </button>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenant Management</h1>
          </div>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4">
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {isCaretaker && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Read-only caretaker access</p>
              <p className="text-sm">Tenant edits, room assignments, and removals are disabled. Please contact the landlord if you need a change.</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Active</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
              </div>
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Paid</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.paid}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Overdue</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.overdue}</p>
              </div>
              <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <AlertOctagon className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative w-full lg:w-[28rem]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, room or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:bg-gray-700 dark:text-white outline-none text-sm"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
              {[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Paid', value: 'paid' },
                { label: 'Unpaid', value: 'unpaid' },
                { label: 'Overdue', value: 'overdue' }
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors whitespace-nowrap ${
                    filter === f.value 
                      ? "bg-green-600 text-white shadow-md shadow-green-500/20" 
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={refresh}
                disabled={loading}
                title="Refresh"
                className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md shadow-blue-500/20"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Grid of Tenant Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No tenants found</p>
              <p className="text-sm mt-1 text-gray-400 dark:text-gray-500">
                {searchQuery ? 'Try adjusting your search query.' : "Tenants will appear here once they're assigned."}
              </p>
            </div>
          ) : (
            filteredTenants.map(tenant => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onTransfer={handleTransferInitiate}
                canTransfer={!isCaretaker}
              />
            ))
          )}
        </div>

        {/* View Tenant Details Modal */}
        {viewingTenant && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-gray-100 dark:border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tenant Details</h2>
                <button onClick={() => setViewingTenant(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
                    <p className="font-semibold text-gray-900 dark:text-white text-lg">{viewingTenant.first_name} {viewingTenant.last_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{viewingTenant.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{viewingTenant.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date of Birth</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {viewingTenant.date_of_birth 
                        ? new Date(viewingTenant.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Gender</p>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">{viewingTenant.gender || '—'}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-green-500 rounded-full"></span>
                    Room Assignment
                  </h3>
                  {viewingTenant.room ? (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Room</p>
                        <p className="font-bold text-gray-900 dark:text-white">{viewingTenant.room.room_number}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Type</p>
                        <p className="font-bold text-gray-900 dark:text-white">{viewingTenant.room.type_label}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Monthly Rate</p>
                        <p className="font-bold text-green-600 dark:text-green-400"><PriceRow amount={viewingTenant.room.monthly_rate} /></p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-amber-600 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">No room assigned</p>
                  )}
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-red-500 rounded-full"></span>
                    Emergency Contact
                  </h3>
                  {viewingTenant.tenantProfile?.emergency_contact_name ? (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Name</p>
                        <p className="font-bold text-gray-900 dark:text-white">{viewingTenant.tenantProfile.emergency_contact_name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Phone</p>
                        <p className="font-bold text-gray-900 dark:text-white">{viewingTenant.tenantProfile.emergency_contact_phone}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Relationship</p>
                        <p className="font-bold text-gray-900 dark:text-white">{viewingTenant.tenantProfile.emergency_contact_relationship}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">No emergency contact information</p>
                  )}
                </div>

                {viewingTenant.tenantProfile?.current_address && (
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                      Current Address
                    </h3>
                    <p className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{viewingTenant.tenantProfile.current_address}</p>
                  </div>
                )}

                {viewingTenant.tenantProfile?.preference && (
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                      Notes / Preferences
                    </h3>
                    <p className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">"{viewingTenant.tenantProfile.preference}"</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                <button 
                  onClick={() => setViewingTenant(null)} 
                  className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm active:scale-[0.98]"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Room Modal */}
        {showTransferModal && transferringTenant && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto border border-gray-100 dark:border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shuffle className="w-5 h-5 text-amber-500" />
                  Transfer Room
                </h2>
                <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="p-6 space-y-5">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
                  Transferring <strong>{transferringTenant.first_name} {transferringTenant.last_name}</strong> from <strong>Room {transferringTenant.room?.room_number}</strong>.
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">New Room *</label>
                  <select
                    required
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white"
                    value={transferData.new_room_id}
                    onChange={e => setTransferData({ ...transferData, new_room_id: e.target.value })}
                    disabled={loadingRoomsForTransfer}
                  >
                    <option value="">{loadingRoomsForTransfer ? 'Loading rooms...' : 'Select New Room'}</option>
                    {availableRooms.map(r => (
                      <option key={r.id} value={r.id}>Room {r.room_number} ({r.type_label})</option>
                    ))}
                  </select>
                  {availableRooms.length === 0 && !loadingRoomsForTransfer && (
                    <p className="text-[10px] text-red-500 mt-1 font-bold italic">No other available rooms in this property.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Reason for Transfer *</label>
                  <textarea
                    required
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white h-24 resize-none"
                    value={transferData.reason}
                    onChange={e => setTransferData({ ...transferData, reason: e.target.value })}
                    placeholder="e.g., Room maintenance required, tenant requested a larger room..."
                  />
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Damage Charges (Optional)</p>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Charge Amount (₱)</label>
                      <input
                        type="number"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none dark:bg-gray-700 dark:text-white"
                        value={transferData.damage_charge}
                        onChange={e => setTransferData({ ...transferData, damage_charge: e.target.value })}
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                    {parseFloat(transferData.damage_charge) > 0 && (
                      <div className="animate-in slide-in-from-top-1">
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Charge Description *</label>
                        <input
                          type="text"
                          required={parseFloat(transferData.damage_charge) > 0}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none dark:bg-gray-700 dark:text-white"
                          value={transferData.damage_description}
                          onChange={e => setTransferData({ ...transferData, damage_description: e.target.value })}
                          placeholder="e.g., Broken window blind, wall scratches..."
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isTransferring || availableRooms.length === 0}
                    className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isTransferring ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Transferring...
                      </>
                    ) : (
                      'Execute Transfer'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}