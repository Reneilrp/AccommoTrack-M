import React, { useState, useEffect } from 'react';
import { tenantService } from '../../services/tenantService';
import { getImageUrl } from '../../utils/api';
import { SkeletonMyBookings, SkeletonFinancials, SkeletonHistory } from '../../components/Shared/Skeleton';
import ReviewModal from '../../components/Modals/ReviewModal';
import { useUIState } from "../../contexts/UIStateContext";
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
  Star
} from 'lucide-react';

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
      alert(err.response?.data?.message || 'Failed to request addon');
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
      alert('Failed to cancel request');
    }
  };

  const handleReview = (booking) => {
    setSelectedBookingForReview(booking);
    setShowReviewModal(true);
  };

  const tabs = [
    { id: 'current', label: 'My Stay', icon: Home },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'history', label: 'History', icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => updateScreenState('bookings', { activeTab: tab.id })}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
    </div>
  );
};

// ==================== Current Stay Tab ====================
const CurrentStayTab = ({ data, pendingBookings = [], onRequestAddon, onCancelAddon, onReview }) => {
  if (!data?.hasActiveStay) {
    // If there are pending bookings, show them here so tenant sees their pending request
    if (pendingBookings && pendingBookings.length > 0) {
      const pb = pendingBookings[0];
      const startDate = pb?.start_date ? new Date(pb.start_date) : null;
      const daysUntil = startDate ? Math.max(0, Math.ceil((startDate - new Date()) / (1000 * 60 * 60 * 24))) : null;
      return (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <Home className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No Active Stay</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">You don't have an active booking at the moment.</p>
          <div className="inline-block bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-lg">
            <Calendar className="w-5 h-5 inline mr-2" />
            Pending Booking: {pb?.property?.title || pb?.property || 'Property'} - {pb?.room?.roomNumber || pb?.room || 'Room'}
            <br />
            {daysUntil !== null && <span className="text-sm">Starts in {daysUntil} days</span>}
            <div className="mt-2 text-xs text-amber-700">Status: {String(pb.status).toLowerCase()}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <Home className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No Active Stay</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">You don't have an active booking at the moment.</p>
        {data?.upcomingBooking && (
          <div className="inline-block bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg">
            <Calendar className="w-5 h-5 inline mr-2" />
            Upcoming: {data.upcomingBooking.property} - {data.upcomingBooking.room}
            <br />
            <span className="text-sm">Starts in {data.upcomingBooking.daysUntil} days</span>
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
            <img
              src={getImageUrl(property.image) || 'https://via.placeholder.com/800x400?text=No+Image'}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex justify-between items-end">
              <div>
                <h2 className="text-xl font-bold text-white">{property.title}</h2>
                <p className="text-white/80 text-sm flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {property.address}
                </p>
              </div>
              {!booking.hasReview && (
                <button 
                  onClick={() => onReview({ ...booking, property })}
                  className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border border-white/20"
                >
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  Review Property
                </button>
              )}
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
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium">Lease Period:</span> {booking.startDate} to {booking.endDate}
                <span className="ml-4 font-medium">Duration:</span> {booking.totalMonths} months
              </p>
            </div>
          </div>
        </div>

        {/* Add-ons Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add-ons & Extras</h3>
            <button
              onClick={onRequestAddon}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Request Add-on
            </button>
          </div>

          {/* Active Add-ons */}
          {addons.active.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Active</h4>
              <div className="space-y-2">
                {addons.active.map((addon) => (
                  <AddonItem key={addon.pivotId} addon={addon} status="active" />
                ))}
              </div>
            </div>
          )}

          {/* Pending Requests */}
          {addons.pending.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">Pending Approval</h4>
              <div className="space-y-2">
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

          {addons.active.length === 0 && addons.pending.length === 0 && (
            <p className="text-gray-400 dark:text-gray-500 text-center py-4">No add-ons yet. Request one to get started!</p>
          )}

          {addons.monthlyTotal > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Monthly Add-on Total:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">+₱{addons.monthlyTotal.toLocaleString()}/mo</span>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Landlord Contact Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Landlord Contact</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <span className="text-xl">{(landlord?.name && landlord.name.charAt(0).toUpperCase()) || '?'}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{landlord?.name || 'Property Owner'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Property Owner</p>
              </div>
          </div>
          <div className="space-y-2">
            {landlord?.email ? (
              <a href={`mailto:${landlord.email}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400">
                <Mail className="w-4 h-4" />
                {landlord.email}
              </a>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">No email available</div>
            )}
            {landlord?.phone && (
              <a href={`tel:${landlord.phone}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400">
                <Phone className="w-4 h-4" />
                {landlord.phone}
              </a>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Base Rent</span>
              <span className="font-medium text-gray-900 dark:text-white">₱{booking.monthlyRent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Add-ons</span>
              <span className="font-medium text-gray-900 dark:text-white">₱{addons.monthlyTotal.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between">
              <span className="font-semibold text-gray-900 dark:text-white">Total Monthly</span>
              <span className="font-bold text-green-600 dark:text-green-400">
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
      <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <DollarSign className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">No Active Booking</h3>
        <p className="text-gray-500 dark:text-gray-400">Financial details will appear when you have an active stay.</p>
      </div>
    );
  }

  const { financials, booking } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Monthly Rent</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">₱{financials.monthlyRent.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Monthly Add-ons</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">+₱{financials.monthlyAddons.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Monthly</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">₱{financials.monthlyTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Payments</h3>
        {financials.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Method</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {financials.payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-200">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">₱{payment.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{payment.paymentMethod || '-'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-center py-8">No payments recorded yet.</p>
        )}
      </div>

      {/* Invoice History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invoices</h3>
        {financials.invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {financials.invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-200">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{invoice.description || 'Monthly Rent'}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">₱{invoice.amount.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-center py-8">No invoices generated yet.</p>
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
      <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">No History Yet</h3>
        <p className="text-gray-500 dark:text-gray-400">Your past bookings will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={getImageUrl(booking.property.image) || 'https://via.placeholder.com/64'}
                  alt={booking.property.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">{booking.property.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Room {booking.room.roomNumber}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{booking.period.startDate} - {booking.period.endDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Paid</p>
                <p className="font-semibold text-green-600 dark:text-green-400">₱{booking.financials.totalPaid.toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={booking.status} />
                {booking.status === 'completed' && !booking.has_review && (
                  <button 
                    onClick={() => onReview(booking)}
                    className="flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 underline underline-offset-2"
                  >
                    <Star className="w-3 h-3 fill-current" />
                    Leave Review
                  </button>
                )}
                {booking.has_review && (
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 italic">Reviewed</span>
                )}
              </div>
            </div>
          </div>
          {booking.addons.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Add-ons used:</p>
              <div className="flex flex-wrap gap-2">
                {booking.addons.map((addon, idx) => (
                  <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
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
  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
    <div className="text-2xl mb-1">{icon}</div>
    <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
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
  <div className={`flex items-center justify-between p-3 rounded-lg ${
    status === 'active' ? 'bg-green-50 dark:bg-green-900/30' : 'bg-amber-50 dark:bg-amber-900/30'
  }`}>
    <div className="flex items-center gap-3">
      <Sparkles className={`w-5 h-5 ${status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} />
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{addon.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {addon.priceTypeLabel} • {addon.addonType === 'rental' ? 'Provided' : 'Usage Fee'}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="font-semibold text-gray-900 dark:text-white">
        ₱{addon.price.toLocaleString()}
        {addon.priceType === 'monthly' && <span className="text-xs text-gray-500 dark:text-gray-400">/mo</span>}
      </span>
      {status === 'pending' && onCancel && (
        <button
          onClick={onCancel}
          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
          title="Cancel Request"
        >
          <XCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  </div>
);

const AddonModal = ({ availableAddons, onClose, onRequest, requestingId }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Available Add-ons</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
      </div>
      <div className="p-6 overflow-y-auto max-h-[60vh]">
        {availableAddons.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">No add-ons available for this property.</p>
        ) : (
          <div className="space-y-3">
            {availableAddons.map((addon) => (
              <div key={addon.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-green-300 dark:hover:border-green-600 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{addon.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        addon.priceType === 'monthly' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                      }`}>
                        {addon.priceTypeLabel}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        addon.addonType === 'rental' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      }`}>
                        {addon.addonTypeLabel}
                      </span>
                    </div>
                    {addon.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{addon.description}</p>
                    )}
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400 mt-2">
                      ₱{addon.price.toLocaleString()}
                      {addon.priceType === 'monthly' && <span className="text-sm font-normal">/month</span>}
                    </p>
                    {addon.stock !== null && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {addon.hasStock ? `${addon.stock} available` : 'Out of stock'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onRequest(addon)}
                    disabled={!addon.hasStock || requestingId === addon.id}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      addon.hasStock && requestingId !== addon.id
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
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
    </div>
  </div>
);

export default MyBookings;
