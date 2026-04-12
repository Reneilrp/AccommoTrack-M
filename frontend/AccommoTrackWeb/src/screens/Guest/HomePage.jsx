import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, ArrowRight, ShieldCheck,
  CircleDollarSign, Smartphone,
} from 'lucide-react';
import { useUIState } from '../../contexts/UIStateContext';
import SwipeHint from '../../components/Shared/SwipeHint';

/* ─── tiny scroll-triggered reveal hook ─── */
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

/* ─── property type cards ─── */
const PROPERTY_TYPES = [
  {
    label: 'Bed Spacer',
    price: '₱1,200/mo',
    img: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
    gradient: 'from-sky-900/70 to-sky-600/30',
  },
  {
    label: 'Dormitories',
    price: '₱1,500/mo',
    img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=600&q=80',
    gradient: 'from-indigo-900/70 to-indigo-600/30',
  },
  {
    label: 'Boarding Houses',
    price: '₱2,500/mo',
    img: 'https://images.unsplash.com/photo-1596276020587-8044fe049813?auto=format&fit=crop&w=600&q=80',
    gradient: 'from-emerald-900/70 to-emerald-600/30',
  },
  {
    label: 'Apartments',
    price: '₱5,000/mo',
    img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80',
    gradient: 'from-orange-900/70 to-orange-600/30',
  },
];

/* ─── why-cards ─── */
const WHY_CARDS = [
  {
    icon: MapPin,
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600',
    title: 'Near Campus',
    desc: 'Filter by distance to WMSU, Ateneo, and other major universities to save on commute time.',
  },
  {
    icon: ShieldCheck,
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    title: 'Verified Landlords',
    desc: 'Every listing is reviewed by our team to ensure your safety and prevent scams.',
  },
  {
    icon: CircleDollarSign,
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-500',
    title: 'Affordable Rates',
    desc: 'Find rooms that fit your budget without compromising on quality or safety.',
  },
];

const HomePage = ({ onGetStarted }) => {
  const navigate = useNavigate();
  const { updateScreenState } = useUIState();

  const [whyRef, whyVisible]   = useInView();
  const [typeRef, typeVisible] = useInView();

  const handlePropertyTypeClick = useCallback((type) => {
    updateScreenState('explore', { selectedType: type, currentPage: 1 });
    navigate('/browse-properties');
  }, [navigate, updateScreenState]);

  return (
    <>
      <style>{`
        @keyframes blob-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(20px, -15px) scale(1.05); }
          66%       { transform: translate(-10px, 10px) scale(0.97); }
        }
        .blob { animation: blob-drift 10s infinite ease-in-out; }
        .blob-delay { animation-delay: -4s; }

        @keyframes hero-up {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-line { animation: hero-up .65s cubic-bezier(.22,1,.36,1) both; }

        .card-reveal {
          transition: opacity .6s ease, transform .6s cubic-bezier(.22,1,.36,1);
        }
        .card-reveal.hidden-card { opacity: 0; transform: translateY(24px); }
        .card-reveal.shown-card  { opacity: 1; transform: translateY(0); }
      `}</style>

      {/* ══════════════ HERO ══════════════ */}
      <section className="relative h-[calc(100vh-56px)] md:h-[calc(100vh-72px)] w-full flex flex-col items-center px-6 max-w-7xl mx-auto overflow-hidden py-8 md:py-0 bg-gray-50 dark:bg-gray-900">

        {/* Background blobs */}
        <div className="absolute top-[8%] left-[4%] w-56 h-56 md:w-80 md:h-80 bg-green-200 dark:bg-green-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-25 dark:opacity-10 blob pointer-events-none" />
        <div className="absolute top-[12%] right-[4%] w-56 h-56 md:w-72 md:h-72 bg-blue-200 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10 blob blob-delay pointer-events-none" />

        {/* Main copy */}
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-[900px] z-10 w-full py-8 md:py-16">

          <div className="hero-line" style={{ animationDelay: '0ms' }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Now serving Zamboanga City students
            </span>
          </div>

          <h1
            className="hero-line text-[clamp(32px,7vw,64px)] lg:text-7xl font-bold leading-[1.08] mb-6 tracking-tight text-gray-900 dark:text-white"
            style={{ animationDelay: '80ms' }}
          >
            Find Your Next <br className="md:hidden" />
            Home{' '}
            <br className="hidden md:block" />
            <span className="text-green-600">in Zamboanga City.</span>
          </h1>

          <p
            className="hero-line text-sm md:text-xl text-gray-500 dark:text-gray-400 max-w-[580px] mx-auto mb-10 leading-relaxed"
            style={{ animationDelay: '160ms' }}
          >
            Discover and book student-friendly dorms, apartments, and boarding houses.
            Verified landlords, secure payments, and zero hassle.
          </p>

          <div
            className="hero-line flex flex-col sm:flex-row justify-center gap-4 w-full max-w-xs md:max-w-md mx-auto"
            style={{ animationDelay: '240ms' }}
          >
            <button
              onClick={onGetStarted}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-4 min-h-[52px] text-base font-bold rounded-xl shadow-lg shadow-green-600/20 hover:bg-green-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-200"
            >
              Browse Properties <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/mobile-app')}
              className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-6 py-4 min-h-[52px] text-base font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-all duration-200"
            >
              Get the App <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* University logos */}
        <div
          className="hero-line w-full z-10 pb-10 md:pb-14 flex-none"
          style={{ animationDelay: '340ms' }}
        >
          <p className="text-center text-[10px] md:text-xs font-bold uppercase mb-5 text-gray-400 dark:text-gray-500 tracking-widest">
            Built for students from
          </p>
          <div className="flex justify-center gap-8 md:gap-16 flex-wrap">
            {[
              { name: 'WMSU',  color: 'text-[#DC143C] dark:text-red-400' },
              { name: 'ADZU',  color: 'text-sky-500 dark:text-sky-400' },
              { name: 'UZ',    color: 'text-green-600 dark:text-green-400' },
              { name: 'ZPPSU', color: 'text-[#800000] dark:text-red-500' },
            ].map(u => (
              <span key={u.name} className={`text-lg md:text-xl font-extrabold tracking-tight ${u.color}`}>
                {u.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ WHY ACCOMMOTRACK ══════════════ */}
      <section ref={whyRef} className="w-full py-24 md:py-32 px-6 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div
            className={`text-center mb-14 transition-all duration-700 ${whyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              Why use AccommoTrack?
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              We give you the tools to find a safe, affordable, and convenient place to stay while you focus on your studies.
            </p>
          </div>

          {/* Cards — horizontal scroll on mobile, grid on md+ */}
          <div className="flex flex-row md:grid md:grid-cols-3 gap-5 md:gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide p-2 md:p-0">
            {WHY_CARDS.map((c, i) => (
              <div
                key={c.title}
                className={`card-reveal flex-none w-[82%] sm:w-[55%] md:w-auto snap-center ${whyVisible ? 'shown-card' : 'hidden-card'}`}
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <div className="bg-white dark:bg-gray-800 rounded-[28px] p-8 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center h-full">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${c.color}`}>
                    <c.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{c.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm md:text-base">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <SwipeHint />
        </div>
      </section>

      {/* ══════════════ ACCOMMODATION TYPES ══════════════ */}
      <section ref={typeRef} className="w-full py-24 md:py-32 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className={`flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 transition-all duration-700 ${typeVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">
              Find Your Space
            </h2>
            <button
              onClick={onGetStarted}
              className="group flex items-center gap-2 text-green-600 font-bold hover:text-green-700 transition-colors text-sm"
            >
              View All Properties <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800/50 rounded-3xl p-6 md:px-10 md:py-8 border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/30 dark:shadow-none">
            <div className="flex flex-row md:grid md:grid-cols-2 lg:grid-cols-4 gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide p-2 md:p-0">
              {PROPERTY_TYPES.map((pt, i) => (
                <div
                  key={pt.label}
                  className={`card-reveal group cursor-pointer flex-none w-[78%] sm:w-[48%] md:w-auto snap-center ${typeVisible ? 'shown-card' : 'hidden-card'}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                  onClick={() => handlePropertyTypeClick(pt.label === 'Dormitories' ? 'Dormitory' : pt.label === 'Boarding Houses' ? 'Boarding House' : pt.label)}
                >
                  <div className="h-[320px] rounded-2xl overflow-hidden relative shadow-sm group-hover:shadow-xl transition-all duration-300">
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                    <img
                      src={pt.img}
                      alt={pt.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${pt.gradient} z-10`} />
                    <div className="absolute bottom-5 left-5 z-20 text-left">
                      <h3 className="text-2xl font-bold text-white mb-1">{pt.label}</h3>
                      <p className="text-white/85 text-sm font-medium">Starts at {pt.price}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <SwipeHint />
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;