import { useState, useEffect } from 'react';
import { Search, Eye, RefreshCw, X, Loader2 } from 'lucide-react';

export default function TenantManagement() {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewingTenant, setViewingTenant] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    date_of_birth: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    current_address: '',
    preference: '',
  });

  const API = '/api';
  const token = localStorage.getItem('auth_token');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  useEffect(() => {
    fetch(`${API}/properties`, { headers })
      .then(r => r.json())
      .then(data => {
        setProperties(data);
        if (data.length > 0) setSelectedPropertyId(data[0].id);
      })
      .catch(err => console.error('Failed to load properties:', err));
  }, []);

  useEffect(() => {
    if (!selectedPropertyId) return;
    loadTenants();
  }, [selectedPropertyId]);

  // Auto-refresh when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedPropertyId) {
        loadTenants();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedPropertyId]);

  const loadTenants = async () => {
    if (!selectedPropertyId) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Add timestamp to prevent caching
      const response = await fetch(`${API}/landlord/tenants?property_id=${selectedPropertyId}&t=${Date.now()}`, { headers });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message || data.error);
      }
      
      setTenants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load tenants:', err);
      setTenants([]);
      setError('Failed to load tenants: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (editingTenant) {
      setForm({
        first_name: editingTenant.first_name || '',
        last_name: editingTenant.last_name || '',
        email: editingTenant.email || '',
        phone: editingTenant.phone || '',
        date_of_birth: editingTenant.tenantProfile?.date_of_birth || '',
        emergency_contact_name: editingTenant.tenantProfile?.emergency_contact_name || '',
        emergency_contact_phone: editingTenant.tenantProfile?.emergency_contact_phone || '',
        emergency_contact_relationship: editingTenant.tenantProfile?.emergency_contact_relationship || '',
        current_address: editingTenant.tenantProfile?.current_address || '',
        preference: editingTenant.tenantProfile?.preference || '',
      });
    } else {
      setForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        date_of_birth: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        current_address: '',
        preference: '',
      });
    }
  }, [editingTenant]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this tenant? This will also free up their room.')) return;
    
    try {
      await fetch(`${API}/landlord/tenants/${id}`, { method: 'DELETE', headers });
      refresh();
    } catch (err) {
      setError('Failed to remove tenant');
    }
  };

  const handleView = (tenant) => {
    setViewingTenant(tenant);
  };

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const url = editingTenant ? `${API}/landlord/tenants/${editingTenant.id}` : `${API}/landlord/tenants`;
      const method = editingTenant ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(form)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save');
      }
      
      setShowModal(false);
      setEditingTenant(null);
      refresh();
    } catch (err) {
      setError(err.message || 'Failed to save tenant');
    }
  };

  const refresh = () => {
    loadTenants();
  };

  const filteredTenants = tenants.filter(tenant => {
    const fullName = `${tenant.first_name} ${tenant.last_name}`.toLowerCase();
    const email = tenant.email.toLowerCase();
    const roomNumber = tenant.room?.room_number || '';
    return fullName.includes(searchQuery.toLowerCase()) || 
           email.includes(searchQuery.toLowerCase()) ||
           roomNumber.includes(searchQuery);
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.tenantProfile?.status === 'active').length,
    paid: tenants.filter(t => t.latestBooking?.payment_status === 'paid').length,
    pending: tenants.filter(t => t.latestBooking?.payment_status === 'unpaid').length,
    overdue: tenants.filter(t => t.latestBooking?.payment_status === 'overdue').length
  };

  // Show loading state if properties are still loading
  if (properties.length === 0 && !selectedPropertyId) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
            <p className="text-gray-600 mt-1">Manage all tenants and their room assignments</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-2" />
              <p className="text-lg font-medium">Loading properties...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-gray-600 mt-1">Manage all tenants and their room assignments</p>
        </div>

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
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, room number or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <select
              value={selectedPropertyId}
              onChange={e => setSelectedPropertyId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
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
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-2" />
                      <p className="text-lg font-medium">Loading tenants...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
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
                        {tenant.room ? `₱${tenant.room.monthly_rate}` : 'N/A'}
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
                      <p><span className="text-gray-600">Monthly Rate:</span> ₱{viewingTenant.room.monthly_rate}</p>
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

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button 
                  onClick={() => setViewingTenant(null)} 
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    setEditingTenant(viewingTenant);
                    setViewingTenant(null);
                    setShowModal(true);
                  }}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Edit Information
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Tenant Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editingTenant ? 'Edit' : 'Add'} Tenant</h2>
                <button onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  placeholder="First Name" 
                  value={form.first_name} 
                  onChange={e => setForm({ ...form, first_name: e.target.value })} 
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
                />
                <input 
                  placeholder="Last Name" 
                  value={form.last_name} 
                  onChange={e => setForm({ ...form, last_name: e.target.value })} 
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
                />
                <input 
                  placeholder="Email" 
                  type="email" 
                  value={form.email} 
                  onChange={e => setForm({ ...form, email: e.target.value })} 
                  className="col-span-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
                />
                <input 
                  placeholder="Phone" 
                  value={form.phone} 
                  onChange={e => setForm({ ...form, phone: e.target.value })} 
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
                />
                {!editingTenant && (
                  <input 
                    placeholder="Password" 
                    type="password" 
                    value={form.password} 
                    onChange={e => setForm({ ...form, password: e.target.value })} 
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
                  />
                )}
                <input 
                  placeholder="Date of Birth" 
                  type="date" 
                  value={form.date_of_birth} 
                  onChange={e => setForm({ ...form, date_of_birth: e.target.value })} 
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
                />
                <input 
                  placeholder="Emergency Contact Name" 
                  value={form.emergency_contact_name} 
                  onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} 
                  className="col-span-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
                />
                <input 
                  placeholder="Emergency Phone" 
                  value={form.emergency_contact_phone} 
                  onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} 
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
                />
                <input 
                  placeholder="Relationship" 
                  value={form.emergency_contact_relationship} 
                  onChange={e => setForm({ ...form, emergency_contact_relationship: e.target.value })} 
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
                />
                <textarea 
                  placeholder="Current Address" 
                  value={form.current_address} 
                  onChange={e => setForm({ ...form, current_address: e.target.value })} 
                  className="col-span-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
                  rows={2} 
                />
                <textarea 
                  placeholder="Preference / Behavior Notes" 
                  value={form.preference} 
                  onChange={e => setForm({ ...form, preference: e.target.value })} 
                  className="col-span-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" 
                  rows={2} 
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  {editingTenant ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}