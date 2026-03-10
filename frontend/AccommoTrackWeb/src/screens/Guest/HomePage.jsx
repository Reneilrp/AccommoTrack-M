import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Search, MapPin, ArrowRight, FileText, MousePointer, UserPlus, CheckCircle, ShieldCheck, CircleDollarSign, Smartphone, Download, X } from 'lucide-react'; 
import { useUIState } from '../../contexts/UIStateContext';

const HomePage = ({ onGetStarted }) => {
  const navigate = useNavigate();
  const { updateScreenState } = useUIState();
  const [modalImages, setModalImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAppPromo, setShowAppPromo] = useState(false);

  useEffect(() => {
    // Show app promo after 2 seconds
    const promoTimer = setTimeout(() => setShowAppPromo(true), 2000);
    return () => clearTimeout(promoTimer);
  }, []);

  useEffect(() => {
    // Optimized AOS for better performance and faster reveal
    AOS.init({ 
      duration: 600, 
      once: true,
      offset: 50,
      disable: 'mobile' // Optional: can disable AOS on mobile if reveal is still too slow
    });
    // Refresh AOS on resize to ensure trigger points are correct
    window.addEventListener('load', AOS.refresh);
    return () => window.removeEventListener('load', AOS.refresh);
  }, []);

  const handlePropertyTypeClick = (type) => {
    updateScreenState('explore', { selectedType: type, currentPage: 1 });
    navigate('/browse-properties');
  };

  const scrollToHowItWorks = () => {
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openModal = (images) => {
    setModalImages(images);
    setCurrentImageIndex(0);
  };

  const closeModal = () => {
    setModalImages([]);
    setCurrentImageIndex(0);
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % modalImages.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + modalImages.length) % modalImages.length);
  };

  return (
    <>
      <style>{`
        /* Smooth transitions for theme switching */
        .theme-transition {
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* Mobile Carousel Indicators */
        @media (max-width: 767px) {
          .carousel-container {
            border: 1px solid rgba(0, 0, 0, 0.05);
            box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.03);
            border-radius: 1.5rem;
            background: rgba(0, 0, 0, 0.01);
          }
          .dark .carousel-container {
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.2);
            background: rgba(255, 255, 255, 0.01);
          }
        }

        @keyframes float-gentle {
          0%, 100% { transform: translateY(0) translateX(-50%); }
          50% { transform: translateY(-8px) translateX(-50%); }
        }
        .animate-float-gentle {
          animation: float-gentle 3s infinite ease-in-out;
        }
      `}</style>

      <main className="w-full bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-white overflow-x-hidden theme-transition">
        
        {/* --- IMAGE MODAL --- */}
        {/* {modalImages.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeModal}>
            <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
               
               {/* Close Button }
               <button 
                 onClick={closeModal} 
                 className="absolute -top-12 right-0 md:-right-12 text-white hover:text-green-400 transition-colors z-50"
               >
                 <X className="w-8 h-8" />
               </button>

               {/* Navigation Buttons }
               {modalImages.length > 1 && (
                 <>
                   <button 
                     onClick={prevImage}
                     className="absolute -left-4 md:-left-16 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all z-50"
                   >
                     <ChevronLeft className="w-8 h-8" />
                   </button>
                   <button 
                     onClick={nextImage}
                     className="absolute -right-4 md:-right-16 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all z-50"
                   >
                     <ChevronRight className="w-8 h-8" />
                   </button>
                 </>
               )}

               {/* Main Image }
               <div className="relative w-full flex justify-center">
                  <img 
                    src={modalImages[currentImageIndex]} 
                    alt={`Step details ${currentImageIndex + 1}`} 
                    className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain" 
                  />
                  {modalImages.length > 1 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                       {modalImages.map((_, idx) => (
                         <div 
                           key={idx} 
                           className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white scale-125' : 'bg-white/50'}`} 
                         />
                       ))}
                    </div>
                  )}
               </div>

            </div>
          </div>
        )} */}

        <section className="min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-72px)] w-full flex flex-col items-center px-6 max-w-7xl mx-auto relative overflow-hidden py-8 md:py-0">
          
          {/* Main Hero Content - Dynamic Centering */}
          <div data-aos="fade-up" className="flex-1 flex flex-col items-center justify-center text-center max-w-[900px] z-10 w-full py-8 md:py-16">
            <h1 className="no-scale text-[clamp(32px,8vw,64px)] lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight text-gray-900 dark:text-white">
              Find Your Next <br className="md:hidden" />
              Home <span className="md:hidden no-scale font-bold">in</span> <br className="hidden md:block" />
              <span className="no-scale text-green-600 inline-block mb-[10px] md:mb-[20px]">
                <span className="hidden md:inline no-scale text-gray-900 dark:text-white font-bold">in </span>Zamboanga City.
              </span>
            </h1>
            <p className="text-sm md:text-xl text-gray-500 dark:text-gray-400 max-w-[600px] mx-auto mb-8 md:mb-12 leading-relaxed">
              Discover and book student-friendly dorms, apartments, and boarding houses. Verified landlords, secure payments, and zero hassle.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-xs md:max-w-lg mx-auto relative">
              <button 
                onClick={onGetStarted} 
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3.5 md:px-8 md:py-4 text-base md:text-lg font-bold rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:bg-green-700 transition-all duration-300"
              >
                Browse Properties <Search className="w-4 h-4 md:w-5 md:h-5" />
              </button>

              <div className="flex-1 relative">
                {showAppPromo && (
                  <div className="absolute top-[calc(100%+1.25rem)] md:top-auto md:bottom-[calc(100%+1.25rem)] left-1/2 z-20 animate-float-gentle pointer-events-auto">
                    <div className="bg-blue-600 text-white text-[10px] md:text-xs font-bold py-2.5 px-4 rounded-2xl shadow-2xl relative whitespace-nowrap flex items-center gap-3 border border-blue-400/50 backdrop-blur-sm">
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-blue-100 font-medium">New Feature!</span>
                        <span>AccommoTrack Mobile is here 📱</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowAppPromo(false); }}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        aria-label="Close promo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      
                      {/* Speech Bubble Arrow - Dynamic position */}
                      <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-600 rotate-45 
                        -top-1.5 border-l border-t border-blue-400/50
                        md:top-auto md:-bottom-1.5 md:border-l-0 md:border-t-0 md:border-r md:border-b">
                      </div>
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => window.open('https://expo.dev/accounts/pheinz/projects/AccommoTrack/builds/901262c3-0c95-4fb5-abcb-d574b8134507', '_blank')} 
                  className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border border-gray-200 dark:border-gray-700 px-6 py-3.5 md:px-8 md:py-4 text-base md:text-lg font-bold rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  Download App 
                  <Smartphone className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Background Blobs - Positioned relative to the visible area */}
          <div className="absolute top-[10%] left-[5%] w-48 h-48 md:w-64 md:h-64 bg-green-200 dark:bg-green-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10 animate-blob pointer-events-none"></div>
          <div className="absolute top-[10%] right-[5%] w-48 h-48 md:w-64 md:h-64 bg-blue-200 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000 pointer-events-none"></div>
          
          {/* University Logos - Safely docked at the bottom */}
          <div className="w-full z-10 pb-10 md:pb-12 flex-none">
            <p className="text-center text-[10px] md:text-xs font-bold uppercase mb-6 text-gray-400 dark:text-gray-500">Built for students from</p>
            <div className="flex justify-center gap-6 md:gap-16 flex-wrap">
              <span className="text-lg md:text-xl font-bold text-[#DC143C] dark:text-red-400">WMSU</span>
              <span className="text-lg md:text-xl font-bold text-sky-500 dark:text-sky-400">ADZU</span>
              <span className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">UZ</span>
              <span className="text-lg md:text-xl font-bold text-[#800000] dark:text-red-500">ZPPSU</span>
            </div>
          </div>
        </section>


        {/* --- SECTION 2: WHY ACCOMMOTRACK --- */}
        <section className="w-full flex flex-col items-center py-24 md:py-32 px-6 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto w-full flex flex-col">
            <div className="text-center mb-12 flex-none">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                Why use AccommoTrack?
              </h2>
              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                We provide the tools you need to find a safe, affordable, and convenient place to stay while you focus on your studies.
              </p>
            </div>

            <div className="flex-1 flex flex-col items-center md:pb-20 w-full">
              <div className="carousel-container flex flex-row md:grid md:grid-cols-3 gap-4 md:gap-8 w-full overflow-x-auto md:overflow-x-visible snap-x snap-mandatory no-scrollbar p-2 md:p-0">
                <div data-aos="fade-up" data-aos-delay="0" className="flex-none w-[85%] sm:w-[60%] md:w-auto snap-center md:snap-start">
                  <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center h-full">
                    <div className="bg-green-100 dark:bg-green-900/30 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-6">
                      <MapPin className="w-6 h-6 md:w-7 md:h-7 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Near Campus</h3>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                      Filter properties by distance to WMSU, Ateneo, and other major universities to save on commute time.
                    </p>
                  </div>
                </div>
                <div data-aos="fade-up" data-aos-delay="100" className="flex-none w-[85%] sm:w-[60%] md:w-auto snap-center md:snap-start">
                  <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center h-full">
                    <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-6">
                      <ShieldCheck className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Verified Landlords</h3>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                      Every listing is verified by our team to ensure your safety and prevent scams.
                    </p>
                  </div>
                </div>
                <div data-aos="fade-up" data-aos-delay="200" className="flex-none w-[85%] sm:w-[60%] md:w-auto snap-center md:snap-start">
                  <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center h-full">
                    <div className="bg-orange-100 dark:bg-orange-900/30 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-6">
                      <CircleDollarSign className="w-6 h-6 md:w-7 md:h-7 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Affordable Rates</h3>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                      Find rooms and spaces that fit your budget without compromising on quality or safety.
                    </p>
                  </div>
                </div>
              </div>
              <div className="md:hidden mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase animate-pulse">
                <div className="w-4 h-[1px] bg-gray-300"></div>
                Swipe for more
                <div className="w-4 h-[1px] bg-gray-300"></div>
              </div>
            </div>
          </div>
        </section>


        {/* --- SECTION 3: ACCOMMODATION TYPES --- */}
        <section className="w-full flex flex-col items-center py-24 md:py-32 px-6 bg-gray-50 dark:bg-gray-900">
           <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4 flex-none">
                  <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">
                    Find Your Space
                  </h2>
              </div>

              {/* BORDERED CONTAINER FOR GRID */}
              <div className="w-full bg-white dark:bg-gray-800/50 rounded-3xl p-6 md:px-10 md:py-8 border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none">
                <div className="flex justify-end mb-8">
                  <button onClick={onGetStarted} className="group flex items-center gap-2 text-green-600 font-bold hover:text-green-700 transition-colors">
                    View All Properties <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                
                <div className="carousel-container flex flex-row md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory no-scrollbar p-1">
                    {/* Type 1: Bed Spacer (Lowest Price) */}
                    <div className="group cursor-pointer flex-none w-[80%] sm:w-[50%] md:w-auto snap-center md:snap-start" onClick={() => handlePropertyTypeClick('Bed Spacer')}>
                        <div className="h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                          <img src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80" alt="Bed Spacer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute bottom-5 left-5 z-20 text-left">
                            <h3 className="text-2xl font-bold text-white mb-1">Bed Spacer</h3>
                            <p className="text-white/90 text-sm font-medium">Starts at ₱1,200/mo</p>
                          </div>
                        </div>
                    </div>

                    {/* Type 2: Dormitories */}
                    <div className="group cursor-pointer flex-none w-[80%] sm:w-[50%] md:w-auto snap-center md:snap-start" onClick={() => handlePropertyTypeClick('Dormitory')}>
                        <div className="h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                          <img src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80" alt="Dorm" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute bottom-5 left-5 z-20 text-left">
                            <h3 className="text-2xl font-bold text-white mb-1">Dormitories</h3>
                            <p className="text-white/90 text-sm font-medium">Starts at ₱1,500/mo</p>
                          </div>
                        </div>
                    </div>

                    {/* Type 3: Boarding Houses */}
                    <div className="group cursor-pointer flex-none w-[80%] sm:w-[50%] md:w-auto snap-center md:snap-start" onClick={() => handlePropertyTypeClick('Boarding House')}>
                        <div className="h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                          <img src="https://images.unsplash.com/photo-1596276020587-8044fe049813?auto=format&fit=crop&w=600&q=80" alt="Boarding House" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute bottom-5 left-5 z-20 text-left">
                            <h3 className="text-2xl font-bold text-white mb-1">Boarding Houses</h3>
                            <p className="text-white/90 text-sm font-medium">Starts at ₱2,500/mo</p>
                          </div>
                        </div>
                    </div>
                    
                    {/* Type 4: Apartments */}
                    <div className="group cursor-pointer flex-none w-[80%] sm:w-[50%] md:w-auto snap-center md:snap-start" onClick={() => handlePropertyTypeClick('Apartment')}>
                        <div className="h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                          <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80" alt="Apartment" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute bottom-5 left-5 z-20 text-left">
                            <h3 className="text-2xl font-bold text-white mb-1">Apartments</h3>
                            <p className="text-white/90 text-sm font-medium">Starts at ₱5,000/mo</p>
                          </div>
                        </div>
                    </div>
                </div>
                <div className="md:hidden mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase animate-pulse">
                  <div className="w-4 h-[1px] bg-gray-300"></div>
                  Swipe for more
                  <div className="w-4 h-[1px] bg-gray-300"></div>
                </div>
              </div>
           </div>
        </section>
      </main>
    </>
  );
};
export default HomePage;