import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Loader2, CheckCircle2 } from 'lucide-react';
import { propertyService } from '../../services/propertyService';
import { showSuccess, showError } from '../../utils/toast';

export default function AssignWorkerModal({ isOpen, onClose, request, onAssign }) {
  const [workers, setWorkers] = useState([]);
  const [landlord, setLandlord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await propertyService.getPropertyWorkers(request.property_id);
      if (response.success) {
        setWorkers(response.data.workers || []);
        setLandlord(response.data.landlord || null);
        
        // Default select if only one or if landlord exists
        if (response.data.workers?.length > 0) {
          setSelectedWorkerId(response.data.workers[0].id);
        } else if (response.data.landlord) {
          setSelectedWorkerId(response.data.landlord.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch workers', err);
      showError('Failed to load eligible workers');
    } finally {
      setLoading(false);
    }
  }, [request.property_id]);

  useEffect(() => {
    if (isOpen && request?.property_id) {
      fetchWorkers();
    }
  }, [isOpen, request?.property_id, fetchWorkers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorkerId) {
      showError('Please select a worker');
      return;
    }

    try {
      setSubmitting(true);
      await onAssign(request.id, selectedWorkerId);
      showSuccess('Maintenance worker assigned successfully');
      onClose();
    } catch {
      // toast error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Assign Maintenance</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Select a worker or caretaker to handle this request for <strong>{request.property?.title}</strong>.
            </p>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                {landlord && (
                  <label 
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedWorkerId === landlord.id 
                      ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-900/20' 
                      : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="worker"
                      value={landlord.id}
                      checked={selectedWorkerId === landlord.id}
                      onChange={() => setSelectedWorkerId(landlord.id)}
                      className="hidden"
                    />
                    <div className={`p-2 rounded-full ${selectedWorkerId === landlord.id ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'}`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 dark:text-white">{landlord.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Self-Assignment</p>
                    </div>
                    {selectedWorkerId === landlord.id && <CheckCircle2 className="w-5 h-5 text-brand-600" />}
                  </label>
                )}

                {workers.map((worker) => (
                  <label 
                    key={worker.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedWorkerId === worker.id 
                      ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-900/20' 
                      : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="worker"
                      value={worker.id}
                      checked={selectedWorkerId === worker.id}
                      onChange={() => setSelectedWorkerId(worker.id)}
                      className="hidden"
                    />
                    <div className={`p-2 rounded-full ${selectedWorkerId === worker.id ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'}`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 dark:text-white">{worker.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{worker.email}</p>
                    </div>
                    {selectedWorkerId === worker.id && <CheckCircle2 className="w-5 h-5 text-brand-600" />}
                  </label>
                ))}

                {workers.length === 0 && !landlord && (
                  <p className="text-center py-4 text-sm text-gray-500">No available workers found.</p>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || submitting || !selectedWorkerId}
              className="flex-1 px-4 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 shadow-lg shadow-brand-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Confirm Assignment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
