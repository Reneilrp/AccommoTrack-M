import React, { useEffect, useState } from 'react';
import { Eye, CheckCircle, XCircle, FileText, Loader2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';

export default function LandlordApproval() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      setError('');
      // Route::get('/landlord-verifications', [LandlordVerificationController::class, 'index']);
      const res = await api.get('/admin/landlord-verifications');
      // Filter for pending by default, or maybe the API returns all. 
      // The requirement focuses on "Approving", so usually pending ones are most relevant.
      // Let's assume the API returns all and filter client side or display status.
      // For now, let's display all but sort "pending" to top.
      const data = res.data.data || res.data || [];
      setVerifications(data);
    } catch (err) {
      console.error('Failed to fetch landlord verifications:', err);
      setError('Failed to load verification requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, verificationId) => {
    if (!confirm('Are you sure you want to approve this landlord? This will verify their account and send them a confirmation email.')) return;
    
    try {
      setActionLoading(true);
      // Approve user verification status
      await api.post(`/admin/users/${userId}/approve`);
      
      // Update local state
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
      setActionLoading(false);
    }
  };

  const openRejectModal = () => {
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
      toast.error('Please provide a detailed rejection reason (at least 10 characters)');
      return;
    }

    try {
      setActionLoading(true);
      // Call the reject endpoint with reason
      await api.post(`/admin/landlord-verifications/${selectedVerification.id}/reject`, {
        reason: rejectionReason.trim()
      });
      
      // Update local state
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
      setActionLoading(false);
    }
  };

  const openDocumentModal = (verification) => {
    setSelectedVerification(verification);
    setShowModal(true);
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

  return (
    <div className="w-full">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Landlord Verification Requests</h3>
        <p className="text-sm text-gray-500">Review submitted IDs and business permits.</p>
      </div>

      {verifications.length === 0 ? (
        <div className="text-center py-8 bg-white border border-gray-200 rounded-lg border-dashed">
          <p className="text-gray-500">No verification requests found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Applicant</th>
                <th className="px-6 py-4 font-semibold">ID Type</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Submitted</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {verifications.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{v.first_name} {v.last_name}</span>
                      <span className="text-xs text-gray-500">{v.user?.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {v.valid_id_type || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      v.user?.is_verified || v.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : v.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {v.user?.is_verified ? 'Verified' : (v.status === 'rejected' ? 'Rejected' : (v.status || 'Pending'))}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(v.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openDocumentModal(v)}
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-medium inline-flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for viewing documents */}
      {showModal && selectedVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Verification Documents</h3>
                <p className="text-sm text-gray-500">
                   applicant: {selectedVerification.first_name} {selectedVerification.last_name}
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-semibold border-b pb-2">
                  <ImageIcon className="w-5 h-5 text-emerald-600" />
                  <h4>Valid ID ({selectedVerification.valid_id_type})</h4>
                </div>
                <div className="bg-gray-100 rounded-lg p-2 border border-gray-200">
                  {selectedVerification.valid_id_path ? (
                    <img 
                      src={getImageUrl(selectedVerification.valid_id_path)} 
                      alt="Valid ID" 
                      className="w-full h-auto rounded object-contain max-h-[400px]" 
                    />
                  ) : (
                    <div className="h-40 flex items-center justify-center text-gray-400">No Image</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-semibold border-b pb-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <h4>Business Permit / Authorization</h4>
                </div>
                <div className="bg-gray-100 rounded-lg p-2 border border-gray-200">
                  {selectedVerification.permit_path ? (
                    <img 
                      src={getImageUrl(selectedVerification.permit_path)} 
                      alt="Permit" 
                      className="w-full h-auto rounded object-contain max-h-[400px]" 
                    />
                  ) : (
                    <div className="h-40 flex items-center justify-center text-gray-400">No Image</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              
              {!selectedVerification.user?.is_verified && selectedVerification.status !== 'approved' && selectedVerification.status !== 'rejected' && (
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
                    onClick={() => handleApprove(selectedVerification.user_id, selectedVerification.id)}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve Application
                  </button>
                </>
              )}

              {selectedVerification.status === 'rejected' && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">This application was rejected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && selectedVerification && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Reject Application</h3>
                  <p className="text-sm text-gray-500">
                    Rejecting: {selectedVerification.first_name} {selectedVerification.last_name}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a detailed reason for rejection (e.g., 'The submitted ID is blurry and unreadable. Please upload a clearer image.')"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={4}
                disabled={actionLoading}
              />
              <p className="text-xs text-gray-500 mt-2">
                This reason will be sent to the landlord via email and displayed in their account.
              </p>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
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
