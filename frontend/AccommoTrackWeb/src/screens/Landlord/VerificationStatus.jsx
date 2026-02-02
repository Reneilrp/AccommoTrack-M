import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Upload, 
  FileText, 
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// Get base storage URL from environment
const STORAGE_BASE_URL = import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000/storage';

// Normalize image URL to use frontend's configured base URL
const normalizeImageUrl = (url) => {
  if (!url) return null;
  
  // If it's already using the correct base URL, return as is
  if (url.startsWith(STORAGE_BASE_URL)) {
    return url;
  }
  
  // Extract the path after /storage/ and reconstruct with our base URL
  const storageMatch = url.match(/\/storage\/(.+)$/);
  if (storageMatch) {
    return `${STORAGE_BASE_URL}/${storageMatch[1]}`;
  }
  
  // Fallback: return original URL
  return url;
};

// Document Preview Component - handles both images and PDFs
const DocumentPreview = ({ path, alt }) => {
  const [imageError, setImageError] = useState(false);
  
  // Normalize the URL to use frontend's configured storage URL
  const normalizedPath = normalizeImageUrl(path);
  
  if (!normalizedPath) {
    return (
      <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500">
        No document uploaded
      </div>
    );
  }

  const isPdf = normalizedPath.toLowerCase().endsWith('.pdf');
  
  if (isPdf) {
    return (
      <a
        href={normalizedPath}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
      >
        <FileText className="w-12 h-12 mb-2 text-red-500 dark:text-red-400" />
        <span className="text-sm font-medium">View PDF Document</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Opens in new tab
        </span>
      </a>
    );
  }

  if (imageError) {
    return (
      <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
        <ImageIcon className="w-10 h-10 mb-2" />
        <span className="text-sm">Failed to load image</span>
        <a 
          href={normalizedPath} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline mt-2 flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" /> Open in new tab
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
      <img
        src={normalizedPath}
        alt={alt}
        className="w-full h-full object-contain"
        onError={(e) => {
          console.error('Image failed to load:', normalizedPath, e);
          setImageError(true);
        }}
      />
      <a
        href={normalizedPath}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 rounded-md shadow-sm transition-colors"
        title="Open in new tab"
      >
        <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </a>
    </div>
  );
};

export default function VerificationStatus() {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idTypes, setIdTypes] = useState([]);

  // Resubmission form state
  const [resubmitForm, setResubmitForm] = useState({
    validIdType: '',
    validIdOther: '',
    validId: null,
    permit: null,
  });

  useEffect(() => {
    fetchVerificationStatus();
    fetchIdTypes();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/landlord/my-verification');
      setVerification(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setVerification({ status: 'not_submitted' });
      } else {
        console.error('Failed to fetch verification:', err);
        setError('Failed to load verification status');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchIdTypes = async () => {
    try {
      const res = await api.get('/valid-id-types');
      setIdTypes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch ID types:', err);
      // Fallback
      setIdTypes(['Philippine Passport', "Driver's License", 'PhilSys ID (National ID)', 'UMID']);
    }
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    
    if (!resubmitForm.validIdType) {
      toast.error('Please select a valid ID type');
      return;
    }
    if (resubmitForm.validIdType === 'other' && !resubmitForm.validIdOther) {
      toast.error('Please specify your ID type');
      return;
    }
    if (!resubmitForm.validId || !resubmitForm.permit) {
      toast.error('Please upload both documents');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('valid_id_type', resubmitForm.validIdType === 'other' ? resubmitForm.validIdOther : resubmitForm.validIdType);
      if (resubmitForm.validIdType === 'other') {
        formData.append('valid_id_other', resubmitForm.validIdOther);
      }
      formData.append('valid_id', resubmitForm.validId);
      formData.append('permit', resubmitForm.permit);

      await api.post('/landlord/resubmit-verification', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Documents resubmitted successfully! Please wait for admin review.');
      setShowResubmitForm(false);
      setResubmitForm({ validIdType: '', validIdOther: '', validId: null, permit: null });
      fetchVerificationStatus();
    } catch (err) {
      console.error('Resubmission failed:', err);
      toast.error(err.response?.data?.message || 'Failed to resubmit documents');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Verified',
          description: 'Your account is verified. You can create and publish properties.',
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Rejected',
          description: 'Your verification was rejected. Please review the reason below and resubmit.',
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Pending Review',
          description: 'Your documents are under review. This typically takes 1-3 business days.',
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Not Submitted',
          description: 'Please submit your verification documents.',
        };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading verification status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-300">Error</h3>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchVerificationStatus}
          className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(verification?.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={`${statusConfig.bgColor} ${statusConfig.borderColor} border rounded-xl p-6`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 ${statusConfig.bgColor} rounded-full`}>
            <StatusIcon className={`w-8 h-8 ${statusConfig.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className={`text-xl font-bold ${statusConfig.color}`}>
                {statusConfig.label}
              </h3>
              {verification?.status === 'pending' && (
                <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full animate-pulse">
                  Under Review
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{statusConfig.description}</p>
            
            {verification?.reviewed_at && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Last reviewed: {new Date(verification.reviewed_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Reason */}
      {verification?.status === 'rejected' && verification?.rejection_reason && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800 dark:text-red-300">Reason for Rejection</h4>
              <p className="text-red-700 dark:text-red-400 mt-1">{verification.rejection_reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Documents (if any) */}
      {verification?.status && verification.status !== 'not_submitted' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <h4 className="font-semibold text-gray-800 dark:text-white">Submitted Documents</h4>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Valid ID */}
            <div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium mb-3">
                <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Valid ID ({verification.valid_id_type})</span>
              </div>
              <DocumentPreview 
                path={verification.valid_id_path} 
                alt="Valid ID"
              />
            </div>
            {/* Permit */}
            <div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium mb-3">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Business/Accommodation Permit</span>
              </div>
              <DocumentPreview 
                path={verification.permit_path} 
                alt="Permit"
              />
            </div>
          </div>
        </div>
      )}

      {/* Resubmit Button */}
      {verification?.status === 'rejected' && !showResubmitForm && (
        <button
          onClick={() => setShowResubmitForm(true)}
          className="w-full px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Resubmit Documents
        </button>
      )}

      {/* Resubmit Form */}
      {showResubmitForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-emerald-50 dark:bg-emerald-900/20">
            <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">Resubmit Verification Documents</h4>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">Please ensure your documents are clear and legible.</p>
          </div>
          <form onSubmit={handleResubmit} className="p-6 space-y-6">
            {/* ID Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Valid ID Type <span className="text-red-500">*</span>
              </label>
              <select
                value={resubmitForm.validIdType}
                onChange={(e) => setResubmitForm(prev => ({ ...prev, validIdType: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={submitting}
              >
                <option value="">Select ID Type</option>
                {idTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
                <option value="other">Other (specify below)</option>
              </select>
            </div>

            {resubmitForm.validIdType === 'other' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Specify ID Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={resubmitForm.validIdOther}
                  onChange={(e) => setResubmitForm(prev => ({ ...prev, validIdOther: e.target.value }))}
                  placeholder="Enter your ID type"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  disabled={submitting}
                />
              </div>
            )}

            {/* Valid ID Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Valid ID Image <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setResubmitForm(prev => ({ ...prev, validId: e.target.files[0] }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700 dark:file:bg-emerald-900/50 dark:file:text-emerald-300 file:font-medium hover:file:bg-emerald-200 dark:hover:file:bg-emerald-900/70"
                disabled={submitting}
              />
              {resubmitForm.validId && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selected: {resubmitForm.validId.name}</p>
              )}
            </div>

            {/* Permit Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Business/Accommodation Permit <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setResubmitForm(prev => ({ ...prev, permit: e.target.files[0] }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700 dark:file:bg-emerald-900/50 dark:file:text-emerald-300 file:font-medium hover:file:bg-emerald-200 dark:hover:file:bg-emerald-900/70"
                disabled={submitting}
              />
              {resubmitForm.permit && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selected: {resubmitForm.permit.name}</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowResubmitForm(false);
                  setResubmitForm({ validIdType: '', validIdOther: '', validId: null, permit: null });
                }}
                disabled={submitting}
                className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Submit for Review
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Submission History */}
      {verification?.history && verification.history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-semibold text-gray-800 dark:text-white">Submission History</span>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-full">
                {verification.history.length}
              </span>
            </div>
            {showHistory ? (
              <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            )}
          </button>
          
          {showHistory && (
            <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {verification.history.map((entry, index) => (
                <div key={entry.id || index} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        entry.status === 'approved' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : entry.status === 'rejected'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {entry.status}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{entry.valid_id_type}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {entry.submitted_at && new Date(entry.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                  {entry.rejection_reason && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2 pl-2 border-l-2 border-red-200 dark:border-red-700">
                      {entry.rejection_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
