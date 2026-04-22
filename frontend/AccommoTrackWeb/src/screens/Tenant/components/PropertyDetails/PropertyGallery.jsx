import React, { memo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, Keyboard, A11y } from 'swiper/modules';
import { getImageUrl } from '../../../../utils/api';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const PropertyGallery = ({ images = [] }) => {
  return (
    <div className="w-full h-[400px] md:h-[500px] bg-black rounded-3xl overflow-hidden relative group shadow-2xl">
      {images.length > 0 ? (
        <Swiper
          modules={[Navigation, Pagination, Autoplay, Keyboard, A11y]}
          spaceBetween={0}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          loop={images.length > 1}
          className="w-full h-full"
        >
          {images.map((img, i) => (
            <SwiperSlide key={i} className="h-full">
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={getImageUrl(img.path || img)}
                  alt={`Property image ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
           <p className="text-gray-400 font-bold uppercase tracking-widest">No Photos Available</p>
        </div>
      )}
    </div>
  );
};

export default memo(PropertyGallery);