import React, { useEffect, useState, useRef } from "react";
import logo from '../../assets/Logo.png';
import HomePage from './HomePage';
import Properties from './Properties';
import Service from './Service';
import About from './About';
import Footer from '../../components/Shared/Footer';
import { usePreferences } from '../../contexts/PreferencesContext';
import { Sun, Moon, Menu } from 'lucide-react';

const LandingPage = ({ user }) => {
  const { theme, setTheme, effectiveTheme } = usePreferences();

  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('global-styles')) {
      const style = document.createElement('style');
      style.id = 'global-styles';
      style.innerHTML = `
        html { scroll-behavior: smooth; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const handleGetStarted = () => {
    window.location.href = "/browse-properties";
  };

  // Precisely offset scroll by the sticky header's actual height
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    const header = document.querySelector('header');
    if (!el) return;
    const headerHeight = header ? header.getBoundingClientRect().height : 56;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div id="top" className="min-h-screen font-sans bg-gray-50 dark:bg-gray-900">

      {/* --- HEADER (Sticky) --- */}
      <header className="sticky top-0 z-50 w-full transition-all duration-300 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-sm">
        <div className="relative w-full max-w-7xl mx-auto h-14 md:h-18 px-4 md:px-8 flex items-center justify-between">

          {/* Left: Logo */}
          <div className="flex items-center flex-none z-20">
            <a
              href="#top"
              className="flex items-center gap-2.5 md:gap-2 no-underline group"
              onClick={e => { e.preventDefault(); scrollTo('home'); }}
            >
              <img src={logo} alt="AccommoTrack Logo" className="h-7 w-7 md:h-10 md:w-10 transition-transform group-hover:rotate-12" />
              <span className="hidden lg:block font-bold text-xl xl:text-2xl no-scale text-green-600 dark:text-green-600 group-hover:text-green-700 dark:group-hover:text-green-500 transition-colors">
                AccommoTrack
              </span>
            </a>
          </div>

          {/* Center Mobile/Tablet: Title */}
          <div className="lg:hidden absolute left-0 right-0 top-1/2 transform -translate-y-1/2 z-10 text-center pointer-events-none">
            <span className="font-bold text-lg md:text-2xl no-scale text-green-600 dark:text-green-600 pointer-events-auto">
              AccommoTrack
            </span>
          </div>

          {/* Center Desktop: Navigation */}
          <nav className="hidden lg:flex items-center gap-2 flex-1 justify-center z-20">
            {['Home', 'Explore', 'Service', 'About'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="px-4 py-2.5 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all duration-200"
                onClick={e => { e.preventDefault(); scrollTo(item.toLowerCase()); }}
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Right: Login + Burger */}
          <div className="flex items-center gap-2.5 md:gap-2 flex-none relative z-20">
            {user ? (
              <a href="/dashboard" className="hidden lg:flex items-center justify-center px-6 py-2 text-sm font-bold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 hover:shadow-md transition-all duration-200 transform active:scale-95">
                Dashboard
              </a>
            ) : (
              <a href="/login" className="hidden lg:flex items-center justify-center px-6 py-2 text-sm font-bold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 hover:shadow-md transition-all duration-200 transform active:scale-95">
                Sign in
              </a>
            )}

            <BurgerMenu
              user={user}
              theme={theme}
              setTheme={setTheme}
              effectiveTheme={effectiveTheme}
              scrollTo={scrollTo}
            />

            <button
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              className={`hidden lg:inline-flex relative h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                effectiveTheme === 'dark' ? 'bg-gray-700' : 'bg-green-100'
              }`}
              title={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span className="sr-only">Toggle theme</span>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out flex items-center justify-center ${
                effectiveTheme === 'dark' ? 'translate-x-8' : 'translate-x-1'
              }`}>
                {effectiveTheme === 'dark' ? <Moon className="w-3 h-3 text-gray-700" /> : <Sun className="w-3 h-3 text-orange-500" />}
              </span>
            </button>
          </div>

        </div>
      </header>

      {/* --- SECTIONS ---
          Plain divs with just the id — zero height/margin constraints.
          scrollTo() handles the header offset mathematically, so sections
          land flush under the header on every screen size automatically.
      -->*/}
      <div id="home">
        <HomePage onGetStarted={handleGetStarted} />
      </div>
      <div id="explore">
        <Properties />
      </div>
      <div id="service">
        <Service onGetStarted={handleGetStarted} />
      </div>
      <div id="about">
        <About />
      </div>
      <Footer />

    </div>
  );
};

// --- BURGER MENU COMPONENT ---
function BurgerMenu({ user, setTheme, effectiveTheme, scrollTo }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleNavClick = (id) => {
    setOpen(false);
    setTimeout(() => scrollTo(id), 50);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="ml-2 md:ml-2 flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-sm"
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Menu className="w-5 h-5 md:w-6 md:h-6" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 animate-fade-in overflow-hidden">
          {/* Mobile Login/Dashboard */}
          <div className="lg:hidden border-b border-gray-100 dark:border-gray-700">
            {user ? (
              <a href="/dashboard" className="block px-4 py-4 text-green-600 dark:text-green-500 font-bold hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                Dashboard
              </a>
            ) : (
              <a href="/login" className="block px-4 py-4 text-green-600 dark:text-green-500 font-bold hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                Sign In
              </a>
            )}
          </div>

          {/* Mobile Nav Links */}
          <div className="lg:hidden border-b border-gray-100 dark:border-gray-700">
            {['Home', 'Explore', 'Service', 'About'].map((item) => (
              <button
                key={item}
                onClick={() => handleNavClick(item.toLowerCase())}
                className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-700 hover:text-green-700 dark:hover:text-green-500 font-semibold transition-colors text-sm"
              >
                {item}
              </button>
            ))}
          </div>

          <a
            href="/become-landlord"
            className="block px-4 py-4 text-gray-800 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-700 hover:text-green-700 dark:hover:text-green-500 font-semibold transition-colors"
            onClick={() => setOpen(false)}
          >
            Become a Landlord
          </a>
          <a
            href="/help"
            className="block px-4 py-4 text-gray-800 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-700 hover:text-green-700 dark:hover:text-green-500 font-semibold border-b border-gray-100 dark:border-gray-700 transition-colors"
            onClick={() => setOpen(false)}
          >
            Help
          </a>

          {/* Theme Toggle */}
          <div className="lg:hidden px-4 py-4 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Appearance</span>
            <button
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                effectiveTheme === 'dark' ? 'bg-gray-700' : 'bg-green-100'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out flex items-center justify-center ${
                effectiveTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'
              }`}>
                {effectiveTheme === 'dark' ? <Moon className="w-2.5 h-2.5 text-gray-700" /> : <Sun className="w-2.5 h-2.5 text-orange-500" />}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;