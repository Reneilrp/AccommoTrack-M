import React, { useState, useEffect } from 'react';
import { Mail, MessageCircle, HelpCircle, BookOpen, Clock } from 'lucide-react';
import { helpService } from '../../services/helpService';

const TenantSupport = () => {
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
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-4">
      {/* Header Section */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">How can we help you?</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Find answers to common questions or get in touch with our support team.
        </p>
      </div>

      {/* Support Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a 
          href="mailto:support@accommotrack.com"
          className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all group block"
        >
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Email Us</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Get a response within 24 hours</p>
          <span className="text-green-600 dark:text-green-500 text-sm font-medium">support@accommotrack.com</span>
        </a>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-500" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Live Chat</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Chat with a support agent</p>
          <span className="text-green-600 dark:text-green-500 text-sm font-medium">Typically replies in 1-2 hours</span>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <BookOpen className="w-5 h-5 text-green-600 dark:text-green-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Frequently Asked Questions</h3>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loadingFaqs ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading FAQs...</div>
          ) : faqs.map((faq, index) => (
            <div key={index} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{faq.question}</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pt-4">
        <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
          <Clock className="w-4 h-4" />
          <span>We are here to help you 24/7!</span>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
};

export default TenantSupport;
