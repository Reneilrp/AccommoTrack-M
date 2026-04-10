import React, { useEffect, useState, useCallback } from 'react';
import { Eye, CheckCircle, XCircle, FileText, Loader2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import ConfirmationModal from '../../components/Shared/ConfirmationModal';

const looksLikeHtmlDocument = (value) => {
  if (typeof value !== 'string') return false;
  return /^\s*</.test(value) && /<(?:!doctype\s+html|html)/i.test(value);
};

const normalizeVerificationsPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  if (payload && Array.isArray(payload.verifications)) return payload.verifications;
  return [];
};

export default function LandlordApproval() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fetchVerifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/landlord-verifications');
      const responseBody = res?.data;

      if (looksLikeHtmlDocument(responseBody)) {
        throw new Error('Unexpected HTML response from landlord-verifications endpoint');
      }

      const normalizedData = normalizeVerificationsPayload(responseBody);
      setVerifications(normalizedData);

      if (!Array.isArray(responseBody) && normalizedData.length === 0 && responseBody && typeof responseBody === 'object') {
        console.warn('Unexpected landlord verification payload shape:', responseBody);
      }
    } catch (err) {
      console.error('Failed to fetch landlord verifications:', err);
      const htmlResponseDetected =
        typeof err?.message === 'string' && err.message.toLowerCase().includes('html response');

      setError(
        htmlResponseDetected
          ? 'Failed to load verification requests: server returned HTML instead of JSON.'
          : 'Failed to load verification requests.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const toggleSelection = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleAll = () => {
    const safeVerifications = Array.isArray(verifications) ? verifications : [];
    if (selectedUserIds.length === safeVerifications.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(safeVerifications.map(v => v.user_id));
    }
  };

  const runBulkAction = async (action) => {
    if (selectedUserIds.length === 0) return;
    setConfirmModalState({ isOpen: false });
    
    if (action === 'reject' && (!rejectionReason.trim() || rejectionReason.trim().length < 10)) {
      toast.error('Please provide a detailed rejection reason (at least 10 characters) for bulk reject');
      return;
    }

    setActionLoading(`bulk:${action}`);

    try {
      const payload = { ids: selectedUserIds };
      if (action === 'reject') payload.reason = rejectionReason.trim();

      const res = await api.post(`/admin/users/bulk-${action}`, payload);
      toast.success(res.data?.message || `Bulk ${action} successful`);
      
      setVerifications(prev => prev.map(v => {
        if (selectedUserIds.includes(v.user_id)) {
          return {
            ...v,
            status: action === 'approve' ? 'approved' : 'rejected',
            rejection_reason: action === 'reject' ? rejectionReason.trim() : null,
            user: { ...v.user, is_verified: action === 'approve' }
          };
        }
        return v;
      }));

      setSelectedUserIds([]);
      if (action === 'reject') {
        setShowRejectModal(false);
        setRejectionReason('');
      }
    } catch (err) {
      console.error(`Failed to bulk ${action}`, err);
      toast.error(err.response?.data?.message || err.message || `Failed to bulk ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmApprove = (userId, verificationId) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Confirm Approval',
      message: 'Are you sure you want to approve this landlord? This will verify their account and send them a confirmation email.',
      onConfirm: () => handleApprove(userId, verificationId),
      confirmText: 'Approve',
      confirmButtonClass: 'bg-green-600 hover:bg-green-700'
    });
  };

  const handleApprove = async (userId, verificationId) => {
    setConfirmModalState({ isOpen: false });
    try {
      setActionLoading(true);
      await api.post(`/admin/users/${userId}/approve`);
      
      setVerifications(prev => prev.map(v => 
        v.id === verificationId 
          ? { ...v, status: 'approved', user: { ...v.user, is_verified: true } } 
          : v
      ));
      toast.success('Landlord approved successfully! Confirmation email sent.');
      setShowModal(false);
    } catch (err) {
      console.error('Approval failed:', err);
      toast.error('Failed to approve landlord');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (isBulk = false) => {
    setRejectionReason('');
    setShowRejectModal(isBulk ? 'bulk' : 'single');
  };

  const confirmReject = () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
      toast.error('Please provide a detailed rejection reason (at least 10 characters)');
      return;
    }
    const isBulk = showRejectModal === 'bulk';
    setConfirmModalState({
      isOpen: true,
      title: isBulk ? `Reject ${selectedUserIds.length} Application(s)` : 'Confirm Rejection',
      message: isBulk
        ? `Are you sure you want to reject ${selectedUserIds.length} selected applications? Each landlord will be notified.`
        : 'Are you sure you want to reject this application? The reason will be sent to the landlord.',
      onConfirm: isBulk ? () => runBulkAction('reject') : handleReject,
      confirmText: 'Reject',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700'
    });
  };
  
  const handleReject = async () => {
    setConfirmModalState({ isOpen: false });
    try {
      setActionLoading(true);
      await api.post(`/admin/landlord-verifications/${selectedVerification.id}/reject`, {
        reason: rejectionReason.trim()
      });
      
      setVerifications(prev => prev.map(v => 
        v.id === selectedVerification.id 
          ? { ...v, status: 'rejected', rejection_reason: rejectionReason.trim(), user: { ...v.user, is_verified: false } } 
          : v
      ));
      toast.success('Application rejected. The landlord has been notified via email.');
      setShowRejectModal(false);
      setShowModal(false);
      setRejectionReason('');
    } catch (err) {
      console.error('Rejection failed:', err);
      toast.error(err.response?.data?.message || 'Failed to reject application');
    } finally {
      setActionLoading(null);
    }
  };

  const openDocumentModal = (verification) => {
    setSelectedVerification(verification);
    setShowModal(true);
  };

  const FilePreview = ({ path, label }) => {
    const url = path ? getImageUrl(path) : null;
    const ext = typeof path === 'string' ? path.split('.').pop().toLowerCase() : '';
    const isImage = url && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);

    if (isImage) {
      return (
        <img 
          src={url} 
          alt={label} 
          className="w-full h-auto rounded object-contain max-h-[420px]" 
        />
      );
    }

    if (url) {
      return (
        <div className="min-h-[280px] flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
          <FileText className="w-16 h-16 text-blue-500 mb-4" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase">
            {ext} Document
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Click below to view or download</p>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <Eye className="w-4 h-4" /> View Document
          </a>
        </div>
      );
    }
    
    // Fallback for when no file is provided.
    return (
      <div className="min-h-[280px] flex items-center justify-center text-gray-500 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
        No {label} provided
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-gray-600">Loading requests...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 bg-red-50 p-4 rounded-lg border border-red-100">{error}</div>;
  }

  const safeVerifications = Array.isArray(verifications) ? verifications : [];
  const selectedVerificationStatus = (selectedVerification?.status || '').toLowerCase();

  return (
    <div className="w-full">
      <ConfirmationModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false })}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
        confirmButtonClass={confirmModalState.confirmButtonClass}
      />
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Landlord Verification Requests</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Review submitted IDs and business permits.</p>
      </div>

      {safeVerifications.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg border-dashed">
          <p className="text-gray-500 dark:text-gray-400">No verification requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {selectedUserIds.length > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                {selectedUserIds.length} landlord{selectedUserIds.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => runBulkAction('approve')}
                  disabled={typeof actionLoading === 'string' && actionLoading.startsWith('bulk:')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading === 'bulk:approve' ? 'Approving...' : 'Approve Selected'}
                </button>
                <button
                  onClick={() => openRejectModal(true)}
                  disabled={typeof actionLoading === 'string' && actionLoading.startsWith('bulk:')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Reject Selected
                </button>
                <button
                  onClick={() => setSelectedUserIds([])}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium"
                >
                  Cancel Selection
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      checked={safeVerifications.length > 0 && selectedUserIds.length === safeVerifications.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-6 py-4 font-semibold">Applicant</th>
                  <th className="px-6 py-4 font-semibold">ID Type</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Submitted</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {safeVerifications.map((v) => (
                  <tr key={v.id} className={`${selectedUserIds.includes(v.user_id) ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'} transition-colors`}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        checked={selectedUserIds.includes(v.user_id)}
                        onChange={() => toggleSelection(v.user_id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">{v.first_name} {v.last_name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{v.user?.email}</span>
                      </div>
                    </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {v.valid_id_type || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const verificationStatus = typeof v.status === 'string'
                        ? v.status.toLowerCase()
                        : 'pending';
                      const statusClasses = verificationStatus === 'approved'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : verificationStatus === 'rejected'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';

                      const statusLabel = verificationStatus === 'approved'
                        ? 'Approved'
                        : verificationStatus === 'rejected'
                        ? 'Rejected'
                        : 'Pending Review';

                      return (
                    <span className={`px-2 py-2 rounded-full text-xs font-semibold ${
                      statusClasses
                    }`}>
                      {statusLabel}
                    </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {v.created_at ? new Date(v.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openDocumentModal(v)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium inline-flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        </div>
      )}

      {/* Modal for viewing documents */}
      {showModal && selectedVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verification Documents</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                   applicant: {selectedVerification.first_name} {selectedVerification.last_name}
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-500 dark:text-gray-500" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4 text-center sm:text-left">
                <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-semibold border-b dark:border-gray-700 pb-2">
                  <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h4>Valid ID ({selectedVerification.valid_id_type})</h4>
                </div>
                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                  <FilePreview path={selectedVerification.valid_id_path} label="Valid ID" />
                </div>
              </div>

              <div className="space-y-4 text-center sm:text-left">
                <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-semibold border-b dark:border-gray-700 pb-2">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h4>Business Permit / Authorization</h4>
                </div>
                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                  <FilePreview path={selectedVerification.permit_path} label="Permit" />
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4 sticky bottom-0">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              
              {selectedVerificationStatus === 'pending' && (
                <>
                  <button
                    onClick={openRejectModal}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Application
                  </button>
                  <button
                    onClick={() => confirmApprove(selectedVerification.user_id, selectedVerification.id)}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve Application
                  </button>
                </>
              )}

              {selectedVerificationStatus === 'rejected' && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">This application was rejected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && (showRejectModal === 'bulk' || selectedVerification) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {showRejectModal === 'bulk' ? `Reject ${selectedUserIds.length} Applications` : 'Reject Application'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {showRejectModal === 'bulk'
                      ? `${selectedUserIds.length} landlord application(s) will receive a rejection notification.`
                      : `Rejecting: ${selectedVerification?.first_name} ${selectedVerification?.last_name}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a detailed reason for rejection (e.g., 'The submitted ID is blurry and unreadable. Please upload a clearer image.')"
                className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={4}
                disabled={actionLoading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                This reason will be sent to the landlord via email and displayed in their account.
              </p>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={actionLoading || rejectionReason.trim().length < 10}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
