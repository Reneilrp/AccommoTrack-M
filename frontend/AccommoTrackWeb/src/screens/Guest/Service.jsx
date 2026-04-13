import React, { useRef, useState, useEffect } from 'react';
import { Search, FileText, Building2, CreditCard } from 'lucide-react';

/* ─── tiny scroll-reveal hook ─── */
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

const SERVICES = [
  {
    icon: Search,
    iconBg: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    title: 'Property Search',
    desc: 'Find and compare rooms with advanced filters and real-time availability.',
  },
  {
    icon: FileText,
    iconBg: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    title: 'Easy Booking',
    desc: 'Book your preferred room instantly and securely with transparent pricing.',
  },
  {
    icon: Building2,
    iconBg: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    title: 'Management',
    desc: 'Landlords can manage listings, bookings, and tenant profiles all in one place.',
  },
  {
    icon: CreditCard,
    iconBg: 'bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400',
    title: 'Secure Payments',
    desc: 'All transactions are encrypted and protected for complete peace of mind.',
  },
];

const Service = ({ onGetStarted }) => {
  const [headRef, headVisible] = useInView();
  const [gridRef, gridVisible] = useInView(0.08);

  return (
    <section className="min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-72px)] flex flex-col justify-center py-16 px-6 bg-[#FDF8F0] dark:bg-gray-900 text-center">
      <div className="max-w-7xl mx-auto w-full">

        {/* Heading */}
        <div
          ref={headRef}
          className={`transition-all duration-700 ${headVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <span className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-orange-200/60 dark:border-orange-800/50 uppercase tracking-wider">
            What We Do
          </span>
          <h2 className="text-[clamp(28px,4vw,48px)] font-extrabold text-gray-900 dark:text-white mb-5">
            Our Services
          </h2>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-[640px] mx-auto mb-14 leading-relaxed">
            AccommoTrack offers a suite of tools for tenants and landlords to make property
            management, searching, and booking seamless and secure.
          </p>
        </div>

        {/* Cards */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 mb-14"
        >
          {SERVICES.map((s, i) => (
            <div
              key={s.title}
              className="bg-white dark:bg-gray-800 rounded-[28px] p-8 shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              style={{
                opacity: gridVisible ? 1 : 0,
                transform: gridVisible ? 'translateY(0)' : 'translateY(28px)',
                transition: `opacity .6s ease ${i * 90}ms, transform .6s cubic-bezier(.22,1,.36,1) ${i * 90}ms, box-shadow .25s, translate .25s`,
              }}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 ${s.iconBg}`}>
                <s.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{s.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className={`transition-all duration-700 delay-300 ${gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <button
            onClick={onGetStarted}
            className="bg-green-600 text-white px-10 py-4 text-base font-bold rounded-full shadow-lg shadow-green-600/20 hover:bg-green-700 hover:scale-105 hover:shadow-xl transition-all duration-200"
          >
            Get Started Now
          </button>
        </div>

      </div>
    </section>
  );
};

export default Service;