import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ReviewModal = ({ booking, onClose, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  // Optional: Granular ratings (simplified for now, backend supports them)
  // const [cleanliness, setCleanliness] = useState(0);
  // ...

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/reviews', {
        booking_id: booking.id,
        rating,
        comment,
        // Default granular ratings to overall if not provided, or leave null
        cleanliness_rating: rating,
        location_rating: rating,
        value_rating: rating,
        communication_rating: rating
      });
      
      toast.success('Review submitted successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Review submission failed:', err);
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Write a Review</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">How was your stay at</p>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{booking.property.title}</h4>
            
            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star 
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300 dark:text-gray-600'
                    } transition-colors`} 
                  />
                </button>
              ))}
            </div>
            <p className="text-sm font-medium text-yellow-500 min-h-[20px]">
              {rating > 0 ? ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating - 1] : ''}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Share your experience
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none text-sm"
                placeholder="What did you like? What could be improved?"
              />
            </div>
          </div>

          <div className="mt-8">
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-md ${
                submitting || rating === 0
                  ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500' 
                  : 'bg-green-600 hover:bg-green-700 hover:shadow-lg active:scale-[0.98]'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
