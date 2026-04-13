import React, { useRef, useState, useEffect } from 'react';
import SwipeHint from '../../components/Shared/SwipeHint';

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

const CARDS = [
  {
    emoji: '🎯',
    title: 'Our Mission',
    desc: 'Empowering tenants and landlords with seamless, secure, and transparent property solutions.',
  },
  {
    emoji: '🤝',
    title: 'Our Team',
    desc: 'A passionate group of students from WMSU dedicated to creating innovative property solutions.',
  },
  {
    emoji: '💡',
    title: 'Our Values',
    desc: 'Integrity, innovation, and customer focus drive everything we do at AccommoTrack.',
  },
];

const About = () => {
  const [sectionRef, visible] = useInView(0.1);

  /* track active swipe card for dot indicator */
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / CARDS.length;
    setActiveIdx(Math.round(el.scrollLeft / cardWidth));
  };

  return (
    <section
      ref={sectionRef}
      className="min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-72px)] flex flex-col justify-center py-16 px-6 bg-gray-50 dark:bg-gray-900"
    >
      <div className="max-w-7xl mx-auto w-full">
        <div
          className={`bg-white dark:bg-gray-800 rounded-[40px] p-8 md:p-16 text-center border border-gray-100 dark:border-gray-700 shadow-md transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-gray-200 dark:border-gray-600 uppercase tracking-wider">
            Our Story
          </span>

          <h2 className="text-[clamp(28px,4vw,48px)] font-extrabold text-gray-900 dark:text-white mb-6">
            About AccommoTrack
          </h2>

          <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-[760px] mx-auto mb-12 leading-relaxed">
            AccommoTrack is your trusted platform for finding, comparing, and booking the best
            properties in our city. We make property management and searching simple, secure,
            and efficient for both tenants and landlords.
          </p>

          {/* Swipeable cards */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex flex-row md:grid md:grid-cols-3 gap-5 md:gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide p-2 md:p-0"
          >
            {CARDS.map((c, i) => (
              <div
                key={c.title}
                className="flex-none w-[82%] sm:w-[56%] md:w-auto snap-center text-center p-8 rounded-[28px] border border-gray-100 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/20 hover:bg-white dark:hover:bg-gray-700 hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity .65s ease ${100 + i * 100}ms, transform .65s cubic-bezier(.22,1,.36,1) ${100 + i * 100}ms, box-shadow .25s, translate .25s`,
                }}
              >
                <div className="text-5xl mb-5">{c.emoji}</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{c.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Dot indicator — mobile only */}
          <div className="md:hidden mt-5 flex items-center justify-center gap-2">
            {CARDS.map((_, i) => (
              <span
                key={i}
                className={`block rounded-full transition-all duration-300 ${
                  i === activeIdx
                    ? 'w-5 h-2 bg-green-500'
                    : 'w-2 h-2 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          <SwipeHint />
        </div>
      </div>
    </section>
  );
};

export default About;