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

    const toWholeNumber = (value, fallback = null) => {
      if (typeof value === 'number') {
        return Number.isFinite(value) ? Math.floor(value) : fallback;
      }

      if (typeof value === 'string') {
        const match = value.match(/\d+/);
        return match ? parseInt(match[0], 10) : fallback;
      }

      return fallback;
    };

    const getRoomTypeLabel = (r) => {
      if (r.type_label) return r.type_label;

      const rawType = String(
        r.room_type || r.roomType || r.type || r.name || '',
      ).trim();
      const normalizedType = rawType.toLowerCase().replace(/[\s_-]/g, '');

      const typeMap = {
        'single': 'Single Room',
        'double': 'Double Room',
        'quad': 'Quad Room',
        'bedSpacer': 'Bed Spacer',
        'bedspacer': 'Bed Spacer'
      };

      if (typeMap[rawType]) return typeMap[rawType];
      if (typeMap[normalizedType]) return typeMap[normalizedType];

      return rawType
        ? rawType
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase())
        : 'Room';
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
    const displayName = room.room_number ? `Room ${room.room_number}` : roomType;
    const roomCapacity = Math.max(
      1,
      toWholeNumber(room?.raw_capacity ?? room?.capacity, 1),
    );
    const availableSlots = toWholeNumber(
      room?.available_slots ?? room?.availableSlots,
      null,
    );
    const explicitOccupied = toWholeNumber(
      room?.occupied_count ?? room?.occupied,
      null,
    );
    const hasOccupancyData = explicitOccupied !== null || availableSlots !== null;
    const occupiedCount = Math.min(
      roomCapacity,
      Math.max(
        0,
        explicitOccupied !== null
          ? explicitOccupied
          : (availableSlots !== null ? roomCapacity - availableSlots : 0),
      ),
    );
    const occupancyLabel = hasOccupancyData && roomCapacity > 1
      ? `${occupiedCount}/${roomCapacity} Pax`
      : `${roomCapacity} Pax`;
    const amenityLabels = (Array.isArray(room?.amenities) ? room.amenities : [])
      .map((amenity) => {
        if (typeof amenity === 'string') return amenity.trim();
        return String(amenity?.name || amenity?.title || '').trim();
      })
      .filter(Boolean);

    return {
      ...room,
      billingPolicy,
      genderRestriction,
      primaryPrice,
      alternatePrice,
      primaryLabel: billingPolicy === 'daily' ? 'Price per day' : 'Price per month',
      alternateLabel: billingPolicy === 'daily' ? 'Monthly option' : 'Daily option',
      displayName: displayName,
      roomTypeLabel: roomType,
      occupancyLabel,
      amenityLabels,
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

  const shouldShowGenderBadge = (restriction, propertyType) => {
    const normalized = String(restriction || 'mixed').toLowerCase().trim();
    const normalizedType = String(propertyType || '').toLowerCase().trim();

    return !(normalizedType === 'apartment' && normalized === 'mixed');
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
        className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide px-2"
      >
        {(Array.isArray(property?.rooms) ? property.rooms : [])
          .map(normalizeRoom)
          .filter((room) => {
            const rawStatus = (room.display_status || room.status || 'available').toString().toLowerCase();
            const effectiveStatus = (typeof room.is_available === 'boolean' && !room.is_available && rawStatus === 'available')
              ? 'reserved'
              : rawStatus;
            const parsedCapacity = Number(room.raw_capacity ?? room.capacity);
            const parsedAvailableSlots = Number(room.available_slots ?? room.availableSlots);
            const parsedOccupied = Number(room.occupied_count ?? room.occupied);
            const isFullyOccupied = Number.isFinite(parsedCapacity) && parsedCapacity > 0 && (
              (Number.isFinite(parsedAvailableSlots) && parsedAvailableSlots <= 0)
              || (Number.isFinite(parsedOccupied) && parsedOccupied >= parsedCapacity)
            );
            return effectiveStatus !== 'occupied' && !isFullyOccupied;
          })
          .sort((a, b) => {
            const aStatus = (a.display_status || a.status || 'available').toString().toLowerCase();
            const bStatus = (b.display_status || b.status || 'available').toString().toLowerCase();
            const aAvailable = typeof a.is_available === 'boolean' ? a.is_available : aStatus === 'available';
            const bAvailable = typeof b.is_available === 'boolean' ? b.is_available : bStatus === 'available';

            if (aAvailable && !bAvailable) return -1;
            if (!aAvailable && bAvailable) return 1;

            return (a.primaryPrice || 0) - (b.primaryPrice || 0);
          })
          .map((room) => {
            const genderBadge = getGenderBadge(room.genderRestriction);
            const showGenderBadge = shouldShowGenderBadge(
              room.genderRestriction,
              property?.property_type,
            );
            const rawDisplayStatus = (room.display_status || room.status || 'available').toString().toLowerCase();
            const displayStatus = (typeof room.is_available === 'boolean' && !room.is_available && rawDisplayStatus === 'available')
              ? 'reserved'
              : rawDisplayStatus;
            const parsedCapacity = Number(room.raw_capacity ?? room.capacity);
            const parsedAvailableSlots = Number(room.available_slots ?? room.availableSlots);
            const parsedOccupied = Number(room.occupied_count ?? room.occupied);
            const isFullyOccupied = Number.isFinite(parsedCapacity) && parsedCapacity > 0 && (
              (Number.isFinite(parsedAvailableSlots) && parsedAvailableSlots <= 0)
              || (Number.isFinite(parsedOccupied) && parsedOccupied >= parsedCapacity)
            );
            const effectiveDisplayStatus = displayStatus === 'occupied' && !isFullyOccupied
              ? 'available'
              : displayStatus;
            const isOccupied = effectiveDisplayStatus === 'occupied';
            const hasAdjustedDisplayStatus = effectiveDisplayStatus !== displayStatus;
            const statusBadgeText = room.reserved_by_me
              ? 'Reserved by you (Pending)'
              : (hasAdjustedDisplayStatus
                ? effectiveDisplayStatus
                : (room.display_status_label || effectiveDisplayStatus || '')
              ).toString().charAt(0).toUpperCase() +
                (hasAdjustedDisplayStatus
                  ? effectiveDisplayStatus
                  : (room.display_status_label || effectiveDisplayStatus || '')
                ).toString().slice(1);
            const statusBadgeClassName = room.reserved_by_me
              ? 'bg-amber-50 text-amber-800 border border-amber-100'
              : effectiveDisplayStatus === 'occupied'
                ? 'bg-red-50 text-red-700 border border-red-100'
                : effectiveDisplayStatus === 'reserved'
                  ? 'bg-amber-50 text-amber-800 border border-amber-100'
                  : effectiveDisplayStatus === 'maintenance'
                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                    : 'bg-green-50 text-green-700 border border-green-100';

            return (
          <div
            key={room.id}
            className={`flex-none w-[210px] sm:w-[200px] md:w-[190px] lg:w-[calc((100%-2.25rem)/4.25)] xl:w-[calc((100%-3rem)/4.25)] bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-green-300 dark:hover:border-green-600 transition-all duration-300 snap-start overflow-hidden group/card flex flex-col ${isOccupied ? 'opacity-50' : ''}`}
          >
            {/* Image Click -> Open Room Details */}
            <div className="relative h-32 overflow-hidden bg-gray-200 dark:bg-gray-700 cursor-pointer" onClick={() => onOpenDetails(room, property)}>
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
              <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1.5">
                <span className={`px-1.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide shadow-sm max-w-[72%] ${statusBadgeClassName}`}>
                  {statusBadgeText}
                </span>
                {showGenderBadge && (
                  <span
                    className={`px-1.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide shadow-sm shrink-0 ${genderBadge.className}`}
                  >
                    {genderBadge.label}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <h4
                  className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 cursor-pointer hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  title={room.displayName}
                  onClick={() => onOpenDetails(room, property)}
                >
                  {room.displayName}
                </h4>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap shrink-0">
                  {room.occupancyLabel}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  {room.roomTypeLabel}
                </span>
              </div>

              {room.amenityLabels.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {room.amenityLabels.slice(0, 3).map((label, idx) => (
                    <span
                      key={`${label}-${idx}`}
                      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100"
                      title={label}
                    >
                      {label}
                    </span>
                  ))}
                  {room.amenityLabels.length > 3 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                      +{room.amenityLabels.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-extrabold text-green-600 leading-none">
                    {formatCurrency(room.primaryPrice)}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold leading-none">
                    / {room.billingPolicy === 'daily' ? 'D' : 'M'}
                  </span>
                </div>
                <button
                  onClick={() => onOpenDetails(room, property)}
                  className="px-2.5 py-1 rounded-md bg-gray-900 text-white text-[11px] font-semibold hover:bg-green-600 transition-colors shadow-sm whitespace-nowrap shrink-0"
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
