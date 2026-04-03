import React from 'react';

const Service = ({ onGetStarted }) => (
  <section className="min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-72px)] flex flex-col justify-center py-12 px-6 bg-[#FDF8F0] dark:bg-gray-900 text-center">
    <div className="max-w-7xl mx-auto w-full">
      <span className="bg-[#ffedd5] dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-4 py-2 rounded-full text-sm font-bold mb-6 inline-block border border-orange-200/50 dark:border-orange-800/50">
        WHAT WE DO
      </span>
      <h2 className="text-[clamp(32px,4vw,48px)] font-extrabold text-gray-900 dark:text-white mb-6">
        Our Services
      </h2>
      <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-[700px] mx-auto mb-12 leading-relaxed">
        AccommoTrack offers a suite of tools for tenants and landlords to make property management, searching, and booking seamless and secure.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-12">
        <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
          <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🔍</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Property Search</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Find and compare rooms with advanced filters and real-time availability.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
          <div className="bg-green-50 dark:bg-green-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">📝</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Easy Booking</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Book your preferred room instantly and securely with transparent pricing.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
          <div className="bg-purple-50 dark:bg-purple-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🏢</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Management</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Landlords can manage listings, bookings, and tenant profiles all in one place.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
          <div className="bg-orange-50 dark:bg-orange-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">💳</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Secure Payments</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">All transactions are encrypted and protected for complete peace of mind.</p>
        </div>
      </div>

      <button
        onClick={onGetStarted}
        className="bg-green-600 text-white px-10 py-4 text-lg font-bold rounded-full shadow-lg shadow-green-600/20 hover:bg-green-700 hover:scale-105 transition-all duration-200"
      >
        Get Started Now
      </button>
    </div>
  </section>
);

export default Service;