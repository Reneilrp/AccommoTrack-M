import React, { useState, useEffect } from 'react';
import { maintenanceService } from '../../services/maintenanceService';
import { X, Camera, Loader2, Home } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';

export default function MaintenanceRequestModal({ isOpen, onClose, onSuccess, stays = [], preselectedBookingId = '' }) {
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    booking_id: '',
    title: '',
    description: '',
    priority: 'medium',
    images: []
  });

  // Initialize booking_id based on stays and preselection
  useEffect(() => {
    if (isOpen) {
      let initialBookingId = '';
      if (preselectedBookingId) {
        initialBookingId = preselectedBookingId;
      } else if (stays.length === 1) {
        initialBookingId = stays[0].booking?.id;
      }
      setFormData(prev => ({ ...prev, booking_id: initialBookingId, title: '', description: '', priority: 'medium', images: [] }));
    }
  }, [isOpen, stays, preselectedBookingId]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files].slice(0, 5) // Limit to 5 images
    }));
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.booking_id) {
      showError('Please select a property/room');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('priority', formData.priority);
      data.append('booking_id', formData.booking_id);
      
      formData.images.forEach((img) => {
        data.append('images[]', img);
      });

      await maintenanceService.createRequest(data);
      showSuccess('Maintenance request submitted');
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const hasMultipleStays = stays.length > 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-300 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-300 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">New Maintenance Request</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Property/Room Selection if multi-stay */}
          {hasMultipleStays ? (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Target Property / Room *</label>
              <select
                required
                className="w-full px-4 py-4 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white font-bold"
                value={formData.booking_id}
                onChange={e => setFormData({...formData, booking_id: e.target.value})}
              >
                <option value="">Select a room...</option>
                {stays.map(stay => (
                  <option key={stay.booking?.id} value={stay.booking?.id}>
                    {stay.property?.title} — Room {stay.room?.room_number || stay.room?.roomNumber}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            stays[0] && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center gap-4">
                 <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
                    <Home className="w-5 h-5 text-green-600" />
                 </div>
                 <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Request for</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {stays[0].property?.title} — Room {stays[0].room?.room_number || stays[0].room?.roomNumber}
                    </p>
                 </div>
              </div>
            )
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Problem Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Leaking faucet, Light bulb replacement"
              className="w-full px-4 py-4 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Details</label>
            <textarea
              required
              rows="4"
              placeholder="Please describe the issue in detail..."
              className="w-full px-4 py-4 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Priority</label>
              <select
                className="w-full px-4 py-4 border border-gray-200 dark:border-gray-600 rounded-xl outline-none dark:bg-gray-700 dark:text-white"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value})}
              >
                <option value="low">Low - General maintenance</option>
                <option value="medium">Medium - Important</option>
                <option value="high">High - Urgent repair</option>
                <option value="urgent">Urgent - Emergency</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Photos (Optional)</label>
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="m-images"
                />
                <label 
                  htmlFor="m-images"
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-500 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-sm font-medium">Add Photos</span>
                </label>
              </div>
            </div>
          </div>

          {formData.images.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {formData.images.map((file, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-100">
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />
                  <button 
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}