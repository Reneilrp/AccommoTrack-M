import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import PropertyCarousel from './PropertyCarousel';
import PropertyMap from '../../components/Shared/PropertyMap';
import { X, Check, MapPin, Star, Shield, Search, ArrowLeft, ArrowRight, Filter, Map, Play } from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';
import { Skeleton } from '../../components/Shared/Skeleton';
import { authService } from '../../services/authServices';
import RoomDetailsModal from '../../components/Modals/RoomDetailsModal';
import bookingService from '../../services/bookingService';
import { propertyService } from '../../services/propertyServices';
import { useUIState } from "../../contexts/UIStateContext";
import { mapRoom, mapProperty } from '../../utils/propertyHelpers';

const ExploreProperties = () => {
  const navigate = useNavigate();
  const { uiState, updateScreenState } = useUIState();
  const { search, selectedType, currentPage, showMapModal } = uiState.explore || {
    search: "",
    selectedType: "All",
    currentPage: 1,
    showMapModal: false
  };

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Pagination helpers
  const pageSize = 5;
  const PROPERTY_TYPES = ['All', 'Dormitory', 'Bed Spacer', 'Boarding House', 'Apartment'];

  // Modal State
  const [selectedRoomData, setSelectedRoomData] = useState(null);

  // State for the slide-in card inside Map
  const [selectedMapProperty, setSelectedMapProperty] = useState(null); // Used primarily for Map Centering logic if needed

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Reviews State
  const [drawerReviews, setDrawerReviews] = useState({ reviews: [], summary: null });
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Video State
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoToPlay, setVideoToPlay] = useState(null);

  // Fetch reviews when drawer opens
  const fetchPropertyReviews = async (propertyId) => {
    try {
      setReviewsLoading(true);
      const res = await api.get(`/public/properties/${propertyId}/reviews`);
      setDrawerReviews(res.data);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setDrawerReviews({ reviews: [], summary: null });
    } finally {
      setReviewsLoading(false);
    }
  };

  // Handle Marker Click
  const onMapMarkerClick = (property) => {
    setDrawerData(property);
    setDrawerOpen(true);
    setActiveTab('Overview');
    setSelectedMapProperty(property); // Keep track for map if needed
    // Fetch reviews for this property
    fetchPropertyReviews(property.id);
  };

  // Fetch properties from backend
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const data = await propertyService.getAllProperties();
        setProperties(data);
      } catch (err) {
        console.error('Error fetching properties:', err?.response?.data || err);
        setError(err.response?.data?.message || 'Error fetching properties');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const safeProperties = Array.isArray(properties) ? properties : [];

  const mapDisplayProperties = safeProperties.map(mapProperty).filter(Boolean);

  // Filtering
  const filteredProperties = mapDisplayProperties.filter((p) => {
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
    updateScreenState('explore', { search: e.target.value, currentPage: 1 });
  };

  const handlePageChange = (page) => {
    updateScreenState('explore', { currentPage: page });
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

      // include landlord/owner identifiers so contact flow can find recipient
      setSelectedRoomData({
        room: fullRoom ? mapRoom(fullRoom) : room,
        property: {
          id: fullProperty.id,
          name: fullProperty.title || fullProperty.name,
          location: fullProperty.full_address || fullProperty.city || '',
          description: fullProperty.description || '',
          rating: fullProperty.rating || null,
          // common owner fields from backend: landlord_id, user_id, owner_id or nested user/owner objects
          landlord_id: fullProperty.landlord_id || fullProperty.user_id || fullProperty.owner_id || null,
          landlord: fullProperty.landlord || fullProperty.user || fullProperty.owner || null,
        }
      });
    } catch (err) {
      console.error(err);
      // Fallback to basic data if fetch fails - ensure room is normalized via mapRoom
      setSelectedRoomData({ room: mapRoom(room), property });
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedRoomData(null);
  };

  // Update UI to mark room as pending after a successful booking (optimistic client update)
  const handleBookingSuccess = (updatedRoom) => {
    if (!updatedRoom || !updatedRoom.id) return;

    // Update properties list (raw backend objects) so mapProperty will reflect change
    setProperties((prev) => {
      if (!Array.isArray(prev)) return [];
      return prev.map((prop) => {
        if (!Array.isArray(prop.rooms)) return prop;
        const found = prop.rooms.find(r => r.id === updatedRoom.id);
        if (!found) return prop;
        return {
          ...prop,
          rooms: prop.rooms.map(r => r.id === updatedRoom.id ? { ...r, status: updatedRoom.status || 'occupied', reserved_by_me: updatedRoom.reserved_by_me || true, reservation: updatedRoom.reservation || null } : r)
        };
      });
    });

    // Update currently selected room data shown in modal if it matches
    setSelectedRoomData((prev) => {
      if (!prev) return prev;
      if (prev.room && prev.room.id === updatedRoom.id) {
        return { ...prev, room: { ...prev.room, status: updatedRoom.status || 'occupied', reserved_by_me: updatedRoom.reserved_by_me || true, reservation: updatedRoom.reservation || null } };
      }
      return prev;
    });
  };

  const handlePropertyClick = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  return (
    <div className="min-h-screen bg-transparent dark:bg-gray-900 font-sans overflow-x-hidden">

      {/* HEADER */}
      <header className="sticky top-0 z-40 pb-4">
        {/* ROW 1: Navigation & Title (Only for Guests) */}
        {!authService.isAuthenticated() && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 h-14 md:h-16 flex items-center justify-center shadow-sm">
          <div className="absolute left-4 sm:left-6 lg:left-8">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Browse Properties</h1>
        </div>
        )}

        {/* ROW 2: Search Bar & Filters Card */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col items-center gap-4 md:gap-6">
            
            {/* Search Row */}
            <div className="w-full flex items-center gap-3 md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search properties, locations..."
                  className="w-full pl-10 md:pl-12 pr-4 md:pr-6 py-2.5 md:py-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 rounded-xl transition-all outline-none text-sm md:text-base text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 font-bold shadow-sm"
                  value={search}
                  onChange={handleSearchChange}
                />
              </div>

              <button
                onClick={() => updateScreenState('explore', { showMapModal: true })}
                className="p-2.5 md:p-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 transition-all text-gray-600 dark:text-gray-300 shadow-sm group"
                aria-label="View Map"
              >
                <Map className="w-5 h-5 md:w-6 md:h-6 group-hover:text-green-600 transition-colors" />
              </button>
            </div>

            {/* Filters Row */}
            <div className="w-full overflow-x-auto no-scrollbar">
              <div className="flex items-center justify-start md:justify-center gap-2 px-1">
                {PROPERTY_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => updateScreenState('explore', { selectedType: type, currentPage: 1 })}
                    className={`
                              px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all border
                              ${selectedType === type
                        ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-600/20'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm'
                      }
                          `}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE SEARCH REMOVED (Now consolidated in header) */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Helper Text */}
        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
          <Filter className="w-4 h-4" />
          <span>Showing {filteredProperties.length} properties</span>
        </div>

        {loading && (
          <div className="space-y-6">
            {/* Skeleton Property Cards */}
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 sm:p-8 shadow-md border border-gray-300 dark:border-gray-700 animate-pulse">
                {/* Header skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Skeleton className="h-7 w-48" />
                      <Skeleton className="h-5 w-16 rounded-md" />
                    </div>
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-20 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                </div>

                {/* Carousel skeleton */}
                <div className="flex gap-4 overflow-hidden">
                  {[...Array(4)].map((_, j) => (
                    <Skeleton key={j} className="w-72 h-64 rounded-xl flex-shrink-0" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredProperties.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-600 shadow-md">
            <p className="text-gray-400 dark:text-gray-500 text-lg font-medium">No properties found matching your search.</p>
            <button
              onClick={() => updateScreenState('explore', { search: '' })}
              className="mt-4 text-green-600 dark:text-green-500 font-bold hover:underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* LIST */}
        <div className="space-y-12">
          {paginated.map((property) => (
            <div key={property.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 sm:p-8 shadow-md border border-gray-300 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
              {/* Header */}
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 cursor-pointer group"
                onClick={() => handlePropertyClick(property.id)}
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors flex items-center gap-2">
                      {property.name}
                      <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-green-600 dark:text-green-500" />
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wide border border-green-100 dark:border-green-800">
                      {property.type}
                    </span>
                  </div>
                  {property.location && (
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">{property.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className="px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-bold rounded-lg group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition-colors">
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
              className={`p-2 rounded-lg border shadow-sm ${currentPage === 1 ? 'border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 mx-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg border shadow-sm ${currentPage === totalPages ? 'border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
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
            <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900">
              {/* FULL SCREEN MODAL */}
              <div className="relative w-full h-full bg-white dark:bg-gray-900 overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Floating Search Bar (Replaces Property Map Label) */}
                <div className={`absolute top-6 left-6 z-[1000] w-[calc(100%-100px)] md:w-[calc(35%-48px)] animate-in slide-in-from-top-4 duration-500 shadow-2xl transition-all ease-in-out ${drawerOpen ? 'opacity-0 pointer-events-none -translate-y-4' : 'opacity-100 translate-y-0'}`}>
                  <div className="bg-white dark:bg-gray-800 rounded-full flex items-center p-1.5 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-lg focus-within:shadow-xl">
                    {/* Maps Icon / Menu Trigger */}
                    <div className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full cursor-pointer transition-colors group">
                      <Map className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white" />
                    </div>

                    {/* Input Field */}
                    <input
                      type="text"
                      placeholder="Search properties..."
                      className="flex-1 ml-2 bg-transparent border-none outline-none text-gray-800 dark:text-white text-sm font-medium h-10 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      value={search}
                      onChange={handleSearchChange}
                    />

                    {/* Search Action / Divider */}
                    {search && (
                      <button
                        onClick={() => handleSearchChange({ target: { value: '' } })}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 mr-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    <button className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 ml-1">
                      <Search className="w-4 h-4" />
                    </button>
                  </div>

                  {/* SEARCH SUGGESTIONS DROPDOWN */}
                  {search && Array.isArray(searchSuggestions) && searchSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      {searchSuggestions.map((prop) => (
                        <div
                          key={prop.id}
                          onClick={() => {
                            onMapMarkerClick(prop);
                            updateScreenState('explore', { search: '' }); 
                          }}
                          className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0 flex items-center gap-3 transition-colors"
                        >
                          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full text-gray-500 dark:text-gray-400">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white truncate">{prop.name}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{prop.address}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Floating Close Button */}
                <button
                  onClick={() => updateScreenState('explore', { showMapModal: false })}
                  className="absolute top-6 right-6 z-[1000] p-2.5 bg-white dark:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white shadow-lg border border-gray-200 dark:border-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-full h-full relative flex overflow-hidden">
                  {/* SIDE DRAWER PROPERTY DETAILS */}
                  <div className={`absolute top-0 bottom-0 left-0 w-full md:w-[35%] bg-white dark:bg-gray-800 shadow-2xl z-[500] flex flex-col border-r border-gray-100 dark:border-gray-700 transition-transform duration-500 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    {drawerData && (
                      <>
                        {/* SINGLE SCROLLABLE CONTAINER */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">

                          {/* Image Section */}
                          <div className="h-[250px] w-full relative bg-gray-200 group cursor-pointer flex-shrink-0">
                            <img
                              src={getImageUrl(drawerData.rooms?.[0]) || 'https://via.placeholder.com/400x200?text=No+Image'}
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
                          <div className="p-5 pb-0 bg-white dark:bg-gray-800">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-2">{drawerData.name}</h2>

                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex items-center text-sm font-bold text-gray-900 dark:text-white">
                                {drawerData.rating ? drawerData.rating : 'New'}
                                <div className="flex ml-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-3 h-3 ${i < Math.floor(drawerData.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                  ))}
                                </div>
                              </div>
                              <span className="text-gray-400 text-xs">•</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">({drawerReviews.summary?.total_reviews || 0} reviews)</span>
                              <span className="text-gray-400 text-xs">•</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">{drawerData.type}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-500 font-medium mb-3">
                              <div className="w-4 h-4 rounded-full border border-green-600 dark:border-green-500 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-500"></div>
                              </div>
                              Open Now
                              <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">• Closes 9PM</span>
                            </div>
                          </div>

                          {/* TABS HEADER - STICKY */}
                          <div className="flex items-center border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-30 px-5 pt-2 shadow-sm">
                            {['Overview', 'Reviews', 'About'].map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`mr-6 py-3 text-sm font-bold text-center relative transition-colors ${activeTab === tab
                                  ? 'text-teal-700 dark:text-teal-400'
                                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                  }`}
                              >
                                {tab}
                                {activeTab === tab && (
                                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-700 dark:bg-teal-400 rounded-t-full" />
                                )}
                              </button>
                            ))}
                          </div>

                          {/* Scrollable Content (Tabbed) */}
                          <div className="p-5 bg-gray-50/50 dark:bg-gray-900/50 min-h-[500px]">

                            {activeTab === 'Overview' && (
                              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">

                                {/* Address Section */}
                                <div className="flex items-start gap-4 border-b border-gray-100 dark:border-gray-700 pb-5">
                                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                    <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1">{drawerData.address}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Zamboanga City, Philippines</p>
                                  </div>
                                  <button className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
                                    <Map className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                  </button>
                                </div>

                                {/* Visit Schedule */}
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md flex items-start gap-3">
                                  <div className="bg-orange-50 dark:bg-orange-900/30 p-2 rounded-lg">
                                    <div className="w-5 h-5 text-orange-500 dark:text-orange-400 font-bold flex items-center justify-center">🕒</div>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Visiting Hours</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Physical viewing schedule</p>
                                    <span className="inline-block mt-2 text-[10px] font-bold text-white bg-orange-400 px-2 py-0.5 rounded">COMING SOON</span>
                                  </div>
                                </div>

                                {/* Gallery Preview */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Gallery</h4>
                                    <span className="text-xs text-teal-600 dark:text-teal-400 font-bold cursor-pointer hover:underline">View All</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {/* 1. Main Video/Image */}
                                    {drawerData.video_url ? (
                                      <div 
                                        className="col-span-2 h-32 bg-gray-800 dark:bg-gray-950 rounded-xl overflow-hidden relative group cursor-pointer"
                                        onClick={() => {
                                          setVideoToPlay(drawerData.video_url);
                                          setVideoModalOpen(true);
                                        }}
                                      >
                                        <img src={getImageUrl(drawerData.image)} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="w-12 h-12 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 dark:border-white/20 group-hover:scale-110 transition-transform">
                                            <Play className="w-6 h-6 text-white fill-white ml-1" />
                                          </div>
                                        </div>
                                        <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-green-600 px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                                          VIDEO TOUR
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="col-span-2 h-32 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden relative">
                                        <img src={getImageUrl(drawerData.image)} className="w-full h-full object-cover" />
                                        <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/50 px-1.5 rounded">MAIN VIEW</span>
                                      </div>
                                    )}
                                    {/* 2. Room Grid */}
                                    {(drawerData.rooms || []).slice(0, 2).map((room, idx) => (
                                      <div key={idx} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden relative">
                                        <img src={getImageUrl(room)} className="w-full h-full object-cover" />
                                      </div>
                                    ))}
                                    {(drawerData.rooms?.length || 0) > 2 && (
                                      <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-xs font-bold text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
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
                                    {drawerReviews.summary?.average_rating || drawerData.rating || 'N/A'}
                                  </div>
                                  {drawerReviews.summary?.total_reviews > 0 && (
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({drawerReviews.summary.total_reviews} reviews)</span>
                                  )}
                                </div>

                                {/* Review List - Real Data */}
                                <div className="space-y-4">
                                  {reviewsLoading ? (
                                    <div className="flex justify-center py-8">
                                      <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                  ) : Array.isArray(drawerReviews?.reviews) && drawerReviews.reviews.length > 0 ? (
                                    drawerReviews.reviews.map((review, i) => (
                                      <div key={review.id || i} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md transition-all hover:shadow-lg">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-400 to-green-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                                              {review.reviewer_image ? (
                                                <img src={review.reviewer_image} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                review.reviewer_name?.charAt(0) || 'U'
                                              )}
                                            </div>
                                            <div>
                                              <p className="text-xs font-bold text-gray-900 dark:text-white">{review.reviewer_name || 'Anonymous'}</p>
                                              <p className="text-[10px] text-gray-400 dark:text-gray-500">{review.time_ago}</p>
                                            </div>
                                          </div>
                                          <div className="flex text-yellow-400">
                                            {[...Array(5)].map((_, starI) => (
                                              <Star key={starI} className={`w-3 h-3 ${starI < review.rating ? 'fill-current' : 'text-gray-200 dark:text-gray-600'}`} />
                                            ))}
                                          </div>
                                        </div>
                                        {review.comment && (
                                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">"{review.comment}"</p>
                                        )}
                                        {review.landlord_response && (
                                          <div className="mt-3 pl-3 border-l-2 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/20 p-2 rounded-r-lg">
                                            <p className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold mb-1">Landlord Response:</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-300">{review.landlord_response}</p>
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-8">
                                      <p className="text-sm text-gray-500 dark:text-gray-400">No reviews yet</p>
                                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Be the first to review this property</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {activeTab === 'About' && (
                              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">

                                {/* Description (Moved from Overview) */}
                                <div>
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md">
                                    {drawerData.description || "Welcome to this property. It offers a secure and comfortable environment with various amenities tailored for your needs."}
                                  </p>
                                </div>

                                <div>
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Amenities</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {/* Use amenities from rooms or property */}
                                    {(() => {
                                      // Collect unique amenities from all rooms
                                      const allAmenities = new Set();
                                      (drawerData.rooms || []).forEach(room => {
                                        (room.amenities || []).forEach(a => allAmenities.add(a));
                                      });
                                      const amenitiesList = Array.from(allAmenities);

                                      if (amenitiesList.length > 0) {
                                        return amenitiesList.map((item, i) => (
                                          <span key={i} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 hover:border-green-200 dark:hover:border-green-800 transition-colors border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-xl shadow-sm">
                                            {item}
                                          </span>
                                        ));
                                      }
                                      return <p className="text-xs text-gray-400 dark:text-gray-500">No amenities listed</p>;
                                    })()}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">House Rules</h4>
                                  <ul className="space-y-2 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md">
                                    {/* Use property_rules from backend */}
                                    {(() => {
                                      const rules = drawerData.property_rules || drawerData.rules || [];
                                      if (rules.length > 0) {
                                        return rules.map((rule, idx) => (
                                          <li key={idx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 py-1 border-b border-gray-50 dark:border-gray-700 last:border-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0"></div>
                                            {rule}
                                          </li>
                                        ));
                                      }
                                      return <li className="text-xs text-gray-400 dark:text-gray-500">No house rules specified</li>;
                                    })()}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                        {/* END SINGLE SCROLLABLE CONTAINER */}

                        {/* Footer Action */}
                        <div className="p-5 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] relative">
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
              isAuthenticated={authService.isAuthenticated()}
              onLoginRequired={() => navigate('/login')}
              onBookingSuccess={handleBookingSuccess}
              bookingService={bookingService}
            />
          )}
        </>
      )}

      {/* VIDEO PLAYER MODAL */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <button 
            onClick={() => setVideoModalOpen(false)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:rotate-90 z-[5001]"
          >
            <X className="w-8 h-8" />
          </button>
          
          <div className="w-full max-w-5xl aspect-video relative mx-4 shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-black">
            <video 
              src={videoToPlay} 
              className="w-full h-full object-contain"
              controls 
              autoPlay
              playsInline
            />
          </div>
          
          {/* Legend/Info Overlay */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
            Property Video Tour • 45s Max Duration
          </div>
        </div>
      )}

    </div>
  );
};

export default ExploreProperties;
