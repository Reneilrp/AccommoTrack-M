import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PropertyCarousel = ({ property, onOpenDetails }) => {
  const carouselRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

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
        {property.rooms.map((room) => (
          <div
            key={room.id}
            className="flex-none w-[280px] md:w-[320px] bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 hover:shadow-lg hover:border-green-200 dark:hover:border-green-700 transition-all duration-300 snap-start overflow-hidden group/card flex flex-col"
          >
            {/* Image Click -> Open Room Details */}
            <div className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-700 cursor-pointer" onClick={() => onOpenDetails(room, property)}>
              <img
                src={room.image}
                alt={room.name}
                className="w-full h-full object-cover transform group-hover/card:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              {room.reserved_by_me ? (
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide shadow-sm bg-amber-50 text-amber-800 border border-amber-100">
                  Reserved by you (Pending)
                </span>
              ) : (
                <span
                  className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide shadow-sm ${
                    (room.status || '').toString().toLowerCase() === 'occupied' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
                  }`}
                >
                  {(room.status || '').toString().charAt(0).toUpperCase() + (room.status || '').toString().slice(1)}
                </span>
              )}
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h4
                  className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 cursor-pointer hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  title={room.name}
                  onClick={() => onOpenDetails(room, property)}
                >
                  {room.name}
                </h4>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Price per month</span>
                  <span className="text-lg font-extrabold text-green-600">₱{room.price.toLocaleString()}</span>
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
        ))}
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
