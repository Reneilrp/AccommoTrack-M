import React, { useEffect, useState } from 'react';
import { Mail, Phone, Clock, CheckCircle, Archive, Trash2, Search, Filter, X } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const InquiryManagement = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Reply states
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchInquiries();
  }, [page]);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/inquiries?page=${page}`);
      setInquiries(res.data.data || []);
      setTotalPages(res.data.last_page || 1);
    } catch (err) {
      console.error('Failed to fetch inquiries', err);
      toast.error('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/inquiries/${id}`, { status });
      toast.success(`Inquiry marked as ${status}`);
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, status, responded_at: status === 'responded' ? new Date().toISOString() : i.responded_at } : i));
      if (selectedInquiry?.id === id) {
        setSelectedInquiry(prev => ({ ...prev, status }));
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim()) {
      toast.error('Please enter a message to send');
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
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
    try {
      await api.delete(`/admin/inquiries/${id}`);
      toast.success('Inquiry deleted');
      setInquiries(prev => prev.filter(i => i.id !== id));
      if (selectedInquiry?.id === id) {
        setShowModal(false);
        setSelectedInquiry(null);
      }
    } catch (err) {
      toast.error('Failed to delete inquiry');
    }
  };

  const openModal = (inquiry) => {
    setSelectedInquiry(inquiry);
    setReplyMessage(''); // Clear previous reply
    setShowModal(true);
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
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full max-w-full px-6 py-6">
      <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Inquiry Management</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Manage guest inquiries and support messages.</p>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
        {['all', 'new', 'contacted', 'responded', 'converted', 'closed', 'archived'].map(f => (
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
        <div className="overflow-x-auto">
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
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1 uppercase">
                          <CheckCircle className="w-3 h-3" /> {inquiry.property.title}
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-tighter">General Support</div>
                      )}
                      <div className="text-sm text-gray-900 dark:text-gray-300 line-clamp-1 max-w-xs">{inquiry.message}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{new Date(inquiry.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(inquiry.created_at).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${getStatusColor(inquiry.status)}`}>
                        {inquiry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {inquiry.status === 'new' && (
                          <button 
                            onClick={() => handleUpdateStatus(inquiry.id, 'contacted')}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg tooltip transition-colors"
                            title="Mark as Contacted"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        {['new', 'contacted'].includes(inquiry.status) && (
                          <button 
                            onClick={() => handleUpdateStatus(inquiry.id, 'responded')}
                            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg tooltip transition-colors"
                            title="Mark as Responded"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {inquiry.status !== 'archived' && (
                          <button 
                            onClick={() => handleUpdateStatus(inquiry.id, 'archived')}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg tooltip transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(inquiry.id)}
                          className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg tooltip transition-colors"
                          title="Delete"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Inquiry Details</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(selectedInquiry.status)}`}>
                    {selectedInquiry.status}
                  </span>
                  {selectedInquiry.source && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">via {selectedInquiry.source}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
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
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">Interested in</p>
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

              <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-inner">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide font-bold">Message Content</p>
                <p className="text-gray-700 dark:text-gray-300 text-[15px] whitespace-pre-wrap leading-relaxed italic">"{selectedInquiry.message}"</p>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Submitted on {new Date(selectedInquiry.created_at).toLocaleString()}</span>
              </div>

              {/* Reply Section */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                  Send a Reply
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your response to the guest here..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm resize-none h-32"
                  disabled={sendingReply}
                />
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 italic">
                  This message will be sent directly to <strong>{selectedInquiry.email}</strong> via Resend.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 text-sm font-bold hover:text-gray-900 dark:hover:text-white transition-colors"
                disabled={sendingReply}
              >
                Cancel
              </button>
              <button 
                onClick={handleSendReply}
                disabled={sendingReply || !replyMessage.trim()}
                className={`px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-md shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
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
    </div>
  );
};

export default InquiryManagement;
