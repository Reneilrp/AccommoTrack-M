import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Home,
  User,
  History,
  Info
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';

export default function TenantMaintenance({ user }) {
  const location = useLocation();
  const preselectedPropertyId = location.state?.propertyId;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stayData, setStayData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestHistory, setRequestHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const autoOpenedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    booking_id: '',
    title: '',
    description: '',
    priority: 'medium',
    images: []
  });

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [requestsRes, stayRes] = await Promise.all([
        maintenanceService.getTenantRequests(),
        tenantService.getCurrentStay()
      ]);
      setRequests(requestsRes.data.data || []);
      setStayData(stayRes);

      if (stayRes?.stays?.length > 0) {
        let initialBookingId = '';
        if (preselectedPropertyId) {
          const matchingStay = stayRes.stays.find(s => String(s.property?.id) === String(preselectedPropertyId));
          if (matchingStay) initialBookingId = matchingStay.booking?.id;
        }
        
        if (!initialBookingId && stayRes.stays.length === 1) {
          initialBookingId = stayRes.stays[0].booking?.id;
        }

        setFormData(prev => ({ ...prev, booking_id: initialBookingId }));
        
        if (preselectedPropertyId && !autoOpenedRef.current) {
          autoOpenedRef.current = true;
          setShowModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch maintenance data', err);
      showError('Failed to load maintenance records');
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [preselectedPropertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── REALT-TIME LISTENERS (Echo) ──
  useEffect(() => {
    if (!user?.id || !window.Echo) return;

    // Use the user.{id} channel to match backend
    const channel = window.Echo.private(`user.${user.id}`);
    
    channel.listen('.maintenance.updated', (e) => {
      console.log('[Maintenance] Real-time update received:', e);
      fetchData(true); // Silently refresh the list
      
      // If the updated request is the one currently being viewed, refresh its history too
      if (selectedRequest && Number(e.request?.id) === Number(selectedRequest.id)) {
        fetchRequestDetails(selectedRequest.id);
      }
      
      showSuccess(e.message || 'Maintenance request updated');
    });

    return () => {
      window.Echo.leave(`user.${user.id}`);
    };
  }, [user?.id, selectedRequest, fetchData]);

  const fetchRequestDetails = async (id) => {
    try {
      setLoadingHistory(true);
      const res = await maintenanceService.getRequestDetails(id);
      setSelectedRequest(res.data);
      setRequestHistory(res.data.updates || []);
    } catch (err) {
      console.error('Failed to fetch request history', err);
      showError('Could not load history details');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files].slice(0, 5)
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
      showError('You must have an active stay to report maintenance');
      return;
    }

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
      setShowModal(false);
      
      setFormData({ 
        booking_id: stayData.stays?.length === 1 ? stayData.stays[0].booking.id : '', 
        title: '', 
        description: '', 
        priority: 'medium', 
        images: [] 
      });
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit request');
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
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Maintenance</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track repairs and communicate with property staff</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-green-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          New Request
        </button>
      </div>

      {!stayData?.hasActiveStay && (
        <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-start gap-4 backdrop-blur-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <p className="text-sm text-amber-900 font-medium">
            You currently don't have an active stay. You can only report issues for active bookings.
          </p>
        </div>
      )}

      {/* Grid Layout: List on left, Detail on right (Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Requests List */}
        <div className={`${selectedRequest ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-4`}>
          {requests.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-16 text-center shadow-sm">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wrench className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Everything's running smoothly</h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">No maintenance issues reported for your active stays.</p>
            </div>
          ) : (
            requests.map((req) => (
              <div 
                key={req.id}
                onClick={() => fetchRequestDetails(req.id)}
                className={`group cursor-pointer bg-white dark:bg-gray-800 rounded-2xl border transition-all ${
                  selectedRequest?.id === req.id 
                    ? 'border-green-500 ring-4 ring-green-500/5 shadow-md' 
                    : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600 shadow-sm'
                } overflow-hidden`}
              >
                <div className="p-5 flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedRequest?.id === req.id 
                      ? 'bg-green-100 text-green-700' 
                      : maintenanceService.getStatusColor(req.status)
                  }`}>
                    {req.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-gray-900 dark:text-white truncate">{req.title}</h4>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ml-2 ${maintenanceService.getPriorityColor(req.priority)}`}>
                        {req.priority}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-3 truncate">
                       <Home className="w-3 h-3" />
                       <span>{req.property?.title}</span>
                       <span>•</span>
                       <span>Rm {req.booking?.room?.room_number}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-gray-400 capitalize">{req.status.replace('_', ' ')}</span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${selectedRequest?.id === req.id ? 'translate-x-1 text-green-500' : 'text-gray-300'}`} />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selectedRequest && (
          <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden sticky top-8 animate-in slide-in-from-right-4 fade-in duration-300">
             {loadingHistory ? (
                <div className="h-96 flex flex-col items-center justify-center text-gray-400 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                    <p className="text-sm font-medium">Loading history...</p>
                </div>
             ) : (
                <>
                    {/* Header */}
                    <div className="p-8 border-b border-gray-50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{selectedRequest.title}</h3>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${maintenanceService.getStatusColor(selectedRequest.status)}`}>
                                        {selectedRequest.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-gray-400 text-xs font-bold">Ref: #MNT-{selectedRequest.id}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedRequest(null)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-600">
                                    <Home className="w-5 h-5 text-green-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{selectedRequest.property?.title}</p>
                                    <p className="text-xs text-gray-500">Room {selectedRequest.booking?.room?.room_number}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-600">
                                    <User className="w-5 h-5 text-blue-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assigned To</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                        {selectedRequest.assigned_to ? `${selectedRequest.assigned_to.first_name} ${selectedRequest.assigned_to.last_name}` : 'Not Assigned'}
                                    </p>
                                    <p className="text-xs text-gray-500 font-medium">Caretaker/Staff</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-8">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Description</p>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">{selectedRequest.description}</p>
                        </div>

                        {selectedRequest.images?.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Photos</p>
                                <div className="flex flex-wrap gap-3">
                                    {selectedRequest.images.map((img, i) => (
                                        <div key={i} className="w-24 h-24 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm cursor-zoom-in group">
                                            <img src={`${import.meta.env.VITE_STORAGE_URL}/${img}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Repair reference" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* History Timeline */}
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <History className="w-4 h-4 text-gray-400" />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Progress Feed</p>
                            </div>
                            
                            <div className="space-y-8 relative before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100 dark:before:bg-gray-700">
                                {requestHistory.length === 0 ? (
                                    <div className="flex items-center gap-4 text-gray-400 italic text-sm pl-8">
                                        <Info className="w-4 h-4" />
                                        No history records found
                                    </div>
                                ) : (
                                    requestHistory.map((item, idx) => (
                                        <div key={item.id} className="relative pl-10">
                                            {/* Dot */}
                                            <div className={`absolute left-[7px] top-1.5 w-[10px] h-[10px] rounded-full border-2 border-white dark:border-gray-800 z-10 ${
                                                idx === 0 ? 'bg-green-500 ring-4 ring-green-100 dark:ring-green-900/40' : 'bg-gray-300 dark:bg-gray-600'
                                            }`} />
                                            
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <p className={`text-sm font-bold ${idx === 0 ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                                                        {item.content}
                                                    </p>
                                                    <span className="text-[10px] text-gray-400">{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                                {item.notes && (
                                                    <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50 mt-2">
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{item.notes}"</p>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <p className="text-[10px] text-gray-400">By {item.user?.first_name} {item.user?.last_name}</p>
                                                    {item.user?.role && (
                                                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-[8px] font-black uppercase text-gray-500 rounded border border-gray-200 dark:border-gray-600">
                                                            {item.user.role}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
             )}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
            <div className="px-8 py-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Report Issue</h3>
                <p className="text-xs text-gray-400 font-bold uppercase mt-1">Submit new maintenance request</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {hasMultipleStays ? (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Target Property / Room *</label>
                  <select
                    required
                    className="w-full px-5 py-4 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:border-green-500 outline-none dark:bg-gray-700 dark:text-white font-bold transition-all"
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
                  <div className="bg-green-50/50 dark:bg-green-900/10 p-5 rounded-2xl border border-green-100 dark:border-green-900/30 flex items-center gap-4">
                     <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl shadow-sm border border-green-100 dark:border-green-900/20">
                        <Home className="w-5 h-5 text-green-500" />
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active stay detected</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {stayData.stays[0].property?.title} — Rm {stayData.stays[0].room?.room_number}
                        </p>
                     </div>
                  </div>
                )
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Problem Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Leaking faucet"
                  className="w-full px-5 py-4 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:border-green-500 outline-none dark:bg-gray-700 dark:text-white font-medium"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Details</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Describe what happened..."
                  className="w-full px-5 py-4 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:border-green-500 outline-none dark:bg-gray-700 dark:text-white font-medium resize-none"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Priority</label>
                  <select
                    className="w-full px-5 py-4 border-2 border-gray-100 dark:border-gray-700 rounded-2xl outline-none dark:bg-gray-700 dark:text-white font-bold"
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Photos (Limit 5)</label>
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
                      className="w-full flex items-center justify-center gap-2 px-5 py-4 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-400 transition-colors"
                    >
                      <Camera className="w-5 h-5" />
                      <span className="text-sm font-bold">Add</span>
                    </label>
                  </div>
                </div>
              </div>

              {formData.images.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {formData.images.map((file, i) => (
                    <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                      <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />
                      <button 
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 flex gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-8 py-5 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-green-500/10 active:scale-95"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Report Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
