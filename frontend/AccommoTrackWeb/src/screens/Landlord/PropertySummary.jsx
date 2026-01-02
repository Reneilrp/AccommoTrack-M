import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getImageUrl } from '../../../utils/api';
import { Building2, List, ArrowLeft, ArrowRight, Edit, Users, MapPin, Loader2 } from 'lucide-react';
import RoomCard from '../../components/Rooms/RoomCard';
import RoomDetails from '../../components/Rooms/RoomDetails';
import PropertyActivityLogs from './PropertyActivityLogs';
import { useSidebar } from '../../../contexts/SidebarContext';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, Keyboard, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function PropertySummary() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [showRoomDetails, setShowRoomDetails] = useState(false);

  const [images, setImages] = useState([]);
  const [idx, setIdx] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState(null);
  const [imageAspects, setImageAspects] = useState({}); // map index -> aspect (h / w)
  const [currentAspect, setCurrentAspect] = useState(null);
  const galleryRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/landlord/properties/${id}`);
        const data = res.data;
        setProperty(data);

        const imgs = (data.images || []).map((it) => {
          if (!it) return null;
          if (typeof it === 'string') return getImageUrl(it);
          if (it.image_url) return getImageUrl(it.image_url);
          if (it.url) return getImageUrl(it.url);
          return null;
        }).filter(Boolean);

        setImages(imgs);
        setIdx(0);
      } catch (err) {
        console.error('Failed to fetch property', err);
        setError(err.response?.data?.message || err.message || 'Failed to load property');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // measure gallery container width for responsive height calculation
  useEffect(() => {
    const measure = () => {
      if (galleryRef.current) setContainerWidth(galleryRef.current.clientWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (!id) return;
    const loadRooms = async () => {
      try {
        setRoomsLoading(true);
        const res = await api.get(`/rooms/property/${id}`);
        setRooms(res.data || []);
      } catch (err) {
        console.error('Failed to fetch rooms', err);
      } finally {
        setRoomsLoading(false);
      }
    };

    loadRooms();
  }, [id]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-lg p-6 border border-red-100">
          <p className="text-red-700 font-medium">Error</p>
          <p className="text-sm text-gray-700 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Property not found</p>
        </div>
      </div>
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
          {/* left: back arrow */}
          <button
            onClick={handleBackClick}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow flex items-center justify-center"
            aria-label="Back to properties"
          >
            <ArrowLeft className="w-5 h-5 text-green-600" />
          </button>

          {/* center: title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">{property.title || 'Untitled Property'}</h1>
          </div>

          {/* right: tenants icon (edit moved into details card) */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={() => setShowActivityLogs(true)}
              className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50 transition-colors"
              title="Activity logs"
              aria-label="Activity logs"
            >
              <List className="w-5 h-5 text-green-600" />
            </button>

            <button
              onClick={() => navigate(`/rooms?property=${id}`)}
              className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50 transition-colors"
              title="Room management"
              aria-label="Room management"
            >
              <Building2 className="w-5 h-5 text-green-600" />
            </button>

            <button
              onClick={() => navigate(`/tenants?property=${id}`)}
              className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50 transition-colors"
              title="View tenants"
              aria-label="View tenants"
            >
              <Users className="w-5 h-5 text-green-600" />
            </button>
          </div>
        </div>
      </header>
      {/* Two-column layout: gallery left (50%), details right (50%) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 relative">
          <div className="mb-4 text-center">
            <h2 className="text-lg font-semibold text-gray-900">Property Details & Information</h2>
          </div>

          {/* Edit button moved here (upper-right of the details card) */}
          <button
            onClick={goToEdit}
            className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50 transition-colors"
            title="Edit property"
            aria-label="Edit property"
          >
            <Edit className="w-5 h-5 text-green-600" />
          </button>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 m-2">
          {/* Left: Gallery */}
          <div className="w-full p-8">
            <div className="relative w-full">
              <div ref={galleryRef} className="relative bg-gray-100 rounded-xl overflow-hidden">
                <div className="w-full relative">
                  {images.length > 0 ? (
                    <>
                      <Swiper
                        modules={[Navigation, Pagination, Autoplay, Keyboard, A11y]}
                        spaceBetween={12}
                        slidesPerView={1}
                        navigation={false}
                        pagination={false}
                        autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
                        loop={images.length > 1}
                        slidesPerGroup={1}
                        speed={600}
                        resistanceRatio={0.85}
                        keyboard={{ enabled: true }}
                        a11y={{ enabled: true }}
                        onSlideChange={(swiper) => { setIdx(swiper.realIndex); setCurrentAspect(imageAspects[swiper.realIndex] || null); }}
                        onSwiper={(s) => setSwiperInstance(s)}
                      >
                        {images.map((src, i) => (
                          <SwiperSlide key={i} className="h-full">
                                <div
                                  className="w-full relative overflow-hidden rounded-xl bg-gray-100 flex items-center justify-center"
                                  style={(() => {
                                    const defaultAspect = 9 / 16; // fallback to 16:9 while images load
                                    const aspect = currentAspect || imageAspects[i] || defaultAspect;
                                    if (containerWidth && aspect) {
                                      const maxH = 420; // cap height so it doesn't take entire screen
                                      const h = Math.min(containerWidth * aspect, maxH);
                                      return { height: `${h}px` };
                                    }
                                    return { height: undefined };
                                  })()}
                                >
                                  <img
                                    src={src}
                                    loading="lazy"
                                    alt={`property-${i}`}
                                    onLoad={(e) => {
                                      const naturalW = e.target.naturalWidth || 1;
                                      const naturalH = e.target.naturalHeight || 1;
                                      const aspect = naturalH / naturalW;
                                      setImageAspects((p) => ({ ...p, [i]: aspect }));
                                      if (i === idx) setCurrentAspect(aspect);
                                      // re-measure container width after image load so height calc updates
                                      if (galleryRef.current) setContainerWidth(galleryRef.current.clientWidth);
                                    }}
                                    className="w-full h-full object-cover"
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
                    <div className="text-center text-gray-500">
                      <Building2 className="w-16 h-16 mx-auto mb-2" />
                      <p>No photos available</p>
                    </div>
                  )}
                </div>

                <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-gray-50 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-50 to-transparent" />
              </div>
            </div>
          </div>

          {/* Right: Details (Description, Address, Rules, Amenities) */}
          <aside className="flex flex-col gap-6">
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-700">{property.description || 'No description provided.'}</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Full Address</h3>
              <div className="text-sm text-gray-700">
                <div>{property.street_address}</div>
                <div>{property.barangay ? `${property.barangay}, ` : ''}{property.city}{property.province ? `, ${property.province}` : ''}{property.postal_code ? ` ${property.postal_code}` : ''}</div>
                {property.country && <div>{property.country}</div>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Property Rules</h3>
                {rules.length === 0 ? (
                  <p className="text-sm text-gray-500">No rules provided.</p>
                ) : (
                  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                    {rules.map((r, i) => <li key={i}>{renderRuleLabel(r)}</li>)}
                  </ul>
                )}
              </div>

              <div className="bg-white rounded-lg border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Amenities</h3>
                {amenities.length === 0 ? (
                  <p className="text-sm text-gray-500">No amenities listed.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((a, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100">
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
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 relative">
              <div className="mb-4 text-center">
                <h2 className="text-xl font-semibold text-gray-900">Room Management</h2>
              </div>
              <button
                onClick={() => navigate(`/rooms?property=${id}`)}
                className="absolute top-4 right-4 px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                View more Rooms
              </button>

            {roomsLoading ? (
              <p className="text-sm text-gray-500">Loading rooms...</p>
            ) : rooms.length === 0 ? (
              <p className="text-sm text-gray-500">No rooms found.</p>
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
