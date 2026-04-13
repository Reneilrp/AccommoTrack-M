import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, MessageCircle,
  HelpCircle, BookOpen, Clock, ChevronDown,
} from 'lucide-react';
import InquiryModal from '../../components/Modals/InquiryModal';
import { helpService } from '../../services/helpService';
import Footer from '../../components/Shared/Footer';

/* ─── tiny scroll-reveal hook ─── */
function useInView(threshold = 0.1) {
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

/* ─── Accordion item ─── */
const FaqItem = ({ faq, isOpen, onToggle }) => (
  <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
    <button
      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
      onClick={onToggle}
      aria-expanded={isOpen}
    >
      <span className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">
        {faq.question}
      </span>
      <ChevronDown
        className={`w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>

    {/* Animated answer panel */}
    <div
      style={{
        maxHeight: isOpen ? '400px' : '0',
        overflow: 'hidden',
        transition: 'max-height .35s cubic-bezier(.4,0,.2,1)',
      }}
    >
      <p className="px-6 pb-5 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
        {faq.answer}
      </p>
    </div>
  </div>
);

/* ─── Contact card ─── */
const ContactCard = ({ icon: Icon, title, sub, cta, onClick, href }) => {
  const inner = (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg transition-all group cursor-pointer h-full">
      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="font-bold text-gray-900 dark:text-white mb-1.5">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{sub}</p>
      <span className="text-green-600 dark:text-green-500 text-sm font-semibold">{cta}</span>
    </div>
  );

  if (href) {
    return <a href={href} className="block">{inner}</a>;
  }
  return <div onClick={onClick}>{inner}</div>;
};

/* ─── Main ─── */
const Help = () => {
  const navigate = useNavigate();
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [faqs, setFaqs]             = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [openIdx, setOpenIdx]       = useState(null);

  const [heroRef, heroVisible]   = useInView();
  const [cardsRef, cardsVisible] = useInView();
  const [faqRef, faqVisible]     = useInView();

  useEffect(() => {
    const fetchFaqs = async () => {
      setLoadingFaqs(true);
      try {
        const data = await helpService.getFAQs();
        setFaqs(data);
      } catch (err) {
        console.error('Failed to load FAQs:', err);
      } finally {
        setLoadingFaqs(false);
      }
    };
    fetchFaqs();
  }, []);

  const handleMessageClick = () => {
    const user = localStorage.getItem('user') || localStorage.getItem('userData');
    if (user) navigate('/messages');
    else setShowInquiryModal(true);
  };

  const toggleFaq = (i) => setOpenIdx(prev => (prev === i ? null : i));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-600 dark:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Help & Support</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">

        {/* Hero */}
        <div
          ref={heroRef}
          className={`text-center mb-12 transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <HelpCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            How can we help you?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm leading-relaxed">
            Find answers to common questions or get in touch with our support team.
          </p>
        </div>

        {/* Contact cards */}
        <div
          ref={cardsRef}
          className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 transition-all duration-700 ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <ContactCard
            icon={Mail}
            title="Email Us"
            sub="Get a response within 24 hours"
            cta="support@accommotrack.com"
            href="mailto:support@accommotrack.com"
          />
          <ContactCard
            icon={MessageCircle}
            title="Message Support"
            sub="Leave us a message"
            cta="Replies typically in 1–2 hours"
            onClick={handleMessageClick}
          />
        </div>

        {/* FAQ accordion */}
        <div
          ref={faqRef}
          className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-700 ${faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Frequently Asked Questions
            </h3>
          </div>

          {loadingFaqs && (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
              Loading FAQs…
            </div>
          )}

          {!loadingFaqs && faqs.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">
                No FAQs available yet. Check back soon!
              </p>
            </div>
          )}

          {!loadingFaqs && faqs.length > 0 && faqs.map((faq, i) => (
            <FaqItem
              key={i}
              faq={faq}
              isOpen={openIdx === i}
              onToggle={() => toggleFaq(i)}
            />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Our team is available to help you 24/7.</span>
          </div>
        </div>

      </main>

      {showInquiryModal && <InquiryModal onClose={() => setShowInquiryModal(false)} />}
      <Footer />
    </div>
  );
};

export default Help;