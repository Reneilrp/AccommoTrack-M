import { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AddBookingModal({ isOpen, onClose, onBookingAdded }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const API_URL = '/api';

    const getAuthHeaders = () => {
      const token = localStorage.getItem('auth_token');
      return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      };
    };

    const handleSubmit = async () => {
      setError('');
      if (!formData.guestName || !formData.checkIn || !formData.checkOut || !formData.amount) {
        setError('Please fill in all required fields.');
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/bookings`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            guest_name: formData.guestName,
            check_in: formData.checkIn,
            check_out: formData.checkOut,
            amount: formData.amount,
            payment_status: formData.paymentStatus,
            // property_id, room_id to be added when dropdowns are implemented
          })
        });
        if (!response.ok) throw new Error('Failed to add booking');
        toast.success('Booking added successfully!');
        if (onBookingAdded) onBookingAdded();
        onClose();
      } catch (err) {
        setError(err.message || 'Failed to add booking');
        toast.error(err.message || 'Failed to add booking');
      } finally {
        setLoading(false);
      }
    };
  const [formData, setFormData] = useState({
    guestName: '',
    property: '',
    room: '',
    checkIn: '',
    checkOut: '',
    amount: '',
    paymentStatus: 'unpaid',
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-7 h-7 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Add Booking</h2>
        </div>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500"
              value={formData.guestName}
              onChange={e => setFormData({ ...formData, guestName: e.target.value })}
              placeholder="Enter guest name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500"
              value={formData.property}
              onChange={e => setFormData({ ...formData, property: e.target.value })}
              placeholder="Select property"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500"
              value={formData.room}
              onChange={e => setFormData({ ...formData, room: e.target.value })}
              placeholder="Select room"
              disabled
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500"
                value={formData.checkIn}
                onChange={e => setFormData({ ...formData, checkIn: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500"
                value={formData.checkOut}
                onChange={e => setFormData({ ...formData, checkOut: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Enter amount"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500"
              value={formData.paymentStatus}
              onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Booking'}
            </button>
            {error && <div className="text-red-600 text-sm mt-2 text-center">{error}</div>}
          </div>
        </form>
      </div>
    </div>
  );
}
