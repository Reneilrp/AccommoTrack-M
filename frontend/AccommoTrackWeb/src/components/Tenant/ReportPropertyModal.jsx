import React, { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
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

export default function ReportPropertyModal({ isOpen, onClose, propertyId, propertyTitle }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) { toast.error('Please select a reason for your report.'); return; }
    if (description.length < 10) { toast.error('Please provide a description of at least 10 characters.'); return; }

    setSubmitting(true);
    try {
      const res = await api.post('/reports', { property_id: propertyId, reason, description });
      if (res.data?.success !== false) {
        toast.success('Report submitted. Admins will review this listing.');
        setReason('');
        setDescription('');
        onClose();
      } else {
        toast.error(res.data?.message || 'Failed to submit report');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Report Listing</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{propertyTitle || 'Property'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Reasons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason for Report</label>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      reason === r
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className={`text-sm ${reason === r ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {r}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Please provide specific details about the issue..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Reports are sent to Admins. Abuse of the reporting system may result in account restriction.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit Report
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
