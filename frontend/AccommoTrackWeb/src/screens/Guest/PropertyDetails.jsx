import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Star,
  Check,
  Shield,
  Users,
  BedDouble,
  Bath,
  Maximize,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react';
import api from '../../utils/api'; 
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import RoomDetailsModal from '../../components/Modals/RoomDetailsModal';

// --- MAP ICON CONFIGURATION ---
// Note: We use a simpler icon setup to avoid import issues
const greenMarkerSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path fill="#10B981" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="3" fill="#ffffff" />
  </svg>
`);
const greenMarkerUrl = `data:image/svg+xml;utf8,${greenMarkerSvg}`;
const greenMarkerIcon = new L.Icon({
  iconUrl: greenMarkerUrl,
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  popupAnchor: [0, -36]
});

export default function PropertyDetails({ propertyId, onBack }) {
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const isAuthenticated = !!localStorage.getItem('auth_token');

  const [roomFilter, setRoomFilter] = useState('available');

  // Contact Landlord handler
  const handleContactLandlord = () => {
    if (!isAuthenticated) {
      alert("Please login to contact the landlord.");
      return;
    }
    
    const landlordId = property?.landlord_id || property?.user_id || property?.user?.id;
    
    if (!landlordId) {
      console.error("Landlord ID missing", property);
      alert("Cannot contact landlord: Owner information is missing.");
      return;
    }

    navigate('/messages', { 
      state: { 
        startConversation: {
          recipient_id: landlordId,
          property_id: property.id
        }
      } 
    });
  };

  useEffect(() => {
    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      
      // --- FIX: USE PUBLIC ROUTE ---
      // Changed from '/landlord/properties/...' to '/public/properties/...'
      // This allows guests to view data without being redirected to login.
      const res = await api.get(`/public/properties/${propertyId}`);
      
      const data = res.data;

      const images = (data.images || []).map(img => {
        if (typeof img === 'string') return img;
        if (img && typeof img === 'object' && img.image_url) return img.image_url;
        return img;
      }).filter(Boolean);

      setProperty({
        ...data,
        images: images,
        amenities_list: parseAmenities(data.amenities_list || data.amenities),
        rules: data.property_rules ? (typeof data.property_rules === 'string' ? JSON.parse(data.property_rules) : data.property_rules) : [],
      });
    } catch (error) {
      console.error("Failed to load property", error);
    } finally {
      setLoading(false);
    }
  };

  const parseAmenities = (amenitiesData) => {
    if (!amenitiesData) return [];
    if (Array.isArray(amenitiesData)) {
      return amenitiesData.map(a => (typeof a === 'string' ? a : String(a)).trim()).filter(Boolean);
    }
    if (typeof amenitiesData === 'string') {
      try {
        const parsed = JSON.parse(amenitiesData);
        if (Array.isArray(parsed)) return parsed;
      } catch { return []; }
    }
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!property) return <div>Property not found.</div>;

  // --- RENDERERS ---

  const renderRooms = () => {
    const rooms = property.rooms || [];
    const filteredRooms = rooms.filter(room => {
      if (roomFilter === 'all') return true;
      return (room.status || '').toLowerCase() === roomFilter.toLowerCase();
    });

    return (
      <div className="animate-in fade-in duration-300 space-y-6">
        <div className="flex flex-wrap gap-3 pb-4 border-b border-gray-100">
          {['available', 'occupied', 'maintenance'].map((filter) => (
            <button
              key={filter}
              onClick={() => setRoomFilter(filter)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium capitalize transition-all
                ${roomFilter === filter 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {filter}
            </button>
          ))}
        </div>

        {filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredRooms.map((room) => (
              <div key={room.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                <div className="h-48 bg-gray-200 relative">
                   {/* Placeholder for room image if available, or generic */}
                   {room.images && room.images.length > 0 ? (
                      <img 
                        src={typeof room.images[0] === 'string' ? room.images[0] : (room.images[0].image_url || 'https://via.placeholder.com/400x300?text=Room')} 
                        alt={`Room ${room.room_number}`} 
                        className="w-full h-full object-cover" 
                      />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                        <BedDouble className="w-12 h-12 opacity-20" />
                      </div>
                   )}
                   <div className="absolute top-3 right-3">
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm
                        ${room.status === 'available' ? 'bg-green-100 text-green-700' : 
                          room.status === 'occupied' ? 'bg-red-100 text-red-700' : 
                          'bg-yellow-100 text-yellow-700'}
                      `}>
                        {room.status}
                      </span>
                   </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">Room {room.room_number}</h4>
                      <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 mt-1 border border-blue-100 capitalize">
                        {(room.type_label || room.room_type || 'Standard Room').replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xl font-bold text-green-600">₱{Number(room.monthly_rate || room.price).toLocaleString()}</span>
                      <span className="text-xs text-gray-500">/month</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{room.description || 'No description available.'}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{room.capacity} Pax</span>
                    </div>
                    {/* Add more details if available */}
                  </div>

                  <div className="mt-auto">
                    {isAuthenticated && room.status === 'available' ? (
                      <button 
                        onClick={() => setSelectedRoom(room)}
                        className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        Book This Room
                      </button>
                    ) : (
                      <button 
                        disabled={!isAuthenticated && room.status === 'available' ? false : true}
                        onClick={() => !isAuthenticated && setSelectedRoom(room)}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2
                          ${!isAuthenticated && room.status === 'available' 
                            ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }
                        `}
                      >
                        {!isAuthenticated && room.status === 'available' ? 'Login to Book' : (room.status === 'available' ? 'Book This Room' : 'Not Available')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
            <p className="text-gray-500">No rooms found with status "{roomFilter}".</p>
          </div>
        )}
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">About this property</h3>
        <p className="text-gray-600 leading-relaxed whitespace-pre-line">
          {property.description || "No description provided."}
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Property Highlights</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex flex-col items-center text-center">
            <BedDouble className="w-6 h-6 text-green-600 mb-2" />
            <span className="font-bold text-gray-900">{property.number_of_bedrooms || 0}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Bedrooms</span>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col items-center text-center">
            <Bath className="w-6 h-6 text-blue-600 mb-2" />
            <span className="font-bold text-gray-900">{property.number_of_bathrooms || 0}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Bathrooms</span>
          </div>
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex flex-col items-center text-center">
            <Users className="w-6 h-6 text-orange-600 mb-2" />
            <span className="font-bold text-gray-900">{property.max_occupants || 0}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Max Capacity</span>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex flex-col items-center text-center">
            <Maximize className="w-6 h-6 text-purple-600 mb-2" />
            <span className="font-bold text-gray-900">{property.total_rooms || 0}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Total Rooms</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAmenities = () => (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-bold text-gray-900 mb-6">What this place offers</h3>
      {property.amenities_list && property.amenities_list.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {property.amenities_list.map((amenity, index) => (
            <div key={index} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0">
              <div className="p-2 bg-green-100 rounded-full text-green-600">
                <Check className="w-4 h-4" />
              </div>
              <span className="text-gray-700 font-medium">{amenity}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic">No specific amenities listed.</p>
      )}
    </div>
  );

  const renderPolicies = () => (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-bold text-gray-900 mb-6">House Rules & Policies</h3>
      {property.rules && property.rules.length > 0 ? (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
          <ul className="space-y-4">
            {property.rules.map((rule, index) => (
              <li key={index} className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-800 font-medium">{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-gray-500 italic">No specific rules listed by the landlord.</p>
      )}
    </div>
  );

  const renderMap = () => (
    <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm animate-in fade-in duration-300 relative z-0">
      {property.latitude && property.longitude ? (
        <MapContainer
          center={[property.latitude, property.longitude]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Marker 
            position={[property.latitude, property.longitude]}
            icon={greenMarkerIcon}
          >
            <Popup className="font-sans">
              <div className="text-center">
                <strong className="block text-green-700 text-sm">{property.title}</strong>
                <span className="text-xs text-gray-500">{property.city}</span>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
          No location data available
        </div>
      )}
    </div>
  );

  const renderReviews = () => (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-xl font-bold text-gray-900">Guest Reviews</h3>
        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full flex items-center gap-1">
          <Star className="w-3 h-3 fill-current" /> 4.8 (Example)
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                U{i}
              </div>
              <div>
                <div className="font-bold text-gray-900">Student User</div>
                <div className="text-xs text-gray-500">October 2025</div>
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              "Great location and very secure. The amenities are exactly as described."
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  // Note: renderAvailability removed as it relies on room data which might require complex logic
  // You can re-add it if your public API returns full room data.

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <div className="relative w-full h-[350px] md:h-[450px]">
        <img
          src={property.images?.[0] || 'https://via.placeholder.com/1200x600?text=Property+Image'}
          alt={property.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-between p-6 max-w-7xl mx-auto w-full">
          <div className="mt-4 flex justify-between items-start">
            <button 
              onClick={onBack} 
              className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white p-2 rounded-full transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            {/* Contact Landlord Button */}
            <button
              onClick={handleContactLandlord}
              className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 hover:bg-gray-100 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span className="hidden sm:inline">Contact Landlord</span>
            </button>
          </div>

          <div className="text-white pb-6">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {property.property_type || 'Property'}
              </span>
              <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg text-sm font-medium">
                <Star className="w-4 h-4 text-yellow-400 fill-current" /> 4.8
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-2 tracking-tight">{property.title}</h1>
            <div className="flex items-center gap-2 text-white/90 text-sm md:text-base">
              <MapPin className="w-5 h-5 text-green-400" />
              <span>{property.street_address}, {property.barangay}, {property.city}</span>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto no-scrollbar gap-6 sm:gap-8">
            {['Overview', 'Rooms', 'Amenities', 'Policies', 'Map', 'Reviews'].map((tab) => {
              const tabKey = tab.toLowerCase();
              const isActive = activeTab === tabKey;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tabKey)}
                  className={`
                    py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors
                    ${isActive 
                      ? 'border-green-600 text-green-700' 
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                    }
                  `}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[500px] ${isAuthenticated ? 'pb-24' : ''}`}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'rooms' && renderRooms()}
        {activeTab === 'amenities' && renderAmenities()}
        {activeTab === 'policies' && renderPolicies()}
        {activeTab === 'map' && renderMap()}
        {activeTab === 'reviews' && renderReviews()}
      </div>

      {/* BOOKING MODAL */}
      {selectedRoom && (
        <RoomDetailsModal
          room={selectedRoom}
          property={property}
          onClose={() => setSelectedRoom(null)}
          isAuthenticated={isAuthenticated}
          onLoginRequired={() => window.location.href = '/login'}
        />
      )}
    </div>
  );
}