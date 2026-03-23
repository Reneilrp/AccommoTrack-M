import React, { useState } from 'react';
import { AlertTriangle, X, Loader2, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const REASONS = [
  'Inaccurate Listing Photos/Details',
  'Safety or Security Concerns',
  'Landlord Misconduct/Harassment',
  'Payment Issues (Charging outside app)',
  'Scam or Fraudulent Activity',
  'Other',
];

export default function ReportPropertyModal({ propertyId, propertyTitle = 'Property', isOpen, onClose }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return toast.error('Please select a reason for your report.');
    if (description.length < 10) return toast.error('Description must be at least 10 characters.');

    setSubmitting(true);
    try {
      const res = await api.post('/reports', { property_id: propertyId, reason, description });
      toast.success('Report submitted. Admins will review this listing.');
      setReason('');
      setDescription('');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Report Listing</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[250px]">{propertyTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Reasons */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Reason for Report</label>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                    reason === r
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600"
                  />
                  <span className={`text-sm ${reason === r ? 'font-semibold text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{r}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide specific details about the issue..."
              rows={4}
              className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Reports are sent to AccommoTrack Admins. Abuse of the reporting system may result in account restriction.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-4 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
