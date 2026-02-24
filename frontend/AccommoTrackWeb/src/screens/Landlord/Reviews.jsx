import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, 
  MessageCircle, 
  Reply, 
  User, 
  Building2, 
  Loader2, 
  CheckCircle2, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft 
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/api';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';

export default function LandlordReviews() {
  const navigate = useNavigate();
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.landlord_reviews || cacheManager.get('landlord_reviews');

  const [reviews, setReviews] = useState(cachedData?.reviews || []);
  const [loading, setLoading] = useState(!cachedData);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ratingFilter, setRatingFilter] = useState('all');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      if (reviews.length === 0) setLoading(true);
      const res = await api.get('/landlord/reviews');
      const data = res.data || [];
      // Ensure sorted by date (newest first)
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setReviews(data);
      
      const newState = { reviews: data, lastUpdated: Date.now() };
      updateData('landlord_reviews', newState);
      cacheManager.set('landlord_reviews', newState);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };
  const handleReply = async (reviewId) => {
    if (!replyText.trim()) return;
    
    setSubmitting(true);
    try {
      await api.post(`/landlord/reviews/${reviewId}/respond`, {
        response: replyText
      });
      toast.success('Response added successfully');
      setReplyingTo(null);
      setReplyText('');
      fetchReviews(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star 
            key={s} 
            className={`w-4 h-4 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} 
          />
        ))}
      </div>
    );
  };

  const filteredReviews = reviews.filter(r => {
    if (ratingFilter === 'all') return true;
    return Math.round(r.rating) === parseInt(ratingFilter);
  });

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center relative min-h-[40px]">
            {/* Left: Back button */}
            <div className="absolute left-0 flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-white dark:bg-gray-800 text-green-600 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 hover:scale-110 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Center: Title */}
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Tenant Reviews
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
        
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setRatingFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              ratingFilter === 'all' 
                ? 'bg-brand-600 text-white shadow-md' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            All Reviews
          </button>
          {[5, 4, 3, 2, 1].map(star => (
            <button
              key={star}
              onClick={() => setRatingFilter(String(star))}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                ratingFilter === String(star)
                  ? 'bg-brand-600 text-white shadow-md' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{star}</span>
              <Star className={`w-3.5 h-3.5 ${ratingFilter === String(star) ? 'fill-white text-white' : 'fill-yellow-400 text-yellow-400'}`} />
            </button>
          ))}
        </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredReviews.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No reviews found</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">Try adjusting your filters.</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div 
              key={review.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <img 
                      src={getImageUrl(review.reviewer_image) || `https://ui-avatars.com/api/?name=${review.reviewer_name}&background=random`} 
                      className="w-12 h-12 rounded-full border border-gray-100 object-cover"
                      alt={review.reviewer_name}
                    />
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{review.reviewer_name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {renderStars(review.rating)}
                        <span className="text-xs text-gray-400">• {review.time_ago}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col md:items-end text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-bold uppercase">
                      <Building2 className="w-3.5 h-3.5" />
                      {review.property_title}
                    </div>
                    <span className="text-gray-400 mt-1">{review.booking_dates}</span>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl relative">
                  <MessageCircle className="absolute -top-3 -left-2 w-6 h-6 text-gray-200 dark:text-gray-600 fill-current" />
                  <p className="text-gray-700 dark:text-gray-300 italic leading-relaxed">
                    "{review.comment || 'No comment provided.'}"
                  </p>
                </div>

                {/* Landlord Response */}
                {review.landlord_response ? (
                  <div className="mt-6 ml-6 md:ml-12 p-4 bg-brand-50 dark:bg-brand-900/20 border-l-4 border-brand-500 rounded-r-xl">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-black text-brand-700 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Your Response
                      </p>
                      <span className="text-[10px] text-brand-400 font-bold">{new Date(review.landlord_response_date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {review.landlord_response}
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 flex justify-end">
                    {replyingTo === review.id ? (
                      <div className="w-full space-y-3 animate-in slide-in-from-top-2 duration-200">
                        <textarea 
                          autoFocus
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a professional response to this tenant..."
                          className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:bg-gray-700 dark:text-white text-sm"
                          rows="3"
                        />
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                            className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                          <button 
                            disabled={submitting || !replyText.trim()}
                            onClick={() => handleReply(review.id)}
                            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-lg flex items-center gap-2 disabled:opacity-50"
                          >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Reply className="w-4 h-4" /> Send Reply</>}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setReplyingTo(review.id)}
                        className="flex items-center gap-2 px-4 py-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg font-bold text-sm transition-all"
                      >
                        <Reply className="w-4 h-4" />
                        Respond to Review
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </div>
  );
}
