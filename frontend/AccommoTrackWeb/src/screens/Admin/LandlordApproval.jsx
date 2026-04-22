import React, { useEffect, useState, useCallback } from 'react';
import { Eye, Check, CheckCircle, X, XCircle, Ban, Pencil, FileText, Loader2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';
import adminService from '../../services/adminService';
import { showSuccess, showError } from '../../utils/toast';
import ConfirmationModal from '../../components/Shared/ConfirmationModal';

const normalizeVerificationStatus = (status) => {
  if (typeof status !== 'string') return 'pending';
  return status.toLowerCase();
};

const getVerificationStatusMeta = (status) => {
  const normalized = normalizeVerificationStatus(status);

  switch (normalized) {
    case 'approved':
      return {
        classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        label: 'Approved',
      };
    case 'partial_verified':
      return {
        classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        label: 'Partial Verified',
      };
    case 'pending_documents_review':
      return {
        classes: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        label: 'Pending Docs Review',
      };
    case 'rejected':
      return {
        classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        label: 'Rejected',
      };
    default:
      return {
        classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        label: 'Pending',
      };
  }
};

const isSelectableVerification = (verification) => normalizeVerificationStatus(verification?.status) === 'pending';

export default function LandlordApproval() {
  const [verifications, setVerifications] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  const fetchVerifications = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getLandlordVerifications({ page });
      
      if (res.success) {
        setVerifications(res.data.items || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      } else {
        setError(res.error || 'Failed to fetch verifications');
      }
    } catch (err) {
      console.error('Failed to fetch landlord verifications:', err);
      setError('An error occurred while loading verifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerifications(1);
  }, [fetchVerifications]);

  const toggleSelection = (userId) => {
    const targetVerification = verifications.find((item) => item.user_id === userId);
    if (!isSelectableVerification(targetVerification)) return;

    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleAll = () => {
    const safeVerifications = Array.isArray(verifications) ? verifications : [];
    const selectableUserIds = safeVerifications
      .filter((verification) => isSelectableVerification(verification))
      .map((verification) => verification.user_id);

    if (selectedUserIds.length === selectableUserIds.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(selectableUserIds);
    }
  };

  const toggleEditMode = () => {
    setIsEditMode((prev) => {
      if (prev) {
        setSelectedUserIds([]);
      }
      return !prev;
    });
  };

  const runBulkAction = async (action) => {
    if (selectedUserIds.length === 0) return;

    const selectableUserIds = (Array.isArray(verifications) ? verifications : [])
      .filter((verification) => isSelectableVerification(verification))
      .map((verification) => verification.user_id);
    const pendingSelectedUserIds = selectedUserIds.filter((id) => selectableUserIds.includes(id));

    if (pendingSelectedUserIds.length === 0) {
      showError('Only pending applications can be selected.');
      setSelectedUserIds([]);
      return;
    }

    if (pendingSelectedUserIds.length !== selectedUserIds.length) {
      setSelectedUserIds(pendingSelectedUserIds);
    }

    setConfirmModalState({ isOpen: false });

    if (action === 'reject' && (!rejectionReason.trim() || rejectionReason.trim().length < 10)) {
      showError('Please provide a detailed rejection reason (at least 10 characters) for bulk reject');
      return;
    }

    setActionLoading(`bulk:${action}`);

    try {
      const payload = { ids: pendingSelectedUserIds };
      if (action === 'reject') payload.reason = rejectionReason.trim();

      const res = await api.post(`/admin/users/bulk-${action}`, payload);
      showSuccess(res.data?.message || `Bulk ${action} successful`);

      setVerifications(prev => prev.map(v => {
        if (pendingSelectedUserIds.includes(v.user_id)) {
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
      showError(err.response?.data?.message || err.message || `Failed to bulk ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmApprove = (userId, verificationId) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Confirm Final Approval',
      message: 'Are you sure you want to finalize approval? This will mark the landlord as fully verified and send a confirmation email.',
      onConfirm: () => handleApprove(userId, verificationId),
      confirmText: 'Approve',
      confirmButtonClass: 'bg-green-600 hover:bg-green-700'
    });
  };

  const confirmPartialVerify = (userId, verificationId) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Set Partial Verification',
      message: 'This will allow landlord login and set a 7-day document submission window. Continue?',
      onConfirm: () => handlePartialVerify(userId, verificationId),
      confirmText: 'Set Partial',
      confirmButtonClass: 'bg-blue-600 hover:bg-blue-700',
    });
  };

  const handlePartialVerify = async (userId, verificationId) => {
    setConfirmModalState({ isOpen: false });

    try {
      setActionLoading(`partial:${verificationId}`);
      const res = await api.post(`/admin/users/${userId}/partial-verify`, { duration_days: 7 });
      const updatedVerification = res.data?.verification || null;

      setVerifications(prev => prev.map(v => {
        if (v.id !== verificationId) return v;
        return {
          ...v,
          status: 'partial_verified',
          rejection_reason: null,
          reviewed_at: updatedVerification?.reviewed_at || v.reviewed_at,
          document_due_at: updatedVerification?.document_due_at || v.document_due_at,
        };
      }));

      showSuccess(res.data?.message || 'Landlord moved to partial verification');
      setShowModal(false);
    } catch (err) {
      console.error('Partial verification failed:', err);
      showError(err.response?.data?.message || 'Failed to set partial verification');
    } finally {
      setActionLoading(null);
    }
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
      showSuccess('Landlord approved successfully! Confirmation email sent.');
      setShowModal(false);
    } catch (err) {
      console.error('Approval failed:', err);
      showError('Failed to approve landlord');
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
      showError('Please provide a detailed rejection reason (at least 10 characters)');
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
      showSuccess('Application rejected. The landlord has been notified via email.');
      setShowRejectModal(false);
      setShowModal(false);
      setRejectionReason('');
    } catch (err) {
      console.error('Rejection failed:', err);
      showError(err.response?.data?.message || 'Failed to reject application');
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
  const selectableVerifications = safeVerifications.filter((verification) => isSelectableVerification(verification));
  const canShowSelectionColumn = isEditMode && selectableVerifications.length > 0;
  const selectedVerificationStatus = (selectedVerification?.status || '').toLowerCase();
  const selectedVerificationHistory = Array.isArray(selectedVerification?.history)
    ? selectedVerification.history
    : [];
  const bulkActionLoading = typeof actionLoading === 'string' && actionLoading.startsWith('bulk:');

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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Landlord Verification Requests</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Review submitted IDs and business permits.</p>
        </div>
        {selectableVerifications.length > 0 && (
          <button
            onClick={toggleEditMode}
            className={`shrink-0 h-10 w-10 inline-flex items-center justify-center border rounded-lg transition-colors ${isEditMode
                ? 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            title={isEditMode ? 'Exit edit mode' : 'Edit'}
            aria-label={isEditMode ? 'Exit edit mode' : 'Edit'}
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {safeVerifications.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg border-dashed">
          <p className="text-gray-500 dark:text-gray-400">No verification requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {isEditMode && (
            <div className="flex items-center justify-end gap-2">
              <span className="mr-2 text-sm text-gray-600 dark:text-gray-300">
                {selectedUserIds.length} selected
              </span>
              <button
                onClick={() => runBulkAction('approve')}
                disabled={selectedUserIds.length === 0 || bulkActionLoading}
                className="h-10 w-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title="Approve selected"
                aria-label="Approve selected"
              >
                {actionLoading === 'bulk:approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setSelectedUserIds([]);
                  setIsEditMode(false);
                }}
                disabled={bulkActionLoading}
                className="h-10 w-10 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title="Cancel"
                aria-label="Cancel"
              >
                <Ban className="w-4 h-4" />
              </button>
              <button
                onClick={() => openRejectModal(true)}
                disabled={selectedUserIds.length === 0 || bulkActionLoading}
                className="h-10 w-10 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reject selected"
                aria-label="Reject selected"
              >
                {actionLoading === 'bulk:reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    {canShowSelectionColumn && (
                      <th className="px-6 py-4 font-semibold w-12">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          checked={selectableVerifications.length > 0 && selectedUserIds.length === selectableVerifications.length}
                          disabled={selectableVerifications.length === 0}
                          onChange={toggleAll}
                        />
                      </th>
                    )}
                    <th className="px-6 py-4 font-semibold">Applicant</th>
                    <th className="px-6 py-4 font-semibold">ID Type</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Submitted</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {safeVerifications.map((v) => {
                    const selectable = isSelectableVerification(v);

                    return (
                      <tr key={v.id} className={`${isEditMode && selectedUserIds.includes(v.user_id) ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'} transition-colors`}>
                        {canShowSelectionColumn && (
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                              checked={selectedUserIds.includes(v.user_id)}
                              disabled={!selectable}
                              onChange={() => toggleSelection(v.user_id)}
                            />
                          </td>
                        )}
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
                            const statusMeta = getVerificationStatusMeta(v.status);

                            return (
                              <span className={`px-2 py-2 rounded-full text-xs font-semibold ${statusMeta.classes}`}>
                                {statusMeta.label}
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
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.lastPage > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => fetchVerifications(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchVerifications(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.lastPage}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-400">
                      Showing page <span className="font-medium">{pagination.currentPage}</span> of <span className="font-medium">{pagination.lastPage}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => fetchVerifications(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      {[...Array(pagination.lastPage)].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => fetchVerifications(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pagination.currentPage === i + 1
                              ? 'z-10 bg-amber-50 border-amber-500 text-amber-600'
                              : 'bg-white dark:bg-gray-800 border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => fetchVerifications(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.lastPage}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
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

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
              {selectedVerification.document_due_at && (
                <div className="md:col-span-3 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Document deadline: {new Date(selectedVerification.document_due_at).toLocaleDateString()}
                  </p>
                </div>
              )}

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
                  <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4>Valid ID Back ({selectedVerification.valid_id_type})</h4>
                </div>
                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                  <FilePreview path={selectedVerification.valid_id_back_path} label="Valid ID Back" />
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

            {selectedVerificationHistory.length > 0 && (
              <div className="px-6 pb-6">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                    Previous Submissions
                  </h4>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {selectedVerificationHistory.length}
                  </span>
                </div>

                <div className="space-y-6">
                  {selectedVerificationHistory.map((entry, index) => {
                    const statusMeta = getVerificationStatusMeta(entry.status);

                    return (
                      <div key={entry.id || index} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40">
                        <div className="flex items-center justify-between mb-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusMeta.classes}`}>
                            {statusMeta.label}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {entry.submitted_at ? new Date(entry.submitted_at).toLocaleString() : 'Date unavailable'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Valid ID</p>
                            <FilePreview path={entry.valid_id_path} label="Previous Valid ID" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Valid ID Back</p>
                            <FilePreview path={entry.valid_id_back_path} label="Previous Valid ID Back" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Permit</p>
                            <FilePreview path={entry.permit_path} label="Previous Permit" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4 sticky bottom-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>

              {(selectedVerificationStatus === 'pending' || selectedVerificationStatus === 'pending_documents_review') && (
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
                    onClick={() => confirmPartialVerify(selectedVerification.user_id, selectedVerification.id)}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
                  >
                    {actionLoading === `partial:${selectedVerification.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Partial Verification
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

              {selectedVerificationStatus === 'partial_verified' && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Waiting for landlord documents</span>
                </div>
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
