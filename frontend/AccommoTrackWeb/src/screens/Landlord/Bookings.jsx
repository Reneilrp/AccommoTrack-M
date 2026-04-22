import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import AddBookingModal from './AddBookingModal';
import { showSuccess, showError } from '../../utils/toast';
import bookingService from '../../services/bookingService';
import { SkeletonStatCard, SkeletonTableRow } from '../../components/Shared/Skeleton';
import { useUIState } from '../../contexts/UIStateContext';
import BookingStats from './components/Bookings/BookingStats';
import BookingFilters from './components/Bookings/BookingFilters';
import BookingTableRow from './components/Bookings/BookingTableRow';
import BookingDetailModal from './components/Bookings/BookingDetailModal';
import CancelBookingModal from './components/Bookings/CancelBookingModal';

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Bookings({ _user, _accessRole = 'landlord' }) {
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.landlord_bookings;

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState(cachedData?.bookings || []);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [stats, setStats] = useState(cachedData?.stats || { total: 0, confirmed: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(!cachedData);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchBookings = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await bookingService.getBookings({ 
        page, 
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchQuery
      });
      if (res.success) {
        setBookings(res.data.items);
        setPagination(res.data.pagination || { currentPage: 1, lastPage: 1, total: res.data.items.length });
        
        const statsRes = await bookingService.getStats();
        if (statsRes.success) {
          setStats(statsRes.data);
          updateData('landlord_bookings', { bookings: res.data.items, stats: statsRes.data });
        }
      }
    } catch (_err) {
      showError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery, updateData]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleUpdateStatus = async (id, status, reason = null) => {
    setProcessing(true);
    const res = await bookingService.updateStatus(id, status, reason);
    if (res.success) {
      showSuccess(`Booking ${status} successfully`);
      fetchBookings(pagination.currentPage);
      setShowDetailModal(false);
      setShowCancelModal(false);
    } else {
      showError(res.error);
    }
    setProcessing(false);
  };

  const handleUpdatePayment = async (id, status) => {
    setProcessing(true);
    const res = await bookingService.updatePaymentStatus(id, status);
    if (res.success) {
      showSuccess(`Payment marked as ${status}`);
      fetchBookings(pagination.currentPage);
    } else {
      showError(res.error);
    }
    setProcessing(false);
  };

  const handleOpenCancelModal = (booking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  const handleCheckIn = async () => {
    setProcessing(true);
    const res = await bookingService.confirmCheckIn(selectedBooking.id);
    if (res.success) {
      showSuccess('Guest checked in successfully');
      fetchBookings(pagination.currentPage);
      setShowDetailModal(false);
    } else {
      showError(res.error);
    }
    setProcessing(false);
  };

  const handleSettleDeposit = async (data) => {
    setProcessing(true);
    const res = await bookingService.settleDeposit(selectedBooking.id, data);
    if (res.success) {
      showSuccess('Deposit settled successfully');
      fetchBookings(pagination.currentPage);
    } else {
      showError(res.error);
    }
    setProcessing(false);
  };

  const [settlementForm, setSettlementForm] = useState({ damageFee: '', cleaningFee: '', otherFee: '', markRefunded: false, refundMethod: '', refundReference: '', note: '' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Management</h1>
          <p className="text-sm text-gray-500">Track and manage reservations and active stays.</p>
        </div>
        <button onClick={() => fetchBookings(pagination.currentPage)} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <BookingStats stats={stats} />
      
      <BookingFilters 
        filterStatus={filterStatus} 
        onStatusChange={setFilterStatus}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => setShowAddBookingModal(true)}
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Property / Room</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading && bookings.length === 0 ? (
                [...Array(5)].map((_, i) => <SkeletonTableRow key={i} columns={6} />)
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No bookings found matching your criteria.</td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <BookingTableRow 
                    key={b.id} 
                    booking={b} 
                    onView={() => { setSelectedBooking(b); setShowDetailModal(true); }}
                    onConvert={() => {}} 
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BookingDetailModal 
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        booking={selectedBooking}
        canApprove={true}
        canManage={true}
        canCancel={true}
        onUpdateStatus={handleUpdateStatus}
        onUpdatePayment={handleUpdatePayment}
        onOpenCancelModal={handleOpenCancelModal}
        onCheckIn={handleCheckIn}
        onSettle={handleSettleDeposit}
        submittingSettle={processing}
        settlementForm={settlementForm}
        onSettlementInputChange={(field, val) => setSettlementForm(prev => ({ ...prev, [field]: val }))}
        settlementHistory={[]}
        loadingSettlementHistory={false}
        formatDate={formatDate}
        getBookingModeLabel={(b) => b.is_proxy ? 'Proxy' : 'Direct'}
        getPaymentColor={(s) => s === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
        getOccupancySummary={(b) => `${b.occupants?.length || 0} People`}
        resolveBedCount={(b) => b.bed_count || 1}
      />

      <CancelBookingModal 
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        booking={selectedBooking}
        onConfirm={(id, reason) => handleUpdateStatus(id, 'cancelled', reason)}
        processing={processing}
      />

      <AddBookingModal 
        isOpen={showAddBookingModal}
        onClose={() => setShowAddBookingModal(false)}
        onSuccess={() => fetchBookings()}
      />
    </div>
  );
}