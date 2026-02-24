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
    setShowModal(true);
  };

  const filteredInquiries = inquiries.filter(i => {
    if (filter === 'all') return true;
    return i.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'responded': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full max-w-full px-6 py-6">
      <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Inquiry Management</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Manage guest inquiries and support messages.</p>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'responded', 'archived'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject / Message</th>
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
                      <div className="text-sm text-gray-900 dark:text-gray-300 line-clamp-1 max-w-xs">{inquiry.message}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{new Date(inquiry.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(inquiry.created_at).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-tighter ${getStatusColor(inquiry.status)}`}>
                        {inquiry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {inquiry.status === 'pending' && (
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Inquiry Details</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400 font-bold">
                  {selectedInquiry.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">{selectedInquiry.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Mail className="w-3 h-3" />
                    <a href={`mailto:${selectedInquiry.email}`} className="hover:text-emerald-600 dark:hover:text-emerald-400">{selectedInquiry.email}</a>
                  </div>
                  {selectedInquiry.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <Phone className="w-3 h-3" />
                      <a href={`tel:${selectedInquiry.phone}`} className="hover:text-emerald-600 dark:hover:text-emerald-400">{selectedInquiry.phone}</a>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide font-bold">Message</p>
                <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{selectedInquiry.message}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <Clock className="w-3 h-3" />
                <span>Submitted on {new Date(selectedInquiry.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <a 
                href={`mailto:${selectedInquiry.email}?subject=Re: Inquiry on AccommoTrack`}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                onClick={() => handleUpdateStatus(selectedInquiry.id, 'responded')}
              >
                <Mail className="w-4 h-4" /> Reply via Email
              </a>
              {selectedInquiry.status === 'pending' && (
                <button 
                  onClick={() => { handleUpdateStatus(selectedInquiry.id, 'responded'); setShowModal(false); }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Mark Responded
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiryManagement;
