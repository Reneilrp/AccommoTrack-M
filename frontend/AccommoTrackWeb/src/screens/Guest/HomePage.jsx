import React, { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Search, MapPin, ArrowRight } from 'lucide-react'; 

const HomePage = ({ onGetStarted }) => {
  useEffect(() => {
    AOS.init({ duration: 800, once: false });
  }, []);

  return (
    <>
      <style>{`
        html {
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
        }
        .snap-section {
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }
      `}</style>

      <main className="w-full bg-gray-50 font-sans text-gray-900 overflow-x-hidden">
        
        {/* --- SECTION 1: HERO --- */}
        <section className="snap-section h-screen w-full flex flex-col items-center pt-32 pb-32 px-6 max-w-7xl mx-auto relative">
          <div data-aos="fade-up" className="text-center max-w-[900px] z-10 mb-auto">
            <h1 className="text-[clamp(40px,5vw,64px)] font-black leading-[1.1] mb-6 tracking-tight text-gray-900">
              Find Your Next Home <br />
              <span className="text-green-600">in Zamboanga City.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 max-w-[600px] mx-auto mb-10 leading-relaxed">
              Discover and book student-friendly dorms, apartments, and boarding houses. Verified landlords, secure payments, and zero hassle.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-md mx-auto">
              <button onClick={onGetStarted} className="flex items-center justify-center gap-2 bg-green-600 text-white px-8 py-4 text-lg font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all duration-200 hover:scale-105 hover:bg-green-700 hover:shadow-green-600/30">
                Browse Properties <Search className="w-5 h-5" />
              </button>
              <button className="flex items-center justify-center gap-2 bg-white text-gray-700 px-8 py-4 text-lg font-bold rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                How it Works
              </button>
            </div>
          </div>
          
          <div className="absolute top-[15%] left-[5%] w-64 h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob pointer-events-none"></div>
          <div className="absolute top-[15%] right-[5%] w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 pointer-events-none"></div>
          
          <div className="w-full z-10">
            <p className="text-center text-xs font-bold tracking-widest uppercase mb-6 text-gray-400">Trusted by students from</p>
            <div className="flex justify-center gap-8 md:gap-16 flex-wrap grayscale opacity-50">
              <span className="text-xl font-bold text-gray-400">WMSU</span>
              <span className="text-xl font-bold text-gray-400">Ateneo</span>
              <span className="text-xl font-bold text-gray-400">UZ</span>
              <span className="text-xl font-bold text-gray-400">ZPPSU</span>
            </div>
          </div>
        </section>


        {/* --- SECTION 2: WHY ACCOMMOTRACK --- */}
        <section className="snap-section h-screen w-full flex flex-col items-center pt-32 px-6 bg-white">
          <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
            <div className="text-center mb-12 flex-none">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
                Why Live & Study Here?
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                We provide the tools you need to find a safe, affordable, and convenient place to stay while you focus on your studies.
              </p>
            </div>

            <div className="flex-1 flex items-center pb-20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                <div data-aos="fade-up" data-aos-delay="0" className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-green-200 transition-colors duration-300">
                  <div className="bg-green-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                    <MapPin className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Near Campus</h3>
                  <p className="text-gray-500 leading-relaxed">
                    Filter properties by distance to WMSU, Ateneo, and other major universities to save on commute time.
                  </p>
                </div>
                <div data-aos="fade-up" data-aos-delay="100" className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-green-200 transition-colors duration-300">
                  <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Verified Landlords</h3>
                  <p className="text-gray-500 leading-relaxed">
                    Every listing is verified by our team to ensure your safety and prevent scams.
                  </p>
                </div>
                <div data-aos="fade-up" data-aos-delay="200" className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-green-200 transition-colors duration-300">
                  <div className="bg-purple-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                    <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Easy Payments</h3>
                  <p className="text-gray-500 leading-relaxed">
                    Pay your rent and reservation fees securely through the app using GCash or Maya.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* --- SECTION 3: ACCOMMODATION TYPES --- */}
        <section className="snap-section h-screen w-full flex flex-col items-center pt-32 px-6 bg-gray-50">
           <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
              
              {/* HEADER: Flex-none to keep it pinned at the top */}
              <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4 flex-none">
                <div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
                    Find Your Space
                  </h2>
                  <p className="text-lg text-gray-500">Browse by accommodation type to fit your lifestyle.</p>
                </div>
                <button onClick={onGetStarted} className="group flex items-center gap-2 text-green-600 font-bold hover:text-green-700 transition-colors">
                  View All Properties <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* GRID: Flex-1 to take remaining space and center content vertically */}
              <div className="flex-1 flex items-center pb-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                   {/* Type 1 */}
                   <div className="group cursor-pointer" onClick={onGetStarted}>
                      <div className="h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                        <img src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80" alt="Dorm" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-5 left-5 z-20">
                          <h3 className="text-2xl font-bold text-white mb-1">Dormitories</h3>
                          <p className="text-white/90 text-sm font-medium">Starts at ₱1,500/mo</p>
                        </div>
                      </div>
                   </div>

                   {/* Type 2 */}
                   <div className="group cursor-pointer" onClick={onGetStarted}>
                      <div className="h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                        <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80" alt="Apartment" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-5 left-5 z-20">
                          <h3 className="text-2xl font-bold text-white mb-1">Apartments</h3>
                          <p className="text-white/90 text-sm font-medium">Starts at ₱5,000/mo</p>
                        </div>
                      </div>
                   </div>

                   {/* Type 3 */}
                   <div className="group cursor-pointer" onClick={onGetStarted}>
                      <div className="h-[320px] rounded-2xl overflow-hidden relative mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                        <img src="https://images.unsplash.com/photo-1596276020587-8044fe049813?auto=format&fit=crop&w=600&q=80" alt="Boarding House" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-5 left-5 z-20">
                          <h3 className="text-2xl font-bold text-white mb-1">Boarding Houses</h3>
                          <p className="text-white/90 text-sm font-medium">Starts at ₱2,500/mo</p>
                        </div>
                      </div>
                   </div>
                </div>
              </div>
           </div>
        </section>
      </main>
    </>
  );
};

export default HomePage;