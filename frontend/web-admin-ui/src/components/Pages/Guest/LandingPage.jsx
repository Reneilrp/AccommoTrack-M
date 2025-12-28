import React, { useEffect } from "react";
import logo from '../../../assets/logo.png';
import HomePage from './HomePage';
import Properties, { mockProperties } from './Properties';
import Service from './Service';
import About from './About';

const LandingPage = () => {
  useEffect(() => {
    // Inject global styles for scroll padding and scrollbar hiding
    if (typeof window !== 'undefined' && !document.getElementById('global-styles')) {
      const style = document.createElement('style');
      style.id = 'global-styles';
      style.innerHTML = `
        html {
          scroll-padding-top: 80px;
        }
        /* Utility to hide scrollbar but allow scrolling */
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const handleGetStarted = () => {
    window.location.href = "/browse-properties";
  };

  return (
    <div id="top" className="min-h-screen font-sans bg-[#fafafa]">
      
      {/* --- HEADER (Sticky) --- */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="w-[90%] mx-auto h-[70px] flex items-center justify-between">
          
          {/* Left: Logo */}
          <div className="flex items-center flex-none">
            <a 
              href="#top" 
              className="flex items-center no-underline"
              onClick={e => { e.preventDefault(); document.getElementById('top').scrollIntoView({ behavior: 'smooth' }); }}
            >
              <img src={logo} alt="AccommoTrack Logo" className="h-11 w-11 mr-1" />
              <span className="font-bold text-2xl md:text-[28px] text-[#2d2d2d] tracking-wide">
                AccommoTrack
              </span>
            </a>
          </div>

          {/* Center: Navigation (Hidden on small mobile screens usually, but kept flex for now) */}
          <nav className="hidden md:flex items-center gap-9 flex-1 justify-center">
            {['Home', 'Properties', 'Service', 'About'].map((item) => (
              <a 
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-[#222] font-medium text-lg hover:text-green-600 transition-colors"
                onClick={e => { 
                  e.preventDefault(); 
                  document.getElementById(item.toLowerCase()).scrollIntoView({ behavior: 'smooth' }); 
                }}
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Right: Login */}
          <div className="flex-none">
            <a 
              href="/login" 
              className="text-indigo-500 font-semibold text-lg px-6 py-2 border-2 border-indigo-500 rounded-lg transition-colors hover:bg-indigo-50"
            >
              Login
            </a>
          </div>

        </div>
      </header>

      {/* --- SECTIONS --- */}
      <div id="home">
        <HomePage onGetStarted={handleGetStarted} />
      </div>
      
      <Properties properties={mockProperties} />
      <Service onGetStarted={handleGetStarted} />
      <About />
    
    </div>
  );
};

export default LandingPage;