import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import PropertyCarousel from './PropertyCarousel';
import PropertyMap from '../../components/Shared/PropertyMap';
import { X, Check, MapPin, Star, Shield, Search, ArrowLeft, ArrowRight, Filter, Map } from 'lucide-react';
import api from '../../utils/api';

// --- ROOM DETAILS MODAL COMPONENT (Copied from Properties.jsx for consistency) ---
const RoomDetailsModal = ({ room, property, onClose }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  if (!room) return null;

  const images = (room.images && room.images.length > 0) 
    ? room.images 
    : ['https://via.placeholder.com/400x200?text=No+Image'];

  const currentImage = images[activeImageIndex] || images[0];

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
        <div className="w-full md:w-5/12 h-64 md:h-auto relative bg-gray-100 group flex-shrink-0 flex flex-col">
          {/* Main Image */}
          <div 
            className="w-full flex-1 relative cursor-zoom-in"
            onClick={() => setShowLightbox(true)}
          >
            <img 
              src={currentImage} 
              alt={room.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 absolute inset-0"
            />
            {/* Image Overlay Gradient */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-24 pointer-events-none">
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
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 leading-tight">
                  {room.room_number ? `Room ${room.room_number}` : room.name}
              </h2>
              {room.room_number && (
                  <p className="text-white/90 text-sm font-medium mb-1">{room.name}</p>
              )}
            </div>
          </div>
          
          {/* Photos Navigation / Thumbnails */}
          {images.length > 1 && (
            <div className="bg-white p-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-gray-100 z-10">
               {images.map((img, idx) => (
                  <button 
                     key={idx}
                     onClick={(e) => { e.stopPropagation(); setActiveImageIndex(idx); }}
                     className={`w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-green-600 opacity-100 ring-2 ring-green-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                     <img src={img} className="w-full h-full object-cover" />
                  </button>
               ))}
            </div>
          )}
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
            <div className="flex items-end justify-between mb-6 pb-6 border-b border-gray-100">
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
                 {room.floor_label ? (
                    <div className="block text-xs text-gray-500 font-medium mt-1">
                        {room.floor_label}
                    </div>
                 ) : room.floor ? (
                    <div className="block text-xs text-gray-500 font-medium mt-1">
                        Floor {room.floor}
                    </div>
                 ) : null}
                 <div className="block text-xs text-gray-400 font-medium uppercase mt-1">
                    Capacity: {room.capacity || '1-2 Pax'}
                 </div>
              </div>
            </div>

            {/* Capacity Note */}
            {room.raw_capacity > 1 && (
                <div className="mb-8 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-700 italic leading-relaxed">
                        <span className="font-bold">Note:</span> This room has a capacity of {room.raw_capacity}. The monthly rent can be divided if you find another tenant (or wait for one); otherwise you'll pay the full room rent.
                    </p>
                </div>
            )}

            {/* Description */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-3">About this space</h3>
              <p className="text-gray-600 leading-relaxed text-[15px]">
                {room.description || "A comfortable space designed for students and professionals. Enjoy a secure environment with easy access to local amenities."}
              </p>
            </div>

            {/* Amenities Grid */}
            {room.amenities && room.amenities.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">What this place offers</h3>
              <div className="grid grid-cols-2 gap-3">
                {room.amenities.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-gray-600 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            )}

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
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              className="py-3.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold text-lg rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              onClick={() => window.location.href = '/login'}
            >
              Contact Landlord
            </button>
            <button 
              className="py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              onClick={() => window.location.href = '/login'}
            >
              Login to Book
            </button>
            <p className="col-span-1 sm:col-span-2 text-center text-xs text-gray-400 mt-1 font-medium">
              You must have a verified tenant account to proceed with booking or contacting landlords.
            </p>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setShowLightbox(false)}
        >
          {/* Close Button */}
          <button 
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}
          >
            <X className="w-8 h-8" />
          </button>
          
          {/* Main Content */}
          <div className="relative w-full h-full p-4 flex flex-col items-center justify-center">
            <img 
              src={currentImage} 
              alt="Full view" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
            />
            
            {/* Navigation Arrows if multiple images */}
            {images.length > 1 && (
              <>
                 <button 
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/50 hover:bg-black/70 rounded-full text-white transition-transform active:scale-95"
                    onClick={(e) => {
                       e.stopPropagation();
                       setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                    }}
                 >
                    <ArrowLeft className="w-8 h-8" />
                 </button>
                 <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black/50 hover:bg-black/70 rounded-full text-white transition-transform active:scale-95"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                   }}
                 >
                    <ArrowRight className="w-8 h-8" />
                 </button>
              </>
            )}

            {/* Thumbnail Strip */}
            {images.length > 1 && (
               <div className="mt-6 flex gap-2 overflow-x-auto max-w-[90vw] p-2 no-scrollbar" onClick={(e) => e.stopPropagation()}>
                  {images.map((img, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-green-500 scale-110 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
                      >
                         <img src={img} className="w-full h-full object-cover" />
                      </button>
                  ))}
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const BrowsingPropertyPage = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search & Pagination
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const PROPERTY_TYPES = ['All', 'Dormitory', 'Bed Spacer', 'Boarding House', 'Apartment'];

  // Modal State
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedRoomData, setSelectedRoomData] = useState(null);
  
  // State for the slide-in card inside Map
  const [selectedMapProperty, setSelectedMapProperty] = useState(null); // Used primarily for Map Centering logic if needed
  
  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Handle Marker Click
  const onMapMarkerClick = (property) => {
      setDrawerData(property);
      setDrawerOpen(true);
      setActiveTab('Overview');
      setSelectedMapProperty(property); // Keep track for map if needed
  };

  // Fetch properties from backend
  useEffect(() => {
    setLoading(true);
    api.get('/public/properties')
      .then((res) => {
        setProperties(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.message || 'Error fetching properties');
        setLoading(false);
      });
  }, []);

  // Helpers (duplicated from Properties.jsx for consistency)
  const mapRoom = (room) => {
    // Robust amenity parsing
    let parsedAmenities = [];
    if (Array.isArray(room.amenities)) {
      parsedAmenities = room.amenities;
    } else if (typeof room.amenities === 'string') {
      try {
        const parsed = JSON.parse(room.amenities);
        if (Array.isArray(parsed)) parsedAmenities = parsed;
      } catch (e) {
        // Fallback or ignore
      }
    }

    return {
      id: room.id,
      name: room.room_type || room.type_label || 'Room',
      room_number: room.room_number,
      floor: room.floor,
      floor_label: room.floor_label,
      raw_capacity: room.capacity,
      image: room.images && room.images.length > 0 ? room.images[0] : 'https://via.placeholder.com/400x200?text=No+Image',
      images: room.images || [],
      price: room.monthly_rate || 0,
      status: room.status ? (room.status.charAt(0).toUpperCase() + room.status.slice(1)) : 'Available',
      size: room.size || '',
      capacity: room.capacity ? `${room.capacity} Person${room.capacity > 1 ? 's' : ''}` : '',
      description: room.description || '',
      amenities: parsedAmenities,
      rules: room.rules || [],
    };
  };

  const mapProperty = (property) => ({
    id: property.id,
    name: property.title || property.name,
    location: property.full_address || property.city || '',
    address: property.full_address || property.city || '', // For Map
    latitude: property.latitude,
    longitude: property.longitude,
    lowest_price: property.lowest_price || (Array.isArray(property.rooms) && property.rooms.length > 0 ? Math.min(...property.rooms.map(r => r.monthly_rate)) : null),
    type: property.property_type || 'Apartment', // Default to Apartment if missing
    description: property.description || '',
    rating: property.rating || null,
    rooms: Array.isArray(property.rooms) ? property.rooms.map(mapRoom) : [],
  });

  // Filtering
  const filteredProperties = properties.map(mapProperty).filter((p) => {
    // Type Filter (Case Insensitive)
    if (selectedType !== 'All' && p.type.toLowerCase() !== selectedType.toLowerCase()) {
        return false;
    }

    // Search Filter
    const term = search.toLowerCase();
    const inName = p.name.toLowerCase().includes(term);
    const inType = p.type.toLowerCase().includes(term);
    const inLocation = p.location.toLowerCase().includes(term);
    const inRooms = p.rooms.some(r => r.name.toLowerCase().includes(term));
    return inName || inType || inLocation || inRooms;
  });

  // PROPERTIES FOR MAP (Only filtered by TYPE, not Search - so markers persist while typing)
  const mapDisplayProperties = properties.map(mapProperty).filter((p) => {
     if (selectedType !== 'All' && p.type.toLowerCase() !== selectedType.toLowerCase()) return false;
     return true;
  });
  
  // Type-ahead Suggestions
  const searchSuggestions = search.length > 0 ? mapDisplayProperties.filter(p => {
    const term = search.toLowerCase();
    return p.name.toLowerCase().includes(term) || 
           p.type.toLowerCase().includes(term) ||
           p.address.toLowerCase().includes(term);
  }).slice(0, 5) : [];

  // Pagination
  const totalPages = Math.ceil(filteredProperties.length / pageSize);
  const paginated = filteredProperties.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Modal Handlers
  const handleOpenDetails = async (room, property) => {
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await api.get(`/public/properties/${property.id}`);
      const fullProperty = res.data;
      const fullRoom = Array.isArray(fullProperty.rooms)
        ? fullProperty.rooms.find(r => r.id === room.id)
        : null;
      
      setSelectedRoomData({
        room: fullRoom ? mapRoom(fullRoom) : room,
        property: {
            id: fullProperty.id,
            name: fullProperty.title || fullProperty.name,
            location: fullProperty.full_address || fullProperty.city || '',
            description: fullProperty.description || '',
            rating: fullProperty.rating || null,
        }
      });
    } catch (err) {
      console.error(err);
      // Fallback to basic data if fetch fails
      setSelectedRoomData({ room, property });
    } finally {
        setModalLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedRoomData(null);
  };

  const handlePropertyClick = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans overflow-x-hidden">
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 pb-4">
        {/* ROW 1: Navigation & Title */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-center">
            {/* Absolute positioned Back Button */}
            <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2">
                <button 
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            </div>
            
            {/* Centered Title */}
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Browse Properties</h1>
        </div>
        
        {/* ROW 2: Search Bar & Filters */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4">
            
            {/* Search Bar & Map Icon */}
            <div className="w-full flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search properties, locations..." 
                        className="w-full pl-11 pr-4 py-3 bg-gray-100 border-transparent focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 rounded-2xl transition-all outline-none text-sm placeholder:text-gray-500 font-medium shadow-sm"
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>

                <button 
                  onClick={() => setShowMapModal(true)}
                  className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-600 shadow-sm group"
                  aria-label="View Map"
                >
                    <Map className="w-5 h-5 group-hover:text-green-600 transition-colors" />
                </button>
            </div>

            {/* Filters */}
            <div className="w-full overflow-x-auto no-scrollbar pb-2">
                <div className="flex items-center justify-start md:justify-center gap-2 px-1">
                 {PROPERTY_TYPES.map((type) => (
                    <button
                        key={type}
                        onClick={() => { setSelectedType(type); setCurrentPage(1); }}
                        className={`
                            px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border
                            ${selectedType === type 
                                ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-600/20' 
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }
                        `}
                    >
                        {type}
                    </button>
                ))}
                </div>
            </div>
        </div>
      </header>
      
      {/* MOBILE SEARCH REMOVED (Now consolidated in header) */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Helper Text */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 font-medium">
            <Filter className="w-4 h-4" />
            <span>Showing {filteredProperties.length} properties</span>
        </div>

        {loading && (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">Finding the best places for you...</p>
            </div>
        )}

        {!loading && filteredProperties.length === 0 && (
             <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                <p className="text-gray-400 text-lg font-medium">No properties found matching your search.</p>
                <button 
                    onClick={() => setSearch('')}
                    className="mt-4 text-green-600 font-bold hover:underline"
                >
                    Clear search
                </button>
             </div>
        )}

        {/* LIST */}
        <div className="space-y-12">
            {paginated.map((property) => (
                <div key={property.id} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
                    {/* Header */}
                    <div 
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 cursor-pointer group"
                        onClick={() => handlePropertyClick(property.id)}
                    >
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors flex items-center gap-2">
                                    {property.name}
                                    <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-green-600" />
                                </h2>
                                <span className="px-2.5 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wide border border-green-100">
                                    {property.type}
                                </span>
                            </div>
                            {property.location && (
                                <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-sm font-medium">{property.location}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-shrink-0">
                           <span className="px-4 py-2 bg-green-50 text-green-700 text-sm font-bold rounded-lg group-hover:bg-green-100 transition-colors">
                                More Details
                           </span>
                        </div>
                    </div>

                    {/* Carousel */}
                    <PropertyCarousel property={property} onOpenDetails={handleOpenDetails} />
                </div>
            ))}
        </div>

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-12 mb-8">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg border ${currentPage === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                
                <span className="text-sm font-bold text-gray-700 mx-2">
                    Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg border ${currentPage === totalPages ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        )}

      </main>

      {/* MODAL */}
      {(selectedRoomData || modalLoading || showMapModal) && (
        <>
            {showMapModal && (
                <div className="fixed inset-0 z-[100] bg-white">
                    {/* FULL SCREEN MODAL */}
                    <div className="relative w-full h-full bg-white overflow-hidden animate-in fade-in zoom-in duration-200">
                        
                        {/* Floating Search Bar (Replaces Property Map Label) */}
                        <div className={`absolute top-6 left-6 z-[1000] w-[calc(100%-48px)] md:w-[calc(35%-48px)] animate-in slide-in-from-top-4 duration-500 shadow-2xl transition-all ease-in-out ${drawerOpen ? 'opacity-0 pointer-events-none -translate-y-4' : 'opacity-100 translate-y-0'}`}>
                             <div className="bg-white rounded-full flex items-center p-1.5 border border-gray-100 transition-all hover:shadow-lg focus-within:shadow-xl">
                                  {/* Maps Icon / Menu Trigger */}
                                  <div className="p-2.5 hover:bg-gray-50 rounded-full cursor-pointer transition-colors group">
                                      <Map className="w-5 h-5 text-gray-500 group-hover:text-gray-800" />
                                  </div>
                                  
                                  {/* Input Field */}
                                  <input 
                                      type="text" 
                                      placeholder="Search properties..." 
                                      className="flex-1 ml-2 bg-transparent border-none outline-none text-gray-800 text-sm font-medium h-10 placeholder:text-gray-400"
                                      value={search}
                                      onChange={handleSearchChange}
                                  />

                                  {/* Search Action / Divider */}
                                  {search && (
                                     <button 
                                        onClick={() => handleSearchChange({target: {value: ''}})}
                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 mr-1"
                                     >
                                         <X className="w-4 h-4" />
                                     </button>
                                  )}
                                  
                                  <button className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 ml-1">
                                      <Search className="w-4 h-4" />
                                  </button>
                             </div>

                             {/* SEARCH SUGGESTIONS DROPDOWN */}
                             {search && searchSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    {searchSuggestions.map((prop) => (
                                        <div 
                                            key={prop.id}
                                            onClick={() => {
                                                onMapMarkerClick(prop);
                                                setSearch(''); // Optional: Clear search after selection? Or keep it? User said "redirected". usually we clear or set to name.
                                                // If we keep it, the map might filter if using original logic. But we changed map logic.
                                                // Let's keep it clean: Clear search so the dropdown disappears and we see the "Drawer" focused context.
                                                // Actually user said "when i clicked it then that's the time to put the behaviour where the position of view will redirect".
                                            }}
                                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center gap-3 transition-colors"
                                        >
                                            <div className="bg-gray-100 p-2 rounded-full text-gray-500">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-gray-800 truncate">{prop.name}</h4>
                                                <p className="text-xs text-gray-500 truncate">{prop.address}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             )}
                        </div>

                        {/* Floating Close Button */}
                        <button 
                            onClick={() => setShowMapModal(false)}
                            className="absolute top-6 right-6 z-[1000] p-2.5 bg-white rounded-full text-gray-500 hover:bg-gray-50 hover:text-gray-900 shadow-lg border border-gray-200 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-full h-full relative flex overflow-hidden">
                            {/* SIDE DRAWER PROPERTY DETAILS */}
                            <div className={`absolute top-0 bottom-0 left-0 w-full md:w-[35%] bg-white shadow-2xl z-[500] flex flex-col border-r border-gray-100 transition-transform duration-500 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                                {drawerData && (
                                    <>
                                        {/* SINGLE SCROLLABLE CONTAINER */}
                                        <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                                        
                                            {/* Image Section */}
                                            <div className="h-[250px] w-full relative bg-gray-200 group cursor-pointer flex-shrink-0">
                                                <img 
                                                    src={drawerData.rooms?.[0]?.image || 'https://via.placeholder.com/400x200?text=No+Image'} 
                                                    alt={drawerData.name} 
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                                
                                                {/* Close Selection Button */}
                                                <button 
                                                    onClick={() => setDrawerOpen(false)}
                                                    className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full text-white transition-colors border border-white/20 z-10"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>

                                                {/* See Photos Badge (Bottom Left) */}
                                                <div className="absolute bottom-4 left-4 z-10">
                                                    <button className="bg-black/60 hover:bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all">
                                                        <div className="w-4 h-4 grid grid-cols-2 gap-px opacity-80">
                                                            <div className="bg-white rounded-[1px]"></div>
                                                            <div className="bg-white rounded-[1px]"></div>
                                                            <div className="bg-white rounded-[1px]"></div>
                                                            <div className="bg-white rounded-[1px]"></div>
                                                        </div>
                                                        See photos
                                                    </button>
                                                </div>
                                            </div>

                                            {/* HEADER INFO SECTION */}
                                            <div className="p-5 pb-0 bg-white">
                                                <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{drawerData.name}</h2>
                                                
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="flex items-center text-sm font-bold text-gray-900">
                                                        {drawerData.rating ? drawerData.rating : 'New'}
                                                        <div className="flex ml-1">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} className={`w-3 h-3 ${i < Math.floor(drawerData.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <span className="text-gray-400 text-xs">•</span>
                                                    <span className="text-sm text-gray-500">(12 reviews)</span>
                                                    <span className="text-gray-400 text-xs">•</span>
                                                    <span className="text-sm text-gray-500">{drawerData.type}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 text-sm text-green-700 font-medium mb-3">
                                                    <div className="w-4 h-4 rounded-full border border-green-600 flex items-center justify-center">
                                                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                                    </div>
                                                    Open Now 
                                                    <span className="text-gray-400 font-normal ml-1">• Closes 9PM</span>
                                                </div>
                                            </div>

                                            {/* TABS HEADER - STICKY */}
                                            <div className="flex items-center border-b border-gray-100 bg-white sticky top-0 z-30 px-5 pt-2 shadow-sm">
                                                {['Overview', 'Reviews', 'About'].map((tab) => (
                                                    <button
                                                        key={tab}
                                                        onClick={() => setActiveTab(tab)}
                                                        className={`mr-6 py-3 text-sm font-bold text-center relative transition-colors ${
                                                            activeTab === tab 
                                                                ? 'text-teal-700' 
                                                                : 'text-gray-500 hover:text-gray-900'
                                                        }`}
                                                    >
                                                        {tab}
                                                        {activeTab === tab && (
                                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-700 rounded-t-full" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Scrollable Content (Tabbed) */}
                                            <div className="p-5 bg-gray-50/50 min-h-[500px]">
                                                
                                                {activeTab === 'Overview' && (
                                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                                                        
                                                        {/* Address Section */}
                                                        <div className="flex items-start gap-4 border-b border-gray-100 pb-5">
                                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                                <MapPin className="w-5 h-5 text-blue-600" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="text-sm font-bold text-gray-900 leading-tight mb-1">{drawerData.address}</h4>
                                                                <p className="text-xs text-gray-500">Zamboanga City, Philippines</p>
                                                            </div>
                                                            <button className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                                                                <Map className="w-4 h-4 text-gray-600" />
                                                            </button>
                                                        </div>

                                                        {/* Visit Schedule */}
                                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-3">
                                                        <div className="bg-orange-50 p-2 rounded-lg">
                                                            <div className="w-5 h-5 text-orange-500 font-bold flex items-center justify-center">🕒</div>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-gray-900">Visiting Hours</h4>
                                                            <p className="text-xs text-gray-500 mt-0.5">Physical viewing schedule</p>
                                                            <span className="inline-block mt-2 text-[10px] font-bold text-white bg-orange-400 px-2 py-0.5 rounded">COMING SOON</span>
                                                        </div>
                                                    </div>

                                                    {/* Gallery Preview */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Gallery</h4>
                                                            <span className="text-xs text-teal-600 font-bold cursor-pointer hover:underline">View All</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {/* 1. Main Video/Image */}
                                                            <div className="col-span-2 h-32 bg-gray-800 rounded-xl overflow-hidden relative group">
                                                                <img src={drawerData.rooms?.[0]?.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"/>
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40">
                                                                        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                                                                    </div>
                                                                </div>
                                                                <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/50 px-1.5 rounded">VIDEO TOUR</span>
                                                            </div>
                                                            {/* 2. Room Grid */}
                                                            {(drawerData.rooms || []).slice(0, 2).map((room, idx) => (
                                                                <div key={idx} className="h-24 bg-gray-200 rounded-xl overflow-hidden relative">
                                                                    <img src={room.image} className="w-full h-full object-cover" />
                                                                </div>
                                                            ))}
                                                            {(drawerData.rooms?.length || 0) > 2 && (
                                                                 <div className="h-24 bg-gray-100 rounded-xl flex items-center justify-center text-xs font-bold text-gray-400 border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors">
                                                                    +{(drawerData.rooms.length - 2)} More
                                                                 </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'Reviews' && (
                                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    <div className="flex items-center justify-center mb-6">
                                                         <div className="flex items-center gap-1 bg-yellow-400 text-white px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                                                            <Star className="w-4 h-4 fill-white text-white" />
                                                            {drawerData.rating || 'N/A'}
                                                         </div>
                                                    </div>

                                                    {/* Review List (Mock Data) */}
                                                    <div className="space-y-4">
                                                        {[
                                                            { name: "Sarah J.", role: "Student", date: "2 days ago", rating: 5, comment: "Super convenient location! Just 5 mins walk to the university. The landlord is very kind." },
                                                            { name: "Mark D.", role: "Professional", date: "1 week ago", rating: 4, comment: "Clean rooms and fast WiFi. Highly recommended for remote workers." },
                                                            { name: "Angela P.", role: "Student", date: "3 weeks ago", rating: 5, comment: "Security is top notch. I feel very safe here." }
                                                        ].map((review, i) => (
                                                            <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-400 to-green-500 flex items-center justify-center text-white text-xs font-bold">
                                                                            {review.name.charAt(0)}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-bold text-gray-900">{review.name}</p>
                                                                            <p className="text-[10px] text-gray-400">{review.role} • {review.date}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex text-yellow-400">
                                                                        {[...Array(5)].map((_, starI) => (
                                                                            <Star key={starI} className={`w-3 h-3 ${starI < review.rating ? 'fill-current' : 'text-gray-200'}`} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs text-gray-600 leading-relaxed">"{review.comment}"</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'About' && (
                                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                                                    
                                                    {/* Description (Moved from Overview) */}
                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
                                                        <p className="text-gray-600 text-sm leading-relaxed bg-white p-4 rounded-xl border border-gray-100">
                                                            {drawerData.description || "Welcome to this property. It offers a secure and comfortable environment with various amenities tailored for your needs."}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Amenities</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {['WiFi', 'Security', 'Parking', 'Study Area', 'Kitchen', 'CCTV', 'Aircon', 'Laundry'].map((item, i) => (
                                                                <span key={i} className="px-3 py-2 bg-gray-50 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-colors border border-gray-100 text-gray-600 text-xs font-semibold rounded-xl">
                                                                    {item}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">House Rules</h4>
                                                        <ul className="space-y-2 bg-white p-4 rounded-xl border border-gray-100">
                                                            {['No pets allowed', 'Curfew at 10 PM', 'No smoking inside', 'Clean as you go', 'Visitors until 8 PM'].map((rule, idx) => (
                                                                <li key={idx} className="flex items-center gap-3 text-sm text-gray-600 py-1 border-b border-gray-50 last:border-0">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0"></div>
                                                                    {rule}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        </div>  
                                        {/* END SINGLE SCROLLABLE CONTAINER */}

                                        {/* Footer Action */}
                                        <div className="p-5 bg-white border-t border-gray-100 z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] relative">
                                            <button 
                                                onClick={() => navigate(`/property/${drawerData.id}`)}
                                                className="w-full py-3.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-lg shadow-teal-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                                            >
                                                View Full Details
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Pass only properties with coordinates */}
                            {/* Map is always full width behind the drawer on mobile, and pushed or covered on desktop? 
                                To maintain "Drawer" feel without content shift, we let the map be full width 
                                and just overlay the drawer. 
                            */}
                            <div className="w-full h-full"> 
                                <PropertyMap 
                                    properties={mapDisplayProperties.filter(p => p.latitude && p.longitude)}
                                    onMarkerClick={onMapMarkerClick} 
                                    centerOn={drawerData}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalLoading && !selectedRoomData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                   <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                </div>
            )}
            {selectedRoomData && (
                <RoomDetailsModal 
                    room={selectedRoomData.room} 
                    property={selectedRoomData.property} 
                    onClose={handleCloseDetails} 
                />
            )}
        </>
      )}

    </div>
  );
};

export default BrowsingPropertyPage;
