import { useState, useEffect } from 'react';
import { Loader2, Eye, X, CheckCircle, XCircle, Calendar, Search } from 'lucide-react';
import AddBookingModal from './AddBookingModal';
import toast from 'react-hot-toast';
import PriceRow from '../../components/Shared/PriceRow';

export default function Bookings({ user, accessRole = 'landlord' }) {
  const normalizedRole = accessRole || user?.role || 'landlord';
  const isCaretaker = normalizedRole === 'caretaker';
  const caretakerPermissions = user?.caretaker_permissions || {};
  const canManageBookings = !isCaretaker || Boolean(caretakerPermissions.bookings);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationData, setCancellationData] = useState({
    reason: '',
    refundAmount: 0,
    shouldRefund: false
  });
  // Add Booking Modal state
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);

  const readOnlyGuard = () => {
    if (canManageBookings) return false;
    toast.error('Caretaker access for bookings is currently view-only.');
    return true;
  };

  const API_URL = '/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Format date to readable string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format datetime with time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate days between two dates
  const calculateDays = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  useEffect(() => {
    fetchBookings();
    fetchStats();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/bookings`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        // If 404 or 204, treat as no bookings yet (new account, no property, etc.)
        if (response.status === 404 || response.status === 204) {
          setBookings([]);
          setError('');
          return;
        }
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      setBookings(data);
      setError('');
    } catch (err) {
      console.error('Error fetching bookings:', err);
      // If error is network or 404, treat as no bookings yet
      if (err.message === 'Failed to fetch' || err.message === 'Failed to fetch bookings') {
        setBookings([]);
        setError('');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/bookings/stats`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleUpdateStatus = async (bookingId, newStatus, cancellationReason = null, refundData = null) => {
    if (readOnlyGuard()) return;
    try {
      const response = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: newStatus,
          cancellation_reason: cancellationReason,
          refund_amount: refundData?.refundAmount || 0,
          should_refund: refundData?.shouldRefund || false
        })
      });

      if (!response.ok) throw new Error('Failed to update status');

      await fetchBookings();
      await fetchStats();
      setShowDetailModal(false);
      setShowCancelModal(false);

      toast.success(`Booking ${newStatus} successfully!`);
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update booking status');
    }
  };

  const handleUpdatePayment = async (bookingId, paymentStatus) => {
    if (readOnlyGuard()) return;
    try {
      const response = await fetch(`${API_URL}/bookings/${bookingId}/payment`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ payment_status: paymentStatus })
      });

      if (!response.ok) throw new Error('Failed to update payment');

      const result = await response.json();

      // Refresh bookings list
      await fetchBookings();

      // Update the selected booking in the modal with the response data
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking(prev => ({
          ...prev,
          paymentStatus: result.booking.payment_status,
          status: result.booking.status // Update status too in case it changed
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

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
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

  // Filter bookings by status and search query
  const filteredBookings = bookings.filter(booking => {
    // Status filter
    if (filterStatus !== 'all' && booking.status !== filterStatus) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const totalDays = calculateDays(booking.checkIn, booking.checkOut);

      const searchableFields = [
        booking.guestName,
        booking.email,
        booking.roomNumber?.toString(),
        booking.propertyTitle,
        formatDate(booking.checkIn),
        formatDate(booking.checkOut),
        booking.duration,
        `${totalDays} days`,
        booking.amount?.toString(),
        `₱${booking.amount?.toLocaleString()}`,
        booking.paymentStatus,
        booking.bookingReference,
        booking.roomType,
      ];

      return searchableFields.some(field =>
        field && field.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'partial-completed': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-sm text-gray-500 mt-1">Manage all room bookings and reservations</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowAddBookingModal(true)}
              className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Add Booking
            </button>
          </div>
              {/* Add Booking Modal */}
              <AddBookingModal
                isOpen={showAddBookingModal}
                onClose={() => setShowAddBookingModal(false)}
                onBookingAdded={() => {
                  setShowAddBookingModal(false);
                  fetchBookings();
                }}
              />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isCaretaker && !canManageBookings && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            You are viewing bookings as a caretaker. Actions such as confirming, cancelling, or updating payments are disabled.
          </div>
        )}

        {/* Error or Empty State Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Bookings</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Confirmed</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.confirmed}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.completed}</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search Input */}
            <div className="w-fit">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, room, property, dates, amount..."
                  className="w-[27rem] pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex gap-2 flex-wrap flex-shrink-0 ml-2">
              {['all', 'confirmed', 'pending', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2.5 rounded-lg font-medium transition-colors ${filterStatus === status
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property/Room</th>
                  <th className="pl-16 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="pl-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="pl-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="pl-1 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      {searchQuery ? (
                        <span className="text-gray-500">No bookings found matching "{searchQuery}"</span>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <Calendar className="w-12 h-12 text-gray-300 mb-2" />
                          <h2 className="text-lg font-semibold text-gray-700 mb-1">No bookings yet</h2>
                          <p className="text-gray-500 text-sm max-w-md mx-auto">
                            You have no bookings yet. {isCaretaker ? 'Bookings will appear here once a property is assigned to you.' : 'Start by adding a property and accepting bookings.'}
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => {
                    const totalDays = calculateDays(booking.checkIn, booking.checkOut);
                    return (
                      <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                        <td className="pl-5 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{booking.guestName}</div>
                            <div className="text-xs text-gray-500">{booking.email}</div>
                          </div>
                        </td>
                        <td className="pl-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{booking.propertyTitle}</div>
                          <div className="text-xs text-gray-500">Room {booking.roomNumber} - {booking.roomType}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-sm text-gray-900 whitespace-nowrap">{formatDate(booking.checkIn)}</div>
                              <div className="text-xs text-gray-500 whitespace-nowrap">to {formatDate(booking.checkOut)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{booking.duration}</div>
                          <div className="text-xs text-gray-500">{totalDays} days</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                            <PriceRow amount={booking.amount} />
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            <PriceRow amount={booking.monthlyRent} small={true} />/m
                          </div>
                        </td>
                        <td className="pr-9 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </td>
                        <td className="pr-9 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentColor(booking.paymentStatus)}`}>
                            {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                          </span>
                        </td>
                        <td className="pr-5 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleViewDetails(booking)}
                            className="text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">Booking Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Booking Timeline */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-blue-600 font-medium mb-1">CHECK-IN</p>
                    <p className="text-lg font-bold text-blue-900">{formatDate(selectedBooking.checkIn)}</p>
                  </div>
                  <div className="text-blue-400 text-xl">→</div>
                  <div className="flex-1 text-center">
                    <p className="text-xs text-blue-600 font-medium mb-1">DURATION</p>
                    <p className="text-lg font-bold text-blue-900">{selectedBooking.duration}</p>
                    <p className="text-xs text-blue-600">({calculateDays(selectedBooking.checkIn, selectedBooking.checkOut)} days)</p>
                  </div>
                  <div className="text-blue-400 text-xl">→</div>
                  <div className="flex-1 text-right">
                    <p className="text-xs text-blue-600 font-medium mb-1">CHECK-OUT</p>
                    <p className="text-lg font-bold text-blue-900">{formatDate(selectedBooking.checkOut)}</p>
                  </div>
                </div>
              </div>

              {/* Guest Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Guest Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="font-medium">{selectedBooking.guestName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-sm break-all">{selectedBooking.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium">{selectedBooking.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Booked On</p>
                    <p className="font-medium text-sm">{formatDateTime(selectedBooking.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Booking Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Booking Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Reference</p>
                    <p className="font-mono font-bold text-green-600">{selectedBooking.bookingReference}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Property</p>
                    <p className="font-medium">{selectedBooking.propertyTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Room</p>
                    <p className="font-medium">Room {selectedBooking.roomNumber} - {selectedBooking.roomType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Monthly Rent</p>
                    <p className="font-medium"><PriceRow amount={selectedBooking.monthlyRent} /></p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900"><PriceRow amount={selectedBooking.amount} /></p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Notes</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedBooking.notes}</p>
                </div>
              )}

              {/* Current Status Display */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Booking Status</label>
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedBooking.status)}`}>
                    {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentColor(selectedBooking.paymentStatus)}`}>
                    {selectedBooking.paymentStatus.charAt(0).toUpperCase() + selectedBooking.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>

              {canManageBookings ? (
                <>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Booking Actions</label>
                    <div className="flex gap-2 flex-wrap">
                      {(() => {
                    const { status, paymentStatus } = selectedBooking;

                    // Cancelled - only show refund option if payment was made
                    if (status === 'cancelled') {
                      if (paymentStatus === 'refunded') {
                        return (
                          <div className="w-full p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-sm text-purple-800">
                              <strong>Refunded:</strong> This booking has been cancelled and refunded.
                            </p>
                          </div>
                        );
                      } else if (paymentStatus === 'paid' || paymentStatus === 'partial') {
                        return (
                          <div className="w-full">
                            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 mb-2">
                              <p className="text-sm text-yellow-800">
                                <strong>Note:</strong> This booking is cancelled but payment hasn't been refunded yet.
                              </p>
                            </div>
                            <button
                              onClick={() => handleUpdatePayment(selectedBooking.id, 'refunded')}
                              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Mark as Refunded
                            </button>
                          </div>
                        );
                      } else {
                        return (
                          <div className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-500 italic">Booking cancelled (no payment to refund)</p>
                          </div>
                        );
                      }
                    }

                    // Completed - allow cancellation with refund
                    if (status === 'completed') {
                      return (
                        <div className="w-full">
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-2">
                            <p className="text-sm text-blue-800">
                              <strong>Completed:</strong> This booking is completed. You can still cancel and process refund if needed.
                            </p>
                          </div>
                          <button
                            onClick={() => handleOpenCancelModal(selectedBooking)}
                            className="flex items-center gap-2 px-4 py-2 border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
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
                        <>
                          <button
                            onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Confirm Booking
                          </button>
                          <button
                            onClick={() => handleOpenCancelModal(selectedBooking)}
                            className="flex items-center gap-2 px-4 py-2 border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel
                          </button>
                        </>
                      );
                    }

                    // Confirmed status - smart completion based on payment
                    if (status === 'confirmed') {
                      if (paymentStatus === 'paid') {
                        return (
                          <>
                            <button
                              onClick={() => {
                                if (window.confirm('Mark this booking as completed?')) {
                                  handleUpdateStatus(selectedBooking.id, 'completed');
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Complete
                            </button>
                            <button
                              onClick={() => handleOpenCancelModal(selectedBooking)}
                              className="flex items-center gap-2 px-4 py-2 border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel & Refund
                            </button>
                          </>
                        );
                      } else if (paymentStatus === 'partial') {
                        return (
                          <>
                            <button
                              onClick={() => {
                                if (window.confirm('Mark as completed with full payment received?')) {
                                  handleUpdateStatus(selectedBooking.id, 'completed');
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
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
                              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Partial Complete
                            </button>
                            <button
                              onClick={() => handleOpenCancelModal(selectedBooking)}
                              className="flex items-center gap-2 px-4 py-2 border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel & Refund
                            </button>
                          </>
                        );
                      } else {
                        return (
                          <>
                            <div className="w-full p-3 bg-yellow-50 rounded-lg border border-yellow-200 mb-2">
                              <p className="text-sm text-yellow-800">
                                <strong>Note:</strong> Payment is required before completion. Only cancellation is available.
                              </p>
                            </div>
                            <button
                              onClick={() => handleOpenCancelModal(selectedBooking)}
                              className="flex items-center gap-2 px-4 py-2 border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel
                            </button>
                          </>
                        );
                      }
                    }

                        return null;
                      })()}
                      </div>
                  </>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  Actions are disabled because you are viewing this booking as a caretaker.
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel & Refund Modal */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 text-center">Cancel Booking</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-red-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-medium mb-1">Booking: {selectedBooking.guestName}</p>
              <p className="text-xs text-red-700">Reference: {selectedBooking.bookingReference}</p>
              <p className="text-xs text-red-700">Amount: ₱{selectedBooking.amount.toLocaleString()}</p>
              <p className="text-xs text-red-700">Payment Status: {selectedBooking.paymentStatus}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason *
              </label>
              <textarea
                value={cancellationData.reason}
                onChange={(e) => setCancellationData({ ...cancellationData, reason: e.target.value })}
                placeholder="Enter reason for cancellation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows="3"
              />
            </div>

            {(selectedBooking.paymentStatus === 'paid' || selectedBooking.paymentStatus === 'partial') && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="shouldRefund"
                    checked={cancellationData.shouldRefund}
                    onChange={(e) => setCancellationData({
                      ...cancellationData,
                      shouldRefund: e.target.checked,
                      refundAmount: e.target.checked ? selectedBooking.amount : 0
                    })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="shouldRefund" className="text-sm font-medium text-gray-700">
                    Process Refund
                  </label>
                </div>

                {cancellationData.shouldRefund && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Refund Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₱</span>
                      <input
                        type="number"
                        value={cancellationData.refundAmount}
                        onChange={(e) => setCancellationData({
                          ...cancellationData,
                          refundAmount: parseFloat(e.target.value) || 0
                        })}
                        max={selectedBooking.amount}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum refundable: ₱{selectedBooking.amount.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-800">
                <strong>Warning:</strong> This action cannot be undone. The booking will be marked as cancelled
                {cancellationData.shouldRefund && ' and the refund will need to be processed.'}.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}