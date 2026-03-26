import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '../../utils/api';
import ImagePlaceholder from '../../components/Shared/ImagePlaceholder';

const PropertyCarousel = ({ property, onOpenDetails }) => {
  const carouselRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const normalizeRoom = (room) => {
    const toMoneyNumber = (value, fallback = 0) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
      if (typeof value === 'string') {
        const sanitized = value.replace(/[^\d.-]/g, '');
        const parsed = parseFloat(sanitized);
        return Number.isFinite(parsed) ? parsed : fallback;
      }
      return fallback;
    };

    const getRoomTypeLabel = (r) => {
      if (r.type_label) return r.type_label;
      const typeMap = {
        'single': 'Single Room',
        'double': 'Double Room',
        'quad': 'Quad Room',
        'bedSpacer': 'Bed Spacer',
        'bedspacer': 'Bed Spacer'
      };
      const roomType = r.room_type || '';
      return typeMap[roomType] || (roomType ? roomType.charAt(0).toUpperCase() + roomType.slice(1) : 'Room');
    };

    const monthlyRate = toMoneyNumber(
      room?.monthly_rate ?? room?.monthlyRate ?? room?.price,
      0,
    );
    const hasDailyRate = room?.daily_rate !== null && room?.daily_rate !== undefined;
    const dailyRate = hasDailyRate
      ? toMoneyNumber(room?.daily_rate, monthlyRate > 0 ? Math.round(monthlyRate / 30) : 0)
      : toMoneyNumber(room?.dailyRate, monthlyRate > 0 ? Math.round(monthlyRate / 30) : 0);
    const unitPrice = toMoneyNumber(room?.unit_price ?? room?.unitPrice, 0);
    const billingPolicy = (room?.billing_policy || room?.billingPolicy || 'monthly')
      .toString()
      .toLowerCase();
    const genderRestriction = String(
      room?.gender_restriction || room?.genderRestriction || 'mixed',
    )
      .toLowerCase()
      .trim();

    const primaryPrice =
      billingPolicy === 'daily'
        ? dailyRate || unitPrice || monthlyRate
        : monthlyRate || unitPrice || dailyRate;

    const alternatePrice = billingPolicy === 'daily' ? monthlyRate : dailyRate;
    
    const roomType = getRoomTypeLabel(room);
    const displayName = room.room_number ? `${room.room_number} - ${roomType}` : roomType;

    return {
      ...room,
      billingPolicy,
      genderRestriction,
      primaryPrice,
      alternatePrice,
      primaryLabel: billingPolicy === 'daily' ? 'Price per day' : 'Price per month',
      alternateLabel: billingPolicy === 'daily' ? 'Monthly option' : 'Daily option',
      displayName: displayName,
      imageSource: room?.image || room?.images?.[0] || null,
    };
  };

  const getGenderBadge = (restriction) => {
    if (restriction === 'male' || restriction === 'boys' || restriction === 'boy') {
      return {
        label: 'Boys Only',
        className: 'bg-blue-50 text-blue-700 border border-blue-100',
      };
    }

    if (restriction === 'female' || restriction === 'girls' || restriction === 'girl') {
      return {
        label: 'Girls Only',
        className: 'bg-rose-50 text-rose-700 border border-rose-100',
      };
    }

    return {
      label: 'Mixed',
      className: 'bg-gray-100 text-gray-700 border border-gray-200',
    };
  };

  const formatCurrency = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return 'N/A';
    return `₱${amount.toLocaleString()}`;
  };

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

  return (
    <div className="relative group/section">
      {/* Left Arrow */}
      {showLeft && (
        <button
          onClick={() => scrollToCard('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow-md border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 hover:border-green-600 dark:hover:border-green-400 transition-all opacity-0 group-hover/section:opacity-100 duration-200 hidden md:flex"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Carousel */}
      <div
        ref={carouselRef}
        className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide px-2"
      >
        {(Array.isArray(property?.rooms) ? property.rooms : [])
          .map(normalizeRoom)
          .sort((a, b) => {
            const aStatus = (a.display_status || a.status || 'available').toString().toLowerCase();
            const bStatus = (b.display_status || b.status || 'available').toString().toLowerCase();
            const aAvailable = aStatus === 'available';
            const bAvailable = bStatus === 'available';

            if (aAvailable && !bAvailable) return -1;
            if (!aAvailable && bAvailable) return 1;

            return (a.primaryPrice || 0) - (b.primaryPrice || 0);
          })
          .map((room) => {
            const genderBadge = getGenderBadge(room.genderRestriction);
            const displayStatus = (room.display_status || room.status || 'available').toString().toLowerCase();
            const isOccupied = displayStatus === 'occupied';
            const hasAlternatePrice =
              Number.isFinite(Number(room.alternatePrice)) && Number(room.alternatePrice) > 0;

            return (
          <div
            key={room.id}
            className={`flex-none w-[280px] md:w-[320px] bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-green-300 dark:hover:border-green-600 transition-all duration-300 snap-start overflow-hidden group/card flex flex-col ${isOccupied ? 'opacity-50' : ''}`}
          >
            {/* Image Click -> Open Room Details */}
            <div className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-700 cursor-pointer" onClick={() => onOpenDetails(room, property)}>
              {getImageUrl(room.imageSource) ? (
                <img
                  src={getImageUrl(room.imageSource)}
                  alt={room.displayName}
                  className="w-full h-full object-cover transform group-hover/card:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <ImagePlaceholder className="w-full h-full" />
              )}
              {room.reserved_by_me ? (
                <div className="absolute top-3 left-3 flex flex-col gap-2.5">
                  <span className="px-2.5 py-2 rounded-md text-xs font-bold uppercase tracking-wide shadow-sm bg-amber-50 text-amber-800 border border-amber-100">
                    Reserved by you (Pending)
                  </span>
                  <span
                    className={`px-2.5 py-2 rounded-md text-[10px] font-bold uppercase tracking-wide shadow-sm w-fit ${genderBadge.className}`}
                  >
                    {genderBadge.label}
                  </span>
                </div>
              ) : (
                <div className="absolute top-3 left-3 flex flex-col gap-2.5">
                  <span
                    className={`px-2.5 py-2 rounded-md text-xs font-bold uppercase tracking-wide shadow-sm w-fit ${
                      displayStatus === 'occupied'
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : displayStatus === 'reserved'
                          ? 'bg-amber-50 text-amber-800 border border-amber-100'
                          : displayStatus === 'maintenance'
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                            : 'bg-green-50 text-green-700 border border-green-100'
                    }`}
                  >
                    {(room.display_status_label || displayStatus || '').toString().charAt(0).toUpperCase() + (room.display_status_label || displayStatus || '').toString().slice(1)}
                  </span>
                  <span
                    className={`px-2.5 py-2 rounded-md text-[10px] font-bold uppercase tracking-wide shadow-sm w-fit ${genderBadge.className}`}
                  >
                    {genderBadge.label}
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h4
                  className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 cursor-pointer hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  title={room.displayName}
                  onClick={() => onOpenDetails(room, property)}
                >
                  {room.displayName}
                </h4>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">{room.primaryLabel}</span>
                  <span className="text-lg font-extrabold text-green-600">{formatCurrency(room.primaryPrice)}</span>
                  {hasAlternatePrice && (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {room.alternateLabel}: {formatCurrency(room.alternatePrice)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onOpenDetails(room, property)}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-green-600 transition-colors shadow-sm"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        );
        })}
      </div>

      {/* Right Arrow */}
      {showRight && (
        <button
          onClick={() => scrollToCard('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow-md border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 hover:border-green-600 dark:hover:border-green-400 transition-all opacity-0 group-hover/section:opacity-100 duration-200 hidden md:flex"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default PropertyCarousel;
