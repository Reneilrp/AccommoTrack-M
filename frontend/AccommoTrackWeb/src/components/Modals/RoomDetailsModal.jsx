import React, { useState, useEffect } from 'react';
import { X, Calendar, Check, Info, Users, BedDouble, DollarSign } from 'lucide-react';
import api from '../../utils/api';

export default function RoomDetailsModal({ room, property, onClose, isAuthenticated, onLoginRequired }) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [duration, setDuration] = useState(null);

  // Initialize dates
  useEffect(() => {
    const today = new Date();
    const defaultEnd = new Date(today);
    defaultEnd.setDate(defaultEnd.getDate() + 30);
    
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(defaultEnd.toISOString().split('T')[0]);
  }, []);

  // Calculate price whenever dates change
  useEffect(() => {
    calculateTotal();
  }, [startDate, endDate]);

  const getEndOfCurrentMonth = (fromDate = new Date()) => {
    const year = fromDate.getFullYear();
    const month = fromDate.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    lastDay.setHours(23, 59, 59, 999);
    return lastDay;
  };

  const isStartWithinCurrentMonth = (dateStr) => {
    if (!dateStr) return false;
    const dt = new Date(dateStr);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = getEndOfCurrentMonth();
    // Compare timestamps to ignore time components issues
    return dt.getTime() >= start.getTime() && dt.getTime() <= end.getTime();
  };

  const calculateDuration = () => {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) return null;

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const extraDays = diffDays % 30;

    return { days: diffDays, months, extraDays };
  };

  const calculateTotal = () => {
    const dur = calculateDuration();
    setDuration(dur);
    
    if (!dur) {
      setTotalPrice(0);
      return;
    }

    const billing = String(room.billing_policy || 'monthly')
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, '_');
    
    const monthly = Number(room.monthly_rate) || 0;
    const daily = Number(room.daily_rate) || Math.round(monthly / 30) || 0;

    let effectiveBilling = billing;
    if (effectiveBilling === 'monthly' && daily > 0 && dur.extraDays > 0) {
      effectiveBilling = 'monthly_with_daily';
    }

    let total = 0;
    if (['monthly_with_daily', 'monthly+daily', 'monthly_and_daily'].includes(effectiveBilling)) {
      total = (dur.months * monthly) + (dur.extraDays * daily);
    } else if (effectiveBilling === 'daily') {
      total = dur.days * daily;
    } else {
      // Default monthly: round up to nearest month
      const monthsCeil = Math.ceil(dur.days / 30);
      total = monthsCeil * monthly;
    }

    setTotalPrice(total);
  };

  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    
    // Auto-set end date to 30 days later
    const start = new Date(newStart);
    const newEnd = new Date(start);
    newEnd.setDate(newEnd.getDate() + 30);
    setEndDate(newEnd.toISOString().split('T')[0]);
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }

    if (!startDate || !endDate) {
      alert('Please select both check-in and check-out dates.');
      return;
    }

    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      alert('Check-in date cannot be in the past.');
      return;
    }

    // Strict check: Start date must be within current month
    // Note: We use the helper but need to be careful with timezones in JS Date
    // For simplicity, we'll trust the input value string
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const startMonth = start.getMonth();
    const startYear = start.getFullYear();

    if (startMonth !== currentMonth || startYear !== currentYear) {
       // Allow if it's future days of current month
       // Actually the requirement is "within current month".
       // If today is Jan 31, and user picks Feb 1, that's next month.
       // The mobile logic says: isStartWithinCurrentMonth.
       if (!isStartWithinCurrentMonth(startDate)) {
         alert('Check-in must be within the current month.');
         return;
       }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        room_id: room.id,
        start_date: startDate,
        end_date: endDate,
        notes: notes,
        total_amount: totalPrice
      };

      await api.post('/tenant/bookings', payload);
      alert('Booking request sent successfully!');
      onClose();
    } catch (error) {
      console.error('Booking failed', error);
      alert(error.response?.data?.message || 'Failed to submit booking request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
        
        {/* LEFT SIDE: Room Details */}
        <div className="w-full md:w-1/2 bg-gray-50 p-6 overflow-y-auto border-r border-gray-200">
          <div className="flex justify-between items-start mb-4 md:hidden">
            <h2 className="text-xl font-bold text-gray-900">Room Details</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="aspect-video bg-gray-200 rounded-xl overflow-hidden mb-6 relative group">
            <img 
              src={room.images?.[0] || 'https://via.placeholder.com/600x400?text=Room+Image'} 
              alt={`Room ${room.room_number}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3">
              <span className={`
                px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm
                ${room.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
              `}>
                {room.status}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Room {room.room_number}</h3>
              <p className="text-blue-600 font-medium capitalize">
                {(room.type_label || room.room_type || 'Standard').replace(/_/g, ' ')}
              </p>
            </div>

            <div className="flex gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                <Users className="w-4 h-4" />
                <span>Capacity: {room.capacity} Pax</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                <DollarSign className="w-4 h-4" />
                <span>{room.billing_policy || 'Monthly'} Billing</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-2">Description</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                {room.description || "No specific description provided for this room."}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-3">Room Amenities & Inclusions</h4>
              {room.amenities && room.amenities.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {room.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{typeof amenity === 'string' ? amenity : amenity.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No specific amenities listed.</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Booking Form */}
        <div className="w-full md:w-1/2 p-6 flex flex-col bg-white">
          <div className="hidden md:flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Book This Room</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 space-y-6">
            {/* Price Card */}
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-green-800 font-medium">Monthly Rate</p>
                  <p className="text-2xl font-bold text-green-700">₱{Number(room.monthly_rate).toLocaleString()}</p>
                </div>
                {room.daily_rate && (
                  <div className="text-right">
                    <p className="text-xs text-green-600">Daily Rate</p>
                    <p className="text-lg font-semibold text-green-700">₱{Number(room.daily_rate).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={handleStartDateChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Must be within the current month</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Duration Summary */}
            {duration && (
              <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Duration:</span>
                  <span className="font-medium text-gray-900">
                    {duration.days} days ({duration.months} months, {duration.extraDays} days)
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 pt-2 border-t border-gray-200">
                  <span>Total Estimated Cost:</span>
                  <span className="font-bold text-xl text-green-600">₱{totalPrice.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests / Notes</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                placeholder="Any specific requirements..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            {isAuthenticated ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || room.status !== 'available'}
                className={`
                  w-full py-3.5 rounded-xl font-bold text-white shadow-md transition-all
                  ${isSubmitting || room.status !== 'available'
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700 hover:shadow-lg transform hover:-translate-y-0.5'}
                `}
              >
                {isSubmitting ? 'Processing...' : 'Confirm Booking Request'}
              </button>
            ) : (
              <button
                onClick={onLoginRequired}
                className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md"
              >
                Login to Book
              </button>
            )}
            <p className="text-xs text-center text-gray-500 mt-3">
              You won't be charged yet. The landlord will review your request.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
