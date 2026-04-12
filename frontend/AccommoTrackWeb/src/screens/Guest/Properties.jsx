import React, { useEffect, useState } from 'react';
import PropertyCarousel from '../Tenant/PropertyCarousel';
import { useNavigate } from 'react-router-dom';
import { X, Check, MapPin, Star, Shield, ArrowRight, Loader2 } from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';
import { propertyService } from '../../services/propertyService';
import { mapRoom, mapProperty } from '../../utils/propertyHelpers';
import ImagePlaceholder from '../../components/Shared/ImagePlaceholder';

/* ─── Room Details Modal ─── */
const RoomDetailsModal = ({ room, property, onClose }) => {
  if (!room) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh]"
        style={{ animation: 'modal-in .2s cubic-bezier(.22,1,.36,1) both' }}>
        <style>{`
          @keyframes modal-in {
            from { opacity: 0; transform: scale(.96) translateY(12px); }
            to   { opacity: 1; transform: scale(1)  translateY(0); }
          }
        `}</style>

        {/* Mobile close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-white/90 dark:bg-gray-700/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-600 transition-all md:hidden text-gray-800 dark:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left — image */}
        <div className="w-full md:w-5/12 h-64 md:h-auto relative bg-gray-100 dark:bg-gray-700 group flex-shrink-0">
          {getImageUrl(room.image) ? (
            <img
              src={getImageUrl(room.image)}
              alt={room.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <ImagePlaceholder className="w-full h-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 pt-24 flex flex-col justify-end">
            <div className="flex items-center justify-between mb-2">
              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                room.status === 'Available' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {room.status}
              </span>
              {property.rating && (
                <span className="flex items-center gap-1.5 text-white text-sm font-bold bg-black/30 px-2.5 py-1.5 rounded-lg backdrop-blur-md">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {property.rating}
                </span>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">{room.name}</h2>
            <div className="flex items-center text-white/85 text-sm font-medium">
              <MapPin className="w-4 h-4 mr-2" /> {property.location || 'Zamboanga City'}
            </div>
          </div>
        </div>

        {/* Right — details */}
        <div className="w-full md:w-7/12 flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-800">
          {/* Desktop close */}
          <div className="hidden md:flex justify-end p-6 pb-0 flex-shrink-0">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-2 md:pt-4">
            {/* Price */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-6 border-b border-gray-100 dark:border-gray-700 gap-4">
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1.5">Monthly Rent</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl md:text-4xl font-bold text-green-600 tracking-tight">
                    ₱{room.price.toLocaleString()}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 font-medium">/mo</span>
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1.5">
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-300 font-medium">
                  {room.size || 'N/A'}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-500 font-medium uppercase">
                  Capacity: {room.capacity || '1-2 Pax'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">About this space</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                {room.description || 'A comfortable space designed for students and professionals. Enjoy a secure environment with easy access to local amenities.'}
              </p>
            </div>

            {/* Amenities */}
            <div className="mb-8">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">What this place offers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Array.isArray(room.amenities) ? room.amenities : ['Standard Amenities']).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-gray-600 dark:text-gray-300 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rules */}
            {room.rules && Array.isArray(room.rules) && (
              <div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-5 border border-orange-100 dark:border-orange-800/30">
                  <h3 className="text-sm font-bold text-orange-800 dark:text-orange-300 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Room Rules
                  </h3>
                  <ul className="space-y-2">
                    {room.rules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-orange-700/80 dark:text-orange-300/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* CTA footer */}
          <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
            <button
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-base rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              onClick={() => window.location.href = '/login'}
            >
              Login to Book
            </button>
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3 font-medium">
              You need a verified tenant account to proceed with booking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Modal overlay for loading / error states ─── */
const ModalOverlay = ({ children, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <button
      className="absolute top-5 right-5 bg-white dark:bg-gray-700 rounded-full p-2 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      onClick={onClose}
    >
      <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
    </button>
    {children}
  </div>
);

/* ─── Main component ─── */
const Properties = () => {
  const navigate = useNavigate();
  const [properties, setProperties]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [selectedRoomData, setSelectedRoomData] = useState(null);
  const [modalLoading, setModalLoading]   = useState(false);
  const [modalError, setModalError]       = useState(null);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await propertyService.getAllProperties();
        setProperties(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Error fetching properties');
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  /* Lock body scroll when any modal is open */
  useEffect(() => {
    const isOpen = selectedRoomData || modalLoading || modalError;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedRoomData, modalLoading, modalError]);

  const handleOpenDetails = async (room, property) => {
    setModalLoading(true);
    setModalError(null);

    // Timeout safety — dismiss loader after 12 s if API hangs
    const timeout = setTimeout(() => {
      setModalLoading(false);
      setModalError('Request timed out. Please try again.');
    }, 12000);

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
        },
      });
    } catch (err) {
      setModalError(err.message || 'Error fetching property details');
    } finally {
      clearTimeout(timeout);
      setModalLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedRoomData(null);
    setModalLoading(false);
    setModalError(null);
  };

  const displayed = (Array.isArray(properties) ? properties : [])
    .sort((a, b) => b.id - a.id)
    .slice(0, 2);

  return (
    <>
      <section className="py-12 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-3">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">
              Latest Properties
            </h2>
            {!loading && !error && properties.length > 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 font-medium">
                Showing {displayed.length} of {properties.length} listings
              </p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800/50 rounded-3xl p-6 md:px-10 md:py-8 border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/30 dark:shadow-none">
          <div className="flex justify-end mb-8">
            <button
              onClick={() => navigate('/browse-properties')}
              className="flex items-center gap-2 text-green-600 font-bold hover:text-green-700 transition-colors group text-sm"
            >
              View all properties
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400 dark:text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              <p className="text-sm font-medium">Loading properties…</p>
            </div>
          )}

          {error && (
            <div className="text-center py-20 text-red-500 dark:text-red-400 text-sm font-medium">{error}</div>
          )}

          {!loading && !error && properties.length === 0 && (
            <div className="text-center py-20 text-gray-400 dark:text-gray-500 text-sm font-medium">
              No properties found.
            </div>
          )}

          {!loading && !error && displayed.map((property) => {
            const mapped = mapProperty(property);
            return (
              <div
                key={mapped.id}
                className="mb-10 last:mb-0 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-6 group/header cursor-pointer w-fit"
                  onClick={() => navigate(`/property/${mapped.id}`)}
                >
                  <div className="hidden md:block h-7 w-1 bg-green-600 rounded-full group-hover/header:scale-y-125 transition-transform origin-center" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover/header:text-green-600 transition-colors">
                    {mapped.name}
                  </h3>
                  {mapped.location && (
                    <span className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1.5 group-hover/header:text-green-500 transition-colors">
                      <MapPin className="w-3.5 h-3.5" /> {mapped.location}
                    </span>
                  )}
                  <span className="hidden md:inline-flex opacity-0 group-hover/header:opacity-100 transition-opacity ml-1 text-xs font-bold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 px-2.5 py-1.5 rounded-md">
                    View Profile →
                  </span>
                </div>
                <PropertyCarousel property={mapped} onOpenDetails={handleOpenDetails} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Modal states ── */}
      {modalLoading && (
        <ModalOverlay onClose={handleCloseDetails}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl px-10 py-8 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Loading room details…</p>
          </div>
        </ModalOverlay>
      )}

      {modalError && !modalLoading && (
        <ModalOverlay onClose={handleCloseDetails}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl px-10 py-8 flex flex-col items-center gap-3 max-w-sm w-full text-center">
            <p className="text-base font-bold text-red-500 dark:text-red-400">Something went wrong</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{modalError}</p>
            <button
              onClick={handleCloseDetails}
              className="mt-2 px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-sm font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </ModalOverlay>
      )}

      {selectedRoomData && !modalLoading && !modalError && (
        <RoomDetailsModal
          room={selectedRoomData.room}
          property={selectedRoomData.property}
          onClose={handleCloseDetails}
        />
      )}
    </>
  );
};

export default Properties;