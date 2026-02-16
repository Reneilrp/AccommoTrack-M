import { useState, useEffect } from 'react';
import { Eye, X, CheckCircle, XCircle, Calendar, Search, Plus, Loader2 } from 'lucide-react';
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
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cancellationData, setCancellationData] = useState({ reason: '', refundAmount: 0, shouldRefund: false });
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);

  const readOnlyGuard = () => {
    if (canManageBookings) return false;
    toast.error('Caretaker access for bookings is currently view-only.');
    return true;
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatDateTime = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const calculateDays = (checkIn, checkOut) => Math.ceil(Math.abs(new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));

  useEffect(() => {
    fetchBookings();
    fetchStats();

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

  const handleUpdateStatus = async (bookingId, newStatus, cancellationReason = null, refundData = null) => {
    if (readOnlyGuard()) return;
    const toastId = toast.loading(`${newStatus === 'cancelled' ? 'Cancelling' : 'Updating'} booking...`);
    setProcessing(true);
    try {
      const response = await api.patch(`/bookings/${bookingId}/status`, {
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
    <>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {loading ? [...Array(4)].map((_, i) => <SkeletonStatCard key={i} />) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500">Confirmed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.confirmed}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.completed}</p>
              </div>
            </>
          )}
        </div>

        {/* Search & Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, room, property..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'confirmed', 'pending', 'completed', 'cancelled'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${filterStatus === s ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-3">Guest</th>
                  <th className="px-6 py-3">Property/Room</th>
                  <th className="px-6 py-3">Dates</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? [...Array(5)].map((_, i) => <SkeletonTableRow key={i} columns={6} />) : 
                  filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{b.guestName}</p>
                        <p className="text-xs text-gray-500">{b.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{b.propertyTitle}</p>
                        <p className="text-xs text-gray-500">Room {b.roomNumber}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <p>{formatDate(b.checkIn)}</p>
                        <p className="text-xs text-gray-500">to {formatDate(b.checkOut)}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        <PriceRow amount={b.amount} />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(b.status)}`}>{b.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => { setSelectedBooking(b); setShowDetailModal(true); }} className="text-green-600 hover:text-green-800 text-sm font-bold flex items-center gap-1">
                          <Eye className="w-4 h-4" /> View
                        </button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-bold">Booking Details</h2>
              <button onClick={() => setShowDetailModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                <div><p className="text-xs text-gray-500 uppercase font-bold">Check-In</p><p className="font-bold text-lg">{formatDate(selectedBooking.checkIn)}</p></div>
                <div><p className="text-xs text-gray-500 uppercase font-bold text-right">Check-Out</p><p className="font-bold text-lg text-right">{formatDate(selectedBooking.checkOut)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Guest Name</p><p className="font-medium">{selectedBooking.guestName}</p></div>
                <div><p className="text-xs text-gray-500">Contact</p><p className="font-medium">{selectedBooking.phone || selectedBooking.email}</p></div>
                <div><p className="text-xs text-gray-500">Property</p><p className="font-medium">{selectedBooking.propertyTitle}</p></div>
                <div><p className="text-xs text-gray-500">Room</p><p className="font-medium">Room {selectedBooking.roomNumber} ({selectedBooking.roomType})</p></div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">₱{selectedBooking.amount.toLocaleString()}</p>
              </div>
              <div className="flex gap-3 pt-4">
                {canManageBookings ? (
                  <>
                    {(() => {
                      const { status, paymentStatus } = selectedBooking;

                      // Cancelled - only show refund option if payment was made
                      if (status === 'cancelled') {
                        if (paymentStatus === 'refunded') {
                          return (
                            <div className="w-full p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                              <p className="text-sm text-purple-800 dark:text-purple-300">
                                <strong>Refunded:</strong> This booking has been cancelled and refunded.
                              </p>
                            </div>
                          );
                        } else if (paymentStatus === 'paid' || paymentStatus === 'partial') {
                          return (
                            <div className="w-full">
                              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-2">
                                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                  <strong>Note:</strong> This booking is cancelled but payment hasn't been refunded yet.
                                </p>
                              </div>
                              <button
                                onClick={() => handleUpdatePayment(selectedBooking.id, 'refunded')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Mark as Refunded
                              </button>
                            </div>
                          );
                        } else {
                          return (
                            <div className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                              <p className="text-sm text-gray-500 dark:text-gray-400 italic">Booking cancelled (no payment to refund)</p>
                            </div>
                          );
                        }
                      }

                      // Completed - allow cancellation with refund
                      if (status === 'completed') {
                        return (
                          <div className="w-full">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-2">
                              <p className="text-sm text-blue-800 dark:text-blue-300">
                                <strong>Completed:</strong> This booking is completed. You can still cancel and process refund if needed.
                              </p>
                            </div>
                            <button
                              onClick={() => handleOpenCancelModal(selectedBooking)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel & Refund
                            </button>
                          </div>
                        );
                      }

                      // Pending status - can confirm or cancel
                      if (status === 'pending') {
                        return (
                          <div className="flex gap-3 w-full">
                            <button
                              onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Confirm
                            </button>
                            <button
                              onClick={() => handleOpenCancelModal(selectedBooking)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        );
                      }

                      // Confirmed status - smart completion based on payment
                      if (status === 'confirmed') {
                        if (paymentStatus === 'paid') {
                          return (
                            <div className="flex gap-3 w-full">
                              <button
                                onClick={() => {
                                  if (window.confirm('Mark this booking as completed?')) {
                                    handleUpdateStatus(selectedBooking.id, 'completed');
                                  }
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Complete
                              </button>
                              <button
                                onClick={() => handleOpenCancelModal(selectedBooking)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                                Cancel & Refund
                              </button>
                            </div>
                          );
                        } else if (paymentStatus === 'partial') {
                          return (
                            <div className="flex flex-col gap-2 w-full">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    if (window.confirm('Mark as completed with full payment received?')) {
                                      handleUpdateStatus(selectedBooking.id, 'completed');
                                    }
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Complete
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm('Mark as completed with partial payment? Remaining balance should be tracked separately.')) {
                                      handleUpdateStatus(selectedBooking.id, 'partial-completed');
                                    }
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Partial Complete
                                </button>
                              </div>
                              <button
                                onClick={() => handleOpenCancelModal(selectedBooking)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                                Cancel & Refund
                              </button>
                            </div>
                          );
                        } else {
                          return (
                            <div className="w-full">
                              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-2">
                                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                  <strong>Note:</strong> Payment is required before completion. Only cancellation is available.
                                </p>
                              </div>
                              <button
                                onClick={() => handleOpenCancelModal(selectedBooking)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
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
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300 w-full">
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cancel Booking</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-6 border border-red-100 dark:border-red-900/30">
              <p className="text-sm text-red-800 dark:text-red-300 font-bold mb-1">Booking: {selectedBooking.guestName}</p>
              <p className="text-xs text-red-700 dark:text-red-400">Reference: {selectedBooking.bookingReference}</p>
              <p className="text-xs text-red-700 dark:text-red-400 font-semibold mt-1">
                Amount: <PriceRow amount={selectedBooking.amount} />
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 uppercase font-bold mt-1">Payment: {selectedBooking.paymentStatus}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                  Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancellationData.reason}
                  onChange={(e) => setCancellationData({ ...cancellationData, reason: e.target.value })}
                  placeholder="Why is this booking being cancelled?"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  rows="3"
                  required
                />
              </div>

              {(selectedBooking.paymentStatus === 'paid' || selectedBooking.paymentStatus === 'partial') && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                    <input
                      type="checkbox"
                      id="shouldRefund"
                      checked={cancellationData.shouldRefund}
                      onChange={(e) => setCancellationData({
                        ...cancellationData,
                        shouldRefund: e.target.checked,
                        refundAmount: e.target.checked ? selectedBooking.amount : 0
                      })}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded-lg focus:ring-green-500"
                    />
                    <label htmlFor="shouldRefund" className="text-sm font-bold text-gray-700 dark:text-gray-200 cursor-pointer">
                      Process Refund Now
                    </label>
                  </div>

                  {cancellationData.shouldRefund && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-bold"
                        placeholder="0.00"
                      />
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 flex justify-between px-1">
                        <span>Min: ₱0</span>
                        <span>Max Refundable: ₱{selectedBooking.amount.toLocaleString()}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={processing}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
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
    </>
  );
}