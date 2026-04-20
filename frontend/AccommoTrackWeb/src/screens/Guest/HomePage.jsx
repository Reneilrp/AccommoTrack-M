import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ArrowRight, ShieldCheck, CircleDollarSign, Smartphone, X } from 'lucide-react';
import { useUIState } from '../../contexts/UIStateContext';

const HomePage = ({ onGetStarted }) => {
  const navigate = useNavigate();
  const { updateScreenState } = useUIState();
  const [showAppPromo, setShowAppPromo] = useState(false);

  useEffect(() => {
    const promoTimer = setTimeout(() => setShowAppPromo(true), 2000);
    return () => clearTimeout(promoTimer);
  }, []);

  const handlePropertyTypeClick = (type) => {
    updateScreenState('explore', { selectedType: type, currentPage: 1 });
    navigate('/browse-properties');
  };

  return (
    <>
      <style>{`
        .theme-transition {
          transition: background-color 0.3s ease, color 0.3s ease;
        }
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

      {/* --- HERO SECTION ONLY --- */}
      <section className="min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-72px)] w-full flex flex-col items-center relative overflow-hidden bg-gray-50 dark:bg-gray-900 theme-transition">

        {/* Background Blobs - Absolute relative to section */}
        <div className="absolute top-[10%] left-[5%] w-48 h-48 md:w-64 md:h-64 bg-green-200 dark:bg-green-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10 animate-blob pointer-events-none z-0"></div>
        <div className="absolute top-[10%] right-[5%] w-48 h-48 md:w-64 md:h-64 bg-blue-200 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000 pointer-events-none z-0"></div>

        {/* Inner Content Wrapper */}
        <div className="w-full max-w-7xl mx-auto px-6 flex-1 flex flex-col items-center relative z-10 py-8 md:py-0">
          
          {/* Main Hero Content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-[900px] w-full py-8 md:py-16">
          <h1 className="no-scale text-[clamp(32px,8vw,64px)] lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight text-gray-900 dark:text-white">
            Find Your Next <br className="md:hidden" />
            Home <span className="md:hidden no-scale font-bold">in</span> <br className="hidden md:block" />
            <span className="no-scale text-green-600 inline-block mb-[10px] md:mb-[20px]">
              <span className="hidden md:inline no-scale text-gray-900 dark:text-white font-bold">in </span>Zamboanga City.
            </span>
          </h1>
          <p className="text-sm md:text-xl text-gray-500 dark:text-gray-400 max-w-[600px] mx-auto mb-8 md:mb-12 leading-relaxed">
            Discover and book reliable dorms, apartments, and boarding houses. Verified landlords, secure payments, and zero hassle.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-xs md:max-w-lg mx-auto relative">
            <button
              onClick={onGetStarted}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-4 md:px-8 md:py-4 min-h-[56px] text-base md:text-lg font-bold rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:bg-green-700 transition-all duration-300"
            >
              Browse Properties <Search className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <div className="flex-1 min-w-0 relative">
              {showAppPromo && (
                <div className="absolute top-[calc(100%+1.25rem)] md:top-auto md:bottom-[calc(100%+1.25rem)] left-1/2 z-20 animate-float-gentle pointer-events-auto">
                  <div className="bg-blue-600 text-white text-[10px] md:text-xs font-bold py-2.5 px-4 rounded-2xl shadow-2xl relative whitespace-nowrap flex items-center gap-4 border border-blue-400/50 backdrop-blur-sm">
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-blue-100 font-medium">New Feature!</span>
                      <span>AccommoTrack Mobile is here 📱</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAppPromo(false); }}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                      aria-label="Close promo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-600 rotate-45
                      -top-1.5 border-l border-t border-blue-400/50
                      md:top-auto md:-bottom-1.5 md:border-l-0 md:border-t-0 md:border-r md:border-b">
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={() => navigate('/mobile-app')}
                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border border-gray-200 dark:border-gray-700 px-6 py-4 md:px-8 md:py-4 min-h-[56px] text-base md:text-lg font-bold rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                Get the App
                <Smartphone className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
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
              We provide the tools you need to find a safe, affordable, and convenient place to stay.
            </p>
          </div>
          <div className="flex-1 flex flex-col items-center md:pb-20 w-full">
            <div className="carousel-container flex flex-row md:grid md:grid-cols-3 gap-4 md:gap-8 w-full overflow-x-auto md:overflow-x-visible snap-x snap-mandatory no-scrollbar p-2 md:p-0">
              <div className="flex-none w-[85%] sm:w-[60%] md:w-auto snap-center md:snap-start">
                <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center h-full">
                  <div className="bg-green-100 dark:bg-green-900/30 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-6">
                    <MapPin className="w-6 h-6 md:w-7 md:h-7 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Prime Locations</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                    Filter properties by distance to key landmarks and offices to save on commute time.
                  </p>
                </div>
              </div>
              <div className="flex-none w-[85%] sm:w-[60%] md:w-auto snap-center md:snap-start">
                <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center h-full">
                  <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-6">
                    <ShieldCheck className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Verified Landlords</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                    Every listing is verified by our team to ensure your safety and prevent scams.
                  </p>
                </div>
              </div>
              <div className="flex-none w-[85%] sm:w-[60%] md:w-auto snap-center md:snap-start">
                <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center h-full">
                  <div className="bg-orange-100 dark:bg-orange-900/30 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-6">
                    <CircleDollarSign className="w-6 h-6 md:w-7 md:h-7 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Affordable Rates</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                    Find rooms and spaces that fit your budget without compromising on quality or safety.
                  </p>
                </div>
              </div>
            </div>
            <div className="md:hidden mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase animate-pulse">
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
          <div className="w-full bg-white dark:bg-gray-800/50 rounded-3xl p-6 md:px-10 md:py-8 border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none">
            <div className="flex justify-end mb-8">
              <button onClick={onGetStarted} className="group flex items-center gap-2 text-green-600 font-bold hover:text-green-700 transition-colors">
                View All Properties <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="carousel-container flex flex-row md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory no-scrollbar p-2">
              <div className="group cursor-pointer flex-none w-[80%] sm:w-[50%] md:w-auto snap-center md:snap-start" onClick={() => handlePropertyTypeClick('Bed Spacer')}>
                <div className="h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                  <img src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80" alt="Bed Spacer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute bottom-5 left-5 z-20 text-left">
                    <h3 className="text-2xl font-bold text-white mb-2">Bed Spacer</h3>
                    <p className="text-white/90 text-sm font-medium">Starts at ₱1,200/mo</p>
                  </div>
                </div>
              </div>
              <div className="group cursor-pointer flex-none w-[80%] sm:w-[50%] md:w-auto snap-center md:snap-start" onClick={() => handlePropertyTypeClick('Dormitory')}>
                <div className="h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                  <img src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80" alt="Dorm" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute bottom-5 left-5 z-20 text-left">
                    <h3 className="text-2xl font-bold text-white mb-2">Dormitories</h3>
                    <p className="text-white/90 text-sm font-medium">Starts at ₱1,500/mo</p>
                  </div>
                </div>
              </div>
              <div className="group cursor-pointer flex-none w-[80%] sm:w-[50%] md:w-auto snap-center md:snap-start" onClick={() => handlePropertyTypeClick('Boarding House')}>
                <div className="h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                  <img src="https://images.unsplash.com/photo-1596276020587-8044fe049813?auto=format&fit=crop&w=600&q=80" alt="Boarding House" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute bottom-5 left-5 z-20 text-left">
                    <h3 className="text-2xl font-bold text-white mb-2">Boarding Houses</h3>
                    <p className="text-white/90 text-sm font-medium">Starts at ₱2,500/mo</p>
                  </div>
                </div>
              </div>
              <div className="group cursor-pointer flex-none w-[80%] sm:w-[50%] md:w-auto snap-center md:snap-start" onClick={() => handlePropertyTypeClick('Apartment')}>
                <div className="h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                  <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80" alt="Apartment" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute bottom-5 left-5 z-20 text-left">
                    <h3 className="text-2xl font-bold text-white mb-2">Apartments</h3>
                    <p className="text-white/90 text-sm font-medium">Starts at ₱5,000/mo</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:hidden mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-500 uppercase animate-pulse">
              <div className="w-4 h-[1px] bg-gray-300"></div>
              Swipe for more
              <div className="w-4 h-[1px] bg-gray-300"></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;