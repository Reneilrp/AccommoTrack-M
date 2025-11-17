import { useState, useEffect } from 'react';
import AddRoomModal from './AddRoom';
import {
  X,
  Plus,
  Building2,
  Home,
  Users,
  CheckCircle,
  Wrench,
  Trash2,
} from 'lucide-react';

export default function RoomManagement() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({ total: 0, occupied: 0, available: 0, maintenance: 0 });
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [error, setError] = useState(null);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);

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
        const res = await fetch(`${API_URL}/landlord/properties`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to load properties');
        const data = await res.json();

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
          fetch(`${API_URL}/landlord/properties/${selectedPropertyId}/rooms?t=${Date.now()}`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/landlord/properties/${selectedPropertyId}/rooms/stats?t=${Date.now()}`, { headers: getAuthHeaders() })
        ]);
        
        const [roomsData, statsData] = await Promise.all([roomsRes.json(), statsRes.json()]);
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
        fetch(`${API_URL}/landlord/properties/${selectedPropertyId}/rooms?t=${Date.now()}`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/landlord/properties/${selectedPropertyId}/rooms/stats?t=${Date.now()}`, { headers: getAuthHeaders() })
      ]);

      if (!roomsRes.ok || !statsRes.ok) throw new Error('Failed to load rooms');

      const [roomsData, statsData] = await Promise.all([roomsRes.json(), statsRes.json()]);
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

  // Edit Room
  const handleEditRoom = (room) => {
    setSelectedRoom({
      ...room,
      type: room.type_label,
      roomNumber: room.room_number,
      price: room.monthly_rate,
      floor: room.floor_label
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
        capacity: parseInt(selectedRoom.capacity),
        status: selectedRoom.status,
        description: selectedRoom.description || null
      };

      const response = await fetch(`${API_URL}/rooms/${selectedRoom.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update room');
      }

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
    if (window.confirm('Are you sure you want to delete this room?')) {
      try {
        const response = await fetch(`${API_URL}/rooms/${roomId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to delete room');

        await fetchRooms();
      } catch (error) {
        console.error('Failed to delete room:', error);
        setError('Failed to delete room. Please try again.');
      }
    }
  };

  // Status Room
  const handleStatusChange = async (roomId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/rooms/${roomId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      const updatedRoom = await response.json();

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

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingRooms ? (
            // SKELETON CARDS
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse flex flex-col">
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
            ))
          ) : filteredRooms.length > 0 ? (
            filteredRooms.map((room) => {
              console.log('Rendering room:', room); // Debug

              return (
                <div
                  key={room.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
                >
                  {/* Image + Status Badge */}
                  <div className="relative h-48">
                    {room.images && room.images.length > 0 ? (
                      <img
                        src={room.images[0]}
                        alt={room.room_number}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Home className="w-16 h-16 text-gray-400" />
                      </div>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`absolute top-3 right-3 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider ${room.status === 'occupied'
                        ? 'bg-red-100 text-red-700'
                        : room.status === 'available'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}
                    >
                      {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    {/* Room Info */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Room {room.room_number}</h3>
                        <p className="text-sm text-gray-500">
                          {room.type_label} • {room.floor_label}
                        </p>
                      </div>
                      <p className="text-xl font-bold text-green-600">
                        ₱{room.monthly_rate.toLocaleString()}
                        <span className="text-xs block text-gray-500">per month</span>
                      </p>
                    </div>

                    {/* Capacity */}
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                      <Users className="w-4 h-4" />
                      <span>
                        {room.occupied}/{room.capacity} {room.occupied === 1 ? 'Tenant' : 'Tenants'}
                      </span>
                    </div>

                    {/* Current Tenant */}
                    {room.tenant ? (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
                        <p className="text-xs text-gray-500">Current Tenant(s):</p>
                        <p className="font-semibold text-gray-800">{room.tenant}</p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-dashed border-gray-300 text-center">
                        <p className="text-xs text-gray-500">No tenant assigned</p>
                      </div>
                    )}

                    {/* Amenities */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {room.amenities.slice(0, 3).map((amenity, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200"
                          >
                            {amenity}
                          </span>
                        ))}
                        {room.amenities.length > 3 && (
                          <span className="text-xs text-gray-500 self-center">
                            +{room.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                      {/* Status Dropdown */}
                      <select
                        value={room.status}
                        onChange={(e) => handleStatusChange(room.id, e.target.value)}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${room.status === 'occupied'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : room.status === 'available'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}
                      >
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="maintenance">Maintenance</option>
                      </select>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleEditRoom(room)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Room"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Room"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
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
          )}
        </div>
      </div>

      {/* Add Room Modal */}
      <AddRoomModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        propertyId={selectedPropertyId}
        onRoomAdded={handleRoomAdded}
      />

      {/* Edit Room Modal */}
      {showEditModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Room {selectedRoom.roomNumber}</h2>
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
                    <option>Bed Spacer</option>
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

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
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
      )}
    </div>
  );
}