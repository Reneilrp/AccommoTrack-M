import React, { useEffect, useState } from 'react';
import PropertyCarousel from '../Tenant/PropertyCarousel';
import { useNavigate } from 'react-router-dom';
import { X, Check, MapPin, Star, Shield, ArrowRight } from 'lucide-react';
import api from '../../utils/api';
import { propertyService } from '../../services/propertyServices';

// --- ROO DETAILS MODAL COMPONENT ---
const RoomDetailsModal = ({ room, property, onClose }) => {
  if (!room) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Dark Overlay with Blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] animate-in fade-in zoom-in duration-200">
        
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-white/90 dark:bg-gray-700/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-600 transition-all md:hidden text-gray-800 dark:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT SIDE: Hero Image */}
        <div className="w-full md:w-5/12 h-64 md:h-auto relative bg-gray-100 dark:bg-gray-700 group flex-shrink-0">
          <img 
            src={getImageUrl(room.image)} 
            alt={room.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Image Overlay Gradient */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-24">
             <div className="flex items-center justify-between mb-2">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm ${
                    room.status === 'Available' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                    {room.status}
                </span>
                {property.rating && (
                  <span className="flex items-center gap-1 text-white text-sm font-bold bg-black/30 px-2 py-1 rounded-lg backdrop-blur-md">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {property.rating}
                  </span>
                )}
             </div>
             <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 leading-tight">{room.name}</h2>
             <div className="flex items-center text-white/90 text-sm font-medium">
                <MapPin className="w-4 h-4 mr-1.5" /> {property.location || 'Zamboanga City'}
             </div>
          </div>
        </div>

        {/* RIGHT SIDE: Details & Content */}
        <div className="w-full md:w-7/12 flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-800">
          
          {/* Desktop Header Actions */}
          <div className="hidden md:flex justify-end p-6 pb-0 flex-shrink-0">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 md:p-8 pt-2 md:pt-4">
            
            {/* Price & Key Specs */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 md:mb-8 pb-6 border-b border-gray-100 dark:border-gray-700 gap-4">
              <div>
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Monthly Rent</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl font-black text-green-600 tracking-tight">₱{room.price.toLocaleString()}</span>
                  <span className="text-gray-400 dark:text-gray-500 font-medium">/mo</span>
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
                 <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 text-xs md:text-sm text-gray-600 dark:text-gray-300 font-medium">
                    {room.size || 'N/A'}
                 </div>
                 <div className="block text-[10px] md:text-xs text-gray-400 dark:text-gray-500 font-medium uppercase mt-1">
                    Capacity: {room.capacity || '1-2 Pax'}
                 </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6 md:mb-8">
              <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-3">About this space</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm md:text-[15px]">
                {room.description || "A comfortable space designed for students and professionals. Enjoy a secure environment with easy access to local amenities."}
              </p>
            </div>

            {/* Amenities Grid */}
            <div className="mb-6 md:mb-8">
              <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4">What this place offers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                {(Array.isArray(room.amenities) ? room.amenities : ['Standard Amenities']).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-gray-600 dark:text-gray-300 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" />
                    </div>
                    <span className="text-xs md:text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* House Rules */}
            {room.rules && Array.isArray(room.rules) && (
              <div className="mb-6">
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-5 border border-orange-100 dark:border-orange-800/30">
                  <h3 className="text-base font-bold text-orange-800 dark:text-orange-300 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> House Rules
                  </h3>
                  <ul className="space-y-2">
                    {room.rules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-orange-700/80 dark:text-orange-300/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer with CTA */}
          <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
            <button 
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              onClick={() => window.location.href = '/login'}
            >
              Login to Book
            </button>
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3 font-medium">
              You must have a verified tenant account to proceed with booking.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};


// --- 3. MAIN COMPONENT ---

const Properties = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoomData, setSelectedRoomData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Fetch properties from backend
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await propertyService.getAllProperties();
        setProperties(data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Error fetching properties');
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (selectedRoomData) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedRoomData]);


  // Fetch full property details and set selected room for modal
  const handleOpenDetails = async (room, property) => {
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await api.get(`/public/properties/${property.id}`);
      const fullProperty = res.data;
      // Find the room by id in the full property details
      const fullRoom = Array.isArray(fullProperty.rooms)
        ? fullProperty.rooms.find(r => r.id === room.id)
        : null;
      setSelectedRoomData({
        room: fullRoom ? {
          id: fullRoom.id,
          name: fullRoom.room_type || fullRoom.type_label || 'Room',
          image: fullRoom.images && fullRoom.images.length > 0 ? fullRoom.images[0] : 'https://via.placeholder.com/400x200?text=No+Image',
          price: fullRoom.monthly_rate || 0,
          status: fullRoom.status ? (fullRoom.status.charAt(0).toUpperCase() + fullRoom.status.slice(1)) : 'Available',
          size: fullRoom.size || '',
          capacity: fullRoom.capacity ? `${fullRoom.capacity} Person${fullRoom.capacity > 1 ? 's' : ''}` : '',
          description: fullRoom.description || '',
          amenities: fullRoom.amenities || [],
          rules: fullRoom.rules || [],
        } : room,
        property: {
          id: fullProperty.id,
          name: fullProperty.title || fullProperty.name,
          location: fullProperty.full_address || fullProperty.city || '',
          description: fullProperty.description || '',
          rating: fullProperty.rating || null,
        }
      });
      setModalLoading(false);
    } catch (err) {
      setModalError(err.message || 'Error fetching property details');
      setModalLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedRoomData(null);
    setModalLoading(false);
    setModalError(null);
  };

  const handlePropertyClick = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  // Helper: Map backend room to UI room
  const mapRoom = (room) => ({
    id: room.id,
    name: room.room_type || room.type_label || 'Room',
    image: getImageUrl(room.images && room.images.length > 0 ? room.images[0] : null) || 'https://via.placeholder.com/400x200?text=No+Image',
    price: room.monthly_rate || 0,
    status: room.status ? (room.status.charAt(0).toUpperCase() + room.status.slice(1)) : 'Available',
    reserved_by_me: room.reserved_by_me || false,
    reservation: room.reservation || null,
    size: room.size || '',
    capacity: room.capacity ? `${room.capacity} Person${room.capacity > 1 ? 's' : ''}` : '',
    description: room.description || '',
    amenities: room.amenities || [],
    rules: room.rules || [],
  });

  // Helper: Map backend property to UI property
  const mapProperty = (property) => ({
    id: property.id,
    name: property.title || property.name,
    location: property.full_address || property.city || '',
    description: property.description || '',
    rating: property.rating || null, // If available
    rooms: Array.isArray(property.rooms) ? property.rooms.map(mapRoom) : [],
  });

  return (
    <>
      <section id="properties" className="py-24 px-6 max-w-7xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-green-600 font-bold tracking-wider text-sm uppercase mb-2 block">
              Featured Listings
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">
              Latest Properties
            </h2>
          </div>
          
          <button 
             onClick={() => navigate('/browse-properties')}
             className="flex items-center gap-2 text-green-600 font-bold hover:text-green-700 transition-colors group"
          >
             View all properties 
             <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400 text-lg">Loading properties...</div>
        )}
        {error && (
          <div className="text-center py-20 text-red-500 dark:text-red-400 text-lg">{error}</div>
        )}
        {!loading && !error && properties.length === 0 && (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500 text-lg">No properties found.</div>
        )}

        {!loading && !error && (Array.isArray(properties) ? properties : []).map((property) => {
          const mappedProperty = mapProperty(property);
          return (
            <div key={mappedProperty.id} className="mb-16 last:mb-0">
              {/* PROPERTY HEADER: Clickable */}
              <div 
                className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-6 group/header cursor-pointer w-fit"
                onClick={() => handlePropertyClick(mappedProperty.id)}
              >
                <div className="hidden md:block h-8 w-1 bg-green-600 rounded-full group-hover/header:scale-y-125 transition-transform"></div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white group-hover/header:text-green-600 transition-colors">
                  {mappedProperty.name}
                </h3>
                {mappedProperty.location && (
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 md:ml-2 group-hover/header:text-green-500 transition-colors">
                    <MapPin className="w-4 h-4" />
                    {mappedProperty.location}
                  </span>
                )}
                {/* Visual cue that it's clickable */}
                <div className="hidden md:flex opacity-0 group-hover/header:opacity-100 transition-opacity ml-2 items-center text-xs font-bold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-md">
                  View Profile &rarr;
                </div>
              </div>
              <PropertyCarousel property={mappedProperty} onOpenDetails={handleOpenDetails} />
            </div>
          );
        })}
      </section>

      {/* Render Room Details Modal if a room is selected */}
      {(selectedRoomData || modalLoading || modalError) && (
        <div>
          {modalLoading && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl px-8 py-6 text-lg font-semibold text-gray-700 dark:text-gray-200">Loading room details...</div>
            </div>
          )}
          {modalError && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl px-8 py-6 text-lg font-semibold text-red-600 dark:text-red-400">{modalError}</div>
              <button className="absolute top-8 right-8 bg-white dark:bg-gray-700 rounded-full p-2 shadow" onClick={handleCloseDetails}><X className="w-6 h-6" /></button>
            </div>
          )}
          {selectedRoomData && !modalLoading && !modalError && (
            <RoomDetailsModal 
              room={selectedRoomData.room} 
              property={selectedRoomData.property} 
              onClose={handleCloseDetails} 
            />
          )}
        </div>
      )}
    </>
  );
};

export default Properties;