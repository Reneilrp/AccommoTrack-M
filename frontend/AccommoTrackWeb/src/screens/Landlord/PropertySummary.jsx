import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getImageUrl } from '../../utils/api';
import { 
  Building2, List, ArrowLeft, ArrowRight, Edit, Users, Loader2, Wrench, Star,
  CheckCircle, XCircle, Eye, AlertCircle, Clock, TrendingUp, Home, PackagePlus,
  Banknote, Shuffle, CreditCard
} from 'lucide-react';
import RoomCard from '../../components/Rooms/RoomCard';
import RoomDetails from '../../components/Rooms/RoomDetails';
import PropertyActivityLogs from './PropertyActivityLogs';
import { useSidebar } from '../../contexts/SidebarContext';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, Keyboard, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import NotFoundPage from '../NotFoundPage';

// ─── Property Dashboard ───────────────────────────────────────────────────────

function StatCard({ value, label, color = 'default', icon: Icon, onClick }) {
  const colorMap = {
    danger: { 
      text: 'text-red-600 dark:text-red-400', 
      bg: 'bg-red-50 dark:bg-red-900/20', 
      icon: 'text-red-600 dark:text-red-400',
      border: 'bg-red-500'
    },
    warning: { 
      text: 'text-orange-500 dark:text-orange-400', 
      bg: 'bg-orange-50 dark:bg-orange-900/20', 
      icon: 'text-orange-600 dark:text-orange-400',
      border: 'bg-orange-500'
    },
    success: { 
      text: 'text-green-600 dark:text-green-400', 
      bg: 'bg-green-50 dark:bg-green-900/20', 
      icon: 'text-green-600 dark:text-green-400',
      border: 'bg-green-500'
    },
    info: { 
      text: 'text-blue-600 dark:text-blue-400', 
      bg: 'bg-blue-50 dark:bg-blue-900/20', 
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'bg-blue-500'
    },
    default: { 
      text: 'text-gray-900 dark:text-white', 
      bg: 'bg-gray-50 dark:bg-gray-900/20', 
      icon: 'text-gray-600 dark:text-gray-400',
      border: 'bg-gray-400 dark:bg-gray-600'
    },
  };
  
  const theme = colorMap[color] || colorMap.default;

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-4 text-left shadow-sm hover:shadow-md hover:border-gray-400 dark:hover:border-gray-600 transition-all w-full"
    >
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.border}`} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-2xl font-bold mt-2 ${theme.text}`}>{value}</p>
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme.bg}`}>
            <Icon className={`w-5 h-5 ${theme.icon}`} />
          </div>
        )}
      </div>
    </button>
  );
}

function FeedCard({ title, badge, badgeColor = 'gray', children, onViewAll, navigateTo, icon: Icon, iconColor = 'gray' }) {
  const badgeColors = {
    danger: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    info: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    success: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  };
  const iconColors = {
    danger: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400', border: 'bg-red-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400', border: 'bg-amber-500' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400', border: 'bg-blue-500' },
    success: { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400', border: 'bg-green-500' },
    gray: { bg: 'bg-gray-50 dark:bg-gray-900/20', icon: 'text-gray-600 dark:text-gray-400', border: 'bg-gray-300 dark:bg-gray-600' },
  };
  const theme = iconColors[iconColor] || iconColors.gray;
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.border}`} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${theme.bg}`}>
              <Icon className={`w-5 h-5 ${theme.icon}`} />
            </div>
          )}
          <span className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {badge !== undefined && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[badgeColor]}`}>{badge}</span>
          )}
          {(onViewAll || navigateTo) && (
            <button
              onClick={onViewAll || navigateTo}
              className="text-xs font-bold text-green-600 dark:text-green-400 hover:underline"
            >
              View all
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col divide-y divide-gray-50 dark:divide-gray-700/60">
        {children}
      </div>
    </div>
  );
}

function RequestRow({ initials, avatarColor = 'blue', name, sub, actions, pill }) {
  const avatarColors = {
    blue:   'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    amber:  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    red:    'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    teal:   'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
    green:  'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  };
  return (
    <div className="flex items-center gap-3 py-2.5 min-h-[50px] first:pt-0 last:pb-0">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColors[avatarColor]}`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{name}</div>
        <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate uppercase tracking-tight">{sub}</div>
      </div>
      <div className="flex-shrink-0 flex gap-1.5 items-center">
        {actions}
        {pill}
      </div>
    </div>
  );
}

function ActionBtn({ label, variant = 'gray', onClick }) {
  const variants = {
    green: 'bg-green-600 text-white hover:bg-green-700 shadow-sm shadow-green-500/20',
    red:   'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800',
    blue:  'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20',
    gray:  'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600',
  };
  return (
    <button
      onClick={onClick}
      className={`text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-md leading-none transition-all ${variants[variant]}`}
    >
      {label}
    </button>
  );
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
}

function EmptyRow({ message }) {
  return (
    <div className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">{message}</div>
  );
}

function PropertyDashboard({ propertyId, navigate }) {
  const [dashData, setDashData] = useState({
    pendingBookings: [],
    overdueInvoices: [],
    pendingAddonRequests: [],
    maintenanceRequests: [],
    transferRequests: [],
    recentReviews: [],
    occupancy: null,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (!propertyId) return;
    loadDashboard();
  }, [propertyId]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [bookingsRes, invoicesRes, addonRequestsRes, maintenanceRes, transfersRes, reviewsRes, roomsRes] = await Promise.allSettled([
        api.get(`/bookings?property_id=${propertyId}&status=pending`),
        api.get(`/invoices?property_id=${propertyId}&status=overdue`),
        api.get(`/landlord/properties/${propertyId}/addons/pending`),
        api.get(`/landlord/maintenance-requests?property_id=${propertyId}&status=pending`),
        api.get(`/landlord/transfers?property_id=${propertyId}&status=pending`),
        api.get(`/landlord/reviews?property_id=${propertyId}&limit=3`),
        api.get(`/rooms/property/${propertyId}`),
      ]);

      const get = (res) => {
        if (res.status !== 'fulfilled') return [];
        const payload = res.value?.data;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload)) return payload;
        return [];
      };

      const rooms = get(roomsRes);
      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter(r => r.status === 'occupied' || r.available_slots === 0).length;
      const pendingAddonRequests = addonRequestsRes.status === 'fulfilled'
        ? (addonRequestsRes.value?.data?.pendingRequests || [])
        : [];

      setDashData({
        pendingBookings: get(bookingsRes),
        overdueInvoices: (invoicesRes.status === 'fulfilled' ? invoicesRes.value?.data?.data : []) || [],
        pendingAddonRequests,
        maintenanceRequests: (maintenanceRes.status === 'fulfilled' ? maintenanceRes.value?.data?.data : []) || [],
        transferRequests: get(transfersRes),
        recentReviews: get(reviewsRes),
        occupancy: totalRooms > 0 ? `${occupiedRooms}/${totalRooms}` : '—',
      });
    } catch (err) {
      console.error('Dashboard load error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId, action) => {
    const key = `booking_${bookingId}_${action}`;
    setActionLoading(p => ({ ...p, [key]: true }));
    try {
      await api.patch(`/landlord/bookings/${bookingId}/status`, { status: action === 'approve' ? 'confirmed' : 'rejected' });
      setDashData(p => ({ ...p, pendingBookings: p.pendingBookings.filter(b => b.id !== bookingId) }));
    } catch (err) {
      console.error(`Failed to ${action} booking`, err);
    } finally {
      setActionLoading(p => ({ ...p, [key]: false }));
    }
  };

  const handleAddonRequestAction = async (requestId, bookingId, addonId, action) => {
    const key = `addon_${requestId}_${action}`;
    setActionLoading(p => ({ ...p, [key]: true }));
    try {
      await api.patch(`/landlord/bookings/${bookingId}/addons/${addonId}`, { action, note: null });
      setDashData(p => ({
        ...p,
        pendingAddonRequests: p.pendingAddonRequests.filter(r => r.requestId !== requestId),
      }));
    } catch (err) {
      console.error(`Failed to ${action} add-on request`, err);
    } finally {
      setActionLoading(p => ({ ...p, [key]: false }));
    }
  };

  const { pendingBookings, overdueInvoices, pendingAddonRequests, maintenanceRequests, transferRequests, recentReviews, occupancy } = dashData;

  const renderStars = (rating) => {
    const n = Math.round(Number(rating) || 0);
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-5 animate-pulse">
        {/* Stat row skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 h-[100px]">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-2 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700/50"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Row 1 skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 h-[240px]">
              <div className="flex items-center justify-between mb-6">
                <div className="h-2.5 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-12 bg-gray-100 dark:bg-gray-700/50 rounded-full"></div>
              </div>
              <div className="space-y-5">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700/50 flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-2.5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-2 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Row 2 skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 h-[240px]">
              <div className="flex items-center justify-between mb-6">
                <div className="h-2.5 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-12 bg-gray-100 dark:bg-gray-700/50 rounded-full"></div>
              </div>
              <div className="space-y-5">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700/50 flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-2.5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-2 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          value={overdueInvoices.length || 0}
          label="Overdue invoices"
          color="danger"
          icon={AlertCircle}
          onClick={() => navigate(`/payments?property_id=${propertyId}&status=overdue`)}
        />
        <StatCard
          value={pendingBookings.length || 0}
          label="Pending bookings"
          color="warning"
          icon={Clock}
          onClick={() => navigate(`/bookings?property_id=${propertyId}&status=pending`)}
        />
        <StatCard
          value={transferRequests.length || 0}
          label="Transfer requests"
          color="info"
          icon={Shuffle}
          onClick={() => navigate(`/transfers?property_id=${propertyId}`)}
        />
        <StatCard
          value={occupancy || '—'}
          label="Rooms occupied"
          color="success"
          icon={Home}
          onClick={() => navigate(`/rooms?property=${propertyId}`)}
        />
      </div>

      {/* Row 1: Pending Bookings + Overdue Payments + Add-ons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">

        <FeedCard
          title="Pending bookings"
          badge={pendingBookings.length}
          badgeColor={pendingBookings.length > 0 ? 'warning' : 'gray'}
          onViewAll={() => navigate(`/bookings?property_id=${propertyId}&status=pending`)}
        >
          {pendingBookings.length === 0 ? (
            <EmptyRow message="No pending bookings" />
          ) : (
            pendingBookings.slice(0, 3).map(b => (
              <RequestRow
                key={b.id}
                initials={getInitials(b.tenant?.name || b.tenant_name)}
                avatarColor="blue"
                name={b.tenant?.name || b.tenant_name || 'Tenant'}
                sub={`${b.room?.name || b.room_name || 'Room'} · ${b.start_date ? new Date(b.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'} · ${b.payment_plan || 'Monthly'}`}
                actions={
                  <>
                    <ActionBtn
                      label={actionLoading[`booking_${b.id}_approve`] ? '...' : 'Approve'}
                      variant="green"
                      onClick={() => handleBookingAction(b.id, 'approve')}
                    />
                    <ActionBtn
                      label={actionLoading[`booking_${b.id}_reject`] ? '...' : 'Decline'}
                      variant="red"
                      onClick={() => handleBookingAction(b.id, 'reject')}
                    />
                  </>
                }
              />
            ))
          )}
        </FeedCard>

        <FeedCard
          title="Overdue payments"
          badge={overdueInvoices.length}
          badgeColor={overdueInvoices.length > 0 ? 'danger' : 'gray'}
          icon={CreditCard}
          iconColor={overdueInvoices.length > 0 ? 'danger' : 'gray'}
          onViewAll={() => navigate(`/payments?property_id=${propertyId}&status=overdue`)}
        >
          {overdueInvoices.length === 0 ? (
            <EmptyRow message="No overdue invoices" />
          ) : (
            overdueInvoices.slice(0, 3).map(inv => {
              const daysOverdue = inv.due_date
                ? Math.floor((Date.now() - new Date(inv.due_date)) / 86400000)
                : null;
              return (
                <RequestRow
                  key={inv.id}
                  initials={getInitials(inv.tenant?.name || inv.tenant_name)}
                  avatarColor="red"
                  name={inv.tenant?.name || inv.tenant_name || 'Tenant'}
                  sub={`${inv.room?.name || inv.room_name || 'Room'} · ${inv.month || inv.period || 'Invoice'}`}
                  pill={
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                        ₱{Number(inv.amount || inv.total_amount || 0).toLocaleString()}
                      </div>
                      {daysOverdue !== null && (
                        <div className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                          {daysOverdue}d overdue
                        </div>
                      )}
                    </div>
                  }
                />
              );
            })
          )}
        </FeedCard>

        <FeedCard
          title="Add-ons Service"
          badge={pendingAddonRequests.length}
          badgeColor={pendingAddonRequests.length > 0 ? 'info' : 'gray'}
          onViewAll={() => navigate(`/addons?property_id=${propertyId}`, { state: { propertyId } })}
        >
          {pendingAddonRequests.length === 0 ? (
            <EmptyRow message="No pending add-on requests" />
          ) : (
            pendingAddonRequests.slice(0, 3).map(req => (
              <RequestRow
                key={req.requestId}
                initials={getInitials(req.tenant?.name || 'Tenant')}
                avatarColor="green"
                name={req.addonName || 'Add-on request'}
                sub={`Room ${req.roomNumber || '—'} · ${req.tenant?.name || 'Tenant'}`}
                actions={
                  <>
                    <ActionBtn
                      label={actionLoading[`addon_${req.requestId}_approve`] ? '...' : 'Approve'}
                      variant="green"
                      onClick={() => handleAddonRequestAction(req.requestId, req.bookingId, req.addonId, 'approve')}
                    />
                    <ActionBtn
                      label={actionLoading[`addon_${req.requestId}_reject`] ? '...' : 'Decline'}
                      variant="red"
                      onClick={() => handleAddonRequestAction(req.requestId, req.bookingId, req.addonId, 'reject')}
                    />
                  </>
                }
              />
            ))
          )}
        </FeedCard>

      </div>

      {/* Row 2: Maintenance + Transfers + Reviews */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <FeedCard
          title="Maintenance requests"
          badge={maintenanceRequests.length}
          badgeColor={maintenanceRequests.length > 0 ? 'warning' : 'gray'}
          onViewAll={() => navigate(`/maintenance?property_id=${propertyId}`)}
        >
          {maintenanceRequests.length === 0 ? (
            <EmptyRow message="No open requests" />
          ) : (
            maintenanceRequests.slice(0, 3).map(m => (
              <RequestRow
                key={m.id}
                initials={getInitials(m.tenant?.name || m.tenant_name)}
                avatarColor="amber"
                name={m.title || m.issue || 'Maintenance issue'}
                sub={`${m.room?.name || m.room_name || 'Room'} · ${m.tenant?.name || m.tenant_name || ''}`}
                pill={
                  <ActionBtn
                    label="View"
                    variant="blue"
                    onClick={() => navigate(`/maintenance?property_id=${propertyId}&request_id=${m.id}`)}
                  />
                }
              />
            ))
          )}
        </FeedCard>

        <FeedCard
          title="Transfer requests"
          badge={transferRequests.length}
          badgeColor={transferRequests.length > 0 ? 'info' : 'gray'}
          onViewAll={() => navigate(`/transfers?property_id=${propertyId}`)}
        >
          {transferRequests.length === 0 ? (
            <EmptyRow message="No pending transfers" />
          ) : (
            transferRequests.slice(0, 3).map(t => (
              <RequestRow
                key={t.id}
                initials={getInitials(t.tenant?.name || t.tenant_name)}
                avatarColor="purple"
                name={t.tenant?.name || t.tenant_name || 'Tenant'}
                sub={`${t.from_room?.name || t.from_room_name || '—'} → ${t.to_room?.name || t.to_room_name || '—'}`}
                pill={
                  <ActionBtn
                    label="View"
                    variant="blue"
                    onClick={() => navigate(`/transfers?property_id=${propertyId}&request_id=${t.id}`)}
                  />
                }
              />
            ))
          )}
        </FeedCard>

        <FeedCard
          title="Recent reviews"
          onViewAll={() => navigate(`/reviews?property_id=${propertyId}`)}
        >
          {recentReviews.length === 0 ? (
            <EmptyRow message="No reviews yet" />
          ) : (
            recentReviews.slice(0, 3).map(r => (
              <RequestRow
                key={r.id}
                initials={getInitials(r.tenant?.name || r.reviewer_name)}
                avatarColor="teal"
                name={r.tenant?.name || r.reviewer_name || 'Tenant'}
                sub={
                  <span>
                    <span className="text-amber-500">{renderStars(r.rating)}</span>
                    {' · '}
                    <span>{r.room?.name || r.room_name || ''}</span>
                  </span>
                }
                pill={
                  <ActionBtn
                    label={r.landlord_response ? "Replied" : "Reply"}
                    variant={r.landlord_response ? "gray" : "blue"}
                    onClick={() => navigate(`/reviews/${r.id}`)}
                  />
                }
              />
            ))
          )}
        </FeedCard>

      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PropertySummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { uiState, updateData } = useUIState();
  
  const cacheKey = `property_summary_${id}`;
  
  const getCachedData = () => {
    return uiState.data?.[cacheKey] || cacheManager.get(cacheKey);
  };

  const [property, setProperty] = useState(() => getCachedData()?.property || null);
  const [loading, setLoading] = useState(!property);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);

  const [images, setImages] = useState([]);
  const [idx, setIdx] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState(null);
  const galleryRef = useRef(null);

  const [showActivityLogs, setShowActivityLogs] = useState(false);

  // Keep RoomDetails modal state for if user navigates to rooms
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [showRoomDetails, setShowRoomDetails] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadProperty();
  }, [id]);

  useEffect(() => {
    const cached = getCachedData();
    if (cached?.property && !property) {
      setProperty(cached.property);
      setLoading(false);
    }
  }, [uiState.data?.[cacheKey]]);

  useEffect(() => {
    if (property?.images) {
      const imgs = (property.images || []).map((it) => {
        if (!it) return null;
        if (typeof it === 'string') return getImageUrl(it);
        if (it.image_url) return getImageUrl(it.image_url);
        if (it.url) return getImageUrl(it.url);
        if (it.image_path) return getImageUrl(it.image_path);
        return null;
      }).filter(Boolean);
      setImages(imgs);
    }
  }, [property]);

  const loadProperty = async () => {
    try {
      if (!property) setLoading(true);
      else setIsSyncing(true);
      setError(null);
      const res = await api.get(`/landlord/properties/${id}?t=${Date.now()}`);
      const data = res.data;
      setProperty(data);
      const newState = { ...uiState.data?.[cacheKey], property: data };
      updateData(cacheKey, newState);
      cacheManager.set(cacheKey, newState);
    } catch (err) {
      console.error('Failed to fetch property', err);
      if (!property) {
        setError(err.response?.data?.message || err.message || 'Failed to load property');
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const goToEdit = () => navigate(`/properties/${id}/edit`);
  const { open, setIsSidebarOpen, collapse } = useSidebar();

  const handleBackClick = async () => {
    try { await open(); } catch (e) {}
    setIsSidebarOpen(true);
    navigate('/properties');
  };

  useEffect(() => {
    if (collapse) collapse().catch(() => {});
  }, [collapse]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-lg p-6 border border-red-100 dark:border-red-900">
          <p className="text-red-700 font-medium">Error</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <NotFoundPage 
        title="Property Not Found" 
        message="The property you are looking for does not exist or has been removed." 
      />
    );
  }

  const amenities = property.amenities || property.amenities_list || [];
  const rules = property.property_rules || property.rules || [];

  const renderAmenityLabel = (a) => {
    if (!a && a !== 0) return '';
    if (typeof a === 'string') return a;
    if (typeof a === 'object') return a.name || a.title || String(a.id || a.description || 'Amenity');
    return String(a);
  };

  const renderRuleLabel = (r) => {
    if (!r && r !== 0) return '';
    if (typeof r === 'string') return r;
    if (typeof r === 'object') return r.name || r.title || r.rule || String(r.id || r.description || 'Rule');
    return String(r);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center relative min-h-[40px]">
            <div className="absolute left-0 flex items-center">
              <button
                onClick={handleBackClick}
                className="p-2 bg-white dark:bg-gray-800 text-green-600 rounded-full shadow-sm border dark:border-gray-700 hover:scale-110 transition-all flex-shrink-0"
                title="Go Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-[500px]">
                {property.title || 'Untitled Property'}
              </h1>
            </div>

            <div className="absolute right-0 flex items-center gap-2">
              <button
                onClick={() => setShowActivityLogs(true)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Activity logs"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(`/addons?property_id=${id}`, { state: { propertyId: id } })}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Add-ons service"
              >
                <PackagePlus className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(`/rooms?property=${id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Room management"
              >
                <Building2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(`/tenants?property=${id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Tenant management"
              >
                <Users className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(`/maintenance?property_id=${id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Maintenance Requests"
              >
                <Wrench className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(`/reviews?property_id=${id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Guest Reviews"
              >
                <Star className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Property Dashboard — replaces Room Management */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="mb-6 border-b-2 border-gray-200 dark:border-gray-600 pb-4 text-center shadow-[0_4px_4px_-4px_rgba(0,0,0,0.05)]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Property Overview</h2>
          </div>
          <PropertyDashboard propertyId={id} navigate={navigate} />
        </div>

        {/* Property Details Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 relative">
          <div className="mb-8 border-b-2 border-gray-200 dark:border-gray-600 pb-4 text-center shadow-[0_4px_4px_-4px_rgba(0,0,0,0.05)]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Property Details & Information</h2>
          </div>

          <button
            onClick={goToEdit}
            className="absolute top-4 right-4 w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            title="Edit property"
            aria-label="Edit property"
          >
            <Edit className="w-5 h-5 text-green-600" />
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 m-2 items-stretch">
            {/* Gallery */}
            <div className="w-full flex flex-col">
              <div className="relative w-full h-full flex flex-col">
                <div ref={galleryRef} className="relative flex-1 bg-black rounded-xl overflow-hidden flex flex-col min-h-[400px]">
                  <div className="w-full flex-1 relative flex flex-col">
                    {images.length > 0 ? (
                      <>
                        <Swiper
                          modules={[Navigation, Pagination, Autoplay, Keyboard, A11y]}
                          spaceBetween={0}
                          slidesPerView={1}
                          navigation={false}
                          pagination={false}
                          autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
                          loop={images.length > 1}
                          className="w-full h-full"
                          onSlideChange={(swiper) => setIdx(swiper.realIndex)}
                          onSwiper={(s) => setSwiperInstance(s)}
                        >
                          {images.map((src, i) => (
                            <SwiperSlide key={i} className="h-full bg-black">
                              <div className="w-full h-full flex items-center justify-center">
                                <img
                                  src={src}
                                  loading="lazy"
                                  alt={`property-${i}`}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                            </SwiperSlide>
                          ))}
                        </Swiper>

                        {swiperInstance && (
                          <div className="absolute inset-0 flex items-center justify-between px-3 z-20 pointer-events-none">
                            <button
                              aria-label="Previous image"
                              onClick={() => swiperInstance.slidePrev()}
                              className="pointer-events-auto w-10 h-10 bg-white/60 rounded-full shadow flex items-center justify-center hover:scale-105 transition-transform"
                            >
                              <ArrowLeft className="w-5 h-5 text-green-600" />
                            </button>
                            <button
                              aria-label="Next image"
                              onClick={() => swiperInstance.slideNext()}
                              className="pointer-events-auto w-10 h-10 bg-white/60 rounded-full shadow flex items-center justify-center hover:scale-105 transition-transform"
                            >
                              <ArrowRight className="w-5 h-5 text-green-600" />
                            </button>
                          </div>
                        )}

                        {images.length > 1 && (
                          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center z-20">
                            <div className="flex items-center gap-2">
                              {images.map((_, i) => (
                                <button
                                  key={i}
                                  aria-label={`Go to image ${i + 1}`}
                                  onClick={() => { if (!swiperInstance) return; swiperInstance.slideToLoop(i); }}
                                  className={`w-2.5 h-2.5 rounded-full ${i === idx ? 'bg-blue-600' : 'bg-gray-300'} transition-all`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-full">
                        <Building2 className="w-16 h-16 mx-auto mb-2" />
                        <p>No photos available</p>
                      </div>
                    )}
                  </div>

                  <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-gray-50 dark:from-gray-800 to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-50 dark:from-gray-800 to-transparent" />
                </div>
              </div>
            </div>

            {/* Details */}
            <aside className="flex flex-col gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">{property.description || 'No description provided.'}</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Full Address</h3>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <div>{property.street_address}</div>
                  <div>{property.barangay ? `${property.barangay}, ` : ''}{property.city}{property.province ? `, ${property.province}` : ''}{property.postal_code ? ` ${property.postal_code}` : ''}</div>
                  {property.country && <div>{property.country}</div>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Property Rules</h3>
                  {rules.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No rules provided.</p>
                  ) : (
                    <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      {rules.map((r, i) => <li key={i}>{renderRuleLabel(r)}</li>)}
                    </ul>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Amenities</h3>
                  {amenities.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No amenities listed.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {amenities.map((a, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium border border-green-100 dark:border-green-800">
                          {renderAmenityLabel(a)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Room Details Modal (kept for deep-link use) */}
        <RoomDetails
          room={selectedRoomDetails}
          isOpen={showRoomDetails}
          onClose={() => { setShowRoomDetails(false); setSelectedRoomDetails(null); }}
          onExtend={async ({ roomId, days, months }) => {
            if (!roomId) return;
            try {
              const payload = {};
              if (days) payload.days = days;
              if (months) payload.months = months;
              await api.post(`/rooms/${roomId}/extend`, payload);
            } catch (err) {
              console.error('Failed to extend stay', err);
              throw err;
            }
          }}
        />
        <PropertyActivityLogs
          propertyId={id}
          propertyTitle={property?.title}
          isOpen={showActivityLogs}
          onClose={() => setShowActivityLogs(false)}
        />
      </div>
    </div>
  );
}   