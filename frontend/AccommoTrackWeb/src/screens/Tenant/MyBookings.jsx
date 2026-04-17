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
  Users,
  Shuffle,
  HelpCircle,
  MessageSquare,
  MoreHorizontal
} from 'lucide-react';
import ReportModal from '../../components/Modals/ReportModal';
import MaintenanceRequestModal from '../../components/Modals/MaintenanceRequestModal';
import ReservationPolicyNotice from './components/ReservationPolicyNotice';

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
  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [requestingAddon, setRequestingAddon] = useState(null);
  const [extendingStay, setExtendingStay] = useState(false);
  const [requestingTransfer, setRequestingTransfer] = useState(false);
  const [requestingMoveOut, setRequestingMoveOut] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [pendingTransferBookingIds, setPendingTransferBookingIds] = useState([]);
  const [pendingTransferRequests, setPendingTransferRequests] = useState([]);
  const [cancellingTransferRequestId, setCancellingTransferRequestId] = useState(null);
  const [monthlyTransferCount, setMonthlyTransferCount] = useState(0);
  // cancelConfirm stores the bookingId pending user confirmation (null = none)
  const [cancelConfirmModal, setCancelConfirmModal] = useState(null);

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

  const handleRequestMoveOut = async (payload) => {
    setRequestingMoveOut(true);
    try {
      await tenantService.requestMoveOut(payload.booking_id, payload.move_out_date, payload.reason || '');
      toast.success('Move-out request submitted');
      invalidateTenantStayCache();
      fetchData();
      setShowMoveOutModal(false);
    } catch (err) {
      console.error('Failed to request move-out:', err);
      toast.error(err.response?.data?.message || 'Failed to request move-out');
    } finally {
      setRequestingMoveOut(false);
    }
  };

  const handleCancelTransferRequest = async (transferRequestId) => {
    if (!transferRequestId) return;

    setCancellingTransferRequestId(transferRequestId);
    try {
      await api.patch(`/tenant/transfers/${transferRequestId}/cancel`);
      toast.success('Transfer request cancelled successfully');
      invalidateTenantStayCache();
      fetchData();
    } catch (err) {
      console.error('Failed to cancel transfer request:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel transfer request');
    } finally {
      setCancellingTransferRequestId(null);
    }
  };

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPropertyForReport, setSelectedPropertyForReport] = useState(null);

  // Maintenance Modal State
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceBookingId, setMaintenanceBookingId] = useState('');

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
          const pendingStatuses = new Set(['pending', 'pending_reservation', 'reserved', 'booked']);
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

          const pendingRequests = list.filter(
            (t) => String(t.status || '').toLowerCase() === 'pending',
          );
          setPendingTransferRequests(pendingRequests);

          // Calculate transfers this month (limit of 2)
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const thisMonthCount = list.filter(t => {
            const dateStr = t.created_at || t.date;
            if (!dateStr) return false;
            const createdAt = new Date(dateStr);
            const status = String(t.status || '').toLowerCase();
            return createdAt >= startOfMonth && ['pending', 'approved'].includes(status);
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
    if (!Array.isArray(activeStays) || activeStays.length === 0) {
      if (selectedStayIndex !== 0) {
        setSelectedStayIndex(0);
      }
      return;
    }

    if (selectedStayIndex < 0) {
      setSelectedStayIndex(0);
      return;
    }

    const lastIndex = activeStays.length - 1;
    if (selectedStayIndex > lastIndex) {
      setSelectedStayIndex(lastIndex);
    }
  }, [activeStays, selectedStayIndex]);

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
    // Show centered modal instead of toast
    setCancelConfirmModal(bookingId);
  };

  const confirmCancelBooking = async (bookingId) => {
    setCancellingBooking(bookingId);
    setCancelConfirmModal(null);
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
      const response = await tenantService.cancelAddonRequest(addonId);
      const message = response?.message || response?.data?.message || 'Add-on request updated';
      toast.success(message);
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
            className={`flex items-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all whitespace-nowrap border shadow-sm ${activeTab === tab.id
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
              onRequestMoveOut={() => setShowMoveOutModal(true)}
              pendingTransferBookingIds={pendingTransferBookingIds}
              pendingTransferRequests={pendingTransferRequests}
              onCancelTransferRequest={handleCancelTransferRequest}
              cancellingTransferRequestId={cancellingTransferRequestId}
              monthlyTransferCount={monthlyTransferCount}
              onReview={handleReview}
              onReport={handleReport}
              onRequestMaintenance={(id) => {
                setMaintenanceBookingId(id);
                setShowMaintenanceModal(true);
              }}
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

      {showMoveOutModal && activeStays[selectedStayIndex] && (
        <MoveOutModal
          booking={activeStays[selectedStayIndex].booking}
          onClose={() => setShowMoveOutModal(false)}
          onSubmit={handleRequestMoveOut}
          loading={requestingMoveOut}
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

      {/* Maintenance Modal */}
      <MaintenanceRequestModal
        isOpen={showMaintenanceModal}
        onClose={() => {
          setShowMaintenanceModal(false);
          setMaintenanceBookingId('');
        }}
        onSuccess={() => {
          fetchData();
        }}
        stays={activeStays}
        preselectedBookingId={maintenanceBookingId}
      />

      {/* Cancel Booking Confirmation Modal */}
      {cancelConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cancel Booking?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Are you sure you want to cancel this booking? Once cancelled, you'll need to create a new booking request if you change your mind.
              </p>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex gap-3">
              <button
                onClick={() => setCancelConfirmModal(null)}
                disabled={cancellingBooking === cancelConfirmModal}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all active:scale-95 disabled:opacity-50"
              >
                Keep Booking
              </button>
              <button
                onClick={() => confirmCancelBooking(cancelConfirmModal)}
                disabled={cancellingBooking === cancelConfirmModal}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancellingBooking === cancelConfirmModal ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Yes, Cancel Booking
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Current Stay Tab ====================
const CurrentStayTab = ({ stays = [], selectedIndex = 0, onSelectStay, pendingBookings = [], pendingCheckIns = [], upcomingBooking = null, onRequestAddon, onCancelAddon, onCancelBooking, onRequestExtension, onRequestTransfer, onRequestMoveOut, pendingTransferBookingIds = [], pendingTransferRequests = [], onCancelTransferRequest, cancellingTransferRequestId = null, monthlyTransferCount = 0, isCancelling, onReview, onReport, onRequestMaintenance, navigate }) => {
  const ALMOST_PAY_TIME_DAYS = 5;
  const OPEN_INVOICE_STATUSES = new Set(['pending', 'partial', 'overdue', 'unpaid']);
  const SETTLED_INVOICE_STATUSES = new Set(['paid', 'settled', 'succeeded', 'verified', 'completed']);
  const hasStays = stays && stays.length > 0;
  const hasPending = (pendingBookings && pendingBookings.length > 0) || (pendingCheckIns && pendingCheckIns.length > 0);
  const totalPendingCount = (pendingBookings?.length || 0) + (pendingCheckIns?.length || 0);
  const [viewMode, setViewMode] = useState(hasStays ? 'active' : 'pending');
  const [overdueTab, setOverdueTab] = useState('active');

  const hasOverdueStays = (stays || []).some((stay) =>
    Boolean(stay?.booking?.is_overdue || stay?.booking?.isOverdue),
  );
  const hasOverduePendingBookings = (pendingBookings || []).some((bookingEntry) =>
    Boolean(bookingEntry?.is_overdue || bookingEntry?.isOverdue),
  );
  const hasOverduePendingCheckIns = (pendingCheckIns || []).length > 0;
  const hasAnyOverdue = hasOverdueStays || hasOverduePendingBookings || hasOverduePendingCheckIns;

  const filteredStays = React.useMemo(() => {
    const source = Array.isArray(stays) ? stays : [];
    if (!hasAnyOverdue) return source;

    if (overdueTab === 'active') {
      return source.filter((stay) => !(stay?.booking?.is_overdue || stay?.booking?.isOverdue));
    }

    if (overdueTab === 'pending') {
      return [];
    }

    return source.filter((stay) => stay?.booking?.is_overdue || stay?.booking?.isOverdue);
  }, [stays, hasAnyOverdue, overdueTab]);

  const filteredPendingBookings = React.useMemo(() => {
    const source = Array.isArray(pendingBookings) ? pendingBookings : [];
    if (!hasAnyOverdue) return source;

    if (overdueTab === 'active') {
      return source.filter((bookingEntry) => !(bookingEntry?.is_overdue || bookingEntry?.isOverdue));
    }

    if (overdueTab === 'pending') {
      return source.filter((bookingEntry) => !(bookingEntry?.is_overdue || bookingEntry?.isOverdue));
    }

    return source.filter((bookingEntry) => bookingEntry?.is_overdue || bookingEntry?.isOverdue);
  }, [pendingBookings, hasAnyOverdue, overdueTab]);

  const filteredPendingCheckIns = React.useMemo(() => {
    const source = Array.isArray(pendingCheckIns) ? pendingCheckIns : [];
    if (!hasAnyOverdue) return source;

    if (overdueTab === 'pending') {
      return [];
    }

    return source;
  }, [pendingCheckIns, hasAnyOverdue, overdueTab]);

  useEffect(() => {
    if (hasStays && !hasPending && viewMode !== 'active') {
      setViewMode('active');
      return;
    }

    if (!hasStays && hasPending && viewMode !== 'pending') {
      setViewMode('pending');
    }
  }, [hasStays, hasPending, viewMode]);

  const showActiveView = hasStays && (viewMode === 'active' || !hasPending);
  const showPendingView = hasPending && (viewMode === 'pending' || !hasStays);
  const displayedStays = showActiveView ? filteredStays : [];
  const displayedPendingBookings = showPendingView ? filteredPendingBookings : [];
  const displayedPendingCheckIns = showPendingView ? filteredPendingCheckIns : [];

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

  const parseDateToLocalDay = (value) => {
    if (!value) return null;

    const raw = String(value).trim();
    const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;

    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  };

  const formatMonthDay = (dateValue) => {
    if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return '';
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  };

  const getCycleDueDate = (anchorDate, referenceDate = new Date()) => {
    if (!(anchorDate instanceof Date) || Number.isNaN(anchorDate.getTime())) return null;

    const safeReference = new Date(referenceDate);
    safeReference.setHours(0, 0, 0, 0);

    const anchorDay = anchorDate.getDate();
    const currentMonthMaxDay = new Date(safeReference.getFullYear(), safeReference.getMonth() + 1, 0).getDate();
    let candidate = new Date(
      safeReference.getFullYear(),
      safeReference.getMonth(),
      Math.min(anchorDay, currentMonthMaxDay),
    );

    if (candidate < safeReference) {
      const nextMonthMaxDay = new Date(safeReference.getFullYear(), safeReference.getMonth() + 2, 0).getDate();
      candidate = new Date(
        safeReference.getFullYear(),
        safeReference.getMonth() + 1,
        Math.min(anchorDay, nextMonthMaxDay),
      );
    }

    return candidate;
  };

  const resolveMonthlyPaymentCountdown = (bookingEntry, invoices = []) => {
    const billingPolicy = String(bookingEntry?.billing_policy || bookingEntry?.billingPolicy || 'monthly').toLowerCase();
    if (billingPolicy !== 'monthly') return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const moveInDate = parseDateToLocalDay(bookingEntry?.start_date || bookingEntry?.startDate);
    const rawBillingDay = Number(bookingEntry?.billing_day ?? bookingEntry?.due_day ?? bookingEntry?.dueDay);
    const fallbackAnchorDate = Number.isFinite(rawBillingDay)
      ? new Date(today.getFullYear(), today.getMonth(), Math.max(1, Math.min(31, Math.round(rawBillingDay))))
      : null;
    const anchorDate = moveInDate || fallbackAnchorDate;

    const openDueDateCandidates = [];
    const settledDueDateKeys = new Set();
    const openDueDateKeys = new Set();

    if (Array.isArray(invoices)) {
      invoices.forEach((invoice) => {
        const dueDate = parseDateToLocalDay(
          invoice?.due_date || invoice?.dueDateIso || invoice?.dueDate,
        );
        if (!dueDate) return;

        const invoiceStatus = String(invoice?.status || '').toLowerCase();
        const dueDateKey = dueDate.toISOString().slice(0, 10);

        if (OPEN_INVOICE_STATUSES.has(invoiceStatus)) {
          openDueDateCandidates.push(dueDate);
          openDueDateKeys.add(dueDateKey);
          return;
        }

        if (SETTLED_INVOICE_STATUSES.has(invoiceStatus)) {
          settledDueDateKeys.add(dueDateKey);
        }
      });
    }

    openDueDateCandidates.sort((left, right) => left.getTime() - right.getTime());

    let nextDueDate = openDueDateCandidates[0] || getCycleDueDate(anchorDate, today);
    if (!nextDueDate) {
      const nextBillingDate = parseDateToLocalDay(bookingEntry?.next_billing_date || bookingEntry?.nextBillingDate);
      nextDueDate = nextBillingDate || null;
    }

    if (!nextDueDate) return null;

    for (let step = 0; step < 24; step += 1) {
      const dueDateKey = nextDueDate.toISOString().slice(0, 10);
      if (openDueDateKeys.has(dueDateKey) || !settledDueDateKeys.has(dueDateKey)) {
        break;
      }

      const advancedDate = new Date(nextDueDate);
      advancedDate.setDate(1);
      advancedDate.setMonth(advancedDate.getMonth() + 1);
      const maxDay = new Date(advancedDate.getFullYear(), advancedDate.getMonth() + 1, 0).getDate();
      advancedDate.setDate(Math.min(nextDueDate.getDate(), maxDay));
      nextDueDate = advancedDate;
    }

    const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const compactDueDate = formatMonthDay(nextDueDate);

    if (daysUntilDue < 0) {
      const overdueDays = Math.abs(daysUntilDue);
      return {
        label: 'Payment Overdue',
        value: compactDueDate || 'Past Due',
        tinyValue: `${overdueDays}d overdue`,
        tone: 'status',
        statusKey: 'overdue',
      };
    }

    if (daysUntilDue === 0) {
      return {
        label: 'Next Payment',
        value: compactDueDate || 'Due Today',
        tinyValue: '0d',
        tone: 'status',
        statusKey: 'pending',
      };
    }

    return {
      label: daysUntilDue <= ALMOST_PAY_TIME_DAYS ? 'Almost Pay Time' : 'Next Payment',
      value: compactDueDate || `${daysUntilDue} ${daysUntilDue === 1 ? 'Day' : 'Days'} Left`,
      tinyValue: `${daysUntilDue}d`,
      tone: daysUntilDue <= ALMOST_PAY_TIME_DAYS ? 'status' : 'neutral',
      statusKey: 'pending',
    };
  };

  const toWholeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
  };

  const resolveOccupantProfiles = (bookingEntry) => {
    const source = Array.isArray(bookingEntry?.occupants) ? bookingEntry.occupants : [];

    return source.map((occupant, index) => {
      const fullName = [occupant?.first_name, occupant?.middle_name, occupant?.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() || `Occupant ${index + 1}`;
      const relationship = String(occupant?.relationship_to_booker || occupant?.relationshipToBooker || '').trim();
      const sex = String(occupant?.sex || '').trim();
      const contact = [occupant?.phone, occupant?.email].filter(Boolean).join(' • ');

      return {
        id: occupant?.id || `${fullName}-${index}`,
        fullName,
        relationship,
        sex,
        contact,
      };
    });
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
              className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg shadow-md transition-all duration-300 ease-out ${viewMode === 'active' ? 'bg-green-600 shadow-green-500/20' : 'bg-amber-600 shadow-amber-500/20'
                }`}
              style={{ transform: viewMode === 'active' ? 'translateX(0)' : 'translateX(calc(100% + 4px))' }}
            />

            <button
              onClick={() => setViewMode('active')}
              className={`relative z-10 flex-1 py-2 text-sm font-bold rounded-lg transition-colors duration-300 ${viewMode === 'active'
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              Active Stays ({stays.length})
            </button>
            <button
              onClick={() => setViewMode('pending')}
              className={`relative z-10 flex-1 py-2 text-sm font-bold rounded-lg transition-colors duration-300 ${viewMode === 'pending'
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              Pending ({totalPendingCount})
            </button>
          </div>
        ) : <div />}

        {/* Adaptive Stay Selector */}
        {showActiveView && (
          <StaySelector
            stays={stays}
            selectedIndex={selectedIndex}
            onSelect={onSelectStay}
          />
        )}
      </div>

      {hasAnyOverdue && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOverdueTab('active')}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${overdueTab === 'active'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700'
              }`}
          >
            Active
          </button>
          <button
            onClick={() => setOverdueTab('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${overdueTab === 'pending'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700'
              }`}
          >
            Pending
          </button>
          <button
            onClick={() => setOverdueTab('overdue')}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${overdueTab === 'overdue'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700'
              }`}
          >
            Overdue
          </button>
        </div>
      )}

      {/* PENDING VIEW */}
      {showPendingView && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedPendingCheckIns.map(pc => (
            <div key={pc.id} className="py-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 px-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">Check-in Overdue</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">Action required: finalize your move-in with the landlord.</p>

              <div className="bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-400 p-6 rounded-2xl border border-red-100 dark:border-red-900/20 shadow-sm mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                    <Home className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-base leading-tight">{pc.property}</p>
                    <p className="text-xs opacity-80 font-medium mt-0.5">Room {pc.room || '—'}</p>
                    <p className="text-xs opacity-80 font-medium mt-0.5">
                      Scheduled start: {formatDate(pc.startDate)}
                    </p>
                    <p className="text-xs font-bold uppercase mt-1">
                      {Number(pc.daysOverdue) > 0
                        ? `${Math.max(0, Math.round(Number(pc.daysOverdue)))} day${Math.round(Number(pc.daysOverdue)) === 1 ? '' : 's'} overdue`
                        : 'Overdue'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => {
                    const propertyId = pc?.property_id || pc?.propertyId || pc?.property?.id;
                    if (propertyId) navigate(`/property/${propertyId}`);
                  }}
                  disabled={!pc?.property_id && !pc?.propertyId && !pc?.property?.id}
                  className="bg-white dark:bg-gray-700 text-red-700 px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm border border-red-100 dark:border-red-900/30 hover:bg-red-50 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Home className="w-3 h-3" />
                  Room Details
                </button>
                <button
                  onClick={() => onCancelBooking(pc.id)}
                  disabled={isCancelling === pc.id}
                  className="bg-white dark:bg-gray-700 text-red-600 px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm border border-red-100 dark:border-red-900/30 hover:bg-red-50 transition-all flex items-center gap-2"
                >
                  {isCancelling === pc.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                  Cancel Booking
                </button>
              </div>
            </div>
          ))}
          {displayedPendingBookings.map(pb => {
            const startDate = pb?.start_date ? new Date(pb.start_date) : null;
            if (startDate) startDate.setHours(0, 0, 0, 0);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const daysUntil = startDate ? Math.max(0, Math.ceil((startDate - now) / (1000 * 60 * 60 * 24))) : null;
            const pendingBedCount = Math.max(1, toWholeNumber(pb?.bed_count ?? pb?.bedCount, 1));
            const pendingOccupantCount = Math.max(
              1,
              toWholeNumber(pb?.occupant_count ?? pb?.occupantCount, 0) || pendingBedCount,
            );
            const pendingRoomCapacity = toWholeNumber(pb?.room?.capacity, 0);
            const pendingOccupancyLabel = pendingRoomCapacity > 0
              ? `${pendingOccupantCount}/${pendingRoomCapacity} Occupancy`
              : `${pendingOccupantCount} Occupant${pendingOccupantCount === 1 ? '' : 's'}`;
            const pendingOccupants = resolveOccupantProfiles(pb);
            const isProxyPending = String(pb?.booking_mode || pb?.bookingMode || '').toLowerCase() === 'proxy';

            return (
              <div key={pb.id} className="py-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 px-4">
                <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">Booking Pending</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">The landlord is reviewing your request.</p>

                <div className="bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-400 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/20 shadow-sm mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                      <Home className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-base leading-tight">{pb?.property_title || pb?.property?.title || 'Property'}</p>
                      <p className="text-xs opacity-80 font-medium mt-0.5">Room {pb?.room_number || pb?.room?.room_number || '—'}</p>
                      {isProxyPending && <p className="text-xs opacity-80 font-medium mt-0.5">{pendingOccupancyLabel}</p>}
                      {(isProxyPending || pendingOccupants.length > 0) && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[10px] uppercase font-bold opacity-70">Proxy Occupants</p>
                          {pendingOccupants.length > 0 ? pendingOccupants.map((occupant) => (
                            <p key={occupant.id} className="text-[11px] opacity-85 leading-tight">
                              {occupant.fullName}
                              {(occupant.relationship || occupant.sex)
                                ? ` • ${[occupant.relationship, occupant.sex].filter(Boolean).join(' • ')}`
                                : ''}
                            </p>
                          )) : (
                            <p className="text-[11px] opacity-70">Occupant details are still syncing.</p>
                          )}
                        </div>
                      )}
                      <p className="text-xs opacity-80 font-medium mt-0.5">
                        {daysUntil !== null ? `Move-in Date: ${formatDate(pb.start_date)}` : 'Move-in Date Awaiting Approval'}
                      </p>
                      <ReservationPolicyNotice policy={pb?.reservation_policy} compact />
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

                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      const propertyId = pb?.property_id || pb?.property?.id;
                      if (propertyId) navigate(`/property/${propertyId}`);
                    }}
                    disabled={!pb?.property_id && !pb?.property?.id}
                    className="bg-white dark:bg-gray-700 text-amber-700 px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm border border-amber-100 dark:border-amber-900/30 hover:bg-amber-50 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Home className="w-3 h-3" />
                    Room Details
                  </button>
                </div>
              </div>
            );
          })}
          {displayedPendingCheckIns.length === 0 && displayedPendingBookings.length === 0 && (
            <div className="md:col-span-2 text-center py-10 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
              <AlertCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No matching bookings</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Try switching the filter to view other booking states.</p>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE STAY VIEW */}
      {showActiveView && (
        <div className="space-y-6">
          {(() => {
            const data = displayedStays[selectedIndex] || displayedStays[0];
            if (!data) {
              return (
                <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
                  <Home className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No matching active stays</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Try switching the filter to view other booking states.</p>
                </div>
              );
            }
            const { booking, room, property, landlord, addons = { active: [], pending: [], available: [], monthlyTotal: 0 } } = data;
            const addonMonthlyTotal = Number(addons?.monthlyTotal ?? addons?.monthly_total ?? 0);
            const effectivePaymentStatus = booking.is_overdue || booking.isOverdue ? 'overdue' : booking.paymentStatus;
            const hasCheckoutDate = Boolean(booking?.endDate || booking?.end_date);
            const isMonthlyBilling = String(booking?.billing_policy || booking?.billingPolicy || 'monthly').toLowerCase() === 'monthly';
            const invoiceList = Array.isArray(data?.financials?.invoices)
              ? data.financials.invoices
              : Array.isArray(booking?.financials?.invoices)
                ? booking.financials.invoices
                : [];
            const shouldUsePaymentCountdown = isMonthlyBilling && !hasCheckoutDate;
            const paymentCountdown = shouldUsePaymentCountdown
              ? resolveMonthlyPaymentCountdown(booking, invoiceList)
              : null;
            const resolvedBedCount = Math.max(1, toWholeNumber(booking?.bed_count ?? booking?.bedCount, 1));
            const resolvedOccupantCount = Math.max(
              1,
              toWholeNumber(booking?.occupant_count ?? booking?.occupantCount, 0) || resolvedBedCount,
            );
            const resolvedRoomCapacity = toWholeNumber(room?.capacity ?? room?.raw_capacity, 0);
            const occupancyLabel = resolvedRoomCapacity > 0 ? 'Occupancy' : 'Occupants';
            const occupancyValue = resolvedRoomCapacity > 0
              ? `${resolvedOccupantCount}/${resolvedRoomCapacity}`
              : `${resolvedOccupantCount}`;
            const occupantProfiles = resolveOccupantProfiles(booking);
            const isProxyBooking = String(booking?.booking_mode || booking?.bookingMode || '').toLowerCase() === 'proxy';

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

                  {/* Move-out Notice Banner */}
                  {(booking.notice_given_at || booking.noticeGivenAt) && (
                    <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 p-4 rounded-xl flex items-start gap-4">
                      <DoorOpen className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-teal-900 dark:text-teal-200">Move-out Notice Submitted</p>
                        <p className="text-xs text-teal-700 dark:text-teal-400 mt-1">
                          Your move-out notice was received. Planned departure:{' '}
                          <span className="font-bold">{booking.endDate ? formatDate(booking.endDate) : 'TBD'}</span>.
                          The landlord will confirm your checkout and finalize any billing adjustments.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Room Details Card */}
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
                      <div className="absolute top-4 right-4 z-10">
                        {/* Ellipsis Menu */}
                        <EllipsisMenu
                          booking={booking}
                          property={property}
                          onReview={onReview}
                          onReport={onReport}
                          onRequestMaintenance={onRequestMaintenance}
                          navigate={navigate}
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 flex items-end">
                        <div>
                          <h2 className="text-2xl font-bold text-white">{property.title}</h2>
                          <p className="text-white/90 text-sm flex items-center mt-2 font-medium">
                            <MapPin className="w-4 h-4 mr-2.5" />
                            {property.address}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className={`grid grid-cols-2 ${isProxyBooking ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4`}>
                        <StatCard label="Room" value={room.roomNumber} icon={DoorOpen} />
                        {isProxyBooking && <StatCard label={occupancyLabel} value={occupancyValue} icon={Users} />}
                        <StatCard
                          label={booking.billing_policy === 'daily' ? 'Daily Rent' : 'Monthly Rent'}
                          value={`₱${(booking.unit_price || booking.monthlyRent || 0).toLocaleString()}`}
                          icon={Banknote}
                        />
                        {(() => {
                          if (paymentCountdown) {
                            return (
                              <StatCard
                                label={paymentCountdown.label}
                                value={paymentCountdown.value}
                                tinyValue={paymentCountdown.tinyValue}
                                tone={paymentCountdown.tone}
                                statusKey={paymentCountdown.statusKey}
                                icon={CalendarDays}
                              />
                            );
                          }

                          const start = new Date(booking.startDate);
                          start.setHours(0, 0, 0, 0);
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          const isFuture = start > now;
                          const daysUntil = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
                          const daysStayedValue = Math.max(0, Math.floor(Number(booking?.daysStayed || 0)));
                          const daysLeftValue = booking?.daysRemaining == null
                            ? '-'
                            : Math.max(0, Math.ceil(Number(booking.daysRemaining)));

                          return (
                            <StatCard
                              label={isFuture ? "Starts In" : (hasCheckoutDate ? "Days Left" : "Days Stayed")}
                              value={
                                isFuture
                                  ? `${daysUntil} ${daysUntil === 1 ? 'Day' : 'Days'}`
                                  : (hasCheckoutDate ? daysLeftValue : daysStayedValue)
                              }
                              icon={CalendarDays}
                            />
                          );
                        })()}
                        <StatCard
                          label="Status"
                          value={booking.is_overdue || booking.isOverdue ? 'Overdue' : booking.paymentStatus}
                          tone="status"
                          statusKey={effectivePaymentStatus}
                          icon={CreditCard}
                        />
                      </div>

                      {(isProxyBooking || occupantProfiles.length > 0) && (
                        <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Proxy Occupants</p>
                          {occupantProfiles.length > 0 ? (
                            <div className="space-y-1.5">
                              {occupantProfiles.map((occupant) => (
                                <p key={occupant.id} className="text-sm text-gray-700 dark:text-gray-300 leading-tight">
                                  <span className="font-semibold text-gray-900 dark:text-white">{occupant.fullName}</span>
                                  {(occupant.relationship || occupant.sex)
                                    ? ` • ${[occupant.relationship, occupant.sex].filter(Boolean).join(' • ')}`
                                    : ''}
                                  {occupant.contact ? ` • ${occupant.contact}` : ''}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-amber-700 dark:text-amber-300">Occupant details are still syncing for this proxy booking.</p>
                          )}
                        </div>
                      )}

                      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span className="font-bold dark:text-gray-300">Lease:</span>
                            {formatDate(booking.startDate)} to {booking.endDate ? formatDate(booking.endDate) : 'Open-ended'}
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-2 rounded text-[10px] font-bold uppercase ml-2">
                              {booking.totalMonths} {Number(booking.totalMonths) === 1 ? 'month' : 'months'}
                            </span>
                          </p>

                          <div className="flex flex-col items-start md:items-end gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Extend Stay button — only if expiring within 30 days */}
                              {(() => {
                                const contractMode = String(booking.contract_mode || booking.contractMode || '').toLowerCase();
                                const isOpenEndedMonthly = contractMode === 'monthly' && !booking.endDate;
                                if (isOpenEndedMonthly || !booking.endDate) return null;
                                const end = new Date(booking.endDate);
                                const today = new Date();
                                const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
                                if (daysLeft > 30) return null;
                                return (
                                  <button
                                    onClick={onRequestExtension}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
                                  >
                                    <CalendarDays className="w-4 h-4" />
                                    Extend Stay
                                  </button>
                                );
                              })()}

                              {/* Transfer button */}
                              {(() => {
                                const isPendingForThisBooking = pendingTransferBookingIds.includes(booking.id);
                                const pendingRequestForThisBooking = pendingTransferRequests.find(
                                  (request) => Number(request.booking_id) === Number(booking.id),
                                );
                                const limitReached = monthlyTransferCount >= 2;
                                const now = new Date();
                                const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                                const daysUntilTransferReset = Math.max(
                                  1,
                                  Math.ceil((nextMonthStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                                );
                                const isDisabled = isPendingForThisBooking || limitReached;
                                let buttonText = 'Transfer';
                                let buttonTitle = 'Request a room transfer';
                                if (isPendingForThisBooking) {
                                  buttonText = 'Transfer Pending';
                                  buttonTitle = 'You already have a pending transfer request for this booking';
                                } else if (limitReached) {
                                  buttonText = 'Limit Reached';
                                  buttonTitle = `Monthly transfer limit reached. Try again in ${daysUntilTransferReset} day${daysUntilTransferReset === 1 ? '' : 's'}.`;
                                }
                                return (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        if (isPendingForThisBooking) return;
                                        if (limitReached) {
                                          toast.error(`Transfer limit reached. You can request again in ${daysUntilTransferReset} day${daysUntilTransferReset === 1 ? '' : 's'}.`);
                                          return;
                                        }
                                        onRequestTransfer?.();
                                      }}
                                      disabled={isPendingForThisBooking}
                                      title={buttonTitle}
                                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isDisabled
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
                                        : 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20 active:scale-95'
                                        }`}
                                    >
                                      <Shuffle className="w-4 h-4" />
                                      {buttonText}
                                    </button>
                                    {pendingRequestForThisBooking && (
                                      <button
                                        onClick={() => onCancelTransferRequest?.(pendingRequestForThisBooking.id)}
                                        disabled={cancellingTransferRequestId === pendingRequestForThisBooking.id}
                                        title="Cancel pending transfer request"
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 disabled:opacity-60"
                                      >
                                        {cancellingTransferRequestId === pendingRequestForThisBooking.id ? (
                                          <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <XCircle className="w-4 h-4" />
                                        )}
                                        Cancel Transfer
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Move-out button */}
                              {(() => {
                                const rawStatus = String(booking.status || booking.status_raw || '').toLowerCase();
                                const effectiveStatus = rawStatus || 'confirmed';
                                const canRequestMoveOut = ['confirmed', 'active'].includes(effectiveStatus);
                                const hasNotice = !!(booking.notice_given_at || booking.noticeGivenAt);
                                const billingMode = String(booking.billing_policy || booking.payment_plan || '').toLowerCase();
                                const isMonthlyBilling = billingMode === 'monthly';
                                const paymentStatus = String(
                                  booking.is_overdue || booking.isOverdue
                                    ? 'overdue'
                                    : (booking.paymentStatus || booking.payment_status || ''),
                                ).toLowerCase();
                                const isCurrentMonthPaid = !isMonthlyBilling || ['paid', 'settled', 'succeeded', 'verified', 'completed'].includes(paymentStatus);

                                if (!canRequestMoveOut || hasNotice) return null;

                                return (
                                  <button
                                    onClick={() => onRequestMoveOut?.()}
                                    disabled={!isCurrentMonthPaid}
                                    title={!isCurrentMonthPaid ? 'Move-out is available only when current month status is Paid.' : ''}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 ${!isCurrentMonthPaid
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                                      }`}
                                  >
                                    <DoorOpen className="w-4 h-4" />
                                    Move-out
                                  </button>
                                );
                              })()}
                            </div>

                            {!!(booking.notice_given_at || booking.noticeGivenAt) && (
                              <div
                                title="Move-out notice already submitted."
                                className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                              >
                                <DoorOpen className="w-4 h-4" />
                                Notice Submitted
                              </div>
                            )}
                          </div>
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
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all active:scale-95 ${booking.can_request_addon === false
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
                            <AddonItem
                              key={addon.pivot?.id || addon.id}
                              addon={addon}
                              status="active"
                              onCancel={() => onCancelAddon(addon.id)}
                            />
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

  const parseActivityTimestamp = (value) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  // Flatten all transactions from all invoices into a single sorted list
  const invoices = Array.isArray(financials?.invoices) ? financials.invoices : [];
  const allTransactions = invoices
    .flatMap(inv => (Array.isArray(inv.transactions) ? inv.transactions : []).map(tx => {
      const resolvedDate = tx.date || tx.created_at;
      return {
        ...tx,
        date: resolvedDate,
        amount: tx.amount ?? (tx.amount_cents ? tx.amount_cents / 100 : 0),
        invoiceRef: inv.id,
        timestamp: parseActivityTimestamp(resolvedDate),
        normalizedStatus: String(tx.status || '').toLowerCase(),
      };
    }))
    .sort((a, b) => b.timestamp - a.timestamp);

  // Hide outdated failed attempts when a newer transaction exists for the same invoice.
  const newestTimestampByInvoice = new Map();
  allTransactions.forEach((tx) => {
    const key = String(tx.invoiceRef || tx.id || '');
    if (!newestTimestampByInvoice.has(key)) {
      newestTimestampByInvoice.set(key, tx.timestamp);
    }
  });

  const recentTransactions = allTransactions
    .filter((tx) => {
      const key = String(tx.invoiceRef || tx.id || '');
      const latestTimestamp = newestTimestampByInvoice.get(key) ?? tx.timestamp;
      const hasNewerAttempt = latestTimestamp > tx.timestamp;
      const isFailedAttempt = ['expired', 'failed', 'cancelled', 'voided'].includes(tx.normalizedStatus);

      return !(hasNewerAttempt && isFailedAttempt);
    })
    .slice(0, 3);

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
                      <span className={`px-2 py-2 rounded-md text-[10px] font-bold uppercase ${['succeeded', 'paid', 'completed', 'approved', 'verified'].includes(tx.normalizedStatus)
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : ['expired', 'failed', 'cancelled', 'voided'].includes(tx.normalizedStatus)
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
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

            {(() => {
              const bookingStatus = String(booking.status || '').toLowerCase();
              const cancellationReason = booking.cancellationReason || booking.cancellation_reason;

              if (bookingStatus !== 'cancelled' || !cancellationReason) {
                return null;
              }

              return (
                <div className="mt-4 p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300 mb-2">Cancellation</p>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">{cancellationReason}</p>
                </div>
              );
            })()}

            <ReservationPolicyNotice policy={booking.reservation_policy} />

            {/* Activity Timeline */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-4">Activity Timeline</h5>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-700">
                {Array.isArray(booking.activityLog) && booking.activityLog.length > 0 ? (
                  [...(booking.activityLog || [])].reverse().map((activity, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[22px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${activity.status === 'pending' ? 'bg-amber-400' :
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
const PAYMENT_STATUS_THEME = {
  paid: {
    badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    accent: 'bg-green-500',
    icon: 'text-green-600 dark:text-green-400',
    value: 'text-green-700 dark:text-green-400',
  },
  completed: {
    badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    accent: 'bg-green-500',
    icon: 'text-green-600 dark:text-green-400',
    value: 'text-green-700 dark:text-green-400',
  },
  active: {
    badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    accent: 'bg-green-500',
    icon: 'text-green-600 dark:text-green-400',
    value: 'text-green-700 dark:text-green-400',
  },
  confirmed: {
    badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    accent: 'bg-green-500',
    icon: 'text-green-600 dark:text-green-400',
    value: 'text-green-700 dark:text-green-400',
  },
  pending: {
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    accent: 'bg-amber-500',
    icon: 'text-amber-600 dark:text-amber-400',
    value: 'text-amber-700 dark:text-amber-400',
  },
  unpaid: {
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    accent: 'bg-red-500',
    icon: 'text-red-600 dark:text-red-400',
    value: 'text-red-700 dark:text-red-400',
  },
  overdue: {
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 animate-pulse',
    accent: 'bg-red-500 animate-pulse',
    icon: 'text-red-600 dark:text-red-400',
    value: 'text-red-700 dark:text-red-400',
  },
  partial: {
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    accent: 'bg-amber-500',
    icon: 'text-amber-600 dark:text-amber-400',
    value: 'text-amber-700 dark:text-amber-400',
  },
  cancelled: {
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    accent: 'bg-red-500',
    icon: 'text-red-600 dark:text-red-400',
    value: 'text-red-700 dark:text-red-400',
  },
  rejected: {
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    accent: 'bg-red-500',
    icon: 'text-red-600 dark:text-red-400',
    value: 'text-red-700 dark:text-red-400',
  },
  refunded: {
    badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    accent: 'bg-purple-500',
    icon: 'text-purple-600 dark:text-purple-400',
    value: 'text-purple-700 dark:text-purple-400',
  },
  default: {
    badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    accent: 'bg-gray-400 dark:bg-gray-500',
    icon: 'text-gray-600 dark:text-gray-400',
    value: 'text-gray-900 dark:text-white',
  },
  neutral: {
    accent: 'bg-gray-300 dark:bg-gray-600',
    icon: 'text-gray-600 dark:text-gray-400',
    value: 'text-gray-900 dark:text-white',
  },
};
// ==================== Ellipsis Menu Component ====================
const EllipsisMenu = ({ booking, property, onReview, onReport, onRequestMaintenance }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all backdrop-blur-sm"
        title="More actions"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={() => { onRequestMaintenance(booking.id); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Wrench className="w-4 h-4 text-orange-500" />
            Maintenance
          </button>

          {(!booking.hasReview && !booking.has_review) && (
            <button
              onClick={() => { onReview({ ...booking, property }); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
              Review
            </button>
          )}

          <button
            onClick={() => { onReport(property); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors border-t border-gray-100 dark:border-gray-700"
          >
            <ShieldAlert className="w-4 h-4" />
            Report
          </button>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, tinyValue = '', icon: Icon, tone = 'neutral', statusKey = '' }) => {
  const statusTheme = PAYMENT_STATUS_THEME[(statusKey || '').toLowerCase()] || PAYMENT_STATUS_THEME.default;
  const resolvedTheme = tone === 'status' ? statusTheme : PAYMENT_STATUS_THEME.neutral;

  return (
    <div className="relative overflow-hidden text-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm transition-all">
      <div className={`absolute top-0 left-0 right-0 h-1 ${resolvedTheme.accent}`} />
      <div className="flex justify-center mb-4">
        <Icon className={`w-6 h-6 ${resolvedTheme.icon}`} />
      </div>
      <div className="flex items-end justify-center gap-1">
        <p className={`text-xl font-bold leading-tight ${resolvedTheme.value}`}>{value}</p>
        {tinyValue ? <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{tinyValue}</p> : null}
      </div>
      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-500 uppercase mt-2.5 tracking-wider">{label}</p>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const s = (status || "").toLowerCase();
  const styleClass = (PAYMENT_STATUS_THEME[s] || PAYMENT_STATUS_THEME.default).badge;

  const label = s === 'overdue' ? 'Payment Overdue' : status;

  return (
    <span className={`px-2 py-2 rounded-full text-xs font-medium capitalize ${styleClass}`}>
      {label}
    </span>
  );
};

const resolveAddonDisplayPrice = (addon) => {
  const candidates = [
    addon?.pivot?.price_at_booking,
    addon?.price_at_booking,
    addon?.price,
  ];

  for (const candidate of candidates) {
    const numericValue = Number(candidate);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }
  }

  return 0;
};

const AddonItem = ({ addon, status, onCancel }) => {
  const displayPrice = resolveAddonDisplayPrice(addon);

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${status === 'active'
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
          ₱{displayPrice.toLocaleString()}
          {addon?.price_type === 'monthly' && <span className="text-[10px] text-gray-500 font-medium ml-0.5">/mo</span>}
        </span>
        <div className="flex items-center gap-2">
          {addon?.pivot?.cancellation_effective_at && (
            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              Ends {new Date(addon.pivot.cancellation_effective_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          )}
          {onCancel && !addon?.pivot?.cancellation_effective_at && (
            <button
              onClick={onCancel}
              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title={status === 'active' ? 'Remove next month' : 'Cancel request'}
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const AddonModal = ({ bookingId, availableAddons, onClose, onRequest, requestingId }) => {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customData, setCustomData] = useState({
    name: '',
    addon_type: 'rental',
    price_type: 'monthly',
    note: '',
    suggested_price: ''
  });

  const normalizeSuggestedPrice = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    const numericValue = Number(raw);
    if (!Number.isFinite(numericValue) || numericValue < 0) return null;

    return numericValue;
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();

    const normalizedSuggestedPrice = normalizeSuggestedPrice(customData.suggested_price);

    onRequest({
      booking_id: bookingId,
      is_custom: true,
      name: customData.name.trim(),
      addon_type: customData.addon_type,
      price_type: customData.price_type,
      note: (customData.note || '').trim() || null,
      quantity: 1,
      ...(normalizedSuggestedPrice !== null
        ? { suggested_price: normalizedSuggestedPrice }
        : {})
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
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${addon.price_type === 'monthly'
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
                          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${addon.has_stock && requestingId !== addon.id
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
                  onChange={e => setCustomData({ ...customData, name: e.target.value })}
                  className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Type *</label>
                  <select
                    value={customData.addon_type}
                    onChange={e => setCustomData({ ...customData, addon_type: e.target.value })}
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
                    onChange={e => setCustomData({ ...customData, price_type: e.target.value })}
                    className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="one_time">One-time</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Suggested Price (Optional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Suggested Price (Optional)"
                  value={customData.suggested_price}
                  onChange={e => setCustomData({ ...customData, suggested_price: e.target.value })}
                  className="w-full px-4 py-4 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white outline-none mb-4"
                />
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Notes / Details</label>
                <textarea
                  placeholder="Tell the owner more about your request..."
                  value={customData.note}
                  onChange={e => setCustomData({ ...customData, note: e.target.value })}
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
            Requests are subject to owner approval. <br />Approved items will be added to your next billing cycle.
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

  const currentEndDate = booking.endDate ? new Date(booking.endDate) : null;
  const hasCurrentEndDate = currentEndDate instanceof Date && !Number.isNaN(currentEndDate.getTime());

  // Calculate default dates
  const nextMonthDate = hasCurrentEndDate ? new Date(currentEndDate) : null;
  if (nextMonthDate) {
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  }
  const nextMonthStr = nextMonthDate ? nextMonthDate.toISOString().split('T')[0] : null;

  useEffect(() => {
    if (type === 'monthly') {
      setEstimatedPrice(parseFloat(booking.unit_price || booking.monthlyRent || 0));
    } else if (customDate && hasCurrentEndDate) {
      const start = new Date(booking.endDate);
      const end = new Date(customDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const dailyRate = room.daily_rate || (parseFloat(booking.unit_price || booking.monthlyRent || 0) / 30);
      setEstimatedPrice(diffDays * dailyRate);
    } else {
      setEstimatedPrice(0);
    }
  }, [type, customDate, booking, room, hasCurrentEndDate]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!hasCurrentEndDate) {
      toast.error('This stay is open-ended and does not need an extension request.');
      return;
    }

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
            <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
              {hasCurrentEndDate
                ? new Date(booking.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : 'Open-ended'}
            </p>
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
                min={hasCurrentEndDate ? new Date(new Date(booking.endDate).getTime() + 86400000).toISOString().split('T')[0] : undefined}
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

const MoveOutModal = ({ booking, onClose, onSubmit, loading }) => {
  const buildTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const buildDefaultMoveOutDate = () => {
    const today = buildTodayDate();
    const currentEndRaw = booking?.endDate || booking?.end_date;
    if (currentEndRaw) {
      const currentEndDate = new Date(currentEndRaw);
      if (!Number.isNaN(currentEndDate.getTime()) && currentEndDate >= today) {
        return currentEndDate.toISOString().split('T')[0];
      }
    }

    const defaultDate = new Date(today);
    defaultDate.setDate(defaultDate.getDate() + 30);
    return defaultDate.toISOString().split('T')[0];
  };

  const [moveOutDate, setMoveOutDate] = useState(buildDefaultMoveOutDate());
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!moveOutDate) {
      toast.error('Please select your move-out date.');
      return;
    }

    const confirmed = window.confirm('Confirm move-out request? This will notify your landlord.');
    if (!confirmed) {
      return;
    }

    onSubmit({
      booking_id: booking.id,
      move_out_date: moveOutDate,
      reason,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full border border-gray-100 dark:border-gray-700 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Request Move-out</h3>
            <button onClick={onClose} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase mb-2">Current Move-out Date</p>
            <p className="text-base font-bold text-indigo-900 dark:text-indigo-200">
              {booking?.endDate
                ? new Date(booking.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : 'Open-ended (not yet set)'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Planned Move-out Date *</label>
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={moveOutDate}
              onChange={(e) => setMoveOutDate(e.target.value)}
              className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Reason / Notes</label>
            <textarea
              placeholder="Optional context for your landlord"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white outline-none h-20 resize-none text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Move-out Request'}
          </button>
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
  const [transferPreview, setTransferPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [formData, setFormData] = useState({
    requested_room_id: '',
    reason: '',
    booking_id: booking?.id || '',
    property_id: property?.id || '',
  });

  useEffect(() => {
    if (!formData.requested_room_id || !booking?.id) {
      setTransferPreview(null);
      return;
    }

    let cancelled = false;
    const fetchPreview = async () => {
      setLoadingPreview(true);
      try {
        const res = await api.get('/tenant/transfers/preview', {
          params: {
            booking_id: booking.id,
            requested_room_id: formData.requested_room_id,
          }
        });
        if (!cancelled) {
          setTransferPreview(res.data?.success ? res.data.data : null);
        }
      } catch (err) {
        console.error('Failed to fetch transfer preview', err);
        if (!cancelled) setTransferPreview(null);
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    };

    fetchPreview();
    return () => { cancelled = true; };
  }, [formData.requested_room_id, booking?.id]);

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
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} ({r.type_label}) — ₱{(r.monthly_rate ?? r.price ?? 0).toLocaleString()}/mo
                  </option>
                ))}
              </select>
              {availableRooms.length === 0 && !loadingRooms && (
                <p className="text-[10px] text-red-500 mt-2 font-bold italic">{roomsMessage || 'No eligible transfer rooms are available in this property right now.'}</p>
              )}
            </div>

            {/* Financial Impact Preview */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">💰 Financial Impact Preview</label>
                <div className="group relative">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Rent is prorated based on a standard 30-day month: (Monthly Rent ÷ 30) × remaining days. Any transfer fee is deducted from your unused credit.
                  </div>
                </div>
              </div>

              {loadingPreview ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto text-amber-500 mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Calculating impact...</p>
                </div>
              ) : transferPreview ? (
                <div className={`rounded-xl border overflow-hidden transition-all ${transferPreview.suggested_adjustment > 0 ? 'border-amber-200 dark:border-amber-800' :
                  transferPreview.suggested_adjustment < 0 ? 'border-green-200 dark:border-green-800' : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <div className="grid grid-cols-2 bg-gray-50 dark:bg-gray-700/50 divide-x divide-gray-200 dark:divide-gray-600">
                    <div className="p-3 text-center">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Current Rate</p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">₱{transferPreview.current_room_rate.toLocaleString()}/mo</p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">New Rate</p>
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-400">₱{transferPreview.new_room_rate.toLocaleString()}/mo</p>
                    </div>
                  </div>

                  <div className="p-4 space-y-2 bg-white dark:bg-gray-800">
                    {!transferPreview.has_payment_this_period ? (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">ℹ️ No payment found for current period.</p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">Next invoice will reflect the new room rate. No immediate charge.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Remaining days this cycle</span>
                          <span className="font-bold">{transferPreview.remaining_days} days</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Old room unused value</span>
                          <span className="font-bold">₱{transferPreview.old_room_unused_value.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">New room cost (rem. days)</span>
                          <span className="font-bold">₱{transferPreview.new_room_cost.toLocaleString()}</span>
                        </div>

                        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                          <span className="text-xs font-bold uppercase text-gray-400">Net Adjustment</span>
                          <div className="text-right">
                            <p className={`text-base font-black ${transferPreview.suggested_adjustment > 0 ? 'text-amber-600' : 'text-green-600'
                              }`}>
                              {transferPreview.suggested_adjustment > 0 ? '+' : ''}
                              ₱{Math.abs(transferPreview.suggested_adjustment).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-gray-400 font-medium">
                              {transferPreview.suggested_adjustment > 0 ? 'Additional charge' : 'Credit to next month'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : formData.requested_room_id ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">
                  <p className="text-xs text-red-600 dark:text-red-400">Unable to calculate preview for this room.</p>
                </div>
              ) : null}
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

              {leaseDurationPreference === 'keep_current' && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    ℹ️ Inheriting existing anniversary cycle
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                    Your current billing schedule and lease terms will carry over seamlessly to the new room.
                  </p>
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
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : availableRooms.length === 0 ? (
              'No Eligible Rooms Available'
            ) : (
              'Send Request'
            )}
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