import React, { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

const HomePage = ({ onGetStarted }) => {
  useEffect(() => {
    AOS.init({ duration: 800, once: false });
  }, []);

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#FDF8F0] font-sans text-[#1c1c1c]">
      
      {/* --- HERO SECTION --- */}
      <section className="relative flex flex-col items-center justify-center min-h-[90vh] py-20 px-6 max-w-7xl mx-auto">
        <div data-aos="fade-up" className="text-center max-w-[900px] z-10">
          <h1 className="text-[clamp(48px,6vw,72px)] font-black leading-[1.1] mb-6 tracking-tight text-gray-900">
            Find Your Next Home <br />
            <span className="relative inline-block">
              in Zamboanga.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-[600px] mx-auto mb-10 leading-relaxed">
            Discover and book student-friendly dorms, apartments, and boarding houses. Secure, simple, and verified.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={onGetStarted}
              className="bg-green-600 text-white px-12 py-4 text-lg font-bold rounded-full shadow-[0_4px_14px_rgba(22,163,74,0.3)] transition-transform duration-200 hover:scale-105 hover:bg-green-700"
            >
              Get Started
            </button>
            <button 
              className="bg-transparent text-gray-900 px-12 py-4 text-lg font-bold rounded-full border-2 border-gray-900 transition-colors duration-200 hover:bg-black/5"
            >
              Learn More ↗
            </button>
          </div>
        </div>

        {/* Floating Abstract Elements */}
        <div className="absolute top-[20%] left-[5%] w-[60px] h-[60px] rounded-full bg-[#ffedd5] z-0 opacity-80 animate-pulse" />
        <div className="absolute bottom-[15%] right-[8%] w-[100px] h-[100px] rounded-full bg-[#dcfce7] z-0 opacity-80" />

        {/* LOGO STRIP */}
        <div className="mt-auto pt-20 w-full opacity-60">
          <p className="text-center text-sm font-semibold tracking-widest uppercase mb-5 text-gray-500">
            Trusted for Student Housing Near
          </p>
          <div className="flex justify-center gap-10 flex-wrap grayscale text-xl font-bold text-gray-400">
            <span>WMSU</span>
            <span>Ateneo</span>
            <span>UZ</span>
            <span>ZPPSU</span>
          </div>
        </div>
      </section>

      {/* --- WHY ZAMBOANGA --- */}
      <section className="py-20 px-6 flex flex-col items-center max-w-7xl mx-auto">
        <div className="bg-[#dcfce7] text-green-800 px-4 py-2 rounded-full text-sm font-bold mb-4 inline-block">
          CITY HIGHLIGHTS
        </div>
        <h2 data-aos="fade-up" className="text-[clamp(32px,4vw,48px)] font-extrabold text-center mb-4 text-gray-900">
          Why Live & Study Here?
        </h2>
        <p data-aos="fade-up" className="text-lg text-gray-600 text-center max-w-[600px] mb-8">
          Zamboanga City offers a vibrant mix of culture, education, and nature.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-5">
          {/* Card 1 */}
          <div data-aos="fade-up" data-aos-delay="0" className="bg-white rounded-[32px] p-10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] transition-transform hover:-translate-y-1">
            <div className="bg-[#dbeafe] w-[60px] h-[60px] rounded-full flex items-center justify-center mb-6 text-2xl">🏫</div>
            <h3 className="text-2xl font-extrabold mb-3">Top Universities</h3>
            <p className="text-gray-600 leading-relaxed">Home to Western Mindanao State University, Ateneo de Zamboanga, and other centers of excellence.</p>
          </div>

          {/* Card 2 */}
          <div data-aos="fade-up" data-aos-delay="100" className="bg-white rounded-[32px] p-10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] transition-transform hover:-translate-y-1">
            <div className="bg-[#ffedd5] w-[60px] h-[60px] rounded-full flex items-center justify-center mb-6 text-2xl">🍲</div>
            <h3 className="text-2xl font-extrabold mb-3">Amazing Culture</h3>
            <p className="text-gray-600 leading-relaxed">Experience the unique Chavacano heritage, delicious diverse food, and vibrant festivals.</p>
          </div>

          {/* Card 3 */}
          <div data-aos="fade-up" data-aos-delay="200" className="bg-white rounded-[32px] p-10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] transition-transform hover:-translate-y-1">
            <div className="bg-[#fce7f3] w-[60px] h-[60px] rounded-full flex items-center justify-center mb-6 text-2xl">🛡️</div>
            <h3 className="text-2xl font-extrabold mb-3">Safe & Affordable</h3>
            <p className="text-gray-600 leading-relaxed">Student-friendly cost of living with plenty of secure accommodation options.</p>
          </div>
        </div>
      </section>

      {/* --- ACCOMMODATION TYPES --- */}
      <section className="py-20 px-6 bg-white">
         <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-10">
              <div>
                <div className="bg-[#dcfce7] text-green-800 px-4 py-2 rounded-full text-sm font-bold mb-4 inline-block">
                  BROWSE SPACES
                </div>
                <h2 className="text-[clamp(32px,4vw,48px)] font-extrabold text-left m-0 text-gray-900">
                  Find Your Space
                </h2>
              </div>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-5 scrollbar-hide snap-x">
               {/* Type 1 */}
               <div className="min-w-[280px] cursor-pointer transition-transform hover:scale-[1.02] snap-start">
                  <div className="h-[320px] rounded-[32px] overflow-hidden relative mb-4">
                    <img src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80" alt="Dorm" className="w-full h-full object-cover" />
                    <div className="absolute bottom-5 left-5 bg-white px-5 py-2 rounded-2xl font-bold text-sm shadow-md">From ₱1,500</div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Dormitories</h3>
                  <p className="text-gray-600">Shared spaces, great for socializing.</p>
               </div>

               {/* Type 2 */}
               <div className="min-w-[280px] cursor-pointer transition-transform hover:scale-[1.02] snap-start">
                  <div className="h-[320px] rounded-[32px] overflow-hidden relative mb-4">
                    <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80" alt="Apartment" className="w-full h-full object-cover" />
                    <div className="absolute bottom-5 left-5 bg-white px-5 py-2 rounded-2xl font-bold text-sm shadow-md">From ₱5,000</div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Apartments</h3>
                  <p className="text-gray-600">Private units with full amenities.</p>
               </div>

               {/* Type 3 */}
               <div className="min-w-[280px] cursor-pointer transition-transform hover:scale-[1.02] snap-start">
                  <div className="h-[320px] rounded-[32px] overflow-hidden relative mb-4">
                    <img src="https://images.unsplash.com/photo-1596276020587-8044fe049813?auto=format&fit=crop&w=600&q=80" alt="Boarding House" className="w-full h-full object-cover" />
                    <div className="absolute bottom-5 left-5 bg-white px-5 py-2 rounded-2xl font-bold text-sm shadow-md">From ₱2,500</div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Boarding Houses</h3>
                  <p className="text-gray-600">Homely vibe with meals often included.</p>
               </div>
            </div>
         </div>
      </section>
    </main>
  );
};

export default HomePage;