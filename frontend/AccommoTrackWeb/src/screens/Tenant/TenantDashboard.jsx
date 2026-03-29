import React, { useState, useEffect, useCallback } from 'react';
import { tenantService } from '../../services/tenantService';
import { useNavigate } from 'react-router-dom';
import { SkeletonCurrentStay, SkeletonStatCard } from '../../components/Shared/Skeleton';
import { useUIState } from '../../contexts/UIStateContext';
import {
  Home, Calendar, Wallet, AlertCircle, MessageSquare,
  Activity, CreditCard, ChevronRight, Bell, CalendarClock,
  CheckCircle2, AlertTriangle, ArrowRight, Zap, Droplets, Wifi
} from 'lucide-react';

const ROOM_COLORS = ['#22c55e', '#60a5fa', '#a78bfa', '#fbbf24', '#f87171'];

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const TenantDashboard = () => {
  const navigate = useNavigate();
  const { uiState, updateData } = useUIState();

  const cachedData = uiState.data.dashboard;
  const [loading, setLoading] = useState(!cachedData);
  const [stayData, setStayData] = useState(cachedData?.stayData || null);
  const [stats, setStats] = useState(cachedData?.stats || null);
  const [activities, setActivities] = useState(cachedData?.activities || []);
  const [openSummaryPanel, setOpenSummaryPanel] = useState(null);
  const [dismissedNotifications, setDismissedNotifications] = useState({
    overdueBalance: false,
    balanceDue: false,
    pendingCheckIns: [],
    upcomingBooking: false,
  });
  const initialLoadRef = React.useRef(!cachedData);

  const fetchDashboardData = useCallback(async () => {
    try {
      if (initialLoadRef.current) setLoading(true);
      initialLoadRef.current = false;

      const [currentStay, dashboardStats, activityRes] = await Promise.all([
        tenantService.getCurrentStay(),
        tenantService.getDashboardStats(),
        tenantService.getActivities()
      ]);

      setStayData(currentStay);
      setStats(dashboardStats);
      setActivities(Array.isArray(activityRes.activities) ? activityRes.activities.slice(0, 5) : []);

      updateData('dashboard', { stayData: currentStay, stats: dashboardStats, activities: activityRes.activities });
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  }, [updateData]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  useEffect(() => {
    const handleFocusRefresh = () => fetchDashboardData();
    const handleVisibilityRefresh = () => { if (document.visibilityState === 'visible') fetchDashboardData(); };
    const handleNotificationRefresh = () => fetchDashboardData();

    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    window.addEventListener('accommo:tenant-data-refresh', handleNotificationRefresh);
    const interval = setInterval(fetchDashboardData, 30000);

    return () => {
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      window.removeEventListener('accommo:tenant-data-refresh', handleNotificationRefresh);
      clearInterval(interval);
    };
  }, [fetchDashboardData]);

  // ── Helpers ──
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatFloorLabel = (floor) => {
    if (!floor || Number.isNaN(Number(floor))) return '—';
    const floorNumber = Number(floor);
    const suffix = floorNumber % 10 === 1 && floorNumber % 100 !== 11
      ? 'st'
      : floorNumber % 10 === 2 && floorNumber % 100 !== 12
        ? 'nd'
        : floorNumber % 10 === 3 && floorNumber % 100 !== 13
          ? 'rd'
          : 'th';
    return `${floorNumber}${suffix} Floor`;
  };

  // ── Derived Data ──
  const hasActiveStays = stayData?.stays && stayData.stays.length > 0;
  const stays = hasActiveStays ? stayData.stays : [];

  const totalActiveRooms = stays.length;
  const totalDaysStayed = stays.reduce((sum, s) => sum + (s.booking?.daysStayed || s.booking?.days_stayed || 0), 0);
  const totalMonthlyRent = stays.reduce((sum, s) => sum + (s.booking?.monthlyRent || s.booking?.monthly_rent || 0), 0);
  const totalMonthlyAddons = stays.reduce((sum, s) => sum + (s.addons?.monthlyTotal || s.addons?.monthly_total || 0), 0);
  const totalMonthlySummary = totalMonthlyRent + totalMonthlyAddons;
  const unpaidBalance = stats?.payments?.totalDue || stats?.payments?.monthlyDue || 0;
  const totalPaid = stats?.payments?.totalPaid || 0;

  useEffect(() => {
    if (unpaidBalance <= 0 && openSummaryPanel === 'status') {
      setOpenSummaryPanel(null);
    }
  }, [unpaidBalance, openSummaryPanel]);

  const roomBreakdownRows = stays.map((stay, idx) => {
    const roomNumber = stay?.room?.roomNumber || stay?.room?.room_number || '—';
    const propertyName = stay?.property?.title || stay?.property?.name || '—';
    const floor = stay?.room?.floor || stay?.room?.floor_number || stay?.room?.floorNumber;
    const roomType = stay?.room?.roomType || stay?.room?.room_type || 'Standard Room';
    const moveInDate = stay?.booking?.startDate || stay?.booking?.start_date;
    const daysStayed = Number(stay?.booking?.daysStayed || stay?.booking?.days_stayed || 0);
    const billingPolicy = String(stay?.financials?.billing_policy || stay?.booking?.billing_policy || 'monthly').toLowerCase();
    const billingTypeLabel = billingPolicy === 'daily' ? 'Daily' : 'Monthly';
    const unitPrice = Number(stay?.financials?.unit_price || stay?.booking?.unit_price || 0);
    const monthlyBaseRent = Number(stay?.booking?.monthlyRent || stay?.booking?.monthly_rent || 0);
    const baseRent = billingPolicy === 'daily' ? unitPrice : monthlyBaseRent;
    const addOns = Number(stay?.addons?.monthlyTotal || stay?.addons?.monthly_total || stay?.financials?.monthlyAddons || 0);
    const invoices = Array.isArray(stay?.financials?.invoices) ? stay.financials.invoices : [];
    const grandTotal = baseRent + addOns;
    const requiresAdvance = Boolean(
      stay?.room?.advance_feature_enabled
      ?? stay?.room?.require_1month_advance
    );
    const hasOverdue = invoices.some((inv) => (inv?.status || '').toLowerCase() === 'overdue')
      || Boolean(stay?.booking?.is_overdue || stay?.booking?.isOverdue);

    return {
      id: stay?.booking?.id || `${roomNumber}-${idx}`,
      roomNumber,
      roomColor: ROOM_COLORS[idx % ROOM_COLORS.length],
      propertyName,
      floorLabel: formatFloorLabel(floor),
      roomType,
      moveInLabel: formatDate(moveInDate),
      daysStayed,
      dayShare: totalDaysStayed > 0 ? Math.round((daysStayed / totalDaysStayed) * 100) : 0,
      baseRent,
      addOns,
      grandTotal,
      billingPolicy,
      billingTypeLabel,
      requiresAdvance,
      status: hasOverdue ? 'overdue' : 'active',
    };
  });

  const totalBaseRent = roomBreakdownRows.reduce((sum, row) => sum + row.baseRent, 0);
  const totalAddOns = roomBreakdownRows.reduce((sum, row) => sum + row.addOns, 0);
  const totalGrandRent = roomBreakdownRows.reduce((sum, row) => sum + row.grandTotal, 0);

  const balanceBreakdownRows = stays
    .flatMap((stay, idx) => {
      const invoices = Array.isArray(stay?.financials?.invoices) ? stay.financials.invoices : [];
      const roomNumber = stay?.room?.roomNumber || stay?.room?.room_number || '—';
      const roomColor = ROOM_COLORS[idx % ROOM_COLORS.length];

      return invoices
        .filter((invoice) => ['pending', 'partial', 'overdue'].includes((invoice?.status || '').toLowerCase()))
        .map((invoice) => {
          const transactions = Array.isArray(invoice?.transactions) ? invoice.transactions : [];
          const paidAmount = transactions
            .filter((tx) => ['succeeded', 'completed', 'paid', 'approved', 'verified'].includes((tx?.status || '').toLowerCase()))
            .reduce((sum, tx) => sum + (Number(tx?.amount) || 0), 0);
          const invoiceAmount = Number(invoice?.amount) || 0;
          const remainingAmount = Math.max(0, invoiceAmount - paidAmount);
          const status = (invoice?.status || '').toLowerCase();

          return {
            id: invoice?.id,
            roomNumber,
            roomColor,
            description: invoice?.description || `Invoice #${invoice?.id}`,
            dueDate: invoice?.dueDate || '—',
            sortDueDate: invoice?.dueDate ? new Date(invoice.dueDate).getTime() : Number.MAX_SAFE_INTEGER,
            amount: status === 'partial' && remainingAmount > 0 ? remainingAmount : invoiceAmount,
            status,
          };
        });
    })
    .sort((a, b) => {
      const rank = { overdue: 0, partial: 1, pending: 2 };
      if ((rank[a.status] ?? 99) !== (rank[b.status] ?? 99)) {
        return (rank[a.status] ?? 99) - (rank[b.status] ?? 99);
      }
      return a.sortDueDate - b.sortDueDate;
    });

  const generateUpcomingSchedule = () => {
    const primaryStay = stays.length > 0 ? stays[0].booking : null;
    if (!primaryStay) return [];
    
    const plan = primaryStay.payment_plan || primaryStay.paymentPlan;
    if (plan !== 'monthly' && plan !== 'term') return [];
    
    const startDate = new Date(primaryStay.start_date || primaryStay.startDate);
    const monthsTotal = parseInt(primaryStay.total_months || primaryStay.totalMonths || 1);
    const rentAmount = parseFloat(primaryStay.monthly_rent || primaryStay.monthlyRent || 0);
    
    const schedules = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    for (let i = 0; i < monthsTotal; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        if (dueDate >= currentMonthStart && schedules.length < 3) {
            schedules.push({
                date: dueDate,
                amount: rentAmount,
                isNext: false
            });
        }
    }
    
    if (schedules.length > 0) schedules[0].isNext = true;
    return schedules;
  };

  const upcomingSchedule = generateUpcomingSchedule();

  // ── Loading State ──
  if (loading) {
    return (
      <div className="space-y-6 font-sans">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
        <SkeletonCurrentStay />
      </div>
    );
  }

  // ── Zero State ──
  if (!hasActiveStays) {
    return (
      <div className="space-y-6 font-sans max-w-5xl mx-auto pb-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Home, label: 'Active Rooms', value: '0', color: 'green' },
            { icon: Calendar, label: 'Days Stayed', value: '0', color: 'blue' },
            { icon: Wallet, label: 'Monthly Rent', value: formatCurrency(0), color: 'purple' },
            { icon: CheckCircle2, label: 'All Paid Up', value: 'No pending balance', color: 'green' },
          ].map((card, i) => (
            <div key={i} className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[14px] p-6 relative overflow-hidden flex flex-col">
              <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-[14px] ${
                card.color === 'green' ? 'bg-green-500' : card.color === 'blue' ? 'bg-blue-400' : 'bg-purple-400'
              }`} />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] text-gray-500 dark:text-slate-400 font-medium tracking-wide">{card.label}</div>
                  <div className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-slate-100 truncate">{card.value}</div>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  card.color === 'green' ? 'bg-green-100 dark:bg-green-500/15' : card.color === 'blue' ? 'bg-blue-100 dark:bg-blue-500/12' : 'bg-purple-100 dark:bg-purple-500/12'
                }`}>
                  <card.icon className={`w-5 h-5 ${
                    card.color === 'green' ? 'text-green-600 dark:text-green-400' : card.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'
                  }`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center mb-6">
            <Home className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">Ready to find your new home?</h2>
          <p className="text-[15px] text-gray-500 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
            You don't have an active stay yet. Browse our verified properties and find the perfect room for your needs.
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="px-8 py-4.5 bg-green-600 text-white rounded-xl font-bold text-[15px] hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
          >
            Explore Properties
          </button>
        </div>
      </div>
    );
  }

  // ── Stat Card Config (Read Only) ──
  const statCards = [
    {
      key: 'rooms', icon: Home, value: totalActiveRooms.toString(), label: 'Active Rooms', color: 'green',
    },
    {
      key: 'days', icon: Calendar, value: totalDaysStayed.toString(), label: 'Days Stayed', color: 'blue',
    },
    {
      key: 'rent', icon: Wallet, value: formatCurrency(totalMonthlySummary), label: 'Monthly Rent', color: 'purple',
    },
    {
      key: 'status',
      icon: unpaidBalance > 0 ? AlertTriangle : CheckCircle2,
      value: unpaidBalance > 0 ? formatCurrency(unpaidBalance) : 'Fully Paid',
      label: unpaidBalance > 0 ? 'Balance Due' : 'Payment Status',
      color: unpaidBalance > 0 ? 'red' : 'green',
    },
  ];

  const colorMap = {
    green: {
      iconBg: 'bg-green-100 dark:bg-green-500/15',
      iconText: 'text-green-600 dark:text-green-400',
      border: 'bg-green-500',
    },
    blue: {
      iconBg: 'bg-blue-100 dark:bg-blue-500/12',
      iconText: 'text-blue-600 dark:text-blue-400',
      border: 'bg-blue-400',
    },
    purple: {
      iconBg: 'bg-purple-100 dark:bg-purple-500/12',
      iconText: 'text-purple-600 dark:text-purple-400',
      border: 'bg-purple-400',
    },
    red: {
      iconBg: 'bg-red-100 dark:bg-red-500/15 border border-red-200 dark:border-red-500/50',
      iconText: 'text-red-600 dark:text-red-400',
      border: 'bg-red-500',
    },
  };

  const handleStatCardClick = (cardKey) => {
    setOpenSummaryPanel((prev) => (prev === cardKey ? null : cardKey));
  };

  const dismissNotification = (notificationType, id = null) => {
    if (notificationType === 'pendingCheckIns' && id) {
      setDismissedNotifications((prev) => ({
        ...prev,
        pendingCheckIns: [...prev.pendingCheckIns, id],
      }));
    } else {
      setDismissedNotifications((prev) => ({
        ...prev,
        [notificationType]: true,
      }));
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-transparent dark:bg-gray-900 p-4 md:p-6 space-y-8 font-sans">


      {/* ── High Priority Action Notification (Unpaid/Overdue Balance) ── */}
      {!dismissedNotifications.overdueBalance && stats?.payments?.hasOverdueInvoices ? (
        <div className="bg-red-50 dark:bg-gradient-to-r dark:from-red-500/15 dark:to-[#1e2332] border border-red-200 dark:border-red-500/30 rounded-[16px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start md:items-center gap-4">
            <div className="bg-red-100 dark:bg-red-500/20 p-4 rounded-full flex-shrink-0 mt-2 md:mt-0">
              <AlertCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-800 dark:text-red-100">Action Required: Balance Overdue</h2>
              <p className="text-[15px] text-red-700 dark:text-red-200/80 mt-2 leading-snug">
                You have an outstanding balance of <span className="font-bold text-red-800 dark:text-red-300">{formatCurrency(unpaidBalance)}</span> that is past its due date. Please settle it immediately.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/payments')}
              className="w-full md:w-auto px-8 py-4.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
            >
              Pay Now <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => dismissNotification('overdueBalance')}
              className="w-8 h-8 rounded-full border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex-shrink-0"
              aria-label="Close overdue balance notification"
            >
              ×
            </button>
          </div>
        </div>
      ) : !dismissedNotifications.balanceDue && (
        <div className="bg-amber-50 dark:bg-gradient-to-r dark:from-amber-500/15 dark:to-[#1e2332] border border-amber-200 dark:border-amber-500/30 rounded-[16px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start md:items-center gap-4">
            <div className="bg-amber-100 dark:bg-amber-500/20 p-4 rounded-full flex-shrink-0 mt-2 md:mt-0">
              <AlertCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-800 dark:text-amber-100">Action Required: Balance Due</h2>
              <p className="text-[15px] text-amber-700 dark:text-amber-200/80 mt-2 leading-snug">
                You have an outstanding balance of <span className="font-bold text-amber-800 dark:text-amber-300">{formatCurrency(unpaidBalance)}</span>. Please settle it to avoid late fees.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/payments')}
              className="w-full md:w-auto px-8 py-4.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              Pay Now <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => dismissNotification('balanceDue')}
              className="w-8 h-8 rounded-full border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors flex-shrink-0"
              aria-label="Close balance due notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Pending Check-In Alert (Overdue for move-in) ── */}
      {stayData?.pendingCheckIns && stayData.pendingCheckIns.length > 0 && stayData.pendingCheckIns
        .filter(pending => !dismissedNotifications.pendingCheckIns.includes(pending.id))
        .map(pending => (
        <div key={pending.id} className={pending.status === 'confirmed' 
          ? "bg-red-50 dark:bg-gradient-to-r dark:from-red-500/15 dark:to-[#1e2332] border border-red-200 dark:border-red-500/30 rounded-[16px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm mb-4"
          : "bg-orange-50 dark:bg-gradient-to-r dark:from-orange-500/15 dark:to-[#1e2332] border border-orange-200 dark:border-orange-500/30 rounded-[16px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm mb-4"
        }>
          <div className="flex items-start md:items-center gap-4">
            <div className={pending.status === 'confirmed' 
              ? "bg-red-100 dark:bg-red-500/20 p-4 rounded-full flex-shrink-0 mt-2 md:mt-0"
              : "bg-orange-100 dark:bg-orange-500/20 p-4 rounded-full flex-shrink-0 mt-2 md:mt-0"
            }>
              <AlertCircle className={pending.status === 'confirmed' ? "w-7 h-7 text-red-600 dark:text-red-400" : "w-7 h-7 text-orange-600 dark:text-orange-400"} />
            </div>
            <div>
              <h2 className={pending.status === 'confirmed' ? "text-lg font-bold text-red-800 dark:text-red-100" : "text-lg font-bold text-orange-800 dark:text-orange-100"}>
                {pending.status === 'confirmed' ? 'Action Required: Check-in Overdue' : 'Stay Starting: Approval Pending'}
              </h2>
              <p className={pending.status === 'confirmed' ? "text-[15px] text-red-700 dark:text-red-200/80 mt-2 leading-snug" : "text-[15px] text-orange-700 dark:text-orange-200/80 mt-2 leading-snug"}>
                {pending.status === 'confirmed' 
                  ? `Your stay at ${pending.property} was scheduled to start on ${formatDate(pending.startDate)}. Please contact your landlord to finalize your check-in.`
                  : `Your booking for ${pending.property} was set to start on ${formatDate(pending.startDate)}, but it's still awaiting landlord approval.`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/bookings')}
              className={pending.status === 'confirmed' 
                ? "w-full md:w-auto px-8 py-4.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                : "w-full md:w-auto px-8 py-4.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
              }
            >
              View Booking <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => dismissNotification('pendingCheckIns', pending.id)}
              className={pending.status === 'confirmed' 
                ? "w-8 h-8 rounded-full border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex-shrink-0"
                : "w-8 h-8 rounded-full border border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors flex-shrink-0"
              }
              aria-label="Close pending check-in notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}

      {/* ── Upcoming Booking Alert ── */}
      {!dismissedNotifications.upcomingBooking && stayData?.upcomingBooking && (
        <div className="bg-blue-50 dark:bg-gradient-to-r dark:from-blue-500/15 dark:to-[#1e2332] border border-blue-200 dark:border-blue-500/30 rounded-[16px] p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 dark:bg-blue-500/20 p-4 rounded-full flex-shrink-0">
              <CalendarClock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-blue-900 dark:text-blue-100">Upcoming Stay at {stayData.upcomingBooking.property}</h2>
              <p className="text-[14px] text-blue-700 dark:text-blue-200/80 mt-0.5">
                Begins on <span className="font-semibold">{formatDate(stayData.upcomingBooking.startDate)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/bookings')}
              className="px-6 py-2.5 bg-white dark:bg-[#1e2332] text-blue-700 dark:text-blue-300 font-bold rounded-xl border border-blue-200 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
            >
              View
            </button>
            <button
              onClick={() => dismissNotification('upcomingBooking')}
              className="w-8 h-8 rounded-full border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors flex-shrink-0"
              aria-label="Close upcoming booking notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Stat Cards Grid (Read Only) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-[-10px]">
        {statCards.map((card) => {
          const cm = colorMap[card.color];
          const isClickable = true;
          const isActive = openSummaryPanel === card.key;
          const interactiveClassMap = {
            green: 'hover:border-green-300 dark:hover:border-green-500/40',
            blue: 'hover:border-blue-300 dark:hover:border-blue-500/40',
            purple: 'hover:border-purple-300 dark:hover:border-purple-500/40',
            red: 'hover:border-red-300 dark:hover:border-red-500/40',
          };
          const activeClassMap = {
            green: 'border-green-300 dark:border-green-500/40 shadow-[0_0_0_1px_rgba(34,197,94,0.35)]',
            blue: 'border-blue-300 dark:border-blue-500/40 shadow-[0_0_0_1px_rgba(96,165,250,0.35)]',
            purple: 'border-purple-300 dark:border-purple-500/40 shadow-[0_0_0_1px_rgba(167,139,250,0.35)]',
            red: 'border-red-300 dark:border-red-500/40 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]',
          };
          return (
            <div
              key={card.key}
              className={`bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] p-6 relative overflow-hidden flex flex-col cursor-pointer transition-all hover:shadow-md ${interactiveClassMap[card.color]} ${isActive ? activeClassMap[card.color] : ''}`}
              onClick={isClickable ? () => handleStatCardClick(card.key) : undefined}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={isClickable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStatCardClick(card.key);
                }
              } : undefined}
            >
              <div className={`absolute top-0 left-0 right-0 h-[4px] rounded-t-[16px] ${cm.border}`} />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[14px] text-gray-500 dark:text-slate-400 font-medium tracking-wide">{card.label}</div>
                  <div className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-slate-100 font-mono truncate">{card.value}</div>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cm.iconBg}`}>
                  <card.icon className={`w-5 h-5 ${cm.iconText}`} />
                </div>
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500/75 dark:text-slate-500/75 mt-1.5">Click to view breakdown</div>
            </div>
          );
        })}
      </div>

      {openSummaryPanel === 'rooms' && (
        <div className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] overflow-hidden mt-6">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-[#2a3045] flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-slate-100">Active Rooms - Detailed Breakdown</h3>
            <button
              type="button"
              onClick={() => setOpenSummaryPanel(null)}
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-[#303650] text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#252b3b] transition-colors"
              aria-label="Close rooms breakdown"
            >
              ×
            </button>
          </div>
          <div className="px-6 py-4 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-[#2a3045]">
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Room</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Property</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Floor</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Type</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Move-in</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {roomBreakdownRows.length > 0 ? (
                  roomBreakdownRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 dark:border-[#2a3045] last:border-b-0">
                      <td className="py-4 text-[14px] font-semibold text-gray-900 dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.roomColor }} />
                          Room {row.roomNumber}
                        </span>
                      </td>
                      <td className="py-4 text-[14px] text-gray-600 dark:text-slate-300">{row.propertyName}</td>
                      <td className="py-4 text-[14px] text-gray-500 dark:text-slate-400">{row.floorLabel}</td>
                      <td className="py-4 text-[14px] text-gray-500 dark:text-slate-400">{row.roomType}</td>
                      <td className="py-4 text-[14px] text-gray-500 dark:text-slate-400">{row.moveInLabel}</td>
                      <td className="py-4 text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold border ${
                          row.status === 'overdue'
                            ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/25'
                            : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20'
                        }`}>
                          {row.status === 'overdue' ? 'Overdue' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-[14px] text-gray-500 dark:text-slate-500">No active room records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {openSummaryPanel === 'days' && (
        <div className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] overflow-hidden mt-6">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-[#2a3045] flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-slate-100">Days Stayed - Room Breakdown</h3>
            <button
              type="button"
              onClick={() => setOpenSummaryPanel(null)}
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-[#303650] text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#252b3b] transition-colors"
              aria-label="Close days breakdown"
            >
              ×
            </button>
          </div>
          <div className="px-6 py-4 overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-[#2a3045]">
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Room</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Move-in</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500 text-right">Days Stayed</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {roomBreakdownRows.length > 0 ? (
                  roomBreakdownRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 dark:border-[#2a3045] last:border-b-0">
                      <td className="py-4 text-[14px] font-semibold text-gray-900 dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.roomColor }} />
                          Room {row.roomNumber}
                        </span>
                      </td>
                      <td className="py-4 text-[14px] text-gray-500 dark:text-slate-400">{row.moveInLabel}</td>
                      <td className="py-4 text-[14px] font-mono font-bold text-right text-gray-900 dark:text-slate-100">{row.daysStayed}</td>
                      <td className="py-4 text-right">
                        <div className="inline-flex items-center gap-3">
                          <span className="text-[12px] font-mono text-gray-500 dark:text-slate-400 min-w-[34px] text-right">{row.dayShare}%</span>
                          <span className="w-24 h-1.5 rounded bg-gray-200 dark:bg-[#2a3045] overflow-hidden">
                            <span className="h-full block rounded" style={{ width: `${row.dayShare}%`, backgroundColor: row.roomColor }} />
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-[14px] text-gray-500 dark:text-slate-500">No stay duration data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-gray-50 dark:bg-[#252b3b]/40 border-t border-gray-100 dark:border-[#2a3045] flex items-center justify-end gap-8">
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Total Days</p>
              <p className="text-[18px] font-bold font-mono text-gray-900 dark:text-slate-100">{totalDaysStayed}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Average / Room</p>
              <p className="text-[18px] font-bold font-mono text-blue-600 dark:text-blue-400">
                {roomBreakdownRows.length > 0 ? Math.round(totalDaysStayed / roomBreakdownRows.length) : 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {openSummaryPanel === 'rent' && (
        <div className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] overflow-hidden mt-6">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-[#2a3045] flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-slate-100">Rent - Room Breakdown</h3>
            <button
              type="button"
              onClick={() => setOpenSummaryPanel(null)}
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-[#303650] text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#252b3b] transition-colors"
              aria-label="Close rent breakdown"
            >
              ×
            </button>
          </div>
          <div className="px-6 py-4 overflow-x-auto">
            <table className="w-full min-w-[1080px]">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-[#2a3045]">
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Room</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Billing Type</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500 text-center">Base Rent</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500 text-center">Add-Ons</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500 text-center">Advance Required (1+ Month)</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500 text-center">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {roomBreakdownRows.length > 0 ? (
                  roomBreakdownRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 dark:border-[#2a3045] last:border-b-0">
                      <td className="py-4 text-[14px] font-semibold text-gray-900 dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.roomColor }} />
                          Room {row.roomNumber}
                        </span>
                      </td>
                      <td className="py-4 text-[14px] text-gray-600 dark:text-slate-300">{row.billingTypeLabel}</td>
                      <td className="py-4 text-[14px] font-mono font-bold text-center text-gray-900 dark:text-slate-100 whitespace-nowrap">
                        {row.billingPolicy === 'daily' ? (
                          <span>
                            {formatCurrency(row.baseRent)} <span className="text-gray-500 dark:text-slate-400 font-semibold">/day</span>
                          </span>
                        ) : (
                          <span>
                            {formatCurrency(row.baseRent)} <span className="text-gray-500 dark:text-slate-400 font-semibold">/month</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-[14px] font-mono font-bold text-center text-gray-900 dark:text-slate-100">
                        {formatCurrency(row.addOns)}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold border ${
                          row.requiresAdvance
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/20'
                        }`}>
                          {row.requiresAdvance ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-4 text-[14px] font-mono font-bold text-center text-purple-600 dark:text-purple-400">{formatCurrency(row.grandTotal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-[14px] text-gray-500 dark:text-slate-500">No rent data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-gray-50 dark:bg-[#252b3b]/40 border-t border-gray-100 dark:border-[#2a3045] flex items-center justify-end gap-8">
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Total Base Rent</p>
              <p className="text-[18px] font-bold font-mono text-gray-900 dark:text-slate-100">{formatCurrency(totalBaseRent)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Total Add-Ons</p>
              <p className="text-[18px] font-bold font-mono text-blue-600 dark:text-blue-400">{formatCurrency(totalAddOns)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Grand Total</p>
              <p className="text-[18px] font-bold font-mono text-purple-600 dark:text-purple-400">{formatCurrency(totalGrandRent)}</p>
            </div>
          </div>
        </div>
      )}

      {openSummaryPanel === 'status' && unpaidBalance > 0 && (
        <div className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] overflow-hidden mt-6">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-[#2a3045] flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-slate-100">Unpaid Balance - Detailed Breakdown</h3>
            <div className="flex items-center gap-3">
              <span className="text-[13px] px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/25 font-semibold">
                {formatCurrency(unpaidBalance)} Due
              </span>
              <button
                type="button"
                onClick={() => setOpenSummaryPanel(null)}
                className="w-8 h-8 rounded-full border border-gray-200 dark:border-[#303650] text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#252b3b] transition-colors"
                aria-label="Close balance breakdown"
              >
                ×
              </button>
            </div>
          </div>

          <div className="px-6 py-4 overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-[#2a3045]">
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Room</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Description</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Due Date</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500 text-right">Amount</th>
                  <th className="pb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {balanceBreakdownRows.length > 0 ? (
                  balanceBreakdownRows.map((row) => (
                    <tr key={`${row.id}-${row.roomNumber}`} className="border-b border-gray-100 dark:border-[#2a3045] last:border-b-0">
                      <td className="py-4 text-[14px] font-semibold text-gray-900 dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.roomColor }} />
                          Room {row.roomNumber}
                        </span>
                      </td>
                      <td className="py-4 text-[14px] text-gray-600 dark:text-slate-300">{row.description}</td>
                      <td className={`py-4 text-[14px] ${row.status === 'overdue' ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-500 dark:text-slate-400'}`}>
                        {row.dueDate}
                      </td>
                      <td className={`py-4 text-[14px] font-mono font-bold text-right ${row.status === 'pending' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="py-4 text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold border ${
                          row.status === 'overdue'
                            ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/25'
                            : row.status === 'partial'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                        }`}>
                          {row.status === 'partial' ? 'Pending' : row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-[14px] text-gray-500 dark:text-slate-500">No outstanding invoice items found.</td>
                  </tr>
                )}

                {totalPaid > 0 && (
                  <tr>
                    <td colSpan={2} className="pt-5 pb-3 text-[14px] italic text-gray-500 dark:text-slate-500">Partial payment applied</td>
                    <td className="pt-5 pb-3 text-[14px] text-gray-500 dark:text-slate-500 text-right">—</td>
                    <td className="pt-5 pb-3 text-[14px] font-mono font-bold text-right text-green-600 dark:text-green-400">-{formatCurrency(totalPaid)}</td>
                    <td className="pt-5 pb-3 text-right">
                      <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold border bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">
                        Paid
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-gray-50 dark:bg-[#252b3b]/40 border-t border-gray-100 dark:border-[#2a3045] flex items-center justify-end gap-8">
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Total Billed</p>
              <p className="text-[18px] font-bold font-mono text-gray-900 dark:text-slate-100">{formatCurrency(unpaidBalance + totalPaid)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Paid</p>
              <p className="text-[18px] font-bold font-mono text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">Unpaid Balance</p>
              <p className="text-[18px] font-bold font-mono text-red-600 dark:text-red-400">{formatCurrency(unpaidBalance)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Row: Activity, Schedule & Simplified Payment Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">

        {/* Recent Activity */}
        <div className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] overflow-hidden flex flex-col lg:col-span-1">
          <div className="px-6 py-6 border-b border-gray-100 dark:border-[#2a3045] flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-slate-100">Recent Activity</h3>
            <button
              onClick={() => navigate('/notifications')}
              className="text-[13px] text-gray-500 dark:text-slate-500 font-medium hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
            >
              View All
            </button>
          </div>
          <div className="px-6 py-2 flex-1">
            {activities.length > 0 ? (
              activities.map((activity, idx) => {
                const iconMap = { booking: Calendar, payment: CreditCard, room: Home, message: MessageSquare };
                const IconComp = iconMap[activity.type] || Activity;

                return (
                  <div key={idx} className="flex items-start gap-4 py-4 border-b border-gray-100 dark:border-[#2a3045] last:border-b-0">
                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#252b3b] border border-gray-200 dark:border-[#303650] flex items-center justify-center flex-shrink-0">
                      <IconComp className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[14.5px] text-gray-800 dark:text-slate-100 leading-snug">
                        {activity.action} {activity.description && <span className="text-gray-500 dark:text-slate-400 font-normal">— {activity.description}</span>}
                      </p>
                      <p className="text-[13px] text-gray-500 dark:text-slate-500 mt-2">
                        {new Date(activity.timestamp).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <Activity className="w-10 h-10 text-gray-200 dark:text-[#303650] mb-4" />
                <p className="text-[14px] text-gray-500 dark:text-slate-500">No recent activities to show.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Payment Schedule */}
        <div className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] overflow-hidden flex flex-col lg:col-span-1">
          <div className="px-6 py-6 border-b border-gray-100 dark:border-[#2a3045]">
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-slate-100">Payment Schedule</h3>
            <p className="text-[13px] text-gray-500 dark:text-slate-500 mt-0.5">Estimated lease dues</p>
          </div>
          <div className="px-6 py-6 flex-1 flex flex-col justify-center">
            {upcomingSchedule.length > 0 ? (
               <div className="space-y-0 relative">
                  {upcomingSchedule.map((schedule, idx) => (
                    <div key={idx} className="flex gap-4">
                       <div className="flex flex-col items-center">
                          <div className={`w-3.5 h-3.5 rounded-full mt-2.5 flex-shrink-0 relative z-10 ${schedule.isNext ? 'bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.15)] dark:shadow-[0_0_0_4px_rgba(249,115,22,0.2)]' : 'bg-gray-300 dark:bg-[#4a5578]'}`}></div>
                          {idx !== upcomingSchedule.length - 1 && <div className="w-[2px] min-h-[40px] h-full bg-gray-200 dark:bg-[#2a3045] my-2 flex-1"></div>}
                       </div>
                       <div className="pb-6">
                          <p className={`text-[15px] font-bold leading-tight ${schedule.isNext ? 'text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}>
                            {schedule.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[14px] font-semibold text-gray-500 dark:text-slate-500">
                              {formatCurrency(schedule.amount)}
                            </span>
                            {schedule.isNext && <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-orange-100/80 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">Next Due</span>}
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            ) : (
               <div className="py-8 flex flex-col items-center justify-center text-center h-full">
                 <CalendarClock className="w-10 h-10 text-gray-200 dark:text-[#303650] mb-4" />
                 <p className="text-[14px] text-gray-500 dark:text-slate-500">No upcoming scheduled payments.</p>
               </div>
            )}
          </div>
        </div>

        {/* Simplified Payment Summary */}
        <div className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] overflow-hidden flex flex-col lg:col-span-1">
          <div className="px-6 py-6 border-b border-gray-100 dark:border-[#2a3045]">
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-slate-100">Current Payment Cycle</h3>
            <p className="text-[13px] text-gray-500 dark:text-slate-500 mt-0.5">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="px-6 py-6 flex-1 flex flex-col justify-center">

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-[15px] text-gray-500 dark:text-slate-400">Total Charges (Rent & Add-ons)</span>
                <span className="text-[15px] font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(totalMonthlySummary)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[15px] text-gray-500 dark:text-slate-400">Total Paid Amount</span>
                <span className="text-[15px] font-semibold text-green-600 dark:text-green-400">−{formatCurrency(totalPaid)}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-[#2a3045]">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[16px] font-bold text-gray-900 dark:text-slate-100">Remaining Balance</span>
                <span className={`text-[20px] font-bold font-mono ${unpaidBalance > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(unpaidBalance)}
                </span>
              </div>

              {unpaidBalance > 0 ? (
                <button
                  onClick={() => navigate('/payments')}
                  className="w-full py-4.5 bg-gray-100 dark:bg-[#252b3b] border border-gray-200 dark:border-[#303650] text-gray-900 dark:text-slate-100 rounded-xl text-[15px] font-semibold hover:bg-gray-200 dark:hover:bg-[#303650] transition-colors"
                >
                  Make a Payment
                </button>
              ) : (
                <div className="w-full py-4.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 rounded-xl text-[15px] font-semibold text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> You are all caught up!
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default TenantDashboard;
