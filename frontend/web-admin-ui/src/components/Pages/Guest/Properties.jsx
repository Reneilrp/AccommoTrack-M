import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, MapPin, Star, Shield } from 'lucide-react'; 

// --- 1. API ENDPOINT ---
const API_URL = '/api/public/properties';

// --- 2. ROOM DETAILS MODAL COMPONENT ---
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
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] animate-in fade-in zoom-in duration-200">
        
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white transition-all md:hidden text-gray-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT SIDE: Hero Image */}
        <div className="w-full md:w-5/12 h-64 md:h-auto relative bg-gray-100 group flex-shrink-0">
          <img 
            src={room.image} 
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
        <div className="w-full md:w-7/12 flex flex-col flex-1 min-h-0 bg-white">
          
          {/* Desktop Header Actions */}
          <div className="hidden md:flex justify-end p-6 pb-0 flex-shrink-0">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-4">
            
            {/* Price & Key Specs */}
            <div className="flex items-end justify-between mb-8 pb-6 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Monthly Rent</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-green-600 tracking-tight">₱{room.price.toLocaleString()}</span>
                  <span className="text-gray-400 font-medium">/mo</span>
                </div>
              </div>
              <div className="text-right space-y-1">
                 <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-50 border border-gray-100 text-sm text-gray-600 font-medium">
                    {room.size || 'N/A'}
                 </div>
                 <div className="block text-xs text-gray-400 font-medium uppercase mt-1">
                    Capacity: {room.capacity || '1-2 Pax'}
                 </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-3">About this space</h3>
              <p className="text-gray-600 leading-relaxed text-[15px]">
                {room.description || "A comfortable space designed for students and professionals. Enjoy a secure environment with easy access to local amenities."}
              </p>
            </div>

            {/* Amenities Grid */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">What this place offers</h3>
              <div className="grid grid-cols-2 gap-3">
                {(room.amenities || ['Standard Amenities']).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-gray-600 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* House Rules */}
            {room.rules && (
              <div className="mb-6">
                <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                  <h3 className="text-base font-bold text-orange-800 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> House Rules
                  </h3>
                  <ul className="space-y-2">
                    {room.rules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-orange-700/80">
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
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
            <button 
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              onClick={() => window.location.href = '/login'}
            >
              Login to Book
            </button>
            <p className="text-center text-xs text-gray-400 mt-3 font-medium">
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
    setLoading(true);
    setError(null);
    fetch(API_URL)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch properties');
        const data = await res.json();
        setProperties(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error fetching properties');
        setLoading(false);
      });
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
      const res = await fetch(`/api/public/properties/${property.id}`);
      if (!res.ok) throw new Error('Failed to fetch property details');
      const fullProperty = await res.json();
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
    image: room.images && room.images.length > 0 ? room.images[0] : 'https://via.placeholder.com/400x200?text=No+Image',
    price: room.monthly_rate || 0,
    status: room.status ? (room.status.charAt(0).toUpperCase() + room.status.slice(1)) : 'Available',
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
      <section id="properties" className="py-24 px-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-green-600 font-bold tracking-wider text-sm uppercase mb-2 block">
              Featured Listings
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              Latest Properties
            </h2>
          </div>
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-500 text-lg">Loading properties...</div>
        )}
        {error && (
          <div className="text-center py-20 text-red-500 text-lg">{error}</div>
        )}
        {!loading && !error && properties.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-lg">No properties found.</div>
        )}

        {!loading && !error && properties.map((property) => {
          const carouselRef = useRef(null);
          const [showLeft, setShowLeft] = useState(false);
          const [showRight, setShowRight] = useState(true);

          const checkArrows = () => {
            const el = carouselRef.current;
            if (!el) return;
            setShowLeft(el.scrollLeft > 1);
            setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
          };

          useEffect(() => {
            checkArrows();
            const el = carouselRef.current;
            if (!el) return;
            el.addEventListener('scroll', checkArrows);
            window.addEventListener('resize', checkArrows);
            return () => {
              el?.removeEventListener('scroll', checkArrows);
              window.removeEventListener('resize', checkArrows);
            };
          }, []);

          const scrollToCard = (direction) => {
            const el = carouselRef.current;
            if (!el) return;
            const scrollAmount = el.clientWidth * 0.75;
            el.scrollBy({ left: direction === 'right' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
          };

          // Map property and rooms for UI
          const mappedProperty = mapProperty(property);

          return (
            <div key={mappedProperty.id} className="mb-16 last:mb-0">
              {/* PROPERTY HEADER: Clickable */}
              <div 
                className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-6 group/header cursor-pointer w-fit"
                onClick={() => handlePropertyClick(mappedProperty.id)}
              >
                <div className="hidden md:block h-8 w-1 bg-green-600 rounded-full group-hover/header:scale-y-125 transition-transform"></div>
                <h3 className="text-2xl font-bold text-gray-900 group-hover/header:text-green-600 transition-colors">
                  {mappedProperty.name}
                </h3>
                {mappedProperty.location && (
                  <span className="text-sm font-medium text-gray-500 flex items-center gap-1 md:ml-2 group-hover/header:text-green-500 transition-colors">
                    <MapPin className="w-4 h-4" />
                    {mappedProperty.location}
                  </span>
                )}
                {/* Visual cue that it's clickable */}
                <div className="hidden md:flex opacity-0 group-hover/header:opacity-100 transition-opacity ml-2 items-center text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md">
                  View Profile &rarr;
                </div>
              </div>

              <div className="relative group/section">
                {/* Left Arrow */}
                {showLeft && (
                  <button
                    onClick={() => scrollToCard('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-10 h-10 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:text-green-600 hover:border-green-600 transition-all opacity-0 group-hover/section:opacity-100 duration-200 hidden md:flex"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                )}

                {/* Carousel */}
                <div
                  ref={carouselRef}
                  className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide px-2"
                >
                  {mappedProperty.rooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex-none w-[280px] md:w-[320px] bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-green-200 transition-all duration-300 snap-start overflow-hidden group/card flex flex-col"
                    >
                      {/* Image Click -> Open Room Details */}
                      <div className="relative h-48 overflow-hidden bg-gray-200 cursor-pointer" onClick={() => handleOpenDetails(room, mappedProperty)}>
                        <img
                          src={room.image}
                          alt={room.name}
                          className="w-full h-full object-cover transform group-hover/card:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <span
                          className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide shadow-sm ${
                            room.status === 'Occupied' 
                              ? 'bg-red-50 text-red-700 border border-red-100' 
                              : 'bg-green-50 text-green-700 border border-green-100'
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <h4 
                            className="text-lg font-bold text-gray-900 line-clamp-1 cursor-pointer hover:text-green-600 transition-colors" 
                            title={room.name}
                            onClick={() => handleOpenDetails(room, mappedProperty)}
                          >
                            {room.name}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium uppercase">Price per month</span>
                            <span className="text-lg font-extrabold text-green-600">₱{room.price.toLocaleString()}</span>
                          </div>
                          <button 
                            onClick={() => handleOpenDetails(room, mappedProperty)}
                            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-green-600 transition-colors shadow-sm"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Arrow */}
                {showRight && (
                  <button
                    onClick={() => scrollToCard('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-10 h-10 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:text-green-600 hover:border-green-600 transition-all opacity-0 group-hover/section:opacity-100 duration-200 hidden md:flex"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Render Room Details Modal if a room is selected */}
      {(selectedRoomData || modalLoading || modalError) && (
        <div>
          {modalLoading && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl px-8 py-6 text-lg font-semibold text-gray-700">Loading room details...</div>
            </div>
          )}
          {modalError && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl px-8 py-6 text-lg font-semibold text-red-600">{modalError}</div>
              <button className="absolute top-8 right-8 bg-white rounded-full p-2 shadow" onClick={handleCloseDetails}><X className="w-6 h-6" /></button>
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