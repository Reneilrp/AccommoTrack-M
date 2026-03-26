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
  ShieldAlert,
  Loader2,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import { Skeleton, SkeletonStatCard } from '../../components/Shared/Skeleton';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';

export default function MyProperties({ __user }) {
  const { uiState, updateData } = useUIState();
  const cachedProperties = uiState.data?.landlord_properties || cacheManager.get('landlord_properties');

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState(uiState.data?.landlord_property_view || 'list');
  const [__selectedPropertyId, _setSelectedPropertyId] = useState(null);
  const navigate = useNavigate();
  const { collapse, _setIsSidebarOpen, _open } = useSidebar();
  const [properties, setProperties] = useState(cachedProperties || []);
  const [loading, setLoading] = useState(!cachedProperties);
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

    const handleOpenAdd = () => {
      setCurrentView('add');
      updateData('landlord_property_view', 'add');
    };
    window.addEventListener('open-add-property', handleOpenAdd);
    return () => window.removeEventListener('open-add-property', handleOpenAdd);
  }, []);

  useEffect(() => {
    // Sync local state if global state changes from elsewhere
    if (uiState.data?.landlord_property_view && uiState.data.landlord_property_view !== currentView) {
      setCurrentView(uiState.data.landlord_property_view);
    }
  }, [uiState.data?.landlord_property_view]);

  const checkVerificationStatus = async () => {
    try {
      const res = await api.get('/landlord/my-verification');
      setIsVerified(res.data?.status === 'approved' || res.data?.user?.is_verified === true);
    } catch (__err) {
      setIsVerified(false);
    }
  };

  const fetchProperties = async () => {
    try {
      if (!cachedProperties) setLoading(true);
      setError(null);

      // Using the axios instance
      const response = await api.get('/landlord/properties');
      const data = response.data;
      setProperties(data);
      updateData('landlord_properties', data);
      cacheManager.set('landlord_properties', data);

      // Pre-cache individual property summaries to enable instant transition to PropertySummary
      if (Array.isArray(data)) {
        data.forEach(prop => {
          const summaryKey = `property_summary_${prop.id}`;
          const existingSummary = uiState.data?.[summaryKey] || cacheManager.get(summaryKey);
          
          // Only update if summary doesn't exist or we want to refresh the basic property info
          const updatedSummary = {
            ...(existingSummary || {}),
            property: prop // Update the property object with latest from list
          };
          
          updateData(summaryKey, updatedSummary);
          cacheManager.set(summaryKey, updatedSummary);
        });
      }
      
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
    } catch (__err) {
      // ignore
    }
    navigate(`/properties/${propertyId}`);
  };

  const handleBackToList = () => {
    setCurrentView('list');
    updateData('landlord_property_view', 'list');
    _setSelectedPropertyId(null);
    fetchProperties();
  };

  const __handleDeleteProperty = async (propertyId) => {
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
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Image skeleton */}
        <Skeleton className="w-full lg:w-60 lg:h-48 h-56 rounded-xl flex-shrink-0" />
        
        {/* Content skeleton */}
        <div className="flex-1 pt-0 lg:pt-6">
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64 mb-4" />
          <Skeleton className="h-6 w-20 rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
    <div className="min-h-screen bg-transparent dark:bg-gray-900">
      {/* Verification Warning Banner */}
      {isVerified === false && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ShieldAlert className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <h4 className="text-yellow-800 dark:text-yellow-200 font-semibold">Draft-Only Mode</h4>
                  <p className="text-yellow-700 dark:text-yellow-400 text-sm">
                    Your account is pending verification. Properties can only be saved as drafts until approved.
                  </p>
                </div>
              </div>
              <Link
                to="/settings"
                state={{ tab: 'verification' }}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Check Status
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {loading ? (
            // Skeleton stats
            [...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
                <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Active Listings</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.activeListings}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <Home className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-400 dark:bg-gray-600" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Inactive Listings</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.inactiveListings}</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900/20 rounded-lg flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Total Rooms</p>
                    <p className="text-2xl font-bold text-green-600 mt-2">{stats.totalRooms}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
                <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Total Inquiries</p>
                    <p className="text-2xl font-bold text-orange-500 mt-2">{stats.totalInquiries.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tabs and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-400/50 dark:border-gray-700 mb-4 shadow-md overflow-hidden">
          <div className="flex flex-col p-4 border-b border-gray-300 dark:border-gray-700 gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                All Properties ({filteredProperties.length})
              </h2>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search properties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Filter Button */}
                <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                  <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>

                {/* Refresh Button */}
                <button
                  onClick={fetchProperties}
                  disabled={loading}
                  title="Refresh"
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md shadow-blue-500/20 flex-shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Tabs - Scrollable on mobile */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-2 overflow-x-auto no-scrollbar">
                {['all', 'active', 'inactive', 'pending'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 md:flex-none px-4 py-2.5 text-xs md:text-sm font-bold rounded-md transition-colors whitespace-nowrap ${
                      activeTab === tab ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Properties List */}
          <div className="divide-y divide-gray-300 dark:divide-gray-700">
            {loading ? (
              // Skeleton property items
              [...Array(3)].map((_, i) => <SkeletonPropertyListItem key={i} />)
            ) : filteredProperties.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No properties found</p>
                <p className="text-gray-500 text-sm">Add your first property to get started</p>
              </div>
            ) : (
              filteredProperties.map((property) => {
                // Get the image URL using the improved robust utility function
                const imageUrl = getImageUrl(property.images?.[0] || property.image_url);

                return (
                  <div
                    key={property.id}
                    className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors cursor-pointer group"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleViewProperty(property.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewProperty(property.id); } }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      {/* Property Image */}
                      <div className="w-full lg:w-60 lg:h-48 h-56 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-600 border-2 border-dashed border-gray-300 dark:border-gray-500 flex-shrink-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={property.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('❌ Image failed to load:', e.target.src);
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg></div>';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-8 h-8 text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Property Details */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-4 mb-2 pt-0 lg:pt-2">
                          <div className="flex items-center gap-4 min-w-0">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white truncate">{property.title}</h3>
                            <span className="hidden sm:inline text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider flex-shrink-0">
                              • {property.property_type?.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize flex-shrink-0 ${
                              property.current_status === 'active'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : property.current_status === 'inactive'
                                ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}
                          >
                            {property.current_status}
                          </span>
                        </div>

                        {/* Mobile-only type display (if hidden in header) */}
                        <div className="sm:hidden mb-2">
                          <span className="text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider">
                            {property.property_type?.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="truncate">{property.street_address}, {property.city}</span>
                        </div>

                        {property.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                            {property.description}
                          </p>
                        )}

                        {/* Property Stats */}
                        <div className="flex items-center gap-8 mt-auto pt-4 justify-center sm:justify-start">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Available Rooms</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{property.available_rooms || 0}</p>
                          </div>
                          
                          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>

                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Total Rooms</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{property.total_rooms || 0}</p>
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
            <div className="flex justify-end gap-4">
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
            <div className="flex justify-end gap-4">
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