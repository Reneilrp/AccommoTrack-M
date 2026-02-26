import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, MessageCircle, Phone, HelpCircle, BookOpen, Clock } from 'lucide-react';
import InquiryModal from '../../components/Modals/InquiryModal';
import { helpService } from '../../services/helpService';

const Help = () => {
  const navigate = useNavigate();
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);

  useEffect(() => {
    const fetchFaqs = async () => {
      setLoadingFaqs(true);
      try {
        const data = await helpService.getFAQs();
        setFaqs(data);
      } catch (error) {
        console.error('Failed to load FAQs:', error);
      } finally {
        setLoadingFaqs(false);
      }
    };
    fetchFaqs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 md:h-18 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-600 dark:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Help & Support</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">How can we help you?</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Find answers to common questions or get in touch with our support team.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <a 
            href="mailto:support@accommotrack.com"
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Email Us</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Get a response within 24 hours</p>
            <span className="text-green-600 dark:text-green-500 text-sm font-medium">support@accommotrack.com</span>
          </a>

          <div 
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all group cursor-pointer"
            onClick={() => {
              const user = localStorage.getItem('user') || localStorage.getItem('userData');
              if (user) {
                navigate('/messages');
              } else {
                setShowInquiryModal(true);
              }
            }}
          >
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-500" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Message Support</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Leave us a message</p>
            <span className="text-green-600 dark:text-green-500 text-sm font-medium">Replies typically in 1-2 hours</span>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-green-600 dark:text-green-500" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Frequently Asked Questions</h3>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {loadingFaqs ? (
              <div className="p-6 text-center text-gray-500">Loading FAQs...</div>
            ) : faqs.map((faq, index) => (
              <div key={index} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{faq.question}</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>We are here to help you 24/7!</span>
          </div>
        </div>
      </main>

      {/* Inquiry Modal */}
      {showInquiryModal && <InquiryModal onClose={() => setShowInquiryModal(false)} />}
    </div>
  );
};

export default Help;
