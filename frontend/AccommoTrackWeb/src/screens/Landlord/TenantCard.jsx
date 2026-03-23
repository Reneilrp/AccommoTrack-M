import { useState } from 'react';
import { Home, Mail, Phone, Calendar, MessageSquare, AlertCircle, ShieldAlert, Clock, Shuffle, CreditCard, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TenantCard({ tenant, onTransfer, onEvict, canTransfer = true }) {
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

  const handleMessageTenant = () => {
    navigate('/messages', { 
      state: { 
        startConversation: true,
        recipient: { id: tenant.id },
        property: tenant.room ? { id: tenant.room.property_id } : null
      } 
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-all relative overflow-hidden group">
      {/* Top Behavioral Badges */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center">
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
        {!isLate && !isExpiringSoon && profile?.status === 'active' && (
          <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-green-200 dark:border-green-800">
            Good Standing
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

      {/* Emergency Quick View (Inline) */}
      {showEmergency && profile && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg animate-in slide-in-from-top-2">
          <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-2 flex items-center gap-2">
            <ShieldAlert className="w-3 h-3" /> Emergency Contact
          </p>
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{profile.emergency_contact_name || 'No Name'}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Phone className="w-3 h-3" /> {profile.emergency_contact_phone || 'No Phone'}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-500 italic">Relation: {profile.emergency_contact_relationship || '—'}</p>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={handleMessageTenant}
          className="col-span-2 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
        >
          <MessageSquare className="w-3.5 h-3.5" /> Message
        </button>
        <button
          onClick={() => navigate(`/payments?search=${tenant.email}`)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
        >
          <CreditCard className="w-3.5 h-3.5" /> Payments
        </button>
        <button
          onClick={() => navigate(`/tenants/${tenant.id}`)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-all hover:bg-gray-200 dark:hover:bg-gray-600 border border-transparent"
        >
          View Logs
        </button>

        <button
          onClick={() => onTransfer?.(tenant)}
          disabled={!canTransfer || !tenant.room}
          title={!tenant.room ? 'Tenant has no room assigned' : 'Transfer room'}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-600"
        >
          <Shuffle className="w-3.5 h-3.5" /> Transfer
        </button>
        <button
          onClick={() => onEvict?.(tenant)}
          disabled={!canTransfer}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <UserX className="w-3.5 h-3.5" /> Evict
        </button>

        <button
          onClick={() => setShowEmergency(!showEmergency)}
          className={`col-span-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border active:scale-95
            ${showEmergency ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Emergency Contact
        </button>
      </div>
    </div>
  );
}