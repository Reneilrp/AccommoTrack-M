import { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Building2, Home, Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import PriceRow from '../../components/Shared/PriceRow';

export default function AddBookingModal({ isOpen, onClose, onBookingAdded }) {
    const [loading, setLoading] = useState(false);
    const [loadingPricing, setLoadingPricing] = useState(false);
    const [error, setError] = useState('');
    const [properties, setProperties] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [pricingPreview, setPricingPreview] = useState(null);

    const [formData, setFormData] = useState({
      guestName: '',
      propertyId: '',
      roomId: '',
      checkIn: '',
      checkOut: '',
      amount: '',
      paymentStatus: 'unpaid',
      notes: ''
    });

    useEffect(() => {
      if (isOpen) {
        loadProperties();
      } else {
        // Reset form when closed
        setFormData({
          guestName: '',
          propertyId: '',
          roomId: '',
          checkIn: '',
          checkOut: '',
          amount: '',
          paymentStatus: 'unpaid',
          notes: ''
        });
        setPricingPreview(null);
      }
    }, [isOpen]);

    const loadProperties = async () => {
      try {
        const res = await api.get('/properties/accessible');
        setProperties(res.data || []);
      } catch (err) {
        console.error('Failed to load properties', err);
      }
    };

    const loadRooms = async (propertyId) => {
      if (!propertyId) {
        setRooms([]);
        return;
      }
      try {
        const res = await api.get(`/rooms/property/${propertyId}`);
        // Only show available rooms for new bookings
        setRooms((res.data || []).filter(r => r.status === 'available'));
      } catch (err) {
        console.error('Failed to load rooms', err);
      }
    };

    const fetchPricing = useCallback(async () => {
      if (!formData.roomId || !formData.checkIn || !formData.checkOut) return;
      
      setLoadingPricing(true);
      try {
        const res = await api.get(`/rooms/${formData.roomId}/pricing`, {
          params: {
            start: formData.checkIn,
            end: formData.checkOut
          }
        });
        setPricingPreview(res.data);
        // Auto-fill amount based on calculation
        setFormData(prev => ({ ...prev, amount: res.data.total }));
      } catch (err) {
        console.error('Pricing calculation failed', err);
      } finally {
        setLoadingPricing(false);
      }
    }, [formData.roomId, formData.checkIn, formData.checkOut]);

    useEffect(() => {
      fetchPricing();
    }, [fetchPricing]);

    const handlePropertyChange = (e) => {
      const id = e.target.value;
      setFormData({ ...formData, propertyId: id, roomId: '' });
      loadRooms(id);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      
      if (!formData.guestName || !formData.roomId || !formData.checkIn || !formData.checkOut) {
        setError('Please fill in all required fields.');
        return;
      }

      setLoading(true);
      try {
        await api.post('/bookings', {
          room_id: formData.roomId,
          start_date: formData.checkIn,
          end_date: formData.checkOut,
          notes: formData.notes,
          // If we want to allow custom amount entry, use formData.amount
          // otherwise backend calculates from room rates
        });
        
        toast.success('Booking added successfully!');
        if (onBookingAdded) onBookingAdded();
        onClose();
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to add booking';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Booking</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reserve a room for a guest</p>
            </div>
          </div>
          <button
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Guest / Tenant Name</label>
            <input
              type="text"
              required
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white transition-all"
              value={formData.guestName}
              onChange={e => setFormData({ ...formData, guestName: e.target.value })}
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Property</label>
              <select
                required
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white"
                value={formData.propertyId}
                onChange={handlePropertyChange}
              >
                <option value="">Select Property</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Room</label>
              <select
                required
                disabled={!formData.propertyId}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white disabled:opacity-50"
                value={formData.roomId}
                onChange={e => setFormData({ ...formData, roomId: e.target.value })}
              >
                <option value="">Select Room</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>Room {r.room_number} ({r.type_label})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Check-in</label>
              <input
                type="date"
                required
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white"
                value={formData.checkIn}
                onChange={e => setFormData({ ...formData, checkIn: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Check-out</label>
              <input
                type="date"
                required
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white"
                value={formData.checkOut}
                onChange={e => setFormData({ ...formData, checkOut: e.target.value })}
              />
            </div>
          </div>

          {/* Pricing Preview Area */}
          {formData.roomId && formData.checkIn && formData.checkOut && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800/30">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-green-800 dark:text-green-300">Estimated Total</span>
                {loadingPricing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                ) : (
                  <span className="text-lg font-black text-green-700 dark:text-green-400">
                    <PriceRow amount={pricingPreview?.total || 0} />
                  </span>
                )}
              </div>
              {pricingPreview && (
                <div className="text-xs text-green-600 dark:text-green-500/70 space-y-1">
                  <p>Stay Duration: {pricingPreview.days} days</p>
                  <p>Billing Policy: {pricingPreview.policy?.replace('_', ' ')}</p>
                  <p className="italic">{pricingPreview.breakdown?.months > 0 && `${pricingPreview.breakdown.months} month(s)`} {pricingPreview.breakdown?.extra_days > 0 && `+ ${pricingPreview.breakdown.extra_days} day(s)`}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Internal Notes (Optional)</label>
            <textarea
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white transition-all h-20"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Special requirements, discount info..."
            />
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingPricing}
              className="px-8 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-none transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

