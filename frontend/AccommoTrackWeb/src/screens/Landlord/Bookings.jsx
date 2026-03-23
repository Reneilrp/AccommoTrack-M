import { useState, useEffect } from 'react';
import { Eye, X, CheckCircle, XCircle, Calendar, Search, Plus, Loader2, Clock, Edit3, Shuffle, Check, RefreshCw } from 'lucide-react';
import AddBookingModal from './AddBookingModal';
import toast from 'react-hot-toast';
import PriceRow from '../../components/Shared/PriceRow';
import api from '../../utils/api';
import { SkeletonStatCard, SkeletonTableRow } from '../../components/Shared/Skeleton';
import { useUIState } from '../../contexts/UIStateContext';

export default function Bookings({ user, accessRole = 'landlord' }) {
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.landlord_bookings;

  const normalizedRole = accessRole || user?.role || 'landlord';
  const isCaretaker = normalizedRole === 'caretaker';
  const caretakerPermissions = user?.caretaker_permissions || {};
  const canManageBookings = !isCaretaker || Boolean(caretakerPermissions.bookings);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState(cachedData?.bookings || []);
  const [stats, setStats] = useState(cachedData?.stats || { total: 0, confirmed: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(!cachedData);
  const [__error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cancellationData, setCancellationData] = useState({ reason: '', refundAmount: 0, shouldRefund: false });
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [extensionRequests, setExtensionRequests] = useState([]);
  const [loadingExtensions, setLoadingExtensions] = useState(false);
  const [transferRequests, setTransferRequests] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  const readOnlyGuard = () => {
    if (canManageBookings) return false;
    toast.error('Caretaker access for bookings is currently view-only.');
    return true;
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleRefresh = async () => {
    await Promise.all([
      fetchBookings(),
      fetchStats(),
      fetchExtensions(),
      fetchTransfers()
    ]);
  };

  useEffect(() => {
    fetchBookings();
    fetchStats();
    fetchExtensions();
    fetchTransfers();

    const handleOpenAdd = () => setShowAddBookingModal(true);
    window.addEventListener('open-add-booking', handleOpenAdd);
    return () => window.removeEventListener('open-add-booking', handleOpenAdd);
  }, []);

  const fetchBookings = async () => {
    try {
      if (!cachedData) setLoading(true);
      const response = await api.get('/bookings');
      setBookings(response.data);
      updateData('landlord_bookings', { ...uiState.data?.landlord_bookings, bookings: response.data });
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 204) setBookings([]);
      else setError(err.response?.data?.message || 'Failed to fetch bookings');
    } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/bookings/stats');
      setStats(response.data);
      updateData('landlord_bookings', { ...uiState.data?.landlord_bookings, stats: response.data });
    } catch (err) { console.error('Error fetching stats:', err); }
  };

  const fetchExtensions = async () => {
    try {
      setLoadingExtensions(true);
      const response = await api.get('/landlord/extensions');
      setExtensionRequests(response.data);
    } catch (err) {
      console.error('Error fetching extensions:', err);
    } finally {
      setLoadingExtensions(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      setLoadingTransfers(true);
      const response = await api.get('/landlord/transfers');
      setTransferRequests(response.data);
    } catch (err) {
      console.error('Error fetching transfers:', err);
    } finally {
      setLoadingTransfers(false);
    }
  };

  const handleHandleExtension = async (id, action, modifyData = null) => {
    if (readOnlyGuard()) return;
    const toastId = toast.loading(`${action === 'modify' ? 'Modifying' : 'Updating'} request...`);
    try {
      await api.patch(`/landlord/extensions/${id}/handle`, {
        action,
        ...modifyData
      });
      toast.success(`Request ${action === 'modify' ? 'modified' : action} successfully!`, { id: toastId });
      fetchExtensions();
      fetchBookings(); // Refresh bookings to reflect new dates
    } catch (err) {
      console.error('Error handling extension:', err);
      toast.error(err.response?.data?.message || 'Failed to handle request', { id: toastId });
    }
  };

  const handleHandleTransfer = async (id, action, transferData = null) => {
    if (readOnlyGuard()) return;
    const toastId = toast.loading(`${action === 'approve' ? 'Approving' : 'Rejecting'} transfer...`);
    try {
      await api.patch(`/landlord/transfers/${id}/handle`, {
        action,
        ...transferData
      });
      toast.success(`Transfer ${action}d successfully!`, { id: toastId });
      fetchTransfers();
      fetchBookings(); // Refresh bookings to reflect new room
    } catch (err) {
      console.error('Error handling transfer:', err);
      toast.error(err.response?.data?.message || 'Failed to handle transfer', { id: toastId });
    }
  };

  const handleUpdateStatus = async (bookingId, newStatus, cancellationReason = null, refundData = null) => {
    if (readOnlyGuard()) return;
    const toastId = toast.loading(`${newStatus === 'cancelled' ? 'Cancelling' : 'Updating'} booking...`);
    setProcessing(true);
    try {
      await api.patch(`/bookings/${bookingId}/status`, {
        status: newStatus,
        cancellation_reason: cancellationReason,
        refund_amount: refundData?.refundAmount || 0,
        should_refund: refundData?.shouldRefund || false
      });

      await fetchBookings();
      await fetchStats();
      setShowDetailModal(false);
      setShowCancelModal(false);

      toast.success(`Booking ${newStatus} successfully!`, { id: toastId });
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update booking status', { id: toastId });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePayment = async (bookingId, paymentStatus) => {
    if (readOnlyGuard()) return;
    try {
      const response = await api.patch(`/bookings/${bookingId}/payment`, {
        payment_status: paymentStatus
      });
      
      const result = response.data;

      // Refresh bookings list
      await fetchBookings();

      // Update the selected booking in the modal with the response data
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking(prev => ({
          ...prev,
          paymentStatus: result.booking?.payment_status || paymentStatus,
          status: result.booking?.status || prev.status // Update status too in case it changed
        }));
      }

      // Show appropriate message
      if (result.status_upgraded) {
        toast.success('Payment updated! Booking automatically upgraded to Completed.');
      } else {
        toast.success('Payment status updated!');
      }
    } catch (err) {
      console.error('Error updating payment:', err);
      toast.error('Failed to update payment status');
    }
  };

  const handleOpenCancelModal = (booking) => {
    if (readOnlyGuard()) return;
    setSelectedBooking(booking);
    setCancellationData({
      reason: '',
      refundAmount: 0,
      shouldRefund: false
    });
    setShowCancelModal(true);
  };

  const handleCancelConfirm = () => {
    if (readOnlyGuard()) return;
    if (!cancellationData.reason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    if (cancellationData.shouldRefund && cancellationData.refundAmount <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }

    handleUpdateStatus(
      selectedBooking.id,
      'cancelled',
      cancellationData.reason,
      cancellationData.shouldRefund ? {
        refundAmount: cancellationData.refundAmount,
        shouldRefund: true
      } : null
    );
  };

  const filteredBookings = bookings.filter(booking => {
    if (filterStatus !== 'all' && booking.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const searchableFields = [booking.guestName, booking.email, booking.roomNumber?.toString(), booking.propertyTitle, booking.bookingReference];
      return searchableFields.some(f => f?.toLowerCase().includes(query));
    }
    return true;
  });

  const getStatusColor = (s) => {
    switch (s) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentColor = (s) => {
    switch (s) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
        {isCaretaker && !canManageBookings && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            You are viewing bookings as a caretaker. Management actions are disabled.
          </div>
        )}

        <AddBookingModal
          isOpen={showAddBookingModal}
          onClose={() => setShowAddBookingModal(false)}
          onBookingAdded={() => { setShowAddBookingModal(false); fetchBookings(); fetchStats(); }}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? [...Array(4)].map((_, i) => <SkeletonStatCard key={i} />) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Confirmed</p>
                    <p className="text-2xl font-bold text-green-600 mt-2">{stats.confirmed}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Completed</p>
                    <p className="text-2xl font-bold text-blue-600 mt-2">{stats.completed}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search & Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700 flex flex-col lg:flex-row gap-4 lg:items-center">
          <div className="relative flex-1 w-full">
            {filterStatus !== 'extensions' && filterStatus !== 'transfers' && (
            <>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, room, property..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:bg-gray-700 dark:text-white outline-none text-sm"
            />
            </>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
            {['all', 'confirmed', 'pending', 'completed', 'cancelled', 'extensions', 'transfers'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${filterStatus === s ? 'bg-green-600 text-white shadow-md shadow-green-500/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                {s === 'extensions' ? 'Extensions' : s === 'transfers' ? 'Transfers' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleRefresh}
                disabled={loading}
                title="Refresh"
                className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md shadow-blue-500/20"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </button>
            </div>
        </div>

        {/* Table / Extensions List */}
        {filterStatus === 'extensions' ? (
          <ExtensionRequestsList 
            requests={extensionRequests} 
            loading={loadingExtensions}
            onHandle={handleHandleExtension}
          />
        ) : filterStatus === 'transfers' ? (
          <TransferRequestsList 
            requests={transferRequests}
            loading={loadingTransfers}
            onHandle={handleHandleTransfer}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700 text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Guest</th>
                  <th className="px-6 py-4">Property/Room</th>
                  <th className="px-6 py-4">Dates</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? [...Array(5)].map((_, i) => <SkeletonTableRow key={i} columns={6} />) : 
                  filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 font-medium">
                        No bookings found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900 dark:text-white">{b.guestName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{b.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900 dark:text-white">{b.propertyTitle}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Room {b.roomNumber}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <p>{formatDate(b.checkIn)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">to {formatDate(b.checkOut)}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                          <PriceRow amount={b.amount} />
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-2 rounded-md text-[10px] font-bold uppercase ${getStatusColor(b.status)}`}>{b.status}</span>
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => { setSelectedBooking(b); setShowDetailModal(true); }} className="text-green-600 dark:text-green-500 hover:text-green-800 dark:hover:text-green-400 text-xs font-bold uppercase flex items-center gap-2 transition-colors">
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )
                }
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Booking Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500 dark:text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-2">Check-In</p>
                  <p className="font-bold text-lg text-gray-900 dark:text-white">{formatDate(selectedBooking.checkIn)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold text-right tracking-wider mb-2">Check-Out</p>
                  <p className="font-bold text-lg text-right text-gray-900 dark:text-white">{formatDate(selectedBooking.checkOut)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Guest Name</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-lg">{selectedBooking.guestName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contact Information</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedBooking.phone || selectedBooking.email}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Property</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedBooking.propertyTitle}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Room Details</p>
                  <p className="font-semibold text-gray-900 dark:text-white">Room {selectedBooking.roomNumber} ({selectedBooking.roomType})</p>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Amount</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">₱{selectedBooking.amount.toLocaleString()}</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPaymentColor(selectedBooking.paymentStatus)}`}>
                    {selectedBooking.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {canManageBookings ? (
                  <>
                    {(() => {
                      const { status, paymentStatus } = selectedBooking;

                      // Cancelled - only show refund option if payment was made
                      if (status === 'cancelled') {
                        if (paymentStatus === 'refunded') {
                          return (
                            <div className="w-full p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                              <p className="text-sm text-purple-800 dark:text-purple-300 font-medium">
                                <strong>Refunded:</strong> This booking has been cancelled and refunded.
                              </p>
                            </div>
                          );
                        } else if (paymentStatus === 'paid' || paymentStatus === 'partial') {
                          return (
                            <div className="w-full">
                              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 mb-4">
                                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                                  <strong>Note:</strong> This booking is cancelled but payment hasn't been refunded yet.
                                </p>
                              </div>
                              <button
                                onClick={() => handleUpdatePayment(selectedBooking.id, 'refunded')}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98]"
                              >
                                <CheckCircle className="w-5 h-5" />
                                Mark as Refunded
                              </button>
                            </div>
                          );
                        } else {
                          return (
                            <div className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
                              <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center font-medium">Booking cancelled (no payment to refund)</p>
                            </div>
                          );
                        }
                      }

                      // Completed - allow cancellation with refund
                      if (status === 'completed') {
                        return (
                          <div className="w-full">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 mb-4">
                              <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                                <strong>Completed:</strong> This booking is completed. You can still cancel and process refund if needed.
                              </p>
                            </div>
                            <button
                              onClick={() => handleOpenCancelModal(selectedBooking)}
                              className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold transition-all active:scale-[0.98]"
                            >
                              <XCircle className="w-5 h-5" />
                              Cancel & Refund
                            </button>
                          </div>
                        );
                      }

                      // Partial Completed - allow transitioning to fully completed
                      if (status === 'partial-completed') {
                        return (
                          <div className="w-full">
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 mb-4">
                              <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                                <strong>Partial Complete:</strong> This booking has been partially paid. Mark as completed once the full payment is received.
                              </p>
                            </div>
                            <button
                              onClick={async () => {
                                if (window.confirm('Mark this booking as fully completed and paid?')) {
                                  // Fix #1: await payment update FIRST to avoid race condition
                                  if (paymentStatus !== 'paid') {
                                    await handleUpdatePayment(selectedBooking.id, 'paid');
                                  }
                                  handleUpdateStatus(selectedBooking.id, 'completed');
                                }
                              }}
                              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                            >
                              <CheckCircle className="w-5 h-5" />
                              Mark Fully Paid & Completed
                            </button>
                          </div>
                        );
                      }

                      // Pending status - can confirm or cancel
                      if (status === 'pending') {
                        return (
                          <div className="flex gap-4 w-full">
                            <button
                              onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}
                              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-500/20 active:scale-[0.98]"
                            >
                              <CheckCircle className="w-5 h-5" />
                              Confirm
                            </button>
                            <button
                              onClick={() => handleOpenCancelModal(selectedBooking)}
                              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border-2 border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold transition-all active:scale-[0.98]"
                            >
                              <XCircle className="w-5 h-5" />
                              Cancel
                            </button>
                          </div>
                        );
                      }

                      // Confirmed status - smart completion based on payment
                      if (status === 'confirmed') {
                        if (paymentStatus === 'paid') {
                          return (
                            <div className="flex gap-4 w-full">
                              <button
                                onClick={() => {
                                  if (window.confirm('Mark this booking as completed?')) {
                                    handleUpdateStatus(selectedBooking.id, 'completed');
                                  }
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                              >
                                <CheckCircle className="w-5 h-5" />
                                Complete
                              </button>
                              <button
                                onClick={() => handleOpenCancelModal(selectedBooking)}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border-2 border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold transition-all active:scale-[0.98]"
                              >
                                <XCircle className="w-5 h-5" />
                                Cancel & Refund
                              </button>
                            </div>
                          );
                        } else if (paymentStatus === 'partial') {
                          return (
                            <div className="flex flex-col gap-4 w-full">
                              <div className="flex gap-4">
                                <button
                                  onClick={() => {
                                    if (window.confirm('Mark as completed with full payment received?')) {
                                      handleUpdateStatus(selectedBooking.id, 'completed');
                                    }
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                  Complete
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm('Mark as completed with partial payment? Remaining balance should be tracked separately.')) {
                                      handleUpdateStatus(selectedBooking.id, 'partial-completed');
                                    }
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-yellow-500/20 active:scale-[0.98]"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                  Partial
                                </button>
                              </div>
                              <button
                                onClick={() => handleOpenCancelModal(selectedBooking)}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold transition-all active:scale-[0.98]"
                              >
                                <XCircle className="w-5 h-5" />
                                Cancel & Refund
                              </button>
                            </div>
                          );
                        } else {
                          return (
                            <div className="w-full">
                              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 mb-4">
                                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                                  <strong>Note:</strong> Payment is required before completion. Only cancellation is available.
                                </p>
                              </div>
                              <button
                                onClick={() => handleOpenCancelModal(selectedBooking)}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold transition-all active:scale-[0.98]"
                              >
                                <XCircle className="w-5 h-5" />
                                Cancel
                              </button>
                            </div>
                          );
                        }
                      }

                      return null;
                    })()}
                  </>
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300 w-full font-medium text-center">
                    Actions are disabled because you are viewing this booking as a caretaker.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel & Refund Modal */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cancel Booking</h3>
              <button onClick={() => setShowCancelModal(false)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500 dark:text-gray-500" />
              </button>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-6 border border-red-100 dark:border-red-900/30">
              <p className="text-sm text-red-800 dark:text-red-300 font-bold mb-2">Booking: {selectedBooking.guestName}</p>
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">Ref: {selectedBooking.bookingReference}</p>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-red-700 dark:text-red-400 font-bold uppercase tracking-wider">
                  Amount: <PriceRow amount={selectedBooking.amount} />
                </p>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded">
                  {selectedBooking.paymentStatus}
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancellationData.reason}
                  onChange={(e) => setCancellationData({ ...cancellationData, reason: e.target.value })}
                  placeholder="e.g. Guest request, double booking, etc."
                  className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm outline-none transition-all h-24 resize-none"
                  rows="3"
                  required
                />
              </div>

              {(selectedBooking.paymentStatus === 'paid' || selectedBooking.paymentStatus === 'partial') && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 cursor-pointer group"
                       onClick={() => setCancellationData({...cancellationData, shouldRefund: !cancellationData.shouldRefund, refundAmount: !cancellationData.shouldRefund ? selectedBooking.amount : 0})}>
                    <input
                      type="checkbox"
                      id="shouldRefund"
                      checked={cancellationData.shouldRefund}
                      readOnly
                      className="w-5 h-5 text-green-600 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 dark:bg-gray-700"
                    />
                    <label htmlFor="shouldRefund" className="text-sm font-bold text-gray-700 dark:text-gray-200 cursor-pointer flex-1">
                      Process Refund Automatically
                    </label>
                  </div>

                  {cancellationData.shouldRefund && (
                    <div className="animate-in slide-in-from-top-2 duration-200 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-600">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Refund Amount (₱)
                      </label>
                      <input
                        type="number"
                        value={cancellationData.refundAmount}
                        onChange={(e) => setCancellationData({
                          ...cancellationData,
                          refundAmount: parseFloat(e.target.value) || 0
                        })}
                        max={selectedBooking.amount}
                        className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-bold text-xl outline-none"
                        placeholder="0.00"
                      />
                      <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <span>Min: ₱0</span>
                        <span>Max: ₱{selectedBooking.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={processing}
                className="flex-1 px-4 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={processing}
                className="flex-1 px-4 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Extension Requests List ====================
const ExtensionRequestsList = ({ requests, loading, onHandle }) => {
  const [modifying, setModifying] = useState(null); // id of request being modified
  const [modifyData, setModifyData] = useState({ requested_end_date: '', proposed_amount: '' });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Extension Requests</h3>
        <p className="text-gray-500 text-sm">When tenants want to extend their stay, they will appear here.</p>
      </div>
    );
  }

  const startModify = (req) => {
    setModifying(req.id);
    setModifyData({
      requested_end_date: req.requested_end_date,
      proposed_amount: req.proposed_amount
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {requests.map((req) => (
        <div key={req.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-300 dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-lg">{req.tenant?.full_name}</h4>
              <p className="text-xs text-gray-500">Room {req.booking?.room?.room_number} • {req.booking?.room?.property?.title}</p>
            </div>
            <span className={`px-2 py-2 rounded text-[10px] font-bold uppercase ${
              req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              req.status === 'approved' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
            }`}>
              {req.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Current End</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{new Date(req.current_end_date).toLocaleDateString()}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">Requested End</p>
              {modifying === req.id ? (
                <input 
                  type="date"
                  value={modifyData.requested_end_date}
                  onChange={e => setModifyData({...modifyData, requested_end_date: e.target.value})}
                  className="w-full bg-transparent text-sm font-bold outline-none border-b border-blue-300"
                />
              ) : (
                <p className="text-sm font-bold text-blue-900 dark:text-blue-200">{new Date(req.requested_end_date).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Extension Fee</p>
              {modifying === req.id ? (
                <div className="flex items-center">
                  <span className="text-green-600 font-bold mr-2">₱</span>
                  <input 
                    type="number"
                    value={modifyData.proposed_amount}
                    onChange={e => setModifyData({...modifyData, proposed_amount: e.target.value})}
                    className="w-24 bg-transparent text-xl font-black text-green-600 outline-none border-b border-green-300"
                  />
                </div>
              ) : (
                <p className="text-xl font-black text-green-600">₱{parseFloat(req.proposed_amount).toLocaleString()}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Type</p>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 capitalize">{req.extension_type}</p>
            </div>
          </div>

          {req.tenant_notes && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg text-xs italic text-gray-600 dark:text-gray-400">
              "{req.tenant_notes}"
            </div>
          )}

          {req.status === 'pending' && (
            <div className="flex gap-2">
              {modifying === req.id ? (
                <>
                  <button 
                    onClick={() => onHandle(req.id, 'modify', modifyData)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-500/20"
                  >
                    Apply Changes
                  </button>
                  <button 
                    onClick={() => setModifying(null)}
                    className="px-4 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-2 rounded-lg text-xs font-bold"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => onHandle(req.id, 'approve')}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold shadow-md shadow-green-500/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button 
                    onClick={() => startModify(req)}
                    className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Modify
                  </button>
                  <button 
                    onClick={() => onHandle(req.id, 'reject')}
                    className="flex-1 border border-red-200 text-red-600 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ==================== Transfer Requests List ====================
const TransferRequestsList = ({ requests, loading, onHandle }) => {
  const [approving, setApproving] = useState(null); // id of request being approved (to show form)
  const [approvalData, setApprovalData] = useState({ damage_charge: '', damage_description: '', landlord_notes: '' });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading transfer requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <Shuffle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Transfer Requests</h3>
        <p className="text-gray-500 text-sm">When tenants want to move rooms, they will appear here.</p>
      </div>
    );
  }

  const startApprove = (req) => {
    setApproving(req.id);
    setApprovalData({ damage_charge: '', damage_description: '', landlord_notes: '' });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {requests.map((req) => (
        <div key={req.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-300 dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-lg">{req.tenant?.full_name || (req.tenant?.first_name + ' ' + req.tenant?.last_name)}</h4>
              <p className="text-xs text-gray-500">{req.requested_room?.property?.title}</p>
            </div>
            <span className={`px-2 py-2 rounded text-[10px] font-bold uppercase ${
              req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              req.status === 'approved' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
            }`}>
              {req.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Current Room</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Room {req.current_room?.room_number}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-2">Requested Room</p>
              <p className="text-sm font-bold text-amber-900 dark:text-blue-200">Room {req.requested_room?.room_number}</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Reason for Transfer</p>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg text-xs italic text-gray-600 dark:text-gray-400 leading-relaxed">
              "{req.reason}"
            </div>
          </div>

          {req.status === 'pending' && (
            <div className="space-y-4">
              {approving === req.id ? (
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Damage Charge (Optional)</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={approvalData.damage_charge}
                        onChange={e => setApprovalData({...approvalData, damage_charge: e.target.value})}
                        className="flex-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 outline-none"
                      />
                      {parseFloat(approvalData.damage_charge) > 0 && (
                        <input 
                          type="text" 
                          placeholder="What was damaged?"
                          required
                          value={approvalData.damage_description}
                          onChange={e => setApprovalData({...approvalData, damage_description: e.target.value})}
                          className="flex-[2] text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 outline-none"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Landlord Notes</label>
                    <textarea 
                      placeholder="Any notes for the tenant..."
                      value={approvalData.landlord_notes}
                      onChange={e => setApprovalData({...approvalData, landlord_notes: e.target.value})}
                      className="w-full text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 outline-none h-16 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onHandle(req.id, 'approve', approvalData)}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold shadow-md shadow-green-500/20"
                    >
                      Confirm Transfer
                    </button>
                    <button 
                      onClick={() => setApproving(null)}
                      className="px-4 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-2 rounded-lg text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => startApprove(req)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold shadow-md shadow-green-500/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button 
                    onClick={() => onHandle(req.id, 'reject')}
                    className="flex-1 border border-red-200 text-red-600 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};