import cacheManager from '../utils/cache.js';

const CACHE_KEYS = {
  FAQS: 'help_faqs',
};

const STATIC_FAQS = [
  {
    id: 1,
    question: 'How do I book a property?',
    answer:
      "Browse properties, select a room, and click 'Book Now'. You'll need to create an account or login to complete your booking.",
  },
  {
    id: 2,
    question: 'How do I become a landlord?',
    answer:
      "Click on 'Become a Landlord' in the menu and complete the registration process with your valid ID and business permit.",
  },
  {
    id: 3,
    question: 'What payment methods are accepted?',
    answer: 'We accept GCash and Cash only for payments.',
  },
  {
    id: 4,
    question: 'How can I contact my landlord?',
    answer:
      'Once logged in, you can message your landlord directly through the Messages section in your dashboard.',
  },
];

export const helpService = {
  async getFAQs() {
    try {
      const cached = await cacheManager.get(CACHE_KEYS.FAQS);
      if (cached) {
        return cached;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      await cacheManager.set(CACHE_KEYS.FAQS, STATIC_FAQS, 1000 * 60 * 60);
      return STATIC_FAQS;
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      return STATIC_FAQS;
    }
  },
};
