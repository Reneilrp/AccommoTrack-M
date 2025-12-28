import React from 'react';

const About = () => (
  <section id="about" className="py-24 px-6 max-w-7xl mx-auto">
    <div className="bg-white rounded-[40px] p-8 md:p-16 text-center border border-gray-100 shadow-sm">
      <span className="bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-bold mb-6 inline-block">
        OUR STORY
      </span>
      <h2 className="text-[clamp(32px,4vw,48px)] font-extrabold text-gray-900 mb-8">
        About AccommoTrack
      </h2>
      <p className="text-lg md:text-xl text-gray-600 max-w-[800px] mx-auto mb-16 leading-relaxed">
        AccommoTrack is your trusted platform for finding, comparing, and booking the best properties in your city. We make property management and searching simple, secure, and efficient for both tenants and landlords.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="text-center p-6 rounded-3xl hover:bg-[#FDF8F0] transition-colors duration-300">
          <div className="text-5xl mb-6">🎯</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Our Mission</h3>
          <p className="text-gray-600">Empowering tenants and landlords with seamless, secure, and transparent property solutions.</p>
        </div>

        <div className="text-center p-6 rounded-3xl hover:bg-[#FDF8F0] transition-colors duration-300">
          <div className="text-5xl mb-6">🤝</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Our Team</h3>
          <p className="text-gray-600">A passionate group of real estate, tech, and customer service professionals dedicated to success.</p>
        </div>

        <div className="text-center p-6 rounded-3xl hover:bg-[#FDF8F0] transition-colors duration-300">
          <div className="text-5xl mb-6">💡</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Our Values</h3>
          <p className="text-gray-600">Integrity, innovation, and customer focus drive everything we do at AccommoTrack.</p>
        </div>
      </div>
    </div>
  </section>
);

export default About;