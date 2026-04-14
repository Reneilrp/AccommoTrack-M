import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Calendar,
  TrendingUp,
  LucidePhilippinePeso,
  AlertCircle,
  Building2,
  XCircle,
  Clock,
  ShieldAlert,
  FileWarning,
} from 'lucide-react';
import api from '../../utils/api';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';

export default function DashboardPage({ user }) {
  const __navigate = useNavigate();
  const { uiState, updateData } = useUIState();
  const isCaretaker = user?.role === 'caretaker';
  const dashboardKey = isCaretaker ? 'caretaker_dashboard' : 'landlord_dashboard';
  const cachedData = uiState.data?.[dashboardKey] || cacheManager.get(dashboardKey);

  const [stats, setStats] = useState(cachedData?.stats || null);
  const [activities, setActivities] = useState(cachedData?.activities || []);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [upcomingPayments, setUpcomingPayments] = useState(
    cachedData?.upcomingPayments || {
      upcomingCheckouts: [],
      unpaidBookings: [],
      vacatingSoon: [],
      billingHealth: {
        dueForBillingCount: 0,
        dueForBilling: [],
        overdueInvoicesCount: 0,
        overdueInvoicesAmount: 0,
        dueSoonInvoicesCount: 0,
        dueSoonInvoicesAmount: 0,
        overdueInvoices: [],
        dueSoonInvoices: [],
      },
    }
  );
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState('');
  const initialLoadRef = React.useRef(!cachedData);

  const fetchVerificationStatus = React.useCallback(async () => {
    try {
      const res = await api.get('/landlord/my-verification');
      setVerificationStatus(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setVerificationStatus({ status: 'not_submitted' });
      }
    }
  }, []);

  const fetchDashboardData = React.useCallback(async () => {
    try {
      if (initialLoadRef.current) setLoading(true);
      initialLoadRef.current = false;
      setError('');

      const [statsRes, activitiesRes, paymentsRes] = await Promise.all([
        api.get('/landlord/dashboard/stats'),
        api.get('/landlord/dashboard/recent-activities'),
        api.get('/landlord/dashboard/upcoming-payments')
      ]);

      const statsData = statsRes.data;
      const activitiesData = activitiesRes.data;
      const paymentsData = paymentsRes.data;

      setStats(statsData);
      setActivities(activitiesData);
      setUpcomingPayments(paymentsData);

      const dashboardState = {
        stats: statsData,
        activities: activitiesData,
        upcomingPayments: paymentsData
      };

      updateData(dashboardKey, dashboardState);
      cacheManager.set(dashboardKey, dashboardState);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dashboardKey, updateData]);

  useEffect(() => {
    fetchDashboardData();
    fetchVerificationStatus();
  }, [fetchDashboardData, fetchVerificationStatus]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'booking': return <Calendar className="w-5 h-5" />;
      case 'room': return <Home className="w-5 h-5" />;
      case 'property': return <Building2 className="w-5 h-5" />;
      case 'payment': return <LucidePhilippinePeso className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const resolveActivityColor = (activity) => {
    const explicitColor = String(activity?.color || '').toLowerCase();
    if (['green', 'blue', 'yellow', 'red', 'gray'].includes(explicitColor)) {
      return explicitColor;
    }

    const status = String(activity?.status || '').toLowerCase();
    const type = String(activity?.type || '').toLowerCase();

    if (type === 'property' && (status === 'updated' || status === 'changed')) return 'blue';
    if (type === 'room' && status === 'occupied') return 'blue';
    if (['cancelled', 'canceled', 'rejected', 'failed', 'declined', 'overdue', 'refunded'].includes(status)) return 'red';
    if (['pending', 'pending_offline', 'in_progress', 'partial', 'partial-completed', 'processing'].includes(status)) return 'yellow';
    if (['confirmed', 'completed', 'paid', 'approved', 'active', 'available', 'resolved', 'succeeded', 'verified'].includes(status)) return 'green';
    if (['inactive', 'maintenance', 'draft'].includes(status)) return 'gray';

    return 'gray';
  };

  const getActivityColor = (activity) => {
    switch (resolveActivityColor(activity)) {
      case 'green': return 'bg-green-100 text-green-600';
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'yellow': return 'bg-yellow-100 text-yellow-600';
      case 'red': return 'bg-red-100 text-red-600';
      case 'gray': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusColor = (activity) => {
    const status = String(activity?.status || '').toLowerCase();

    if (status === 'updated' || status === 'changed') return 'bg-blue-100 text-blue-600';
    if (['pending', 'pending_offline', 'in_progress', 'partial', 'partial-completed', 'processing'].includes(status)) return 'bg-yellow-100 text-yellow-600';
    if (['confirmed', 'completed', 'paid', 'approved', 'active', 'available', 'resolved', 'succeeded', 'verified'].includes(status)) return 'bg-green-100 text-green-600';
    if (['cancelled', 'canceled', 'rejected', 'failed', 'declined', 'overdue', 'refunded'].includes(status)) return 'bg-red-100 text-red-600';
    if (['inactive', 'maintenance', 'draft'].includes(status)) return 'bg-gray-100 text-gray-600';

    return getActivityColor(activity);
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString()}`;

  const openBookingDrilldown = (booking) => {
    if (!booking?.id) return;

    const params = new URLSearchParams();
    params.set('status', 'confirmed');
    params.set('bookingId', String(booking.id));
    if (booking.tenantName) {
      params.set('search', booking.tenantName);
    }
    __navigate(`/bookings?${params.toString()}`);
  };

  const openInvoiceDrilldown = (invoice, defaultFilter = 'overdue') => {
    if (!invoice?.id) return;

    const params = new URLSearchParams();
    params.set('filter', defaultFilter);
    params.set('invoiceId', String(invoice.id));
    if (invoice.tenantName) {
      params.set('search', invoice.tenantName);
    }
    __navigate(`/payments?${params.toString()}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleActivityClick = (activity) => {
    if (!activity) return;

    const type = String(activity.type || '').toLowerCase();
    const entityId = activity.id;
    const description = activity.description || '';

    // Extract tenant name from description if available
    const tenantNameMatch = description.match(/^([^\s]+(?:\s+[^\s]+)?)/);
    const tenantName = tenantNameMatch ? tenantNameMatch[1] : '';

    switch (type) {
      case 'booking': {
        const params = new URLSearchParams();
        if (entityId) {
          params.set('bookingId', String(entityId));
        }
        if (tenantName) {
          params.set('search', tenantName);
        }
        const status = String(activity.status || '').toLowerCase();
        if (status) {
          params.set('status', status);
        }
        __navigate(`/bookings?${params.toString()}`);
        break;
      }
      case 'payment': {
        const params = new URLSearchParams();
        const invoiceId = activity.invoice_id || activity.data?.invoice_id || entityId;
        if (invoiceId) {
          params.set('invoiceId', String(invoiceId));
        }
        if (tenantName) {
          params.set('search', tenantName);
        }
        const status = String(activity.status || '').toLowerCase();
        if (status === 'overdue') params.set('filter', 'overdue');
        else if (status === 'refunded' || status === 'partially_refunded') params.set('filter', 'refunded');
        else if (status === 'paid' || status === 'confirmed' || status === 'succeeded') params.set('filter', 'paid');
        else if (status === 'pending_verification' || status === 'pending_offline') params.set('filter', 'pending_verification');
        else params.set('filter', 'pending');
        __navigate(`/payments?${params.toString()}`);
        break;
      }
      case 'room': {
        const params = new URLSearchParams();
        if (entityId) {
          params.set('roomId', String(entityId));
        }
        __navigate(`/rooms?${params.toString()}`);
        break;
      }
      case 'property': {
        const params = new URLSearchParams();
        if (entityId) {
          params.set('propertyId', String(entityId));
        }
        __navigate(`/properties?${params.toString()}`);
        break;
      }
      case 'maintenance': {
        const params = new URLSearchParams();
        if (entityId) {
          params.set('requestId', String(entityId));
        }
        __navigate(`/maintenance?${params.toString()}`);
        break;
      }
      case 'addon': {
        const params = new URLSearchParams();
        if (entityId) {
          params.set('requestId', String(entityId));
        }
        __navigate(`/addons?${params.toString()}`);
        break;
      }
      default:
        break;
    }
  };

  const getVerificationBannerConfig = (status) => {
    switch (status) {
      case 'pending':
        return {
          wrapperClass: 'bg-yellow-50 border-yellow-200',
          icon: <Clock className="w-6 h-6 text-yellow-600" />,
          message: 'Your registration is waiting for admin to enable the document submission stage.',
        };
      case 'partial_verified':
        return {
          wrapperClass: 'bg-blue-50 border-blue-200',
          icon: <ShieldAlert className="w-6 h-6 text-blue-600" />,
          message: 'Your account is partially verified. Submit your documents in Settings to complete full verification.',
        };
      case 'pending_documents_review':
        return {
          wrapperClass: 'bg-indigo-50 border-indigo-200',
          icon: <Clock className="w-6 h-6 text-indigo-600" />,
          message: 'Your documents are under admin review. Full verification is still in progress.',
        };
      case 'rejected':
        return {
          wrapperClass: 'bg-red-50 border-red-200',
          icon: <FileWarning className="w-6 h-6 text-red-600" />,
          message: 'Your landlord verification submission was rejected. This is separate from your property drafts. Check Settings for the reason and resubmit documents.',
        };
      case 'approved':
        return null;
      default:
        return {
          wrapperClass: 'bg-orange-50 border-orange-200',
          icon: <ShieldAlert className="w-6 h-6 text-orange-600" />,
          message: 'Please complete your verification in Settings to unlock all features.',
        };
    }
  };

  const verificationBanner = verificationStatus ? getVerificationBannerConfig(verificationStatus.status) : null;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-32 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="space-y-2">
                <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm h-96 flex flex-col gap-4">
            <div className="w-48 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex gap-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm h-96 flex flex-col gap-4">
            <div className="w-40 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            {[...Array(4)].map((_, k) => (
              <div key={k} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center">
        <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <p className="text-red-600 text-lg font-semibold mb-2">Error loading dashboard</p>
        <button onClick={fetchDashboardData} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verification Status Banner */}
      {verificationBanner && (
        <div className={`rounded-xl border p-4 ${verificationBanner.wrapperClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {verificationBanner.icon}
              <div>
                <h3 className="font-semibold text-gray-900">Verification Status: {verificationStatus.status.replace('_', ' ').toUpperCase()}</h3>
                <p className="text-sm text-gray-600">{verificationBanner.message}</p>
              </div>
            </div>
            <Link to="/settings" state={{ tab: 'verification' }} className="px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg text-sm font-medium shadow-sm">View Status</Link>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isCaretaker ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-6`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><Building2 className="w-6 h-6 text-blue-600" /></div>
            <span className="text-xs text-green-600 font-medium">{stats?.properties.active}/{stats?.properties.total} Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.properties.total}</p>
          <p className="text-sm text-gray-500">Total Properties</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><Home className="w-6 h-6 text-green-600" /></div>
            <span className="text-xs text-blue-600 font-medium">{stats?.rooms.occupancyRate}% Occupied</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.rooms.total}</p>
          <p className="text-sm text-gray-500">{stats?.rooms.occupied} Occupied · {stats?.rooms.available} Available</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><Calendar className="w-6 h-6 text-purple-600" /></div>
            {stats?.bookings.pending > 0 && <span className="text-xs text-yellow-600 font-medium">{stats?.bookings.pending} Pending</span>}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{(stats?.bookings.pending || 0) + (stats?.bookings.confirmed || 0)}</p>
          <p className="text-sm text-gray-500">Bookings (Confirmed & Pending)</p>
        </div>

        {!isCaretaker && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <LucidePhilippinePeso className="w-6 h-6 text-orange-600" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">₱{stats?.revenue?.monthly?.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Monthly Revenue</p>
          </div>
        )}
      </div>

      {/* Activities and Alerts */}
      <div className={`grid grid-cols-1 ${isCaretaker ? 'lg:grid-cols-3' : 'lg:grid-cols-3'} gap-6`}>
        <div className={`${isCaretaker ? 'lg:col-span-2' : 'lg:col-span-2'} bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-400/50 dark:border-gray-700 p-6`}>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activities</h2>
          <div className="space-y-4">
            {activities.length === 0 ? <p className="text-center py-8 text-gray-500 italic">No recent activities</p> :
              activities.slice(0, 6).map((activity, index) => (
                <button
                  key={index}
                  onClick={() => handleActivityClick(activity)}
                  className="w-full flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-lg px-2 py-2 -mx-2"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity)}`}>{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{activity.action}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-2">{formatDate(activity.timestamp)}</p>
                  </div>
                  <span className={`px-2 py-2 text-xs font-medium rounded-full capitalize ${getStatusColor(activity)}`}>{activity.status}</span>
                </button>
              ))
            }
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Upcoming Checkouts</h2>
            <div className="space-y-4">
              {upcomingPayments.upcomingCheckouts.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">None scheduled</p> :
                upcomingPayments.upcomingCheckouts.slice(0, 4).map((c) => (
                  <div key={c.id} className={`p-4 rounded-lg border ${getUrgencyColor(c.urgency)}`}>
                    <div className="flex justify-between font-semibold text-sm text-gray-900 dark:text-white"><span>{c.tenantName}</span><span>{c.daysLeft}d</span></div>
                    <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">{c.propertyTitle} - Room {c.roomNumber}</p>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Vacating Soon</h2>
            <p className="text-xs text-gray-500 mb-4">Tenants who submitted move-out notice</p>
            <div className="space-y-4">
              {(upcomingPayments.vacatingSoon || []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No move-out notices yet</p>
              ) : (
                (upcomingPayments.vacatingSoon || []).slice(0, 4).map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => openBookingDrilldown(tenant)}
                    className={`w-full p-4 rounded-lg border text-left transition-colors hover:brightness-95 ${getUrgencyColor(tenant.urgency)}`}
                  >
                    <div className="flex justify-between font-semibold text-sm text-gray-900 dark:text-white">
                      <span>{tenant.tenantName}</span>
                      <span>{tenant.daysLeft}d</span>
                    </div>
                    <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">{tenant.propertyTitle} - Room {tenant.roomNumber}</p>
                    <p className="text-[11px] mt-1 text-gray-500">Move-out: {tenant.endDate}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {!isCaretaker && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Billing Health</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => {
                    const dueSoonInvoice = (upcomingPayments.billingHealth?.dueSoonInvoices || [])[0];
                    if (dueSoonInvoice) {
                      openInvoiceDrilldown(dueSoonInvoice, 'pending');
                      return;
                    }
                    __navigate('/payments?filter=pending');
                  }}
                  className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-left hover:brightness-95 transition-colors"
                >
                  <p className="text-[11px] text-amber-700 font-semibold uppercase">Due This Week</p>
                  <p className="text-lg font-bold text-amber-800 dark:text-amber-300">{upcomingPayments.billingHealth?.dueForBillingCount || 0}</p>
                </button>
                <button
                  onClick={() => {
                    const overdueInvoice = (upcomingPayments.billingHealth?.overdueInvoices || [])[0];
                    if (overdueInvoice) {
                      openInvoiceDrilldown(overdueInvoice, 'overdue');
                      return;
                    }
                    __navigate('/payments?filter=overdue');
                  }}
                  className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700 text-left hover:brightness-95 transition-colors"
                >
                  <p className="text-[11px] text-red-700 font-semibold uppercase">Overdue Invoices</p>
                  <p className="text-lg font-bold text-red-800 dark:text-red-300">{upcomingPayments.billingHealth?.overdueInvoicesCount || 0}</p>
                </button>
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Overdue Amount: <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(upcomingPayments.billingHealth?.overdueInvoicesAmount || 0)}</span>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Due Soon Amount: <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(upcomingPayments.billingHealth?.dueSoonInvoicesAmount || 0)}</span>
                </p>
              </div>

              <div className="space-y-3">
                {(upcomingPayments.billingHealth?.overdueInvoices || []).slice(0, 3).map((invoice) => (
                  <button
                    key={invoice.id}
                    onClick={() => openInvoiceDrilldown(invoice, 'overdue')}
                    className="w-full p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-left hover:brightness-95 transition-colors"
                  >
                    <div className="flex justify-between text-xs font-semibold text-gray-900 dark:text-white">
                      <span>{invoice.tenantName}</span>
                      <span>{formatCurrency(invoice.amount)}</span>
                    </div>
                    <p className="text-[11px] mt-1 text-gray-600 dark:text-gray-400">
                      {invoice.propertyTitle} - Room {invoice.roomNumber} - Due {invoice.dueDate}
                    </p>
                  </button>
                ))}
                {(upcomingPayments.billingHealth?.overdueInvoices || []).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">No overdue invoices</p>
                )}
              </div>
            </div>
          )}

          {!isCaretaker && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Unpaid Invoices</h2>
              <div className="space-y-4">
                {upcomingPayments.unpaidBookings.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">All paid up!</p> :
                  upcomingPayments.unpaidBookings.slice(0, 4).map((b) => (
                    <div key={b.id} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex justify-between font-semibold text-sm text-gray-900 dark:text-white"><span>{b.tenantName}</span><span>₱{b.amount.toLocaleString()}</span></div>
                      <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">{b.propertyTitle} - Room {b.roomNumber}</p>
                    </div>
                  ))
                }
              </div>
              <Link to="/payments" className="block text-center mt-4 text-xs font-bold text-brand-700 hover:underline uppercase tracking-wider">View All Payments &rarr;</Link>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
