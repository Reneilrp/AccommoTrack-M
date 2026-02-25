import React, { useEffect, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Search, MapPin, ArrowRight, FileText, MousePointer, UserPlus, CheckCircle, X, ChevronLeft, ChevronRight, ShieldCheck, CreditCard } from 'lucide-react'; 

const HomePage = ({ onGetStarted }) => {
  const [modalImages, setModalImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

        <section className="min-h-[calc(100vh-72px)] w-full flex flex-col items-center px-6 max-w-7xl mx-auto relative overflow-hidden py-12 md:py-0">
          
          {/* Main Hero Content - Dynamic Centering */}
          <div data-aos="fade-up" className="flex-1 flex flex-col items-center justify-center text-center max-w-[900px] z-10 w-full py-12 md:py-16">
            <h1 className="no-scale text-[clamp(40px,6vw,72px)] font-black leading-[1.1] mb-6 tracking-tight text-gray-900 dark:text-white">
              Find Your Next <br className="md:hidden" />
              Home <span className="md:hidden no-scale text-[0.7em] opacity-90 font-bold">in</span> <br className="hidden md:block" />
              <span className="no-scale text-green-600 inline-block mb-[15px] md:mb-[25px]">
                <span className="hidden md:inline no-scale text-[0.7em] text-gray-500 dark:text-gray-400 font-bold">in </span>Zamboanga City.
              </span>
            </h1>
            <p className="text-base md:text-xl text-gray-500 dark:text-gray-400 max-w-[600px] mx-auto mb-10 md:mb-12 leading-relaxed">
              Discover and book student-friendly dorms, apartments, and boarding houses. Verified landlords, secure payments, and zero hassle.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-md mx-auto">
              <button onClick={onGetStarted} className="flex items-center justify-center gap-2 bg-green-600 text-white px-8 py-4 text-lg font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all duration-200 hover:scale-105 hover:bg-green-700 hover:shadow-green-600/30">
                Browse Properties <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Background Blobs - Positioned relative to the visible area */}
          <div className="absolute top-[10%] left-[5%] w-48 h-48 md:w-64 md:h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob pointer-events-none"></div>
          <div className="absolute top-[10%] right-[5%] w-48 h-48 md:w-64 md:h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 pointer-events-none"></div>
          
          {/* University Logos - Safely docked at the bottom */}
          <div className="w-full z-10 pb-10 md:pb-12 flex-none">
            <p className="text-center text-[10px] md:text-xs font-bold tracking-widest uppercase mb-6 text-gray-400 dark:text-gray-500">Built for students from</p>
            <div className="flex justify-center gap-6 md:gap-16 flex-wrap">
              <span className="text-lg md:text-xl font-bold text-[#DC143C]">WMSU</span>
              <span className="text-lg md:text-xl font-bold text-sky-500">ADZU</span>
              <span className="text-lg md:text-xl font-bold text-green-600">UZ</span>
              <span className="text-lg md:text-xl font-bold text-[#800000]">ZPPSU</span>
            </div>
          </div>
        </section>


        {/* --- SECTION 2: WHY ACCOMMOTRACK --- */}
        <section className="w-full flex flex-col items-center py-24 md:py-32 px-6 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto w-full flex flex-col">
            <div className="text-center mb-12 flex-none">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                Why Live & Study Here?
              </h2>
              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                We provide the tools you need to find a safe, affordable, and convenient place to stay while you focus on your studies.
              </p>
            </div>

            <div className="flex-1 flex flex-col items-center md:pb-20 w-full">
              <div className="carousel-container flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-8 w-full max-h-[500px] md:max-h-none overflow-y-auto md:overflow-y-visible snap-y snap-mandatory no-scrollbar p-2 md:p-0">
                <div data-aos="fade-up" data-aos-delay="0" className="flex-none w-full md:w-auto snap-start bg-gray-50 dark:bg-gray-700 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-600 hover:border-green-200 dark:hover:border-green-700 transition-colors duration-300 shadow-sm md:shadow-none">
                  <div className="bg-green-100 dark:bg-green-900/30 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-6">
                    <MapPin className="w-6 h-6 md:w-7 md:h-7 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Near Campus</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                    Filter properties by distance to WMSU, Ateneo, and other major universities to save on commute time.
                  </p>
                </div>
                <div data-aos="fade-up" data-aos-delay="100" className="flex-none w-full md:w-auto snap-start bg-gray-50 dark:bg-gray-700 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-600 hover:border-green-200 dark:hover:border-green-700 transition-colors duration-300 shadow-sm md:shadow-none">
                  <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-6">
                    <ShieldCheck className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Verified Landlords</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                    Every listing is verified by our team to ensure your safety and prevent scams.
                  </p>
                </div>
                <div data-aos="fade-up" data-aos-delay="200" className="flex-none w-full md:w-auto snap-start bg-gray-50 dark:bg-gray-700 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-600 hover:border-green-200 dark:hover:border-green-700 transition-colors duration-300 shadow-sm md:shadow-none">
                  <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-6">
                    <CreditCard className="w-6 h-6 md:w-7 md:h-7 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Easy Payments</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                    Pay your rent and reservation fees securely through the app using GCash or Maya.
                  </p>
                </div>
              </div>
              <div className="md:hidden mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                <div className="w-4 h-[1px] bg-gray-300"></div>
                Scroll for more
                <div className="w-4 h-[1px] bg-gray-300"></div>
              </div>
            </div>
          </div>
        </section>


        {/* --- SECTION 3: ACCOMMODATION TYPES --- */}
        <section className="w-full flex flex-col items-center py-24 md:py-32 px-6 bg-gray-50 dark:bg-gray-900">
           <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
              
              {/* HEADER: Flex-none to keep it pinned at the top */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-4 flex-none">
                <div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                    Find Your Space
                  </h2>
                  <p className="text-lg text-gray-500 dark:text-gray-400">Browse by accommodation type to fit your lifestyle.</p>
                </div>
                <button onClick={onGetStarted} className="group flex items-center gap-2 text-green-600 font-bold hover:text-green-700 transition-colors">
                  View All Properties <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* GRID: Flex-1 to take remaining space and center content vertically */}
              <div className="flex-1 flex flex-col items-center md:pb-20 w-full">
                <div className="carousel-container flex flex-col md:grid md:grid-cols-3 gap-4 w-full max-h-[500px] md:max-h-none overflow-y-auto md:overflow-y-visible snap-y snap-mandatory no-scrollbar p-2 md:p-0">
                   {/* Type 1 */}
                   <div className="flex-none w-full md:w-auto snap-start group cursor-pointer" onClick={onGetStarted}>
                      <div className="h-[240px] md:h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                        <img src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80" alt="Dorm" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-5 left-5 z-20 text-left">
                          <h3 className="text-2xl font-bold text-white mb-1">Dormitories</h3>
                          <p className="text-white/90 text-sm font-medium">Starts at ₱1,500/mo</p>
                        </div>
                      </div>
                   </div>

                   {/* Type 2 */}
                   <div className="flex-none w-full md:w-auto snap-start group cursor-pointer" onClick={onGetStarted}>
                      <div className="h-[240px] md:h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                        <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80" alt="Apartment" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-5 left-5 z-20 text-left">
                          <h3 className="text-2xl font-bold text-white mb-1">Apartments</h3>
                          <p className="text-white/90 text-sm font-medium">Starts at ₱5,000/mo</p>
                        </div>
                      </div>
                   </div>

                   {/* Type 3 */}
                   <div className="flex-none w-full md:w-auto snap-start group cursor-pointer" onClick={onGetStarted}>
                      <div className="h-[240px] md:h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                        <img src="https://images.unsplash.com/photo-1596276020587-8044fe049813?auto=format&fit=crop&w=600&q=80" alt="Boarding House" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-5 left-5 z-20 text-left">
                          <h3 className="text-2xl font-bold text-white mb-1">Boarding Houses</h3>
                          <p className="text-white/90 text-sm font-medium">Starts at ₱2,500/mo</p>
                        </div>
                      </div>
                   </div>
                </div>
                <div className="md:hidden mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                  <div className="w-4 h-[1px] bg-gray-300"></div>
                  Scroll for more
                  <div className="w-4 h-[1px] bg-gray-300"></div>
                </div>
              </div>
           </div>
        </section>


        {/* --- SECTION 4: HOW IT WORKS --- */}
        {false && ( <section id="how-it-works" className="snap-section min-h-screen w-full flex flex-col items-center pt-32 px-6 bg-gray-50">
          <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
            <div className="text-center mb-16 flex-none">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
                How it Works
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Getting started is easy. Follow these simple steps to find your perfect home.
              </p>
            </div>

            <div className="flex-1 pb-20 overflow-x-auto">
               <div className="flex flex-col md:flex-row gap-6 min-w-full md:min-w-0">
                  {/* Step 1 */}
                  <div className="flex-1 min-w-[200px] flex flex-col items-center text-center group cursor-pointer" onClick={() => openModal([
                    "https://placehold.co/400x500/e2e8f0/94a3b8?text=Browse+Map",
                    "https://placehold.co/400x500/e2e8f0/94a3b8?text=Browse+List",
                    "https://placehold.co/400x500/e2e8f0/94a3b8?text=Filters"
                  ])}>
                      <div className="w-full aspect-[4/5] bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden relative group-hover:shadow-md group-hover:ring-4 group-hover:ring-green-50 transition-all">
                        {/* PASTE SCREENSHOT HERE: Browse/Search Screen */}
                         <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-300">
                             <Search className="w-12 h-12" />
                             <span className="sr-only">Screenshot Placeholder</span>
                         </div>
                         <img src="https://placehold.co/400x500/e2e8f0/94a3b8?text=Browse+Map" alt="Step 1: Browse" className="w-full h-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110" />
                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-sm">View 3 Photos</span>
                         </div>
                      </div>
                      <div className="bg-green-100 text-green-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-3">1</div>
                      <h3 className="font-bold text-lg mb-2">Browse Properties</h3>
                      <p className="text-gray-500 text-sm">Search via map or list view to find options near you.</p>
                  </div>

                  {/* Step 2 */}
                  <div className="flex-1 min-w-[200px] flex flex-col items-center text-center group cursor-pointer" onClick={() => openModal([
                    "https://placehold.co/400x500/e2e8f0/94a3b8?text=Property+Details",
                    "https://placehold.co/400x500/e2e8f0/94a3b8?text=Amenities",
                    "https://placehold.co/400x500/e2e8f0/94a3b8?text=Reviews"
                  ])}>
                      <div className="w-full aspect-[4/5] bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden relative group-hover:shadow-md group-hover:ring-4 group-hover:ring-green-50 transition-all">
                        {/* PASTE SCREENSHOT HERE: Room Details/Rules Screen */}
                         <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-300">
                             <FileText className="w-12 h-12" />
                         </div>
                         <img src="https://placehold.co/400x500/e2e8f0/94a3b8?text=Property+Details" alt="Step 2: Check info" className="w-full h-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110" />
                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-sm">View 3 Photos</span>
                         </div>
                      </div>
                      <div className="bg-green-100 text-green-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-3">2</div>
                      <h3 className="font-bold text-lg mb-2">Check Details</h3>
                      <p className="text-gray-500 text-sm">Read house rules, amenities, and verify reviews.</p>
                  </div>

                  {/* Step 3 */}
                   <div className="flex-1 min-w-[200px] flex flex-col items-center text-center group cursor-pointer" onClick={() => openModal([
                     "https://placehold.co/400x500/e2e8f0/94a3b8?text=Select+Unit",
                     "https://placehold.co/400x500/e2e8f0/94a3b8?text=View+Room+Photos"
                   ])}>
                      <div className="w-full aspect-[4/5] bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden relative group-hover:shadow-md group-hover:ring-4 group-hover:ring-green-50 transition-all">
                        {/* PASTE SCREENSHOT HERE: Selecting a Room */}
                         <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-300">
                             <MousePointer className="w-12 h-12" />
                         </div>
                         <img src="https://placehold.co/400x500/e2e8f0/94a3b8?text=Select+Unit" alt="Step 3: Select Room" className="w-full h-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110" />
                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-sm">View 2 Photos</span>
                         </div>
                      </div>
                      <div className="bg-green-100 text-green-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-3">3</div>
                      <h3 className="font-bold text-lg mb-2">Select Unit</h3>
                      <p className="text-gray-500 text-sm">Choose the specific room or bed that fits your budget.</p>
                  </div>

                  {/* Step 4 */}
                   <div className="flex-1 min-w-[200px] flex flex-col items-center text-center group cursor-pointer" onClick={() => openModal([
                     "https://placehold.co/400x500/e2e8f0/94a3b8?text=Register+Form",
                     "https://placehold.co/400x500/e2e8f0/94a3b8?text=Upload+ID",
                     "https://placehold.co/400x500/e2e8f0/94a3b8?text=Submit"
                   ])}>
                      <div className="w-full aspect-[4/5] bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden relative group-hover:shadow-md group-hover:ring-4 group-hover:ring-green-50 transition-all">
                        {/* PASTE SCREENSHOT HERE: Registration Screen */}
                         <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-300">
                             <UserPlus className="w-12 h-12" />
                         </div>
                         <img src="https://placehold.co/400x500/e2e8f0/94a3b8?text=Register+Form" alt="Step 4: Register" className="w-full h-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110" />
                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-sm">View 3 Photos</span>
                         </div>
                      </div>
                      <div className="bg-green-100 text-green-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-3">4</div>
                      <h3 className="font-bold text-lg mb-2">Register</h3>
                      <p className="text-gray-500 text-sm">Create your account to secure your booking.</p>
                  </div>

                   {/* Step 5 */}
                   <div className="flex-1 min-w-[200px] flex flex-col items-center text-center group cursor-pointer" onClick={() => openModal([
                     "https://placehold.co/400x500/e2e8f0/94a3b8?text=Booking+Summary",
                     "https://placehold.co/400x500/e2e8f0/94a3b8?text=Payment",
                     "https://placehold.co/400x500/e2e8f0/94a3b8?text=Confirmed"
                   ])}>
                      <div className="w-full aspect-[4/5] bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden relative group-hover:shadow-md group-hover:ring-4 group-hover:ring-green-50 transition-all">
                        {/* PASTE SCREENSHOT HERE: Booking Confirmation */}
                         <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-300">
                             <CheckCircle className="w-12 h-12" />
                         </div>
                         <img src="https://placehold.co/400x500/e2e8f0/94a3b8?text=Booking+Summary" alt="Step 5: Book" className="w-full h-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110" />
                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-sm">View 3 Photos</span>
                         </div>
                      </div>
                      <div className="bg-green-100 text-green-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-3">5</div>
                      <h3 className="font-bold text-lg mb-2">Book & Move In</h3>
                      <p className="text-gray-500 text-sm">Pay the reservation fee and get moved in!</p>
                  </div>
               </div>
            </div>
          </div>
        </section> )}
      </main>
    </>
  );
};

export default HomePage;