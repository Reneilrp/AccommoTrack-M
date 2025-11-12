import { useState, useEffect } from 'react';
import AddProperty from './AddProperty';

export default function MyProperties({ user }) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPropertyPage, setShowAddPropertyPage] = useState(false);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = '/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch properties on component mount
  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/properties`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }

      const data = await response.json();
      setProperties(data);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    activeListings: properties.filter(p => p.current_status === 'active').length,
    inactiveListings: properties.filter(p => p.current_status === 'inactive').length,
    totalRooms: properties.reduce((sum, p) => sum + (p.total_rooms || 0), 0),
    totalInquiries: 280 // This would come from another API endpoint
  };

  const filteredProperties = properties.filter(property => {
    const matchesTab = activeTab === 'all' || property.current_status === activeTab;
    const matchesSearch = property.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         property.street_address?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleAddProperty = () => {
    setShowAddPropertyPage(true);
  };

  const handleBackToProperties = () => {
    setShowAddPropertyPage(false);
    fetchProperties();
  };

  const handleSaveProperty = (savedProperty, status) => {
    // Property is already saved to database via API in AddProperty component
    // Just refresh the list
    fetchProperties();
    setShowAddPropertyPage(false);
  };

  // If showing Add Property page, render that instead
  if (showAddPropertyPage) {
    return <AddProperty onBack={handleBackToProperties} onSave={handleSaveProperty} />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  // Otherwise, render the properties list
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Properties</h1>
              <p className="text-sm text-gray-500 mt-1">Manage and track all your property listings</p>
            </div>
            <button
              onClick={handleAddProperty}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Property
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Active Listings</p>
            <p className="text-3xl font-bold text-gray-900">{stats.activeListings}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Inactive Listings</p>
            <p className="text-3xl font-bold text-gray-900">{stats.inactiveListings}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Rooms</p>
            <p className="text-3xl font-bold text-green-600">{stats.totalRooms}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Inquiries</p>
            <p className="text-3xl font-bold text-orange-500">{stats.totalInquiries.toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs and Search */}
        <div className="bg-white rounded-lg border border-gray-200 mb-4">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                All Properties ({filteredProperties.length})
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              {/* Filter */}
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>

              {/* Tabs */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'all' ? 'bg-green-600 text-white' : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'active' ? 'bg-green-600 text-white' : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab('inactive')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'inactive' ? 'bg-green-600 text-white' : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Inactive
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'pending' ? 'bg-green-600 text-white' : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>

          {/* Properties List */}
          <div className="divide-y divide-gray-200">
            {filteredProperties.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-gray-500 text-lg mb-2">No properties found</p>
                <p className="text-gray-400 text-sm">Add your first property to get started</p>
              </div>
            ) : (
              filteredProperties.map((property) => (
                <div key={property.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Property Icon */}
                      <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>

                      {/* Property Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">{property.title}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                            property.current_status === 'active' ? 'bg-green-100 text-green-700' :
                            property.current_status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {property.current_status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {property.full_address || property.street_address}
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded capitalize">
                            {property.property_type}
                          </span>
                        </div>
                        
                        {/* Property Stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Monthly Rate</p>
                            <p className="text-sm font-semibold text-green-600">
                              ₱{property.price_per_month?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Available Rooms</p>
                            <p className="text-sm font-semibold text-gray-900">{property.available_rooms || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Total Rooms</p>
                            <p className="text-sm font-semibold text-gray-900">{property.total_rooms || 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}