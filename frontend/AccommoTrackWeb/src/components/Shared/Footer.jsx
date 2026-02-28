import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="w-full bg-white dark:bg-gray-800/50 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 py-12 md:py-16 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
        {/* Left: Copyright */}
        <div className="flex flex-col items-center md:items-start gap-2 order-2 md:order-1">
          <div className="text-gray-900 dark:text-white font-bold text-lg mb-1">
            AccommoTrack
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} AccommoTrack. All rights reserved.
          </div>
        </div>

        {/* Center: Links */}
        <div className="flex flex-wrap justify-center gap-8 text-sm font-bold text-gray-600 dark:text-gray-300 order-1 md:order-2">
          <Link to="/help" className="hover:text-green-600 dark:hover:text-green-500 transition-all hover:scale-105 active:scale-95">
            Help Center
          </Link>
          <Link to="/help" className="hover:text-green-600 dark:hover:text-green-500 transition-all hover:scale-105 active:scale-95">
            Contact Support
          </Link>
        </div>

        {/* Right: DigitalOcean Logo */}
        <div className="flex flex-col items-center md:items-end gap-3 order-3">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            This project is supported by
          </span>
          <div className="transition-transform hover:scale-105 active:scale-95">
            <a href="https://www.digitalocean.com/" target="_blank" rel="noopener noreferrer" className="block">
              <img 
                src="https://opensource.nyc3.cdn.digitaloceanspaces.com/attribution/assets/PoweredByDO/DO_Powered_by_Badge_blue.svg" 
                alt="Powered by DigitalOcean"
                width="201px"
                className="drop-shadow-sm"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
