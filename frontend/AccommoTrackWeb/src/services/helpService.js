import { cacheManager } from '../utils/cache';

const CACHE_KEYS = {
    FAQS: 'help_faqs'
};

// Static FAQ data that could come from an API in the future
const STATIC_FAQS = [
    {
      question: "How do I book a property?",
      answer: "Browse properties, select a room, and click 'Book Now'. You'll need to create an account or login to complete your booking."
    },
    {
      question: "How do I become a landlord?",
      answer: "Click on 'Become a Landlord' in the menu and complete the registration process with your valid ID and business permit."
    },
    {
      question: "What payment methods are accepted?",
      answer: "We accept GCash and Cash only for payments."
    },
    {
      question: "How can I contact my landlord?",
      answer: "Once logged in, you can message your landlord directly through the Messages section in your dashboard."
    }
];

export const helpService = {
    /**
     * Get FAQs with caching
     */
    async getFAQs() {
        try {
            const cached = cacheManager.get(CACHE_KEYS.FAQS);
            if (cached) return cached;

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const data = STATIC_FAQS;
            
            // Cache for 1 hour since help data changes rarely
            cacheManager.set(CACHE_KEYS.FAQS, data, 1000 * 60 * 60);
            
            return data;
        } catch (error) {
            console.error('Error fetching FAQs:', error);
            return STATIC_FAQS;
        }
    }
};
