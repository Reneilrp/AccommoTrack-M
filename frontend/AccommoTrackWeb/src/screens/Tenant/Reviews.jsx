import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Star, Edit3, Trash2, Loader2, MessageSquare, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Reviews() {
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
      // Fix #1: Only show confirmed/completed bookings — backend rejects others
      const eligible = (Array.isArray(data) ? data : []).filter(
        (b) => ['confirmed', 'completed'].includes(b.status)
      );
      setBookings(eligible);
    } catch (err) {
      console.error('Failed to load bookings', err);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!form.booking_id) { toast.error('Please select a confirmed or completed booking'); return; }
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
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(s)}
          className={`transition-colors ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
        >
          <Star
            className={`w-6 h-6 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Reviews</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View and manage reviews you've left for properties.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingReview(null); setForm({ property_id: '', booking_id: '', rating: 5, comment: '' }); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Leave a Review
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingReview ? 'Edit Your Review' : 'Leave a Review'}
          </h3>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Booking</label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rating</label>
              <StarRating rating={form.rating} onChange={(r) => setForm({ ...form, rating: r })} interactive={true} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comment</label>
              <textarea
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                rows={4}
                placeholder="Write your review..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); setEditingReview(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
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

      {/* Review List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">No reviews yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Leave a review for a property you've stayed at!</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {reviews.map((review) => (
              <li key={review.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {review.property?.title || `Property #${review.property_id}`}
                      {review.room_number && (
                        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                          (Room {review.room_number})
                        </span>
                      )}
                    </h4>
                    <div className="mt-1.5">
                      <StarRating rating={review.rating} />
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{review.comment}</p>
                    )}
                    {review.landlord_response && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Landlord Response</p>
                        <p className="text-sm text-blue-600 dark:text-blue-300">{review.landlord_response}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(review)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit review"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(review.id)}
                      disabled={deletingId === review.id}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete review"
                    >
                      {deletingId === review.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
