import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { maintenanceService } from '../../services/maintenanceService';
import { tenantService } from '../../services/tenantService';
import { 
  Wrench, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Camera, 
  Loader2,
  ChevronRight,
  MessageSquare,
  Home
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TenantMaintenance() {
  const location = useLocation();
  const preselectedPropertyId = location.state?.propertyId;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stayData, setStayData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const autoOpenedRef = useRef(false); // prevent re-opening modal after submit refresh
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    booking_id: '',
    title: '',
    description: '',
    priority: 'medium',
    images: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requestsRes, stayRes] = await Promise.all([
        maintenanceService.getTenantRequests(),
        tenantService.getCurrentStay()
      ]);
      setRequests(requestsRes.data.data || []);
      setStayData(stayRes);

      // Handle pre-selection
      if (stayRes?.stays?.length > 0) {
        let initialBookingId = '';
        if (preselectedPropertyId) {
          const matchingStay = stayRes.stays.find(s => String(s.property?.id) === String(preselectedPropertyId));
          if (matchingStay) initialBookingId = matchingStay.booking?.id;
        }
        
        // Default to first stay if no match found but modal is opened
        if (!initialBookingId && stayRes.stays.length === 1) {
          initialBookingId = stayRes.stays[0].booking?.id;
        }

        setFormData(prev => ({ ...prev, booking_id: initialBookingId }));
        
        // Auto-open modal only once on initial load (not on post-submit refresh)
        if (preselectedPropertyId && !autoOpenedRef.current) {
          autoOpenedRef.current = true;
          setShowModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch maintenance data', err);
      toast.error('Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  };

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
    if (!stayData?.hasActiveStay) {
      toast.error('You must have an active stay to report maintenance');
      return;
    }

    if (!formData.booking_id) {
      toast.error('Please select a property/room');
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
      toast.success('Maintenance request submitted');
      setShowModal(false);
      
      // Reset form but keep the last booking_id or default logic
      setFormData({ 
        booking_id: stayData.stays?.length === 1 ? stayData.stays[0].booking.id : '', 
        title: '', 
        description: '', 
        priority: 'medium', 
        images: [] 
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  const hasMultipleStays = stayData?.stays?.length > 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maintenance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Report and track repairs for your room</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {!stayData?.hasActiveStay && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <p className="text-sm text-amber-800">
            You currently don't have an active stay. You can only report issues for active bookings.
          </p>
        </div>
      )}

      {/* Requests List */}
      <div className="grid grid-cols-1 gap-4">
        {requests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 p-12 text-center shadow-md">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No maintenance requests</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">Everything looks good! If something breaks, report it here.</p>
          </div>
        ) : (
          requests.map((req) => (
            <div 
              key={req.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden shadow-md hover:shadow-lg transition-all group"
            >
              <div className="p-6 flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${maintenanceService.getStatusColor(req.status)}`}>
                  {req.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className="font-bold text-gray-900 dark:text-white">{req.title}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${maintenanceService.getPriorityColor(req.priority)}`}>
                      {req.priority}
                    </span>
                  </div>
                  
                  {/* Property & Room context */}
                  <div className="flex items-center gap-2.5 text-xs text-green-600 dark:text-green-400 font-bold mb-2">
                    <Home className="w-3 h-3" />
                    <span>{req.property?.title}</span>
                    <span className="opacity-40">•</span>
                    <span>Room {req.booking?.room?.room_number}</span>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">{req.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Submitted {new Date(req.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="capitalize">Status: <span className="font-bold text-gray-600 dark:text-gray-300">{req.status.replace('_', ' ')}</span></span>
                  </div>
                </div>
                <div className="self-center">
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-500 transition-colors" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-300 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-300 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">New Maintenance Request</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                    {stayData.stays.map(stay => (
                      <option key={stay.booking.id} value={stay.booking.id}>
                        {stay.property?.title} — Room {stay.room?.room_number}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                stayData?.stays?.[0] && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center gap-4">
                     <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
                        <Home className="w-5 h-5 text-green-600" />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Request for</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {stayData.stays[0].property?.title} — Room {stayData.stays[0].room?.room_number}
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
                  onClick={() => setShowModal(false)}
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
      )}
    </div>
  );
}
