import { useState } from 'react';
import { Home, Mail, Phone, Calendar, MessageSquare, AlertCircle, ShieldAlert, Clock, Shuffle, CreditCard, UserX, UserPlus, UserMinus, CheckCircle, Clock3, FileText, ChevronDown, KeyRound, CalendarClock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TenantCard({
  tenant,
  onEdit,
  onTransfer,
  onAssign,
  onUnassign,
  onDelete,
  onLifecycle,
  onGenerateClaimCode,
  onApproveReservation,
  onCheckIn,
  canTransfer = true,
}) {
  const profile = tenant.tenantProfile;
  const navigate = useNavigate();
  const [showEmergency, setShowEmergency] = useState(false);

  // Behavioral Logic
  const isLate = tenant.has_overdue_invoices;
  const isExpiringSoon = (() => {
    if (!tenant.latestBooking?.end_date) return false;
    const endDate = new Date(tenant.latestBooking.end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  })();
  const hasPendingEviction = Boolean(tenant.pending_eviction);
  const evictionScheduleLabel = (() => {
    const scheduledFor = tenant?.pending_eviction?.scheduled_for;
    if (!scheduledFor) return null;
    const dueDate = new Date(scheduledFor);
    if (Number.isNaN(dueDate.getTime())) return null;
    return dueDate.toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  })();
  const latestBookingStatus = tenant.latestBooking?.status || '';
  const isPendingReservation = latestBookingStatus === 'pending_reservation';
  const isReserved = latestBookingStatus === 'reserved';

  const handleMessageTenant = () => {
    navigate('/messages', {
      state: {
        startConversation: true,
        recipient: { id: tenant.id },
        property: tenant.room ? { id: tenant.room.property_id } : null
      }
    });
  };

  const [showMoreActions, setShowMoreActions] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-all relative overflow-hidden group">
      {/* Top Behavioral Badges */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center">
        {tenant.proxy_origin && (
          <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-2 border border-indigo-200 dark:border-indigo-800 w-full justify-center">
            Registered from Proxy Booking: {tenant.proxy_origin.booking_reference}
          </span>
        )}
        {isLate && (
          <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-2 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-3 h-3" /> Late Payer
          </span>
        )}
        {isExpiringSoon && (
          <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-2 border border-orange-200 dark:border-orange-800">
            <Clock className="w-3 h-3" /> Expiring Soon
          </span>
        )}
        {isPendingReservation && (
          <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-2 border border-amber-200 dark:border-amber-800">
            <Clock3 className="w-3 h-3" /> Reservation Req
          </span>
        )}
        {isReserved && (
          <span className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-2 border border-teal-200 dark:border-teal-800">
            <CheckCircle className="w-3 h-3" /> Reserved
          </span>
        )}
        {!isLate && !isExpiringSoon && profile?.status === 'active' && (
          <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-green-200 dark:border-green-800">
            Good Standing
          </span>
        )}
        {hasPendingEviction && (
          <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-red-200 dark:border-red-800">
            Eviction Scheduled
          </span>
        )}
      </div>

      {/* Header: Name + Status */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-green-600 transition-colors">
            {tenant.first_name} {tenant.last_name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-2">
            <Mail className="w-3 h-3" /> {tenant.email}
          </p>
          {tenant.phone && (
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Phone className="w-3 h-3" /> {tenant.phone}
            </p>
          )}
        </div>

        {/* Status Badge */}
        <span className={`px-2 py-2 rounded text-[10px] font-bold uppercase tracking-wider
          ${profile?.status === 'active' ? 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
            profile?.status === 'inactive' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' :
              'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'}`}>
          {profile?.status || 'Active'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Room Info */}
        <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Assigned Room</p>
          {tenant.room ? (
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Home className="w-3 h-3" /> {tenant.room?.room_number}
            </p>
          ) : (
            <p className="text-xs italic text-gray-500">None</p>
          )}
        </div>

        {/* End Date Info */}
        <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Contract End</p>
          <p className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            {tenant.latestBooking?.end_date ? new Date(tenant.latestBooking.end_date).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* Emergency Quick View (Inline) - Deprecated in favor of More Action collapse but keeping for transition if needed, actually user wants it inside collapse */}

      {/* Footer Actions */}
      <div className="flex flex-col gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => navigate(`/tenants/${tenant.id}`)}
            className="min-w-0 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-[11px] sm:text-xs font-bold transition-all hover:bg-gray-200 dark:hover:bg-gray-600 border border-transparent whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">View Logs</span>
          </button>
          <button
            onClick={handleMessageTenant}
            className="min-w-0 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] sm:text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Message</span>
          </button>
          <button
            onClick={() => onTransfer?.(tenant)}
            disabled={!canTransfer || !tenant.room || hasPendingEviction}
            className="min-w-0 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] sm:text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Shuffle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Transfer</span>
          </button>
        </div>

        <button
          onClick={() => setShowMoreActions(!showMoreActions)}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all border active:scale-95
            ${showMoreActions
              ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white border-gray-300'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
        >
          <span>{showMoreActions ? 'Hide more actions' : 'View more actions'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreActions ? 'rotate-180' : ''}`} />
        </button>

        {showMoreActions && (
          <div className="flex flex-col gap-2 mt-1 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-1 duration-200">
            <button
              onClick={() => onEdit?.(tenant)}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-xs font-semibold transition-colors"
            >
              <User className="w-3.5 h-3.5 text-blue-500" /> Edit Details
            </button>
            <button
              onClick={() => navigate(`/payments?search=${tenant.email}`)}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-xs font-semibold transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Payments
            </button>
            <button
              onClick={() => onGenerateClaimCode?.(tenant)}
              disabled={!canTransfer}
              className="flex items-center gap-2 px-3 py-2 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" /> Generate Claim Code
            </button>
            {isPendingReservation && (
              <button
                onClick={() => onApproveReservation?.(tenant)}
                disabled={!canTransfer}
                className="flex items-center gap-2 px-3 py-2 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve Reservation
              </button>
            )}
            {isReserved && (
              <button
                onClick={() => onCheckIn?.(tenant)}
                disabled={!canTransfer}
                className="flex items-center gap-2 px-3 py-2 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Check In Tenant
              </button>
            )}
            <button
              onClick={() => onAssign?.(tenant)}
              disabled={!canTransfer || !!tenant.room || hasPendingEviction}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-500" /> Assign Room
            </button>
            <button
              onClick={() => onUnassign?.(tenant)}
              disabled={!canTransfer || !tenant.room || hasPendingEviction}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <UserMinus className="w-3.5 h-3.5 text-amber-600" /> Unassign / End Stay
            </button>
            {!tenant.room && !hasPendingEviction && (
              <button
                onClick={() => onDelete?.(tenant)}
                disabled={!canTransfer}
                className="flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <UserX className="w-3.5 h-3.5" /> Delete Account
              </button>
            )}
            {/* Unified Lifecycle Manager button */}
            <button
              onClick={() => onLifecycle?.(tenant)}
              disabled={!canTransfer}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-50
                text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              {hasPendingEviction ? (
                <span className="flex items-center gap-1">
                  Lifecycle Manager
                  {evictionScheduleLabel && (
                    <span className="ml-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-bold">
                      {evictionScheduleLabel}
                    </span>
                  )}
                </span>
              ) : 'Lifecycle Manager'}
            </button>
            <button
              onClick={() => setShowEmergency(!showEmergency)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors
                ${showEmergency ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-500" /> Emergency contact
            </button>

            {showEmergency && profile && (
              <div className="mt-2 p-3 bg-white dark:bg-gray-800 border border-red-100 dark:border-red-900/50 rounded-md animate-in fade-in duration-200">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Emergency Contact</p>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{profile.emergency_contact_name || '—'}</p>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> {profile.emergency_contact_phone || '—'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}