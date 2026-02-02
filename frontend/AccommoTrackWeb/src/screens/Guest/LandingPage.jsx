import React, { useEffect, useState, useRef } from "react";
import logo from '../../assets/Logo.png';
import HomePage from './HomePage';
import Properties from './Properties';
import Service from './Service';
import About from './About';
import { usePreferences } from '../../contexts/PreferencesContext';

const LandingPage = ({ user }) => {
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
    <div id="top" className="min-h-screen font-sans bg-gray-50 dark:bg-gray-900">
      
      {/* --- HEADER (Sticky + Glassmorphism) --- */}
      <header className="sticky top-0 z-50 w-full transition-all duration-300 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-sm">
        {/* Changed w-[90%] to w-full px-4 for better edge spacing on mobile */}
        <div className="relative w-full max-w-7xl mx-auto h-[72px] px-4 md:px-8 flex items-center justify-between">
          
          {/* Left: Logo (Icon only on Mobile/Tablet, Icon+Text on Desktop) */}
          <div className="flex items-center flex-none z-20">
            <a 
              href="#top" 
              className="flex items-center gap-2 no-underline group"
              onClick={e => { e.preventDefault(); document.getElementById('top').scrollIntoView({ behavior: 'smooth' }); }}
            >
              <img src={logo} alt="AccommoTrack Logo" className="h-10 w-10 transition-transform group-hover:rotate-12" />
              {/* Text hidden on mobile/tablet (lg:block) */}
              <span className="hidden lg:block font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-500 transition-colors">
                AccommoTrack
              </span>
            </a>
          </div>

          {/* Center Mobile/Tablet: Text Title (Absolute Center) */}
          <div className="lg:hidden absolute left-0 right-0 top-1/2 transform -translate-y-1/2 z-10 text-center pointer-events-none">
             <span className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white pointer-events-auto">
                AccommoTrack
             </span>
          </div>

          {/* Center Desktop: Navigation */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center z-20">
            {['Home', 'Explore', 'Service', 'About'].map((item) => (
              <a 
                key={item}
                href={`#${item.toLowerCase()}`}
                className="px-5 py-2 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all duration-200"
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
          <div className="flex items-center gap-2 flex-none relative z-20">
            {/* Sign In Button - Hidden on mobile/tablet (lg:flex) */}
            {user ? (
               <a 
                href="/dashboard" 
                className="hidden lg:flex items-center justify-center px-6 py-2.5 text-sm font-bold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 hover:shadow-md transition-all duration-200 transform active:scale-95"
              >
                Dashboard
              </a>
            ) : (
              <a 
                href="/login" 
                className="hidden lg:flex items-center justify-center px-6 py-2.5 text-sm font-bold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 hover:shadow-md transition-all duration-200 transform active:scale-95"
              >
                Sign in
              </a>
            )}
            {/* Burger Menu Component */}
            <BurgerMenu user={user} />
          </div>

        </div>
      </header>

      {/* --- SECTIONS --- */}
      {/* Added ID wrapper for scroll targeting */}
      <div id="home">
        <HomePage onGetStarted={handleGetStarted} />
      </div>
      
      {/* Note: Ensure these components accept className or style props if you need further spacing adjustments */}
      <div id="explore">
        <Properties />
      </div>
      <Service onGetStarted={handleGetStarted} />
      <About />
    
    </div>
  );
}

// --- BURGER MENU COMPONENT ---
function BurgerMenu({ user }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef();
  const { theme, setTheme, effectiveTheme } = usePreferences();

  const toggleTheme = () => {
    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  };

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
        className="ml-2 flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-sm"
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 animate-fade-in overflow-hidden">
          {/* Mobile Login/Dashboard Link */}
          <div className="lg:hidden border-b border-gray-100 dark:border-gray-700">
             {user ? (
                <a href="/dashboard" className="block px-4 py-3 text-green-600 dark:text-green-500 font-bold hover:bg-green-50 dark:hover:bg-green-900/30">
                   Dashboard
                </a>
             ) : (
                <a href="/login" className="block px-4 py-3 text-green-600 dark:text-green-500 font-bold hover:bg-green-50 dark:hover:bg-green-900/30">
                   Sign In
                </a>
             )}
          </div>
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 text-gray-800 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-700 font-semibold border-b border-gray-100 dark:border-gray-700"
          >
            <span className="flex items-center gap-2">
              {effectiveTheme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              {effectiveTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
          
          <a
            href="/become-landlord"
            className="block px-4 py-3 text-gray-800 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-700 hover:text-green-700 dark:hover:text-green-500 font-semibold"
            onClick={() => setOpen(false)}
          >
            Become a Landlord
          </a>
          <a
            href="/help"
            className="block px-4 py-3 text-gray-800 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-700 hover:text-green-700 dark:hover:text-green-500 font-semibold"
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