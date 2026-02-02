import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, RefreshCw, X, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import PriceRow from '../../components/Shared/PriceRow';
import { useLocation, useNavigate } from 'react-router-dom';

export default function TenantManagement({ user, accessRole = 'landlord' }) {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [viewingTenant, setViewingTenant] = useState(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizedRole = accessRole || user?.role || 'landlord';
  const isCaretaker = normalizedRole === 'caretaker';
  const [isFromProperty, setIsFromProperty] = useState(false);

  useEffect(() => {
    // Property loading is handled by the effect below that reads location.search
  }, []);
  const location = useLocation();
  const navigate = useNavigate();
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
        const { data } = await api.get('/properties/accessible');
        setProperties(data);

        const params = new URLSearchParams(location.search);
        const q = params.get('property');
        const searchQ = params.get('search');

        if (searchQ) {
          setSearchQuery(searchQ);
        }

        if (q) {
          const pid = Number(q);
          // Only set if property exists in the returned list
          const exists = data.find((p) => Number(p.id) === pid);
          if (exists) {
            setSelectedPropertyId(pid);
            setIsFromProperty(true);
            return;
          }
        }

        if (data && data.length) setSelectedPropertyId(data[0].id);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [location.search]);

  // Navigation on search is handled explicitly by the Search button (see `handleSearch`).

  const loadTenants = useCallback(async () => {
    if (!selectedPropertyId) return;
    
    try {
      setLoading(true);
      setError('');
      
      const res = await api.get(`/landlord/tenants?property_id=${selectedPropertyId}&t=${Date.now()}`);
      const data = res.data;
      
      if (data.error) {
        throw new Error(data.message || data.error);
      }
      
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      return list;
    } catch (err) {
      console.error('Failed to load tenants:', err);
      setTenants([]);
      setError('Failed to load tenants: ' + err.message);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <button
                onClick={handleBackClick}
                className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5 text-green-600" />
              </button>
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenant Management</h1>
              <h3 className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage all tenants and their room assignments</h3>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-2" />
              <p className="text-lg font-medium">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <button
              onClick={handleBackClick}
              className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              aria-label="Back to property"
            >
              <ArrowLeft className="w-5 h-5 text-green-600" />
            </button>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenant Management</h1>
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage all tenants and their room assignments</h3>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Tenants</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
            <p className="text-2xl font-bold text-blue-600">{stats.paid}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex justify-between items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, room number or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monthly Rent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
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
                  <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-700 dark:text-green-300 font-semibold">
                          {tenant.first_name[0]}{tenant.last_name[0]}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{tenant.first_name} {tenant.last_name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{tenant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenant.room ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Room {tenant.room.room_number}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{tenant.room.type_label}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-amber-600 dark:text-amber-400 italic">No room assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900 dark:text-gray-200">{tenant.phone || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold dark:text-white">Tenant Details</h2>
                <button onClick={() => setViewingTenant(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                    <p className="font-medium dark:text-white">{viewingTenant.first_name} {viewingTenant.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="font-medium dark:text-white">{viewingTenant.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                    <p className="font-medium dark:text-white">{viewingTenant.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Date of Birth</p>
                    <p className="font-medium dark:text-white">
                      {viewingTenant.tenantProfile?.date_of_birth 
                        ? new Date(viewingTenant.tenantProfile.date_of_birth).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="border-t dark:border-gray-700 pt-4">
                  <h3 className="font-semibold mb-2 dark:text-white">Room Assignment</h3>
                  {viewingTenant.room ? (
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <p className="dark:text-gray-200"><span className="text-gray-600 dark:text-gray-400">Room:</span> {viewingTenant.room.room_number}</p>
                      <p className="dark:text-gray-200"><span className="text-gray-600 dark:text-gray-400">Type:</span> {viewingTenant.room.type_label}</p>
                      <p className="dark:text-gray-200"><span className="text-gray-600 dark:text-gray-400">Monthly Rate:</span> <PriceRow amount={viewingTenant.room.monthly_rate} /></p>
                    </div>
                  ) : (
                    <p className="text-amber-600 dark:text-amber-400 italic">No room assigned</p>
                  )}
                </div>

                <div className="border-t dark:border-gray-700 pt-4">
                  <h3 className="font-semibold mb-2 dark:text-white">Emergency Contact</h3>
                  {viewingTenant.tenantProfile?.emergency_contact_name ? (
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <p className="dark:text-gray-200"><span className="text-gray-600 dark:text-gray-400">Name:</span> {viewingTenant.tenantProfile.emergency_contact_name}</p>
                      <p className="dark:text-gray-200"><span className="text-gray-600 dark:text-gray-400">Phone:</span> {viewingTenant.tenantProfile.emergency_contact_phone}</p>
                      <p className="dark:text-gray-200"><span className="text-gray-600 dark:text-gray-400">Relationship:</span> {viewingTenant.tenantProfile.emergency_contact_relationship}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">No emergency contact information</p>
                  )}
                </div>

                {viewingTenant.tenantProfile?.current_address && (
                  <div className="border-t dark:border-gray-700 pt-4">
                    <h3 className="font-semibold mb-2 dark:text-white">Current Address</h3>
                    <p className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg dark:text-gray-200">{viewingTenant.tenantProfile.current_address}</p>
                  </div>
                )}

                {viewingTenant.tenantProfile?.preference && (
                  <div className="border-t dark:border-gray-700 pt-4">
                    <h3 className="font-semibold mb-2 dark:text-white">Notes / Preferences</h3>
                    <p className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg dark:text-gray-200">{viewingTenant.tenantProfile.preference}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t dark:border-gray-700">
                <button 
                  onClick={() => setViewingTenant(null)} 
                  className="w-full py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition dark:text-gray-300"
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