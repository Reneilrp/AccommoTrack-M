import React, { useRef, useEffect, useState } from 'react';
import { X, Check, MapPin, Star, Shield } from 'lucide-react'; 

// --- 1. EXPANDED MOCK DATA ---
export const mockProperties = [
  {
    id: 1,
    name: 'Sunrise Apartments',
    location: 'Tetuan, Zamboanga City',
    description: 'A modern apartment complex situated in the heart of Tetuan. Close to major transit lines and shopping centers.',
    rating: 4.8,
    rooms: [
      { 
        id: 101, 
        name: 'Studio Deluxe', 
        image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80', 
        price: 5500, 
        status: 'Available',
        size: '18 sqm',
        capacity: '1 Person',
        description: 'Perfect for students who want privacy. Features a personal kitchenette, study area, and en-suite bathroom.',
        amenities: ['Free Wi-Fi', 'Air Conditioning', 'Private Bathroom', 'Study Desk', 'Kitchenette'],
        rules: ['No Pets', 'No Smoking', 'Curfew: 10 PM for visitors']
      },
      { 
        id: 102, 
        name: '1BR Suite', 
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80', 
        price: 8000, 
        status: 'Occupied',
        size: '30 sqm',
        capacity: '2 People',
        description: 'Spacious suite with a separate living area. Ideal for couples or siblings sharing a space.',
        amenities: ['Free Wi-Fi', 'Air Conditioning', 'Private Bathroom', 'Living Area', 'Full Kitchen'],
        rules: ['No Pets', 'No Smoking']
      },
    ],
  },
  {
    id: 2,
    name: 'Greenfield Residences',
    location: 'Pasonanca, Zamboanga City',
    description: 'Experience nature and comfort in Pasonanca. A quiet environment perfect for focused studying.',
    rating: 4.5,
    rooms: [
      { 
        id: 201, 
        name: 'Master Bedroom', 
        image: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=800&q=80', 
        price: 4500, 
        status: 'Available',
        size: '22 sqm',
        capacity: '2 People',
        description: 'Large master bedroom with balcony access overlooking the park.',
        amenities: ['Shared Wi-Fi', 'Ceiling Fan', 'Shared Bathroom', 'Balcony Access'],
        rules: ['No Alcohol', 'Quiet Hours: 9 PM']
      },
      { 
        id: 202, 
        name: 'Standard Twin', 
        image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80', 
        price: 3000, 
        status: 'Occupied',
        size: '15 sqm',
        capacity: '2 People',
        description: 'Affordable twin room with essential amenities. Great for budget-conscious students.',
        amenities: ['Shared Wi-Fi', 'Wall Fan', 'Common Area Access'],
        rules: ['No Visitors after 9 PM']
      },
    ],
  },
  {
    id: 3,
    name: 'Blue Horizon Dormtel',
    location: 'Putik, Zamboanga City',
    description: 'Secure and affordable dormitory living with a vibrant student community.',
    rating: 4.2,
    rooms: [
      { id: 301, name: 'Bedspacer A', image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=400&q=80', price: 1500, status: 'Available', amenities: ['Bunk Bed', 'Locker', 'Shared CR'], description: 'Budget friendly bedspace in a 4-person room.' },
      { id: 303, name: 'Quad Room', image: 'https://images.unsplash.com/photo-1596276020587-8044fe049813?auto=format&fit=crop&w=400&q=80', price: 1200, status: 'Available', amenities: ['Fan', 'Locker'], description: 'Spacious quad room with individual study lamps.' },
    ],
  },
  {
    id: 4,
    name: 'Casa Maria Boarding House',
    location: 'Sta. Maria, Zamboanga City',
    description: 'Homey atmosphere with home-cooked meals available upon request.',
    rating: 4.7,
    rooms: [
      { id: 401, name: 'Attic Room', image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=400&q=80', price: 2000, status: 'Available', amenities: ['Privacy', 'Window View'], description: 'Cozy attic room with plenty of natural light.' },
      { id: 402, name: 'Room 1 (AC)', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80', price: 4000, status: 'Occupied', amenities: ['Aircon', 'Private Sink'], description: 'Comfortable air-conditioned room near the university.' },
    ],
  },
];

// --- 2. ROOM DETAILS MODAL COMPONENT (Kept for Room Preview) ---
const RoomDetailsModal = ({ room, property, onClose }) => {
  if (!room) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Dark Overlay with Blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] animate-in fade-in zoom-in duration-200">
        
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white transition-all md:hidden text-gray-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT SIDE: Hero Image */}
        <div className="w-full md:w-5/12 h-64 md:h-auto relative bg-gray-100 group flex-shrink-0">
          <img 
            src={room.image} 
            alt={room.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Image Overlay Gradient */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-24">
             <div className="flex items-center justify-between mb-2">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm ${
                    room.status === 'Available' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                    {room.status}
                </span>
                {property.rating && (
                  <span className="flex items-center gap-1 text-white text-sm font-bold bg-black/30 px-2 py-1 rounded-lg backdrop-blur-md">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {property.rating}
                  </span>
                )}
             </div>
             <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 leading-tight">{room.name}</h2>
             <div className="flex items-center text-white/90 text-sm font-medium">
                <MapPin className="w-4 h-4 mr-1.5" /> {property.location || 'Zamboanga City'}
             </div>
          </div>
        </div>

        {/* RIGHT SIDE: Details & Content */}
        <div className="w-full md:w-7/12 flex flex-col flex-1 min-h-0 bg-white">
          
          {/* Desktop Header Actions */}
          <div className="hidden md:flex justify-end p-6 pb-0 flex-shrink-0">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-4">
            
            {/* Price & Key Specs */}
            <div className="flex items-end justify-between mb-8 pb-6 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Monthly Rent</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-green-600 tracking-tight">₱{room.price.toLocaleString()}</span>
                  <span className="text-gray-400 font-medium">/mo</span>
                </div>
              </div>
              <div className="text-right space-y-1">
                 <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-50 border border-gray-100 text-sm text-gray-600 font-medium">
                    {room.size || 'N/A'}
                 </div>
                 <div className="block text-xs text-gray-400 font-medium uppercase mt-1">
                    Capacity: {room.capacity || '1-2 Pax'}
                 </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-3">About this space</h3>
              <p className="text-gray-600 leading-relaxed text-[15px]">
                {room.description || "A comfortable space designed for students and professionals. Enjoy a secure environment with easy access to local amenities."}
              </p>
            </div>

            {/* Amenities Grid */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">What this place offers</h3>
              <div className="grid grid-cols-2 gap-3">
                {(room.amenities || ['Standard Amenities']).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-gray-600 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* House Rules */}
            {room.rules && (
              <div className="mb-6">
                <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                  <h3 className="text-base font-bold text-orange-800 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> House Rules
                  </h3>
                  <ul className="space-y-2">
                    {room.rules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-orange-700/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer with CTA */}
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
            <button 
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              onClick={() => window.location.href = '/login'}
            >
              Login to Book
            </button>
            <p className="text-center text-xs text-gray-400 mt-3 font-medium">
              You must have a verified tenant account to proceed with booking.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};


// --- 3. MAIN COMPONENT ---
const Properties = ({ properties = mockProperties }) => {
  const [selectedRoomData, setSelectedRoomData] = useState(null);

  // Disable body scroll when room modal is open
  useEffect(() => {
    if (selectedRoomData) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedRoomData]);

  const handleOpenRoomDetails = (room, property) => {
    setSelectedRoomData({ room, property });
  };

  const handleCloseRoomDetails = () => {
    setSelectedRoomData(null);
  };

  // NEW: Navigation handler for Property Click
  const handlePropertyClick = (propertyId) => {
    // Redirect to the property details page
    // Note: Ensure your Router is set up to handle '/property/:id'
    window.location.href = `/property/${propertyId}`; 
  };

  return (
    <>
      <section id="properties" className="py-24 px-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
             <span className="text-green-600 font-bold tracking-wider text-sm uppercase mb-2 block">
                Featured Listings
             </span>
             <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
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
            <div key={property.id} className="mb-16 last:mb-0">
              {/* PROPERTY HEADER: Now Clickable (Redirects to Details Page) */}
              <div 
                className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-6 group/header cursor-pointer w-fit"
                onClick={() => handlePropertyClick(property.id)}
              >
                <div className="hidden md:block h-8 w-1 bg-green-600 rounded-full group-hover/header:scale-y-125 transition-transform"></div>
                <h3 className="text-2xl font-bold text-gray-900 group-hover/header:text-green-600 transition-colors">
                  {property.name}
                </h3>
                {property.location && (
                  <span className="text-sm font-medium text-gray-500 flex items-center gap-1 md:ml-2 group-hover/header:text-green-500 transition-colors">
                    <MapPin className="w-4 h-4" />
                    {property.location}
                  </span>
                )}
                {/* Subtle visual cue to click */}
                <div className="hidden md:flex opacity-0 group-hover/header:opacity-100 transition-opacity ml-2 items-center text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md">
                  View Profile &rarr;
                </div>
              </div>
              
              <div className="relative group/section">
                {/* Left Arrow */}
                {showLeft && (
                  <button
                    onClick={() => scrollToCard('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-10 h-10 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:text-green-600 hover:border-green-600 transition-all opacity-0 group-hover/section:opacity-100 duration-200 hidden md:flex"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                )}

                {/* Carousel */}
                <div
                  ref={carouselRef}
                  className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide px-2"
                >
                  {property.rooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex-none w-[280px] md:w-[320px] bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-green-200 transition-all duration-300 snap-start overflow-hidden group/card flex flex-col"
                    >
                      {/* Room Image (Opens Room Modal) */}
                      <div className="relative h-48 overflow-hidden bg-gray-200 cursor-pointer" onClick={() => handleOpenRoomDetails(room, property)}>
                        <img
                          src={room.image}
                          alt={room.name}
                          className="w-full h-full object-cover transform group-hover/card:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <span
                          className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide shadow-sm ${
                            room.status === 'Occupied' 
                              ? 'bg-red-50 text-red-700 border border-red-100' 
                              : 'bg-green-50 text-green-700 border border-green-100'
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>
                      
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <h4 
                            className="text-lg font-bold text-gray-900 line-clamp-1 cursor-pointer hover:text-green-600 transition-colors" 
                            title={room.name}
                            onClick={() => handleOpenRoomDetails(room, property)}
                          >
                            {room.name}
                          </h4>
                        </div>
                        
                        <div className="flex items-center justify-between mt-auto pt-4">
                           <div className="flex flex-col">
                             <span className="text-xs text-gray-500 font-medium uppercase">Price per month</span>
                             <span className="text-lg font-extrabold text-green-600">₱{room.price.toLocaleString()}</span>
                           </div>
                           <button 
                              onClick={() => handleOpenRoomDetails(room, property)}
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
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-10 h-10 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:text-green-600 hover:border-green-600 transition-all opacity-0 group-hover/section:opacity-100 duration-200 hidden md:flex"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Render Room Details Modal Only */}
      {selectedRoomData && (
        <RoomDetailsModal 
          room={selectedRoomData.room} 
          property={selectedRoomData.property} 
          onClose={handleCloseRoomDetails} 
        />
      )}
    </>
  );
};

export default Properties;