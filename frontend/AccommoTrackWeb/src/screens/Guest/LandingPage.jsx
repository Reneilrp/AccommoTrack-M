import React, { useEffect, useState, useRef } from "react";
import logo from '../../assets/Logo.png';
import HomePage from './HomePage';
import Properties from './Properties';
import Service from './Service';
import About from './About';
import { usePreferences } from '../../contexts/PreferencesContext';
import { Sun, Moon, Menu } from 'lucide-react';

const LandingPage = ({ user }) => {
  const { theme, setTheme, effectiveTheme } = usePreferences();

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
              onClick={e => { 
                e.preventDefault(); 
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <img src={logo} alt="AccommoTrack Logo" className="h-10 w-10 transition-transform group-hover:rotate-12" />
              {/* Text hidden on mobile/tablet (lg:block) */}
              <span className="hidden lg:block font-black text-[28px] no-scale tracking-tighter text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-500 transition-colors">
                AccommoTrack
              </span>
            </a>
          </div>

          {/* Center Mobile/Tablet: Text Title (Absolute Center) */}
          <div className="lg:hidden absolute left-0 right-0 top-1/2 transform -translate-y-1/2 z-10 text-center pointer-events-none">
             <span className="font-black text-[28px] no-scale tracking-tighter text-gray-900 dark:text-white pointer-events-auto">
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
            <BurgerMenu 
              user={user} 
              theme={theme} 
              setTheme={setTheme} 
              effectiveTheme={effectiveTheme} 
            />

            {/* Theme Toggle - Hidden on mobile/tablet, shown only on desktop (lg:flex) */}
            <button
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              className={`hidden lg:inline-flex relative h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                effectiveTheme === 'dark' ? 'bg-gray-700' : 'bg-green-100'
              }`}
              title={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span className="sr-only">Toggle theme</span>
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out flex items-center justify-center ${
                  effectiveTheme === 'dark' ? 'translate-x-9' : 'translate-x-1'
                }`}
              >
                {effectiveTheme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-gray-700" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-orange-500" />
                )}
              </span>
            </button>
          </div>

        </div>
      </header>

      {/* --- SECTIONS --- */}
      {/* Added ID wrapper for scroll targeting with offset for sticky header */}
      <div id="home" className="scroll-mt-20">
        <HomePage onGetStarted={handleGetStarted} />
      </div>
      
      {/* Note: Ensure these components accept className or style props if you need further spacing adjustments */}
      <div id="explore" className="scroll-mt-20">
        <Properties />
      </div>
      <div id="service" className="scroll-mt-20">
        <Service onGetStarted={handleGetStarted} />
      </div>
      <div id="about" className="scroll-mt-20">
        <About />
      </div>
    
    </div>
  );
}

// --- BURGER MENU COMPONENT ---
function BurgerMenu({ user, theme, setTheme, effectiveTheme }) {
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
        className="ml-2 flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-sm"
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Menu className="w-6 h-6" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 animate-fade-in overflow-hidden">
          {/* Mobile Login/Dashboard Link */}
          <div className="lg:hidden border-b border-gray-100 dark:border-gray-700">
             {user ? (
                <a href="/dashboard" className="block px-4 py-3 text-green-600 dark:text-green-500 font-bold hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                   Dashboard
                </a>
             ) : (
                <a href="/login" className="block px-4 py-3 text-green-600 dark:text-green-500 font-bold hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                   Sign In
                </a>
             )}
          </div>
          
          <a
            href="/become-landlord"
            className="block px-4 py-3 text-gray-800 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-700 hover:text-green-700 dark:hover:text-green-500 font-semibold transition-colors"
            onClick={() => setOpen(false)}
          >
            Become a Landlord
          </a>
          <a
            href="/help"
            className="block px-4 py-3 text-gray-800 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-700 hover:text-green-700 dark:hover:text-green-500 font-semibold border-b border-gray-100 dark:border-gray-700 transition-colors"
            onClick={() => setOpen(false)}
          >
            Help
          </a>

          {/* Theme Toggle in Burger Menu (Mobile Only) */}
          <div className="lg:hidden px-4 py-3 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Appearance</span>
            <button
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                effectiveTheme === 'dark' ? 'bg-gray-700' : 'bg-green-100'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out flex items-center justify-center ${
                  effectiveTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              >
                {effectiveTheme === 'dark' ? (
                  <Moon className="w-2.5 h-2.5 text-gray-700" />
                ) : (
                  <Sun className="w-2.5 h-2.5 text-orange-500" />
                )}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;