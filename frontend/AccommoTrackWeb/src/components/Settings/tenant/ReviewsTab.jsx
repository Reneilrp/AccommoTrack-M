import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { Star, Edit3, Trash2, Loader2, MessageSquare, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [form, setForm] = useState({ property_id: '', booking_id: '', rating: 5, comment: '' });
  const [bookings, setBookings] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { fetchReviews(); fetchBookings(); }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tenant/reviews');
      const data = res.data?.data || res.data || [];
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load reviews', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await api.get('/tenant/bookings');
      const data = res.data?.data || res.data || [];
      // Filter for completed or confirmed bookings that don't have reviews yet (or if editing)
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load bookings', err);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!form.property_id) { toast.error('Please select a booking'); return; }
    setSubmitting(true);
    try {
      const payload = { property_id: form.property_id, booking_id: form.booking_id, rating: form.rating, comment: form.comment };
      let res;
      if (editingReview) {
        res = await api.put(`/tenant/reviews/${editingReview.id}`, payload);
      } else {
        res = await api.post('/tenant/reviews', payload);
      }
      if (res.data?.success !== false) {
        toast.success(editingReview ? 'Review updated!' : 'Review submitted!');
        setShowForm(false);
        setEditingReview(null);
        setForm({ property_id: '', booking_id: '', rating: 5, comment: '' });
        await fetchReviews();
      } else {
        toast.error(res.data?.message || 'Failed to submit review');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (review) => {
    setEditingReview(review);
    setForm({
      property_id: review.property_id,
      booking_id: review.booking_id || '',
      rating: review.rating,
      comment: review.comment || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/tenant/reviews/${id}`);
      toast.success('Review deleted');
      await fetchReviews();
    } catch {
      toast.error('Failed to delete review');
    } finally {
      setDeletingId(null);
    }
  };

  const StarRating = ({ rating, onChange, interactive = false }) => (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(s)}
          className={`transition-colors ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
        >
          <Star
            className={`w-5 h-5 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">My Reviews</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage feedback you've left for properties.
            </p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditingReview(null); setForm({ property_id: '', booking_id: '', rating: 5, comment: '' }); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Review
          </button>
        </div>

        {showForm && (
          <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-4">
              {editingReview ? 'Edit Your Review' : 'Leave a Review'}
            </h4>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Select Booking</label>
                <select
                  value={form.booking_id}
                  onChange={(e) => {
                    const booking = bookings.find(b => String(b.id) === e.target.value);
                    setForm({ ...form, booking_id: e.target.value, property_id: booking?.property_id || '' });
                  }}
                  disabled={!!editingReview}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50"
                >
                  <option value="">Select a booking...</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.property?.title || `Booking #${b.id}`} — {b.reference || b.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Rating</label>
                <StarRating rating={form.rating} onChange={(r) => setForm({ ...form, rating: r })} interactive={true} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Your Comment</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  rows={4}
                  placeholder="Tell us about your stay..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => { setShowForm(false); setEditingReview(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingReview ? 'Update Review' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-500" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white">No reviews found</p>
              <p className="text-sm text-gray-500">You haven't left any reviews yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {reviews.map((review) => (
                <div key={review.id} className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          {review.property?.title || `Property #${review.property_id}`}
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(review)}
                            className="p-2.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(review.id)}
                            disabled={deletingId === review.id}
                            className="p-2.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            {deletingId === review.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <StarRating rating={review.rating} />
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">"{review.comment}"</p>
                      )}
                      {review.landlord_response && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                          <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mb-2">Landlord Response</p>
                          <p className="text-sm text-blue-600 dark:text-blue-300">{review.landlord_response}</p>
                        </div>
                      )}
                      <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-4 font-medium uppercase">
                        Left on {review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Unknown Date'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
