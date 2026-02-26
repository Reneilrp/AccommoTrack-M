import React, { useState, useEffect } from 'react';
import { tenantService } from '../../services/tenantService';
import { getImageUrl } from '../../utils/api';
import { SkeletonMyBookings, SkeletonFinancials, SkeletonHistory } from '../../components/Shared/Skeleton';
import ReviewModal from '../../components/Modals/ReviewModal';
import { useUIState } from "../../contexts/UIStateContext";
import toast from 'react-hot-toast';
import { 
  Home, 
  Calendar, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  RefreshCw,
  Star,
  ShieldAlert
} from 'lucide-react';
import ReportModal from '../../components/Modals/ReportModal';

const MyBookings = () => {
  const { uiState, updateScreenState, updateData } = useUIState();
  const activeTab = uiState.bookings?.activeTab || 'current';
  
  // Use cached data for instant mount
  const cachedData = uiState.data?.bookings;

  const [currentStay, setCurrentStay] = useState(cachedData?.currentStay || null);
  const [pendingBookings, setPendingBookings] = useState(cachedData?.pendingBookings || []);
  const [history, setHistory] = useState(cachedData?.history || { bookings: [], pagination: null });
  
  // Only show initial loader if we have NO cached data at all
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [requestingAddon, setRequestingAddon] = useState(null);
  
  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPropertyForReport, setSelectedPropertyForReport] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    // Only set loading true if we don't have data for the current tab already
    const hasDataForTab = (activeTab === 'history' ? (history?.bookings?.length > 0) : currentStay !== null);
    if (!hasDataForTab) setLoading(true);
    
    setError(null);
    try {
      if (activeTab === 'current' || activeTab === 'financials') {
        const data = await tenantService.getCurrentStay();
        setCurrentStay(data);
        
        // Also fetch tenant bookings to detect pending bookings
        let pending = [];
        try {
          const bookingsResp = await tenantService.getBookings();
          const bookingsList = bookingsResp?.bookings || bookingsResp || [];
          pending = bookingsList.filter(b => String(b.status).toLowerCase() === 'pending');
          setPendingBookings(pending);
        } catch (e) {
          console.warn('Failed to fetch tenant bookings for pending detection', e);
        }

        // Update cache
        updateData('bookings', { ...cachedData, currentStay: data, pendingBookings: pending });

      } else if (activeTab === 'history') {
        const data = await tenantService.getHistory();
        setHistory(data);
        
        // Update cache
        updateData('bookings', { ...cachedData, history: data });
      }
    } catch (err) {
      const serverMessage = err?.response?.data?.message || err?.message || 'Failed to load data.';
      setError(serverMessage);
      console.error('MyBookings fetchData error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAddon = async (addon) => {
    setRequestingAddon(addon.id);
    try {
      await tenantService.requestAddon(addon.id, 1);
      // Refresh data
      fetchData();
      setShowAddonModal(false);
    } catch (err) {
      console.error('Failed to request addon:', err);
      toast.error(err.response?.data?.message || 'Failed to request addon');
    } finally {
      setRequestingAddon(null);
    }
  };

  const handleCancelAddonRequest = async (addonId) => {
    if (!confirm('Cancel this addon request?')) return;
    try {
      await tenantService.cancelAddonRequest(addonId);
      fetchData();
    } catch (err) {
      console.error('Failed to cancel addon request:', err);
      toast.error('Failed to cancel request');
    }
  };

  const handleReview = (booking) => {
    setSelectedBookingForReview(booking);
    setShowReviewModal(true);
  };

  const handleReport = (property) => {
    setSelectedPropertyForReport(property);
    setShowReportModal(true);
  };

  const tabs = [
    { id: 'current', label: 'My Stay', icon: Home },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'history', label: 'History', icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-transparent dark:bg-gray-900 p-4 md:p-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-300 dark:border-gray-700 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => updateScreenState('bookings', { activeTab: tab.id })}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap border shadow-sm ${
              activeTab === tab.id
                ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-500/20'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        activeTab === 'current' ? (
          <SkeletonMyBookings />
        ) : activeTab === 'financials' ? (
          <SkeletonFinancials />
        ) : (
          <SkeletonHistory />
        )
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg text-center">
          {error}
          <button onClick={fetchData} className="ml-2 underline">Retry</button>
        </div>
      ) : (
        <>
          {activeTab === 'current' && (
            <CurrentStayTab 
              data={currentStay}
              pendingBookings={pendingBookings}
              onRequestAddon={() => setShowAddonModal(true)}
              onCancelAddon={handleCancelAddonRequest}
              onReview={handleReview}
              onReport={handleReport}
            />
          )}
          {activeTab === 'financials' && (
            <FinancialsTab data={currentStay} />
          )}
          {activeTab === 'history' && (
            <HistoryTab 
              data={history} 
              onLoadMore={() => {}} 
              onReview={handleReview}
              onReport={handleReport}
            />
          )}
        </>
      )}

      {/* Addon Request Modal */}
      {showAddonModal && currentStay?.hasActiveStay && (
        <AddonModal
          availableAddons={currentStay.addons.available}
          onClose={() => setShowAddonModal(false)}
          onRequest={handleRequestAddon}
          requestingId={requestingAddon}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && selectedBookingForReview && (
        <ReviewModal
          booking={selectedBookingForReview}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedBookingForReview(null);
          }}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* Report Modal */}
      {showReportModal && selectedPropertyForReport && (
        <ReportModal
          isOpen={showReportModal}
          propertyId={selectedPropertyForReport.id}
          propertyTitle={selectedPropertyForReport.title}
          onClose={() => {
            setShowReportModal(false);
            setSelectedPropertyForReport(null);
          }}
        />
      )}
    </div>
  );
};

// ==================== Current Stay Tab ====================
const CurrentStayTab = ({ data, pendingBookings = [], onRequestAddon, onCancelAddon, onReview, onReport }) => {
  if (!data?.hasActiveStay) {
    // If there are pending bookings, show them here so tenant sees their pending request
    if (pendingBookings && pendingBookings.length > 0) {
      const pb = pendingBookings[0];
      const startDate = pb?.start_date ? new Date(pb.start_date) : null;
      const daysUntil = startDate ? Math.max(0, Math.ceil((startDate - new Date()) / (1000 * 60 * 60 * 24))) : null;
      return (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
          <Home className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Active Stay</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">You don't have an active booking at the moment.</p>
          <div className="inline-block bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-6 py-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <div className="text-left">
                <p className="font-bold">Pending: {pb?.property?.title || pb?.property || 'Property'}</p>
                <p className="text-sm opacity-80">{daysUntil !== null ? `Starts in ${daysUntil} days` : 'Awaiting approval'}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
        <Home className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Active Stay</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Explore our properties to find your next home.</p>
        {data?.upcomingBooking && (
          <div className="inline-block bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-6 py-4 rounded-xl border border-green-100 dark:border-green-900/30">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <div className="text-left">
                <p className="font-bold">Upcoming: {data.upcomingBooking.property}</p>
                <p className="text-sm opacity-80">Starts in {data.upcomingBooking.daysUntil} days</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const { booking, room, property, landlord, addons } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Room Details Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
          <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
            <img
              src={getImageUrl(property.image) || 'https://via.placeholder.com/800x400?text=No+Image'}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-white">{property.title}</h2>
                <p className="text-white/90 text-sm flex items-center mt-1 font-medium">
                  <MapPin className="w-4 h-4 mr-1.5" />
                  {property.address}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {!booking.hasReview && (
                  <button 
                    onClick={() => onReview({ ...booking, property })}
                    className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/30"
                  >
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    Review
                  </button>
                )}
                <button 
                  onClick={() => onReport(property)}
                  className="bg-red-500/20 backdrop-blur-md hover:bg-red-500/40 text-red-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-red-500/30"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Report
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Room" value={room.roomNumber} icon="🚪" />
              <StatCard label="Monthly Rent" value={`₱${booking.monthlyRent.toLocaleString()}`} icon="💰" />
              <StatCard
                label="Days Left"
                value={
                  booking?.daysRemaining == null
                    ? '-'
                    : Math.max(0, Math.ceil(Number(booking.daysRemaining)))
                }
                icon="📅"
              />
              <StatCard 
                label="Status" 
                value={booking.paymentStatus} 
                icon={booking.paymentStatus === 'paid' ? '✅' : '⏳'} 
              />
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-between">
                <span><span className="font-bold dark:text-gray-300">Lease:</span> {booking.startDate} to {booking.endDate}</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-bold uppercase">{booking.totalMonths} Months</span>
              </p>
            </div>
          </div>
        </div>

        {/* Add-ons Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add-ons & Extras</h3>
            <button
              onClick={onRequestAddon}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Request
            </button>
          </div>

          {/* Active Add-ons */}
          {Array.isArray(addons.active) && addons.active.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Current Subscriptions</h4>
              <div className="space-y-3">
                {addons.active.map((addon) => (
                  <AddonItem key={addon.pivotId} addon={addon} status="active" />
                ))}
              </div>
            </div>
          )}

          {/* Pending Requests */}
          {Array.isArray(addons.pending) && addons.pending.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3">Awaiting Approval</h4>
              <div className="space-y-3">
                {addons.pending.map((addon) => (
                  <AddonItem 
                    key={addon.pivotId} 
                    addon={addon} 
                    status="pending"
                    onCancel={() => onCancelAddon(addon.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {(!Array.isArray(addons.active) || addons.active.length === 0) && (!Array.isArray(addons.pending) || addons.pending.length === 0) && (
            <div className="text-center py-8 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl">
              <Sparkles className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">No add-ons yet.</p>
            </div>
          )}

          {addons.monthlyTotal > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Monthly Add-on Fees:</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">+₱{addons.monthlyTotal.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Landlord Contact Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Property Manager</h3>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-700 dark:text-green-400 font-bold">
                {landlord?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white leading-tight">{landlord?.name || 'Owner'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Verified Host</p>
              </div>
          </div>
          <div className="space-y-3">
            {landlord?.email && (
              <a href={`mailto:${landlord.email}`} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                {landlord.email}
              </a>
            )}
            {landlord?.phone && (
              <a href={`tel:${landlord.phone}`} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                {landlord.phone}
              </a>
            )}
          </div>
        </div>

        {/* Quick Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Room Rent</span>
              <span className="font-bold text-gray-900 dark:text-white">₱{booking.monthlyRent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Monthly Add-ons</span>
              <span className="font-bold text-gray-900 dark:text-white">₱{addons.monthlyTotal.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between items-center">
              <span className="font-bold text-gray-900 dark:text-white">Monthly Total</span>
              <span className="text-xl font-bold text-green-600 dark:text-green-400">
                ₱{(booking.monthlyRent + addons.monthlyTotal).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== Financials Tab ====================
const FinancialsTab = ({ data }) => {
  if (!data?.hasActiveStay) {
    return (
      <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
        <DollarSign className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200">No Active Booking</h3>
        <p className="text-gray-500 dark:text-gray-400">Financial details will appear when you have an active stay.</p>
      </div>
    );
  }

  const { financials } = data;
  
  // Flatten all transactions from all invoices into a single sorted list
  const invoices = Array.isArray(financials.invoices) ? financials.invoices : [];
  const allTransactions = invoices
    .flatMap(inv => (Array.isArray(inv.transactions) ? inv.transactions : []).map(tx => ({ ...tx, invoiceRef: inv.id })))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-300 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Monthly Rent</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">₱{financials.monthlyRent.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-300 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Monthly Add-ons</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">+₱{financials.monthlyAddons.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-300 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Due/mo</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">₱{financials.monthlyTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-green-500" />
            Recent Transactions
          </h3>
        </div>
        {allTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-300 dark:border-gray-700">
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Method</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
                {allTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-gray-600 dark:text-gray-400">{tx.date}</td>
                    <td className="py-4 px-6 text-sm font-bold text-gray-900 dark:text-white">₱{tx.amount.toLocaleString()}</td>
                    <td className="py-4 px-6 text-sm font-bold text-gray-500 dark:text-gray-500 capitalize">{tx.method.replace('paymongo_', '').replace('_', ' ')}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        tx.status === 'succeeded' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-center py-12 italic text-sm font-medium">No payment transactions recorded yet.</p>
        )}
      </div>

      {/* Invoice History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-500" />
            Invoice History
          </h3>
        </div>
        {Array.isArray(financials.invoices) && financials.invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-300 dark:border-gray-700">
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Due Date</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
                {financials.invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-gray-600 dark:text-gray-400">{invoice.dueDate || invoice.issuedAt}</td>
                    <td className="py-4 px-6 text-sm font-bold text-gray-500 dark:text-gray-500">{invoice.description || 'Accommodation Fee'}</td>
                    <td className="py-4 px-6 text-sm font-bold text-gray-900 dark:text-white">₱{invoice.amount.toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-center py-12 italic text-sm font-medium">No invoices generated yet.</p>
        )}
      </div>
    </div>
  );
};

// ==================== History Tab ====================
const HistoryTab = ({ data, onLoadMore, onReview }) => {
  const { bookings, pagination } = data;

  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
        <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">No History Yet</h3>
        <p className="text-gray-500 dark:text-gray-400">Your past bookings will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-600">
                <img
                  src={getImageUrl(booking.property.image) || 'https://via.placeholder.com/64'}
                  alt={booking.property.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white leading-tight">{booking.property.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Room {booking.room.roomNumber}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{booking.period.startDate} - {booking.period.endDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Paid</p>
                <p className="font-bold text-green-600 dark:text-green-400 text-lg">₱{booking.financials.totalPaid.toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={booking.status} />
                <div className="flex items-center gap-3">
                  {booking.status === 'completed' && !booking.has_review && (
                    <button 
                      onClick={() => onReview(booking)}
                      className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 underline underline-offset-2"
                    >
                      <Star className="w-3 h-3 fill-current" />
                      Review
                    </button>
                  )}
                  {booking.has_review && (
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 italic">Reviewed</span>
                  )}
                  <button 
                    onClick={() => onReport(booking.property)}
                    className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline underline-offset-2"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    Report
                  </button>
                </div>
              </div>
            </div>
          </div>
          {Array.isArray(booking.addons) && booking.addons.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Add-ons used:</p>
              <div className="flex flex-wrap gap-2">
                {booking.addons.map((addon, idx) => (
                  <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                    {addon.name} ({addon.priceType === 'monthly' ? '₱' + addon.price + '/mo' : '₱' + addon.price})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {pagination && pagination.currentPage < pagination.lastPage && (
        <button
          onClick={onLoadMore}
          className="w-full py-3 text-green-600 dark:text-green-400 font-medium hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
        >
          Load More
        </button>
      )}
    </div>
  );
};

// ==================== Helper Components ====================
const StatCard = ({ label, value, icon }) => (
  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md transition-all">
    <div className="text-2xl mb-2">{icon}</div>
    <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mt-1 tracking-wider">{label}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    paid: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    unpaid: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    partial: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    cancelled: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
      {status}
    </span>
  );
};

const AddonItem = ({ addon, status, onCancel }) => (
  <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
    status === 'active' 
      ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30' 
      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'
  }`}>
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === 'active' ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'}`}>
        <Sparkles className="w-5 h-5" />
      </div>
      <div>
        <p className="font-bold text-gray-900 dark:text-white leading-tight">{addon.name}</p>
        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">
          {addon.priceTypeLabel} <span className="mx-1 opacity-30">•</span> {addon.addonType === 'rental' ? 'Rental' : 'Service Fee'}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="font-bold text-gray-900 dark:text-white">
        ₱{addon.price.toLocaleString()}
        {addon.priceType === 'monthly' && <span className="text-[10px] text-gray-400 font-bold ml-0.5">/mo</span>}
      </span>
      {status === 'pending' && onCancel && (
        <button
          onClick={onCancel}
          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="Cancel Request"
        >
          <XCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  </div>
);

const AddonModal = ({ availableAddons, onClose, onRequest, requestingId }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-gray-100 dark:border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Available Add-ons</h3>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Select an extra service to add to your stay</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
      </div>
      <div className="p-6 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
        {!Array.isArray(availableAddons) || availableAddons.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No add-ons available for this property.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {availableAddons.map((addon) => (
              <div key={addon.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-green-300 dark:hover:border-green-600 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">{addon.name}</h4>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        addon.priceType === 'monthly' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                      }`}>
                        {addon.priceTypeLabel}
                      </span>
                    </div>
                    {addon.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{addon.description}</p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        ₱{addon.price.toLocaleString()}
                      </p>
                      {addon.priceType === 'monthly' && <span className="text-xs font-bold text-gray-400">/mo</span>}
                    </div>
                    {addon.stock !== null && (
                      <p className={`text-[10px] font-bold uppercase mt-2 ${addon.hasStock ? 'text-gray-400 dark:text-gray-500' : 'text-red-500'}`}>
                        {addon.hasStock ? `${addon.stock} Available` : 'Out of stock'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onRequest(addon)}
                    disabled={!addon.hasStock || requestingId === addon.id}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                      addon.hasStock && requestingId !== addon.id
                        ? 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {requestingId === addon.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      'Request'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-center">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider leading-relaxed">
          Requests are subject to owner approval. <br/>Approved items will be added to your next billing cycle.
        </p>
      </div>
    </div>
  </div>
);

export default MyBookings;