import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, Alert, Animated, Modal, TextInput, Platform, useWindowDimensions, FlatList, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getStyles } from '../../../../styles/Menu/MyBookings.js';
import BookingService from '../../../../services/BookingService.js';
import TenantService from '../../../../services/TenantService.js';
import PropertyService from '../../../../services/PropertyService.js';
import { BASE_URL as API_BASE_URL } from '../../../../config/index.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { useUIState } from '../../../../contexts/UIStateContext.jsx';
import { BookingCardSkeleton } from '../../../../components/Skeletons/index.jsx';
import {
  tenantQueryKeys,
  useTenantFocusRefetch,
  useTenantRefreshHandler,
} from '../../hooks/useTenantQueryHelpers.js';
import ReservationPolicyNotice from './components/ReservationPolicyNotice.jsx';
import { formatPrice } from '../../../../utils/price.js';

const TABS = [
  { id: 'current', label: 'My Stay', icon: 'home-outline' },
  { id: 'history', label: 'History', icon: 'time-outline' }
];

const REPORT_REASONS = [
  'Inaccurate Listing Photos/Details',
  'Safety or Security Concerns',
  'Landlord Misconduct/Harassment',
  'Payment Issues (Charging outside app)',
  'Scam or Fraudulent Activity',
  'Other',
];

const MAINTENANCE_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const extractHistoryBookings = (payload, fallback = []) => {
  const candidates = [
    payload?.items,
    payload?.bookings,
    payload?.data?.bookings,
    payload?.data,
    payload,
  ];

  const rawBookings = candidates.find((candidate) => Array.isArray(candidate));
  const source = Array.isArray(rawBookings) ? rawBookings : fallback;

  const seenIds = new Set();
  const deduped = [];

  source.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;

    const key = item.id ?? item.booking_reference ?? `history-${index}`;
    if (seenIds.has(key)) return;

    seenIds.add(key);
    deduped.push(item);
  });

  return deduped;
};

const ALMOST_PAY_TIME_DAYS = 5;
const OPEN_INVOICE_STATUSES = new Set(['pending', 'partial', 'overdue', 'unpaid']);
const SETTLED_INVOICE_STATUSES = new Set(['paid', 'settled', 'succeeded', 'verified', 'completed']);

const padDatePart = (value) => String(value).padStart(2, '0');

const formatIsoDate = (dateValue) => {
  if (!dateValue) return '';
  const dateObj = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = padDatePart(dateObj.getMonth() + 1);
  const day = padDatePart(dateObj.getDate());
  return `${year}-${month}-${day}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'Not Available';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatSlashDate = (dateValue) => {
  const isoDate = formatIsoDate(dateValue);
  return isoDate ? isoDate.replace(/-/g, '/') : '';
};

const formatLongDate = (dateValue) => {
  if (!dateValue) return 'Open-ended (not yet set)';
  const dateObj = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(dateObj.getTime())) return 'Open-ended (not yet set)';
  return dateObj.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatPesoNoCents = (amount) => formatPrice(amount, { maximumFractionDigits: 0 });

const buildTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getImageUrl = (imagePath) => {
  if (!imagePath) return { uri: 'https://via.placeholder.com/800x400?text=No+Image' };
  if (typeof imagePath === 'string' && imagePath.startsWith('http')) return { uri: imagePath };
  const cleanPath = typeof imagePath === 'string' ? imagePath.replace(/^\/?(storage\/)?/, '') : '';
  return { uri: `${API_BASE_URL}/storage/${cleanPath}` };
};

const formatCurrency = (amount) => formatPrice(amount);

const toWholeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
};

const resolveOccupancySummary = (bookingEntry, roomEntry) => {
  const resolvedBedCount = Math.max(
    1,
    toWholeNumber(bookingEntry?.bed_count ?? bookingEntry?.bedCount, 1),
  );
  const resolvedOccupantCount = Math.max(
    1,
    toWholeNumber(bookingEntry?.occupant_count ?? bookingEntry?.occupantCount, 0)
    || resolvedBedCount,
  );
  const resolvedRoomCapacity = toWholeNumber(
    roomEntry?.capacity ?? roomEntry?.raw_capacity,
    0,
  );

  if (resolvedRoomCapacity > 0) {
    return {
      label: 'Occupancy',
      value: `${resolvedOccupantCount}/${resolvedRoomCapacity}`,
    };
  }

  return {
    label: 'Occupants',
    value: String(resolvedOccupantCount),
  };
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
    const phone = String(occupant?.phone || '').trim();
    const email = String(occupant?.email || '').trim();

    return {
      id: occupant?.id || `${fullName}-${index}`,
      fullName,
      relationship,
      sex,
      contact: [phone, email].filter(Boolean).join(' • '),
    };
  });
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
  const month = padDatePart(dateValue.getMonth() + 1);
  const day = padDatePart(dateValue.getDate());
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
      const dueDateKey = formatIsoDate(dueDate);

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
    const dueDateKey = formatIsoDate(nextDueDate);
    if (!dueDateKey) break;

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
    };
  }

  if (daysUntilDue === 0) {
    return {
      label: 'Next Payment',
      value: compactDueDate || 'Due Today',
      tinyValue: '0d',
    };
  }

  return {
    label: daysUntilDue <= ALMOST_PAY_TIME_DAYS ? 'Almost Pay Time' : 'Next Payment',
    value: compactDueDate || `${daysUntilDue} ${daysUntilDue === 1 ? 'Day' : 'Days'} Left`,
    tinyValue: `${daysUntilDue}d`,
  };
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

const buildDefaultMoveOutDate = (booking) => {
  const today = buildTodayDate();
  const currentEndRaw = booking?.endDate || booking?.end_date;

  if (currentEndRaw) {
    const currentEndDate = new Date(currentEndRaw);
    if (!Number.isNaN(currentEndDate.getTime()) && currentEndDate >= today) {
      currentEndDate.setHours(0, 0, 0, 0);
      return currentEndDate;
    }
  }

  const defaultDate = new Date(today);
  defaultDate.setDate(defaultDate.getDate() + 30);
  return defaultDate;
};

// ==================== Ellipsis Menu Component ====================
const EllipsisMenu = ({ booking, property, room, reviewAlreadySubmitted, onReview, onMaintenance, onReport, theme }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <>
      {menuVisible && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
          }}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        />
      )}
      <View style={{ position: 'relative', zIndex: 20 }}>
        <TouchableOpacity
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: 20,
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
          onPress={() => setMenuVisible(!menuVisible)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {menuVisible && (
          <View
            style={{
              position: 'absolute',
              top: 44,
              right: 0,
              backgroundColor: theme.colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
              minWidth: 180,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
              zIndex: 30,
            }}
          >
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
              onPress={() => {
                setMenuVisible(false);
                onMaintenance();
              }}
            >
              <Ionicons name="construct-outline" size={20} color="#F97316" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>Maintenance</Text>
            </TouchableOpacity>

            {!reviewAlreadySubmitted && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  gap: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                }}
                onPress={() => {
                  setMenuVisible(false);
                  onReview();
                }}
              >
                <Ionicons name="star-outline" size={20} color="#F59E0B" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>Review</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 12,
              }}
              onPress={() => {
                setMenuVisible(false);
                onReport();
              }}
            >
              <Ionicons name="shield-outline" size={20} color="#DC2626" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#DC2626' }}>Report</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
};

export default function MyBookings() {

  const navigation = useNavigation();
  const { width: viewportWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const { uiState, updateData, invalidateData, showAlert: uiShowAlert } = useUIState();
  const showAlert = uiShowAlert || Alert.alert;
  const BUCKET = 'bookings';

  const [activeTab, setActiveTab] = useState(
    uiState.bookings?.activeTab ?? 'current'
  );
  const [viewMode, setViewMode] = useState('active'); // 'active', 'pending', or 'overdue'
  const slideAnim = useRef(new Animated.Value(0)).current;
  const cachedBookings = uiState.data?.[BUCKET];
  const [refreshing, setRefreshing] = useState(false);

  // Data states — seed from cache if available
  const [stayData, setStayData] = useState(cachedBookings?.stayData ?? null);
  const [pendingBookings, setPendingBookings] = useState(cachedBookings?.pendingBookings ?? []);
  const [pendingCheckIns, setPendingCheckIns] = useState(cachedBookings?.pendingCheckIns ?? []);
  const [selectedStayIndex, setSelectedStayIndex] = useState(0);
  const [selectedPendingIndex, setSelectedPendingIndex] = useState(0);
  const [showPropertySwitchModal, setShowPropertySwitchModal] = useState(false);
  const [submittingExtension, setSubmittingExtension] = useState(false);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [submittingMoveOut, setSubmittingMoveOut] = useState(false);
  const [openingRoomDetails, setOpeningRoomDetails] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [pendingTransferRequests, setPendingTransferRequests] = useState([]);
  const [monthlyTransferCount, setMonthlyTransferCount] = useState(0);
  const [cancellingTransferRequestId, setCancellingTransferRequestId] = useState(null);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferRoomOptions, setTransferRoomOptions] = useState([]);
  const [selectedTransferRoomId, setSelectedTransferRoomId] = useState(null);
  const [transferReason, setTransferReason] = useState('');
  const [leaseDurationPreference, setLeaseDurationPreference] = useState('keep_current');
  const [newEndDate, setNewEndDate] = useState(null);
  const [showNewEndDatePicker, setShowNewEndDatePicker] = useState(false);
  const [transferOptionsMessage, setTransferOptionsMessage] = useState('');
  const [transferContext, setTransferContext] = useState(null);
  const [transferPreview, setTransferPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [refundPreference, setRefundPreference] = useState('wallet');

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewContext, setReviewContext] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceContext, setMaintenanceContext] = useState(null);
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [maintenanceDescription, setMaintenanceDescription] = useState('');
  const [maintenancePriority, setMaintenancePriority] = useState('medium');
  const [maintenanceImages, setMaintenanceImages] = useState([]);
  const [submittingMaintenance, setSubmittingMaintenance] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContext, setReportContext] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const createDefaultAddonDraft = () => ({
    name: '',
    addon_type: 'rental',
    price_type: 'monthly',
    note: '',
    suggested_price: '',
  });
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [addonContext, setAddonContext] = useState(null);
  const [addonDraft, setAddonDraft] = useState(createDefaultAddonDraft);
  const [addonRequestingId, setAddonRequestingId] = useState(null);
  const [submittingCustomAddon, setSubmittingCustomAddon] = useState(false);

  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [moveOutContext, setMoveOutContext] = useState(null);
  const [moveOutDate, setMoveOutDate] = useState(null);
  const [moveOutReason, setMoveOutReason] = useState('');
  const [showMoveOutDatePicker, setShowMoveOutDatePicker] = useState(false);

  const [showCancelBookingModal, setShowCancelBookingModal] = useState(false);
  const [cancelBookingContext, setCancelBookingContext] = useState(null);

  // Auto-fetch financial preview whenever the selected transfer room changes
  React.useEffect(() => {
    if (!selectedTransferRoomId || !transferContext?.bookingId) {
      setTransferPreview(null);
      return;
    }
    let cancelled = false;
    const fetchPreview = async () => {
      setLoadingPreview(true);
      const result = await TenantService.getTransferPreview(
        transferContext.bookingId,
        selectedTransferRoomId,
      );
      if (!cancelled) {
        setTransferPreview(result.success ? result.data : null);
        setLoadingPreview(false);
      }
    };
    fetchPreview();
    return () => { cancelled = true; };
  }, [selectedTransferRoomId, transferContext]);

  const getDaysUntilTransferReset = () => {
    const now = new Date();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.max(1, Math.ceil((nextMonthStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
    setTransferRoomOptions([]);
    setSelectedTransferRoomId(null);
    setTransferReason('');
    setLeaseDurationPreference('keep_current');
    setNewEndDate(null);
    setShowNewEndDatePicker(false);
    setTransferOptionsMessage('');
    setTransferContext(null);
    setTransferPreview(null);
    setLoadingPreview(false);
  };

  const cachedBundle = cachedBookings
    ? {
      stayData: cachedBookings.stayData ?? null,
      pendingBookings: cachedBookings.pendingBookings ?? [],
      pendingCheckIns: cachedBookings.pendingCheckIns ?? [],
      historyData: cachedBookings.historyData ?? [],
      pendingTransferRequests: [],
      monthlyTransferCount: 0,
    }
    : undefined;

  const myBookingsBundleQuery = useQuery({
    queryKey: tenantQueryKeys.myBookingsBundle(),
    queryFn: async () => {
      try {
        const [stayRes, bookingsRes, transferRes] = await Promise.all([
          TenantService.getCurrentStay(),
          BookingService.getMyBookings(),
          TenantService.getTransferRequests(),
        ]);

        const stayDataNext = stayRes.success ? stayRes.data : null;
        const pendingCheckInsNext = stayRes.success ? (stayRes.data?.pendingCheckIns || []) : [];

        const allBookings = bookingsRes.success ? bookingsRes.data || [] : [];
        const pendingStatuses = new Set(['pending', 'pending_reservation', 'reserved', 'booked']);

        const pendingCheckInIds = new Set(pendingCheckInsNext.map(pc => pc.id));
        const pendingBookingsNext = allBookings.filter((bookingItem) =>
          pendingStatuses.has(String(bookingItem.status || '').toLowerCase()) &&
          !pendingCheckInIds.has(bookingItem.id)
        );

        let pendingTransferRequestsNext = [];
        let monthlyTransferCountNext = 0;

        if (transferRes.success) {
          const transferList = Array.isArray(transferRes.data)
            ? transferRes.data
            : [];
          pendingTransferRequestsNext = transferList.filter(
            (item) => String(item?.status || '').toLowerCase() === 'pending',
          );

          const currentMonthStart = new Date();
          currentMonthStart.setDate(1);
          currentMonthStart.setHours(0, 0, 0, 0);

          monthlyTransferCountNext = transferList.filter((item) => {
            const status = String(item?.status || '').toLowerCase();
            if (!['pending', 'approved'].includes(status)) return false;

            if (!item?.created_at) return false;
            const createdAt = new Date(item.created_at);
            return createdAt >= currentMonthStart;
          }).length;
        }

        return {
          stayData: stayDataNext,
          pendingBookings: pendingBookingsNext,
          pendingCheckIns: pendingCheckInsNext,
          pendingTransferRequests: pendingTransferRequestsNext,
          monthlyTransferCount: monthlyTransferCountNext,
        };
      } catch (error) {
        console.error('Error fetching bookings data:', error);
        return (
          cachedBundle || {
            stayData: null,
            pendingBookings: [],
            pendingCheckIns: [],
            pendingTransferRequests: [],
            monthlyTransferCount: 0,
          }
        );
      }
    },
    placeholderData: (previousData) => previousData || cachedBundle,
  });

  const historyInfiniteQuery = useInfiniteQuery({
    queryKey: ['tenant', 'history', 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await TenantService.getHistory(pageParam);
      return res.success ? res.data : { items: [], meta: { current_page: 1, last_page: 1 } };
    },
    getNextPageParam: (lastPage) => {
      const { current_page, last_page } = lastPage.meta || {};
      return current_page < last_page ? current_page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const flattenedHistory = React.useMemo(() => {
    if (!historyInfiniteQuery.data) return [];
    return historyInfiniteQuery.data.pages.flatMap((page) => extractHistoryBookings(page));
  }, [historyInfiniteQuery.data]);

  const refetchMyBookingsBundle = myBookingsBundleQuery.refetch;
  const myBookingsRefetchers = React.useMemo(
    () => [refetchMyBookingsBundle, historyInfiniteQuery.refetch],
    [refetchMyBookingsBundle, historyInfiniteQuery.refetch],
  );

  useTenantFocusRefetch({ refetchers: myBookingsRefetchers });

  const refreshMyBookings = useTenantRefreshHandler({
    setRefreshing,
    refetchers: myBookingsRefetchers,
  });

  const onRefresh = React.useCallback(async () => {
    invalidateData(BUCKET);
    await refreshMyBookings();
  }, [invalidateData, refreshMyBookings]);

  useEffect(() => {
    const nextBundle = myBookingsBundleQuery.data;
    if (!nextBundle) return;

    setStayData(nextBundle.stayData ?? null);
    setPendingBookings(nextBundle.pendingBookings ?? []);
    setPendingCheckIns(nextBundle.pendingCheckIns ?? []);
    setPendingTransferRequests(nextBundle.pendingTransferRequests ?? []);
    setMonthlyTransferCount(nextBundle.monthlyTransferCount ?? 0);

    // Dynamic initial viewMode selection
    const nonOverdueStaysCount = (nextBundle.stayData?.stays || []).filter(s => !(s?.booking?.is_overdue || s?.booking?.isOverdue)).length;
    const nonOverduePendingBookingsCount = (nextBundle.pendingBookings || []).filter(b => !(b?.is_overdue || b?.isOverdue)).length;
    const nonOverdueCheckInsCount = (nextBundle.pendingCheckIns || []).filter(pc => !(pc.isOverdue || pc.daysOverdue > 0)).length;
    const nonOverduePendingCount = nonOverduePendingBookingsCount + nonOverdueCheckInsCount;

    if (nonOverdueStaysCount > 0) {
      setViewMode('active');
    } else if (nonOverduePendingCount > 0) {
      setViewMode('pending');
    } else {
      const overduePendingCheckInsCount = (nextBundle.pendingCheckIns || []).filter(pc => pc.isOverdue || pc.daysOverdue > 0).length;
      const overdueCount = ((nextBundle.stayData?.stays || []).length - nonOverdueStaysCount) +
        ((nextBundle.pendingBookings || []).length - nonOverduePendingBookingsCount) +
        overduePendingCheckInsCount;

      if (overdueCount > 0) {
        setViewMode('overdue');
      } else {
        setViewMode('active'); // fallback
      }
    }

    updateData(BUCKET, {
      stayData: nextBundle.stayData ?? null,
      pendingBookings: nextBundle.pendingBookings ?? [],
      pendingCheckIns: nextBundle.pendingCheckIns ?? [],
      historyData: nextBundle.historyData ?? [],
    });
  }, [myBookingsBundleQuery.data, updateData]);

  const loading = myBookingsBundleQuery.isLoading && !myBookingsBundleQuery.data;

  const tabs = useMemo(() => {
    const hasStays = (stayData?.stays || []).length > 0;
    const hasPending = (pendingBookings || []).length > 0 || (pendingCheckIns || []).length > 0;
    const overdueStays = (stayData?.stays || []).filter(s => s?.booking?.is_overdue || s?.booking?.isOverdue);
    const overduePendingBookings = (pendingBookings || []).filter(b => b?.is_overdue || b?.isOverdue);
    const overdueCheckIns = (pendingCheckIns || []).filter(pc => pc.isOverdue || pc.daysOverdue > 0);
    const hasAnyOverdue = overdueStays.length > 0 || overduePendingBookings.length > 0 || overdueCheckIns.length > 0;

    const list = [];
    if (hasStays || hasAnyOverdue) list.push({ id: 'active', label: 'Active', color: theme.colors.success });
    if (hasPending || hasAnyOverdue) list.push({ id: 'pending', label: 'Pending', color: '#F59E0B' });
    if (hasAnyOverdue) list.push({ id: 'overdue', label: 'Overdue', color: theme.colors.error });
    return list;
  }, [stayData, pendingBookings, pendingCheckIns, theme.colors.success, theme.colors.error]);

  useEffect(() => {
    if (tabs.length <= 1) return;

    const targetIndex = tabs.findIndex(tab => tab.id === viewMode);
    if (targetIndex !== -1) {
      Animated.spring(slideAnim, {
        toValue: targetIndex,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();
    }
  }, [viewMode, slideAnim, tabs]);


  useEffect(() => {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      return;
    }

    const activeStays = Array.isArray(stayData?.stays) ? stayData.stays : [];
    if (activeStays.length === 0) return;

    const maybeSendExtensionReminder = async () => {
      const { sendOneDayExtensionReminder } = await import('../../../../services/PushNotificationService.js');

      for (const stayEntry of activeStays) {
        const bookingEntry = stayEntry?.booking;
        if (!bookingEntry?.id) continue;

        const endDateRaw = bookingEntry.endDate || bookingEntry.end_date;
        const hasScheduledEndDate = Boolean(endDateRaw);
        const bookingContractMode = String(
          bookingEntry.contract_mode || bookingEntry.contractMode || '',
        ).toLowerCase();
        const hasMoveOutNotice = Boolean(bookingEntry.notice_given_at || bookingEntry.noticeGivenAt);

        const canRequestExtension =
          !(bookingContractMode === 'monthly' && !hasScheduledEndDate) &&
          hasScheduledEndDate &&
          !hasMoveOutNotice;
        if (!canRequestExtension) continue;

        let daysRemaining = Number(bookingEntry.daysRemaining ?? bookingEntry.days_remaining);
        if (!Number.isFinite(daysRemaining) && endDateRaw) {
          const endDate = new Date(endDateRaw);
          if (!Number.isNaN(endDate.getTime())) {
            endDate.setHours(0, 0, 0, 0);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        if (!Number.isFinite(daysRemaining) || Math.max(0, Math.ceil(daysRemaining)) !== 1) {
          continue;
        }

        await sendOneDayExtensionReminder({
          bookingId: bookingEntry.id,
          propertyTitle: stayEntry?.property?.title || stayEntry?.property_title || 'your property',
          endDate: formatIsoDate(endDateRaw) || String(endDateRaw),
        });
      }
    };

    maybeSendExtensionReminder();
  }, [stayData?.stays]);

  const getPropertySwitchOptions = () => {
    return viewMode === 'active'
      ? (Array.isArray(stayData?.stays) ? stayData.stays : [])
      : (Array.isArray(pendingBookings) ? pendingBookings : []);
  };

  const getPropertySwitchIndex = () => {
    return viewMode === 'active' ? selectedStayIndex : selectedPendingIndex;
  };

  const getPropertyOptionLabel = (item) => {
    const propertyName = item?.property?.title || item?.property_title || 'Property';
    const roomNumber =
      item?.room?.room_number ||
      item?.room?.roomNumber ||
      item?.room_number ||
      item?.roomNumber ||
      'N/A';

    return `${propertyName} (Room ${roomNumber})`;
  };

  const closePropertySwitchModal = () => {
    setShowPropertySwitchModal(false);
  };

  const selectPropertyFromModal = (index) => {
    if (viewMode === 'active') {
      setSelectedStayIndex(index);
    } else {
      setSelectedPendingIndex(index);
    }
    setShowPropertySwitchModal(false);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setReviewContext(null);
    setReviewRating(5);
    setReviewComment('');
    setSubmittingReview(false);
  };

  const closeMaintenanceModal = () => {
    setShowMaintenanceModal(false);
    setMaintenanceContext(null);
    setMaintenanceTitle('');
    setMaintenanceDescription('');
    setMaintenancePriority('medium');
    setMaintenanceImages([]);
    setSubmittingMaintenance(false);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setReportContext(null);
    setReportReason('');
    setReportDescription('');
    setSubmittingReport(false);
  };

  const closeAddonModal = () => {
    setShowAddonModal(false);
    setAddonContext(null);
    setAddonDraft(createDefaultAddonDraft());
    setAddonRequestingId(null);
    setSubmittingCustomAddon(false);
  };

  const normalizeSuggestedPrice = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    const numericValue = Number(raw);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return null;
    }

    return numericValue;
  };

  const openAddonModal = ({ booking, property, addons }) => {
    if (!booking?.id) {
      showAlert('Unavailable', 'Add-on request details are incomplete for this stay.');
      return;
    }

    const paymentStatus = String(booking.paymentStatus || booking.payment_status || '').toLowerCase();
    if (paymentStatus === 'refunded') {
      showAlert('Action Disabled', 'Add-on requests are disabled until your room payment is re-settled.');
      return;
    }

    setAddonContext({
      bookingId: booking.id,
      propertyId: property?.id || null,
      propertyTitle: property?.title || 'your current stay',
      availableAddons: Array.isArray(addons?.available) ? addons.available : [],
    });
    setAddonDraft(createDefaultAddonDraft());
    setAddonRequestingId(null);
    setSubmittingCustomAddon(false);
    setShowAddonModal(true);
  };

  const submitAddonRequest = async (payload, requestKey) => {
    if (!payload?.booking_id) {
      showAlert('Unavailable', 'Booking reference is missing for this add-on request.');
      return;
    }

    setAddonRequestingId(requestKey);
    if (requestKey === 'custom') {
      setSubmittingCustomAddon(true);
    }

    const result = await TenantService.requestAddon(payload);

    if (result.success) {
      showAlert('Request Submitted', 'Your add-on request was sent to the landlord for review.');
      closeAddonModal();
      invalidateData(BUCKET);
      await refetchMyBookingsBundle();
    } else {
      showAlert('Unable to Submit', result.error || 'Failed to request add-on.');
      setAddonRequestingId(null);
      setSubmittingCustomAddon(false);
    }
  };

  const submitCustomAddonRequest = async () => {
    if (!addonContext?.bookingId) {
      showAlert('Unavailable', 'Booking reference is missing for this add-on request.');
      return;
    }

    const addonName = addonDraft.name.trim();
    if (!addonName) {
      showAlert('Name Required', 'Please enter a name for your custom add-on request.');
      return;
    }

    const rawSuggestedPrice = String(addonDraft.suggested_price ?? '').trim();
    const normalizedSuggestedPrice = normalizeSuggestedPrice(rawSuggestedPrice);
    if (rawSuggestedPrice && normalizedSuggestedPrice === null) {
      showAlert('Invalid Suggested Price', 'Suggested price must be a non-negative number.');
      return;
    }

    const payload = {
      booking_id: addonContext.bookingId,
      is_custom: true,
      name: addonName,
      addon_type: addonDraft.addon_type,
      price_type: addonDraft.price_type,
      quantity: 1,
      note: addonDraft.note.trim() || null,
      ...(normalizedSuggestedPrice !== null ? { suggested_price: normalizedSuggestedPrice } : {}),
    };

    await submitAddonRequest(payload, 'custom');
  };

  const closeMoveOutModal = () => {
    setShowMoveOutModal(false);
    setMoveOutContext(null);
    setMoveOutDate(null);
    setMoveOutReason('');
    setShowMoveOutDatePicker(false);
    setSubmittingMoveOut(false);
  };

  const openReviewModal = ({ booking, property }) => {
    if (!booking?.id || !property?.id) {
      showAlert('Unavailable', 'Review details are incomplete for this booking.');
      return;
    }

    setReviewContext({ booking, property });
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const openMaintenanceModal = ({ booking, property, room }) => {
    if (!booking?.id) {
      showAlert('Unavailable', 'Maintenance request details are incomplete for this booking.');
      return;
    }

    const roomNumber = room?.roomNumber || room?.room_number || 'N/A';
    setMaintenanceContext({ booking, property, room });
    setMaintenanceTitle(`Room ${roomNumber} maintenance request`);
    setMaintenanceDescription('');
    setMaintenancePriority('medium');
    setMaintenanceImages([]);
    setShowMaintenanceModal(true);
  };

  const pickMaintenanceImages = async () => {
    if (maintenanceImages.length >= 5) {
      showAlert('Limit Reached', 'You can upload up to 5 photos only.');
      return;
    }

    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert('Permission Required', 'Please allow photo library access to attach maintenance images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsMultipleSelection: true,
      });

      if (result.canceled) return;

      const selectedAssets = result.assets || [];
      setMaintenanceImages((previous) => [...previous, ...selectedAssets].slice(0, 5));
    } catch (error) {
      console.error('Failed to pick maintenance images:', error);
      showAlert('Error', 'Unable to open your photo library.');
    }
  };

  const captureMaintenanceImage = async () => {
    if (maintenanceImages.length >= 5) {
      showAlert('Limit Reached', 'You can upload up to 5 photos only.');
      return;
    }

    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showAlert('Permission Required', 'Please allow camera access to take maintenance photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (result.canceled) return;

      const capturedAssets = result.assets || [];
      setMaintenanceImages((previous) => [...previous, ...capturedAssets].slice(0, 5));
    } catch (error) {
      console.error('Failed to capture maintenance image:', error);
      showAlert('Error', 'Unable to open camera.');
    }
  };

  const removeMaintenanceImage = (indexToRemove) => {
    setMaintenanceImages((previous) => previous.filter((_, index) => index !== indexToRemove));
  };

  const openReportModal = ({ booking, property }) => {
    if (!booking?.id || !property?.id) {
      showAlert('Unavailable', 'Report details are incomplete for this booking.');
      return;
    }

    setReportContext({ booking, property });
    setReportReason('');
    setReportDescription('');
    setShowReportModal(true);
  };

  const submitReviewModal = async () => {
    if (!reviewContext?.booking?.id || !reviewContext?.property?.id) {
      showAlert('Unavailable', 'Review details are incomplete.');
      return;
    }

    if (submittingReview) return;

    setSubmittingReview(true);
    const result = await TenantService.submitReview({
      booking_id: reviewContext.booking.id,
      property_id: reviewContext.property.id,
      rating: reviewRating,
      comment: reviewComment.trim(),
    });

    if (result.success) {
      showAlert('Thanks!', 'Your review has been submitted.');
      closeReviewModal();
      await refetchMyBookingsBundle();
    } else {
      showAlert('Error', result.error || 'Failed to submit review.');
      setSubmittingReview(false);
    }
  };

  const submitMaintenanceModal = async () => {
    if (!maintenanceContext?.booking?.id) {
      showAlert('Unavailable', 'Maintenance details are incomplete.');
      return;
    }

    if (!maintenanceTitle.trim()) {
      showAlert('Title Required', 'Please enter a maintenance title.');
      return;
    }

    if (!maintenanceDescription.trim()) {
      showAlert('Description Required', 'Please describe the issue.');
      return;
    }

    if (submittingMaintenance) return;

    setSubmittingMaintenance(true);
    let payload;
    let isMultipart = false;

    if (maintenanceImages.length > 0) {
      const formData = new FormData();
      formData.append('title', maintenanceTitle.trim());
      formData.append('description', maintenanceDescription.trim());
      formData.append('priority', maintenancePriority);
      formData.append('booking_id', String(maintenanceContext.booking.id));

      maintenanceImages.forEach((imageAsset, index) => {
        formData.append('images[]', {
          uri: imageAsset.uri,
          name: imageAsset.fileName || `maintenance_${index + 1}.jpg`,
          type: imageAsset.mimeType || 'image/jpeg',
        });
      });

      payload = formData;
      isMultipart = true;
    } else {
      payload = {
        title: maintenanceTitle.trim(),
        description: maintenanceDescription.trim(),
        priority: maintenancePriority,
        booking_id: maintenanceContext.booking.id,
      };
    }

    const result = await TenantService.submitMaintenanceRequest(payload, isMultipart);

    if (result.success) {
      showAlert('Request Sent', 'Your maintenance request was submitted to your landlord.');
      closeMaintenanceModal();
    } else {
      showAlert('Error', result.error || 'Failed to submit maintenance request.');
      setSubmittingMaintenance(false);
    }
  };

  const submitReportModal = async () => {
    if (!reportContext?.property?.id) {
      showAlert('Unavailable', 'Report details are incomplete.');
      return;
    }

    if (!reportReason) {
      showAlert('Selection Required', 'Please select a reason for your report.');
      return;
    }

    if (reportDescription.trim().length < 10) {
      showAlert('More Detail Needed', 'Please provide a description of at least 10 characters.');
      return;
    }

    if (submittingReport) return;

    setSubmittingReport(true);
    const result = await TenantService.submitReport({
      property_id: reportContext.property.id,
      reason: reportReason,
      description: reportDescription.trim(),
    });

    if (result.success) {
      showAlert('Report Submitted', 'Thank you. Admins will review this report shortly.');
      closeReportModal();
    } else {
      showAlert('Error', result.error || 'Failed to submit report.');
      setSubmittingReport(false);
    }
  };

  const submitMoveOutModal = async () => {
    if (!moveOutContext?.booking?.id) {
      showAlert('Unavailable', 'Move-out details are incomplete.');
      return;
    }

    if (!moveOutDate || Number.isNaN(moveOutDate.getTime())) {
      showAlert('Date Required', 'Please select your planned move-out date.');
      return;
    }

    const today = buildTodayDate();
    const plannedDate = new Date(moveOutDate);
    plannedDate.setHours(0, 0, 0, 0);
    if (plannedDate < today) {
      showAlert('Invalid Date', 'Move-out date must be today or later.');
      return;
    }

    if (submittingMoveOut) return;

    const submitMoveOutRequest = async () => {
      setSubmittingMoveOut(true);
      const result = await BookingService.requestMoveOut(moveOutContext.booking.id, {
        move_out_date: formatIsoDate(plannedDate),
        reason: moveOutReason.trim(),
      });

      if (result.success) {
        showAlert('Move-out Requested', 'Your move-out notice was sent to your landlord.');
        closeMoveOutModal();
        await refetchMyBookingsBundle();
      } else {
        showAlert('Request Failed', result.error || 'Failed to request move-out notice.');
        setSubmittingMoveOut(false);
      }
    };

    Alert.alert(
      'Confirm Move-out',
      'Send this move-out notice to your landlord?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: submitMoveOutRequest },
      ],
      { cancelable: true },
    );
  };

  const openCancelBookingModal = (booking) => {
    if (!booking?.id) return;
    setCancelBookingContext(booking);
    setShowCancelBookingModal(true);
  };

  const closeCancelBookingModal = () => {
    setShowCancelBookingModal(false);
    setCancelBookingContext(null);
  };

  const handleCancelBooking = async (bookingArg) => {
    const booking = bookingArg || cancelBookingContext;
    if (!booking?.id || cancellingBookingId) return;

    setCancellingBookingId(booking.id);
    const result = await BookingService.cancelBooking(booking.id, {
      reason: 'Tenant cancelled the booking',
    });

    if (result.success) {
      showAlert('Cancelled', 'Your booking request has been cancelled.');
      closeCancelBookingModal();
      await refetchMyBookingsBundle();
    } else {
      showAlert('Unable to Cancel', result.error || 'Failed to cancel booking request.');
    }

    setCancellingBookingId(null);
  };

  const handleRequestExtension = async (booking) => {
    if (!booking?.id || submittingExtension) return;

    const submitExtension = async (days) => {
      const currentEndRaw = booking.endDate || booking.end_date;
      if (!currentEndRaw) {
        showAlert('Extension Not Needed', 'This stay is open-ended monthly. You can submit a move-out notice anytime instead of extending.');
        return;
      }

      const currentEnd = new Date(currentEndRaw);
      if (Number.isNaN(currentEnd.getTime())) {
        showAlert('Request Failed', 'Could not determine your current move-out date.');
        return;
      }

      const requestedEnd = new Date(currentEnd);
      requestedEnd.setDate(requestedEnd.getDate() + days);

      setSubmittingExtension(true);
      const requestedEndDate = formatIsoDate(requestedEnd);
      if (!requestedEndDate) {
        showAlert('Request Failed', 'Could not determine a valid extension date.');
        setSubmittingExtension(false);
        return;
      }
      const result = await TenantService.requestExtension(booking.id, {
        extension_type: 'daily',
        requested_end_date: requestedEndDate,
      });

      if (result.success) {
        showAlert('Extension Requested', 'Your extension request was sent to your landlord.');
        await refetchMyBookingsBundle();
      } else {
        showAlert('Request Failed', result.error || 'Failed to request extension.');
      }
      setSubmittingExtension(false);
    };

    showAlert(
      'Request Extension',
      'Select extension duration',
      [
        { text: '7 Days', onPress: () => submitExtension(7) },
        { text: '30 Days', onPress: () => submitExtension(30) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRequestTransfer = async (booking, property) => {
    if (!booking?.id || submittingTransfer) return;

    const propertyId = property?.id || booking?.property_id;
    if (!propertyId) {
      showAlert('Request Failed', 'Could not identify the property for this transfer request.');
      return;
    }

    const existingPending = pendingTransferRequests.find(
      (item) => Number(item?.booking_id) === Number(booking.id),
    );
    if (existingPending) {
      showAlert('Transfer Pending', 'You already have a pending transfer request for this booking.');
      return;
    }

    const transferLimit = property?.transfer_limit ?? 3;
    if (monthlyTransferCount >= transferLimit) {
      const daysUntilReset = getDaysUntilTransferReset();
      showAlert(
        'Transfer Limit Reached',
        `Room transfers are limited to ${transferLimit} per month for this property. Try again in ${daysUntilReset} day${daysUntilReset === 1 ? '' : 's'}.`,
      );
      return;
    }

    setSubmittingTransfer(true);

    const optionsResult = await TenantService.getTransferOptions(booking.id, propertyId);
    if (!optionsResult.success) {
      showAlert('Request Failed', optionsResult.error || 'Failed to load transfer options.');
      setSubmittingTransfer(false);
      return;
    }

    const rooms = Array.isArray(optionsResult.data) ? optionsResult.data : [];
    if (rooms.length === 0) {
      showAlert(
        'No Eligible Rooms',
        optionsResult.message || 'No eligible transfer rooms are currently available for this property.',
      );
      setSubmittingTransfer(false);
      return;
    }

    setTransferRoomOptions(rooms);
    setSelectedTransferRoomId(rooms[0]?.id || null);
    setTransferReason('Requested via mobile app');
    setTransferOptionsMessage(optionsResult.message || 'Select a target room and provide your reason.');
    setTransferContext({
      bookingId: booking.id,
      propertyId,
      propertyTitle: property?.title || 'this property',
    });
    setShowTransferModal(true);
    setSubmittingTransfer(false);
  };

  const submitTransferRequest = async () => {
    if (!transferContext?.bookingId || !transferContext?.propertyId) {
      showAlert('Request Failed', 'Transfer context is incomplete. Please try again.');
      return;
    }

    if (!selectedTransferRoomId) {
      showAlert('Select a Room', 'Please choose a room to transfer into.');
      return;
    }

    const normalizedReason = transferReason.trim();
    if (!normalizedReason) {
      showAlert('Reason Required', 'Please provide a reason for transfer.');
      return;
    }

    if (leaseDurationPreference === 'new_lease' && !newEndDate) {
      showAlert('Date Required', 'Please select a new lease end date.');
      return;
    }

    setSubmittingTransfer(true);
    const transferPayload = {
      booking_id: transferContext.bookingId,
      property_id: transferContext.propertyId,
      requested_room_id: selectedTransferRoomId,
      reason: normalizedReason,
      refund_preference: refundPreference,
    };
    if (leaseDurationPreference === 'new_lease' && newEndDate) {
      transferPayload.new_end_date = formatIsoDate(newEndDate);
    }

    const result = await TenantService.requestTransfer(transferPayload);

    if (result.success) {
      showAlert('Transfer Requested', 'Your transfer request was sent to your landlord.');
      closeTransferModal();
      await refetchMyBookingsBundle();
    } else {
      showAlert('Request Failed', result.error || 'Failed to request transfer.');
    }
    setSubmittingTransfer(false);
  };

  const handleCancelTransferRequest = async (transferRequestId) => {
    if (!transferRequestId || cancellingTransferRequestId) return;

    setCancellingTransferRequestId(transferRequestId);
    const result = await TenantService.cancelTransferRequest(transferRequestId);

    if (result.success) {
      showAlert('Cancelled', result.message || 'Transfer request cancelled successfully.');
      await refetchMyBookingsBundle();
    } else {
      showAlert('Unable to Cancel', result.error || 'Failed to cancel transfer request.');
    }

    setCancellingTransferRequestId(null);
  };

  const handleRequestMoveOut = (booking, property, room) => {
    if (!booking?.id || submittingMoveOut) return;

    setMoveOutContext({ booking, property, room });
    setMoveOutDate(buildDefaultMoveOutDate(booking));
    setMoveOutReason('');
    setShowMoveOutDatePicker(false);
    setShowMoveOutModal(true);
  };

  const handleOpenRoomDetails = async (bookingEntry) => {
    if (openingRoomDetails) return;

    const propertyId = bookingEntry?.property?.id || bookingEntry?.property_id;
    const roomId = bookingEntry?.room?.id || bookingEntry?.room_id;

    if (!propertyId || !roomId) {
      showAlert('Unavailable', 'Room details are not available for this pending booking yet.');
      return;
    }

    setOpeningRoomDetails(true);
    try {
      const propertyResult = await PropertyService.getPublicProperty(propertyId);
      if (!propertyResult.success || !propertyResult.data) {
        showAlert('Unable to Load', propertyResult.error || 'Failed to load property details.');
        return;
      }

      const fullProperty = propertyResult.data;
      const fullRoom = (fullProperty.rooms || []).find((room) => String(room.id) === String(roomId));

      if (!fullRoom) {
        showAlert('Unavailable', 'This room is no longer listed for details.');
        return;
      }

      navigation.navigate('RoomDetails', {
        room: fullRoom,
        property: fullProperty,
        hideLayout: true,
      });
    } catch (error) {
      console.error('Error opening room details:', error);
      showAlert('Error', 'Failed to open room details. Please try again.');
    } finally {
      setOpeningRoomDetails(false);
    }
  };

  const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    const isDark = theme.isDark;
    if (s.includes('overdue')) return isDark ? '#f87171' : '#EF4444';
    if (s === 'transferred') return isDark ? '#818cf8' : '#6366f1';
    if (s.includes('confirm') || s.includes('active') || s.includes('complete')) return theme.colors.success; // Use success (green) for active
    if (s === 'reserved') return isDark ? '#2dd4bf' : '#0D9488';
    if (s === 'pending_reservation') return isDark ? '#fb923c' : '#EA580C';
    if (s === 'partial') return isDark ? '#60a5fa' : '#3B82F6'; // Blue
    if (s === 'unpaid') return isDark ? '#9ca3af' : '#6B7280'; // Gray
    if (s.includes('pending')) return isDark ? '#fbbf24' : '#F59E0B';
    if (s.includes('cancel') || s.includes('reject')) return isDark ? '#f87171' : '#EF4444';
    return theme.colors.textSecondary;
  };

  const getStatusLabel = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'pending_verification') return 'Awaiting Verification';
    if (s === 'reserved') return 'Reserved';
    if (s === 'partial') return 'Partially Paid';
    if (s === 'paid') return 'Paid';

    return s
      .split(/[_-]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  };

  // ==================== Sub-components for Tabs ====================

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => setActiveTab(tab.id)}
          style={[
            styles.tab,
            activeTab === tab.id && styles.activeTab
          ]}
        >
          <Ionicons
            name={tab.icon}
            size={18}
            color={activeTab === tab.id ? theme.colors.textInverse : theme.colors.textSecondary}
          />
          <Text style={[
            styles.tabText,
            activeTab === tab.id && styles.activeTabText
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCurrentStay = () => {
    const hasStays = (stayData?.stays || []).length > 0;
    const hasPending = (pendingBookings || []).length > 0 || (pendingCheckIns || []).length > 0;

    const nonOverdueStays = (stayData?.stays || []).filter(s => !(s?.booking?.is_overdue || s?.booking?.isOverdue));
    const nonOverduePendingBookings = (pendingBookings || []).filter(b => !(b?.is_overdue || b?.isOverdue));
    const nonOverdueCheckIns = (pendingCheckIns || []).filter(pc => !(pc.isOverdue || pc.daysOverdue > 0));

    const overdueStays = (stayData?.stays || []).filter(s => s?.booking?.is_overdue || s?.booking?.isOverdue);
    const overduePendingBookings = (pendingBookings || []).filter(b => b?.is_overdue || b?.isOverdue);
    const overdueCheckIns = (pendingCheckIns || []).filter(pc => pc.isOverdue || pc.daysOverdue > 0);

    const hasAnyOverdue = overdueStays.length > 0 || overduePendingBookings.length > 0 || overdueCheckIns.length > 0;

    const displayedStays = viewMode === 'overdue' ? overdueStays : (viewMode === 'active' ? nonOverdueStays : []);
    const displayedPendingBookings = viewMode === 'overdue' ? overduePendingBookings : (viewMode === 'pending' ? nonOverduePendingBookings : []);
    const displayedPendingCheckIns = viewMode === 'overdue' ? overdueCheckIns : (viewMode === 'pending' ? nonOverdueCheckIns : []);

    const hasAvailableStays = displayedStays.length > 0;

    const currentData = viewMode === 'active' || (viewMode === 'overdue' && hasAvailableStays)
      ? (displayedStays?.[selectedStayIndex] || displayedStays?.[0])
      : (displayedPendingBookings?.[selectedPendingIndex] || displayedPendingBookings?.[0]);

    // Check if filtered results are empty
    if (!hasStays && !hasPending && !stayData?.upcomingBooking) {
      return (
        <View style={styles.content}>
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Active Stay</Text>
            <Text style={styles.emptyText}>
              You don't have any active or pending bookings. Ready to find your next home?
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('TenantHome')}
            >
              <Text style={styles.primaryButtonText}>Explore Properties</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Empty state for filters
    if (viewMode === 'active' && !hasAvailableStays && (hasAnyOverdue || hasPending)) {
      return (
        <View style={styles.content}>
          {renderViewToggle()}
          <View style={[styles.emptyState, { marginTop: 40 }]}>
            <Ionicons name="home-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Active Stays</Text>
            <Text style={styles.emptyText}>
              Switch to Pending or Overdue to see other bookings.
            </Text>
          </View>
        </View>
      );
    }

    // Normalize data for display
    const isActuallyPending = viewMode === 'pending';
    const display = isActuallyPending ? {
      booking: {
        id: currentData?.id,
        startDate: currentData?.start_date,
        endDate: currentData?.end_date,
        bookingMode: currentData?.bookingMode || currentData?.booking_mode,
        booking_mode: currentData?.booking_mode || currentData?.bookingMode,
        bedCount: currentData?.bedCount || currentData?.bed_count,
        bed_count: currentData?.bed_count || currentData?.bedCount,
        occupantCount: currentData?.occupantCount || currentData?.occupant_count,
        occupant_count: currentData?.occupant_count || currentData?.occupantCount,
        monthlyRent: currentData?.monthly_rent,
        unit_price: currentData?.unit_price,
        contract_mode: currentData?.contract_mode,
        contractMode: currentData?.contract_mode,
        billing_policy: currentData?.billing_policy,
        reservation_policy: currentData?.reservation_policy,
        occupants: Array.isArray(currentData?.occupants) ? currentData.occupants : [],
        status: currentData?.status,
        paymentStatus: currentData?.status,
        daysStayed: 0,
        isPending: true
      },
      room: {
        roomNumber: currentData?.room?.room_number || currentData?.room_number || 'N/A',
        room_number: currentData?.room?.room_number || currentData?.room_number || 'N/A',
        capacity: currentData?.room?.capacity,
      },
      property: currentData?.property || {},
      landlord: currentData?.landlord || {},
      addons: { active: [], pending: [] }
    } : currentData;

    if (!display) return null;

    const { booking, room, property, landlord, addons } = display;
    const occupancySummary = resolveOccupancySummary(booking, room);
    const occupantProfiles = resolveOccupantProfiles(booking);
    const bookingMode = String(booking?.booking_mode || booking?.bookingMode || 'normal').toLowerCase();
    const shouldShowProxyOccupants = bookingMode === 'proxy' || occupantProfiles.length > 0;
    const reservationPolicy = currentData?.reservation_policy || booking?.reservation_policy;
    const bookingContractMode = String(booking.contract_mode || booking.contractMode || '').toLowerCase();
    const hasScheduledEndDate = Boolean(booking.endDate || booking.end_date);
    const canRequestExtension =
      !booking.isPending &&
      !(bookingContractMode === 'monthly' && !hasScheduledEndDate) &&
      hasScheduledEndDate &&
      !Boolean(booking.notice_given_at || booking.noticeGivenAt);
    const pendingTransferForBooking = pendingTransferRequests.find(
      (item) => Number(item?.booking_id) === Number(booking.id),
    );
    const transferLimit = property?.transfer_limit ?? 3;
    const transferLimitReached = monthlyTransferCount >= transferLimit;
    const daysUntilTransferReset = getDaysUntilTransferReset();
    const transferButtonDisabled = submittingTransfer || Boolean(pendingTransferForBooking) || transferLimitReached;
    const startDateRaw = booking.startDate || booking.start_date;
    const endDateRaw = booking.endDate || booking.end_date;
    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    const hasValidStartDate = startDate instanceof Date && !Number.isNaN(startDate.getTime());
    const hasCheckoutDate = Boolean(endDateRaw);
    const isMonthlyBilling = String(booking.billing_policy || booking.billingPolicy || 'monthly').toLowerCase() === 'monthly';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (hasValidStartDate) {
      startDate.setHours(0, 0, 0, 0);
    }

    const isFutureStart = hasValidStartDate ? startDate > today : false;
    const daysUntilStart = isFutureStart
      ? Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const daysStayed = Math.max(0, Math.floor(Number(booking.daysStayed || booking.days_stayed || 0)));
    const daysLeft = Math.max(0, Math.ceil(Number(booking.daysRemaining || booking.days_remaining || 0)));
    const stayDurationLabel = isFutureStart ? 'Starts In' : (hasCheckoutDate ? 'Days Left' : 'Days Stayed');
    const stayDurationValue = isFutureStart
      ? `${daysUntilStart} ${daysUntilStart === 1 ? 'Day' : 'Days'}`
      : `${hasCheckoutDate ? daysLeft : daysStayed} ${(hasCheckoutDate ? daysLeft : daysStayed) === 1 ? 'Day' : 'Days'}`;
    const pendingMoveInValue = hasValidStartDate ? formatDate(startDateRaw) : 'Move-in date awaiting approval';

    const paymentStatusRaw = String(
      booking.isOverdue || booking.is_overdue
        ? 'overdue'
        : (booking.paymentStatus || booking.payment_status || 'unpaid'),
    ).toLowerCase();
    const paymentStatusValue = paymentStatusRaw
      .split('_')
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
    const addonMonthlyTotal = Number(addons?.monthlyTotal ?? addons?.monthly_total ?? 0);
    const roomRentAmount = Number(
      booking.billing_policy === 'daily'
        ? (booking.unit_price || booking.daily_rate || booking.monthlyRent || booking.monthly_rent || 0)
        : (booking.monthlyRent || booking.monthly_rent || booking.unit_price || 0),
    );
    const totalCycleCharges = Math.max(0, roomRentAmount + addonMonthlyTotal);
    const currentCycleLabel = new Date().toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const invoiceList = Array.isArray(currentData?.financials?.invoices)
      ? currentData.financials.invoices
      : Array.isArray(booking?.financials?.invoices)
        ? booking.financials.invoices
        : [];

    const shouldUsePaymentCountdown = !booking.isPending && isMonthlyBilling && !hasCheckoutDate;
    const paymentCountdown = shouldUsePaymentCountdown
      ? resolveMonthlyPaymentCountdown(booking, invoiceList)
      : null;
    const durationSummaryLabel = booking.isPending
      ? 'Move-in Date'
      : (paymentCountdown?.label || stayDurationLabel);
    const durationSummaryValue = booking.isPending
      ? pendingMoveInValue
      : (paymentCountdown?.value || stayDurationValue);

    const totalPaidAmount = invoiceList.reduce((sum, invoice) => {
      const invoiceTransactions = Array.isArray(invoice?.transactions) ? invoice.transactions : [];
      const paidForInvoice = invoiceTransactions
        .filter((tx) => String(tx?.status || '').toLowerCase() === 'succeeded')
        .reduce((txSum, tx) => txSum + Number(tx?.amount || 0), 0);

      return sum + paidForInvoice;
    }, 0);

    const invoiceOutstandingAmount = invoiceList
      .filter((invoice) => ['pending', 'partial', 'overdue', 'unpaid'].includes(String(invoice?.status || '').toLowerCase()))
      .reduce((sum, invoice) => sum + Number(invoice?.amount || 0), 0);

    const remainingBalanceAmount = invoiceOutstandingAmount > 0
      ? invoiceOutstandingAmount
      : Math.max(0, totalCycleCharges - totalPaidAmount);

    const hasMoveOutNotice = Boolean(booking.notice_given_at || booking.noticeGivenAt);
    const isCurrentMonthPaidForMoveOut = !isMonthlyBilling || ['paid', 'settled', 'succeeded', 'verified', 'completed'].includes(paymentStatusRaw);
    const reviewAlreadySubmitted = Boolean(booking.hasReview || booking.has_review);

    const renderCheckInCard = (pc) => {
      const isOverdue = pc.isOverdue || Number(pc.daysOverdue) > 0;
      return (
        <View key={pc.id} style={[styles.bookingCard, { padding: 16, borderColor: isOverdue ? theme.colors.error : '#F59E0B', borderWidth: 1 }]}>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Ionicons
              name={isOverdue ? "alert-circle" : "calendar"}
              size={48}
              color={isOverdue ? theme.colors.error : '#F59E0B'}
            />
            <Text style={[styles.emptyTitle, { fontSize: 18, marginTop: 8 }]}>
              {isOverdue ? 'Check-in Overdue' : 'Check-in Pending'}
            </Text>
            <Text style={[styles.emptyText, { marginBottom: 12 }]}>
              {isOverdue
                ? 'Action required: finalize your move-in with the landlord.'
                : 'Your move-in date has arrived! Finalize your check-in with the landlord.'}
            </Text>
          </View>

          <View style={{
            backgroundColor: isOverdue ? (theme.isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2') : (theme.isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB'),
            padding: 16, borderRadius: 12, marginBottom: 16,
            borderWidth: 1, borderColor: isOverdue ? (theme.isDark ? '#ef4444' : '#FEE2E2') : (theme.isDark ? '#f59e0b' : '#FEF3C7')
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 8, padding: 8 }}>
                <Ionicons name="home" size={20} color={isOverdue ? theme.colors.error : '#F59E0B'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.colors.text }}>
                  {pc?.property?.title || pc?.property_title || String(pc?.property || 'Property')}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Room {pc.room || '—'}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  Scheduled start: {formatDate(pc.startDate)}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: isOverdue ? theme.colors.error : '#F59E0B', marginTop: 4, textTransform: 'uppercase' }}>
                  {Number(pc.daysOverdue) > 0
                    ? `${Math.max(0, Math.round(Number(pc.daysOverdue)))} day${Math.round(Number(pc.daysOverdue)) === 1 ? '' : 's'} overdue`
                    : (isOverdue ? 'Overdue' : 'Check-in Today')}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, minHeight: 40 }]}
              onPress={() => {
                const propertyId = pc?.property_id || pc?.propertyId || pc?.property?.id;
                if (propertyId) navigation.navigate('RoomDetails', { roomId: pc?.room_id, propertyId });
              }}
            >
              <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>Room Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.colors.error, minHeight: 40 }]}
              onPress={() => handleCancelBooking(pc)}
            >
              <Text style={styles.actionBtnText}>Cancel Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    };

    const renderPendingCard = (pb) => {
      return (
        <View key={pb.id} style={[styles.bookingCard, { padding: 16, borderColor: '#F59E0B', borderWidth: 1 }]}>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="time" size={48} color="#F59E0B" />
            <Text style={[styles.emptyTitle, { fontSize: 18, marginTop: 8 }]}>Booking Pending</Text>
            <Text style={[styles.emptyText, { marginBottom: 12 }]}>The landlord is reviewing your request.</Text>
          </View>

          <View style={{ backgroundColor: theme.isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB', padding: 16, borderRadius: 12, marginBottom: 16, borderColor: theme.isDark ? '#f59e0b' : '#FEF3C7', borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ backgroundColor: theme.colors.surface, padding: 8, borderRadius: 8 }}>
                <Ionicons name="home" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: theme.colors.text }}>{pb?.property_title || pb?.property?.title || 'Property'}</Text>
                <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>Room {pb?.room_number || pb?.room?.room_number || '—'}</Text>
                <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                  Move-in Date: {pb.start_date ? formatDate(pb.start_date) : 'Awaiting Approval'}
                </Text>
                <View style={{ marginTop: 8 }}>
                  <ReservationPolicyNotice policy={pb?.reservation_policy} theme={theme} marginBottom={0} />
                </View>
              </View>
            </View>

            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>  {/* <-- add flex: 1 so price doesn't bleed into button */}
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.colors.textTertiary, textTransform: 'uppercase' }}>
                  {pb?.billing_policy === 'daily' ? 'Daily' : 'Monthly'}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.text }} numberOfLines={1}>
                  {formatPesoNoCents(pb?.unit_price || pb?.monthly_rent || 0)}
                </Text>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: theme.colors.error, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minWidth: 80, alignItems: 'center' }}
                onPress={() => handleCancelBooking(pb)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, alignSelf: 'center', minHeight: 36, paddingHorizontal: 20 }]}
            onPress={() => {
              const propertyId = pb?.property_id || pb?.property?.id;
              if (propertyId) navigation.navigate('RoomDetails', { roomId: pb?.room?.id, propertyId });
            }}
          >
            <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>View Room Details</Text>
          </TouchableOpacity>
        </View>
      );
    };

    const translateX = tabs.length > 1
      ? slideAnim.interpolate({
        inputRange: tabs.map((_, i) => i),
        outputRange: tabs.map((_, i) => i * ((viewportWidth - 40) / tabs.length)),
      })
      : 0;

    const renderViewToggle = () => {
      if (tabs.length <= 1) return null;

      const activeIndicatorColor =
        viewMode === 'active' ? theme.colors.success :
          viewMode === 'pending' ? '#F59E0B' :
            theme.colors.error;

      return (
        <View style={{
          backgroundColor: theme.colors.backgroundTertiary,
          borderRadius: 12,
          padding: 4,
          marginBottom: 20,
          flexDirection: 'row',
          position: 'relative',
          height: 48
        }}>
          <Animated.View
            style={{
              width: (viewportWidth - 40) / tabs.length,
              backgroundColor: activeIndicatorColor,
              transform: [{ translateX }],
              borderRadius: 8,
              position: 'absolute',
              top: 4,
              bottom: 4,
              left: 4,
              shadowColor: activeIndicatorColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3
            }}
          />
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
              onPress={() => setViewMode(tab.id)}
            >
              <Text style={{
                fontWeight: '700',
                fontSize: 13,
                color: viewMode === tab.id ? '#fff' : theme.colors.textSecondary
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    };

    const showActiveView = viewMode === 'active' || viewMode === 'overdue';
    const showPendingView = viewMode === 'pending' || viewMode === 'overdue';

    return (
      <View style={styles.content}>
        {renderViewToggle()}

        {showPendingView && displayedPendingCheckIns.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            {displayedPendingCheckIns.map(pc => renderCheckInCard(pc))}
          </View>
        )}

        {showPendingView && displayedPendingBookings.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            {displayedPendingBookings.map(pb => renderPendingCard(pb))}
          </View>
        )}

        {showPendingView && displayedPendingCheckIns.length === 0 && displayedPendingBookings.length === 0 && viewMode === 'pending' && (
          <View style={[styles.emptyState, { marginTop: 40 }]}>
            <Ionicons name="time-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Pending Bookings</Text>
            <Text style={styles.emptyText}>You don't have any requests awaiting approval.</Text>
          </View>
        )}

        {showActiveView && hasAvailableStays && (
          <>
            {/* Property Selector */}
            {displayedStays.length > 1 && (
              <View style={[styles.selectorContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
                <View style={styles.selectorInfo}>
                  <View style={[styles.selectorIcon, { backgroundColor: theme.colors.primaryLight }]}>
                    <Ionicons name="business" size={20} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Switch Property</Text>
                    <Text style={[styles.selectorSublabel, { color: theme.colors.textSecondary }]}>
                      {displayedStays.length} stays available
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.selectorDropdown, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}
                  onPress={() => {
                    setShowPropertySwitchModal(true);
                  }}
                >
                  <Text style={[styles.selectorValue, { color: theme.colors.text }]} numberOfLines={1}>
                    {property.title || property.property_title || 'Select'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Refund Warning */}
        {booking.paymentStatus === 'refunded' && (
          <View style={[styles.warningBanner, { backgroundColor: theme.isDark ? 'rgba(126,34,206,0.1)' : '#F3E8FF', borderColor: theme.isDark ? '#7E22CE' : '#E9D5FF', borderWidth: 1 }]}>
            <Ionicons name="alert-circle" size={24} color={theme.isDark ? '#a855f7' : '#7E22CE'} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.warningTitle, { color: theme.isDark ? '#a855f7' : '#7E22CE' }]}>Payment Action Required</Text>
              <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
                Your last payment was refunded. Please complete a new payment to maintain your active status.
              </Text>
            </View>
          </View>
        )}

        {showActiveView && hasAvailableStays && (
          <View style={[styles.bookingCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
            <View style={{ position: 'relative' }}>
              <Image
                source={getImageUrl(property?.image)}
                style={styles.bookingImage}
              />
              {!booking.isPending && (
                <View style={{ position: 'absolute', top: 12, right: 12 }}>
                  <EllipsisMenu
                    booking={booking}
                    property={property}
                    room={room}
                    reviewAlreadySubmitted={reviewAlreadySubmitted}
                    onReview={() => openReviewModal({ booking, property })}
                    onMaintenance={() => openMaintenanceModal({ booking, property, room })}
                    onReport={() => openReportModal({ booking, property })}
                    theme={theme}
                  />
                </View>
              )}
            </View>
            <View style={styles.bookingInfo}>
              <View style={styles.bookingHeader}>
                <Text style={[styles.bookingName, { color: theme.colors.text }]}>{property?.title || 'Property Name'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.isOverdue || booking.is_overdue ? 'overdue' : booking.status)}15` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(booking.isOverdue || booking.is_overdue ? 'overdue' : booking.status) }]}>
                    {booking.isOverdue || booking.is_overdue ? 'Overdue' : getStatusLabel(booking.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>{property?.address || property?.full_address || 'Address not available'}</Text>
              </View>

              <View style={styles.financialSummaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Room</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{room.roomNumber || room.room_number}</Text>
                </View>
                {shouldShowProxyOccupants && (
                  <View style={[styles.summaryCard, { backgroundColor: theme.colors.backgroundSecondary }]}>
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{occupancySummary.label}</Text>
                    <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{occupancySummary.value}</Text>
                  </View>
                )}
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                    {booking.billing_policy === 'daily' ? 'Daily Rent' : 'Monthly Rent'}
                  </Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                    {formatPesoNoCents(booking.unit_price || booking.monthlyRent)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{durationSummaryLabel}</Text>
                  {paymentCountdown?.tinyValue ? (
                    <View style={styles.summaryValueRow}>
                      <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{durationSummaryValue}</Text>
                      <Text style={[styles.summaryValueTiny, { color: theme.colors.textTertiary }]}>{paymentCountdown.tinyValue}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{durationSummaryValue}</Text>
                  )}
                </View>
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Payment Status</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{paymentStatusValue}</Text>
                </View>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />

              {shouldShowProxyOccupants && (
                <View style={styles.proxyOccupantsSection}>
                  <View style={styles.proxyOccupantsHeader}>
                    <Ionicons name="people-outline" size={16} color={theme.colors.primary} />
                    <Text style={[styles.proxyOccupantsTitle, { color: theme.colors.text }]}>Proxy Occupants</Text>
                  </View>

                  {occupantProfiles.length > 0 ? (
                    occupantProfiles.map((occupant) => (
                      <View key={occupant.id} style={[styles.proxyOccupantCard, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border, borderWidth: 1 }]}>
                        <Text style={[styles.proxyOccupantName, { color: theme.colors.text }]}>{occupant.fullName}</Text>
                        {(occupant.relationship || occupant.sex) ? (
                          <Text style={[styles.proxyOccupantMeta, { color: theme.colors.textSecondary }]}>
                            {[occupant.relationship, occupant.sex].filter(Boolean).join(' • ')}
                          </Text>
                        ) : null}
                        {occupant.contact ? (
                          <Text style={[styles.proxyOccupantMeta, { color: theme.colors.textSecondary }]}>{occupant.contact}</Text>
                        ) : null}
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.proxyOccupantsEmpty, { color: theme.colors.textTertiary }]}>Occupant details are still syncing for this proxy booking.</Text>
                  )}
                </View>
              )}

              {!booking.isPending && (
                <View style={styles.actionGridContainer}>
                  <View style={styles.actionRow}>
                    {!hasMoveOutNotice ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: (!isCurrentMonthPaidForMoveOut || submittingMoveOut) ? theme.colors.textTertiary : (theme.isDark ? '#3730a3' : '#4F46E5') }]}
                        disabled={submittingMoveOut || !isCurrentMonthPaidForMoveOut}
                        onPress={() => handleRequestMoveOut(booking, property, room)}
                      >
                        <Text style={styles.actionBtnText}>
                          {submittingMoveOut ? 'Submitting...' : 'Move-out'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.actionBtnPlaceholder} />
                    )}

                    {canRequestExtension ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: submittingExtension ? theme.colors.textTertiary : (theme.isDark ? '#1d4ed8' : '#2563EB') }]}
                        disabled={submittingExtension}
                        onPress={() => handleRequestExtension(booking)}
                      >
                        <Text style={styles.actionBtnText}>Extend</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.actionBtnPlaceholder} />
                    )}
                  </View>

                  {hasMoveOutNotice && (
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: theme.isDark ? 'rgba(13,148,136,0.1)' : '#F0FDFA',
                        borderWidth: 1,
                        borderColor: theme.isDark ? '#0D9488' : '#99F6E4',
                      }}
                    >
                      <Ionicons name="exit-outline" size={14} color={theme.isDark ? '#2dd4bf' : '#0D9488'} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.isDark ? '#2dd4bf' : '#0D9488' }}>
                        Notice Submitted
                      </Text>
                    </View>
                  )}

                  {!hasMoveOutNotice && !isCurrentMonthPaidForMoveOut && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary }}>
                        Move-out is available only when current month status is Paid.
                      </Text>
                    </View>
                  )}

                  {/* Transfer section - separate row */}
                  <View style={{ marginTop: hasMoveOutNotice ? 8 : 12 }}>
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginBottom: 8 }}>
                      Transfers this month: {monthlyTransferCount}/2
                      {transferLimitReached ? ` (available again in ${daysUntilTransferReset} day${daysUntilTransferReset === 1 ? '' : 's'})` : ''}
                    </Text>

                    {pendingTransferForBooking ? (
                      <TouchableOpacity
                        style={[styles.reviewBtn, { backgroundColor: theme.isDark ? '#991b1b' : '#DC2626', marginTop: 0 }]}
                        disabled={cancellingTransferRequestId === pendingTransferForBooking.id}
                        onPress={() => handleCancelTransferRequest(pendingTransferForBooking.id)}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                          {cancellingTransferRequestId === pendingTransferForBooking.id ? 'Cancelling...' : 'Cancel Pending Transfer'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.reviewBtn, {
                          backgroundColor: transferButtonDisabled ? theme.colors.textTertiary : (theme.isDark ? '#6d28d9' : '#7C3AED'),
                          marginTop: 0
                        }]}
                        disabled={transferButtonDisabled}
                        onPress={() => handleRequestTransfer(booking, property)}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                          {transferLimitReached
                            ? 'Transfer Limit Reached'
                            : submittingTransfer
                              ? 'Loading...'
                              : 'Request Room Transfer'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Move-out notice detail banner */}
              {!booking.isPending && (booking.notice_given_at || booking.noticeGivenAt) && (
                <View style={{ backgroundColor: theme.isDark ? 'rgba(13,148,136,0.1)' : '#F0FDFA', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.isDark ? '#0D9488' : '#99F6E4' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                    <Ionicons name="exit-outline" size={18} color={theme.isDark ? '#2dd4bf' : '#0D9488'} />
                    <Text style={{ color: theme.isDark ? '#2dd4bf' : '#0D9488', fontWeight: '700', fontSize: 13 }}>Move-out Notice Pending</Text>
                  </View>
                  <Text style={{ color: theme.isDark ? '#99f6e4' : '#134E4A', fontSize: 12, lineHeight: 18 }}>
                    Your move-out notice was submitted.{booking.endDate ? ` Planned departure: ${formatDate(booking.endDate)}.` : ''} The landlord will confirm your checkout and finalize billing.
                  </Text>
                </View>
              )}

              {/* Reservation Status Banners (GCash flow) */}
              {booking.isPending && booking.status === 'pending_reservation' && (
                <View style={{ backgroundColor: theme.isDark ? 'rgba(234,88,12,0.1)' : '#FFF7ED', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.isDark ? '#EA580C' : '#FED7AA' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                    <Ionicons name="hourglass-outline" size={18} color={theme.isDark ? '#fb923c' : '#EA580C'} />
                    <Text style={{ color: theme.isDark ? '#fb923c' : '#EA580C', fontWeight: '700', fontSize: 13 }}>Receipt Verification Pending</Text>
                  </View>
                  <Text style={{ color: theme.isDark ? '#fdba74' : '#7C2D12', fontSize: 12, lineHeight: 18 }}>
                    Your GCash receipt was auto-approved securely. The landlord will confirm your reservation shortly.
                  </Text>
                  {(currentData?.move_in_date || currentData?.start_date) && (
                    <Text style={{ color: theme.isDark ? '#fb923c' : '#9A3412', fontSize: 12, fontWeight: '600', marginTop: 6 }}>
                      Move-in: {new Date(currentData.move_in_date || currentData.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  )}
                  {currentData?.reference_number && (
                    <View style={{ marginTop: 10, backgroundColor: theme.isDark ? 'rgba(255,237,213,0.1)' : '#FFEDD5', borderRadius: 8, padding: 8 }}>
                      <Text style={{ color: theme.isDark ? '#fdba74' : '#9A3412', fontSize: 11, fontWeight: '600' }}>Reference #: {currentData.reference_number}</Text>
                    </View>
                  )}
                </View>
              )}

              {booking.isPending && booking.status === 'reserved' && (
                <View style={{ backgroundColor: theme.isDark ? 'rgba(13,148,136,0.1)' : '#F0FDFA', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.isDark ? '#0D9488' : '#99F6E4' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={theme.isDark ? '#2dd4bf' : '#0D9488'} />
                    <Text style={{ color: theme.isDark ? '#2dd4bf' : '#0D9488', fontWeight: '700', fontSize: 13 }}>Room Reserved!</Text>
                  </View>
                  <Text style={{ color: theme.isDark ? '#99f6e4' : '#134E4A', fontSize: 12, lineHeight: 18 }}>
                    Your reservation is confirmed. The landlord will check you in on your move-in date.
                  </Text>
                  {(currentData?.move_in_date || currentData?.start_date) && (
                    <Text style={{ color: theme.isDark ? '#2dd4bf' : '#0F766E', fontSize: 12, fontWeight: '600', marginTop: 6 }}>
                      Move-in: {new Date(currentData.move_in_date || currentData.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  )}
                </View>
              )}

              {booking.isPending && (
                <ReservationPolicyNotice policy={reservationPolicy} theme={theme} />
              )}

              {booking.isPending && (
                <View style={[styles.reviewBtnContainer, { gap: 16 }]}>
                  {(booking.status === 'pending_reservation' || booking.status === 'reserved') ? (
                    <>
                      <TouchableOpacity
                        style={[styles.reviewBtn, { backgroundColor: theme.isDark ? '#1d4ed8' : '#2563EB' }]}
                        onPress={() => handleOpenRoomDetails(currentData)}
                        disabled={openingRoomDetails}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                          {openingRoomDetails ? 'Opening...' : 'Room Details'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reviewBtn, { backgroundColor: theme.isDark ? '#991b1b' : '#DC2626' }]}
                        onPress={() => {
                          showAlert(
                            'Report an Issue',
                            'What issue are you experiencing?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Fake / Incorrect Receipt',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await TenantService.reportDispute(booking.id, 'Tenant reported a fake or incorrect receipt.', 'fake_receipt');
                                    showAlert('Report Submitted', 'Our admin team will review your report.');
                                  } catch { showAlert('Error', 'Failed to submit report.'); }
                                }
                              },
                              {
                                text: 'Other Problem',
                                onPress: async () => {
                                  try {
                                    await TenantService.reportDispute(booking.id, 'Tenant reported an issue with this reservation.');
                                    showAlert('Report Submitted', 'Our admin team will review your report.');
                                  } catch { showAlert('Error', 'Failed to submit report.'); }
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Report Issue</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.reviewBtn, { backgroundColor: theme.isDark ? '#1d4ed8' : '#2563EB' }]}
                        onPress={() => handleOpenRoomDetails(currentData)}
                        disabled={openingRoomDetails}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                          {openingRoomDetails ? 'Opening...' : 'Room Details'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reviewBtn, { backgroundColor: theme.colors.error }]}
                        onPress={() => openCancelBookingModal(booking)}
                        disabled={cancellingBookingId === booking.id}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                          {cancellingBookingId === booking.id ? 'Cancelling...' : 'Cancel Request'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Addons Section */}
        {showActiveView && hasAvailableStays && (
          <>
            {/* Addons Section */}
            <View style={styles.addonSection}>
              <View style={styles.addonHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Add-ons & Extras</Text>
                {!booking.isPending && (
                  <TouchableOpacity
                    style={[
                      styles.stayHeaderBtn,
                      {
                        marginTop: 0, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8,
                        backgroundColor: booking.paymentStatus === 'refunded' ? theme.colors.textTertiary : theme.colors.primary
                      }
                    ]}
                    disabled={booking.paymentStatus === 'refunded'}
                    onPress={() => openAddonModal({ booking, property, addons })}
                  >
                    <Text style={styles.stayHeaderBtnText}>+ Request</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!booking.isPending ? (
                (addons.active?.length > 0 || addons.pending?.length > 0) ? (
                  <>
                    {addons.active?.map((addon, idx) => (
                      <View key={`active-${idx}`} style={[styles.addonItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
                        <View style={styles.addonInfo}>
                          <View style={[styles.addonIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                            <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
                          </View>
                          <View>
                            <Text style={[styles.addonName, { color: theme.colors.text }]}>{addon.name}</Text>
                            <Text style={[styles.addonSubtext, { color: theme.colors.textSecondary }]}>{addon.priceTypeLabel}</Text>
                          </View>
                        </View>
                        <Text style={[styles.addonPrice, { color: theme.colors.text }]}>{formatCurrency(resolveAddonDisplayPrice(addon))}</Text>
                      </View>
                    ))}
                    {addons.pending?.map((addon, idx) => (
                      <View key={`pending-${idx}`} style={[styles.addonItem, { backgroundColor: theme.isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB', borderColor: theme.isDark ? '#fbbf24' : '#FEF3C7', borderWidth: 1 }]}>
                        <View style={styles.addonInfo}>
                          <View style={[styles.addonIconContainer, { backgroundColor: theme.isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7' }]}>
                            <Ionicons name="time" size={20} color={theme.isDark ? '#fbbf24' : '#D97706'} />
                          </View>
                          <View>
                            <Text style={[styles.addonName, { color: theme.colors.text }]}>{addon.name}</Text>
                            <Text style={[styles.addonSubtext, { color: theme.isDark ? '#fbbf24' : '#D97706' }]}>Pending Approval</Text>
                          </View>
                        </View>
                        <Text style={[styles.addonPrice, { color: theme.colors.text }]}>{formatCurrency(resolveAddonDisplayPrice(addon))}</Text>
                      </View>
                    ))}
                  </>
                ) : (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Ionicons name="sparkles-outline" size={32} color={theme.colors.textTertiary} style={{ opacity: 0.5 }} />
                    <Text style={{ color: theme.colors.textTertiary, fontSize: 13, marginTop: 8 }}>No add-ons requested yet.</Text>
                  </View>
                )
              ) : (
                <View style={{ paddingVertical: 24, alignItems: 'center', backgroundColor: theme.colors.backgroundSecondary, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.border }}>
                  <Ionicons name="time-outline" size={32} color={theme.isDark ? '#fbbf24' : '#D97706'} style={{ opacity: 0.7 }} />
                  <Text style={{ color: theme.isDark ? '#fbbf24' : '#D97706', fontSize: 13, fontWeight: '700', marginTop: 8 }}>Booking Under Review</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 8, textAlign: 'center', paddingHorizontal: 16 }}>
                    Add-ons will be available once your booking is confirmed.
                  </Text>
                </View>
              )}
            </View>

            {!booking.isPending && (
              <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="wallet-outline" size={20} color={theme.colors.primary} />
                  <View>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Payment Summary</Text>
                    <Text style={[styles.paymentSummaryCycleText, { color: theme.colors.textTertiary }]}>{currentCycleLabel}</Text>
                  </View>
                </View>

                <View style={styles.paymentSummaryContent}>
                  <View style={styles.paymentSummaryRow}>
                    <Text style={[styles.paymentSummaryLabel, { color: theme.colors.textSecondary }]}>Total Charges (Rent & Add-ons)</Text>
                    <Text style={[styles.paymentSummaryValue, { color: theme.colors.text }]}>{formatPesoNoCents(totalCycleCharges)}</Text>
                  </View>
                  <View style={styles.paymentSummaryRow}>
                    <Text style={[styles.paymentSummaryLabel, { color: theme.colors.textSecondary }]}>Total Paid Amount</Text>
                    <Text style={[styles.paymentSummaryValue, { color: theme.colors.success }]}>-{formatPesoNoCents(totalPaidAmount)}</Text>
                  </View>

                  <View style={[styles.paymentSummaryDivider, { borderTopColor: theme.colors.border }]}>
                    <View style={styles.paymentSummaryRow}>
                      <Text style={[styles.paymentSummaryTotalLabel, { color: theme.colors.text }]}>Remaining Balance</Text>
                      <Text
                        style={[
                          styles.paymentSummaryTotalValue,
                          { color: remainingBalanceAmount > 0 ? theme.colors.error : theme.colors.success },
                        ]}
                      >
                        {formatPesoNoCents(remainingBalanceAmount)}
                      </Text>
                    </View>

                    {remainingBalanceAmount > 0 ? (
                      <TouchableOpacity
                        style={[styles.paymentSummaryButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => navigation.navigate('Payments')}
                      >
                        <Text style={styles.paymentSummaryButtonText}>Make a Payment</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.paymentSummarySettledBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                        <Text style={styles.paymentSummarySettledText}>You are all caught up!</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Landlord Contact */}
            <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Property Manager</Text>
              </View>
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={[styles.avatarSmall, { backgroundColor: theme.colors.primaryLight }]}>
                    <Text style={[styles.avatarSmallText, { color: theme.colors.primary }]}>
                      {landlord?.name?.charAt(0) || landlord?.first_name?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.managerName, { color: theme.colors.text }]}>{landlord?.name || `${landlord?.first_name} ${landlord?.last_name}`}</Text>
                    <Text style={[styles.managerEmail, { color: theme.colors.textSecondary }]}>{landlord?.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={{ padding: 8, backgroundColor: theme.colors.backgroundSecondary, borderRadius: 8 }}
                    onPress={() => navigation.navigate('Messages', {
                      startConversation: true,
                      recipient: landlord?.id ? { id: landlord.id } : null,
                      property: property?.id ? { id: property.id } : null,
                    })}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderHistory = () => {
    if (loading) return <BookingCardSkeleton />;

    if (flattenedHistory.length === 0) {
      return (
        <View style={styles.content}>
          <View style={styles.emptyHistoryCard}>
            <Ionicons name="time-outline" size={64} color={theme.colors.textTertiary} style={styles.emptyHistoryIcon} />
            <Text style={[styles.emptyTitle, styles.emptyHistoryTitle, { color: theme.colors.text }]}>No Past Stays</Text>
            <Text style={[styles.emptyText, styles.emptyHistoryText, { color: theme.colors.textSecondary }]}>
              Your completed and past bookings will appear here.
            </Text>
          </View>
        </View>
      );
    }

    const formatDateTime = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const getTimelineColor = (status) => {
      const s = String(status || '').toLowerCase();
      if (s.includes('pending')) return '#F59E0B';
      if (s.includes('confirm')) return theme.colors.primary;
      if (s.includes('paid')) return '#3B82F6';
      if (s.includes('cancel') || s.includes('reject')) return '#EF4444';
      return '#9CA3AF';
    };

    return (
      <View style={styles.content}>
        {flattenedHistory.map((booking) => (
          <TouchableOpacity
            key={booking.id}
            style={[styles.bookingCard, styles.historyItemCard]}
            onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id, propertyId: booking.property?.id || booking.property_id })}
          >
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                <Image source={getImageUrl(booking.property?.image || booking.property_image)} style={styles.historyItemImage} />
                <View style={styles.historyItemContent}>
                  <Text style={[styles.bookingName, styles.historyItemName, { color: theme.colors.text }]}>
                    {booking.property?.title || booking.property_title || 'Past Stay'}
                  </Text>
                  <Text style={[styles.historyItemDate, { color: theme.colors.textSecondary }]}>
                    {formatDate(booking.period?.startDate || booking.start_date)} - {formatDate(booking.period?.endDate || booking.end_date)}
                  </Text>
                  <View style={[styles.statusBadge, styles.historyItemBadge, { backgroundColor: `${getStatusColor(booking.isOverdue || booking.is_overdue ? 'overdue' : booking.status)}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(booking.isOverdue || booking.is_overdue ? 'overdue' : booking.status), fontSize: 10 }]}>
                      {booking.isOverdue || booking.is_overdue ? 'Overdue' : getStatusLabel(booking.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyItemRight}>
                  <Text style={{ fontSize: 11, color: theme.colors.textTertiary, textTransform: 'uppercase', fontWeight: 'bold' }}>Total Paid</Text>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.colors.primary, marginTop: 2 }}>
                    {formatCurrency(booking.financials?.totalPaid || booking.amount)}
                  </Text>
                </View>
              </View>

              {String(booking.status || '').toLowerCase() === 'cancelled' && (booking.cancellation_reason || booking.cancellationReason) && (
                <View
                  style={{
                    marginBottom: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.isDark ? 'rgba(248,113,113,0.35)' : '#FECACA',
                    backgroundColor: theme.isDark ? 'rgba(127,29,29,0.25)' : '#FEF2F2',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: theme.isDark ? '#FCA5A5' : '#B91C1C',
                      marginBottom: 4,
                    }}
                  >
                    Cancellation / Eviction Reason
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: theme.isDark ? '#FECACA' : '#7F1D1D',
                    }}
                  >
                    {booking.cancellation_reason || booking.cancellationReason}
                  </Text>
                </View>
              )}

              <ReservationPolicyNotice
                policy={booking?.reservation_policy}
                theme={theme}
                marginBottom={16}
              />

              {/* Review Button for History */}
              {['completed', 'confirmed'].includes(booking.status?.toLowerCase()) && !booking.has_review && !booking.hasReview && (
                <TouchableOpacity
                  style={[styles.reviewBtn, { backgroundColor: theme.colors.primary, marginTop: 0, marginBottom: 16, width: '100%' }]}
                  onPress={() => navigation.navigate('LeaveReview', { bookingId: booking.id, propertyId: booking.property?.id || booking.property_id })}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Leave a Review</Text>
                </TouchableOpacity>
              )}

              {/* Activity Timeline */}
              {booking.activityLog && booking.activityLog.length > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.colors.textTertiary, textTransform: 'uppercase', marginBottom: 16 }}>Activity Timeline</Text>
                  <View style={{ paddingLeft: 8 }}>
                    {(booking.activityLog || []).map((activity, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', marginBottom: 16, position: 'relative' }}>
                        {idx < (booking.activityLog.length - 1) && (
                          <View style={{ position: 'absolute', left: 8, top: 16, bottom: -12, width: 1, backgroundColor: theme.colors.border }} />
                        )}
                        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: getTimelineColor(activity.status), marginTop: 8, marginRight: 16, zIndex: 1, borderWidth: 2, borderColor: theme.colors.surface }} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.colors.text }}>{activity.action}</Text>
                            <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>{formatDateTime(activity.timestamp)}</Text>
                          </View>
                          <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>{activity.description}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderTabs()}

      {loading && !refreshing ? (
        <View style={styles.content}>
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {activeTab === 'current' ? (
            <ScrollView
              style={{ flex: 1 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
            >
              {renderCurrentStay()}
            </ScrollView>
          ) : (
            renderHistory()
          )}
        </View>
      )}

      <Modal
        visible={showPropertySwitchModal}
        transparent
        animationType="fade"
        onRequestClose={closePropertySwitchModal}
        statusBarTranslucent
        navigationBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View style={styles.propertySwitchModalOverlay}>
          <TouchableOpacity
            style={styles.propertySwitchModalBackdrop}
            activeOpacity={1}
            onPress={closePropertySwitchModal}
          />

          <View style={styles.propertySwitchModalCard}>
            <Text style={styles.propertySwitchModalTitle}>Switch Property</Text>
            <Text style={styles.propertySwitchModalMessage}>Choose a property to view details.</Text>

            <ScrollView
              style={styles.propertySwitchOptionsScroll}
              contentContainerStyle={styles.propertySwitchOptionsContent}
              showsVerticalScrollIndicator={false}
            >
              {getPropertySwitchOptions().map((item, index) => {
                const isSelected = index === getPropertySwitchIndex();
                return (
                  <TouchableOpacity
                    key={`property-switch-${item?.id || index}`}
                    style={[
                      styles.propertySwitchOptionButton,
                      isSelected && styles.propertySwitchOptionButtonActive,
                    ]}
                    onPress={() => selectPropertyFromModal(index)}
                  >
                    <View style={styles.propertySwitchOptionTextWrap}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.propertySwitchOptionText,
                          isSelected && styles.propertySwitchOptionTextActive,
                        ]}
                      >
                        {getPropertyOptionLabel(item)}
                      </Text>
                      <Text style={styles.propertySwitchOptionSubText}>
                        {isSelected ? 'Currently selected' : 'Tap to switch'}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.propertySwitchModalActions}>
              <TouchableOpacity
                style={[styles.propertySwitchModalButton, styles.propertySwitchModalCancelButton]}
                onPress={closePropertySwitchModal}
              >
                <Text style={styles.propertySwitchModalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddonModal}
        animationType="fade"
        transparent
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={closeAddonModal}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          paddingHorizontal: 16,
        }}>
          <View style={{
            maxHeight: '95%',
            borderRadius: 14,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: 'hidden',
          }}>
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>
                  Request Add-on
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                  {addonContext?.propertyTitle ? `For ${addonContext.propertyTitle}` : 'For your current stay'}
                </Text>
              </View>
              <TouchableOpacity onPress={closeAddonModal} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: undefined }} contentContainerStyle={{ padding: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 10 }}>
                Standard Add-ons
              </Text>

              {!Array.isArray(addonContext?.availableAddons) || addonContext.availableAddons.length === 0 ? (
                <View style={{
                  paddingVertical: 18,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.backgroundSecondary,
                  marginBottom: 14,
                }}>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                    No standard add-ons are available right now.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginBottom: 14 }}>
                  {addonContext.availableAddons.map((addon) => {
                    const addonPrice = Number(addon?.price || 0);
                    const addonPriceLabel = addon?.price_type_label || (addon?.price_type === 'monthly' ? 'Monthly' : 'One-time');
                    const canRequest = addon?.has_stock !== false;
                    const isSubmittingThisAddon = addonRequestingId === addon.id;

                    return (
                      <View
                        key={addon.id}
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.surface,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          gap: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>
                              {addon?.name || 'Add-on'}
                            </Text>
                            <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                              {addonPriceLabel}
                            </Text>
                            {addon?.description ? (
                              <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>
                                {addon.description}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.primary }}>
                            {formatCurrency(addonPrice)}{addon?.price_type === 'monthly' ? '/mo' : ''}
                          </Text>
                        </View>

                        <TouchableOpacity
                          disabled={!canRequest || isSubmittingThisAddon}
                          onPress={() => submitAddonRequest({ booking_id: addonContext.bookingId, addon_id: addon.id, quantity: 1 }, addon.id)}
                          style={{
                            minHeight: 40,
                            borderRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: !canRequest || isSubmittingThisAddon ? theme.colors.textTertiary : theme.colors.primary,
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                            {isSubmittingThisAddon ? 'Submitting...' : (canRequest ? 'Request Add-on' : 'Out of Stock')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8 }}>
                Request a Custom Add-on
              </Text>

              <TextInput
                value={addonDraft.name}
                onChangeText={(value) => setAddonDraft((prev) => ({ ...prev, name: value }))}
                placeholder="Item name (e.g., Extra chair, Desk lamp)"
                placeholderTextColor={theme.colors.textTertiary}
                style={{
                  minHeight: 44,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  marginBottom: 10,
                }}
              />

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {[
                  { label: 'Rental', value: 'rental' },
                  { label: 'Usage Fee', value: 'fee' },
                ].map((item) => {
                  const selected = addonDraft.addon_type === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => setAddonDraft((prev) => ({ ...prev, addon_type: item.value }))}
                      style={{
                        flex: 1,
                        minHeight: 38,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: selected ? theme.colors.primary : theme.colors.border,
                        backgroundColor: selected ? theme.colors.primaryLight : theme.colors.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? theme.colors.primary : theme.colors.textSecondary }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'One-time', value: 'one_time' },
                ].map((item) => {
                  const selected = addonDraft.price_type === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => setAddonDraft((prev) => ({ ...prev, price_type: item.value }))}
                      style={{
                        flex: 1,
                        minHeight: 38,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: selected ? theme.colors.primary : theme.colors.border,
                        backgroundColor: selected ? theme.colors.primaryLight : theme.colors.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? theme.colors.primary : theme.colors.textSecondary }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                value={addonDraft.suggested_price}
                onChangeText={(value) => setAddonDraft((prev) => ({ ...prev, suggested_price: value }))}
                placeholder="Suggested price (optional)"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
                style={{
                  minHeight: 44,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  marginBottom: 10,
                }}
              />

              <TextInput
                value={addonDraft.note}
                onChangeText={(value) => setAddonDraft((prev) => ({ ...prev, note: value }))}
                placeholder="Note for landlord (optional)"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                style={{
                  minHeight: 96,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.colors.text,
                  textAlignVertical: 'top',
                  backgroundColor: theme.colors.surface,
                }}
              />
            </ScrollView>

            <View style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              flexDirection: 'row',
              gap: 10,
            }}>
              <TouchableOpacity
                onPress={closeAddonModal}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitCustomAddonRequest}
                disabled={submittingCustomAddon}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  backgroundColor: submittingCustomAddon ? theme.colors.textTertiary : '#2563EB',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {submittingCustomAddon ? 'Submitting...' : 'Submit Custom'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTransferModal}
        animationType="fade"
        transparent
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={closeTransferModal}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          paddingHorizontal: 16,
        }}>
          <View style={{
            maxHeight: '95%',
            borderRadius: 14,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: 'hidden',
          }}>
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>
                Request Room Transfer
              </Text>
              <TouchableOpacity onPress={closeTransferModal} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: undefined }} contentContainerStyle={{ padding: 16 }}>
              <View style={{ marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: theme.colors.backgroundSecondary }}>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {transferContext?.propertyTitle
                    ? `Choose a room in ${transferContext.propertyTitle}.`
                    : 'Choose a room for your transfer request.'}
                </Text>
              </View>

              {!!transferOptionsMessage && (
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 12 }}>
                  {transferOptionsMessage}
                </Text>
              )}

              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8 }}>
                Select New Room
              </Text>
              <View style={{ gap: 8 }}>
                {transferRoomOptions.map((roomOption) => {
                  const selected = Number(selectedTransferRoomId) === Number(roomOption.id);
                  const roomNumber = roomOption.room_number || roomOption.roomNumber || roomOption.id;
                  const roomType = roomOption.type_label || roomOption.room_type || 'Room';
                  const roomPrice = roomOption.monthly_rate ?? roomOption.price ?? null;

                  return (
                    <TouchableOpacity
                      key={roomOption.id}
                      onPress={() => setSelectedTransferRoomId(roomOption.id)}
                      style={{
                        borderWidth: 1,
                        borderColor: selected ? theme.colors.primary : theme.colors.border,
                        backgroundColor: selected ? theme.colors.primaryLight : theme.colors.surface,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>
                          Room {roomNumber}
                        </Text>
                        {roomPrice != null && (
                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>
                            {formatCurrency(roomPrice)}/mo
                          </Text>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                        {roomType}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8 }}>
                  Lease Duration
                </Text>
                <View style={{ flexDirection: 'row', backgroundColor: theme.colors.backgroundSecondary, borderRadius: 10, padding: 4 }}>
                  <TouchableOpacity
                    onPress={() => setLeaseDurationPreference('keep_current')}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      alignItems: 'center',
                      borderRadius: 8,
                      backgroundColor: leaseDurationPreference === 'keep_current' ? theme.colors.surface : 'transparent',
                      borderWidth: leaseDurationPreference === 'keep_current' ? 1 : 0,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: leaseDurationPreference === 'keep_current' ? theme.colors.primary : theme.colors.textSecondary }}>
                      Keep Current
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setLeaseDurationPreference('new_lease')}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      alignItems: 'center',
                      borderRadius: 8,
                      backgroundColor: leaseDurationPreference === 'new_lease' ? theme.colors.surface : 'transparent',
                      borderWidth: leaseDurationPreference === 'new_lease' ? 1 : 0,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: leaseDurationPreference === 'new_lease' ? theme.colors.primary : theme.colors.textSecondary }}>
                      New Lease
                    </Text>
                  </TouchableOpacity>
                </View>

                {leaseDurationPreference === 'new_lease' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8 }}>
                      New Lease End Date *
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowNewEndDatePicker(true)}
                      style={{
                        minHeight: 44,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        flexDirection: 'row',
                        gap: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.colors.surface,
                      }}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={newEndDate ? theme.colors.textSecondary : theme.colors.textTertiary}
                      />
                      <Text style={{ color: newEndDate ? theme.colors.text : theme.colors.textTertiary, fontSize: 14 }}>
                        {newEndDate ? formatSlashDate(newEndDate) : 'Select New End Date'}
                      </Text>
                    </TouchableOpacity>

                    {showNewEndDatePicker && (
                      <DateTimePicker
                        value={newEndDate || new Date(new Date().getTime() + 86400000)}
                        mode="date"
                        display="default"
                        minimumDate={new Date(new Date().getTime() + 86400000)}
                        onChange={(event, selectedDate) => {
                          if (Platform.OS !== 'ios') {
                            setShowNewEndDatePicker(false);
                          }
                          if (selectedDate) {
                            selectedDate.setHours(0, 0, 0, 0);
                            setNewEndDate(selectedDate);
                          }
                        }}
                      />
                    )}
                  </View>
                )}
              </View>

              {/* Financial Impact Preview */}
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary }}>
                    💰 Financial Impact Preview
                  </Text>
                  <TouchableOpacity
                    onPress={() => showAlert(
                      'Proration Rule',
                      'Rent is prorated based on the actual number of days in your billing cycle. Any transfer processing fee is deducted from your unused credit.'
                    )}
                    style={{ marginLeft: 6, paddingHorizontal: 4 }}
                  >
                    <Ionicons name="information-circle-outline" size={14} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
                {loadingPreview ? (
                  <View style={{
                    padding: 12, borderRadius: 10,
                    backgroundColor: theme.colors.backgroundSecondary,
                    alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>Calculating...</Text>
                  </View>
                ) : transferPreview ? (
                  <View style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    overflow: 'hidden',
                    borderColor: transferPreview.suggested_adjustment > 0
                      ? '#F59E0B'
                      : transferPreview.suggested_adjustment < 0
                        ? '#10B981'
                        : theme.colors.border,
                  }}>
                    {/* Rate Comparison Row */}
                    <View style={{
                      backgroundColor: theme.colors.backgroundSecondary,
                      padding: 10,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: theme.colors.textTertiary, textTransform: 'uppercase' }}>Current</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>
                          {formatCurrency(transferPreview.current_room_rate)}/mo
                        </Text>
                      </View>
                      <Text style={{ fontSize: 18, color: theme.colors.textTertiary, alignSelf: 'center', paddingHorizontal: 8 }}>→</Text>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: theme.colors.textTertiary, textTransform: 'uppercase' }}>New</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.primary }}>
                          {formatCurrency(transferPreview.new_room_rate)}/mo
                        </Text>
                      </View>
                    </View>

                    {/* Breakdown */}
                    <View style={{ padding: 12, gap: 6 }}>
                      {!transferPreview.has_payment_this_period ? (
                        <View style={{
                          padding: 10, borderRadius: 8,
                          backgroundColor: theme.isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF',
                        }}>
                          <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '600' }}>
                            ℹ️ No payment found for the current billing period.
                          </Text>
                          <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 }}>
                            Your next invoice will simply reflect the new room rate. No immediate charge.
                          </Text>
                        </View>
                      ) : (
                        <>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                              Remaining days this cycle
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text }}>
                              {transferPreview.remaining_days} days
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                              Old room unused value
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text }}>
                              {formatCurrency(transferPreview.old_room_unused_value)}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                              New room cost (remaining days)
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text }}>
                              {formatCurrency(transferPreview.new_room_cost)}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                              Transfer Processing Fee
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.danger }}>
                              - {formatCurrency(transferPreview.transfer_fee)}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '700' }}>
                              Net Credit
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>
                              {formatCurrency(transferPreview.credit_available)}
                            </Text>
                          </View>
                          <View style={{
                            marginTop: 4,
                            paddingTop: 8,
                            borderTopWidth: 1,
                            borderTopColor: theme.colors.border,
                          }}>
                            {transferPreview.suggested_adjustment > 0 ? (
                              <View style={{
                                padding: 10, borderRadius: 8,
                                backgroundColor: theme.isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB',
                              }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#D97706' }}>
                                  ⚠️ Estimated Additional Charge: {formatCurrency(transferPreview.suggested_adjustment)}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
                                  (To be paid in your next invoice)
                                </Text>
                              </View>
                            ) : transferPreview.suggested_adjustment < 0 ? (
                              <View style={{
                                marginTop: 8,
                                borderTopWidth: 1,
                                borderTopColor: theme.colors.border,
                                paddingTop: 8,
                              }}>
                                {transferPreview.force_wallet_refunds ? (
                                  <View style={{
                                    padding: 10, borderRadius: 8,
                                    backgroundColor: theme.isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5',
                                  }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                      <Ionicons name="wallet" size={16} color="#16a34a" />
                                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#16a34a', marginLeft: 6 }}>
                                        Wallet Credits
                                      </Text>
                                    </View>
                                    <Text style={{ fontSize: 11, color: '#047857' }}>
                                      The excess amount of {formatCurrency(Math.abs(transferPreview.suggested_adjustment))} will be automatically credited to your tenant wallet upon approval.
                                    </Text>
                                  </View>
                                ) : (
                                  <View>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>
                                      Excess Credit Preference *
                                    </Text>
                                    <View style={{ gap: 8 }}>
                                      <TouchableOpacity
                                        style={{
                                          flexDirection: 'row', alignItems: 'flex-start',
                                          padding: 12, borderRadius: 12, borderWidth: 1,
                                          borderColor: refundPreference === 'wallet' ? theme.colors.primary : theme.colors.border,
                                          backgroundColor: refundPreference === 'wallet' ? `${theme.colors.primary}10` : theme.colors.surface,
                                        }}
                                        onPress={() => setRefundPreference('wallet')}
                                      >
                                        <Ionicons
                                          name={refundPreference === 'wallet' ? "radio-button-on" : "radio-button-off"}
                                          size={20}
                                          color={refundPreference === 'wallet' ? theme.colors.primary : theme.colors.textTertiary}
                                        />
                                        <View style={{ marginLeft: 10, flex: 1 }}>
                                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>Convert to Wallet Credits</Text>
                                          <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>Fastest. Use for future payments.</Text>
                                        </View>
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        style={{
                                          flexDirection: 'row', alignItems: 'flex-start',
                                          padding: 12, borderRadius: 12, borderWidth: 1,
                                          borderColor: refundPreference === 'cash' ? theme.colors.primary : theme.colors.border,
                                          backgroundColor: refundPreference === 'cash' ? `${theme.colors.primary}10` : theme.colors.surface,
                                        }}
                                        onPress={() => setRefundPreference('cash')}
                                      >
                                        <Ionicons
                                          name={refundPreference === 'cash' ? "radio-button-on" : "radio-button-off"}
                                          size={20}
                                          color={refundPreference === 'cash' ? theme.colors.primary : theme.colors.textTertiary}
                                        />
                                        <View style={{ marginLeft: 10, flex: 1 }}>
                                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>Manual Cash Refund</Text>
                                          <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>Requires landlord coordination to receive payout.</Text>
                                        </View>
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                )}
                              </View>
                            ) : (
                              <View style={{
                                padding: 10, borderRadius: 8,
                                backgroundColor: theme.isDark ? 'rgba(99,102,241,0.12)' : '#EEF2FF',
                              }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#4F46E5' }}>
                                  ✨ No immediate payment change
                                </Text>
                                <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 }}>
                                  Your credit fully covers the new room for the remaining days. No extra charge.
                                </Text>
                              </View>
                            )}
                            <Text style={{ fontSize: 10, color: theme.colors.textTertiary, marginTop: 10, textAlign: 'center', fontStyle: 'italic' }}>
                              *Calculated based on actual days in the billing cycle.*
                            </Text>
                          </View>
                        </>
                      )}
                      <Text style={{ fontSize: 10, color: theme.colors.textTertiary, marginTop: 4 }}>
                        * Final adjustments are applied when the landlord approves the transfer.
                      </Text>
                    </View>
                  </View>
                ) : selectedTransferRoomId ? (
                  <View style={{
                    padding: 10, borderRadius: 10,
                    backgroundColor: theme.colors.backgroundSecondary,
                  }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>
                      Select a room above to see the financial impact.
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 16, marginBottom: 8 }}>
                Reason for Transfer
              </Text>
              <TextInput
                value={transferReason}
                onChangeText={setTransferReason}
                placeholder="Provide your reason"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                style={{
                  minHeight: 90,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.colors.text,
                  textAlignVertical: 'top',
                  backgroundColor: theme.colors.surface,
                }}
              />
            </ScrollView>

            <View style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              flexDirection: 'row',
              gap: 10,
            }}>
              <TouchableOpacity
                onPress={closeTransferModal}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitTransferRequest}
                disabled={submittingTransfer || !selectedTransferRoomId}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  backgroundColor: submittingTransfer || !selectedTransferRoomId ? theme.colors.textTertiary : '#7C3AED',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {submittingTransfer ? 'Sending...' : 'Send Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReviewModal}
        animationType="fade"
        transparent
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={closeReviewModal}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          paddingHorizontal: 16,
        }}>
          <View style={{
            maxHeight: '95%',
            borderRadius: 14,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: 'hidden',
          }}>
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>
                Leave a Review
              </Text>
              <TouchableOpacity onPress={closeReviewModal} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: undefined }} contentContainerStyle={{ padding: 16 }}>
              <View style={{ marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: theme.colors.backgroundSecondary }}>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {reviewContext?.property?.title
                    ? `Reviewing ${reviewContext.property.title}`
                    : 'Share your stay experience.'}
                </Text>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8 }}>
                Rating
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewRating(star)}
                    style={{ paddingVertical: 6, paddingHorizontal: 2 }}
                  >
                    <Ionicons
                      name={star <= reviewRating ? 'star' : 'star-outline'}
                      size={28}
                      color={star <= reviewRating ? '#F59E0B' : theme.colors.textTertiary}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8 }}>
                Comment
              </Text>
              <TextInput
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="Write your review..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                style={{
                  minHeight: 100,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.colors.text,
                  textAlignVertical: 'top',
                  backgroundColor: theme.colors.surface,
                }}
              />
            </ScrollView>

            <View style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              flexDirection: 'row',
              gap: 10,
            }}>
              <TouchableOpacity
                onPress={closeReviewModal}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitReviewModal}
                disabled={submittingReview}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  backgroundColor: submittingReview ? theme.colors.textTertiary : theme.colors.primary,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {submittingReview ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMaintenanceModal}
        animationType="fade"
        transparent
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={closeMaintenanceModal}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          paddingHorizontal: 16,
        }}>
          <View style={{
            maxHeight: '95%',
            borderRadius: 14,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: 'hidden',
          }}>
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>
                Request Maintenance
              </Text>
              <TouchableOpacity onPress={closeMaintenanceModal} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: undefined }} contentContainerStyle={{ padding: 16 }}>
              <View style={{ marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: theme.colors.backgroundSecondary }}>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {maintenanceContext?.property?.title
                    ? `For ${maintenanceContext.property.title}`
                    : 'Create a maintenance request for this stay.'}
                </Text>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8 }}>
                Subject
              </Text>
              <TextInput
                value={maintenanceTitle}
                onChangeText={setMaintenanceTitle}
                placeholder="Brief summary of the issue"
                placeholderTextColor={theme.colors.textTertiary}
                style={{
                  minHeight: 44,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  marginBottom: 14,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8 }}>
                Priority
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {MAINTENANCE_PRIORITIES.map((priority) => {
                  const selected = maintenancePriority === priority.value;
                  return (
                    <TouchableOpacity
                      key={priority.value}
                      onPress={() => setMaintenancePriority(priority.value)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: selected ? theme.colors.primary : theme.colors.border,
                        backgroundColor: selected ? theme.colors.primaryLight : theme.colors.surface,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? theme.colors.primary : theme.colors.textSecondary }}>
                        {priority.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8 }}>
                Description
              </Text>
              <TextInput
                value={maintenanceDescription}
                onChangeText={setMaintenanceDescription}
                placeholder="Provide more details about the maintenance issue..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                style={{
                  minHeight: 110,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.colors.text,
                  textAlignVertical: 'top',
                  backgroundColor: theme.colors.surface,
                }}
              />

              <View style={{
                marginTop: 14,
                marginBottom: 8,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary }}>
                  Attach Photos
                </Text>
                <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>
                  {maintenanceImages.length}/5
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TouchableOpacity
                  onPress={pickMaintenanceImages}
                  disabled={maintenanceImages.length >= 5}
                  style={{
                    flex: 1,
                    minHeight: 40,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: maintenanceImages.length >= 5 ? theme.colors.backgroundSecondary : theme.colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                >
                  <Ionicons name="images-outline" size={16} color={theme.colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.primary }}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={captureMaintenanceImage}
                  disabled={maintenanceImages.length >= 5}
                  style={{
                    flex: 1,
                    minHeight: 40,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: maintenanceImages.length >= 5 ? theme.colors.backgroundSecondary : theme.colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                >
                  <Ionicons name="camera-outline" size={16} color={theme.colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.primary }}>Camera</Text>
                </TouchableOpacity>
              </View>

              {maintenanceImages.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
                >
                  {maintenanceImages.map((imageAsset, index) => (
                    <View key={`${imageAsset.uri}-${index}`} style={{ position: 'relative' }}>
                      <Image
                        source={{ uri: imageAsset.uri }}
                        style={{
                          width: 78,
                          height: 78,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.backgroundSecondary,
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => removeMaintenanceImage(index)}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          backgroundColor: theme.colors.surface,
                          borderRadius: 10,
                        }}
                      >
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </ScrollView>

            <View style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              flexDirection: 'row',
              gap: 10,
            }}>
              <TouchableOpacity
                onPress={closeMaintenanceModal}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitMaintenanceModal}
                disabled={submittingMaintenance}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  backgroundColor: submittingMaintenance ? theme.colors.textTertiary : '#F97316',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {submittingMaintenance ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReportModal}
        animationType="fade"
        transparent
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={closeReportModal}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          paddingHorizontal: 16,
        }}>
          <View style={{
            maxHeight: '95%',
            borderRadius: 14,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: 'hidden',
          }}>
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>
                Report Property
              </Text>
              <TouchableOpacity onPress={closeReportModal} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: undefined }} contentContainerStyle={{ padding: 16 }}>
              <View style={{ marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: theme.colors.backgroundSecondary }}>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {reportContext?.property?.title
                    ? `Reporting ${reportContext.property.title}`
                    : 'Submit a report to platform admins.'}
                </Text>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8 }}>
                Reason for Report
              </Text>
              <View style={{ gap: 8, marginBottom: 14 }}>
                {REPORT_REASONS.map((reason) => {
                  const selected = reportReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      onPress={() => setReportReason(reason)}
                      style={{
                        borderWidth: 1,
                        borderColor: selected ? theme.colors.error : theme.colors.border,
                        backgroundColor: selected ? `${theme.colors.error}15` : theme.colors.surface,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={selected ? theme.colors.error : theme.colors.textTertiary}
                      />
                      <Text style={{ fontSize: 12, color: theme.colors.text, fontWeight: selected ? '700' : '500', flex: 1 }}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8 }}>
                Description
              </Text>
              <TextInput
                value={reportDescription}
                onChangeText={setReportDescription}
                placeholder="Please provide specific details (at least 10 characters)..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                style={{
                  minHeight: 110,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.colors.text,
                  textAlignVertical: 'top',
                  backgroundColor: theme.colors.surface,
                }}
              />

              <View style={{
                marginTop: 12,
                backgroundColor: `${theme.colors.warning}20`,
                borderRadius: 10,
                padding: 10,
                flexDirection: 'row',
                gap: 8,
              }}>
                <Ionicons name="alert-circle" size={18} color={theme.colors.warning} />
                <Text style={{ fontSize: 11, color: theme.colors.textSecondary, flex: 1, lineHeight: 16 }}>
                  Reports are sent to admins for review. Abuse of reporting can lead to account restriction.
                </Text>
              </View>
            </ScrollView>

            <View style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              flexDirection: 'row',
              gap: 10,
            }}>
              <TouchableOpacity
                onPress={closeReportModal}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitReportModal}
                disabled={submittingReport}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  backgroundColor: submittingReport ? theme.colors.textTertiary : '#DC2626',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {submittingReport ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMoveOutModal}
        animationType="fade"
        transparent
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={closeMoveOutModal}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          paddingHorizontal: 16,
        }}>
          <View style={{
            maxHeight: '95%',
            borderRadius: 14,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: 'hidden',
          }}>
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>
                Request Move-out
              </Text>
              <TouchableOpacity onPress={closeMoveOutModal} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: undefined }} contentContainerStyle={{ padding: 16 }}>
              <View style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.colors.primaryLight,
                backgroundColor: theme.colors.backgroundSecondary,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary, marginBottom: 6, textTransform: 'uppercase' }}>
                  Current Move-out Date
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>
                  {formatLongDate(moveOutContext?.booking?.endDate || moveOutContext?.booking?.end_date)}
                </Text>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8 }}>
                Planned Move-out Date *
              </Text>
              <TouchableOpacity
                onPress={() => setShowMoveOutDatePicker(true)}
                style={{
                  minHeight: 44,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  gap: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.colors.surface,
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={moveOutDate ? theme.colors.textSecondary : theme.colors.textTertiary}
                />
                <Text style={{ color: moveOutDate ? theme.colors.text : theme.colors.textTertiary, fontSize: 14 }}>
                  {moveOutDate ? formatSlashDate(moveOutDate) : 'Select Date'}
                </Text>
              </TouchableOpacity>

              {showMoveOutDatePicker && (
                <DateTimePicker
                  value={moveOutDate || buildTodayDate()}
                  mode="date"
                  display="default"
                  minimumDate={buildTodayDate()}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS !== 'ios') {
                      setShowMoveOutDatePicker(false);
                    }
                    if (selectedDate) {
                      selectedDate.setHours(0, 0, 0, 0);
                      setMoveOutDate(selectedDate);
                    }
                  }}
                />
              )}

              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 14, marginBottom: 8 }}>
                Reason / Notes
              </Text>
              <TextInput
                value={moveOutReason}
                onChangeText={setMoveOutReason}
                placeholder="Optional context for your landlord"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                style={{
                  minHeight: 100,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.colors.text,
                  textAlignVertical: 'top',
                  backgroundColor: theme.colors.surface,
                }}
              />
            </ScrollView>

            <View style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              flexDirection: 'row',
              gap: 10,
            }}>
              <TouchableOpacity
                onPress={closeMoveOutModal}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitMoveOutModal}
                disabled={submittingMoveOut}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  backgroundColor: submittingMoveOut ? theme.colors.textTertiary : '#4F46E5',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {submittingMoveOut ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCancelBookingModal}
        animationType="fade"
        transparent
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={closeCancelBookingModal}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          paddingHorizontal: 16,
        }}>
          <View style={{
            borderRadius: 14,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: 'hidden',
          }}>
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>
                Cancel Booking Request
              </Text>
              <TouchableOpacity onPress={closeCancelBookingModal} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <View style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 10,
                backgroundColor: theme.isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
                borderWidth: 1,
                borderColor: theme.isDark ? '#EF4444' : '#FECACA',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="warning" size={20} color={theme.colors.error} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.error }}>
                    Are you sure?
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 }}>
                  This action cannot be undone. Your booking request will be permanently cancelled.
                </Text>
              </View>

              {cancelBookingContext && (
                <View style={{
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: theme.colors.backgroundSecondary,
                  marginBottom: 16,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textTertiary, textTransform: 'uppercase', marginBottom: 4 }}>
                    Booking Details
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>
                    {cancelBookingContext.property?.title || cancelBookingContext.property_title || 'Property'}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                    Room {cancelBookingContext.room?.room_number || cancelBookingContext.room_number || 'N/A'}
                  </Text>
                </View>
              )}
            </View>

            <View style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              flexDirection: 'row',
              gap: 10,
            }}>
              <TouchableOpacity
                onPress={closeCancelBookingModal}
                disabled={cancellingBookingId}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary }}>No, Keep It</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCancelBooking}
                disabled={cancellingBookingId}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  backgroundColor: cancellingBookingId ? theme.colors.textTertiary : '#DC2626',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {cancellingBookingId ? 'Cancelling...' : 'Yes, Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}