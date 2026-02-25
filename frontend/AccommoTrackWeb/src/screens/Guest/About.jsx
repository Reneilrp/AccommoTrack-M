import React from 'react';

const About = () => (
  <section id="about" className="py-24 px-6 max-w-7xl mx-auto">
    <div className="bg-white dark:bg-gray-800 rounded-[40px] p-8 md:p-16 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
      <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-full text-sm font-bold mb-6 inline-block">
        OUR STORY
      </span>
      <h2 className="text-[clamp(32px,4vw,48px)] font-extrabold text-gray-900 dark:text-white mb-8">
        About AccommoTrack
      </h2>
      <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-[800px] mx-auto mb-16 leading-relaxed">
        AccommoTrack is your trusted platform for finding, comparing, and booking the best properties in our city. We make property management and searching simple, secure, and efficient for both tenants and landlords.
      </p>
      
      <div className="flex flex-col md:grid md:grid-cols-3 gap-6 md:gap-10 max-h-[400px] md:max-h-none overflow-y-auto md:overflow-y-visible snap-y snap-mandatory no-scrollbar p-1">
        <div className="flex-none w-full md:w-auto snap-start text-center p-6 rounded-3xl hover:bg-[#FDF8F0] dark:hover:bg-gray-700 transition-colors duration-300 bg-gray-50/50 dark:bg-gray-900/20 md:bg-transparent">
          <div className="text-5xl mb-6">🎯</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Our Mission</h3>
          <p className="text-gray-600 dark:text-gray-300">Empowering tenants and landlords with seamless, secure, and transparent property solutions.</p>
        </div>

        <div className="flex-none w-full md:w-auto snap-start text-center p-6 rounded-3xl hover:bg-[#FDF8F0] dark:hover:bg-gray-700 transition-colors duration-300 bg-gray-50/50 dark:bg-gray-900/20 md:bg-transparent">
          <div className="text-5xl mb-6">🤝</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Our Team</h3>
          <p className="text-gray-600 dark:text-gray-300">A passionate group of students from WMSU dedicated to creating innovative property solutions.</p>
        </div>

        <div className="flex-none w-full md:w-auto snap-start text-center p-6 rounded-3xl hover:bg-[#FDF8F0] dark:hover:bg-gray-700 transition-colors duration-300 bg-gray-50/50 dark:bg-gray-900/20 md:bg-transparent">
          <div className="text-5xl mb-6">💡</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Our Values</h3>
          <p className="text-gray-600 dark:text-gray-300">Integrity, innovation, and customer focus drive everything we do at AccommoTrack.</p>
        </div>
      </div>
    </div>
  </section>
);

export default About;