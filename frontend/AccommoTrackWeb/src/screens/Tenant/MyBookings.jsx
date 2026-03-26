import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantService } from '../../services/tenantService';
import api, { getImageUrl } from '../../utils/api';
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
  AlertCircle,
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
  CreditCard,
  Shuffle,
  MessageSquare
} from 'lucide-react';
import ReportModal from '../../components/Modals/ReportModal';

const MyBookings = () => {
  const navigate = useNavigate();
  const { uiState, updateScreenState, updateData, invalidateData } = useUIState();
  const activeTab = uiState.bookings?.activeTab || 'current';
  
  // Use cached data for instant mount
  const cachedData = uiState.data?.bookings;

  const [activeStays, setActiveStays] = useState(cachedData?.activeStays || []);
  const [selectedStayIndex, setSelectedStayIndex] = useState(0);
  const [pendingBookings, setPendingBookings] = useState(cachedData?.pendingBookings || []);
  const [pendingCheckIns, setPendingCheckIns] = useState(cachedData?.pendingCheckIns || []);
  const [upcomingBooking, setUpcomingBooking] = useState(cachedData?.upcomingBooking || null);
  const [history, setHistory] = useState(cachedData?.history || { bookings: [], pagination: null });
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  
  const fetchedLiveRef = React.useRef(!!cachedData);
  const fetchedHistoryRef = React.useRef(!!(cachedData && cachedData.history));

  // Only show initial loader if we have NO cached data at all
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showTransferWarning, setShowTransferWarning] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [requestingAddon, setRequestingAddon] = useState(null);
  const [extendingStay, setExtendingStay] = useState(false);
  const [requestingTransfer, setRequestingTransfer] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [pendingTransferBookingIds, setPendingTransferBookingIds] = useState([]);
  const [monthlyTransferCount, setMonthlyTransferCount] = useState(0);
  // cancelConfirm stores the bookingId pending user confirmation (null = none)
  const [__cancelConfirm, setCancelConfirm] = useState(null);

  const invalidateTenantStayCache = useCallback(() => {
    invalidateData(['dashboard', 'bookings']);
  }, [invalidateData]);

  // Handle Extension Request
  const handleRequestExtension = async (payload) => {
    setExtendingStay(true);
    try {
      await api.post(`/bookings/${payload.booking_id}/extend`, payload);
      toast.success('Extension request sent to landlord');
      invalidateTenantStayCache();
      fetchData();
      setShowExtensionModal(false);
    } catch (err) {
      console.error('Failed to request extension:', err);
      toast.error(err.response?.data?.message || 'Failed to request extension');
    } finally {
      setExtendingStay(false);
    }
  };

  // Handle Transfer Request
  const handleRequestTransfer = async (payload) => {
    setRequestingTransfer(true);
    try {
      await api.post('/tenant/transfers', payload);
      toast.success('Room transfer request sent to landlord');
      invalidateTenantStayCache();
      
      // Update local state to immediately reflect the new request
      if (payload.booking_id) {
        setPendingTransferBookingIds(prev => [...prev, payload.booking_id]);
      }
      setMonthlyTransferCount(prev => prev + 1);

      fetchData();
      setShowTransferModal(false);
    } catch (err) {
      console.error('Failed to request transfer:', err);
      toast.error(err.response?.data?.message || 'Failed to request transfer');
    } finally {
      setRequestingTransfer(false);
    }
  };
  
  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPropertyForReport, setSelectedPropertyForReport] = useState(null);

  const loadMoreHistory = async () => {
    if (!history?.pagination || history.pagination.currentPage >= history.pagination.lastPage || historyLoadingMore) {
      return;
    }
    setHistoryLoadingMore(true);
    try {
      const nextPage = history.pagination.currentPage + 1;
      const data = await tenantService.getHistory(nextPage);
      const merged = {
        bookings: [...(history.bookings || []), ...data.bookings],
        pagination: data.pagination
      };
      setHistory(merged);
      // Fix: use the fresh `merged` object, not the stale `history` closure
      updateData('bookings', prev => ({ ...(prev || {}), history: merged }));
    } catch (__err) {
      toast.error('Failed to load more history');
    } finally {
      setHistoryLoadingMore(false);
    }
  };

  const fetchData = useCallback(async () => {
    // Only set loading true if we don't have data for the current tab already
    const hasDataForTab = activeTab === 'history' ? fetchedHistoryRef.current : fetchedLiveRef.current;
    if (!hasDataForTab) setLoading(true);
    
    setError(null);
    try {
      if (activeTab === 'current' || activeTab === 'financials') {
        const response = await tenantService.getCurrentStay();
        const stays = response?.stays || response?.data?.stays || [];
        const pendingCheckInsData = response?.pendingCheckIns || response?.data?.pendingCheckIns || [];
        const upcoming =
          response?.upcomingBooking ||
          response?.upcoming_booking ||
          response?.data?.upcomingBooking ||
          response?.data?.upcoming_booking ||
          null;
        
        setActiveStays(stays);
        setPendingCheckIns(pendingCheckInsData);
        setUpcomingBooking(upcoming);
        
        // Also fetch tenant bookings to detect pending bookings
        let pending = [];
        try {
          const bookingsResp = await tenantService.getBookings();
          const bookingsList =
            bookingsResp?.bookings ||
            bookingsResp?.data?.bookings ||
            bookingsResp?.data ||
            bookingsResp ||
            [];
          const pendingStatuses = new Set(['pending', 'booked']);
          const pendingCheckInIds = new Set(pendingCheckInsData.map(pc => pc.id));
          pending = Array.isArray(bookingsList)
            ? bookingsList.filter((b) => 
                pendingStatuses.has(String(b?.status || '').toLowerCase()) && 
                !pendingCheckInIds.has(b.id)
              )
            : [];
          setPendingBookings(pending);
        } catch (e) {
          console.warn('Failed to fetch tenant bookings for pending detection', e);
        }

        // Load transfers
        try {
          const transfersResp = await api.get('/tenant/transfers');
          const transfersList = transfersResp?.data?.data || transfersResp?.data?.transfers || transfersResp?.data || [];
          const list = Array.isArray(transfersList) ? transfersList : [];
          
          // Identify bookings with active transfer requests
          const pendingIds = list
            .filter(t => ['pending', 'approved'].includes(String(t.status || '').toLowerCase()))
            .map(t => t.booking_id);
          setPendingTransferBookingIds(pendingIds);

          // Calculate transfers this month (limit of 2)
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const thisMonthCount = list.filter(t => {
            const dateStr = t.created_at || t.date;
            if (!dateStr) return false;
            const createdAt = new Date(dateStr);
            return createdAt >= startOfMonth;
          }).length;
          setMonthlyTransferCount(thisMonthCount);
        } catch (e) {
          console.warn('Failed to load transfers', e);
        }

        fetchedLiveRef.current = true;

        // Update cache
        updateData('bookings', prev => ({ 
          ...(prev || {}), 
          activeStays: stays, 
          pendingBookings: pending,
          pendingCheckIns: pendingCheckInsData,
          upcomingBooking: upcoming 
        }));

      } else if (activeTab === 'history') {
        const data = await tenantService.getHistory();
        setHistory(data);
        fetchedHistoryRef.current = true;
        
        // Update cache
        updateData('bookings', prev => ({ ...(prev || {}), history: data }));
      }
    } catch (err) {
      const serverMessage = err?.response?.data?.message || err?.message || 'Failed to load data.';
      setError(serverMessage);
      console.error('MyBookings fetchData error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, updateData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleFocusRefresh = () => {
      if (activeTab === 'current' || activeTab === 'financials') {
        fetchData();
      }
    };

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible' && (activeTab === 'current' || activeTab === 'financials')) {
        fetchData();
      }
    };

    const handleNotificationRefresh = () => {
      if (activeTab === 'current' || activeTab === 'financials') {
        invalidateTenantStayCache();
        fetchData();
      }
    };

    const hasLiveStayTab = activeTab === 'current' || activeTab === 'financials';

    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    window.addEventListener('accommo:tenant-data-refresh', handleNotificationRefresh);
    const interval = hasLiveStayTab ? setInterval(fetchData, 30000) : null;

    return () => {
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      window.removeEventListener('accommo:tenant-data-refresh', handleNotificationRefresh);
      if (interval) clearInterval(interval);
    };
  }, [activeTab, invalidateTenantStayCache, fetchData]);

  const handleCancelBooking = (bookingId) => {
    // Show inline confirmation toast instead of browser native confirm()
    setCancelConfirm(bookingId);
    toast(
      (t) => (
        <span className="flex flex-col gap-2">
          <span className="font-semibold text-gray-800">Cancel this booking?</span>
          <span className="text-sm text-gray-500">This action cannot be undone.</span>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { toast.dismiss(t.id); setCancelConfirm(null); }}
              className="flex-1 px-4 py-2.5 text-sm font-bold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Keep
            </button>
            <button
              onClick={() => { toast.dismiss(t.id); confirmCancelBooking(bookingId); }}
              className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Cancel Booking
            </button>
          </div>
        </span>
      ),
      { duration: 8000, icon: '⚠️' }
    );
  };

  const confirmCancelBooking = async (bookingId) => {
    setCancellingBooking(bookingId);
    try {
      await tenantService.cancelBooking(bookingId, 'Tenant cancelled the booking');
      toast.success('Booking cancelled successfully');
      invalidateTenantStayCache();
      fetchData();
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancellingBooking(null);
      setCancelConfirm(null);
    }
  };

  const handleRequestAddon = async (payload) => {
    setRequestingAddon(payload.addon_id || 'custom');
    try {
      await tenantService.requestAddon(payload);
      // Refresh data
      invalidateTenantStayCache();
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
    try {
      await tenantService.cancelAddonRequest(addonId);
      toast.success('Add-on request cancelled');
      invalidateTenantStayCache();
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
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <X className="w-5 h-5 cursor-pointer" onClick={() => setError(null)} />
          <span className="font-bold text-xs uppercase tracking-wide">{error}</span>
        </div>
      )}
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-300 dark:border-gray-700 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => updateScreenState('bookings', { activeTab: tab.id })}
            className={`flex items-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all whitespace-nowrap border shadow-sm ${
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
              pendingCheckIns={pendingCheckIns}
              upcomingBooking={upcomingBooking}
              onRequestAddon={() => setShowAddonModal(true)}
              onCancelAddon={handleCancelAddonRequest}
              onCancelBooking={handleCancelBooking}
              isCancelling={cancellingBooking}
              onRequestExtension={() => setShowExtensionModal(true)}
              onRequestTransfer={() => setShowTransferWarning(true)}
              pendingTransferBookingIds={pendingTransferBookingIds}
              monthlyTransferCount={monthlyTransferCount}
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
              onLoadMore={loadMoreHistory}
              loadingMore={historyLoadingMore}
              onReview={handleReview}
              onReport={handleReport}
              onCancelBooking={handleCancelBooking}
              isCancelling={cancellingBooking}
            />
          )}
        </>
      )}

      {/* Extension Request Modal */}
      {showExtensionModal && activeStays[selectedStayIndex] && (
        <ExtensionModal
          booking={activeStays[selectedStayIndex].booking}
          room={activeStays[selectedStayIndex].room}
          onClose={() => setShowExtensionModal(false)}
          onSubmit={handleRequestExtension}
          loading={extendingStay}
        />
      )}

      {/* Transfer Limit Warning Modal */}
      {showTransferWarning && (
        <TransferLimitWarningModal
          onClose={() => setShowTransferWarning(false)}
          onContinue={() => {
            setShowTransferWarning(false);
            setShowTransferModal(true);
          }}
        />
      )}

      {/* Transfer Request Modal */}
      {showTransferModal && activeStays[selectedStayIndex] && (
        <TransferRequestModal
          booking={activeStays[selectedStayIndex].booking}
          property={activeStays[selectedStayIndex].property}
          onClose={() => setShowTransferModal(false)}
          onSubmit={handleRequestTransfer}
          loading={requestingTransfer}
        />
      )}

      {/* Addon Request Modal */}
      {showAddonModal && activeStays[selectedStayIndex] && (
        <AddonModal
          bookingId={activeStays[selectedStayIndex].booking.id}
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
const CurrentStayTab = ({ stays = [], selectedIndex = 0, onSelectStay, pendingBookings = [], pendingCheckIns = [], upcomingBooking = null, onRequestAddon, onCancelAddon, onCancelBooking, onRequestExtension, onRequestTransfer, pendingTransferBookingIds = [], monthlyTransferCount = 0, isCancelling, onReview, onReport, navigate }) => {
  const hasStays = stays && stays.length > 0;
  const hasPending = (pendingBookings && pendingBookings.length > 0) || (pendingCheckIns && pendingCheckIns.length > 0);
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
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Confirmed Upcoming Stay</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Your stay at <span className="font-bold text-gray-700 dark:text-gray-200">{upcomingBooking.property}</span> is confirmed.</p>
          
          <div className="inline-block bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-8 py-6 rounded-2xl border border-green-100 dark:border-green-800/50 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-green-600/70 uppercase tracking-wider">Starts In</p>
                <p className="text-2xl font-black">{upcomingBooking.daysUntil} {upcomingBooking.daysUntil === 1 ? 'Day' : 'Days'}</p>
                <p className="text-sm opacity-80 mt-2 font-medium">{formatDate(upcomingBooking.startDate)} • Room {upcomingBooking.room}</p>
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
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">No Active Stay</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">You don't have an active or pending booking at the moment. Ready to find your next home?</p>
        <button 
          onClick={() => navigate('/explore')}
          className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-95"
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
          <div className="relative flex bg-gray-100 dark:bg-gray-900/50 p-2 rounded-xl w-full max-w-sm border border-gray-300 dark:border-gray-700 shadow-inner">
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
      {viewMode === 'pending' && (hasPending || (pendingCheckIns && pendingCheckIns.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingCheckIns.map(pc => (
              <div key={pc.id} className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 px-4">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Check-in Overdue</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Action required: finalize your move-in with the landlord.</p>
                
                <div className="bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-400 p-6 rounded-2xl border border-red-100 dark:border-red-900/20 shadow-sm mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                      <Home className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-base leading-tight">{pc.property}</p>
                      <p className="text-xs opacity-80 font-medium mt-0.5">
                        Scheduled start: {formatDate(pc.startDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
          ))}
          {pendingBookings.map(pb => {
            const startDate = pb?.start_date ? new Date(pb.start_date) : null;
            const daysUntil = startDate ? Math.max(0, Math.ceil((startDate - new Date()) / (1000 * 60 * 60 * 24))) : null;
            
            return (
              <div key={pb.id} className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 px-4">
                <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Booking Pending</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">The landlord is reviewing your request.</p>
                
                                                    <div className="bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-400 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/20 shadow-sm mb-6">
                                                      <div className="flex items-center gap-4">
                                                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
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
                                                          <p className="text-xl font-bold">₱{(pb?.unit_price || pb?.monthly_rent || 0).toLocaleString()}</p>
                                                        </div>
                                                        <button 
                                                          onClick={() => onCancelBooking(pb.id)}
                                                          disabled={isCancelling === pb.id}
                                                          className="bg-white dark:bg-gray-800 text-red-600 px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm border border-red-100 dark:border-red-900/30 hover:bg-red-50 transition-all flex items-center gap-2.5"
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
            const addonMonthlyTotal = Number(addons?.monthlyTotal ?? addons?.monthly_total ?? 0);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Column */}
                            <div className="lg:col-span-2 space-y-6">
                              {booking.paymentStatus === 'refunded' && (
                                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-xl flex items-start gap-4 animate-pulse">
                                  <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-bold text-purple-900 dark:text-purple-200">Payment Action Required</p>
                                    <p className="text-xs text-purple-700 dark:text-purple-400 mt-2">
                                      Your last payment was refunded. Please complete a new payment or contact your Property Manager to maintain your active status.
                                    </p>
                                  </div>
                                </div>
                              )}
                
                              {/* Room Details Card */}                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
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
                          <p className="text-white/90 text-sm flex items-center mt-2 font-medium">
                            <MapPin className="w-4 h-4 mr-2.5" />
                            {property.address}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => navigate('/maintenance', { state: { propertyId: property.id } })}
                            className="bg-orange-400 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-orange-500/20"
                          >
                            <Wrench className="w-4 h-4" />
                            Maintenance
                          </button>
                          {(!booking.hasReview && !booking.has_review) && (
                            <button 
                              onClick={() => onReview({ ...booking, property })}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-green-500/20"
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
                        {(() => {
                          const start = new Date(booking.startDate);
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          const isFuture = start > now;
                          const daysUntil = Math.ceil((start - now) / (1000 * 60 * 60 * 24));

                          return (
                            <StatCard
                              label={isFuture ? "Starts In" : "Days Left"}
                              value={
                                isFuture 
                                  ? `${daysUntil} ${daysUntil === 1 ? 'Day' : 'Days'}`
                                  : (booking?.daysRemaining == null
                                      ? '-'
                                      : Math.max(0, Math.ceil(Number(booking.daysRemaining))))
                              }
                              icon={CalendarDays}
                            />
                          );
                        })()}
                        <StatCard 
                          label="Status" 
                          value={booking.is_overdue || booking.isOverdue ? 'Overdue' : booking.paymentStatus} 
                          icon={CreditCard} 
                        />
                      </div>
                      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span className="font-bold dark:text-gray-300">Lease:</span> 
                            {formatDate(booking.startDate)} to {formatDate(booking.endDate)}
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-2 rounded text-[10px] font-bold uppercase ml-2">{booking.totalMonths} Months</span>
                          </p>
                          
                          {/* Show Extend button if expiring soon (e.g. within 30 days) or already expired but still active */}
                          {(() => {
                            const end = new Date(booking.endDate);
                            const today = new Date();
                            const diff = end - today;
                            const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            
                            if (daysLeft <= 30) {
                              return (
                                <button
                                  onClick={onRequestExtension}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
                                >
                                  <CalendarDays className="w-4 h-4" />
                                  Extend Stay
                                </button>
                              );
                            }
                            return null;
                          })()}
                          {(() => {
                            const isPendingForThisBooking = pendingTransferBookingIds.includes(booking.id);
                            const limitReached = monthlyTransferCount >= 2;
                            const isDisabled = isPendingForThisBooking || limitReached;
                            
                            let buttonText = 'Transfer';
                            let buttonTitle = 'Request a room transfer';
                            
                            if (isPendingForThisBooking) {
                              buttonText = 'Transfer Pending';
                              buttonTitle = 'You already have a pending transfer request for this booking';
                            } else if (limitReached) {
                              buttonText = 'Limit Reached';
                              buttonTitle = 'Monthly transfer limit reached (2 per month)';
                            }

                            return (
                              <button
                                onClick={isDisabled ? undefined : onRequestTransfer}
                                disabled={isDisabled}
                                title={buttonTitle}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                  isDisabled
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
                                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20 active:scale-95'
                                }`}
                              >
                                <Shuffle className="w-4 h-4" />
                                {buttonText}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add-ons Section */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add-ons & Extras</h3>
                      <button
                        onClick={onRequestAddon}
                        disabled={booking.can_request_addon === false}
                        title={booking.can_request_addon === false ? "Disabled until payment is re-settled" : ""}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all active:scale-95 ${
                          booking.can_request_addon === false
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-600'
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-500/20'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        Request
                      </button>
                    </div>

                    {/* Active Add-ons */}
                    {Array.isArray(addons.active) && addons.active.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-4">Current Subscriptions</h4>
                        <div className="space-y-4">
                          {addons.active.map((addon) => (
                            <AddonItem key={addon.pivot?.id || addon.id} addon={addon} status="active" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pending Requests */}
                    {Array.isArray(addons.pending) && addons.pending.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-4">Awaiting Approval</h4>
                        <div className="space-y-4">
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
                        <p className="text-gray-500 dark:text-gray-500 text-sm font-medium">No add-ons yet.</p>
                      </div>
                    )}

                    {addonMonthlyTotal > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                          {booking.billing_policy === 'daily' ? 'Daily Add-on Fees' : 'Monthly Add-on Fees'}
                        </span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">+₱{addonMonthlyTotal.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Landlord Contact Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Property Manager</h3>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-700 dark:text-green-400 font-bold">
                          {landlord?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white leading-tight">{landlord?.name || 'Owner'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Verified Host</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                      {landlord?.email && (
                        <a href={`mailto:${landlord.email}`} className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                          <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <Mail className="w-4 h-4" />
                          </div>
                          {landlord.email}
                        </a>
                      )}
                      {landlord?.phone && (
                        <a href={`tel:${landlord.phone}`} className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                          <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <Phone className="w-4 h-4" />
                          </div>
                          {landlord.phone}
                        </a>
                      )}
                      <button 
                        onClick={() => navigate('/messages', { 
                          state: { 
                            startConversation: true, 
                            recipient: { id: landlord?.id, name: landlord?.name }, 
                            property: { id: property?.id, title: property?.title } 
                          } 
                        })}
                        className="flex items-center gap-4 w-full text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors text-left"
                      >
                        <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        Send Message
                      </button>
                    </div>
                  </div>

                  {/* Quick Summary */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Summary</h3>
                    <div className="space-y-4">
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
                        <span className="font-bold text-gray-900 dark:text-white">₱{addonMonthlyTotal.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex justify-between items-center">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {booking.billing_policy === 'daily' ? 'Daily Total' : 'Monthly Total'}
                        </span>
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                          ₱{((booking.unit_price || booking.monthlyRent || 0) + addonMonthlyTotal).toLocaleString()}
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
            {stay.property.title} ({stay.room.roomNumber}) {stay.booking.paymentStatus === 'refunded' ? '— (Payment Required)' : ''}
          </option>
        ))}
      </select>
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-500">
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
          <h3 className="text-xl font-semibold">Billing & Payments</h3>
          <p className="text-green-100 text-sm mt-2">Manage your invoices, view full history and make payments.</p>
        </div>
        <button 
          onClick={() => navigate('/payments')}
          className="bg-white text-green-700 px-6 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-green-50 transition-all shadow-md active:scale-95 whitespace-nowrap"
        >
          View Full History
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-300 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {financials?.billing_policy === 'daily' ? 'Daily Rent' : 'Monthly Rent'}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ₱{(financials?.unit_price || financials?.monthlyRent || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-300 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {financials?.billing_policy === 'daily' ? 'Daily Add-ons' : 'Monthly Add-ons'}
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">+₱{(financials?.monthlyAddons || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-300 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {financials?.billing_policy === 'daily' ? 'Total Due/day' : 'Total Due/mo'}
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">₱{(financials?.monthlyTotal || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
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
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-300 dark:border-gray-700">
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-gray-600 dark:text-gray-400">{tx.date}</td>
                    <td className="py-4 px-6 text-sm font-bold text-gray-900 dark:text-white">₱{(tx.amount || 0).toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-2 rounded-md text-[10px] font-bold uppercase ${
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
          <p className="text-gray-500 dark:text-gray-500 text-center py-12 italic text-sm font-medium">No recent transactions.</p>
        )}
      </div>
    </div>
  );
};

// ==================== History Tab ====================
const HistoryTab = ({ data, onLoadMore, loadingMore = false, onReview, onReport, onCancelBooking, isCancelling }) => {
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
                  <p className="text-xs text-gray-500 dark:text-gray-500">{booking.period?.startDate} - {booking.period?.endDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Paid</p>
                  <p className="font-bold text-green-600 dark:text-green-400 text-lg">₱{(booking.financials?.totalPaid || 0).toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={booking.has_overdue_invoices || (booking.invoices && booking.invoices.some(inv => inv.status === 'overdue')) ? 'overdue' : (booking.is_overdue || booking.isOverdue ? 'overdue' : booking.status)} />
                  <div className="flex items-center gap-4">
                    {['completed', 'confirmed'].includes(booking.status) && !booking.review && (
                      <button 
                        onClick={() => onReview(booking)}
                        className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 underline underline-offset-2"
                      >
                        <Star className="w-3 h-3 fill-current" />
                        Review
                      </button>
                    )}
                    {booking.status === 'pending' && (
                      <button 
                        onClick={() => onCancelBooking(booking.id)}
                        disabled={isCancelling === booking.id}
                        className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline underline-offset-2 disabled:opacity-50"
                      >
                        {isCancelling === booking.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        Cancel
                      </button>
                    )}
                    {booking.review && (
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-500 italic flex items-center gap-2">
                        <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                        {booking.review.rating}/5 Reviewed
                      </span>
                    )}
                    {booking.status !== 'pending' && (
                      <button 
                        onClick={() => onReport(booking.property)}
                        className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline underline-offset-2"
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
              <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-4">Activity Timeline</h5>
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
                      
                      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{activity.action}</p>
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-500 uppercase">
                          {formatDateTime(activity.timestamp)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activity.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 italic">No activity details available.</p>
                )}
              </div>
            </div>

            {Array.isArray(booking.addons) && booking.addons.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Add-ons utilized:</p>
                <div className="flex flex-wrap gap-2">
                  {booking.addons.map((addon, idx) => (
                    <span key={idx} className="text-[10px] font-bold bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 px-2 py-2 rounded border border-gray-200 dark:border-gray-600 uppercase">
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
          disabled={loadingMore}
          className="w-full py-4 text-green-600 dark:text-green-400 font-bold hover:bg-green-50 dark:hover:bg-green-900/30 rounded-xl transition-all border border-green-100 dark:border-green-900/30 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loadingMore ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
          {loadingMore ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
};

// ==================== Helper Components ====================
const StatCard = ({ label, value, icon: Icon }) => (
  <div className="text-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm transition-all">
    <div className="flex justify-center mb-4">
      <Icon className="w-6 h-6 text-green-600 dark:text-green-400" />
    </div>
    <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-500 uppercase mt-2.5 tracking-wider">{label}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const s = (status || "").toLowerCase();
  const styles = {
    paid: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    unpaid: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 animate-pulse',
    partial: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    refunded: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
  };

  const label = s === 'overdue' ? 'Payment Overdue' : status;

  return (
    <span className={`px-2 py-2 rounded-full text-xs font-medium capitalize ${styles[s] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
      {label}
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
        <p className="text-base font-bold text-gray-900 dark:text-white leading-tight">{addon?.name || 'Add-on'}</p>
        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-2">
          {addon?.price_type_label || (addon?.price_type === 'monthly' ? 'Monthly' : 'One-time')} <span className="mx-2 opacity-30">•</span> {addon?.addon_type === 'rental' ? 'Rental' : 'Usage Fee'}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <span className="text-base font-bold text-gray-900 dark:text-white">
        ₱{parseFloat(addon?.price || 0).toLocaleString()}
        {addon?.price_type === 'monthly' && <span className="text-[10px] text-gray-500 font-medium ml-0.5">/mo</span>}
      </span>
      {status === 'pending' && onCancel && (
        <button
          onClick={onCancel}
          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="Cancel Request"
        >
          <XCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  </div>
);

const AddonModal = ({ bookingId, availableAddons, onClose, onRequest, requestingId }) => {
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
      booking_id: bookingId,
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
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2">
                {showCustomForm ? 'Describe what you need and the owner will review it' : 'Select an extra service to add to your stay'}
              </p>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-500" />
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
                    <div key={addon.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-green-300 dark:hover:border-green-600 hover:shadow-md transition-all group">
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
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{addon.description}</p>
                          )}
                          <div className="flex items-baseline gap-2">
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">
                              ₱{parseFloat(addon.price || 0).toLocaleString()}
                            </p>
                            {addon.price_type === 'monthly' && <span className="text-xs font-bold text-gray-500">/mo</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => onRequest({ booking_id: bookingId, addon_id: addon.id, quantity: 1 })}
                          disabled={!addon.has_stock || requestingId === addon.id}
                          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                            addon.has_stock && requestingId !== addon.id
                              ? 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
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
            <form onSubmit={handleCustomSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Item Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Extra table, Desk lamp..."
                  value={customData.name}
                  onChange={e => setCustomData({...customData, name: e.target.value})}
                  className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Type *</label>
                  <select 
                    value={customData.addon_type}
                    onChange={e => setCustomData({...customData, addon_type: e.target.value})}
                    className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none"
                  >
                    <option value="rental">Rental (Item)</option>
                    <option value="fee">Usage Fee</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Billing *</label>
                  <select 
                    value={customData.price_type}
                    onChange={e => setCustomData({...customData, price_type: e.target.value})}
                    className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="one_time">One-time</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Notes / Details</label>
                <textarea 
                  placeholder="Tell the owner more about your request..."
                  value={customData.note}
                  onChange={e => setCustomData({...customData, note: e.target.value})}
                  className="w-full px-4 py-4 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none h-24 resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="flex-1 py-4 border border-gray-300 dark:border-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button 
                  type="submit"
                  disabled={requestingId === 'custom'}
                  className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {requestingId === 'custom' ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Request'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-center">
          <p className="text-[10px] text-gray-500 dark:text-gray-500 font-bold uppercase tracking-wider leading-relaxed">
            Requests are subject to owner approval. <br/>Approved items will be added to your next billing cycle.
          </p>
        </div>
      </div>
    </div>
  );
};

const ExtensionModal = ({ booking, room, onClose, onSubmit, loading }) => {
  const [type, setType] = useState('monthly');
  const [customDate, setCustomDate] = useState('');
  const [notes, setNotes] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState(0);

  const currentEndDate = new Date(booking.endDate);
  
  // Calculate default dates
  const nextMonthDate = new Date(currentEndDate);
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextMonthStr = nextMonthDate.toISOString().split('T')[0];

  useEffect(() => {
    if (type === 'monthly') {
      setEstimatedPrice(parseFloat(booking.unit_price || booking.monthlyRent || 0));
    } else if (customDate) {
      const start = new Date(booking.endDate);
      const end = new Date(customDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const dailyRate = room.daily_rate || (parseFloat(booking.unit_price || booking.monthlyRent || 0) / 30);
      setEstimatedPrice(diffDays * dailyRate);
    } else {
      setEstimatedPrice(0);
    }
  }, [type, customDate, booking, room]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalEndDate = type === 'monthly' ? nextMonthStr : customDate;
    
    if (!finalEndDate) {
      toast.error('Please select an end date');
      return;
    }

    onSubmit({
      booking_id: booking.id,
      extension_type: type,
      requested_end_date: finalEndDate,
      notes: notes
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full border border-gray-100 dark:border-gray-700 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Extend Stay</h3>
            <button onClick={onClose} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-2">Current Lease Ends</p>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-200">{new Date(booking.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <div className="flex bg-gray-100 dark:bg-gray-900/50 p-2 rounded-xl border border-gray-300 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setType('monthly')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'monthly' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-500'}`}
            >
              Add 1 Month
            </button>
            <button
              type="button"
              onClick={() => setType('daily')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'daily' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-500'}`}
            >
              Custom Days
            </button>
          </div>

          {type === 'daily' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 text-center">Select New End Date</label>
              <input
                type="date"
                required
                min={new Date(new Date(booking.endDate).getTime() + 86400000).toISOString().split('T')[0]}
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Reason / Notes</label>
            <textarea
              placeholder="Why are you extending? (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none h-20 resize-none text-sm"
            />
          </div>

          <div className="pt-2">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-gray-500 uppercase">Estimated Fee</span>
              <span className="text-xl font-black text-green-600 dark:text-green-400">₱{estimatedPrice.toLocaleString()}</span>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TransferRequestModal = ({ booking, property, onClose, onSubmit, loading }) => {
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsMessage, setRoomsMessage] = useState('');
  const [leaseDurationPreference, setLeaseDurationPreference] = useState('keep_current');
  const [newEndDate, setNewEndDate] = useState('');
  const [formData, setFormData] = useState({
    requested_room_id: '',
    reason: '',
    booking_id: booking?.id || '',
    property_id: property?.id || '',
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      booking_id: booking?.id || '',
      property_id: property?.id || '',
    }));
  }, [booking?.id, property?.id]);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoadingRooms(true);
      setRoomsMessage('');
      try {
        const res = await api.get('/tenant/transfers/options', {
          params: {
            property_id: property.id,
            booking_id: booking.id,
          }
        });
        const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setAvailableRooms(list.filter(r => r.id !== booking.room_id));
        if (list.length === 0 && res.data?.message) {
          setRoomsMessage(res.data.message);
        }
      } catch (err) {
        console.error('Failed to load rooms for transfer', err);
        setAvailableRooms([]);
        setRoomsMessage(err.response?.data?.message || 'Unable to load transfer room options right now.');
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
  }, [property.id, booking.id, booking.room_id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.requested_room_id || !formData.reason || !formData.booking_id || !formData.property_id) {
      toast.error('Please select a room and provide a reason');
      return;
    }
    if (leaseDurationPreference === 'new_lease' && !newEndDate) {
      toast.error('Please select a new lease end date');
      return;
    }
    
    onSubmit({
      ...formData,
      new_end_date: leaseDurationPreference === 'new_lease' ? newEndDate : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full border border-gray-100 dark:border-gray-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Request Room Transfer</h3>
            <button onClick={onClose} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          <form id="transfer-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
              Requesting a transfer from your current room in <strong>{property.title}</strong>.
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Select New Room *</label>
              <select
                required
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white"
                value={formData.requested_room_id}
                onChange={e => setFormData({ ...formData, requested_room_id: e.target.value })}
                disabled={loadingRooms}
              >
                <option value="">{loadingRooms ? 'Loading available rooms...' : 'Select a Room'}</option>
                {availableRooms.map(r => (
                  <option key={r.id} value={r.id}>Room {r.room_number} ({r.type_label})</option>
                ))}
              </select>
              {availableRooms.length === 0 && !loadingRooms && (
                <p className="text-[10px] text-red-500 mt-2 font-bold italic">{roomsMessage || 'No eligible transfer rooms are available in this property right now.'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Lease Duration *</label>
              <div className="flex bg-gray-100 dark:bg-gray-900/50 p-2 rounded-xl border border-gray-300 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setLeaseDurationPreference('keep_current')}
                  className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${leaseDurationPreference === 'keep_current' ? 'bg-white dark:bg-gray-700 text-amber-600 shadow-sm border border-gray-200 dark:border-gray-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                >
                  Keep Current End Date
                </button>
                <button
                  type="button"
                  onClick={() => setLeaseDurationPreference('new_lease')}
                  className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${leaseDurationPreference === 'new_lease' ? 'bg-white dark:bg-gray-700 text-amber-600 shadow-sm border border-gray-200 dark:border-gray-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                >
                  Start New Lease
                </button>
              </div>
              
              {leaseDurationPreference === 'new_lease' && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Select New End Date *</label>
                  <input
                    type="date"
                    required
                    min={new Date(new Date().getTime() + 86400000).toISOString().split('T')[0]} // tomorrow
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-[10px] text-gray-500 mt-2 font-medium">Pick a specific check-out date for your new room.</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Reason for Transfer *</label>
              <textarea
                required
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-amber-500 outline-none dark:bg-gray-700 dark:text-white h-24 resize-none text-sm"
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g., I need a room with a better view, or my roommate is too loud..."
              />
            </div>
          </form>
        </div>
        
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 shrink-0">
          <button
            type="submit"
            form="transfer-form"
            disabled={loading || availableRooms.length === 0}
            className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-lg shadow-amber-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TransferLimitWarningModal = ({ onClose, onContinue }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full border border-gray-100 dark:border-gray-700 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Room Transfer Policy</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Please read before requesting a transfer</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3">
              📌 Note: Transfer Limit Policy
            </p>
            <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">•</span>
                <span>Room transfers are <strong>limited to 2 transfers per tenant per month</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">•</span>
                <span>Transferring requires significant effort in checking and preparation</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">•</span>
                <span>Requests will <strong>only be approved by the Landlord when:</strong></span>
              </li>
              <li className="pl-6 flex gap-2">
                <span className="text-amber-700 dark:text-amber-300">✓</span>
                <span>All of your payment records are cleared</span>
              </li>
              <li className="pl-6 flex gap-2">
                <span className="text-amber-700 dark:text-amber-300">✓</span>
                <span>Everything is ready for the move</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center italic">
            Once you proceed, the Landlord will review your request and contact you.
          </p>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-md transition-colors active:scale-[0.98]"
          >
            I Understand, Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyBookings;