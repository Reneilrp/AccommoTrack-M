import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import { reportService } from '../../services/reportService';
import toast from 'react-hot-toast';

export default function ReportModal({ isOpen, onClose, propertyId, propertyTitle }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = [
    'Inaccurate Listing Photos/Details',
    'Safety or Security Concerns',
    'Landlord Misconduct/Harassment',
    'Payment Issues (Charging outside app)',
    'Scam or Fraudulent Activity',
    'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || description.length < 10) {
      toast.error('Please provide a reason and description (min 10 chars)');
      return;
    }

    setLoading(true);
    try {
      await reportService.submitReport({
        property_id: propertyId,
        reason,
        description
      });
      toast.success('Report submitted to Admin for review');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-red-50/50 dark:bg-red-900/10">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
            <ShieldAlert className="w-5 h-5" />
            <h3>Report Property</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Reporting: <span className="font-bold text-gray-900 dark:text-white">{propertyTitle}</span>
            </p>
            
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Reason for Report
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 outline-none dark:text-white text-sm"
              required
            >
              <option value="">Select a reason...</option>
              {reasons.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Detailed Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide specific details about the issue..."
              className="w-full p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 outline-none dark:text-white text-sm"
              rows="4"
              required
            />
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-tight">
              Reports are sent directly to AccommoTrack Admins. False reporting may lead to account suspension.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
