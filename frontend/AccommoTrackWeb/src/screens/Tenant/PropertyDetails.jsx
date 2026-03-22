import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
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
  Play,
  X,
  Image as ImageIcon,
} from "lucide-react";
import api, { getImageUrl } from "../../utils/api";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import ImagePlaceholder from "../../components/Shared/ImagePlaceholder";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Keyboard, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import RoomDetailsModal from "../../components/Modals/RoomDetailsModal";
import bookingService from "../../services/bookingService";
import NotFoundPage from "../NotFoundPage";
import ReportPropertyModal from "../../components/Tenant/ReportPropertyModal";

// --- CUSTOM HOUSE ICON ---
const houseSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="rgba(0,0,0,0.4)"/>
  </filter>
  <path d="M12 2L2 11h2.5v10h6v-6h3v6h6v-10h2.5L12 2z" fill="#16a34a" stroke="#ffffff" stroke-width="1.5" filter="url(#shadow)"/>
</svg>
`);

const greenMarkerIcon = L.icon({
  iconUrl: `data:image/svg+xml;utf8,${houseSvg}`,
  iconSize: [42, 42],
  iconAnchor: [21, 40], // Bottom-center anchor
  popupAnchor: [0, -40],
});

export default function PropertyDetails({ propertyId, onBack }) {
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const isAuthenticated = !!localStorage.getItem("userData");

  const [roomFilter, setRoomFilter] = useState("available");

  // Video State
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // Full Gallery State
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);

  const parseMoney = (value, fallback = 0) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
    if (typeof value === "string") {
      const sanitized = value.replace(/[^\d.-]/g, "");
      const parsed = parseFloat(sanitized);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  };

  const getRoomPriceDisplay = (room) => {
    const billingPolicy = String(room?.billing_policy || "monthly").toLowerCase();
    const monthlyRate = parseMoney(room?.monthly_rate ?? room?.price, 0);
    const dailyRate = parseMoney(
      room?.daily_rate,
      monthlyRate > 0 ? Math.round(monthlyRate / 30) : 0,
    );

    const amount = billingPolicy === "daily" ? dailyRate : monthlyRate;
    const suffix = billingPolicy === "daily" ? "/day" : "/month";

    return {
      amount,
      suffix,
    };
  };

  const getGenderBadge = (restriction) => {
    const normalized = String(restriction || "mixed").toLowerCase().trim();

    if (normalized === "male" || normalized === "boy" || normalized === "boys") {
      return {
        label: "Boys Only",
        className: "bg-blue-50 text-blue-700 border border-blue-100",
      };
    }

    if (normalized === "female" || normalized === "girl" || normalized === "girls") {
      return {
        label: "Girls Only",
        className: "bg-rose-50 text-rose-700 border border-rose-100",
      };
    }

    return {
      label: "Mixed",
      className: "bg-gray-100 text-gray-700 border border-gray-200",
    };
  };

  const openFullGallery = (targetItemIndex = 0) => {
    if (!property) return;

    const items = [];

    // 1. Add Video Tour if exists
    if (property.video_url) {
      items.push({ type: "video", url: property.video_url });
    }

    // 2. Add Property main images
    if (Array.isArray(property.images)) {
      property.images.forEach((img) => {
        items.push({ type: "image", url: getImageUrl(img) });
      });
    }

    // 3. Add all unique room images
    const roomImages = new Set();
    (property.rooms || []).forEach((room) => {
      if (room.image) roomImages.add(getImageUrl(room.image));
      if (Array.isArray(room.images)) {
        room.images.forEach((img) => roomImages.add(getImageUrl(img)));
      }
    });

    roomImages.forEach((url) => {
      // Avoid duplication
      if (!items.find((it) => it.url === url)) {
        items.push({ type: "image", url });
      }
    });

    setGalleryItems(items);
    setGalleryIndex(targetItemIndex);
    setGalleryOpen(true);
  };

  // Reviews State
  const [reviews, setReviews] = useState({ reviews: [], summary: null });
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Fetch reviews for property
  const fetchReviews = async (propId) => {
    try {
      setReviewsLoading(true);
      const res = await api.get(`/public/properties/${propId}/reviews`);
      setReviews(res.data);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
      setReviews({ reviews: [], summary: null });
    } finally {
      setReviewsLoading(false);
    }
  };

  // Contact Landlord handler
  const handleContactLandlord = () => {
    if (!isAuthenticated) {
      toast.error("Please login to contact the landlord.", {
        position: "top-center",
        duration: 4000,
      });
      return;
    }

    const landlordId =
      property?.landlord_id || property?.user_id || property?.user?.id;

    if (!landlordId) {
      console.error("Landlord ID missing", property);
      toast.error("Cannot contact landlord: Owner information is missing.", {
        position: "top-center",
      });
      return;
    }

    navigate("/messages", {
      state: {
        startConversation: true,
        recipient: {
          id: landlordId,
          name: property.landlord?.name || property.landlord_name || "Landlord",
        },
        property: {
          id: property.id,
          title: property.title || property.name,
        },
      },
    });
  };

  useEffect(() => {
    if (propertyId) {
      fetchProperty();
      fetchReviews(propertyId);
    }
  }, [propertyId]);

  // If navigation included state or query params to open booking, handle it after property loads
  const location = useLocation();
  useEffect(() => {
    if (!loading && property) {
      const qs = new URLSearchParams(location.search);
      const roomId = location.state?.room_id || qs.get("room_id");
      const openBooking =
        location.state?.openBooking ||
        qs.get("open_booking") === "1" ||
        qs.get("open_booking") === "true";
      const openVideo =
        location.state?.openVideo || qs.get("open_video") === "1";
      if (roomId) {
        const found = (property.rooms || []).find(
          (r) => String(r.id) === String(roomId),
        );
        if (found) {
          setSelectedRoom(found);
        }
      }
      if (openBooking && roomId) {
        // ensure modal opens in booking view by passing initialView prop below
        // We rely on selectedRoom being set; RoomDetailsModal will accept initialView
      }
      if (openVideo && property.video_url) {
        openFullGallery(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, property, location.search, location.state]);

  const fetchProperty = async () => {
    try {
      setLoading(true);

      // --- FIX: USE PUBLIC ROUTE ---
      // Changed from '/landlord/properties/...' to '/public/properties/...'
      // This allows guests to view data without being redirected to login.
      const res = await api.get(`/public/properties/${propertyId}`);

      const data = res.data;

      const images = (data.images || [])
        .map((img) => {
          if (typeof img === "string") return img;
          if (img && typeof img === "object" && img.image_url)
            return img.image_url;
          return img;
        })
        .filter(Boolean);

      setProperty({
        ...data,
        images: images,
        amenities_list: parseAmenities(data.amenities_list || data.amenities),
        rules: data.property_rules
          ? typeof data.property_rules === "string"
            ? JSON.parse(data.property_rules)
            : data.property_rules
          : [],
      });
    } catch (error) {
      console.error("Failed to load property", error);
    } finally {
      setLoading(false);
    }
  };

  // Optimistically mark a room as occupied in the local `property` state after booking
  const handleBookingSuccessForProperty = (updatedRoom) => {
    if (!updatedRoom || !updatedRoom.id) return;
    setProperty((prev) => {
      if (!prev) return prev;
      const rooms = (Array.isArray(prev.rooms) ? prev.rooms : []).map((r) =>
        r.id === updatedRoom.id
          ? {
              ...r,
              status: updatedRoom.status || "occupied",
              reserved_by_me: updatedRoom.reserved_by_me || true,
              reservation: updatedRoom.reservation || null,
            }
          : r,
      );
      return { ...prev, rooms };
    });
    setSelectedRoom((prev) =>
      prev && prev.id === updatedRoom.id
        ? {
            ...prev,
            status: updatedRoom.status || "occupied",
            reserved_by_me: updatedRoom.reserved_by_me || true,
            reservation: updatedRoom.reservation || null,
          }
        : prev,
    );
  };

  const parseAmenities = (amenitiesData) => {
    if (!amenitiesData) return [];
    if (Array.isArray(amenitiesData)) {
      return amenitiesData
        .map((a) => (typeof a === "string" ? a : String(a)).trim())
        .filter(Boolean);
    }
    if (typeof amenitiesData === "string") {
      try {
        const parsed = JSON.parse(amenitiesData);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [];
      }
    }
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <NotFoundPage
        title="Property Not Found"
        message="This property may have been removed or is temporarily unavailable."
      />
    );
  }

  // --- RENDERERS ---

  const renderRooms = () => {
    const rooms = Array.isArray(property.rooms) ? property.rooms : [];
    const filteredRooms = rooms.filter((room) => {
      if (roomFilter === "all") return true;
      return (room.status || "").toLowerCase() === roomFilter.toLowerCase();
    });

    return (
      <div className="animate-in fade-in duration-300 space-y-6">
        <div className="flex flex-wrap gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
          {["all", "available", "occupied", "maintenance"].map((filter) => (
            <button
              key={filter}
              onClick={() => setRoomFilter(filter)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium capitalize transition-all
                ${
                  roomFilter === filter
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }
              `}
            >
              {filter}
            </button>
          ))}
        </div>

        {filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredRooms.map((room) => {
              const genderBadge = getGenderBadge(room.gender_restriction);
              return (
              <div
                key={room.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden shadow-md hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                  {/* Placeholder for room image if available, or generic */}
                  {getImageUrl(room.images?.[0] || room.image) ? (
                    <img
                      src={getImageUrl(room.images?.[0] || room.image)}
                      alt={`Room ${room.room_number}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImagePlaceholder className="w-full h-full" />
                  )}
                  <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                    {room.reserved_by_me ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm bg-amber-100 text-amber-800 border border-amber-200">
                        Reserved by you (Pending)
                      </span>
                    ) : (
                      <span
                        className={`
                          px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm
                          ${
                            (room.status || "").toString().toLowerCase() ===
                            "available"
                              ? "bg-green-100 text-green-700"
                              : (room.status || "").toString().toLowerCase() ===
                                  "occupied"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                          }
                        `}
                      >
                        {(room.status || "")
                          .toString()
                          .charAt(0)
                          .toUpperCase() +
                          (room.status || "").toString().slice(1)}
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${genderBadge.className}`}
                    >
                      {genderBadge.label}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                        Room {room.room_number}
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/30 capitalize">
                          {(
                            room.type_label ||
                            room.room_type ||
                            "Standard Room"
                          ).replace(/_/g, " ")}
                        </span>
                        {room.floor && (
                          <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 shadow-sm">
                            Flr {room.floor}
                          </span>
                        )}
                        <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/30 shadow-sm">
                          {(room.billing_policy || "Monthly")
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}{" "}
                          Billing
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const pricing = getRoomPriceDisplay(room);
                        return (
                          <>
                      <span className="block text-xl font-bold text-green-600">
                        ₱{pricing.amount.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {pricing.suffix}
                      </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                    {room.description || "No description available."}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{room.capacity} Pax</span>
                    </div>
                    {/* Add more details if available */}
                  </div>

                  <div className="mt-auto">
                    {isAuthenticated && room.status === "available" ? (
                      <button
                        onClick={() => setSelectedRoom(room)}
                        className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        Book This Room
                      </button>
                    ) : (
                      <button
                        disabled={
                          !isAuthenticated && room.status === "available"
                            ? false
                            : true
                        }
                        onClick={() =>
                          !isAuthenticated && setSelectedRoom(room)
                        }
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2
                          ${
                            !isAuthenticated && room.status === "available"
                              ? "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }
                        `}
                      >
                        {!isAuthenticated && room.status === "available"
                          ? "Login to Book"
                          : room.status === "available"
                            ? "Book This Room"
                            : "Not Available"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-gray-500 dark:text-gray-400">
              No rooms found with status "{roomFilter}".
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          About this property
        </h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
          {property.description || "No description provided."}
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Property Highlights
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800/30 shadow-md flex flex-col items-center text-center">
            <BedDouble className="w-6 h-6 text-green-600 mb-2" />
            <span className="font-bold text-gray-900 dark:text-white">
              {property.number_of_bedrooms || 0}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Bedrooms
            </span>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/30 shadow-md flex flex-col items-center text-center">
            <Bath className="w-6 h-6 text-blue-600 mb-2" />
            <span className="font-bold text-gray-900 dark:text-white">
              {property.number_of_bathrooms || 0}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Bathrooms
            </span>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/30 shadow-md flex flex-col items-center text-center">
            <Users className="w-6 h-6 text-orange-600 mb-2" />
            <span className="font-bold text-gray-900 dark:text-white">
              {property.max_occupants || 0}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Max Capacity
            </span>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800/30 shadow-md flex flex-col items-center text-center">
            <Maximize className="w-6 h-6 text-purple-600 mb-2" />
            <span className="font-bold text-gray-900 dark:text-white">
              {property.total_rooms || 0}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Total Rooms
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAmenities = () => (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        What this place offers
      </h3>
      {property.amenities_list && property.amenities_list.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {property.amenities_list.map((amenity, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
                <Check className="w-4 h-4" />
              </div>
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {amenity}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 italic">
          No specific amenities listed.
        </p>
      )}
    </div>
  );

  const renderPolicies = () => (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        Property Rules & Policies
      </h3>
      {property.rules && property.rules.length > 0 ? (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 rounded-xl p-6">
          <ul className="space-y-4">
            {property.rules.map((rule, index) => (
              <li key={index} className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-800 dark:text-gray-200 font-medium">
                  {rule}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 italic">
          No specific rules listed by the landlord.
        </p>
      )}
    </div>
  );

  const renderMap = () => (
    <div className="h-[400px] w-full rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 shadow-md animate-in fade-in duration-300 relative z-0">
      {property.latitude && property.longitude ? (
        <MapContainer
          center={[property.latitude, property.longitude]}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <Marker
            position={[property.latitude, property.longitude]}
            icon={greenMarkerIcon}
          >
            <Popup className="font-sans">
              <div className="text-center p-1">
                <strong className="block text-green-700 text-sm mb-1">
                  {property.title}
                </strong>
                <p className="text-xs text-gray-600 leading-tight">
                  {property.street_address}, {property.barangay},{" "}
                  {property.city}
                </p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          No location data available
        </div>
      )}
    </div>
  );

  const renderReviews = () => (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Guest Reviews
        </h3>
        {reviews.summary?.average_rating && (
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-bold rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />{" "}
            {reviews.summary.average_rating} ({reviews.summary.total_reviews})
          </span>
        )}
      </div>

      {reviewsLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : reviews.reviews?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.reviews.map((review) => (
            <div
              key={review.id}
              className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center font-bold text-white overflow-hidden">
                  {review.reviewer_image ? (
                    <img
                      src={review.reviewer_image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    review.reviewer_name?.charAt(0) || "U"
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 dark:text-white">
                    {review.reviewer_name || "Anonymous"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {review.time_ago}
                  </div>
                </div>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < review.rating ? "fill-current" : "text-gray-200 dark:text-gray-600"}`}
                    />
                  ))}
                </div>
              </div>
              {review.comment && (
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  "{review.comment}"
                </p>
              )}
              {review.landlord_response && (
                <div className="mt-3 pl-3 border-l-2 border-green-200 dark:border-green-700 bg-green-50/50 dark:bg-green-900/20 p-2 rounded-r-lg">
                  <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">
                    Landlord Response:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {review.landlord_response}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md">
          <p className="text-gray-500 dark:text-gray-400">No reviews yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Be the first to review this property after your stay!
          </p>
        </div>
      )}
    </div>
  );

  // Note: renderAvailability removed as it relies on room data which might require complex logic
  // You can re-add it if your public API returns full room data.

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Toaster />
      {/* HEADER */}
      <div
        className="relative w-full h-[350px] md:h-[450px] group cursor-pointer"
        onClick={() => openFullGallery(0)}
      >
        {getImageUrl(property.images?.[0]) ? (
          <img
            src={getImageUrl(property.images?.[0])}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <ImagePlaceholder className="w-full h-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-between px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
          <div className="mt-4 flex justify-between items-start">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
              className="z-[10] bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 text-gray-900 dark:text-white p-2.5 rounded-full transition-all shadow-lg border border-gray-200 dark:border-gray-700 group"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6 text-green-600 group-hover:scale-110 transition-transform" />
            </button>

            {/* Contact Landlord Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleContactLandlord();
              }}
              className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 hover:bg-gray-100 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span className="hidden sm:inline">Contact Landlord</span>
            </button>

            {/* Report Listing Button (authenticated tenants only) */}
            {isAuthenticated && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowReportModal(true); }}
                className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 transition-colors backdrop-blur-sm"
              >
                <span className="hidden sm:inline">Report Listing</span>
                <span className="sm:hidden">Report</span>
              </button>
            )}
          </div>

          <div className="text-white pb-6">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {property.property_type || "Property"}
              </span>
              {reviews.summary?.average_rating && (
                <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg text-sm font-medium">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />{" "}
                  {reviews.summary.average_rating}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-2 tracking-tight">
              {property.title}
            </h1>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex items-center gap-2 text-white/90 text-sm md:text-base">
                <MapPin className="w-5 h-5 text-green-400" />
                <span>
                  {property.street_address}, {property.barangay},{" "}
                  {property.city}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {property.video_url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openFullGallery(0);
                    }}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-5 py-2.5 rounded-xl font-bold transition-all border border-white/30 shadow-2xl group"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Watch Video Tour
                  </button>
                )}
                <button
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all border border-white/30 shadow-2xl font-bold text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFullGallery(0);
                  }}
                >
                  <ImageIcon className="w-4 h-4" />
                  See all photos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="sticky top-0 z-[1100] bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto no-scrollbar gap-6 sm:gap-8">
            {[
              "Overview",
              "Rooms",
              "Amenities",
              "Policies",
              "Map",
              "Reviews",
            ].map((tab) => {
              const tabKey = tab.toLowerCase();
              const isActive = activeTab === tabKey;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tabKey)}
                  className={`
                    py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors
                    ${
                      isActive
                        ? "border-green-600 text-green-700 dark:text-green-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
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
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[500px] ${isAuthenticated ? "pb-24" : ""}`}
      >
        {activeTab === "overview" && renderOverview()}
        {activeTab === "rooms" && renderRooms()}
        {activeTab === "amenities" && renderAmenities()}
        {activeTab === "policies" && renderPolicies()}
        {activeTab === "map" && renderMap()}
        {activeTab === "reviews" && renderReviews()}
      </div>

      {/* BOOKING MODAL */}
      {selectedRoom && (
        <RoomDetailsModal
          room={selectedRoom}
          property={property}
          onClose={() => setSelectedRoom(null)}
          isAuthenticated={isAuthenticated}
          onLoginRequired={() => (window.location.href = "/login")}
          initialView={
            location.state?.openBooking ||
            new URLSearchParams(location.search).get("open_booking") === "1" ||
            new URLSearchParams(location.search).get("open_booking") === "true"
              ? "booking"
              : undefined
          }
          onBookingSuccess={handleBookingSuccessForProperty}
          bookingService={bookingService}
        />
      )}

      {/* FULL MEDIA GALLERY MODAL */}
      {galleryOpen && galleryItems.length > 0 && (
        <div
          className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300"
          onClick={() => setGalleryOpen(false)}
        >
          {/* Ambient Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-green-500/5 blur-[150px] rounded-full pointer-events-none"></div>

          <div
            className="w-full h-full bg-transparent flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 md:p-6 flex items-center justify-between text-white border-b border-white/5 bg-black/40 backdrop-blur-md z-20">
              {/* Left Placeholder for Centering */}
              <div className="w-10 hidden md:block"></div>

              <div className="text-center flex-1">
                <h3 className="font-bold text-lg md:text-xl tracking-tight line-clamp-1">
                  {property?.title || "Property Gallery"}
                </h3>
                <p className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-[0.2em] mt-1">
                  {galleryIndex + 1} / {galleryItems.length}
                </p>
              </div>

              <button
                onClick={() => setGalleryOpen(false)}
                className="p-2 md:p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all hover:rotate-90 active:scale-90"
              >
                <X className="w-5 h-5 md:w-6 md:h-6 text-white/80" />
              </button>
            </div>

            {/* Main Media Content Area */}
            <div className="flex-1 relative flex items-center justify-center min-h-0">
              <Swiper
                modules={[Navigation, Pagination, Keyboard, A11y]}
                spaceBetween={0}
                slidesPerView={1}
                keyboard={{ enabled: true }}
                onSlideChange={(swiper) => setGalleryIndex(swiper.activeIndex)}
                initialSlide={galleryIndex}
                className="w-full h-full"
                onSwiper={(swiper) => {
                  window._detailsGallerySwiper = swiper;
                }}
              >
                {galleryItems.map((item, i) => (
                  <SwiperSlide
                    key={i}
                    className="h-full flex items-center justify-center"
                  >
                    <div className="w-full h-full flex items-center justify-center p-0">
                      {item.type === "video" ? (
                        <div className="w-full h-full bg-black relative flex items-center justify-center">
                          <video
                            src={item.url}
                            className="w-full h-full object-contain"
                            controls
                            autoPlay={i === galleryIndex}
                            playsInline
                          />
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={`Gallery item ${i + 1}`}
                          className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.8)]"
                        />
                      )}
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            {/* Modern Thumbnail Strip (Bottom Container) */}
            <div className="px-4 pb-4 md:px-6 md:pb-6 pt-2 bg-gradient-to-t from-black/90 to-transparent z-10 backdrop-blur-sm">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-2.5 overflow-x-auto py-2 no-scrollbar snap-x px-2">
                  {galleryItems.map((item, i) => (
                    <div
                      key={i}
                      className={`
                        relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer flex-shrink-0 snap-center
                        ${
                          i === galleryIndex
                            ? "border-green-500 scale-110 shadow-[0_0_30px_rgba(34,197,94,0.5)] ring-4 ring-green-500/20"
                            : "border-white/10 opacity-40 hover:opacity-100 hover:border-white/30"
                        }
                      `}
                      onClick={() => window._detailsGallerySwiper?.slideTo(i)}
                    >
                      {item.type === "video" ? (
                        <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
                          <Play className="w-6 h-6 fill-current" />
                          <div className="absolute inset-0 bg-black/20"></div>
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {/* Active Overlay */}
                      {i === galleryIndex && (
                        <div className="absolute inset-0 bg-green-500/10 animate-pulse"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Property Modal */}
      <ReportPropertyModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        propertyId={property?.id}
        propertyTitle={property?.title}
      />
    </div>
  );
}
