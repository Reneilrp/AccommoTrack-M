import React, { useState } from 'react';

export default function RoomManagement() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [rooms, setRooms] = useState([
    {
      id: 1,
      roomNumber: '101',
      type: 'Single Room',
      price: 5000,
      status: 'occupied',
      floor: '1st Floor',
      capacity: 1,
      occupied: 1,
      tenant: 'John Doe',
      images: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400'],
      amenities: ['WiFi', 'AC', 'Study Desk']
    },
    {
      id: 2,
      roomNumber: '102',
      type: 'Double Room',
      price: 4500,
      status: 'occupied',
      floor: '1st Floor',
      capacity: 2,
      occupied: 2,
      tenant: 'Jane Smith, Mike Johnson',
      images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400'],
      amenities: ['WiFi', 'AC', 'Study Desk', 'Cabinet']
    },
    {
      id: 3,
      roomNumber: '103',
      type: 'Single Room',
      price: 5500,
      status: 'available',
      floor: '1st Floor',
      capacity: 1,
      occupied: 0,
      tenant: null,
      images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400'],
      amenities: ['WiFi', 'AC', 'Study Desk', 'Private Bathroom']
    },
    {
      id: 4,
      roomNumber: '201',
      type: 'Quad Room',
      price: 3500,
      status: 'occupied',
      floor: '2nd Floor',
      capacity: 4,
      occupied: 3,
      tenant: 'Sarah Williams, Tom Brown, Lisa Garcia',
      images: ['https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400'],
      amenities: ['WiFi', 'Fan', 'Study Desk']
    },
    {
      id: 5,
      roomNumber: '202',
      type: 'Double Room',
      price: 4500,
      status: 'available',
      floor: '2nd Floor',
      capacity: 2,
      occupied: 0,
      tenant: null,
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400'],
      amenities: ['WiFi', 'AC', 'Study Desk']
    },
    {
      id: 6,
      roomNumber: '203',
      type: 'Single Room',
      price: 5000,
      status: 'maintenance',
      floor: '2nd Floor',
      capacity: 1,
      occupied: 0,
      tenant: null,
      images: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400'],
      amenities: ['WiFi', 'AC', 'Study Desk']
    }
  ]);

  const [newRoom, setNewRoom] = useState({
    roomNumber: '',
    type: 'Single Room',
    price: '',
    floor: '1st Floor',
    capacity: 1,
    status: 'available',
    amenities: [],
    images: []
  });

  const filteredRooms = filterStatus === 'all' 
    ? rooms 
    : rooms.filter(room => room.status === filterStatus);

  const stats = {
    total: rooms.length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    available: rooms.filter(r => r.status === 'available').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length
  };

  const handleAddRoom = () => {
    const room = {
      id: rooms.length + 1,
      ...newRoom,
      occupied: 0,
      tenant: null
    };
    setRooms([...rooms, room]);
    setShowAddModal(false);
    setNewRoom({
      roomNumber: '',
      type: 'Single Room',
      price: '',
      floor: '1st Floor',
      capacity: 1,
      status: 'available',
      amenities: [],
      images: []
    });
  };

  const handleEditRoom = (room) => {
    setSelectedRoom(room);
    setShowEditModal(true);
  };

  const handleUpdateRoom = () => {
    setRooms(rooms.map(room => 
      room.id === selectedRoom.id ? selectedRoom : room
    ));
    setShowEditModal(false);
    setSelectedRoom(null);
  };

  const handleDeleteRoom = (roomId) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      setRooms(rooms.filter(room => room.id !== roomId));
    }
  };

  const handleStatusChange = (roomId, newStatus) => {
    setRooms(rooms.map(room => 
      room.id === roomId ? { ...room, status: newStatus } : room
    ));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'occupied': return 'bg-red-100 text-red-800';
      case 'available': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage all rooms in your dormitory</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Room
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Rooms</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
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
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
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
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'all' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Rooms ({stats.total})
            </button>
            <button
              onClick={() => setFilterStatus('occupied')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'occupied' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Occupied ({stats.occupied})
            </button>
            <button
              onClick={() => setFilterStatus('available')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'available' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Available ({stats.available})
            </button>
            <button
              onClick={() => setFilterStatus('maintenance')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'maintenance' 
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
          {filteredRooms.map((room) => (
            <div key={room.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              {/* Room Image */}
              <div className="relative h-48">
                <img 
                  src={room.images[0]} 
                  alt={`Room ${room.roomNumber}`}
                  className="w-full h-full object-cover"
                />
                <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(room.status)}`}>
                  {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                </span>
              </div>

              {/* Room Details */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Room {room.roomNumber}</h3>
                    <p className="text-sm text-gray-500">{room.type} • {room.floor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">₱{room.price.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">per month</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {room.occupied}/{room.capacity}
                  </span>
                </div>

                {room.tenant && (
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Current Tenant(s):</p>
                    <p className="text-sm font-medium text-gray-900">{room.tenant}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 mb-3">
                  {room.amenities.slice(0, 3).map((amenity, index) => (
                    <span key={index} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                      {amenity}
                    </span>
                  ))}
                  {room.amenities.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{room.amenities.length - 3} more
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <select
                    value={room.status}
                    onChange={(e) => handleStatusChange(room.id, e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  <button
                    onClick={() => handleEditRoom(room)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(room.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add New Room</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
                  <input
                    type="text"
                    value={newRoom.roomNumber}
                    onChange={(e) => setNewRoom({...newRoom, roomNumber: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., 301"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
                  <select
                    value={newRoom.type}
                    onChange={(e) => setNewRoom({...newRoom, type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option>Single Room</option>
                    <option>Double Room</option>
                    <option>Quad Room</option>
                    <option>Bed Space</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (₱/month)</label>
                  <input
                    type="number"
                    value={newRoom.price}
                    onChange={(e) => setNewRoom({...newRoom, price: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
                  <select
                    value={newRoom.floor}
                    onChange={(e) => setNewRoom({...newRoom, floor: e.target.value})}
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
                  value={newRoom.capacity}
                  onChange={(e) => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="1"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRoom}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room Modal (Similar to Add but with selectedRoom data) */}
      {showEditModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Room {selectedRoom.roomNumber}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
                  <input
                    type="text"
                    value={selectedRoom.roomNumber}
                    onChange={(e) => setSelectedRoom({...selectedRoom, roomNumber: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (₱/month)</label>
                  <input
                    type="number"
                    value={selectedRoom.price}
                    onChange={(e) => setSelectedRoom({...selectedRoom, price: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
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