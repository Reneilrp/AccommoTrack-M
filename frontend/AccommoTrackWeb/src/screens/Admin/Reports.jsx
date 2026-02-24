import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Search, 
  Filter,
  User,
  Building2,
  AlertCircle,
  MoreVertical
} from 'lucide-react';
import { reportService } from '../../services/reportService';
import toast from 'react-hot-toast';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await reportService.getReports({ status: statusFilter });
      setReports(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch reports', err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    setActionLoading(true);
    try {
      await reportService.updateStatus(id, status, adminNotes);
      toast.success(`Report marked as ${status}`);
      fetchReports();
      setShowModal(false);
      setSelectedReport(null);
      setAdminNotes('');
    } catch (err) {
      toast.error('Failed to update report');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = (report) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase rounded-full">Pending</span>;
      case 'resolved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full">Resolved</span>;
      case 'dismissed':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold uppercase rounded-full">Dismissed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-full px-6 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
            Report Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Review and resolve property flags from tenants.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['pending', 'resolved', 'dismissed', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === s 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 dark:text-emerald-400" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <ShieldAlert className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No reports found for this category.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left">Reporter</th>
                <th className="px-6 py-4 text-left">Property</th>
                <th className="px-6 py-4 text-left">Reason</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {reports.map((report) => (
                <tr key={report.id} className="bg-white dark:bg-gray-800 even:bg-gray-50/50 dark:even:bg-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                        {report.reporter?.first_name?.[0]}{report.reporter?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{report.reporter?.first_name} {report.reporter?.last_name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{report.reporter?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {report.property?.title}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
                      {report.reason}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(report.status)}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 dark:text-gray-500">
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => openDetails(report)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold transition-all shadow-sm shadow-blue-100 dark:shadow-none"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-red-50/30 dark:bg-red-900/10">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                Report Details
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Reporter</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedReport.reporter?.first_name} {selectedReport.reporter?.last_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedReport.reporter?.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Property Flagged</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedReport.property?.title}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" onClick={() => window.open(`/properties/${selectedReport.property_id}`, '_blank')}>View Listing</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Subject</p>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg font-bold text-sm inline-block">
                  {selectedReport.reason}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Detailed Report</p>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap italic leading-relaxed border border-gray-100 dark:border-gray-700">
                  "{selectedReport.description}"
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Admin Actions & Notes</p>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record your investigation results or internal notes here..."
                  className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  rows="3"
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-3">
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
              <div className="flex gap-3">
                {selectedReport.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'dismissed')}
                      disabled={actionLoading}
                      className="px-6 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-bold text-sm rounded-lg"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'resolved')}
                      disabled={actionLoading}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-lg shadow-emerald-100 dark:shadow-none transition-all flex items-center gap-2"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Mark Resolved
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
