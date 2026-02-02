import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSidebar } from '../../contexts/SidebarContext';
import AddProperty from './AddProperty';
import {
  Plus,
  Home,
  Search,
  Filter,
  MapPin,
  Building2,
  ShieldAlert
} from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import { Skeleton, SkeletonStatCard } from '../../components/Shared/Skeleton';

export default function MyProperties({ user }) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState('list');
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const navigate = useNavigate();
  const { collapse, setIsSidebarOpen, open } = useSidebar();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, property: null });
  const [passwordModal, setPasswordModal] = useState({ show: false, property: null });
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(null);

  useEffect(() => {
    fetchProperties();
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const res = await api.get('/landlord/my-verification');
      setIsVerified(res.data?.status === 'approved' || res.data?.user?.is_verified === true);
    } catch (err) {
      setIsVerified(false);
    }
  };

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

  const handleViewProperty = async (propertyId) => {
    // collapse sidebar (no-op on mobile) and wait for transition to finish
    try {
      await collapse();
    } catch (err) {
      // ignore
    }
    navigate(`/properties/${propertyId}`);
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedPropertyId(null);
    fetchProperties();
  };

  const handleDeleteProperty = async (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    setPasswordModal({ show: true, property });
    setPassword('');
    setPasswordError('');
  };

  const verifyPassword = async () => {
    if (!password) {
      setPasswordError('Please enter your password');
      return;
    }

    try {
      setVerifying(true);
      setPasswordError('');
      
      const response = await api.post('/landlord/properties/verify-password', {
        password: password
      });

      if (response.data.verified) {
        // Password verified, show confirmation modal (keep password for final deletion)
        setPasswordModal({ show: false, property: passwordModal.property });
        setDeleteConfirm({ show: true, property: passwordModal.property });
        setPasswordError('');
        // Keep password in state for final deletion
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Incorrect password';
      setPasswordError(errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.property) return;
    
    try {
      setLoading(true);
      // Send password in request body for DELETE request
      const response = await api.delete(`/landlord/properties/${deleteConfirm.property.id}`, {
        data: { password: password }
      });
      
      if (response.status === 200) {
        toast.success(response.data.message || 'Property deleted successfully');
        fetchProperties();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete property';
      toast.error(errorMessage);
      // If password is wrong, go back to password modal
      if (err.response?.data?.error === 'password_incorrect') {
        setDeleteConfirm({ show: false, property: null });
        setPasswordModal({ show: true, property: deleteConfirm.property });
        setPassword('');
        setPasswordError(err.response?.data?.message || 'Incorrect password');
      }
    } finally {
      setLoading(false);
      setDeleteConfirm({ show: false, property: null });
      setPassword('');
    }
  };

  // detail view is now route-based; keep add view fallback

  if (currentView === 'add') {
    return <AddProperty onBack={handleBackToList} onSave={handleBackToList} />;
  }

  // Skeleton for property list item
  const SkeletonPropertyListItem = () => (
    <div className="p-4 animate-pulse">
      <div className="flex items-start gap-6">
        {/* Image skeleton */}
        <Skeleton className="w-60 h-48 rounded-lg flex-shrink-0" />
        
        {/* Content skeleton */}
        <div className="flex-1 pt-5">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64 mb-3" />
          <Skeleton className="h-6 w-20 rounded mb-4" />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-4 w-8" />
            </div>
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-4 w-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Verification Warning Banner */}
      {isVerified === false && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-yellow-600" />
                <div>
                  <h4 className="text-yellow-800 font-semibold">Draft-Only Mode</h4>
                  <p className="text-yellow-700 text-sm">
                    Your account is pending verification. Properties can only be saved as drafts until approved.
                  </p>
                </div>
              </div>
              <Link
                to="/settings"
                state={{ tab: 'verification' }}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Check Status
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center">
            <div className="w-full text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Properties</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and track all your property listings</p>
            </div>
            <div className="mt-4 lg:mt-0">
              <button
                onClick={() => setCurrentView('add')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium w-40 justify-center whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Add Property
              </button>
            </div>
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
          {loading ? (
            // Skeleton stats
            [...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Active Listings</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeListings}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Inactive Listings</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.inactiveListings}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total Rooms</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalRooms}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total Inquiries</p>
                <p className="text-3xl font-bold text-orange-500">{stats.totalInquiries.toLocaleString()}</p>
              </div>
            </>
          )}
        </div>

        {/* Tabs and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
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
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Filter */}
              <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              {/* Tabs */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'all' ? 'bg-green-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'active' ? 'bg-green-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab('inactive')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'inactive' ? 'bg-green-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Inactive
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'pending' ? 'bg-green-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>

          {/* Properties List */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              // Skeleton property items
              [...Array(3)].map((_, i) => <SkeletonPropertyListItem key={i} />)
            ) : filteredProperties.length === 0 ? (
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
                  <div
                    key={property.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleViewProperty(property.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewProperty(property.id); } }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-6 flex-1">
                        {/* Property Image */}
                        <div className="w-60 h-48 min-w-60 min-h-48 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600 border-2 border-dashed border-gray-300 dark:border-gray-500 flex-shrink-0">
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
                        <div className="flex-1 flex-row-3">
                          <div className="flex items-center gap-3 mb-1 pt-5">
                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center">{property.title}</h3>
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

                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 mb-3">
                            <MapPin className="w-4 h-4" />
                            {property.street_address}, {property.city}
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium rounded capitalize">
                              {property.property_type}
                            </span>
                          </div>

                          {/* Property Stats */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Available Rooms</p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{property.available_rooms || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Rooms</p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{property.total_rooms || 0}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Password Verification Modal */}
      {passwordModal.show && passwordModal.property && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">Verify Password</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Please enter your password to confirm deletion of "{passwordModal.property.title}".
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !verifying) {
                    verifyPassword();
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white ${
                  passwordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter your password"
                autoFocus
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-600">{passwordError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setPasswordModal({ show: false, property: null });
                  setPassword('');
                  setPasswordError('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={verifying}
              >
                Cancel
              </button>
              <button
                onClick={verifyPassword}
                disabled={verifying || !password}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.property && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">Confirm Deletion</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete "{deleteConfirm.property.title}"?
              {deleteConfirm.property.total_rooms > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  This will also delete all {deleteConfirm.property.total_rooms} associated room(s).
                </span>
              )}
              <span className="block mt-2">This action cannot be undone.</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteConfirm({ show: false, property: null });
                  setPassword('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Property
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}