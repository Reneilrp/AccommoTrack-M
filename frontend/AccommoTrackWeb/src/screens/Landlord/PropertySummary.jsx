import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import { 
  Building2, List, ArrowLeft, ArrowRight, Edit, Users, Loader2, Wrench, Star,
  AlertCircle, Clock, Home, PackagePlus, CreditCard, BookOpen, ArrowLeftRight, ChevronRight
} from 'lucide-react';
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

const FILTER_CONFIG = [
  { key: 'all', label: 'All', icon: null },
  { key: 'booking', label: 'Bookings', icon: BookOpen },
  { key: 'payment', label: 'Payments', icon: CreditCard },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench },
  { key: 'transfer', label: 'Transfers', icon: ArrowLeftRight },
  { key: 'addon', label: 'Add-ons', icon: PackagePlus },
  { key: 'review', label: 'Reviews', icon: Star },
];

const TYPE_META = {
  booking: {
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
    label: 'Booking',
  },
  payment: {
    color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
    label: 'Payment',
  },
  maintenance: {
    color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    dot: 'bg-orange-500',
    label: 'Maintenance',
  },
  transfer: {
    color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    dot: 'bg-purple-500',
    label: 'Transfer',
  },
  addon: {
    color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    dot: 'bg-teal-500',
    label: 'Add-on',
  },
  review: {
    color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    dot: 'bg-yellow-500',
    label: 'Review',
  },
};

function formatDisplayDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toTimestamp(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function readName(entity, fallback = 'Tenant') {
  if (entity?.name) return entity.name;
  const full = [entity?.first_name, entity?.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  return fallback;
}

function normalizeAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractSuggestedPrice(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/suggested\s*price\s*:\s*₱?\s*([\d,]+(?:\.\d+)?)/i);
  if (!match?.[1]) return null;
  return normalizeAmount(match[1].replace(/,/g, ''));
}

function stripSuggestedPriceText(value) {
  if (!value || typeof value !== 'string') return '';
  const cleaned = value
    .replace(/\s*\|?\s*suggested\s*price\s*:\s*₱?\s*[\d,]+(?:\.\d+)?/ig, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned.replace(/\|\s*$/, '').trim();
}

function StatCard({ label, value, sub, icon: Icon, accent = 'blue', onClick }) {
  const accents = {
    red: 'border-t-red-500 bg-red-50 dark:bg-red-900/10',
    orange: 'border-t-orange-500 bg-orange-50 dark:bg-orange-900/10',
    blue: 'border-t-blue-500 bg-blue-50 dark:bg-blue-900/10',
    green: 'border-t-green-500 bg-green-50 dark:bg-green-900/10',
  };
  const iconColors = {
    red: 'text-red-500',
    orange: 'text-orange-500',
    blue: 'text-blue-500',
    green: 'text-green-600',
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-xl border border-gray-200 dark:border-gray-700 border-t-4 p-4 ${accents[accent]} flex flex-col gap-1 text-left hover:shadow-md transition-all`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
        <Icon className={`w-4 h-4 ${iconColors[accent]}`} />
      </div>
      <p className={`text-2xl font-bold ${iconColors[accent]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </button>
  );
}

function TypeBadge({ type }) {
  const meta = TYPE_META[type] || TYPE_META.booking;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
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
    occupiedRooms: 0,
    totalRooms: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [activeFilter, setActiveFilter] = useState('all');
  const [addonActionNotes, setAddonActionNotes] = useState({});
  const [addonActionModal, setAddonActionModal] = useState({
    isOpen: false,
    mode: 'edit',
    request: null,
    actionNote: '',
    rejectReason: '',
  });

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
        occupiedRooms,
        totalRooms,
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
    const toastId = toast.loading(action === 'confirm' ? 'Confirming booking...' : 'Declining booking...');
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: action === 'confirm' ? 'confirmed' : 'cancelled' });
      setDashData(p => ({ ...p, pendingBookings: p.pendingBookings.filter(b => b.id !== bookingId) }));
      toast.success(action === 'confirm' ? 'Booking confirmed!' : 'Booking declined.', { id: toastId });
    } catch (err) {
      console.error(`Failed to ${action} booking`, err);
      toast.error(err.response?.data?.message || `Failed to ${action} booking`, { id: toastId });
    } finally {
      setActionLoading(p => ({ ...p, [key]: false }));
    }
  };

  const handleTransferAction = async (transferId, action) => {
    const key = `transfer_${transferId}_${action}`;
    setActionLoading(p => ({ ...p, [key]: true }));
    const toastId = toast.loading(action === 'approve' ? 'Approving transfer...' : 'Rejecting transfer...');
    try {
      await api.patch(`/landlord/transfers/${transferId}/handle`, { action });
      setDashData(p => ({ ...p, transferRequests: p.transferRequests.filter(t => t.id !== transferId) }));
      toast.success(`Transfer ${action}d successfully!`, { id: toastId });
    } catch (err) {
      console.error(`Failed to ${action} transfer`, err);
      toast.error(err.response?.data?.message || `Failed to ${action} transfer`, { id: toastId });
    } finally {
      setActionLoading(p => ({ ...p, [key]: false }));
    }
  };

  const handleAddonRequestAction = async (requestId, bookingId, addonId, action, note = null) => {
    const key = `addon_${requestId}_${action}`;
    setActionLoading(p => ({ ...p, [key]: true }));
    const toastId = toast.loading(action === 'approve' ? 'Approving add-on...' : 'Rejecting add-on...');
    try {
      await api.patch(`/landlord/bookings/${bookingId}/addons/${addonId}`, {
        action,
        note: typeof note === 'string' && note.trim() ? note.trim() : null,
      });
      setDashData(p => ({
        ...p,
        pendingAddonRequests: p.pendingAddonRequests.filter(r => r.requestId !== requestId),
      }));
      setAddonActionNotes((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      toast.success(`Add-on ${action}d successfully!`, { id: toastId });
      return true;
    } catch (err) {
      console.error(`Failed to ${action} add-on request`, err);
      toast.error(err.response?.data?.message || `Failed to ${action} add-on`, { id: toastId });
      return false;
    } finally {
      setActionLoading(p => ({ ...p, [key]: false }));
    }
  };

  const openAddonActionModal = (mode, item) => {
    setAddonActionModal({
      isOpen: true,
      mode,
      request: item,
      actionNote: addonActionNotes[item.id] || '',
      rejectReason: '',
    });
  };

  const closeAddonActionModal = () => {
    setAddonActionModal({
      isOpen: false,
      mode: 'edit',
      request: null,
      actionNote: '',
      rejectReason: '',
    });
  };

  const handleSaveAddonActionNote = () => {
    if (!addonActionModal.request?.id) {
      closeAddonActionModal();
      return;
    }

    const requestId = addonActionModal.request.id;
    const trimmedNote = addonActionModal.actionNote.trim();

    setAddonActionNotes((prev) => {
      const next = { ...prev };
      if (trimmedNote) next[requestId] = trimmedNote;
      else delete next[requestId];
      return next;
    });

    toast.success('Action details updated.');
    closeAddonActionModal();
  };

  const handleConfirmAddonReject = async () => {
    const request = addonActionModal.request;
    if (!request?.id) return;

    const reason = addonActionModal.rejectReason.trim();
    if (!reason) {
      toast.error('Rejection reason is required.');
      return;
    }

    const details = addonActionModal.actionNote.trim();
    const rejectNote = details
      ? `Details: ${details}\nReason: ${reason}`
      : `Reason: ${reason}`;

    const success = await handleAddonRequestAction(
      request.id,
      request.bookingId,
      request.addonId,
      'reject',
      rejectNote,
    );

    if (success) {
      closeAddonActionModal();
    }
  };

  const {
    pendingBookings,
    overdueInvoices,
    pendingAddonRequests,
    maintenanceRequests,
    transferRequests,
    recentReviews,
  } = dashData;

  const activityItems = [
    ...pendingBookings.map((b) => ({
      key: `booking-${b.id}`,
      id: b.id,
      type: 'booking',
      tenant: readName(b.tenant, b.tenant_name || 'Tenant'),
      room: b.room?.name || b.room_name || 'Room —',
      date: b.start_date || b.created_at,
      status: 'Pending',
      amount: null,
      note: b.payment_plan || 'Monthly',
    })),
    ...overdueInvoices.map((inv) => ({
      key: `payment-${inv.id}`,
      id: inv.id,
      type: 'payment',
      tenant: readName(inv.tenant, inv.tenant_name || 'Tenant'),
      room: inv.room?.name || inv.room_name || 'Room —',
      date: inv.due_date || inv.created_at,
      status: 'Overdue',
      amount: normalizeAmount(inv.amount ?? inv.total_amount),
      note: inv.month || inv.period || 'Invoice',
    })),
    ...maintenanceRequests.map((m) => ({
      key: `maintenance-${m.id}`,
      id: m.id,
      type: 'maintenance',
      tenant: readName(m.tenant, m.tenant_name || 'Tenant'),
      room: m.room?.name || m.room_name || 'Room —',
      date: m.created_at || m.updated_at,
      status: m.status || 'Open',
      amount: null,
      note: m.title || m.issue || 'Maintenance issue',
    })),
    ...transferRequests.map((t) => ({
      key: `transfer-${t.id}`,
      id: t.id,
      type: 'transfer',
      tenant: readName(t.tenant, t.tenant_name || 'Tenant'),
      room: `${t.from_room?.name || t.from_room_name || '—'} → ${t.to_room?.name || t.to_room_name || '—'}`,
      date: t.created_at || t.updated_at,
      status: t.status || 'Pending',
      amount: null,
      note: 'Room transfer',
    })),
    ...pendingAddonRequests.map((req) => {
      const requestNote = req.requestNote || req.request_note || '';
      const parsedSuggestedPrice = extractSuggestedPrice(requestNote);
      return {
        key: `addon-${req.requestId}`,
        id: req.requestId,
        bookingId: req.bookingId,
        addonId: req.addonId,
        type: 'addon',
        tenant: readName(req.tenant, 'Tenant'),
        room: `Room ${req.roomNumber || '—'}`,
        date: req.requestedAt || req.requested_at || req.createdAt || req.created_at,
        status: req.status || 'Pending',
        amount: normalizeAmount(req.suggestedPrice ?? req.suggested_price ?? parsedSuggestedPrice ?? req.price ?? req.amount),
        note: req.addonName || 'Add-on request',
        requestNote: stripSuggestedPriceText(requestNote),
      };
    }),
    ...recentReviews.map((r) => ({
      key: `review-${r.id}`,
      id: r.id,
      type: 'review',
      tenant: readName(r.tenant, r.reviewer_name || 'Tenant'),
      room: r.room?.name || r.room_name || 'Room —',
      date: r.created_at || r.updated_at,
      status: `${Math.round(Number(r.rating) || 0)} stars`,
      amount: null,
      note: r.landlord_response ? 'Replied' : 'Needs reply',
    })),
  ].sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));

  const counts = FILTER_CONFIG.reduce((acc, filter) => {
    if (filter.key === 'all') {
      acc[filter.key] = activityItems.length;
      return acc;
    }
    acc[filter.key] = activityItems.filter((item) => item.type === filter.key).length;
    return acc;
  }, {});

  const filteredItems = activeFilter === 'all'
    ? activityItems
    : activityItems.filter((item) => item.type === activeFilter);

  const renderActionButtons = (item) => {
    if (item.type === 'booking') {
      return (
        <div className="inline-flex items-center gap-1.5">
          <button
            onClick={() => handleBookingAction(item.id, 'confirm')}
            className="px-2 py-1 text-[11px] font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            {actionLoading[`booking_${item.id}_confirm`] ? '...' : 'Confirm'}
          </button>
          <button
            onClick={() => handleBookingAction(item.id, 'decline')}
            className="px-2 py-1 text-[11px] font-semibold rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            {actionLoading[`booking_${item.id}_decline`] ? '...' : 'Decline'}
          </button>
        </div>
      );
    }

    if (item.type === 'transfer') {
      return (
        <div className="inline-flex items-center gap-1.5">
          <button
            onClick={() => handleTransferAction(item.id, 'approve')}
            className="px-2 py-1 text-[11px] font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            {actionLoading[`transfer_${item.id}_approve`] ? '...' : 'Approve'}
          </button>
          <button
            onClick={() => handleTransferAction(item.id, 'reject')}
            className="px-2 py-1 text-[11px] font-semibold rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            {actionLoading[`transfer_${item.id}_reject`] ? '...' : 'Reject'}
          </button>
        </div>
      );
    }

    if (item.type === 'addon') {
      const savedActionNote = addonActionNotes[item.id] || '';
      return (
        <div className="inline-flex items-center gap-1.5">
          <button
            onClick={() => handleAddonRequestAction(item.id, item.bookingId, item.addonId, 'approve', savedActionNote)}
            className="px-2 py-1 text-[11px] font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            {actionLoading[`addon_${item.id}_approve`] ? '...' : 'Approve'}
          </button>
          <button
            onClick={() => openAddonActionModal('edit', item)}
            className="px-2 py-1 text-[11px] font-semibold rounded-md bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => openAddonActionModal('reject', item)}
            className="px-2 py-1 text-[11px] font-semibold rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            {actionLoading[`addon_${item.id}_reject`] ? '...' : 'Reject'}
          </button>
        </div>
      );
    }

    const viewAction = () => {
      if (item.type === 'payment') navigate(`/payments?property_id=${propertyId}&status=overdue`);
      else if (item.type === 'maintenance') navigate(`/maintenance?property_id=${propertyId}&request_id=${item.id}`);
      else if (item.type === 'review') navigate('/reviews');
      else navigate(`/bookings?property_id=${propertyId}&status=pending`);
    };

    return (
      <button
        onClick={viewAction}
        className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors"
      >
        View <ChevronRight className="w-3 h-3" />
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4">
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <div className="h-3 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 rounded bg-gray-100 dark:bg-gray-700/50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Overdue Invoices"
          value={overdueInvoices.length || 0}
          icon={AlertCircle}
          accent="red"
          onClick={() => navigate(`/payments?property_id=${propertyId}&status=overdue`)}
        />
        <StatCard
          label="Pending Bookings"
          value={pendingBookings.length || 0}
          icon={Clock}
          accent="orange"
          onClick={() => navigate(`/bookings?property_id=${propertyId}&status=pending`)}
        />
        <StatCard
          label="Transfer Requests"
          value={transferRequests.length || 0}
          icon={ArrowLeftRight}
          accent="blue"
          onClick={() => navigate(`/transfers?property_id=${propertyId}`)}
        />
        <StatCard
          label="Rooms Occupied"
          value={occupancy}
          sub={totalRooms > 0 ? `${Math.max(totalRooms - occupiedRooms, 0)} available` : undefined}
          icon={Home}
          accent="green"
          onClick={() => navigate(`/rooms?property=${propertyId}`)}
        />
      </div> */}

      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Activity &amp; Requests
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {FILTER_CONFIG.map(({ key, label, icon: Icon }) => {
              const count = counts[key] || 0;
              const active = activeFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {label}
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                        active
                          ? 'bg-white/20 text-white dark:bg-black/20 dark:text-gray-900'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-600">No items in this category yet.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">Type</th>
                    <th className="px-5 py-3 text-left">Tenant</th>
                    <th className="px-5 py-3 text-left">Room</th>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.key}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <TypeBadge type={item.type} />
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-200">{item.tenant}</td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                        <div className="space-y-1">
                          <p>{item.room}</p>
                          {item.type === 'addon' && item.requestNote ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500" title={item.requestNote}>Note: {item.requestNote}</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 tabular-nums">
                        {formatDisplayDate(item.date)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs font-semibold ${
                            item.status === 'Overdue' || item.status === 'Open'
                              ? 'text-red-600 dark:text-red-400'
                              : item.status === 'Pending'
                                ? 'text-orange-500 dark:text-orange-400'
                                : 'text-gray-500 dark:text-gray-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
                        {item.amount !== null
                          ? `₱${item.amount.toLocaleString()}`
                          : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">{renderActionButtons(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {filteredItems.map((item) => (
                <div key={item.key} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <TypeBadge type={item.type} />
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.tenant}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.room}</p>
                      {item.note && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.note}</p>}
                      {item.type === 'addon' && item.requestNote ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate" title={item.requestNote}>Note: {item.requestNote}</p>
                      ) : null}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDisplayDate(item.date)}</p>
                      <p className="text-xs font-semibold mt-1 text-gray-700 dark:text-gray-300">{item.status}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                        {item.amount !== null ? `₱${item.amount.toLocaleString()}` : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">{renderActionButtons(item)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {addonActionModal.isOpen && addonActionModal.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={closeAddonActionModal}>
          <div
            className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {addonActionModal.mode === 'reject' ? 'Reject Add-on Request' : 'Edit Add-on Action Details'}
            </h3>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3 mb-4 text-sm space-y-1">
              <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Tenant:</span> {addonActionModal.request.tenant}</p>
              <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Add-on:</span> {addonActionModal.request.note || 'Add-on request'}</p>
              <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Room:</span> {addonActionModal.request.room}</p>
              <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Requested:</span> {formatDisplayDate(addonActionModal.request.date)}</p>
              {addonActionModal.request.requestNote ? (
                <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Tenant Note:</span> {addonActionModal.request.requestNote}</p>
              ) : null}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Details
                  {addonActionModal.mode === 'edit' ? ' (optional)' : ' (optional, for context)'}
                </label>
                <textarea
                  value={addonActionModal.actionNote}
                  onChange={(e) => setAddonActionModal((prev) => ({ ...prev, actionNote: e.target.value }))}
                  placeholder="Add details for this action"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {addonActionModal.mode === 'reject' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Reason for Rejection <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={addonActionModal.rejectReason}
                    onChange={(e) => setAddonActionModal((prev) => ({ ...prev, rejectReason: e.target.value }))}
                    placeholder="Explain why this request is being rejected"
                    rows={3}
                    className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeAddonActionModal}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              {addonActionModal.mode === 'reject' ? (
                <button
                  onClick={handleConfirmAddonReject}
                  disabled={!!actionLoading[`addon_${addonActionModal.request.id}_reject`]}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold"
                >
                  {actionLoading[`addon_${addonActionModal.request.id}_reject`] ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              ) : (
                <button
                  onClick={handleSaveAddonActionNote}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
                >
                  Save Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
    }
  };

  const goToEdit = () => navigate(`/properties/${id}/edit`);
  const { open, setIsSidebarOpen, collapse } = useSidebar();

  const handleBackClick = async () => {
    try { await open(); } catch (_err) { void _err; }
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

        {/* Property Dashboard */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="mb-6 border-b-2 border-gray-200 dark:border-gray-600 pb-4 text-center shadow-[0_4px_4px_-4px_rgba(0,0,0,0.05)]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Property Overview</h2>
          </div>
          <PropertyDashboard propertyId={id} navigate={navigate} />
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