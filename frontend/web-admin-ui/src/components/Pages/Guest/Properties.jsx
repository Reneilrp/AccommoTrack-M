import React, { useRef, useEffect, useState } from 'react';

// Mock data for demo purposes
export const mockProperties = [
  {
    id: 1,
    name: 'Sunrise Apartments',
    rooms: [
      { id: 101, name: 'Studio Deluxe', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80', price: 1800, status: 'Available' },
      { id: 102, name: '1BR Suite', image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=400&q=80', price: 2500, status: 'Occupied' },
      { id: 103, name: '2BR Family', image: 'https://images.unsplash.com/photo-1460518451285-97b6aa326961?auto=format&fit=crop&w=400&q=80', price: 3200, status: 'Available' },
      { id: 104, name: 'Penthouse Suite', image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=400&q=80', price: 5000, status: 'Available' },
      { id: 105, name: 'Economy Room', image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=400&q=80', price: 1200, status: 'Occupied' },
      { id: 106, name: 'Loft', image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80', price: 2100, status: 'Available' },
      { id: 107, name: 'Garden View', image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80', price: 2300, status: 'Occupied' },
    ],
  },
  {
    id: 2,
    name: 'Greenfield Residences',
    rooms: [
      { id: 201, name: 'Single Room', image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=400&q=80', price: 1200, status: 'Available' },
      { id: 202, name: 'Double Room', image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=400&q=80', price: 1700, status: 'Occupied' },
      { id: 203, name: 'Family Suite', image: 'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=400&q=80', price: 2200, status: 'Available' },
      { id: 204, name: 'Executive Room', image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=400&q=80', price: 2700, status: 'Occupied' },
      { id: 205, name: 'Balcony Room', image: 'https://images.unsplash.com/photo-1460518451285-97b6aa326961?auto=format&fit=crop&w=400&q=80', price: 1900, status: 'Available' },
      { id: 206, name: 'Corner Suite', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80', price: 2500, status: 'Occupied' },
      { id: 207, name: 'Deluxe Twin', image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80', price: 2100, status: 'Available' },
    ],
  },
];

const Properties = ({ properties = mockProperties }) => {
  return (
    <section id="properties" className="py-20 px-6 max-w-7xl mx-auto bg-[#fafafa]">
      <div className="flex items-end justify-between mb-10">
        <div>
           <span className="bg-[#dcfce7] text-green-800 px-4 py-2 rounded-full text-sm font-bold mb-4 inline-block">
              FEATURED LISTINGS
           </span>
           <h2 className="text-[clamp(32px,4vw,48px)] font-extrabold text-gray-900 leading-tight">
             Latest Properties
           </h2>
        </div>
      </div>

      {properties.map((property) => {
        const carouselRef = useRef(null);
        const [showLeft, setShowLeft] = useState(false);
        const [showRight, setShowRight] = useState(true);

        const checkArrows = () => {
          const el = carouselRef.current;
          if (!el) return;
          setShowLeft(el.scrollLeft > 0);
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
          <div key={property.id} className="mb-16 last:mb-0">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 pl-2 border-l-4 border-green-600">
              {property.name}
            </h3>
            
            <div className="relative group">
              {/* Left Arrow */}
              {showLeft && (
                <button
                  onClick={() => scrollToCard('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-50 text-green-700 transition-all opacity-0 group-hover:opacity-100 duration-300"
                  aria-label="Scroll left"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}

              {/* Carousel Container */}
              <div
                ref={carouselRef}
                className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide"
              >
                {property.rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex-none w-[280px] md:w-[320px] bg-white rounded-[24px] shadow-sm hover:shadow-xl transition-all duration-300 snap-start overflow-hidden border border-gray-100 group/card"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={room.image}
                        alt={room.name}
                        className="w-full h-full object-cover transform group-hover/card:scale-105 transition-transform duration-500"
                      />
                      <span
                        className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                          room.status === 'Occupied' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {room.status}
                      </span>
                    </div>
                    
                    <div className="p-6">
                      <h4 className="text-xl font-bold text-gray-900 mb-2">{room.name}</h4>
                      <div className="flex items-center justify-between mt-4">
                         <div className="flex flex-col">
                           <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Price</span>
                           <span className="text-lg font-extrabold text-green-700">₱{room.price.toLocaleString()}</span>
                         </div>
                         <button className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-green-600 transition-colors">
                            View
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
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-50 text-green-700 transition-all opacity-0 group-hover:opacity-100 duration-300"
                  aria-label="Scroll right"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default Properties;