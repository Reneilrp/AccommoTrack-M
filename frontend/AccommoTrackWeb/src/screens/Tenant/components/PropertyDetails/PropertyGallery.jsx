import React, { memo, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Keyboard, A11y } from 'swiper/modules';
import { getImageUrl } from '../../../../utils/api';
import { LayoutGrid, Play, Image as ImageIcon } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const PropertyGallery = ({ images = [], videoUrl }) => {
  const [, setHeroImageIndex] = useState(0);

  const heroImages = Array.isArray(images) && images.length > 0 
    ? images.map(img => getImageUrl(img.path || img)) 
    : ['https://via.placeholder.com/800x600?text=No+Image'];

  const handleOpenGallery = () => {
     // Optional: could trigger a full screen modal if needed
  };

  return (
    <div className="relative mb-6 rounded-2xl overflow-hidden shadow-lg group">
      {/* Desktop Grid (Hidden on mobile) */}
      <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[450px]">
        {/* Main Image */}
        <div
          className="col-span-2 row-span-2 relative cursor-pointer group/main overflow-hidden"
          onClick={handleOpenGallery}
        >
          <img
            src={heroImages[0]}
            alt="Property Hero"
            className="w-full h-full object-cover transition-transform duration-700 group-hover/main:scale-105"
          />
          <div className="absolute inset-0 bg-black/10 group-hover/main:bg-black/20 transition-colors" />
          
          {videoUrl && (
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold animate-pulse">
              <Play className="w-4 h-4 fill-current" /> Video Available
            </div>
          )}
        </div>

        {/* Small Image 1 */}
        <div className="col-span-1 row-span-1 relative cursor-pointer overflow-hidden group/item" onClick={handleOpenGallery}>
          {heroImages[1] ? (
            <img src={heroImages[1]} className="w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-110" alt="Gallery 1" />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/20 transition-colors" />
        </div>

        {/* Small Image 2 */}
        <div className="col-span-1 row-span-1 relative cursor-pointer overflow-hidden group/item rounded-tr-xl" onClick={handleOpenGallery}>
          {heroImages[2] ? (
            <img src={heroImages[2]} className="w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-110" alt="Gallery 2" />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/20 transition-colors" />
        </div>

        {/* Small Image 3 */}
        <div className="col-span-1 row-span-1 relative cursor-pointer overflow-hidden group/item" onClick={handleOpenGallery}>
          {heroImages[3] ? (
            <img src={heroImages[3]} className="w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-110" alt="Gallery 3" />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/20 transition-colors" />
        </div>

        {/* Small Image 4 with Overlay if more images */}
        <div className="col-span-1 row-span-1 relative cursor-pointer overflow-hidden group/item rounded-br-xl" onClick={handleOpenGallery}>
          {heroImages[4] ? (
            <>
              <img src={heroImages[4]} className="w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-110" alt="Gallery 4" />
              {heroImages.length > 5 && (
                <div className="absolute inset-0 bg-black/50 hover:bg-black/60 transition-colors flex flex-col items-center justify-center text-white backdrop-blur-sm">
                  <LayoutGrid className="w-8 h-8 mb-2" />
                  <span className="font-bold text-lg">+{heroImages.length - 5} More</span>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/20 transition-colors" />
        </div>
      </div>

      {/* Mobile Carousel (Hidden on Desktop) */}
      <div className="md:hidden relative h-[300px]">
        <Swiper
          modules={[Navigation, Pagination, Keyboard, A11y]}
          spaceBetween={0}
          slidesPerView={1}
          pagination={{ type: "fraction" }}
          onSlideChange={(swiper) => setHeroImageIndex(swiper.activeIndex)}
          className="w-full h-full"
        >
          {heroImages.map((img, idx) => (
            <SwiperSlide key={idx}>
              <div className="w-full h-full bg-gray-200 dark:bg-gray-800" onClick={handleOpenGallery}>
                <img
                  src={img}
                  alt={`Property ${idx}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Floating View All Button */}
      <button
        onClick={handleOpenGallery}
        className="absolute bottom-4 right-4 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md text-gray-900 dark:text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-all flex items-center gap-2"
      >
        <LayoutGrid className="w-4 h-4" />
        Show all photos
      </button>
    </div>
  );
};

export default memo(PropertyGallery);