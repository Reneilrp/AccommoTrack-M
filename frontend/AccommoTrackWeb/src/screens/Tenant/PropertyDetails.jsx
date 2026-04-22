import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Shield, Check, Info, Loader2 } from "lucide-react";
import { propertyService } from "../../services/propertyService";
import bookingService from "../../services/bookingService";
import { showSuccess, showError } from "../../utils/toast";
import PropertyGallery from "./components/PropertyDetails/PropertyGallery";
import RoomItem from "./components/PropertyDetails/RoomItem";
import BookingSummary from "./components/PropertyDetails/BookingSummary";
import Footer from "../../components/Shared/Footer";

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [property, setProperty] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    const [propRes, roomsRes] = await Promise.all([
      propertyService.getPropertyDetails(id),
      propertyService.getRooms(id)
    ]);
    
    if (propRes.success) setProperty(propRes.data);
    if (roomsRes.success) {
      setRooms(roomsRes.data);
      const available = (roomsRes.data || []).find(r => r.available_slots > 0);
      if (available) setSelectedRoom(available);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const handleBooking = async () => {
    setBookingLoading(true);
    const res = await bookingService.createBooking({
      room_id: selectedRoom.id,
      start_date: startDate
    });
    
    if (res.success) {
      showSuccess("Booking reserved! Redirecting to checkout...");
      navigate(`/checkout/${res.data.id || res.data.invoice_id}`);
    } else {
      showError(res.error);
    }
    setBookingLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-green-600" />
      </div>
    );
  }

  if (!property) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Back & Title */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm border dark:border-gray-700 hover:scale-110 transition-all">
            <ArrowLeft className="w-5 h-5 text-green-600" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{property.title}</h1>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mt-1">
               <MapPin className="w-4 h-4" />
               <span className="font-bold">{property.address || `${property.city}, ${property.province}`}</span>
            </div>
          </div>
        </div>

        <PropertyGallery images={property.images} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
               <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">About this Property</h3>
               <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{property.description}</p>
            </div>

            {/* Amenities & Rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700">
                  <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-widest text-xs mb-4">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                     {property.amenities?.map((a, i) => (
                       <span key={i} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold border border-green-100 dark:border-green-800">
                          {a}
                       </span>
                     ))}
                  </div>
               </div>
               <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700">
                  <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-widest text-xs mb-4">House Rules</h4>
                  <ul className="space-y-2">
                     {property.house_rules?.map((r, i) => (
                       <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <span>{r}</span>
                       </li>
                     ))}
                  </ul>
               </div>
            </div>

            {/* Room List */}
            <div className="space-y-4">
               <h3 className="text-xl font-bold text-gray-900 dark:text-white">Available Rooms</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map(room => (
                    <RoomItem 
                      key={room.id} 
                      room={room} 
                      onSelect={setSelectedRoom}
                      isSelected={selectedRoom?.id === room.id}
                    />
                  ))}
               </div>
            </div>
          </div>

          <aside>
            <BookingSummary 
              room={selectedRoom}
              startDate={startDate}
              onDateChange={setStartDate}
              onBook={handleBooking}
              loading={bookingLoading}
            />
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}