import React, { useEffect, useState, useCallback } from 'react';
import { Mail, Phone, Clock, CheckCircle, Archive, Trash2, X, Send, RefreshCw, ArrowRight, Key, Copy, Search } from 'lucide-react';
import api from '../../utils/api';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const defaultInquiryPermissions = {
  can_update_inquiry_basic: true,
  can_reply_inquiry: true,
  can_escalate_inquiry: true,
  can_close_inquiry: true,
  can_archive_inquiry: true,
  can_delete_inquiry: true,
};

const InquiryManagement = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [permissions, setPermissions] = useState(defaultInquiryPermissions);
  const [adminTier, setAdminTier] = useState('super_admin');
  
  // Reply states
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  
  // Password reset states
  const [passwordResetFlow, setPasswordResetFlow] = useState({
    isOpen: false,
    userEmail: '',
    reason: '',
    searchingUser: false,
    generatingLink: false,
    foundUser: null,
    resetLink: '',
  });

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/inquiries?page=${page}`);
      setInquiries(res.data.data || []);
      setTotalPages(res.data.last_page || 1);
      if (res?.data?.permissions) {
        setPermissions({
          ...defaultInquiryPermissions,
          ...res.data.permissions,
        });
      }
      if (res?.data?.admin_tier) {
        setAdminTier(res.data.admin_tier);
      }
    } catch (err) {
      console.error('Failed to fetch inquiries', err);
      toast.error('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const getPermissionMessage = (status) => {
    if (status === 'escalated' && !permissions.can_escalate_inquiry) return 'Escalation is restricted to super admins.';
    if (status === 'closed' && !permissions.can_close_inquiry) return 'Closing inquiries is restricted to super admins.';
    if (status === 'archived' && !permissions.can_archive_inquiry) return 'Archiving inquiries is restricted to super admins.';
    return '';
  };

  const canApplyStatus = (status) => {
    if (status === 'escalated') return permissions.can_escalate_inquiry;
    if (status === 'closed') return permissions.can_close_inquiry;
    if (status === 'archived') return permissions.can_archive_inquiry;
    return permissions.can_update_inquiry_basic;
  };

  const handleUpdateStatus = async (id, status) => {
    if (!canApplyStatus(status)) {
      toast.error(getPermissionMessage(status) || 'This action is restricted for your admin tier.');
      return;
    }

    try {
      await api.patch(`/admin/inquiries/${id}`, { status });
      toast.success(`Inquiry marked as ${status}`);
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, status, responded_at: status === 'responded' ? new Date().toISOString() : i.responded_at } : i));
      if (selectedInquiry?.id === id) {
        setSelectedInquiry(prev => ({ ...prev, status }));
      }
    } catch (__err) {
      toast.error('Failed to update status');
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim()) {
      toast.error('Please enter a message to send');
      return;
    }

    if (!permissions.can_reply_inquiry) {
      toast.error('Replying to inquiries is restricted for your admin tier.');
      return;
    }

    setSendingReply(true);
    try {
      const res = await api.post(`/admin/inquiries/${selectedInquiry.id}/reply`, {
        message: replyMessage
      });
      
      toast.success('Reply sent successfully via email!');
      
      // Update local state
      const updatedInquiry = res.data.inquiry;
      setInquiries(prev => prev.map(i => i.id === updatedInquiry.id ? updatedInquiry : i));
      setSelectedInquiry(updatedInquiry);
      
      // Reset reply field
      setReplyMessage('');
    } catch (err) {
      console.error('Failed to send reply', err);
      toast.error(err.response?.data?.message || 'Failed to send reply. Check your email configuration.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async (id) => {
    if (!permissions.can_delete_inquiry) {
      toast.error('Deleting inquiries is restricted to super admins.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
    try {
      await api.delete(`/admin/inquiries/${id}`);
      toast.success('Inquiry deleted');
      setInquiries(prev => prev.filter(i => i.id !== id));
      if (selectedInquiry?.id === id) {
        setShowModal(false);
        setSelectedInquiry(null);
      }
    } catch (__err) {
      toast.error('Failed to delete inquiry');
    }
  };

  const openModal = (inquiry) => {
    setSelectedInquiry(inquiry);
    setReplyMessage(''); // Clear previous reply
    setPasswordResetFlow({
      isOpen: false,
      userEmail: inquiry.email || '',
      reason: '',
      searchingUser: false,
      generatingLink: false,
      foundUser: null,
      resetLink: '',
    });
    setShowModal(true);
  };

  const openPasswordResetFlow = () => {
    setPasswordResetFlow(prev => ({
      ...prev,
      isOpen: true,
      userEmail: selectedInquiry?.email || '',
      reason: `Password reset requested via inquiry #${selectedInquiry?.id} from ${selectedInquiry?.name}`,
    }));
  };

  const closePasswordResetFlow = () => {
    setPasswordResetFlow({
      isOpen: false,
      userEmail: '',
      reason: '',
      searchingUser: false,
      generatingLink: false,
      foundUser: null,
      resetLink: '',
    });
  };

  const searchUserForReset = async () => {
    if (!passwordResetFlow.userEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setPasswordResetFlow(prev => ({ ...prev, searchingUser: true, foundUser: null, resetLink: '' }));
    
    try {
      const result = await adminService.searchUserByEmail(passwordResetFlow.userEmail);
      if (result.success && result.data) {
        setPasswordResetFlow(prev => ({ ...prev, foundUser: result.data, searchingUser: false }));
        toast.success(`User found: ${result.data.first_name} ${result.data.last_name}`);
      } else {
        setPasswordResetFlow(prev => ({ ...prev, foundUser: null, searchingUser: false }));
        toast.error('User not found with this email address');
      }
    } catch (_error) {
      setPasswordResetFlow(prev => ({ ...prev, searchingUser: false }));
      toast.error('Failed to search for user');
    }
  };

  const generateResetLink = async () => {
    if (!passwordResetFlow.foundUser || !passwordResetFlow.reason.trim()) {
      toast.error('Please search for user and provide a reason');
      return;
    }

    setPasswordResetFlow(prev => ({ ...prev, generatingLink: true }));
    
    try {
      const result = await adminService.generateUserPasswordResetLink(
        passwordResetFlow.foundUser.id,
        passwordResetFlow.reason
      );
      
      if (result.success && result.data?.reset_url) {
        setPasswordResetFlow(prev => ({ 
          ...prev, 
          resetLink: result.data.reset_url,
          generatingLink: false 
        }));
        toast.success('Password reset link generated successfully!');
      } else {
        setPasswordResetFlow(prev => ({ ...prev, generatingLink: false }));
        toast.error(result.error || 'Failed to generate reset link');
      }
    } catch (_error) {
      setPasswordResetFlow(prev => ({ ...prev, generatingLink: false }));
      toast.error('Failed to generate reset link');
    }
  };

  const copyResetLink = () => {
    if (passwordResetFlow.resetLink) {
      navigator.clipboard.writeText(passwordResetFlow.resetLink);
      toast.success('Reset link copied to clipboard!');
    }
  };

  const insertResetLinkIntoReply = () => {
    if (passwordResetFlow.resetLink) {
      const resetText = `\n\nPassword Reset Link:\n${passwordResetFlow.resetLink}\n\nThis link expires in 10 minutes. Please use it to reset your password.\n`;
      setReplyMessage(prev => prev + resetText);
      closePasswordResetFlow();
      toast.success('Reset link added to reply message');
    }
  };

  const filteredInquiries = inquiries.filter(i => {
    if (filter === 'all') return true;
    return i.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'contacted': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'responded': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'converted': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'escalated': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="w-full max-w-full px-6 py-6">
      <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Inquiry Management</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Manage guest inquiries and support messages.</p>
      {(!permissions.can_escalate_inquiry || !permissions.can_close_inquiry || !permissions.can_archive_inquiry || !permissions.can_delete_inquiry) && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300 px-4 py-3 text-sm">
          Sensitive actions (escalate, close, archive, delete) are restricted for your admin tier ({adminTier}).
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
        {['all', 'new', 'contacted', 'responded', 'converted', 'escalated', 'closed', 'archived'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all whitespace-nowrap ${
              filter === f 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sender</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Property / Message</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 font-medium">Loading inquiries...</td></tr>
              ) : filteredInquiries.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 font-medium">No inquiries found.</td></tr>
              ) : (
                filteredInquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => openModal(inquiry)}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-white">{inquiry.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{inquiry.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {inquiry.property ? (
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2 uppercase">
                          <CheckCircle className="w-3 h-3" /> {inquiry.property.title}
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-gray-500 mb-2 uppercase">General Support</div>
                      )}
                      <div className="text-sm text-gray-900 dark:text-gray-300 line-clamp-1 max-w-xs">{inquiry.message}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{new Date(inquiry.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">{new Date(inquiry.created_at).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(inquiry.status)}`}>
                        {inquiry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {inquiry.status === 'new' && (
                          <button 
                            onClick={() => handleUpdateStatus(inquiry.id, 'contacted')}
                            disabled={!canApplyStatus('contacted')}
                            className="p-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg tooltip transition-colors"
                            title="Mark as Contacted"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        {['new', 'contacted'].includes(inquiry.status) && (
                          <button 
                            onClick={() => handleUpdateStatus(inquiry.id, 'responded')}
                            disabled={!canApplyStatus('responded')}
                            className="p-2.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg tooltip transition-colors"
                            title="Mark as Responded"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {!['escalated', 'closed', 'archived'].includes(inquiry.status) && (
                          <button 
                            onClick={() => handleUpdateStatus(inquiry.id, 'escalated')}
                            disabled={!permissions.can_escalate_inquiry}
                            className={`p-2.5 rounded-lg tooltip transition-colors ${permissions.can_escalate_inquiry ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30' : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'}`}
                            title={permissions.can_escalate_inquiry ? 'Escalate to senior admin review' : getPermissionMessage('escalated')}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                        {!['closed', 'archived'].includes(inquiry.status) && (
                          <button 
                            onClick={() => handleUpdateStatus(inquiry.id, 'closed')}
                            disabled={!permissions.can_close_inquiry}
                            className={`p-2.5 rounded-lg tooltip transition-colors ${permissions.can_close_inquiry ? 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30' : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'}`}
                            title={permissions.can_close_inquiry ? 'Close inquiry' : getPermissionMessage('closed')}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {inquiry.status !== 'archived' && (
                          <button 
                            onClick={() => handleUpdateStatus(inquiry.id, 'archived')}
                            disabled={!permissions.can_archive_inquiry}
                            className={`p-2.5 rounded-lg tooltip transition-colors ${permissions.can_archive_inquiry ? 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'}`}
                            title={permissions.can_archive_inquiry ? 'Archive' : getPermissionMessage('archived')}
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(inquiry.id)}
                          disabled={!permissions.can_delete_inquiry}
                          className={`p-2.5 rounded-lg tooltip transition-colors ${permissions.can_delete_inquiry ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'}`}
                          title={permissions.can_delete_inquiry ? 'Delete' : 'Deleting inquiries is restricted to super admins.'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
            className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Inquiry Details</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(selectedInquiry.status)}`}>
                    {selectedInquiry.status}
                  </span>
                  {selectedInquiry.source && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-500 font-bold uppercase">via {selectedInquiry.source}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400 font-bold text-lg shadow-sm border border-emerald-50 dark:border-emerald-800">
                  {selectedInquiry.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">{selectedInquiry.name}</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Mail className="w-3.5 h-3.5" />
                      <a href={`mailto:${selectedInquiry.email}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{selectedInquiry.email}</a>
                    </div>
                    {selectedInquiry.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Phone className="w-3.5 h-3.5" />
                        <a href={`tel:${selectedInquiry.phone}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{selectedInquiry.phone}</a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedInquiry.property && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-2">Interested in</p>
                    <h5 className="font-bold text-blue-900 dark:text-blue-200">{selectedInquiry.property.title}</h5>
                  </div>
                  <button 
                    onClick={() => window.open(`/property/${selectedInquiry.property.id}`, '_blank')}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all border border-blue-100 dark:border-blue-800"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-inner">
                <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-2 uppercase tracking-wide font-bold">Message Content</p>
                <p className="text-gray-700 dark:text-gray-300 text-[15px] whitespace-pre-wrap leading-relaxed italic">"{selectedInquiry.message}"</p>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-500 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Submitted on {new Date(selectedInquiry.created_at).toLocaleString()}</span>
              </div>

              {/* Reply Section */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Send a Reply
                  </label>
                  <button
                    onClick={openPasswordResetFlow}
                    disabled={sendingReply || !permissions.can_reply_inquiry}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Generate password reset link for this user"
                  >
                    <Key className="w-3 h-3" />
                    Reset Password
                  </button>
                </div>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your response to the guest here..."
                  className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm resize-none h-32"
                  disabled={sendingReply}
                />
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 italic">
                  This message will be sent directly to <strong>{selectedInquiry.email}</strong> via Resend.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-4">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 text-sm font-bold hover:text-gray-900 dark:hover:text-white transition-colors"
                disabled={sendingReply}
              >
                Cancel
              </button>
              <button 
                onClick={handleSendReply}
                disabled={sendingReply || !replyMessage.trim() || !permissions.can_reply_inquiry}
                className={`px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-md shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {sendingReply ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send Reply via Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordResetFlow.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Generate Password Reset Link</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Search for user and generate a secure reset link to include in your reply.
                </p>
              </div>
              <button 
                onClick={closePasswordResetFlow} 
                className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                disabled={passwordResetFlow.searchingUser || passwordResetFlow.generatingLink}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Email Search */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                  User Email Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={passwordResetFlow.userEmail}
                    onChange={(e) => setPasswordResetFlow(prev => ({ ...prev, userEmail: e.target.value, foundUser: null, resetLink: '' }))}
                    placeholder="Enter user's email address"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                    disabled={passwordResetFlow.searchingUser || passwordResetFlow.generatingLink}
                  />
                  <button
                    onClick={searchUserForReset}
                    disabled={passwordResetFlow.searchingUser || passwordResetFlow.generatingLink || !passwordResetFlow.userEmail.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordResetFlow.searchingUser ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Search
                  </button>
                </div>
              </div>

              {/* Found User Display */}
              {passwordResetFlow.foundUser && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-800 dark:text-green-300 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium text-sm">User Found</span>
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-400">
                    <p><strong>Name:</strong> {passwordResetFlow.foundUser.first_name} {passwordResetFlow.foundUser.last_name}</p>
                    <p><strong>Email:</strong> {passwordResetFlow.foundUser.email}</p>
                    <p><strong>Role:</strong> {passwordResetFlow.foundUser.role}</p>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                  Reason for Reset
                </label>
                <textarea
                  value={passwordResetFlow.reason}
                  onChange={(e) => setPasswordResetFlow(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Explain why this password reset is being generated..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm resize-none h-20"
                  disabled={passwordResetFlow.searchingUser || passwordResetFlow.generatingLink}
                />
              </div>

              {/* Generate Link Button */}
              {passwordResetFlow.foundUser && (
                <button
                  onClick={generateResetLink}
                  disabled={passwordResetFlow.generatingLink || !passwordResetFlow.reason.trim()}
                  className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordResetFlow.generatingLink ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating Link...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      Generate Reset Link
                    </>
                  )}
                </button>
              )}

              {/* Generated Link Display */}
              {passwordResetFlow.resetLink && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium text-sm">Reset Link Generated</span>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border text-xs font-mono text-gray-600 dark:text-gray-300 break-all mb-3">
                    {passwordResetFlow.resetLink}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyResetLink}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copy Link
                    </button>
                    <button
                      onClick={insertResetLinkIntoReply}
                      className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      Add to Reply
                    </button>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">
                    This link expires in 10 minutes. The user can use it to reset their password.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiryManagement;
