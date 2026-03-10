import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantService } from '../../services/tenantService';
import { getImageUrl } from '../../utils/api';
import ImagePlaceholder from '../../components/Shared/ImagePlaceholder';
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
  X,
  Plus,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  RefreshCw,
  Star,
  ShieldAlert,
  ArrowRight,
  Wrench,
  ChevronDown,
  DoorOpen,
  Banknote,
  CalendarDays,
  CreditCard
} from 'lucide-react';
import ReportModal from '../../components/Modals/ReportModal';

const MyBookings = () => {
  const navigate = useNavigate();
  const { uiState, updateScreenState, updateData } = useUIState();
  const activeTab = uiState.bookings?.activeTab || 'current';
  
  // Use cached data for instant mount
  const cachedData = uiState.data?.bookings;

  const [activeStays, setActiveStays] = useState(cachedData?.activeStays || []);
  const [selectedStayIndex, setSelectedStayIndex] = useState(0);
  const [selectedPendingIndex, setSelectedPendingIndex] = useState(0);
  const [pendingBookings, setPendingBookings] = useState(cachedData?.pendingBookings || []);
  const [upcomingBooking, setUpcomingBooking] = useState(cachedData?.upcomingBooking || null);
  const [history, setHistory] = useState(cachedData?.history || { bookings: [], pagination: null });
  
  // Only show initial loader if we have NO cached data at all
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [requestingAddon, setRequestingAddon] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  
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
    const hasDataForTab = (activeTab === 'history' ? (history?.bookings?.length > 0) : (activeStays?.length > 0 || pendingBookings?.length > 0 || upcomingBooking));
    if (!hasDataForTab) setLoading(true);
    
    setError(null);
    try {
      if (activeTab === 'current' || activeTab === 'financials') {
        const response = await tenantService.getCurrentStay();
        const stays = response?.stays || [];
        const upcoming = response?.upcomingBooking || null;
        
        setActiveStays(stays);
        setUpcomingBooking(upcoming);
        
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
        updateData('bookings', { 
          ...cachedData, 
          activeStays: stays, 
          pendingBookings: pending,
          upcomingBooking: upcoming 
        });

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

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    setCancellingBooking(bookingId);
    try {
      await tenantService.cancelBooking(bookingId, 'Tenant cancelled the booking');
      toast.success('Booking cancelled successfully');
      fetchData();
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancellingBooking(null);
    }
  };

  const handleRequestAddon = async (payload) => {
    setRequestingAddon(payload.addon_id || 'custom');
    try {
      await tenantService.requestAddon(payload);
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
              stays={activeStays}
              selectedIndex={selectedStayIndex}
              onSelectStay={setSelectedStayIndex}
              pendingBookings={pendingBookings}
              upcomingBooking={upcomingBooking}
              onRequestAddon={() => setShowAddonModal(true)}
              onCancelAddon={handleCancelAddonRequest}
              onCancelBooking={handleCancelBooking}
              isCancelling={cancellingBooking}
              onReview={handleReview}
              onReport={handleReport}
              navigate={navigate}
            />
          )}
          {activeTab === 'financials' && (
            <FinancialsTab 
              stays={activeStays} 
              selectedIndex={selectedStayIndex}
              onSelectStay={setSelectedStayIndex}
              navigate={navigate} 
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab 
              data={history} 
              onLoadMore={() => {}} 
              onReview={handleReview}
              onReport={handleReport}
              onCancelBooking={handleCancelBooking}
              isCancelling={cancellingBooking}
            />
          )}
        </>
      )}

      {/* Addon Request Modal */}
      {showAddonModal && activeStays[selectedStayIndex] && (
        <AddonModal
          availableAddons={activeStays[selectedStayIndex]?.addons?.available || []}
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
const CurrentStayTab = ({ stays = [], selectedIndex = 0, onSelectStay, pendingBookings = [], upcomingBooking = null, onRequestAddon, onCancelAddon, onCancelBooking, isCancelling, onReview, onReport, navigate }) => {
  const hasStays = stays && stays.length > 0;
  const hasPending = pendingBookings && pendingBookings.length > 0;
  const [viewMode, setViewMode] = useState(hasStays ? 'active' : 'pending');
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (!hasStays && !hasPending) {
    if (upcomingBooking) {
      return (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
          <Calendar className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirmed Upcoming Stay</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Your stay at <span className="font-bold text-gray-700 dark:text-gray-200">{upcomingBooking.property}</span> is confirmed.</p>
          
          <div className="inline-block bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-8 py-6 rounded-2xl border border-green-100 dark:border-green-800/50 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-green-600/70 uppercase tracking-wider">Starts In</p>
                <p className="text-2xl font-black">{upcomingBooking.daysUntil} {upcomingBooking.daysUntil === 1 ? 'Day' : 'Days'}</p>
                <p className="text-sm opacity-80 mt-1 font-medium">{formatDate(upcomingBooking.startDate)} • Room {upcomingBooking.room}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <button 
              onClick={() => onCancelBooking(upcomingBooking.id)}
              disabled={isCancelling === upcomingBooking.id}
              className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-2 mx-auto transition-colors disabled:opacity-50"
            >
              {isCancelling === upcomingBooking.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Cancel Booking
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Home className="w-10 h-10 text-gray-300 dark:text-gray-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Active Stay</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">You don't have an active or pending booking at the moment. Ready to find your next home?</p>
        <button 
          onClick={() => navigate('/explore')}
          className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-95"
        >
          Explore Properties
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* View Toggle */}
        {hasStays && hasPending ? (
          <div className="relative flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl w-full max-w-sm border border-gray-300 dark:border-gray-700 shadow-inner">
            {/* Sliding Indicator */}
            <div 
              className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg shadow-md transition-all duration-300 ease-out ${
                viewMode === 'active' ? 'bg-green-600 shadow-green-500/20' : 'bg-amber-600 shadow-amber-500/20'
              }`}
              style={{ transform: viewMode === 'active' ? 'translateX(0)' : 'translateX(calc(100% + 4px))' }}
            />
            
            <button 
              onClick={() => setViewMode('active')}
              className={`relative z-10 flex-1 py-2 text-sm font-bold rounded-lg transition-colors duration-300 ${
                viewMode === 'active' 
                  ? 'text-white' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Active Stays ({stays.length})
            </button>
            <button 
              onClick={() => setViewMode('pending')}
              className={`relative z-10 flex-1 py-2 text-sm font-bold rounded-lg transition-colors duration-300 ${
                viewMode === 'pending' 
                  ? 'text-white' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Pending ({pendingBookings.length})
            </button>
          </div>
        ) : <div />}

        {/* Adaptive Stay Selector */}
        {viewMode === 'active' && hasStays && (
          <StaySelector 
            stays={stays} 
            selectedIndex={selectedIndex} 
            onSelect={onSelectStay} 
          />
        )}
      </div>

      {/* PENDING VIEW */}
      {viewMode === 'pending' && hasPending && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingBookings.map(pb => {
            const startDate = pb?.start_date ? new Date(pb.start_date) : null;
            const daysUntil = startDate ? Math.max(0, Math.ceil((startDate - new Date()) / (1000 * 60 * 60 * 24))) : null;
            
            return (
              <div key={pb.id} className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 px-4">
                <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Booking Pending</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">The landlord is reviewing your request.</p>
                
                                                    <div className="bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-400 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/20 shadow-sm mb-6">
                                                      <div className="flex items-center gap-3">
                                                        <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl shadow-sm">
                                                          <Home className="w-5 h-5 text-amber-600" />
                                                        </div>
                                                        <div className="text-left flex-1">
                                                          <p className="font-bold text-base leading-tight">{pb?.property_title || pb?.property?.title || 'Property'}</p>
                                                          <p className="text-xs opacity-80 font-medium mt-0.5">
                                                            {daysUntil !== null ? `Tentative start: ${formatDate(pb.start_date)}` : 'Awaiting approval'}
                                                          </p>
                                                        </div>
                                                      </div>
                                                      
                                                      <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-800/30 flex justify-between items-center">
                                                        <div className="text-left">
                                                          <p className="text-[10px] font-bold uppercase opacity-60">
                                                            {pb?.billing_policy === 'daily' ? 'Daily' : 'Monthly'}
                                                          </p>
                                                          <p className="text-base font-bold">₱{(pb?.unit_price || pb?.monthly_rent || 0).toLocaleString()}</p>
                                                        </div>
                                                        <button 
                                                          onClick={() => onCancelBooking(pb.id)}
                                                          disabled={isCancelling === pb.id}
                                                          className="bg-white dark:bg-gray-800 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-red-100 dark:border-red-900/30 hover:bg-red-50 transition-all flex items-center gap-1.5"
                                                        >
                                                          {isCancelling === pb.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                                          Cancel Request
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}        </div>
      )}

      {/* ACTIVE STAY VIEW */}
      {viewMode === 'active' && hasStays && (
        <div className="space-y-6">
          {(() => {
            const data = stays[selectedIndex] || stays[0];
            const { booking, room, property, landlord, addons = { active: [], pending: [], available: [], monthlyTotal: 0 } } = data;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Room Details Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
                    <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                      {getImageUrl(property.image) ? (
                        <img
                          src={getImageUrl(property.image)}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImagePlaceholder className="w-full h-full" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 flex justify-between items-end">
                        <div>
                          <h2 className="text-2xl font-bold text-white">{property.title}</h2>
                          <p className="text-white/90 text-sm flex items-center mt-1 font-medium">
                            <MapPin className="w-4 h-4 mr-1.5" />
                            {property.address}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => navigate('/maintenance', { state: { propertyId: property.id } })}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
                          >
                            <Wrench className="w-4 h-4" />
                            Maintenance
                          </button>
                          {!booking.hasReview && (
                            <button 
                              onClick={() => onReview({ ...booking, property })}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-green-500/20"
                            >
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              Review
                            </button>
                          )}
                          <button 
                            onClick={() => onReport(property)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-red-500/20"
                          >
                            <ShieldAlert className="w-4 h-4" />
                            Report
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Room" value={room.roomNumber} icon={DoorOpen} />
                        <StatCard 
                          label={booking.billing_policy === 'daily' ? 'Daily Rent' : 'Monthly Rent'} 
                          value={`₱${(booking.unit_price || booking.monthlyRent || 0).toLocaleString()}`} 
                          icon={Banknote} 
                        />
                        <StatCard
                          label="Days Left"
                          value={
                            booking?.daysRemaining == null
                              ? '-'
                              : Math.max(0, Math.ceil(Number(booking.daysRemaining)))
                          }
                          icon={CalendarDays}
                        />
                        <StatCard 
                          label="Status" 
                          value={booking.paymentStatus} 
                          icon={CreditCard} 
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
                            <AddonItem key={addon.pivot?.id || addon.id} addon={addon} status="active" />
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
                              key={addon.pivot?.id || addon.id} 
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
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                          {booking.billing_policy === 'daily' ? 'Daily Add-on Fees' : 'Monthly Add-on Fees'}
                        </span>
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
                        <span className="text-gray-500 dark:text-gray-400">
                          {booking.billing_policy === 'daily' ? 'Daily Rent' : 'Room Rent'}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          ₱{(booking.unit_price || booking.monthlyRent || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {booking.billing_policy === 'daily' ? 'Daily Add-ons' : 'Monthly Add-ons'}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">₱{addons.monthlyTotal.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between items-center">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {booking.billing_policy === 'daily' ? 'Daily Total' : 'Monthly Total'}
                        </span>
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                          ₱{((booking.unit_price || booking.monthlyRent || 0) + addons.monthlyTotal).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

// ==================== Stay Selector Component ====================
const StaySelector = ({ stays, selectedIndex, onSelect, className = "" }) => {
  const isMulti = stays.length > 1;

  if (!isMulti) return null;

  return (
    <div className={`relative w-full md:w-auto md:min-w-[280px] ${className}`}>
      <select
        value={selectedIndex}
        onChange={(e) => onSelect(parseInt(e.target.value))}
        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-green-500 transition-all appearance-none cursor-pointer pr-10 shadow-sm"
      >
        {stays.map((stay, idx) => (
          <option key={stay.booking.id} value={idx}>
            {stay.property.title} ({stay.room.roomNumber})
          </option>
        ))}
      </select>
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
        <ChevronDown className="w-5 h-5" />
      </div>
    </div>
  );
};

// ==================== Financials Tab ====================
const FinancialsTab = ({ stays = [], selectedIndex = 0, onSelectStay, navigate }) => {
  const hasStays = stays && stays.length > 0;

  if (!hasStays) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
        <DollarSign className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200">No Active Booking</h3>
        <p className="text-gray-500 dark:text-gray-400">Financial details will appear when you have an active stay.</p>
      </div>
    );
  }

  const data = stays[selectedIndex] || stays[0];
  const { financials } = data;
  
  // Flatten all transactions from all invoices into a single sorted list
  const invoices = Array.isArray(financials?.invoices) ? financials.invoices : [];
  const allTransactions = invoices
    .flatMap(inv => (Array.isArray(inv.transactions) ? inv.transactions : []).map(tx => ({ 
      ...tx, 
      date: tx.date || tx.created_at,
      amount: tx.amount ?? (tx.amount_cents ? tx.amount_cents / 100 : 0),
      invoiceRef: inv.id 
    })))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const recentTransactions = allTransactions.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Adaptive Stay Selector */}
      <StaySelector 
        stays={stays} 
        selectedIndex={selectedIndex} 
        onSelect={onSelectStay} 
      />

      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-green-600 rounded-xl p-6 text-white shadow-lg shadow-green-600/20">
        <div>
          <h3 className="text-xl font-bold">Billing & Payments</h3>
          <p className="text-green-100 text-sm mt-1">Manage your invoices, view full history and make payments.</p>
        </div>
        <button 
          onClick={() => navigate('/payments')}
          className="bg-white text-green-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-50 transition-all shadow-md active:scale-95 whitespace-nowrap"
        >
          View Full History
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-300 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            {financials?.billing_policy === 'daily' ? 'Daily Rent' : 'Monthly Rent'}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ₱{(financials?.unit_price || financials?.monthlyRent || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-300 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            {financials?.billing_policy === 'daily' ? 'Daily Add-ons' : 'Monthly Add-ons'}
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">+₱{financials?.monthlyAddons?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-300 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            {financials?.billing_policy === 'daily' ? 'Total Due/day' : 'Total Due/mo'}
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">₱{financials?.monthlyTotal?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-green-500" />
            Recent Activity
          </h3>
          <button 
            onClick={() => navigate('/payments')}
            className="text-sm font-bold text-green-600 dark:text-green-400 hover:underline"
          >
            See all
          </button>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-300 dark:border-gray-700">
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-gray-600 dark:text-gray-400">{tx.date}</td>
                    <td className="py-4 px-6 text-sm font-bold text-gray-900 dark:text-white">₱{(tx.amount || 0).toLocaleString()}</td>
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
          <p className="text-gray-400 dark:text-gray-500 text-center py-12 italic text-sm font-medium">No recent transactions.</p>
        )}
      </div>
    </div>
  );
};

// ==================== History Tab ====================
const HistoryTab = ({ data, onLoadMore, onReview, onReport, onCancelBooking, isCancelling }) => {
  const { bookings, pagination } = data;

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
        <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">No History Yet</h3>
        <p className="text-gray-500 dark:text-gray-400">Your past and pending bookings will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bookings.map((booking) => (
        <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-600">
                  {getImageUrl(booking.property?.image) ? (
                    <img
                      src={getImageUrl(booking.property.image)}
                      alt={booking.property?.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImagePlaceholder className="w-full h-full" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white leading-tight">{booking.property?.title || 'Property'}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Room {booking.room?.roomNumber || 'N/A'}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{booking.period?.startDate} - {booking.period?.endDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Paid</p>
                  <p className="font-bold text-green-600 dark:text-green-400 text-lg">₱{(booking.financials?.totalPaid || 0).toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={booking.status} />
                  <div className="flex items-center gap-3">
                    {booking.status === 'completed' && !booking.review && (
                      <button 
                        onClick={() => onReview(booking)}
                        className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 underline underline-offset-2"
                      >
                        <Star className="w-3 h-3 fill-current" />
                        Review
                      </button>
                    )}
                    {booking.status === 'pending' && (
                      <button 
                        onClick={() => onCancelBooking(booking.id)}
                        disabled={isCancelling === booking.id}
                        className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline underline-offset-2 disabled:opacity-50"
                      >
                        {isCancelling === booking.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        Cancel
                      </button>
                    )}
                    {booking.review && (
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 italic flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                        {booking.review.rating}/5 Reviewed
                      </span>
                    )}
                    {booking.status !== 'pending' && (
                      <button 
                        onClick={() => onReport(booking.property)}
                        className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline underline-offset-2"
                      >
                        <ShieldAlert className="w-3 h-3" />
                        Report
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <h5 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Activity Timeline</h5>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-700">
                {Array.isArray(booking.activityLog) && booking.activityLog.length > 0 ? (
                  booking.activityLog.map((activity, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[22px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                        activity.status === 'pending' ? 'bg-amber-400' :
                        activity.status === 'confirmed' ? 'bg-green-500' :
                        activity.status === 'paid' ? 'bg-blue-500' :
                        activity.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      
                      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-1">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{activity.action}</p>
                        <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">
                          {formatDateTime(activity.timestamp)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activity.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic">No activity details available.</p>
                )}
              </div>
            </div>

            {Array.isArray(booking.addons) && booking.addons.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Add-ons utilized:</p>
                <div className="flex flex-wrap gap-2">
                  {booking.addons.map((addon, idx) => (
                    <span key={idx} className="text-[10px] font-bold bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 uppercase">
                      {addon.name} ({addon.priceType === 'monthly' ? '₱' + addon.price.toLocaleString() + '/mo' : '₱' + addon.price.toLocaleString()})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {pagination && pagination.currentPage < pagination.lastPage && (
        <button
          onClick={onLoadMore}
          className="w-full py-3 text-green-600 dark:text-green-400 font-bold hover:bg-green-50 dark:hover:bg-green-900/30 rounded-xl transition-all border border-green-100 dark:border-green-900/30"
        >
          Load More
        </button>
      )}
    </div>
  );
};

// ==================== Helper Components ====================
const StatCard = ({ label, value, icon: Icon }) => (
  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md transition-all">
    <div className="flex justify-center mb-2">
      <Icon className="w-6 h-6 text-green-600 dark:text-green-400" />
    </div>
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
        <p className="font-bold text-gray-900 dark:text-white leading-tight">{addon?.name || 'Add-on'}</p>
        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">
          {addon?.price_type_label || (addon?.price_type === 'monthly' ? 'Monthly' : 'One-time')} <span className="mx-1 opacity-30">•</span> {addon?.addon_type === 'rental' ? 'Rental' : 'Service Fee'}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="font-bold text-gray-900 dark:text-white">
        ₱{parseFloat(addon?.price || 0).toLocaleString()}
        {addon?.price_type === 'monthly' && <span className="text-[10px] text-gray-400 font-bold ml-0.5">/mo</span>}
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

const AddonModal = ({ availableAddons, onClose, onRequest, requestingId }) => {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customData, setCustomData] = useState({
    name: '',
    addon_type: 'rental',
    price_type: 'monthly',
    note: ''
  });

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    onRequest({
      is_custom: true,
      ...customData,
      quantity: 1
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-gray-100 dark:border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                {showCustomForm ? 'Request Custom Item' : 'Available Add-ons'}
              </h3>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                {showCustomForm ? 'Describe what you need and the owner will review it' : 'Select an extra service to add to your stay'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          {!showCustomForm ? (
            <>
              {!Array.isArray(availableAddons) || availableAddons.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">No standard add-ons available.</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {availableAddons.map((addon) => (
                    <div key={addon.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-green-300 dark:hover:border-green-600 hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-gray-900 dark:text-white text-lg">{addon.name}</h4>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              addon.price_type === 'monthly' 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            }`}>
                              {addon.price_type_label}
                            </span>
                          </div>
                          {addon.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{addon.description}</p>
                          )}
                          <div className="flex items-baseline gap-2">
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">
                              ₱{parseFloat(addon.price || 0).toLocaleString()}
                            </p>
                            {addon.price_type === 'monthly' && <span className="text-xs font-bold text-gray-400">/mo</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => onRequest({ addon_id: addon.id, quantity: 1 })}
                          disabled={!addon.has_stock || requestingId === addon.id}
                          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                            addon.has_stock && requestingId !== addon.id
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

              <button 
                onClick={() => setShowCustomForm(true)}
                className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 transition-all font-bold flex items-center justify-center gap-2 group"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                Request something else...
              </button>
            </>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Item Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Extra table, Desk lamp..."
                  value={customData.name}
                  onChange={e => setCustomData({...customData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Type *</label>
                  <select 
                    value={customData.addon_type}
                    onChange={e => setCustomData({...customData, addon_type: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none"
                  >
                    <option value="rental">Rental (Item)</option>
                    <option value="fee">Service Fee</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Billing *</label>
                  <select 
                    value={customData.price_type}
                    onChange={e => setCustomData({...customData, price_type: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="one_time">One-time</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Notes / Details</label>
                <textarea 
                  placeholder="Tell the owner more about your request..."
                  value={customData.note}
                  onChange={e => setCustomData({...customData, note: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none h-24 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="flex-1 py-3 border border-gray-300 dark:border-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button 
                  type="submit"
                  disabled={requestingId === 'custom'}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {requestingId === 'custom' ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Request'}
                </button>
              </div>
            </form>
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
};

export default MyBookings;