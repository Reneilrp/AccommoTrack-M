import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import AddRoomModal from './AddRoom';
import RoomCard from '../../components/Rooms/RoomCard';
import RoomDetails from '../../components/Rooms/RoomDetails';
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
  const [isFromProperty, setIsFromProperty] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedRoomImages, setSelectedRoomImages] = useState([]);
  const [selectedRoomNewImages, setSelectedRoomNewImages] = useState([]);
  const [selectedRoomAmenities, setSelectedRoomAmenities] = useState([]);
  const [newAmenityInput, setNewAmenityInput] = useState('');
  const [selectedRoomRules, setSelectedRoomRules] = useState([]);

  const handleBackClick = () => {
    if (isFromProperty && selectedPropertyId) {
      navigate(`/properties/${selectedPropertyId}`);
    } else {
      navigate(-1);
    }
  };

  const [error, setError] = useState(null);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, room: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      const params = new URLSearchParams(location.search || '');
      const incomingPropertyId = params.get('property') ? Number(params.get('property')) : null;

      if (incomingPropertyId) {
        setSelectedPropertyId(incomingPropertyId);
        setIsFromProperty(true);
      }

      try {
        setLoadingProperties(true);
        const res = await api.get('/properties/accessible');
        const data = res.data;
        setProperties(data);

        if (!incomingPropertyId && data.length > 0) {
          setSelectedPropertyId(data[0].id);
        }
      } catch (err) {
        setError('Failed to load properties');
      } finally {
        setLoadingProperties(false);
      }
    };
    loadInitialData();
  }, [location.search]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    fetchRooms();
  }, [selectedPropertyId]);

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      const [roomsRes, statsRes] = await Promise.all([
        api.get(`/rooms/property/${selectedPropertyId}?t=${Date.now()}`),
        api.get(`/rooms/property/${selectedPropertyId}/stats?t=${Date.now()}`)
      ]);
      setRooms(roomsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleRoomAdded = () => fetchRooms();

  const handleAmenityAdded = async () => {
    try {
      const res = await api.get('/properties/accessible');
      setProperties(res.data);
    } catch (err) {
      console.error('Failed to refresh properties:', err);
    }
  };

  const handleEditRoom = (room) => {
    if (!room) return;
    // Normalize backend snake_case fields to the camelCase properties used by the form
    const normalizedRoom = {
      ...room,
      roomNumber: room.roomNumber ?? room.room_number ?? room.roomNumber,
      dailyRate: room.daily_rate ?? room.dailyRate ?? undefined,
      // Normalize monthly/price fields - backend may use `monthly_rate` or `price`
      price: room.price ?? room.monthly_rate ?? room.monthlyRate ?? room.price,
      billingPolicy: room.billing_policy ?? room.billingPolicy ?? undefined,
      type: room.type ?? room.room_type ?? room.type,
      description: room.description ?? room.desc ?? room.description,
      status: room.status ?? room.room_status ?? room.status,
    };

    setSelectedRoom(normalizedRoom);
    const existing = (room.images || []).map((img) => {
      if (typeof img === 'string') return { url: getImageUrl(img) };
      if (img.url) return img;
      if (img.path) return { url: getImageUrl(img.path) };
      return img;
    });

    setSelectedRoomImages(existing);
    setSelectedRoomNewImages([]);
    setSelectedRoomAmenities(room.amenities || []);
    const rulesFromRoom = room.rules || room.room_rules || [];
    const rulesArray = Array.isArray(rulesFromRoom) ? rulesFromRoom : (typeof rulesFromRoom === 'string' ? rulesFromRoom.split('\n').map(s => s.trim()).filter(Boolean) : []);
    setSelectedRoomRules(rulesArray);
    setError(null);
    setShowEditModal(true);
  };

  const handleUpdateRoom = async () => {
    if (!selectedRoom) return;
    setError(null);
    try {
      if (selectedRoomNewImages && selectedRoomNewImages.length > 0) {
        const fd = new FormData();
        fd.append('_method', 'PUT');
        fd.append('room_number', selectedRoom.roomNumber ?? selectedRoom.room_number ?? '');
        fd.append('type', selectedRoom.type ?? '');
        fd.append('price', selectedRoom.price ?? '');
        fd.append('floor', selectedRoom.floor ?? '');
        fd.append('capacity', selectedRoom.capacity ?? '');
        if (selectedRoom.dailyRate !== undefined) fd.append('daily_rate', selectedRoom.dailyRate);
        fd.append('billing_policy', selectedRoom.billingPolicy ?? 'monthly');
        fd.append('status', selectedRoom.status ?? 'available');
        fd.append('description', selectedRoom.description ?? '');
        (selectedRoomRules || []).forEach(r => fd.append('rules[]', r));
        (selectedRoomAmenities || []).forEach(a => fd.append('amenities[]', a));
        selectedRoomNewImages.forEach((f) => fd.append('images[]', f, f.name || 'image.jpg'));

        await api.post(`/landlord/rooms/${selectedRoom.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const payload = {
          room_number: selectedRoom.roomNumber ?? selectedRoom.room_number ?? '',
          type: selectedRoom.type ?? '',
          price: selectedRoom.price ?? '',
          floor: selectedRoom.floor ?? '',
          capacity: selectedRoom.capacity ?? '',
          daily_rate: selectedRoom.dailyRate ?? null,
          billing_policy: selectedRoom.billingPolicy ?? 'monthly',
          status: selectedRoom.status ?? 'available',
          description: selectedRoom.description ?? '',
          rules: selectedRoomRules || [],
          amenities: selectedRoomAmenities || [],
          images: (selectedRoomImages || []).map(i => i.id || i.url || i.path || i.preview).filter(Boolean),
        };
        await api.put(`/landlord/rooms/${selectedRoom.id}`, payload);
      }
      toast.success('Room updated');
      setShowEditModal(false);
      await fetchRooms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    try {
      setDeleting(true);
      await api.delete(`/landlord/rooms/${roomId}`);
      await fetchRooms();
      setDeleteConfirmModal({ show: false, room: null });
      setShowEditModal(false);
      return true;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete room');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (roomId, newStatus) => {
    try {
      await api.patch(`/rooms/${roomId}/status`, { status: newStatus });
      fetchRooms();
    } catch (error) {
      setError('Failed to update room status.');
    }
  };

  const filteredRooms = filterStatus === 'all' ? rooms : rooms.filter(room => room.status === filterStatus);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <button onClick={handleBackClick} className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600">
              <ArrowLeft className="w-5 h-5 text-green-600" />
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Room Management</h1>
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage all rooms in your properties</h3>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4">
            {!isFromProperty && (
              <select
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                value={selectedPropertyId || ''}
                onChange={(e) => setSelectedPropertyId(Number(e.target.value))}
              >
                {loadingProperties ? <option>Loading...</option> : properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            )}
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Room</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)}><X className="w-5 h-5 text-red-600" /></button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Total Rooms</p><p className="text-2xl font-bold dark:text-white">{stats.total}</p></div>
              <Home className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Occupied</p><p className="text-2xl font-bold text-red-600">{stats.occupied}</p></div>
              <Users className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Available</p><p className="text-2xl font-bold text-green-600">{stats.available}</p></div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Maintenance</p><p className="text-2xl font-bold text-yellow-600">{stats.maintenance}</p></div>
              <Wrench className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {['all', 'occupied', 'available', 'maintenance'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium capitalize ${filterStatus === status ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                {status} ({status === 'all' ? stats.total : stats[status]})
              </button>
            ))}
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingRooms ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl" />)
          ) : filteredRooms.length > 0 ? (
            filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onEdit={handleEditRoom}
                onClick={() => { setSelectedRoomDetails(room); setShowRoomDetails(true); }}
                onStatusChange={handleStatusChange}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium dark:text-white">No rooms found</h3>
            </div>
          )}
        </div>
      </div>

      {/* Edit Room Modal */}
      {showEditModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Room {selectedRoom.roomNumber}</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Room Number</label>
                  <input
                    type="text"
                    value={selectedRoom.roomNumber || ''}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, roomNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Room Type</label>
                  <select
                    value={selectedRoom.type || ''}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price (₱/month)</label>
                  <input
                    type="number"
                    value={selectedRoom.price || ''}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Floor</label>
                  <select
                    value={selectedRoom.floor || ''}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, floor: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option>1st Floor</option>
                    <option>2nd Floor</option>
                    <option>3rd Floor</option>
                    <option>4th Floor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <textarea
                  value={selectedRoom.description || ''}
                  onChange={(e) => setSelectedRoom({ ...selectedRoom, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                  rows="3"
                  placeholder="Add room description..."
                />
              </div>

              {/* Room Amenities Section - Standardized Spacing */}
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Room Amenities</label>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {(properties.find(p => p.id === selectedPropertyId)?.amenities || []).map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => setSelectedRoomAmenities(prev => prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity])}
                      className={`px-3 py-2.5 rounded-lg border-2 text-left text-sm transition-all ${selectedRoomAmenities.includes(amenity) ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newAmenityInput}
                    onChange={(e) => setNewAmenityInput(e.target.value)}
                    placeholder="Add new amenity"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={async () => {
                      if (!newAmenityInput.trim()) return;
                      try {
                        await api.post(`/landlord/properties/${selectedPropertyId}/amenities`, { amenity: newAmenityInput.trim() });
                        handleAmenityAdded();
                        setSelectedRoomAmenities(prev => [...prev, newAmenityInput.trim()]);
                        setNewAmenityInput('');
                      } catch (err) { toast.error('Failed to add amenity'); }
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Room Rules Section - Standardized Spacing */}
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Room Rules (optional)</label>
                <textarea
                  value={(selectedRoomRules || []).join('\n')}
                  onChange={(e) => setSelectedRoomRules(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Add rules (e.g., no smoking, no pets)"
                />
              </div>

              {/* Images Section - Standardized Spacing */}
              <div className="pt-2 pb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Images</label>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  {[...selectedRoomImages, ...selectedRoomNewImages].map((img, idx) => (
                    <div key={idx} className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                      <img src={img.url || img.path || img.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          if (idx < selectedRoomImages.length) {
                            setSelectedRoomImages(prev => prev.filter((_, i) => i !== idx));
                          } else {
                            const newIdx = idx - selectedRoomImages.length;
                            setSelectedRoomNewImages(prev => prev.filter((_, i) => i !== newIdx));
                          }
                        }}
                        className="absolute top-1 right-1 p-1 bg-white/90 dark:bg-gray-800/90 rounded-full shadow hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="edit-room-images"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).map(f => Object.assign(f, { preview: URL.createObjectURL(f) }));
                      setSelectedRoomNewImages(prev => [...prev, ...files]);
                    }}
                  />
                  <label htmlFor="edit-room-images" className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600 font-medium">
                    Add Images
                  </label>
                  <span className="text-xs text-gray-500">PNG, JPG up to 10MB</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setDeleteConfirmModal({ show: true, room: selectedRoom })}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 flex items-center gap-2 transition-colors font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Delete Room
              </button>
              <div className="flex gap-3">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white hover:bg-white dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
                <button onClick={handleUpdateRoom} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                  Update Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal and Details Components */}
      <AddRoomModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        propertyId={selectedPropertyId}
        onRoomAdded={handleRoomAdded}
        onAmenityAdded={handleAmenityAdded}
        propertyAmenities={properties.find(p => p.id === selectedPropertyId)?.amenities || []}
      />

      <RoomDetails
        room={selectedRoomDetails}
        isOpen={showRoomDetails}
        onClose={() => { setShowRoomDetails(false); setSelectedRoomDetails(null); }}
      />
    </div>
  );
}