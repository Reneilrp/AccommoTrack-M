import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../../utils/api';
import AddRoomModal from './AddRoom';
import RoomCard from '../Rooms/RoomCard';
import RoomDetails from '../Rooms/RoomDetails';
import {
  X,
  Plus,
  Building2,
  Home,
  Users,
  CheckCircle,
  Wrench,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export default function RoomManagement() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [showRoomDetails, setShowRoomDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({ total: 0, occupied: 0, available: 0, maintenance: 0 });
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [error, setError] = useState(null);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, room: null });
  const [deleting, setDeleting] = useState(false);

  const API_URL = '/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Load properties (once)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingProperties(true);
        const res = await api.get('/properties/accessible');
        const data = res.data;
        setProperties(data);
        if (data.length > 0) {
          setSelectedPropertyId(data[0].id);
        }
      } catch (err) {
        setError('Failed to load properties');
      } finally {
        setLoadingProperties(false);
      }
    };

    loadInitialData();
  }, []);

  // Load rooms and stats when property changes
  useEffect(() => {
    if (!selectedPropertyId) return;

    const loadRooms = async () => {
      try {
        setLoadingRooms(true);
        setError(null);

        const [roomsRes, statsRes] = await Promise.all([
          api.get(`/rooms/property/${selectedPropertyId}?t=${Date.now()}`),
          api.get(`/rooms/property/${selectedPropertyId}/stats?t=${Date.now()}`)
        ]);

        const roomsData = roomsRes.data;
        const statsData = statsRes.data;
        setRooms(roomsData);
        setStats(statsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingRooms(false);
      }
    };

    loadRooms();
  }, [selectedPropertyId]);

  // Get rooms
  const fetchRooms = async () => {
    if (!selectedPropertyId) return;
    try {
      setLoadingRooms(true);
      setError(null);

      const [roomsRes, statsRes] = await Promise.all([
        api.get(`/rooms/property/${selectedPropertyId}?t=${Date.now()}`),
        api.get(`/rooms/property/${selectedPropertyId}/stats?t=${Date.now()}`)
      ]);

      const roomsData = roomsRes.data;
      const statsData = statsRes.data;
      setRooms(roomsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
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
      floor: room.floor_label
      ,
      dailyRate: room.daily_rate || '',
      billingPolicy: room.billing_policy || 'monthly',
      minStayDays: room.min_stay_days || '',
      prorateBase: room.prorate_base || '30'
    });
    setShowEditModal(true);
    setError(null);
  };

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

      const floorNumber = parseInt(selectedRoom.floor.match(/\d+/)[0]);

      const updateData = {
        room_number: selectedRoom.roomNumber,
        room_type: roomTypeMap[selectedRoom.type] || 'single',
        floor: floorNumber,
        monthly_rate: parseFloat(selectedRoom.price),
        // include optional short-stay pricing fields
        daily_rate: selectedRoom.dailyRate !== undefined && selectedRoom.dailyRate !== '' ? parseFloat(selectedRoom.dailyRate) : null,
        billing_policy: selectedRoom.billingPolicy || null,
        min_stay_days: selectedRoom.minStayDays !== undefined && selectedRoom.minStayDays !== '' ? parseInt(selectedRoom.minStayDays) : null,
        prorate_base: selectedRoom.prorateBase ? parseInt(selectedRoom.prorateBase) : null,
        capacity: parseInt(selectedRoom.capacity),
        status: selectedRoom.status,
        description: selectedRoom.description || null
      };

      const response = await api.put(`/landlord/rooms/${selectedRoom.id}`, updateData);
      // axios throws on non-2xx so no manual ok check needed

      await fetchRooms();
      setShowEditModal(false);
      setSelectedRoom(null);
    } catch (error) {
      console.error('Failed to update room:', error);
      setError(error.message);
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
  //         <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
  //         <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Found</h3>
  //         <p className="text-gray-500 mb-4">Please add a property first before managing rooms.</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage all rooms in your properties</p>
            </div>

            <div className="flex items-center gap-4">
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Room
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Rooms</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Occupied</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.occupied}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Available</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.available}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Maintenance</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.maintenance}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              All Rooms ({stats.total})
            </button>
            <button
              onClick={() => setFilterStatus('occupied')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'occupied'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Occupied ({stats.occupied})
            </button>
            <button
              onClick={() => setFilterStatus('available')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'available'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Available ({stats.available})
            </button>
            <button
              onClick={() => setFilterStatus('maintenance')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'maintenance'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Maintenance ({stats.maintenance})
            </button>
          </div>
        </div>

        {/* Rooms Grid (flex-wrap for 3-per-row) */}
        <div className="flex flex-wrap -mx-2 gap-6">
          {loadingRooms ? (
            // SKELETON CARDS
            [...Array(3)].map((_, i) => (
              <div key={i} className="w-full md:w-1/2 lg:w-1/3 px-2 mb-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse flex flex-col">
                  <div className="relative h-48 bg-gray-200"></div>
                  <div className="p-4 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="h-5 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="flex gap-1 mb-3">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                      <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : filteredRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    className="h-full"
                    room={room}
                    onEdit={handleEditRoom}
                    onClick={() => { setSelectedRoomDetails(room); setShowRoomDetails(true); }}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
          ) : (
            <div className="w-full px-2">
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No rooms found</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding a new room.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
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
        propertyAmenities={properties.find(p => p.id === selectedPropertyId)?.amenities || properties.find(p => p.id === selectedPropertyId)?.property_rules?.amenities || []}
      />

      {/* Edit Room Modal */}
      {showEditModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-start justify-between">
              <h2 className="text-xl font-bold text-gray-900">Edit Room {selectedRoom.roomNumber}</h2>
              <button
                onClick={() => { setShowEditModal(false); setSelectedRoom(null); setError(null); }}
                className="p-2 rounded-md hover:bg-gray-100"
                aria-label="Close edit"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
                  <input
                    type="text"
                    value={selectedRoom.roomNumber}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, roomNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
                  <select
                    value={selectedRoom.type}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (₱/month)</label>
                  <input
                    type="number"
                    value={selectedRoom.price}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
                  <select
                    value={selectedRoom.floor}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, floor: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option>1st Floor</option>
                    <option>2nd Floor</option>
                    <option>3rd Floor</option>
                    <option>4th Floor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                <input
                  type="number"
                  value={selectedRoom.capacity}
                  onChange={(e) => setSelectedRoom({ ...selectedRoom, capacity: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="1"
                />
              </div>

              {/* Short-stay / Daily pricing for edit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Daily Rate (₱/day)</label>
                  <input
                    type="number"
                    value={selectedRoom.dailyRate || ''}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, dailyRate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Billing Policy</label>
                  <select
                    value={selectedRoom.billingPolicy || 'monthly'}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, billingPolicy: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="monthly">Monthly Rate</option>
                    <option value="monthly_with_daily">Monthly + Daily</option>
                    <option value="daily">Daily Rate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Stay Days (optional)</label>
                  <input
                    type="number"
                    value={selectedRoom.minStayDays || ''}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, minStayDays: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prorate Base (days)</label>
                  <input
                    type="number"
                    value={selectedRoom.prorateBase || '30'}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, prorateBase: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={selectedRoom.status}
                  onChange={(e) => setSelectedRoom({ ...selectedRoom, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={selectedRoom.description || ''}
                  onChange={(e) => setSelectedRoom({ ...selectedRoom, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows="3"
                  placeholder="Add room description..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={handleDeleteFromModal}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={selectedRoom?.occupied > 0 ? 'Cannot delete room with tenants' : 'Delete Room'}
                disabled={selectedRoom?.occupied > 0}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRoom(null);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRoom}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.show && deleteConfirmModal.room && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Room</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">Room {deleteConfirmModal.room.room_number || deleteConfirmModal.room.roomNumber}</span>? 
              All data associated with this room will be permanently removed.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteConfirmModal({ show: false, room: null });
                  setError(null);
                }}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRoom(deleteConfirmModal.room.id)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
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