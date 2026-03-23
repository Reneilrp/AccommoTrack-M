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

// ─── Shared Components ───────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const styles = {
    active: 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/20',
    ended: 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-slate-500/15 dark:text-slate-400 dark:border-slate-500/20',
    overdue: 'bg-red-100 text-red-600 border border-red-200 dark:bg-red-500/12 dark:text-red-400 dark:border-red-500/20',
    pending: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    paid: 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/20',
  };
  return (
    <span className={`text-[12px] font-semibold px-3 py-1 rounded-full inline-block ${styles[status] || styles.active}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const RoomBadge = ({ roomNumber, color = '#22c55e' }) => (
  <span className="inline-flex items-center gap-2 font-semibold font-mono text-sm text-gray-800 dark:text-slate-100">
    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
    Room {roomNumber}
  </span>
);

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

  const fetchDashboardData = useCallback(async () => {
    try {
      if (!cachedData) setLoading(true);

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
  }, [cachedData, updateData]);

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
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
            { icon: CheckCircle2, label: 'All Paid Up', value: 'Yes', color: 'green' },
          ].map((card, i) => (
            <div key={i} className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[14px] p-5 relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-[14px] ${
                card.color === 'green' ? 'bg-green-500' : card.color === 'blue' ? 'bg-blue-400' : 'bg-purple-400'
              }`} />
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                card.color === 'green' ? 'bg-green-100 dark:bg-green-500/15' : card.color === 'blue' ? 'bg-blue-100 dark:bg-blue-500/12' : 'bg-purple-100 dark:bg-purple-500/12'
              }`}>
                <card.icon className={`w-5 h-5 ${
                  card.color === 'green' ? 'text-green-600 dark:text-green-400' : card.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'
                }`} />
              </div>
              <div className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-slate-100">{card.value}</div>
              <div className="text-[13px] text-gray-500 dark:text-slate-400 font-medium tracking-wide mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center mb-6">
            <Home className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-3">Ready to find your new home?</h2>
          <p className="text-[15px] text-gray-500 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
            You don't have an active stay yet. Browse our verified properties and find the perfect room for your needs.
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="px-8 py-3.5 bg-green-600 text-white rounded-xl font-bold text-[15px] hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
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

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-[14px] text-gray-500 dark:text-slate-400 mt-1">{getGreeting()} — here is your stay overview.</p>
        </div>
        <button
          onClick={() => navigate('/notifications')}
          className="w-10 h-10 bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-xl flex items-center justify-center relative hover:bg-gray-50 dark:hover:bg-[#252b3b] transition-colors"
        >
          <Bell className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          {(stats?.notifications?.unread || 0) > 0 && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-400 rounded-full border border-white dark:border-[#1e2332]" />
          )}
        </button>
      </div>

      {/* ── High Priority Action Notification (Unpaid Balance) ── */}
      {unpaidBalance > 0 && (
        <div className="bg-red-50 dark:bg-gradient-to-r dark:from-red-500/15 dark:to-[#1e2332] border border-red-200 dark:border-red-500/30 rounded-[16px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm">
          <div className="flex items-start md:items-center gap-4">
            <div className="bg-red-100 dark:bg-red-500/20 p-3 rounded-full flex-shrink-0 mt-1 md:mt-0">
              <AlertCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-800 dark:text-red-100">Action Required: Balance Due</h2>
              <p className="text-[15px] text-red-700 dark:text-red-200/80 mt-1 leading-snug">
                You have an outstanding balance of <span className="font-bold text-red-800 dark:text-red-300">{formatCurrency(unpaidBalance)}</span>. Please settle it to avoid late fees.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/payments')}
            className="w-full md:w-auto px-8 py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
          >
            Pay Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Upcoming Booking Alert ── */}
      {stayData?.upcomingBooking && (
        <div className="bg-blue-50 dark:bg-gradient-to-r dark:from-blue-500/15 dark:to-[#1e2332] border border-blue-200 dark:border-blue-500/30 rounded-[16px] p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 dark:bg-blue-500/20 p-3 rounded-full flex-shrink-0">
              <CalendarClock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-blue-900 dark:text-blue-100">Upcoming Stay at {stayData.upcomingBooking.property}</h2>
              <p className="text-[14px] text-blue-700 dark:text-blue-200/80 mt-0.5">
                Begins on <span className="font-semibold">{formatDate(stayData.upcomingBooking.startDate)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/bookings')}
            className="px-5 py-2.5 bg-white dark:bg-[#1e2332] text-blue-700 dark:text-blue-300 font-bold rounded-xl border border-blue-200 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
          >
            View
          </button>
        </div>
      )}

      {/* ── Stat Cards Grid (Read Only) ── */}
      <h2 className="text-[18px] font-bold text-gray-900 dark:text-slate-100 mb-4">Quick Summary</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-[-10px]">
        {statCards.map((card) => {
          const cm = colorMap[card.color];
          return (
            <div key={card.key} className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] p-6 relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-[4px] rounded-t-[16px] ${cm.border}`} />
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${cm.iconBg}`}>
                <card.icon className={`w-5 h-5 ${cm.iconText}`} />
              </div>
              <div className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-slate-100 font-mono">{card.value}</div>
              <div className="text-[14px] text-gray-500 dark:text-slate-400 font-medium tracking-wide mt-1.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Your Active Rooms (Conversational Cards) ── */}
      <div className="mt-8">
        <h2 className="text-[18px] font-bold text-gray-900 dark:text-slate-100 mb-5">Your Active Rooms</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {stays.map((stay, idx) => {
            const roomColor = ROOM_COLORS[idx % ROOM_COLORS.length];
            const rent = stay.financials?.monthlyRent || stay.booking?.monthlyRent || stay.booking?.monthly_rent || 0;
            const addons = stay.financials?.monthlyAddons || stay.addons?.monthlyTotal || stay.addons?.monthly_total || 0;
            const roomTotal = stay.financials?.monthlyTotal || (rent + addons);
            const moveIn = formatDate(stay.booking?.startDate || stay.booking?.start_date);
            const daysStayed = stay.booking?.daysStayed || stay.booking?.days_stayed || 0;

            return (
              <div key={stay.booking.id} className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-[#2a3045] flex items-center justify-between bg-gray-50 dark:bg-[#232840]/50">
                  <RoomBadge roomNumber={stay.room?.roomNumber || stay.room?.room_number} color={roomColor} />
                  <StatusPill status="active" />
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <p className="text-[15px] font-semibold text-gray-800 dark:text-slate-200">{stay.property?.title}</p>
                    <p className="text-[14px] text-gray-500 dark:text-slate-400 mt-0.5">
                      {stay.room?.roomType || stay.room?.room_type || 'Standard Room'} • {stay.room?.floor ? `${stay.room.floor}${['st','nd','rd'][stay.room.floor - 1] || 'th'} Floor` : 'Floor not specified'}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-[#181c28] rounded-xl border border-gray-200 dark:border-[#2a3045]">
                    <div className="flex justify-between items-center text-[14px] mb-2">
                      <span className="text-gray-500 dark:text-slate-400">Monthly Room Total</span>
                      <span className="font-bold text-gray-900 dark:text-slate-100 text-[15px]">{formatCurrency(roomTotal)}</span>
                    </div>
                    {addons > 0 && (
                      <p className="text-[12.5px] text-gray-400 dark:text-slate-500 mt-1 italic">
                        Includes Base Rent ({formatCurrency(rent)}) and Add-ons ({formatCurrency(addons)})
                      </p>
                    )}
                  </div>

                  <div className="flex gap-4 pt-1">
                    <div className="flex-1">
                      <p className="text-[13px] text-gray-400 dark:text-slate-500 mb-1">Move-in Date</p>
                      <p className="text-[14px] font-medium text-gray-800 dark:text-slate-200">{moveIn}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] text-gray-400 dark:text-slate-500 mb-1">Duration</p>
                      <p className="text-[14px] font-medium text-gray-800 dark:text-slate-200">{daysStayed} days so far</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Row: Activity, Schedule & Simplified Payment Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">

        {/* Recent Activity */}
        <div className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] overflow-hidden flex flex-col lg:col-span-1">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-[#2a3045] flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-slate-100">Recent Activity</h3>
            <button
              onClick={() => navigate('/notifications')}
              className="text-[13px] text-gray-400 dark:text-slate-500 font-medium hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
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
                      <p className="text-[13px] text-gray-400 dark:text-slate-500 mt-1">
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
                <Activity className="w-10 h-10 text-gray-200 dark:text-[#303650] mb-3" />
                <p className="text-[14px] text-gray-400 dark:text-slate-500">No recent activities to show.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Payment Schedule */}
        <div className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] overflow-hidden flex flex-col lg:col-span-1">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-[#2a3045]">
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-slate-100">Payment Schedule</h3>
            <p className="text-[13px] text-gray-400 dark:text-slate-500 mt-0.5">Estimated lease dues</p>
          </div>
          <div className="px-6 py-5 flex-1 flex flex-col justify-center">
            {upcomingSchedule.length > 0 ? (
               <div className="space-y-0 relative">
                  {upcomingSchedule.map((schedule, idx) => (
                    <div key={idx} className="flex gap-4">
                       <div className="flex flex-col items-center">
                          <div className={`w-3.5 h-3.5 rounded-full mt-1.5 flex-shrink-0 relative z-10 ${schedule.isNext ? 'bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.15)] dark:shadow-[0_0_0_4px_rgba(249,115,22,0.2)]' : 'bg-gray-300 dark:bg-[#4a5578]'}`}></div>
                          {idx !== upcomingSchedule.length - 1 && <div className="w-[2px] min-h-[40px] h-full bg-gray-200 dark:bg-[#2a3045] my-1 flex-1"></div>}
                       </div>
                       <div className="pb-5">
                          <p className={`text-[15px] font-bold leading-tight ${schedule.isNext ? 'text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}>
                            {schedule.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
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
                 <CalendarClock className="w-10 h-10 text-gray-200 dark:text-[#303650] mb-3" />
                 <p className="text-[14px] text-gray-400 dark:text-slate-500">No upcoming scheduled payments.</p>
               </div>
            )}
          </div>
        </div>

        {/* Simplified Payment Summary */}
        <div className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[16px] overflow-hidden flex flex-col lg:col-span-1">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-[#2a3045]">
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-slate-100">Current Payment Cycle</h3>
            <p className="text-[13px] text-gray-400 dark:text-slate-500 mt-0.5">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="px-6 py-5 flex-1 flex flex-col justify-center">

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

            <div className="pt-5 border-t border-gray-100 dark:border-[#2a3045]">
              <div className="flex justify-between items-center mb-5">
                <span className="text-[16px] font-bold text-gray-900 dark:text-slate-100">Remaining Balance</span>
                <span className={`text-[20px] font-bold font-mono ${unpaidBalance > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(unpaidBalance)}
                </span>
              </div>

              {unpaidBalance > 0 ? (
                <button
                  onClick={() => navigate('/payments')}
                  className="w-full py-3.5 bg-gray-100 dark:bg-[#252b3b] border border-gray-200 dark:border-[#303650] text-gray-900 dark:text-slate-100 rounded-xl text-[15px] font-semibold hover:bg-gray-200 dark:hover:bg-[#303650] transition-colors"
                >
                  Make a Payment
                </button>
              ) : (
                <div className="w-full py-3.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 rounded-xl text-[15px] font-semibold text-center flex items-center justify-center gap-2">
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
