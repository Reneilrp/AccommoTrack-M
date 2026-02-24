import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, RefreshCw, X, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import PriceRow from '../../components/Shared/PriceRow';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import { Skeleton, SkeletonStatCard, SkeletonTableRow } from '../../components/Shared/Skeleton';

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
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(new URLSearchParams(location.search).get('search') || '');
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
      
      if (data.error) {
        throw new Error(data.message || data.error);
      }
      
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
    if (!q) return true;
    return fullName.includes(q) || email.includes(q) || roomNumber.includes(q);
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.tenantProfile?.status === 'active').length,
    paid: tenants.filter(t => t.latestBooking?.payment_status === 'paid').length,
    pending: tenants.filter(t => t.latestBooking?.payment_status === 'unpaid').length,
    overdue: tenants.filter(t => t.latestBooking?.payment_status === 'overdue').length
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-300 dark:border-gray-700 animate-pulse">
                <Skeleton className="h-3 w-20 mb-3" />
                <Skeleton className="h-8 w-12" />
              </div>
            ))}
          </div>

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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter mb-1">Total Tenants</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter mb-1">Paid</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.paid}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-300 dark:border-gray-700">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, room or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none text-sm"
              />
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex-1 lg:flex-none px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 font-bold text-sm"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>

              <button
                onClick={refresh}
                disabled={loading}
                className="flex-1 lg:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 font-bold text-sm shadow-md shadow-blue-500/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>{loading ? 'Loading...' : 'Refresh'}</span>
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

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-300 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tenant</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monthly Rent</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <p className="text-lg font-medium">No tenants yet</p>
                      <p className="text-sm mt-1">Tenants will appear here when they're assigned to rooms</p>
                      <p className="text-sm mt-1 text-blue-600 dark:text-blue-400">Go to Room Management to assign tenants to rooms</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold">
                          {tenant.first_name[0]}{tenant.last_name[0]}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{tenant.first_name} {tenant.last_name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{tenant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenant.room ? (
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Room {tenant.room.room_number}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{tenant.room.type_label}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-amber-600 dark:text-amber-400 italic font-medium">No room assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900 dark:text-gray-300 font-medium">{tenant.phone || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {tenant.room ? <PriceRow amount={tenant.room.monthly_rate} /> : '—'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenant.latestBooking ? (
                        <>
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full capitalize ${
                            tenant.latestBooking.payment_status === 'paid' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : tenant.latestBooking.payment_status === 'partial'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {tenant.latestBooking.payment_status || 'unpaid'}
                          </span>
                          {tenant.latestBooking.payment_status === 'paid' && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
                              Paid {new Date(tenant.latestBooking.updated_at).toLocaleDateString()}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                          No booking
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full capitalize
                        ${tenant.tenantProfile?.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          tenant.tenantProfile?.status === 'inactive' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {tenant.tenantProfile?.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleView(tenant)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                      {viewingTenant.tenantProfile?.date_of_birth 
                        ? new Date(viewingTenant.tenantProfile.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : '—'}
                    </p>
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
      </div>
    </div>
    </div>
  );
}
