import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import AddRoomModal from './AddRoom';
import RoomCard from '../../components/Rooms/RoomCard';
import RoomDetails from '../../components/Rooms/RoomDetails';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import {
  X,
  Plus,
  ArrowLeft,
  Building2,
  Home,
  Users,
  CheckCircle,
  Wrench,
  Trash2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export default function RoomManagement() {
  const { uiState, updateData } = useUIState();
  const location = useLocation();
  const navigate = useNavigate();
  
  const cachedProps = uiState.data?.accessible_properties || cacheManager.get('accessible_properties');

  // Synchronously determine initial property ID from URL or cache to prevent flicker
  const getInitialPropertyId = () => {
    const params = new URLSearchParams(location.search || '');
    const fromUrl = params.get('property');
    if (fromUrl) return Number(fromUrl);
    if (cachedProps && cachedProps.length > 0) return cachedProps[0].id;
    return null;
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [showRoomDetails, setShowRoomDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [properties, setProperties] = useState(cachedProps || []);
  const [selectedPropertyId, setSelectedPropertyId] = useState(getInitialPropertyId());
  
  // Dynamic cache key for rooms based on property
  const roomCacheKey = selectedPropertyId ? `rooms_property_${selectedPropertyId}` : null;
  const cachedRoomsData = roomCacheKey ? (uiState.data?.[roomCacheKey] || cacheManager.get(roomCacheKey)) : null;

  const [rooms, setRooms] = useState(cachedRoomsData?.rooms || []);
  const [stats, setStats] = useState(cachedRoomsData?.stats || { total: 0, occupied: 0, available: 0, maintenance: 0 });
  
  const [isFromProperty, setIsFromProperty] = useState(Boolean(new URLSearchParams(location.search).get('property')));

  const handleBackClick = () => {
    if (isFromProperty && selectedPropertyId) {
      navigate(`/properties/${selectedPropertyId}`);
    } else {
      navigate(-1);
    }
  };
  const [error, setError] = useState(null);
  const [loadingProperties, setLoadingProperties] = useState(!cachedProps);
  const [loadingRooms, setLoadingRooms] = useState(selectedPropertyId && !cachedRoomsData);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, room: null });
  const [deleting, setDeleting] = useState(false);
  const [propertyRules, setPropertyRules] = useState([]);
  const [propertyAmenitiesList, setPropertyAmenitiesList] = useState([]);
  const [totalFloors, setTotalFloors] = useState(1);
  const [propertyGender, setPropertyGender] = useState("mixed");
  const [newRule, setNewRule] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Load property-level rules and amenities when edit modal opens
  useEffect(() => {
    if (!showEditModal || !selectedPropertyId) return;
    const fetchPropertyDetails = async () => {
      try {
        const res = await api.get(`/landlord/properties/${selectedPropertyId}`);
        const p = res.data || {};
        setPropertyRules(p.property_rules || []);
        setPropertyAmenitiesList(p.amenities_list || []);
        setTotalFloors(p.total_floors || 1);
        setPropertyGender(p.gender_restriction || "mixed");
      } catch (err) {
        console.error('Failed to fetch property details for edit modal', err);
      }
    };
    fetchPropertyDetails();
  }, [showEditModal, selectedPropertyId]);

  const toggleAmenity = (amenity) => {
    setSelectedRoom(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const toggleRule = (rule) => {
    setSelectedRoom(prev => ({
      ...prev,
      rules: prev.rules.includes(rule)
        ? prev.rules.filter(r => r !== rule)
        : [...prev.rules, rule]
    }));
  };

  const addNewRule = async () => {
    if (!newRule.trim() || !selectedPropertyId) return;
    try {
      await api.post(`/landlord/properties/${selectedPropertyId}/rules`, {
        rule: newRule.trim()
      });
      setPropertyRules(prev => [...prev, newRule.trim()]);
      setSelectedRoom(prev => ({
        ...prev,
        rules: [...prev.rules, newRule.trim()]
      }));
      setNewRule('');
      toast.success('Rule added');
    } catch (err) {
      toast.error('Failed to add rule');
    }
  };

  const addNewAmenity = async () => {
    if (!newAmenity.trim() || !selectedPropertyId) return;
    try {
      await api.post(`/landlord/properties/${selectedPropertyId}/amenities`, {
        amenity: newAmenity.trim()
      });
      setPropertyAmenitiesList(prev => [...prev, newAmenity.trim()]);
      setSelectedRoom(prev => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()]
      }));
      setNewAmenity('');
      toast.success('Amenity added');
    } catch (err) {
      toast.error('Failed to add amenity');
    }
  };

  // Load properties (once)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (!cachedProps) setLoadingProperties(true);
        const res = await api.get('/properties/accessible');
        const data = res.data || [];
        setProperties(data);
        updateData('accessible_properties', data);
        cacheManager.set('accessible_properties', data);

        // If we don't have a property selected yet, pick the first one
        if (!selectedPropertyId && data.length > 0) {
          setSelectedPropertyId(data[0].id);
        }
      } catch (err) {
        setError('Failed to load properties');
      } finally {
        setLoadingProperties(false);
      }
    };

    loadInitialData();
  }, []); // Only run once on mount

  // Load rooms and stats when property changes
  useEffect(() => {
    if (!selectedPropertyId) return;
    fetchRooms();
  }, [selectedPropertyId]);

  // Get rooms
  const fetchRooms = async () => {
    if (!selectedPropertyId) return;
    const currentCacheKey = `rooms_property_${selectedPropertyId}`;
    const currentCached = uiState.data?.[currentCacheKey] || cacheManager.get(currentCacheKey);

    try {
      if (!currentCached) setLoadingRooms(true);
      setError(null);

      const [roomsRes, statsRes] = await Promise.all([
        api.get(`/rooms/property/${selectedPropertyId}?t=${Date.now()}`),
        api.get(`/rooms/property/${selectedPropertyId}/stats?t=${Date.now()}`)
      ]);

      const roomsData = roomsRes.data?.data || roomsRes.data || [];
      const statsData = statsRes.data;
      setRooms(roomsData);
      setStats(statsData);

      const newState = { rooms: roomsData, stats: statsData };
      updateData(currentCacheKey, newState);
      cacheManager.set(currentCacheKey, newState);
    } catch (err) {
      if (!currentCached) setError(err.message);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleRoomAdded = () => {
    fetchRooms();
  };

  const handleAmenityAdded = async () => {
    // Refresh the property data to get updated amenities
    try {
      const res = await api.get('/properties/accessible');
      const data = res.data;
      setProperties(data);
    } catch (err) {
      console.error('Failed to refresh properties:', err);
    }
  };

  // Edit Room
  const handleEditRoom = (room) => {
    setSelectedRoom({
      ...room,
      type: room.type_label,
      roomNumber: room.room_number,
      price: room.monthly_rate,
      genderRestriction: room.gender_restriction === 'mixed' ? 'male' : (room.gender_restriction || 'male'),
      floor: `${room.floor}${getOrdinalSuffix(room.floor)} Floor`,
      dailyRate: room.daily_rate || '',
      billingPolicy: room.billing_policy || 'monthly',
      pricingModel: room.pricing_model || 'full_room',
      minStayDays: room.min_stay_days || 1,
      require1MonthAdvance: room.require_1month_advance || false,
      amenities: room.amenities || [],
      rules: room.rules || []
    });
    setShowEditModal(true);
    setError(null);
  };

  function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  }

  // Update Room
  const handleUpdateRoom = async () => {
    try {
      setError(null);

      const roomTypeMap = {
        'Single Room': 'single',
        'Double Room': 'double',
        'Quad Room': 'quad',
        'Bed Spacer': 'bedSpacer'
      };

      const propertyType = properties.find(p => p.id === selectedPropertyId)?.property_type;
      const isGenderRestricted = ['dormitory', 'boardingHouse', 'bedSpacer'].includes(propertyType);

      const floorNumber = parseInt(selectedRoom.floor.match(/\d+/)[0]);

      const updateData = {
        room_number: selectedRoom.roomNumber,
        room_type: roomTypeMap[selectedRoom.type] || 'single',
        gender_restriction: isGenderRestricted ? selectedRoom.genderRestriction : 'mixed',
        floor: floorNumber,
        monthly_rate: parseFloat(selectedRoom.price),
        // include optional short-stay pricing fields
        daily_rate: selectedRoom.dailyRate !== undefined && selectedRoom.dailyRate !== '' ? parseFloat(selectedRoom.dailyRate) : null,
        billing_policy: selectedRoom.billingPolicy || null,
        pricing_model: selectedRoom.pricingModel || 'full_room',
        require_1month_advance: selectedRoom.require1MonthAdvance ? 1 : 0,
        min_stay_days: parseInt(selectedRoom.minStayDays) || 1,
        capacity: parseInt(selectedRoom.capacity),
        status: selectedRoom.status,
        description: selectedRoom.description || null,
        amenities: selectedRoom.amenities || [],
        rules: selectedRoom.rules || []
      };

      const response = await api.put(`/landlord/rooms/${selectedRoom.id}`, updateData);
      // axios throws on non-2xx so no manual ok check needed

      await fetchRooms();
      setShowEditModal(false);
      setSelectedRoom(null);
      toast.success('Room updated successfully');
    } catch (error) {
      console.error('Failed to update room:', error);
      const errData = error.response?.data;
      if (errData?.errors) {
        setFieldErrors(errData.errors);
        setError('Update failed. Please review the errors below.');
      } else {
        setError(errData?.message || error.message || 'An unknown error occurred.');
      }
    }
  };

  // Delete Room
  const handleDeleteRoom = async (roomId) => {
    try {
      setDeleting(true);
      setError(null);
      await api.delete(`/landlord/rooms/${roomId}`);
      await fetchRooms();
      setDeleteConfirmModal({ show: false, room: null });
      setShowEditModal(false);
      setSelectedRoom(null);
      toast.success('Room deleted successfully');
      return true;
    } catch (error) {
      console.error('Failed to delete room:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to delete room. Please try again.';
      setError(errorMsg);
      return false;
    } finally {
      setDeleting(false);
    }
  };

  // Open delete confirmation modal
  const openDeleteConfirm = (room) => {
    if (room.occupied && room.occupied > 0) {
      setError('Cannot delete room with active tenants. Please evict or reassign occupants first.');
      return;
    }
    setDeleteConfirmModal({ show: true, room });
  };

  const handleDeleteFromModal = () => {
    if (!selectedRoom) return;
    // Open confirmation modal instead of directly deleting
    openDeleteConfirm(selectedRoom);
  };

  // Status Room
  const handleStatusChange = async (roomId, newStatus) => {
    try {
      const res = await api.patch(`/rooms/${roomId}/status`, { status: newStatus });
      const updatedRoom = res.data;

      // Update the room in state
      setRooms(prev => prev.map(r =>
      r.id === roomId
        ? { ...r, status: updatedRoom.status, tenant: updatedRoom.tenant }
        : r
    ));

      // Update stats
      const oldStatus = rooms.find(r => r.id === roomId)?.status;
    setStats(prev => {
      const delta = (from, to) => (from === to ? 0 : -1) + (newStatus === to ? 1 : 0);
      return {
        available: prev.available + delta(oldStatus, 'available'),
        occupied: prev.occupied + delta(oldStatus, 'occupied'),
        maintenance: prev.maintenance + delta(oldStatus, 'maintenance'),
      };
    });
      toast.success('Room status updated successfully');

    } catch (error) {
      setError('Failed to update room status. Please try again.');
    }
  };

  // Filtering & UI helpers
  const filteredRooms = filterStatus === 'all'
    ? rooms
    : rooms.filter(room => room.status === filterStatus);

  const getStatusColor = (status) => {
    switch (status) {
      case 'occupied': return 'bg-red-100 text-red-800';
      case 'available': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Render
  // if (properties.length === 0) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <Building2 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
  //         <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Found</h3>
  //         <p className="text-gray-500 mb-4">Please add a property first before managing rooms.</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
          {/* absolute back arrow - upper-left */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <button
              onClick={handleBackClick}
              className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              aria-label="Back to property"
            >
              <ArrowLeft className="w-5 h-5 text-green-600 dark:text-green-500" />
            </button>
          </div>

          {/* centered title and subtitle */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Room Management</h1>
          </div>

          {/* right-side actions */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4">
            {!isFromProperty && (
              <select
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                value={selectedPropertyId || ''}
                onChange={(e) => setSelectedPropertyId(Number(e.target.value))}
                disabled={loadingProperties}
              >
                {loadingProperties ? (
                  <option>Loading Properties...</option>
                ) : (
                  properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))
                )}
              </select>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 shadow-lg shadow-green-500/20"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Room</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-4">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Rooms</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.total} / {stats.total_limit || stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Occupied</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{stats.occupied}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Available</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.available}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Maintenance</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{stats.maintenance}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 p-4 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filterStatus === 'all'
                ? 'bg-green-600 text-white shadow-md shadow-green-500/20'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              All Rooms ({stats.total})
            </button>
            <button
              onClick={() => setFilterStatus('occupied')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filterStatus === 'occupied'
                ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              Occupied ({stats.occupied})
            </button>
            <button
              onClick={() => setFilterStatus('available')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filterStatus === 'available'
                ? 'bg-green-600 text-white shadow-md shadow-green-500/20'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              Available ({stats.available})
            </button>
            <button
              onClick={() => setFilterStatus('maintenance')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filterStatus === 'maintenance'
                ? 'bg-yellow-600 text-white shadow-md shadow-yellow-500/20'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              Maintenance ({stats.maintenance})
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={fetchRooms}
                disabled={loadingRooms}
                title="Refresh"
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md shadow-blue-500/20"
              >
                {loadingRooms ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingRooms ? (
            // SKELETON CARDS (same size as RoomCard)
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-full">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden animate-pulse flex flex-col h-full">
                  <div className="relative h-48 bg-gray-200 dark:bg-gray-700" />
                  <div className="p-4 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-5 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="flex gap-2 mb-4">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
                      <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : filteredRooms.length > 0 ? (
            filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                className="h-full"
                room={room}
                onEdit={handleEditRoom}
                onClick={() => { 
                  // Ensure room object has tenants loaded as array for RoomDetails
                  const preparedRoom = {
                    ...room,
                    tenants: room.tenants || (room.tenant ? [{ name: room.tenant }] : [])
                  };
                  setSelectedRoomDetails(preparedRoom); 
                  setShowRoomDetails(true); 
                }}
                onStatusChange={handleStatusChange}
              />
            ))
          ) : (
            <div className="col-span-full px-2">
              <div className="text-center py-12 mx-auto max-w-xl">
                <Building2 className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No rooms found</h3>
                <p className="mt-2 text-sm text-gray-500">Get started by adding a new room.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="-ml-2 mr-2 h-5 w-5" />
                    Add Room
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Room Modal */}
      <AddRoomModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        propertyId={selectedPropertyId}
        onRoomAdded={handleRoomAdded}
        onAmenityAdded={handleAmenityAdded}
        propertyType={properties.find(p => p.id === selectedPropertyId)?.property_type}
        propertyAmenities={
          properties.find((p) => p.id === selectedPropertyId)?.amenities_list ||
          properties.find((p) => p.id === selectedPropertyId)?.amenities ||
          []
        }
      />

      {/* Edit Room Modal */}
      {showEditModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700 shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between bg-gray-50 dark:bg-gray-700/30">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Room {selectedRoom.roomNumber}</h2>
              <button
                onClick={() => { setShowEditModal(false); setSelectedRoom(null); setError(null); setFieldErrors({}); }}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close edit"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Room Number</label>
                  <input
                    type="text"
                    value={selectedRoom.roomNumber}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, roomNumber: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${fieldErrors.room_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {fieldErrors.room_number && <p className="text-red-500 text-xs mt-2">{fieldErrors.room_number[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Room Type</label>
                  <select
                    value={selectedRoom.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      const capacityMap = { 'Single Room': 1, 'Double Room': 2, 'Quad Room': 4, 'Bed Spacer': 1 };
                      setSelectedRoom({ ...selectedRoom, type, capacity: capacityMap[type] ?? selectedRoom.capacity });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option>Single Room</option>
                    <option>Double Room</option>
                    <option>Quad Room</option>
                    {properties.find(p => p.id === selectedPropertyId)?.property_type?.toLowerCase() !== 'apartment' && (
                      <option>Bed Spacer</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price (₱/month)</label>
                  <input
                    type="number"
                    value={selectedRoom.price}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, price: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${fieldErrors.monthly_rate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {fieldErrors.monthly_rate && <p className="text-red-500 text-xs mt-2">{fieldErrors.monthly_rate[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Floor</label>
                  <select
                    value={selectedRoom.floor}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, floor: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {Array.from({ length: totalFloors }, (_, i) => {
                      const floorVal = i + 1;
                      const floorLabel = `${floorVal}${getOrdinalSuffix(floorVal)} Floor`;
                      return (
                        <option key={floorVal} value={floorLabel}>
                          {floorLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {['dormitory', 'boardingHouse', 'bedSpacer'].includes(properties.find(p => p.id === selectedPropertyId)?.property_type) ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gender</label>
                    <select
                      value={selectedRoom.genderRestriction}
                      onChange={(e) => setSelectedRoom({ ...selectedRoom, genderRestriction: e.target.value })}
                      disabled={propertyGender !== "mixed"}
                      className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${propertyGender !== "mixed" ? "bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-70" : ""}`}
                    >
                      <option value="male">Male Only</option>
                      <option value="female">Female Only</option>
                    </select>
                    {propertyGender !== "mixed" && (
                      <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 italic">
                        * Property is restricted to {propertyGender} only.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="hidden"></div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capacity</label>
                  <input
                    type="number"
                    value={selectedRoom.capacity}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, capacity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min. Stay (Days)</label>
                  <input
                    type="number"
                    value={selectedRoom.minStayDays || 1}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, minStayDays: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    min="1"
                  />
                </div>
              </div>

              {/* Pricing Model Section */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Pricing Model</h4>
                <div className="space-y-2">
                  {selectedRoom.type !== 'Bed Spacer' && (
                    <label className={`flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors ${selectedRoom.pricingModel === 'full_room' ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}>
                      <input
                        type="radio"
                        name="editPricingModel"
                        value="full_room"
                        checked={selectedRoom.pricingModel === 'full_room'}
                        onChange={(e) => setSelectedRoom({ ...selectedRoom, pricingModel: e.target.value })}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Full Room Price</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Tenants divide the monthly rate equally.</p>
                      </div>
                    </label>
                  )}
                  <label className={`flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors ${selectedRoom.pricingModel === 'per_bed' ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}>
                    <input
                      type="radio"
                      name="editPricingModel"
                      value="per_bed"
                      checked={selectedRoom.pricingModel === 'per_bed'}
                      onChange={(e) => setSelectedRoom({ ...selectedRoom, pricingModel: e.target.value })}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Per Bed/Tenant Price</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Each tenant pays the monthly rate independently.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Short-stay / Daily pricing for edit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Daily Rate (₱/day)</label>
                  <input
                    type="number"
                    value={selectedRoom.dailyRate || ''}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, dailyRate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Billing Policy</label>
                  <select
                    value={selectedRoom.billingPolicy || 'monthly'}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, billingPolicy: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="monthly">Monthly Rate</option>
                    <option value="monthly_with_daily">Monthly + Daily</option>
                    <option value="daily">Daily Rate</option>
                  </select>
                </div>
              </div>

              {/* Advance Payment Toggle */}
              {(selectedRoom.billingPolicy === 'monthly' || selectedRoom.billingPolicy === 'monthly_with_daily') && (
                <div className="mt-4 col-span-full">
                  <label className="flex items-start space-x-4 cursor-pointer group p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-colors">
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        type="checkbox"
                        checked={selectedRoom.require1MonthAdvance}
                        onChange={(e) => setSelectedRoom({ ...selectedRoom, require1MonthAdvance: e.target.checked })}
                        className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                        Require 1-Month Advance
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Tenants will be billed for their first month's rent + an additional month as advance payment upon confirmation.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* Short-stay options simplified: billing policy and daily rate are handled above. */}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                  value={selectedRoom.status}
                  onChange={(e) => setSelectedRoom({ ...selectedRoom, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={selectedRoom.description || ''}
                  onChange={(e) => setSelectedRoom({ ...selectedRoom, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows="3"
                  placeholder="Add room description..."
                />
              </div>

              {/* Rules Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Room Rules</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {propertyRules.map((rule) => (
                    <button
                      key={rule}
                      type="button"
                      onClick={() => toggleRule(rule)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all text-left ${selectedRoom.rules.includes(rule)
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                    >
                      {rule}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    placeholder="New rule..."
                    className="flex-1 px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={addNewRule}
                    className="px-4 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Amenities Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Room Amenities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {propertyAmenitiesList.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all text-left ${selectedRoom.amenities.includes(amenity)
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    placeholder="New amenity..."
                    className="flex-1 px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={addNewAmenity}
                    className="px-4 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between bg-gray-50 dark:bg-gray-700/30">
              <button
                onClick={handleDeleteFromModal}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                title={selectedRoom?.occupied > 0 ? 'Cannot delete room with tenants' : 'Delete Room'}
                disabled={selectedRoom?.occupied > 0}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRoom(null);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRoom}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg shadow-green-500/20"
                >
                  Update Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Details Modal */}
      <RoomDetails
        room={selectedRoomDetails}
        isOpen={showRoomDetails}
        onClose={() => { setShowRoomDetails(false); setSelectedRoomDetails(null); }}
        onExtend={async ({ roomId, days, months, tenant_id }) => {
          if (!roomId) return;
          try {
            // prefer days if provided, otherwise months
            const payload = {};
            if (days) payload.days = days;
            if (months) payload.months = months;
            if (tenant_id) payload.tenant_id = tenant_id;
            // call backend API - endpoint should be implemented server-side
            await api.post(`/rooms/${roomId}/extend`, payload);

            // refresh rooms list
            await fetchRooms();

            // fetch the updated room details so the modal reflects new stays immediately
            try {
              const res = await api.get(`/rooms/${roomId}`);
              setSelectedRoomDetails(res.data);
            } catch (fetchErr) {
              // Non-fatal: if fetching details fails, we still refreshed rooms above
              console.warn('Failed to fetch updated room details', fetchErr);
            }

          } catch (err) {
            console.error('Failed to extend stay', err);
            setError(err.response?.data?.message || err.message || 'Failed to extend stay');
            throw err;
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.show && deleteConfirmModal.room && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Room</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">Room {deleteConfirmModal.room.room_number || deleteConfirmModal.room.roomNumber}</span>? 
              All data associated with this room will be permanently removed.
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  setDeleteConfirmModal({ show: false, room: null });
                  setError(null);
                }}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRoom(deleteConfirmModal.room.id)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 font-medium shadow-lg shadow-red-500/20"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Room
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}