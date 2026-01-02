import React from 'react';

const Service = ({ onGetStarted }) => (
  <section
    id="service"
    className="py-24 px-6 bg-[#FDF8F0] text-center"
  >
    <div className="max-w-7xl mx-auto">
      <span className="bg-[#ffedd5] text-orange-800 px-4 py-2 rounded-full text-sm font-bold mb-6 inline-block">
        WHAT WE DO
      </span>
      <h2 className="text-[clamp(32px,4vw,48px)] font-extrabold text-gray-900 mb-6">
        Our Services
      </h2>
      <p className="text-lg md:text-xl text-gray-600 max-w-[700px] mx-auto mb-16 leading-relaxed">
        AccommoTrack offers a suite of tools for tenants and landlords to make property management, searching, and booking seamless and secure.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        {/* Service Card 1 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-2 transition-transform duration-300">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            🔍
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Property Search</h3>
          <p className="text-gray-600 leading-relaxed">Find and compare rooms with advanced filters and real-time availability.</p>
        </div>

        {/* Service Card 2 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-2 transition-transform duration-300">
          <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            📝
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Easy Booking</h3>
          <p className="text-gray-600 leading-relaxed">Book your preferred room instantly and securely with transparent pricing.</p>
        </div>

        {/* Service Card 3 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-2 transition-transform duration-300">
          <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            🏢
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Management</h3>
          <p className="text-gray-600 leading-relaxed">Landlords can manage listings, bookings, and tenant profiles all in one place.</p>
        </div>

        {/* Service Card 4 */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-2 transition-transform duration-300">
          <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            💳
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Secure Payments</h3>
          <p className="text-gray-600 leading-relaxed">All transactions are encrypted and protected for complete peace of mind.</p>
        </div>
      </div>

      <button
        onClick={onGetStarted}
        className="bg-green-600 text-white px-10 py-4 text-lg font-bold rounded-full shadow-lg hover:bg-green-700 hover:scale-105 transition-all duration-200"
      >
        Get Started Now
      </button>
    </div>
  </section>
);

export default Service;