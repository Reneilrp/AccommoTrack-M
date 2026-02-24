import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getImageUrl } from '../../utils/api';
import { 
  Building2, List, ArrowLeft, ArrowRight, Edit, Users, Loader2, Wrench, Star 
} from 'lucide-react';
import RoomCard from '../../components/Rooms/RoomCard';
import RoomDetails from '../../components/Rooms/RoomDetails';
import PropertyActivityLogs from './PropertyActivityLogs';
import { useSidebar } from '../../contexts/SidebarContext';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, Keyboard, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import NotFoundPage from '../NotFoundPage';

export default function PropertySummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { uiState, updateData } = useUIState();
  
  // Use a stable cache key
  const cacheKey = `property_summary_${id}`;
  
  // Get cached data once during render to use for initial state
  // Using a memo or lazy initialization might be safer to ensure it only runs once per mount/id change
  const getCachedData = () => {
    return uiState.data?.[cacheKey] || cacheManager.get(cacheKey);
  };

  const [property, setProperty] = useState(() => getCachedData()?.property || null);
  const [rooms, setRooms] = useState(() => getCachedData()?.rooms || []);
  const [loading, setLoading] = useState(!property);
  const [roomsLoading, setRoomsLoading] = useState(rooms.length === 0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [error, setError] = useState(null);
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [showRoomDetails, setShowRoomDetails] = useState(false);

  const [images, setImages] = useState([]);
  const [idx, setIdx] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState(null);
  const [imageAspects, setImageAspects] = useState({});
  const [currentAspect, setCurrentAspect] = useState(null);
  const galleryRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(null);

  useEffect(() => {
    if (!id) return;
    
    // Check if we need to sync based on if we have data or not
    loadProperty();
    loadRooms();
  }, [id]);

  // Update local state if cache changes (e.g. from MyProperties background fetch)
  useEffect(() => {
    const cached = getCachedData();
    if (cached?.property && !property) {
      setProperty(cached.property);
      setLoading(false);
    }
    if (cached?.rooms && rooms.length === 0) {
      setRooms(cached.rooms);
      setRoomsLoading(false);
    }
  }, [uiState.data?.[cacheKey]]);

  // Update images when property data changes (from cache or API)
  useEffect(() => {
    if (property?.images) {
      const imgs = (property.images || []).map((it) => {
        if (!it) return null;
        if (typeof it === 'string') return getImageUrl(it);
        if (it.image_url) return getImageUrl(it.image_url);
        if (it.url) return getImageUrl(it.url);
        if (it.image_path) return getImageUrl(it.image_path);
        return null;
      }).filter(Boolean);
      setImages(imgs);
    }
  }, [property]);

  const loadProperty = async () => {
    try {
      if (!property) setLoading(true);
      else setIsSyncing(true);
      
      setError(null);
      const res = await api.get(`/landlord/properties/${id}?t=${Date.now()}`);
      const data = res.data;
      setProperty(data);
      
      const newState = { ...uiState.data?.[cacheKey], property: data };
      updateData(cacheKey, newState);
      cacheManager.set(cacheKey, newState);
    } catch (err) {
      console.error('Failed to fetch property', err);
      if (!property) {
        setError(err.response?.data?.message || err.message || 'Failed to load property');
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const loadRooms = async () => {
    try {
      if (rooms.length === 0) setRoomsLoading(true);
      const res = await api.get(`/rooms/property/${id}?t=${Date.now()}`);
      const data = res.data || [];
      setRooms(data);
      
      const newState = { ...uiState.data?.[cacheKey], rooms: data };
      updateData(cacheKey, newState);
      cacheManager.set(cacheKey, newState);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    } finally {
      setRoomsLoading(false);
    }
  };

  const prev = () => setIdx((s) => (s - 1 + images.length) % images.length);
  const next = () => setIdx((s) => (s + 1) % images.length);
  const goToEdit = () => navigate(`/properties/${id}/edit`);
  const { open, setIsSidebarOpen, collapse } = useSidebar();
  const [showActivityLogs, setShowActivityLogs] = useState(false);

  // Swiper's autoplay handles automatic advancement and pause-on-hover.

  const handleBackClick = async () => {
    try {
      await open();
    } catch (e) {
      // ignore
    }
    setIsSidebarOpen(true);
    navigate('/properties');
  };

  // Ensure sidebar is collapsed when landing on a property detail page (including on refresh)
  useEffect(() => {
    if (collapse) collapse().catch(() => {});
  }, [collapse]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-lg p-6 border border-red-100 dark:border-red-900">
          <p className="text-red-700 font-medium">Error</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <NotFoundPage 
        title="Property Not Found" 
        message="The property you are looking for does not exist or has been removed." 
      />
    );
  }

  const amenities = property.amenities || property.amenities_list || [];
  const rules = property.property_rules || property.rules || [];

  const renderAmenityLabel = (a) => {
    if (!a && a !== 0) return '';
    if (typeof a === 'string') return a;
    if (typeof a === 'object') return a.name || a.title || String(a.id || a.description || 'Amenity');
    return String(a);
  };

  const renderRuleLabel = (r) => {
    if (!r && r !== 0) return '';
    if (typeof r === 'string') return r;
    if (typeof r === 'object') return r.name || r.title || r.rule || String(r.id || r.description || 'Rule');
    return String(r);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center relative min-h-[40px]">
            {/* Left: Back button */}
            <div className="absolute left-0 flex items-center">
              <button
                onClick={handleBackClick}
                className="p-2 bg-white dark:bg-gray-800 text-green-600 rounded-full shadow-sm border dark:border-gray-700 hover:scale-110 transition-all flex-shrink-0"
                title="Go Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Center: Property Name */}
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-[500px]">
                {property.title || 'Untitled Property'}
              </h1>
            </div>

            {/* Right: Navigation Icons */}
            <div className="absolute right-0 flex items-center gap-2">
              <button
                onClick={() => setShowActivityLogs(true)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Activity logs"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(`/rooms?property=${id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Room management"
              >
                <Building2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(`/tenants?property=${id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Tenant management"
              >
                <Users className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(`/maintenance?property_id=${id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Maintenance Requests"
              >
                <Wrench className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(`/reviews?property_id=${id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Guest Reviews"
              >
                <Star className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      {/* Two-column layout: gallery left (50%), details right (50%) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm p-6 relative">
          <div className="mb-8 border-b-2 border-gray-200 dark:border-gray-600 pb-4 text-center shadow-[0_4px_4px_-4px_rgba(0,0,0,0.05)]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-widest">Property Details & Information</h2>
          </div>

          {/* Edit button moved here (upper-right of the details card) */}
          <button
            onClick={goToEdit}
            className="absolute top-4 right-4 w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            title="Edit property"
            aria-label="Edit property"
          >
            <Edit className="w-5 h-5 text-green-600" />
          </button>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 m-2 items-stretch">
          {/* Left: Gallery */}
          <div className="w-full flex flex-col">
            <div className="relative w-full h-full flex flex-col">
              <div ref={galleryRef} className="relative flex-1 bg-black rounded-xl overflow-hidden flex flex-col min-h-[400px]">
                <div className="w-full flex-1 relative flex flex-col">
                  {images.length > 0 ? (
                    <>
                      <Swiper
                        modules={[Navigation, Pagination, Autoplay, Keyboard, A11y]}
                        spaceBetween={0}
                        slidesPerView={1}
                        navigation={false}
                        pagination={false}
                        autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
                        loop={images.length > 1}
                        className="w-full h-full"
                        onSlideChange={(swiper) => setIdx(swiper.realIndex)}
                        onSwiper={(s) => setSwiperInstance(s)}
                      >
                        {images.map((src, i) => (
                          <SwiperSlide key={i} className="h-full bg-black">
                            <div className="w-full h-full flex items-center justify-center">
                              <img
                                src={src}
                                loading="lazy"
                                alt={`property-${i}`}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          </SwiperSlide>
                        ))}
                      </Swiper>

                      {swiperInstance && (
                        <div className="absolute inset-0 flex items-center justify-between px-3 z-20 pointer-events-none">
                          <button
                            aria-label="Previous image"
                            onClick={() => swiperInstance.slidePrev()}
                            className="pointer-events-auto w-10 h-10 bg-white/60 rounded-full shadow flex items-center justify-center hover:scale-105 transition-transform"
                          >
                            <ArrowLeft className="w-5 h-5 text-green-600" />
                          </button>

                          <button
                            aria-label="Next image"
                            onClick={() => swiperInstance.slideNext()}
                            className="pointer-events-auto w-10 h-10 bg-white/60 rounded-full shadow flex items-center justify-center hover:scale-105 transition-transform"
                          >
                            <ArrowRight className="w-5 h-5 text-green-600" />
                          </button>
                        </div>
                      )}

                      {/* Thumbnails removed per UX request; overlay arrows remain */}
                      {images.length > 1 && (
                        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center z-20">
                          <div className="flex items-center gap-2">
                            {images.map((_, i) => (
                              <button
                                key={i}
                                aria-label={`Go to image ${i + 1}`}
                                onClick={() => {
                                  if (!swiperInstance) return;
                                  swiperInstance.slideToLoop(i);
                                }}
                                className={`w-2.5 h-2.5 rounded-full ${i === idx ? 'bg-blue-600' : 'bg-gray-300'} transition-all`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <Building2 className="w-16 h-16 mx-auto mb-2" />
                      <p>No photos available</p>
                    </div>
                  )}
                </div>

                <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-gray-50 dark:from-gray-800 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-50 dark:from-gray-800 to-transparent" />
              </div>
            </div>
          </div>

          {/* Right: Details (Description, Address, Rules, Amenities) */}
          <aside className="flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{property.description || 'No description provided.'}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Full Address</h3>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <div>{property.street_address}</div>
                <div>{property.barangay ? `${property.barangay}, ` : ''}{property.city}{property.province ? `, ${property.province}` : ''}{property.postal_code ? ` ${property.postal_code}` : ''}</div>
                {property.country && <div>{property.country}</div>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Property Rules</h3>
                {rules.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No rules provided.</p>
                ) : (
                  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {rules.map((r, i) => <li key={i}>{renderRuleLabel(r)}</li>)}
                  </ul>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Amenities</h3>
                {amenities.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No amenities listed.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((a, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium border border-green-100 dark:border-green-800">
                        {renderAmenityLabel(a)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
          </div>
        </div>

        {/* Room Management section below spanning both columns */}
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm p-6 relative">
              <div className="mb-8 border-b-2 border-gray-200 dark:border-gray-600 pb-4 text-center shadow-[0_4px_4px_-4px_rgba(0,0,0,0.05)]">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-widest">Room Management</h2>
              </div>
              <button
                onClick={() => navigate(`/rooms?property=${id}`)}
                className="absolute top-4 right-4 px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                View more Rooms
              </button>

            {roomsLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading rooms...</p>
            ) : rooms.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No rooms found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    className="h-full"
                    room={room}
                    onClick={() => { setSelectedRoomDetails(room); setShowRoomDetails(true); }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Room Details Modal */}
        <RoomDetails
          room={selectedRoomDetails}
          isOpen={showRoomDetails}
          onClose={() => { setShowRoomDetails(false); setSelectedRoomDetails(null); }}
          onExtend={async ({ roomId, days, months }) => {
            if (!roomId) return;
            try {
              const payload = {};
              if (days) payload.days = days;
              if (months) payload.months = months;
              await api.post(`/rooms/${roomId}/extend`, payload);
              // refresh rooms list on this property summary
              const res = await api.get(`/rooms/property/${id}`);
              setRooms(res.data || []);
            } catch (err) {
              console.error('Failed to extend stay', err);
              setError(err.response?.data?.message || err.message || 'Failed to extend stay');
              throw err;
            }
          }}
        />
        <PropertyActivityLogs propertyId={id} propertyTitle={property?.title} isOpen={showActivityLogs} onClose={() => setShowActivityLogs(false)} />
      </div>
    </div>
  );
}