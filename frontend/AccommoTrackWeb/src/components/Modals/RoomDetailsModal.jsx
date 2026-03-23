import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Calendar,
  Check,
  Info,
  Users,
  BedDouble,
  DollarSign,
  Layers,
  Shield,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getImageUrl } from "../../utils/api";
import ImagePlaceholder from "../Shared/ImagePlaceholder";
import bookingServiceDefault from "../../services/bookingService";

export default function RoomDetailsModal({
  room,
  property,
  onClose,
  isAuthenticated,
  onLoginRequired,
  initialView,
  onBookingSuccess,
  bookingService,
}) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState(initialView || "details"); // 'details' | 'booking'
  const [bedCount, setBedCount] = useState(1);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentPlan, setPaymentPlan] = useState("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [duration, setDuration] = useState(null);
  const [_pricingBreakdown, setPricingPreview] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [autoNavTimer, setAutoNavTimer] = useState(null);

  const toMoneyNumber = (value, fallback = 0) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : fallback;
    }
    if (typeof value === "string") {
      const sanitized = value.replace(/[^\d.-]/g, "");
      const parsed = parseFloat(sanitized);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  };

  const formatMoney = (value) => {
    const amount = toMoneyNumber(value, 0);
    return `₱${amount.toLocaleString()}`;
  };

  const billingPolicy = String(room?.billing_policy || "monthly").toLowerCase();
  const monthlyRate = toMoneyNumber(
    room?.monthly_rate ?? room?.monthlyRate ?? room?.price,
    0,
  );
  const dailyRate = toMoneyNumber(
    room?.daily_rate ?? room?.dailyRate,
    monthlyRate > 0 ? Math.round(monthlyRate / 30) : 0,
  );

  const primaryRate = billingPolicy === "daily" ? dailyRate : monthlyRate;
  const primaryRateLabel = billingPolicy === "daily" ? "Daily Rate" : "Monthly Rate";

  // Initialize dates
  useEffect(() => {
    const today = new Date();
    const defaultEnd = new Date(today);
    defaultEnd.setDate(defaultEnd.getDate() + 30);

    setStartDate(today.toISOString().split("T")[0]);
    setEndDate(defaultEnd.toISOString().split("T")[0]);
  }, []);

  // Fetch pricing whenever dates change
  useEffect(() => {
    const fetchPricing = async () => {
      if (!room?.id || !startDate || !endDate || new Date(endDate) <= new Date(startDate)) {
        setTotalPrice(0);
        setDuration(null);
        return;
      }

      setLoadingPricing(true);
      try {
        const res = await api.get(`/rooms/${room.id}/pricing`, {
          params: { start: startDate, end: endDate, bed_count: bedCount }
        });
        
        setTotalPrice(res.data.total);
        setPricingPreview(res.data.breakdown);
        setDuration({
          days: res.data.days,
          months: res.data.breakdown?.months || 0,
          extraDays: res.data.breakdown?.remaining_days || 0
        });
      } catch (err) {
        console.error('Pricing calculation failed', err);
        // Fallback to 0 or error state
        setTotalPrice(0);
      } finally {
        setLoadingPricing(false);
      }
    };

    const timer = setTimeout(fetchPricing, 300); // Debounce
    return () => clearTimeout(timer);
  }, [startDate, endDate, room?.id, bedCount]);

  useEffect(() => {
    return () => {
      if (autoNavTimer) clearTimeout(autoNavTimer);
    };
  }, [autoNavTimer]);

  if (!room) return null;

  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    setStartDate(newStart);

    // Auto-set end date to 30 days later
    const start = new Date(newStart);
    const newEnd = new Date(start);
    newEnd.setDate(newEnd.getDate() + 30);
    setEndDate(newEnd.toISOString().split("T")[0]);
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select both check-in and check-out dates.");
      return;
    }

    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (room.billing_policy === 'daily') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (start < tomorrow) {
            toast.error("For daily rentals, check-in must be at least one day after today.");
            return;
        }
    } else {
        if (start < today) {
            toast.error("Check-in date cannot be in the past.");
            return;
        }
    }

    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Explicitly enforce minimum stay for monthly rooms
    const minStay = parseInt(room.min_stay_days) || 1;
    const effectiveMinStay = (room.billing_policy === 'monthly' || room.billing_policy === 'monthly_with_daily') 
      ? Math.max(30, minStay) 
      : minStay;

    if (diffDays < effectiveMinStay) {
      toast.error(`The minimum stay for this room is ${effectiveMinStay} days.`);
      return;
    }

    const threeMonthsFromNow = new Date(today);
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    if (start > threeMonthsFromNow) {
      toast.error("You cannot book a room more than 3 months in advance.");
      return;
    }

    // Check if selector should be shown
    const isMonthlyBilling = room?.billing_policy === 'monthly' || room?.billing_policy === 'monthly_with_daily';
    const showSelector = isMonthlyBilling && duration && (duration.months > 1 || (duration.months === 1 && duration.extraDays > 0));

    // Submit booking to server (use shared /bookings endpoint)
    setIsSubmitting(true);
    try {
      const payload = {
        room_id: room.id,
        bed_count: bedCount,
        start_date: startDate,
        end_date: endDate,
        notes: notes || "",
        payment_plan: showSelector ? paymentPlan : 'full',
      };

      const svc = bookingService || bookingServiceDefault;
      // bookingService.createBooking throws on error; returns data on success
      const res = await svc.createBooking(payload);
      // res may be the full response object or data depending on service
      const bookingObj = res?.booking || res?.data?.booking || res?.data || res;
      const invoiceObj = res?.reservation_invoice || res?.data?.reservation_invoice;

      // If there's an instant reservation invoice, immediately route to PayMongo
      if (invoiceObj && invoiceObj.checkout_url) {
        toast.loading('Redirecting to secure checkout...');
        window.location.href = invoiceObj.checkout_url;
        return; // Halt execution and wait for redirect
      }

      // show confirmation panel with booking id/status
      setBookingResult(bookingObj);
      // Inform parent to optimistically mark the room as occupied and reserved by current user
      try {
        if (typeof onBookingSuccess === "function") {
          onBookingSuccess({
            ...room,
            status: "occupied",
            reserved_by_me: true,
            reservation: bookingObj,
          });
        }
      } catch (e) {
        console.warn("onBookingSuccess handler failed", e);
      }
      // Auto-navigate to bookings after short delay to let user see confirmation
      const t = setTimeout(() => {
        if (navigate) navigate("/bookings");
      }, 3000);
      setAutoNavTimer(t);
    } catch (error) {
      console.error("Booking failed", error?.response?.data || error);
      const errMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit booking request.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoomTypeLabel = (room) => {
    if (room.type_label) return room.type_label;
    
    const typeMap = {
      'single': 'Single Room',
      'double': 'Double Room',
      'quad': 'Quad Room',
      'bedSpacer': 'Bed Spacer',
      'bedspacer': 'Bed Spacer'
    };

    return typeMap[room.room_type] || (room.room_type ? room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1) : 'Room');
  };

  const getGenderRestrictionMeta = (restriction) => {
    const normalized = String(restriction || "mixed").toLowerCase().trim();

    if (normalized === "male" || normalized === "boy" || normalized === "boys") {
      return {
        label: "Boys Only",
        className:
          "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800",
      };
    }

    if (
      normalized === "female" ||
      normalized === "girl" ||
      normalized === "girls"
    ) {
      return {
        label: "Girls Only",
        className:
          "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-800",
      };
    }

    return {
      label: "Mixed",
      className:
        "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600",
    };
  };

  const genderMeta = getGenderRestrictionMeta(room.gender_restriction);

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* STEP 1: ROOM DETAILS VIEW */}
        {viewMode === "details" && (
          <div className="w-full flex-1 flex flex-col bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
            {/* Header */}
            <div className="relative bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 h-14 md:h-16 flex items-center justify-center shadow-sm shrink-0">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Room Details
              </h2>
              <button
                onClick={onClose}
                className="absolute right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-5xl mx-auto space-y-8">
                {/* Top Grid: Image + Key Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* LEFT: Image */}
                  <div>
                    <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden relative shadow-sm group">
                      {getImageUrl(room.images?.[0]) ? (
                        <img
                          src={getImageUrl(room.images?.[0])}
                          alt={`Room ${room.room_number}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <ImagePlaceholder className="w-full h-full" />
                      )}
                      <div className="absolute top-3 right-3">
                        {room.reserved_by_me ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm bg-amber-100 text-amber-800 border border-amber-200">
                            Reserved by you (Pending)
                          </span>
                        ) : (
                          <span
                            className={`
                            px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm
                            ${(room.status || "").toString().toLowerCase() === "available" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
                          `}
                          >
                            {(room.status || "").toString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Details */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Room {room.room_number}
                      </h3>
                      <p className="text-blue-600 dark:text-blue-400 font-medium text-lg capitalize">
                        {getRoomTypeLabel(room)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                        <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span>
                          {room.room_type === 'bedSpacer' || room.room_type === 'bedspacer' 
                            ? `${room.occupied_count || 0} / ${room.capacity} Beds taken` 
                            : `${room.capacity} Pax`
                          }
                        </span>
                      </div>
                      {room.floor && (
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                          <Layers className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span>Floor {room.floor}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                        <DollarSign className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span>
                          {(room.billing_policy || "Monthly")
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}{" "}
                          Billing
                        </span>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm ${genderMeta.className}`}>
                        <Info className="w-4 h-4" />
                        <span>{genderMeta.label}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">
                        Description
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm md:text-base">
                        {room.description ||
                          "No specific description provided for this room."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Amenities & Rules */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      Amenities
                    </h4>
                    {room.amenities &&
                    Array.isArray(room.amenities) &&
                    room.amenities.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {room.amenities.map((amenity, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-lg border border-gray-100 dark:border-gray-600"
                          >
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                            <span className="truncate">
                              {typeof amenity === "string"
                                ? amenity
                                : amenity?.name || "Amenity"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                        No specific amenities listed.
                      </p>
                    )}
                  </div>
                  {/* Room Rules Section */}
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">
                      Room Rules
                    </h4>
                    {(room.rules && Array.isArray(room.rules) && room.rules.length > 0) || 
                     (property.rules && Array.isArray(property.rules) && property.rules.length > 0) ? (
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 rounded-xl p-5">
                        <ul className="space-y-3">
                          {(room.rules?.length > 0 ? room.rules : property.rules).map((rule, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-3 text-sm text-gray-800 dark:text-gray-200"
                            >
                              <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                              <span>{rule}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                        No specific rules listed by the landlord.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shrink-0 flex justify-between items-center">
              <div className="text-gray-900 dark:text-white">
                <p className="text-sm font-medium">{primaryRateLabel}</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">
                  {formatMoney(primaryRate)}
                </p>
              </div>
              {isAuthenticated ? (
                <button
                  onClick={() => setViewMode("booking")}
                  disabled={room.status !== "available"}
                  className={`px-8 py-3 rounded-xl font-bold text-white shadow-md transition-all
                            ${
                              room.status === "available"
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-gray-400 cursor-not-allowed"
                            }`}
                >
                  {room.status === "available"
                    ? "Book This Room"
                    : "Not Available"}
                </button>
              ) : (
                <button
                  onClick={onLoginRequired}
                  className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md"
                >
                  Login to Book
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: BOOKING FORM VIEW */}
        {viewMode === "booking" && (
          <div className="w-full flex-1 flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
            {/* Header with Back Button */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode("details")}
                  className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors group"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Book This Room
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {bookingResult ? (
                <div className="max-w-xl mx-auto space-y-6">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-6 rounded-xl text-center">
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-2">
                      Booking Submitted
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Booking ID:{" "}
                      <span className="font-mono font-semibold">
                        {bookingResult.id ||
                          bookingResult.booking_id ||
                          bookingResult.reference ||
                          "N/A"}
                      </span>
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      This is your booking for{" "}
                      <span className="font-medium">
                        Room {room?.room_number || room?.id}
                      </span>{" "}
                      — current status:{" "}
                      <span className="font-medium">
                        {(
                          bookingResult.status ||
                          bookingResult.booking_status ||
                          "pending"
                        ).toLowerCase()}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      You won't be charged yet. The landlord will review your
                      request.
                    </p>
                    <div className="mt-4 flex justify-center gap-3">
                      <button
                        onClick={() => {
                          if (autoNavTimer) clearTimeout(autoNavTimer);
                          navigate("/bookings");
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg"
                      >
                        View My Bookings
                      </button>
                      <button
                        onClick={() => {
                          setBookingResult(null);
                          if (autoNavTimer) clearTimeout(autoNavTimer);
                          onClose();
                        }}
                        className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-xl mx-auto space-y-6">
                  {/* Price Card Summary */}
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                          {primaryRateLabel}
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {formatMoney(primaryRate)}
                        </p>
                      </div>
                      {billingPolicy !== "daily" && dailyRate > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Daily Rate
                          </p>
                          <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                            {formatMoney(dailyRate)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date Selection */}
                  <div className="space-y-4">
                    {(room.room_type === 'bedSpacer' || room.room_type === 'bedspacer') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Number of Beds
                        </label>
                        <select
                          value={bedCount}
                          onChange={(e) => setBedCount(parseInt(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {[...Array(Math.max(1, room.available_slots || 1))].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {i + 1} {i === 0 ? 'Bed' : 'Beds'}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Available: {room.available_slots} / {room.capacity}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Check-in Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          value={startDate}
                          onChange={handleStartDateChange}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Bookings can be made up to 3 months in advance
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Check-out Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Duration Summary */}
                  {duration && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-2 text-sm border border-transparent dark:border-gray-700">
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Duration:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {duration.days} days ({duration.months} months,{" "}
                          {duration.extraDays} days)
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span>Total Estimated Cost:</span>
                        <span className="font-bold text-xl text-green-600 dark:text-green-400">
                          {loadingPricing ? (
                            <span className="animate-pulse opacity-50">Calculating...</span>
                          ) : (
                            `₱${totalPrice.toLocaleString()}`
                          )}
                        </span>
                      </div>
                      {/* Reservation Fee UI Details */}
                      {(property?.require_reservation_fee || Number(property?.require_reservation_fee) === 1) && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 rounded-lg">
                          <div className="flex justify-between text-amber-800 dark:text-amber-300 font-semibold mb-1">
                            <span>Instant Reservation Fee:</span>
                            <span>₱{(property?.reservation_fee_amount || 0).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            A non-refundable reservation fee is required to secure this booking. You will be redirected to PayMongo to pay this amount immediately.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Plan Selection */}
                  {(() => {
                    const isMonthlyBilling = room?.billing_policy === 'monthly' || room?.billing_policy === 'monthly_with_daily';
                    const showPaymentPlanSelector = isMonthlyBilling && duration && (duration.months > 1 || (duration.months === 1 && duration.extraDays > 0));
                  
                    if (!showPaymentPlanSelector) return null;
                  
                    return (
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-3 text-sm border border-transparent dark:border-gray-700">
                        <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                          Choose Your Payment Plan
                        </label>
                        <div className="space-y-3">
                          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paymentPlan === 'monthly' ? 'bg-green-50 border-green-500 dark:bg-green-900/20' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600 hover:border-gray-300'}`}>
                            <div className="pt-0.5">
                              <input 
                                type="radio" 
                                name="payment_plan" 
                                value="monthly" 
                                checked={paymentPlan === 'monthly'} 
                                onChange={() => setPaymentPlan('monthly')} 
                                className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300"
                              />
                            </div>
                            <div>
                              <span className="block font-bold text-gray-900 dark:text-gray-100">Pay Monthly</span>
                              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Pay rent at the beginning of each billing cycle.</span>
                            </div>
                          </label>
                          
                          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paymentPlan === 'full' ? 'bg-green-50 border-green-500 dark:bg-green-900/20' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600 hover:border-gray-300'}`}>
                            <div className="pt-0.5">
                              <input 
                                type="radio" 
                                name="payment_plan" 
                                value="full" 
                                checked={paymentPlan === 'full'} 
                                onChange={() => setPaymentPlan('full')} 
                                className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300"
                              />
                            </div>
                            <div>
                              <span className="block font-bold text-gray-900 dark:text-gray-100">Full Duration Upfront</span>
                              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Pay the entire lease amount at once.</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Special Requests / Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Any specific requirements..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                    {isAuthenticated && room.status === "available" && (
                      <div className="mb-4">
                        <label className="flex items-start gap-2 cursor-pointer group">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={agreedToRules}
                              onChange={(e) =>
                                setAgreedToRules(e.target.checked)
                              }
                              className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 dark:border-gray-600 transition-all checked:border-green-600 checked:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 dark:bg-gray-700"
                            />
                            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transform scale-50 peer-checked:scale-100 transition-all">
                              <Check className="h-3.5 w-3.5 font-bold" />
                            </div>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                            I have read and agree to the{" "}
                            <span className="font-medium text-green-700 dark:text-green-400">
                              Room Rules
                            </span>{" "}
                            and policies.
                          </span>
                        </label>
                      </div>
                    )}

                    {isAuthenticated ? (
                      <button
                        onClick={handleSubmit}
                        disabled={
                          isSubmitting ||
                          room.status !== "available" ||
                          !agreedToRules
                        }
                        className={`
                          w-full py-3.5 rounded-xl font-bold text-white shadow-md transition-all
                          ${
                            isSubmitting ||
                            room.status !== "available" ||
                            !agreedToRules
                              ? "bg-gray-400 cursor-not-allowed opacity-70"
                              : "bg-green-600 hover:bg-green-700 hover:shadow-lg transform hover:-translate-y-0.5"
                          }
                        `}
                      >
                        {isSubmitting
                          ? "Processing..."
                          : ((property?.require_reservation_fee || Number(property?.require_reservation_fee) === 1)
                              ? `Pay ₱${(property?.reservation_fee_amount || 0).toLocaleString()} to Reserve`
                              : "Confirm Booking Request")}
                      </button>
                    ) : (
                      <button
                        onClick={onLoginRequired}
                        className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md"
                      >
                        Login to Book
                      </button>
                    )}
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
                      You won't be charged yet. The landlord will review your
                      request.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
