import React, { useEffect, useState, useRef } from "react";
import logo from '../../../assets/logo.png';
import HomePage from './HomePage';
import Properties from './Properties';
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
    <div id="top" className="min-h-screen font-sans bg-gray-50">
      
      {/* --- HEADER (Sticky + Glassmorphism) --- */}
      <header className="sticky top-0 z-50 w-full transition-all duration-300 border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="w-[90%] max-w-7xl mx-auto h-[72px] flex items-center justify-between">
          
          {/* Left: Logo */}
          <div className="flex items-center flex-none">
            <a 
              href="#top" 
              className="flex items-center gap-2 no-underline group"
              onClick={e => { e.preventDefault(); document.getElementById('top').scrollIntoView({ behavior: 'smooth' }); }}
            >
              {/* Added a subtle hover rotation to logo for playfulness */}
              <img src={logo} alt="AccommoTrack Logo" className="h-10 w-10 transition-transform group-hover:rotate-12" />
              <span className="font-extrabold text-2xl tracking-tight text-gray-900 group-hover:text-green-700 transition-colors">
                AccommoTrack
              </span>
            </a>
          </div>

          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {['Home', 'Properties', 'Service', 'About'].map((item) => (
              <a 
                key={item}
                href={`#${item.toLowerCase()}`}
                className="px-5 py-2 rounded-full text-sm font-semibold text-gray-600 hover:text-green-700 hover:bg-green-50 transition-all duration-200"
                onClick={e => { 
                  e.preventDefault(); 
                  document.getElementById(item.toLowerCase()).scrollIntoView({ behavior: 'smooth' }); 
                }}
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Right: Login + Burger Menu */}
          <div className="flex items-center gap-2 flex-none relative">
            <a 
              href="/login" 
              className="flex items-center justify-center px-6 py-2.5 text-sm font-bold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 hover:shadow-md transition-all duration-200 transform active:scale-95"
            >
              Sign in
            </a>
            {/* Burger Menu */}
            <BurgerMenu />
          </div>

        </div>
      </header>

      {/* --- SECTIONS --- */}
      {/* Added ID wrapper for scroll targeting */}
      <div id="home">
        <HomePage onGetStarted={handleGetStarted} />
      </div>
      
      {/* Note: Ensure these components accept className or style props if you need further spacing adjustments */}
      <Properties />
      <Service onGetStarted={handleGetStarted} />
      <About />
    
    </div>
  );
}

// --- BURGER MENU COMPONENT ---
function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef();

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="ml-2 flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 focus:outline-none border border-gray-200 bg-white text-gray-700 shadow-sm"
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 animate-fade-in">
          <a
            href="/become-landlord"
            className="block px-4 py-3 text-gray-800 hover:bg-green-50 hover:text-green-700 font-semibold rounded-t-lg"
            onClick={() => setOpen(false)}
          >
            Become a Landlord
          </a>
          <a
            href="/help"
            className="block px-4 py-3 text-gray-800 hover:bg-green-50 hover:text-green-700 font-semibold rounded-b-lg"
            onClick={() => setOpen(false)}
          >
            Help
          </a>
        </div>
      )}
    </div>
  );
}

export default LandingPage;