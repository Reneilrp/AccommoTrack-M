import { useState, useEffect } from 'react';
import AddProperty from './AddProperty';
import DormProfileSettings from './DormProfileSettings';
import {
  Plus,
  Home,
  Search,
  Filter,
  MapPin,
  Edit,
  MoreVertical,
  Building2,
  Loader2
} from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';

export default function MyProperties({ user }) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState('list');
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      // Using the axios instance
      const response = await api.get('/landlord/properties');
      console.log('📦 Properties fetched:', response.data);
      setProperties(response.data);
      
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    activeListings: properties.filter(p => p.current_status === 'active').length,
    inactiveListings: properties.filter(p => p.current_status === 'inactive').length,
    totalRooms: properties.reduce((sum, p) => sum + (p.total_rooms || 0), 0),
    totalInquiries: 0
  };

  const filteredProperties = properties.filter(property => {
    const matchesTab = activeTab === 'all' || property.current_status === activeTab;
    const matchesSearch = property.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.street_address?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleViewProperty = (propertyId) => {
    setSelectedPropertyId(propertyId);
    setCurrentView('detail');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedPropertyId(null);
    fetchProperties();
  };

  if (currentView === 'detail' && selectedPropertyId) {
    return <DormProfileSettings propertyId={selectedPropertyId} onBack={handleBackToList} />;
  }

  if (currentView === 'add') {
    return <AddProperty onBack={handleBackToList} onSave={handleBackToList} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

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
              onClick={() => setCurrentView('add')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
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
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
                <Filter className="w-5 h-5 text-gray-600" />
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
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No properties found</p>
                <p className="text-gray-400 text-sm">Add your first property to get started</p>
              </div>
            ) : (
              filteredProperties.map((property) => {
                // Get the image URL using the utility function
                const imageUrl = property.images && property.images.length > 0 
                  ? getImageUrl(property.images[0].image_url)
                  : null;

                // Debug log (you can remove this later)
                if (property.images && property.images.length > 0) {
                  console.log('🖼️ Property:', property.title);
                  console.log('🖼️ Raw image_url:', property.images[0].image_url);
                  console.log('🖼️ Final URL:', imageUrl);
                }

                return (
                  <div key={property.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Property Image */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 border-2 border-dashed border-gray-300 flex-shrink-0">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={property.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('❌ Image failed to load:', e.target.src);
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg></div>';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Property Details */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">{property.title}</h3>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                                property.current_status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : property.current_status === 'inactive'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {property.current_status}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                            <MapPin className="w-4 h-4" />
                            {property.street_address}, {property.city}
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded capitalize">
                              {property.property_type}
                            </span>
                          </div>

                          {/* Property Stats */}
                          <div className="grid grid-cols-3 gap-4">
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
                        <button
                          onClick={() => handleViewProperty(property.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="More Options"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}