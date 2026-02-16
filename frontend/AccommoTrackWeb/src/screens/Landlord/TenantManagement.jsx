import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, RefreshCw, X, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import PriceRow from '../../components/Shared/PriceRow';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';

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
        setLoading(false);
      }
    };
    load();
  }, []); // Only run on mount

  // Navigation on search is handled explicitly by the Search button (see `handleSearch`).

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

  // Auto-refresh when page becomes visible (user switches back to tab)
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
    // Ensure we're working with the latest tenant list for the selected property
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
    if (!q) return true; // no query => show all
    return fullName.includes(q) || email.includes(q) || roomNumber.includes(q);
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.tenantProfile?.status === 'active').length,
    paid: tenants.filter(t => t.latestBooking?.payment_status === 'paid').length,
    pending: tenants.filter(t => t.latestBooking?.payment_status === 'unpaid').length,
    overdue: tenants.filter(t => t.latestBooking?.payment_status === 'overdue').length
  };

  // Show initial loading state
  if (loading && tenants.length === 0 && properties.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <button
                onClick={handleBackClick}
                className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5 text-green-600" />
              </button>
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
              <h3 className="text-sm text-gray-600 mt-1">Manage all tenants and their room assignments</h3>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-2" />
              <p className="text-lg font-medium">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <button
              onClick={handleBackClick}
              className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Back to property"
            >
              <ArrowLeft className="w-5 h-5 text-green-600" />
            </button>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
          </div>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4">
            {/* intentionally empty: Tenant Management should not show a property selector here (auto-detected) */}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {isCaretaker && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Read-only caretaker access</p>
              <p className="text-sm">Tenant edits, room assignments, and removals are disabled. Please contact the landlord if you need a change.</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Total Tenants</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Paid</p>
            <p className="text-2xl font-bold text-blue-600">{stats.paid}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex justify-between items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, room number or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Search tenants"
              >
                <Search className="w-4 h-4" />
                Search
              </button>

              <button
                onClick={refresh}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh tenant list"
              >
                <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : 'hidden'}`} />
                <RefreshCw className={`w-4 h-4 ${loading ? 'hidden' : ''}`} />
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <p className="text-lg font-medium">No tenants yet</p>
                      <p className="text-sm mt-1">Tenants will appear here when they're assigned to rooms</p>
                      <p className="text-sm mt-1 text-blue-600">Go to Room Management to assign tenants to rooms</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                          {tenant.first_name[0]}{tenant.last_name[0]}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{tenant.first_name} {tenant.last_name}</p>
                          <p className="text-sm text-gray-500">{tenant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenant.room ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">Room {tenant.room.room_number}</p>
                          <p className="text-sm text-gray-500">{tenant.room.type_label}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-amber-600 italic">No room assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{tenant.phone || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">
                        {tenant.room ? <PriceRow amount={tenant.room.monthly_rate} /> : 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenant.latestBooking ? (
                        <>
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                            tenant.latestBooking.payment_status === 'paid' 
                              ? 'bg-green-100 text-green-800'
                              : tenant.latestBooking.payment_status === 'partial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {tenant.latestBooking.payment_status || 'unpaid'}
                          </span>
                          {tenant.latestBooking.payment_status === 'paid' && (
                            <p className="text-xs text-gray-500 mt-1">
                              Paid on {new Date(tenant.latestBooking.updated_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: '2-digit'
                              })}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          No booking
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize
                        ${tenant.tenantProfile?.status === 'active' ? 'bg-green-100 text-green-800' :
                          tenant.tenantProfile?.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'}`}>
                        {tenant.tenantProfile?.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleView(tenant)}
                          className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Tenant Details</h2>
                <button onClick={() => setViewingTenant(null)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{viewingTenant.first_name} {viewingTenant.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{viewingTenant.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{viewingTenant.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date of Birth</p>
                    <p className="font-medium">
                      {viewingTenant.tenantProfile?.date_of_birth 
                        ? new Date(viewingTenant.tenantProfile.date_of_birth).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Room Assignment</h3>
                  {viewingTenant.room ? (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p><span className="text-gray-600">Room:</span> {viewingTenant.room.room_number}</p>
                      <p><span className="text-gray-600">Type:</span> {viewingTenant.room.type_label}</p>
                      <p><span className="text-gray-600">Monthly Rate:</span> <PriceRow amount={viewingTenant.room.monthly_rate} /></p>
                    </div>
                  ) : (
                    <p className="text-amber-600 italic">No room assigned</p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Emergency Contact</h3>
                  {viewingTenant.tenantProfile?.emergency_contact_name ? (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p><span className="text-gray-600">Name:</span> {viewingTenant.tenantProfile.emergency_contact_name}</p>
                      <p><span className="text-gray-600">Phone:</span> {viewingTenant.tenantProfile.emergency_contact_phone}</p>
                      <p><span className="text-gray-600">Relationship:</span> {viewingTenant.tenantProfile.emergency_contact_relationship}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No emergency contact information</p>
                  )}
                </div>

                {viewingTenant.tenantProfile?.current_address && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Current Address</h3>
                    <p className="bg-gray-50 p-3 rounded-lg">{viewingTenant.tenantProfile.current_address}</p>
                  </div>
                )}

                {viewingTenant.tenantProfile?.preference && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Notes / Preferences</h3>
                    <p className="bg-gray-50 p-3 rounded-lg">{viewingTenant.tenantProfile.preference}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t">
                <button 
                  onClick={() => setViewingTenant(null)} 
                  className="w-full py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}