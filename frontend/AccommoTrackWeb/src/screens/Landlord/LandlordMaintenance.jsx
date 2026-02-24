import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { maintenanceService } from '../../services/maintenanceService';
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2,
  ChevronRight,
  Filter,
  Search,
  Building2,
  User,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/api';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';

export default function LandlordMaintenance() {
  const navigate = useNavigate();
  const { uiState, updateScreenState, updateData } = useUIState();
  const cachedData = uiState.data?.landlord_maintenance || cacheManager.get('landlord_maintenance');
  const savedState = uiState.maintenance || {};

  const [requests, setRequests] = useState(cachedData?.requests || []);
  const [loading, setLoading] = useState(!cachedData);
  const [filterStatus, setFilterStatus] = useState(savedState.filterStatus || 'all');
  const [selectedRequest, setSelectedInquiry] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const handleFilterChange = (status) => {
    setFilterStatus(status);
    updateScreenState('maintenance', { filterStatus: status });
  };

    const fetchRequests = async () => {

      try {

        setLoading(true);

        const res = await maintenanceService.getLandlordRequests({ status: filterStatus });

        setRequests(res.data || res.data?.data || []);

      } catch (err) {

        console.error('Failed to fetch maintenance requests', err);

        toast.error('Failed to load maintenance records');

      } finally {

        setLoading(false);

      }

    };

  

    const handleUpdateStatus = async (id, newStatus) => {

      setUpdating(true);

      try {

        await maintenanceService.updateStatus(id, newStatus);

        toast.success(`Request marked as ${newStatus.replace('_', ' ')}`);

  

        // Update local state

        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));

        if (selectedRequest?.id === id) {

          setSelectedInquiry(prev => ({ ...prev, status: newStatus }));

        }

  

        // If we're filtering, we might need to re-fetch

        if (filterStatus !== 'all') fetchRequests();

      } catch (err) {

        toast.error('Failed to update status');

      } finally {

        setUpdating(false);

      }

    };

  

    return (

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 mb-8">

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">

            <div className="flex items-center justify-center relative min-h-[40px]">

              {/* Left: Back button */}

              <div className="absolute left-0 flex items-center">

                <button

                  type="button"

                  onClick={() => navigate(-1)}

                  className="p-2 bg-white dark:bg-gray-800 text-green-600 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 hover:scale-110 transition-all flex-shrink-0"

                >

                  <ArrowLeft className="w-5 h-5" />

                </button>

              </div>

  

              {/* Center: Title */}

              <div className="text-center">

                <h1 className="text-xl font-bold text-gray-900 dark:text-white">

                  Maintenance Requests

                </h1>

              </div>

            </div>

          </div>

        </header>

  

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">

          {/* Filters */}

          <div className="flex gap-2 overflow-x-auto pb-2">

            {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map(s => (

              <button

                key={s}

                type="button"

                onClick={() => handleFilterChange(s)}

                className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap ${filterStatus === s

                    ? 'bg-brand-600 text-white shadow-md'

                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-gray-50'

                  }`}

              >

                {s.replace('_', ' ')}

              </button>

            ))}

          </div>

  

          {/* Requests Grid with Overlay Loader */}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative min-h-[200px]">

            {loading && (

              <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-10 flex items-center justify-center backdrop-blur-[1px] rounded-2xl">

                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />

              </div>

            )}

  

            {!loading && requests.length === 0 ? (

              <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">

                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">

                  <CheckCircle2 className="w-8 h-8 text-green-300" />

                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">All clear!</h3>

                <p className="text-gray-500 text-sm max-w-xs mx-auto">No maintenance requests found for this status.</p>

              </div>

            ) : (

              requests.map((req) => (

                <div

                  key={req.id}

                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all flex flex-col"

                >

                  {/* Header */}

                  <div className="p-5 border-b border-gray-50 dark:border-gray-700 flex justify-between items-start">

                    <div className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${maintenanceService.getPriorityColor(req.priority)}`}>

                      {req.priority}

                    </div>

                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${maintenanceService.getStatusColor(req.status)}`}>

                      {req.status.replace('_', ' ')}

                    </span>

                  </div>

  

                  {/* Body */}

                  <div className="p-5 flex-1 space-y-4">

                    <div>

                      <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{req.title}</h4>

                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{req.description}</p>

                    </div>

  

                    <div className="grid grid-cols-2 gap-3 text-xs">

                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">

                        <Building2 className="w-3.5 h-3.5" />

                        <span className="truncate">{req.property?.title || 'Property'}</span>

                      </div>

                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">

                        <User className="w-3.5 h-3.5" />

                        <span className="truncate">{req.tenant?.first_name} {req.tenant?.last_name}</span>

                      </div>

                    </div>

  

                    {req.images && req.images.length > 0 && (

                      <div className="flex gap-1 overflow-hidden h-12">

                        {req.images.map((img, i) => (

                          <img

                            key={i}

                            src={getImageUrl(img)}

                            className="w-12 h-12 object-cover rounded-lg border border-gray-100 dark:border-gray-600"

                            alt="Issue"

                          />

                        ))}

                      </div>

                    )}

                  </div>

  

                  {/* Actions */}

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-50 dark:border-gray-700 flex gap-2">

                    {req.status === 'pending' && (

                      <button

                        onClick={() => handleUpdateStatus(req.id, 'in_progress')}

                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"

                      >

                        Accept

                      </button>

                    )}

                    {req.status === 'in_progress' && (

                      <button

                        onClick={() => handleUpdateStatus(req.id, 'completed')}

                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"

                      >

                        Complete

                      </button>

                    )}

                    <button

                      onClick={() => setSelectedInquiry(req)}

                      className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"

                    >

                      View

                    </button>

                  </div>

                </div>

              ))

            )}

          </div>

        {/* Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Maintenance Details</h3>
                <button onClick={() => setSelectedInquiry(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">{selectedRequest.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">Submitted on {new Date(selectedRequest.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${maintenanceService.getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${maintenanceService.getPriorityColor(selectedRequest.priority)}`}>
                      {selectedRequest.priority} Priority
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Tenant</p>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedRequest.tenant?.first_name} {selectedRequest.tenant?.last_name}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Location</p>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedRequest.property?.title} - Room {selectedRequest.booking?.room?.room_number}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Description</p>
                  <p className="text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedRequest.description}
                  </p>
                </div>

                {selectedRequest.images && selectedRequest.images.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-3">Attached Photos</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedRequest.images.map((img, i) => (
                        <a key={i} href={getImageUrl(img)} target="_blank" rel="noreferrer" className="block h-40 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                          <img src={getImageUrl(img)} className="w-full h-full object-cover hover:scale-105 transition-transform" alt="Evidence" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-3">
                <div className="flex gap-2">
                  {selectedRequest.status !== 'cancelled' && selectedRequest.status !== 'completed' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'cancelled')}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 font-bold text-sm rounded-lg"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedInquiry(null)}
                    className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-lg"
                  >
                    Close
                  </button>
                  {selectedRequest.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'in_progress')}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-lg shadow-blue-200"
                    >
                      Start Working
                    </button>
                  )}
                  {selectedRequest.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'completed')}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg shadow-lg shadow-green-200"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
